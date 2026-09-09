<template>
  <main class="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-100 py-10 text-slate-700">
    <section class="relative z-10 mx-4 w-full max-w-md rounded-[2.5rem] border border-white/60 bg-white/80 p-8 shadow-2xl backdrop-blur-2xl md:p-12">
      <div class="mb-8 text-center">
        <div class="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[1.75rem] bg-emerald-100/80 text-emerald-600 shadow-lg shadow-emerald-100/80">
          <Sprout class="h-8 w-8" />
        </div>
        <h1 class="mb-2 text-center text-3xl font-extrabold tracking-normal text-emerald-600">PAMILO Smart Farming</h1>
        <p class="text-center text-sm text-slate-500">Silakan masuk ke akun Anda</p>
      </div>

      <form class="grid gap-4" @submit.prevent="goToDashboard">
        <label class="block">
          <span class="mb-1.5 block text-sm font-semibold text-slate-700">Email atau Username</span>
          <input v-model.trim="form.emailOrUsername" class="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-slate-700 outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400" type="text" autocomplete="username" />
        </label>
        <label class="block">
          <span class="mb-1.5 block text-sm font-semibold text-slate-700">Kata Sandi</span>
          <input v-model="form.password" class="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-slate-700 outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400" type="password" autocomplete="current-password" />
        </label>
        <div v-if="errorMessage" class="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-sm font-medium text-amber-700">
          {{ errorMessage }}
        </div>
        <button class="mt-4 w-full rounded-xl bg-emerald-400 px-6 py-3.5 text-lg font-bold text-emerald-950 shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-500 disabled:opacity-60" :disabled="isLoading" type="submit">
          {{ isLoading ? "Masuk..." : "Masuk" }}
        </button>
      </form>
    </section>
  </main>
</template>

<script setup lang="ts">
import { Sprout } from "@lucide/vue";
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { ApiClientError, loginTenant } from "../../services/apiClient";

const router = useRouter();
const isLoading = ref(false);
const errorMessage = ref<string | null>(null);
const form = reactive({
  emailOrUsername: "tenant@example.com",
  password: ""
});

async function goToDashboard(): Promise<void> {
  isLoading.value = true;
  errorMessage.value = null;

  try {
    await loginTenant({
      emailOrUsername: form.emailOrUsername,
      password: form.password
    });
    await router.push("/dashboard");
  } catch (error) {
    errorMessage.value = error instanceof ApiClientError
      ? error.message
      : "API backend belum dapat dihubungi. Jalankan Fastify lokal atau periksa VITE_API_BASE_URL.";
  } finally {
    isLoading.value = false;
  }
}
</script>
