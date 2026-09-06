<template>
  <div class="relative h-[460px] min-h-[420px] overflow-hidden rounded-[2rem] bg-slate-100">
    <div ref="mapElement" class="h-full w-full"></div>

    <div class="absolute right-4 top-4 z-[500] flex rounded-2xl border border-white/80 bg-white/70 p-1 text-xs font-semibold text-slate-700 shadow-md backdrop-blur-md">
      <button
        v-for="layer in mapLayerOptions"
        :key="layer.key"
        type="button"
        class="inline-flex items-center gap-1.5 rounded-full px-3 py-2 transition"
        :class="activeMapLayer === layer.key ? 'bg-emerald-300 text-slate-800 shadow-sm' : 'hover:bg-white/80 hover:text-teal-700'"
        :aria-pressed="activeMapLayer === layer.key"
        :title="layer.title"
        @click="setActiveMapLayer(layer.key)"
      >
        <svg v-if="layer.key === 'street'" class="h-3.5 w-3.5" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 18 3 21V6l6-3 6 3 6-3v15l-6 3-6-3Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
          <path d="M9 3v15M15 6v15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        <svg v-else class="h-3.5 w-3.5" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 14c4.8-8 11.2-8 16 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <path d="M7.5 12.2 5 9.7M16.5 12.2 19 9.7M9.5 10.8 8.2 7.4M14.5 10.8l1.3-3.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <circle cx="12" cy="15" r="3" fill="none" stroke="currentColor" stroke-width="2" />
        </svg>
        {{ layer.label }}
      </button>
    </div>

    <div class="pointer-events-none absolute left-4 top-4 z-[500] rounded-2xl border border-white/80 bg-white/70 px-3 py-2 text-xs font-semibold text-slate-700 shadow-md backdrop-blur-md">
      <div class="flex items-center gap-2">
        <span class="h-2 w-2 rounded-full" :class="connectionToneClass"></span>
        <span>{{ connectionLabel }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import L, { type LatLngExpression, type Map, type Marker, type Polygon, type TileLayer } from "leaflet";
import "leaflet/dist/leaflet.css";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useTenantProfileStore } from "../../stores/tenantProfileStore";
import { useTelemetryStore } from "../../stores/telemetryStore";

type MapLayerKey = "street" | "satellite";

const telemetryStore = useTelemetryStore();
const tenantProfileStore = useTenantProfileStore();
const mapElement = ref<HTMLDivElement | null>(null);
const activeMapLayer = ref<MapLayerKey>("street");
const defaultCenter: LatLngExpression = [-7.5666, 110.8167];

let map: Map | null = null;
let baseLayers: Record<MapLayerKey, TileLayer> | null = null;
let marker: Marker | null = null;
let polygon: Polygon | null = null;

const activeDeviceId = computed(() => Object.keys(telemetryStore.devices)[0] ?? "");
const fieldTooltip = computed(() => tenantProfileStore.activeFieldLabel);
const activeFieldPolygon = computed(() => extractPolygonPoints(tenantProfileStore.activeField?.polygonGeojson));
const activePolygonCenter = computed(() => getPolygonCenter(activeFieldPolygon.value));
const activeSensorPosition = computed<LatLngExpression | null>(() => {
  const device = activeDeviceId.value ? telemetryStore.deviceById(activeDeviceId.value) : null;
  if (device?.latitude !== null && device?.longitude !== null && device?.latitude !== undefined && device?.longitude !== undefined) {
    return [device.latitude, device.longitude];
  }

  return activePolygonCenter.value;
});

const mapLayerOptions: Array<{ key: MapLayerKey; label: string; title: string }> = [
  {
    key: "street",
    label: "Peta",
    title: "Tampilkan peta jalan"
  },
  {
    key: "satellite",
    label: "Satelit",
    title: "Tampilkan citra satelit"
  }
];

const connectionLabel = computed(() => {
  const state = telemetryStore.connectionState;
  if (state === "connected") {
    return "Realtime backend aktif";
  }

  if (state === "reconnecting") {
    return "Stream backend reconnecting";
  }

  if (state === "connecting") {
    return "Stream backend connecting";
  }

  if (state === "history") {
    return telemetryStore.deviceCount > 0 ? "Telemetry tersinkron" : "Menunggu telemetry";
  }

  if (state === "error") {
    return telemetryStore.errorMessage ?? "Stream backend error";
  }

  if (state === "offline") {
    return "Stream backend offline";
  }

  return "Realtime standby";
});

const connectionToneClass = computed(() => {
  const state = telemetryStore.connectionState;
  if (state === "connected" || (state === "history" && telemetryStore.onlineDeviceCount > 0)) {
    return "bg-field-mint";
  }

  if (state === "error" || state === "offline") {
    return "bg-rose-300";
  }

  return "bg-amber-200";
});

onMounted(() => {
  initializeMap();
});

onBeforeUnmount(() => {
  map?.remove();
  map = null;
  marker = null;
  polygon = null;
});

watch(
  () => [
    telemetryStore.connectionState,
    activeDeviceId.value,
    activeSensorPosition.value?.toString() ?? "",
    activeDeviceId.value ? telemetryStore.deviceById(activeDeviceId.value)?.online : false,
    activeDeviceId.value ? telemetryStore.deviceById(activeDeviceId.value)?.lastSeenAt : "",
    activeDeviceId.value ? telemetryStore.latestMetricsForDevice(activeDeviceId.value).map((metric) => `${metric.key}:${metric.displayValue}`).join("|") : ""
  ],
  () => {
    refreshPopup();
  }
);

watch(fieldTooltip, (value) => {
  polygon?.setTooltipContent(value);
});

watch(activeFieldPolygon, () => {
  renderFieldPolygon();
}, {
  deep: true
});

function initializeMap(): void {
  if (!mapElement.value || map) {
    return;
  }

  map = L.map(mapElement.value, {
    attributionControl: true,
    scrollWheelZoom: true,
    zoomControl: true
  }).setView(defaultCenter, 6);

  baseLayers = createBaseLayers();
  setActiveMapLayer(activeMapLayer.value);
  renderFieldPolygon();
  refreshPopup();
}

function createBaseLayers(): Record<MapLayerKey, TileLayer> {
  return {
    satellite: L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      attribution: "Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community",
      maxNativeZoom: 19,
      maxZoom: 20
    }),
    street: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    })
  };
}

function setActiveMapLayer(layerKey: MapLayerKey): void {
  activeMapLayer.value = layerKey;

  if (!map || !baseLayers) {
    return;
  }

  for (const layer of Object.values(baseLayers)) {
    if (map.hasLayer(layer)) {
      map.removeLayer(layer);
    }
  }

  baseLayers[layerKey].addTo(map);
}

function refreshPopup(): void {
  if (!map) {
    return;
  }

  const deviceId = activeDeviceId.value;
  const sensorPosition = activeSensorPosition.value;
  if (!deviceId || !sensorPosition) {
    marker?.remove();
    marker = null;
    return;
  }

  if (!marker) {
    marker = L.marker(sensorPosition, {
      icon: createSensorIcon(deviceId)
    }).addTo(map);
    marker.bindPopup(createPopupHtml(deviceId), {
      className: "pamilo-sensor-popup",
      maxWidth: 320,
      minWidth: 260
    });
  }

  marker.setLatLng(sensorPosition);
  marker.setIcon(createSensorIcon());
  marker.setPopupContent(createPopupHtml(deviceId));
}

function renderFieldPolygon(): void {
  if (!map) {
    return;
  }

  polygon?.remove();
  polygon = null;

  const polygonPoints = activeFieldPolygon.value;
  if (polygonPoints.length < 3) {
    map.setView(defaultCenter, 6);
    refreshPopup();
    return;
  }

  polygon = L.polygon(polygonPoints, {
    color: "#8ef0ca",
    fillColor: "#a7e8af",
    fillOpacity: 0.14,
    opacity: 0.9,
    weight: 2
  }).addTo(map);

  polygon.bindTooltip(fieldTooltip.value, {
    direction: "top",
    sticky: true
  });

  map.fitBounds(polygon.getBounds(), {
    padding: [28, 28]
  });
  refreshPopup();
}

function createSensorIcon(deviceId = activeDeviceId.value): L.DivIcon {
  const device = telemetryStore.deviceById(deviceId);
  const online = device?.online ?? false;
  const toneClass = online ? "sensor-online" : "sensor-offline";

  return L.divIcon({
    className: "pamilo-sensor-marker",
    html: `<span class="${toneClass}"><span></span></span>`,
    iconAnchor: [18, 18],
    iconSize: [36, 36],
    popupAnchor: [0, -18]
  });
}

function createPopupHtml(deviceId: string): string {
  const device = telemetryStore.deviceById(deviceId);
  const metrics = telemetryStore.latestMetricsForDevice(deviceId);
  const statusText = device?.online ? "Online" : "Offline";
  const statusClass = device?.online ? "online" : "offline";
  const lastSeen = device?.lastSeenAt ? `Update terakhir ${formatTime(device.lastSeenAt)}` : "No telemetry yet";
  const metricRows = metrics.length > 0
    ? metrics.map((metric) => `
      <div class="metric-row">
        <span>${escapeHtml(metric.label)}</span>
        <strong>${escapeHtml(metric.displayValue)}</strong>
      </div>
    `).join("")
    : `<p class="empty-metrics">Waiting for MQTT telemetry.</p>`;

  return `
    <section class="sensor-popup">
      <div class="sensor-popup-header">
        <div>
          <p class="sensor-title">${escapeHtml(deviceId)}</p>
          <p class="sensor-subtitle">${escapeHtml(lastSeen)}</p>
        </div>
        <span class="status-pill ${statusClass}">${statusText}</span>
      </div>
      <div class="metric-list">${metricRows}</div>
      <div class="popup-actions">
        <button type="button">Details</button>
        <button type="button">Laporan</button>
      </div>
    </section>
  `;
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "short",
    timeStyle: "medium"
  }).format(new Date(value));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function extractPolygonPoints(value: unknown): LatLngExpression[] {
  const geometry = readGeometry(value);
  if (!geometry || geometry.type !== "Polygon" || !Array.isArray(geometry.coordinates)) {
    return [];
  }

  const ring = geometry.coordinates[0];
  if (!Array.isArray(ring)) {
    return [];
  }

  const withoutClosingPoint = ring.filter((coordinate, index) => {
    if (index !== ring.length - 1) {
      return true;
    }

    const first = ring[0];
    return !Array.isArray(first)
      || !Array.isArray(coordinate)
      || first[0] !== coordinate[0]
      || first[1] !== coordinate[1];
  });

  return withoutClosingPoint.flatMap((coordinate) => {
    if (!Array.isArray(coordinate) || coordinate.length < 2) {
      return [];
    }

    const [lng, lat] = coordinate.map(Number);
    return Number.isFinite(lat) && Number.isFinite(lng) ? [[lat, lng] as LatLngExpression] : [];
  });
}

function getPolygonCenter(points: LatLngExpression[]): LatLngExpression | null {
  if (points.length < 3) {
    return null;
  }

  const bounds = L.latLngBounds(points);
  const center = bounds.getCenter();
  return [center.lat, center.lng];
}

function readGeometry(value: unknown): { coordinates?: unknown; type?: unknown } | null {
  if (!isRecord(value)) {
    return null;
  }

  if (value.type === "Feature" && isRecord(value.geometry)) {
    return value.geometry;
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
</script>

<style scoped>
:deep(.leaflet-container) {
  width: 100%;
  height: 100%;
  background: #f8fafc;
  color: #334155;
  font-family: inherit;
}

:deep(.leaflet-control-attribution) {
  border-radius: 12px 0 0;
  background: rgb(255 255 255 / 80%);
  color: #475569;
  font-size: 11px;
  backdrop-filter: blur(12px);
}

:deep(.leaflet-control-attribution a) {
  color: #0f766e;
}

:deep(.pamilo-sensor-marker) {
  background: transparent;
  border: 0;
}

:deep(.pamilo-sensor-marker > span) {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1px solid rgb(255 255 255 / 80%);
  border-radius: 999px;
  box-shadow: 0 12px 30px rgb(15 23 42 / 18%);
}

:deep(.pamilo-sensor-marker > span > span) {
  width: 14px;
  height: 14px;
  border-radius: 999px;
}

:deep(.sensor-online) {
  background: rgb(142 240 202 / 22%);
}

:deep(.sensor-online > span) {
  background: #8ef0ca;
  box-shadow: 0 0 0 7px rgb(142 240 202 / 14%);
}

:deep(.sensor-offline) {
  background: rgb(251 113 133 / 20%);
}

:deep(.sensor-offline > span) {
  background: #fda4af;
  box-shadow: 0 0 0 7px rgb(253 164 175 / 12%);
}

:deep(.pamilo-sensor-popup .leaflet-popup-content-wrapper) {
  overflow: hidden;
  border: 1px solid rgb(255 255 255 / 80%);
  border-radius: 24px;
  background: rgb(255 255 255 / 82%);
  color: #334155;
  box-shadow: 0 24px 70px rgb(15 23 42 / 14%);
  backdrop-filter: blur(18px);
}

:deep(.pamilo-sensor-popup .leaflet-popup-content) {
  width: 280px !important;
  margin: 0;
}

:deep(.pamilo-sensor-popup .leaflet-popup-tip) {
  background: rgb(255 255 255 / 82%);
}

:deep(.sensor-popup) {
  padding: 14px;
}

:deep(.sensor-popup-header) {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

:deep(.sensor-title) {
  margin: 0;
  color: #1e293b;
  font-size: 14px;
  font-weight: 700;
}

:deep(.sensor-subtitle) {
  margin: 3px 0 0;
  color: #64748b;
  font-size: 12px;
}

:deep(.status-pill) {
  border-radius: 999px;
  padding: 4px 9px;
  font-size: 12px;
  font-weight: 700;
}

:deep(.status-pill.online) {
  background: rgb(45 212 191 / 12%);
  color: #0f766e;
}

:deep(.status-pill.offline) {
  background: rgb(251 113 133 / 12%);
  color: #be123c;
}

:deep(.metric-list) {
  display: grid;
  gap: 8px;
  margin-top: 14px;
}

:deep(.metric-row) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid rgb(255 255 255 / 80%);
  border-radius: 16px;
  background: rgb(255 255 255 / 60%);
  padding: 8px 10px;
}

:deep(.metric-row span) {
  color: #64748b;
  font-size: 12px;
}

:deep(.metric-row strong) {
  color: #1e293b;
  font-size: 13px;
}

:deep(.empty-metrics) {
  margin: 0;
  color: #64748b;
  font-size: 12px;
}

:deep(.popup-actions) {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}

:deep(.popup-actions button) {
  min-height: 34px;
  flex: 1;
  border: 1px solid rgb(45 212 191 / 28%);
  border-radius: 14px;
  background: rgb(45 212 191 / 10%);
  color: #0f766e;
  font-size: 12px;
  font-weight: 700;
}
</style>
