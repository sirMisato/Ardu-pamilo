import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { getCurrentLanguage, t, type LocaleCode } from "../i18n";
import { ApiClientError, apiPost } from "../services/apiClient";

export type RecommendationLevel = "high" | "low" | "medium";

export interface RecommendationItem {
  actions: string[];
  confidence: RecommendationLevel;
  priority: RecommendationLevel;
  rationale: string;
  timing: string;
  title: string;
}

export interface RiskAlert {
  action: string;
  rationale: string;
  severity: RecommendationLevel;
  title: string;
}

export interface AiRecommendation {
  confidence: RecommendationLevel;
  dataGaps: string[];
  executiveSummary: string;
  fertilizer: RecommendationItem[];
  irrigation: RecommendationItem[];
  pestManagement: RecommendationItem[];
  riskAlerts: RiskAlert[];
  yieldOptimization: RecommendationItem[];
}

export interface AiRecommendationRequest {
  end?: string;
  farmerNotes?: string;
  locale?: LocaleCode;
  plotId?: string | null;
  start?: string;
  telemetryLimit?: number;
  weatherContext?: {
    current?: Record<string, unknown>;
    daily?: Array<Record<string, unknown>>;
    fetchedAt?: string;
    hourly?: Array<Record<string, unknown>>;
    location?: Record<string, unknown>;
    source?: string;
    summary?: string;
  };
}

export interface AiRecommendationResponse {
  analysisWindow: {
    end: string;
    start: string;
    telemetryRows: number;
  };
  context: {
    deviceCount: number;
    metricCount: number;
    plotCount: number;
    selectedPlotId: string | null;
  };
  contentLocales?: LocaleCode[];
  contentVersion?: string;
  generatedAt: string;
  generatedLocale?: LocaleCode;
  model: string;
  provider: "custom" | "openai" | "sumopod" | "tencent";
  recommendation: AiRecommendation;
  recommendations?: Partial<Record<LocaleCode, AiRecommendation>>;
}

export const useAiRecommendationStore = defineStore("aiRecommendation", () => {
  const errorState = ref<{ key: string; params?: Record<string, string | number> } | { message: string } | null>(null);
  const isGenerating = ref(false);
  const lastResponse = ref<AiRecommendationResponse | null>(null);
  const errorMessage = computed(() => {
    if (!errorState.value) {
      return null;
    }

    return "key" in errorState.value ? t(errorState.value.key, errorState.value.params) : errorState.value.message;
  });
  const localizedResponse = computed(() => {
    if (!lastResponse.value) {
      return null;
    }

    return selectLocalizedResponse(lastResponse.value, getCurrentLanguage());
  });

  async function generateRecommendation(input: AiRecommendationRequest): Promise<AiRecommendationResponse | null> {
    isGenerating.value = true;
    errorState.value = null;

    try {
      const response = await apiPost<AiRecommendationResponse>("/api/v1/ai/recommendations", {
        ...input,
        locale: input.locale ?? getCurrentLanguage()
      });
      lastResponse.value = response;
      return response;
    } catch (error) {
      errorState.value = normalizeApiError(error);
      return null;
    } finally {
      isGenerating.value = false;
    }
  }

  function clearRecommendation(): void {
    errorState.value = null;
    lastResponse.value = null;
  }

  return {
    clearRecommendation,
    errorMessage,
    generateRecommendation,
    isGenerating,
    lastResponse,
    localizedResponse
  };
});

function selectLocalizedResponse(response: AiRecommendationResponse, locale: LocaleCode): AiRecommendationResponse {
  const localizedRecommendation = response.recommendations?.[locale];

  if (localizedRecommendation) {
    return {
      ...response,
      recommendation: localizedRecommendation
    };
  }

  return response;
}

function normalizeApiError(error: unknown): { key: string; params?: Record<string, string | number> } | { message: string } {
  if (error instanceof ApiClientError) {
    if (error.status === 401) {
      return { key: "ai.errors.sessionExpired" };
    }

    if (error.status === 503) {
      return { key: "ai.errors.notConfigured" };
    }

    if (error.status === 502) {
      return error.message ? { message: error.message } : { key: "ai.errors.providerNoResponse" };
    }

    return { message: error.message };
  }

  if (error instanceof TypeError) {
    return { key: "ai.errors.apiUnavailable" };
  }

  return { key: "ai.errors.generateFailed" };
}
