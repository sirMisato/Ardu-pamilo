<template>
  <div class="space-y-3">
    <div class="relative h-[300px] overflow-hidden rounded-xl border border-slate-200 bg-slate-50 md:h-[500px]">
      <div ref="mapElement" class="h-full w-full"></div>

      <div class="absolute right-3 top-3 z-[500] flex flex-wrap gap-2 rounded-full border border-white/10 bg-[#07111f]/90 p-1 text-xs font-semibold text-slate-300 shadow-xl shadow-slate-950/25 backdrop-blur">
        <button
          v-for="layer in mapLayerOptions"
          :key="layer.key"
          class="rounded-full px-3 py-2 transition"
          :class="activeMapLayer === layer.key ? 'bg-field-mint text-[#07111f]' : 'hover:bg-white/10 hover:text-white'"
          type="button"
          @click.stop="setActiveMapLayer(layer.key)"
        >
          {{ layer.label }}
        </button>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div class="flex flex-wrap gap-2">
        <button
          class="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white"
          type="button"
          @click="emit('cancel')"
        >
          Kembali
        </button>
        <button
          class="rounded-lg border border-field-mint/30 px-3 py-2 text-xs font-semibold text-field-mint transition hover:bg-field-mint/10 disabled:opacity-50"
          :disabled="points.length === 0"
          type="button"
          @click="undoPoint"
        >
          Undo
        </button>
        <button
          class="rounded-lg border border-rose-300/30 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-300/10 disabled:opacity-50"
          :disabled="points.length === 0"
          type="button"
          @click="clearPoints"
        >
          Clear
        </button>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <span class="rounded-lg border border-white/10 bg-[#07111f] px-3 py-2 text-xs text-slate-300">
          {{ points.length }} titik
        </span>
        <button
          class="rounded-lg bg-field-green px-4 py-2 text-xs font-semibold text-[#102016] transition hover:bg-field-mint disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="!canSave"
          type="button"
          @click="savePolygon"
        >
          Simpan Polygon
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import L, { type LatLngExpression, type Map, type Polygon, type TileLayer } from "leaflet";
import "leaflet/dist/leaflet.css";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

type MapLayerKey = "street" | "satellite";
type LatLngTuple = [number, number];

const props = defineProps<{
  modelValue: unknown;
}>();

const emit = defineEmits<{
  cancel: [];
  save: [value: Record<string, unknown>];
  "update:modelValue": [value: Record<string, unknown>];
}>();

const mapElement = ref<HTMLDivElement | null>(null);
const activeMapLayer = ref<MapLayerKey>("satellite");
const points = ref<LatLngTuple[]>([]);
const defaultCenter: LatLngExpression = [-7.5666, 110.8167];

let map: Map | null = null;
let baseLayers: Record<MapLayerKey, TileLayer> | null = null;
let polygonLayer: Polygon | null = null;
let pointLayerGroup: L.LayerGroup | null = null;

const mapLayerOptions: Array<{ key: MapLayerKey; label: string }> = [
  { key: "satellite", label: "Satelit" },
  { key: "street", label: "Peta" }
];
const canSave = computed(() => points.value.length >= 3);

onMounted(async () => {
  await nextTick();
  initializeMap();
});

onBeforeUnmount(() => {
  map?.remove();
  map = null;
  polygonLayer = null;
  pointLayerGroup = null;
});

watch(() => props.modelValue, (value) => {
  const nextPoints = extractPolygonPoints(value);
  points.value = nextPoints;
  renderPolygon();
}, {
  deep: true,
  immediate: true
});

function initializeMap(): void {
  if (!mapElement.value || map) {
    return;
  }

  map = L.map(mapElement.value, {
    attributionControl: true,
    scrollWheelZoom: true,
    zoomControl: true
  }).setView(defaultCenter, 16);

  baseLayers = createBaseLayers();
  setActiveMapLayer(activeMapLayer.value);
  pointLayerGroup = L.layerGroup().addTo(map);

  map.on("click", (event) => {
    points.value = [...points.value, [event.latlng.lat, event.latlng.lng]];
    syncDraftPolygon();
    renderPolygon();
  });

  renderPolygon();
  window.setTimeout(() => map?.invalidateSize(), 80);
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

function undoPoint(): void {
  points.value = points.value.slice(0, -1);
  syncDraftPolygon();
  renderPolygon();
}

function clearPoints(): void {
  points.value = [];
  syncDraftPolygon();
  renderPolygon();
}

function savePolygon(): void {
  if (!canSave.value) {
    return;
  }

  const polygonGeojson = toGeoJson(points.value);
  emit("update:modelValue", polygonGeojson);
  emit("save", polygonGeojson);
}

function syncDraftPolygon(): void {
  emit("update:modelValue", toGeoJson(points.value));
}

function renderPolygon(): void {
  if (!map) {
    return;
  }

  polygonLayer?.remove();
  pointLayerGroup?.clearLayers();

  for (const [index, point] of points.value.entries()) {
    L.circleMarker(point, {
      color: "#07111f",
      fillColor: "#8ef0ca",
      fillOpacity: 1,
      radius: 6,
      weight: 2
    })
      .bindTooltip(`${index + 1}`, {
        direction: "top",
        permanent: false
      })
      .addTo(pointLayerGroup ?? map);
  }

  if (points.value.length >= 3) {
    polygonLayer = L.polygon(points.value, {
      color: "#8ef0ca",
      fillColor: "#a7e8af",
      fillOpacity: 0.2,
      opacity: 0.95,
      weight: 2
    }).addTo(map);
    map.fitBounds(polygonLayer.getBounds(), {
      padding: [24, 24]
    });
  } else {
    const lastPoint = points.value[points.value.length - 1];
    if (lastPoint) {
      map.panTo(lastPoint);
    }
  }
}

function extractPolygonPoints(value: unknown): LatLngTuple[] {
  const geometry = readGeometry(value);
  if (!geometry || geometry.type !== "Polygon" || !Array.isArray(geometry.coordinates)) {
    return [];
  }

  const ring = geometry.coordinates[0];
  if (!Array.isArray(ring)) {
    return [];
  }

  const withoutClosingPoint = ring.filter((coordinate, index) => {
    if (ring.length < 2 || index !== ring.length - 1) {
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
    return Number.isFinite(lat) && Number.isFinite(lng) ? [[lat, lng] as LatLngTuple] : [];
  });
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

function toGeoJson(nextPoints: LatLngTuple[]): Record<string, unknown> {
  if (nextPoints.length === 0) {
    return {
      coordinates: [],
      type: "Polygon"
    };
  }

  const coordinates = nextPoints.map(([lat, lng]) => [lng, lat]);
  const firstCoordinate = coordinates[0];
  if (nextPoints.length >= 3 && firstCoordinate) {
    coordinates.push(firstCoordinate);
  }

  return {
    coordinates: [coordinates],
    type: "Polygon"
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
</script>

<style scoped>
:deep(.leaflet-container) {
  width: 100%;
  height: 100%;
  background: #07111f;
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
</style>
