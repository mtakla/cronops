export class JobError extends Error {
   public readonly jobId: string;
   constructor(message: string, jobId: string, cause?: Error) {
      super(message, cause);
      this.jobId = jobId;
   }

   static throw(jobId: string, message: string, cause?: Error | undefined) {
      throw new JobError(jobId, message, cause);
   }
}
