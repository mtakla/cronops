import { describe, it, expect } from "vitest";
import { JobLogModel } from "./JobLogModel.js";

describe(JobLogModel.name, () => {
   it("constructor", () => {
      let jobLog = new JobLogModel();
      expect(jobLog.data).toEqual({});

      jobLog = new JobLogModel({ "7849a2b08ba73b0e02620acd644bad3363bc7b46fd498809146ba56ddb8e7d7c": {} });
      expect(Object.keys(jobLog.data)).toEqual(["7849a2b08ba73b0e02620acd644bad3363bc7b46fd498809146ba56ddb8e7d7c"]);
   });

   it("addEntry()", () => {
      const jobLog = new JobLogModel();
      jobLog.addEntry({ src: "/foo/src", dest: "/foo/dest", mtime: 0, ttime: 0 });

      expect(Object.keys(jobLog.data)).toEqual(["3a2cadae311d6560fbb31e64c53b9b175b6c1c50596cb47d0a8cb6f9118475ed"]);
      expect(jobLog.data).toEqual({
         "3a2cadae311d6560fbb31e64c53b9b175b6c1c50596cb47d0a8cb6f9118475ed": {
            src: "/foo/src",
            dest: "/foo/dest",
            mtime: 0,
            ttime: 0,
         },
      });
   });

   it("hasEntry()", () => {
      const jobLog = new JobLogModel();
      jobLog.addEntry({ src: "/foo/src", dest: "/foo/dest1", mtime: 0, ttime: 0 });
      expect(jobLog.hasEntry("/foo/dest1")).toBeTruthy();
      expect(jobLog.hasEntry("/foo/dest1", 1748515500000)).toBeFalsy();
      expect(jobLog.hasEntry("/foo/dest1", undefined)).toBeTruthy();
      jobLog.addEntry({ src: "/foo/src", dest: "/foo/dest2", mtime: 1748515500000, ttime: 0 });
      expect(jobLog.hasEntry("/foo/dest2", 1748515500000)).toBeTruthy();
      expect(jobLog.hasEntry("/foo/dest2", 1748515500001)).toBeFalsy();
      expect(jobLog.hasEntry("/foo/dest1", 1748515500000)).toBeFalsy();
   });

   it("removeEntry()", () => {
      const jobLog = new JobLogModel();
      jobLog.addEntry({ src: "/foo/src", dest: "/foo/dest1", mtime: 1748515500000, ttime: 0 });
      expect(jobLog.hasEntry("/foo/dest1")).toBeTruthy();
      expect(jobLog.hasEntry("/foo/dest1", 1748515500000)).toBeTruthy();
      jobLog.removeEntry(Object.keys(jobLog.data)[0]);
      expect(jobLog.hasEntry("/foo/dest1", 1748515500000)).toBeFalsy();
      expect(jobLog.hasEntry("/foo/dest1")).toBeFalsy();
   });

   it("size()", () => {
      const jobLog = new JobLogModel();
      expect(jobLog.size()).toBe(0);
      jobLog.addEntry({ src: "/foo/src", dest: "/foo/dest1", mtime: 0, ttime: 0 });
      expect(jobLog.size()).toBe(1);
      jobLog.removeEntry(Object.keys(jobLog.data)[0]);
      expect(jobLog.size()).toBe(0);
   });
});
