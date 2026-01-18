export type RunnerOptions = {
   sourceRoot?: string;
   source2Root?: string;
   source3Root?: string;
   targetRoot?: string;
   target2Root?: string;
   target3Root?: string;
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
   CONFIG_DIR: "CRONOPS_CONFIG_DIR",
   CONFIG_FILE: "CRONOPS_CONFIG_FILE",
   SOURCE_ROOT: "CRONOPS_SOURCE_ROOT",
   TARGET_ROOT: "CRONOPS_TARGET_ROOT",
   SOURCE_2_ROOT: "CRONOPS_SOURCE_2_ROOT",
   TARGET_2_ROOT: "CRONOPS_TARGET_2_ROOT",
   SOURCE_3_ROOT: "CRONOPS_SOURCE_3_ROOT",
   TARGET_3_ROOT: "CRONOPS_TARGET_3_ROOT",
   TEMP_DIR: "CRONOPS_TEMP_DIR",
   LOG_DIR: "CRONOPS_LOG_DIR",
   PORT: "CRONOPS_PORT",
   TZ: "TZ",
} as const;
