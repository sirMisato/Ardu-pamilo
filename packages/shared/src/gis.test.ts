import { describe, expect, it } from "vitest";
import { parsePolygonGeometry, summarizePolygonGeometry, type PolygonGeometry } from "./gis.js";

const validPolygon: PolygonGeometry = {
  type: "Polygon",
  coordinates: [
    [
      [106.8, -6.2],
      [106.81, -6.2],
      [106.81, -6.19],
      [106.8, -6.19],
      [106.8, -6.2]
    ]
  ]
};

describe("GIS polygon utilities", () => {
  it("accepts valid GeoJSON polygons and summarizes them", () => {
    const parsed = parsePolygonGeometry(validPolygon);

    expect(parsed.ok).toBe(true);

    if (!parsed.ok) {
      throw new Error("Expected valid polygon");
    }

    const summary = summarizePolygonGeometry(parsed.value);

    expect(summary.areaM2).toBeGreaterThan(1);
    expect(summary.areaHa).toBeCloseTo(summary.areaM2 / 10000, 6);
    expect(summary.centroid.lng).toBeGreaterThan(106.8);
    expect(summary.bbox.west).toBe(106.8);
  });

  it("rejects open rings", () => {
    const parsed = parsePolygonGeometry({
      type: "Polygon",
      coordinates: [
        [
          [106.8, -6.2],
          [106.81, -6.2],
          [106.81, -6.19],
          [106.8, -6.19]
        ]
      ]
    });

    expect(parsed).toMatchObject({
      ok: false
    });
  });

  it("rejects self-intersecting polygons", () => {
    const parsed = parsePolygonGeometry({
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [1, 1],
          [1, 0],
          [0, 1],
          [0, 0]
        ]
      ]
    });

    expect(parsed).toMatchObject({
      ok: false,
      errors: ["/coordinates polygon must not self-intersect"]
    });
  });
});
