import { describe, expect, it } from "vitest";
import { JobRunnerResult } from "../../src/models/JobRunnerResult.js";

describe("init should work", () => {
   it("constructor should work", async () => {
      const result = new JobRunnerResult();
      expect(result.copied).toBe(0);
      expect(result.durationMs).toBe(0);
      await new Promise((r) => setTimeout(r, 100));
      result.endTime = Date.now();
      expect(result.durationMs).toBeGreaterThan(50);
   });
});
