import { spawn } from "node:child_process";
import { parse } from "node:path";
import { parse as shellParse } from "shell-quote";
import { JobError } from "../errors/JobError.js";
import { AbstractHandler } from "./AbstractHandler.js";
import type { Job } from "../types/Config.types.js";
import type { ActionHandler, FileHistory, RunnerContext, SourceFile } from "../types/Task.types.js";

export class ExecHandler extends AbstractHandler implements ActionHandler {
   /**
    * Validate job against action handler requirements
    * @throws JobError
    */
   public override validateJob(job: Job): void {
      if (!job.command) JobError.throw(job.id, "Missing job command for execution");
   }

   public override async process(ctx: RunnerContext): Promise<void> {
      await this.exec(ctx);
   }

   override async processFiles(ctx: RunnerContext, entries: string[], fileHistory: FileHistory) {
      if (entries.length > 0) {
         await this.processSources(ctx, entries, fileHistory, true, this.exec);
      }
      await super.cleanup(ctx, fileHistory);
   }

   /**
    * Executes a sub process
    * @param ctx
    * @param entry
    */
   protected async exec(ctx: RunnerContext, entry?: SourceFile) {
      const { targetDir } = ctx;
      const setup = this.setup;
      const verbose = ctx.job.verbose === true;

      await new Promise<void>((resolve, reject) => {
         const { vars, env } = this.createVars(ctx, entry);
         const shell: string | boolean = setup.shell ?? false;

         let done = false;
         let pid: number | undefined;

         let cmd = this.resolveVars(ctx.job.command, vars);
         let args: string[] = [];

         // finish handler
         const finish = (err?: Error) => {
            if (!done) {
               done = true;
               if (err) reject(err);
               else {
                  ctx.result.executed++;
                  ctx.processActivity("EXECUTED", `Process successfully terminated (pid: ${pid})`, ctx.result.executed);
                  resolve();
               }
            }
         };

         // decompose command args
         if (shell === false) ({ cmd, args } = this.splitCommand(cmd));

         // secure check
         if (!cmd.trim()) return finish(new Error("Command is empty!"));

         // get log file descriptor
         const logFd = ctx.getLogFd();

         // start process
         const child = spawn(cmd, args, {
            stdio: ["ignore", verbose ? logFd : "ignore", verbose ? logFd : "ignore"],
            shell,
            cwd: targetDir,
            env: { ...process.env, ...env },
         });

         // remember pid
         pid = child.pid;

         // write log
         ctx.writeLog(`◉ Subprocess started (pid:${pid}) ➜ '${cmd} [${args}]'`);

         // handle sub process end
         child.once("close", (code, signal) => {
            if (code === 0) finish();
            else finish(new Error(`✖ Subprocess (pid:${pid}) failed (code=${code}, signal=${signal})`));
         });

         // handle spawn error
         child.once("error", (err) => finish(err));
      });
   }

   protected createVars(ctx: RunnerContext, entry?: SourceFile): { vars: Record<string, string>; env: Record<string, string> } {
      const vars = {
         jobId: ctx.job.id,
         sourceDir: ctx.sourceDir,
         targetDir: ctx.targetDir,
         scriptDir: this.setup.scriptDir,
         tempDir: this.setup.tempDir,
         logDir: this.setup.logDir,
         file: "",
         fileDir: "",
         fileBase: "",
         fileName: "",
         fileExt: "",
      };

      if (entry) {
         const { dir: fileDir, base: fileBase, name: fileName, ext: fileExt } = parse(entry.sourcePath);
         Object.assign(vars, { file: entry.sourcePath, fileDir, fileBase, fileName, fileExt });
      }

      const env: Record<string, string> = {};

      // resolve environment settings
      for (const [key, value] of Object.entries(ctx.job.environment)) env[key] = this.resolveVars(value, vars);

      Object.assign(env, {
         CROPS_JOB_ID: vars.jobId,
         CROPS_SOURCE_DIR: ctx.sourceDir,
         CROPS_TARGET_DIR: ctx.targetDir,
         CROPS_SCRIPT_DIR: vars.scriptDir,
         CROPS_TEMP_DIR: vars.tempDir,
         CROPS_LOG_DIR: vars.logDir,
         CROPS_DRY_RUN: `${ctx.job.dry_run}`,
         CROPS_VERBOSE: `${ctx.job.verbose}`,
      });

      if (entry) {
         Object.assign(env, {
            CROPS_FILE: vars.file,
            CROPS_FILE_DIR: vars.fileDir,
            CROPS_FILE_BASE: vars.fileBase,
            CROPS_FILE_NAME: vars.fileName,
            CROPS_FILE_EXT: vars.fileExt,
         });
      }

      return { vars, env };
   }

   protected resolveVars(str: string, vars: Record<string, string>): string {
      return str.replace(/\{(\w+)\}/g, (_, key) => (key in vars ? (vars[key] ?? "") : ""));
   }

   protected splitCommand(command: string): { cmd: string; args: string[] } {
      const parts = shellParse(command).map(String);
      return { cmd: parts.shift() ?? "", args: parts };
   }
}
