/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WEB_BASE_URL: string;
  readonly VITE_API_BASE_URL: string;
  readonly VITE_BMKG_FORECAST_BASE_URL: string;
  readonly VITE_MQTT_BROKER_URL: string;
  readonly VITE_MQTT_PASSWORD?: string;
  readonly VITE_MQTT_USERNAME?: string;
  readonly VITE_MQTT_WEBSOCKET_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.vue" {
  import type { DefineComponent } from "vue";

  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}
