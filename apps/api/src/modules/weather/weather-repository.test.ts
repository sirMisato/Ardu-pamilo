import { describe, expect, it } from "vitest";
import { BmkgWeatherRepository, parseBmkgForecastResponse } from "./weather-repository.js";

const sampleBmkgPayload = {
  lokasi: {
    adm4: "31.71.01.1001",
    timezone: "Asia/Jakarta"
  },
  data: [
    {
      cuaca: [
        [
          {
            datetime: "2026-08-03T06:00:00Z",
            local_datetime: "2026-08-03 13:00:00",
            analysis_date: "2026-08-03T00:00:00",
            t: 29,
            hu: 82,
            tp: 1.2,
            weather: 61,
            weather_desc: "Hujan Ringan",
            weather_desc_en: "Light Rain",
            ws: 8,
            wd: "SE",
            tcc: 74,
            vs_text: "> 10 km",
            image: "https://api-apps.bmkg.go.id/storage/icon/cuaca/hujan%20ringan-am.png"
          }
        ]
      ]
    }
  ]
};

describe("BMKG weather repository", () => {
  it("normalizes nested BMKG forecast payloads", () => {
    const snapshot = parseBmkgForecastResponse(sampleBmkgPayload, {
      adm4Code: "31.71.01.1001",
      now: new Date("2026-08-03T00:30:00Z"),
      cacheTtlMs: 60_000
    });

    expect(snapshot).toMatchObject({
      source: "bmkg",
      attribution: "BMKG",
      adm4Code: "31.71.01.1001",
      cacheStatus: "fresh",
      fetchedAt: "2026-08-03T00:30:00.000Z",
      staleAfter: "2026-08-03T00:31:00.000Z",
      forecast: [
        expect.objectContaining({
          utcDatetime: "2026-08-03T06:00:00.000Z",
          localDatetime: "2026-08-03T13:00:00+07:00",
          temperatureC: 29,
          humidityPct: 82,
          rainfallMm: 1.2,
          weatherCode: 61,
          weatherDesc: "Hujan Ringan",
          iconUrl: "https://api-apps.bmkg.go.id/storage/icon/cuaca/hujan%20ringan-am.png"
        })
      ]
    });
  });

  it("uses the local cache before calling BMKG again", async () => {
    let requests = 0;
    const fetchFn: typeof fetch = async () => {
      requests += 1;
      return new Response(JSON.stringify(sampleBmkgPayload), {
        status: 200,
        headers: {
          "content-type": "application/json"
        }
      });
    };
    const repository = new BmkgWeatherRepository({
      fetchFn,
      now: () => new Date("2026-08-03T00:30:00Z"),
      cacheTtlMs: 60_000
    });

    const first = await repository.getByAdm4Code("31.71.01.1001");
    const second = await repository.getByAdm4Code("31.71.01.1001");

    expect(first?.forecast[0]?.weatherDesc).toBe("Hujan Ringan");
    expect(second?.cacheStatus).toBe("fresh");
    expect(requests).toBe(1);
  });
});
