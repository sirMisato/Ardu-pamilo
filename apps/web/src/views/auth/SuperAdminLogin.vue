<template>
  <main class="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-100 py-10 text-slate-700">
    <svg class="pointer-events-none absolute -left-10 top-8 h-72 w-72 text-emerald-200/40" viewBox="0 0 280 280" fill="none" aria-hidden="true">
      <path d="M46 206h188M72 206V93h136v113M101 93V61h78v32M93 130h35M152 130h35M93 164h35M152 164h35" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M52 83c28-21 56-25 84-12M147 69c34-18 63-15 86 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    </svg>

    <div class="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
      <LanguageSelect />
    </div>

    <section class="relative z-10 mx-4 w-full max-w-md rounded-[2.5rem] border border-white/60 bg-white/80 p-8 shadow-2xl backdrop-blur-2xl md:p-12">
      <div class="mb-8 text-center">
        <div class="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[1.75rem] bg-emerald-100/80 text-emerald-600 shadow-lg shadow-emerald-100/80">
          <ShieldCheck class="h-8 w-8" />
        </div>
        <h1 class="mb-2 text-center text-3xl font-extrabold tracking-normal text-emerald-600">PAMILO Admin</h1>
        <p class="text-center text-sm text-slate-500">{{ t("auth.adminLoginSubtitle") }}</p>
      </div>

      <form class="grid gap-4" @submit.prevent="submitLogin">
        <label class="block">
          <span class="mb-1.5 block text-sm font-semibold text-slate-700">{{ t("auth.adminEmail") }}</span>
          <span class="relative block">
            <Mail class="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              v-model.trim="form.email"
              class="w-full rounded-xl border border-slate-200 bg-white/50 py-3 pl-11 pr-4 text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400"
              placeholder="admin@example.com"
              required
              type="email"
              autocomplete="username"
            />
          </span>
        </label>

        <label class="block">
          <span class="mb-1.5 block text-sm font-semibold text-slate-700">{{ t("auth.password") }}</span>
          <span class="relative block">
            <LockKeyhole class="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              v-model="form.password"
              class="w-full rounded-xl border border-slate-200 bg-white/50 py-3 pl-11 pr-12 text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400"
              placeholder="Password"
              required
              :type="isPasswordVisible ? 'text' : 'password'"
              autocomplete="current-password"
            />
            <button class="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600" type="button" :aria-label="isPasswordVisible ? t('auth.hidePassword') : t('auth.showPassword')" @click="isPasswordVisible = !isPasswordVisible">
              <EyeOff v-if="isPasswordVisible" class="h-4 w-4" />
              <Eye v-else class="h-4 w-4" />
            </button>
          </span>
        </label>

        <div v-if="errorMessage" class="rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-sm font-medium text-rose-700">
          {{ errorMessage }}
        </div>

        <button class="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-6 py-3.5 text-lg font-bold text-emerald-950 shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-60" :disabled="isLoading" type="submit">
          <ShieldCheck class="h-5 w-5" />
          {{ isLoading ? t("auth.verifying") : t("auth.adminSignIn") }}
        </button>
      </form>

      <RouterLink class="mt-6 flex justify-center text-sm font-medium text-emerald-600 transition-colors hover:text-emerald-700" to="/login">
        {{ t("auth.backToTenantPortal") }}
      </RouterLink>
    </section>
  </main>
</template>

<script setup lang="ts">
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "@lucide/vue";
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import LanguageSelect from "../../components/i18n/LanguageSelect.vue";
import { useI18n } from "../../i18n";
import { ApiClientError, describeApiTarget } from "../../services/apiClient";
import { useAuthStore } from "../../stores/authStore";

const router = useRouter();
const authStore = useAuthStore();
const { t } = useI18n();
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
    return t("auth.apiUnavailable", { target: describeApiTarget() });
  }

  return t("auth.adminLoginFailed");
}
</script>
