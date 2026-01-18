import cron from "node-cron";
import fsx from "fs-extra";
import { join, resolve, dirname, relative, sep } from "node:path";
import { ENV, type RunnerOptions } from "../types/Options.types.js";
import { ValidationError } from "../errors/ValidationError.js";
import { JobSchema, type Job } from "../types/Config.types.js";

export class JobRunnerSetup implements RunnerOptions {
   public readonly sourceRoot: string;
   public readonly targetRoot: string;
   public readonly source2Root: string;
   public readonly target2Root: string;
   public readonly source3Root: string;
   public readonly target3Root: string;
   public readonly tempDir: string;
   public readonly logDir: string;

   // helper
   private sourceRootDirs: [string, string, string];
   private targetRootDirs: [string, string, string];

   constructor(options: RunnerOptions = {}) {
      this.sourceRoot = resolve(options.sourceRoot ?? process.env[ENV.SOURCE_ROOT] ?? "./");
      this.targetRoot = resolve(options.targetRoot ?? process.env[ENV.TARGET_ROOT] ?? "./");
      this.source2Root = resolve(options.source2Root ?? process.env[ENV.SOURCE_2_ROOT] ?? "./");
      this.target2Root = resolve(options.target2Root ?? process.env[ENV.TARGET_2_ROOT] ?? "./");
      this.source3Root = resolve(options.source3Root ?? process.env[ENV.SOURCE_3_ROOT] ?? "./");
      this.target3Root = resolve(options.target3Root ?? process.env[ENV.TARGET_3_ROOT] ?? "./");
      this.tempDir = resolve(options.tempDir ?? process.env[ENV.TEMP_DIR] ?? "/tmp/cronops");
      this.logDir = resolve(options.logDir ?? process.env[ENV.LOG_DIR] ?? "./");

      // helper for quick path resolution
      this.sourceRootDirs = [this.sourceRoot, this.source2Root, this.source3Root];
      this.targetRootDirs = [this.targetRoot, this.target2Root, this.target3Root];
   }

   public resolveSourceDir(relPath = "./"): string {
      return this.resolveDir(relPath, this.sourceRootDirs);
   }

   public resolveTargetDir(relPath = "./"): string {
      return this.resolveDir(relPath, this.targetRootDirs);
   }

   public validateJob(job: Job) {
      // check job schema
      const res = JobSchema.safeParse(job);
      if (!res.success) throw new ValidationError(`Invalid job definition. ${res.error.issues[0]?.message}`, job.id, res.error.message);

      // check if source/target dir is valid -> throws ValidationError if not
      this.validateDir(job.source?.dir, job.id);
      this.validateDir(job.target?.dir, job.id);

      const sourceDir = this.resolveSourceDir(job.source?.dir);
      const targetDir = this.resolveTargetDir(job.target?.dir);
      const archiveName = job.target?.archive_name ?? "";

      let issue: string | undefined;
      if (job.cron && !cron.validate(job.cron)) issue = `invalid cron string '${job.cron}'!`;
      else if (!fsx.pathExistsSync(sourceDir)) issue = `missing source dir '${sourceDir}'!`;
      else if (dirname(archiveName) !== ".") issue = `target archive name '${archiveName}' should not contain path elements!`;
      else if (["copy", "move"].includes(job.action) && !relative(sourceDir, targetDir).startsWith("..")) issue = `target directory is nested inside source`;
      if (issue) throw new ValidationError(`Job '${job.id}' ${issue}!`, job.id, issue);
   }

   private validateDir(path: string = "./", jobId: string) {
      let issue: string | undefined;
      if (path.includes("..")) issue = "Directory traversal ('..') is not allowed!";
      else if (path.startsWith("$")) {
         const digit = path.charCodeAt(1) - 48;
         const nextChar = path.charAt(2);
         if (!(digit > 0 && digit <= 3)) issue = "Only $1, $2, and $3 are supported as root prefixes.";
         else if (nextChar !== "" && nextChar !== sep) issue = `Prefix $${digit} must be followed by a path separator ('${sep}').`;
      }
      if (issue) throw new ValidationError(`Job '${jobId}' ${issue}!`, jobId, issue);
   }

   private resolveDir(relPath: string, rootDirArray: [string, string, string]): string {
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
