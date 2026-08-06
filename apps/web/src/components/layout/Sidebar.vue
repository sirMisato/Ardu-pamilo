<template>
  <aside class="flex flex-col border-r border-white/10 bg-[#0b1626] text-slate-100">
    <div class="flex h-20 items-center gap-3 border-b border-white/10 px-5">
      <div class="flex h-11 w-11 items-center justify-center rounded-lg bg-field-green text-[#102016]">
        <Sprout class="h-6 w-6" />
      </div>
      <div class="min-w-0">
        <p class="truncate text-base font-semibold tracking-normal">PAMILO</p>
        <p class="truncate text-xs text-field-mint">Smart Farming GIS</p>
      </div>
    </div>

    <nav class="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Tenant navigation">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="group flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
        :class="isActive(item.to) ? 'bg-field-mint/10 text-field-mint ring-1 ring-field-mint/30' : ''"
        @click="emit('navigate')"
      >
        <component :is="item.icon" class="h-5 w-5 shrink-0" />
        <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
      </RouterLink>
    </nav>

    <div class="border-t border-white/10 p-4">
      <div class="rounded-lg border border-field-mint/20 bg-field-mint/10 p-3">
        <p class="text-xs font-medium text-field-mint">Realtime Telemetry</p>
        <div class="mt-3 flex items-center gap-2">
          <span class="h-2.5 w-2.5 rounded-full bg-field-green shadow-[0_0_0_6px_rgba(167,232,175,0.12)]"></span>
          <span class="min-w-0 truncate text-xs text-slate-300">{{ mqttTransportLabel }}</span>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import {
  BarChart3,
  CloudSun,
  Database,
  FileText,
  Gauge,
  MapPinned,
  Router,
  Settings,
  Sprout,
  TabletSmartphone
} from "@lucide/vue";
import { computed } from "vue";
import { useRoute } from "vue-router";
import { appEnvironment } from "../../config/environment";

defineProps<{
  mobile?: boolean;
}>();

const emit = defineEmits<{
  navigate: [];
}>();

const route = useRoute();
const mqttTransportLabel = computed(() => {
  try {
    return new URL(appEnvironment.mqttWebSocketUrl).host;
  } catch {
    return "MQTT WebSocket ready";
  }
});
const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: Gauge },
  { to: "/chart", label: "Grafik", icon: BarChart3 },
  { to: "/report", label: "Report", icon: FileText },
  { to: "/weather", label: "Weather Station", icon: CloudSun },
  { to: "/mqtt", label: "MQTT", icon: Router },
  { to: "/devices", label: "Perangkat", icon: TabletSmartphone },
  { to: "/master-data", label: "Master Data", icon: Database },
  { to: "/settings", label: "Pengaturan", icon: Settings },
  { to: "/superadmin/dashboard", label: "Super Admin", icon: MapPinned }
];

function isActive(path: string): boolean {
  return route.path === path || route.path.startsWith(`${path}/`);
}
</script>
