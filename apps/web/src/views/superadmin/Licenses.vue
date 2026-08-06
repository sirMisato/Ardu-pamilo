<template>
  <div class="space-y-5">
    <section class="rounded-lg border border-white/10 bg-white/5 p-5">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 class="text-xl font-semibold tracking-normal text-white">License Management</h2>
          <p class="mt-1 text-sm text-slate-400">Create, update, and revoke tenant SaaS accounts.</p>
        </div>

        <div class="flex flex-col gap-3 sm:flex-row">
          <label class="relative min-w-0 sm:w-72">
            <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              v-model.trim="searchQuery"
              class="min-h-11 w-full rounded-lg border border-white/10 bg-[#0b1626] pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-amber-300 focus:ring-2 focus:ring-amber-300/25"
              placeholder="Search tenant"
              type="search"
            />
          </label>

          <button class="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-amber-300 px-5 text-sm font-semibold text-slate-950 transition hover:bg-amber-200" type="button" @click="openCreateModal">
            <Plus class="h-4 w-4" />
            Create New Tenant License
          </button>
        </div>
      </div>

      <div class="mt-5 flex flex-wrap gap-2">
        <button
          v-for="status in statusFilters"
          :key="status.value"
          class="min-h-9 rounded-lg px-3 text-sm font-semibold transition"
          :class="statusFilter === status.value ? 'bg-amber-300 text-slate-950' : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'"
          type="button"
          @click="statusFilter = status.value"
        >
          {{ status.label }}
        </button>
      </div>

      <div v-if="errorMessage" class="mt-4 rounded-lg border border-rose-300/25 bg-rose-300/10 p-4 text-sm text-rose-100">
        {{ errorMessage }}
      </div>
    </section>

    <section class="overflow-hidden rounded-lg border border-white/10 bg-white/5">
      <div class="overflow-x-auto">
        <table class="min-w-[1120px] w-full text-left text-sm">
          <thead class="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th class="px-5 py-4 font-semibold">Tenant</th>
              <th class="px-5 py-4 font-semibold">License</th>
              <th class="px-5 py-4 font-semibold">Max Plots</th>
              <th class="px-5 py-4 font-semibold">Max Devices</th>
              <th class="px-5 py-4 font-semibold">Expiry</th>
              <th class="px-5 py-4 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/10">
            <tr v-for="row in filteredRows" :key="row.tenant.id" class="hover:bg-white/[0.03]">
              <td class="px-5 py-4 align-top">
                <div class="grid gap-2">
                  <input
                    v-model.trim="row.draft.accountName"
                    class="min-h-10 rounded-lg border border-white/10 bg-[#0b1626] px-3 text-sm font-semibold text-white outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-300/25"
                    type="text"
                  />
                  <input
                    v-model.trim="row.draft.ownerEmail"
                    class="min-h-10 rounded-lg border border-white/10 bg-[#0b1626] px-3 text-xs text-slate-300 outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-300/25"
                    type="email"
                  />
                  <span class="text-xs text-slate-500">{{ row.tenant.id }}</span>
                </div>
              </td>
              <td class="px-5 py-4 align-top">
                <select
                  v-model="row.draft.licenseStatus"
                  class="min-h-10 rounded-lg border border-white/10 bg-[#0b1626] px-3 text-sm text-white outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-300/25"
                >
                  <option value="trial">Trial</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="revoked">Revoked</option>
                </select>
                <span class="mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" :class="statusClass(row.tenant.licenseStatus)">
                  {{ statusLabel(row.tenant.licenseStatus) }}
                </span>
              </td>
              <td class="px-5 py-4 align-top">
                <input
                  v-model.number="row.draft.maxPlots"
                  class="min-h-10 w-28 rounded-lg border border-white/10 bg-[#0b1626] px-3 text-sm text-white outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-300/25"
                  min="1"
                  type="number"
                />
              </td>
              <td class="px-5 py-4 align-top">
                <input
                  v-model.number="row.draft.maxDevices"
                  class="min-h-10 w-28 rounded-lg border border-white/10 bg-[#0b1626] px-3 text-sm text-white outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-300/25"
                  min="1"
                  type="number"
                />
              </td>
              <td class="px-5 py-4 align-top">
                <input
                  v-model="row.draft.expiresDate"
                  class="min-h-10 rounded-lg border border-white/10 bg-[#0b1626] px-3 text-sm text-white outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-300/25"
                  type="date"
                />
                <p class="mt-2 text-xs text-slate-500">Created {{ formatDate(row.tenant.createdAt) }}</p>
              </td>
              <td class="px-5 py-4 align-top">
                <div class="flex justify-end gap-2">
                  <button class="inline-flex min-h-10 items-center gap-2 rounded-lg bg-field-green px-4 text-sm font-semibold text-[#102016] hover:bg-field-mint disabled:opacity-60" :disabled="isSaving" type="button" @click="saveTenant(row.tenant.id)">
                    <Save class="h-4 w-4" />
                    Save
                  </button>
                  <button class="inline-flex min-h-10 items-center gap-2 rounded-lg border border-rose-300/30 px-4 text-sm font-semibold text-rose-100 hover:bg-rose-300/10 disabled:opacity-60" :disabled="isSaving || row.tenant.licenseStatus === 'revoked'" type="button" @click="revokeTenant(row.tenant.id)">
                    <Ban class="h-4 w-4" />
                    Revoke
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="isLoading" class="border-t border-white/10 p-8 text-center text-sm text-slate-400">
        Loading tenant licenses.
      </div>
      <div v-else-if="filteredRows.length === 0" class="border-t border-white/10 p-8 text-center text-sm text-slate-400">
        No tenant license matches the current filter.
      </div>
    </section>

    <div v-if="isCreateModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/75 p-4 backdrop-blur-sm">
      <form class="w-full max-w-2xl rounded-lg border border-amber-300/20 bg-[#0d1624] p-5 shadow-field" @submit.prevent="submitTenant">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold tracking-normal text-white">Create New Tenant License</h2>
            <p class="mt-1 text-sm text-slate-400">Tenant owner can sign in after this account is created.</p>
          </div>
          <button class="icon-button" type="button" aria-label="Close modal" @click="closeCreateModal">
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="mt-5 grid gap-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="space-y-2">
              <span class="text-sm font-medium text-slate-300">Account Name</span>
              <input v-model.trim="createForm.accountName" class="min-h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-300/25" required type="text" />
            </label>
            <label class="space-y-2">
              <span class="text-sm font-medium text-slate-300">Owner Email</span>
              <input v-model.trim="createForm.ownerEmail" class="min-h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-300/25" required type="email" />
            </label>
          </div>

          <div class="grid gap-4 sm:grid-cols-3">
            <label class="space-y-2">
              <span class="text-sm font-medium text-slate-300">Status</span>
              <select v-model="createForm.licenseStatus" class="min-h-11 w-full rounded-lg border border-white/10 bg-[#0b1626] px-3 text-sm text-white outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-300/25">
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </label>
            <label class="space-y-2">
              <span class="text-sm font-medium text-slate-300">Max Plots</span>
              <input v-model.number="createForm.maxPlots" class="min-h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-300/25" min="1" required type="number" />
            </label>
            <label class="space-y-2">
              <span class="text-sm font-medium text-slate-300">Max Devices</span>
              <input v-model.number="createForm.maxDevices" class="min-h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-300/25" min="1" required type="number" />
            </label>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <label class="space-y-2">
              <span class="text-sm font-medium text-slate-300">Expiry Date</span>
              <input v-model="createForm.expiresDate" class="min-h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-300/25" type="date" />
            </label>
            <label class="space-y-2">
              <span class="text-sm font-medium text-slate-300">Temporary Password</span>
              <input v-model="createForm.password" class="min-h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-300/25" minlength="8" required type="password" />
            </label>
          </div>
        </div>

        <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button class="min-h-11 rounded-lg border border-white/10 px-4 text-sm font-semibold text-slate-300 hover:bg-white/5" type="button" @click="closeCreateModal">
            Cancel
          </button>
          <button class="inline-flex min-h-11 items-center gap-2 rounded-lg bg-amber-300 px-5 text-sm font-semibold text-slate-950 hover:bg-amber-200 disabled:opacity-60" :disabled="isSaving" type="submit">
            <Save class="h-4 w-4" />
            {{ isSaving ? "Creating" : "Create License" }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Ban, Plus, Save, Search, X } from "@lucide/vue";
import { storeToRefs } from "pinia";
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useAdminStore, type AdminTenantLicense, type TenantLicenseStatus } from "../../stores/adminStore";

type StatusFilter = "all" | TenantLicenseStatus;

interface TenantDraft {
  accountName: string;
  expiresDate: string;
  licenseStatus: TenantLicenseStatus;
  maxDevices: number;
  maxPlots: number;
  ownerEmail: string;
}

const adminStore = useAdminStore();
const { errorMessage, isLoading, isSaving, tenants } = storeToRefs(adminStore);
const searchQuery = ref("");
const statusFilter = ref<StatusFilter>("all");
const isCreateModalOpen = ref(false);
const drafts = reactive<Record<string, TenantDraft>>({});
const createForm = reactive({
  accountName: "",
  expiresDate: "",
  licenseStatus: "trial" as TenantLicenseStatus,
  maxDevices: 3,
  maxPlots: 1,
  ownerEmail: "",
  password: ""
});

const statusFilters = [
  { label: "All", value: "all" as const },
  { label: "Trial", value: "trial" as const },
  { label: "Active", value: "active" as const },
  { label: "Suspended", value: "suspended" as const },
  { label: "Revoked", value: "revoked" as const }
];

const filteredTenants = computed(() => {
  const query = searchQuery.value.toLowerCase();

  return tenants.value.filter((tenant) => {
    const matchesStatus = statusFilter.value === "all" || tenant.licenseStatus === statusFilter.value;
    const matchesQuery = !query
      || tenant.accountName.toLowerCase().includes(query)
      || tenant.ownerEmail.toLowerCase().includes(query)
      || tenant.id.toLowerCase().includes(query);

    return matchesStatus && matchesQuery;
  });
});

const filteredRows = computed(() => filteredTenants.value.map((tenant) => ({
  draft: ensureDraft(tenant),
  tenant
})));

onMounted(() => {
  void adminStore.fetchTenants();
});

watch(tenants, (items) => {
  for (const tenant of items) {
    if (!drafts[tenant.id]) {
      drafts[tenant.id] = toDraft(tenant);
    }
  }
}, {
  immediate: true
});

function openCreateModal(): void {
  createForm.accountName = "";
  createForm.expiresDate = "";
  createForm.licenseStatus = "trial";
  createForm.maxDevices = 3;
  createForm.maxPlots = 1;
  createForm.ownerEmail = "";
  createForm.password = "";
  adminStore.clearError();
  isCreateModalOpen.value = true;
}

function closeCreateModal(): void {
  isCreateModalOpen.value = false;
}

async function submitTenant(): Promise<void> {
  const created = await adminStore.createTenantLicense({
    accountName: createForm.accountName,
    licenseExpiresAt: dateInputToIso(createForm.expiresDate),
    licenseStatus: createForm.licenseStatus,
    maxDevices: Number(createForm.maxDevices),
    maxPlots: Number(createForm.maxPlots),
    ownerEmail: createForm.ownerEmail,
    password: createForm.password
  });

  if (created) {
    closeCreateModal();
  }
}

async function saveTenant(tenantId: string): Promise<void> {
  const draft = drafts[tenantId];

  if (!draft) {
    return;
  }

  const updated = await adminStore.updateTenantLicense(tenantId, {
    accountName: draft.accountName,
    licenseExpiresAt: dateInputToIso(draft.expiresDate),
    licenseStatus: draft.licenseStatus,
    maxDevices: Number(draft.maxDevices),
    maxPlots: Number(draft.maxPlots),
    ownerEmail: draft.ownerEmail
  });

  if (updated) {
    drafts[updated.id] = toDraft(updated);
  }
}

async function revokeTenant(tenantId: string): Promise<void> {
  const revoked = await adminStore.revokeTenantLicense(tenantId);

  if (revoked) {
    drafts[revoked.id] = toDraft(revoked);
  }
}

function toDraft(tenant: AdminTenantLicense): TenantDraft {
  return {
    accountName: tenant.accountName,
    expiresDate: tenant.licenseExpiresAt ? tenant.licenseExpiresAt.slice(0, 10) : "",
    licenseStatus: tenant.licenseStatus,
    maxDevices: tenant.maxDevices,
    maxPlots: tenant.maxPlots,
    ownerEmail: tenant.ownerEmail
  };
}

function ensureDraft(tenant: AdminTenantLicense): TenantDraft {
  if (!drafts[tenant.id]) {
    drafts[tenant.id] = toDraft(tenant);
  }

  return drafts[tenant.id]!;
}

function dateInputToIso(value: string): string | null {
  return value ? new Date(`${value}T23:59:59.000Z`).toISOString() : null;
}

function statusLabel(status: TenantLicenseStatus): string {
  if (status === "active") return "Active";
  if (status === "trial") return "Trial";
  if (status === "suspended") return "Suspended";
  return "Revoked";
}

function statusClass(status: TenantLicenseStatus): string {
  if (status === "active") return "bg-field-mint/10 text-field-mint";
  if (status === "trial") return "bg-sky-300/10 text-sky-100";
  if (status === "suspended") return "bg-amber-300/10 text-amber-100";
  return "bg-rose-300/10 text-rose-100";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium"
  }).format(new Date(value));
}
</script>
