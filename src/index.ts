import { JobScheduler } from "./JobScheduler.js";
import { JobModel } from "./models/JobModel.js";
import { JobRunnerSetup } from "./models/JobRunnerSetup.js";
import { ConfigLoader } from "./tasks/ConfigLoader.js";
import { JobRunner } from "./tasks/JobRunner.js";
import type { Job } from "./types/Config.types.js";
import type { LoaderOptions, RunnerOptions } from "./types/Options.types.js";

// type exports
export type { LoaderOptions, RunnerOptions } from "./types/Options.types.js";
export type { Config, Job, Defaults } from "./types/Config.types.js";
export type { RunnerResult } from "./types/Task.types.js";

// export function to create config loader instances
export function createConfigLoader(options: LoaderOptions = {}): ConfigLoader {
   return new ConfigLoader(options);
}

// export function to create job scheduler instances
export function createScheduler(options: RunnerOptions = {}): JobScheduler {
   return new JobScheduler(options);
}

// export function to create single job runner instances
export function createJobRunner(job: Job, options: RunnerOptions = {}): JobRunner {
   const setup = new JobRunnerSetup(options);
   setup.validateJob(job);
   return new JobRunner(new JobModel(job), setup);
}

export default { createConfigLoader, createScheduler, createJobRunner };
