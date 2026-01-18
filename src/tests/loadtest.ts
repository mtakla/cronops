import fsx from "fs-extra";
import { createScheduler } from "../index.js";

let time = Date.now();

/**
 * LOADTEST
 *
 * Performs 4 jobs on ALL FILES in the node_modules folder of this projects (~10k files):
 * - COPY all files from ./node_modules to ./build/loadtest/copied
 * - MOVE all files from ./build/loadtest/copy to ./build/loadtest/moved
 * - ARCHIVE all files in ./build/loadtest/moved to ./build/loadtest/loadtest.tgz
 * - DELETE all files in ./build/loadtest/moved
 */

// init
await fsx.remove("./build/loadtest");
await fsx.ensureDir("./build/loadtest/copied");
await fsx.ensureDir("./build/loadtest/moved");

// create job scheduler instance
const scheduler = createScheduler();

scheduler.onReady(() => {
   // begin manual execution ...
   scheduler.executeJob("copy");
});

scheduler.onJobStarted((job) => {
   console.log(`Starting ${job.id} job ...`);
   time = Date.now();
});

scheduler.onJobFinished((job, { copied, deleted, archived }) => {
   console.log(`✔ Done in ${Date.now() - time}ms (copied:${copied}, deleted: ${deleted}, archived: ${archived})`);
   // manually start next jobs
   if (job.id === "copy") scheduler.executeJob("move");
   else if (job.id === "move") scheduler.executeJob("archive");
   else if (job.id === "archive") scheduler.executeJob("delete");
   else done();
});

scheduler.onJobError((job, err) => {
   console.log(`${job.id} failed. ${String(err)}`);
});

// finally schedule the 4 jobs
scheduler.scheduleJobs({
   jobs: [
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
         id: "delete",
         action: "delete",
         cron: "0 0 */5 * *",
         source: {
            dir: "/build/loadtest/moved",
            includes: ["**/**"],
         },
      },
   ],
   defaults: {
      source: {
         excludes: ["**/*.cronops"],
      },
   },
});

async function done() {
   // should throw error if dir is not empty
   fsx.rmdirSync("./build/loadtest/copied");
   fsx.rmdirSync("./build/loadtest/moved");

   // cleanup
   fsx.emptyDirSync("./build/loadtest");

   await scheduler.gracefulTerminate();
   process.exit(0);
}
