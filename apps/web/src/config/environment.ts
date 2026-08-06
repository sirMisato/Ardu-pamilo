export const appEnvironment = {
  webBaseUrl: import.meta.env.VITE_WEB_BASE_URL,
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
  bmkgForecastBaseUrl: import.meta.env.VITE_BMKG_FORECAST_BASE_URL,
  mqttBrokerUrl: import.meta.env.VITE_MQTT_BROKER_URL,
  mqttWebSocketUrl: import.meta.env.VITE_MQTT_WEBSOCKET_URL
} as const;

export function resolveApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${appEnvironment.apiBaseUrl}${normalizedPath}`;
}
