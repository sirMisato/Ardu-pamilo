import type { Kysely } from "kysely";
import { sql } from "kysely";

export interface MasterCropSeed {
  code: string;
  nameId: string;
  nameEn: string;
  sourceUrl: string;
}

export interface MasterCropThresholdSeed {
  id: string;
  cropCode: string;
  metric: string;
  unit: string;
  lowerBound: number;
  upperBound: number;
  growthStage: string;
  method: string;
  soilContext: string;
  sourceUrl: string;
}

export const masterCropSeeds: readonly MasterCropSeed[] = [
  {
    code: "padi",
    nameId: "Padi",
    nameEn: "Rice",
    sourceUrl: "https://repository.pertanian.go.id/bitstream/123456789/12986/1/Teknologi%20Budidaya%20Padi.pdf"
  },
  {
    code: "jagung",
    nameId: "Jagung",
    nameEn: "Corn",
    sourceUrl: "https://bbpplembang.bppsdmp.pertanian.go.id/publikasi-detail/1149"
  },
  {
    code: "bawang_merah",
    nameId: "Bawang Merah",
    nameEn: "Shallots",
    sourceUrl: "https://distankan.bulelengkab.go.id/informasi/detail/berita/60_pengukuran-ph-tanah-persiapan-tanam-bawang-merah"
  },
  {
    code: "cabai",
    nameId: "Cabai",
    nameEn: "Chili",
    sourceUrl: "https://icl-growingsolutions.com/agriculture/crops/pepper/"
  },
  {
    code: "sawit",
    nameId: "Sawit",
    nameEn: "Palm Oil",
    sourceUrl: "https://ecocrop.apps.fao.org/ecocrop/srv/en/dataSheet?id=972"
  }
];

export const masterCropThresholdSeeds: readonly MasterCropThresholdSeed[] = [
  buildSoilPhThreshold("padi", 5.5, 7.5, masterCropSeeds[0]?.sourceUrl ?? ""),
  buildSoilPhThreshold("jagung", 5.5, 7.0, masterCropSeeds[1]?.sourceUrl ?? ""),
  buildSoilPhThreshold("bawang_merah", 5.6, 6.5, masterCropSeeds[2]?.sourceUrl ?? ""),
  buildSoilPhThreshold("cabai", 6.0, 6.8, masterCropSeeds[3]?.sourceUrl ?? ""),
  buildSoilPhThreshold("sawit", 4.5, 6.0, masterCropSeeds[4]?.sourceUrl ?? "")
];

export async function seedMasterCrops(db: Kysely<unknown>): Promise<void> {
  for (const crop of masterCropSeeds) {
    await sql`
      INSERT INTO master_crops (code, name_id, name_en, status, source_url, reviewer, version)
      VALUES (${crop.code}, ${crop.nameId}, ${crop.nameEn}, 'active', ${crop.sourceUrl}, 'agronomy-review-required', 'phase3-2026-08')
      ON DUPLICATE KEY UPDATE
        name_id = VALUES(name_id),
        name_en = VALUES(name_en),
        status = VALUES(status),
        source_url = VALUES(source_url),
        reviewer = VALUES(reviewer),
        version = VALUES(version)
    `.execute(db);
  }

  for (const threshold of masterCropThresholdSeeds) {
    await sql`
      INSERT INTO master_crop_thresholds (
        id,
        crop_code,
        metric,
        unit,
        lower_bound,
        upper_bound,
        growth_stage,
        method,
        soil_context,
        severity,
        duration_minutes,
        hysteresis,
        source_url,
        reviewer,
        version,
        status
      )
      VALUES (
        ${threshold.id},
        ${threshold.cropCode},
        ${threshold.metric},
        ${threshold.unit},
        ${threshold.lowerBound},
        ${threshold.upperBound},
        ${threshold.growthStage},
        ${threshold.method},
        ${threshold.soilContext},
        'warning',
        1440,
        0.2,
        ${threshold.sourceUrl},
        'agronomy-review-required',
        'phase3-2026-08',
        'draft'
      )
      ON DUPLICATE KEY UPDATE
        lower_bound = VALUES(lower_bound),
        upper_bound = VALUES(upper_bound),
        soil_context = VALUES(soil_context),
        source_url = VALUES(source_url),
        reviewer = VALUES(reviewer),
        version = VALUES(version),
        status = VALUES(status)
    `.execute(db);
  }
}

function buildSoilPhThreshold(
  cropCode: string,
  lowerBound: number,
  upperBound: number,
  sourceUrl: string
): MasterCropThresholdSeed {
  return {
    id: `${cropCode.replaceAll("_", "-")}-soil-ph-phase3`,
    cropCode,
    metric: "soil_ph",
    unit: "ph",
    lowerBound,
    upperBound,
    growthStage: "initial_all_stage_screening",
    method: "soil_ph_h2o_or_calibrated_field_meter",
    soilContext: "Topsoil screening; local lab confirmation required before production alerting.",
    sourceUrl
  };
}
