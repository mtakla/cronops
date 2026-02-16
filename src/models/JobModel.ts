import { format } from "date-fns";
import type { Job, JobAction, JobSource, JobTarget } from "../types/Config.types.js";
import { PermissionModel } from "./PermissionModel.js";

export class JobModel {
   public id!: string;
   public action!: JobAction;
   public command: string = "";
   public shell: boolean | string | undefined;
   public args: string[] = [];
   public env: Record<string, string> = {};
   public cron: string = "* * * * *";
   public source: JobSource = {};
   public target: JobTarget = {};
   public dry_run = false;
   public verbose = false;
   public enabled = true;

   constructor(data: Job, config = {}) {
      Object.assign(this, config);
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
    * Gets target permissions as PermissionModel instance
    * @returns
    */
   getTargetPermissions(): PermissionModel {
      const perm = this.target?.permissions;
      return perm ? new PermissionModel(perm.owner, perm.file_mode, perm.dir_mode) : new PermissionModel();
   }

   private resolveDatePattern(input: string, date = new Date()): string {
      return input.replace(/\{\{(.+?)\}\}/g, (_, pattern) => format(date, pattern));
   }
}
