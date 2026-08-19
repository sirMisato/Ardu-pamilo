import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import AppLayout from "../components/layout/AppLayout.vue";
import SuperAdminLayout from "../components/layout/SuperAdminLayout.vue";
import SuperAdminLogin from "../views/auth/SuperAdminLogin.vue";
import TenantLogin from "../views/auth/TenantLogin.vue";
import SuperAdminDashboard from "../views/superadmin/Dashboard.vue";
import SuperAdminLicenses from "../views/superadmin/Licenses.vue";
import Chart from "../views/tenant/Chart.vue";
import Dashboard from "../views/tenant/Dashboard.vue";
import Devices from "../views/tenant/Devices.vue";
import MasterData from "../views/tenant/MasterData.vue";
import MQTT from "../views/tenant/MQTT.vue";
import Report from "../views/tenant/Report.vue";
import Settings from "../views/tenant/Settings.vue";
import TenantUsers from "../views/tenant/TenantUsers.vue";
import Weather from "../views/tenant/Weather.vue";
import { canReadOnlyTenantAccessRoute } from "../config/tenantAccess";
import { useAuthStore } from "../stores/authStore";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    redirect: "/dashboard"
  },
  {
    path: "/login",
    name: "tenant-login",
    component: TenantLogin,
    meta: {
      title: "Tenant Login"
    }
  },
  {
    path: "/",
    component: AppLayout,
    meta: {
      requiredRole: "tenant",
      requiresAuth: true
    },
    children: [
      {
        path: "dashboard",
        name: "tenant-dashboard",
        component: Dashboard,
        meta: {
          title: "Dashboard",
          subtitle: "Realtime smart farming overview"
        }
      },
      {
        path: "chart",
        name: "tenant-chart",
        component: Chart,
        meta: {
          title: "Grafik",
          subtitle: "Dynamic charts from MQTT metric keys"
        }
      },
      {
        path: "report",
        name: "tenant-report",
        component: Report,
        meta: {
          title: "Report",
          subtitle: "Exportable telemetry and field logs"
        }
      },
      {
        path: "weather",
        name: "tenant-weather",
        component: Weather,
        meta: {
          title: "Weather Station",
          subtitle: "Prakiraan cuaca, laporan bulanan, konfigurasi"
        }
      },
      {
        path: "mqtt",
        name: "tenant-mqtt",
        component: MQTT,
        meta: {
          title: "MQTT",
          subtitle: "Tambah topic dan daftar koneksi sensor"
        }
      },
      {
        path: "devices",
        name: "tenant-devices",
        component: Devices,
        meta: {
          title: "Perangkat",
          subtitle: "Tambah dan kelola daftar perangkat"
        }
      },
      {
        path: "master-data",
        name: "tenant-master-data",
        component: MasterData,
        meta: {
          title: "Master Data",
          subtitle: "Crop type, zona area, dan threshold tanaman"
        }
      },
      {
        path: "tenant-users",
        name: "tenant-users",
        component: TenantUsers,
        meta: {
          title: "User Tenant",
          subtitle: "Create user read-only untuk akses dashboard dan report"
        }
      },
      {
        path: "settings",
        name: "tenant-settings",
        component: Settings,
        meta: {
          title: "Pengaturan",
          subtitle: "Profil, tampilan, notifikasi, keamanan"
        }
      }
    ]
  },
  {
    path: "/superadmin/login",
    name: "superadmin-login",
    component: SuperAdminLogin,
    meta: {
      title: "Super Admin Login"
    }
  },
  {
    path: "/superadmin",
    component: SuperAdminLayout,
    redirect: "/superadmin/dashboard",
    meta: {
      requiredRole: "super_admin",
      requiresAuth: true
    },
    children: [
      {
        path: "dashboard",
        name: "superadmin-dashboard",
        component: SuperAdminDashboard,
        meta: {
          title: "System Overview",
          subtitle: "Total tenants, active licenses, system health"
        }
      },
      {
        path: "licenses",
        name: "superadmin-licenses",
        component: SuperAdminLicenses,
        meta: {
          title: "License Management",
          subtitle: "Create, revoke, and set SaaS quotas"
        }
      }
    ]
  }
];

export const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to) => {
  const authStore = useAuthStore();
  authStore.restoreFromStorage();

  const isTenantLogin = to.name === "tenant-login";
  const isSuperAdminLogin = to.name === "superadmin-login";

  if ((isTenantLogin || isSuperAdminLogin) && authStore.isAuthenticated) {
    return authStore.isSuperAdmin ? "/superadmin/dashboard" : "/dashboard";
  }

  const requiresAuth = to.matched.some((route) => route.meta.requiresAuth);
  if (!requiresAuth) {
    return true;
  }

  const requiredRole = to.matched.find((route) => typeof route.meta.requiredRole === "string")?.meta.requiredRole;
  if (!authStore.isAuthenticated) {
    return requiredRole === "super_admin" ? "/superadmin/login" : "/login";
  }

  if (requiredRole === "super_admin" && !authStore.isSuperAdmin) {
    return "/login";
  }

  if (requiredRole === "tenant" && !authStore.isTenant) {
    return "/superadmin/dashboard";
  }

  if (requiredRole === "tenant" && authStore.isReadOnlyTenant && !canReadOnlyTenantAccessRoute(to.name)) {
    return "/dashboard";
  }

  return true;
});
