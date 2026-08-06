<template>
  <main class="relative grid min-h-screen place-items-center overflow-hidden bg-[#07111f] px-4 py-10 text-slate-100">
    <svg class="pointer-events-none absolute left-4 top-6 h-44 w-44 text-field-mint/20 sm:h-64 sm:w-64" viewBox="0 0 220 220" fill="none" aria-hidden="true">
      <path d="M34 184c34-20 56-45 64-77 8-32 2-57-17-75" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
      <path d="M98 108c-31-5-51-21-60-48 29 1 49 17 60 48Z" stroke="currentColor" stroke-width="1.4" />
      <path d="M107 91c26-22 52-28 78-16-18 23-44 29-78 16Z" stroke="currentColor" stroke-width="1.4" />
      <path d="M87 141c29 5 50 20 64 45-35 3-56-12-64-45Z" stroke="currentColor" stroke-width="1.4" />
    </svg>

    <svg class="pointer-events-none absolute bottom-6 right-2 h-52 w-52 text-field-green/15 sm:h-72 sm:w-72" viewBox="0 0 260 260" fill="none" aria-hidden="true">
      <path d="M44 193h168M73 193l13-59h87l14 59M98 134l9-37h46l8 37M116 97v-21h28v21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M82 80c-13-15-11-31 6-47 14 17 13 33-6 47ZM174 70c20-10 37-7 51 10-22 11-38 8-51-10Z" stroke="currentColor" stroke-width="1.5" />
    </svg>

    <section class="relative z-10 w-full max-w-md rounded-lg border border-field-mint/20 bg-[#101f32]/90 p-7 shadow-field backdrop-blur">
      <div class="mb-7 text-center">
        <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-field-green text-[#102016]">
          <Sprout class="h-8 w-8" />
        </div>
        <h1 class="text-2xl font-semibold tracking-normal text-white">PAMILO Smart Farming</h1>
        <p class="mt-2 text-sm text-slate-400">Tenant farmer portal</p>
      </div>

      <form class="grid gap-4" @submit.prevent="submitLogin">
        <label class="grid gap-2 text-sm font-medium text-slate-300">
          Email atau Username
          <span class="relative">
            <UserRound class="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-field-mint" />
            <input
              v-model.trim="form.emailOrUsername"
              class="min-h-12 w-full rounded-lg border border-white/10 bg-white/5 pl-11 pr-4 text-white outline-none transition placeholder:text-slate-500 focus:border-field-mint focus:ring-2 focus:ring-field-mint/30"
              placeholder="nama@farm.co.id"
              required
              type="text"
              autocomplete="username"
            />
          </span>
        </label>

        <label class="grid gap-2 text-sm font-medium text-slate-300">
          Kata Sandi
          <span class="relative">
            <LockKeyhole class="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-field-mint" />
            <input
              v-model="form.password"
              class="min-h-12 w-full rounded-lg border border-white/10 bg-white/5 pl-11 pr-12 text-white outline-none transition placeholder:text-slate-500 focus:border-field-mint focus:ring-2 focus:ring-field-mint/30"
              placeholder="Password"
              required
              :type="isPasswordVisible ? 'text' : 'password'"
              autocomplete="current-password"
            />
            <button class="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-field-mint" type="button" :aria-label="isPasswordVisible ? 'Sembunyikan password' : 'Tampilkan password'" @click="isPasswordVisible = !isPasswordVisible">
              <EyeOff v-if="isPasswordVisible" class="h-4 w-4" />
              <Eye v-else class="h-4 w-4" />
            </button>
          </span>
        </label>

        <div class="flex justify-end">
          <a class="text-sm font-medium text-field-mint hover:text-field-green" href="#">Lupa Kata Sandi?</a>
        </div>

        <div v-if="errorMessage" class="rounded-lg border border-amber-300/25 bg-amber-300/10 p-3 text-sm text-amber-100">
          {{ errorMessage }}
        </div>

        <button class="mt-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-field-green px-5 text-sm font-semibold text-[#102016] transition hover:bg-field-mint focus:outline-none focus:ring-2 focus:ring-field-mint/40 disabled:opacity-60" :disabled="isLoading" type="submit">
          <LogIn class="h-4 w-4" />
          {{ isLoading ? "Masuk..." : "Masuk" }}
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-slate-400">
        Belum punya akun?
        <a class="font-semibold text-field-mint hover:text-field-green" href="#">Daftar Sekarang</a>
      </p>

      <RouterLink class="mt-5 flex justify-center text-xs font-medium text-slate-500 hover:text-amber-200" to="/superadmin/login">
        Portal Super Admin
      </RouterLink>
    </section>
  </main>
</template>

<script setup lang="ts">
import { Eye, EyeOff, LockKeyhole, LogIn, Sprout, UserRound } from "@lucide/vue";
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { ApiClientError, describeApiTarget } from "../../services/apiClient";
import { useAuthStore } from "../../stores/authStore";

const router = useRouter();
const authStore = useAuthStore();
const isLoading = ref(false);
const isPasswordVisible = ref(false);
const errorMessage = ref<string | null>(null);
const form = reactive({
  emailOrUsername: "",
  password: ""
});

async function submitLogin(): Promise<void> {
  isLoading.value = true;
  errorMessage.value = null;

  try {
    await authStore.loginTenant({
      emailOrUsername: form.emailOrUsername,
      password: form.password
    });
    await router.push("/dashboard");
  } catch (error) {
    errorMessage.value = normalizeLoginError(error);
  } finally {
    isLoading.value = false;
  }
}

function normalizeLoginError(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof TypeError) {
    return `API ${describeApiTarget()} belum dapat dihubungi.`;
  }

  return "Login gagal. Periksa kembali akun dan kata sandi.";
}
</script>
