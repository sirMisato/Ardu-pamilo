<template>
  <main class="grid min-h-screen place-items-center bg-[#070d18] px-4 py-10 text-slate-100">
    <section class="w-full max-w-md rounded-lg border border-amber-300/20 bg-[#0d1624]/95 p-7 shadow-field">
      <div class="mb-7 text-center">
        <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-amber-300 text-slate-950">
          <ShieldCheck class="h-8 w-8" />
        </div>
        <h1 class="text-2xl font-semibold tracking-normal text-white">Super Admin</h1>
        <p class="mt-2 text-sm text-slate-400">PAMILO SaaS control plane</p>
      </div>

      <form class="grid gap-4" @submit.prevent="goToAdmin">
        <label class="grid gap-2 text-sm font-medium text-slate-300">
          Admin Email
          <input class="min-h-12 rounded-lg border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-300/30" type="email" autocomplete="username" />
        </label>
        <label class="grid gap-2 text-sm font-medium text-slate-300">
          Password
          <input class="min-h-12 rounded-lg border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-300/30" type="password" autocomplete="current-password" />
        </label>
        <button class="mt-2 min-h-12 rounded-full bg-amber-300 px-5 text-sm font-semibold text-slate-950 hover:bg-amber-200" type="submit">
          Masuk Admin
        </button>
      </form>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ShieldCheck } from "@lucide/vue";
import { useRouter } from "vue-router";

const router = useRouter();

function goToAdmin(): void {
  void router.push("/superadmin/dashboard");
}
</script>
