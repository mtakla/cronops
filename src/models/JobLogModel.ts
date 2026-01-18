import type { JobLog, JobLogEntry } from "../types/JobLog.types.js";
import { createHash } from "node:crypto";

export class JobLogModel implements JobLog {
   public data: Record<string, JobLogEntry>;
   public changed: boolean;

   constructor(data: object = {}) {
      this.data = data as Record<string, JobLogEntry>;
      this.changed = false;
   }

   size(): number {
      return Object.keys(this.data).length;
   }

   addEntry(entry: JobLogEntry): void {
      this.data[hash(entry.dest)] = entry;
      this.changed = true;
   }

   hasEntry(destPath: string, mtimeMs?: number): boolean {
      const entry = this.data[hash(destPath)];
      return entry !== undefined && (mtimeMs ? mtimeMs === entry.mtime : true);
   }

   removeEntry(key: string): void {
      if (key in this.data) {
         delete this.data[key];
         this.changed = true;
      }
   }
}

function hash(pathStr: string): string {
   return createHash("sha256").update(pathStr).digest("hex");
}
