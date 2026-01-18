import fsx from "fs-extra";
import glob from "fast-glob";
import pLimit from "p-limit";
import { ms } from "humanize-ms";
import { join, dirname, sep } from "node:path";
import { createWriteStream } from "node:fs";
import { createGzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { AbstractTask } from "./AbstractTask.js";
import { JobLogModel } from "../models/JobLogModel.js";
import { PermissionModel } from "../models/PermissionModel.js";
import type { JobRunnerSetup } from "../models/JobRunnerSetup.js";
import type { JobRunnerResult } from "../types/Task.types.js";
import type { JobModel } from "../models/JobModel.js";
import type { JobLogEntry } from "../types/JobLog.types.js";

// promise parallelization limit
const limit = pLimit(100);

// Promise map used to manage parallelization tasks
type PromiseMap = Map<string, Promise<void>>;

export class JobRunner extends AbstractTask<JobRunnerResult> {
   public job: JobModel;
   public setup: JobRunnerSetup;

   constructor(job: JobModel, setup: JobRunnerSetup) {
      super(job.cron);
      this.job = job;
      this.setup = setup;
   }

   protected override async run() {
      // helper
      const { setup, job } = this;
      const copyOrMove = job.isCopy || job.isMove;
      const moveOrRemove = job.isDelete || job.isMove;

      // init job execution result
      const stat: JobRunnerResult = { copied: 0, deleted: 0, archived: 0, pruned: 0, tracked: 0, started: Date.now(), finished: 0 };

      // discard job execution if job has been disabled
      if (job.enabled === false) return stat;

      // get resolved source path
      const srcDir = setup.resolveSourceDir(job.source?.dir);
      const destDir = job.dry_run ? join(setup.tempDir, job.id) : setup.resolveTargetDir(job.target?.dir);

      // throw if source dir does not exist
      if (!(await fsx.pathExists(srcDir))) throw `Cannot find or access source path '${srcDir}'! Job execution will be skipped`;

      // discard job execution if there are too many errors
      if (this.errorCount >= 25) {
         job.enabled = false;
         throw new Error("Too many errors. Job execution disabled!");
      }

      // helper
      const ttime = Date.now();
      const perms = new PermissionModel(job.targetPermissions);
      const sourceDirs = new Set<string>();
      const targetDirs = new Set<string>();

      // empty target dir if configured
      if (job.target?.rmdir === true) await fsx.emptyDir(destDir);

      // Determine source entries using fast-glob
      const entries = await glob(job.sourceIncludes, { cwd: srcDir, ignore: job.sourceExcludes, dot: true, extglob: false });

      // load job log from sidecar file in destination dir
      const jobLog = !job.isDelete ? await this.loadJobLog(destDir, job.id) : new JobLogModel({});

      // STEP1: ensure all required target folders are created
      if (!job.isDelete) {
         if (copyOrMove) for (const entry of entries) targetDirs.add(dirname(join(destDir, entry)));
         targetDirs.add(destDir);
         // Ensure that all target dirs exist (parallelized & limited)
         await Promise.all(Array.from(targetDirs).map((dir) => limit(() => fsx.ensureDir(dir))));
      }

      // STEP2: COPY/MOVE/DELETE/ARCHIVE
      // create promises on all source file entries for parallelized & limited execution
      await Promise.all(
         entries.map((entry) => {
            const src = join(srcDir, entry);
            const dest = join(destDir, entry);

            return limit(async () => {
               try {
                  // get source file meta info
                  const stats = await fsx.stat(src);

                  // ignore already copied/moved files that are not changed
                  if (!job.isDelete && !jobLog.hasEntry(dest, stats.mtimeMs)) {
                     if (copyOrMove) {
                        // copy file and preserve access/modification time from source file
                        await fsx.copyFile(src, dest);
                        await fsx.utimes(dest, stats.atime, stats.mtime);

                        // set permissions on target file
                        await this.setPermissions(dest, perms);

                        // update stat and create log entry
                        stat.copied++;
                        if (job.verbose) this.events.emit("activity", "COPIED", src);
                     }
                     jobLog.addEntry({ src, dest, mtime: stats.mtimeMs, ttime });
                  }

                  // remove source file and remember dir for cleanup
                  if (moveOrRemove) {
                     if (!job.dry_run) {
                        await fsx.remove(src);
                        this.addToDirSet(sourceDirs, dirname(src), srcDir);
                        if (job.verbose) this.events.emit("activity", "DELETED", src);
                     }
                     stat.deleted++;
                  }
               } catch (error) {
                  this.events.emit("error", error instanceof Error ? error : new Error(String(error)));
               }
            });
         }),
      );

      // STEP3: CREATE ARCHIVE
      if (job.isArchive && entries.length > 0) {
         const dest = join(destDir, job.targetArchiveName);

         if (jobLog.changed || !fsx.pathExistsSync(dest)) {
            try {
               await pipeline(tar.pack(srcDir, { entries }), createGzip(), createWriteStream(dest));
            } catch (err) {
               this.events.emit("error", new Error(`Compression failed: ${err}`));
            }

            // change file permission attributes according to job config
            await this.setPermissions(dest, perms);

            // add archive name to job log
            jobLog.addEntry({ src: "*", dest, mtime: (await fsx.stat(dest)).mtimeMs, ttime });

            stat.archived = entries.length;
            if (job.verbose) this.events.emit("activity", "ARCHIVED", dest, stat.archived);
         }
      }

      // STEP4: Set folder permissions and perform cleanup tasks
      if (!job.isDelete) {
         const folderPromises: PromiseMap = new Map();

         // collect promises to change target folder permissions recursively
         for (const dir of targetDirs) this.getFolderPermissionPromises(destDir, dir, perms, folderPromises);

         // Set folder permissions in target dir
         await Promise.all(folderPromises.values());

         const retentionMs = ms(job.target?.retention ?? "0");
         const cleanupPromises = Object.keys(jobLog.data).map((key) => {
            return limit(async () => {
               const logEntry = jobLog.data[key] as JobLogEntry;
               if (copyOrMove || logEntry.src === "*") {
                  // check if retention of target file is expired
                  if (retentionMs > 0 && ttime - (logEntry.ttime + retentionMs) >= 0) {
                     await fsx.remove(logEntry.dest);
                     stat.pruned++;
                     if (job.verbose) this.events.emit("activity", "PRUNED", logEntry.dest);
                     return key;
                  }
               }
               // remove orphaned entries
               if (!(await fsx.pathExists(logEntry.src)) && !(await fsx.pathExists(logEntry.dest))) return key;
               return "";
            });
         });

         // execute all cleanup promises (parallelized & limited)
         const keys = (await Promise.all(cleanupPromises)).filter(Boolean);

         // remove obsolete job log entries
         for (const key of keys) jobLog.removeEntry(key);

         // save job log sidecar file (if changed)
         await this.saveJobLog(destDir, job.id, jobLog);
      }

      // cleanup dirs if empty
      if (moveOrRemove) {
         // sort source dirs and ignore base path
         const sortedDirs = Array.from(sourceDirs).sort((a, b) => b.split(sep).length - a.split(sep).length);
         // try to remove dirs
         for (const dir of sortedDirs) await this.tryRemoveDir(dir);
      }
      // final statistic updates
      stat.tracked = jobLog.size();
      stat.finished = Date.now();

      // return statistics
      return stat;
   }

   public onActivity(cb: (action: string, path: string, count: number) => void) {
      this.events.on("activity", cb);
   }

   public async runJob() {
      return await this.run();
   }

   private async loadJobLog(destDir: string, jobId: string): Promise<JobLogModel> {
      const jobLogFile = join(destDir, `.${jobId}.cronops`);
      return new JobLogModel(fsx.pathExistsSync(jobLogFile) ? await fsx.readJSON(jobLogFile) : {});
   }

   private async saveJobLog(destDir: string, jobId: string, jobLog: JobLogModel) {
      if (jobLog.changed) {
         const jobLogFile = join(destDir, `.${jobId}.cronops`);
         await fsx.writeJSON(jobLogFile, jobLog.data, { spaces: 4 });
      }
   }

   private getFolderPermissionPromises(baseDir: string, dirPath: string, perms: PermissionModel, folderPromises: PromiseMap): void {
      // exit if dirPath is parent of baseDir or folder permissions were already set
      if (dirPath.length < baseDir.length || folderPromises.has(dirPath)) return;

      // mark folder as "promised"
      folderPromises.set(
         dirPath,
         limit(async () => {
            try {
               // change folder permissions
               await this.setPermissions(dirPath, perms, true);
            } catch (error) {
               this.events.emit("error", new Error(`Cannot chmod on folder '${dirPath}': ${error}`));
            }
         }),
      );
      // get folder permission change promise on parent dir (if not already promised)
      this.getFolderPermissionPromises(baseDir, dirname(dirPath), perms, folderPromises);
   }

   private async setPermissions(destPath: string, perms: PermissionModel, isDir = false) {
      if (perms.uid >= 0 && perms.gid >= 0) await fsx.chown(destPath, perms.uid, perms.gid);
      await fsx.chmod(destPath, isDir ? perms.dirMode : perms.fileMode);
   }

   private addToDirSet(dirSet: Set<string>, fullPath: string, stopAt: string) {
      let current = fullPath;
      while (current.length > stopAt.length && !dirSet.has(current)) {
         dirSet.add(current);
         current = dirname(current);
      }
   }

   // performant way to delete empty directories (fails if dir is not empty)
   private async tryRemoveDir(dir: string) {
      try {
         await fsx.rmdir(dir);
      } catch {}
   }
}
