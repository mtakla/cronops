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
import { FileArchiveHandler } from "./FileArchiveHandler.js";
import type { Job } from "../types/Config.types.js";

const workDir = resolve("./build/test/FileArchiveHandler");
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

describe(FileArchiveHandler.name, () => {
   it("validateJob() should work ", () => {
      const handler = new FileArchiveHandler(new JobRunnerSetup({ sourceRoot, targetRoot }));
      expect(() => {
         handler.validateJob({ id: "valid-job", action: "archive", source: { dir: "/subfolder" }, target: {} });
      }).not.toThrow(JobError);
      expect(() => {
         handler.validateJob({ id: "missing-target-config", action: "archive", source: {} });
      }).toThrow(JobError);
      expect(() => {
         handler.validateJob({ id: "missing-source-dir", action: "archive", source: { dir: "unknown" } });
      }).toThrow(JobError);
   });

   it("processFiles() on no files should work", async () => {
      const setup = new JobRunnerSetup({ sourceRoot, targetRoot });
      const ctx = createRunnerContext(setup, {
         id: "no-files",
         action: "archive",
         source: { dir: "/" },
         target: { archive_name: "archive.tgz" },
      });
      const handler = new FileArchiveHandler(setup);
      await handler.processFiles(ctx, [], new FileHistoryModel());
      expect(pathExistsSync(join(targetRoot, "archive.tgz"))).toBeFalsy();
      expect(errMock).toBeCalledTimes(0);
      closeLog(ctx.getLogFd());
   });

   it("processFiles() on 2 existing files should work", async () => {
      const setup = new JobRunnerSetup({ sourceRoot, targetRoot });
      const ctx = createRunnerContext(setup, {
         id: "delete-two-files",
         action: "archive",
         source: { dir: "/" },
         target: { archive_name: "archive.tgz" },
      });
      const handler = new FileArchiveHandler(setup);
      await handler.processFiles(ctx, ["data1.json", "subfolder/data2.json"], new FileHistoryModel());
      expect(pathExistsSync(join(targetRoot, "archive.tgz"))).toBeTruthy();
      expect(errMock).toBeCalledTimes(0);
      closeLog(ctx.getLogFd());
   });

   it("processFiles() on unknown file should fail", async () => {
      const setup = new JobRunnerSetup({ sourceRoot, targetRoot });
      const ctx = createRunnerContext(setup, {
         id: "error-unknown-file",
         action: "archive",
         source: { dir: "/" },
         target: { archive_name: "archive.tgz" },
      });
      const handler = new FileArchiveHandler(setup);
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
