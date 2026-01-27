import cron, { type ScheduledTask } from "node-cron";
import { setTimeout } from "node:timers/promises";
import { EventEmitter } from "node:events";
import { ENV } from "../types/Options.types.js";
import type { Task } from "../types/Task.types.js";

export abstract class AbstractTask<T> implements Task {
   protected cronTask: ScheduledTask;
   protected events = new EventEmitter();
   protected errorCount = 0;
   private isRunning = false;

   constructor(cronStr = "* * * * *") {
      // node-cron async wrapper
      const asyncRunner = async () => {
         // prevent overlapping runs
         if (!this.isRunning) {
            this.isRunning = true;
            try {
               this.events.emit("started");
               this.events.emit("finished", await this.run());
            } catch (err) {
               this.events.emit("error", err instanceof Error ? err : new Error(String(err)));
            } finally {
               this.isRunning = false;
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
      if (runImmediately) this.cronTask.once("task:started", () => this.execute());
      this.cronTask.start();
   }

   public unschedule() {
      this.events.removeAllListeners();
      this.cronTask.destroy();
   }

   public execute(cb?: (result: T) => void) {
      const status = this.cronTask.getStatus();
      if (status === "destroyed") throw new Error("Invalid task state (destroyed)");
      if (status === "running" || this.isRunning) throw new Error("Invalid task state (running)");
      if (cb) this.events.once("finished", cb);
      this.cronTask.execute();
   }

   public onScheduled(cb: () => void) {
      this.cronTask.on("task:started", cb);
   }

   public onStarted(cb: () => void) {
      this.events.on("started", cb);
   }

   public onFinished<T>(cb: (result: T) => void) {
      this.events.on("finished", cb);
   }

   public onError(cb: (error: Error) => void) {
      this.errorCount++;
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
