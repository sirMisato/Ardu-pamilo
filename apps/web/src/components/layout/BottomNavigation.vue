<template>
  <nav
    class="fixed bottom-4 left-4 right-4 z-50 rounded-[2rem] border border-white/70 bg-white/60 px-2 shadow-glass backdrop-blur-xl lg:hidden"
    aria-label="Navigasi utama"
  >
    <div class="flex h-16 items-center justify-around gap-1">
      <RouterLink
        v-for="item in visibleNavItems"
        :key="item.to"
        :to="item.to"
        class="group inline-flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-[1.5rem] px-1 text-xs font-semibold text-slate-500 transition hover:text-teal-700 focus:outline-none focus:ring-2 focus:ring-field-mint/40"
        :class="isActive(item.to) ? 'bg-field-mint/10 text-teal-700 ring-1 ring-field-mint/30' : ''"
        :aria-label="item.label"
      >
        <component :is="item.icon" class="h-5 w-5 shrink-0" />
        <span class="max-w-full truncate text-[11px] leading-tight">{{ item.shortLabel }}</span>
      </RouterLink>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { BarChart3, Bot, CloudSun, FileText, Gauge } from "@lucide/vue";
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
  { to: "/report", label: "Report", shortLabel: "Report", icon: FileText }
];

const visibleNavItems = computed(() => authStore.isReadOnlyTenant
  ? navItems.filter((item) => canReadOnlyTenantAccessPath(item.to))
  : navItems);

function isActive(path: string): boolean {
  return route.path === path || route.path.startsWith(`${path}/`);
}
</script>
