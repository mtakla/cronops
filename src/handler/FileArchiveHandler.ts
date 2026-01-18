import type { Job } from "../types/Config.types.js";
import type { ActionHandler, RunnerContext } from "../types/Task.types.js";
import { AbstractFileHandler } from "./AbstractFileHandler.js";

/**
 * Build-in `archive` action handler to archive all selected files in source dir and create a tgz file in target dir
 * - archive is only created if any files in the source dir has changed or is new
 * - *dry-run*: archive is created in a temp dir
 */
export class FileArchiveHandler extends AbstractFileHandler implements ActionHandler {
   public readonly isFileHandler = true;
   public readonly isGlobalHandler = false;
   public readonly useFileLog = false;

   override validateJob(job: Job) {
      super.assertSourceDirExist(job);
      super.assertTargetConfigExists(job);
   }

   public override async processAfterFiles(ctx: RunnerContext, entries: [string]): Promise<void> {
      super.createArchive(ctx, entries);
   }
}
