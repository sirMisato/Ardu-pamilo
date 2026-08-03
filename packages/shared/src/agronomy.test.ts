import { describe, expect, it } from "vitest";
import { validateAgronomyThreshold } from "./agronomy.js";

const validThreshold = {
  crop: "padi",
  variety: "ciherang",
  growth_stage: "vegetative",
  metric: "soil_moisture",
  unit: "percent_relative",
  method: "capacitive-soil-v1",
  soil_context: "loam topsoil 0-20cm",
  lower_bound: 35,
  upper_bound: 60,
  severity: "warning",
  duration_minutes: 30,
  hysteresis: 3,
  source_url: "https://example.test/agronomy/padi",
  reviewer: "agronomy-reviewer",
  version: "2026.08.0",
  status: "reviewed"
};

describe("agronomy threshold governance", () => {
  it("accepts threshold records with provenance", () => {
    const parsed = validateAgronomyThreshold(validThreshold);

    expect(parsed).toMatchObject({
      ok: true,
      value: {
        crop: "padi",
        metric: "soil_moisture",
        reviewer: "agronomy-reviewer",
        status: "reviewed"
      }
    });
  });

  it("rejects universal thresholds without specific crop context", () => {
    const parsed = validateAgronomyThreshold({
      ...validThreshold,
      crop: "universal"
    });

    expect(parsed).toMatchObject({
      ok: false,
      errors: expect.arrayContaining(["/crop must name a specific crop"])
    });
  });

  it("requires bounds and https provenance", () => {
    const parsed = validateAgronomyThreshold({
      ...validThreshold,
      lower_bound: null,
      upper_bound: null,
      source_url: "http://example.test/agronomy/padi"
    });

    expect(parsed).toMatchObject({
      ok: false,
      errors: expect.arrayContaining([
        "/lower_bound or /upper_bound is required",
        "/source_url must be an https URL"
      ])
    });
  });
});
