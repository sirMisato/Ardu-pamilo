import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [vue()],
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
