import os from "node:os";
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
      this.configDir = resolve(options.configDir ?? process.env[ENV.CONFIG_DIR] ?? join(os.homedir(), ".cronops", "config"));
      this.jobHistory = new FileHistoryModel();
   }

   protected override async run(): Promise<Job[]> {
      const result: Job[] = [];
      const ttime = Date.now();
      const jobsDir = join(this.configDir, "jobs");

      if (this.firstRun && !fsx.pathExistsSync(jobsDir))
         // does config exist on first start?
         try {
            // copy default config
            await fsx.copy(join(appDir, "config"), this.configDir);
         } catch {
            // nop
         }

      // scan job config files
      const entries = await glob(["**/*.yaml"], { cwd: jobsDir });

      // notify listeners
      this.firstRun = false;

      // loop all found job entries
      for (const entry of entries) {
         const jobFile = join(jobsDir, entry);
         try {
            const stats = await fsx.stat(jobFile);
            const { changed, added } = this.jobHistory.updateSourceEntry(entry, [stats.mtimeMs, ttime]);
            if (changed) {
               const jobConfig = JobSchema.parse(YAML.parse(await fsx.readFile(jobFile, "utf-8")));
               const job = { id: entry2id(entry), ...jobConfig } as Job;
               result.push(job);
               this.events.emit("job-loaded", job, !added);
            }
         } catch (err) {
            console.log(err);
            const msg = err instanceof ZodError ? `${err.issues[0]?.message}` : String(err);
            this.events.emit("job-loader-error", entry, msg);
         }
      }

      // cleanup jobHistory and get removed jobs
      const removedJobs = this.jobHistory.cleanup();

      // remove jobs
      for (const entry of removedJobs) {
         this.events.emit("job-deleted", entry2id(entry));
      }

      // notify loaded listener
      this.events.emit("loaded", result);

      // return (re)loaded jobs
      return result;
   }

   public async loadJobs(): Promise<Job[]> {
      return await this.run();
   }

   public onceLoaded(cb: (jobs: Job[]) => void) {
      this.events.on("loaded", cb);
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
