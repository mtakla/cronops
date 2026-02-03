#!/usr/bin/env node
import chalk from "chalk";
import fsx from "fs-extra";
import http from "node:http";
import figlet from "figlet";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { JobLoader } from "./tasks/JobLoader.js";
import { JobScheduler } from "./JobScheduler.js";
import { ENV } from "./types/Options.types.js";
import type { Job } from "./types/Config.types.js";
import type { RunnerResult } from "./types/Task.types.js";

// helper
const plural = (n: number, noun: string) => `${n > 0 ? n : "no"} ${noun}${n !== 1 ? "s" : ""}`;
const appDir = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Entry point to start server
 */
export async function start() {
   // create app setup model with defaults
   const port = process.env[ENV.PORT] ?? 8778;

   // create config loader & job scheduler instance
   const jobLoader = new JobLoader();
   const jobScheduler = new JobScheduler();

   try {
      // remove health check file
      await fsx.remove("/tmp/cronops_healthy");

      // read app package
      const packageJSON = await fsx.readJSON(join(appDir, "package.json"));

      // log welcome message
      console.log(figlet.textSync("CronOps", { horizontalLayout: "fitted" }));
      console.log(chalk.cyan.bold(`\n☰ CronOps v${packageJSON.version}`) + chalk.cyan.italic(` »Omnia coniuncta sunt«`));

      // remove dry_run artifacts from previous runs
      await fsx.emptyDir(jobScheduler.tempDir);
   } catch (err) {
      console.error(`CronOps initialization error. ${err instanceof Error ? err.stack : err}`);
      console.error(`Please check environment settings.`);
      process.exit(1);
   }

   jobLoader.onLoading((jobsDir: string, firstRun: boolean) => {
      if (firstRun) console.log(`\nLoading job config from ${jobsDir} ...`);
   });

   jobLoader.onLoadingError((entry: string, message: string) => {
      console.log(`🔴 Error loading job '${entry}'. ${message}`);
      //fsx.removeSync("/tmp/cronops_healthy");
   });

   // called if config file has been loaded/reloaded
   jobLoader.onJobLoaded((job: Job) => {
      jobScheduler.scheduleJob(job);
   });

   // called if config file has been loaded/reloaded
   jobLoader.onJobDeleted((jobId: string) => {
      jobScheduler.unscheduleJob(jobId);
      console.log(`⭕ job [${jobId}] unscheduled (removed from file system)`);
   });

   jobScheduler.onJobScheduled((job: Job, reschedule) => {
      if (job.enabled === false) console.log(`⭕ job [${job.id}] unscheduled (disabled)`);
      else console.log(`🕔 job [${job.id}] ${reschedule ? "re-" : ""}scheduled (${chalk.greenBright(job.cron)})${job.dry_run ? " 👋 DRY-RUN mode!" : ""}`);
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

   // create simple http admin endpoint to manually trigger jobs via HTTP POST /trigger/{jobId}
   const httpServer = http.createServer(async (req, res) => {
      const { method, url } = req;

      // Pattern Matching für /trigger/{{jobId}}
      if (method === "POST" && url?.startsWith("/trigger/")) {
         const jobId = url.split("/")[2] || "";
         if (!jobScheduler.isJobScheduled(jobId)) return res.writeHead(400).end(`Job '${jobId}' not found\n`);
         try {
            console.log(`[${jobId}] JOB manually triggered via HTTP request`);
            jobScheduler.executeJob(jobId);
            res.writeHead(202, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ accepted: true, job: jobId }, null, 3));
         } catch (error) {
            console.error(`[${jobId}] ${String(error)}`);
            res.writeHead(202, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ accepted: true, job: jobId }, null, 3));
         }
      }
      return res.writeHead(404).end("Not found!");
   });

   // start http server
   httpServer.listen(port, () => {
      console.log(`Web-Admin API listening on port ${port} ...`);
      console.log(chalk.gray(`⎆ to get server status, type           curl -X GET http://localhost:${port}/status`));
      console.log(chalk.gray(`⎆ to trigger a job manually, type      curl -X POST http://localhost:${port}/trigger/{job-id}`));
      console.log(chalk.gray(`⎆ to gracefully terminate server,type  curl -X POST http://localhost:${port}/terminate`));
   });

   // schedule config loader, load config & schedule jobs
   jobLoader.schedule(true);
}

// server entry point
await start();
