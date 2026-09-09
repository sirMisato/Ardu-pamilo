import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      includeAssets: ["pwa.svg"],
      manifest: {
        background_color: "#f8fafc",
        description: "Mobile-first smart farming monitoring for PAMILO tenants.",
        display: "standalone",
        icons: [
          {
            purpose: "any maskable",
            sizes: "any",
            src: "/pwa.svg",
            type: "image/svg+xml"
          }
        ],
        name: "PAMILO Smart Farming",
        short_name: "PAMILO",
        start_url: "/",
        theme_color: "#ffffff"
      },
      registerType: "autoUpdate",
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: "/index.html"
      }
    })
  ],
  server: {
    port: Number(process.env.WEB_PORT ?? "5173"),
    proxy: {
      "/api": {
        target: process.env.API_ORIGIN ?? "http://localhost:3000",
        changeOrigin: true
      }
    }
  }
});
