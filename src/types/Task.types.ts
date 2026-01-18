import type { Stats } from "fs-extra";
import type { Job } from "./Config.types";
import type { JobModel } from "../models/JobModel";
import type { JobLog } from "./JobLog.types";
import type { PermissionModel } from "../models/PermissionModel";

export type JobRunnerResult = {
   copied: number;
   deleted: number;
   archived: number;
   pruned: number;
   tracked: number;
   started: number;
   finished: number;
};

export interface Task {
   schedule(runImmediately?: boolean): void;
   unschedule(): void;
   execute(cb: () => void): void;
   onScheduled(cb: () => void): void;
   onStarted(cb: () => void): void;
   onFinished<T>(cb: (result: T) => void): void;
   onError(cb: (error: Error, errorCount: number) => void): void;
   gracefulTerminate(timeout: number): void;
}

export interface RunnerContext {
   job: JobModel;
   jobLog: JobLog;
   result: JobRunnerResult;
   sourceDir: string;
   targetDir: string;
   sourceDirs: Set<string>;
   targetDirs: Set<string>;
   targetPermissions: PermissionModel;
   logFd: number;
   activity(message: string, ...args: unknown[]): void;
   error(message: string, file?: string): void;
}

export interface ActionHandler {
   isFileHandler: boolean;
   isGlobalHandler: boolean;
   useFileLog: boolean;
   validateJob(Job: Job): void;
   process(ctx: RunnerContext): Promise<void>;
   processFile(ctx: RunnerContext, fileEntry: string, fileStats: Stats): Promise<void>;
   processBeforeFiles(ctx: RunnerContext, entries: [string]): Promise<void>;
   processAfterFiles(ctx: RunnerContext, entries: [string]): Promise<void>;
}
