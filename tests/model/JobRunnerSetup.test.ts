import os from "node:os";
import { join, resolve, dirname } from "node:path";
import { vi, beforeEach, describe, expect, it } from "vitest";
import { JobRunnerSetup } from "../../src/models/JobRunnerSetup";
import { fileURLToPath } from "node:url";
import { JobError } from "../../src/errors/JobError";
import { ENV } from "../../src/types/Options.types";
import { ExecHandler } from "../../src/handlers/ExecHandler";
import { FileCopyHandler } from "../../src/handlers/FileCopyHandler";
import { FileMoveHandler } from "../../src/handlers/FileMoveHandler";
import { FileDeleteHandler } from "../../src/handlers/FileDeleteHandler";
import { FileArchiveHandler } from "../../src/handlers/FileArchiveHandler";
import { afterEach } from "node:test";

// For testing purpose only
const appDir = resolve(join(dirname(fileURLToPath(import.meta.url)), "..", ".."));
const origEnv = { ...process.env };

// avoid process.env side effects
beforeEach(() => {
   process.env = {};
   vi.unstubAllEnvs();
});

afterEach(() => {
   process.env = { ...origEnv };
});

describe(JobRunnerSetup.name, () => {
   it("initialization with defaults should work", () => {
      const setup = new JobRunnerSetup();
      expect(setup.sourceRoot).toBe(appDir);
      expect(setup.targetRoot).toBe(appDir);
      expect(setup.source2Root).toBe(appDir);
      expect(setup.target2Root).toBe(appDir);
      expect(setup.source3Root).toBe(appDir);
      expect(setup.target3Root).toBe(appDir);
      expect(setup.tempDir).toBe(join(os.tmpdir(), "cronops"));
      expect(setup.configDir).toBe(join(os.homedir(), ".cronops", "config"));
      expect(setup.logDir).toBe(join(os.homedir(), ".cronops", "logs"));
      expect(setup.shell).toBe(false);
      expect(setup.uid).toBe(process.getuid ? `${process.getuid?.()}` : "0");
      expect(setup.gid).toBe(process.getgid ? `${process.getgid?.()}` : "0");
   });

   it("initialization with env variables should work", () => {
      vi.stubEnv(ENV.SOURCE_ROOT, "/foo/source");
      vi.stubEnv(ENV.TARGET_ROOT, "foo/target");
      vi.stubEnv(ENV.SOURCE_2_ROOT, "/foo/source2");
      vi.stubEnv(ENV.TARGET_2_ROOT, "./foo/target2");
      vi.stubEnv(ENV.SOURCE_3_ROOT, "/foo/source3");
      vi.stubEnv(ENV.TARGET_3_ROOT, "/./foo/target3");
      vi.stubEnv(ENV.EXEC_SHELL, "/bin/bash");
      vi.stubEnv(ENV.TEMP_DIR, "/temp");
      vi.stubEnv(ENV.LOG_DIR, "/var/log/cronops");
      vi.stubEnv(ENV.PUID, "1000");
      vi.stubEnv(ENV.PGID, "100");
      vi.stubEnv(ENV.TZ, "Europe/Berlin");
      const setup = new JobRunnerSetup();
      expect(setup.sourceRoot).toBe("/foo/source");
      expect(setup.targetRoot).toBe(join(appDir, "/foo/target"));
      expect(setup.source2Root).toBe("/foo/source2");
      expect(setup.target2Root).toBe(join(appDir, "/foo/target2"));
      expect(setup.source3Root).toBe("/foo/source3");
      expect(setup.target3Root).toBe("/foo/target3");
      expect(setup.shell).toBe("/bin/bash");
      expect(setup.tempDir).toBe("/temp");
      expect(setup.logDir).toBe("/var/log/cronops");
      expect(setup.uid).toBe("1000");
      expect(setup.gid).toBe("100");
   });

   it("initialization with options should work", () => {
      const setup = new JobRunnerSetup({
         sourceRoot: "/foo/source",
         targetRoot: "foo/target",
         source2Root: "/source2",
         target2Root: "/target2",
         source3Root: "",
         target3Root: "",
         tempDir: "/temp/myapp",
         logDir: "/var/log/cronops",
         shell: "cmd.exe",
         uid: "1000",
         gid: "100",
      });
      expect(setup.sourceRoot).toBe("/foo/source");
      expect(setup.targetRoot).toBe(join(appDir, "/foo/target"));
      expect(setup.source2Root).toBe("/source2");
      expect(setup.target2Root).toBe("/target2");
      expect(setup.source3Root).toBe(appDir);
      expect(setup.target3Root).toBe(appDir);
      expect(setup.shell).toBe("cmd.exe");
      expect(setup.tempDir).toBe("/temp/myapp");
      expect(setup.logDir).toBe("/var/log/cronops");
      expect(setup.uid).toBe("1000");
      expect(setup.gid).toBe("100");
   });

   it("resolveSourceDir() should return correct values", () => {
      let setup = new JobRunnerSetup(); // Defaults
      expect(setup.resolveSourceDir("/foo")).toBe(join(appDir, "/foo"));
      expect(setup.resolveSourceDir("foo")).toBe(join(appDir, "/foo"));
      expect(setup.resolveSourceDir("./foo")).toBe(join(appDir, "/foo"));
      expect(setup.resolveSourceDir("$1/foo")).toBe(join(appDir, "/foo"));
      expect(setup.resolveSourceDir("$2/foo")).toBe(join(appDir, "/foo"));
      expect(setup.resolveSourceDir("$3/foo")).toBe(join(appDir, "/foo"));
      setup = new JobRunnerSetup({ sourceRoot: "/source", source2Root: "" });
      expect(setup.resolveSourceDir()).toBe("/source");
      expect(setup.resolveSourceDir("")).toBe("/source");
      expect(setup.resolveSourceDir("$1")).toBe("/source");
      expect(setup.resolveSourceDir("$1/")).toBe("/source");
      expect(setup.resolveSourceDir("$1/bar")).toBe("/source/bar");
      expect(setup.resolveSourceDir("/foo")).toBe("/source/foo");
      expect(setup.resolveSourceDir("$3/foo")).toBe(join(appDir, "foo"));
      expect(setup.resolveSourceDir("$2")).toBe(appDir);
      expect(setup.resolveSourceDir("$2/./x")).toBe(join(appDir, "x"));
   });

   it("resolveTargetDir() should return correct values", () => {
      let setup = new JobRunnerSetup(); // Defaults
      expect(setup.resolveTargetDir("/foo")).toBe(join(appDir, "/foo"));
      expect(setup.resolveTargetDir("foo")).toBe(join(appDir, "/foo"));
      expect(setup.resolveTargetDir("./foo")).toBe(join(appDir, "/foo"));
      expect(setup.resolveTargetDir("$1/foo")).toBe(join(appDir, "/foo"));
      expect(setup.resolveTargetDir("$2/foo")).toBe(join(appDir, "/foo"));
      expect(setup.resolveTargetDir("$3/foo")).toBe(join(appDir, "/foo"));
      setup = new JobRunnerSetup({ targetRoot: "/source", target2Root: "" });
      expect(setup.resolveTargetDir()).toBe("/source");
      expect(setup.resolveTargetDir("")).toBe("/source");
      expect(setup.resolveTargetDir("$1")).toBe("/source");
      expect(setup.resolveTargetDir("$1/")).toBe("/source");
      expect(setup.resolveTargetDir("$1/bar")).toBe("/source/bar");
      expect(setup.resolveTargetDir("/foo")).toBe("/source/foo");
      expect(setup.resolveTargetDir("$3/foo")).toBe(join(appDir, "foo"));
      expect(setup.resolveTargetDir("$2")).toBe(appDir);
      expect(setup.resolveTargetDir("$2/./x")).toBe(join(appDir, "x"));
   });

   it("getActionHandler() should return correct action handler", () => {
      const setup = new JobRunnerSetup();
      expect(setup.getActionHandler("exec")).toBeInstanceOf(ExecHandler);
      expect(setup.getActionHandler("copy")).toBeInstanceOf(FileCopyHandler);
      expect(setup.getActionHandler("move")).toBeInstanceOf(FileMoveHandler);
      expect(setup.getActionHandler("delete")).toBeInstanceOf(FileDeleteHandler);
      expect(setup.getActionHandler("archive")).toBeInstanceOf(FileArchiveHandler);
   });

   it("validateJob() with valid job definition should work", () => {
      const setup = new JobRunnerSetup({ sourceRoot: "./" });
      expect(() => {
         setup.validateJob({ id: "job1", action: "archive", source: { dir: "/src" }, target: { dir: "$1/build" } });
      }).not.toThrow();
   });

   it("validateJob() should fail due to schema error", () => {
      const setup = new JobRunnerSetup({ sourceRoot: "./" });
      expect(() => {
         // @ts-expect-error - Ignores typescript error
         setup.validateJob({ id: "job1", action: "<unknown>" });
      }).toThrow(JobError);
   });

   it("validateJob() should fail due to invalid root prefix", () => {
      const setup = new JobRunnerSetup({ sourceRoot: "./" });
      expect(() => {
         setup.validateJob({ id: "job1", action: "move", source: { dir: "$" } });
      }).toThrow(JobError);
      expect(() => {
         setup.validateJob({ id: "job1", action: "move", source: { dir: "$/" } });
      }).toThrow(JobError);
      expect(() => {
         setup.validateJob({ id: "job1", action: "move", source: { dir: "$0/" } });
      }).toThrow(JobError);
      expect(() => {
         setup.validateJob({ id: "job1", action: "move", source: { dir: "$1" } });
      }).toThrow(JobError);
      expect(() => {
         setup.validateJob({ id: "job1", action: "move", source: { dir: "$2./" } });
      }).toThrow(JobError);
   });

   it("validateJob() should fail due to invalid cron definition", () => {
      const setup = new JobRunnerSetup({ sourceRoot: "./" });
      expect(() => {
         setup.validateJob({ id: "job1", action: "move", cron: "<invalid>" });
      }).toThrow(JobError);
   });

   it("validateJob() should fail due to handler error (missing source)", () => {
      const setup = new JobRunnerSetup({ sourceRoot: "./" });
      expect(() => {
         setup.validateJob({ id: "job1", action: "move" });
      }).toThrow(JobError);
   });

   it("validateJob() should fail due to handler error (missing target)", () => {
      const setup = new JobRunnerSetup({ sourceRoot: "./" });
      expect(() => {
         setup.validateJob({ id: "job1", action: "move", source: { dir: "$1/missing-dir" } });
      }).toThrow(JobError);
   });
});
