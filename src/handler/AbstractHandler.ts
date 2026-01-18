import type { Stats } from "fs-extra";
import type { JobRunnerSetup } from "../models/JobRunnerSetup.js";
import type { RunnerContext } from "../types/Task.types.js";
import type { Job } from "../types/Config.types.js";

export abstract class AbstractHandler {
   protected setup: JobRunnerSetup;

   constructor(setup: JobRunnerSetup) {
      this.setup = setup;
   }

   // empty handler method implementations
   public validateJob(_job: Job): void {}
   public async process(_ctx: RunnerContext): Promise<void> {}
   public async processFile(_ctx: RunnerContext, _fileEntry: string, _stats: Stats): Promise<void> {}
   public async processBeforeFiles(_ctx: RunnerContext, _entries: [string]): Promise<void> {}
   public async processAfterFiles(_ctx: RunnerContext, _entries: [string]): Promise<void> {}

   protected assertSourceConfigExists(job: Job) {
      if (!job.source) throw new Error(`Missing 'source' specs for job ${job.id}. Please check your config file.`);
   }

   protected assertTargetConfigExists(job: Job) {
      if (!job.target) throw new Error(`Missing 'target' specs for job ${job.id}. Please check your config file.`);
   }
}
