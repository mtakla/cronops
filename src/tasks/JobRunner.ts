import glob from "fast-glob";
import { join } from "node:path";
import { ensureDir, moveSync, readJSON, writeJSON } from "fs-extra/esm";
import { AbstractTask } from "./AbstractTask.js";
import { JobRunnerContext } from "../models/JobRunnerContext.js";
import { closeSync, fsyncSync, openSync, writeSync } from "node:fs";
import { JobRunnerResult } from "../models/JobRunnerResult.js";
import { FileHistoryModel } from "../models/FileHistoryModel.js";
import type { JobModel } from "../models/JobModel.js";
import type { JobRunnerSetup } from "../models/JobRunnerSetup.js";
import type { RunnerResult, FileHistory } from "../types/Task.types.js";
import type { Job } from "../types/Config.types.js";

export class JobRunner extends AbstractTask<RunnerResult> {
   public job: JobModel;
   public setup: JobRunnerSetup;

   constructor(job: JobModel, setup: JobRunnerSetup) {
      super(job.cron);
      this.job = job;
      this.setup = setup;
   }

   public onActivity(cb: (action: string, path: string, count: number) => void) {
      this.events.on("activity", cb);
   }

   public async runJob() {
      return await this.run();
   }

   protected override async run() {
      // helper
      const { setup, job, events } = this;

      // discard job execution if job has been disabled
      if (job.enabled === false) return new JobRunnerResult();

      // discard and disable job execution if there are too many errors
      if (this.errorCount >= 25) {
         job.enabled = false;
         throw new Error("Too many errors. Job execution disabled!");
      }

      // ensure log dir exists
      await ensureDir(setup.logDir);

      // init job log file
      const logFd = this.initLog(job);

      // create runner context
      const ctx = new JobRunnerContext(setup, job, events, logFd);

      // get action specific handler
      const handler = setup.getActionHandler(job.action);

      try {
         // process files if source selector is defined
         if (job.source) {
            // ensure source dir exist
            await ensureDir(ctx.sourceDir);

            // determine source entries using fast-glob
            const entries = await glob(job.sourceIncludes, { cwd: ctx.sourceDir, ignore: job.sourceExcludes, dot: true, extglob: false });

            // load source history
            const fileHistory = await this.loadFileHistory(job);

            // delegate file processing to handler
            ctx.writeLog(`Processing source entries ...`);
            await handler.processFiles(ctx, entries, fileHistory);

            // save source history (if changed)
            await this.saveFileHistory(job, fileHistory);
         } else {
            // process without source selector
            await handler.process(ctx);
         }

         // close log file
         this.closeLog(logFd, ctx.startTime);
      } catch (err) {
         // close log with error
         this.closeLog(logFd, ctx.startTime, err instanceof Error ? err : new Error(String(err)));
      }

      // final statistic updates
      ctx.result.endTime = Date.now();

      // return statistics
      return ctx.result;
   }

   protected async loadFileHistory(job: Job): Promise<FileHistory> {
      try {
         const filePath = join(this.setup.logDir, `${job.id}.idx`);
         return new FileHistoryModel(await readJSON(filePath));
      } catch {
         return new FileHistoryModel();
      }
   }

   protected async saveFileHistory(job: Job, fileHistory: FileHistory): Promise<void> {
      if (fileHistory.changed) {
         try {
            const filePath = join(this.setup.logDir, `${job.id}.idx`);
            await writeJSON(filePath, fileHistory.data, { spaces: 4 });
         } catch {}
      }
   }

   protected initLog(job: Job): number {
      try {
         const fd = openSync(join(this.setup.logDir, `${job.id}.log`), "w");
         writeSync(fd, `====== CronOps log for job #${job.id}\n`);
         writeSync(fd, `started: ${new Date().toISOString()}\n`);
         writeSync(fd, `action: ${job.action}\n`);
         return fd;
      } catch (error) {
         this.events.emit("error", new Error(`Cannot create log file for job '${job.id}'.\n └─ ${String(error)}`));
         return 0;
      }
   }

   protected closeLog(fd: number, startTime: number, err?: Error) {
      if (fd)
         try {
            if (err) writeSync(fd, `${String(err)}\n`);
            writeSync(fd, `====== ${err ? "JOB FAILED" : "JOB FINISHED"}\n`);
            writeSync(fd, `(duration: ${Date.now() - startTime}ms)\n`);
            fsyncSync(fd);
            closeSync(fd);
         } catch {}
   }

   protected renameLog(job: Job, tag: string) {
      moveSync(join(this.setup.logDir, `${job.id}.log`), join(this.setup.logDir, `${job.id}.${tag}.log`));
   }
}
