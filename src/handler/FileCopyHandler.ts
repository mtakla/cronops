import type { Stats } from "fs-extra";
import type { ActionHandler, RunnerContext } from "../types/Task.types.js";
import { AbstractFileHandler } from "./AbstractFileHandler.js";
import type { Job } from "../types/Config.types.js";

/**
 * Build-in `copy` action handler to copy files from source to target dir
 * - only new or changed files will be copied
 * - ability set target file mode and file permissions according to job config spec
 * - ability to prune copied file in target dir after specified retention time
 * - *dry-run*: files are copied to a temporary folder
 */
export class FileCopyHandler extends AbstractFileHandler implements ActionHandler {
   public readonly isFileHandler = true;
   public readonly isGlobalHandler = false;
   public readonly useFileLog = true;

   override validateJob(job: Job) {
      super.assertSourceDirExist(job);
      super.assertTargetConfigExists(job);
   }

   public override async processBeforeFiles(ctx: RunnerContext, entries: [string]): Promise<void> {
      await super.prepareTargetDirs(ctx, entries);
   }

   public override async processFile(ctx: RunnerContext, fileEntry: string, stats: Stats): Promise<void> {
      super.copySourceFile(ctx, fileEntry, stats);
   }

   public override async processAfterFiles(ctx: RunnerContext): Promise<void> {
      super.setTargetDirPermissions(ctx);
   }
}
