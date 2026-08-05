-- PAMILO Smart Farming GIS
-- Migration: 0003_devices_mqtt_dynamic_telemetry
-- Status: draft, not applied to production

CREATE TABLE IF NOT EXISTS devices (
  id VARCHAR(48) NOT NULL,
  tenant_id VARCHAR(32) NOT NULL,
  plot_id VARCHAR(32) NOT NULL,
  serial_no VARCHAR(96) NOT NULL,
  label VARCHAR(160) NULL,
  client_id VARCHAR(128) NOT NULL,
  mqtt_username VARCHAR(160) NOT NULL,
  credential_ref VARCHAR(96) NOT NULL,
  credential_fingerprint VARCHAR(32) NOT NULL,
  status ENUM('provisioned', 'active', 'revoked') NOT NULL DEFAULT 'provisioned',
  provisioned_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_seen_at TIMESTAMP(3) NULL,
  revoked_at TIMESTAMP(3) NULL,
  active_serial_no VARCHAR(96) GENERATED ALWAYS AS (
    CASE WHEN revoked_at IS NULL THEN serial_no ELSE NULL END
  ) STORED,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_devices_tenant_serial_active (tenant_id, active_serial_no),
  UNIQUE KEY uq_devices_mqtt_username (mqtt_username),
  UNIQUE KEY uq_devices_credential_ref (credential_ref),
  KEY idx_devices_tenant_plot_status (tenant_id, plot_id, status),
  KEY idx_devices_tenant_last_seen (tenant_id, last_seen_at),
  CONSTRAINT fk_devices_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_devices_plot
    FOREIGN KEY (plot_id) REFERENCES plots (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS device_mqtt_credentials (
  credential_ref VARCHAR(96) NOT NULL,
  tenant_id VARCHAR(32) NOT NULL,
  device_id VARCHAR(48) NOT NULL,
  password_hash CHAR(64) NOT NULL,
  hash_algorithm VARCHAR(32) NOT NULL DEFAULT 'sha256',
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  rotated_at TIMESTAMP(3) NULL,
  revoked_at TIMESTAMP(3) NULL,
  PRIMARY KEY (credential_ref),
  KEY idx_device_mqtt_credentials_device (tenant_id, device_id),
  CONSTRAINT fk_device_mqtt_credentials_device
    FOREIGN KEY (device_id) REFERENCES devices (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_device_mqtt_credentials_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS telemetry_metric_catalog (
  tenant_id VARCHAR(32) NOT NULL,
  device_id VARCHAR(48) NOT NULL,
  node_id VARCHAR(96) NOT NULL,
  metric_key VARCHAR(64) NOT NULL,
  label VARCHAR(120) NULL,
  unit VARCHAR(32) NOT NULL DEFAULT '',
  value_type ENUM('number', 'string', 'boolean', 'null') NOT NULL,
  source VARCHAR(32) NOT NULL DEFAULT 'mqtt',
  first_seen_at TIMESTAMP(3) NOT NULL,
  last_seen_at TIMESTAMP(3) NOT NULL,
  status ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
  PRIMARY KEY (tenant_id, device_id, node_id, metric_key),
  KEY idx_telemetry_metric_catalog_last_seen (tenant_id, last_seen_at),
  CONSTRAINT fk_telemetry_metric_catalog_device
    FOREIGN KEY (device_id) REFERENCES devices (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_telemetry_metric_catalog_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT ck_telemetry_metric_catalog_key CHECK (metric_key REGEXP '^[a-z][a-z0-9_]{0,63}$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS telemetry_metric_readings (
  id VARCHAR(64) NOT NULL,
  tenant_id VARCHAR(32) NOT NULL,
  plot_id VARCHAR(32) NOT NULL,
  device_id VARCHAR(48) NOT NULL,
  node_id VARCHAR(96) NOT NULL,
  metric_key VARCHAR(64) NOT NULL,
  ts TIMESTAMP(3) NOT NULL,
  seq BIGINT UNSIGNED NOT NULL DEFAULT 0,
  value_type ENUM('number', 'string', 'boolean', 'null') NOT NULL,
  value_number DECIMAL(20, 6) NULL,
  value_text VARCHAR(256) NULL,
  value_boolean TINYINT(1) NULL,
  unit VARCHAR(32) NOT NULL DEFAULT '',
  quality_flags_json JSON NOT NULL,
  raw_payload_hash CHAR(64) NOT NULL,
  received_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_telemetry_metric_readings_history (tenant_id, plot_id, metric_key, ts),
  KEY idx_telemetry_metric_readings_device_latest (tenant_id, device_id, ts),
  CONSTRAINT fk_telemetry_metric_readings_plot
    FOREIGN KEY (plot_id) REFERENCES plots (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_telemetry_metric_readings_device
    FOREIGN KEY (device_id) REFERENCES devices (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_telemetry_metric_readings_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT ck_telemetry_metric_readings_key CHECK (metric_key REGEXP '^[a-z][a-z0-9_]{0,63}$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
