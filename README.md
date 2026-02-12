# CronOps

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://github.com/mtakla/cronops/blob/master/LICENSE)
[![Coverage Status](https://img.shields.io/badge/coverage-95%25-green)](https://img.shields.io/badge/coverage-95%25-green)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Donate-orange.svg)](https://www.buymeacoffee.com/nevereven)

**CronOps** is a lightweight, cron-based file management and system task scheduler for containerized environments. It automates copying, moving, archiving, and cleaning up files across mounted volumes — keeping your storage tidy, enabling seamless file exchange between containerized services, and triggering regular tasks in your development, integration or production environments.

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

CronOps is built and optimized to run as a Docker container itself. To install & run your cronops container:

```
docker run \
  --name cronops \
  -v ./config:/config \
  -v /home/docker/data:/io/source \
  -v /home/docker/archive:/io/target \
  --restart unless-stopped \
  ghcr.io/mtakla/cronops:latest
```

The following docker volumes can be configured:

- volume `/io/source` : Primary source directory (CROPS_SOURCE_ROOT), referenced as `$1` in source paths
- volume `/io/target` : Primary target directory (CROPS_TARGET_ROOT), referenced as `$1` in target paths
- volume `/io/source2` : Secondary source directory (CROPS_SOURCE_2_ROOT), referenced as `$2` in source paths
- volume `/io/target2` : Secondary target directory (CROPS_TARGET_2_ROOT), referenced as `$2` in target paths
- volume `/config` : The exposed config directory where job configuration files are stored
- volume `/data/temp` : Temp directory used for dry-run mode simulations
- volume `/data/logs` : Directory where job logs and file history are stored

### Install & run with Docker compose

Create the following `compose.yaml` file:

```yaml
services:
  cronops:
    image: ghcr.io/mtakla/cronops:latest
    container_name: cronops
    restart: unless-stopped
    volumes:
      - /home/docker/data:/io/source
      - /home/docker/archive:/io/target
      - ./config:/config
      - ./temp:/data/temp
      - ./logs:/data/logs
    environment:
      TZ: Europe/UTC
```

In same directory, type `docker compose up -d` to install and start the cronops service. 

To check if the server is running, just action:

```sh
docker logs -f cronops
```

After your first start you should see the following output:
```text
Loading config from 'config/cronops.yaml' ...
🖐  No jobs scheduled.
```

Now you can config your jobs using the created default config file in `./config/cronops.yaml`. Details, see below. 

> [!NOTE]
> You do not need to restart the server after changing the config file. The server identifies any changes and will hot reload the config file. If the config is not valid, an appropriate message will appear in the docker logs and the cronops docker service will change to "unhealthy" 

```text
Loading config from 'config/cronops.yaml' ...
⛔ Cannot load config file. config/cronops.yaml: Unexpected non-whitespace character after JSON at position 571 (line 24 column 1) 
```

### Install & run in server environment

This requires [node.js](https://nodejs.org/) (v24 ++) to be installed on your server. 

First step is to create an empty app directory with a `.env` file that contains your configuration settings, e.g.:

```ini
NODE_ENV=production
CROPS_SOURCE_ROOT=/var/lib/docker/volumes   # change as you like
CROPS_TARGET_ROOT=/var/opt/backups          # change as you like
CROPS_SOURCE_2_ROOT=/mnt/data               # optional
CROPS_TARGET_2_ROOT=/mnt/backups            # optional
CROPS_CONFIG_DIR=/home/cronops/config       # optional. Default is ./config
CROPS_LOG_DIR=/home/cronops/logs            # optional. Default is ~/.cronops
PGID=1000                                   # optional
PUID=1000                                   # optional
```

To install and start cronops, type in bash shell:

```bash
npx dotenvx run -- npx @mtakla/cronops &> /var/log/cronops.log
```
This will ...

- download the latest version of cronops (and dotenvx)
- load the environment settings defined in the `.env` file
- start the cronops service with the loaded environment settings 
- create jobs directory in `/home/cronops/config/jobs` if it doesn't exist
- switch to idle mode as no active jobs are configured 

You can add job configuration files to `/home/cronops/config/jobs/` directory. Each YAML file in this directory defines one or more jobs. The server will hot reload when job files are added, modified, or removed.

## Updating

### Updating using Docker compose

When using docker compose, to update to the latest version of cronops, just type

```sh
docker compose pull && docker compose up -d
```

in the same directoy where `compose.yaml` has been created. 


## Job Configuration

Jobs are configured as YAML files in the `./config/jobs/` directory. Each YAML file can contain one or more job definitions. By default, the service starts with no active jobs.

Create job configuration files as arrays of jobs. For example, create `./config/jobs/my-jobs.yaml`:


```yaml
- action: move   # exec|call|copy|move|delete|archive
  cron: "*/5 * * * * *"
  source:
    dir: $1/nzbget/config/data/download
    includes:
      - "**/*.mp4"
  target:
    dir: $1/filegator/micha/downloads
    permissions:
      owner: "1000:1000"
      file_mode: "444"
      dir_mode: "711"
    retention: 12h
  dry_run: true
  enabled: false
```

You can change the job configuration at any time and the server will hot reload and schedule the new job configuration. 

> [!NOTE]
> Be aware that once the job config has been changed and saved, all active running jobs will be softly terminated and rescheduled by applying the new job configuration. 


### Job Actions

CronOps supports the following job actions:

#### File Operations

- **`copy`** - Copy files from source to target directory while preserving originals
- **`move`** - Move files from source to target directory (removes originals after successful copy)
- **`delete`** - Delete files matching the source patterns
- **`archive`** - Create a compressed tar.gz archive of matched files in the target directory

#### Command Execution

- **`exec`** - Execute a command or script. Use with `command`, `args`, `shell`, and `env` properties
- **`call`** - Similar to `exec`, executes a command with arguments

> [!TIP]
> **Path References**: Use `$1`, `$2`, or `$3` in job paths to reference configured root directories. For source paths, these map to `CROPS_SOURCE_ROOT`, `CROPS_SOURCE_2_ROOT`, and `CROPS_SOURCE_3_ROOT`. For target paths, they map to `CROPS_TARGET_ROOT`, `CROPS_TARGET_2_ROOT`, and `CROPS_TARGET_3_ROOT`.

### Example Configurations

#### Copy Files with Pattern Matching

```yaml
- action: copy
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
      owner: "1000:1000"
      file_mode: "644"
      dir_mode: "755"
    retention: "30d"
  enabled: true
```

#### Archive with Date-based Naming

```yaml
- action: archive
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
  enabled: true
```

#### Execute Custom Command

```yaml
- action: exec
  cron: "*/15 * * * *"  # Every 15 minutes
  command: "node"
  args:
    - "--experimental-vm-modules"
    - "/scripts/cleanup.js"
  env:
    LOG_LEVEL: "info"
    API_TOKEN: "secret123"
  enabled: true
```


### Job properties

| Property                     | Description                                                                                                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `action`                     | **Required**. The action to perform. One of: `exec`, `call`, `copy`, `move`, `delete`, `archive`                                                                               |
| `cron`                       | (*Optional*) Cron-like scheduling string, e.g., `*/2 * * * *`. See [node-cron](https://nodecron.com/cron-syntax.html) documentation for details. If omitted, job runs once.   |
| `command`                    | (*For `exec`/`call` actions*) Command to execute, e.g., `"node"`, `"/bin/bash"`                                                                                               |
| `shell`                      | (*Optional*) Shell to use for command execution. Can be `true` (use default shell) or a path to a shell binary                                                                 |
| `args`                       | (*Optional*) Array of command arguments for `exec`/`call` actions                                                                                                              |
| `env`                        | (*Optional*) Environment variables to pass to the command. Object with uppercase keys and string values                                                                         |
| `source.dir`                 | Source directory path. Can be absolute or use `$1` (CROPS_SOURCE_ROOT), `$2` (CROPS_SOURCE_2_ROOT), or `$3` (CROPS_SOURCE_3_ROOT), e.g., `"$1/downloads"`                   |
| `source.includes`            | (*Optional*) Array of glob patterns to include files, relative to `source.dir`. Default: `["**/*"]`                                                                            |
| `source.excludes`            | (*Optional*) Array of glob patterns to exclude files from processing                                                                                                           |
| `target.dir`                 | Target directory path. Can be absolute or use `$1` (CROPS_TARGET_ROOT), `$2` (CROPS_TARGET_2_ROOT), or `$3` (CROPS_TARGET_3_ROOT)                                            |
| `target.archive_name`        | (*For `archive` action*) Archive file name pattern with date placeholders, e.g., `"backup-{{yyyy-MM-dd}}.tgz"`                                                                |
| `target.permissions.owner`   | (*Optional*) Change user/group ownership to `"uid:gid"` for all target files. Default: process owner unless `PUID` or `PGID` environment is set                               |
| `target.permissions.file_mode` | (*Optional*) Change file permissions using octal (e.g., `"644"`) or symbolic mode (e.g., `"ugo+r"`). Default: "660"                                                         |
| `target.permissions.dir_mode`  | (*Optional*) Change directory permissions using octal (e.g., `"755"`) or symbolic mode (e.g., `"ugo+rx"`). Default: "770"                                                   |
| `target.retention`           | (*Optional*) Time period after which target files will be deleted, e.g., `"10d"`, `"12h"`. Uses [ms](https://www.npmjs.com/package/ms) format. Default: files are kept       |
| `dry_run`                    | (*Optional*) If `true`, simulate the operation without making actual changes. Source files are never modified in dry-run mode. Default: `false`                                |
| `verbose`                    | (*Optional*) Enable verbose logging for this job. Default: `false`                                                                                                             |
| `enabled`                    | (*Optional*) If `false`, the job will not be scheduled. Default: `true`                                                                                                        |


### Docker Issues & Trouble shooting

> [!NOTE]
> It is strongly advised against accessing or modifying the data directly on the host system within Docker's internal volume storage path (typically `/var/lib/docker/volumes/`). 

> [!WARNING]
> **Hazardous Misconfiguration** 
> 
> If your cronops docker container is running with Root Privileges and the persistent volumes (source/target directories) are mounted to critical system directories of the hosting operating system (e.g., `/etc`, `/var`, etc.), this creates an extremely high **security risk**: 
> 
> - **System File Overwrite**: The container can access, modify, or delete crucial files and directories on the host machine via the exposed volume paths.
> - **Host System Damage**: If the volume mounts are not correctly configured (e.g., if a Bind Mount unintentionally exposes the wrong host directory), the root user inside the container can potentially modify or delete system-critical data on the host.
>


## Environment settings

The cronops service can be configured with the following environment variables:

| ENV                  | Description                                                                          | Docker defaults      |
| -------------------- | ------------------------------------------------------------------------------------ | -------------------- |
| CROPS_SOURCE_ROOT    | Path to primary source directory (referenced as `$1` in job configs)                | `/io/source`         |
| CROPS_TARGET_ROOT    | Path to primary target directory (referenced as `$1` in job configs)                | `/io/target`         |
| CROPS_SOURCE_2_ROOT  | Path to secondary source directory (referenced as `$2` in job configs)              | `/io/source2`        |
| CROPS_TARGET_2_ROOT  | Path to secondary target directory (referenced as `$2` in job configs)              | `/io/target2`        |
| CROPS_SOURCE_3_ROOT  | Path to tertiary source directory (referenced as `$3` in job configs)               | `/io/source3`        |
| CROPS_TARGET_3_ROOT  | Path to tertiary target directory (referenced as `$3` in job configs)               | `/io/target3`        |
| CROPS_CONFIG_DIR     | Path to the config directory where job files are located                            | `/config`            |
| CROPS_TEMP_DIR       | Path to temporary folder used for dry-run mode                                       | `/data/temp`         |
| CROPS_LOG_DIR        | Path to directory where job logs and file history are stored                        | `/data/logs`         |
| CROPS_HOST           | Host address for the Admin API server                                                | `0.0.0.0`            |
| CROPS_PORT           | Port for the Admin API server                                                        | `8083`               |
| CROPS_API_KEY        | (*Optional*) API key for securing the Admin API endpoints                            | -                    |
| CROPS_BASE_URL       | (*Optional*) Base URL for the OpenAPI documentation                                  | -                    |
| CROPS_EXEC_SHELL     | (*Optional*) Default shell for `exec` actions. Can be `false`, `true`, or path      | `false`              |
| TZ                   | Timezone for cron scheduling (standard timezone format)                             | `UTC`                |
| PUID                 | (*Optional*) Default user ID for created files                                       | -                    |
| PGID                 | (*Optional*) Default group ID for created files                                      | -                    |


## License

CronOps is under [ISC License](https://github.com/mtakla/cronops/blob/master/LICENSE)

```
   ____                  ___            
  / ___|_ __ ___  _ __  / _ \ _ __  ___ 
 | |   | '__/ _ \| '_ \| | | | '_ \/ __|
 | |___| | | (_) | | | | |_| | |_) \__ \
  \____|_|  \___/|_| |_|\___/| .__/|___/
                             |_|       
  Made with ❤ in EU   
```

