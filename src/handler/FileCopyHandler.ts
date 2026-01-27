import type { ActionHandler, RunnerContext, FileHistory } from "../types/Task.types.js";
import { AbstractHandler } from "./AbstractHandler.js";
import type { Job } from "../types/Config.types.js";

/**
 * Build-in `copy` action handler to copy files from source to target dir
 * - only new or changed files will be copied
 * - ability set target file mode and file permissions according to job config spec
 * - ability to prune copied file in target dir after specified retention time
 * - *dry-run*: files are copied to a temporary folder
 */
export class FileCopyHandler extends AbstractHandler implements ActionHandler {
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
         await super.processSources(ctx, entries, fileHistory, true, this.copyOrMoveFile);
         await super.setTargetDirPermissions(ctx);
      }
      await super.cleanup(ctx, fileHistory);
   }
}
