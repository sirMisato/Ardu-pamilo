import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { applyLocaleFromIdentity, resetLocaleToGuest } from "../i18n";
import {
  clearAccessToken,
  getAccessToken,
  loginSuperAdmin as requestSuperAdminLogin,
  loginTenant as requestTenantLogin,
  type SuperAdminLoginResponse,
  type TenantLoginResponse
} from "../services/apiClient";

export type AuthRole = "tenant_admin" | "tenant_user" | "super_admin";

export interface AuthUser {
  email: string;
  name?: string;
  role: AuthRole;
}

export interface AuthTenant {
  accountName?: string;
  id: string;
  licenseExpiresAt?: string | null;
  licenseStatus?: string;
  maxDevices?: number;
  maxPlots?: number;
  ownerEmail?: string;
  role?: string;
}

interface JwtClientPayload {
  exp?: number;
  role?: AuthRole;
  sub?: string;
  tenant_id?: string;
}

const authProfileStorageKey = "pamilo.authProfile";

export const useAuthStore = defineStore("auth", () => {
  const accessToken = ref<string | null>(getAccessToken());
  const user = ref<AuthUser | null>(null);
  const tenant = ref<AuthTenant | null>(null);
  const isReady = ref(false);

  const isAuthenticated = computed(() => Boolean(accessToken.value && user.value));
  const isSuperAdmin = computed(() => user.value?.role === "super_admin");
  const isReadOnlyTenant = computed(() => user.value?.role === "tenant_user");
  const isTenantAdmin = computed(() => user.value?.role === "tenant_admin");
  const isTenant = computed(() => isTenantAdmin.value || isReadOnlyTenant.value);

  function restoreFromStorage(): void {
    const token = getAccessToken();
    accessToken.value = token;

    if (!token) {
      clearSessionState();
      isReady.value = true;
      return;
    }

    const payload = decodeJwtPayload(token);
    if (!payload || isJwtExpired(payload)) {
      logout();
      isReady.value = true;
      return;
    }

    const storedProfile = readStoredProfile();
    user.value = storedProfile?.user ?? {
      email: payload.sub ?? "user@pamilo.local",
      role: payload.role ?? "tenant_user"
    };
    tenant.value = storedProfile?.tenant ?? (payload.tenant_id ? {
      id: payload.tenant_id,
      role: payload.role
    } : null);
    applyLocaleFromCurrentAuth();
    isReady.value = true;
  }

  async function loginTenant(credentials: {
    emailOrUsername: string;
    password: string;
    tenantId?: string;
  }): Promise<TenantLoginResponse> {
    const response = await requestTenantLogin(credentials);
    accessToken.value = response.accessToken;
    user.value = response.user;
    tenant.value = response.tenant;
    persistProfile();
    applyLocaleFromCurrentAuth();
    return response;
  }

  async function loginSuperAdmin(credentials: {
    email: string;
    password: string;
  }): Promise<SuperAdminLoginResponse> {
    const response = await requestSuperAdminLogin(credentials);
    accessToken.value = response.accessToken;
    user.value = response.user;
    tenant.value = {
      id: "platform",
      role: "super_admin"
    };
    persistProfile();
    applyLocaleFromCurrentAuth();
    return response;
  }

  function logout(): void {
    clearAccessToken();
    localStorage.removeItem(authProfileStorageKey);
    accessToken.value = null;
    clearSessionState();
    resetLocaleToGuest();
  }

  function applyTenantProfile(profile: { email: string; name: string }): void {
    if (user.value) {
      user.value.email = profile.email;
    }

    if (tenant.value) {
      tenant.value.accountName = profile.name;
      tenant.value.ownerEmail = profile.email;
    }

    persistProfile();
  }

  function clearSessionState(): void {
    user.value = null;
    tenant.value = null;
  }

  function persistProfile(): void {
    localStorage.setItem(authProfileStorageKey, JSON.stringify({
      tenant: tenant.value,
      user: user.value
    }));
  }

  function applyLocaleFromCurrentAuth(accountPreference?: string | null): void {
    if (!user.value) {
      resetLocaleToGuest();
      return;
    }

    applyLocaleFromIdentity({
      role: user.value.role === "super_admin" ? "superadmin" : "tenant",
      tenantId: tenant.value?.id ?? null,
      userKey: user.value.email
    }, accountPreference);
  }

  return {
    accessToken,
    applyTenantProfile,
    isAuthenticated,
    isReadOnlyTenant,
    isReady,
    isSuperAdmin,
    isTenant,
    isTenantAdmin,
    loginSuperAdmin,
    loginTenant,
    logout,
    applyLocaleFromCurrentAuth,
    restoreFromStorage,
    tenant,
    user
  };
});

function readStoredProfile(): { tenant: AuthTenant | null; user: AuthUser | null } | null {
  const raw = localStorage.getItem(authProfileStorageKey);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return null;
    }

    const user = isRecord(parsed.user) && isAuthRole(parsed.user.role) && typeof parsed.user.email === "string"
      ? {
          email: parsed.user.email,
          name: typeof parsed.user.name === "string" ? parsed.user.name : undefined,
          role: parsed.user.role
        }
      : null;
    const tenant = isRecord(parsed.tenant) && typeof parsed.tenant.id === "string"
      ? {
          accountName: typeof parsed.tenant.accountName === "string" ? parsed.tenant.accountName : undefined,
          id: parsed.tenant.id,
          licenseExpiresAt: typeof parsed.tenant.licenseExpiresAt === "string" ? parsed.tenant.licenseExpiresAt : null,
          licenseStatus: typeof parsed.tenant.licenseStatus === "string" ? parsed.tenant.licenseStatus : undefined,
          maxDevices: typeof parsed.tenant.maxDevices === "number" ? parsed.tenant.maxDevices : undefined,
          maxPlots: typeof parsed.tenant.maxPlots === "number" ? parsed.tenant.maxPlots : undefined,
          ownerEmail: typeof parsed.tenant.ownerEmail === "string" ? parsed.tenant.ownerEmail : undefined,
          role: typeof parsed.tenant.role === "string" ? parsed.tenant.role : undefined
        }
      : null;

    return {
      tenant,
      user
    };
  } catch {
    return null;
  }
}

function decodeJwtPayload(token: string): JwtClientPayload | null {
  const [, payload] = token.split(".");

  if (!payload) {
    return null;
  }

  try {
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const parsed = JSON.parse(json) as unknown;

    if (!isRecord(parsed)) {
      return null;
    }

    return {
      exp: typeof parsed.exp === "number" ? parsed.exp : undefined,
      role: isAuthRole(parsed.role) ? parsed.role : undefined,
      sub: typeof parsed.sub === "string" ? parsed.sub : undefined,
      tenant_id: typeof parsed.tenant_id === "string" ? parsed.tenant_id : undefined
    };
  } catch {
    return null;
  }
}

function isJwtExpired(payload: JwtClientPayload): boolean {
  return typeof payload.exp === "number" && payload.exp * 1000 <= Date.now();
}

function isAuthRole(value: unknown): value is AuthRole {
  return value === "tenant_admin" || value === "tenant_user" || value === "super_admin";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
