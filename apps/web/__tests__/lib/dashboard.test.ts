import { describe, expect, it } from "bun:test";
import { buildExclusionFilter } from "@/lib/dashboard";
import {
  type DashboardConfig,
  dashboardConfigSchema,
} from "@/lib/validations/wedding-content";

describe("dashboardConfigSchema", () => {
  it("should parse empty object with defaults", () => {
    const result = dashboardConfigSchema.parse({});
    expect(result).toEqual({
      excludeThreeAndUnder: false,
      excludeUnder21: false,
      excludePlusOnes: false,
    });
  });

  it("should parse valid config", () => {
    const result = dashboardConfigSchema.parse({
      excludeThreeAndUnder: true,
      excludeUnder21: false,
      excludePlusOnes: true,
    });
    expect(result).toEqual({
      excludeThreeAndUnder: true,
      excludeUnder21: false,
      excludePlusOnes: true,
    });
  });

  it("should strip unknown keys", () => {
    const result = dashboardConfigSchema.parse({
      excludeThreeAndUnder: true,
      unknownKey: "value",
    });
    expect(result).toEqual({
      excludeThreeAndUnder: true,
      excludeUnder21: false,
      excludePlusOnes: false,
    });
    expect((result as Record<string, unknown>).unknownKey).toBeUndefined();
  });
});

describe("buildExclusionFilter", () => {
  it("should return empty filter when no exclusions", () => {
    const config: DashboardConfig = {
      excludeThreeAndUnder: false,
      excludeUnder21: false,
      excludePlusOnes: false,
    };
    expect(buildExclusionFilter(config)).toEqual({});
  });

  it("should exclude threeAndUnder guests", () => {
    const config: DashboardConfig = {
      excludeThreeAndUnder: true,
      excludeUnder21: false,
      excludePlusOnes: false,
    };
    expect(buildExclusionFilter(config)).toEqual({ threeAndUnder: false });
  });

  it("should exclude under21 guests", () => {
    const config: DashboardConfig = {
      excludeThreeAndUnder: false,
      excludeUnder21: true,
      excludePlusOnes: false,
    };
    expect(buildExclusionFilter(config)).toEqual({ under21: false });
  });

  it("should exclude plusOnes", () => {
    const config: DashboardConfig = {
      excludeThreeAndUnder: false,
      excludeUnder21: false,
      excludePlusOnes: true,
    };
    expect(buildExclusionFilter(config)).toEqual({ isPlusOne: false });
  });

  it("should combine multiple exclusions", () => {
    const config: DashboardConfig = {
      excludeThreeAndUnder: true,
      excludeUnder21: true,
      excludePlusOnes: true,
    };
    expect(buildExclusionFilter(config)).toEqual({
      threeAndUnder: false,
      under21: false,
      isPlusOne: false,
    });
  });
});
