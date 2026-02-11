#!/usr/bin/env node
import chalk from "chalk";
import fsx from "fs-extra";
import figlet from "figlet";
import webapi from "./api/webapi.js";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { JobLoader } from "./tasks/JobLoader.js";
import { JobScheduler } from "./tasks/JobScheduler.js";
import type { Job } from "./types/Config.types.js";
import type { RunnerResult } from "./types/Task.types.js";

// helper
const plural = (n: number, noun: string) => `${n > 0 ? n : "no"} ${noun}${n !== 1 ? "s" : ""}`;
const appDir = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Entry point to start server
 */
export async function start() {
   // create config loader & job scheduler instance
   const jobLoader = new JobLoader();
   const jobScheduler = new JobScheduler();

   try {
      // read app package
      const packageJSON = await fsx.readJSON(join(appDir, "package.json"));

      // log welcome message
      console.log(figlet.textSync("CronOps", { horizontalLayout: "fitted" }));
      console.log(chalk.cyan.bold(`\n☰ CronOps v${packageJSON.version}`) + chalk.cyan.italic(` »Omnia coniuncta sunt«`));
      console.log(`Monitoring job configs in ${join(jobLoader.configDir, "jobs")} ...`);

      // remove temp dir (dry_run artifacts from previous runs)
      await fsx.emptyDir(jobScheduler.tempDir);

      // init web api
      webapi(jobScheduler);
   } catch (err) {
      console.error(`CronOps initialization error. ${err instanceof Error ? err.stack : err}`);
      console.error(`Please check environment settings.`);
      process.exit(1);
   }

   jobLoader.onLoadingError((entry: string, message: string) => {
      console.log(`🔴 Error loading job '${entry}'. ${message}`);
   });

   // called if config file has been loaded/reloaded
   jobLoader.onJobLoaded((job: Job) => {
      if (job.enabled !== false) jobScheduler.scheduleJob(job);
   });

   // called if config file has been removed from file system
   jobLoader.onJobDeleted((jobId: string) => {
      jobScheduler.unscheduleJob(jobId);
   });

   jobScheduler.onChanged((isReload: boolean) => {
      const jobs = jobScheduler.getScheduledJobs();
      console.log(`\nJob config ${isReload ? "changed" : "loaded"} (${plural(jobs.length, "active job")})`);
      for (const job of jobs) {
         console.log(` 🕔 [${job.id}] scheduled (${chalk.greenBright(job.cron)})${job.dry_run ? " 👋 DRY-RUN mode!" : ""}`);
      }
   });

   jobScheduler.onJobError((job: Job, err: Error) => {
      console.error(chalk.red(`[${job.id}] ERROR ${err.message}`));
   });

   jobScheduler.onJobActivity((job: Job, action: string, path: string, count: number) => {
      if (action === "COPIED") console.log(`[${job.id}] ⛃ COPIED → '${path}'`);
      else if (action === "DELETED") console.log(`[${job.id}] ⛃ DELETED '${path}'`);
      else if (action === "ARCHIVED") console.log(`[${job.id}] ⛃ ARCHIVED ${plural(count, "file")} to '${path}'`);
      else if (action === "EXECUTED") console.log(`[${job.id}] ➤➤ EXECUTED '${path}'`);
      else if (action === "PRUNED") console.log(`[${job.id}] ⛃ PRUNED target file '${path}'`);
   });

   jobScheduler.onJobFinished((job: Job, stat: RunnerResult) => {
      if (!job.verbose && stat.copied + stat.deleted + stat.archived + stat.executed > 0) {
         if (stat.copied > 0 && stat.deleted > 0) console.log(`[${job.id}] ✔ MOVED ${stat.copied} in ${stat.durationMs}ms`);
         else if (stat.copied > 0) console.log(`[${job.id}] ✔ COPIED ${plural(stat.copied, "file")} in ${stat.durationMs}ms`);
         else if (stat.deleted > 0) console.log(`[${job.id}] ✔ DELETED ${plural(stat.deleted, "file")} in ${stat.durationMs}ms`);
         else if (stat.archived > 0) console.log(`[${job.id}] ✔ ARCHIVED ${plural(stat.archived, "file")} in ${stat.durationMs}ms`);
         else if (stat.executed === 1) console.log(`[${job.id}] ✔ Command EXECUTED in ${stat.durationMs}ms`);
         else if (stat.executed > 1) console.log(`[${job.id}] ✔ Command EXECUTED on ${plural(stat.executed, "file")} in ${stat.durationMs}ms`);
      }
   });

   // handle sigterm for proper server/container termination
   process.on("SIGTERM", async () => {
      console.log("SIGTERM received. Shutting down CronOps ...");
      if (jobLoader) await jobLoader.gracefulTerminate(2000);
      if (jobScheduler) await jobScheduler.gracefulTerminate(2000);
      process.exit(0);
   });

   // global error handler
   // biome-ignore lint/suspicious/noExplicitAny: <shorthand>
   process.on("uncaughtException", (err: any, origin: any) => {
      console.error(`Unexpected Termination. Origin: ${origin}. ${err instanceof Error ? err.stack : err}`);
      process.exit(-1);
   });

   // schedule config loader, load config & schedule jobs
   jobLoader.schedule(true);
   jobScheduler.schedule();
}

// server entry point
await start();
