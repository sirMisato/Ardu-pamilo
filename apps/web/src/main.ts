import { computed, createApp, onMounted, reactive, ref } from "vue";
import { metricCodes } from "@pamilo/shared";
import { getMe, getPlot, login, logout, type MePayload, type PlotPayload } from "./api.js";
import "./styles.css";

const App = {
  setup() {
    const auth = ref<MePayload | null>(null);
    const plot = ref<PlotPayload | null>(null);
    const loading = ref(true);
    const busy = ref(false);
    const error = ref<string | null>(null);
    const form = reactive({
      email: "multi@example.test",
      password: "local-demo-password",
      tenantId: "tenant-a"
    });

    const isSignedIn = computed(() => auth.value !== null);
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
          await loadPlotForTenant(response.data.active_tenant.id);
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
        await loadPlotForTenant(response.data.active_tenant.id);
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
        plot.value = null;
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

    async function loadPlotForTenant(tenantId: string): Promise<void> {
      await loadPlot(tenantId === "tenant-b" ? "plot-b" : "plot-a");
    }

    async function loadPlot(plotId: string): Promise<void> {
      const response = await getPlot(plotId);
      plot.value = response.data;

      if (response.error) {
        error.value = response.error.message;
      }
    }

    onMounted(() => {
      void refreshSession();
    });

    return {
      auth,
      busy,
      error,
      form,
      isSignedIn,
      loading,
      loginTenantOptions,
      metrics: metricCodes,
      plot,
      submitLogin,
      submitLogout,
      switchTenant
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
            <div v-if="plot">
              <dt>Plot</dt>
              <dd>{{ plot.name }}</dd>
            </div>
            <div v-if="plot">
              <dt>Luas</dt>
              <dd>{{ plot.area_ha }} ha</dd>
            </div>
          </dl>

          <p v-if="error" class="error-message" role="alert">{{ error }}</p>

          <ul class="metric-list">
            <li v-for="metric in metrics" :key="metric">{{ metric }}</li>
          </ul>
        </aside>
      </section>
    </main>
  `
};

createApp(App).mount("#app");
