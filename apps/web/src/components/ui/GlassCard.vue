<template>
  <section class="glass-panel p-5 sm:p-6">
    <header v-if="title || icon" class="mb-5 flex items-center gap-3">
      <div
        v-if="icon"
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-pastel-green/40 text-teal-700 shadow-glass-soft"
        aria-hidden="true"
      >
        <component :is="icon" class="h-5 w-5" />
      </div>
      <h2 v-if="title" class="text-base font-semibold tracking-normal text-slate-800">
        {{ title }}
      </h2>
    </header>

    <slot />
  </section>
</template>

<script setup lang="ts">
import type { Component } from "vue";

defineProps<{
  title?: string;
  icon?: Component;
}>();
</script>
