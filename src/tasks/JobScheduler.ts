import { JobRunner } from "./JobRunner.js";
import { JobModel } from "../models/JobModel.js";
import { JobRunnerSetup } from "../models/JobRunnerSetup.js";
import { AbstractTask } from "./AbstractTask.js";
import type { Job } from "../types/Config.types.js";
import type { RunnerResult, TaskInfo } from "../types/Task.types.js";
import type { RunnerOptions } from "../types/Options.types.js";

type SchedulingInfo = Job & TaskInfo;

export class JobScheduler extends AbstractTask<void> {
   protected runnerSetup: JobRunnerSetup;
   protected runnerMap: Map<string, JobRunner>;
   private changed = false;
   private isReload = false;

   constructor(options: RunnerOptions = {}) {
      super("*/5 * * * * *");
      this.runnerSetup = new JobRunnerSetup(options);
      this.runnerMap = new Map();
   }

   get scheduledJobs(): number {
      return this.runnerMap.size;
   }

   get tempDir(): string {
      return this.runnerSetup.tempDir;
   }

   protected override async run(): Promise<void> {
      if (this.changed) {
         this.changed = false;
         this.events.emit("schedule-changed", this.isReload);
         this.isReload = true;
      }
   }

   public pauseAll() {
      for (const runner of this.runnerMap.values()) runner.resume();
   }

   public resumeAll() {
      for (const runner of this.runnerMap.values()) runner.resume();
   }

   public unscheduleAll() {
      for (const runner of this.runnerMap.values()) runner.unschedule();
      this.runnerMap = new Map<string, JobRunner>();
      this.changed = true;
   }

   public scheduleJobs(jobs: Job[], cb?: (count: number) => void) {
      // unschedule all scheduled job tasks in the background
      this.unscheduleAll();

      // schedule jobs
      for (const jobEntry of jobs) this.scheduleJob(jobEntry);

      // callback
      if (cb) cb(this.runnerMap.size);
   }

   /**
    * Schedules a single job
    * @param job job definition
    * @throws JobError if job definition is not valid
    * @throws JobError if Job config is not valid
    */
   public scheduleJob(job: Job) {
      let rescheduled = false;

      // validate job --> throws JobError
      this.runnerSetup.validateJob(job);

      // unschedule already existing job
      if (this.runnerMap.has(job.id)) {
         this.runnerMap.get(job.id)?.unschedule();
         rescheduled = true;
      }

      // create new job runner task
      const task = new JobRunner(new JobModel(job), this.runnerSetup);
      this.runnerMap.set(job.id, task);

      // register events
      task.onScheduled(() => this.events.emit("job-scheduled", job, rescheduled));
      task.onExecute(() => this.events.emit("job-execute", job));
      task.onStarted(() => this.events.emit("job-started", job));
      task.onFinished((stat: RunnerResult) => this.events.emit("job-finished", job, stat));
      task.onActivity((activity: string, path: string, count?: number) => this.events.emit("job-activity", job, activity, path, count));
      task.onError((err: Error) => this.events.emit("job-error", job, err));

      // start cron scheduler for this job
      task.schedule();

      // if job is disabled => pause job execution
      if (job.enabled === false) task.pause();

      // mark as changed
      this.changed = true;
   }

   public unscheduleJob(jobId: string) {
      const task = this.runnerMap.get(jobId);
      if (task) {
         this.runnerMap.delete(jobId);
         this.changed = true;
         task.unschedule();
      }
   }

   public isJobScheduled(jobId: string): boolean {
      return this.runnerMap.has(jobId);
   }

   public getJob(jobId: string): Job | undefined {
      return this.runnerMap.get(jobId)?.job;
   }

   public executeJob(jobId: string) {
      if (!this.runnerMap.has(jobId)) throw new Error(`Unknown job [${jobId}]!`);
      this.runnerMap.get(jobId)?.execute();
   }

   public validateJob(job: Job) {
      this.runnerSetup.validateJob(job);
   }

   public pauseScheduling() {
      for (const task of this.runnerMap.values()) this.pauseJobScheduling(task.job.id);
      this.changed = true;
   }

   public resumeScheduling() {
      for (const task of this.runnerMap.values()) this.resumeJobScheduling(task.job.id);
      this.changed = true;
   }

   public pauseJobScheduling(jobId: string) {
      const task = this.runnerMap.get(jobId);
      if (task) task.pause();
   }

   public resumeJobScheduling(jobId: string) {
      const task = this.runnerMap.get(jobId);
      if (task && task.job.enabled !== false) task.resume();
   }

   public getScheduledJobs(): Job[] {
      return Array.from(this.runnerMap.values()).map((runner) => runner.job);
   }

   public getScheduledJobsInfo(): SchedulingInfo[] {
      return Array.from(this.runnerMap.values()).map((runner) => Object.assign({}, runner.job, runner.getInfo()));
   }

   public override async gracefulTerminate(timeout: number = 1000) {
      const jobRunnerTasks = [...this.runnerMap.values()];
      this.unscheduleAll();
      // graceful terminate all scheduled tasks including "self"
      await super.gracefulTerminate(timeout);
      for (const task of jobRunnerTasks) await task.gracefulTerminate(timeout);
   }

   /**
    * Emitted if job schedule has been changed (checked every 5 seconds)
    * @param cb callback function
    */
   public onChanged(cb: (initialConfig: boolean) => void) {
      this.events.on("schedule-changed", cb);
   }

   /**
    * Emitted if the job has been successfully scheduled
    * @param cb callback
    */
   public onJobScheduled(cb: (job: Job, rescheduled: boolean) => void) {
      this.events.on("job-scheduled", cb);
   }

   /**
    * Emitted if manual job execution has been started via executeJob().
    * Note: This event is not emitted, if the job is paused or already running
    * @param cb callback
    */
   public onJobExecute(cb: (job: Job) => void) {
      this.events.on("job-execute", cb);
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
    * Emitted if there was any kind of activity during job execution.
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
