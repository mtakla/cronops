import type { ActionHandler, FileHistory, RunnerContext } from "../types/Task.types.js";
import { AbstractHandler } from "./AbstractHandler.js";
import type { Job } from "../types/Config.types.js";

/**
 * Build-in `move` action handler to move files from source to target dir
 * - ability set target file mode and permissions according to job config spec
 * - ability to prune moved file in target dir after specified retention time
 * - *dry-run*: files are copied to a temporary folder, but not deleted in source dir (=copy)
 */
export class FileMoveHandler extends AbstractHandler implements ActionHandler {
   /**
    * Validate job against action handler requirements
    * @throws JobError
    */
   override validateJob(job: Job) {
      super.assertSourceDirExist(job);
      super.assertTargetConfigExists(job);
   }

   public override async processFiles(ctx: RunnerContext, entries: string[], fileHistory: FileHistory): Promise<void> {
      if (entries.length > 0) {
         await super.createTargetDirs(ctx, entries);
         await super.processSources(ctx, entries, fileHistory, false, this.copyOrMoveFile);
         await super.setTargetDirPermissions(ctx);
         await super.deleteEmptySourceDirs(ctx);
      }
      await super.cleanup(ctx, fileHistory);
   }
}
