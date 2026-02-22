import cron, { type ScheduledTask } from "node-cron";
import { setTimeout } from "node:timers/promises";
import { EventEmitter } from "node:events";
import { ENV } from "../types/Options.types.js";
import type { Task, TaskInfo } from "../types/Task.types.js";

export abstract class AbstractTask<T> implements Task {
   protected cronTask: ScheduledTask;
   protected events = new EventEmitter();
   protected errorCount = 0;
   private runCount = 0;
   private isScheduled = false;
   private isRunning = false;
   private isPaused = false;
   private lastRun?: number;
   private lastDuration?: number;

   constructor(cronStr = "* * * * *") {
      // node-cron async wrapper
      const asyncRunner = async () => {
         // only execute if not paused or prevent overlapping runs
         if (!this.isRunning && !this.isPaused) {
            this.runCount++;
            this.isRunning = true;
            this.lastRun = Date.now();
            try {
               this.events.emit("started");
               this.events.emit("finished", await this.run());
            } catch (err) {
               this.errorCount++;
               this.events.emit("error", err instanceof Error ? err : new Error(String(err)));
            } finally {
               this.isRunning = false;
               this.lastDuration = Date.now() - this.lastRun;
            }
         }
      };

      // get timezone from options/ENV or use UTC as default
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? process.env[ENV.TZ] ?? "UTC";

      // validate cron string
      if (!cron.validate(cronStr)) throw new Error(`Initialization error. Invalid cron string (${cronStr}).`);

      // init
      this.cronTask = cron.createTask(cronStr, asyncRunner, { timezone });
   }

   /**
    * Abstract method to run the task
    * @return Promise returns a promise that resolves with the task result T
    */
   protected abstract run(): Promise<T>;

   public schedule(runImmediately = false) {
      if (runImmediately) this.cronTask.once("task:started", () => this.cronTask.execute());
      this.cronTask.start();
      this.isScheduled = true;
   }

   public unschedule() {
      this.events.removeAllListeners();
      this.cronTask.destroy();
      this.isScheduled = false;
   }

   public pause() {
      this.isPaused = true;
   }

   public resume() {
      this.isPaused = false;
   }

   public getInfo(): TaskInfo {
      return {
         status: this.isRunning ? "running" : this.isPaused ? "paused" : this.isScheduled ? "scheduled" : "unscheduled",
         runCount: this.runCount,
         errorCount: this.errorCount,
         lastRun: this.lastRun,
         lastDuration: this.lastDuration,
      };
   }

   public execute<T>(): Promise<T> {
      const status = this.cronTask.getStatus();
      if (status === "destroyed") throw new Error("Invalid task state (destroyed)");
      if (status === "running" || this.isRunning) throw new Error("Invalid task state (running)");
      this.events.emit("execute");
      return this.cronTask.execute();
   }

   public onScheduled(cb: () => void) {
      this.cronTask.on("task:started", cb);
   }

   public onExecute(cb: () => void) {
      this.events.on("execute", cb);
   }

   public onStarted(cb: () => void) {
      this.events.on("started", cb);
   }

   public onFinished<T>(cb: (result: T) => void) {
      this.events.on("finished", cb);
   }

   public onError(cb: (error: Error) => void) {
      this.events.on("error", (error: Error) => cb(error));
   }

   public async gracefulTerminate(timeout: number = 500) {
      if (this.cronTask.getStatus() !== "destroyed") await this.cronTask.destroy();
      const startTime = Date.now();
      while (this.isRunning && Date.now() - startTime < timeout) {
         await setTimeout(20);
      }
   }
}
