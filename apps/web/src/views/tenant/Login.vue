<template>
  <main class="grid min-h-screen place-items-center bg-[#07111f] px-4 py-10 text-slate-100">
    <section class="w-full max-w-md rounded-lg border border-field-mint/20 bg-[#101f32]/90 p-7 shadow-field">
      <div class="mb-7 text-center">
        <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-field-green text-[#102016]">
          <Sprout class="h-8 w-8" />
        </div>
        <h1 class="text-2xl font-semibold tracking-normal text-white">PAMILO Smart Farming</h1>
        <p class="mt-2 text-sm text-slate-400">Tenant farmer portal</p>
      </div>

      <form class="grid gap-4" @submit.prevent="goToDashboard">
        <label class="grid gap-2 text-sm font-medium text-slate-300">
          Email atau Username
          <input class="min-h-12 rounded-lg border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-field-mint focus:ring-2 focus:ring-field-mint/30" type="text" autocomplete="username" />
        </label>
        <label class="grid gap-2 text-sm font-medium text-slate-300">
          Kata Sandi
          <input class="min-h-12 rounded-lg border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-field-mint focus:ring-2 focus:ring-field-mint/30" type="password" autocomplete="current-password" />
        </label>
        <button class="mt-2 min-h-12 rounded-full bg-field-green px-5 text-sm font-semibold text-[#102016] hover:bg-field-mint" type="submit">
          Masuk
        </button>
      </form>
    </section>
  </main>
</template>

<script setup lang="ts">
import { Sprout } from "@lucide/vue";
import { useRouter } from "vue-router";

const router = useRouter();

function goToDashboard(): void {
  void router.push("/dashboard");
}
</script>
