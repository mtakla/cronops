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

   it("updateSourceEntry() with new entry should work", () => {
      const history = new FileHistoryModel();
      const { changed, added } = history.updateSourceEntry("/foo/source", [1, 2]);
      expect(history.data.source).toEqual({ "/foo/source": [1, 2] });
      expect(history.changed).toBe(true);
      expect(changed).toBe(true);
      expect(added).toBe(true);
   });

   it("updateSourceEntry() with identical entry should work", () => {
      const history = new FileHistoryModel({
         source: { "/foo/source": [1, 2] },
         target: {},
      });
      const { changed, added } = history.updateSourceEntry("/foo/source", [1, 2]);
      expect(history.data.source).toEqual({ "/foo/source": [1, 2] });
      expect(history.changed).toBe(false);
      expect(changed).toBe(false);
      expect(added).toBe(false);
   });

   it("updateSourceEntry() with newer entry should work", () => {
      const history = new FileHistoryModel({
         source: { "/foo/source": [1, 2] },
         target: {},
      });
      const { changed, added } = history.updateSourceEntry("/foo/source", [11, 2]);
      expect(history.data.source).toEqual({ "/foo/source": [11, 2] });
      expect(history.changed).toBe(true);
      expect(changed).toBe(true);
      expect(added).toBe(false);
   });

   it("updateSourceEntry() with updated entry should work", () => {
      const history = new FileHistoryModel({
         source: { "/foo/source": [1, 2] },
         target: {},
      });
      const { changed, added } = history.updateSourceEntry("/foo/source", [1, 22]);
      expect(history.data.source).toEqual({ "/foo/source": [1, 2] });
      expect(history.changed).toBe(false);
      expect(changed).toBe(false);
      expect(added).toBe(false);
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
      history.updateSourceEntry("/src/included", [1, 2]);
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
