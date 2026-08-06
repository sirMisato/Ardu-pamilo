<template>
  <div class="relative h-[460px] min-h-[420px] overflow-hidden bg-[#0a1728]">
    <div ref="mapElement" class="h-full w-full"></div>

    <div class="pointer-events-none absolute left-4 top-4 z-[500] rounded-lg border border-white/10 bg-[#07111f]/90 px-3 py-2 text-xs text-slate-300 backdrop-blur">
      <div class="flex items-center gap-2">
        <span class="h-2 w-2 rounded-full" :class="telemetryStore.isConnected ? 'bg-field-mint' : 'bg-amber-200'"></span>
        <span>{{ connectionLabel }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import L, { type LatLngExpression, type Map, type Marker, type Polygon } from "leaflet";
import "leaflet/dist/leaflet.css";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useTelemetryStore } from "../../stores/telemetryStore";

const telemetryStore = useTelemetryStore();
const mapElement = ref<HTMLDivElement | null>(null);
const sensorDeviceId = "SensorNode01";
const farmCenter: LatLngExpression = [-6.9147, 107.6098];
const sensorPosition: LatLngExpression = [-6.91455, 107.6102];
const farmPolygon: LatLngExpression[] = [
  [-6.91535, 107.60885],
  [-6.91415, 107.60872],
  [-6.91392, 107.61035],
  [-6.91518, 107.61062]
];

let map: Map | null = null;
let marker: Marker | null = null;
let polygon: Polygon | null = null;

const connectionLabel = computed(() => {
  const state = telemetryStore.connectionState;
  if (state === "connected") {
    return "MQTT connected";
  }

  if (state === "reconnecting") {
    return "MQTT reconnecting";
  }

  if (state === "error") {
    return "MQTT offline, mock data active";
  }

  return "MQTT connecting";
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
    telemetryStore.deviceById(sensorDeviceId)?.online,
    telemetryStore.latestMetricsForDevice(sensorDeviceId).map((metric) => `${metric.key}:${metric.displayValue}`).join("|")
  ],
  () => {
    refreshPopup();
  }
);

function initializeMap(): void {
  if (!mapElement.value || map) {
    return;
  }

  map = L.map(mapElement.value, {
    attributionControl: true,
    scrollWheelZoom: true,
    zoomControl: true
  }).setView(farmCenter, 17);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(map);

  polygon = L.polygon(farmPolygon, {
    color: "#8ef0ca",
    fillColor: "#a7e8af",
    fillOpacity: 0.14,
    opacity: 0.9,
    weight: 2
  }).addTo(map);

  marker = L.marker(sensorPosition, {
    icon: createSensorIcon()
  }).addTo(map);
  marker.bindPopup(createPopupHtml(), {
    className: "pamilo-sensor-popup",
    maxWidth: 320,
    minWidth: 260
  });

  polygon.bindTooltip("Kebun Utara / Plot A", {
    direction: "top",
    sticky: true
  });

  map.fitBounds(polygon.getBounds(), {
    padding: [28, 28]
  });
}

function refreshPopup(): void {
  if (!marker) {
    return;
  }

  marker.setIcon(createSensorIcon());
  marker.setPopupContent(createPopupHtml());
}

function createSensorIcon(): L.DivIcon {
  const device = telemetryStore.deviceById(sensorDeviceId);
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

function createPopupHtml(): string {
  const device = telemetryStore.deviceById(sensorDeviceId);
  const metrics = telemetryStore.latestMetricsForDevice(sensorDeviceId);
  const statusText = device?.online ? "Online" : "Offline";
  const statusClass = device?.online ? "online" : "offline";
  const lastSeen = device?.lastSeenAt ? formatTime(device.lastSeenAt) : "No telemetry yet";
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
          <p class="sensor-title">SensorNode01</p>
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
</script>

<style scoped>
:deep(.leaflet-container) {
  width: 100%;
  height: 100%;
  background: #0a1728;
  color: #dbeafe;
  font-family: inherit;
}

:deep(.leaflet-control-attribution) {
  background: rgb(7 17 31 / 86%);
  color: #cbd5e1;
  font-size: 11px;
}

:deep(.leaflet-control-attribution a) {
  color: #8ef0ca;
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
  border: 1px solid rgb(255 255 255 / 24%);
  border-radius: 999px;
  box-shadow: 0 16px 36px rgb(0 0 0 / 32%);
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
  border: 1px solid rgb(142 240 202 / 18%);
  border-radius: 8px;
  background: #07111f;
  color: #ecfff7;
  box-shadow: 0 24px 70px rgb(2 8 23 / 42%);
}

:deep(.pamilo-sensor-popup .leaflet-popup-content) {
  width: 280px !important;
  margin: 0;
}

:deep(.pamilo-sensor-popup .leaflet-popup-tip) {
  background: #07111f;
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
  color: #fff;
  font-size: 14px;
  font-weight: 700;
}

:deep(.sensor-subtitle) {
  margin: 3px 0 0;
  color: #94a3b8;
  font-size: 12px;
}

:deep(.status-pill) {
  border-radius: 999px;
  padding: 4px 9px;
  font-size: 12px;
  font-weight: 700;
}

:deep(.status-pill.online) {
  background: rgb(142 240 202 / 12%);
  color: #8ef0ca;
}

:deep(.status-pill.offline) {
  background: rgb(251 113 133 / 12%);
  color: #fda4af;
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
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 8px;
  background: rgb(255 255 255 / 5%);
  padding: 8px 10px;
}

:deep(.metric-row span) {
  color: #94a3b8;
  font-size: 12px;
}

:deep(.metric-row strong) {
  color: #fff;
  font-size: 13px;
}

:deep(.empty-metrics) {
  margin: 0;
  color: #94a3b8;
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
  border: 1px solid rgb(142 240 202 / 28%);
  border-radius: 8px;
  background: rgb(142 240 202 / 10%);
  color: #8ef0ca;
  font-size: 12px;
  font-weight: 700;
}
</style>
