import { describe, it, expect } from "vitest";
import { FileHistoryModel } from "../../src/models/FileHistoryModel.js";

describe(FileHistoryModel.name, () => {
   it("default constructor should work", () => {
      const history = new FileHistoryModel();
      expect(history.data).toEqual({ source: {}, target: {} });
      expect(history.changed).toBe(false);
   });

   it("constructor with data should work", () => {
      const history = new FileHistoryModel({
         source: { "/foo/source": [1, 2] },
         target: { "/foo/target": [3, 4] },
      });
      expect(history.data.source).toEqual({ "/foo/source": [1, 2] });
      expect(history.data.target).toEqual({ "/foo/target": [3, 4] });
      expect(history.changed).toBe(false);
   });

   it("checkSourceEntry() on new entry should work", () => {
      const history = new FileHistoryModel();
      const changed = history.checkSourceEntry("/foo/source", 1);
      expect(changed).toBe(true);
   });

   it("checkSourceEntry() on existing entry should should work", () => {
      const history = new FileHistoryModel({
         source: { "/foo/source": [1, 2] },
         target: {},
      });
      const changed = history.checkSourceEntry("/foo/source", 1);
      expect(changed).toBe(false);
   });

   it("checkSourceEntry() on outdated existing entry should work", () => {
      const history = new FileHistoryModel({
         source: { "/foo/source": [1, 2] },
         target: {},
      });
      const changed = history.checkSourceEntry("/foo/source", 2);
      expect(changed).toBe(true);
   });

   it("addSourceEntry() on empty sources should work", () => {
      const history = new FileHistoryModel();
      history.addSourceEntry("/foo/source", [1, 2]);
      expect(history.data.source).toEqual({ "/foo/source": [1, 2] });
      expect(history.changed).toBe(true);
   });

   it("addTargetEntry() on empty targets should work", () => {
      const history = new FileHistoryModel();
      history.addTargetEntry("/foo/target", [1, 2]);
      expect(history.data.target).toEqual({ "/foo/target": [1, 2] });
      expect(history.changed).toBe(true);
   });

   it("cleanup()", () => {
      let history = new FileHistoryModel({
         source: { "/src/outdated": [1, 2] },
         target: {},
      });
      history.cleanup();
      expect(Object.keys(history.data.source)).toHaveLength(0);
      expect(Object.keys(history.data.target)).toHaveLength(0);

      history = new FileHistoryModel({
         source: { "/src/included": [1, 2] },
         target: {},
      });
      history.checkSourceEntry("/src/included", [1, 2]);
      history.addTargetEntry("/dest/foo", [1, 2]);
      expect(Object.keys(history.data.source)).toHaveLength(1);
      expect(Object.keys(history.data.target)).toHaveLength(1);
      history.cleanup();
      expect(Object.keys(history.data.source)).toHaveLength(1);
      expect(Object.keys(history.data.target)).toHaveLength(1);
      history.markTargetOutdated("/dest/foo");
      history.cleanup();
      expect(Object.keys(history.data.source)).toHaveLength(0);
      expect(Object.keys(history.data.target)).toHaveLength(0);
   });
});
