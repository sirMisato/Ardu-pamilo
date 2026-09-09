<template>
  <aside class="hidden flex-col border-r border-white/80 bg-white/60 text-slate-700 shadow-sm backdrop-blur-xl transition-[width] duration-200 md:flex">
    <div
      class="relative flex h-20 items-center border-b border-white/80"
      :class="collapsed ? 'justify-center px-2' : 'gap-3 px-5'"
    >
      <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-300 text-emerald-950 shadow-sm">
        <Sprout class="h-6 w-6" />
      </div>
      <div v-if="!collapsed" class="min-w-0">
        <p class="truncate text-base font-bold tracking-normal text-slate-800">PAMILO</p>
        <p class="truncate text-xs font-medium text-slate-500">Smart Farming GIS</p>
      </div>
      <button
        v-if="!mobile"
        type="button"
        class="absolute -right-4 top-6 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/80 bg-white/70 text-slate-600 shadow-sm transition-all hover:bg-white/90 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
        :aria-label="collapsed ? 'Show sidebar' : 'Collapse sidebar'"
        :title="collapsed ? 'Show sidebar' : 'Collapse sidebar'"
        @click="emit('toggleCollapse')"
      >
        <PanelLeftOpen v-if="collapsed" class="h-4 w-4" />
        <PanelLeftClose v-else class="h-4 w-4" />
      </button>
    </div>

    <nav class="flex-1 space-y-1 overflow-y-auto py-4" :class="collapsed ? 'px-2' : 'px-3'" aria-label="Tenant navigation">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="group flex min-h-11 items-center rounded-xl py-2 text-sm transition-all"
        :class="[
          collapsed ? 'justify-center px-2' : 'gap-3 px-3',
          isActive(item.to) ? 'bg-emerald-100 font-semibold text-emerald-700' : 'font-medium text-slate-500 hover:bg-white/60 hover:text-slate-700'
        ]"
        :title="collapsed ? item.label : undefined"
        @click="emit('navigate')"
      >
        <component :is="item.icon" class="h-5 w-5 shrink-0" />
        <span v-if="!collapsed" class="min-w-0 flex-1 truncate">{{ item.label }}</span>
      </RouterLink>
    </nav>

  </aside>
</template>

<script setup lang="ts">
import {
  BarChart3,
  Bot,
  CloudSun,
  Database,
  FileText,
  Gauge,
  PanelLeftClose,
  PanelLeftOpen,
  Router,
  Settings,
  Sprout,
  TabletSmartphone,
  UsersRound
} from "@lucide/vue";
import { computed } from "vue";
import { useRoute } from "vue-router";
import { canReadOnlyTenantAccessPath } from "../../config/tenantAccess";
import { useAuthStore } from "../../stores/authStore";

withDefaults(defineProps<{
  collapsed?: boolean;
  mobile?: boolean;
}>(), {
  collapsed: false,
  mobile: false
});

const emit = defineEmits<{
  navigate: [];
  toggleCollapse: [];
}>();

const route = useRoute();
const authStore = useAuthStore();
const allNavItems = [
  { to: "/dashboard", label: "Dashboard", icon: Gauge },
  { to: "/ai-recommendation", label: "AI Rekomendasi", icon: Bot },
  { to: "/weather", label: "Weather Station", icon: CloudSun },
  { to: "/chart", label: "Grafik", icon: BarChart3 },
  { to: "/report", label: "Report", icon: FileText },
  { to: "/mqtt", label: "MQTT", icon: Router },
  { to: "/devices", label: "Perangkat", icon: TabletSmartphone },
  { to: "/master-data", label: "Master Data", icon: Database },
  { to: "/tenant-users", label: "User Tenant", icon: UsersRound },
  { to: "/settings", label: "Pengaturan", icon: Settings }
];
const navItems = computed(() => authStore.isReadOnlyTenant
  ? allNavItems.filter((item) => canReadOnlyTenantAccessPath(item.to))
  : allNavItems);

function isActive(path: string): boolean {
  return route.path === path || route.path.startsWith(`${path}/`);
}
</script>
