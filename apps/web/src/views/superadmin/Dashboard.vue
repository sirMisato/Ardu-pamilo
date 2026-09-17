<template>
  <div class="space-y-5">
    <section class="grid gap-4 md:grid-cols-3">
      <article v-for="stat in stats" :key="stat.label" class="rounded-lg border border-white/10 bg-white/5 p-5">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm text-slate-400">{{ stat.label }}</p>
            <p class="mt-2 text-3xl font-semibold tracking-normal text-white">{{ stat.value }}</p>
            <p class="mt-4 text-sm" :class="stat.detailClass">{{ stat.detail }}</p>
          </div>
          <component :is="stat.icon" class="h-8 w-8" :class="stat.iconClass" />
        </div>
      </article>
    </section>

    <section class="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
      <article class="rounded-lg border border-white/10 bg-white/5">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-5">
          <div>
            <h2 class="text-lg font-semibold tracking-normal text-white">{{ t("superadmin.dashboard.tenantLicenses") }}</h2>
            <p class="mt-1 text-sm text-slate-400">{{ t("superadmin.dashboard.latestAccounts") }}</p>
          </div>
          <button class="inline-flex min-h-10 items-center gap-2 rounded-lg border border-amber-300/30 px-4 text-sm font-semibold text-amber-100 hover:bg-amber-300/10" type="button" @click="refresh">
            <RefreshCcw class="h-4 w-4" />
            {{ t("common.refresh") }}
          </button>
        </div>

        <div v-if="errorMessage" class="m-5 rounded-lg border border-rose-300/25 bg-rose-300/10 p-4 text-sm text-rose-100">
          {{ errorMessage }}
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-[760px] w-full text-left text-sm">
            <thead class="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th class="px-5 py-4 font-semibold">{{ t("superadmin.columns.tenant") }}</th>
                <th class="px-5 py-4 font-semibold">{{ t("common.status") }}</th>
                <th class="px-5 py-4 font-semibold">{{ t("superadmin.columns.quotas") }}</th>
                <th class="px-5 py-4 font-semibold">{{ t("superadmin.columns.expires") }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/10">
              <tr v-for="tenant in recentTenants" :key="tenant.id" class="hover:bg-white/[0.03]">
                <td class="px-5 py-4">
                  <p class="font-semibold text-white">{{ tenant.accountName }}</p>
                  <p class="mt-1 text-xs text-slate-400">{{ tenant.ownerEmail }}</p>
                </td>
                <td class="px-5 py-4">
                  <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="statusClass(tenant.licenseStatus)">
                    {{ statusLabel(tenant.licenseStatus) }}
                  </span>
                </td>
                <td class="px-5 py-4 text-slate-300">{{ t("superadmin.dashboard.quotaValue", { plots: formatDataCount(tenant.maxPlots), devices: formatDataCount(tenant.maxDevices) }) }}</td>
                <td class="px-5 py-4 text-slate-300">{{ tenant.licenseExpiresAt ? formatDate(tenant.licenseExpiresAt) : t("superadmin.noExpiry") }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="isLoading" class="border-t border-white/10 p-8 text-center text-sm text-slate-400">
          {{ t("superadmin.loadingLicenses") }}
        </div>
        <div v-else-if="recentTenants.length === 0" class="border-t border-white/10 p-8 text-center text-sm text-slate-400">
          {{ t("superadmin.empty.noLicenses") }}
        </div>
      </article>

      <article class="rounded-lg border border-white/10 bg-white/5 p-5">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold tracking-normal text-white">{{ t("superadmin.dashboard.systemHealth") }}</h2>
            <p class="mt-1 text-sm text-slate-400">{{ t("superadmin.dashboard.controlPlaneStatus") }}</p>
          </div>
          <Activity class="h-7 w-7 text-field-mint" />
        </div>

        <dl class="mt-5 grid gap-3">
          <div v-for="item in healthItems" :key="item.label" class="rounded-lg border border-white/10 bg-[#0b1626] p-4">
            <dt class="text-xs uppercase tracking-wide text-slate-500">{{ item.label }}</dt>
            <dd class="mt-2 flex items-center justify-between gap-3">
              <span class="font-semibold text-white">{{ item.value }}</span>
              <span class="h-2.5 w-2.5 rounded-full bg-field-green shadow-[0_0_0_6px_rgba(167,232,175,0.12)]"></span>
            </dd>
          </div>
        </dl>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Activity, BadgeCheck, Building2, RefreshCcw, ShieldAlert } from "@lucide/vue";
import { storeToRefs } from "pinia";
import { computed, onMounted } from "vue";
import { useI18n } from "../../i18n";
import { formatDataCount, formatDateTime } from "../../i18n/formatters";
import { useAdminStore, type TenantLicenseStatus } from "../../stores/adminStore";

const adminStore = useAdminStore();
const { activeLicenseCount, errorMessage, isLoading, overview, revokedLicenseCount, suspendedLicenseCount, tenants } = storeToRefs(adminStore);
const { t } = useI18n();

const stats = computed(() => [
  {
    detail: t("superadmin.dashboard.suspendedCount", { count: formatDataCount(suspendedLicenseCount.value) }),
    detailClass: "text-slate-400",
    icon: Building2,
    iconClass: "text-field-mint",
    label: t("superadmin.dashboard.totalTenants"),
    value: formatDataCount(overview.value?.totalTenants ?? tenants.value.length)
  },
  {
    detail: t("superadmin.dashboard.trialActiveAccounts"),
    detailClass: "text-field-mint",
    icon: BadgeCheck,
    iconClass: "text-field-green",
    label: t("superadmin.dashboard.activeLicenses"),
    value: formatDataCount(overview.value?.activeLicenses ?? activeLicenseCount.value)
  },
  {
    detail: t("superadmin.dashboard.revokedCount", { count: formatDataCount(revokedLicenseCount.value) }),
    detailClass: "text-amber-100",
    icon: ShieldAlert,
    iconClass: "text-amber-200",
    label: t("superadmin.dashboard.licenseWatch"),
    value: formatDataCount(suspendedLicenseCount.value + revokedLicenseCount.value)
  }
]);

const recentTenants = computed(() => tenants.value.slice(0, 6));
const healthItems = computed(() => [
  { label: "API", value: healthLabel(overview.value?.systemHealth.api) },
  { label: "Database", value: healthLabel(overview.value?.systemHealth.database) },
  { label: "MQTT Ingestor", value: healthLabel(overview.value?.systemHealth.mqttIngestor) }
]);

onMounted(() => {
  void refresh();
});

async function refresh(): Promise<void> {
  await Promise.all([
    adminStore.fetchOverview(),
    adminStore.fetchTenants()
  ]);
}

function statusLabel(status: TenantLicenseStatus): string {
  if (status === "active") return t("superadmin.status.active");
  if (status === "trial") return t("superadmin.status.trial");
  if (status === "suspended") return t("superadmin.status.suspended");
  return t("superadmin.status.revoked");
}

function statusClass(status: TenantLicenseStatus): string {
  if (status === "active") return "bg-field-mint/10 text-field-mint";
  if (status === "trial") return "bg-sky-300/10 text-sky-100";
  if (status === "suspended") return "bg-amber-300/10 text-amber-100";
  return "bg-rose-300/10 text-rose-100";
}

function formatDate(value: string): string {
  return formatDateTime(value, {
    dateStyle: "medium"
  });
}

function healthLabel(value: string | undefined): string {
  if (value === "nominal") return t("superadmin.health.nominal");
  if (value === "connected") return t("superadmin.health.connected");
  if (value === "local opt-in") return t("superadmin.health.localOptIn");
  return t("superadmin.health.checking");
}
</script>
