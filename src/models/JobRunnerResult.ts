import type { RunnerResult } from "../types/Task.types.js";

export class JobRunnerResult implements RunnerResult {
   public copied = 0;
   public deleted = 0;
   public archived = 0;
   public executed = 0;
   public pruned = 0;
   public errors = 0;
   public startTime = Date.now();
   public endTime = Date.now();

   get durationMs() {
      return this.endTime - this.startTime;
   }
}
