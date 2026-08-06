<template>
  <section class="grid gap-4 md:grid-cols-3">
    <article v-for="stat in stats" :key="stat.label" class="rounded-lg border border-white/10 bg-white/5 p-5">
      <p class="text-sm text-slate-400">{{ stat.label }}</p>
      <p class="mt-2 text-2xl font-semibold tracking-normal text-white">{{ stat.value }}</p>
      <p class="mt-4 text-sm text-amber-200">{{ stat.detail }}</p>
    </article>
  </section>
</template>

<script setup lang="ts">
const stats = [
  { label: "Total Tenants", value: "128", detail: "14 joined this month" },
  { label: "Active Licenses", value: "116", detail: "92% renewal health" },
  { label: "System Health", value: "99.9%", detail: "API, MQTT, DB nominal" }
];
</script>
