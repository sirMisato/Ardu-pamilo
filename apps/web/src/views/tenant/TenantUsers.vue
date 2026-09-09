<template>
  <div class="space-y-5 text-slate-700">
    <section class="grid gap-4 md:grid-cols-3">
      <article class="rounded-[2rem] border border-white/80 bg-white/60 p-5 shadow-sm backdrop-blur-lg">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-medium text-slate-500">Total User</p>
            <p class="mt-2 text-3xl font-bold tracking-normal text-slate-800">{{ users.length }}</p>
          </div>
          <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <Users class="h-6 w-6" />
          </div>
        </div>
      </article>

      <article class="rounded-[2rem] border border-white/80 bg-white/60 p-5 shadow-sm backdrop-blur-lg">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-medium text-slate-500">Aktif</p>
            <p class="mt-2 text-3xl font-bold tracking-normal text-slate-800">{{ activeUserCount }}</p>
          </div>
          <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-teal-700">
            <CheckCircle2 class="h-6 w-6" />
          </div>
        </div>
      </article>

      <article class="rounded-[2rem] border border-white/80 bg-white/60 p-5 shadow-sm backdrop-blur-lg">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-medium text-slate-500">Role</p>
            <p class="mt-2 text-lg font-bold tracking-normal text-slate-800">Tenant User</p>
          </div>
          <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
            <ShieldCheck class="h-6 w-6" />
          </div>
        </div>
      </article>
    </section>

    <section class="rounded-[2rem] border border-white/80 bg-white/60 p-6 shadow-sm backdrop-blur-lg">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <label class="relative flex-1">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            v-model.trim="searchQuery"
            class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 pl-10 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400"
            placeholder="Cari nama atau email"
            type="search"
          />
        </label>

        <button
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-emerald-300 px-5 text-sm font-semibold text-emerald-950 shadow-sm transition-all hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
          type="button"
          @click="openUserModal()"
        >
          <UserPlus class="h-4 w-4" />
          Tambah User Tenant
        </button>
      </div>

      <div v-if="errorMessage" class="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-700">
        {{ errorMessage }}
      </div>

      <div v-if="successMessage" class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-700">
        {{ successMessage }}
      </div>
    </section>

    <section class="overflow-hidden rounded-[2rem] border border-white/80 bg-white/60 p-6 shadow-sm backdrop-blur-lg">
      <div class="overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/30">
        <div class="w-full overflow-x-auto whitespace-nowrap">
          <table class="min-w-[820px] w-full text-left text-sm">
            <thead class="bg-white/40 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th class="px-5 py-4">User</th>
                <th class="px-5 py-4">Role</th>
                <th class="px-5 py-4">Status</th>
                <th class="px-5 py-4">Dibuat</th>
                <th class="px-5 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in filteredUsers" :key="user.id" class="border-b border-white/60 transition-colors last:border-b-0 hover:bg-white/40">
                <td class="px-5 py-4">
                  <div class="flex items-center gap-3">
                    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                      <UserRound class="h-5 w-5" />
                    </div>
                    <div class="min-w-0">
                      <p class="truncate font-medium text-slate-700">{{ user.name }}</p>
                      <p class="truncate text-xs text-slate-500">{{ user.email }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-5 py-4 font-medium text-slate-700">{{ roleLabel(user.role) }}</td>
                <td class="px-5 py-4">
                  <span
                    class="inline-flex items-center gap-2 rounded-full px-3 py-0.5 text-xs font-semibold"
                    :class="user.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'"
                  >
                    <span class="h-2 w-2 rounded-full" :class="user.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'"></span>
                    {{ statusLabel(user.status) }}
                  </span>
                </td>
                <td class="px-5 py-4 font-medium text-slate-700">{{ formatDateTime(user.createdAt) }}</td>
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
      </div>

      <div v-if="isLoading" class="mt-4 rounded-xl border border-white/70 bg-white/40 p-8 text-center text-sm text-slate-500">
        Memuat user tenant.
      </div>

      <div v-else-if="filteredUsers.length === 0" class="mt-4 rounded-xl border border-white/70 bg-white/40 p-8 text-center text-sm text-slate-500">
        Belum ada user tenant sesuai filter.
      </div>
    </section>

    <div v-if="isUserModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 p-4 backdrop-blur-sm">
      <form class="w-full max-w-lg rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-2xl backdrop-blur-xl" @submit.prevent="submitUser">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold tracking-normal text-slate-800">{{ userModalTitle }}</h2>
            <p class="mt-1 text-sm text-slate-500">Role ini hanya bisa melihat Dashboard, Weather Station, Grafik, dan Report.</p>
          </div>
          <button class="icon-button" type="button" aria-label="Tutup modal" @click="closeUserModal">
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="mt-5 grid gap-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="space-y-2">
              <span class="mb-1 text-sm font-semibold text-slate-700">Nama</span>
              <input v-model.trim="userForm.name" class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400" required type="text" />
            </label>
            <label class="space-y-2">
              <span class="mb-1 text-sm font-semibold text-slate-700">Email</span>
              <input v-model.trim="userForm.email" class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400" required type="email" />
            </label>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <label class="space-y-2">
              <span class="mb-1 text-sm font-semibold text-slate-700">Password</span>
              <input
                v-model="userForm.password"
                class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400"
                minlength="8"
                :placeholder="editingUserId ? 'Kosongkan jika tidak diubah' : 'Minimal 8 karakter'"
                :required="!editingUserId"
                type="password"
                autocomplete="new-password"
              />
            </label>
            <label class="space-y-2">
              <span class="mb-1 text-sm font-semibold text-slate-700">Status</span>
              <select v-model="userForm.status" class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400">
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </label>
          </div>

          <label class="space-y-2">
            <span class="mb-1 text-sm font-semibold text-slate-700">Role</span>
            <select v-model="userForm.role" class="min-h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400">
              <option value="tenant_user">Tenant User Read Only</option>
            </select>
          </label>
        </div>

        <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button class="rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 transition-all hover:bg-slate-100" type="button" @click="closeUserModal">
            Batal
          </button>
          <button class="inline-flex items-center gap-2 rounded-xl bg-emerald-300 px-5 py-2 text-sm font-semibold text-emerald-950 shadow-sm transition-all hover:bg-emerald-400 disabled:opacity-60" :disabled="isSaving" type="submit">
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
