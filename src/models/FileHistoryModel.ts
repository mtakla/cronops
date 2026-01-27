import type { FileHistory, FileHistoryData, HistoryEntry } from "../types/Task.types";
import { createHash } from "node:crypto";

/**
 * Uses path hash for each entry
 */
export class FileHistoryModel implements FileHistory {
   public data: FileHistoryData;
   public changed: boolean;

   // used for cleaning up outdated entries
   private includedSources = new Set<string>();
   private outdatedTargets = new Set<string>();

   constructor(data: object = { source: {}, target: {} }) {
      this.data = data as FileHistoryData;
      this.changed = false;
   }

   addSourceEntry(entry: HistoryEntry) {
      this.data.source[hash(entry.path)] = entry;
      this.changed = true;
   }

   addTargetEntry(entry: HistoryEntry) {
      this.data.target[hash(entry.path)] = entry;
      this.changed = true;
   }

   hasSourceEntry(path: string, mtimeMs?: number): boolean {
      const entry = this.data.source[hash(path)];
      return entry !== undefined && (mtimeMs ? mtimeMs === entry.mtime : true);
   }

   markSourceIncluded(path: string) {
      const key = hash(path);
      if (key in this.data.source) this.includedSources.add(key);
   }

   markTargetOutdated(path: string) {
      const key = hash(path);
      if (key in this.data.target) this.outdatedTargets.add(key);
   }

   cleanup() {
      const outdatedSources = new Set(Object.keys(this.data.source)).difference(this.includedSources);
      for (const key of outdatedSources) this._removeEntry("source", key);
      for (const key of this.outdatedTargets) this._removeEntry("target", key);
   }

   private _removeEntry(type: "source" | "target", key: string): void {
      if (key in this.data[type]) {
         delete this.data[type][key];
         this.changed = true;
      }
   }
}

function hash(path: string): string {
   return createHash("sha256").update(path).digest("hex");
}
