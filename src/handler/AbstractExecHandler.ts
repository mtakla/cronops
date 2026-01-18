import { spawn } from "node:child_process";
import type { RunnerContext } from "../types/Task.types.js";
import { AbstractHandler } from "./AbstractHandler.js";

export abstract class AbstractExecHandler extends AbstractHandler {
   protected async exec(ctx: RunnerContext): Promise<void> {
      const { logFd } = ctx;
      return new Promise((resolve, reject) => {
         // start sub process
         const child = spawn("/bin/bash", ["-c", "ls -la"], {
            stdio: ["ignore", logFd, logFd],
         });

         // command is finished
         child.on("close", (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Job failed with exit code ${code}`));
         });

         child.on("error", (err) => reject(err));
      });
   }
}
