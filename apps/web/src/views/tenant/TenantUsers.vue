<template>
  <div class="space-y-5">
    <section class="grid gap-4 md:grid-cols-3">
      <article class="panel-surface p-5">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-medium text-slate-400">Total User</p>
            <p class="mt-2 text-3xl font-semibold tracking-normal text-white">{{ users.length }}</p>
          </div>
          <Users class="h-9 w-9 text-field-mint" />
        </div>
      </article>

      <article class="panel-surface p-5">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-medium text-slate-400">Aktif</p>
            <p class="mt-2 text-3xl font-semibold tracking-normal text-white">{{ activeUserCount }}</p>
          </div>
          <CheckCircle2 class="h-9 w-9 text-field-green" />
        </div>
      </article>

      <article class="panel-surface p-5">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-medium text-slate-400">Role</p>
            <p class="mt-2 text-lg font-semibold tracking-normal text-white">Tenant User</p>
          </div>
          <ShieldCheck class="h-9 w-9 text-sky-200" />
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
            placeholder="Cari nama atau email"
            type="search"
          />
        </label>

        <button
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-field-green px-5 text-sm font-semibold text-[#102016] transition hover:bg-field-mint focus:outline-none focus:ring-2 focus:ring-field-mint/40"
          type="button"
          @click="openUserModal()"
        >
          <UserPlus class="h-4 w-4" />
          Tambah User Tenant
        </button>
      </div>

      <div v-if="errorMessage" class="mt-4 rounded-lg border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-amber-100">
        {{ errorMessage }}
      </div>

      <div v-if="successMessage" class="mt-4 rounded-lg border border-field-mint/25 bg-field-mint/10 p-4 text-sm text-field-mint">
        {{ successMessage }}
      </div>
    </section>

    <section class="panel-surface overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-[820px] w-full text-left text-sm">
          <thead class="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th class="px-5 py-4 font-semibold">User</th>
              <th class="px-5 py-4 font-semibold">Role</th>
              <th class="px-5 py-4 font-semibold">Status</th>
              <th class="px-5 py-4 font-semibold">Dibuat</th>
              <th class="px-5 py-4 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/10">
            <tr v-for="user in filteredUsers" :key="user.id" class="transition hover:bg-white/[0.03]">
              <td class="px-5 py-4">
                <div class="flex items-center gap-3">
                  <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-field-mint/10 text-field-mint">
                    <UserRound class="h-5 w-5" />
                  </div>
                  <div class="min-w-0">
                    <p class="truncate font-semibold text-white">{{ user.name }}</p>
                    <p class="truncate text-xs text-slate-400">{{ user.email }}</p>
                  </div>
                </div>
              </td>
              <td class="px-5 py-4 text-slate-300">{{ roleLabel(user.role) }}</td>
              <td class="px-5 py-4">
                <span class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold" :class="statusClass(user.status)">
                  <span class="h-2 w-2 rounded-full" :class="user.status === 'active' ? 'bg-field-mint' : 'bg-slate-500'"></span>
                  {{ statusLabel(user.status) }}
                </span>
              </td>
              <td class="px-5 py-4 text-slate-300">{{ formatDateTime(user.createdAt) }}</td>
              <td class="px-5 py-4">
                <div class="flex justify-end gap-2">
                  <button class="icon-button" type="button" :aria-label="`Edit ${user.name}`" @click="openUserModal(user)">
                    <Pencil class="h-4 w-4" />
                  </button>
                  <button class="icon-button" type="button" :aria-label="`Hapus ${user.name}`" @click="removeUser(user)">
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="isLoading" class="border-t border-white/10 p-8 text-center text-sm text-slate-400">
        Memuat user tenant.
      </div>

      <div v-else-if="filteredUsers.length === 0" class="border-t border-white/10 p-8 text-center text-sm text-slate-400">
        Belum ada user tenant sesuai filter.
      </div>
    </section>

    <div v-if="isUserModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/75 p-4 backdrop-blur-sm">
      <form class="w-full max-w-xl rounded-lg border border-field-mint/20 bg-[#101f32] p-5 shadow-field" @submit.prevent="submitUser">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold tracking-normal text-white">{{ userModalTitle }}</h2>
            <p class="mt-1 text-sm text-slate-400">Role ini hanya bisa melihat Dashboard, Weather Station, Grafik, dan Report.</p>
          </div>
          <button class="icon-button" type="button" aria-label="Tutup modal" @click="closeUserModal">
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="mt-5 grid gap-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="space-y-2">
              <span class="text-sm font-medium text-slate-300">Nama</span>
              <input v-model.trim="userForm.name" class="min-h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-field-mint focus:ring-2 focus:ring-field-mint/25" required type="text" />
            </label>
            <label class="space-y-2">
              <span class="text-sm font-medium text-slate-300">Email</span>
              <input v-model.trim="userForm.email" class="min-h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-field-mint focus:ring-2 focus:ring-field-mint/25" required type="email" />
            </label>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <label class="space-y-2">
              <span class="text-sm font-medium text-slate-300">Password</span>
              <input
                v-model="userForm.password"
                class="min-h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-field-mint focus:ring-2 focus:ring-field-mint/25"
                minlength="8"
                :placeholder="editingUserId ? 'Kosongkan jika tidak diubah' : 'Minimal 8 karakter'"
                :required="!editingUserId"
                type="password"
                autocomplete="new-password"
              />
            </label>
            <label class="space-y-2">
              <span class="text-sm font-medium text-slate-300">Status</span>
              <select v-model="userForm.status" class="min-h-11 w-full rounded-lg border border-white/10 bg-[#0b1626] px-3 text-sm text-white outline-none focus:border-field-mint focus:ring-2 focus:ring-field-mint/25">
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </label>
          </div>

          <label class="space-y-2">
            <span class="text-sm font-medium text-slate-300">Role</span>
            <select v-model="userForm.role" class="min-h-11 w-full rounded-lg border border-white/10 bg-[#0b1626] px-3 text-sm text-white outline-none focus:border-field-mint focus:ring-2 focus:ring-field-mint/25">
              <option value="tenant_user">Tenant User Read Only</option>
            </select>
          </label>
        </div>

        <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button class="min-h-11 rounded-lg border border-white/10 px-4 text-sm font-semibold text-slate-300 hover:bg-white/5" type="button" @click="closeUserModal">
            Batal
          </button>
          <button class="inline-flex min-h-11 items-center gap-2 rounded-lg bg-field-green px-5 text-sm font-semibold text-[#102016] hover:bg-field-mint disabled:opacity-60" :disabled="isSaving" type="submit">
            <Save class="h-4 w-4" />
            {{ isSaving ? "Menyimpan" : userSubmitLabel }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CheckCircle2, Pencil, Save, Search, ShieldCheck, Trash2, UserPlus, UserRound, Users, X } from "@lucide/vue";
import { storeToRefs } from "pinia";
import { computed, onMounted, reactive, ref } from "vue";
import {
  useTenantUserStore,
  type ApiTenantUser,
  type CreateTenantUserInput,
  type TenantUserRole,
  type TenantUserStatus,
  type UpdateTenantUserInput
} from "../../stores/tenantUserStore";

const tenantUserStore = useTenantUserStore();
const { activeUserCount, errorMessage, isLoading, isSaving, users } = storeToRefs(tenantUserStore);
const searchQuery = ref("");
const successMessage = ref<string | null>(null);
const isUserModalOpen = ref(false);
const editingUserId = ref<string | null>(null);
const userForm = reactive<{
  email: string;
  name: string;
  password: string;
  role: TenantUserRole;
  status: TenantUserStatus;
}>({
  email: "",
  name: "",
  password: "",
  role: "tenant_user",
  status: "active"
});

const filteredUsers = computed(() => {
  const query = searchQuery.value.toLowerCase();
  if (!query) {
    return users.value;
  }

  return users.value.filter((user) => user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query));
});
const userModalTitle = computed(() => editingUserId.value ? "Edit User Tenant" : "Tambah User Tenant");
const userSubmitLabel = computed(() => editingUserId.value ? "Update User" : "Simpan User");

onMounted(() => {
  void tenantUserStore.fetchUsers();
});

function openUserModal(user?: ApiTenantUser): void {
  editingUserId.value = user?.id ?? null;
  userForm.email = user?.email ?? "";
  userForm.name = user?.name ?? "";
  userForm.password = "";
  userForm.role = user?.role ?? "tenant_user";
  userForm.status = user?.status ?? "active";
  successMessage.value = null;
  tenantUserStore.clearError();
  isUserModalOpen.value = true;
}

function closeUserModal(): void {
  isUserModalOpen.value = false;
  editingUserId.value = null;
}

async function submitUser(): Promise<void> {
  const basePayload = {
    email: userForm.email,
    name: userForm.name,
    role: userForm.role,
    status: userForm.status
  };

  const saved = editingUserId.value
    ? await tenantUserStore.updateUser(editingUserId.value, {
        ...basePayload,
        ...(userForm.password ? { password: userForm.password } : {})
      } as UpdateTenantUserInput)
    : await tenantUserStore.createUser({
        ...basePayload,
        password: userForm.password
      } as CreateTenantUserInput);

  if (saved) {
    successMessage.value = `User ${saved.name} tersimpan sebagai ${roleLabel(saved.role)}.`;
    closeUserModal();
  }
}

async function removeUser(user: ApiTenantUser): Promise<void> {
  if (!window.confirm(`Hapus user tenant ${user.name}?`)) {
    return;
  }

  const deleted = await tenantUserStore.deleteUser(user.id);
  if (deleted) {
    successMessage.value = `User ${user.name} sudah dihapus.`;
  }
}

function roleLabel(role: TenantUserRole): string {
  return role === "tenant_user" ? "Tenant User Read Only" : role;
}

function statusLabel(status: TenantUserStatus): string {
  return status === "active" ? "Aktif" : "Nonaktif";
}

function statusClass(status: TenantUserStatus): string {
  return status === "active" ? "bg-field-mint/10 text-field-mint" : "bg-slate-500/10 text-slate-300";
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
</script>
