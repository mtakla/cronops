export type RunnerOptions = {
   logDir?: string;
   tempDir?: string;
   scriptDir?: string;
   sourceRoot?: string;
   source2Root?: string;
   source3Root?: string;
   targetRoot?: string;
   target2Root?: string;
   target3Root?: string;
   shell?: string | boolean;
};

export type LoaderOptions = {
   configDir?: string;
};

export type ServerOptions = {
   port?: number;
};

export const ENV = {
   CONFIG_DIR: "CROPS_CONFIG_DIR",
   LOG_DIR: "CROPS_LOG_DIR",
   TEMP_DIR: "CROPS_TEMP_DIR",
   SOURCE_ROOT: "CROPS_SOURCE_ROOT",
   TARGET_ROOT: "CROPS_TARGET_ROOT",
   SOURCE_2_ROOT: "CROPS_SOURCE_2_ROOT",
   TARGET_2_ROOT: "CROPS_TARGET_2_ROOT",
   SOURCE_3_ROOT: "CROPS_SOURCE_3_ROOT",
   TARGET_3_ROOT: "CROPS_TARGET_3_ROOT",
   EXEC_SHELL: "CROPS_EXEC_SHELL",
   PORT: "CROPS_PORT",
   TZ: "TZ",
} as const;
