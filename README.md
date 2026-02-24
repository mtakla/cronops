# CronOps

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://github.com/mtakla/cronops/blob/master/LICENSE)
[![Coverage Status](https://img.shields.io/badge/Coverage-95%25-green)](https://img.shields.io/badge/coverage-95%25-green)
[![Docs](https://img.shields.io/badge/Typedoc-docs-blue)](https://mtakla.github.io/cronops/)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Donate-orange.svg)](https://www.buymeacoffee.com/nevereven)

**CronOps** is a lightweight, cron-based file management and system task scheduler for containerized environments. It automates copying, moving, archiving, and cleaning up files across mounted volumes — keeping your storage tidy, enabling seamless file exchange between containerized services, and triggering regular tasks in your development, integration or production environments.

> ⚠ **WARNING**  
> This project is still under active development. Production use is not yet recommended.

## 💡 Why CronOps?

In containerized workflows, files often accumulate in volumes: downloads, logs, temporary exports, backups. CronOps acts as your **digital janitor**, running scheduled jobs that:

- **Execute** OS commands 
- **Select** files using powerful **glob patterns** and
  - **delete** them on a regular basis
  - **copy** or **move** them to specific target path
  - **archive** them automatically using date/time bases archive name patterns
  - **process** them with OS commands (e.g. awk/sed, curl, untar/unzip, ...)
  - **execute** scripts on them (sh/bash/cmd/powershell/node/lua, ...)

All configured via simple, version-controllable ***.yml** based **job definition** files — no coding required.

## Top Features

- ✅ **Cron-like scheduling** – Flexible job timing using familiar cron syntax
- ✅ **Glob-based filtering** – Precisely select source files to be processed 
- ✅ **File operations** – Copy, move, delete, or archive files
- ✅ **Command execution** – Process files with OS commands or custom scripts
- ✅ **Permission management** – Change uid, gid, and file permissions on processed target files
- ✅ **Automatic cleanup** – Remove target files after a configurable retention period
- ✅ **Incremental processing** – Only process changed or new files since last run
- ✅ **Dry-run mode** – Test jobs and execute scripts safely before applying changes
- ✅ **Detailed logging** – Detailed job execution logs with stdout/stderr aggregation
- ✅ **Hot reload** – Change job configs without restarting the service
- ✅ **Admin API** – Trigger jobs, check status, pause/resume scheduling via secured REST-API
- ✅ **OpenAPI Web UI** – Interactive API documentation and execution 
- ✅ **Easy setup** – Runs with zero configuration. All config via environment variables

## Installation

### Install & run with Docker

CronOps is built and optimized to run as a Docker container itself. 

```sh
docker run \
  --name cronops \
  -p 8083:8083 \
  -v ./config:/config \
  -v ./data:/io/source \
  -v ./data:/io/target \
  -e PUID=1000 \
  -e PGID=1000 \
  ghcr.io/mtakla/cronops:latest
```

To check if the server is running:

```sh
docker logs -f cronops
```

If your container is running there is an **example job** active that is scheduled every 5 seconds and moves files from `./data/inbox` to `./data/outbox`. In addition, files in the outbox that are older than 30sec will be automatically cleaned up. 

The corresponding job config can be found in `./config/jobs/example-job.yaml`:

```yaml
action: move
cron: "*/5 * * * * *"
source:
  dir: /inbox
  includes:
    - "**/**"
  excludes:
    - "**/.*"
    - "**/*.log"
target:
  dir: /outbox
  retention: "20s"
```

Now you can add more job configuration files to `./config/jobs`. For detailes, see [job configuration](#job-configuration) section below.

> 🛈 **Note**  
> You don't need to restart the server after changing job files. The server identifies any changes and will hot reload the configuration. If a job configuration is invalid, an appropriate message will appear in the docker logs and the specific job will not be scheduled.

### Using Docker Compose

To install and run CronOps via docker compose, just create a `compose.yaml` file in an empty directory:

```yaml
services:
  cronops:
    image: ghcr.io/mtakla/cronops:latest
    container_name: cronops
    restart: unless-stopped
    volumes:
      - ./config:/config
      - ./logs:/data/logs
      - ./data:/io/source
      - ./data:/io/target
    environment:
      PUID: 1000    
      PGID: 1000
      TZ: Europe/Berlin
```

In same directory, type `docker compose up -d` to install and start the cronops service. 

**Updating CronOps with Docker Compose**

When using docker compose, to update to the latest version of CronOps, just type

```sh
docker compose pull && docker compose up -d
```

in the same directory where `compose.yaml` has been created. 

### Admin Web-API

To enable **admin Web-API**, just set `CROPS_API_KEY` environment variable. Details, see [Configuration](#configuration) section below.


## Manual installation

This requires [Node.js](https://nodejs.org/) (>= v24) to be installed on your server. 

To install & start CronOps, type:


```sh
npx @mtakla/cronops
```

For configuration, create an empty folder with an `.env` file that contains your config settings (see [Configuration](#configuration) section below).

```dotenv
CROPS_CONFIG_DIR=./config
CROPS_TARGET_ROOT=./data
CROPS_SOURCE_ROOT=./data
```

To start CronOps with 

```sh
npx @dotenvx/dotenvx run -- npx @mtakla/cronops
```

This will ...

- download the latest version of **dotenvx** and **cronops** 
- load environment settings defined in the `.env` file
- create job config directory in `./config` with some example jobs
- starts the CronOps service
- the **example job** `[example job]` is active by default and scheduled to run every 5 seconds: 
  - the job will move files found in `./data/inbox` to `./data/outbox`
  - in addition, all files moved to `./data/outbox` will be automatically deleted after 30 seconds


You can now add job configuration files to `./config/jobs` directory. Each YAML file in this directory defines a job. The server will hot reload when job files are added, modified, or removed.

## Use in your code

Install CronOps in your project using npm

```
npm install @mtakla/cronops --save
```

To create a job runner:

```javascript
import { createJobRunner } from "@mtakla/cronops";

// create runner options
const runnerOptions =  { configDir: "./config" };

// create a job runner instance 
const runner = createJobRunner({
  action: "copy",
  cron: "*/5 * * * * *",
  source: {
    dir: "download/",
  },
  target: {
    dir: "backup/downloads",
    retention: "30d"
  }
}, runnerOptions);

runner.onScheduled(() => {
  console.log("job scheduled!");
});

runner.onStarted(() => {
  console.log("job started!");
});

runner.onFinished(() => {
  console.log("job finished!");
});

runner.onError((err) => {
  console.log(`job failed with ${err.message}`);
});

// finally schedule job
runner.schedule();
```

## Configuration 

The CronOps service can be configured with the following environment variables:

| ENV                   | Description                                                                                                                | Docker defaults |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------- |
| `CROPS_SOURCE_ROOT`   | Path to primary source directory                                                                                           | `/io/source`    |
| `CROPS_TARGET_ROOT`   | Path to primary target directory                                                                                           | `/io/target`    |
| `CROPS_SOURCE_2_ROOT` | Path to secondary source directory                                                                                         | `/io/source2`   |
| `CROPS_TARGET_2_ROOT` | Path to secondary target directory                                                                                         | `/io/target2`   |
| `CROPS_SOURCE_3_ROOT` | Path to tertiary source directory                                                                                          | `/io/source3`   |
| `CROPS_TARGET_3_ROOT` | Path to tertiary target directory                                                                                          | `/io/target3`   |
| `CROPS_CONFIG_DIR`    | Path to the config directory where job files are located                                                                   | `/config`       |
| `CROPS_TEMP_DIR`      | Path to temporary folder used for dry-run mode                                                                             | `/data/temp`    |
| `CROPS_LOG_DIR`       | Path to directory where job logs and file history are stored                                                               | `/data/logs`    |
| `CROPS_HOST`          | Host address for the admin API server                                                                                      | `0.0.0.0`       |
| `CROPS_PORT`          | Port for the admin API server                                                                                              | `8083`          |
| `CROPS_EXEC_SHELL`    | (*Optional*) Default shell for `exec` actions. Can be `false` (no shell), `true` (default shell), or path like `/bin/bash` | `false`         |
| `CROPS_API_KEY`       | (*Optional*) API key to secure admin API endpoints. Must be a hex‑encoded 256‑bit secret (e.g. 'openssl rand -hex 32')     | -               |
| `CROPS_BASE_URL`      | (*Optional*) Base URL for admin API and OpenAPI docs                                                                       | -               |
| `TZ`                  | (*Optional*) Timezone for cron scheduling (standard timezone format)                                                       | `UTC`           |


## Job Configuration

Jobs are configured as YAML files in the `CROPS_CONFIG_DIR/jobs` directory. Each YAML file defines one job.

Example job config  `./config/jobs/example.yaml`

```yaml
action: move   # exec|call|copy|move|delete|archive
cron: "*/5 * * * * *"
source:
  dir: $1/nzbget/config/data/download
  includes:
    - "**/*.mp4"
target:
  dir: $1/filegator/micha/downloads
  permissions:
    file_mode: "444"
    dir_mode: "711"
  retention: 12h
dry_run: true
enabled: false
```

> 🛈 **Note**
> You can change the job configuration at any time and the server will hot reload and schedule the new job  configuration. Be aware that once the job config has been changed, active running tasks will be (gracefully) terminated and the job will be rescheduled

### Job Actions

CronOps supports 5 different job actions:

#### File based actions

- **`copy`** - Copy files from source to target directory while preserving originals
- **`move`** - Move files from source to target directory (removes originals after successful copy)
- **`delete`** - Delete files matching the source patterns
- **`archive`** - Create a compressed tar.gz archive of matched files in the target directory

#### Command execution action

- **`exec`** - Execute a command or script. Use with `command`, `args`, `shell`, and `env` properties

> 💡 **Tip**
> Use source/target root variables `$1`, `$2`, or `$3` in job paths to reference configured root directories:
> - For source paths, these map to `CROPS_SOURCE_ROOT`, `CROPS_SOURCE_2_ROOT`, and `CROPS_SOURCE_3_ROOT`. 
> - For target paths, they map to `CROPS_TARGET_ROOT`, `CROPS_TARGET_2_ROOT`, and `CROPS_TARGET_3_ROOT`.

### Job Configuration examples

#### Copy Files with Pattern Matching

```yaml
action: copy
cron: "0 2 * * *"  # Daily at 2 AM
source:
  dir: $1/downloads
  includes:
    - "**/*.pdf"
    - "**/*.doc"
  excludes:
    - "**/*.tmp"
target:
  dir: $1/archive/documents
  permissions:
    file_mode: "644"
    dir_mode: "755"
  retention: "30d"
```

#### Create an archive 

```yaml
action: archive
cron: "0 0 * * 0"  # Weekly on Sunday at midnight
source:
  dir: $1/logs
  includes:
    - "**/*.log"
  excludes:
    - ".git/**"
    - "node_modules/**"
target:
  dir: $1/backups
  archive_name: "logs-{{yyyy-MM-dd}}.tgz"
```

#### Execute Custom Command

```yaml
action: exec
cron: "*/15 * * * *"  # Every 15 minutes
command: "node"
args:
  - "--experimental-vm-modules"
  - "{scriptDir}/cleanup.js"
env:
  LOG_LEVEL: "info"
  API_TOKEN: "secret123"
```

### Command execution parameters

For jobs of action type `exec`, you can use dynamic parameters in your  `command`, `args` or custom `env` entries that will be resolved before the system command is executed: 

| Parameter     | Description                                                      |
| ------------- | ---------------------------------------------------------------- |
| `{jobId}`     | job identifier                                                   |
| `{sourceDir}` | absolute path to the job source directory                        |
| `{targetDir}` | absolute path to the job target directory (or CROPS_TARGET_ROOT) |
| `{scriptDir}` | absolute path to the configured script directory                 |
| `{tempDir}`   | absolute path to the configured temp directory                   |
| `{logDir}`    | absolute path to the configured log directory                    |


If the exec action is configured to run on selected `source` files:

| Parameter    | Description                                                                  |
| ------------ | ---------------------------------------------------------------------------- |
| `{file}`     | absolute path to the processed file, e.g. `/io/source/foo/bar.txt`           |
| `{fileDir}`  | absolute path to the parent dir of the processed file, e.g. `/io/source/foo` |
| `{fileName}` | name of the processed file, e.g. `bar.txt`                                   |
| `{fileBase}` | base name of the processed file without extension, e.g. `bar`                |
| `{fileExt}`  | extension of the processed file, e.g. `.txt`                                 |

### Command execution ENV defaults

For jobs of action type `exec` the following environment variables are available by default when the os command is executed.

| Parameter          | Description                                                      |
| ------------------ | ---------------------------------------------------------------- |
| `CROPS_JOB_ID`     | job identifier                                                   |
| `CROPS_SOURCE_DIR` | absolute path to the job source directory                        |
| `CROPS_TARGET_DIR` | absolute path to the job target directory (or CROPS_TARGET_ROOT) |
| `CROPS_SCRIPT_DIR` | absolute path to the configured script directory                 |
| `CROPS_TEMP_DIR`   | absolute path to the configured temp directory                   |
| `CROPS_LOG_DIR`    | absolute path to the configured log directory                    |
| `CROPS_DRY_RUN`    | "true", if dry_run mode is enabled                               |
| `CROPS_VERBOSE`    | "true", if verbose mode is enabled                               |


If the exec action is configured to run on selected `source` files:

| Parameter         | Description                                                                         |
| ----------------- | ----------------------------------------------------------------------------------- |
| `CROPS_FILE`      | absolute path to the processed source file, e.g. `/io/source/foo/bar.txt`           |
| `CROPS_FILE_DIR`  | absolute path to the parent dir of the processed source file, e.g. `/io/source/foo` |
| `CROPS_FILE_NAME` | file name of the processed source file, e.g. `bar.txt`                              |
| `CROPS_FILE_BASE` | base name of the processed source file without extension, e.g. `bar`                |
| `CROPS_FILE_EXT`  | extension of the processed source file, e.g. `.txt`                                 |



### Job properties

| Property                       | Description                                                                                                                                                                 |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `action`                       | **Required**. The action to perform. One of: `exec`, `call`, `copy`, `move`, `delete`, `archive`                                                                            |
| `cron`                         | (*Optional*) Cron-like scheduling string, e.g., `*/2 * * * *`. See [node-cron](https://nodecron.com/cron-syntax.html) documentation for details. If omitted, job runs once. |
| `command`                      | (*For `exec`/`call` actions*) Command to execute, e.g., `"node"`, `"/bin/bash"`                                                                                             |
| `shell`                        | (*Optional*) Shell to use for command execution. Can be `true` (use default shell) or a path to a shell binary                                                              |
| `args`                         | (*Optional*) Array of command arguments for `exec`/`call` actions                                                                                                           |
| `env`                          | (*Optional*) Environment variables to pass to the command. Object with uppercase keys and string values                                                                     |
| `source.dir`                   | Source directory path. Can be absolute or use `$1` (CROPS_SOURCE_ROOT), `$2` (CROPS_SOURCE_2_ROOT), or `$3` (CROPS_SOURCE_3_ROOT), e.g., `"$1/downloads"`                   |
| `source.includes`              | (*Optional*) Array of glob patterns to include files, relative to `source.dir`. Default: `["**/*"]`                                                                         |
| `source.excludes`              | (*Optional*) Array of glob patterns to exclude files from processing                                                                                                        |
| `target.dir`                   | Target directory path. Can be absolute or use `$1` (CROPS_TARGET_ROOT), `$2` (CROPS_TARGET_2_ROOT), or `$3` (CROPS_TARGET_3_ROOT)                                           |
| `target.archive_name`          | (*For `archive` action*) Archive file name pattern with date placeholders, e.g., `"backup-{{yyyy-MM-dd}}.tgz"`                                                              |
| `target.permissions.owner`     | (*Optional*) Change user/group ownership to `"uid:gid"` for all target files. Default: process owner unless `PUID` or `PGID` environment is set                             |
| `target.permissions.file_mode` | (*Optional*) Change file permissions using octal (e.g., `"644"`) or symbolic mode (e.g., `"ugo+r"`). Default: "660"                                                         |
| `target.permissions.dir_mode`  | (*Optional*) Change directory permissions using octal (e.g., `"755"`) or symbolic mode (e.g., `"ugo+rx"`). Default: "770"                                                   |
| `target.retention`             | (*Optional*) Time period after which target files will be deleted, e.g., `"10d"`, `"12h"`. Uses [ms](https://www.npmjs.com/package/ms) format. Default: files are kept      |
| `dry_run`                      | (*Optional*) If `true`, simulate the operation without making actual changes. Source files are never modified in dry-run mode. Default: `false`                             |
| `verbose`                      | (*Optional*) Enable verbose logging for this job. Default: `false`                                                                                                          |
| `enabled`                      | (*Optional*) If `false`, the job will not be scheduled. Default: `true`                                                                                                     |



## Security considerations & Trouble shooting

🛈 **Note**
> It is strongly advised against accessing or modifying the data directly on the host system within Docker's internal volume storage path (typically `/var/lib/docker/volumes/`). 

 ⚠ **WARNING**
> **Hazardous Misconfiguration**
> 
> By default, CronOps runs as user/group **1000:1000** to follow a security‑first principle.  
> You *can* run it as root by setting `PUID=0` and `PGID=0`, but **this is not recommended and can be dangerous**.
> 
> When running as root, bind‑mounted host volumes (source/target directories) may map to critical system paths on the host (e.g. `/etc`, `/var`).  
> This creates a **high‑risk security scenario**:
> 
> - **System file overwrite**: the container can read, modify, or delete critical host files via mounted paths.
> - **Host damage through misconfigured mounts**: a wrong bind mount can expose system directories, allowing root inside the container to corrupt or erase host data.


## License

CronOps is under [ISC License](https://github.com/mtakla/cronops/blob/master/LICENSE). Made with ❤ in EU
