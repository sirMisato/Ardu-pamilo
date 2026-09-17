<template>
  <main class="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-100 py-10 text-slate-700">
    <section class="relative z-10 mx-4 w-full max-w-md rounded-[2.5rem] border border-white/60 bg-white/80 p-8 shadow-2xl backdrop-blur-2xl md:p-12">
      <div class="mb-8 text-center">
        <div class="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[1.75rem] bg-emerald-100/80 text-emerald-600 shadow-lg shadow-emerald-100/80">
          <ShieldCheck class="h-8 w-8" />
        </div>
        <h1 class="mb-2 text-center text-3xl font-extrabold tracking-normal text-emerald-600">PAMILO Admin</h1>
        <p class="text-center text-sm text-slate-500">{{ t("auth.adminLoginSubtitle") }}</p>
      </div>

      <form class="grid gap-4" @submit.prevent="goToAdmin">
        <label class="block">
          <span class="mb-1.5 block text-sm font-semibold text-slate-700">{{ t("auth.adminEmail") }}</span>
          <input class="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-slate-700 outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400" type="email" autocomplete="username" />
        </label>
        <label class="block">
          <span class="mb-1.5 block text-sm font-semibold text-slate-700">{{ t("auth.password") }}</span>
          <input class="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-slate-700 outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400" type="password" autocomplete="current-password" />
        </label>
        <button class="mt-4 w-full rounded-xl bg-emerald-400 px-6 py-3.5 text-lg font-bold text-emerald-950 shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-500" type="submit">
          {{ t("auth.adminSignIn") }}
        </button>
      </form>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ShieldCheck } from "@lucide/vue";
import { useRouter } from "vue-router";
import { useI18n } from "../../i18n";

const router = useRouter();
const { t } = useI18n();

function goToAdmin(): void {
  void router.push("/superadmin/dashboard");
}
</script>
