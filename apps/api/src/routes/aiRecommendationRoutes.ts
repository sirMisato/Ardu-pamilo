import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { env } from "../config/env.js";
import { db } from "../db/client.js";
import type { JsonValue } from "../db/schema.js";
import { requireTenantContext, verifyTenant } from "../middleware/verifyTenant.js";

const recommendationRequestSchema = z.object({
  end: z.string().datetime().optional(),
  farmerNotes: z.string().trim().max(3000).optional(),
  plotId: z.string().trim().max(36).optional().nullable(),
  start: z.string().datetime().optional(),
  telemetryLimit: z.coerce.number().int().min(10).max(500).default(180),
  weatherContext: z.object({
    current: z.record(z.string(), z.unknown()).optional(),
    daily: z.array(z.record(z.string(), z.unknown())).max(7).optional(),
    fetchedAt: z.string().optional(),
    location: z.record(z.string(), z.unknown()).optional(),
    source: z.string().trim().max(255).optional(),
    summary: z.string().trim().max(3000).optional()
  }).optional()
});

type RecommendationRequest = z.infer<typeof recommendationRequestSchema>;

type RecommendationPriority = "high" | "low" | "medium";
type RiskSeverity = "high" | "low" | "medium";
type RecommendationConfidence = "high" | "low" | "medium";

interface RecommendationItem {
  actions: string[];
  confidence: RecommendationConfidence;
  rationale: string;
  timing: string;
  title: string;
  priority: RecommendationPriority;
}

interface RiskAlert {
  action: string;
  rationale: string;
  severity: RiskSeverity;
  title: string;
}

interface AiRecommendation {
  confidence: RecommendationConfidence;
  dataGaps: string[];
  executiveSummary: string;
  fertilizer: RecommendationItem[];
  irrigation: RecommendationItem[];
  pestManagement: RecommendationItem[];
  riskAlerts: RiskAlert[];
  yieldOptimization: RecommendationItem[];
}

interface PlotContextRow {
  area_hectares: number | string | null;
  bmkg_adm4_code: string | null;
  crop_description: string | null;
  crop_id: string | null;
  crop_latin_name: string | null;
  crop_name: string | null;
  crop_planting_date: Date | string | null;
  crop_planting_period_days: number | string | null;
  crop_status: string | null;
  crop_threshold_source: string | null;
  id: string;
  moisture_max: number | string | null;
  moisture_min: number | string | null;
  name: string;
  nitrogen_max: number | string | null;
  nitrogen_min: number | string | null;
  ph_max: number | string | null;
  ph_min: number | string | null;
  phosphorus_max: number | string | null;
  phosphorus_min: number | string | null;
  potassium_max: number | string | null;
  potassium_min: number | string | null;
}

interface DeviceContextRow {
  device_uid: string;
  display_name: string;
  id: string;
  last_seen_at: Date | string | null;
  metadata_json: JsonValue | string | null;
  plot_id: string;
  plot_name: string | null;
  status: string;
}

interface TelemetryContextRow {
  device_id: string;
  device_uid: string;
  metric_keys_json: JsonValue | string;
  payload_json: JsonValue | string;
  plot_id: string;
  plot_name: string | null;
  received_at: Date | string;
}

interface MetricSummary {
  average: number | null;
  key: string;
  latestAt: string;
  latestValue: number | string | boolean | null;
  max: number | null;
  min: number | null;
  samples: number;
  unit: string;
}

interface FieldSnapshot {
  areaHectares: number | null;
  bmkgAdm4Code: string | null;
  crop: {
    description: string | null;
    hst: number | null;
    id: string | null;
    latinName: string | null;
    name: string | null;
    plantingDate: string | null;
    plantingPeriodDays: number | null;
    status: string | null;
    thresholdSource: string | null;
    thresholds: Record<string, { max: number | null; min: number | null; unit: string }>;
  };
  deviceCount: number;
  id: string;
  latestTelemetryAt: string | null;
  name: string;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

const reservedPayloadKeys = new Set([
  "device_id",
  "deviceId",
  "lat",
  "latitude",
  "lng",
  "location",
  "lon",
  "longitude",
  "meta",
  "metadata",
  "metrics",
  "node_id",
  "nodeId",
  "tenant_id",
  "tenantId",
  "time",
  "timestamp",
  "ts",
  "units"
]);

export const aiRecommendationRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", verifyTenant);

  app.post<{ Body: RecommendationRequest }>("/ai/recommendations", async (request, reply) => {
    if (!env.aiRecommendation.apiKey) {
      return reply.code(503).send({
        error: "AI recommendation is not configured",
        message: "Set AI_RECOMMENDATION_API_KEY pada backend untuk mengaktifkan rekomendasi AI."
      });
    }

    const parsed = recommendationRequestSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid AI recommendation payload",
        issues: parsed.error.flatten().fieldErrors
      });
    }

    const tenant = requireTenantContext(request);
    const requestBody = parsed.data;
    const { endDate, startDate } = normalizeAnalysisWindow(requestBody);
    const [plots, devices, telemetryRows] = await Promise.all([
      selectPlotsForAiContext(tenant.tenantId, requestBody.plotId),
      selectDevicesForAiContext(tenant.tenantId, requestBody.plotId),
      selectTelemetryForAiContext(tenant.tenantId, requestBody.plotId, startDate, endDate, requestBody.telemetryLimit)
    ]);

    if (requestBody.plotId && plots.length === 0) {
      return reply.code(404).send({
        error: "Plot not found",
        message: "Zona/area tidak tersedia untuk tenant ini."
      });
    }

    const context = buildAiContext({
      devices,
      endDate,
      plots,
      requestBody,
      startDate,
      telemetryRows,
      tenantId: tenant.tenantId
    });
    let recommendation: AiRecommendation;
    try {
      recommendation = await requestAiRecommendation(context);
    } catch (error) {
      request.log.error({ error }, "AI recommendation request failed");
      return reply.code(502).send({
        error: "AI recommendation failed",
        message: error instanceof Error && error.name === "AbortError"
          ? "Provider AI melewati batas waktu respons."
          : "Provider AI belum dapat menghasilkan rekomendasi. Coba lagi setelah beberapa saat."
      });
    }

    return {
      analysisWindow: {
        end: endDate.toISOString(),
        start: startDate.toISOString(),
        telemetryRows: telemetryRows.length
      },
      context: {
        deviceCount: devices.length,
        metricCount: context.metricSummary.length,
        plotCount: plots.length,
        selectedPlotId: requestBody.plotId ?? null
      },
      generatedAt: new Date().toISOString(),
      model: env.aiRecommendation.model,
      recommendation
    };
  });
};

async function selectPlotsForAiContext(tenantId: string, plotId: string | null | undefined): Promise<PlotContextRow[]> {
  let query = db
    .selectFrom("plots")
    .leftJoin("master_crops", (join) => join
      .onRef("master_crops.id", "=", "plots.crop_id")
      .on("master_crops.tenant_id", "=", tenantId))
    .select([
      "plots.area_hectares",
      "plots.bmkg_adm4_code",
      "plots.crop_id",
      "plots.id",
      "plots.name",
      "master_crops.description as crop_description",
      "master_crops.latin_name as crop_latin_name",
      "master_crops.moisture_max",
      "master_crops.moisture_min",
      "master_crops.name as crop_name",
      "master_crops.nitrogen_max",
      "master_crops.nitrogen_min",
      "master_crops.ph_max",
      "master_crops.ph_min",
      "master_crops.phosphorus_max",
      "master_crops.phosphorus_min",
      "master_crops.planting_date as crop_planting_date",
      "master_crops.planting_period_days as crop_planting_period_days",
      "master_crops.potassium_max",
      "master_crops.potassium_min",
      "master_crops.status as crop_status",
      "master_crops.threshold_source as crop_threshold_source"
    ])
    .where("plots.tenant_id", "=", tenantId)
    .orderBy("plots.created_at", "desc");

  if (plotId) {
    query = query.where("plots.id", "=", plotId);
  }

  return query.execute();
}

async function selectDevicesForAiContext(tenantId: string, plotId: string | null | undefined): Promise<DeviceContextRow[]> {
  let query = db
    .selectFrom("devices")
    .leftJoin("plots", "plots.id", "devices.plot_id")
    .select([
      "devices.device_uid",
      "devices.display_name",
      "devices.id",
      "devices.last_seen_at",
      "devices.metadata_json",
      "devices.plot_id",
      "devices.status",
      "plots.name as plot_name"
    ])
    .where("devices.tenant_id", "=", tenantId)
    .orderBy("devices.created_at", "desc");

  if (plotId) {
    query = query.where("devices.plot_id", "=", plotId);
  }

  return query.execute();
}

async function selectTelemetryForAiContext(
  tenantId: string,
  plotId: string | null | undefined,
  startDate: Date,
  endDate: Date,
  limit: number
): Promise<TelemetryContextRow[]> {
  let query = db
    .selectFrom("telemetry_data")
    .innerJoin("devices", "devices.id", "telemetry_data.device_id")
    .leftJoin("plots", "plots.id", "devices.plot_id")
    .select([
      "devices.device_uid",
      "devices.id as device_id",
      "devices.plot_id",
      "plots.name as plot_name",
      "telemetry_data.metric_keys_json",
      "telemetry_data.payload_json",
      "telemetry_data.received_at"
    ])
    .where("telemetry_data.tenant_id", "=", tenantId)
    .where("devices.tenant_id", "=", tenantId)
    .where("telemetry_data.received_at", ">=", startDate)
    .where("telemetry_data.received_at", "<=", endDate)
    .orderBy("telemetry_data.received_at", "desc")
    .limit(limit);

  if (plotId) {
    query = query.where("devices.plot_id", "=", plotId);
  }

  return query.execute();
}

function normalizeAnalysisWindow(requestBody: RecommendationRequest): { endDate: Date; startDate: Date } {
  const now = new Date();
  const endDate = requestBody.end ? new Date(requestBody.end) : now;
  const startDate = requestBody.start ? new Date(requestBody.start) : new Date(endDate.getTime() - 14 * 86_400_000);

  if (startDate.getTime() <= endDate.getTime()) {
    return {
      endDate,
      startDate
    };
  }

  return {
    endDate: startDate,
    startDate: endDate
  };
}

function buildAiContext(input: {
  devices: DeviceContextRow[];
  endDate: Date;
  plots: PlotContextRow[];
  requestBody: RecommendationRequest;
  startDate: Date;
  telemetryRows: TelemetryContextRow[];
  tenantId: string;
}) {
  const metricSummary = summarizeTelemetryMetrics(input.telemetryRows);
  const latestSamples = input.telemetryRows.slice(0, 12).map((row) => ({
    deviceUid: row.device_uid,
    metrics: summarizePayload(row.payload_json, row.metric_keys_json),
    plotName: row.plot_name,
    receivedAt: serializeDate(row.received_at)
  }));
  const latestTelemetryByPlot = new Map<string, string>();

  for (const row of input.telemetryRows) {
    if (!latestTelemetryByPlot.has(row.plot_id)) {
      latestTelemetryByPlot.set(row.plot_id, serializeDate(row.received_at));
    }
  }

  return {
    analysisWindow: {
      end: input.endDate.toISOString(),
      start: input.startDate.toISOString()
    },
    farmerNotes: input.requestBody.farmerNotes ?? "",
    fields: input.plots.map((plot) => toFieldSnapshot(plot, input.devices, latestTelemetryByPlot.get(plot.id) ?? null)),
    latestSamples,
    metricSummary,
    telemetryCoverage: {
      deviceCount: input.devices.length,
      rowCount: input.telemetryRows.length
    },
    tenantId: input.tenantId,
    weatherContext: input.requestBody.weatherContext ?? null
  };
}

function toFieldSnapshot(
  plot: PlotContextRow,
  devices: DeviceContextRow[],
  latestTelemetryAt: string | null
): FieldSnapshot {
  const plantingDate = plot.crop_planting_date ? serializeDateOnly(plot.crop_planting_date) : null;

  return {
    areaHectares: normalizeNumber(plot.area_hectares),
    bmkgAdm4Code: plot.bmkg_adm4_code,
    crop: {
      description: plot.crop_description,
      hst: calculateHst(plantingDate),
      id: plot.crop_id,
      latinName: plot.crop_latin_name,
      name: plot.crop_name,
      plantingDate,
      plantingPeriodDays: normalizeNumber(plot.crop_planting_period_days),
      status: plot.crop_status,
      thresholdSource: plot.crop_threshold_source,
      thresholds: {
        moisture: {
          max: normalizeNumber(plot.moisture_max),
          min: normalizeNumber(plot.moisture_min),
          unit: "%"
        },
        nitrogen: {
          max: normalizeNumber(plot.nitrogen_max),
          min: normalizeNumber(plot.nitrogen_min),
          unit: "mg/kg"
        },
        ph: {
          max: normalizeNumber(plot.ph_max),
          min: normalizeNumber(plot.ph_min),
          unit: "range"
        },
        phosphorus: {
          max: normalizeNumber(plot.phosphorus_max),
          min: normalizeNumber(plot.phosphorus_min),
          unit: "mg/kg"
        },
        potassium: {
          max: normalizeNumber(plot.potassium_max),
          min: normalizeNumber(plot.potassium_min),
          unit: "mg/kg"
        }
      }
    },
    deviceCount: devices.filter((device) => device.plot_id === plot.id).length,
    id: plot.id,
    latestTelemetryAt,
    name: plot.name
  };
}

function summarizeTelemetryMetrics(rows: TelemetryContextRow[]): MetricSummary[] {
  const aggregates = new Map<string, {
    latestAt: string;
    latestValue: number | string | boolean | null;
    numericSamples: number[];
    samples: number;
    unit: string;
  }>();

  for (const row of rows) {
    const metrics = summarizePayload(row.payload_json, row.metric_keys_json);
    const receivedAt = serializeDate(row.received_at);

    for (const metric of metrics) {
      const existing = aggregates.get(metric.key);
      const next = existing ?? {
        latestAt: receivedAt,
        latestValue: metric.value,
        numericSamples: [],
        samples: 0,
        unit: metric.unit
      };
      const numericValue = coerceNumber(metric.value);

      next.samples += 1;
      if (numericValue !== null) {
        next.numericSamples.push(numericValue);
      }

      if (!existing || receivedAt.localeCompare(existing.latestAt) > 0) {
        next.latestAt = receivedAt;
        next.latestValue = metric.value;
        next.unit = metric.unit;
      }

      aggregates.set(metric.key, next);
    }
  }

  return Array.from(aggregates.entries())
    .map(([key, aggregate]) => {
      const numericSamples = aggregate.numericSamples;
      const average = numericSamples.length > 0
        ? roundMetric(numericSamples.reduce((total, value) => total + value, 0) / numericSamples.length)
        : null;

      return {
        average,
        key,
        latestAt: aggregate.latestAt,
        latestValue: aggregate.latestValue,
        max: numericSamples.length > 0 ? roundMetric(Math.max(...numericSamples)) : null,
        min: numericSamples.length > 0 ? roundMetric(Math.min(...numericSamples)) : null,
        samples: aggregate.samples,
        unit: aggregate.unit
      };
    })
    .sort((left, right) => right.samples - left.samples)
    .slice(0, 24);
}

function summarizePayload(payloadValue: JsonValue | string, metricKeysValue: JsonValue | string): Array<{
  key: string;
  unit: string;
  value: number | string | boolean | null;
}> {
  const payload = parseJsonObject(payloadValue);
  const metricsRoot = isRecord(payload.metrics) ? payload.metrics : payload;
  const units = isRecord(payload.units) ? payload.units : {};
  const candidateKeys = parseStringArray(metricKeysValue);
  const keys = candidateKeys.length > 0
    ? candidateKeys
    : Object.keys(metricsRoot).filter((key) => !reservedPayloadKeys.has(key));

  return keys
    .map((key) => {
      const rawValue = readNestedJsonValue(metricsRoot, key);
      const value = normalizeMetricValue(unwrapMetricValue(rawValue));

      if (value === undefined) {
        return null;
      }

      return {
        key: normalizeMetricKey(key),
        unit: readMetricUnit(rawValue, units[key] as JsonValue | undefined),
        value
      };
    })
    .filter((item): item is { key: string; unit: string; value: number | string | boolean | null } => item !== null);
}

async function requestAiRecommendation(context: ReturnType<typeof buildAiContext>): Promise<AiRecommendation> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35_000);

  try {
    const response = await fetch(`${env.aiRecommendation.baseUrl}/v1/chat/completions`, {
      body: JSON.stringify({
        max_tokens: env.aiRecommendation.maxTokens,
        messages: [
          {
            content: [
              "Anda adalah agronom AI untuk PAMILO Smart Farming.",
              "Analisis data tanah, cuaca, histori lahan, crop, perangkat, dan telemetry yang diberikan.",
              "Jawab dalam Bahasa Indonesia, ringkas, praktis, dan berbasis data.",
              "Jangan mengarang angka dosis spesifik jika data tidak cukup; beri rentang tindakan, prioritas, waktu, dan data yang perlu dilengkapi.",
              "Untuk OPT, berikan prinsip pengamatan dan pengendalian terpadu; penggunaan pestisida harus mengikuti label produk dan rekomendasi petugas/POPT setempat.",
              "Kembalikan JSON valid saja sesuai schema tanpa markdown."
            ].join(" "),
            role: "system"
          },
          {
            content: JSON.stringify({
              context,
              outputSchema: {
                confidence: "low|medium|high",
                dataGaps: ["string"],
                executiveSummary: "string",
                fertilizer: [{
                  actions: ["string"],
                  confidence: "low|medium|high",
                  priority: "low|medium|high",
                  rationale: "string",
                  timing: "string",
                  title: "string"
                }],
                irrigation: [{
                  actions: ["string"],
                  confidence: "low|medium|high",
                  priority: "low|medium|high",
                  rationale: "string",
                  timing: "string",
                  title: "string"
                }],
                pestManagement: [{
                  actions: ["string"],
                  confidence: "low|medium|high",
                  priority: "low|medium|high",
                  rationale: "string",
                  timing: "string",
                  title: "string"
                }],
                riskAlerts: [{
                  action: "string",
                  rationale: "string",
                  severity: "low|medium|high",
                  title: "string"
                }],
                yieldOptimization: [{
                  actions: ["string"],
                  confidence: "low|medium|high",
                  priority: "low|medium|high",
                  rationale: "string",
                  timing: "string",
                  title: "string"
                }]
              }
            }),
            role: "user"
          }
        ],
        model: env.aiRecommendation.model,
        temperature: env.aiRecommendation.temperature
      }),
      headers: {
        Authorization: `Bearer ${env.aiRecommendation.apiKey}`,
        "Content-Type": "application/json"
      },
      method: "POST",
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`AI provider returned HTTP ${response.status}: ${await readSafeResponseText(response)}`);
    }

    const payload = await response.json() as ChatCompletionResponse;
    const content = payload.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("AI provider did not return message content.");
    }

    return normalizeRecommendation(parseRecommendationJson(content));
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseRecommendationJson(content: string): unknown {
  try {
    return JSON.parse(content) as unknown;
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("AI recommendation response was not valid JSON.");
    }

    return JSON.parse(match[0]) as unknown;
  }
}

function normalizeRecommendation(value: unknown): AiRecommendation {
  if (!isRecord(value)) {
    throw new Error("AI recommendation payload must be an object.");
  }

  return {
    confidence: normalizeConfidence(value.confidence),
    dataGaps: normalizeStringArray(value.dataGaps),
    executiveSummary: readString(value.executiveSummary, "Rekomendasi berhasil dibuat, namun ringkasan tidak tersedia."),
    fertilizer: normalizeRecommendationItems(value.fertilizer),
    irrigation: normalizeRecommendationItems(value.irrigation),
    pestManagement: normalizeRecommendationItems(value.pestManagement),
    riskAlerts: normalizeRiskAlerts(value.riskAlerts),
    yieldOptimization: normalizeRecommendationItems(value.yieldOptimization)
  };
}

function normalizeRecommendationItems(value: unknown): RecommendationItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((item) => ({
      actions: normalizeStringArray(item.actions),
      confidence: normalizeConfidence(item.confidence),
      priority: normalizePriority(item.priority),
      rationale: readString(item.rationale, "-"),
      timing: readString(item.timing, "Segera saat kondisi lapang memungkinkan."),
      title: readString(item.title, "Rekomendasi")
    }))
    .slice(0, 8);
}

function normalizeRiskAlerts(value: unknown): RiskAlert[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((item) => ({
      action: readString(item.action, "-"),
      rationale: readString(item.rationale, "-"),
      severity: normalizeSeverity(item.severity),
      title: readString(item.title, "Peringatan risiko")
    }))
    .slice(0, 8);
}

function normalizeConfidence(value: unknown): RecommendationConfidence {
  return value === "high" || value === "medium" || value === "low" ? value : "low";
}

function normalizePriority(value: unknown): RecommendationPriority {
  return value === "high" || value === "medium" || value === "low" ? value : "medium";
}

function normalizeSeverity(value: unknown): RiskSeverity {
  return value === "high" || value === "medium" || value === "low" ? value : "medium";
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 10)
    : [];
}

function parseJsonObject(value: JsonValue | string | null): Record<string, JsonValue> {
  if (!value) {
    return {};
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return isRecord(parsed) ? parsed as Record<string, JsonValue> : {};
    } catch {
      return {};
    }
  }

  return isRecord(value) ? value : {};
}

function parseStringArray(value: JsonValue | string): string[] {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
    } catch {
      return [];
    }
  }

  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function readNestedJsonValue(payload: Record<string, unknown>, keyPath: string): JsonValue | undefined {
  let current: unknown = payload;

  for (const key of keyPath.split(".")) {
    if (!isRecord(current)) {
      return undefined;
    }

    current = current[key];
  }

  return isJsonValue(current) ? current : undefined;
}

function unwrapMetricValue(value: JsonValue | undefined): JsonValue | undefined {
  if (isRecord(value) && "value" in value) {
    return value.value as JsonValue;
  }

  return value;
}

function normalizeMetricValue(value: JsonValue | undefined): number | string | boolean | null | undefined {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return value;
  }

  return undefined;
}

function readMetricUnit(rawValue: JsonValue | undefined, unitValue: JsonValue | undefined): string {
  if (isRecord(rawValue) && typeof rawValue.unit === "string") {
    return rawValue.unit;
  }

  return typeof unitValue === "string" ? unitValue : "";
}

function normalizeMetricKey(value: string): string {
  const normalized = value.replace(/^metrics\./, "").toLowerCase();

  if (normalized === "n") return "nitrogen";
  if (normalized === "p") return "phosphorus";
  if (normalized === "k") return "potassium";
  if (normalized === "soiltemperature" || normalized === "soil_temperature") return "soil_temperature";
  if (normalized === "ec" || normalized === "electrical_conductivity") return "conductivity";
  if (normalized === "soil_moisture") return "moisture";

  return normalized;
}

function coerceNumber(value: number | string | boolean | null): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeNumber(value: number | string | null): number | null {
  if (value === null) {
    return null;
  }

  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function roundMetric(value: number): number {
  return Math.round(value * 100) / 100;
}

function calculateHst(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }

  const plantingDate = new Date(year, month - 1, day);
  const today = new Date();
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffMs = todayOnly.getTime() - plantingDate.getTime();

  return Number.isFinite(diffMs) ? Math.max(0, Math.floor(diffMs / 86_400_000)) : null;
}

function serializeDate(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function serializeDateOnly(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString().slice(0, 10);
}

async function readSafeResponseText(response: Response): Promise<string> {
  const text = await response.text();
  return text.slice(0, 400);
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || ["boolean", "number", "string"].includes(typeof value)) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).every(isJsonValue);
  }

  return false;
}
