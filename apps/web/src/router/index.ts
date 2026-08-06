import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import AppLayout from "../components/layout/AppLayout.vue";
import SuperAdminLayout from "../components/layout/SuperAdminLayout.vue";
import SuperAdminDashboard from "../views/superadmin/Dashboard.vue";
import SuperAdminLicenses from "../views/superadmin/Licenses.vue";
import SuperAdminLogin from "../views/superadmin/Login.vue";
import Chart from "../views/tenant/Chart.vue";
import Dashboard from "../views/tenant/Dashboard.vue";
import Devices from "../views/tenant/Devices.vue";
import TenantLogin from "../views/tenant/Login.vue";
import MasterData from "../views/tenant/MasterData.vue";
import MQTT from "../views/tenant/MQTT.vue";
import TenantPlaceholder from "../views/tenant/PlaceholderView.vue";
import Report from "../views/tenant/Report.vue";
import Weather from "../views/tenant/Weather.vue";

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
        path: "settings",
        name: "tenant-settings",
        component: TenantPlaceholder,
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
