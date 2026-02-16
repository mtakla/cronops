import fsx, { ensureDir } from "fs-extra";
import tar from "tar-fs";
import pLimit from "p-limit";
import parse from "parse-duration";
import { createGzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { dirname, join, sep } from "node:path";
import type { JobRunnerSetup } from "../models/JobRunnerSetup.js";
import type { ActionHandler, SourceFile, RunnerContext, FileHistory } from "../types/Task.types.js";
import type { Job } from "../types/Config.types.js";
import type { PermissionModel } from "../models/PermissionModel.js";
import { createWriteStream } from "node:fs";
import { JobError } from "../errors/JobError.js";

// promise parallelization limit for build in file handlers
const limit = pLimit(64);

// Promise map used to manage parallelization tasks
type PromiseMap = Map<string, Promise<void>>;

export abstract class AbstractHandler implements ActionHandler {
   protected setup: JobRunnerSetup;

   constructor(setup: JobRunnerSetup) {
      this.setup = setup;
   }

   // empty handler method implementations
   public validateJob(_job: Job): void {}
   public async process(_ctx: RunnerContext): Promise<void> {}
   public async processFiles(_ctx: RunnerContext, _entries: string[], _fileHistory: FileHistory): Promise<void> {}

   protected assertSourceConfigExists(job: Job) {
      if (!job.source) JobError.throw(job.id, `Missing 'source' specs. Please check your config file.`);
   }

   protected assertTargetConfigExists(job: Job) {
      if (!job.target) JobError.throw(job.id, `Missing 'target' specs.Please check your config file.`);
   }

   protected assertSourceDirExist(job: Job) {
      this.assertSourceConfigExists(job);
      const sourceDir = this.setup.resolveSourceDir(job.source?.dir);
      if (!fsx.pathExistsSync(sourceDir)) JobError.throw(job.id, `missing source dir '${sourceDir}'!`);
   }

   protected async processSources(
      ctx: RunnerContext,
      entries: string[],
      fileHistory?: FileHistory,
      processor?: (ctx: RunnerContext, entry: SourceFile, fileHistory?: FileHistory) => Promise<void>,
   ) {
      const { sourceDir } = ctx;

      await Promise.all(
         entries.map((sourceEntry) => {
            const sourcePath = join(sourceDir, sourceEntry);

            return limit(async () => {
               try {
                  // get source file meta info
                  const stats = await fsx.stat(sourcePath);

                  // if file history is used, update source entry if not already tracked
                  const { changed } = fileHistory ? fileHistory.updateSourceEntry(sourcePath, [stats.mtimeMs, ctx.startTime]) : { changed: true };

                  // only process new or changed files
                  if (changed && processor) await processor.bind(this)(ctx, { sourceEntry, sourcePath, stats }, fileHistory);
               } catch (error) {
                  ctx.processError(new Error(`Cannot process source entry '${sourceEntry}'.\n └─ ${String(error)}`));
               }
            });
         }),
      );
   }

   /**
    * Copies a source file entry `fileEntry` to the target dir specified in `ctx.targetDir`
    * @param ctx the job runner context
    * @param entry the file entry relative to `ctx.sourceDir`
    * @returns copy promise
    */
   protected async copyOrMoveFile(ctx: RunnerContext, entry: SourceFile, fileHistory?: FileHistory) {
      const { job, result, targetDir, targetPermissions } = ctx;
      const { sourcePath, sourceEntry, stats } = entry;
      const targetPath = join(targetDir, sourceEntry);

      // copy file and preserve access/modification time from source file
      await fsx.copyFile(sourcePath, targetPath);

      // update result statistics
      result.copied++;

      // set timestamp & permissions on target file
      await fsx.utimes(targetPath, stats.atime, stats.mtime);
      await this.setTargetFilePermissions(targetPath, targetPermissions);

      // add/update target to file history
      if (fileHistory) fileHistory.addTargetEntry(targetPath, [stats.mtimeMs, ctx.startTime]);

      // log activity
      ctx.processActivity("COPIED", targetPath, ctx.result.copied);

      // remove file if action is "move"
      if (job.action === "move") {
         // remove file. no fileHistory required
         await this.deleteFile(ctx, entry);
      }
   }

   protected async deleteFile(ctx: RunnerContext, { sourcePath }: SourceFile) {
      const { job, result, sourceDir, sourceDirs } = ctx;
      if (!job.dry_run) {
         // remove file
         await fsx.remove(sourcePath);
         // add (parent) dirs to dir set
         let current = dirname(sourcePath);
         while (current.length > sourceDir.length && !sourceDirs.has(current)) {
            sourceDirs.add(current);
            current = dirname(current);
         }
         ctx.processActivity("DELETED", sourcePath, ctx.result.deleted);
      }
      // update result statistics
      result.deleted++;
   }

   protected async createArchive(ctx: RunnerContext, entries: string[], fileHistory: FileHistory) {
      if (entries.length > 0 && !ctx.result.errors) {
         const { job, sourceDir, targetDir, targetPermissions, result } = ctx;
         const dest = join(targetDir, job.targetArchiveName);

         if (fileHistory.changed || !fsx.pathExistsSync(dest)) {
            await ensureDir(targetDir);
            try {
               await pipeline(tar.pack(sourceDir, { entries }), createGzip(), createWriteStream(dest));
            } catch (err) {
               ctx.processError(err instanceof Error ? err : new Error("Compression error!"));
            }

            // change file permission attributes according to job config
            await this.setTargetFilePermissions(dest, targetPermissions);

            // mark for dir permission update
            ctx.targetDirs.add(targetDir);

            // add archive name to job log
            fileHistory.addTargetEntry(dest, [result.startTime, result.startTime]);
            result.archived = entries.length;
            ctx.processActivity("ARCHIVED", dest, result.archived);
         }
      }
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

   protected async createTargetDirs(ctx: RunnerContext, entries: string[]): Promise<void> {
      const { targetDir, targetDirs } = ctx;

      // Ensure that all target dirs exist (parallelized & limited)
      for (const entry of entries) targetDirs.add(dirname(join(targetDir, entry)));
      targetDirs.add(targetDir);
      await Promise.all(Array.from(targetDirs).map((dir) => limit(() => fsx.ensureDir(dir))));
   }

   protected async setTargetDirPermissions(ctx: RunnerContext): Promise<void> {
      const folderPromises: PromiseMap = new Map();

      // collect promises to change target folder permissions recursively
      for (const dir of ctx.targetDirs) this.getFolderPermissionPromises(ctx, dir, folderPromises);

      // Set folder permissions in target dir
      await Promise.all(folderPromises.values());
   }

   protected async cleanup(ctx: RunnerContext, fileHistory: FileHistory) {
      const { job } = ctx;
      const retentionMs = parse(job.target?.retention) ?? 0;

      // create a promise for every source entry in the file history
      const targetScanPromises = Object.keys(fileHistory.data.target).map((path) => {
         return limit(async () => {
            const ttime = fileHistory.data.target[path]?.[1] ?? 0;
            if (await fsx.pathExists(path)) {
               if (retentionMs > 0 && ctx.startTime - (ttime + retentionMs) >= 0) {
                  await fsx.remove(path);
                  fileHistory.markTargetOutdated(path);
                  ctx.result.pruned++;
                  ctx.processActivity("PRUNED", path, ctx.result.pruned);
               }
            } else fileHistory.markTargetOutdated(path);
         });
      });

      // execute target scan promises parallel (limited)
      await Promise.all(targetScanPromises);

      // cleanup outdated entries
      fileHistory.cleanup();
   }

   private async setTargetFilePermissions(destPath: string, perms: PermissionModel, isDir = false) {
      const mode = isDir ? perms.dirMode : perms.fileMode;
      if (perms.uid >= 0 && perms.gid >= 0) await fsx.chown(destPath, perms.uid, perms.gid);
      if (mode >= 0) await fsx.chmod(destPath, mode);
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
               ctx.processError(new Error(`Cannot chmod on folder '${dirPath}'. ${error}`));
            }
         }),
      );
      // get folder permission change promise on parent dir (if not already promised)
      this.getFolderPermissionPromises(ctx, dirname(dirPath), folderPromises);
   }
}
