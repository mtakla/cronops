# CronOps Changelog

## version 0.1.5

 - ADDED: simple web api to trigger jobs manually
 - ADDED: job validation & disabling of wrong configured jobs
 - ADDED: index.ts allowing to use configLoader, jobScheduler & jobRunner in js/ts programs
 - CHANGED: project renames to @mtakla/cronops

## version 0.1.4

- ADDED: job actions `archive` and `delete` added 
- ADDED: job scheduling timezone support
- CHANGED: jobs.yaml introduced for job configuration

## version 0.1.3

- ADDED: simulation will copy/move files to temp dir
- ADDED: `retention` option for target files (e.g. '1d', '1w', '20000')
- ADDED: validation of job config schema using zod library
- CHANGED: typescript migration of entire project

## version 0.1.2

- ADDED: removeSource feature to move files 
- ADDED: cron based scheduling for each job
- FIXED: memory issues on using streaming buffers 

## version 0.1.1

- CHANGED: using biome as a replacement for eslint and prettier

## version 0.1.0

- initial version
