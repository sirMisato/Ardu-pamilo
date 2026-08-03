import { describe, expect, it } from "vitest";
import { createTelemetryStorageRecord, normalizeSensorPayload, parseSensorPayload } from "@pamilo/shared";
import { buildVictoriaMetricsImportBody, createDevicePlotResolverFromEnv } from "./storage.js";

describe("telemetry storage helpers", () => {
  it("resolves device plot ownership from tenant/device map first", () => {
    const resolver = createDevicePlotResolverFromEnv({
      PAMILO_DEVICE_PLOT_MAP: JSON.stringify({
        "tenant-a/device-a": "plot-a",
        "device-b": "fallback-device-plot"
      }),
      PAMILO_DEFAULT_PLOT_ID: "default-plot"
    });

    expect(resolver.resolvePlotId("tenant-a", "device-a")).toBe("plot-a");
    expect(resolver.resolvePlotId("tenant-a", "device-b")).toBe("fallback-device-plot");
    expect(resolver.resolvePlotId("tenant-a", "device-c")).toBe("default-plot");
  });

  it("formats non-null telemetry records for VictoriaMetrics import", () => {
    const parsed = parseSensorPayload({
      v: 1,
      device_id: "device-a",
      node_id: "soil-01",
      ts: "2026-08-02T05:00:00Z",
      seq: 42,
      m: {
        st: 27.4,
        sm: null
      },
      q: {
        calibration_profile: "soil-v1",
        flags: []
      }
    });

    expect(parsed.ok).toBe(true);

    if (!parsed.ok) {
      throw new Error("Expected valid payload");
    }

    const records = normalizeSensorPayload(parsed.value).map((reading) =>
      createTelemetryStorageRecord({
        tenantId: "tenant-a",
        plotId: "plot-a",
        reading
      })
    );

    expect(buildVictoriaMetricsImportBody(records)).toBe(
      [
        'pamilo_telemetry_value{tenant_id="tenant-a",plot_id="plot-a",device_id="device-a",node_id="soil-01",metric="soil_temperature",sensor_key="st",unit="deg_c"} 27.4 1785646800000',
        'pamilo_telemetry_seq{tenant_id="tenant-a",plot_id="plot-a",device_id="device-a",node_id="soil-01",metric="soil_temperature",sensor_key="st",unit="deg_c"} 42 1785646800000',
        ""
      ].join("\n")
    );
  });
});
