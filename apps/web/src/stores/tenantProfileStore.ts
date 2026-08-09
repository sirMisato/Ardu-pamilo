import { computed, ref } from "vue";
import { defineStore } from "pinia";

export interface TenantFieldProfile {
  id: string;
  name: string;
  areaLabel: string;
  cropLabel: string;
  bmkgAdm4Code: string;
  regionLabel: string;
}

export const useTenantProfileStore = defineStore("tenantProfile", () => {
  const activeTenant = ref({
    id: "demo-tenant",
    name: "Sedayafarm Demo Tenant",
    licenseTier: "Smart Farming Pro"
  });
  const fields = ref<TenantFieldProfile[]>([
    {
      id: "field-kemayoran-a",
      name: "Kebun Utara",
      areaLabel: "14.8 ha",
      cropLabel: "Padi IR64 / Plot A",
      bmkgAdm4Code: "31.71.03.1001",
      regionLabel: "Kemayoran, Jakarta Pusat"
    },
    {
      id: "field-demo-b",
      name: "Plot Pembibitan",
      areaLabel: "3.2 ha",
      cropLabel: "Cabai Rawit / Nursery",
      bmkgAdm4Code: "32.73.06.1001",
      regionLabel: "Bandung demo region"
    }
  ]);
  const activeFieldId = ref("field-kemayoran-a");

  const activeField = computed(() => fields.value.find((field) => field.id === activeFieldId.value) ?? fields.value[0] ?? null);
  const activeBmkgAdm4Code = computed(() => activeField.value?.bmkgAdm4Code ?? "");
  const activeFieldLabel = computed(() => {
    if (!activeField.value) {
      return "Field belum dipilih";
    }

    return `${activeField.value.name} / ${activeField.value.areaLabel}`;
  });

  function setActiveField(fieldId: string): void {
    if (fields.value.some((field) => field.id === fieldId)) {
      activeFieldId.value = fieldId;
    }
  }

  return {
    activeBmkgAdm4Code,
    activeField,
    activeFieldId,
    activeFieldLabel,
    activeTenant,
    fields,
    setActiveField
  };
});
