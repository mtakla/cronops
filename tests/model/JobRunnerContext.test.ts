import EventEmitter from "node:events";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { JobRunnerContext } from "../../src/models/JobRunnerContext.js";
import { JobModel } from "../../src/models/JobModel.js";
import { join, resolve } from "node:path";
import { emptyDirSync, ensureDirSync, readFileSync } from "fs-extra";
import { JobRunnerSetup } from "../../src/models/JobRunnerSetup.js";
import { closeSync, openSync } from "node:fs";

const workDir = resolve("./build/tests/JobRunnerContext");
const setup = new JobRunnerSetup({ sourceRoot: "/source", targetRoot: "/target" });

beforeAll(() => {
   ensureDirSync(workDir);
   emptyDirSync(workDir);
});

describe(JobRunnerContext.name, () => {
   it("minimum constructor should work", () => {
      const job = new JobModel({ id: "testjob", action: "copy" });
      const ctx = new JobRunnerContext(setup, job);
      expect(ctx.job.id).toBe("testjob");
      expect(ctx.result).toBeDefined();
      expect(ctx.result.copied).toBe(0);
      expect(ctx.sourceDir).toBe("/source");
      expect(ctx.targetDir).toBe("/target");
      expect(ctx.sourceDirs.size).toBe(0);
      expect(ctx.targetDirs.size).toBe(0);
      expect(ctx.targetPermissions).toBeDefined();
   });

   it("full constructor should work", () => {
      const job = new JobModel({ id: "testjob", action: "copy" });
      const events = new EventEmitter();
      const ctx = new JobRunnerContext(setup, job, events, 1173);
      expect(ctx.getLogFd()).toBe(1173);
   });

   it("writeLog() should work", () => {
      const job = new JobModel({ id: "testjob", action: "copy" });
      const logFile = join(workDir, `${job.id}.log`);
      const fd = openSync(logFile, "w");
      const ctx = new JobRunnerContext(setup, job, new EventEmitter(), fd);
      ctx.writeLog("a log entry");
      closeSync(fd);
      expect(readFileSync(logFile, { encoding: "utf-8" })).toBe("a log entry\n");
   });

   it("emitActivityEvent() should work", () => {
      const events = new EventEmitter();
      const job = new JobModel({ id: "testjob", action: "copy", verbose: true });
      const ctx = new JobRunnerContext(setup, job, events);
      const cbActivity = vi.fn();
      events.on("activity", cbActivity);
      ctx.processActivity("activity", "foo", 42);
      expect(cbActivity).toBeCalledTimes(1);
      expect(cbActivity).toBeCalledWith("activity", "foo", 42);
   });

   it("processError() should work", () => {
      const events = new EventEmitter();
      const job = new JobModel({ id: "testjob", action: "copy" });
      const ctx = new JobRunnerContext(setup, job, events);
      const cbError = vi.fn();
      events.on("error", cbError);
      ctx.processError(new Error("error42"));
      expect(cbError).toBeCalledTimes(1);
      expect(cbError).toBeCalledWith(new Error("error42"));
   });
});
