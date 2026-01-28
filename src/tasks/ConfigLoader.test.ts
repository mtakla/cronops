import fsx from "fs-extra";
import { describe, it, expect, beforeAll, vi } from "vitest";
import { join, resolve } from "node:path";
import { ConfigLoader } from "./ConfigLoader.js";

// remember app dir
const configDir = resolve("./build/test/ConfigLoader");

beforeAll(async () => {
   await fsx.remove(configDir);
   await fsx.ensureDir(configDir);
   await fsx.copy("./test/fixtures/config", configDir);
});

describe(ConfigLoader.name, () => {
   it("default config should be copied & loaded", async () => {
      const task = new ConfigLoader({ configDir });
      expect(await task.loadConfig()).toBeDefined();
      expect(await fsx.pathExists(join(configDir, "jobs.yaml"))).toBe(true);
   });

   it("default config should be copied & loaded as jobs.yaml", async () => {
      const cbLoading = vi.fn();
      const cbLoaded = vi.fn();
      const task = new ConfigLoader({
         configDir,
      });
      task.onLoading(cbLoading);
      task.onLoaded(cbLoaded);
      expect(await task.loadConfig()).toBeDefined();
      expect(fsx.pathExistsSync(join(configDir, "jobs.yaml"))).toBe(true);
      expect(cbLoading).toBeCalledTimes(1);
      expect(cbLoaded).toBeCalledTimes(1);
   });

   it("existing config should be loaded", async () => {
      const task = new ConfigLoader({
         configDir,
      });
      const config = await task.loadConfig();
      expect(fsx.pathExistsSync(join(configDir, "valid.yaml"))).toBe(true);
      expect(config?.jobs).toBeDefined();
      expect(config?.jobs.length).toBe(3);
   });

   /*
   it("Invalid config file should throw error", async () => {
      const task = new ConfigLoader({
         configDir,
      });
      await expect(task.loadConfig()).rejects.toThrow();
   });

   it("Invalid config schema should throw error", async () => {
      const task = new ConfigLoader({
         configDir,
      });
      await expect(task.loadConfig()).rejects.toThrow();
   });
   */
});
