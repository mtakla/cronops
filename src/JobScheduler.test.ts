import { join, resolve } from "node:path";
import { emptyDir, ensureDir } from "fs-extra";
import { JobScheduler } from "./JobScheduler.js";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { JobRunnerSetup } from "./models/JobRunnerSetup.js";
import { JobError } from "./errors/JobError.js";
import type { Job } from "./types/Config.types.js";

const workDir = resolve("./build/test/JobScheduler");

const setup = new JobRunnerSetup({
   sourceRoot: "./test/fixtures",
   targetRoot: join(workDir, "target"),
   logDir: workDir,
});

beforeEach(async () => {
   await ensureDir(workDir);
   await emptyDir(workDir);
});

describe(JobScheduler.name, () => {
   it("constructor should work", () => {
      const scheduler = new JobScheduler(setup);
      expect(scheduler.scheduledJobs).toBe(0);
   });

   it("scheduling empty job list should not fail", async () => {
      const scheduler = new JobScheduler(setup);
      const cbReady = vi.fn();
      scheduler.onReady(cbReady);
      scheduler.scheduleJobs([]);
      await vi.waitFor(() => {
         expect(scheduler.scheduledJobs).toBe(0);
         expect(cbReady).toBeCalledWith(0, false);
         scheduler.unscheduleAll();
      });
   });

   it("re-scheduling empty job list should not fail", async () => {
      const scheduler = new JobScheduler(setup);
      const cbReady = vi.fn();
      scheduler.onReady(cbReady);
      scheduler.scheduleJobs([]);
      scheduler.scheduleJobs([]);
      await vi.waitFor(() => {
         expect(cbReady).toBeCalledTimes(2);
         expect(cbReady).toBeCalledWith(0, true);
         expect(cbReady).toBeCalledWith(0, false);
         scheduler.unscheduleAll();
      });
   });

   it("scheduling single job should work", async () => {
      const scheduler = new JobScheduler(setup);
      const cbJobScheduled = vi.fn();
      scheduler.onJobScheduled(cbJobScheduled);
      scheduler.scheduleJob({ id: "job1", action: "copy", source: { dir: "/" }, target: { dir: "/" } });
      await vi.waitFor(() => {
         expect(scheduler.scheduledJobs).toBe(1);
         expect(scheduler.isJobScheduled("job1")).toBe(true);
         expect(cbJobScheduled).toBeCalledTimes(1);
         scheduler.unscheduleAll();
      });
   });

   it("scheduling disabled job should fail", async () => {
      const scheduler = new JobScheduler(setup);
      expect(() => {
         scheduler.scheduleJob({ id: "job1", action: "copy", enabled: false });
      }).toThrow(Error);
   });

   it("scheduling job with same id should fail", async () => {
      const scheduler = new JobScheduler(setup);
      expect(() => {
         scheduler.scheduleJob({ id: "job1", action: "archive" });
         scheduler.scheduleJob({ id: "job1", action: "delete" });
      }).toThrow(Error);
   });

   it("scheduling job with invalid source dir should fail", async () => {
      const scheduler = new JobScheduler(setup);
      expect(() => {
         scheduler.scheduleJob({ id: "job1", action: "copy", source: { dir: "/unknown-dir" } });
      }).toThrow(Error);
   });

   it("re-scheduling jobs should work", async () => {
      const scheduler = new JobScheduler(setup);
      const cbReady = vi.fn();
      scheduler.onReady(cbReady);
      scheduler.scheduleJobs([{ id: "job1", action: "copy", source: { dir: "/" }, target: { dir: "/" } }]);
      scheduler.scheduleJobs([
         { id: "job2", action: "exec", command: "git pull" },
         { id: "job3", action: "archive", source: { dir: "/" }, target: { dir: "/" } },
      ]);
      await vi.waitFor(() => {
         expect(scheduler.scheduledJobs).toBe(2);
         expect(scheduler.isJobScheduled("job1")).toBe(false);
         expect(scheduler.isJobScheduled("job2")).toBe(true);
         expect(scheduler.isJobScheduled("job3")).toBe(true);
         expect(cbReady).toBeCalledWith(1, false);
         expect(cbReady).toBeCalledWith(2, true);
         scheduler.unscheduleAll();
      });
   });

   it("validateJob() should fail on invalid cron string", () => {
      const scheduler = new JobScheduler(setup);
      expect(() => {
         scheduler.validateJob({ id: "job", action: "move", cron: "<invalid>" });
      }).toThrow(JobError);
   });

   it("executeJob() should work", async () => {
      const jobs: Job[] = [{ id: "job1", action: "copy", source: { includes: ["**/*.json"] }, target: { dir: "/" }, verbose: true }];
      const scheduler = new JobScheduler(setup);
      const cbJobStarted = vi.fn();
      const cbJobFinished = vi.fn();
      const cbJobActivity = vi.fn();
      const cbJobError = vi.fn();
      scheduler.onJobActivity(cbJobActivity);
      scheduler.onJobStarted(cbJobStarted);
      scheduler.onJobFinished(cbJobFinished);
      scheduler.onJobError(cbJobError);
      scheduler.onJobError((_job, err) => {
         console.log(err);
      });
      scheduler.onReady(() => {
         scheduler.executeJob("job1");
      });
      scheduler.scheduleJobs(jobs);
      await vi.waitFor(() => {
         expect(cbJobStarted).toBeCalledTimes(1);
         expect(cbJobActivity).toBeCalledTimes(2);
         expect(cbJobStarted).toBeCalledWith(expect.objectContaining(jobs[0]));
         expect(cbJobFinished).toBeCalledWith(expect.objectContaining(jobs[0]), expect.objectContaining({ copied: 2 }));
         expect(cbJobError).toBeCalledTimes(0);
         scheduler.unscheduleAll();
      });
   });

   it("executeJob() on unknown job should do nothing", async () => {
      const scheduler = new JobScheduler(setup);
      const cbJobStarted = vi.fn();
      scheduler.onJobStarted(cbJobStarted);
      scheduler.onReady(() => {
         expect(() => {
            scheduler.executeJob("job_unknown");
         }).toThrow(Error);
         scheduler.executeJob("job1");
      });
      scheduler.scheduleJobs([{ id: "job1", action: "copy", source: {}, target: {} }]);
      await vi.waitFor(() => {
         expect(cbJobStarted).toBeCalledTimes(1);
         scheduler.unscheduleAll();
      });
   });

   it("gracefulTerminate() on scheduled job should work", async () => {
      const scheduler = new JobScheduler(setup);
      scheduler.scheduleJobs([{ id: "job1", action: "archive", source: {}, target: {} }]);
      await scheduler.gracefulTerminate(1000);
      expect(scheduler.isJobScheduled("job1")).toBe(false);
      expect(scheduler.scheduledJobs).toBe(0);
   });
});
