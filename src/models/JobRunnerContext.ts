import { join } from "node:path";
import { fsyncSync, writeSync } from "node:fs";
import { EventEmitter } from "node:events";
import { JobRunnerResult } from "./JobRunnerResult.js";
import type { RunnerContext, RunnerResult } from "../types/Task.types.js";
import type { JobModel } from "./JobModel.js";
import type { PermissionModel } from "./PermissionModel.js";
import type { JobRunnerSetup } from "./JobRunnerSetup.js";

export class JobRunnerContext implements RunnerContext {
   public readonly job: JobModel;
   public readonly result: RunnerResult;
   public readonly startTime: number;
   public readonly sourceDir: string;
   public readonly targetDir: string;
   public readonly sourceDirs: Set<string>;
   public readonly targetDirs: Set<string>;
   public readonly targetPermissions: PermissionModel;
   private events: EventEmitter;
   private logFd: number;

   constructor(setup: JobRunnerSetup, job: JobModel, events: EventEmitter = new EventEmitter(), logFd = 0) {
      this.job = job;
      this.startTime = Date.now();
      this.sourceDir = setup.resolveSourceDir(job.source?.dir);
      this.targetDir = job.dry_run ? join(setup.tempDir, job.id) : setup.resolveTargetDir(job.target?.dir);
      this.sourceDirs = new Set<string>();
      this.targetDirs = new Set<string>();
      this.targetPermissions = job.getTargetPermissions();
      this.result = new JobRunnerResult();
      this.events = events;
      this.logFd = logFd;
   }

   public getLogFd() {
      return this.logFd;
   }

   public writeLog(msg: string) {
      if (this.logFd) writeSync(this.logFd, `${msg}\n`);
   }

   public processError(error: Error): void {
      this.result.errors++;
      this.writeLog(String(error));
      this.events.emit("error", error);
   }

   public processActivity(action: string, path?: string, count?: number): void {
      if (this.logFd) {
         writeSync(this.logFd, `✔ ${action} ${path ? path : ""}\n`);
         fsyncSync(this.logFd);
      }
      if (this.job.verbose) this.events.emit("activity", action, path, count);
   }
}
