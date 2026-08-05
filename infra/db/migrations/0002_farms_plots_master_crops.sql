-- PAMILO Smart Farming GIS
-- Migration: 0002_farms_plots_master_crops
-- Status: draft, not applied to production

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO master_crops (code, name_id, name_en, status, source_url, reviewer, version)
VALUES
  ('padi', 'Padi', 'Rice', 'active', 'https://repository.pertanian.go.id/bitstream/123456789/12986/1/Teknologi%20Budidaya%20Padi.pdf', 'agronomy-review-required', 'phase3-2026-08'),
  ('jagung', 'Jagung', 'Corn', 'active', 'https://bbpplembang.bppsdmp.pertanian.go.id/publikasi-detail/1149', 'agronomy-review-required', 'phase3-2026-08'),
  ('bawang_merah', 'Bawang Merah', 'Shallots', 'active', 'https://distankan.bulelengkab.go.id/informasi/detail/berita/60_pengukuran-ph-tanah-persiapan-tanam-bawang-merah', 'agronomy-review-required', 'phase3-2026-08'),
  ('cabai', 'Cabai', 'Chili', 'active', 'https://icl-growingsolutions.com/agriculture/crops/pepper/', 'agronomy-review-required', 'phase3-2026-08'),
  ('sawit', 'Sawit', 'Palm Oil', 'active', 'https://ecocrop.apps.fao.org/ecocrop/srv/en/dataSheet?id=972', 'agronomy-review-required', 'phase3-2026-08')
ON DUPLICATE KEY UPDATE
  name_id = VALUES(name_id),
  name_en = VALUES(name_en),
  status = VALUES(status),
  source_url = VALUES(source_url),
  reviewer = VALUES(reviewer),
  version = VALUES(version);

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
VALUES
  ('padi-soil-ph-phase3', 'padi', 'soil_ph', 'ph', 5.5000, 7.5000, 'initial_all_stage_screening', 'soil_ph_h2o_or_calibrated_field_meter', 'Topsoil screening; local lab confirmation required before production alerting.', 'warning', 1440, 0.2000, 'https://repository.pertanian.go.id/bitstream/123456789/12986/1/Teknologi%20Budidaya%20Padi.pdf', 'agronomy-review-required', 'phase3-2026-08', 'draft'),
  ('jagung-soil-ph-phase3', 'jagung', 'soil_ph', 'ph', 5.5000, 7.0000, 'initial_all_stage_screening', 'soil_ph_h2o_or_calibrated_field_meter', 'Topsoil screening; local lab confirmation required before production alerting.', 'warning', 1440, 0.2000, 'https://bbpplembang.bppsdmp.pertanian.go.id/publikasi-detail/1149', 'agronomy-review-required', 'phase3-2026-08', 'draft'),
  ('bawang-merah-soil-ph-phase3', 'bawang_merah', 'soil_ph', 'ph', 5.6000, 6.5000, 'initial_all_stage_screening', 'soil_ph_h2o_or_calibrated_field_meter', 'Topsoil screening; local lab confirmation required before production alerting.', 'warning', 1440, 0.2000, 'https://distankan.bulelengkab.go.id/informasi/detail/berita/60_pengukuran-ph-tanah-persiapan-tanam-bawang-merah', 'agronomy-review-required', 'phase3-2026-08', 'draft'),
  ('cabai-soil-ph-phase3', 'cabai', 'soil_ph', 'ph', 6.0000, 6.8000, 'initial_all_stage_screening', 'soil_ph_h2o_or_calibrated_field_meter', 'Topsoil screening; local lab confirmation required before production alerting.', 'warning', 1440, 0.2000, 'https://icl-growingsolutions.com/agriculture/crops/pepper/', 'agronomy-review-required', 'phase3-2026-08', 'draft'),
  ('sawit-soil-ph-phase3', 'sawit', 'soil_ph', 'ph', 4.5000, 6.0000, 'initial_all_stage_screening', 'soil_ph_h2o_or_calibrated_field_meter', 'Topsoil screening; local lab confirmation required before production alerting.', 'warning', 1440, 0.2000, 'https://ecocrop.apps.fao.org/ecocrop/srv/en/dataSheet?id=972', 'agronomy-review-required', 'phase3-2026-08', 'draft')
ON DUPLICATE KEY UPDATE
  lower_bound = VALUES(lower_bound),
  upper_bound = VALUES(upper_bound),
  soil_context = VALUES(soil_context),
  source_url = VALUES(source_url),
  reviewer = VALUES(reviewer),
  version = VALUES(version),
  status = VALUES(status);
