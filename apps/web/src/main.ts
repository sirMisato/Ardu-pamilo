import { computed, createApp, onMounted, reactive, ref } from "vue";
import { metricCodes, type MetricCode, type PolygonGeometry } from "@pamilo/shared";
import {
  createFarm,
  createPlot,
  getFarmPlots,
  getFarms,
  getHealthReady,
  getMe,
  getPlotDevices,
  getPlotLatestTelemetry,
  getPlotTelemetryHistory,
  getPlotWeather,
  login,
  logout,
  provisionDevice,
  revokeDevice,
  updatePlotGeometry,
  type DevicePayload,
  type DeviceProvisioningPayload,
  type FarmPayload,
  type HealthReadyPayload,
  type MePayload,
  type PlotPayload,
  type TelemetryHistoryPayload,
  type TelemetryReadingPayload,
  type WeatherForecastPointPayload,
  type WeatherPayload
} from "./api.js";
import MapView from "./components/MapView.vue";
import "./styles.css";

const App = {
  components: {
    MapView
  },
  setup() {
    const auth = ref<MePayload | null>(null);
    const farms = ref<FarmPayload[]>([]);
    const plots = ref<PlotPayload[]>([]);
    const devices = ref<DevicePayload[]>([]);
    const latestTelemetry = ref<TelemetryReadingPayload[]>([]);
    const telemetryHistory = ref<TelemetryHistoryPayload | null>(null);
    const weather = ref<WeatherPayload | null>(null);
    const runtimeStatus = ref<HealthReadyPayload | null>(null);
    const provisioningCredential = ref<DeviceProvisioningPayload | null>(null);
    const pendingPlotGeometry = ref<PolygonGeometry | null>(null);
    const activeFarmId = ref("");
    const selectedPlotId = ref("");
    const historyMetric = ref<MetricCode>("soil_temperature");
    const loading = ref(true);
    const busy = ref(false);
    const workspaceBusy = ref(false);
    const historyBusy = ref(false);
    const runtimeBusy = ref(false);
    const error = ref<string | null>(null);
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
    const deviceForm = reactive({
      serialNo: "ESP32-DEMO-001",
      label: "Node Tanah"
    });

    const isSignedIn = computed(() => auth.value !== null);
    const activeFarm = computed(() => farms.value.find((farm) => farm.id === activeFarmId.value) ?? null);
    const selectedPlot = computed(() => plots.value.find((plot) => plot.id === selectedPlotId.value) ?? plots.value[0] ?? null);
    const runtimeDependencyRows = computed(() => Object.entries(runtimeStatus.value?.dependencies ?? {}).map(([name, status]) => ({
      name,
      status
    })));
    const telemetryHistoryPoints = computed(() => telemetryHistory.value?.points ?? []);
    const telemetryHistoryBars = computed(() => {
      const points = telemetryHistoryPoints.value;
      const values = points
        .map((point) => point.value)
        .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
      const minimum = values.length > 0 ? Math.min(...values) : 0;
      const maximum = values.length > 0 ? Math.max(...values) : 1;
      const span = maximum - minimum || 1;

      return points.map((point) => ({
        key: `${point.device_id}:${point.node_id}:${point.metric}:${point.ts}:${point.seq}`,
        point,
        height: typeof point.value === "number" && Number.isFinite(point.value)
          ? `${24 + ((point.value - minimum) / span) * 76}%`
          : "8%"
      }));
    });
    const telemetryMetricOptions = metricCodes;
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
          devices.value = [];
          latestTelemetry.value = [];
          telemetryHistory.value = null;
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
          devices.value = [];
          latestTelemetry.value = [];
          telemetryHistory.value = null;
          weather.value = null;
          selectedPlotId.value = "";
          return;
        }

        plots.value = response.data;
        selectedPlotId.value = response.data[0]?.id ?? "";
        provisioningCredential.value = null;

        if (selectedPlotId.value) {
          await loadPlotRuntime(selectedPlotId.value);
        } else {
          devices.value = [];
          latestTelemetry.value = [];
          telemetryHistory.value = null;
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
      provisioningCredential.value = null;
      await loadPlotRuntime(plotId);
    }

    async function loadPlotRuntime(plotId: string): Promise<void> {
      await loadDevices(plotId);
      await loadLatestTelemetry(plotId);
      await loadTelemetryHistory(plotId);
      await loadWeather(plotId);
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

    async function loadDevices(plotId: string): Promise<void> {
      workspaceBusy.value = true;
      error.value = null;

      try {
        const response = await getPlotDevices(plotId);
        if (!response.data) {
          error.value = response.error?.message ?? "Gagal memuat device.";
          devices.value = [];
          return;
        }

        devices.value = response.data;
      } finally {
        workspaceBusy.value = false;
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
        devices.value = [];
        latestTelemetry.value = [];
        telemetryHistory.value = null;
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
        provisioningCredential.value = null;
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

    async function submitDevice(): Promise<void> {
      if (!auth.value || !selectedPlot.value || !canWriteMetadata.value) {
        return;
      }

      busy.value = true;
      error.value = null;
      provisioningCredential.value = null;

      try {
        const response = await provisionDevice({
          plotId: selectedPlot.value.id,
          serialNo: deviceForm.serialNo,
          label: deviceForm.label,
          csrfToken: auth.value.csrf_token
        });

        if (!response.data) {
          error.value = response.error?.message ?? "Gagal provisioning device.";
          return;
        }

        provisioningCredential.value = response.data;
        devices.value = [...devices.value, response.data];
        deviceForm.serialNo = nextSerial(deviceForm.serialNo);
      } finally {
        busy.value = false;
      }
    }

    async function revokeProvisionedDevice(deviceId: string): Promise<void> {
      if (!auth.value || !canWriteMetadata.value) {
        return;
      }

      busy.value = true;
      error.value = null;

      try {
        const response = await revokeDevice({
          deviceId,
          csrfToken: auth.value.csrf_token
        });

        if (!response.data) {
          error.value = response.error?.message ?? "Gagal revoke device.";
          return;
        }

        devices.value = devices.value.map((device) => device.id === response.data?.id ? response.data : device);
      } finally {
        busy.value = false;
      }
    }

    function resetWorkspace(): void {
      farms.value = [];
      plots.value = [];
      devices.value = [];
      latestTelemetry.value = [];
      telemetryHistory.value = null;
      weather.value = null;
      runtimeStatus.value = null;
      provisioningCredential.value = null;
      activeFarmId.value = "";
      selectedPlotId.value = "";
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
        return "null";
      }

      return `${reading.value.toLocaleString("id-ID", {
        maximumFractionDigits: 2
      })} ${reading.unit}`;
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

    onMounted(() => {
      void refreshSession();
    });

    return {
      auth,
      activeFarm,
      activeFarmId,
      busy,
      canWriteMetadata,
      createPlotFromDrawnPolygon,
      dependencyStateClass,
      devices,
      deviceForm,
      error,
      farmForm,
      farms,
      formatCoordinate,
      formatDependencyName,
      formatHectares,
      formatMeters,
      formatMetricName,
      formatTelemetryValue,
      formatTimestamp,
      formatWeatherDetail,
      formatWeatherTemperature,
      form,
      isSignedIn,
      historyBusy,
      historyMetric,
      latestTelemetry,
      loadRuntimeStatus,
      loadTelemetryHistory,
      loading,
      loginTenantOptions,
      runtimeBusy,
      runtimeDependencyRows,
      runtimeStatus,
      pendingPlotGeometry,
      plotForm,
      plots,
      provisioningCredential,
      revokeProvisionedDevice,
      selectedPlot,
      selectedPlotId,
      selectFarm,
      selectPlot,
      submitDevice,
      submitLogin,
      submitFarm,
      submitPlot,
      submitLogout,
      switchTenant,
      telemetryHistory,
      telemetryHistoryBars,
      telemetryHistoryPoints,
      telemetryMetricOptions,
      updateSelectedPlotGeometry,
      weather,
      weatherEmptyState,
      weatherLabel,
      workspaceBusy
    };
  },
  template: `
    <main class="shell">
      <section v-if="loading" class="loading-panel" aria-live="polite">
        <span></span>
      </section>

      <section v-else class="workspace">
        <MapView
          :can-edit="isSignedIn && canWriteMetadata"
          :plots="plots"
          :selected-plot-id="selectedPlotId"
          @plot-selected="selectPlot"
          @polygon-created="createPlotFromDrawnPolygon"
          @polygon-edited="updateSelectedPlotGeometry"
        />

        <aside v-if="!isSignedIn" class="panel auth-panel" aria-label="Login PAMILO">
          <h1>PAMILO Smart Farming GIS</h1>
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
            <button class="primary-button" :disabled="busy" type="submit">
              {{ busy ? "Memproses" : "Masuk" }}
            </button>
          </form>
          <p v-if="error" class="error-message" role="alert">{{ error }}</p>
        </aside>

        <aside v-else class="panel dashboard-panel" aria-label="Dashboard tenant">
          <div class="topline">
            <p class="eyebrow">{{ auth.active_tenant.role }}</p>
            <button class="ghost-button" :disabled="busy" type="button" @click="submitLogout">Keluar</button>
          </div>
          <h1>{{ auth.active_tenant.name }}</h1>
          <p class="summary">{{ auth.user.email }}</p>

          <div v-if="auth.available_tenants.length > 1" class="tenant-switcher" aria-label="Pilih tenant aktif">
            <button
              v-for="tenant in auth.available_tenants"
              :key="tenant.id"
              class="tenant-button"
              :class="{ active: tenant.id === auth.active_tenant.id }"
              :disabled="busy || tenant.id === auth.active_tenant.id"
              type="button"
              @click="switchTenant(tenant.id)"
            >
              {{ tenant.name }}
            </button>
          </div>

          <dl class="data-list">
            <div>
              <dt>Tenant</dt>
              <dd>{{ auth.active_tenant.id }}</dd>
            </div>
            <div>
              <dt>Farm</dt>
              <dd>{{ farms.length }}</dd>
            </div>
            <div>
              <dt>Plot</dt>
              <dd>{{ plots.length }}</dd>
            </div>
            <div>
              <dt>Device</dt>
              <dd>{{ devices.length }}</dd>
            </div>
          </dl>

          <section class="runtime-strip" aria-label="Status runtime staging">
            <div class="section-title">
              <h2>Runtime</h2>
              <button class="ghost-button" :disabled="runtimeBusy" type="button" @click="loadRuntimeStatus">
                Refresh
              </button>
            </div>
            <div v-if="runtimeDependencyRows.length" class="runtime-grid">
              <div v-for="dependency in runtimeDependencyRows" :key="dependency.name" class="runtime-item">
                <span>{{ formatDependencyName(dependency.name) }}</span>
                <strong :class="dependencyStateClass(dependency.status)">{{ dependency.status }}</strong>
              </div>
            </div>
            <p v-else class="empty-state">Runtime belum tersedia.</p>
          </section>

          <section class="workspace-section" aria-label="Farm tenant">
            <div class="section-title">
              <h2>Farm</h2>
              <span v-if="workspaceBusy">Memuat</span>
            </div>

            <form v-if="canWriteMetadata" class="compact-form" @submit.prevent="submitFarm">
              <input v-model="farmForm.name" aria-label="Nama farm" required type="text" />
              <select v-model="farmForm.timezone" aria-label="Zona waktu farm">
                <option value="Asia/Jakarta">Asia/Jakarta</option>
                <option value="Asia/Makassar">Asia/Makassar</option>
                <option value="Asia/Jayapura">Asia/Jayapura</option>
              </select>
              <button class="primary-button" :disabled="busy" type="submit">Tambah</button>
            </form>

            <div class="farm-list">
              <button
                v-for="farm in farms"
                :key="farm.id"
                class="farm-button"
                :class="{ active: farm.id === activeFarmId }"
                type="button"
                @click="selectFarm(farm.id)"
              >
                <span>{{ farm.name }}</span>
                <small>{{ farm.timezone }}</small>
              </button>
            </div>
          </section>

          <section class="workspace-section" aria-label="Plot farm">
            <div class="section-title">
              <h2>Plot</h2>
              <span v-if="activeFarm">{{ activeFarm.name }}</span>
            </div>

            <form v-if="canWriteMetadata && activeFarm" class="compact-form" @submit.prevent="submitPlot">
              <input v-model="plotForm.name" aria-label="Nama plot" required type="text" />
              <input v-model="plotForm.adm4Code" aria-label="Kode ADM4" type="text" />
              <button class="primary-button" :disabled="busy" type="submit">Tambah</button>
            </form>

            <div v-if="plots.length" class="plot-list">
              <button
                v-for="item in plots"
                :key="item.id"
                class="plot-button"
                :class="{ active: item.id === selectedPlotId }"
                type="button"
                @click="selectPlot(item.id)"
              >
                <span>{{ item.name }}</span>
                <small>{{ formatHectares(item.area_ha) }}</small>
              </button>
            </div>
            <p v-else class="empty-state">Belum ada plot.</p>
          </section>

          <dl v-if="selectedPlot" class="data-list plot-detail">
            <div>
              <dt>Plot aktif</dt>
              <dd>{{ selectedPlot.name }}</dd>
            </div>
            <div>
              <dt>Luas</dt>
              <dd>{{ formatHectares(selectedPlot.area_ha) }}</dd>
            </div>
            <div>
              <dt>Area</dt>
              <dd>{{ formatMeters(selectedPlot.area_m2) }}</dd>
            </div>
            <div>
              <dt>Centroid</dt>
              <dd>{{ formatCoordinate(selectedPlot.centroid.lat) }}, {{ formatCoordinate(selectedPlot.centroid.lng) }}</dd>
            </div>
            <div>
              <dt>BBox</dt>
              <dd>{{ formatCoordinate(selectedPlot.bbox.west) }} / {{ formatCoordinate(selectedPlot.bbox.south) }}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{{ selectedPlot.mapping_status }}</dd>
            </div>
          </dl>

          <section v-if="selectedPlot" class="workspace-section" aria-label="Cuaca BMKG plot">
            <div class="section-title">
              <h2>Weather</h2>
              <span>{{ weatherLabel }}</span>
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

          <section v-if="selectedPlot" class="workspace-section" aria-label="Telemetry plot">
            <div class="section-title">
              <h2>Telemetry</h2>
              <span>{{ selectedPlot.name }}</span>
            </div>

            <div v-if="latestTelemetry.length" class="telemetry-list">
              <div v-for="reading in latestTelemetry" :key="reading.metric" class="telemetry-row">
                <div>
                  <span>{{ formatMetricName(reading.metric) }}</span>
                  <small>{{ reading.device_id }} / {{ reading.node_id }} / seq {{ reading.seq }}</small>
                </div>
                <strong>{{ formatTelemetryValue(reading) }}</strong>
                <small>{{ formatTimestamp(reading.ts) }}</small>
              </div>
            </div>
            <p v-else class="empty-state">Belum ada telemetry.</p>
          </section>

          <section v-if="selectedPlot" class="workspace-section" aria-label="History telemetry plot">
            <div class="section-title">
              <h2>History</h2>
              <span>{{ historyBusy ? "Memuat" : historyMetric }}</span>
            </div>

            <div class="history-controls">
              <select v-model="historyMetric" aria-label="Metric history" @change="loadTelemetryHistory()">
                <option v-for="metric in telemetryMetricOptions" :key="metric" :value="metric">
                  {{ formatMetricName(metric) }}
                </option>
              </select>
              <button class="ghost-button" :disabled="historyBusy" type="button" @click="loadTelemetryHistory()">
                Refresh
              </button>
            </div>

            <div v-if="telemetryHistoryBars.length" class="history-chart" aria-hidden="true">
              <span
                v-for="bar in telemetryHistoryBars"
                :key="bar.key"
                :style="{ height: bar.height }"
              ></span>
            </div>

            <div v-if="telemetryHistoryPoints.length" class="history-list">
              <div v-for="point in telemetryHistoryPoints" :key="point.ts + point.metric + point.device_id" class="history-row">
                <span>{{ formatTimestamp(point.ts) }}</span>
                <strong>{{ formatTelemetryValue(point) }}</strong>
                <small>{{ point.device_id }} / seq {{ point.seq }}</small>
              </div>
            </div>
            <p v-else class="empty-state">History belum tersedia.</p>
          </section>

          <section v-if="selectedPlot" class="workspace-section" aria-label="Device plot">
            <div class="section-title">
              <h2>Device</h2>
              <span>{{ selectedPlot.name }}</span>
            </div>

            <form v-if="canWriteMetadata" class="compact-form" @submit.prevent="submitDevice">
              <input v-model="deviceForm.serialNo" aria-label="Serial device" required type="text" />
              <input v-model="deviceForm.label" aria-label="Label device" type="text" />
              <button class="primary-button" :disabled="busy" type="submit">Provision</button>
            </form>

            <div v-if="devices.length" class="device-list">
              <div v-for="device in devices" :key="device.id" class="device-row">
                <div>
                  <span>{{ device.label || device.serial_no }}</span>
                  <small>{{ device.status }} - {{ device.client_id }}</small>
                </div>
                <button
                  v-if="canWriteMetadata && device.status !== 'revoked'"
                  class="ghost-button"
                  :disabled="busy"
                  type="button"
                  @click="revokeProvisionedDevice(device.id)"
                >
                  Revoke
                </button>
              </div>
            </div>
            <p v-else class="empty-state">Belum ada device.</p>

            <dl v-if="provisioningCredential" class="credential-box">
              <div>
                <dt>Username</dt>
                <dd>{{ provisioningCredential.mqtt_username }}</dd>
              </div>
              <div>
                <dt>Password</dt>
                <dd>{{ provisioningCredential.credential.password }}</dd>
              </div>
              <div>
                <dt>Fingerprint</dt>
                <dd>{{ provisioningCredential.credential.fingerprint }}</dd>
              </div>
            </dl>
          </section>

          <p v-if="error" class="error-message" role="alert">{{ error }}</p>
        </aside>
      </section>
    </main>
  `
};

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

function nextSerial(current: string): string {
  const match = current.match(/^(.*?)(\d+)$/);
  if (!match) {
    return `${current}-001`;
  }

  const [, prefix, numeric] = match;
  if (!prefix || !numeric) {
    return `${current}-001`;
  }

  return `${prefix}${String(Number(numeric) + 1).padStart(numeric.length, "0")}`;
}

createApp(App).mount("#app");
