import { describe, expect, it } from "vitest";
import { RedisVictoriaTelemetryRepository } from "./redis-victoria-telemetry-repository.js";

describe("RedisVictoriaTelemetryRepository", () => {
  it("maps VictoriaMetrics query_range matrix into telemetry history records", async () => {
    const repository = new RedisVictoriaTelemetryRepository({
      redisUrl: "redis://localhost:6379",
      victoriaMetricsUrl: "http://victoriametrics:8428",
      fetchImpl: async () => new Response(JSON.stringify({
        status: "success",
        data: {
          result: [
            {
              metric: {
                device_id: "device-a",
                node_id: "soil-01",
                unit: "deg_c"
              },
              values: [
                [1785646800, "27.4"]
              ]
            }
          ]
        }
      }))
    });

    const records = await repository.queryHistoryForPlot({
      tenantId: "tenant-a",
      userId: "user-a",
      role: "farmer_owner"
    }, {
      plotId: "plot-a",
      metric: "soil_temperature",
      from: "2026-08-02T05:00:00Z",
      to: "2026-08-02T05:05:00Z",
      resolution: "raw"
    });

    expect(records).toEqual([
      expect.objectContaining({
        tenantId: "tenant-a",
        plotId: "plot-a",
        deviceId: "device-a",
        nodeId: "soil-01",
        metric: "soil_temperature",
        ts: "2026-08-02T05:00:00.000Z",
        value: 27.4,
        unit: "deg_c"
      })
    ]);
  });
});
