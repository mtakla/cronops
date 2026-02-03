import type { Stats } from "fs-extra";
import type { Job } from "./Config.types.js";
import type { JobModel } from "../models/JobModel.js";
import type { PermissionModel } from "../models/PermissionModel.js";

export type RunnerResult = {
   copied: number;
   deleted: number;
   archived: number;
   executed: number;
   pruned: number;
   errors: number;
   startTime: number;
   endTime: number;
   durationMs: number;
};

export type SourceFile = {
   sourceEntry: string;
   sourcePath: string;
   stats: Stats;
};

export type FileHistoryData = {
   source: Record<string, [number, number]>;
   target: Record<string, [number, number]>;
};

export type FileHistory = {
   data: FileHistoryData;
   changed: boolean;
   updateSourceEntry(path: string, [mtime, atime]: [number, number]): { changed: boolean; added: boolean };
   addTargetEntry(path: string, [mtime, atime]: [number, number]): void;
   markTargetOutdated(path: string): void;
   cleanup(): string[];
};

export interface Task {
   schedule(runImmediately?: boolean): void;
   unschedule(): void;
   execute(cb: () => void): void;
   onScheduled(cb: () => void): void;
   onStarted(cb: () => void): void;
   onFinished<T>(cb: (result: T) => void): void;
   onError(cb: (error: Error) => void): void;
   gracefulTerminate(timeout: number): void;
}

export interface RunnerContext {
   job: JobModel;
   result: RunnerResult;
   startTime: number;
   sourceDir: string;
   sourceDirs: Set<string>;
   targetDir: string;
   targetDirs: Set<string>;
   targetPermissions: PermissionModel;
   getLogFd(): number;
   writeLog(message: string): void;
   processActivity(action: string, path?: string, count?: number): void;
   processError(error: Error): void;
}

export interface ActionHandler {
   validateJob(Job: Job): void;
   process(ctx: RunnerContext): Promise<void>;
   processFiles(ctx: RunnerContext, entries: string[], fileHistory: FileHistory): Promise<void>;
}
