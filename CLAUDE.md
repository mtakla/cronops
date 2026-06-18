# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build          # compile TypeScript to dist/
npm run dev            # build with source maps + run using .env.local
npm run test           # run all tests with vitest
npm run check          # lint with Biome
npm run check:fix      # lint and auto-fix with Biome
npm run coverage       # test with coverage report to build/coverage/
npm run docker         # build Docker image cronops:local
```

Run a single test file:
```bash
npx vitest run test/handler/ExecHandler.test.ts
```

## Architecture

CronOps is a cron-based file lifecycle manager. It can run as a standalone server (entry point: `src/server.ts`) or be consumed as a library via `src/index.ts`, which exposes `createJobLoader`/`createJobScheduler`/`createJobRunner` factory functions (each validates options/job config via `JobRunnerSetup`/Zod before constructing the task).

### Core data flow

`JobLoader` → watches `config/jobs/*.yaml` files, parses/validates them via Zod (`JobSchema`), and emits `job-loaded`/`job-deleted` events every 8 seconds.

`JobScheduler` → receives those events, maintains a `Map<jobId, JobRunner>`, schedules/unschedules runners. Emits `schedule-changed` every 5 seconds when the map changes.

`JobRunner` → one instance per active job. On each cron tick: globs source files, loads `{logDir}/{jobId}.idx` (file history for incremental processing), delegates to a handler, saves updated history, writes `{logDir}/{jobId}.log`.

`AbstractHandler` subclasses handle action-specific logic:
- `FileCopyHandler`, `FileMoveHandler`, `FileDeleteHandler`, `FileArchiveHandler` — file operations
- `ExecHandler` — spawns child processes with template variable substitution (`{jobId}`, `{file}`, etc.)

### Key models

**`JobRunnerSetup`** — instantiated once per `JobScheduler`. Reads all env vars / options, resolves root dirs, owns the handler registry (one handler instance per action type, shared across all jobs).

**`JobRunnerContext`** — created per job execution. Holds resolved `sourceDir`/`targetDir` (dry_run redirects target to `tempDir/{jobId}`), accumulated result stats, and the open log file descriptor.

**`FileHistoryModel`** — implements incremental processing. Stores `{ source: { path: [mtimeMs, ttime] }, target: { path: [mtimeMs, ttime] } }` as JSON. `checkSourceEntry` returns true only for new/changed files. The cleanup step removes entries for files no longer matched by glob patterns.

**`AbstractTask<T>`** — base class for `JobLoader`, `JobScheduler`, and `JobRunner`. Wraps `node-cron`, prevents overlapping runs (guard flag), supports pause/resume, and implements graceful termination with a timeout loop. A runner auto-pauses after 31 consecutive errors.

### Path resolution

Job `source.dir` and `target.dir` can use `$1`, `$2`, `$3` prefixes which resolve to the configured root directories (`CROPS_SOURCE_ROOT`/`CROPS_TARGET_ROOT` etc.). Directory traversal (`..`) is blocked at validation time in `JobRunnerSetup._validateDir`.

### Permissions and exec

**`PermissionModel`** parses `target.permissions` (`owner: "uid:gid"`, `file_mode`, `dir_mode`) into numeric uid/gid/octal modes; `hasChanges()` is false (skips chmod/chown) when none of the four were set, since unset values parse to `NaN`.

`ExecHandler` resolves `CROPS_EXEC_SHELL` (`false`/`true`/shell path) as the default shell unless a job sets its own `shell` property, then spawns the command with both `{template}` and `CROPS_*` env var substitution (see README "Command execution parameters/ENV defaults" for the full variable list).

### Admin API

Fastify server on `CROPS_PORT` (default 8083). All `/api/*` routes require `Authorization: Bearer <CROPS_API_KEY>` where the key must be a 64-hex-char (256-bit) string. The `/health`, `/docs`, and `/openapi.json` endpoints are unauthenticated.

### File and formatting conventions

- **Formatter**: Biome — 3-space indent, 180-char line width
- **Module system**: ESM throughout; imports use `.js` extensions even for `.ts` source files
- **Zod**: Job schema defined once in `src/types/Config.types.ts`; `JobSchema.parse()` is the validation entry point for all job configs loaded from YAML
- **Tests**: Vitest with fixtures in `test/fixtures/`. Tests use `globals: true` so no explicit `import { describe, it }` needed.

### Dev environment

`npm run dev` builds to `dist/` and runs with `--env-file=.env.local`. That file points config/source/target dirs into `./build/app/` and sets a fixed API key for local testing.
