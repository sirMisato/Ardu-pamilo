import { ref } from "vue";
import { defineStore } from "pinia";
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
  plotId?: string | null;
  start?: string;
  telemetryLimit?: number;
  weatherContext?: {
    current?: Record<string, unknown>;
    daily?: Array<Record<string, unknown>>;
    fetchedAt?: string;
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
  generatedAt: string;
  model: string;
  recommendation: AiRecommendation;
}

export const useAiRecommendationStore = defineStore("aiRecommendation", () => {
  const errorMessage = ref<string | null>(null);
  const isGenerating = ref(false);
  const lastResponse = ref<AiRecommendationResponse | null>(null);

  async function generateRecommendation(input: AiRecommendationRequest): Promise<AiRecommendationResponse | null> {
    isGenerating.value = true;
    errorMessage.value = null;

    try {
      const response = await apiPost<AiRecommendationResponse>("/api/v1/ai/recommendations", input);
      lastResponse.value = response;
      return response;
    } catch (error) {
      errorMessage.value = normalizeApiError(error);
      return null;
    } finally {
      isGenerating.value = false;
    }
  }

  function clearRecommendation(): void {
    errorMessage.value = null;
    lastResponse.value = null;
  }

  return {
    clearRecommendation,
    errorMessage,
    generateRecommendation,
    isGenerating,
    lastResponse
  };
});

function normalizeApiError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 401) {
      return "Sesi login berakhir. Silakan login ulang.";
    }

    if (error.status === 503) {
      return "AI recommendation belum dikonfigurasi di backend.";
    }

    if (error.status === 502) {
      return error.message || "Provider AI belum merespons.";
    }

    return error.message;
  }

  if (error instanceof TypeError) {
    return "API backend belum dapat dihubungi.";
  }

  return "Gagal membuat rekomendasi AI.";
}
