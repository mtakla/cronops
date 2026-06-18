import { timingSafeEqual } from "node:crypto";
import Fastify from "fastify";
import chalk from "chalk";
import { ENV } from "../types/Options.types.js";
import { openapi } from "./openapi.js";
import type { JobScheduler } from "../tasks/JobScheduler.js";

const app = Fastify();

declare module "fastify" {
   interface FastifyInstance {
      scheduler: JobScheduler;
   }
}

// server port for simple admin web-api
const port = Number(process.env[ENV.PORT] ?? 8118);
const host = process.env[ENV.HOST] ?? "127.0.0.1";
const baseUrl = process.env[ENV.BASE_URL] ?? `http://127.0.0.1:${port}`;
const persistAuth = process.env[ENV.UI_PERSIST_AUTH] ?? "false";
const apiKey = process.env[ENV.API_KEY];

app.addHook("preHandler", async (request, reply) => {
   if (request.method === "OPTIONS" || !request.url.startsWith("/api")) return;
   const auth = request.headers.authorization;
   const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
   const valid = token && apiKey && token.length === apiKey.length && timingSafeEqual(Buffer.from(token), Buffer.from(apiKey));
   if (!valid) {
      return reply.code(401).send("Unauthorized");
   }
});

app.get("/docs", async (_, reply) => {
   reply.type("text/html").send(`
      <!doctype html>
      <html>
         <head>
            <meta charset="utf-8" />
            <link rel="shortcut icon" type="image/png" href="/rapidoc.png">
            <title>CronOps API</title>
            <script type="module" src="https://unpkg.com/rapidoc/dist/rapidoc-min.js"></script>
         </head>
         <body>
            <rapi-doc heading-text="CronOps" spec-url="/openapi.json" render-style="view" persist-auth="${persistAuth}"></rapi-doc>
         </body>
      </html>`);
});

app.get("/rapidoc.png", async (_req, reply) => {
   const buffer = Buffer.from(
      "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",
      "base64",
   );
   reply.header("Content-Type", "image/png").header("Cache-Control", "public, max-age=86400").send(buffer);
});

app.get("/openapi.json", async () => {
   return { ...openapi, servers: [{ url: "" }, { url: `${baseUrl}` }] } satisfies typeof openapi;
});

app.get("/health", async (request, reply) => {
   const jobScheduler = request.server.scheduler;
   const jobs = jobScheduler.getScheduledJobs();
   reply.code(200).send({ status: "ok", active_jobs: jobs.length });
});

app.get("/api/jobs", async (request) => {
   const jobScheduler = request.server.scheduler;
   return jobScheduler.getScheduledJobs();
});

app.get("/api/jobs/:jobId", async (request, reply) => {
   const { jobId } = request.params as { jobId: string };
   const jobScheduler = request.server.scheduler;
   if (!jobScheduler.isJobScheduled(jobId)) {
      return reply.code(404).send();
   }
   return jobScheduler.getJob(jobId);
});

app.get("/api/status", async (request) => {
   const jobScheduler = request.server.scheduler;
   return jobScheduler.getScheduledJobsInfo();
});

app.post("/api/pause", async (request) => {
   const jobScheduler = request.server.scheduler;
   await jobScheduler.pauseScheduling();
   return { paused: true };
});

app.post("/api/pause/:jobId", async (request, reply) => {
   const { jobId } = request.params as { jobId: string };
   const jobScheduler = request.server.scheduler;
   if (!jobScheduler.isJobScheduled(jobId)) {
      return reply.code(404).send();
   }
   await jobScheduler.pauseJobScheduling(jobId);
   return { paused: true, jobId };
});

app.post("/api/resume", async (request) => {
   const jobScheduler = request.server.scheduler;
   await jobScheduler.resumeScheduling();
   return { resumed: true };
});

app.post("/api/resume/:jobId", async (request, reply) => {
   const { jobId } = request.params as { jobId: string };
   const jobScheduler = request.server.scheduler;
   if (!jobScheduler.isJobScheduled(jobId)) {
      return reply.code(404).send();
   }
   await jobScheduler.resumeJobScheduling(jobId);
   return { resumed: true, jobId };
});

app.post("/api/trigger/:jobId", async (request, reply) => {
   const { jobId } = request.params as { jobId: string };
   const jobScheduler = request.server.scheduler;
   if (!jobScheduler.isJobScheduled(jobId)) {
      return reply.code(404).send();
   }
   await jobScheduler.executeJob(jobId);
   return { triggered: true, jobId };
});

app.post("/api/terminate", async () => {
   // graceful shutdown logic here
   return { terminating: true };
});

export default function (scheduler: JobScheduler) {
   if (!apiKey || !/^[0-9a-f]{64}$/i.test(apiKey)) {
      console.log(`\nNo API key found. To use the CronOps admin Web API:`);
      console.log(` - Generate a hex‑encoded 256‑bit secret (e.g. 'openssl rand -hex 32')`);
      console.log(` - Configure CronOps API key via environment variable CROPS_API_KEY`);
      console.log(` - Add 'HTTP Bearer' header on each /api HTTP request`);
   }
   app.decorate("scheduler", scheduler);
   app.listen({ port, host }, (err) => {
      if (err) {
         console.log(chalk.red(`Web API disabled. ${err?.message}`));
      } else {
         console.log(`\nWeb API enabled. HTTP Server is listening on port ${port} ...`);
         console.log(` ⎆ API endpoint ${baseUrl}/api (secured)`);
         console.log(` ⎆ OpenAPI docs ${baseUrl}/docs`);
         console.log(` ⎆ Health check ${baseUrl}/health`);
      }
   });
}
