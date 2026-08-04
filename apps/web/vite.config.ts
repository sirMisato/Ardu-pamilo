import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@pamilo/shared": fileURLToPath(new URL("../../packages/shared/src/index.ts", import.meta.url)),
      vue: "vue/dist/vue.esm-bundler.js"
    }
  },
  server: {
    port: Number(process.env.WEB_PORT ?? "5173"),
    proxy: {
      "/api": {
        target: `http://localhost:${process.env.API_PORT ?? "3000"}`,
        changeOrigin: true
      },
      "/health": {
        target: `http://localhost:${process.env.API_PORT ?? "3000"}`,
        changeOrigin: true
      }
    }
  }
});
