import type { Job } from "../types/Config.types.js";
import type { ActionHandler, FileHistory, RunnerContext } from "../types/Task.types.js";
import { AbstractHandler } from "./AbstractHandler.js";

/**
 * Build-in `delete` action handler to delete selected files in the source dir
 * - *dry-run*: files are not deleted
 */
export class FileDeleteHandler extends AbstractHandler implements ActionHandler {
   /**
    * Validate job against action handler requirements
    * @throws JobError
    */
   override validateJob(job: Job) {
      super.assertSourceDirExist(job);
   }

   override async processFiles(ctx: RunnerContext, entries: string[], fileHistory: FileHistory): Promise<void> {
      if (entries.length > 0) {
         await super.processSources(ctx, entries, fileHistory, false, this.deleteFile);
         await super.deleteEmptySourceDirs(ctx);
      }
      await super.cleanup(ctx, fileHistory);
   }
}
