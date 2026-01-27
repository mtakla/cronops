export type RunnerOptions = {
   sourceRoot?: string;
   source2Root?: string;
   source3Root?: string;
   targetRoot?: string;
   target2Root?: string;
   target3Root?: string;
   shell?: string | boolean;
   scriptDir?: string;
   tempDir?: string;
   logDir?: string;
};

export type LoaderOptions = {
   configDir?: string;
   configFileName?: string;
};

export type ServerOptions = {
   port?: number;
};

export const ENV = {
   CONFIG_DIR: "CROPS_CONFIG_DIR",
   CONFIG_FILE: "CROPS_CONFIG_FILE",
   SOURCE_ROOT: "CROPS_SOURCE_ROOT",
   TARGET_ROOT: "CROPS_TARGET_ROOT",
   SOURCE_2_ROOT: "CROPS_SOURCE_2_ROOT",
   TARGET_2_ROOT: "CROPS_TARGET_2_ROOT",
   SOURCE_3_ROOT: "CROPS_SOURCE_3_ROOT",
   TARGET_3_ROOT: "CROPS_TARGET_3_ROOT",
   EXEC_SHELL: "CROPS_EXEC_SHELL",
   SCRIPT_DIR: "CROPS_SCRIPT_DIR",
   TEMP_DIR: "CROPS_TEMP_DIR",
   LOG_DIR: "CROPS_LOG_DIR",
   PORT: "CROPS_PORT",
   TZ: "TZ",
} as const;
