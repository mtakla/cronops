import { join, resolve } from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { ExecHandler } from "./ExecHandler.js";
import { JobRunnerSetup } from "../models/JobRunnerSetup.js";
import { JobRunnerContext } from "../models/JobRunnerContext.js";
import { JobModel } from "../models/JobModel.js";
import { emptyDirSync } from "fs-extra";
import { closeSync, openSync } from "node:fs";
import { EventEmitter } from "node:stream";
import type { Job } from "../types/Config.types.js";
import { FileHistoryModel } from "../models/FileHistoryModel.js";
import { JobError } from "../errors/JobError.js";

const workDir = resolve("./build/test/ExecHandler");
const scriptDir = resolve("./test/fixtures/scripts");
const sourceRoot = resolve("./test/fixtures");
const nodeExec = process.argv[0];
const events = new EventEmitter();

const errMock = vi.fn();
events.on("error", errMock);

const createRunnerContext = (setup: JobRunnerSetup, job: Job) => {
   return new JobRunnerContext(setup, new JobModel(job), events, initLog(job.id));
};

beforeAll(() => {
   emptyDirSync(workDir);
   errMock.mockReset();
});

describe(ExecHandler.name, () => {
   it("validateJob() should work ", () => {
      const handler = new ExecHandler(new JobRunnerSetup());
      expect(() => {
         handler.validateJob({ id: "valid-job", action: "exec", command: "ls -la" });
      }).not.toThrow(JobError);
      expect(() => {
         handler.validateJob({ id: "missing-command", action: "exec" });
      }).toThrow(JobError);
   });

   it("process(): calling without shell should work ", async () => {
      const setup = new JobRunnerSetup({ shell: false });
      const ctx = createRunnerContext(setup, {
         id: "exec-ok-os",
         action: "exec",
         command: `${nodeExec} ${join(scriptDir, "exec-ok.js")}`,
      });
      const handler = new ExecHandler(setup);
      await handler.process(ctx);
      closeLog(ctx.getLogFd());
   });

   it("process(): calling with shell should work", async () => {
      const setup = new JobRunnerSetup({ shell: true });
      const ctx = createRunnerContext(setup, {
         id: "exec-ok-shell",
         action: "exec",
         command: `node ${join(scriptDir, "exec-ok.js")}`,
      });
      const handler = new ExecHandler(setup);
      await handler.process(ctx);
      closeLog(ctx.getLogFd());
   });

   it("process(): calling with exit code 1 should fail", async () => {
      const setup = new JobRunnerSetup({ shell: true });
      const ctx = createRunnerContext(setup, {
         id: "test-fail-errorcode",
         action: "exec",
         command: `node ${join(scriptDir, "exec-fail-errorcode.js")}`,
      });
      const handler = new ExecHandler(setup);
      await expect(handler.process(ctx)).rejects.toThrow();
      closeLog(ctx.getLogFd());
   });

   it("process(): calling with exception should fail", async () => {
      const setup = new JobRunnerSetup({ shell: true });
      const ctx = createRunnerContext(setup, {
         id: "exec-fail-exception",
         action: "exec",
         command: `node ${join(scriptDir, "exec-fail-exception.js")}`,
      });
      const handler = new ExecHandler(setup);
      await expect(handler.process(ctx)).rejects.toThrow();
      closeLog(ctx.getLogFd());
   });

   it("process(): calling with extra environment should work", async () => {
      const setup = new JobRunnerSetup({ shell: true, scriptDir });
      const ctx = createRunnerContext(setup, {
         id: "exec-ok-environment",
         action: "exec",
         command: `node {scriptDir}/{jobId}.js`,
         environment: { CRONOPS_TEST_ENV: "foo" },
      });
      const handler = new ExecHandler(setup);
      await handler.process(ctx);
      closeLog(ctx.getLogFd());
   });

   it("processFiles(): calling on 2 sources should work", async () => {
      const setup = new JobRunnerSetup({ shell: false, sourceRoot, scriptDir });
      const ctx = createRunnerContext(setup, {
         id: "exec-ok-files",
         action: "exec",
         command: `node {scriptDir}/{jobId}.js {file}`,
         source: {
            dir: "/files",
         },
      });
      const handler = new ExecHandler(setup);
      await handler.processFiles(ctx, ["data1.json", "subfolder/data2.json"], new FileHistoryModel());
      expect(errMock).toBeCalledTimes(0);
      closeLog(ctx.getLogFd());
   });

   it("processFiles(): calling on missing file should partly fail", async () => {
      const setup = new JobRunnerSetup({ shell: false, sourceRoot, scriptDir });
      const ctx = createRunnerContext(setup, {
         id: "exec-missing-file",
         action: "exec",
         command: `node {scriptDir}/exec-ok-files.js {file}`,
         source: {
            dir: "/files",
         },
      });
      const handler = new ExecHandler(setup);
      await handler.processFiles(ctx, ["data1.json", "subfolder/data2.json", "missing"], new FileHistoryModel());
      expect(errMock).toBeCalledTimes(1);
      closeLog(ctx.getLogFd());
   });
});

function initLog(jobId: string): number {
   return openSync(join(workDir, `${jobId}.log`), "w");
}

function closeLog(fd: number) {
   if (fd) closeSync(fd);
}
