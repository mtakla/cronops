import { join, resolve } from "node:path";
import { ENV, type LoaderOptions } from "../types/Options.types.js";

export class ConfigLoaderSetup implements LoaderOptions {
   public readonly configDir;
   public readonly configFileName;

   constructor(options: LoaderOptions = {}) {
      this.configDir = resolve(options.configDir ?? process.env[ENV.CONFIG_DIR] ?? "./config");
      this.configFileName = options.configFileName ?? process.env[ENV.CONFIG_FILE] ?? "jobs.yaml";
   }

   get configFilePath(): string {
      return join(this.configDir, this.configFileName);
   }
}
