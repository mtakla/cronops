import { join, resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { JobRunnerSetup } from "../models/JobRunnerSetup.js";
import { JobRunnerContext } from "../models/JobRunnerContext.js";
import { JobModel } from "../models/JobModel.js";
import { copySync, emptyDirSync, pathExistsSync } from "fs-extra";
import { closeSync, openSync } from "node:fs";
import { EventEmitter } from "node:stream";
import { FileHistoryModel } from "../models/FileHistoryModel.js";
import { JobError } from "../errors/JobError.js";
import { FileCopyHandler } from "./FileCopyHandler.js";
import type { Job } from "../types/Config.types.js";

const workDir = resolve("./build/test/FileCopyHandler");
const fixtureDir = resolve("./test/fixtures/files");
const sourceRoot = join(workDir, "source");
const targetRoot = join(workDir, "target");
const events = new EventEmitter();

const errMock = vi.fn();
events.on("error", errMock);

const createRunnerContext = (setup: JobRunnerSetup, job: Job) => {
   return new JobRunnerContext(setup, new JobModel(job), events, initLog(job.id));
};

beforeEach(() => {
   emptyDirSync(workDir);
   copySync(fixtureDir, sourceRoot);
   errMock.mockReset();
});

describe(FileCopyHandler.name, () => {
   it("validateJob() should work ", () => {
      const handler = new FileCopyHandler(new JobRunnerSetup({ sourceRoot, targetRoot }));
      expect(() => {
         handler.validateJob({ id: "valid-job", action: "copy", source: { dir: "/subfolder" }, target: {} });
      }).not.toThrow(JobError);
      expect(() => {
         handler.validateJob({ id: "missing-target-config", action: "copy", source: {} });
      }).toThrow(JobError);
      expect(() => {
         handler.validateJob({ id: "missing-source-dir", action: "copy", source: { dir: "unknown" } });
      }).toThrow(JobError);
   });

   it("processFiles() on no files should work", async () => {
      const setup = new JobRunnerSetup({ sourceRoot, targetRoot });
      const ctx = createRunnerContext(setup, {
         id: "no-files",
         action: "copy",
         source: { dir: "/" },
         target: { dir: "/" },
      });
      const handler = new FileCopyHandler(setup);
      await handler.processFiles(ctx, [], new FileHistoryModel());
      expect(pathExistsSync(join(targetRoot, "subfolder"))).toBeFalsy();
      expect(errMock).toBeCalledTimes(0);
      closeLog(ctx.getLogFd());
   });

   it("processFiles() on 2 existing files should work", async () => {
      const setup = new JobRunnerSetup({ sourceRoot, targetRoot });
      const ctx = createRunnerContext(setup, {
         id: "delete-two-files",
         action: "copy",
         source: { dir: "/" },
         target: { dir: "/" },
      });
      const handler = new FileCopyHandler(setup);
      await handler.processFiles(ctx, ["data1.json", "subfolder/data2.json"], new FileHistoryModel());
      expect(pathExistsSync(join(targetRoot, "subfolder", "data2.json"))).toBeTruthy();
      expect(pathExistsSync(join(sourceRoot, "subfolder", "data2.json"))).toBeTruthy();
      expect(errMock).toBeCalledTimes(0);
      closeLog(ctx.getLogFd());
   });

   it("processFiles() on unknown file should fail", async () => {
      const setup = new JobRunnerSetup({ sourceRoot, targetRoot });
      const ctx = createRunnerContext(setup, {
         id: "error-unknown-file",
         action: "copy",
         source: { dir: "/" },
         target: { dir: "/" },
      });
      const handler = new FileCopyHandler(setup);
      await handler.processFiles(ctx, ["data1.json", "subfolder/data2.json", "unknown"], new FileHistoryModel());
      expect(errMock).toBeCalledTimes(1);
      expect(pathExistsSync(join(targetRoot, "subfolder", "data2.json"))).toBeTruthy();
      closeLog(ctx.getLogFd());
   });
});

function initLog(jobId: string): number {
   return openSync(join(workDir, `${jobId}.log`), "w");
}

function closeLog(fd: number) {
   closeSync(fd);
}
