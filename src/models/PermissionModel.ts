export class PermissionModel {
   public uid: number; // NaN if not set!
   public gid: number; // NaN if not set!
   public fileMode: number;
   public dirMode: number;
   constructor(ownerStr: string = ":", fileModeStr?: string, dirModeStr?: string) {
      const [uidStr, gidStr] = ownerStr.split(":");
      this.uid = parseInt(uidStr || "", 10);
      this.gid = parseInt(gidStr || "", 10);
      this.fileMode = parseInt(fileModeStr || "", 8);
      this.dirMode = parseInt(dirModeStr || "", 8);
   }

   public hasChanges(): boolean {
      return [this.uid, this.gid, this.fileMode, this.dirMode].some((v) => !Number.isNaN(v));
   }
}
