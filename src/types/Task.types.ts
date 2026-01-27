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

export type HistoryEntry = {
   path: string;
   mtime: number;
   ttime: number;
};

export type FileHistoryData = {
   source: Record<string, HistoryEntry>;
   target: Record<string, HistoryEntry>;
};

export interface FileHistory {
   data: FileHistoryData;
   changed: boolean;
   hasSourceEntry(path: string, mtimeMs?: number): boolean;
   addSourceEntry(entry: HistoryEntry): void;
   addTargetEntry(entry: HistoryEntry): void;
   markSourceIncluded(path: string): void;
   markTargetOutdated(path: string): void;
   cleanup(): void;
}

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
