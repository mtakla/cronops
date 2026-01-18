import fsx from "fs-extra";
import { join, resolve } from "node:path";
import { describe, it, expect, beforeEach } from "vitest";
import { JobRunner } from "./JobRunner.js";
import { JobLogModel } from "../models/JobLogModel.js";
import { JobModel } from "../models/JobModel.js";
import { JobRunnerSetup } from "../models/JobRunnerSetup.js";

// remember app dir
const dir = resolve("./test/fixtures");
const workDir = resolve("./build/test/JobRunner");

const setup = new JobRunnerSetup({
   sourceRoot: join(workDir, "files"),
   targetRoot: join(workDir, "targets"),
   tempDir: join(workDir, "temp"),
});

beforeEach(async () => {
   await fsx.remove(setup.tempDir);
   await fsx.remove(workDir);
   await fsx.ensureDir(workDir);
   await fsx.copy(dir, workDir);
});

describe("JobRunner", () => {
   it("running on disabled job should work", async () => {
      const job = new JobModel({
         id: "job1",
         action: "copy",
         enabled: false,
      });
      const task = new JobRunner(job, setup);
      expect(await task.runJob()).toMatchObject({ copied: 0, deleted: 0, archived: 0, pruned: 0, tracked: 0 });
   });

   it("running on invalid source dir should indicate error", async () => {
      const job = new JobModel({
         id: "job1",
         action: "copy",
         source: { dir: "/missing/folder" },
      });
      const task = new JobRunner(job, setup);
      await expect(task.runJob()).rejects.toThrow();
   });

   it("operating on zero source files should work", async () => {
      const job = new JobModel({
         id: "testjob",
         action: "copy",
         source: { includes: ["**/*.missing"] },
      });
      const task = new JobRunner(job, setup);
      expect(await task.runJob()).toMatchObject({ copied: 0, deleted: 0, archived: 0, pruned: 0, tracked: 0 });
      job.type = "move";
      expect(await task.runJob()).toMatchObject({ copied: 0, deleted: 0, archived: 0, pruned: 0, tracked: 0 });
      job.type = "delete";
      expect(await task.runJob()).toMatchObject({ copied: 0, deleted: 0, archived: 0, pruned: 0, tracked: 0 });
      job.type = "archive";
      expect(await task.runJob()).toMatchObject({ copied: 0, deleted: 0, archived: 0, pruned: 0, tracked: 0 });
   });

   it("copying one single file should work", async () => {
      const job = new JobModel({
         id: "testjob",
         action: "copy",
         source: { includes: ["**/*.txt"] },
      });
      const task = new JobRunner(job, setup);
      let res = await task.runJob();
      expect(res).toMatchObject({ copied: 1, deleted: 0, pruned: 0, tracked: 1 });
      expect(fsx.pathExistsSync(join(workDir, "targets", "foo.txt"))).toBe(true);
      res = await task.runJob(); // run job again should have no effect
      expect(res).toMatchObject({ copied: 0, deleted: 0, pruned: 0, tracked: 1 });
   });

   it("moving one single file should work", async () => {
      const job = new JobModel({
         id: "testjob",
         action: "move",
         source: { includes: ["**/*.txt"] },
      });
      const task = new JobRunner(job, setup);
      let res = await task.runJob();
      expect(res).toMatchObject({ copied: 1, deleted: 1, archived: 0, pruned: 0, tracked: 1 });
      expect(fsx.pathExistsSync(join(workDir, "files", "foo.txt"))).toBe(false);
      expect(fsx.pathExistsSync(join(workDir, "targets", "foo.txt"))).toBe(true);
      res = await task.runJob(); // run job again should have no effect
      expect(res).toMatchObject({ copied: 0, deleted: 0, archived: 0, pruned: 0, tracked: 1 });
   });

   it("removing one single file should work", async () => {
      const job = new JobModel({
         id: "testjob",
         action: "delete",
         source: { includes: ["**/*.txt"] },
      });
      const task = new JobRunner(job, setup);
      let res = await task.runJob();
      expect(res).toMatchObject({ copied: 0, deleted: 1, pruned: 0, tracked: 0 });
      expect(fsx.pathExistsSync(join(workDir, "files", "foo.txt"))).toBe(false);
      expect(fsx.pathExistsSync(join(workDir, "targets", "foo.txt"))).toBe(false);
      res = await task.runJob(); // run job again should have no effect
      expect(res).toMatchObject({ copied: 0, deleted: 0, pruned: 0, tracked: 0 });
   });

   it("archiving one single file should work", async () => {
      const job = new JobModel({
         id: "testjob",
         action: "archive",
         source: { includes: ["**/*.txt"] },
         target: { archive_name: "archive.tgz" },
      });
      const task = new JobRunner(job, setup);
      const res = await task.runJob();
      expect(fsx.pathExistsSync(join(workDir, "files", "foo.txt"))).toBe(true);
      expect(fsx.pathExistsSync(join(workDir, "targets", "archive.tgz"))).toBe(true);
      expect(res).toMatchObject({ copied: 0, deleted: 0, archived: 1, pruned: 0, tracked: 2 });
   });

   it("copying multiple files should work", async () => {
      const job = new JobModel({
         id: "testjob",
         action: "copy",
      });
      const task = new JobRunner(job, setup);
      let res = await task.runJob();
      expect(res).toMatchObject({ copied: 3, deleted: 0, pruned: 0, tracked: 3 });
      res = await task.runJob(); // run job again should have no effect
      expect(res).toMatchObject({ copied: 0, deleted: 0, pruned: 0, tracked: 3 });
   });

   it("moving multiple files should work", async () => {
      const job = new JobModel({
         id: "testjob",
         action: "move",
      });
      const task = new JobRunner(job, setup);
      let res = await task.runJob();
      expect(fsx.pathExistsSync(join(workDir, "files", "subfolder", "data2.json"))).toBe(false);
      expect(fsx.pathExistsSync(join(workDir, "targets", "subfolder", "data2.json"))).toBe(true);
      expect(res).toMatchObject({ copied: 3, deleted: 3, pruned: 0, tracked: 3 });
      res = await task.runJob(); // run job again should have no effect
      expect(res).toMatchObject({ copied: 0, deleted: 0, pruned: 0, tracked: 3 });
   });

   it("removing multiple files should work", async () => {
      const job = new JobModel({
         id: "testjob",
         action: "delete",
      });
      const task = new JobRunner(job, setup);
      let res = await task.runJob();
      expect(fsx.pathExistsSync(join(workDir, "files", "subfolder", "data2.json"))).toBe(false);
      expect(res).toMatchObject({ copied: 0, deleted: 3, pruned: 0, tracked: 0 });
      res = await task.runJob(); // run job again should have no effect
      expect(res).toMatchObject({ copied: 0, deleted: 0, pruned: 0, tracked: 0 });
   });

   it("archiving multiple files should work", async () => {
      const job = new JobModel({
         id: "testjob",
         action: "archive",
         target: { archive_name: "archive.tgz" },
      });
      const task = new JobRunner(job, setup);
      expect(await task.runJob()).toMatchObject({ copied: 0, archived: 3, pruned: 0, tracked: 4 });
      expect(fsx.pathExistsSync(join(workDir, "targets", "archive.tgz"))).toBe(true);
   });

   it("dry run on copying multiple files should work", async () => {
      const job = new JobModel({
         id: "testjob",
         action: "copy",
         dry_run: true,
      });
      const task = new JobRunner(job, setup);
      expect(await task.runJob()).toMatchObject({ copied: 3, deleted: 0, pruned: 0, tracked: 3 });
      expect(fsx.pathExistsSync(join(workDir, "temp", "testjob", "subfolder", "data2.json"))).toBe(true);
   });

   it("simulating moving multiple files should work", async () => {
      const job = new JobModel({
         id: "testjob",
         action: "move",
         dry_run: true,
      });
      const task = new JobRunner(job, setup);
      expect(await task.runJob()).toMatchObject({ copied: 3, deleted: 3, pruned: 0, tracked: 3 });
      expect(fsx.pathExistsSync(join(workDir, "files", "subfolder", "data2.json"))).toBe(true); // simulation!
      expect(fsx.pathExistsSync(join(workDir, "temp", "testjob", "subfolder", "data2.json"))).toBe(true);
   });

   it("simulating removing multiple files should work", async () => {
      const job = new JobModel({
         id: "testjob",
         action: "delete",
         dry_run: true,
      });
      const task = new JobRunner(job, setup);
      expect(await task.runJob()).toMatchObject({ copied: 0, deleted: 3, pruned: 0, tracked: 0 });
      expect(fsx.pathExistsSync(join(workDir, "files", "subfolder", "data2.json"))).toBe(true); // simulation!
   });

   it("simulating archiving multiple files should work", async () => {
      const job = new JobModel({
         id: "testjob",
         action: "archive",
         target: {
            archive_name: "archive.tgz",
         },
         dry_run: true,
      });
      const task = new JobRunner(job, setup);
      expect(await task.runJob()).toMatchObject({ copied: 0, deleted: 0, archived: 3, pruned: 0, tracked: 4 });
      expect(fsx.pathExistsSync(join(workDir, "temp", "testjob", "archive.tgz"))).toBe(true);
   });

   it("copying with chmod on files and folders should work", async () => {
      const job = new JobModel({
         id: "testjob",
         action: "copy",
         target: {
            permissions: {
               file_mode: "600",
               dir_mode: "700",
            },
         },
      });
      const task = new JobRunner(job, setup);
      const res = await task.runJob();
      expect(res).toMatchObject({ copied: 3, deleted: 0, pruned: 0, tracked: 3 });
      expect(fsx.pathExistsSync(join(workDir, "targets", "subfolder", "data2.json"))).toBe(true);
      expect((fsx.statSync(join(workDir, "targets", "subfolder", "data2.json")).mode & 0o777).toString(8)).toBe("600");
      expect((fsx.statSync(join(workDir, "targets", "subfolder")).mode & 0o777).toString(8)).toBe("700");
   });

   it("archiving with chmod on archive should work", async () => {
      const job = new JobModel({
         id: "testjob",
         action: "archive",
         target: {
            dir: "$1/archives",
            archive_name: "archive.tgz",
            permissions: {
               file_mode: "600",
               dir_mode: "700",
            },
         },
      });
      const task = new JobRunner(job, setup);
      expect(await task.runJob()).toMatchObject({ copied: 0, deleted: 0, archived: 3, pruned: 0, tracked: 4 });
      expect(fsx.pathExistsSync(join(workDir, "targets", "archives", "archive.tgz"))).toBe(true);
      expect((fsx.statSync(join(workDir, "targets", "archives", "archive.tgz")).mode & 0o777).toString(8)).toBe("600");
      expect((fsx.statSync(join(workDir, "targets", "archives")).mode & 0o777).toString(8)).toBe("700");
   });

   it("removing retained file should work", async () => {
      const destDir = join(workDir, "targets", "outdatedFile");
      const job = new JobModel({
         id: "testjob",
         action: "copy",
         target: {
            dir: "/outdatedFile",
            retention: "2h",
         },
      });
      const log = new JobLogModel();
      log.addEntry({
         src: "/foo/bar/deleteme.txt",
         dest: join(destDir, "deleteme.txt"),
         mtime: Date.parse("2020-01-01"),
         ttime: Date.parse("2020-01-01"),
      });
      await fsx.writeJSON(join(destDir, ".testjob.cronops"), log.data);
      const task = new JobRunner(job, setup);
      expect(await task.runJob()).toMatchObject({ copied: 3, deleted: 0, archived: 0, pruned: 1, tracked: 3 });
      expect(fsx.pathExistsSync(join(destDir, "deleteme.txt"))).toBe(false);
   });

   it("remove untracked job log entry", async () => {
      const destDir = join(workDir, "targets", "untrackedEntry");
      const job = new JobModel({
         id: "testjob",
         action: "copy",
         target: {
            dir: "/untrackedEntry",
         },
      });
      const log = new JobLogModel();
      log.addEntry({
         src: "/foo/bar/missing.txt",
         dest: join(destDir, "missing.txt"),
         mtime: Date.parse("2020-01-01"),
         ttime: Date.parse("2020-01-01"),
      });
      await fsx.writeJSON(join(destDir, ".testjob.cronops"), log.data);
      const task = new JobRunner(job, setup);
      expect(await task.runJob()).toMatchObject({ copied: 3, deleted: 0, archived: 0, pruned: 0, tracked: 3 });
      expect(!fsx.pathExistsSync(join(destDir, "deleteme.txt"))).toBeTruthy();
   });
});
