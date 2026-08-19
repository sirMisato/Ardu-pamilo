<template>
  <aside class="flex flex-col border-r border-white/10 bg-[#0b1626] text-slate-100 transition-[width] duration-200">
    <div
      class="relative flex h-20 items-center border-b border-white/10"
      :class="collapsed ? 'justify-center px-2' : 'gap-3 px-5'"
    >
      <div class="flex h-11 w-11 items-center justify-center rounded-lg bg-field-green text-[#102016]">
        <Sprout class="h-6 w-6" />
      </div>
      <div v-if="!collapsed" class="min-w-0">
        <p class="truncate text-base font-semibold tracking-normal">PAMILO</p>
        <p class="truncate text-xs text-field-mint">Smart Farming GIS</p>
      </div>
      <button
        v-if="!mobile"
        type="button"
        class="absolute -right-4 top-6 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-[#101f32] text-slate-300 shadow-field transition hover:border-field-mint/50 hover:bg-field-mint/10 hover:text-field-mint focus:outline-none focus:ring-2 focus:ring-field-mint/40"
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
        class="group flex min-h-11 items-center rounded-lg py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
        :class="[
          collapsed ? 'justify-center px-2' : 'gap-3 px-3',
          isActive(item.to) ? 'bg-field-mint/10 text-field-mint ring-1 ring-field-mint/30' : ''
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
  MapPinned,
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
  { to: "/settings", label: "Pengaturan", icon: Settings },
  { to: "/superadmin/dashboard", label: "Super Admin", icon: MapPinned }
];
const navItems = computed(() => authStore.isReadOnlyTenant
  ? allNavItems.filter((item) => canReadOnlyTenantAccessPath(item.to))
  : allNavItems);

function isActive(path: string): boolean {
  return route.path === path || route.path.startsWith(`${path}/`);
}
</script>
