<template>
  <header class="sticky top-0 z-30 border-b border-white/70 bg-white/70 text-slate-800 shadow-glass-soft backdrop-blur-xl">
    <div class="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
      <div class="flex min-w-0 items-center gap-3">
        <button class="icon-button lg:hidden" type="button" aria-label="Open navigation" @click="emit('toggleSidebar')">
          <Menu class="h-5 w-5" />
        </button>
        <div class="min-w-0">
          <h1 class="truncate text-lg font-semibold tracking-normal text-slate-800 sm:text-xl">{{ title }}</h1>
          <p class="hidden truncate text-sm text-slate-500 sm:block">{{ subtitle }}</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button class="icon-button hidden sm:inline-flex" type="button" aria-label="Search">
          <Search class="h-5 w-5" />
        </button>
        <button class="icon-button" type="button" aria-label="Notifications">
          <Bell class="h-5 w-5" />
        </button>
        <div ref="profileMenuElement" class="relative ml-1">
          <button
            type="button"
            class="flex min-h-10 items-center gap-3 rounded-2xl border border-white/70 bg-white/60 px-2 py-1.5 text-left shadow-glass-soft transition hover:border-field-mint/50 hover:bg-field-mint/10 focus:outline-none focus:ring-2 focus:ring-field-mint/50 sm:px-3"
            aria-haspopup="menu"
            :aria-expanded="profileMenuOpen"
            @click.stop="toggleProfileMenu"
          >
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-field-green text-xs font-bold text-[#102016]">{{ initials }}</span>
            <span class="hidden min-w-0 md:block">
              <span class="block truncate text-sm font-semibold text-slate-800">{{ profileName }}</span>
              <span class="block truncate text-xs text-field-mint">{{ profileDetail }}</span>
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
              class="absolute right-0 mt-2 w-72 overflow-hidden rounded-3xl border border-white/70 bg-white/80 shadow-glass backdrop-blur-xl"
              role="menu"
            >
              <div class="border-b border-white/70 p-4">
                <div class="flex items-center gap-3">
                  <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-field-green text-sm font-bold text-[#102016]">{{ initials }}</div>
                  <div class="min-w-0">
                    <p class="truncate text-sm font-semibold text-slate-800">{{ profileName }}</p>
                    <p class="truncate text-xs text-field-mint">{{ profileDetail }}</p>
                  </div>
                </div>
                <p class="mt-3 rounded-2xl bg-white/60 px-3 py-2 text-xs text-slate-600">{{ profileRoleLabel }}</p>
              </div>
              <div class="p-2">
                <button
                  v-if="canOpenProfileSettings"
                  class="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-field-mint/10 hover:text-teal-700"
                  type="button"
                  role="menuitem"
                  @click="openProfileSettings"
                >
                  <Settings class="h-4 w-4 text-field-mint" />
                  Profil & Pengaturan
                </button>
                <button
                  class="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
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
