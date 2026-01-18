export class PermissionModel {
   public uid: number;
   public gid: number;
   public fileMode: number;
   public dirMode: number;
   constructor(attr: string) {
      const [uidStr, gidStr, fileModeStr, dirModeStr] = attr.split(":");
      this.uid = parseInt(uidStr || "", 10);
      this.gid = parseInt(gidStr || "", 10);
      this.fileMode = parseInt(fileModeStr || "660", 8);
      this.dirMode = parseInt(dirModeStr || "770", 8);
   }
}
