import { JobScheduler } from "./tasks/JobScheduler.js";
import { JobModel } from "./models/JobModel.js";
import { JobRunnerSetup } from "./models/JobRunnerSetup.js";
import { JobLoader } from "./tasks/JobLoader.js";
import { JobRunner } from "./tasks/JobRunner.js";
import type { Job } from "./types/Config.types.js";
import type { LoaderOptions, RunnerOptions } from "./types/Options.types.js";

// type exports
export type { LoaderOptions, RunnerOptions } from "./types/Options.types.js";
export type { RunnerResult } from "./types/Task.types.js";
export type { Job } from "./types/Config.types.js";

/**
 * Creates a `JobLoader` instance to watch and auto-reload job configurations
 * @param options loader options
 * @returns the created `JobLoader`instance
 */
export function createJobLoader(options: LoaderOptions = {}): JobLoader {
   return new JobLoader(options);
}

/**
 * Creates a `JobScheduler` instance to manage and monitor multiple job schedules
 * @param options runner options
 * @returns the created `JobScheduler`instance
 */
export function createJobScheduler(options: RunnerOptions = {}): JobScheduler {
   return new JobScheduler(options);
}

/**
 * Creates a `JobRunner` instance to schedule or execute a single job
 * @param job the job configuration
 * @param options runner options
 * @returns the created `JobRunner` instance
 */
export function createJobRunner(job: Job, options: RunnerOptions = {}): JobRunner {
   const setup = new JobRunnerSetup(options);
   setup.validateJob(job);
   return new JobRunner(new JobModel(job), setup);
}

export default { createJobLoader, createJobScheduler, createJobRunner };
