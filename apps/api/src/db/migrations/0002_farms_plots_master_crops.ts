import type { Kysely } from "kysely";
import { sql } from "kysely";
import { seedMasterCrops } from "../seeds/master-crops.js";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS farms (
      id VARCHAR(32) NOT NULL,
      tenant_id VARCHAR(32) NOT NULL,
      name VARCHAR(160) NOT NULL,
      timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Jakarta',
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      KEY idx_farms_tenant_name (tenant_id, name),
      CONSTRAINT fk_farms_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants (id)
        ON DELETE RESTRICT ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(db);

  await sql`
    CREATE TABLE IF NOT EXISTS plots (
      id VARCHAR(32) NOT NULL,
      tenant_id VARCHAR(32) NOT NULL,
      farm_id VARCHAR(32) NOT NULL,
      name VARCHAR(160) NOT NULL,
      geometry_geojson JSON NOT NULL,
      area_m2 DECIMAL(18, 4) NOT NULL,
      area_ha DECIMAL(18, 8) NOT NULL,
      centroid_lat DECIMAL(11, 8) NOT NULL,
      centroid_lng DECIMAL(11, 8) NOT NULL,
      bbox_json JSON NOT NULL,
      adm4_code VARCHAR(32) NULL,
      mapping_status ENUM('verified', 'needs_review', 'unmapped') NOT NULL DEFAULT 'unmapped',
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      KEY idx_plots_tenant_farm (tenant_id, farm_id),
      KEY idx_plots_tenant_adm4 (tenant_id, adm4_code),
      CONSTRAINT fk_plots_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants (id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT fk_plots_farm
        FOREIGN KEY (farm_id) REFERENCES farms (id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT ck_plots_area_positive CHECK (area_m2 > 0 AND area_ha > 0)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(db);

  await sql`
    CREATE TABLE IF NOT EXISTS master_crops (
      code VARCHAR(48) NOT NULL,
      name_id VARCHAR(120) NOT NULL,
      name_en VARCHAR(120) NOT NULL,
      status ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
      source_url VARCHAR(512) NOT NULL,
      reviewer VARCHAR(160) NOT NULL,
      version VARCHAR(48) NOT NULL,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (code),
      KEY idx_master_crops_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(db);

  await sql`
    CREATE TABLE IF NOT EXISTS master_crop_thresholds (
      id VARCHAR(96) NOT NULL,
      crop_code VARCHAR(48) NOT NULL,
      metric VARCHAR(64) NOT NULL,
      unit VARCHAR(32) NOT NULL,
      lower_bound DECIMAL(14, 4) NULL,
      upper_bound DECIMAL(14, 4) NULL,
      growth_stage VARCHAR(120) NOT NULL,
      method VARCHAR(160) NOT NULL,
      soil_context VARCHAR(255) NULL,
      severity ENUM('info', 'warning', 'critical') NOT NULL,
      duration_minutes INT NOT NULL,
      hysteresis DECIMAL(10, 4) NOT NULL DEFAULT 0,
      source_url VARCHAR(512) NOT NULL,
      reviewer VARCHAR(160) NOT NULL,
      version VARCHAR(48) NOT NULL,
      status ENUM('draft', 'reviewed', 'verified', 'suspended') NOT NULL DEFAULT 'draft',
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY uq_master_crop_threshold_metric_stage (crop_code, metric, unit, growth_stage, method, version),
      KEY idx_master_crop_thresholds_status (status),
      CONSTRAINT fk_master_crop_thresholds_crop
        FOREIGN KEY (crop_code) REFERENCES master_crops (code)
        ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT ck_master_crop_threshold_bounds CHECK (lower_bound IS NOT NULL OR upper_bound IS NOT NULL),
      CONSTRAINT ck_master_crop_threshold_duration CHECK (duration_minutes > 0)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(db);

  await seedMasterCrops(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS master_crop_thresholds`.execute(db);
  await sql`DROP TABLE IF EXISTS master_crops`.execute(db);
  await sql`DROP TABLE IF EXISTS plots`.execute(db);
  await sql`DROP TABLE IF EXISTS farms`.execute(db);
}
