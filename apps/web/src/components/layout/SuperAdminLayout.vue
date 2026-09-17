<template>
  <div class="min-h-screen text-slate-800">
    <aside class="fixed inset-y-0 left-0 hidden w-72 border-r border-white/70 bg-white/70 shadow-glass backdrop-blur-xl lg:block">
      <div class="flex h-20 items-center gap-3 border-b border-white/70 px-5">
        <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-300 text-slate-950 shadow-glass-soft">
          <ShieldCheck class="h-6 w-6" />
        </div>
        <div>
          <p class="text-base font-semibold tracking-normal text-slate-800">{{ t("roles.superAdmin") }}</p>
          <p class="text-xs text-amber-700">{{ t("layout.licenseControl") }}</p>
        </div>
      </div>
      <nav class="space-y-1 px-3 py-4" :aria-label="t('layout.superAdminNav')">
        <RouterLink
          v-for="item in adminItems"
          :key="item.to"
          :to="item.to"
          class="flex min-h-11 items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-white/70 hover:text-amber-700"
          :class="route.path === item.to ? 'bg-amber-300/20 text-amber-700 ring-1 ring-amber-300/40' : ''"
        >
          <component :is="item.icon" class="h-5 w-5" />
          <span>{{ t(item.labelKey) }}</span>
        </RouterLink>
      </nav>
    </aside>

    <div class="min-h-screen lg:pl-72">
      <header class="sticky top-0 z-30 border-b border-white/70 bg-white/70 px-4 py-4 shadow-glass-soft backdrop-blur-xl sm:px-6 lg:px-8">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h1 class="text-xl font-semibold tracking-normal text-slate-800">{{ title }}</h1>
            <p class="mt-1 text-sm text-slate-500">{{ subtitle }}</p>
          </div>
          <div class="flex items-center gap-2">
            <LanguageSelect />
            <button class="rounded-2xl border border-field-mint/40 bg-white/60 px-4 py-2 text-sm font-semibold text-teal-700 shadow-glass-soft hover:bg-field-mint/10" type="button" @click="logoutToTenant">
              {{ t("layout.tenantPortal") }}
            </button>
          </div>
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
import { routeMetaText, useI18n } from "../../i18n";
import { useAuthStore } from "../../stores/authStore";
import LanguageSelect from "../i18n/LanguageSelect.vue";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { t } = useI18n();
const title = computed(() => routeMetaText(route, "title"));
const subtitle = computed(() => routeMetaText(route, "subtitle"));
const adminItems = [
  { to: "/superadmin/dashboard", labelKey: "navigation.dashboard", icon: LayoutDashboard },
  { to: "/superadmin/licenses", labelKey: "navigation.licenses", icon: BadgeCheck }
];

async function logoutToTenant(): Promise<void> {
  authStore.logout();
  await router.push("/login");
}
</script>
