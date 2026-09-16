<template>
  <div class="space-y-5">
    <section class="grid gap-4 lg:grid-cols-3">
      <article v-for="card in brokerCards" :key="card.label" class="rounded-2xl border border-white/80 bg-white/60 p-4 shadow-sm backdrop-blur-md md:p-5">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <p class="text-sm font-medium text-slate-400">{{ card.label }}</p>
            <p class="mt-2 truncate text-lg font-bold tracking-normal text-slate-800">{{ card.value }}</p>
            <p class="mt-2 text-xs font-medium text-slate-500">{{ card.detail }}</p>
          </div>
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-50 p-2 text-teal-600">
            <component :is="card.icon" class="h-6 w-6" />
          </span>
        </div>
      </article>
    </section>

    <section class="rounded-2xl border border-white/80 bg-white/60 p-4 shadow-sm backdrop-blur-md md:p-5">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <label class="relative flex-1">
          <Search class="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            v-model.trim="searchQuery"
            class="min-h-11 w-full rounded-full border border-white/80 bg-white/50 py-2.5 pl-12 pr-5 text-sm text-slate-700 shadow-sm outline-none backdrop-blur-sm transition-all placeholder:text-slate-400 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-400"
            :aria-label="t('mqtt.searchAria')"
            :placeholder="t('mqtt.searchPlaceholder')"
            type="search"
          />
        </label>

        <button
          class="flex min-h-11 items-center justify-center gap-2 rounded-full bg-emerald-300 px-6 py-2.5 text-sm font-semibold text-emerald-950 shadow-sm transition-all hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200/80"
          type="button"
          @click="openModal"
        >
          <Plus class="h-4 w-4" />
          {{ t("mqtt.addTopic") }}
        </button>
      </div>
      <p v-if="feedbackMessage" class="mt-3 text-sm font-medium" :class="feedbackToneClass">
        {{ feedbackMessage }}
      </p>
    </section>

    <section class="overflow-hidden rounded-[2rem] border border-white/80 bg-white/60 p-4 shadow-sm backdrop-blur-lg md:p-6">
      <div class="w-full overflow-x-auto whitespace-nowrap rounded-2xl">
        <table class="min-w-[980px] w-full text-left text-sm">
          <thead class="bg-white/40 text-xs font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th class="border-b border-white/60 px-5 py-4 font-bold">{{ t("mqtt.columns.device") }}</th>
              <th class="border-b border-white/60 px-5 py-4 font-bold">{{ t("mqtt.columns.topic") }}</th>
              <th class="border-b border-white/60 px-5 py-4 font-bold">{{ t("mqtt.columns.broker") }}</th>
              <th class="border-b border-white/60 px-5 py-4 font-bold">QoS</th>
              <th class="border-b border-white/60 px-5 py-4 font-bold">{{ t("mqtt.columns.dynamicKeys") }}</th>
              <th class="border-b border-white/60 px-5 py-4 font-bold">{{ t("mqtt.columns.lastMessage") }}</th>
              <th class="border-b border-white/60 px-5 py-4 text-right font-bold">{{ t("common.actions") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="subscription in filteredSubscriptions" :key="subscription.id" class="border-b border-white/60 transition-colors hover:bg-white/40">
              <td class="px-5 py-4">
                <div class="flex items-center gap-3">
                  <span class="h-2.5 w-2.5 rounded-full" :class="subscription.status === 'active' ? 'bg-teal-500' : 'bg-slate-300'"></span>
                  <div>
                    <p class="font-medium text-slate-700">{{ subscription.deviceId }}</p>
                    <span
                      class="mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide"
                      :class="subscription.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'"
                    >
                      {{ subscriptionStatusLabel(subscription.status) }}
                    </span>
                  </div>
                </div>
              </td>
              <td class="px-5 py-4">
                <div class="flex max-w-[320px] items-center gap-2">
                  <code class="min-w-0 break-all rounded-xl border border-white/80 bg-white/60 px-2.5 py-1 text-xs font-medium text-slate-600">{{ subscription.topic }}</code>
                  <button
                    class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-600 shadow-sm transition-all hover:bg-slate-50"
                    type="button"
                    :aria-label="t('mqtt.actions.copyTopicAria', { topic: subscription.topic })"
                    :title="t('mqtt.actions.copyTopic')"
                    @click="copyTopic(subscription)"
                  >
                    <Copy class="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
              <td class="px-5 py-4 font-medium text-slate-700">{{ subscription.brokerHost }}</td>
              <td class="px-5 py-4">
                <span class="rounded-full bg-teal-100 px-3 py-0.5 text-xs font-semibold text-teal-700">QoS {{ subscription.qos }}</span>
              </td>
              <td class="px-5 py-4">
                <div class="flex flex-wrap gap-2">
                  <span v-for="key in subscription.metricKeys" :key="key" class="rounded-full border border-white/80 bg-white/60 px-2.5 py-1 text-xs font-medium text-slate-600">
                    <span>{{ key }}</span>
                    <span v-if="metricFriendlyLabel(key) !== key" class="ml-1 text-slate-400">({{ metricFriendlyLabel(key) }})</span>
                  </span>
                </div>
              </td>
              <td class="px-5 py-4 font-medium text-slate-700" :title="formatExactMessageTime(subscription)">
                {{ formatLastMessageTime(subscription) }}
              </td>
              <td class="px-5 py-4">
                <div class="flex justify-end gap-2">
                  <button
                    class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-700 shadow-sm transition-all hover:bg-slate-50"
                    type="button"
                    :aria-label="t('mqtt.actions.viewAria', { topic: subscription.topic })"
                    :title="t('mqtt.actions.view')"
                    @click="openDetail(subscription.id)"
                  >
                    <Eye class="h-4 w-4" />
                  </button>
                  <button
                    class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-700 shadow-sm transition-all hover:bg-slate-50"
                    type="button"
                    :aria-label="subscription.status === 'active' ? t('mqtt.actions.pauseAria', { topic: subscription.topic }) : t('mqtt.actions.resumeAria', { topic: subscription.topic })"
                    :title="subscription.status === 'active' ? t('mqtt.actions.pause') : t('mqtt.actions.resume')"
                    @click="toggleSubscription(subscription.id)"
                  >
                    <component :is="subscription.status === 'active' ? ToggleRight : ToggleLeft" class="h-4 w-4" />
                  </button>
                  <button
                    class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-100 bg-white/80 text-rose-500 shadow-sm transition-all hover:bg-rose-50"
                    type="button"
                    :aria-label="t('mqtt.actions.deleteAria', { topic: subscription.topic })"
                    :title="t('mqtt.actions.delete')"
                    @click="removeSubscription(subscription.id)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredSubscriptions.length === 0">
              <td class="px-5 py-10 text-center text-sm font-medium text-slate-500" colspan="7">
                {{ subscriptions.length === 0 ? t("mqtt.empty.noSubscriptions") : t("mqtt.empty.noSearchResults") }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 p-4 backdrop-blur-sm">
      <form class="w-full max-w-md rounded-[2rem] border border-white/80 bg-white/85 p-4 shadow-2xl backdrop-blur-xl md:p-6" @submit.prevent="registerTopic">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h2 class="text-lg font-bold tracking-normal text-slate-800">{{ t("mqtt.modal.addTitle") }}</h2>
            <p class="mt-1 text-sm font-medium text-slate-400">{{ t("mqtt.modal.addSubtitle") }}</p>
          </div>
          <button
            class="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-all hover:bg-slate-100"
            type="button"
            :aria-label="t('mqtt.modal.close')"
            @click="closeModal"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="mt-5 grid gap-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="space-y-2">
              <span class="text-sm font-semibold text-slate-700">Device ID</span>
              <input
                v-model.trim="topicForm.deviceId"
                class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400"
                type="text"
              />
              <span class="block text-xs font-medium text-slate-400">{{ t("mqtt.modal.deviceHelper") }}</span>
            </label>

            <label class="space-y-2">
              <span class="text-sm font-semibold text-slate-700">QoS</span>
              <select
                v-model.number="topicForm.qos"
                class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400"
              >
                <option :value="0">0</option>
                <option :value="1">1</option>
                <option :value="2">2</option>
              </select>
            </label>
          </div>

          <label class="space-y-2">
            <span class="text-sm font-semibold text-slate-700">{{ t("mqtt.modal.topic") }}</span>
            <input
              v-model.trim="topicForm.topic"
              class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400"
              placeholder="pamilo/v1/tenants/demo-tenant/devices/+/telemetry"
              type="text"
            />
            <span class="block text-xs font-medium text-slate-400">{{ t("mqtt.modal.topicHelper") }}</span>
          </label>

          <label class="space-y-2">
            <span class="text-sm font-semibold text-slate-700">{{ t("mqtt.modal.metricKeys") }}</span>
            <input
              v-model.trim="topicForm.metricKeys"
              class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400"
              placeholder="ph, moisture, nitrogen, temperature"
              type="text"
            />
            <span class="block text-xs font-medium text-slate-400">{{ t("mqtt.modal.metricKeysHelper") }}</span>
          </label>
        </div>
        <p v-if="formErrorMessage" class="mt-4 text-sm font-semibold text-rose-600">
          {{ formErrorMessage }}
        </p>

        <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button class="min-h-11 rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 transition-all hover:bg-slate-100" type="button" @click="closeModal">
            {{ t("common.cancel") }}
          </button>
          <button class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-300 px-5 py-2 text-sm font-semibold text-emerald-950 shadow-sm transition-all hover:bg-emerald-400" type="submit">
            <Save class="h-4 w-4" />
            {{ t("mqtt.modal.saveTopic") }}
          </button>
        </div>
      </form>
    </div>

    <div v-if="detailSubscription" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 p-4 backdrop-blur-sm">
      <section class="w-full max-w-2xl rounded-[2rem] border border-white/80 bg-white/90 p-4 shadow-2xl backdrop-blur-xl md:p-6">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <h2 class="text-lg font-bold tracking-normal text-slate-800">{{ t("mqtt.detail.title") }}</h2>
            <p class="mt-1 truncate text-sm font-medium text-slate-400">{{ detailSubscription.topic }}</p>
          </div>
          <button
            class="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-all hover:bg-slate-100"
            type="button"
            :aria-label="t('mqtt.detail.close')"
            @click="closeDetail"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-2">
          <div class="rounded-2xl border border-white/80 bg-white/60 p-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">{{ t("mqtt.columns.device") }}</p>
            <p class="mt-1 font-semibold text-slate-700">{{ detailSubscription.deviceId }}</p>
          </div>
          <div class="rounded-2xl border border-white/80 bg-white/60 p-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">{{ t("mqtt.detail.connectionStatus") }}</p>
            <p class="mt-1 font-semibold text-slate-700">{{ connectionStateLabel }}</p>
          </div>
          <div class="rounded-2xl border border-white/80 bg-white/60 p-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">{{ t("mqtt.columns.lastMessage") }}</p>
            <p class="mt-1 font-semibold text-slate-700">{{ formatLastMessageTime(detailSubscription) }}</p>
          </div>
          <div class="rounded-2xl border border-white/80 bg-white/60 p-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">{{ t("mqtt.detail.metricCount") }}</p>
            <p class="mt-1 font-semibold text-slate-700">{{ formatDataCount(detailMetrics.length) }}</p>
          </div>
        </div>

        <div class="mt-5">
          <div class="mb-2 flex items-center justify-between gap-3">
            <h3 class="text-sm font-bold text-slate-700">{{ t("mqtt.detail.dynamicKeys") }}</h3>
            <button
              class="inline-flex min-h-9 items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 text-xs font-semibold text-slate-600 shadow-sm transition-all hover:bg-slate-50"
              type="button"
              :disabled="!detailPayloadText"
              :title="t('mqtt.actions.copyPayload')"
              @click="copyPayload"
            >
              <Copy class="h-3.5 w-3.5" />
              {{ t("mqtt.actions.copyPayload") }}
            </button>
          </div>
          <div v-if="detailMetrics.length > 0" class="flex flex-wrap gap-2">
            <span v-for="metric in detailMetrics" :key="metric.key" class="rounded-full border border-white/80 bg-white/60 px-2.5 py-1 text-xs font-medium text-slate-600">
              {{ metric.key }}
              <span v-if="metricFriendlyLabel(metric.key) !== metric.key" class="ml-1 text-slate-400">({{ metricFriendlyLabel(metric.key) }})</span>
            </span>
          </div>
          <p v-else class="rounded-2xl border border-dashed border-slate-200 bg-white/40 p-4 text-sm font-medium text-slate-500">
            {{ t("mqtt.detail.noPayload") }}
          </p>
        </div>

        <pre class="mt-4 max-h-72 overflow-auto rounded-2xl border border-slate-200 bg-slate-950 p-4 text-xs leading-relaxed text-slate-100"><code>{{ detailPayloadText || t("mqtt.detail.noRawPayload") }}</code></pre>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Activity,
  Copy,
  Eye,
  Plus,
  Router,
  SatelliteDish,
  Save,
  Search,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X
} from "@lucide/vue";
import { computed, reactive, ref, watch } from "vue";
import { appEnvironment } from "../../config/environment";
import { useI18n } from "../../i18n";
import { formatDataCount, formatDateTime, formatRelativeTime } from "../../i18n/formatters";
import { getMetricLabel } from "../../i18n/metrics";
import { useAuthStore } from "../../stores/authStore";
import { useTelemetryStore } from "../../stores/telemetryStore";

type QosLevel = 0 | 1 | 2;
type SubscriptionStatus = "active" | "paused";

interface TopicSubscription {
  id: string;
  deviceId: string;
  topic: string;
  brokerHost: string;
  qos: QosLevel;
  status: SubscriptionStatus;
  metricKeys: string[];
  lastMessageAt: string;
}

const mqttSubscriptionsStoragePrefix = "pamilo.mqttSubscriptions";
const telemetryStore = useTelemetryStore();
const authStore = useAuthStore();
const { t, tn } = useI18n();
const tenantId = computed(() => authStore.tenant?.id ?? "demo-tenant");
const brokerHost = computed(() => hostFromUrl(appEnvironment.mqttBrokerUrl, "mqtt.keycloud.id:8883"));
const websocketHost = computed(() => hostFromUrl(appEnvironment.mqttWebSocketUrl, "mqtt.keycloud.id:8084"));
const searchQuery = ref("");
const isModalOpen = ref(false);
const selectedSubscriptionId = ref<string | null>(null);
const formErrorKey = ref<string | null>(null);
const feedback = ref<{ key: string; params?: Record<string, string | number>; tone: "success" | "error" } | null>(null);
const topicForm = reactive<{
  deviceId: string;
  topic: string;
  qos: QosLevel;
  metricKeys: string;
}>({
  deviceId: "SensorNode04",
  topic: buildMqttTopic("SensorNode04"),
  qos: 1,
  metricKeys: "ph, moisture, nitrogen"
});

const subscriptions = ref<TopicSubscription[]>([]);
const formErrorMessage = computed(() => formErrorKey.value ? t(formErrorKey.value) : "");
const feedbackMessage = computed(() => feedback.value ? t(feedback.value.key, feedback.value.params) : "");
const feedbackToneClass = computed(() => feedback.value?.tone === "error" ? "text-rose-600" : "text-emerald-700");

watch(() => topicForm.deviceId, () => {
  topicForm.topic = buildMqttTopic(topicForm.deviceId);
});

watch(tenantId, () => {
  subscriptions.value = readStoredSubscriptions(tenantId.value, brokerHost.value);
  topicForm.topic = buildMqttTopic(topicForm.deviceId);
}, {
  immediate: true
});

const filteredSubscriptions = computed(() => {
  const query = searchQuery.value.toLowerCase();

  if (!query) {
    return subscriptions.value;
  }

  return subscriptions.value.filter((subscription) => {
    const haystack = [
      subscription.deviceId,
      subscription.topic,
      subscription.brokerHost,
      ...subscription.metricKeys
    ].join(" ").toLowerCase();

    return haystack.includes(query);
  });
});

const activeSubscriptions = computed(() => subscriptions.value.filter((item) => item.status === "active"));
const activeSubscriptionTopic = computed(() => activeSubscriptions.value[0]?.topic ?? telemetryStore.subscriptionTopic);
const detailSubscription = computed(() => subscriptions.value.find((subscription) => subscription.id === selectedSubscriptionId.value) ?? null);
const detailTelemetry = computed(() => detailSubscription.value ? telemetryStore.deviceById(detailSubscription.value.deviceId) : null);
const detailMetrics = computed(() => detailTelemetry.value ? Object.values(detailTelemetry.value.metrics) : []);
const detailPayloadText = computed(() => {
  if (!detailTelemetry.value) {
    return "";
  }

  try {
    return JSON.stringify(detailTelemetry.value.rawPayload, null, 2);
  } catch {
    return String(detailTelemetry.value.rawPayload);
  }
});
const connectionStateLabel = computed(() => connectionStatusLabel(telemetryStore.connectionState));

const brokerCards = computed(() => [
  {
    label: "EMQX MQTT Broker",
    value: brokerHost.value,
    detail: t("mqtt.cards.nativeTls"),
    icon: SatelliteDish
  },
  {
    label: t("mqtt.cards.websocketEndpoint"),
    value: websocketHost.value,
    detail: t("mqtt.cards.telemetryTransport"),
    icon: Router
  },
  {
    label: t("mqtt.cards.activeSubscription"),
    value: activeSubscriptionTopic.value,
    detail: tn("mqtt.cards.activeTopicCount", activeSubscriptions.value.length, { count: formatDataCount(activeSubscriptions.value.length) }),
    icon: Activity
  },
  {
    label: "Tenant ACL",
    value: t("mqtt.cards.perDeviceScoped"),
    detail: t("mqtt.cards.tenantTopicIsolation"),
    icon: ShieldCheck
  }
].slice(0, 3));

function openModal(): void {
  formErrorKey.value = null;
  topicForm.deviceId = "SensorNode04";
  topicForm.topic = buildMqttTopic("SensorNode04");
  topicForm.qos = 1;
  topicForm.metricKeys = "ph, moisture, nitrogen";
  isModalOpen.value = true;
}

function closeModal(): void {
  isModalOpen.value = false;
}

function registerTopic(): void {
  formErrorKey.value = validateTopicForm();
  if (formErrorKey.value) {
    return;
  }

  const nextSubscription: TopicSubscription = {
    id: createSubscriptionId(topicForm.deviceId),
    deviceId: topicForm.deviceId,
    topic: topicForm.topic,
    brokerHost: brokerHost.value,
    qos: topicForm.qos,
    status: "active",
    metricKeys: topicForm.metricKeys.split(",").map((key) => key.trim()).filter(Boolean),
    lastMessageAt: new Date().toISOString()
  };
  const existingIndex = subscriptions.value.findIndex((subscription) => subscription.topic === nextSubscription.topic);

  subscriptions.value = existingIndex >= 0
    ? subscriptions.value.map((subscription, index) => index === existingIndex ? {
        ...nextSubscription,
        id: subscription.id,
        lastMessageAt: subscription.lastMessageAt
      } : subscription)
    : [
        nextSubscription,
        ...subscriptions.value
      ];
  persistSubscriptions();
  feedback.value = {
    key: existingIndex >= 0 ? "mqtt.feedback.topicUpdated" : "mqtt.feedback.topicSaved",
    params: { topic: nextSubscription.topic },
    tone: "success"
  };
  closeModal();
}

function toggleSubscription(subscriptionId: string): void {
  subscriptions.value = subscriptions.value.map((subscription) => {
    if (subscription.id !== subscriptionId) {
      return subscription;
    }

    return {
      ...subscription,
      status: subscription.status === "active" ? "paused" : "active"
    };
  });
  persistSubscriptions();
}

function removeSubscription(subscriptionId: string): void {
  const subscription = subscriptions.value.find((item) => item.id === subscriptionId);
  if (!subscription) {
    return;
  }

  if (!window.confirm(t("mqtt.confirm.deleteTopic", { topic: subscription.topic }))) {
    return;
  }

  subscriptions.value = subscriptions.value.filter((subscription) => subscription.id !== subscriptionId);
  persistSubscriptions();
  if (selectedSubscriptionId.value === subscriptionId) {
    selectedSubscriptionId.value = null;
  }
  feedback.value = {
    key: "mqtt.feedback.topicDeleted",
    params: { topic: subscription.topic },
    tone: "success"
  };
}

function openDetail(subscriptionId: string): void {
  selectedSubscriptionId.value = subscriptionId;
}

function closeDetail(): void {
  selectedSubscriptionId.value = null;
}

async function copyTopic(subscription: TopicSubscription): Promise<void> {
  await copyText(subscription.topic, "mqtt.feedback.topicCopied", "mqtt.feedback.copyFailed", { topic: subscription.topic });
}

async function copyPayload(): Promise<void> {
  if (!detailPayloadText.value) {
    feedback.value = { key: "mqtt.feedback.noPayloadToCopy", tone: "error" };
    return;
  }

  await copyText(detailPayloadText.value, "mqtt.feedback.payloadCopied", "mqtt.feedback.copyFailed");
}

async function copyText(text: string, successKey: string, errorKey: string, params: Record<string, string | number> = {}): Promise<void> {
  try {
    if (!navigator.clipboard) {
      throw new Error("Clipboard unavailable");
    }

    await navigator.clipboard.writeText(text);
    feedback.value = { key: successKey, params, tone: "success" };
  } catch {
    feedback.value = { key: errorKey, tone: "error" };
  }
}

function readStoredSubscriptions(currentTenantId: string, currentBrokerHost: string): TopicSubscription[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(storageKeyForTenant(currentTenantId));
    const parsedValue = rawValue ? JSON.parse(rawValue) as unknown : [];

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue
      .filter(isTopicSubscription)
      .map((subscription) => ({
        ...subscription,
        brokerHost: currentBrokerHost
      }));
  } catch {
    return [];
  }
}

function persistSubscriptions(): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(storageKeyForTenant(tenantId.value), JSON.stringify(subscriptions.value));
}

function storageKeyForTenant(currentTenantId: string): string {
  return `${mqttSubscriptionsStoragePrefix}.${currentTenantId}`;
}

function createSubscriptionId(deviceId: string): string {
  const normalizedDeviceId = deviceId.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-") || "device";

  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `topic-${normalizedDeviceId}-${crypto.randomUUID()}`;
  }

  return `topic-${normalizedDeviceId}-${Date.now()}`;
}

function isTopicSubscription(value: unknown): value is TopicSubscription {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  const metricKeys = record.metricKeys;

  return typeof record.id === "string"
    && typeof record.deviceId === "string"
    && typeof record.topic === "string"
    && typeof record.brokerHost === "string"
    && isQosLevel(record.qos)
    && isSubscriptionStatus(record.status)
    && Array.isArray(metricKeys)
    && metricKeys.every((key) => typeof key === "string")
    && typeof record.lastMessageAt === "string";
}

function isQosLevel(value: unknown): value is QosLevel {
  return value === 0 || value === 1 || value === 2;
}

function isSubscriptionStatus(value: unknown): value is SubscriptionStatus {
  return value === "active" || value === "paused";
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function formatLastMessageTime(subscription: TopicSubscription): string {
  const value = getSubscriptionLastSeen(subscription);
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return value || t("format.nullValue");
  }

  const seconds = Math.round((timestamp - Date.now()) / 1000);
  const absoluteSeconds = Math.abs(seconds);

  if (absoluteSeconds < 60) {
    return formatRelativeTime(seconds, "second");
  }

  if (absoluteSeconds < 3600) {
    return formatRelativeTime(Math.round(seconds / 60), "minute");
  }

  if (absoluteSeconds < 86_400) {
    return formatRelativeTime(Math.round(seconds / 3600), "hour");
  }

  return formatDateTime(value, {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function formatExactMessageTime(subscription: TopicSubscription): string {
  return formatDateTime(getSubscriptionLastSeen(subscription), {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function getSubscriptionLastSeen(subscription: TopicSubscription): string {
  return telemetryStore.deviceById(subscription.deviceId)?.lastSeenAt ?? subscription.lastMessageAt;
}

function subscriptionStatusLabel(status: SubscriptionStatus): string {
  return t(`mqtt.status.${status}`);
}

function connectionStatusLabel(status: string): string {
  if (status === "connected" || status === "connecting" || status === "reconnecting" || status === "offline" || status === "history" || status === "error" || status === "idle") {
    return t(`mqtt.connection.${status}`);
  }

  return status;
}

function metricFriendlyLabel(metricKey: string): string {
  return getMetricLabel(metricKey);
}

function validateTopicForm(): string | null {
  if (!topicForm.deviceId.trim()) {
    return "mqtt.validation.deviceRequired";
  }

  if (!topicForm.topic.trim()) {
    return "mqtt.validation.topicRequired";
  }

  if (!topicForm.topic.includes("/")) {
    return "mqtt.validation.topicInvalid";
  }

  return null;
}

function hostFromUrl(value: string, fallback: string): string {
  try {
    return new URL(value).host;
  } catch {
    return fallback;
  }
}

function buildMqttTopic(deviceId: string): string {
  const normalizedDeviceId = deviceId.trim() || "SensorNode04";
  return `pamilo/v1/tenants/${tenantId.value}/devices/${normalizedDeviceId}/telemetry`;
}
</script>
