import type { Job } from "../types/Config.types.js";
import type { ActionHandler, RunnerContext } from "../types/Task.types.js";
import { AbstractFileHandler } from "./AbstractFileHandler.js";

/**
 * Build-in `delete` action handler to delete selected files in the source dir
 * - *dry-run*: files are not deleted
 */
export class FileDeleteHandler extends AbstractFileHandler implements ActionHandler {
   public readonly isFileHandler = true;
   public readonly isGlobalHandler = false;
   public readonly useFileLog = false;

   override validateJob(job: Job) {
      super.assertSourceDirExist(job);
   }

   override async processFile(ctx: RunnerContext, fileEntry: string): Promise<void> {
      await super.deleteSourceFile(ctx, fileEntry);
   }

   override async processAfterFiles(ctx: RunnerContext): Promise<void> {
      await super.deleteEmptySourceDirs(ctx);
   }
}
