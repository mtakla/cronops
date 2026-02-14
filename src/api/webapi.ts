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
const baseUrl = process.env[ENV.BASE_URL] ?? "http://127.0.0.1:8118";
const apiKey = process.env[ENV.API_KEY];

app.addHook("preHandler", async (request, reply) => {
   if (request.method === "OPTIONS" || !request.url.startsWith("/api")) return;
   const auth = request.headers.authorization;
   const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
   if (!token || token !== apiKey) {
      return reply.code(401).send("Unauthorized");
   }
});

app.get("/docs", async (_, reply) => {
   reply.type("text/html").send(`
      <!doctype html>
      <html lang="en">
         <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <meta name="description" content="CronOps API documentation - Lightweight, cron-based file management and system task scheduler for containerized environments. Automate copying, moving, archiving, and cleaning up files." />
            <meta name="keywords" content="cronops, cron, scheduler, file management, docker, containerization, automation, API, REST API" />
            <meta name="author" content="nevereven" />
            <meta name="theme-color" content="#1976d2" />
            
            <!-- Open Graph / Facebook -->
            <meta property="og:type" content="website" />
            <meta property="og:title" content="CronOps API Documentation" />
            <meta property="og:description" content="Interactive API documentation for CronOps - Cron-based file management and system task scheduler for containerized environments." />
            <meta property="og:site_name" content="CronOps" />
            
            <!-- Twitter Card -->
            <meta name="twitter:card" content="summary" />
            <meta name="twitter:title" content="CronOps API Documentation" />
            <meta name="twitter:description" content="Interactive API documentation for CronOps - Cron-based file management and system task scheduler for containerized environments." />
            
            <title>CronOps API Documentation</title>
            <script type="module" src="https://unpkg.com/rapidoc/dist/rapidoc-min.js"></script>
         </head>
         <body>
            <rapi-doc spec-url="/openapi.json"></rapi-doc>
         </body>
      </html>`);
});

app.get("/openapi.json", async () => {
   return { ...openapi, servers: [{ url: "" }, { url: `${baseUrl}` }] } satisfies typeof openapi;
});

app.get("/health", async (request, reply) => {
   const jobScheduler = request.server.scheduler;
   const jobs = jobScheduler.getScheduledJobs();
   reply.code(200).send({ status: "ok", active_jobs: jobs.length });
});

app.post("/api/jobs/trigger/:jobId", async (request, reply) => {
   const { jobId } = request.params as { jobId: string };
   const jobScheduler = request.server.scheduler;
   if (!jobScheduler.isJobScheduled(jobId)) {
      return reply.code(404).send();
   }
   await jobScheduler.executeJob(jobId);
   return { triggered: true, jobId };
});

app.post("/terminate", async () => {
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
