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
          <input v-model.trim="form.emailOrUsername" class="min-h-12 rounded-lg border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-field-mint focus:ring-2 focus:ring-field-mint/30" type="text" autocomplete="username" />
        </label>
        <label class="grid gap-2 text-sm font-medium text-slate-300">
          Kata Sandi
          <input v-model="form.password" class="min-h-12 rounded-lg border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-field-mint focus:ring-2 focus:ring-field-mint/30" type="password" autocomplete="current-password" />
        </label>
        <div v-if="errorMessage" class="rounded-lg border border-amber-300/25 bg-amber-300/10 p-3 text-sm text-amber-100">
          {{ errorMessage }}
        </div>
        <button class="mt-2 min-h-12 rounded-full bg-field-green px-5 text-sm font-semibold text-[#102016] hover:bg-field-mint disabled:opacity-60" :disabled="isLoading" type="submit">
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
