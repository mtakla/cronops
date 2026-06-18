# CronOps Changelog

# version 0.1.4

- FIXED: docker bootstrap chmod issue on mounted source/target dir

# version 0.1.3

- ADDED: openAPI UI layout improvements
- ADDED: config `CROPS_UI_PERSIST_AUTH` flag to persist OpenAPI Web UI client auth in local store
- FIXED: docker uid:gid set to 1000:1000 (as documented)
- Bump up to latest node version 26.x

## version 0.1.2

- FIXED: issue with local installation and config dir 
- FIXED: issue with docker image and unmounted log dir 

## version 0.1.1

- ADDED: typedocs available on https://mtakla.github.io/cronops/ 
- ADDED: pause/resume job scheduling via web api
- ADDED: Web-API support including openAPI WebUI for testing
- ADDED: Docker PUID/PGID support to run CronOps with explicit user/group privileges
- ADDED: job action `exec` introduced
- ADDED: jobLoader recognizes deleted job files 
- ADDED: simple web api to trigger jobs manually
- ADDED: job validation and auto disabling wrong configured jobs
- ADDED: index.ts allowing to use jobLoader, jobScheduler & jobRunner in js/ts programs
- CHANGED: jobs configuration split up to single job configuration files organized in `/config/jobs`
- CHANGED: project rename to @mtakla/cronops
- initial public version
