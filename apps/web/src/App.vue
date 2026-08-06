<template>
  <main class="shell">
    <section v-if="loading" class="loading-panel" aria-live="polite">
      <span></span>
    </section>

    <section v-else-if="!isSignedIn" class="login-screen" aria-label="Login PAMILO">
      <div class="login-brand">
        <div class="brand-mark"><Sprout :size="42" /></div>
        <h1>PAMILO Smart Farming GIS</h1>
        <p>Monitoring lahan, perangkat ESP32, cuaca BMKG, dan telemetry MQTT dinamis dalam satu ruang kerja.</p>
        <div class="login-points">
          <span><Activity :size="16" /> Real-time telemetry</span>
          <span><MapPinned :size="16" /> GIS plot mapping</span>
          <span><Router :size="16" /> IoT provisioning</span>
          <span><CloudSun :size="16" /> BMKG forecast</span>
        </div>
      </div>

      <aside class="login-card">
        <p class="eyebrow">Masuk</p>
        <h2>Welcome Back</h2>
        <form class="form-stack" @submit.prevent="submitLogin">
          <label>
            <span>Email</span>
            <input v-model="form.email" autocomplete="username" type="email" />
          </label>
          <label>
            <span>Password</span>
            <input v-model="form.password" autocomplete="current-password" type="password" />
          </label>
          <label>
            <span>Tenant</span>
            <select v-model="form.tenantId">
              <option v-for="tenant in loginTenantOptions" :key="tenant.id" :value="tenant.id">
                {{ tenant.name }}
              </option>
            </select>
          </label>
          <button class="primary-button wide-button" :disabled="busy" type="submit">
            <LogIn :size="18" />
            {{ busy ? "Memproses" : "Masuk" }}
          </button>
        </form>
        <p v-if="error" class="error-message" role="alert">{{ error }}</p>
      </aside>
    </section>

    <section v-else class="app-layout">
      <aside class="sidebar" aria-label="Navigasi PAMILO">
        <div class="sidebar-brand">
          <div class="brand-emblem"><Leaf :size="24" /></div>
          <div>
            <strong>PAMILO</strong>
            <span>Smart Farming GIS</span>
          </div>
        </div>

        <nav class="nav-menu" aria-label="Menu utama">
          <button class="nav-item" :class="{ active: activeView === 'dashboard' }" type="button" @click="setActiveView('dashboard')">
            <Gauge :size="18" /> Dashboard
          </button>
          <button class="nav-item" :class="{ active: activeView === 'map' }" type="button" @click="setActiveView('map')">
            <MapPinned :size="18" /> Pemantauan Peta
          </button>
          <button class="nav-item" :class="{ active: activeView === 'charts' }" type="button" @click="setActiveView('charts')">
            <BarChart3 :size="18" /> Grafik
          </button>
          <button class="nav-item" type="button">
            <Sprout :size="18" /> Cek Subsidi Pupuk
          </button>
          <button class="nav-item" :class="{ active: activeView === 'weather' }" type="button" @click="setActiveView('weather')">
            <CloudSun :size="18" /> Stasiun Cuaca
          </button>
          <button class="nav-item" :class="{ active: activeView === 'devices' }" type="button" @click="setActiveView('devices')">
            <Router :size="18" /> Perangkat
          </button>
          <button class="nav-item" :class="{ active: activeView === 'reports' }" type="button" @click="setActiveView('reports')">
            <FileText :size="18" /> Laporan
          </button>
          <button class="nav-item" :class="{ active: activeView === 'master' }" type="button" @click="setActiveView('master')">
            <Database :size="18" /> Data Master
          </button>
        </nav>

        <div class="nav-section-title">Pertanian</div>
        <nav class="nav-menu compact" aria-label="Menu pertanian">
          <button class="nav-item" type="button"><CalendarDays :size="17" /> Musim Tanam</button>
          <button class="nav-item" type="button"><ListChecks :size="17" /> Tugas</button>
          <button class="nav-item" type="button"><Users :size="17" /> Kelompok Tani</button>
        </nav>

        <div class="sidebar-footer">
          <div class="avatar">{{ avatarInitials }}</div>
          <div>
            <strong>{{ auth?.active_tenant.name }}</strong>
            <span>{{ auth?.user.email }}</span>
          </div>
        </div>
      </aside>

      <div class="app-main">
        <header class="topbar">
          <div class="topbar-title">
            <button class="icon-button" type="button" aria-label="Menu">
              <Menu :size="20" />
            </button>
            <div>
              <h1>{{ pageTitle }}</h1>
              <p>{{ pageSubtitle }}</p>
            </div>
          </div>

          <div class="topbar-actions">
            <select aria-label="Bahasa">
              <option>Indonesia</option>
            </select>
            <button class="chip-button" type="button">
              <Sun :size="16" /> Terang
            </button>
            <time>{{ topbarTimestamp }}</time>
            <button class="ghost-button" :disabled="runtimeBusy || workspaceBusy" type="button" @click="refreshActiveWorkspace">
              <RefreshCw :size="16" /> Segarkan
            </button>
            <button class="icon-button" type="button" aria-label="Notifikasi">
              <Bell :size="18" />
            </button>
            <button class="avatar-button" type="button">{{ avatarInitials }}</button>
          </div>
        </header>

        <section class="content-panel" aria-label="Konten PAMILO">
          <template v-if="activeView === 'dashboard'">
            <section class="stats-grid" aria-label="Ringkasan dashboard">
              <article class="stat-card">
                <span>Total devices</span>
                <strong>{{ deviceStore.devices.length }}</strong>
                <small>Disinkronkan dari provisioning tenant</small>
                <Router :size="20" />
              </article>
              <article class="stat-card">
                <span>Active fields</span>
                <strong>{{ plots.length }}</strong>
                <small>{{ farms.length }} farm tersedia</small>
                <MapPinned :size="20" />
              </article>
              <article class="stat-card">
                <span>Online devices</span>
                <strong>{{ onlineDeviceCount }}</strong>
                <small>{{ offlineDeviceCount }} offline atau belum mengirim</small>
                <Wifi :size="20" />
              </article>
              <article class="stat-card">
                <span>Tracked metrics</span>
                <strong>{{ trackedMetricCount }}</strong>
                <small>Termasuk payload MQTT dinamis</small>
                <Activity :size="20" />
              </article>
            </section>

            <section class="service-banner">
              <div>
                <span class="service-pill">Public service</span>
                <h2>Cek Subsidi Pupuk kini tersedia di PAMILO</h2>
                <p>Buka portal resmi Kementan langsung dari sistem tanpa menyimpan data pencarian ke database lokal.</p>
              </div>
              <div class="banner-actions">
                <button class="primary-button" type="button"><Sprout :size="16" /> Buka Fitur</button>
                <button class="ghost-button" type="button"><ExternalLink :size="16" /> Situs Resmi</button>
              </div>
            </section>

            <section class="dashboard-grid">
              <BmkgWeatherWidget
                :empty-state="weatherEmptyState"
                :plot-name="selectedPlot?.name ?? 'Plot aktif'"
                :show-manage="true"
                :weather="weather"
                @open-weather="setActiveView('weather')"
              />

              <article class="overview-card">
                <div class="section-heading">
                  <div>
                    <span class="eyebrow">Metric stream</span>
                    <h2>Live Metric Overview</h2>
                    <p>Key telemetry terakhir dari plot yang dipilih.</p>
                  </div>
                  <span class="live-badge">Live</span>
                </div>

                <DynamicMetricCards :readings="latestTelemetry" />
              </article>
            </section>

            <section class="map-metric-grid">
              <article class="map-card">
                <div class="section-heading">
                  <div>
                    <span class="eyebrow">Field map monitoring</span>
                    <h2>{{ selectedPlot?.name ?? "Peta Lahan" }}</h2>
                    <p>Polygon OSM, area otomatis, dan lokasi perangkat dalam satu tampilan.</p>
                  </div>
                  <button class="link-button" type="button" @click="setActiveView('map')">Buka Peta <ArrowRight :size="16" /></button>
                </div>
                <MapView
                  :can-edit="false"
                  :plots="plots"
                  :selected-plot-id="selectedPlotId"
                  @plot-selected="selectPlot"
                  @polygon-created="createPlotFromDrawnPolygon"
                  @polygon-edited="updateSelectedPlotGeometry"
                />
              </article>

              <aside class="side-stack">
                <article class="mini-panel">
                  <h2>Crop Information</h2>
                  <dl class="detail-list">
                    <div>
                      <dt>Plot</dt>
                      <dd>{{ selectedPlot?.name ?? "-" }}</dd>
                    </div>
                    <div>
                      <dt>Luas</dt>
                      <dd>{{ selectedPlot ? formatHectares(selectedPlot.area_ha) : "-" }}</dd>
                    </div>
                    <div>
                      <dt>ADM4</dt>
                      <dd>{{ selectedPlot?.adm4_code || "Belum dipetakan" }}</dd>
                    </div>
                  </dl>
                </article>
                <article class="mini-panel">
                  <h2>Latest Metric Set</h2>
                  <dl class="metric-list">
                    <div v-for="reading in latestMetricCards.slice(0, 6)" :key="reading.metric">
                      <dt>{{ formatMetricName(reading.metric) }}</dt>
                      <dd>{{ formatTelemetryValue(reading) }}</dd>
                    </div>
                  </dl>
                </article>
              </aside>
            </section>

            <section class="overview-card">
              <div class="section-heading">
                <div>
                  <span class="eyebrow">Device status</span>
                  <h2>Perangkat plot aktif</h2>
                </div>
                <button class="link-button" type="button" @click="setActiveView('devices')">View All <ArrowRight :size="16" /></button>
              </div>
              <div v-if="deviceStore.devices.length" class="device-mini-list">
                <article v-for="device in deviceStore.devices.slice(0, 4)" :key="device.id" class="device-mini-card">
                  <div>
                    <strong>{{ device.label || device.serial_no }}</strong>
                    <span>{{ device.status }} / {{ device.last_seen_at ? formatTimestamp(device.last_seen_at) : "belum ada data" }}</span>
                  </div>
                  <small>{{ device.client_id }}</small>
                </article>
              </div>
              <p v-else class="empty-state">Belum ada perangkat.</p>
            </section>
          </template>

          <template v-else-if="activeView === 'map'">
            <section class="map-workspace">
              <article class="map-card tall">
                <div class="section-heading">
                  <div>
                    <span class="eyebrow">GIS OSM</span>
                    <h2>Pemetaan Polygon Lahan</h2>
                    <p>Gambar atau pilih polygon untuk menghitung area dan centroid secara otomatis.</p>
                  </div>
                </div>
                <MapView
                  :can-edit="canWriteMetadata"
                  :plots="plots"
                  :selected-plot-id="selectedPlotId"
                  @plot-selected="selectPlot"
                  @polygon-created="createPlotFromDrawnPolygon"
                  @polygon-edited="updateSelectedPlotGeometry"
                />
              </article>

              <aside class="side-stack">
                <article class="mini-panel">
                  <h2>Farm</h2>
                  <form v-if="canWriteMetadata" class="form-stack" @submit.prevent="submitFarm">
                    <input v-model="farmForm.name" aria-label="Nama farm" required type="text" />
                    <select v-model="farmForm.timezone" aria-label="Zona waktu farm">
                      <option value="Asia/Jakarta">Asia/Jakarta</option>
                      <option value="Asia/Makassar">Asia/Makassar</option>
                      <option value="Asia/Jayapura">Asia/Jayapura</option>
                    </select>
                    <button class="primary-button" :disabled="busy" type="submit"><Plus :size="16" /> Tambah Farm</button>
                  </form>
                  <div class="choice-list">
                    <button
                      v-for="farm in farms"
                      :key="farm.id"
                      class="choice-button"
                      :class="{ active: farm.id === activeFarmId }"
                      type="button"
                      @click="selectFarm(farm.id)"
                    >
                      <span>{{ farm.name }}</span>
                      <small>{{ farm.timezone }}</small>
                    </button>
                  </div>
                </article>

                <article class="mini-panel">
                  <h2>Plot</h2>
                  <form v-if="canWriteMetadata && activeFarm" class="form-stack" @submit.prevent="submitPlot">
                    <input v-model="plotForm.name" aria-label="Nama plot" required type="text" />
                    <input v-model="plotForm.adm4Code" aria-label="Kode ADM4" type="text" />
                    <button class="primary-button" :disabled="busy" type="submit"><Plus :size="16" /> Tambah Plot</button>
                  </form>
                  <div class="choice-list">
                    <button
                      v-for="plot in plots"
                      :key="plot.id"
                      class="choice-button"
                      :class="{ active: plot.id === selectedPlotId }"
                      type="button"
                      @click="selectPlot(plot.id)"
                    >
                      <span>{{ plot.name }}</span>
                      <small>{{ formatHectares(plot.area_ha) }}</small>
                    </button>
                  </div>
                </article>
              </aside>
            </section>
          </template>

          <template v-else-if="activeView === 'charts'">
            <DynamicMetricCards :limit="12" :readings="latestTelemetry" wide />
            <DynamicTelemetryChart
              :busy="historyBusy"
              :histories="telemetryHistories"
              :metric-options="telemetryMetricOptions"
              :selected-metric="historyMetric"
              @refresh="loadDashboard(selectedPlotId)"
              @update:selected-metric="selectHistoryMetric"
            />
          </template>

          <template v-else-if="activeView === 'weather'">
            <section class="weather-page-grid">
              <article class="current-weather-card">
                <span class="eyebrow">Current weather</span>
                <h2>{{ weather?.forecast[0]?.weather_desc ?? "BMKG Forecast" }}</h2>
                <strong>{{ formatWeatherTemperature(weather?.forecast[0]?.temperature_c ?? null) }}</strong>
                <p>{{ selectedPlot?.name ?? "Plot aktif" }} / {{ weather?.cache_status ?? "missing" }}</p>
              </article>

              <article class="map-card weather-map-card">
                <MapView
                  :can-edit="false"
                  :plots="plots"
                  :selected-plot-id="selectedPlotId"
                  @plot-selected="selectPlot"
                  @polygon-created="createPlotFromDrawnPolygon"
                  @polygon-edited="updateSelectedPlotGeometry"
                />
              </article>
            </section>

            <section class="overview-card">
              <div class="section-heading">
                <div>
                  <span class="eyebrow">Forecast BMKG</span>
                  <h2>Prakiraan Cuaca</h2>
                  <p>{{ weatherLabel }}</p>
                </div>
              </div>
              <div v-if="weather && weather.forecast.length" class="weather-list">
                <div v-for="point in weather.forecast" :key="point.utc_datetime" class="weather-row">
                  <div>
                    <span>{{ point.weather_desc }}</span>
                    <small>{{ formatTimestamp(point.utc_datetime) }} / {{ point.wind_direction || "-" }}</small>
                  </div>
                  <strong>{{ formatWeatherTemperature(point.temperature_c) }}</strong>
                  <small>{{ formatWeatherDetail(point) }}</small>
                </div>
              </div>
              <p v-else class="empty-state">{{ weatherEmptyState }}</p>
            </section>
          </template>

          <template v-else-if="activeView === 'devices'">
            <DeviceManagement
              v-if="selectedPlot"
              :can-write="canWriteMetadata"
              :csrf-token="auth.csrf_token"
              :latest-telemetry="latestTelemetry"
              :plot="selectedPlot"
            />
          </template>

          <template v-else-if="activeView === 'reports'">
            <section class="overview-card">
              <div class="section-heading">
                <div>
                  <span class="eyebrow">Report Observasi</span>
                  <h2>Telemetry Report</h2>
                  <p>Tabel observasi tersimpan dari plot aktif.</p>
                </div>
                <button class="ghost-button" type="button"><Download :size="16" /> Export CSV</button>
              </div>
              <div v-if="telemetryHistoryPoints.length" class="report-table">
                <div class="report-row report-head">
                  <span>Observed at</span>
                  <span>Device</span>
                  <span>Metric</span>
                  <span>Value</span>
                  <span>Seq</span>
                </div>
                <div v-for="point in telemetryHistoryPoints" :key="point.ts + point.metric + point.device_id" class="report-row">
                  <span>{{ formatTimestamp(point.ts) }}</span>
                  <span>{{ point.device_id }}</span>
                  <span>{{ formatMetricName(point.metric) }}</span>
                  <strong>{{ formatTelemetryValue(point) }}</strong>
                  <span>{{ point.seq }}</span>
                </div>
              </div>
              <p v-else class="empty-state">Report belum tersedia.</p>
            </section>
          </template>

          <template v-else>
            <section class="overview-card">
              <div class="section-heading">
                <div>
                  <span class="eyebrow">Runtime</span>
                  <h2>Data Master & Dependencies</h2>
                  <p>Status adapter lokal dan integrasi staging.</p>
                </div>
              </div>
              <div class="runtime-grid">
                <div v-for="dependency in runtimeDependencyRows" :key="dependency.name" class="runtime-item">
                  <span>{{ formatDependencyName(dependency.name) }}</span>
                  <strong :class="dependencyStateClass(dependency.status)">{{ dependency.status }}</strong>
                </div>
              </div>
            </section>
          </template>

          <p v-if="error" class="error-message global-error" role="alert">{{ error }}</p>
        </section>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  CalendarDays,
  CloudSun,
  Database,
  Download,
  ExternalLink,
  FileText,
  Gauge,
  Leaf,
  ListChecks,
  LogIn,
  LogOut,
  MapPinned,
  Menu,
  Plus,
  RefreshCw,
  Router,
  Sprout,
  Sun,
  Users,
  Wifi
} from "@lucide/vue";
import { metricCodes, type PolygonGeometry } from "@pamilo/shared";
import {
  createFarm,
  createPlot,
  getFarmPlots,
  getFarms,
  getHealthReady,
  getMe,
  getPlotDashboard,
  getPlotLatestTelemetry,
  getPlotTelemetryHistory,
  getPlotWeather,
  login,
  logout,
  updatePlotGeometry,
  type FarmPayload,
  type DashboardPayload,
  type HealthReadyPayload,
  type MePayload,
  type PlotPayload,
  type TelemetryHistoryPayload,
  type TelemetryReadingPayload,
  type WeatherForecastPointPayload,
  type WeatherPayload
} from "./api.js";
import BmkgWeatherWidget from "./components/BmkgWeatherWidget.vue";
import DeviceManagement from "./components/DeviceManagement.vue";
import DynamicMetricCards from "./components/DynamicMetricCards.vue";
import DynamicTelemetryChart from "./components/DynamicTelemetryChart.vue";
import MapView from "./components/MapView.vue";
import { useDeviceManagementStore } from "./stores/device-management.js";

type ActiveView = "dashboard" | "map" | "charts" | "weather" | "devices" | "reports" | "master";

const auth = ref<MePayload | null>(null);
const farms = ref<FarmPayload[]>([]);
const plots = ref<PlotPayload[]>([]);
const dashboard = ref<DashboardPayload | null>(null);
const latestTelemetry = ref<TelemetryReadingPayload[]>([]);
const telemetryHistory = ref<TelemetryHistoryPayload | null>(null);
const telemetryHistories = ref<TelemetryHistoryPayload[]>([]);
const weather = ref<WeatherPayload | null>(null);
const runtimeStatus = ref<HealthReadyPayload | null>(null);
const pendingPlotGeometry = ref<PolygonGeometry | null>(null);
const deviceStore = useDeviceManagementStore();
const activeFarmId = ref("");
const selectedPlotId = ref("");
const historyMetric = ref("soil_temperature");
const activeView = ref<ActiveView>("dashboard");
const loading = ref(true);
const busy = ref(false);
const workspaceBusy = ref(false);
const historyBusy = ref(false);
const runtimeBusy = ref(false);
const error = ref<string | null>(null);
let dashboardPollTimer: number | null = null;

const form = reactive({
  email: "multi@example.test",
  password: "local-demo-password",
  tenantId: "tenant-a"
});
const farmForm = reactive({
  name: "Kebun Demonstrasi",
  timezone: "Asia/Jakarta"
});
const plotForm = reactive({
  name: "Plot Baru",
  adm4Code: ""
});

const isSignedIn = computed(() => auth.value !== null);
const activeFarm = computed(() => farms.value.find((farm) => farm.id === activeFarmId.value) ?? null);
const selectedPlot = computed(() => plots.value.find((plot) => plot.id === selectedPlotId.value) ?? plots.value[0] ?? null);
const runtimeDependencyRows = computed(() => Object.entries(runtimeStatus.value?.dependencies ?? {}).map(([name, status]) => ({
  name,
  status
})));
const telemetryHistoryPoints = computed(() => telemetryHistory.value?.points ?? []);
const telemetryMetricOptions = computed(() => {
  const options = new Set<string>(metricCodes);

  for (const reading of latestTelemetry.value) {
    options.add(reading.metric);
  }

  for (const history of telemetryHistories.value) {
    options.add(history.metric);
  }

  return [...options];
});
const latestMetricCards = computed(() => latestTelemetry.value.slice(0, 8));
const compactForecast = computed(() => weather.value?.forecast.slice(0, 2) ?? []);
const trackedMetricCount = computed(() => telemetryMetricOptions.value.length);
const onlineDeviceCount = computed(() => deviceStore.devices.filter((device) => isRecentTimestamp(device.last_seen_at)).length);
const offlineDeviceCount = computed(() => Math.max(0, deviceStore.devices.length - onlineDeviceCount.value));
const avatarInitials = computed(() => {
  const email = auth.value?.user.email ?? "SU";
  const normalized = email.split("@")[0] ?? "SU";
  return normalized.slice(0, 2).toUpperCase();
});
const weatherLabel = computed(() => {
  if (!weather.value) {
    return selectedPlot.value?.name ?? "";
  }

  return `${weather.value.attribution} / ${weather.value.cache_status}`;
});
const weatherEmptyState = computed(() => {
  if (!weather.value) {
    return "Belum ada data cuaca.";
  }

  if (!weather.value.adm4_code) {
    return "ADM4 belum dipetakan.";
  }

  if (weather.value.cache_status === "missing") {
    return "Cache BMKG belum tersedia.";
  }

  return "Belum ada prakiraan.";
});
const canWriteMetadata = computed(() => {
  const role = auth.value?.active_tenant.role;
  return role === "farmer_owner" || role === "platform_admin";
});
const pageTitle = computed(() => {
  const titles: Record<ActiveView, string> = {
    dashboard: "Dashboard",
    map: "Pemantauan Peta",
    charts: "Analytics Charts",
    weather: "Weather Forecast",
    devices: "Device Management",
    reports: "Laporan",
    master: "Data Master"
  };

  return titles[activeView.value];
});
const pageSubtitle = computed(() => {
  const subtitles: Record<ActiveView, string> = {
    dashboard: "Real-time smart farming overview",
    map: "Kelola polygon OSM dan metadata plot",
    charts: "Pantau metric tanah dan sensor dinamis",
    weather: "Prakiraan BMKG berdasarkan ADM4 plot",
    devices: "Kelola provisioning ESP32 dan kredensial MQTT",
    reports: "Tabel observasi telemetry dan export",
    master: "Kontrak runtime dan master data agronomi"
  };

  return subtitles[activeView.value];
});
const topbarTimestamp = computed(() => new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short"
}).format(new Date()));
const loginTenantOptions = [
  {
    id: "tenant-a",
    name: "Tenant A"
  },
  {
    id: "tenant-b",
    name: "Tenant B"
  }
];

async function refreshSession(): Promise<void> {
  loading.value = true;
  error.value = null;

  try {
    await loadRuntimeStatus();

    const response = await getMe();
    auth.value = response.data;

    if (response.data) {
      form.email = response.data.user.email;
      form.tenantId = response.data.active_tenant.id;
      await loadTenantWorkspace();
    } else {
      resetWorkspace();
    }
  } finally {
    loading.value = false;
  }
}

async function submitLogin(): Promise<void> {
  busy.value = true;
  error.value = null;

  try {
    const response = await login({
      email: form.email,
      password: form.password,
      tenantId: form.tenantId
    });

    if (!response.data) {
      error.value = response.error?.message ?? "Login failed.";
      return;
    }

    auth.value = response.data;
    await loadRuntimeStatus();
    await loadTenantWorkspace();
  } finally {
    busy.value = false;
  }
}

async function submitLogout(): Promise<void> {
  if (!auth.value) {
    return;
  }

  busy.value = true;
  error.value = null;

  try {
    const response = await logout(auth.value.csrf_token);
    if (response.error) {
      error.value = response.error.message;
      return;
    }

    auth.value = null;
    resetWorkspace();
  } finally {
    busy.value = false;
  }
}

async function switchTenant(tenantId: string): Promise<void> {
  if (!auth.value || tenantId === auth.value.active_tenant.id) {
    return;
  }

  form.email = auth.value.user.email;
  form.tenantId = tenantId;
  await submitLogin();
}

async function refreshActiveWorkspace(): Promise<void> {
  await loadRuntimeStatus();

  if (selectedPlotId.value) {
    await loadPlotRuntime(selectedPlotId.value);
  }
}

async function loadTenantWorkspace(): Promise<void> {
  workspaceBusy.value = true;
  error.value = null;

  try {
    const response = await getFarms();
    if (!response.data) {
      error.value = response.error?.message ?? "Gagal memuat farm.";
      resetWorkspace();
      return;
    }

    farms.value = response.data;
    activeFarmId.value = response.data[0]?.id ?? "";

    if (activeFarmId.value) {
      await loadPlots(activeFarmId.value);
    } else {
      plots.value = [];
      deviceStore.reset();
      latestTelemetry.value = [];
      telemetryHistory.value = null;
      telemetryHistories.value = [];
      dashboard.value = null;
      weather.value = null;
      selectedPlotId.value = "";
    }
  } finally {
    workspaceBusy.value = false;
  }
}

async function loadPlots(farmId: string): Promise<void> {
  workspaceBusy.value = true;
  error.value = null;

  try {
    const response = await getFarmPlots(farmId);
    if (!response.data) {
      error.value = response.error?.message ?? "Gagal memuat plot.";
      plots.value = [];
      deviceStore.reset();
      latestTelemetry.value = [];
      telemetryHistory.value = null;
      telemetryHistories.value = [];
      dashboard.value = null;
      weather.value = null;
      selectedPlotId.value = "";
      return;
    }

    plots.value = response.data;
    selectedPlotId.value = response.data[0]?.id ?? "";
    deviceStore.clearCredential();

    if (selectedPlotId.value) {
      await loadPlotRuntime(selectedPlotId.value);
    } else {
      deviceStore.reset();
      latestTelemetry.value = [];
      telemetryHistory.value = null;
      telemetryHistories.value = [];
      dashboard.value = null;
      weather.value = null;
    }
  } finally {
    workspaceBusy.value = false;
  }
}

async function selectFarm(farmId: string): Promise<void> {
  if (farmId === activeFarmId.value) {
    return;
  }

  activeFarmId.value = farmId;
  await loadPlots(farmId);
}

async function selectPlot(plotId: string): Promise<void> {
  if (plotId === selectedPlotId.value) {
    return;
  }

  selectedPlotId.value = plotId;
  deviceStore.clearCredential();
  await loadPlotRuntime(plotId);
}

async function loadPlotRuntime(plotId: string): Promise<void> {
  await deviceStore.loadForPlot(plotId);
  await loadDashboard(plotId);
}

async function loadRuntimeStatus(): Promise<void> {
  runtimeBusy.value = true;

  try {
    runtimeStatus.value = await getHealthReady();
  } catch {
    runtimeStatus.value = null;
  } finally {
    runtimeBusy.value = false;
  }
}

async function loadLatestTelemetry(plotId: string): Promise<void> {
  workspaceBusy.value = true;
  error.value = null;

  try {
    const response = await getPlotLatestTelemetry(plotId);
    if (!response.data) {
      error.value = response.error?.message ?? "Gagal memuat telemetry.";
      latestTelemetry.value = [];
      return;
    }

    latestTelemetry.value = response.data;
    const preferredMetric = response.data.find((reading) => reading.metric === historyMetric.value)?.metric
      ?? response.data[0]?.metric;

    if (preferredMetric) {
      historyMetric.value = preferredMetric;
    }
  } finally {
    workspaceBusy.value = false;
  }
}

async function loadDashboard(plotId: string, options: { silent?: boolean } = {}): Promise<void> {
  if (!plotId) {
    return;
  }

  if (!options.silent) {
    workspaceBusy.value = true;
    error.value = null;
  }

  try {
    const response = await getPlotDashboard(plotId);
    if (!response.data) {
      if (!options.silent) {
        error.value = response.error?.message ?? "Gagal memuat dashboard.";
      }
      return;
    }

    dashboard.value = response.data;
    latestTelemetry.value = response.data.telemetry.latest;
    telemetryHistories.value = response.data.telemetry.histories;
    weather.value = response.data.weather;

    const preferredMetric = response.data.telemetry.latest.find((reading) => reading.metric === historyMetric.value)?.metric
      ?? response.data.telemetry.latest[0]?.metric
      ?? response.data.telemetry.histories[0]?.metric;

    if (preferredMetric) {
      historyMetric.value = preferredMetric;
    }

    syncSelectedHistory();
    scheduleDashboardPolling(response.data.realtime.poll_interval_ms);
  } finally {
    if (!options.silent) {
      workspaceBusy.value = false;
    }
  }
}

async function loadTelemetryHistory(plotId = selectedPlotId.value): Promise<void> {
  if (!plotId) {
    telemetryHistory.value = null;
    return;
  }

  historyBusy.value = true;

  try {
    const range = createHistoryRange(latestTelemetry.value);
    const response = await getPlotTelemetryHistory({
      plotId,
      metric: historyMetric.value,
      from: range.from,
      to: range.to,
      resolution: "raw"
    });

    if (!response.data) {
      telemetryHistory.value = null;
      return;
    }

    telemetryHistory.value = response.data;
    telemetryHistories.value = [
      ...telemetryHistories.value.filter((history) => history.metric !== response.data?.metric),
      response.data
    ];
  } finally {
    historyBusy.value = false;
  }
}

async function loadWeather(plotId: string): Promise<void> {
  workspaceBusy.value = true;
  error.value = null;

  try {
    const response = await getPlotWeather(plotId);
    if (!response.data) {
      error.value = response.error?.message ?? "Gagal memuat cuaca BMKG.";
      weather.value = null;
      return;
    }

    weather.value = response.data;
  } finally {
    workspaceBusy.value = false;
  }
}

async function submitFarm(): Promise<void> {
  if (!auth.value || !canWriteMetadata.value) {
    return;
  }

  busy.value = true;
  error.value = null;

  try {
    const response = await createFarm({
      name: farmForm.name,
      timezone: farmForm.timezone,
      csrfToken: auth.value.csrf_token
    });

    if (!response.data) {
      error.value = response.error?.message ?? "Gagal membuat farm.";
      return;
    }

    farms.value = [...farms.value, response.data];
    activeFarmId.value = response.data.id;
    farmForm.name = "";
    plots.value = [];
    deviceStore.reset();
    latestTelemetry.value = [];
    telemetryHistory.value = null;
    telemetryHistories.value = [];
    dashboard.value = null;
    weather.value = null;
    selectedPlotId.value = "";
  } finally {
    busy.value = false;
  }
}

async function submitPlot(): Promise<void> {
  if (!auth.value || !activeFarm.value || !canWriteMetadata.value) {
    return;
  }

  busy.value = true;
  error.value = null;

  try {
    const geometry = pendingPlotGeometry.value ?? createTemplatePolygon(auth.value.active_tenant.id, plots.value.length);
    const response = await createPlot({
      farmId: activeFarm.value.id,
      name: plotForm.name,
      adm4Code: plotForm.adm4Code,
      geometry,
      csrfToken: auth.value.csrf_token
    });

    if (!response.data) {
      error.value = response.error?.message ?? "Gagal membuat plot.";
      return;
    }

    plots.value = [...plots.value, response.data];
    selectedPlotId.value = response.data.id;
    plotForm.name = "";
    pendingPlotGeometry.value = null;
    deviceStore.clearCredential();
    await loadPlotRuntime(response.data.id);
  } finally {
    busy.value = false;
  }
}

async function createPlotFromDrawnPolygon(geometry: PolygonGeometry): Promise<void> {
  pendingPlotGeometry.value = geometry;
  await submitPlot();
}

async function updateSelectedPlotGeometry(geometry: PolygonGeometry): Promise<void> {
  if (!auth.value || !selectedPlot.value || !canWriteMetadata.value) {
    return;
  }

  busy.value = true;
  error.value = null;

  try {
    const response = await updatePlotGeometry({
      plotId: selectedPlot.value.id,
      geometry,
      csrfToken: auth.value.csrf_token
    });

    if (!response.data) {
      error.value = response.error?.message ?? "Gagal menyimpan geometri plot.";
      return;
    }

    plots.value = plots.value.map((plot) => plot.id === response.data?.id ? response.data : plot);
    selectedPlotId.value = response.data.id;
  } finally {
    busy.value = false;
  }
}

function resetWorkspace(): void {
  farms.value = [];
  plots.value = [];
  deviceStore.reset();
  latestTelemetry.value = [];
  telemetryHistory.value = null;
  telemetryHistories.value = [];
  dashboard.value = null;
  weather.value = null;
  runtimeStatus.value = null;
  activeFarmId.value = "";
  selectedPlotId.value = "";
  stopDashboardPolling();
}

function setActiveView(view: ActiveView): void {
  activeView.value = view;
}

async function selectHistoryMetric(metric: string): Promise<void> {
  historyMetric.value = metric;
  syncSelectedHistory();

  if (!telemetryHistory.value && selectedPlotId.value) {
    await loadTelemetryHistory(selectedPlotId.value);
  }
}

function syncSelectedHistory(): void {
  telemetryHistory.value = telemetryHistories.value.find((history) => history.metric === historyMetric.value)
    ?? telemetryHistories.value[0]
    ?? null;
}

function scheduleDashboardPolling(intervalMs: number): void {
  stopDashboardPolling();

  const clampedIntervalMs = Math.max(5000, Math.min(intervalMs, 60_000));
  dashboardPollTimer = window.setInterval(() => {
    if (isSignedIn.value && selectedPlotId.value) {
      void loadDashboard(selectedPlotId.value, {
        silent: true
      });
    }
  }, clampedIntervalMs);
}

function stopDashboardPolling(): void {
  if (dashboardPollTimer !== null) {
    window.clearInterval(dashboardPollTimer);
    dashboardPollTimer = null;
  }
}

function formatHectares(value: number): string {
  return `${value.toFixed(4)} ha`;
}

function formatMeters(value: number): string {
  return `${Math.round(value).toLocaleString("id-ID")} m2`;
}

function formatCoordinate(value: number): string {
  return value.toFixed(6);
}

function formatMetricName(metric: string): string {
  return metric
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDependencyName(name: string): string {
  return name === "victoriametrics" ? "VictoriaMetrics" : formatMetricName(name);
}

function formatTelemetryValue(reading: TelemetryReadingPayload): string {
  if (reading.value === null) {
    return `null ${reading.unit}`.trim();
  }

  if (typeof reading.value === "number") {
    return `${reading.value.toLocaleString("id-ID", {
      maximumFractionDigits: 2
    })} ${reading.unit}`.trim();
  }

  if (typeof reading.value === "boolean") {
    return `${reading.value ? "true" : "false"} ${reading.unit}`.trim();
  }

  return `${reading.value} ${reading.unit}`.trim();
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatWeatherTemperature(value: number | null): string {
  if (value === null) {
    return "-";
  }

  return `${value.toLocaleString("id-ID", {
    maximumFractionDigits: 1
  })} C`;
}

function formatWeatherDetail(point: WeatherForecastPointPayload): string {
  return [
    `RH ${formatNullableNumber(point.humidity_pct, "%")}`,
    `Hujan ${formatNullableNumber(point.rainfall_mm, "mm")}`,
    `Angin ${formatNullableNumber(point.wind_speed_kph, "km/j")}`,
    `Awan ${formatNullableNumber(point.cloud_cover_pct, "%")}`
  ].join(" / ");
}

function formatNullableNumber(value: number | null, unit: string): string {
  if (value === null) {
    return "-";
  }

  return `${value.toLocaleString("id-ID", {
    maximumFractionDigits: 1
  })} ${unit}`;
}

function dependencyStateClass(status: string): string {
  if (status.includes("not_configured")) {
    return "muted";
  }

  if (status.includes("configured") || status.includes("hybrid") || status.includes("in_memory")) {
    return "good";
  }

  return "warn";
}

function metricToneClass(metric: string): string {
  if (metric.includes("ph")) {
    return "tone-amber";
  }

  if (metric.includes("nitrogen")) {
    return "tone-orange";
  }

  if (metric.includes("phosphorus")) {
    return "tone-blue";
  }

  if (metric.includes("potassium")) {
    return "tone-rose";
  }

  if (metric.includes("temperature")) {
    return "tone-coral";
  }

  if (metric.includes("conductivity") || metric.includes("ec")) {
    return "tone-indigo";
  }

  return "tone-mint";
}

function metricProgress(reading: TelemetryReadingPayload): string {
  if (typeof reading.value !== "number" || !Number.isFinite(reading.value)) {
    return "12%";
  }

  const metric = reading.metric;
  let maximum = 100;

  if (metric.includes("ph")) {
    maximum = 14;
  } else if (metric.includes("temperature")) {
    maximum = 45;
  } else if (metric.includes("nitrogen") || metric.includes("phosphorus") || metric.includes("potassium")) {
    maximum = 200;
  } else if (metric.includes("conductivity") || metric.includes("ec")) {
    maximum = 2000;
  }

  const ratio = Math.max(8, Math.min(100, (reading.value / maximum) * 100));
  return `${ratio}%`;
}

function isRecentTimestamp(value: string | null): boolean {
  if (!value) {
    return false;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && Date.now() - timestamp <= 15 * 60 * 1000;
}

function createTemplatePolygon(tenantId: string, plotIndex: number): PolygonGeometry {
  const origin = tenantId === "tenant-b"
    ? { lng: 110.3, lat: -7.8 }
    : { lng: 106.8, lat: -6.2 };
  const offset = plotIndex * 0.004;
  const size = 0.008;
  const west = origin.lng + offset;
  const south = origin.lat - offset;
  const east = west + size;
  const north = south + size;

  return {
    type: "Polygon",
    coordinates: [
      [
        [west, south],
        [east, south],
        [east, north],
        [west, north],
        [west, south]
      ]
    ]
  };
}

function createHistoryRange(readings: TelemetryReadingPayload[]): {
  from: string;
  to: string;
} {
  const latestTimestamp = readings
    .map((reading) => Date.parse(reading.ts))
    .filter((timestamp) => Number.isFinite(timestamp))
    .reduce((latest, timestamp) => Math.max(latest, timestamp), 0);
  const to = latestTimestamp > 0 ? latestTimestamp : Date.now();
  const from = to - 60 * 60 * 1000;

  return {
    from: new Date(from).toISOString(),
    to: new Date(to).toISOString()
  };
}

onMounted(() => {
  void refreshSession();
});

onBeforeUnmount(() => {
  stopDashboardPolling();
});
</script>
