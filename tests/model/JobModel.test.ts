import { describe, it, expect } from "vitest";
import { JobModel } from "../../src/models/JobModel.js";

describe(JobModel.name, () => {
   it("constructor with minimal specs should work", () => {
      const job = new JobModel({
         id: "testjob",
         action: "move",
      });
      expect(job.id).toBe("testjob");
      expect(job.action).toBe("move");
      expect(job.cron).toBe("* * * * *");
      expect(job.source).toEqual({});
      expect(job.target).toEqual({});
      expect(job.dry_run).toBe(false);
      expect(job.enabled).toBe(true);
   });

   it("constructor with minimal specs and defaults should work", () => {
      const job = new JobModel(
         {
            id: "testjob",
            action: "move",
         },
         {
            source: { dir: "/src", includes: ["**"] },
            target: { dir: "/dest" },
         },
      );
      expect(job.id).toBe("testjob");
      expect(job.action).toBe("move");
      expect(job.cron).toBe("* * * * *");
      expect(job.source).toEqual({ dir: "/src", includes: ["**"] });
      expect(job.target).toEqual({ dir: "/dest" });
   });

   it("constructor with standard job specs should work", () => {
      const job = new JobModel({
         id: "testjob",
         action: "move",
         source: { dir: "/src" },
         target: { dir: "/dest", retention: "24h" },
         dry_run: true,
         enabled: false,
      });
      expect(job.id).toBe("testjob");
      expect(job.action).toBe("move");
      expect(job.source?.dir).toBe("/src");
      expect(job.target?.dir).toBe("/dest");
      expect(job.target?.retention).toBe("24h");
      expect(job.dry_run).toBe(true);
      expect(job.enabled).toBe(false);
   });

   it("sourceIncludes property should return correct values", () => {
      const job1 = new JobModel({ id: "testjob1", action: "copy" }, { source: { includes: ["**"] } });
      expect(job1.sourceIncludes).toEqual(["**"]); // default
      const job2 = new JobModel({ id: "testjob2", action: "copy", source: {} });
      expect(job2.sourceIncludes).toEqual(["**/*"]);
      job2.source = { includes: ["*.mkv"] };
      expect(job2.sourceIncludes).toEqual(["*.mkv"]);
   });

   it("sourceExcludes property should return correct values", () => {
      const job1 = new JobModel({ id: "testjob1", action: "copy" }, { source: { excludes: ["**/.tmp"] } });
      expect(job1.sourceExcludes).toEqual(["**/.tmp"]); // default
      const job2 = new JobModel({ id: "testjob2", action: "copy", source: {} });
      expect(job2.sourceExcludes).toEqual([]);
      job2.source = { excludes: ["*.mkv"] };
      expect(job2.sourceExcludes).toEqual(["*.mkv"]);
   });

   it(`targetArchiveName property should return correct values `, () => {
      const job1 = new JobModel({ id: "testjob1", action: "copy" }, { target: { archive_name: "archive.tgz" } });
      expect(job1.targetArchiveName).toEqual("archive.tgz"); // default
      const job2 = new JobModel({ id: "testjob", action: "copy", target: {} });
      expect(job2.targetArchiveName.length).toBe(23);
      job2.target = { archive_name: "x{{yyyy}}x.tgz" };
      expect(job2.targetArchiveName.length).toBe(10);
      job2.target = { archive_name: "{{yy'yy'MM}}.tgz" };
      expect(job2.targetArchiveName.length).toBe(10);
   });

   it("targetPermission property should return correct values", () => {
      const job = new JobModel({ id: "testjob", action: "move", target: {} });
      expect(job.targetPermissions).toBe(":::");
      job.target = { permissions: { file_mode: "640" } };
      expect(job.targetPermissions).toBe("::640:");
      job.target = { permissions: { dir_mode: "750" } };
      expect(job.targetPermissions).toBe(":::750");
      job.target = { permissions: { file_mode: "644", dir_mode: "755" } };
      expect(job.targetPermissions).toBe("::644:755");
      job.target = { permissions: { owner: "1000:1000", file_mode: "640", dir_mode: "750" } };
      expect(job.targetPermissions).toBe("1000:1000:640:750");
      job.target = { permissions: { owner: "1001:1001" } };
      expect(job.targetPermissions).toBe("1001:1001::");
      job.target = { permissions: { owner: "1000:" } };
      expect(job.targetPermissions).toBe("1000:::");
      job.target = { permissions: { owner: ":0" } };
      expect(job.targetPermissions).toBe(":0::");
   });
});
