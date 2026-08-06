<template>
  <div class="min-h-screen bg-[#070d18] text-slate-100">
    <aside class="fixed inset-y-0 left-0 hidden w-72 border-r border-white/10 bg-[#0d1624] lg:block">
      <div class="flex h-20 items-center gap-3 border-b border-white/10 px-5">
        <div class="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-300 text-slate-950">
          <ShieldCheck class="h-6 w-6" />
        </div>
        <div>
          <p class="text-base font-semibold tracking-normal">Super Admin</p>
          <p class="text-xs text-amber-200">License Control</p>
        </div>
      </div>
      <nav class="space-y-1 px-3 py-4" aria-label="Super admin navigation">
        <RouterLink
          v-for="item in adminItems"
          :key="item.to"
          :to="item.to"
          class="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
          :class="route.path === item.to ? 'bg-amber-300/10 text-amber-200 ring-1 ring-amber-300/30' : ''"
        >
          <component :is="item.icon" class="h-5 w-5" />
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>
    </aside>

    <div class="min-h-screen lg:pl-72">
      <header class="sticky top-0 z-30 border-b border-white/10 bg-[#070d18]/90 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h1 class="text-xl font-semibold tracking-normal text-white">{{ title }}</h1>
            <p class="mt-1 text-sm text-slate-400">{{ subtitle }}</p>
          </div>
          <button class="rounded-lg border border-field-mint/30 px-4 py-2 text-sm font-semibold text-field-mint hover:bg-field-mint/10" type="button" @click="logoutToTenant">
            Tenant Portal
          </button>
        </div>
      </header>
      <main class="px-4 pb-8 pt-4 sm:px-6 lg:px-8">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { BadgeCheck, LayoutDashboard, ShieldCheck } from "@lucide/vue";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../../stores/authStore";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const title = computed(() => typeof route.meta.title === "string" ? route.meta.title : "Super Admin");
const subtitle = computed(() => typeof route.meta.subtitle === "string" ? route.meta.subtitle : "SaaS control plane");
const adminItems = [
  { to: "/superadmin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/superadmin/licenses", label: "License Management", icon: BadgeCheck }
];

async function logoutToTenant(): Promise<void> {
  authStore.logout();
  await router.push("/login");
}
</script>
