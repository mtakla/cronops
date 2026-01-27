#!/usr/bin/env node
import chalk from "chalk";
import fsx from "fs-extra";
import http from "node:http";
import figlet from "figlet";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ConfigLoader } from "./tasks/ConfigLoader.js";
import { JobScheduler } from "./JobScheduler.js";
import { ENV } from "./types/Options.types.js";
import { JobError } from "./errors/JobError.js";
import type { Config, Job } from "./types/Config.types.js";
import type { RunnerResult } from "./types/Task.types.js";

// helper
const plural = (noun: string, n: number) => `${n > 0 ? n : "no"} ${noun}${n !== 1 ? "s" : ""}`;
const appDir = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Entry point to start server
 */
export async function start() {
   // create app setup model with defaults
   const port = process.env[ENV.PORT] ?? 8778;

   // create config loader & job scheduler instance
   const configLoader = new ConfigLoader();
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

   // called when config file is going to be loaded/reloaded
   configLoader.onLoading((configFile, isReload) => {
      console.log(`\n${isReload ? "Reloading" : "Loading"} config from '${configFile}' ...`);
   });

   // called if config file has been loaded/reloaded
   configLoader.onLoaded((config: Config) => {
      validateConfig(config, jobScheduler);
      jobScheduler.scheduleJobs(config);
   });

   // called if config cannot be loaded
   configLoader.onError((err) => {
      console.error(chalk.red(`ERROR loading configuration: ${err.message}`));
      console.log(`🔴 No jobs scheduled (invalid config)\n`);
      jobScheduler.unscheduleAll();
      fsx.removeSync("/tmp/cronops_healthy");
   });

   jobScheduler.onReady((jobCount, rescheduled) => {
      if (jobCount) console.log(`🟢 ${plural("job", jobCount)} ${rescheduled ? "re" : ""}scheduled\n`);
      else console.log(`🟡 No jobs scheduled\n`);
      fsx.ensureFileSync("/tmp/cronops_healthy");
   });

   jobScheduler.onJobScheduled((job: Job) => {
      console.log(`🕔 job [${job.id}] scheduled (${job.cron})${job.dry_run ? " 👋 DRY-RUN mode!" : ""}`);
   });

   jobScheduler.onJobError((job: Job, err: Error) => {
      console.error(chalk.red(`[${job.id}] ERROR ${err.message}`));
   });

   jobScheduler.onJobActivity((job: Job, action: string, path: string, count: number) => {
      if (action === "COPIED") console.log(`[${job.id}] ⛃ COPIED → '${path}'`);
      else if (action === "DELETED") console.log(`[${job.id}] ⛃ DELETED '${path}'`);
      else if (action === "ARCHIVED") console.log(`[${job.id}] ⛃ ARCHIVED ${count} file(s) to '${path}'`);
      else if (action === "EXECUTED") console.log(`[${job.id}] ➤➤ EXECUTED '${path}'`);
      else if (action === "PRUNED") console.log(`[${job.id}] ⛃ PRUNED target file '${path}'`);
   });

   jobScheduler.onJobFinished((job: Job, stat: RunnerResult) => {
      if (!job.verbose && stat.copied + stat.deleted + stat.archived + stat.executed > 0) {
         if (stat.copied > 0 && stat.deleted > 0) console.log(`[${job.id}] ✔ MOVED ${stat.copied} in ${stat.durationMs}ms`);
         else if (stat.copied > 0) console.log(`[${job.id}] ✔ COPIED ${plural("file", stat.copied)} in ${stat.durationMs}ms`);
         else if (stat.deleted > 0) console.log(`[${job.id}] ✔ DELETED ${plural("file", stat.deleted)} in ${stat.durationMs}ms`);
         else if (stat.archived > 0) console.log(`[${job.id}] ✔ ARCHIVED ${plural("file", stat.archived)} in ${stat.durationMs}ms`);
         else if (stat.executed === 1) console.log(`[${job.id}] ✔ Command EXECUTED in ${stat.durationMs}ms`);
         else if (stat.executed > 1) console.log(`[${job.id}] ✔ Command EXECUTED on ${plural("file", stat.executed)} in ${stat.durationMs}ms`);
      }
   });

   // handle sigterm for proper server/container termination
   process.on("SIGTERM", async () => {
      console.log("SIGTERM received. Shutting down CronOps ...");
      if (configLoader) await configLoader.gracefulTerminate(2000);
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
   configLoader.schedule(true);
}

function validateConfig(config: Config, scheduler: JobScheduler): void {
   const seen = new Set();
   const validJobs = [];
   for (const job of config.jobs) {
      // disabled jobs can be ignored
      if (job.enabled === false) continue;

      // error on violation of job id uniqueness
      if (seen.has(job.id)) throw new Error(`Unique job id violation ('${job.id}')`);
      seen.add(job.id);

      try {
         scheduler.validateJob(job);
         validJobs.push(job);
      } catch (error) {
         const issue = error instanceof JobError ? error.message : String(error);
         console.log(chalk.yellow(`WARNING: Job '${job.id}' skipped. Reason: ${issue}`));
      }
   }
   // continue only with valid jobs
   config.jobs = validJobs;
}

// server entry point
await start();
