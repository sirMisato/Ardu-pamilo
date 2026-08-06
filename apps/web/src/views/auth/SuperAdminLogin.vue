<template>
  <main class="relative grid min-h-screen place-items-center overflow-hidden bg-[#070d18] px-4 py-10 text-slate-100">
    <svg class="pointer-events-none absolute -left-10 top-8 h-72 w-72 text-amber-200/10" viewBox="0 0 280 280" fill="none" aria-hidden="true">
      <path d="M46 206h188M72 206V93h136v113M101 93V61h78v32M93 130h35M152 130h35M93 164h35M152 164h35" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M52 83c28-21 56-25 84-12M147 69c34-18 63-15 86 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    </svg>

    <section class="relative z-10 w-full max-w-md rounded-lg border border-amber-300/20 bg-[#0d1624]/95 p-7 shadow-field backdrop-blur">
      <div class="mb-7 text-center">
        <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-amber-300 text-slate-950">
          <ShieldCheck class="h-8 w-8" />
        </div>
        <h1 class="text-2xl font-semibold tracking-normal text-white">Super Admin</h1>
        <p class="mt-2 text-sm text-slate-400">PAMILO SaaS control plane</p>
      </div>

      <form class="grid gap-4" @submit.prevent="submitLogin">
        <label class="grid gap-2 text-sm font-medium text-slate-300">
          Admin Email
          <span class="relative">
            <Mail class="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-200" />
            <input
              v-model.trim="form.email"
              class="min-h-12 w-full rounded-lg border border-white/10 bg-white/5 pl-11 pr-4 text-white outline-none transition placeholder:text-slate-500 focus:border-amber-300 focus:ring-2 focus:ring-amber-300/30"
              placeholder="admin@example.com"
              required
              type="email"
              autocomplete="username"
            />
          </span>
        </label>

        <label class="grid gap-2 text-sm font-medium text-slate-300">
          Password
          <span class="relative">
            <LockKeyhole class="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-200" />
            <input
              v-model="form.password"
              class="min-h-12 w-full rounded-lg border border-white/10 bg-white/5 pl-11 pr-12 text-white outline-none transition placeholder:text-slate-500 focus:border-amber-300 focus:ring-2 focus:ring-amber-300/30"
              placeholder="Password"
              required
              :type="isPasswordVisible ? 'text' : 'password'"
              autocomplete="current-password"
            />
            <button class="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-amber-200" type="button" :aria-label="isPasswordVisible ? 'Sembunyikan password' : 'Tampilkan password'" @click="isPasswordVisible = !isPasswordVisible">
              <EyeOff v-if="isPasswordVisible" class="h-4 w-4" />
              <Eye v-else class="h-4 w-4" />
            </button>
          </span>
        </label>

        <div v-if="errorMessage" class="rounded-lg border border-rose-300/25 bg-rose-300/10 p-3 text-sm text-rose-100">
          {{ errorMessage }}
        </div>

        <button class="mt-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-amber-300 px-5 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-300/40 disabled:opacity-60" :disabled="isLoading" type="submit">
          <ShieldCheck class="h-4 w-4" />
          {{ isLoading ? "Memverifikasi..." : "Masuk Admin" }}
        </button>
      </form>

      <RouterLink class="mt-6 flex justify-center text-sm font-medium text-field-mint hover:text-field-green" to="/login">
        Kembali ke Tenant Portal
      </RouterLink>
    </section>
  </main>
</template>

<script setup lang="ts">
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "@lucide/vue";
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
  email: "",
  password: ""
});

async function submitLogin(): Promise<void> {
  isLoading.value = true;
  errorMessage.value = null;

  try {
    await authStore.loginSuperAdmin({
      email: form.email,
      password: form.password
    });
    await router.push("/superadmin/dashboard");
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

  return "Login admin gagal. Periksa kembali akun dan kata sandi.";
}
</script>
