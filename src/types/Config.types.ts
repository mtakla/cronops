import { z } from "zod";

export const JobSchema = z.strictObject({
   id: z.string().optional(),
   cron: z.string().min(1).optional(),
   action: z.literal(["exec", "call", "copy", "move", "delete", "archive"]),
   command: z.string().optional(),
   shell: z.boolean().or(z.string().min(1)).optional(),
   args: z.array(z.string().min(1)).min(1).optional(),
   env: z.record(z.string().regex(/^[A-Z_][A-Z0-9_]*$/), z.string()).optional(),

   source: z
      .strictObject({
         dir: z.string().min(1).optional(),
         includes: z.array(z.string().min(1)).min(1).optional(),
         excludes: z.array(z.string().min(1)).min(1).optional(),
      })
      .optional(),
   target: z
      .strictObject({
         dir: z.string().min(1).optional(),
         archive_name: z.string().min(1).optional(),
         permissions: z
            .strictObject({
               owner: z.string().min(1).optional(),
               file_mode: z.string().min(1).optional(),
               dir_mode: z.string().min(1).optional(),
            })
            .optional(),
         retention: z.string().min(1).optional(),
      })
      .optional(),
   dry_run: z.boolean().optional(),
   verbose: z.boolean().optional(),
   enabled: z.boolean().optional(),
});

export type Job = { id: string } & z.infer<typeof JobSchema>;
export type JobAction = z.infer<typeof JobSchema.shape.action>;
export type JobSource = z.infer<typeof JobSchema.shape.source>;
export type JobTarget = z.infer<typeof JobSchema.shape.target>;
