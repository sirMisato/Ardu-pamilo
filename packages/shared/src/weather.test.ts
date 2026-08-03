import { describe, expect, it } from "vitest";
import { classifyWeatherCache, parseWeatherForecastPoint } from "./weather.js";

describe("weather contracts", () => {
  it("classifies BMKG cache state", () => {
    expect(classifyWeatherCache({
      fetchedAt: "2026-08-03T00:00:00Z",
      staleAfter: "2026-08-03T06:00:00Z",
      now: "2026-08-03T05:59:00Z"
    })).toBe("fresh");

    expect(classifyWeatherCache({
      fetchedAt: "2026-08-03T00:00:00Z",
      staleAfter: "2026-08-03T06:00:00Z",
      now: "2026-08-03T06:01:00Z"
    })).toBe("stale");

    expect(classifyWeatherCache({
      fetchedAt: null,
      staleAfter: null,
      now: "2026-08-03T06:01:00Z"
    })).toBe("missing");
  });

  it("parses normalized BMKG forecast fields", () => {
    const parsed = parseWeatherForecastPoint({
      utc_datetime: "2026-08-03T06:00:00Z",
      local_datetime: "2026-08-03T13:00:00+07:00",
      t: 29,
      hu: 82,
      weather_desc: "Hujan Ringan",
      weather_desc_en: "Light Rain",
      ws: 8,
      wd: "SE",
      tcc: 74,
      vs_text: "> 10 km"
    });

    expect(parsed).toMatchObject({
      ok: true,
      value: {
        temperatureC: 29,
        humidityPct: 82,
        weatherDesc: "Hujan Ringan",
        windDirection: "SE"
      }
    });
  });

  it("rejects malformed forecast fields", () => {
    const parsed = parseWeatherForecastPoint({
      utc_datetime: "not-a-date",
      local_datetime: "",
      weather_desc: "Cerah",
      weather_desc_en: "Clear",
      t: "29"
    });

    expect(parsed).toMatchObject({
      ok: false
    });
  });
});
