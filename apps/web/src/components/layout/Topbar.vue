<template>
  <header class="sticky top-0 z-50 border-b border-white/80 bg-white/60 text-slate-800 shadow-sm backdrop-blur-md">
    <div class="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
      <div class="flex min-w-0 items-center gap-3">
        <button class="rounded-full bg-white/50 p-2 text-slate-600 shadow-sm transition-all hover:bg-white/80 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 lg:hidden" type="button" aria-label="Open navigation" @click="emit('toggleSidebar')">
          <Menu class="h-5 w-5" />
        </button>
        <div class="min-w-0">
          <h1 class="truncate text-lg font-bold tracking-normal text-slate-800 sm:text-xl">{{ title }}</h1>
          <p class="hidden truncate text-sm text-slate-500 sm:block">{{ subtitle }}</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button class="hidden rounded-full bg-white/50 p-2 text-slate-600 shadow-sm transition-all hover:bg-white/80 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 sm:inline-flex" type="button" aria-label="Search">
          <Search class="h-5 w-5" />
        </button>
        <button class="rounded-full bg-white/50 p-2 text-slate-600 shadow-sm transition-all hover:bg-white/80 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400/40" type="button" aria-label="Notifications">
          <Bell class="h-5 w-5" />
        </button>
        <div ref="profileMenuElement" class="relative ml-1">
          <button
            type="button"
            class="flex cursor-pointer items-center gap-3 rounded-full border border-white/60 bg-white/50 px-4 py-2 text-left text-slate-700 shadow-sm backdrop-blur-md transition-all hover:bg-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
            aria-haspopup="menu"
            :aria-expanded="profileMenuOpen"
            @click.stop="toggleProfileMenu"
          >
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-300 text-xs font-bold text-emerald-950">{{ initials }}</span>
            <span class="hidden min-w-0 md:block">
              <span class="block truncate text-sm font-bold text-slate-700">{{ profileName }}</span>
              <span class="block truncate text-xs text-slate-500">{{ profileDetail }}</span>
            </span>
            <ChevronDown class="hidden h-4 w-4 shrink-0 text-slate-500 sm:block" :class="profileMenuOpen ? 'rotate-180' : ''" />
          </button>

          <Transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="translate-y-1 opacity-0"
            enter-to-class="translate-y-0 opacity-100"
            leave-active-class="transition duration-100 ease-in"
            leave-from-class="translate-y-0 opacity-100"
            leave-to-class="translate-y-1 opacity-0"
          >
            <div
              v-if="profileMenuOpen"
              class="absolute right-0 z-[100] mt-3 w-56 rounded-2xl border border-white/80 bg-white/95 p-2 shadow-2xl backdrop-blur-xl"
              role="menu"
            >
              <div class="border-b border-slate-200/70 px-2 pb-3 pt-2">
                <div class="flex items-center gap-3">
                  <div class="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-300 text-sm font-bold text-emerald-950">{{ initials }}</div>
                  <div class="min-w-0">
                    <p class="truncate text-sm font-bold text-slate-700">{{ profileName }}</p>
                    <p class="truncate text-xs text-slate-500">{{ profileDetail }}</p>
                  </div>
                </div>
                <p class="mt-3 rounded-xl bg-white/60 px-3 py-2 text-xs font-medium text-slate-500">{{ profileRoleLabel }}</p>
              </div>
              <div class="pt-2">
                <button
                  v-if="canOpenProfileSettings"
                  class="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:bg-emerald-100 hover:text-emerald-700"
                  type="button"
                  role="menuitem"
                  @click="openProfileSettings"
                >
                  <Settings class="h-4 w-4 text-emerald-700" />
                  Profil & Pengaturan
                </button>
                <button
                  class="flex w-full items-center gap-3 rounded-xl bg-transparent px-4 py-2.5 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                  type="button"
                  role="menuitem"
                  @click="logout"
                >
                  <LogOut class="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { Bell, ChevronDown, LogOut, Menu, Search, Settings } from "@lucide/vue";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { appEnvironment } from "../../config/environment";
import { useAuthStore } from "../../stores/authStore";

const emit = defineEmits<{
  toggleSidebar: [];
}>();

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const profileMenuElement = ref<HTMLDivElement | null>(null);
const profileMenuOpen = ref(false);
const title = computed(() => typeof route.meta.title === "string" ? route.meta.title : "PAMILO");
const subtitle = computed(() => typeof route.meta.subtitle === "string" ? route.meta.subtitle : "Smart Farming SaaS");
const apiHost = computed(() => {
  try {
    return new URL(appEnvironment.apiBaseUrl).host;
  } catch {
    return "Tenant Owner";
  }
});
const profileName = computed(() => authStore.tenant?.accountName ?? "Pamilo Farm");
const profileDetail = computed(() => authStore.user?.email ?? apiHost.value);
const initials = computed(() => profileName.value.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "PF");
const canOpenProfileSettings = computed(() => !authStore.isReadOnlyTenant);
const profileRoleLabel = computed(() => {
  const role = authStore.user?.role ?? authStore.tenant?.role ?? "tenant_user";
  return role.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
});

onMounted(() => {
  document.addEventListener("click", closeProfileMenuOnOutsideClick);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", closeProfileMenuOnOutsideClick);
});

function toggleProfileMenu(): void {
  profileMenuOpen.value = !profileMenuOpen.value;
}

function closeProfileMenuOnOutsideClick(event: MouseEvent): void {
  const target = event.target;
  if (target instanceof Node && profileMenuElement.value && !profileMenuElement.value.contains(target)) {
    profileMenuOpen.value = false;
  }
}

async function openProfileSettings(): Promise<void> {
  profileMenuOpen.value = false;
  await router.push("/settings");
}

async function logout(): Promise<void> {
  profileMenuOpen.value = false;
  authStore.logout();
  await router.push("/login");
}
</script>
