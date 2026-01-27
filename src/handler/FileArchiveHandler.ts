import type { Job } from "../types/Config.types.js";
import type { ActionHandler, FileHistory, RunnerContext } from "../types/Task.types.js";
import { AbstractHandler } from "./AbstractHandler.js";

/**
 * Build-in `archive` action handler to archive all selected files in source dir and create a tgz file in target dir
 * - archive is only created if any files in the source dir has changed or is new
 * - *dry-run*: archive is created in a temp dir
 */
export class FileArchiveHandler extends AbstractHandler implements ActionHandler {
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
         await super.processSources(ctx, entries, fileHistory);
         await super.createArchive(ctx, entries, fileHistory);
         await super.setTargetDirPermissions(ctx);
      }
      await super.cleanup(ctx, fileHistory);
   }
}
