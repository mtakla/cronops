import { describe, it, expect } from "vitest";
import { FileHistoryModel } from "./FileHistoryModel.js";

describe(FileHistoryModel.name, () => {
   it("default constructor should work", () => {
      const history = new FileHistoryModel();
      expect(history.data).toEqual({ source: {}, target: {} });
   });

   it("constructor with data should work", () => {
      const history = new FileHistoryModel({
         source: { "7849a2b08ba73b0e02620acd644bad3363bc7b46fd498809146ba56ddb8e7d7c": {} },
         target: { "3a2cadae311d6560fbb31e64c53b9b175b6c1c50596cb47d0a8cb6f9118475ed": {} },
      });
      expect(Object.keys(history.data.source)).toEqual(["7849a2b08ba73b0e02620acd644bad3363bc7b46fd498809146ba56ddb8e7d7c"]);
      expect(Object.keys(history.data.target)).toEqual(["3a2cadae311d6560fbb31e64c53b9b175b6c1c50596cb47d0a8cb6f9118475ed"]);
   });

   it("addSourceEntry()", () => {
      const history = new FileHistoryModel();
      history.addSourceEntry({ path: "/foo/src", mtime: 12, ttime: 1 });
      expect(history.data.source).toEqual({
         "7fc5f1bf49912fc8d57a92f7c331f13f82684021c916873aedaa898c5ae8d4c7": {
            path: "/foo/src",
            mtime: 12,
            ttime: 1,
         },
      });
   });

   it("addTargetEntry()", () => {
      const history = new FileHistoryModel();
      history.addTargetEntry({ path: "/foo/dest", mtime: 0, ttime: 12 });
      expect(history.data.target).toEqual({
         "3a2cadae311d6560fbb31e64c53b9b175b6c1c50596cb47d0a8cb6f9118475ed": {
            path: "/foo/dest",
            mtime: 0,
            ttime: 12,
         },
      });
   });

   it("hasSourceEntry()", () => {
      const history = new FileHistoryModel();
      history.addSourceEntry({ path: "/foo/src", mtime: 0, ttime: 0 });
      expect(history.hasSourceEntry("/foo/src")).toBeTruthy();
      expect(history.hasSourceEntry("/foo/src", 1748515500000)).toBeFalsy();
      expect(history.hasSourceEntry("/foo/src", undefined)).toBeTruthy();
      history.addSourceEntry({ path: "/foo/dest", mtime: 1748515500000, ttime: 0 });
      expect(history.hasSourceEntry("/foo/dest", 1748515500000)).toBeTruthy();
      expect(history.hasSourceEntry("/foo/dest", 1748515500001)).toBeFalsy();
      expect(history.hasSourceEntry("/foo/dest", undefined)).toBeTruthy();
   });

   it("cleanup()", () => {
      const history = new FileHistoryModel();
      history.cleanup();
      expect(Object.keys(history.data.source)).toHaveLength(0);
      expect(Object.keys(history.data.target)).toHaveLength(0);

      history.addSourceEntry({ path: "/src/outdated", mtime: 0, ttime: 0 });
      history.addTargetEntry({ path: "/dest/included", mtime: 0, ttime: 0 });
      history.cleanup();
      expect(Object.keys(history.data.source)).toHaveLength(0);
      expect(Object.keys(history.data.target)).toHaveLength(1);

      history.markTargetOutdated("/dest/included");
      history.cleanup();
      expect(Object.keys(history.data.source)).toHaveLength(0);
      expect(Object.keys(history.data.target)).toHaveLength(0);

      history.addSourceEntry({ path: "/src/included", mtime: 0, ttime: 0 });
      history.addSourceEntry({ path: "/src/outdated", mtime: 0, ttime: 0 });
      history.addTargetEntry({ path: "/dest/outdated", mtime: 0, ttime: 0 });
      history.markSourceIncluded("/src/included");
      history.markTargetOutdated("/dest/outdated");
      history.cleanup();
      expect(Object.keys(history.data.source)).toHaveLength(1);
      expect(Object.keys(history.data.target)).toHaveLength(0);
   });
});
