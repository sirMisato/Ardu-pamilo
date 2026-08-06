<template>
  <header class="sticky top-0 z-30 border-b border-white/10 bg-[#07111f]/90 backdrop-blur">
    <div class="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
      <div class="flex min-w-0 items-center gap-3">
        <button class="icon-button lg:hidden" type="button" aria-label="Open navigation" @click="emit('toggleSidebar')">
          <Menu class="h-5 w-5" />
        </button>
        <div class="min-w-0">
          <h1 class="truncate text-lg font-semibold tracking-normal text-white sm:text-xl">{{ title }}</h1>
          <p class="hidden truncate text-sm text-slate-400 sm:block">{{ subtitle }}</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button class="icon-button hidden sm:inline-flex" type="button" aria-label="Search">
          <Search class="h-5 w-5" />
        </button>
        <button class="icon-button" type="button" aria-label="Notifications">
          <Bell class="h-5 w-5" />
        </button>
        <div class="ml-1 hidden items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 md:flex">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-field-green text-xs font-bold text-[#102016]">PF</div>
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-white">Pamilo Farm</p>
            <p class="truncate text-xs text-field-mint">Tenant Owner</p>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { Bell, Menu, Search } from "@lucide/vue";
import { computed } from "vue";
import { useRoute } from "vue-router";

const emit = defineEmits<{
  toggleSidebar: [];
}>();

const route = useRoute();
const title = computed(() => typeof route.meta.title === "string" ? route.meta.title : "PAMILO");
const subtitle = computed(() => typeof route.meta.subtitle === "string" ? route.meta.subtitle : "Smart Farming SaaS");
</script>
