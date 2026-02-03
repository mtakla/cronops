import { EventEmitter } from "node:events";
import { JobRunner } from "./JobRunner.js";
import { JobModel } from "../models/JobModel.js";
import { JobRunnerSetup } from "../models/JobRunnerSetup.js";
import type { Job } from "../types/Config.types.js";
import type { RunnerResult } from "../types/Task.types.js";
import type { RunnerOptions } from "../types/Options.types.js";

export class JobScheduler {
   protected events = new EventEmitter();
   protected runnerSetup: JobRunnerSetup;
   protected runnerMap: Map<string, JobRunner>;
   protected rescheduled = false;

   constructor(options: RunnerOptions = {}) {
      this.runnerSetup = new JobRunnerSetup(options);
      this.runnerMap = new Map();
   }

   get scheduledJobs(): number {
      return this.runnerMap.size;
   }

   get tempDir(): string {
      return this.runnerSetup.tempDir;
   }

   public unscheduleAll() {
      for (const runner of this.runnerMap.values()) runner.unschedule();
      this.runnerMap = new Map();
   }

   public scheduleJobs(jobs: Job[]) {
      // unschedule all scheduled job tasks in the background
      this.unscheduleAll();

      // schedule all configured jobs
      for (const jobEntry of jobs) this.scheduleJob(jobEntry);

      // notify listener if no jobs
      this.events.emit("ready", this.runnerMap.size, this.rescheduled);

      // mark next run as "reschedule"
      this.rescheduled = true;
   }

   /**
    * Schedules a single job
    * @param job job definition
    * @param defaults defaults to use if not defined in job definition
    * @throws JobError if job definition is not valid
    * @throws ValidationError if Job config is not valid
    */
   public scheduleJob(job: Job, defaults = {}) {
      let rescheduled = false;

      // validate job -> throws ValidationError
      this.runnerSetup.validateJob(job);

      // unschedule already existing job
      if (this.runnerMap.has(job.id)) {
         this.runnerMap.get(job.id)?.unschedule();
         rescheduled = true;
      }

      // create new job runner task
      const task = new JobRunner(new JobModel(job, defaults), this.runnerSetup);
      this.runnerMap.set(job.id, task);

      // register events
      task.onScheduled(() => this.events.emit("job-scheduled", job, rescheduled));
      task.onStarted(() => this.events.emit("job-started", job));
      task.onFinished((stat: RunnerResult) => this.events.emit("job-finished", job, stat));
      task.onActivity((activity: string, path: string, count?: number) => this.events.emit("job-activity", job, activity, path, count));
      task.onError((err: Error) => this.events.emit("job-error", job, err));

      // start cron scheduler for this job
      task.schedule();
   }

   public unscheduleJob(jobId: string) {
      const task = this.runnerMap.get(jobId);
      if (task) {
         this.runnerMap.delete(jobId);
         task.unschedule();
      }
   }

   public isJobScheduled(jobId: string): boolean {
      return this.runnerMap.has(jobId);
   }

   public executeJob(jobId: string) {
      if (!this.runnerMap.has(jobId)) throw new Error(`Unknown job [${jobId}]!`);
      this.runnerMap.get(jobId)?.execute();
   }

   public validateJob(job: Job) {
      this.runnerSetup.validateJob(job);
   }

   public async gracefulTerminate(timeout: number = 1000) {
      const jobRunnerTasks = [...this.runnerMap.values()];
      this.unscheduleAll();
      for (const task of jobRunnerTasks) await task.gracefulTerminate(timeout);
   }

   /**
    * Emitted if all configured jobs are initialized & scheduled.
    * @param cb
    */
   public onReady(cb: (jobCount: number, rescheduled: boolean) => void) {
      this.events.on("ready", cb);
   }

   /**
    * Emitted if the job has been successfully scheduled
    * @param cb callback
    */
   public onJobScheduled(cb: (job: Job, rescheduled: boolean) => void) {
      this.events.on("job-scheduled", cb);
   }

   /**
    * Emitted if the job has been started by scheduler or triggered manually via executeJob()
    * @param cb callback
    */
   public onJobStarted(cb: (job: Job) => void) {
      this.events.on("job-started", cb);
   }

   /**
    * Emitted if the job has been finished
    * @param cb callback
    */
   public onJobFinished(cb: (job: Job, stat: RunnerResult) => void) {
      this.events.on("job-finished", cb);
   }

   /**
    * Emitted if there was any kind of activity on the file system during job execution.
    * The `activity` parameter can have the followings values:
    * - `EXECUTED`: a command has been executed (globally or on a selected source file)
    * - `COPIED`: a source file has been copied to `path`
    * - `DELETED`: a source file (`path`) has been deleted by the Job
    * - `ARCHIVED`: selected source files has been archived to `path`
    * - `PRUNED` : a target file (`path`) has been pruned due to expired retention
    * Note: Activity events are *ony* emitted, if job config property `verbose` is set to `true`
    * @param cb callback
    */
   public onJobActivity(cb: (job: Job, activity: string, path: string, count: number) => void) {
      this.events.on("job-activity", cb);
   }

   /**
    * Emitted if any error occurred during job execution
    * @param cb callback
    */
   public onJobError(cb: (job: Job, err: Error) => void) {
      this.events.on("job-error", cb);
   }
}
