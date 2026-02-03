import type { FileHistory, FileHistoryData } from "../types/Task.types";

/**
 * Uses path hash for each entry
 */
export class FileHistoryModel implements FileHistory {
   public data: FileHistoryData;
   public changed: boolean;

   // used for cleaning up outdated entries
   private included = new Set<string>();
   private outdated = new Set<string>();

   constructor(data: FileHistoryData = { source: {}, target: {} }) {
      this.data = data;
      this.changed = false;
   }

   updateSourceEntry(path: string, entry: [number, number]): { changed: boolean; added: boolean } {
      const prev = this.data.source[path];
      const added = prev === undefined;
      const changed = added || prev[0] !== entry[0];
      if (changed) {
         this.data.source[path] = entry;
         this.changed = true;
      }
      this.included.add(path);
      return { changed, added };
   }

   addTargetEntry(path: string, entry: [number, number]) {
      this.data.target[path] = entry;
      this.changed = true;
   }

   markTargetOutdated(path: string) {
      if (path in this.data.target) this.outdated.add(path);
   }

   /**
    * Cleanup does the following:
    * - removes source entries that are not marked as "included" (= files that are not any more matched by glob selector or removed from file system)
    * - removes target entries that are marked as "outdated" (= to potentially be removed from the file system)
    * @returns list of files that are not any more matched by glob selector or removed from file system
    */
   cleanup() {
      const useless = new Set(Object.keys(this.data.source)).difference(this.included);
      for (const path of useless) this._removeEntry("source", path);
      for (const path of this.outdated) this._removeEntry("target", path);
      this.included.clear();
      this.outdated.clear();
      return [...useless];
   }

   private _removeEntry(type: "source" | "target", path: string): void {
      if (path in this.data[type]) {
         delete this.data[type][path];
         this.changed = true;
      }
   }
}
