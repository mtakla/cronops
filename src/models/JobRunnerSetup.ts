import os from "node:os";
import cron from "node-cron";
import { join, resolve, sep } from "node:path";
import { ENV, type RunnerOptions } from "../types/Options.types.js";
import { JobError } from "../errors/JobError.js";
import { JobSchema, type Job, type JobAction } from "../types/Config.types.js";
import { ExecHandler } from "../handlers/ExecHandler.js";
import { FileCopyHandler } from "../handlers/FileCopyHandler.js";
import { FileMoveHandler } from "../handlers/FileMoveHandler.js";
import { FileArchiveHandler } from "../handlers/FileArchiveHandler.js";
import { FileDeleteHandler } from "../handlers/FileDeleteHandler.js";
import type { AbstractHandler } from "../handlers/AbstractHandler.js";

export class JobRunnerSetup implements RunnerOptions {
   public readonly sourceRoot: string;
   public readonly targetRoot: string;
   public readonly source2Root: string;
   public readonly target2Root: string;
   public readonly source3Root: string;
   public readonly target3Root: string;
   public readonly uid: string;
   public readonly gid: string;
   public readonly shell: string | boolean;
   public readonly configDir: string;
   public readonly tempDir: string;
   public readonly logDir: string;

   // additional props
   public readonly scriptDir: string;

   // helper
   private sourceRootDirs: [string, string, string];
   private targetRootDirs: [string, string, string];
   private handlerMap = new Map<JobAction, AbstractHandler>();

   constructor(options: RunnerOptions = {}) {
      this.sourceRoot = resolve(options.sourceRoot ?? process.env[ENV.SOURCE_ROOT] ?? "./");
      this.targetRoot = resolve(options.targetRoot ?? process.env[ENV.TARGET_ROOT] ?? "./");
      this.source2Root = resolve(options.source2Root ?? process.env[ENV.SOURCE_2_ROOT] ?? "./");
      this.target2Root = resolve(options.target2Root ?? process.env[ENV.TARGET_2_ROOT] ?? "./");
      this.source3Root = resolve(options.source3Root ?? process.env[ENV.SOURCE_3_ROOT] ?? "./");
      this.target3Root = resolve(options.target3Root ?? process.env[ENV.TARGET_3_ROOT] ?? "./");
      this.configDir = resolve(options.configDir ?? process.env[ENV.CONFIG_DIR] ?? join(os.homedir(), ".cronops", "config"));
      this.logDir = resolve(options.logDir ?? process.env[ENV.LOG_DIR] ?? join(os.homedir(), ".cronops", "logs"));
      this.tempDir = resolve(options.tempDir ?? process.env[ENV.TEMP_DIR] ?? join(os.tmpdir(), "cronops"));
      this.uid = options.uid ?? process.env[ENV.PUID] ?? `${process.getuid?.() ?? "0"}`;
      this.gid = options.gid ?? process.env[ENV.PGID] ?? `${process.getgid?.() ?? "0"}`;
      this.shell = options.shell ?? parseShellSettings(process.env[ENV.EXEC_SHELL]) ?? false;
      this.scriptDir = join(this.configDir, "scripts");

      // helper for quick path resolution
      this.sourceRootDirs = [this.sourceRoot, this.source2Root, this.source3Root];
      this.targetRootDirs = [this.targetRoot, this.target2Root, this.target3Root];

      // register action handler
      this.handlerMap.set("exec", new ExecHandler(this));
      this.handlerMap.set("copy", new FileCopyHandler(this));
      this.handlerMap.set("move", new FileMoveHandler(this));
      this.handlerMap.set("archive", new FileArchiveHandler(this));
      this.handlerMap.set("delete", new FileDeleteHandler(this));
   }

   public resolveSourceDir(relPath = "./"): string {
      return this._resolveDir(relPath, this.sourceRootDirs);
   }

   public resolveTargetDir(relPath = "./"): string {
      return this._resolveDir(relPath, this.targetRootDirs);
   }

   public getActionHandler(action: JobAction): AbstractHandler {
      const handler = this.handlerMap.get(action);
      if (!handler) throw new Error(`No handler registered for action '${action}'!`);
      return handler;
   }

   public validateJob(job: Job) {
      // check job schema
      const res = JobSchema.safeParse(job);
      if (!res.success) JobError.throw(job.id, `Invalid job definition. ${res.error.issues[0]?.message}`, res.error);

      // check if source/target dir is valid -> throws JobError if not
      this._validateDir(job.source?.dir, job.id);
      this._validateDir(job.target?.dir, job.id);

      if (job.cron && !cron.validate(job.cron)) JobError.throw(job.id, `invalid cron string '${job.cron}'!`);

      // get handler (throws error if action is invalid)
      const handler = this.getActionHandler(job.action);

      // delegate validation to handler
      handler.validateJob(job);
   }

   private _validateDir(path: string = "./", jobId: string) {
      let issue: string | undefined;
      if (path.includes("..")) issue = "Directory traversal ('..') is not allowed!";
      else if (path.startsWith("$")) {
         const digit = path.charCodeAt(1) - 48;
         const nextChar = path.charAt(2);
         if (!(digit > 0 && digit <= 3)) issue = "Only $1, $2, and $3 are supported as root prefixes.";
         else if (nextChar !== "" && nextChar !== sep) issue = `Prefix $${digit} must be followed by a path separator ('${sep}').`;
      }
      if (issue) JobError.throw(jobId, issue);
   }

   private _resolveDir(relPath: string, rootDirArray: [string, string, string]): string {
      if (!relPath.startsWith("$")) {
         return resolve(join(rootDirArray[0], relPath));
      }
      const idx = relPath.charCodeAt(1) - 49;
      if (idx >= 0 && idx < 3 && (relPath.charAt(2) === "" || relPath.charAt(2) === sep)) {
         return resolve(join(rootDirArray[idx] || "./", relPath.slice(2)));
      }
      // should not happen due to upfront validation (see below)
      throw new Error(`Invalid dir prefix '${relPath}'! Allowed prefixes are $1, $2, or $3, followed by '${sep}'`);
   }
}

function parseShellSettings(shellStr: string | undefined): boolean | string {
   if (!shellStr) return false;
   const normalized = shellStr.trim().toLowerCase();
   if (normalized === "true") return true;
   if (normalized === "false") return false;
   return shellStr;
}
