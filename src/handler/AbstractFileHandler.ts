import pLimit from "p-limit";
import fsx from "fs-extra";
import tar from "tar-fs";
import { join, dirname, sep } from "node:path";
import { createWriteStream } from "node:fs";
import { createGzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { emptyDir, ensureDir } from "fs-extra";
import type { RunnerContext } from "../types/Task.types.js";
import type { PermissionModel } from "../models/PermissionModel.js";
import { AbstractHandler } from "./AbstractHandler.js";
import type { Job } from "../types/Config.types.js";

// promise parallelization limit for build in file handlers
const limit = pLimit(100);

// Promise map used to manage parallelization tasks
type PromiseMap = Map<string, Promise<void>>;

export abstract class AbstractFileHandler extends AbstractHandler {
   /**
    * Copies a source file entry `fileEntry` to the target dir specified in `ctx.targetDir`
    * @param ctx the job runner context
    * @param fileEntry the file entry relative to `ctx.sourceDir`
    * @param stats the f
    * @returns copy promise
    */
   protected async copySourceFile(ctx: RunnerContext, fileEntry: string, stats: fsx.Stats) {
      const { job, result, sourceDir, targetDir, targetPermissions } = ctx;
      const src = join(sourceDir, fileEntry);
      const dest = join(targetDir, fileEntry);

      // copy file and preserve access/modification time from source file
      await fsx.copyFile(src, dest);
      await fsx.utimes(dest, stats.atime, stats.mtime);

      // set permissions on target file
      await this.setTargetFilePermissions(dest, targetPermissions);

      // update stat and create log entry
      result.copied++;
      if (job.verbose) ctx.activity("COPIED", src);
   }

   public assertSourceDirExist(job: Job) {
      super.assertSourceConfigExists(job);
      const sourceDir = this.setup.resolveSourceDir(job.source?.dir);
      if (!fsx.pathExistsSync(sourceDir)) throw new Error(`missing source dir '${sourceDir}'!`);
   }

   protected async deleteSourceFile(ctx: RunnerContext, fileEntry: string) {
      const { job, result, sourceDir, sourceDirs } = ctx;
      const file = join(sourceDir, fileEntry);
      if (!job.dry_run) {
         // remove file
         await fsx.remove(file);
         // add to sourceDir set
         let current = dirname(file);
         while (current.length > sourceDir.length && !sourceDirs.has(current)) {
            sourceDirs.add(current);
            current = dirname(current);
         }
         if (job.verbose) ctx.activity("DELETED", file);
      }
      result.deleted++;
   }

   protected async deleteEmptySourceDirs(ctx: RunnerContext): Promise<void> {
      const { job, sourceDirs } = ctx;
      if (!job.dry_run) {
         // sort source dirs and ignore base path
         const sortedDirs = Array.from(sourceDirs).sort((a, b) => b.split(sep).length - a.split(sep).length);
         // try to remove dirs
         for (const dir of sortedDirs) {
            try {
               await fsx.rmdir(dir);
            } catch {}
         }
      }
   }

   protected async prepareTargetDirs(ctx: RunnerContext, entries: [string]): Promise<void> {
      const { job, targetDir, targetDirs } = ctx;
      // empty target dir if configured
      if (job.target?.rmdir === true) await emptyDir(targetDir);

      // Ensure that all target dirs exist (parallelized & limited)
      for (const entry of entries) targetDirs.add(dirname(join(targetDir, entry)));
      targetDirs.add(targetDir);
      await Promise.all(Array.from(targetDirs).map((dir) => limit(() => ensureDir(dir))));
   }

   protected async setTargetDirPermissions(ctx: RunnerContext): Promise<void> {
      const folderPromises: PromiseMap = new Map();

      // collect promises to change target folder permissions recursively
      for (const dir of ctx.targetDirs) this.getFolderPermissionPromises(ctx, dir, folderPromises);

      // Set folder permissions in target dir
      await Promise.all(folderPromises.values());
   }

   protected async createArchive(ctx: RunnerContext, entries: [string]) {
      if (entries.length > 0) {
         const { job, jobLog, sourceDir, targetDir, targetPermissions, result } = ctx;
         const dest = join(targetDir, job.targetArchiveName);

         if (jobLog.changed || !fsx.pathExistsSync(dest)) {
            try {
               await pipeline(tar.pack(sourceDir, { entries }), createGzip(), createWriteStream(dest));
            } catch (err) {
               ctx.error(`Compression failed: ${err}`);
            }

            // change file permission attributes according to job config
            await this.setTargetFilePermissions(dest, targetPermissions);

            // add archive name to job log
            jobLog.addEntry({ src: "*", dest, mtime: (await fsx.stat(dest)).mtimeMs, ttime: result.started });
            result.archived = entries.length;
            ctx.activity("ARCHIVED", dest, result.archived);
         }
      }
   }

   private async setTargetFilePermissions(destPath: string, perms: PermissionModel, isDir = false) {
      if (perms.uid >= 0 && perms.gid >= 0) await fsx.chown(destPath, perms.uid, perms.gid);
      await fsx.chmod(destPath, isDir ? perms.dirMode : perms.fileMode);
   }

   private getFolderPermissionPromises(ctx: RunnerContext, dirPath: string, folderPromises: PromiseMap): void {
      // exit if dirPath is parent of baseDir or folder permissions were already set
      if (dirPath.length < ctx.targetDir.length || folderPromises.has(dirPath)) return;

      // mark folder as "promised"
      folderPromises.set(
         dirPath,
         limit(async () => {
            try {
               // change folder permissions
               await this.setTargetFilePermissions(dirPath, ctx.targetPermissions, true);
            } catch (error) {
               ctx.error(`Cannot chmod on folder '${dirPath}': ${error}`);
            }
         }),
      );
      // get folder permission change promise on parent dir (if not already promised)
      this.getFolderPermissionPromises(ctx, dirname(dirPath), folderPromises);
   }
}
