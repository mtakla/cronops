import { vi, beforeEach, describe, expect, it } from "vitest";
import { JobRunnerSetup } from "./JobRunnerSetup";
import { join, resolve, dirname } from "node:path";
import { ENV } from "../types/Options.types";
import { fileURLToPath } from "node:url";
import { ValidationError } from "../errors/ValidationError";

// For testing purpose only
const appDir = resolve(join(dirname(fileURLToPath(import.meta.url)), "..", ".."));

// avoid process.env side effects
beforeEach(() => {
   vi.unstubAllEnvs();
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
      expect(setup.tempDir).toBe("/tmp/cronops");
   });

   it("initialization with env variables should work", () => {
      vi.stubEnv(ENV.SOURCE_ROOT, "/foo/source");
      vi.stubEnv(ENV.TARGET_ROOT, "foo/target");
      vi.stubEnv(ENV.SOURCE_2_ROOT, "/foo/source2");
      vi.stubEnv(ENV.TARGET_2_ROOT, "./foo/target2");
      vi.stubEnv(ENV.SOURCE_3_ROOT, "/foo/source3");
      vi.stubEnv(ENV.TARGET_3_ROOT, "/./foo/target3");
      vi.stubEnv(ENV.TEMP_DIR, "/temp");
      vi.stubEnv(ENV.TZ, "Europe/Berlin");
      const setup = new JobRunnerSetup();
      expect(setup.sourceRoot).toBe("/foo/source");
      expect(setup.targetRoot).toBe(join(appDir, "/foo/target"));
      expect(setup.source2Root).toBe("/foo/source2");
      expect(setup.target2Root).toBe(join(appDir, "/foo/target2"));
      expect(setup.source3Root).toBe("/foo/source3");
      expect(setup.target3Root).toBe("/foo/target3");
      expect(setup.tempDir).toBe("/temp");
   });

   it("initialization with options should work", () => {
      vi.stubEnv(ENV.SOURCE_ROOT, "<ignore-me>");
      vi.stubEnv(ENV.TARGET_ROOT, "<ignore-me>");
      const setup = new JobRunnerSetup({
         sourceRoot: "/foo/source",
         targetRoot: "foo/target",
         source2Root: "/source2",
         target2Root: "/target2",
         source3Root: "",
         target3Root: "",
         tempDir: "/temp/myapp",
      });
      expect(setup.sourceRoot).toBe("/foo/source");
      expect(setup.targetRoot).toBe(join(appDir, "/foo/target"));
      expect(setup.source2Root).toBe("/source2");
      expect(setup.target2Root).toBe("/target2");
      expect(setup.source3Root).toBe(appDir);
      expect(setup.target3Root).toBe(appDir);
      expect(setup.tempDir).toBe("/temp/myapp");
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
      }).toThrow(ValidationError);
   });

   it("validateJob() should fail due to invalid root prefix", () => {
      const setup = new JobRunnerSetup({ sourceRoot: "./" });
      expect(() => {
         setup.validateJob({ id: "job1", action: "move", source: { dir: "$" } });
      }).toThrow(ValidationError);
      expect(() => {
         setup.validateJob({ id: "job1", action: "move", source: { dir: "$/" } });
      }).toThrow(ValidationError);
      expect(() => {
         setup.validateJob({ id: "job1", action: "move", source: { dir: "$0/" } });
      }).toThrow(ValidationError);
      expect(() => {
         setup.validateJob({ id: "job1", action: "move", source: { dir: "$1" } });
      }).toThrow(ValidationError);
      expect(() => {
         setup.validateJob({ id: "job1", action: "move", source: { dir: "$2./" } });
      }).toThrow(ValidationError);
   });

   it("validateJob() should fail due to invalid cron definition", () => {
      const setup = new JobRunnerSetup({ sourceRoot: "./" });
      expect(() => {
         setup.validateJob({ id: "job1", action: "move", cron: "<invalid>" });
      }).toThrow(ValidationError);
   });

   it("validateJob() should fail due to missing source path in filesystem", () => {
      const setup = new JobRunnerSetup({ sourceRoot: "./" });
      expect(() => {
         setup.validateJob({ id: "job1", action: "move", source: { dir: "$1/missing-dir" } });
      }).toThrow(ValidationError);
   });

   it("validateJob() should fail due invalid archive name", () => {
      const setup = new JobRunnerSetup({ sourceRoot: "./" });
      expect(() => {
         setup.validateJob({ id: "job1", action: "archive", target: { archive_name: "$1/archive.tgz" } });
      }).toThrow(ValidationError);
   });

   it("validateJob() should fail due to nested target dir", () => {
      const setup = new JobRunnerSetup({ sourceRoot: "./", targetRoot: "./" });
      expect(() => {
         setup.validateJob({ id: "job1", action: "move" });
      }).toThrow(ValidationError);
   });
});
