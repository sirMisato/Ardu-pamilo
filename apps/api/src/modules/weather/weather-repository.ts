import type { WeatherSnapshot } from "@pamilo/shared";

export interface WeatherRepository {
  findByAdm4Code(adm4Code: string): WeatherSnapshot | null;
}

export class InMemoryWeatherRepository implements WeatherRepository {
  readonly #snapshots: WeatherSnapshot[];

  constructor(snapshots: WeatherSnapshot[] = defaultWeatherSnapshots()) {
    this.#snapshots = [...snapshots];
  }

  findByAdm4Code(adm4Code: string): WeatherSnapshot | null {
    return this.#snapshots.find((snapshot) => snapshot.adm4Code === adm4Code) ?? null;
  }
}

export function defaultWeatherSnapshots(): WeatherSnapshot[] {
  return [
    {
      source: "bmkg",
      attribution: "BMKG",
      adm4Code: "31.71.01.1001",
      analysisDate: "2026-08-03",
      fetchedAt: "2026-08-03T00:00:00Z",
      staleAfter: "2026-08-03T06:00:00Z",
      cacheStatus: "stale",
      forecast: [
        {
          utcDatetime: "2026-08-03T06:00:00Z",
          localDatetime: "2026-08-03T13:00:00+07:00",
          temperatureC: 29,
          humidityPct: 82,
          weatherDesc: "Hujan Ringan",
          weatherDescEn: "Light Rain",
          windSpeedKph: 8,
          windDirection: "SE",
          cloudCoverPct: 74,
          visibilityText: "> 10 km"
        },
        {
          utcDatetime: "2026-08-03T09:00:00Z",
          localDatetime: "2026-08-03T16:00:00+07:00",
          temperatureC: 28,
          humidityPct: 86,
          weatherDesc: "Berawan",
          weatherDescEn: "Cloudy",
          windSpeedKph: 6,
          windDirection: "E",
          cloudCoverPct: 82,
          visibilityText: "> 10 km"
        }
      ]
    }
  ];
}
