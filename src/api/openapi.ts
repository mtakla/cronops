export const openapi = {
   openapi: "3.0.3",
   info: { title: "CronOps Web API", version: "1.0.0" },
   components: {
      securitySchemes: {
         ApiKeyBearer: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "hex-256",
         },
      },
      parameters: {
         JobId: {
            name: "jobId",
            in: "path",
            required: true,
            schema: { type: "string" },
         },
      },
      schemas: {
         Job: {
            type: "object",
            additionalProperties: false,
            properties: {
               id: { type: "string", example: "example-job" },
               cron: { type: "string", minLength: 1, example: "*/5 * * * *" },
               action: {
                  type: "string",
                  enum: ["exec", "call", "copy", "move", "delete", "archive"],
                  example: "copy",
               },
               command: { type: "string" },
               shell: {
                  anyOf: [{ type: "boolean" }, { type: "string", minLength: 1 }],
               },
               args: {
                  type: "array",
                  items: { type: "string", minLength: 1 },
                  minItems: 1,
               },
               env: {
                  type: "object",
                  propertyNames: {
                     type: "string",
                     pattern: "^[A-Z_][A-Z0-9_]*$",
                  },
                  additionalProperties: { type: "string" },
               },
               source: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                     dir: { type: "string", minLength: 1 },
                     includes: {
                        type: "array",
                        items: { type: "string", minLength: 1 },
                        minItems: 1,
                     },
                     excludes: {
                        type: "array",
                        items: { type: "string", minLength: 1 },
                        minItems: 1,
                     },
                  },
               },
               target: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                     dir: { type: "string", minLength: 1 },
                     archive_name: { type: "string", minLength: 1 },
                     permissions: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                           owner: { type: "string", minLength: 1 },
                           file_mode: { type: "string", minLength: 1 },
                           dir_mode: { type: "string", minLength: 1 },
                        },
                     },
                     retention: { type: "string", minLength: 1 },
                  },
               },
               dry_run: { type: "boolean" },
               verbose: { type: "boolean" },
               enabled: { type: "boolean" },
            },
         },
      },
   },
   tags: [
      {
         name: "public",
         description: "Public api",
      },
      {
         name: "jobs",
         description: "job related api",
      },
      {
         name: "schedule",
         description: "scheduling api",
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
      "/api/jobs": {
         get: {
            summary: "Get jobs",
            tags: ["jobs"],
            responses: {
               "200": {
                  description: "Array of scheduled jobs",
                  content: {
                     "application/json": {
                        schema: {
                           type: "array",
                           items: { $ref: "#/components/schemas/Job" },
                        },
                     },
                  },
               },
            },
         },
      },
      "/api/jobs/{jobId}": {
         get: {
            summary: "Get a job",
            tags: ["jobs"],
            parameters: [{ $ref: "#/components/parameters/JobId" }],
            responses: {
               "200": {
                  description: "Array of scheduled jobs",
                  content: {
                     "application/json": {
                        schema: { $ref: "#/components/schemas/Job" },
                     },
                  },
               },
               "404": {
                  description: "Job not found",
               },
            },
         },
      },
      "/api/status": {
         get: {
            summary: "Get status",
            tags: ["schedule"],
            responses: {
               "200": {
                  description: "Array of scheduled jobs",
                  content: {
                     "application/json": {
                        schema: {
                           type: "array",
                           items: { $ref: "#/components/schemas/Job" },
                        },
                     },
                  },
               },
            },
         },
      },
      "/api/trigger/{jobId}": {
         post: {
            summary: "Trigger a job",
            tags: ["schedule"],
            parameters: [{ $ref: "#/components/parameters/JobId" }],
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
      "/api/pause": {
         post: {
            summary: "Pause jobs",
            tags: ["schedule"],
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
      "/api/pause/job/{jobId}": {
         post: {
            summary: "Pause a job",
            tags: ["schedule"],
            parameters: [{ $ref: "#/components/parameters/JobId" }],
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
      "/api/resume/job/{jobId}": {
         post: {
            summary: "Resume a paused job",
            tags: ["schedule"],
            parameters: [{ $ref: "#/components/parameters/JobId" }],
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

      "/api/resume": {
         post: {
            summary: "Resume paused jobs",
            tags: ["schedule"],
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
