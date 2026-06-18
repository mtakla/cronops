import fsx from "fs-extra";
import YAML from "yaml";
import glob from "fast-glob";
import { join, dirname, resolve, basename } from "node:path";
import { AbstractTask } from "./AbstractTask.js";
import { ZodError } from "zod";
import { fileURLToPath } from "node:url";
import { FileHistoryModel } from "../models/FileHistoryModel.js";
import { type LoaderOptions, ENV } from "../types/Options.types.js";
import { type Job, JobSchema } from "../types/Config.types.js";
import type { FileHistory } from "../types/Task.types.js";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const entry2id = (str: string) => join(dirname(str), basename(str, ".yaml"));

export class JobLoader extends AbstractTask<Job[]> {
   public configDir: string;
   private firstRun = true;
   private jobHistory: FileHistory;

   constructor(options: LoaderOptions = {}) {
      super("*/8 * * * * *");
      this.configDir = resolve(options.configDir ?? process.env[ENV.CONFIG_DIR] ?? "./config");
      this.jobHistory = new FileHistoryModel();
   }

   public async loadJobs(): Promise<Job[]> {
      return await this.run();
   }

   public onceLoaded(cb: (jobs: Job[]) => void) {
      this.events.once("loaded", cb);
   }

   public onLoadingError(cb: (jobId: string, message: string) => void) {
      this.events.on("job-loader-error", cb);
   }

   public onJobLoaded(cb: (job: Job, isReload: boolean) => void) {
      this.events.on("job-loaded", cb);
   }

   public onJobDeleted(cb: (jobId: string) => void) {
      this.events.on("job-deleted", cb);
   }

   protected override async run(): Promise<Job[]> {
      const jobs: Job[] = [];
      const ttime = Date.now();
      const jobsDir = join(this.configDir, "jobs");

      // does config exist on first start?
      if (this.firstRun && !fsx.pathExistsSync(jobsDir))
         try {
            // copy default config
            await fsx.copy(join(appDir, "config"), this.configDir);
         } catch {
            // nop
         }

      // scan job config files
      const entries = await glob(["**/*.yaml"], { cwd: jobsDir });
      this.firstRun = false;

      // loop all found job entries
      for (const entry of entries) {
         const jobFile = join(jobsDir, entry);
         try {
            const stats = await fsx.stat(jobFile);
            const exist = entry in this.jobHistory.data;
            if (this.jobHistory.checkSourceEntry(entry, stats.mtimeMs)) {
               const jobConfig = JobSchema.parse(YAML.parse(await fsx.readFile(jobFile, "utf-8")));
               const job = { id: entry2id(entry), ...jobConfig } as Job;
               jobs.push(job);
               this.jobHistory.addSourceEntry(entry, [stats.mtimeMs, ttime]);
               this.events.emit("job-loaded", job, exist);
            }
         } catch (err) {
            const msg = err instanceof ZodError ? `${err.issues[0]?.message}` : String(err);
            this.events.emit("job-loader-error", entry, msg);
         }
      }

      // cleanup jobHistory and get removed jobs
      const removedJobs = this.jobHistory.cleanup();

      // notify listeners on removed jobs
      for (const entry of removedJobs) {
         this.events.emit("job-deleted", entry2id(entry));
      }

      // notify listeners
      this.events.emit("loaded", jobs);

      // return (re)loaded jobs
      return jobs;
   }
}
