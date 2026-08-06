<template>
  <div class="space-y-5">
    <section class="grid gap-4 lg:grid-cols-3">
      <article v-for="card in brokerCards" :key="card.label" class="panel-surface p-5">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <p class="text-sm font-medium text-slate-400">{{ card.label }}</p>
            <p class="mt-2 truncate text-lg font-semibold tracking-normal text-white">{{ card.value }}</p>
            <p class="mt-2 text-xs text-field-mint">{{ card.detail }}</p>
          </div>
          <component :is="card.icon" class="h-8 w-8 shrink-0 text-field-green" />
        </div>
      </article>
    </section>

    <section class="panel-surface p-5">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <label class="relative flex-1">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            v-model.trim="searchQuery"
            class="min-h-11 w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-field-mint focus:ring-2 focus:ring-field-mint/25"
            placeholder="Cari device, topic, atau metric key"
            type="search"
          />
        </label>

        <button
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-field-green px-5 text-sm font-semibold text-[#102016] transition hover:bg-field-mint focus:outline-none focus:ring-2 focus:ring-field-mint/40"
          type="button"
          @click="openModal"
        >
          <Plus class="h-4 w-4" />
          Tambah Topic
        </button>
      </div>
    </section>

    <section class="panel-surface overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-[980px] w-full text-left text-sm">
          <thead class="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th class="px-5 py-4 font-semibold">Device</th>
              <th class="px-5 py-4 font-semibold">Topic Subscription</th>
              <th class="px-5 py-4 font-semibold">Broker</th>
              <th class="px-5 py-4 font-semibold">QoS</th>
              <th class="px-5 py-4 font-semibold">Dynamic Keys</th>
              <th class="px-5 py-4 font-semibold">Last Message</th>
              <th class="px-5 py-4 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/10">
            <tr v-for="subscription in filteredSubscriptions" :key="subscription.id" class="transition hover:bg-white/[0.03]">
              <td class="px-5 py-4">
                <div class="flex items-center gap-3">
                  <span class="h-2.5 w-2.5 rounded-full" :class="subscription.status === 'active' ? 'bg-field-mint' : 'bg-slate-500'"></span>
                  <div>
                    <p class="font-semibold text-white">{{ subscription.deviceId }}</p>
                    <p class="text-xs" :class="subscription.status === 'active' ? 'text-field-mint' : 'text-slate-500'">{{ subscription.status }}</p>
                  </div>
                </div>
              </td>
              <td class="px-5 py-4">
                <code class="break-all rounded-lg bg-[#07111f] px-2 py-1 text-xs text-sky-100">{{ subscription.topic }}</code>
              </td>
              <td class="px-5 py-4 text-slate-300">{{ subscription.brokerHost }}</td>
              <td class="px-5 py-4">
                <span class="rounded-full bg-field-mint/10 px-3 py-1 text-xs font-semibold text-field-mint">QoS {{ subscription.qos }}</span>
              </td>
              <td class="px-5 py-4">
                <div class="flex flex-wrap gap-2">
                  <span v-for="key in subscription.metricKeys" :key="key" class="rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-300">
                    {{ key }}
                  </span>
                </div>
              </td>
              <td class="px-5 py-4 text-slate-300">{{ formatDateTime(subscription.lastMessageAt) }}</td>
              <td class="px-5 py-4">
                <div class="flex justify-end gap-2">
                  <button class="icon-button" type="button" :aria-label="`Toggle ${subscription.topic}`" @click="toggleSubscription(subscription.id)">
                    <component :is="subscription.status === 'active' ? ToggleRight : ToggleLeft" class="h-4 w-4" />
                  </button>
                  <button class="icon-button" type="button" :aria-label="`Hapus ${subscription.topic}`" @click="removeSubscription(subscription.id)">
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/75 p-4 backdrop-blur-sm">
      <form class="w-full max-w-xl rounded-lg border border-field-mint/20 bg-[#101f32] p-5 shadow-field" @submit.prevent="registerTopic">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold tracking-normal text-white">Tambah MQTT Topic</h2>
            <p class="mt-1 text-sm text-slate-400">Hubungkan topic EMQX ke device tenant.</p>
          </div>
          <button class="icon-button" type="button" aria-label="Tutup modal" @click="closeModal">
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="mt-5 grid gap-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="space-y-2">
              <span class="text-sm font-medium text-slate-300">Device ID</span>
              <input
                v-model.trim="topicForm.deviceId"
                class="min-h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-field-mint focus:ring-2 focus:ring-field-mint/25"
                required
                type="text"
              />
            </label>

            <label class="space-y-2">
              <span class="text-sm font-medium text-slate-300">QoS</span>
              <select
                v-model.number="topicForm.qos"
                class="min-h-11 w-full rounded-lg border border-white/10 bg-[#0b1626] px-3 text-sm text-white outline-none focus:border-field-mint focus:ring-2 focus:ring-field-mint/25"
              >
                <option :value="0">0</option>
                <option :value="1">1</option>
                <option :value="2">2</option>
              </select>
            </label>
          </div>

          <label class="space-y-2">
            <span class="text-sm font-medium text-slate-300">Topic</span>
            <input
              v-model.trim="topicForm.topic"
              class="min-h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-field-mint focus:ring-2 focus:ring-field-mint/25"
              placeholder="pamilo/v1/tenants/mock-tenant/devices/+/telemetry"
              required
              type="text"
            />
          </label>

          <label class="space-y-2">
            <span class="text-sm font-medium text-slate-300">Metric Keys Preview</span>
            <input
              v-model.trim="topicForm.metricKeys"
              class="min-h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-field-mint focus:ring-2 focus:ring-field-mint/25"
              placeholder="ph, moisture, nitrogen, temperature"
              type="text"
            />
          </label>
        </div>

        <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button class="min-h-11 rounded-lg border border-white/10 px-4 text-sm font-semibold text-slate-300 hover:bg-white/5" type="button" @click="closeModal">
            Batal
          </button>
          <button class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-field-green px-5 text-sm font-semibold text-[#102016] hover:bg-field-mint" type="submit">
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
import { computed, reactive, ref } from "vue";
import { appEnvironment } from "../../config/environment";
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

const telemetryStore = useTelemetryStore();
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
  topic: "pamilo/v1/tenants/mock-tenant/devices/SensorNode04/telemetry",
  qos: 1,
  metricKeys: "ph, moisture, nitrogen"
});

const subscriptions = ref<TopicSubscription[]>([
  {
    id: "topic-sensornode01",
    deviceId: "SensorNode01",
    topic: "pamilo/v1/tenants/mock-tenant/devices/SensorNode01/telemetry",
    brokerHost: brokerHost.value,
    qos: 1,
    status: "active",
    metricKeys: ["ph", "nitrogen", "moisture", "temperature"],
    lastMessageAt: new Date(Date.now() - 2 * 60 * 1000).toISOString()
  },
  {
    id: "topic-sensornode02",
    deviceId: "SensorNode02",
    topic: "pamilo/v1/tenants/mock-tenant/devices/SensorNode02/telemetry",
    brokerHost: brokerHost.value,
    qos: 0,
    status: "active",
    metricKeys: ["moisture", "temperature"],
    lastMessageAt: new Date(Date.now() - 9 * 60 * 1000).toISOString()
  },
  {
    id: "topic-weatherhub01",
    deviceId: "WeatherHub01",
    topic: "pamilo/v1/tenants/mock-tenant/devices/WeatherHub01/telemetry",
    brokerHost: brokerHost.value,
    qos: 1,
    status: "paused",
    metricKeys: ["rainfall", "wind_speed", "humidity"],
    lastMessageAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  }
]);

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
    value: telemetryStore.subscriptionTopic,
    detail: `${subscriptions.value.filter((item) => item.status === "active").length} topic aktif`,
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
  topicForm.topic = "pamilo/v1/tenants/mock-tenant/devices/SensorNode04/telemetry";
  topicForm.qos = 1;
  topicForm.metricKeys = "ph, moisture, nitrogen";
  isModalOpen.value = true;
}

function closeModal(): void {
  isModalOpen.value = false;
}

function registerTopic(): void {
  subscriptions.value = [
    {
      id: `topic-${topicForm.deviceId.toLowerCase()}-${Date.now()}`,
      deviceId: topicForm.deviceId,
      topic: topicForm.topic,
      brokerHost: brokerHost.value,
      qos: topicForm.qos,
      status: "active",
      metricKeys: topicForm.metricKeys.split(",").map((key) => key.trim()).filter(Boolean),
      lastMessageAt: new Date().toISOString()
    },
    ...subscriptions.value
  ];
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
}

function removeSubscription(subscriptionId: string): void {
  subscriptions.value = subscriptions.value.filter((subscription) => subscription.id !== subscriptionId);
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
</script>
