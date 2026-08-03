import { createApp } from "vue";
import { metricCodes } from "@pamilo/shared";
import "./styles.css";

const App = {
  setup() {
    return {
      metrics: metricCodes
    };
  },
  template: `
    <main class="shell">
      <section class="workspace">
        <div class="map-pane" aria-label="Area peta GIS PAMILO">
          <div class="plot-shape"></div>
          <p class="attribution">&copy; OpenStreetMap contributors</p>
        </div>
        <aside class="panel" aria-label="Ringkasan foundation">
          <p class="eyebrow">Fase 1 Foundation</p>
          <h1>PAMILO Smart Farming GIS</h1>
          <p class="summary">
            Monorepo siap untuk API, frontend, worker MQTT, shared schema, Docker local, dan CI checks.
          </p>
          <ul class="metric-list">
            <li v-for="metric in metrics" :key="metric">{{ metric }}</li>
          </ul>
        </aside>
      </section>
    </main>
  `
};

createApp(App).mount("#app");
