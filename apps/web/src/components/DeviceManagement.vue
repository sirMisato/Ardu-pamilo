<template>
  <section class="workspace-section device-management" aria-label="Perangkat plot">
    <div class="section-title">
      <h2>Perangkat</h2>
      <span>{{ plot?.name ?? "-" }}</span>
    </div>

    <form v-if="canWrite && plot" class="compact-form device-provision-form" @submit.prevent="submitProvision">
      <input v-model="form.serialNo" aria-label="Serial ESP32" required type="text" />
      <input v-model="form.label" aria-label="Label perangkat" type="text" />
      <button class="primary-button" :disabled="store.busy" type="submit">Provision</button>
    </form>

    <div v-if="store.provisioningCredential" class="credential-panel">
      <dl class="credential-box">
        <div>
          <dt>Username</dt>
          <dd>{{ store.provisioningCredential.mqtt_username }}</dd>
        </div>
        <div>
          <dt>Password</dt>
          <dd>{{ store.provisioningCredential.credential.password }}</dd>
        </div>
        <div>
          <dt>Fingerprint</dt>
          <dd>{{ store.provisioningCredential.credential.fingerprint }}</dd>
        </div>
        <div>
          <dt>Topic</dt>
          <dd>{{ store.provisioningCredential.topics.publish[0] }}</dd>
        </div>
      </dl>
      <button class="ghost-button" type="button" @click="store.clearCredential()">Tutup</button>
    </div>

    <div v-if="store.devices.length" class="device-table" role="table" aria-label="Daftar perangkat ESP32">
      <div class="device-table-row device-table-head" role="row">
        <span role="columnheader">Perangkat</span>
        <span role="columnheader">Status</span>
        <span role="columnheader">Metric</span>
        <span role="columnheader">Aksi</span>
      </div>
      <div v-for="device in store.devices" :key="device.id" class="device-table-row" role="row">
        <div class="device-identity" role="cell">
          <strong>{{ device.label || device.serial_no }}</strong>
          <small>{{ device.serial_no }}</small>
          <small>{{ device.client_id }}</small>
        </div>
        <div role="cell">
          <span class="status-pill" :class="statusClass(device)">{{ statusLabel(device) }}</span>
          <small>{{ device.last_seen_at ? formatTimestamp(device.last_seen_at) : "-" }}</small>
        </div>
        <div role="cell">
          <strong>{{ latestMetricLabel(device.id) }}</strong>
          <small>{{ latestMetricDetail(device.id) }}</small>
        </div>
        <form v-if="canWrite && device.status !== 'revoked'" class="device-actions" role="cell" @submit.prevent="submitUpdate(device.id)">
          <input
            v-model="labelDrafts[device.id]"
            aria-label="Label perangkat"
            type="text"
          />
          <button class="ghost-button" :disabled="store.busy" type="submit">Simpan</button>
          <button class="ghost-button danger-button" :disabled="store.busy" type="button" @click="submitDelete(device.id)">
            Hapus
          </button>
        </form>
        <div v-else class="device-actions" role="cell">
          <span class="empty-inline">-</span>
        </div>
      </div>
    </div>
    <p v-else class="empty-state">Belum ada perangkat.</p>

    <p v-if="store.error" class="error-message" role="alert">{{ store.error }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import type { DevicePayload, PlotPayload, TelemetryReadingPayload } from "../api.js";
import { useDeviceManagementStore } from "../stores/device-management.js";

const props = defineProps<{
  plot: PlotPayload | null;
  canWrite: boolean;
  csrfToken: string | null;
  latestTelemetry: TelemetryReadingPayload[];
}>();

const store = useDeviceManagementStore();
const form = reactive({
  serialNo: "ESP32-DEMO-001",
  label: "Node Tanah"
});
const labelDrafts = reactive<Record<string, string>>({});
const latestByDevice = computed(() => {
  const latest = new Map<string, TelemetryReadingPayload>();

  for (const reading of props.latestTelemetry) {
    const current = latest.get(reading.device_id);
    if (!current || compareTelemetryTime(reading, current) > 0) {
      latest.set(reading.device_id, reading);
    }
  }

  return latest;
});

watch(
  () => props.plot?.id ?? "",
  (plotId) => {
    store.clearCredential();
    if (plotId) {
      void store.loadForPlot(plotId);
      return;
    }

    store.reset();
  },
  {
    immediate: true
  }
);

watch(
  () => store.devices,
  (devices) => {
    for (const device of devices) {
      if (!(device.id in labelDrafts)) {
        labelDrafts[device.id] = device.label ?? "";
      }
    }
  },
  {
    deep: true,
    immediate: true
  }
);

async function submitProvision(): Promise<void> {
  if (!props.plot || !props.csrfToken) {
    return;
  }

  const created = await store.provision({
    plotId: props.plot.id,
    serialNo: form.serialNo,
    label: form.label,
    csrfToken: props.csrfToken
  });

  if (created) {
    form.serialNo = nextSerial(form.serialNo);
  }
}

async function submitUpdate(deviceId: string): Promise<void> {
  if (!props.csrfToken) {
    return;
  }

  await store.update({
    deviceId,
    label: labelDrafts[deviceId] ?? null,
    csrfToken: props.csrfToken
  });
}

async function submitDelete(deviceId: string): Promise<void> {
  if (!props.csrfToken) {
    return;
  }

  await store.remove({
    deviceId,
    csrfToken: props.csrfToken
  });
}

function latestMetricLabel(deviceId: string): string {
  const reading = latestByDevice.value.get(deviceId);
  if (!reading) {
    return "-";
  }

  return formatMetricName(reading.metric);
}

function latestMetricDetail(deviceId: string): string {
  const reading = latestByDevice.value.get(deviceId);
  if (!reading) {
    return "Belum ada telemetry.";
  }

  return `${formatTelemetryValue(reading)} / ${formatTimestamp(reading.ts)}`;
}

function statusLabel(device: DevicePayload): string {
  if (device.status === "revoked") {
    return "Revoked";
  }

  if (!device.last_seen_at) {
    return "Provisioned";
  }

  const staleAfterMs = 15 * 60 * 1000;
  return Date.now() - Date.parse(device.last_seen_at) > staleAfterMs ? "Offline" : "Active";
}

function statusClass(device: DevicePayload): string {
  const label = statusLabel(device).toLowerCase();
  if (label === "active") {
    return "good";
  }

  if (label === "offline") {
    return "warn";
  }

  return "muted";
}

function formatMetricName(metric: string): string {
  return metric
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatTelemetryValue(reading: TelemetryReadingPayload): string {
  if (reading.value === null) {
    return `null ${reading.unit}`.trim();
  }

  if (typeof reading.value === "number") {
    return `${reading.value.toLocaleString("id-ID", {
      maximumFractionDigits: 2
    })} ${reading.unit}`.trim();
  }

  if (typeof reading.value === "boolean") {
    return `${reading.value ? "true" : "false"} ${reading.unit}`.trim();
  }

  return `${reading.value} ${reading.unit}`.trim();
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function compareTelemetryTime(left: TelemetryReadingPayload, right: TelemetryReadingPayload): number {
  const timeDifference = Date.parse(left.ts) - Date.parse(right.ts);
  if (timeDifference !== 0) {
    return timeDifference;
  }

  return left.seq - right.seq;
}

function nextSerial(current: string): string {
  const match = current.match(/^(.*?)(\d+)$/);
  if (!match) {
    return `${current}-001`;
  }

  const [, prefix, numeric] = match;
  if (!prefix || !numeric) {
    return `${current}-001`;
  }

  return `${prefix}${String(Number(numeric) + 1).padStart(numeric.length, "0")}`;
}
</script>
