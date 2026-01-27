import { format } from "date-fns";
import type { Job, JobAction, JobSource, JobTarget, Defaults } from "../types/Config.types.js";

export class JobModel {
   public id!: string;
   public action!: JobAction;
   public command: string = "";
   public environment: Record<string, string> = {};
   public cron: string = "* * * * *";
   public source: JobSource = {};
   public target: JobTarget = {};
   public dry_run = false;
   public verbose = false;
   public enabled = true;

   constructor(data: Job, defaults: Defaults = {}) {
      Object.assign(this, defaults);
      Object.assign(this, data);
   }

   get sourceIncludes() {
      return this.source?.includes ?? ["**/*"];
   }

   get sourceExcludes() {
      return this.source?.excludes ?? [];
   }

   /**
    * Gets tarball name can have date patterns enclosed with `{{..}}`
    * Examples:
    * - `{{yyyy-MM-DD_HH-mm-ss}}.tgz` -> `2025-10-22_13-02-33`
    * - `archive-{{mm-dd}}.tgz` -> `10-22.tgz`
    * Details see format() function of `date-fns` module.
    * @param input
    * @returns
    */
   get targetArchiveName(): string {
      return this.resolveDatePattern(this.target?.archive_name ?? "{{yyyy-MM-dd_HH-mm-ss}}.tgz");
   }

   /**
    * Format is `'uid:gid:file_mode:dir_mode'`, where each part can be omitted.
    * - `uid` ownership user id
    * - `gid` ownership group id
    * - `file_mode` file mode used in fs.chmod()
    * - `dir_mode`dir mode of parent dir.
    *
    * Examples: `::660:770`, `1000:1000::`, `0:0:660:770`
    * @returns attribute string
    */
   get targetPermissions(): string {
      const perm = this.target?.permissions;
      return `${perm?.owner ?? ":"}:${perm?.file_mode ?? ""}:${perm?.dir_mode ?? ""}`;
   }

   private resolveDatePattern(input: string, date = new Date()): string {
      return input.replace(/\{\{(.+?)\}\}/g, (_, pattern) => format(date, pattern));
   }
}
