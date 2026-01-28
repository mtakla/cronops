import { join, resolve } from "node:path";
import { ENV, type LoaderOptions } from "../types/Options.types.js";

export class ConfigLoaderSetup implements LoaderOptions {
   public readonly configDir;
   public readonly configFileName;
   public readonly jobsDir;

   constructor(options: LoaderOptions = {}) {
      this.configDir = resolve(options.configDir ?? process.env[ENV.CONFIG_DIR] ?? "./config");
      this.jobsDir = join(this.configDir, "jobs");
      this.configFileName = "jobs.yaml";
   }

   get configFilePath(): string {
      return join(this.configDir, this.configFileName);
   }
}
