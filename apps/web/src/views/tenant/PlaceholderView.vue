<template>
  <section class="panel-surface p-4 md:p-6">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 class="text-xl font-semibold tracking-normal text-white">{{ title }}</h2>
        <p class="mt-2 max-w-2xl text-sm text-slate-400">{{ subtitle }}</p>
      </div>
      <span class="rounded-full border border-field-mint/25 bg-field-mint/10 px-3 py-1 text-sm text-field-mint">Phase 3 foundation</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const title = computed(() => typeof route.meta.title === "string" ? route.meta.title : "PAMILO");
const subtitle = computed(() => typeof route.meta.subtitle === "string" ? route.meta.subtitle : "Module shell");
</script>
