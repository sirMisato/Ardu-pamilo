import type { ColumnType, Generated, Insertable, Selectable, Updateable } from "kysely";

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;
export type DateOnly = ColumnType<Date | string, Date | string | undefined, Date | string>;
export type JsonColumn = ColumnType<JsonValue, JsonValue | string, JsonValue | string>;

export type TenantLicenseStatus = "trial" | "active" | "suspended" | "revoked";
export type DeviceStatus = "online" | "offline" | "maintenance";
export type CropStatus = "active" | "draft" | "archived";
export type TenantUserRole = "tenant_user";
export type TenantUserStatus = "active" | "inactive";

export interface TenantsTable {
  id: string;
  account_name: string;
  owner_email: string;
  password_hash: string;
  license_status: TenantLicenseStatus;
  license_expires_at: Timestamp | null;
  max_plots: number;
  max_devices: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface PlotsTable {
  id: string;
  tenant_id: string;
  name: string;
  area_hectares: number | null;
  crop_id: string | null;
  polygon_geojson: JsonColumn;
  bmkg_adm4_code: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface DevicesTable {
  id: string;
  tenant_id: string;
  plot_id: string;
  device_uid: string;
  display_name: string;
  status: DeviceStatus;
  telemetry_topic: string;
  mqtt_username: string | null;
  last_seen_at: Timestamp | null;
  metadata_json: JsonColumn | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface MasterCropsTable {
  id: string;
  tenant_id: string;
  name: string;
  latin_name: string | null;
  planting_period_days: number | null;
  planting_date: DateOnly | null;
  varieties_json: JsonColumn | null;
  description: string | null;
  status: CropStatus;
  ph_min: number | null;
  ph_max: number | null;
  moisture_min: number | null;
  moisture_max: number | null;
  nitrogen_min: number | null;
  nitrogen_max: number | null;
  phosphorus_min: number | null;
  phosphorus_max: number | null;
  potassium_min: number | null;
  potassium_max: number | null;
  threshold_source: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface TelemetryDataTable {
  id: Generated<string>;
  tenant_id: string;
  device_id: string;
  topic: string;
  metric_keys_json: JsonColumn;
  payload_json: JsonColumn;
  received_at: Timestamp;
  created_at: Timestamp;
}

export interface TenantSettingsTable {
  tenant_id: string;
  display_preferences_json: JsonColumn;
  notification_preferences_json: JsonColumn;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface TenantUsersTable {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  password_hash: string;
  role: TenantUserRole;
  status: TenantUserStatus;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Database {
  devices: DevicesTable;
  master_crops: MasterCropsTable;
  plots: PlotsTable;
  telemetry_data: TelemetryDataTable;
  tenant_settings: TenantSettingsTable;
  tenant_users: TenantUsersTable;
  tenants: TenantsTable;
}

export type Tenant = Selectable<TenantsTable>;
export type NewTenant = Insertable<TenantsTable>;
export type TenantUpdate = Updateable<TenantsTable>;

export type Plot = Selectable<PlotsTable>;
export type NewPlot = Insertable<PlotsTable>;
export type PlotUpdate = Updateable<PlotsTable>;

export type Device = Selectable<DevicesTable>;
export type NewDevice = Insertable<DevicesTable>;
export type DeviceUpdate = Updateable<DevicesTable>;

export type MasterCrop = Selectable<MasterCropsTable>;
export type NewMasterCrop = Insertable<MasterCropsTable>;
export type MasterCropUpdate = Updateable<MasterCropsTable>;

export type TelemetryRecord = Selectable<TelemetryDataTable>;
export type NewTelemetryRecord = Insertable<TelemetryDataTable>;

export type TenantSettings = Selectable<TenantSettingsTable>;
export type NewTenantSettings = Insertable<TenantSettingsTable>;
export type TenantSettingsUpdate = Updateable<TenantSettingsTable>;

export type TenantUser = Selectable<TenantUsersTable>;
export type NewTenantUser = Insertable<TenantUsersTable>;
export type TenantUserUpdate = Updateable<TenantUsersTable>;
