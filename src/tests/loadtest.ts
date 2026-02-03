import fsx from "fs-extra";
import { createJobScheduler } from "../index.js";

let time = Date.now();

/**
 * LOADTEST
 *
 * Performs 5 jobs on ALL FILES in the node_modules folder of this projects (~10k files):
 * - COPY all files from ./node_modules to ./build/loadtest/copied
 * - MOVE all files from ./build/loadtest/copied to ./build/loadtest/moved
 * - EXECUTE `chmod ugo+rwx` on all `*.md`` files in ./build/loadtest/moved
 * - ARCHIVE all files in ./build/loadtest/moved to ./build/loadtest/loadtest.tgz
 * - DELETE all files in ./build/loadtest/moved
 */

// init
await fsx.emptyDir("./build/loadtest");
await fsx.ensureDir("./build/loadtest/copied");
await fsx.ensureDir("./build/loadtest/moved");

// create job scheduler instance
const scheduler = createJobScheduler({
   logDir: "./build/loadtest",
});

scheduler.onReady(() => {
   // begin manual execution ...
   scheduler.executeJob("copy");
});

scheduler.onJobStarted((job) => {
   console.log(`Starting job [${job.id}] ...`);
   time = Date.now();
});

scheduler.onJobFinished((job, { copied, deleted, archived, executed }) => {
   console.log(`✔ Done in ${Date.now() - time}ms (${copied} copied, ${deleted} deleted, ${archived} archived, ${executed} executed)`);
   // manually start next jobs
   if (job.id === "copy") scheduler.executeJob("move");
   else if (job.id === "move") scheduler.executeJob("execute");
   else if (job.id === "execute") scheduler.executeJob("archive");
   else if (job.id === "archive") scheduler.executeJob("delete");
   else done();
});

scheduler.onJobError((job, err) => {
   console.log(`${job.id} failed. ${String(err)}`);
});

// finally schedule the 4 jobs
scheduler.scheduleJobs([
   {
      id: "copy",
      action: "copy",
      cron: "0 0 */5 * *",
      source: {
         dir: "/node_modules",
         includes: ["**/**"],
      },
      target: {
         dir: "/build/loadtest/copied",
      },
   },
   {
      id: "move",
      action: "move",
      cron: "0 0 */5 * *",
      source: {
         dir: "/build/loadtest/copied",
         includes: ["**/**"],
      },
      target: {
         dir: "/build/loadtest/moved",
      },
   },
   {
      id: "archive",
      action: "archive",
      cron: "0 0 */5 * *",
      source: {
         dir: "/build/loadtest/moved",
         includes: ["**/**"],
      },
      target: {
         dir: "/build/loadtest",
         archive_name: "loadtest.tgz",
      },
   },
   {
      id: "execute",
      action: "exec",
      command: "chmod",
      args: ["ugo+rwx", "{file}"],
      cron: "0 0 */5 * *",
      source: {
         dir: "/build/loadtest/moved",
         includes: ["**/*.ts"],
      },
      target: {
         dir: "/build/loadtest/moved",
      },
   },
   {
      id: "delete",
      action: "delete",
      cron: "0 0 */5 * *",
      source: {
         dir: "/build/loadtest/moved",
         includes: ["**/**"],
      },
   },
]);

async function done() {
   // should throw error if dir is not empty (= test failed!)
   fsx.rmdirSync("./build/loadtest/copied");
   fsx.rmdirSync("./build/loadtest/moved");

   // archive from last job should exist
   if (!fsx.pathExistsSync("./build/loadtest/loadtest.tgz")) throw Error("Archive should exist!");

   await scheduler.gracefulTerminate();
   process.exit(0);
}
