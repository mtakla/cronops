# CronOps Changelog

## version 0.1.1

 - ADDED: Web-API support including openAPI WebUI for testing
 - ADDED: Docker PUID/PGID support to run CronOps with explicit user/group privileges
 - ADDED: job action `exec` introduced
 - ADDED: jobLoader recognizes deleted job files 
 - ADDED: simple web api to trigger jobs manually
 - ADDED: job validation and auto disabling wrong configured jobs
 - ADDED: index.ts allowing to use jobLoader, jobScheduler & jobRunner in js/ts programs
 - CHANGED: jobs configuration split up to single job configuration files organized in `/config/jobs`
 - CHANGED: project renames to @mtakla/cronops
 - initial public version

