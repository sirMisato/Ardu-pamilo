<template>
  <label class="inline-flex items-center">
    <span class="sr-only">{{ t("i18n.ariaLabel") }}</span>
    <select
      class="h-10 max-w-[11rem] rounded-xl border border-white/70 bg-white/70 px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/40"
      :aria-label="t('i18n.ariaLabel')"
      :value="locale"
      @change="handleChange"
    >
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
  </label>
</template>

<script setup lang="ts">
import { useI18n } from "../../i18n";

const { locale, options, setLocale, t } = useI18n();

function handleChange(event: Event): void {
  const target = event.target;

  if (target instanceof HTMLSelectElement) {
    void setLocale(target.value, { explicit: true });
  }
}
</script>
