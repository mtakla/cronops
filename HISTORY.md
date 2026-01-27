# CronOps Changelog

## version 0.1.1

 - ADDED: job action `exec` 
 - ADDED: simple web api to trigger jobs manually
 - ADDED: job validation & disabling of wrong configured jobs
 - ADDED: index.ts allowing to use configLoader, jobScheduler & jobRunner in js/ts programs
 - CHANGED: project renames to @mtakla/cronops

## version 0.1.0

- ADDED: job actions `archive` and `delete` added 
- ADDED: job scheduling timezone support
- CHANGED: jobs.yaml introduced for job configuration
- ADDED: simulation will copy/move files to temp dir
- ADDED: `retention` option for target files (e.g. '1d', '1w', '20000')
- ADDED: validation of job config schema using zod library
- CHANGED: typescript migration of entire project

## version 0.0.9

- ADDED: removeSource feature to move files 
- ADDED: cron based scheduling for each job
- FIXED: memory issues on using streaming buffers 
- CHANGED: using biome as a replacement for eslint and prettier

## version 0.0.8

- initial version
