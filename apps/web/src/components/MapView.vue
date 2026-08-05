<template>
  <div class="map-view">
    <div ref="mapElement" class="leaflet-surface" aria-label="Peta GIS PAMILO"></div>
  </div>
</template>

<script setup lang="ts">
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { PolygonGeometry } from "@pamilo/shared";
import type { PlotPayload } from "../api.js";

const props = defineProps<{
  canEdit: boolean;
  plots: PlotPayload[];
  selectedPlotId: string;
}>();

const emit = defineEmits<{
  (event: "plot-selected", plotId: string): void;
  (event: "polygon-created", geometry: PolygonGeometry): void;
  (event: "polygon-edited", geometry: PolygonGeometry): void;
}>();

const defaultCenter: L.LatLngExpression = [-2.5, 118];
const defaultZoom = 5;
const mapElement = ref<HTMLDivElement | null>(null);
const plotLayer = new L.FeatureGroup<L.Polygon>();
let map: L.Map | null = null;
let drawControl: L.Control.Draw | null = null;

onMounted(() => {
  if (!mapElement.value) {
    return;
  }

  map = L.map(mapElement.value, {
    attributionControl: true,
    center: defaultCenter,
    zoom: defaultZoom,
    zoomControl: true
  });

  L.tileLayer(import.meta.env.VITE_MAP_TILE_URL ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: import.meta.env.VITE_MAP_TILE_ATTRIBUTION ?? "&copy; OpenStreetMap contributors",
    maxZoom: 19
  }).addTo(map);

  plotLayer.addTo(map);
  configureDrawControl();
  registerDrawHandlers();
  renderPlots();
});

onBeforeUnmount(() => {
  if (map) {
    map.remove();
    map = null;
  }
});

watch(
  () => [props.plots, props.selectedPlotId, props.canEdit] as const,
  () => {
    configureDrawControl();
    renderPlots();
  },
  {
    deep: true
  }
);

function configureDrawControl(): void {
  if (!map) {
    return;
  }

  if (drawControl) {
    map.removeControl(drawControl);
    drawControl = null;
  }

  if (!props.canEdit) {
    return;
  }

  drawControl = new L.Control.Draw({
    draw: {
      circle: false,
      circlemarker: false,
      marker: false,
      polyline: false,
      rectangle: false,
      polygon: {
        allowIntersection: false,
        shapeOptions: {
          color: "#276749",
          fillColor: "#2f855a",
          fillOpacity: 0.24,
          weight: 2
        }
      }
    },
    edit: {
      featureGroup: plotLayer,
      remove: false
    }
  });

  drawControl.addTo(map);
}

function registerDrawHandlers(): void {
  if (!map) {
    return;
  }

  map.on(L.Draw.Event.CREATED, (event) => {
    const layer = (event as L.DrawEvents.Created).layer;
    emitPolygon("polygon-created", layer);
  });

  map.on(L.Draw.Event.EDITED, (event) => {
    const layers = (event as L.DrawEvents.Edited).layers;
    layers.eachLayer((layer) => emitPolygon("polygon-edited", layer));
  });
}

function renderPlots(): void {
  if (!map) {
    return;
  }

  plotLayer.clearLayers();

  for (const plot of props.plots) {
    const isActive = plot.id === props.selectedPlotId;
    const layer = L.polygon(toLeafletLatLngs(plot.geometry), {
      color: isActive ? "#1f5f8b" : "#276749",
      fillColor: isActive ? "#3182ce" : "#2f855a",
      fillOpacity: isActive ? 0.28 : 0.18,
      weight: isActive ? 3 : 2
    });

    layer.on("click", () => emit("plot-selected", plot.id));
    layer.addTo(plotLayer);
  }

  fitVisibleBounds();
}

function fitVisibleBounds(): void {
  if (!map) {
    return;
  }

  if (plotLayer.getLayers().length === 0) {
    map.setView(defaultCenter, defaultZoom);
    return;
  }

  const selectedLayer = findSelectedLayer();
  const bounds = selectedLayer?.getBounds() ?? plotLayer.getBounds();

  if (bounds.isValid()) {
    map.fitBounds(bounds.pad(0.18), {
      maxZoom: 17
    });
  }
}

function findSelectedLayer(): L.Polygon | null {
  const selectedIndex = props.plots.findIndex((plot) => plot.id === props.selectedPlotId);
  if (selectedIndex < 0) {
    return null;
  }

  return plotLayer.getLayers()[selectedIndex] ?? null;
}

function emitPolygon(eventName: "polygon-created" | "polygon-edited", layer: L.Layer): void {
  if (!("toGeoJSON" in layer) || typeof layer.toGeoJSON !== "function") {
    return;
  }

  const feature = layer.toGeoJSON() as GeoJSON.Feature;
  if (feature.geometry?.type !== "Polygon") {
    return;
  }

  emit(eventName, feature.geometry as PolygonGeometry);
}

function toLeafletLatLngs(geometry: PolygonGeometry): L.LatLngExpression[][] {
  return geometry.coordinates.map((ring) => ring.map(([lng, lat]) => [lat, lng] as L.LatLngExpression));
}
</script>

<style scoped>
.map-view {
  position: relative;
  min-height: 360px;
  overflow: hidden;
  border: 1px solid var(--border, #cfe9df);
  border-radius: 8px;
  background: #dff5ed;
}

.leaflet-surface {
  width: 100%;
  min-height: 360px;
  height: clamp(360px, 48vh, 520px);
}

:deep(.leaflet-control-attribution) {
  color: var(--text-soft, #48645a);
  font-size: 11px;
}

:deep(.leaflet-draw-toolbar a) {
  color: var(--text, #12372c);
}

@media (max-width: 800px) {
  .map-view,
  .leaflet-surface {
    min-height: 360px;
    height: 360px;
  }
}
</style>
