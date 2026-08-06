<template>
  <div class="min-h-screen bg-[#07111f] text-slate-100">
    <Sidebar class="fixed inset-y-0 left-0 z-40 hidden w-72 lg:flex" />

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="sidebarOpen" class="fixed inset-0 z-50 bg-slate-950/70 lg:hidden" @click="sidebarOpen = false">
        <Sidebar class="h-full w-72" mobile @navigate="sidebarOpen = false" @click.stop />
      </div>
    </Transition>

    <div class="min-h-screen lg:pl-72">
      <Topbar @toggle-sidebar="sidebarOpen = true" />
      <main class="px-4 pb-8 pt-4 sm:px-6 lg:px-8">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import Sidebar from "./Sidebar.vue";
import Topbar from "./Topbar.vue";

const sidebarOpen = ref(false);
</script>
