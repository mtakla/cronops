import { vi, describe, it, expect } from "vitest";
import { AbstractTask } from "../../src/tasks/AbstractTask.js";
import { setTimeout } from "node:timers/promises";

class TestTask extends AbstractTask<number> {
   override async run() {
      return 111;
   }
}

class ErrorTask extends AbstractTask<void> {
   override async run() {
      throw new Error("failed!");
   }
}

class TimedTask extends AbstractTask<number> {
   override async run() {
      await setTimeout(100);
      return 42;
   }
}

describe(AbstractTask.name, () => {
   it("TestTask initialization should work", async () => {
      const task = new TestTask();
      await expect(task.schedule).toBeDefined();
   });

   it("TestTask initialization with invalid cronStr should fail", () => {
      expect(() => {
         new TestTask("<invalid>");
      }).toThrow(Error);
   });

   it("run() on TestTask should work", async () => {
      const task = new TestTask();
      await expect(task.run()).resolves.toBe(111);
   });

   it("run() on ErrorTask should throw error", async () => {
      const task = new ErrorTask();
      await expect(task.run()).rejects.toThrow();
   });

   it("schedule() on TestTask should work", async () => {
      const task = new TestTask();
      const callback = vi.fn();
      task.onScheduled(callback);
      task.onStarted(callback); // should not be called
      task.schedule();
      await vi.waitFor(() => {
         expect(callback).toBeCalledTimes(1);
      });
      task.unschedule();
   });

   it("schedule() with immediate TestTask execution should work", async () => {
      const task = new TestTask();
      const callback = vi.fn();
      task.onScheduled(callback);
      task.onStarted(callback);
      task.schedule(true);
      await vi.waitFor(() => {
         expect(callback).toBeCalledTimes(2);
         task.unschedule();
      });
   });

   it("schedule() and eventing on TestTask should work", async () => {
      const task = new TestTask();
      const startedCb = vi.fn();
      const finishedCb = vi.fn();
      task.onStarted(startedCb);
      task.onFinished(finishedCb);
      task.schedule(true);
      await vi.waitFor(
         () => {
            expect(startedCb).toHaveBeenCalledTimes(1);
            expect(finishedCb).toHaveBeenCalledWith(111);
            task.unschedule();
         },
         { timeout: 2000 },
      );
   });

   it("schedule() and eventing on ErrorTask should work", async () => {
      const task = new ErrorTask();
      const startedCb = vi.fn();
      const errorCallback = vi.fn();
      task.onStarted(startedCb);
      task.onError(errorCallback);
      task.schedule(true);
      await vi.waitFor(
         () => {
            expect(startedCb).toHaveBeenCalledTimes(1);
            expect(errorCallback).toBeCalled();
            task.unschedule();
         },
         { timeout: 2000 },
      );
   });

   it("execute() after schedule() and eventing should work", async () => {
      const task = new TestTask();
      const startedCb = vi.fn();
      const scheduledCb = vi.fn();
      const finishedCb = vi.fn();
      task.onStarted(startedCb);
      task.onFinished(finishedCb);
      task.onScheduled(() => {
         scheduledCb();
         task.execute();
      });
      task.schedule();
      await vi.waitFor(() => {
         expect(scheduledCb).toHaveBeenCalledTimes(1);
         expect(startedCb).toHaveBeenCalledTimes(1);
         expect(finishedCb).toHaveBeenCalledWith(111);
      });
   });

   it("execute() on TestTask should work", async () => {
      const task = new TestTask();
      const startedCb = vi.fn();
      const finishedCb = vi.fn();
      task.onStarted(startedCb);
      task.onFinished(finishedCb);
      task.execute();
      await vi.waitFor(() => {
         expect(startedCb).toHaveBeenCalledTimes(1);
         expect(finishedCb).toHaveBeenCalledWith(111);
         task.unschedule();
      });
   });

   it("execute() on TimedTask should work", async () => {
      const task = new TimedTask();
      const startedCb = vi.fn();
      const finishedCb = vi.fn();
      task.onStarted(startedCb);
      task.onFinished(finishedCb);
      task.execute();
      await vi.waitFor(() => {
         expect(startedCb).toHaveBeenCalledTimes(1);
         expect(finishedCb).toHaveBeenCalledWith(42);
         task.unschedule();
      });
   });

   it("execute() on paused TimedTask should work", async () => {
      const task = new TimedTask();
      const startedCb = vi.fn();
      const finishedCb = vi.fn();
      task.onStarted(startedCb);
      task.onFinished(finishedCb);
      task.pause();
      task.execute();
      await vi.waitFor(() => {
         expect(startedCb).toHaveBeenCalledTimes(0);
         task.unschedule();
      });
   });

   it("execute() on unscheduled TimedTask should work", async () => {
      const task = new TimedTask();
      const startedCb = vi.fn();
      const finishedCb = vi.fn();
      task.onStarted(startedCb);
      task.onFinished(finishedCb);
      task.execute();
      await vi.waitFor(() => {
         expect(startedCb).toHaveBeenCalledTimes(1);
         expect(finishedCb).toHaveBeenCalledWith(42);
         task.unschedule();
      });
   });

   it("Second execute() on running TimedTask should not work", async () => {
      const task = new TimedTask();
      const startedCb = vi.fn();
      const finishedCb = vi.fn();
      task.onStarted(() => {
         expect(() => {
            task.execute(); // <----- 2nd run
         }).toThrow(Error);
         startedCb();
      });
      task.onFinished(finishedCb);
      task.execute();
      await vi.waitFor(() => {
         expect(startedCb).toHaveBeenCalledTimes(1);
         expect(finishedCb).toHaveBeenCalledTimes(1);
         expect(finishedCb).toHaveBeenCalledWith(42);
         task.unschedule();
      });
   });

   it("resume() on paused TimedTask should work", async () => {
      const task = new TimedTask();
      const startedCb = vi.fn();
      const finishedCb = vi.fn();
      task.onStarted(startedCb);
      task.onFinished(finishedCb);
      task.pause();
      try {
         await task.execute();
      } catch {}
      task.resume();
      await task.execute();
      await vi.waitFor(() => {
         expect(startedCb).toHaveBeenCalledTimes(1);
         expect(finishedCb).toHaveBeenCalledTimes(1);
         task.unschedule();
      });
   });

   it("gracefulTerminate() on TestTask should work", async () => {
      const task = new TestTask();
      const startedCb = vi.fn();
      const finishedCb = vi.fn();
      task.onStarted(startedCb);
      task.onFinished(finishedCb);
      task.execute();
      await task.gracefulTerminate();
      expect(startedCb).toHaveBeenCalledTimes(1);
      expect(finishedCb).toHaveBeenCalledWith(111);
   });

   it("gracefulTerminate() on TimedTask with timeout should work", async () => {
      const task = new TimedTask();
      const finishedCb = vi.fn();
      task.onFinished(finishedCb);
      task.execute();
      await task.gracefulTerminate(10); // <--- low timeout!
      expect(finishedCb).toHaveBeenCalledTimes(0);
   });
});
