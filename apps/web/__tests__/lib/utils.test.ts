import { describe, expect, it } from "bun:test";
import { pickRandomItems, shuffleArray } from "@/app/utils";

describe("shuffleArray", () => {
  it("should return an array of the same length", () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffleArray(input);
    expect(result).toHaveLength(input.length);
  });

  it("should contain all the same elements", () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffleArray(input);
    expect(result.sort()).toEqual(input.sort());
  });

  it("should not mutate the original array", () => {
    const input = [1, 2, 3, 4, 5];
    const originalCopy = [...input];
    shuffleArray(input);
    expect(input).toEqual(originalCopy);
  });

  it("should return a new array instance", () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffleArray(input);
    expect(result).not.toBe(input);
  });

  it("should handle empty arrays", () => {
    const result = shuffleArray([]);
    expect(result).toEqual([]);
  });

  it("should handle single element arrays", () => {
    const result = shuffleArray([42]);
    expect(result).toEqual([42]);
  });

  it("should work with different types", () => {
    const strings = ["a", "b", "c"];
    const result = shuffleArray(strings);
    expect(result.sort()).toEqual(strings.sort());

    const objects = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const objectResult = shuffleArray(objects);
    expect(objectResult).toHaveLength(3);
    expect(objectResult.map((o) => o.id).sort()).toEqual([1, 2, 3]);
  });
});

describe("pickRandomItems", () => {
  it("should return the requested number of items", () => {
    const input = [1, 2, 3, 4, 5];
    const result = pickRandomItems(input, 3);
    expect(result).toHaveLength(3);
  });

  it("should return items from the original array", () => {
    const input = [1, 2, 3, 4, 5];
    const result = pickRandomItems(input, 3);
    for (const item of result) {
      expect(input).toContain(item);
    }
  });

  it("should not mutate the original array", () => {
    const input = [1, 2, 3, 4, 5];
    const originalCopy = [...input];
    pickRandomItems(input, 3);
    expect(input).toEqual(originalCopy);
  });

  it("should handle count equal to array length", () => {
    const input = [1, 2, 3];
    const result = pickRandomItems(input, 3);
    expect(result).toHaveLength(3);
    expect(result.sort()).toEqual(input.sort());
  });

  it("should handle count greater than array length", () => {
    const input = [1, 2, 3];
    const result = pickRandomItems(input, 5);
    expect(result).toHaveLength(3);
  });

  it("should handle count of zero", () => {
    const input = [1, 2, 3, 4, 5];
    const result = pickRandomItems(input, 0);
    expect(result).toEqual([]);
  });

  it("should handle empty arrays", () => {
    const result = pickRandomItems([], 3);
    expect(result).toEqual([]);
  });

  it("should return unique items (no duplicates)", () => {
    const input = [1, 2, 3, 4, 5];
    const result = pickRandomItems(input, 3);
    const uniqueItems = new Set(result);
    expect(uniqueItems.size).toBe(result.length);
  });
});
