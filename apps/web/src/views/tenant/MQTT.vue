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
            placeholder="Cari device, topic, atau metric key"
            type="search"
          />
        </label>

        <button
          class="flex min-h-11 items-center justify-center gap-2 rounded-full bg-emerald-300 px-6 py-2.5 text-sm font-semibold text-emerald-950 shadow-sm transition-all hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200/80"
          type="button"
          @click="openModal"
        >
          <Plus class="h-4 w-4" />
          Tambah Topic
        </button>
      </div>
    </section>

    <section class="overflow-hidden rounded-[2rem] border border-white/80 bg-white/60 p-4 shadow-sm backdrop-blur-lg md:p-6">
      <div class="w-full overflow-x-auto whitespace-nowrap rounded-2xl">
        <table class="min-w-[980px] w-full text-left text-sm">
          <thead class="bg-white/40 text-xs font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th class="border-b border-white/60 px-5 py-4 font-bold">Device</th>
              <th class="border-b border-white/60 px-5 py-4 font-bold">Topic Subscription</th>
              <th class="border-b border-white/60 px-5 py-4 font-bold">Broker</th>
              <th class="border-b border-white/60 px-5 py-4 font-bold">QoS</th>
              <th class="border-b border-white/60 px-5 py-4 font-bold">Dynamic Keys</th>
              <th class="border-b border-white/60 px-5 py-4 font-bold">Last Message</th>
              <th class="border-b border-white/60 px-5 py-4 text-right font-bold">Aksi</th>
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
                      {{ subscription.status }}
                    </span>
                  </div>
                </div>
              </td>
              <td class="px-5 py-4">
                <code class="break-all rounded-xl border border-white/80 bg-white/60 px-2.5 py-1 text-xs font-medium text-slate-600">{{ subscription.topic }}</code>
              </td>
              <td class="px-5 py-4 font-medium text-slate-700">{{ subscription.brokerHost }}</td>
              <td class="px-5 py-4">
                <span class="rounded-full bg-teal-100 px-3 py-0.5 text-xs font-semibold text-teal-700">QoS {{ subscription.qos }}</span>
              </td>
              <td class="px-5 py-4">
                <div class="flex flex-wrap gap-2">
                  <span v-for="key in subscription.metricKeys" :key="key" class="rounded-full border border-white/80 bg-white/60 px-2.5 py-1 text-xs font-medium text-slate-600">
                    {{ key }}
                  </span>
                </div>
              </td>
              <td class="px-5 py-4 font-medium text-slate-700">{{ formatDateTime(subscription.lastMessageAt) }}</td>
              <td class="px-5 py-4">
                <div class="flex justify-end gap-2">
                  <button
                    class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-700 shadow-sm transition-all hover:bg-slate-50"
                    type="button"
                    :aria-label="`Toggle ${subscription.topic}`"
                    @click="toggleSubscription(subscription.id)"
                  >
                    <component :is="subscription.status === 'active' ? ToggleRight : ToggleLeft" class="h-4 w-4" />
                  </button>
                  <button
                    class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-100 bg-white/80 text-rose-500 shadow-sm transition-all hover:bg-rose-50"
                    type="button"
                    :aria-label="`Hapus ${subscription.topic}`"
                    @click="removeSubscription(subscription.id)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
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
            <h2 class="text-lg font-bold tracking-normal text-slate-800">Tambah MQTT Topic</h2>
            <p class="mt-1 text-sm font-medium text-slate-400">Hubungkan topic EMQX ke device tenant.</p>
          </div>
          <button
            class="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-all hover:bg-slate-100"
            type="button"
            aria-label="Tutup modal"
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
                required
                type="text"
              />
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
            <span class="text-sm font-semibold text-slate-700">Topic</span>
            <input
              v-model.trim="topicForm.topic"
              class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400"
              placeholder="pamilo/v1/tenants/demo-tenant/devices/+/telemetry"
              required
              type="text"
            />
          </label>

          <label class="space-y-2">
            <span class="text-sm font-semibold text-slate-700">Metric Keys Preview</span>
            <input
              v-model.trim="topicForm.metricKeys"
              class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400"
              placeholder="ph, moisture, nitrogen, temperature"
              type="text"
            />
          </label>
        </div>

        <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button class="min-h-11 rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 transition-all hover:bg-slate-100" type="button" @click="closeModal">
            Batal
          </button>
          <button class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-300 px-5 py-2 text-sm font-semibold text-emerald-950 shadow-sm transition-all hover:bg-emerald-400" type="submit">
            <Save class="h-4 w-4" />
            Simpan Topic
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Activity,
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
const tenantId = computed(() => authStore.tenant?.id ?? "demo-tenant");
const brokerHost = computed(() => hostFromUrl(appEnvironment.mqttBrokerUrl, "mqtt.keycloud.id:8883"));
const websocketHost = computed(() => hostFromUrl(appEnvironment.mqttWebSocketUrl, "mqtt.keycloud.id:8084"));
const searchQuery = ref("");
const isModalOpen = ref(false);
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

const brokerCards = computed(() => [
  {
    label: "EMQX MQTT Broker",
    value: brokerHost.value,
    detail: "Native MQTT TLS endpoint",
    icon: SatelliteDish
  },
  {
    label: "WebSocket Endpoint",
    value: websocketHost.value,
    detail: "Frontend telemetry transport",
    icon: Router
  },
  {
    label: "Active Subscription",
    value: activeSubscriptionTopic.value,
    detail: `${activeSubscriptions.value.length} topic aktif`,
    icon: Activity
  },
  {
    label: "Tenant ACL",
    value: "Per-device scoped",
    detail: "Topic tenant tidak bercampur",
    icon: ShieldCheck
  }
].slice(0, 3));

function openModal(): void {
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
  subscriptions.value = subscriptions.value.filter((subscription) => subscription.id !== subscriptionId);
  persistSubscriptions();
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

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
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
