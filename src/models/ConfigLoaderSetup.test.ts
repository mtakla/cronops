import { vi, beforeEach, describe, expect, it } from "vitest";
import { ConfigLoaderSetup } from "./ConfigLoaderSetup";
import { join, resolve, dirname } from "node:path";
import { ENV } from "../types/Options.types";
import { fileURLToPath } from "node:url";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

// avoid process.env side effects
beforeEach(() => {
   vi.unstubAllEnvs();
});

describe(ConfigLoaderSetup.name, () => {
   it("initialization with defaults should work", () => {
      const setup = new ConfigLoaderSetup();
      expect(setup.configDir).toBe(join(appDir, "./config"));
      expect(setup.configFileName).toBe("jobs.yaml");
      expect(setup.configFilePath).toBe(resolve(appDir, "config", "jobs.yaml"));
   });

   it("initialization with env variables should work", () => {
      vi.stubEnv(ENV.CONFIG_DIR, "/foo/config");
      vi.stubEnv(ENV.TZ, "Europe/Berlin");
      const setup = new ConfigLoaderSetup({});
      expect(setup.configDir).toBe("/foo/config");
      expect(setup.configFileName).toBe("jobs.yaml");
      expect(setup.configFilePath).toBe(resolve(join("/foo/config", "jobs.yaml")));
   });
});
