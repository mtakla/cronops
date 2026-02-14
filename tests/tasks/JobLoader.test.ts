import fsx from "fs-extra";
import { describe, it, expect, beforeAll, vi } from "vitest";
import { join, resolve } from "node:path";
import { JobLoader } from "../../src/tasks/JobLoader.js";

// remember app dir
const workDir = resolve("./build/tests/JobLoader");

beforeAll(async () => {
   await fsx.emptyDir(workDir);
   await fsx.copy("./tests/fixtures", workDir);
});

describe(JobLoader.name, () => {
   it("default jobs dir should be initialized with defaults", async () => {
      const configDir = join(workDir, "defaults");
      const task = new JobLoader({ configDir });
      expect((await task.loadJobs()).length).toBeGreaterThan(0);
      expect(await fsx.pathExists(join(configDir, "jobs", "example-job.yaml"))).toBe(true);
   });

   it("loading test jobs should work", async () => {
      const cbJobLoaded = vi.fn();
      const task = new JobLoader({ configDir: workDir });
      task.onJobLoaded(cbJobLoaded);
      const jobs = await task.loadJobs();
      expect(jobs.length).toBe(2);
      expect(jobs[0]?.id).toBe("test-job1");
      expect(jobs[0]?.action).toBe("copy");
      expect(jobs[1]?.id).toBe("nested/nested-job");
      expect(jobs[1]?.action).toBe("exec");
      expect(cbJobLoaded).toBeCalledTimes(2);
   });

   it("reloading test jobs should not emit loaded event", async () => {
      const cbJobLoaded = vi.fn();
      const task = new JobLoader({ configDir: workDir });
      task.onJobLoaded(cbJobLoaded);
      expect((await task.loadJobs()).length).toBe(2);
      expect(cbJobLoaded).toBeCalledTimes(2);
      expect((await task.loadJobs()).length).toBe(0);
      expect(cbJobLoaded).toBeCalledTimes(2);
   });

   it("changed jobs should be reloaded", async () => {
      const cbJobLoaded = vi.fn();
      const task = new JobLoader({ configDir: workDir });
      task.onJobLoaded(cbJobLoaded);
      expect((await task.loadJobs()).length).toBe(2);
      await fsx.writeFile(join(workDir, "jobs", "test-job1.yaml"), "action: move\n", "utf8");
      const jobs = await task.loadJobs();
      expect(jobs.length).toBe(1);
      expect(jobs[0]?.id).toBe("test-job1");
      expect(jobs[0]?.action).toBe("move");
      expect(cbJobLoaded).toBeCalledTimes(3);
   });

   it("deleted jobs should be emitted", async () => {
      const cbJobDeleted = vi.fn();
      const task = new JobLoader({ configDir: workDir });
      task.onJobDeleted(cbJobDeleted);
      expect((await task.loadJobs()).length).toBe(2);
      await fsx.rm(join(workDir, "jobs", "test-job1.yaml"));
      const jobs = await task.loadJobs();
      expect(jobs.length).toBe(0);
      expect(cbJobDeleted).toBeCalledWith("test-job1");
   });
});
