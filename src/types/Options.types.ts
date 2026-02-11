export type RunnerOptions = {
   /**
    * Configuration directory where `./jobs` and `./scripts` are located.
    * Defaults to `./config`
    */
   configDir?: string;

   /**
    * Temporary directory used as target directory when running jobs in `dry_run` mode. Defaults to `{os.tempdir}/cronops`
    */
   tempDir?: string;

   /**
    * Directory where job logs and job file history is stored
    * Defaults to `{os.homedir}/config`
    */
   logDir?: string;

   /**
    * Default root directory for job sources. Can also be accessed in job source config via `dir: "$1/my_source_dir"`
    * Defaults to `./`
    */
   sourceRoot?: string;

   /**
    * Second root directory for job sources. Can be access in job config via `dir: "$2/my_source_dir"`
    * Defaults to `./`
    */
   source2Root?: string;

   /**
    * Third root directory for job sources. Can be access in job config via `dir: "$3/my_source_dir"`
    * Defaults to `./`
    */
   source3Root?: string;

   /**
    * Default root directory for job targets. Can also be access in job config via `dir: "$1/my_target_dir"`
    * Defaults to `./`
    */
   targetRoot?: string;

   /**
    * Second root directory for job targets. Can also be access in job config via `dir: "$2/my_target_dir"`
    * Defaults to `./`
    */
   target2Root?: string;

   /**
    * Third root directory for job targets. Can also be access in job config via `dir: "$3/my_target_dir"`
    * Default is `./`
    */
   target3Root?: string;

   /**
    * Default shell to use for `exec` jobs. Can be `false` (no shell used, direct os calls), `true` (use default os shell), or a specific
    * shell like `/bin/sh` or `/bin/bash`. Default is `false`
    */
   shell?: string | boolean;
};

export type LoaderOptions = {
   /**
    * Configuration directory where `./jobs` and `./scripts` are located.
    * Defaults to `./config`
    */
   configDir?: string;
};

export const ENV = {
   CONFIG_DIR: "CROPS_CONFIG_DIR",
   TEMP_DIR: "CROPS_TEMP_DIR",
   LOG_DIR: "CROPS_LOG_DIR",
   SOURCE_ROOT: "CROPS_SOURCE_ROOT",
   TARGET_ROOT: "CROPS_TARGET_ROOT",
   SOURCE_2_ROOT: "CROPS_SOURCE_2_ROOT",
   TARGET_2_ROOT: "CROPS_TARGET_2_ROOT",
   SOURCE_3_ROOT: "CROPS_SOURCE_3_ROOT",
   TARGET_3_ROOT: "CROPS_TARGET_3_ROOT",
   EXEC_SHELL: "CROPS_EXEC_SHELL",
   PLIMIT_SPAWN: "CROPS_PLIMIT_SPAWN", // 16 default (number of parallel sub-process executions) // TODO
   PLIMIT_FS: "CROPS_PLIMIT_FS", // 120 default (number of parallel file system operations)  // TODO
   API_KEY: "CROPS_API_KEY",
   BASE_URL: "CROPS_BASE_URL",
   HOST: "CROPS_HOST",
   PORT: "CROPS_PORT",
   TZ: "TZ",
} as const;
