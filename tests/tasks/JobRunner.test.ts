import fsx from "fs-extra";
import { join, resolve } from "node:path";
import { describe, it, expect, beforeEach } from "vitest";
import { JobRunner } from "../../src/tasks/JobRunner.js";
import { JobModel } from "../../src/models/JobModel.js";
import { JobRunnerSetup } from "../../src/models/JobRunnerSetup.js";
import { FileHistoryModel } from "../../src/models/FileHistoryModel.js";

// remember app dir
const dir = resolve("./tests/fixtures");
const workDir = resolve("./build/tests/JobRunner");

const setup = new JobRunnerSetup({
   sourceRoot: join(workDir, "files"),
   targetRoot: join(workDir, "targets"),
   tempDir: join(workDir, "temp"),
   logDir: workDir,
});

beforeEach(async () => {
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
      expect(await task.runJob()).toMatchObject({ copied: 0, deleted: 0, archived: 0, pruned: 0 });
   });

   it("operating on zero source files should work", async () => {
      const job = new JobModel({
         id: "testjob",
         action: "copy",
         source: { includes: ["**/*.missing"] },
      });
      const task = new JobRunner(job, setup);
      expect(await task.runJob()).toMatchObject({ copied: 0, deleted: 0, archived: 0, pruned: 0 });
      job.action = "move";
      expect(await task.runJob()).toMatchObject({ copied: 0, deleted: 0, archived: 0, pruned: 0 });
      job.action = "delete";
      expect(await task.runJob()).toMatchObject({ copied: 0, deleted: 0, archived: 0, pruned: 0 });
      job.action = "archive";
      expect(await task.runJob()).toMatchObject({ copied: 0, deleted: 0, archived: 0, pruned: 0 });
      job.action = "exec";
      expect(await task.runJob()).toMatchObject({ copied: 0, deleted: 0, archived: 0, pruned: 0 });
   });

   it("copying one single file should work", async () => {
      const job = new JobModel({
         id: "testjob",
         action: "copy",
         source: { includes: ["**/foo.txt"] },
      });
      const task = new JobRunner(job, setup);
      let res = await task.runJob();
      expect(res).toMatchObject({ copied: 1, deleted: 0, pruned: 0 });
      expect(fsx.pathExistsSync(join(workDir, "targets", "foo.txt"))).toBe(true);
      res = await task.runJob(); // run job again should have no effect
      expect(res).toMatchObject({ copied: 0, deleted: 0, pruned: 0 });
   });

   it("moving one single file should work", async () => {
      const job = new JobModel({
         id: "testjob",
         action: "move",
         source: { includes: ["**/foo.txt"] },
      });
      const task = new JobRunner(job, setup);
      let res = await task.runJob();
      expect(res).toMatchObject({ copied: 1, deleted: 1, archived: 0, pruned: 0 });
      expect(fsx.pathExistsSync(join(workDir, "files", "foo.txt"))).toBe(false);
      expect(fsx.pathExistsSync(join(workDir, "targets", "foo.txt"))).toBe(true);
      res = await task.runJob(); // run job again should have no effect
      expect(res).toMatchObject({ copied: 0, deleted: 0, archived: 0, pruned: 0 });
   });

   it("removing one single file should work", async () => {
      const job = new JobModel({
         id: "testjob",
         action: "delete",
         source: { includes: ["**/foo.txt"] },
      });
      const task = new JobRunner(job, setup);
      let res = await task.runJob();
      expect(res).toMatchObject({ copied: 0, deleted: 1, pruned: 0 });
      expect(fsx.pathExistsSync(join(workDir, "files", "foo.txt"))).toBe(false);
      expect(fsx.pathExistsSync(join(workDir, "targets", "foo.txt"))).toBe(false);
      res = await task.runJob(); // run job again should have no effect
      expect(res).toMatchObject({ copied: 0, deleted: 0, pruned: 0 });
   });

   it("archiving one single file should work", async () => {
      const job = new JobModel({
         id: "testjob",
         action: "archive",
         source: { includes: ["**/foo.txt"] },
         target: { archive_name: "archive.tgz" },
      });
      const task = new JobRunner(job, setup);
      const res = await task.runJob();
      expect(fsx.pathExistsSync(join(workDir, "files", "foo.txt"))).toBe(true);
      expect(fsx.pathExistsSync(join(workDir, "targets", "archive.tgz"))).toBe(true);
      expect(res).toMatchObject({ copied: 0, deleted: 0, archived: 1, pruned: 0 });
   });

   it("copying multiple files should work", async () => {
      const job = new JobModel({
         id: "testjob",
         action: "copy",
      });
      const task = new JobRunner(job, setup);
      let res = await task.runJob();
      expect(res).toMatchObject({ copied: 4, deleted: 0, pruned: 0 });
      res = await task.runJob(); // run job again should have no effect
      expect(res).toMatchObject({ copied: 0, deleted: 0, pruned: 0 });
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
      expect(res).toMatchObject({ copied: 4, deleted: 4, pruned: 0 });
      res = await task.runJob(); // run job again should have no effect
      expect(res).toMatchObject({ copied: 0, deleted: 0, pruned: 0 });
   });

   it("removing multiple files should work", async () => {
      const job = new JobModel({
         id: "testjob",
         action: "delete",
      });
      const task = new JobRunner(job, setup);
      let res = await task.runJob();
      expect(fsx.pathExistsSync(join(workDir, "files", "subfolder", "data2.json"))).toBe(false);
      expect(res).toMatchObject({ copied: 0, deleted: 4, pruned: 0 });
      res = await task.runJob(); // run job again should have no effect
      expect(res).toMatchObject({ copied: 0, deleted: 0, pruned: 0 });
   });

   it("archiving multiple files should work", async () => {
      const job = new JobModel({
         id: "testjob",
         action: "archive",
         target: { archive_name: "archive.tgz" },
      });
      const task = new JobRunner(job, setup);
      expect(await task.runJob()).toMatchObject({ copied: 0, archived: 4, pruned: 0 });
      expect(fsx.pathExistsSync(join(workDir, "targets", "archive.tgz"))).toBe(true);
   });

   it("dry run on copying multiple files should work", async () => {
      const job = new JobModel({
         id: "testjob",
         action: "copy",
         dry_run: true,
      });
      const task = new JobRunner(job, setup);
      expect(await task.runJob()).toMatchObject({ copied: 4, deleted: 0, pruned: 0 });
      expect(fsx.pathExistsSync(join(workDir, "temp", "testjob", "subfolder", "data2.json"))).toBe(true);
   });

   it("simulating moving multiple files should work", async () => {
      const job = new JobModel({
         id: "testjob",
         action: "move",
         dry_run: true,
      });
      const task = new JobRunner(job, setup);
      expect(await task.runJob()).toMatchObject({ copied: 4, deleted: 4, pruned: 0 });
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
      expect(await task.runJob()).toMatchObject({ copied: 0, deleted: 4, pruned: 0 });
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
      expect(await task.runJob()).toMatchObject({ copied: 0, deleted: 0, archived: 4, pruned: 0 });
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
      expect(res).toMatchObject({ copied: 4, deleted: 0, pruned: 0 });
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
      expect(await task.runJob()).toMatchObject({ copied: 0, deleted: 0, archived: 4, pruned: 0 });
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
      const history = new FileHistoryModel();
      history.addTargetEntry(join(destDir, "deleteme.txt"), [Date.parse("2020-01-01"), Date.parse("2020-01-01")]);
      await fsx.writeJSON(join(setup.logDir, "testjob.idx"), history.data);
      const task = new JobRunner(job, setup);
      expect(await task.runJob()).toMatchObject({ copied: 4, deleted: 0, archived: 0, pruned: 1 });
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
      const log = new FileHistoryModel();
      log.addTargetEntry(join(destDir, "missing.txt"), [Date.parse("2020-01-01"), Date.parse("2020-01-01")]);
      await fsx.writeJSON(join(setup.logDir, "testjob.history"), log.data);
      const task = new JobRunner(job, setup);
      expect(await task.runJob()).toMatchObject({ copied: 4, deleted: 0, archived: 0, pruned: 0 });
      expect(!fsx.pathExistsSync(join(destDir, "deleteme.txt"))).toBeTruthy();
   });
});
