import type { ActionHandler, RunnerContext } from "../types/Task.types.js";
import { AbstractExecHandler } from "./AbstractExecHandler.js";

export class ExecHandler extends AbstractExecHandler implements ActionHandler {
   public readonly isFileHandler = true;
   public readonly isGlobalHandler = true;
   public readonly useFileLog = false;

   public override async processFile(ctx: RunnerContext): Promise<void> {
      await super.exec(ctx);
   }
}
