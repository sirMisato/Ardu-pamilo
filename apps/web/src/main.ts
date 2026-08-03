import { computed, createApp, onMounted, reactive, ref } from "vue";
import { metricCodes, type PolygonGeometry } from "@pamilo/shared";
import {
  createFarm,
  createPlot,
  getFarmPlots,
  getFarms,
  getMe,
  getPlotDevices,
  login,
  logout,
  provisionDevice,
  revokeDevice,
  type DevicePayload,
  type DeviceProvisioningPayload,
  type FarmPayload,
  type MePayload,
  type PlotPayload
} from "./api.js";
import "./styles.css";

const App = {
  setup() {
    const auth = ref<MePayload | null>(null);
    const farms = ref<FarmPayload[]>([]);
    const plots = ref<PlotPayload[]>([]);
    const devices = ref<DevicePayload[]>([]);
    const provisioningCredential = ref<DeviceProvisioningPayload | null>(null);
    const activeFarmId = ref("");
    const selectedPlotId = ref("");
    const loading = ref(true);
    const busy = ref(false);
    const workspaceBusy = ref(false);
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
          selectedPlotId.value = "";
          return;
        }

        plots.value = response.data;
        selectedPlotId.value = response.data[0]?.id ?? "";
        provisioningCredential.value = null;

        if (selectedPlotId.value) {
          await loadDevices(selectedPlotId.value);
        } else {
          devices.value = [];
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
      await loadDevices(plotId);
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
        const response = await createPlot({
          farmId: activeFarm.value.id,
          name: plotForm.name,
          adm4Code: plotForm.adm4Code,
          geometry: createTemplatePolygon(auth.value.active_tenant.id, plots.value.length),
          csrfToken: auth.value.csrf_token
        });

        if (!response.data) {
          error.value = response.error?.message ?? "Gagal membuat plot.";
          return;
        }

        plots.value = [...plots.value, response.data];
        selectedPlotId.value = response.data.id;
        plotForm.name = "";
        devices.value = [];
        provisioningCredential.value = null;
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

    onMounted(() => {
      void refreshSession();
    });

    return {
      auth,
      activeFarm,
      activeFarmId,
      busy,
      canWriteMetadata,
      devices,
      deviceForm,
      error,
      farmForm,
      farms,
      formatCoordinate,
      formatHectares,
      formatMeters,
      form,
      isSignedIn,
      loading,
      loginTenantOptions,
      metrics: metricCodes,
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
      workspaceBusy
    };
  },
  template: `
    <main class="shell">
      <section v-if="loading" class="loading-panel" aria-live="polite">
        <span></span>
      </section>

      <section v-else class="workspace">
        <div class="map-pane" aria-label="Area peta GIS PAMILO">
          <div class="plot-shape"></div>
          <p class="attribution">&copy; OpenStreetMap contributors</p>
        </div>

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

          <ul class="metric-list">
            <li v-for="metric in metrics" :key="metric">{{ metric }}</li>
          </ul>
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
