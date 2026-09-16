import { createPinia } from "pinia";
import { createApp } from "vue";
import App from "./App.vue";
import { initI18n, setLanguagePreferenceSync, setupI18nRouter } from "./i18n";
import { router } from "./router";
import { useAuthStore } from "./stores/authStore";
import { useSettingsStore } from "./stores/settingsStore";
import "./assets/main.css";

initI18n();
setupI18nRouter(router);
setLanguagePreferenceSync((language) => {
  const authStore = useAuthStore();

  if (!authStore.isTenantAdmin) {
    return Promise.resolve(false);
  }

  return useSettingsStore().updateLanguagePreference(language);
});

const pinia = createPinia();

createApp(App)
  .use(pinia)
  .use(router)
  .mount("#app");
