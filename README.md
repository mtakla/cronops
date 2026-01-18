# CronOps

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://github.com/mtakla/cronops/blob/master/LICENSE)
[![Coverage Status](https://img.shields.io/badge/coverage-95%25-green)](https://img.shields.io/badge/coverage-95%25-green)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Donate-orange.svg)](https://www.buymeacoffee.com/nevereven)

cronops is a lightweight scheduling service that periodically moves or copies files between Docker volumes or across the host server's filesystem

✂️ snipspins

snipspins is a lightweight, cron-based file management tool designed to keep your container volumes tidy. It monitors directories, filters files with glob patterns, and performs actions like moving, archiving, or deleting—all defined in a simple YAML configuration.

💡 The Concept
In a containerized world, files often pile up in volumes (downloads, logs, temporary exports). snipspins acts as your digital gardener:

- Snip: Precisely cut out the files you want (using includes/excludes).
- Spins: Runs reliably in cycles (using cron schedules).

## Features

- ✅ **Cron** like job scheduling syntax 
- ✅ **Glob** based **filtering** to select source files to be copied/moved
- ✅ Ability to **change uid** and **gid ownership** of copied files/folders
- ✅ Ability to **change modifier** of copied files/folders
- ✅ Ability to automatically **remove destination files** after a specific period of time
- ✅ Docker **HEALTHCHECK** indicating that jobs are scheduled correctly
- ✅ Easy installation, setup and service maintenance (using Docker compose)
- Zero config, error f

## Installation

### Install & run with Docker

To start cronops container:

```
docker run 
  --name cronops
  -v ./config:/config
  -v /home/docker/data:/data1 
  -v /var/lib/docker/volumes:/data2 
  restart unless-stopped 
  cronops:latest
```

The following docker volumes can be configured:

- volume `/data1` : First exposed host dir that can be referenced in each cronops source/destination path
- volume `/data2` : Second exposed host dir that can be referenced in each cronops source/destination path
- volume `/config` : The exposed config dir where the config file `cronops.yaml` is located
- volume `/temp` : The exposed temp dir used to simulate job runs (see `simulate` job config property)

### Install & run with Docker compose

Create the following `compose.yaml` file:

```yaml
services:
  cronops:
    image: registry.gitlab.com/nevereven/cronops:latest
    container_name: cronops
    restart: unless-stopped
    volumes:
      - /home/docker/data:/data1
      - /var/lib/docker/volumes:/data2
      - ./config:/config
      - ./temp:/temp
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
DIR_1=/var/lib/docker/volumes   # change as you like
DIR_2=/var/opt                  # optional, change as you like
CONFIG_DIR=/home/cronops            # optional. Default is ./config
PGID=1000                           # optional
PUID=1000                           # optional
```

To install and start cronops, type in bash shell:

```bash
npx dotenvx run -- npx @mtakla/cronops &> /var/log/cronops.log
```
This will ...

- download the latest version of cronops (and dotenvx)
- load the environment settings defined in the `.env`file
- start the cronops service with the loaded environment settings 
- create a default config file in `/home/cronops/cronops.yaml` 
- switch to idle mode as no active jobs are configured 

You can change the job configuration in `/home/cronops/cronops.yaml` at any time and the server will hot reload and schedule the new job configuration.

## Updating

### Updating using Docker compose

When using docker compose, to update to the latest version of cronops, just type

```sh
docker compose update
```

in the same directoy where `compose.yaml` has been created. 


## Job Configuration

All jobs can be configured in `./config/cronops.yaml`. By default the following config file is active containing one single **example job** that is disabled. 


```yaml
version: 1
jobs:
  # Example job that is disabled
  - name: ExampleJob (disabled)
    cron: "*/5 * * * * *"
    action: move   # copy|move|remove|archive
    path: $DIR_1/nzbget/config/data/download
    include:
      - "**/*.mp4"
    destination:
      path: $DIR_2/filegator/micha/downloads
      chown: "1000:1000"
      chmod: "444"
      chmodDir: "711"
      lifetime: 12h
    simulate: true
    disabled: true
```

You can change the job configuration at any time and the server will hot reload and schedule the new job configuration. 

> [!NOTE]
> Be aware that once the job config has been changed and saved, all active running jobs will be softly terminated and rescheduled by applying the new job configuration. 


### Job properties

| Property                 | Description                                                                                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`                   | The name of the Job (will be shown in the log files)                                                                                                                            |
| `schedule`               | Cron like scheduling string, like `*/2 * * * *`. See [node-cron](https://nodecron.com/cron-syntax.html) documentation for details                                               |
| `source.path`            | The source path relative to `$DIR_1`. Can be explicitly  prefixed with `$DIR_1` or `$DIR_2`, e.g. `"$DIR_2/download"`.                                                          |
| `source.filter`          | (*Optional*) Array of file matchers relative to `source.path` based on [glob](https://www.npmjs.com/package/glob) patterns. Default: `["**/*.*"]`                               |
| `source.removeAfterCopy` | (*Optional*) If true, the source files will be removed after successful copied (move operation)                                                                                 |
| `destination.path`       | The destination path relative to `$DIR_1`. Can be explicitly  prefixed with `$DIR_1` or `$DIR_2`                                                                                |
| `destination.chown`      | (*Optional*) Change user/group ownership to `"gid:uid"` for all destination files. Default: process owner unless `PUID` or `PGID` environment is set                            |
| `destination.chmod`      | (*Optional*) Change file attributes using octal (`"640"`) or symbolic mode (`"ugo+r"`). Default: "660"                                                                          |
| `destination.chmodDir`   | (*Optional*) Change dir attributes using octal (`"750"`) or symbolic mode (`"ugo+rx"`). Default: "770"                                                                          |
| `destination.lifetime`   | (*Optional*) Defines period in time after copied/moved files will be deleted. Syntax, see [ms module](https://www.npmjs.com/package/ms). Default: files will **not** be deleted |
| `simulate`               | (*Optional*) If `true`, all destination files will be copied/moved to a temporary folder¹. Default: `false`                                                                     |
| `disabled`               | (*Optional*) If `true`, the job will not be scheduled and never be executed. Default: `false`                                                                                   |

¹ Please note that in **simulation mode**, source files are never removed, so the `removeAfterCopy` property will be ignored!


### Docker Issues & Trouble shooting

> [!NOTE]
> It is strongly advised against accessing or modifying the data directly on the host system within Docker's internal volume storage path (typically `/var/lib/docker/volumes/`). 

> [!WARNING]
> **Hazardous Misconfiguration** 
> 
> If your cronops docker container is running with Root Privileges and the persistent volumes (`DIR_1`, `DIR_2`) are mounted to critical system directories of the hosting operating system (e.g., `/etc`, `/var`, etc.), this creates an extremely high **security risk**: 
> 
> - **System File Overwrite**: Access and modify/delete crucial files and directories on the host machine via the exposed volume paths.
> - **Host System Damage**: If the volume mounts are not correctly configured (e.g., if a Bind Mount unintentionally exposes the wrong Host directory), the root user inside the container can potentially modify or delete system-critical data on the host.
>


## Environment settings

The cronops service can be configured with the following environment variables:

| ENV         | Description                                       | Docker defaults |
| ----------- | ------------------------------------------------- | --------------- |
| DIR_1       | Path to the first data directory.                 | `/data1`        |
| DIR_2       | Path to the second data directory.                | `/data2`        |
| TEMP_DIR    | Path to temporary folder used for job simulations | `/temp`         |
| CONFIG_DIR  | Path to the (exposed) config directory.           | `/config`       |
| CONFIG_FILE | Path to config file relative to config dir        | `cronops.yaml`  |
| TZ          | Timezone scheduling should work with              | `utc`           |
| QUIET       | If true, no standard console output will be shown | `false`         |
| PUID        | default user id to use for created files          | -               |
| PGID        | default group id to use for created files         | -               |


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

