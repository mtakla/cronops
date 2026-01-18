import type { Stats } from "fs-extra";
import type { ActionHandler, RunnerContext } from "../types/Task.types.js";
import { AbstractFileHandler } from "./AbstractFileHandler.js";
import type { Job } from "../types/Config.types.js";

/**
 * Build-in `move` action handler to move files from source to target dir
 * - ability set target file mode and permissions according to job config spec
 * - ability to prune moved file in target dir after specified retention time
 * - *dry-run*: files are copied to a temporary folder, but not deleted in source dir (=copy)
 */
export class FileMoveHandler extends AbstractFileHandler implements ActionHandler {
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
      await super.copySourceFile(ctx, fileEntry, stats);
      await super.deleteSourceFile(ctx, fileEntry);
   }

   public override async processAfterFiles(ctx: RunnerContext): Promise<void> {
      await super.setTargetDirPermissions(ctx);
      await super.deleteEmptySourceDirs(ctx);
   }
}
