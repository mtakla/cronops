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
import { FileDeleteHandler } from "./FileDeleteHandler.js";
import type { Job } from "../types/Config.types.js";

const workDir = resolve("./build/test/FileDeleteHandler");
const fixtureDir = resolve("./test/fixtures/files");
const sourceRoot = join(workDir, "source");
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

describe(FileDeleteHandler.name, () => {
   it("validateJob() should work ", () => {
      const handler = new FileDeleteHandler(new JobRunnerSetup({ sourceRoot }));
      expect(() => {
         handler.validateJob({ id: "valid-job", action: "delete", source: { dir: "/subfolder" } });
      }).not.toThrow(JobError);
      expect(() => {
         handler.validateJob({ id: "missing-source-config", action: "delete" });
      }).toThrow(JobError);
      expect(() => {
         handler.validateJob({ id: "missing-source-dir", action: "delete", source: { dir: "unknown" } });
      }).toThrow(JobError);
   });

   it("processFiles() on no files should work", async () => {
      const setup = new JobRunnerSetup({ sourceRoot });
      const ctx = createRunnerContext(setup, {
         id: "no-files",
         action: "delete",
         source: { dir: "/" },
      });
      const handler = new FileDeleteHandler(setup);
      await handler.processFiles(ctx, [], new FileHistoryModel());
      expect(pathExistsSync(join(sourceRoot, "subfolder", "data2.json"))).toBeTruthy();
      expect(errMock).toBeCalledTimes(0);
      closeLog(ctx.getLogFd());
   });

   it("processFiles() on 2 existing files should work", async () => {
      const setup = new JobRunnerSetup({ sourceRoot });
      const ctx = createRunnerContext(setup, {
         id: "delete-two-files",
         action: "delete",
         source: { dir: "/" },
      });
      expect(pathExistsSync(join(sourceRoot, "data1.json"))).toBeTruthy();
      const handler = new FileDeleteHandler(setup);
      await handler.processFiles(ctx, ["data1.json", "subfolder/data2.json"], new FileHistoryModel());
      expect(pathExistsSync(join(sourceRoot, "data1.json"))).toBeFalsy();
      expect(pathExistsSync(join(sourceRoot, "subfolder"))).toBeFalsy();
      expect(errMock).toBeCalledTimes(0);
      closeLog(ctx.getLogFd());
   });

   it("processFiles() on unknown file should fail", async () => {
      const setup = new JobRunnerSetup({ sourceRoot });
      const ctx = createRunnerContext(setup, {
         id: "error-unknown-file",
         action: "delete",
         source: { dir: "/" },
      });
      expect(pathExistsSync(join(sourceRoot, "data1.json"))).toBeTruthy();
      const handler = new FileDeleteHandler(setup);
      await handler.processFiles(ctx, ["data1.json", "subfolder/data2.json", "unknown"], new FileHistoryModel());
      expect(errMock).toBeCalledTimes(1);
      closeLog(ctx.getLogFd());
   });
});

function initLog(jobId: string): number {
   return openSync(join(workDir, `${jobId}.log`), "w");
}

function closeLog(fd: number) {
   closeSync(fd);
}
