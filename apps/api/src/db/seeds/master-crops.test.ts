import { describe, expect, it } from "vitest";
import { masterCropSeeds, masterCropThresholdSeeds } from "./master-crops.js";

describe("master crop seed data", () => {
  it("contains the five phase 3 crops", () => {
    expect(masterCropSeeds.map((crop) => crop.code)).toEqual([
      "padi",
      "jagung",
      "bawang_merah",
      "cabai",
      "sawit"
    ]);
  });

  it("uses sourced draft soil pH threshold rows", () => {
    expect(masterCropThresholdSeeds).toHaveLength(5);

    for (const threshold of masterCropThresholdSeeds) {
      expect(threshold.metric).toBe("soil_ph");
      expect(threshold.unit).toBe("ph");
      expect(threshold.lowerBound).toBeLessThan(threshold.upperBound);
      expect(threshold.sourceUrl).toMatch(/^https:\/\//);
      expect(threshold.method).toBe("soil_ph_h2o_or_calibrated_field_meter");
    }
  });
});
