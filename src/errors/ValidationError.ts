export class ValidationError extends Error {
   public readonly jobId: string;
   public readonly reason: string;
   constructor(message: string, jobId: string, reason: string) {
      super(message);
      this.jobId = jobId;
      this.reason = reason;
   }
}
