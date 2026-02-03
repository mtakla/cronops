import fsx from "fs-extra";
import YAML from "yaml";
import glob from "fast-glob";
import { join, dirname, parse, resolve } from "node:path";
import { AbstractTask } from "./AbstractTask.js";
import { ZodError } from "zod";
import { fileURLToPath } from "node:url";
import { FileHistoryModel } from "../models/FileHistoryModel.js";
import { type LoaderOptions, ENV } from "../types/Options.types.js";
import { type Job, JobSchema } from "../types/Config.types.js";
import type { FileHistory } from "../types/Task.types.js";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export class JobLoader extends AbstractTask<Job[]> {
   private firstRun = true;
   private jobsDir: string;
   private jobHistory: FileHistory;

   constructor(options: LoaderOptions = {}) {
      super("*/8 * * * * *");
      this.jobsDir = resolve(options.configDir ?? process.env[ENV.CONFIG_DIR] ?? "./config", "jobs");
      this.jobHistory = new FileHistoryModel();
   }

   protected override async run(): Promise<Job[]> {
      const result: Job[] = [];
      const ttime = Date.now();

      if (this.firstRun && !fsx.pathExistsSync(this.jobsDir))
         // does config exist on first start?
         try {
            // try copy default config
            await fsx.copy(join(appDir, "config", "jobs"), this.jobsDir);
         } catch {
            // nop
         }

      // scan job config files
      const entries = await glob(["**/*.yaml"], { cwd: this.jobsDir });

      // notify listeners
      this.events.emit("loading", this.jobsDir, this.firstRun);
      this.firstRun = false;

      // loop all found job entries
      for (const entry of entries) {
         const { name: id } = parse(entry);
         const jobFile = join(this.jobsDir, entry);
         try {
            const stats = await fsx.stat(jobFile);
            const { changed, added } = this.jobHistory.updateSourceEntry(jobFile, [stats.mtimeMs, ttime]);
            if (changed) {
               const jobConfig = JobSchema.parse(YAML.parse(await fsx.readFile(jobFile, "utf-8")));
               const job = { id, ...jobConfig } as Job;
               result.push(job);
               this.events.emit("job-loaded", job, !added);
            }
         } catch (err) {
            const msg = err instanceof ZodError ? `${err.issues[0]?.message}` : String(err);
            this.events.emit("job-loader-error", entry, msg);
         }
      }

      // cleanup jobHistory and get removed jobs
      const removedJobs = this.jobHistory.cleanup();

      // remove jobs
      for (const jobFile of removedJobs) {
         const { name } = parse(jobFile);
         this.events.emit("job-deleted", name);
      }

      // return JobConfig or undefined (no action)
      return result;
   }

   public async loadJobs(): Promise<Job[]> {
      return await this.run();
   }

   public onLoading(cb: (jobsDir: string, firstRun: boolean) => void) {
      this.events.on("loading", cb);
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
}
