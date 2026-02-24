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
 * Example:
 * ```js
 * import { createJobLoader } from "@mtakla/cronops";
 *
 * // create runner options
 * const jobLoader = createJobLoader({ configDir: "./config" });
 *
 * // called if a job config has beed loaded from config dir (initialy or after change)
 * jobLoader.onJobLoaded((job: Job, isReload: boolean) => {
 *    console.log('job loaded: " + job.id);
 * });
 *
 * // called if a job config has been deleted from the config dir
 * jobLoader.onJobDeleted((jobId: string) => {
 *    console.log("job deleted: " + jobId);
 * });
 *
 * // schedule job loader and execute immediately
 * jobLoader.schedule(true)
 * ```
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
