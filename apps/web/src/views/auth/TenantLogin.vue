<template>
  <main class="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-100 py-10 text-slate-700">
    <svg class="pointer-events-none absolute left-4 top-6 h-44 w-44 text-emerald-200/40 sm:h-64 sm:w-64" viewBox="0 0 220 220" fill="none" aria-hidden="true">
      <path d="M34 184c34-20 56-45 64-77 8-32 2-57-17-75" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
      <path d="M98 108c-31-5-51-21-60-48 29 1 49 17 60 48Z" stroke="currentColor" stroke-width="1.4" />
      <path d="M107 91c26-22 52-28 78-16-18 23-44 29-78 16Z" stroke="currentColor" stroke-width="1.4" />
      <path d="M87 141c29 5 50 20 64 45-35 3-56-12-64-45Z" stroke="currentColor" stroke-width="1.4" />
    </svg>

    <svg class="pointer-events-none absolute bottom-6 right-2 h-52 w-52 text-teal-200/40 sm:h-72 sm:w-72" viewBox="0 0 260 260" fill="none" aria-hidden="true">
      <path d="M44 193h168M73 193l13-59h87l14 59M98 134l9-37h46l8 37M116 97v-21h28v21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M82 80c-13-15-11-31 6-47 14 17 13 33-6 47ZM174 70c20-10 37-7 51 10-22 11-38 8-51-10Z" stroke="currentColor" stroke-width="1.5" />
    </svg>

    <div class="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
      <LanguageSelect />
    </div>

    <section class="relative z-10 mx-4 w-full max-w-md rounded-[2.5rem] border border-white/60 bg-white/80 p-8 shadow-2xl backdrop-blur-2xl md:p-12">
      <div class="mb-8 text-center">
        <div class="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[1.75rem] bg-emerald-100/80 text-emerald-600 shadow-lg shadow-emerald-100/80">
          <Sprout class="h-8 w-8" />
        </div>
        <h1 class="mb-2 text-center text-3xl font-extrabold tracking-normal text-emerald-600">PAMILO Smart Farming</h1>
        <p class="text-center text-sm text-slate-500">{{ t("auth.tenantLoginSubtitle") }}</p>
      </div>

      <form class="grid gap-4" @submit.prevent="submitLogin">
        <label class="block">
          <span class="mb-1.5 block text-sm font-semibold text-slate-700">{{ t("auth.emailOrUsername") }}</span>
          <span class="relative block">
            <UserRound class="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              v-model.trim="form.emailOrUsername"
              class="w-full rounded-xl border border-slate-200 bg-white/50 py-3 pl-11 pr-4 text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400"
              placeholder="nama@farm.co.id"
              required
              type="text"
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

        <div class="flex justify-end">
          <a class="text-sm font-medium text-emerald-600 transition-colors hover:text-emerald-700" href="#">{{ t("auth.forgotPassword") }}</a>
        </div>

        <div v-if="errorMessage" class="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-sm font-medium text-amber-700">
          {{ errorMessage }}
        </div>

        <button class="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-6 py-3.5 text-lg font-bold text-emerald-950 shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-60" :disabled="isLoading" type="submit">
          <LogIn class="h-5 w-5" />
          {{ isLoading ? t("common.signingIn") : t("common.signIn") }}
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-slate-500">
        {{ t("auth.noAccount") }}
        <a class="font-semibold text-emerald-600 transition-colors hover:text-emerald-700" href="#">{{ t("auth.createAccount") }}</a>
      </p>

      <RouterLink class="mt-5 flex justify-center text-xs font-medium text-slate-500 transition-colors hover:text-emerald-700" to="/superadmin/login">
        {{ t("auth.superAdminPortal") }}
      </RouterLink>
    </section>
  </main>
</template>

<script setup lang="ts">
import { Eye, EyeOff, LockKeyhole, LogIn, Sprout, UserRound } from "@lucide/vue";
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
    return t("auth.apiUnavailable", { target: describeApiTarget() });
  }

  return t("auth.loginFailed");
}
</script>
