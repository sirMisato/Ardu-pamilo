import area from "@turf/area";
import bbox from "@turf/bbox";
import centroid from "@turf/centroid";
import kinks from "@turf/kinks";
import { polygon as turfPolygon } from "@turf/helpers";
import type { ValidationResult } from "./telemetry.js";

export type Position = [number, number];
export type LinearRing = Position[];

export interface PolygonGeometry {
  type: "Polygon";
  coordinates: LinearRing[];
}

export interface GeometrySummary {
  geometry: PolygonGeometry;
  areaM2: number;
  areaHa: number;
  centroid: {
    lat: number;
    lng: number;
  };
  bbox: {
    west: number;
    south: number;
    east: number;
    north: number;
  };
}

export function parsePolygonGeometry(input: unknown): ValidationResult<PolygonGeometry> {
  const errors: string[] = [];

  if (!isRecord(input)) {
    return {
      ok: false,
      errors: ["/geometry must be a GeoJSON Polygon object"]
    };
  }

  if (input.type !== "Polygon") {
    errors.push("/type must be Polygon");
  }

  if (!Array.isArray(input.coordinates)) {
    errors.push("/coordinates must be an array of linear rings");
  }

  if (errors.length > 0) {
    return {
      ok: false,
      errors
    };
  }

  const coordinates = input.coordinates as unknown[];

  if (coordinates.length === 0) {
    errors.push("/coordinates must contain at least one linear ring");
  }

  const rings: LinearRing[] = [];

  coordinates.forEach((ring, ringIndex) => {
    if (!Array.isArray(ring)) {
      errors.push(`/coordinates/${ringIndex} must be a linear ring`);
      return;
    }

    const positions: Position[] = [];

    ring.forEach((position, positionIndex) => {
      if (!isPosition(position)) {
        errors.push(`/coordinates/${ringIndex}/${positionIndex} must be [longitude, latitude]`);
        return;
      }

      const [lng, lat] = position;
      if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
        errors.push(`/coordinates/${ringIndex}/${positionIndex} is outside longitude/latitude bounds`);
      }

      positions.push([lng, lat]);
    });

    if (positions.length < 4) {
      errors.push(`/coordinates/${ringIndex} must contain at least four positions`);
    }

    if (positions.length >= 2 && !samePosition(positions[0], positions[positions.length - 1])) {
      errors.push(`/coordinates/${ringIndex} must be closed`);
    }

    rings.push(positions);
  });

  if (errors.length > 0) {
    return {
      ok: false,
      errors
    };
  }

  const geometry: PolygonGeometry = {
    type: "Polygon",
    coordinates: rings
  };

  const feature = turfPolygon(geometry.coordinates);
  const kinkPoints = kinks(feature);

  if (kinkPoints.features.length > 0) {
    return {
      ok: false,
      errors: ["/coordinates polygon must not self-intersect"]
    };
  }

  if (area(feature) <= 0) {
    return {
      ok: false,
      errors: ["/coordinates polygon area must be greater than zero"]
    };
  }

  return {
    ok: true,
    value: geometry
  };
}

export function summarizePolygonGeometry(geometry: PolygonGeometry): GeometrySummary {
  const feature = turfPolygon(geometry.coordinates);
  const [west, south, east, north] = bbox(feature);
  const center = centroid(feature).geometry.coordinates;
  const areaM2 = area(feature);

  return {
    geometry,
    areaM2,
    areaHa: areaM2 / 10000,
    centroid: {
      lng: center[0] ?? 0,
      lat: center[1] ?? 0
    },
    bbox: {
      west: west ?? 0,
      south: south ?? 0,
      east: east ?? 0,
      north: north ?? 0
    }
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPosition(value: unknown): value is Position {
  return Array.isArray(value)
    && value.length >= 2
    && typeof value[0] === "number"
    && Number.isFinite(value[0])
    && typeof value[1] === "number"
    && Number.isFinite(value[1]);
}

function samePosition(left: Position | undefined, right: Position | undefined): boolean {
  return Boolean(left && right && left[0] === right[0] && left[1] === right[1]);
}
