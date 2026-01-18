import fsx from "fs-extra";
import YAML from "yaml";
import { join, dirname } from "node:path";
import { AbstractTask } from "./AbstractTask.js";
import { ConfigSchema, type Config } from "../types/Config.types.js";
import { ZodError } from "zod";
import { ConfigLoaderSetup } from "../models/ConfigLoaderSetup.js";
import type { LoaderOptions } from "../types/Options.types.js";
import { fileURLToPath } from "node:url";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export class ConfigLoader extends AbstractTask<Config> {
   protected setup: ConfigLoaderSetup;
   private configFileTime = 0;

   constructor(options: LoaderOptions = {}) {
      super("*/8 * * * * *");
      this.setup = new ConfigLoaderSetup(options);
   }

   protected override async run(): Promise<Config> {
      const configFile = this.setup.configFilePath;
      let result: Config = { jobs: [] };

      // does config exist on first start?
      if (!this.configFileTime && !fsx.pathExistsSync(configFile))
         try {
            // try copy default config
            await fsx.copy(join(appDir, "config", "jobs.yaml"), configFile);
         } catch {
            // nop
         }

      // load config file if changed
      try {
         // get stats of config file
         const stats = await fsx.stat(configFile);
         const isReload = this.configFileTime > 0;

         if (stats.mtimeMs !== this.configFileTime) {
            this.configFileTime = stats.mtimeMs;
            this.events.emit("config-loading", configFile, isReload);
            result = ConfigSchema.parse(YAML.parse(await fsx.readFile(configFile, "utf-8")));
            this.events.emit("config-loaded", result, isReload);
         }

         // remove disabled jobs
      } catch (err) {
         if (err instanceof ZodError) throw `${err.issues[0]?.message}`;
         else if (err instanceof Error) throw err;
      }

      // return JobConfig or undefined (no action)
      return result;
   }

   public async loadConfig(): Promise<Config> {
      return await this.run();
   }

   public onLoading(cb: (configFile: string, isReload: boolean) => void) {
      this.events.on("config-loading", cb);
   }

   public onLoaded(cb: (result: Config, isReload: boolean) => void) {
      this.events.on("config-loaded", cb);
   }
}
