import { join, resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { JobRunnerSetup } from "../../src/models/JobRunnerSetup.js";
import { JobRunnerContext } from "../../src/models/JobRunnerContext.js";
import { JobModel } from "../../src/models/JobModel.js";
import { copySync, emptyDirSync, pathExistsSync } from "fs-extra";
import { closeSync, openSync } from "node:fs";
import { EventEmitter } from "node:stream";
import { FileHistoryModel } from "../../src/models/FileHistoryModel.js";
import { JobError } from "../../src/errors/JobError.js";
import { FileMoveHandler } from "../../src/handlers/FileMoveHandler.js";
import type { Job } from "../../src/types/Config.types.js";

const workDir = resolve("./build/tests/FileMoveHandler");
const fixtureDir = resolve("./tests/fixtures/files");
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

describe(FileMoveHandler.name, () => {
   it("validateJob() should work ", () => {
      const handler = new FileMoveHandler(new JobRunnerSetup({ sourceRoot, targetRoot }));
      expect(() => {
         handler.validateJob({ id: "valid-job", action: "move", source: { dir: "/subfolder" }, target: {} });
      }).not.toThrow(JobError);
      expect(() => {
         handler.validateJob({ id: "missing-target-config", action: "move", source: {} });
      }).toThrow(JobError);
      expect(() => {
         handler.validateJob({ id: "missing-source-dir", action: "move", source: { dir: "unknown" } });
      }).toThrow(JobError);
   });

   it("processFiles() on no files should work", async () => {
      const setup = new JobRunnerSetup({ sourceRoot, targetRoot });
      const ctx = createRunnerContext(setup, {
         id: "no-files",
         action: "move",
         source: { dir: "/" },
         target: { dir: "/" },
      });
      const handler = new FileMoveHandler(setup);
      await handler.processFiles(ctx, [], new FileHistoryModel());
      expect(pathExistsSync(join(targetRoot, "subfolder"))).toBeFalsy();
      expect(errMock).toBeCalledTimes(0);
      closeLog(ctx.getLogFd());
   });

   it("processFiles() on 2 existing files should work", async () => {
      const setup = new JobRunnerSetup({ sourceRoot, targetRoot });
      const ctx = createRunnerContext(setup, {
         id: "delete-two-files",
         action: "move",
         source: { dir: "/" },
         target: { dir: "/" },
      });
      const handler = new FileMoveHandler(setup);
      await handler.processFiles(ctx, ["data1.json", "subfolder/data2.json"], new FileHistoryModel());
      expect(pathExistsSync(join(targetRoot, "subfolder", "data2.json"))).toBeTruthy();
      expect(pathExistsSync(join(sourceRoot, "subfolder", "data2.json"))).toBeFalsy();
      expect(errMock).toBeCalledTimes(0);
      closeLog(ctx.getLogFd());
   });

   it("processFiles() on unknown file should fail", async () => {
      const setup = new JobRunnerSetup({ sourceRoot, targetRoot });
      const ctx = createRunnerContext(setup, {
         id: "error-unknown-file",
         action: "move",
         source: { dir: "/" },
         target: { dir: "/" },
      });
      const handler = new FileMoveHandler(setup);
      await handler.processFiles(ctx, ["data1.json", "subfolder/data2.json", "unknown"], new FileHistoryModel());
      expect(pathExistsSync(join(targetRoot, "subfolder", "data2.json"))).toBeTruthy();
      expect(pathExistsSync(join(sourceRoot, "subfolder", "data2.json"))).toBeFalsy();
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
