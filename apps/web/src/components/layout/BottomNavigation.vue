<template>
  <nav
    class="fixed bottom-0 left-0 z-50 w-full border-t border-white/80 bg-white/80 p-2 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)] backdrop-blur-xl md:hidden"
    aria-label="Navigasi utama"
  >
    <div class="flex h-16 items-center justify-around gap-1 overflow-x-auto">
      <RouterLink
        v-for="item in visibleNavItems"
        :key="item.to"
        :to="item.to"
        class="group inline-flex min-h-[44px] min-w-[56px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
        :class="isActive(item.to) ? 'bg-emerald-100 p-2 text-emerald-600' : 'p-2 text-slate-400 hover:bg-white/60 hover:text-slate-700'"
        :aria-label="item.label"
      >
        <component :is="item.icon" class="h-5 w-5 shrink-0" />
        <span class="max-w-full truncate text-[11px] leading-tight">{{ item.shortLabel }}</span>
      </RouterLink>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { BarChart3, Bot, CloudSun, Database, FileText, Gauge, Router, Settings, TabletSmartphone, UsersRound } from "@lucide/vue";
import { computed } from "vue";
import { useRoute } from "vue-router";
import { canReadOnlyTenantAccessPath } from "../../config/tenantAccess";
import { useAuthStore } from "../../stores/authStore";

const route = useRoute();
const authStore = useAuthStore();

const navItems = [
  { to: "/dashboard", label: "Dashboard", shortLabel: "Home", icon: Gauge },
  { to: "/ai-recommendation", label: "AI Rekomendasi", shortLabel: "AI", icon: Bot },
  { to: "/weather", label: "Weather Station", shortLabel: "Cuaca", icon: CloudSun },
  { to: "/chart", label: "Grafik", shortLabel: "Grafik", icon: BarChart3 },
  { to: "/report", label: "Report", shortLabel: "Report", icon: FileText },
  { to: "/mqtt", label: "MQTT", shortLabel: "MQTT", icon: Router },
  { to: "/devices", label: "Perangkat", shortLabel: "Device", icon: TabletSmartphone },
  { to: "/master-data", label: "Master Data", shortLabel: "Master", icon: Database },
  { to: "/tenant-users", label: "User Tenant", shortLabel: "User", icon: UsersRound },
  { to: "/settings", label: "Pengaturan", shortLabel: "Setelan", icon: Settings }
];

const visibleNavItems = computed(() => authStore.isReadOnlyTenant
  ? navItems.filter((item) => canReadOnlyTenantAccessPath(item.to))
  : navItems);

function isActive(path: string): boolean {
  return route.path === path || route.path.startsWith(`${path}/`);
}
</script>
