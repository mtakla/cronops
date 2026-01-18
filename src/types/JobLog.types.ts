export type JobLogEntry = {
   src: string;
   dest: string;
   mtime: number;
   ttime: number;
};

export interface JobLog {
   data: Record<string, JobLogEntry>;
   changed: boolean;
   size(): number;
   addEntry(entry: JobLogEntry): void;
   hasEntry(destPath: string, mtimeMs?: number): boolean;
   removeEntry(key: string): void;
}
