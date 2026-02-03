import { describe, it, expect } from "vitest";
import { PermissionModel } from "../../src/models/PermissionModel.js";

describe(PermissionModel.name, () => {
   it("minimum constructor", () => {
      const perm = new PermissionModel("");
      expect(perm.uid).toBe(NaN);
      expect(perm.gid).toBe(NaN);
      expect(perm.fileMode).toBe(0o660);
      expect(perm.dirMode).toBe(0o770);
   });

   it("constructor with all attributes set", () => {
      const perm = new PermissionModel("1000:100:666:777");
      expect(perm.uid).toBe(1000);
      expect(perm.gid).toBe(100);
      expect(perm.fileMode).toBe(0o666);
      expect(perm.dirMode).toBe(0o777);
   });

   it("constructor with gid", () => {
      const perm = new PermissionModel(":1000::");
      expect(perm.uid).toBe(NaN);
      expect(perm.gid).toBe(1000);
      expect(perm.fileMode).toBe(0o660);
      expect(perm.dirMode).toBe(0o770);
   });

   it("constructor with file mode", () => {
      const perm = new PermissionModel("::666:");
      expect(perm.uid).toBe(NaN);
      expect(perm.gid).toBe(NaN);
      expect(perm.fileMode).toBe(0o666);
      expect(perm.dirMode).toBe(0o770);
   });
});
