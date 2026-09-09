<template>
  <div class="min-h-screen text-slate-800">
    <Sidebar
      class="fixed inset-y-0 left-0 z-40 overflow-hidden"
      :class="sidebarCollapsed ? 'w-20' : 'w-72'"
      :collapsed="sidebarCollapsed"
      @toggle-collapse="sidebarCollapsed = !sidebarCollapsed"
    />

    <div class="min-h-screen transition-[padding] duration-200" :class="sidebarCollapsed ? 'md:pl-20' : 'md:pl-72'">
      <Topbar
        class="md:fixed md:right-0 md:top-0 md:z-50 md:block md:transition-[left]"
        :class="sidebarCollapsed ? 'md:left-20' : 'md:left-72'"
      />
      <main class="px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4 md:px-6 md:pb-8 md:pt-20 lg:px-8">
        <RouterView />
      </main>
    </div>

    <BottomNavigation />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import BottomNavigation from "./BottomNavigation.vue";
import Sidebar from "./Sidebar.vue";
import Topbar from "./Topbar.vue";
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
