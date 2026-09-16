<template>
  <div ref="rootElement" class="relative inline-flex">
    <button
      type="button"
      class="inline-flex h-10 min-w-16 items-center justify-between gap-2 rounded-xl border border-white/70 bg-white/70 px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none transition hover:bg-white/90 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/40 sm:min-w-40"
      :aria-activedescendant="activeOptionId"
      :aria-expanded="isOpen"
      :aria-label="t('i18n.ariaLabel')"
      aria-haspopup="listbox"
      :aria-controls="listboxId"
      @click="toggleOpen"
      @keydown="handleTriggerKeydown"
    >
      <span class="uppercase sm:hidden">{{ locale }}</span>
      <span class="hidden sm:inline">{{ activeOption.label }}</span>
      <ChevronDown class="h-4 w-4 shrink-0 text-slate-500 transition" :class="isOpen ? 'rotate-180' : ''" />
    </button>

    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="translate-y-1 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-1 opacity-0"
    >
      <ul
        v-if="isOpen"
        :id="listboxId"
        class="absolute right-0 z-[120] mt-12 w-44 rounded-xl border border-white/80 bg-white/95 p-1 text-sm font-semibold text-slate-700 shadow-2xl backdrop-blur-xl"
        role="listbox"
        :aria-label="t('i18n.ariaLabel')"
        tabindex="-1"
        @keydown="handleListboxKeydown"
      >
        <li
          v-for="(option, index) in options"
          :id="optionId(option.value)"
          :key="option.value"
          class="flex min-h-10 cursor-pointer items-center justify-between rounded-lg px-3 py-2 outline-none transition hover:bg-emerald-50"
          :class="[
            option.value === locale ? 'bg-emerald-100 text-emerald-700' : 'text-slate-700',
            index === activeIndex ? 'ring-2 ring-inset ring-emerald-300/50' : ''
          ]"
          role="option"
          :aria-selected="option.value === locale"
          tabindex="-1"
          @click="selectOption(option.value)"
          @mousemove="activeIndex = index"
        >
          <span>{{ option.label }}</span>
          <Check v-if="option.value === locale" class="h-4 w-4" aria-hidden="true" />
        </li>
      </ul>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { Check, ChevronDown } from "@lucide/vue";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n, type LocaleCode } from "../../i18n";

const { locale, options, setLocale, t } = useI18n();
const rootElement = ref<HTMLDivElement | null>(null);
const isOpen = ref(false);
const activeIndex = ref(options.findIndex((option) => option.value === locale.value));
const listboxId = `pamilo-language-listbox-${Math.random().toString(36).slice(2)}`;
const activeOption = computed(() => options.find((option) => option.value === locale.value) ?? { label: "ID - Indonesia", value: "id" });
const activeOptionId = computed(() => optionId(options[activeIndex.value]?.value ?? locale.value));

onMounted(() => {
  document.addEventListener("click", closeOnOutsideClick);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", closeOnOutsideClick);
});

function toggleOpen(): void {
  isOpen.value = !isOpen.value;
  activeIndex.value = Math.max(0, options.findIndex((option) => option.value === locale.value));
}

function openListbox(): void {
  isOpen.value = true;
  activeIndex.value = Math.max(0, options.findIndex((option) => option.value === locale.value));
}

function closeListbox(): void {
  isOpen.value = false;
}

function optionId(value: LocaleCode): string {
  return `${listboxId}-${value}`;
}

function selectOption(value: LocaleCode): void {
  closeListbox();
  void setLocale(value, { explicit: true });
}

function moveActive(delta: number): void {
  activeIndex.value = (activeIndex.value + delta + options.length) % options.length;
}

function handleTriggerKeydown(event: KeyboardEvent): void {
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    openListbox();
    moveActive(event.key === "ArrowDown" ? 1 : -1);
  }

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    if (isOpen.value) {
      selectOption(options[activeIndex.value]?.value ?? locale.value);
    } else {
      openListbox();
    }
  }

  if (event.key === "Escape") {
    closeListbox();
  }
}

function handleListboxKeydown(event: KeyboardEvent): void {
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    moveActive(event.key === "ArrowDown" ? 1 : -1);
  }

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    selectOption(options[activeIndex.value]?.value ?? locale.value);
  }

  if (event.key === "Escape") {
    event.preventDefault();
    closeListbox();
  }
}

function closeOnOutsideClick(event: MouseEvent): void {
  const target = event.target;
  if (target instanceof Node && rootElement.value && !rootElement.value.contains(target)) {
    closeListbox();
  }
}
</script>
