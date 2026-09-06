<template>
  <div class="min-h-screen text-slate-800">
    <Sidebar
      class="fixed bottom-4 left-4 top-4 z-40 hidden overflow-hidden rounded-2xl border border-white/70 lg:flex"
      :class="sidebarCollapsed ? 'w-20' : 'w-72'"
      :collapsed="sidebarCollapsed"
      @toggle-collapse="sidebarCollapsed = !sidebarCollapsed"
    />

    <header class="sticky top-0 z-40 flex min-h-16 items-center justify-between bg-transparent px-4 py-3 lg:hidden">
      <div class="min-w-0">
        <p class="truncate text-base font-semibold tracking-normal text-slate-800">PAMILO Smart Farming GIS</p>
      </div>

      <button
        class="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-transparent text-slate-700 transition hover:text-teal-700 focus:outline-none focus:ring-2 focus:ring-field-mint/40"
        type="button"
        aria-label="Notifikasi"
      >
        <Bell class="h-5 w-5" />
      </button>
    </header>

    <div class="min-h-screen transition-[padding] duration-200" :class="sidebarCollapsed ? 'lg:pl-28' : 'lg:pl-80'">
      <main class="px-4 pb-28 pt-2 sm:px-6 lg:px-8 lg:pb-8 lg:pt-4">
        <RouterView />
      </main>
    </div>

    <BottomNavigation />
  </div>
</template>

<script setup lang="ts">
import { Bell } from "@lucide/vue";
import { onBeforeUnmount, onMounted, ref } from "vue";
import BottomNavigation from "./BottomNavigation.vue";
import Sidebar from "./Sidebar.vue";
import { useTelemetryStore } from "../../stores/telemetryStore";

const sidebarCollapsed = ref(false);
const telemetryStore = useTelemetryStore();
let telemetryRefreshTimer: number | undefined;

onMounted(() => {
  void telemetryStore.connect();
  void telemetryStore.refreshHistory();
  telemetryRefreshTimer = window.setInterval(() => {
    void telemetryStore.refreshHistory();
  }, 30_000);
});

onBeforeUnmount(() => {
  if (telemetryRefreshTimer) {
    window.clearInterval(telemetryRefreshTimer);
  }

  telemetryStore.disconnect();
});
</script>
