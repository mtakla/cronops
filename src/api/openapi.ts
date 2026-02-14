export const openapi = {
   openapi: "3.0.3",
   info: {
      title: "CronOps Web API",
      version: "1.0.0",
      description:
         "REST API for CronOps - A lightweight, cron-based file management and system task scheduler for containerized environments. Automate file operations, execute commands, and manage scheduled jobs.",
      contact: {
         name: "CronOps",
         url: "https://github.com/mtakla/cronops",
      },
      license: {
         name: "ISC",
         url: "https://github.com/mtakla/cronops/blob/main/LICENSE",
      },
   },
   components: {
      securitySchemes: {
         ApiKeyBearer: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "hex-256",
         },
      },
   },
   tags: [
      {
         name: "public",
         description: "Public endpoints - Health check and API documentation",
      },
      {
         name: "jobs",
         description: "Job management - Trigger, pause, and resume CronOps scheduled jobs",
      },
      {
         name: "admin",
         description: "Administration endpoints - Manage CronOps service configuration and operations",
      },
   ],
   paths: {
      "/health": {
         get: {
            summary: "Health check",
            tags: ["public"],
            security: [],
            responses: {
               "200": {
                  description: "OK",
                  content: {
                     "application/json": {
                        schema: {
                           type: "object",
                           properties: {
                              status: { type: "string", example: "ok" },
                              active_jobs: { type: "integer", example: 3 },
                           },
                           required: ["status", "active_jobs"],
                        },
                     },
                  },
               },
            },
         },
      },
      "/docs": {
         get: {
            summary: "OpenApi docs",
            tags: ["public"],
            security: [],
            responses: {
               "200": {
                  description: "OK",
               },
            },
         },
      },
      "/openapi.json": {
         get: {
            summary: "OpenApi specs",
            tags: ["public"],
            security: [],
            responses: {
               "200": {
                  description: "OK",
                  content: {
                     "application/json": {},
                  },
               },
            },
         },
      },
      "/api/jobs/trigger/{jobId}": {
         post: {
            summary: "Trigger a job",
            tags: ["jobs"],
            parameters: [
               {
                  name: "jobId",
                  in: "path",
                  required: true,
                  schema: { type: "string" },
               },
            ],
            responses: {
               "200": {
                  description: "Triggered",
                  content: {
                     "application/json": {
                        schema: {
                           type: "object",
                           properties: {
                              triggered: { type: "boolean", example: true },
                              jobId: { type: "string", example: "job-123" },
                           },
                           required: ["triggered", "jobId"],
                        },
                     },
                  },
               },
               "404": {
                  description: "Job not found",
               },
            },
         },
      },
      "/api/jobs/pause/{jobId}": {
         post: {
            summary: "Pause a job",
            tags: ["jobs"],
            parameters: [
               {
                  name: "jobId",
                  in: "path",
                  required: true,
                  schema: { type: "string" },
               },
            ],
            responses: {
               "200": {
                  description: "Paused",
                  content: {
                     "application/json": {
                        schema: {
                           type: "object",
                           properties: {
                              paused: { type: "boolean", example: true },
                              jobId: { type: "string", example: "job-123" },
                           },
                        },
                     },
                  },
               },
            },
         },
      },
      "/api/jobs/resume/{jobId}": {
         post: {
            summary: "Resume a job",
            tags: ["jobs"],
            parameters: [
               {
                  name: "jobId",
                  in: "path",
                  required: true,
                  schema: { type: "string" },
               },
            ],
            responses: {
               "200": {
                  description: "Resumed",
                  content: {
                     "application/json": {
                        schema: {
                           type: "object",
                           properties: {
                              resumed: { type: "boolean", example: true },
                              jobId: { type: "string", example: "job-123" },
                           },
                        },
                     },
                  },
               },
            },
         },
      },
      "/api/jobs/pause/": {
         post: {
            summary: "Pause all jobs",
            tags: ["jobs"],
            responses: {
               "200": {
                  description: "Paused",
                  content: {
                     "application/json": {
                        schema: {
                           type: "object",
                           properties: {
                              paused: { type: "boolean", example: true },
                              jobs: { type: "number", example: 4 },
                           },
                        },
                     },
                  },
               },
            },
         },
      },
      "/api/jobs/resume/": {
         post: {
            summary: "Resume all jobs",
            tags: ["jobs"],
            responses: {
               "200": {
                  description: "Resumed",
                  content: {
                     "application/json": {
                        schema: {
                           type: "object",
                           properties: {
                              resumed: { type: "boolean", example: true },
                              jobs: { type: "number", example: 4 },
                           },
                        },
                     },
                  },
               },
            },
         },
      },
   },

   servers: [{ url: "http://localhost:3000" }],
   security: [{ ApiKeyBearer: [] }],
};
