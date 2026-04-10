import { w as wrapLanguageModel, c as createOpenAI, a as createGoogleGenerativeAI, g as generateText, e as extractJsonMiddleware, s as streamText, o as output_exports, j as jsonSchema } from "./csv_data_analysis_vendor-ai-sdk.js";
import { P as PROVIDER_GEMINI_CONTEXT_WINDOW, L as PROVIDER_MIN_KEEP_RECENT_TOKENS, M as PROVIDER_KEEP_RECENT_RATIO, N as PROVIDER_MIN_RESERVE_TOKENS, O as PROVIDER_RESERVE_RATIO, Q as PROVIDER_GEMMA_CONTEXT_WINDOW, R as PROVIDER_GPT_CONTEXT_WINDOW, S as getForceFallbackModel, T as raceWithActivityTimeout, b as isRuntimeAbortError, U as getDataOperationSchemaForTypes, V as getDataOperationSchema, W as safeJsonStringify, X as resolveLongSessionContextPolicy, Y as getDataQueryTraceLabel, Z as evaluateAutoAnalysisCards, _ as resolveToolOutputCutoff, $ as CONTEXT_CHAT_SOFT_BUDGET_CAP, a0 as CONTEXT_PLANNER_SOFT_BUDGET_CAP, a1 as CONTEXT_SUMMARY_SOFT_BUDGET_CAP, a2 as CONTEXT_RUNTIME_EVAL_SOFT_BUDGET_CAP, t as throwIfAborted, a3 as CONTEXT_SUMMARY_TRIGGER_LENGTH, a4 as CONTEXT_SUMMARY_REFRESH_DELTA, a5 as __vitePreload, a6 as CONTEXT_COMPACTION_SUMMARY_MAX_PARTS, a7 as CONTEXT_COMPACTION_SUMMARY_OVERHEAD_TOKENS, a8 as CONTEXT_COMPACTION_SAFETY_MARGIN, a9 as buildMergedBoundaryHeaders, aa as normalizeReportCellText, ab as sanitizeAiExtractedReportContext, ac as mergeAiExtractedReportContextWithFallback, ad as createFallbackReportContext, ae as applyDataOperations, af as reconcileAiCleaningStep, ag as isRepeatedAttributeBundleTable, ah as ensureStructuralMetadataOutputColumns, ai as detectReportShape, aj as buildWideReshapeFallbackAction, ak as buildDeterministicCleaningFallbackAction, al as normalizeUnpivotHierarchyDepthMappings, am as verifyCleanedDatasetShape, an as buildReshapeHypotheses, ao as normalizeDataPreparationPlan, ap as isWideReportShape, aq as createAiCleaningProgramFromPlan, ar as createId, as as buildRuntimeStepContract, at as resolveAllowedTools, au as buildToolAvailabilityContext, av as buildBuiltinToolRegistry, aw as ALL_RUNTIME_TOOLS, u as buildAnalysisIntentBrief, E as resolveEffectiveReportContext, ax as formatAnalystCapabilitySelection, ay as formatDatasetSemanticsForPrompt, az as formatAnalysisIntentBrief, aA as formatReportContextForPrompt, aB as formatRuntimeStepContract, aC as emitSilentFailure, J as buildAnalysisRankingHints, r as robustlyParseJsonObject, aD as normalizeToolAvailabilityContext, aE as getWorkspaceRuleViolation, aF as buildSemanticDatasetVersion, q as buildDatasetContext, aG as sanitizeDatasetSemanticSnapshot, aH as inferTabularShapeContext, aI as detectTabularRowRole } from "./csv_data_analysis_app-agent.js";
import { h as formatColumnDisplayHints, s as selectNarrativeAnalysisInputs, c as buildNarrativeAnalysisIrInputList, i as formatNarrativeAnalysisInputs, j as buildDisplayCardContext } from "./csv_data_analysis_app-reporting.js";
const GOOGLE_MODELS = [
  "gemini-3.1-pro-preview",
  "gemini-3.1-flash-lite-preview",
  "gemini-3-pro-preview",
  "gemini-3-flash-preview",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemma-4-31b-it",
  "gemma-4-26b-a4b-it"
];
const OPENAI_MODELS = [
  "gpt-5-nano",
  "gpt-5-mini",
  "gpt-5.2",
  "gpt-5.2-pro",
  "gpt-5.4-mini"
];
const DEFAULT_FALLBACK_MODEL = {
  google: "gemini-2.5-flash",
  openai: "gpt-5-mini"
};
const FALLBACK_MODEL_CHAIN = {
  google: ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-3-flash-preview"],
  openai: ["gpt-5-mini", "gpt-5-nano", "gpt-5.2"]
};
const resolveProviderApiKey = (settings) => settings.provider === "google" ? settings.geminiApiKey : settings.openAIApiKey;
const isProviderConfigured = (settings) => Boolean(resolveProviderApiKey(settings).trim());
const resolveProviderModelId = (settings, modelOverride) => modelOverride || settings.complexModel;
const resolveModelContextProfile = (settings, modelOverride) => {
  const modelId = resolveProviderModelId(settings, modelOverride).trim().toLowerCase();
  if (settings.provider === "google" && modelId.startsWith("gemini")) {
    const contextWindow = PROVIDER_GEMINI_CONTEXT_WINDOW;
    return {
      contextWindow,
      reserveTokens: Math.max(PROVIDER_MIN_RESERVE_TOKENS, Math.floor(contextWindow * PROVIDER_RESERVE_RATIO)),
      keepRecentTokens: Math.max(PROVIDER_MIN_KEEP_RECENT_TOKENS, Math.floor(contextWindow * PROVIDER_KEEP_RECENT_RATIO)),
      strategy: "model_aware"
    };
  }
  if (settings.provider === "google" && modelId.startsWith("gemma")) {
    const contextWindow = PROVIDER_GEMMA_CONTEXT_WINDOW;
    return {
      contextWindow,
      reserveTokens: Math.max(PROVIDER_MIN_RESERVE_TOKENS, Math.floor(contextWindow * PROVIDER_RESERVE_RATIO)),
      keepRecentTokens: Math.max(PROVIDER_MIN_KEEP_RECENT_TOKENS, Math.floor(contextWindow * PROVIDER_KEEP_RECENT_RATIO)),
      strategy: "model_aware"
    };
  }
  if (settings.provider === "openai" && modelId.startsWith("gpt-")) {
    const contextWindow = PROVIDER_GPT_CONTEXT_WINDOW;
    return {
      contextWindow,
      reserveTokens: Math.max(PROVIDER_MIN_RESERVE_TOKENS, Math.floor(contextWindow * PROVIDER_RESERVE_RATIO)),
      keepRecentTokens: Math.max(PROVIDER_MIN_KEEP_RECENT_TOKENS, Math.floor(contextWindow * PROVIDER_KEEP_RECENT_RATIO)),
      strategy: "model_aware"
    };
  }
  return {
    contextWindow: null,
    reserveTokens: 0,
    keepRecentTokens: 0,
    strategy: "fallback_static"
  };
};
const jsonFenceMiddleware = extractJsonMiddleware();
const createProviderModel = (settings, modelOverride) => {
  const modelId = resolveProviderModelId(settings, modelOverride);
  const apiKey = resolveProviderApiKey(settings);
  if (settings.provider === "openai") {
    return {
      modelId,
      model: wrapLanguageModel({
        model: createOpenAI({ apiKey })(modelId),
        middleware: jsonFenceMiddleware
      })
    };
  }
  return {
    modelId,
    model: wrapLanguageModel({
      model: createGoogleGenerativeAI({ apiKey })(modelId),
      middleware: jsonFenceMiddleware
    })
  };
};
const resolveFallbackModelId = (settings, primaryModelId) => {
  var _a;
  const primary = primaryModelId || resolveProviderModelId(settings);
  const forced = getForceFallbackModel();
  const fallback = forced || ((_a = settings.fallbackModel) == null ? void 0 : _a.trim()) || DEFAULT_FALLBACK_MODEL[settings.provider] || null;
  if (!fallback) return null;
  if (fallback !== primary) return fallback;
  const chain = FALLBACK_MODEL_CHAIN[settings.provider];
  if (chain) {
    const alternative = chain.find((m) => m !== primary);
    if (alternative) {
      console.warn(
        `[FallbackResolver] Default fallback "${fallback}" equals primary "${primary}". Auto-selected alternative fallback: "${alternative}"`
      );
      return alternative;
    }
  }
  console.warn(
    `[FallbackResolver] No viable fallback available — fallback "${fallback}" equals primary "${primary}" and no alternative found in chain. Transient errors will NOT be retried with a different model.`
  );
  return null;
};
const createFallbackProviderModel = (settings, primaryModelId) => {
  const fallbackId = resolveFallbackModelId(settings, primaryModelId);
  if (!fallbackId) return null;
  return createProviderModel(settings, fallbackId);
};
const HEALTHY_TTL_MS = 5 * 60 * 1e3;
const FAILURE_TTL_MS = 30 * 1e3;
let _cachedHealthResult = null;
function invalidateProviderHealthCache() {
  _cachedHealthResult = null;
}
async function validateProviderHealth(settings) {
  if (!isProviderConfigured(settings)) {
    return { status: "not_configured", checkedAt: (/* @__PURE__ */ new Date()).toISOString() };
  }
  if (_cachedHealthResult) {
    const age = Date.now() - new Date(_cachedHealthResult.checkedAt).getTime();
    const ttl = _cachedHealthResult.status === "healthy" ? HEALTHY_TTL_MS : FAILURE_TTL_MS;
    if (age < ttl) return _cachedHealthResult;
  }
  const testModelId = settings.simpleModel;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  try {
    const { model } = createProviderModel(settings, testModelId);
    const HEALTH_CHECK_TIMEOUT_MS = 8e3;
    const healthPromise = generateText({
      model,
      messages: [{ role: "user", content: "Reply with exactly: OK" }],
      maxRetries: 1
    });
    const timeoutPromise = new Promise(
      (_, reject) => setTimeout(() => reject(new Error("Health check timed out")), HEALTH_CHECK_TIMEOUT_MS)
    );
    await Promise.race([healthPromise, timeoutPromise]);
    _cachedHealthResult = { status: "healthy", checkedAt: now, testedModel: testModelId };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    const lower = detail.toLowerCase();
    const isPermanent = [
      "401",
      "403",
      "invalid_api_key",
      "permission_denied",
      "authentication",
      "unauthorized",
      "forbidden"
    ].some((p) => lower.includes(p));
    const status = isPermanent ? "invalid_key" : "unreachable";
    _cachedHealthResult = { status, checkedAt: now, errorDetail: detail, testedModel: testModelId };
  }
  return _cachedHealthResult;
}
const providerConfig = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  createFallbackProviderModel,
  createProviderModel,
  invalidateProviderHealthCache,
  isProviderConfigured,
  resolveFallbackModelId,
  resolveModelContextProfile,
  resolveProviderApiKey,
  resolveProviderModelId,
  validateProviderHealth
}, Symbol.toStringTag, { value: "Module" }));
const DEFAULT_ACTIVITY_TIMEOUT_MS = 3e4;
const streamGenerateText = async (options) => {
  const { activityTimeoutMs = DEFAULT_ACTIVITY_TIMEOUT_MS, ...streamOptions } = options;
  const stream = streamText(streamOptions);
  const { promise, signalActivity } = raceWithActivityTimeout(
    (async () => {
      for await (const part of stream.fullStream) {
        signalActivity();
      }
      const [text, finishReason] = await Promise.all([
        stream.text,
        stream.finishReason
      ]);
      let output = void 0;
      try {
        output = await stream.output;
      } catch {
      }
      return { text, finishReason, output };
    })(),
    activityTimeoutMs
  );
  return promise;
};
const cloneSchema = (value) => JSON.parse(JSON.stringify(value));
const isRecord = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const inferEnumType = (values) => {
  if (values.length === 0) return null;
  if (values.every((value) => typeof value === "string")) return "string";
  if (values.every((value) => typeof value === "number")) return "number";
  if (values.every((value) => typeof value === "boolean")) return "boolean";
  return null;
};
const mergeObjectAlternatives = (alternatives) => {
  const properties = {};
  alternatives.forEach((alternative) => {
    const rawProperties = isRecord(alternative.properties) ? alternative.properties : {};
    Object.entries(rawProperties).forEach(([key, value]) => {
      properties[key] = sanitizeGoogleSchemaNode(value);
    });
  });
  return {
    type: "object",
    properties
  };
};
const sanitizeGoogleSchemaNode = (node) => {
  if (!isRecord(node)) {
    return { type: "string" };
  }
  const description = typeof node.description === "string" ? node.description : void 0;
  const enumValues = Array.isArray(node.enum) ? node.enum.filter((value) => value !== void 0) : void 0;
  const inferredEnumType = enumValues ? inferEnumType(enumValues) : null;
  const type = typeof node.type === "string" ? node.type : inferredEnumType;
  const hasObjectShape = type === "object" || isRecord(node.properties);
  const combinators = [node.anyOf, node.oneOf, node.allOf].find(Array.isArray);
  if ((combinators == null ? void 0 : combinators.length) && !hasObjectShape) {
    const sanitizedAlternatives = combinators.map((candidate) => sanitizeGoogleSchemaNode(candidate)).filter(isRecord);
    const objectAlternatives = sanitizedAlternatives.filter(
      (candidate) => candidate.type === "object" || isRecord(candidate.properties)
    );
    if (objectAlternatives.length > 0) {
      return mergeObjectAlternatives(objectAlternatives);
    }
    const arrayAlternative = sanitizedAlternatives.find((candidate) => candidate.type === "array");
    if (arrayAlternative) {
      return arrayAlternative;
    }
    const stringAlternative = sanitizedAlternatives.find((candidate) => candidate.type === "string");
    if (stringAlternative) {
      return stringAlternative;
    }
    return sanitizedAlternatives[0] ?? { type: "string" };
  }
  if (hasObjectShape) {
    const rawProperties = isRecord(node.properties) ? node.properties : {};
    const properties = Object.fromEntries(
      Object.entries(rawProperties).map(([key, value]) => [key, sanitizeGoogleSchemaNode(value)])
    );
    const required = Array.isArray(node.required) ? node.required.filter((key) => typeof key === "string" && key in properties) : [];
    return {
      type: "object",
      ...description ? { description } : {},
      properties,
      ...required.length > 0 ? { required } : {}
    };
  }
  if (type === "array" || "items" in node) {
    return {
      type: "array",
      ...description ? { description } : {},
      items: sanitizeGoogleSchemaNode(node.items)
    };
  }
  if (type === "string" || type === "number" || type === "integer" || type === "boolean") {
    return {
      type,
      ...description ? { description } : {},
      ...enumValues ? { enum: enumValues } : {}
    };
  }
  return {
    type: "string",
    ...description ? { description } : {}
  };
};
const isRequiredOnlyCombinator = (items) => items.every((item) => {
  if (!isRecord(item)) return false;
  const keys = Object.keys(item);
  return keys.length === 1 && keys[0] === "required";
});
const sanitizeOpenAiSchemaNode = (node) => {
  if (!isRecord(node)) return node;
  const result = { ...node };
  delete result.minLength;
  delete result.maxLength;
  delete result.minimum;
  delete result.maximum;
  delete result.minItems;
  delete result.maxItems;
  delete result.pattern;
  delete result.format;
  const hasCombinator = ["anyOf", "oneOf", "allOf"].some((c) => Array.isArray(node[c]));
  if (!node.type && !isRecord(node.properties) && !hasCombinator) {
    result.type = "string";
  }
  if (node.type === "object" || isRecord(node.properties)) {
    result.additionalProperties = false;
    if (isRecord(node.properties)) {
      const propEntries = Object.entries(node.properties);
      result.properties = Object.fromEntries(
        propEntries.map(([key, value]) => [key, sanitizeOpenAiSchemaNode(value)])
      );
      result.required = propEntries.map(([key]) => key);
    } else {
      result.properties = {};
      result.required = [];
    }
    for (const combinator of ["anyOf", "oneOf", "allOf"]) {
      if (Array.isArray(result[combinator]) && isRequiredOnlyCombinator(result[combinator])) {
        delete result[combinator];
      }
    }
  }
  if (node.type === "array" && node.items) {
    result.items = sanitizeOpenAiSchemaNode(node.items);
  }
  if (Array.isArray(result.oneOf)) {
    result.anyOf = [...Array.isArray(result.anyOf) ? result.anyOf : [], ...result.oneOf];
    delete result.oneOf;
  }
  if (Array.isArray(result.allOf)) {
    result.anyOf = [...Array.isArray(result.anyOf) ? result.anyOf : [], ...result.allOf];
    delete result.allOf;
  }
  if (Array.isArray(result.anyOf)) {
    result.anyOf = result.anyOf.map(sanitizeOpenAiSchemaNode);
  }
  return result;
};
const prepareSchemaForProvider = (schema, provider) => {
  const cloned = cloneSchema(schema);
  if (provider === "google") return sanitizeGoogleSchemaNode(cloned);
  return sanitizeOpenAiSchemaNode(cloned);
};
const LOG_PREFIX$3 = "[TransientRetry]";
const TRANSIENT_ERROR_PATTERNS = [
  "UNAVAILABLE",
  "503",
  "overloaded",
  "high demand",
  "rate limit",
  "429",
  "capacity",
  "temporarily unavailable",
  "server error",
  "500",
  "502"
];
const PERMANENT_ERROR_PATTERNS = [
  "401",
  "403",
  "invalid_api_key",
  "permission_denied",
  "authentication",
  "unauthorized",
  "forbidden"
];
const getErrorMessage$1 = (error) => {
  if (error instanceof Error) return error.message;
  return String(error);
};
const isTransientProviderError = (error) => {
  const lower = getErrorMessage$1(error).toLowerCase();
  return TRANSIENT_ERROR_PATTERNS.some((p) => lower.includes(p.toLowerCase()));
};
const isPermanentProviderError = (error) => {
  const lower = getErrorMessage$1(error).toLowerCase();
  return PERMANENT_ERROR_PATTERNS.some((p) => lower.includes(p.toLowerCase()));
};
const parseRetryAfterMs = (error) => {
  var _a;
  const resp = error == null ? void 0 : error.response;
  const raw = (_a = resp == null ? void 0 : resp.headers) == null ? void 0 : _a["retry-after"];
  if (typeof raw === "string") {
    const seconds = parseInt(raw, 10);
    if (!isNaN(seconds) && seconds > 0) return seconds * 1e3;
  }
  if (typeof raw === "number" && raw > 0) return raw * 1e3;
  return -1;
};
const computeDelay = (attempt, baseMs, maxMs) => {
  const exponential = baseMs * Math.pow(2, attempt);
  const jittered = exponential * (1 + Math.random() * 0.2);
  return Math.min(jittered, maxMs);
};
const abortableSleep = (ms, signal) => new Promise((resolve, reject) => {
  if (signal == null ? void 0 : signal.aborted) {
    reject(signal.reason);
    return;
  }
  const onAbort = () => {
    clearTimeout(timer);
    reject(signal.reason);
  };
  const timer = setTimeout(() => {
    signal == null ? void 0 : signal.removeEventListener("abort", onAbort);
    resolve();
  }, ms);
  signal == null ? void 0 : signal.addEventListener("abort", onAbort, { once: true });
});
async function withTransientRetry(execute, options) {
  const {
    settings,
    primaryModelId,
    label,
    abortSignal,
    maxSameModelRetries = 1,
    baseDelayMs = 500,
    maxDelayMs = 8e3,
    onRetry,
    shouldRetry,
    maxFallbackRetries = 0
  } = options;
  const tag = label ? `${LOG_PREFIX$3} ${label}` : LOG_PREFIX$3;
  let firstError = null;
  const callStartMs = performance.now();
  for (let attempt = 0; attempt <= maxSameModelRetries; attempt++) {
    try {
      const result = await execute(void 0);
      const durationMs = Math.round(performance.now() - callStartMs);
      console.log(`[Perf:AI] ${label ?? "unknown"} | model=${primaryModelId} | ${durationMs}ms | attempt=${attempt + 1}`);
      return result;
    } catch (error) {
      if (isRuntimeAbortError(error, abortSignal)) throw error;
      if (isPermanentProviderError(error)) throw error;
      firstError ?? (firstError = error);
      const customVerdict = shouldRetry == null ? void 0 : shouldRetry(error, attempt);
      if (customVerdict === false) throw error;
      if (customVerdict !== true && !isTransientProviderError(error)) throw error;
      if (attempt >= maxSameModelRetries) break;
      const retryAfterMs = parseRetryAfterMs(error);
      const delayMs = retryAfterMs > 0 ? Math.min(retryAfterMs, maxDelayMs) : computeDelay(attempt, baseDelayMs, maxDelayMs);
      const totalMaxAttempts = maxSameModelRetries + 1 + maxFallbackRetries + 1;
      console.warn(
        `${tag}: retry ${attempt + 1}/${totalMaxAttempts} (same_model) after ${getErrorMessage$1(error).slice(0, 80)}, delay ${Math.round(delayMs)}ms`
      );
      onRetry == null ? void 0 : onRetry({
        attempt: attempt + 1,
        maxAttempts: totalMaxAttempts,
        delayMs,
        error,
        label,
        strategy: "same_model"
      });
      await abortableSleep(delayMs, abortSignal);
    }
  }
  const fallback = createFallbackProviderModel(settings, primaryModelId);
  if (fallback) {
    const totalMaxAttempts = maxSameModelRetries + 1 + maxFallbackRetries + 1;
    for (let fbAttempt = 0; fbAttempt <= maxFallbackRetries; fbAttempt++) {
      const attemptNumber = maxSameModelRetries + 1 + fbAttempt + 1;
      if (fbAttempt > 0) {
        const fbDelayMs = computeDelay(fbAttempt - 1, baseDelayMs, maxDelayMs);
        console.warn(`${tag}: fallback retry ${fbAttempt}/${maxFallbackRetries} after transient error, delay ${Math.round(fbDelayMs)}ms`);
        await abortableSleep(fbDelayMs, abortSignal);
      }
      console.warn(`${tag}: retry ${attemptNumber}/${totalMaxAttempts} (fallback_model: ${fallback.modelId})`);
      onRetry == null ? void 0 : onRetry({
        attempt: attemptNumber,
        maxAttempts: totalMaxAttempts,
        delayMs: 0,
        error: firstError,
        label,
        strategy: "fallback_model"
      });
      try {
        return await execute(fallback.model);
      } catch (fallbackError) {
        if (isRuntimeAbortError(fallbackError, abortSignal)) throw fallbackError;
        if (isPermanentProviderError(fallbackError)) break;
        if (!isTransientProviderError(fallbackError)) break;
        console.error(`${tag}: fallback model "${fallback.modelId}" attempt ${fbAttempt + 1} failed:`, fallbackError);
      }
    }
  }
  throw firstError;
}
const transientRetry = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  TRANSIENT_ERROR_PATTERNS,
  isPermanentProviderError,
  isTransientProviderError,
  parseRetryAfterMs,
  withTransientRetry
}, Symbol.toStringTag, { value: "Module" }));
const PRE_FILTER_OPERATORS = [
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "between",
  "contains",
  "starts_with",
  "ends_with",
  "in",
  "not_in"
];
const AGGREGATION_ENUM = [
  "sum",
  "count",
  "avg",
  "count_distinct",
  "min",
  "max",
  "median",
  "percentile"
];
const createAnalysisTopicsSchema = (minTopics = 4, maxTopics = 8) => ({
  type: "object",
  properties: {
    topics: {
      type: "array",
      description: `An array of ${minTopics} to ${maxTopics} distinct, high-level analysis topics or questions.`,
      items: { type: "string" }
    }
  },
  required: ["topics"]
});
const createPlanSchema = (columnNames) => ({
  type: "object",
  properties: {
    chartType: { type: "string", enum: ["bar", "line", "multi_line", "pie", "doughnut", "scatter", "combo", "radar", "bubble"], description: "Type of chart to generate. Use multi_line when comparing multiple numeric columns (e.g., monthly values as separate series)." },
    title: { type: "string", description: "A concise title for the analysis." },
    description: { type: "string", description: "A brief explanation of what the analysis shows." },
    aggregation: { type: "string", enum: [...AGGREGATION_ENUM], description: "The aggregation function to apply. Omit for scatter charts." },
    groupByColumn: { type: "string", enum: columnNames, description: "The column to group data by (categorical). Omit for scatter charts." },
    valueColumn: { type: "string", enum: columnNames, description: 'The column for aggregation (numerical). Not needed for "count" or multi_line.' },
    valueColumns: { type: "array", items: { type: "string", enum: columnNames }, description: "Multiple value columns for multi-series charts. Use instead of valueColumn when comparing 3+ numeric columns (e.g., monthly period columns)." },
    xValueColumn: { type: "string", enum: columnNames, description: "The column for the X-axis of a scatter plot (numerical). Required for scatter plots." },
    yValueColumn: { type: "string", enum: columnNames, description: "The column for the Y-axis of a scatter plot (numerical). Required for scatter plots." },
    secondaryValueColumn: { type: "string", enum: columnNames, description: "For combo charts, the secondary column for aggregation (numerical)." },
    secondaryAggregation: { type: "string", enum: [...AGGREGATION_ENUM], description: "For combo charts, the aggregation for the secondary value column." },
    defaultTopN: { type: "integer", description: "Optional. If the analysis has many categories, this suggests a default Top N view (e.g., 8)." },
    defaultHideOthers: { type: "boolean", description: 'Optional. If using defaultTopN, suggests whether to hide the "Others" category by default.' },
    preFilter: {
      type: "array",
      description: "Optional. An array of filters to apply to the data *before* aggregation. Use this to scope an analysis, e.g., to a specific Category or Region.",
      items: {
        type: "object",
        properties: {
          column: { type: "string", enum: columnNames, description: "The column to filter on." },
          value: {
            anyOf: [
              { type: "string" },
              { type: "number" },
              { type: "array", items: { anyOf: [{ type: "string" }, { type: "number" }] } }
            ],
            description: "The value to filter for."
          },
          operator: {
            type: "string",
            enum: [...PRE_FILTER_OPERATORS],
            description: "Optional filter operator. Defaults to exact match when omitted."
          }
        },
        required: ["column", "value"]
      }
    }
  },
  required: ["chartType", "title", "description"],
  additionalProperties: false
});
const analysisPlanObjectSchema = createPlanSchema([]);
const createSqlAnalysisPlanSchema = (columnNames) => ({
  type: "object",
  properties: {
    chartType: { type: "string", enum: ["bar", "line", "multi_line", "pie", "doughnut", "scatter", "combo", "radar", "bubble"] },
    title: { type: "string" },
    description: { type: "string" },
    queryMode: { type: "string", enum: ["aggregate", "rowset"] },
    aggregation: { type: "string", enum: [...AGGREGATION_ENUM] },
    secondaryAggregation: { type: "string", enum: [...AGGREGATION_ENUM] },
    defaultTopN: { type: "integer" },
    defaultHideOthers: { type: "boolean" },
    bindings: {
      type: "object",
      properties: {
        groupByColumn: { type: "string", enum: columnNames },
        valueColumn: { type: "string" },
        valueColumns: { type: "array", items: { type: "string" }, description: "Multiple value columns for multi-series rendering." },
        secondaryValueColumn: { type: "string" },
        xValueColumn: { type: "string", enum: columnNames },
        yValueColumn: { type: "string", enum: columnNames }
      },
      required: []
    },
    query: {
      type: "object",
      properties: {
        select: { type: "array", items: { type: "string" } },
        groupBy: { type: "array", items: { type: "string", enum: columnNames } },
        aggregates: {
          type: "array",
          items: {
            type: "object",
            properties: {
              function: { type: "string", enum: ["sum", "count", "avg", "count_distinct", "min", "max", "median", "percentile"] },
              column: { type: "string", enum: columnNames },
              as: { type: "string" },
              percentile: { type: "number", minimum: 0, maximum: 1 },
              where: {
                type: "object",
                properties: {
                  predicates: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        column: { type: "string", enum: columnNames },
                        operator: { type: "string", enum: ["eq", "neq", "gt", "gte", "lt", "lte", "between", "contains", "starts_with", "ends_with", "in", "is_null", "not_null"] },
                        value: {}
                      },
                      required: ["column", "operator"]
                    }
                  },
                  groups: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        predicates: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              column: { type: "string", enum: columnNames },
                              operator: { type: "string", enum: ["eq", "neq", "gt", "gte", "lt", "lte", "between", "contains", "starts_with", "ends_with", "in", "is_null", "not_null"] },
                              value: {}
                            },
                            required: ["column", "operator"]
                          }
                        }
                      },
                      required: ["predicates"]
                    }
                  }
                }
              }
            },
            required: ["function", "as"]
          }
        },
        where: {
          type: "object",
          properties: {
            predicates: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  column: { type: "string", enum: columnNames },
                  operator: { type: "string", enum: ["eq", "neq", "gt", "gte", "lt", "lte", "between", "contains", "starts_with", "ends_with", "in", "is_null", "not_null"] },
                  value: {}
                },
                required: ["column", "operator"]
              }
            },
            groups: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  predicates: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        column: { type: "string", enum: columnNames },
                        operator: { type: "string", enum: ["eq", "neq", "gt", "gte", "lt", "lte", "between", "contains", "starts_with", "ends_with", "in", "is_null", "not_null"] },
                        value: {}
                      },
                      required: ["column", "operator"]
                    }
                  }
                },
                required: ["predicates"]
              }
            }
          }
        },
        orderBy: {
          type: "array",
          items: {
            type: "object",
            properties: {
              column: { type: "string" },
              direction: { type: "string", enum: ["asc", "desc"] }
            },
            required: ["column", "direction"]
          }
        },
        limit: { type: "integer" }
      },
      required: []
    }
  },
  required: ["chartType", "title", "description", "queryMode", "query", "bindings"],
  additionalProperties: false
});
const createSqlEvidenceQueryPlanSchema = (columnNames) => ({
  type: "object",
  properties: {
    title: { type: "string" },
    queryMode: { type: "string", enum: ["aggregate", "rowset"] },
    intentSummary: { type: "string" },
    preferredResultShape: {
      type: "string",
      enum: ["ranked_aggregate", "time_series", "rowset_scatter_candidate", "detail_table"]
    },
    preFilter: {
      type: "array",
      description: "Optional canonical pre-aggregation filter contract that must also be reflected in the final SQL WHERE clause.",
      items: {
        type: "object",
        properties: {
          column: { type: "string", enum: columnNames },
          value: {},
          operator: {
            type: "string",
            enum: [...PRE_FILTER_OPERATORS]
          }
        },
        required: ["column", "value"],
        additionalProperties: false
      }
    },
    query: {
      type: "object",
      properties: {
        select: { type: "array", items: { type: "string" } },
        groupBy: { type: "array", items: { type: "string", enum: columnNames } },
        aggregates: {
          type: "array",
          items: {
            type: "object",
            properties: {
              function: { type: "string", enum: ["sum", "count", "avg", "count_distinct", "min", "max", "median", "percentile"] },
              column: { type: "string", enum: columnNames },
              as: { type: "string" },
              percentile: { type: "number", minimum: 0, maximum: 1 },
              where: {
                type: "object",
                properties: {
                  predicates: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        column: { type: "string", enum: columnNames },
                        operator: { type: "string", enum: ["eq", "neq", "gt", "gte", "lt", "lte", "between", "contains", "starts_with", "ends_with", "in", "is_null", "not_null"] },
                        value: {}
                      },
                      required: ["column", "operator"]
                    }
                  }
                }
              }
            },
            required: ["function", "as"]
          }
        },
        where: {
          type: "object",
          properties: {
            predicates: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  column: { type: "string", enum: columnNames },
                  operator: { type: "string", enum: ["eq", "neq", "gt", "gte", "lt", "lte", "between", "contains", "starts_with", "ends_with", "in", "is_null", "not_null"] },
                  value: {}
                },
                required: ["column", "operator"]
              }
            }
          }
        },
        orderBy: {
          type: "array",
          items: {
            type: "object",
            properties: {
              column: { type: "string" },
              direction: { type: "string", enum: ["asc", "desc"] }
            },
            required: ["column", "direction"]
          }
        },
        limit: { type: "integer" }
      },
      required: ["select"],
      additionalProperties: false
    }
  },
  required: ["title", "queryMode", "query", "intentSummary"],
  additionalProperties: false
});
const createToolCreatePlanSchema = (columnNames) => ({
  oneOf: [
    createSqlAnalysisPlanSchema(columnNames),
    createPlanSchema(columnNames)
  ],
  description: "Return either a SQL-first plan with queryMode/query/bindings or a classic executable plan with groupByColumn/valueColumn bindings. Do not return visualization-only fields without executable bindings."
});
const proactiveInsightSchema = {
  type: "object",
  properties: {
    insight: { type: "string", description: "A concise, user-facing message describing the single most important finding." },
    cardId: { type: "string", description: "The ID of the card where this insight was observed." }
  },
  required: ["insight", "cardId"]
};
({
  properties: {
    nextAction: {
      properties: {
        plan: {
          ...analysisPlanObjectSchema
        }
      }
    }
  }
});
const analysisGoalCandidateSchema = {
  type: "object",
  properties: {
    goals: {
      type: "array",
      description: "An array of 2-3 distinct analysis goal candidates.",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "A short, clear title for the goal (e.g., 'Analyze Regional Sales Performance')." },
          description: { type: "string", description: "A one-sentence explanation of what this goal entails." },
          confidence: { type: "number", description: "A score from 0.0 to 1.0 indicating your confidence that this is the user's primary goal." }
        },
        required: ["title", "description", "confidence"]
      }
    }
  },
  required: ["goals"]
};
const cardEnhancementSuggestionsSchema = {
  type: "object",
  properties: {
    suggestions: {
      type: "array",
      description: "Up to three suggested improvements for the existing analysis cards.",
      items: {
        type: "object",
        properties: {
          id: { type: "string", description: "Optional unique id for the suggestion." },
          cardId: { type: "string", description: "The target card ID that should be enhanced." },
          cardTitle: { type: "string", description: "Optional. Human-readable title of the card." },
          rationale: { type: "string", description: "Why this enhancement matters." },
          priority: { type: "string", enum: ["high", "medium", "low"], description: "How important this enhancement is." },
          action: { type: "string", enum: ["add_calculated_column", "none"], description: 'Which tool to apply. Start with calculated columns; use "none" for informational suggestions.' },
          proposedColumnName: { type: "string", description: "If action is add_calculated_column, name of the new column." },
          formula: { type: "string", description: `Formula referencing existing columns with single quotes, e.g., "('Revenue' - 'Cost') / 'Revenue'".` },
          updateChart: {
            type: "object",
            description: "Optional chart update instructions when adding a new column.",
            properties: {
              useAs: { type: "string", enum: ["primaryY", "secondaryY"] },
              newChartType: { type: "string", enum: ["bar", "line", "pie", "doughnut", "scatter", "combo", "radar", "bubble"] }
            },
            required: ["useAs"]
          }
        },
        required: ["cardId", "rationale", "priority", "action"]
      }
    }
  },
  required: ["suggestions"]
};
const analystMemoSchema = {
  type: "object",
  properties: {
    role: {
      type: "string",
      enum: ["data_quality", "business", "risk"],
      description: "The fixed analyst role that produced this memo."
    },
    headline: {
      type: "string",
      description: "A short headline that captures the role-specific conclusion."
    },
    summary: {
      type: "string",
      description: "A concise summary of the analyst view."
    },
    findings: {
      type: "array",
      description: "Role-specific findings grounded in the evidence bundle.",
      items: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "A stable identifier for this finding."
          },
          claim: {
            type: "string",
            description: "The actual finding claim."
          },
          importance: {
            type: "string",
            enum: ["low", "medium", "high"],
            description: "How important the finding is."
          },
          evidenceRefs: {
            type: "array",
            description: "Evidence ids from the provided evidence catalog.",
            items: { type: "string" }
          },
          metricRefs: {
            type: "array",
            description: "Metric or column labels referenced by the finding.",
            items: { type: "string" }
          },
          caveat: {
            type: "string",
            description: "Optional caveat that tempers the claim."
          }
        },
        required: ["id", "claim", "importance", "evidenceRefs", "metricRefs"]
      }
    },
    blockers: {
      type: "array",
      description: "Material blockers that prevent stronger conclusions.",
      items: { type: "string" }
    },
    caveats: {
      type: "array",
      description: "Non-blocking caveats that limit confidence.",
      items: { type: "string" }
    },
    confidence: {
      type: "string",
      enum: ["low", "medium", "high"],
      description: "Overall confidence for this memo."
    },
    recommendedNextChecks: {
      type: "array",
      description: "Concrete next checks for the user or a later bounded report step.",
      items: { type: "string" }
    }
  },
  required: ["role", "headline", "summary", "findings", "blockers", "caveats", "confidence", "recommendedNextChecks"]
};
const forumSummarySchema = {
  type: "object",
  properties: {
    consensusFindings: {
      type: "array",
      description: "Merged findings that can be carried into the report as consensus or near-consensus statements.",
      items: {
        type: "object",
        properties: {
          id: { type: "string", description: "Stable identifier for the merged finding." },
          claim: { type: "string", description: "Merged claim text suitable for the report." },
          supportedByRoles: {
            type: "array",
            description: "The analyst roles that support this claim.",
            items: {
              type: "string",
              enum: ["data_quality", "business", "risk"]
            }
          },
          evidenceRefs: {
            type: "array",
            description: "Evidence ids from the evidence catalog.",
            items: { type: "string" }
          },
          caveats: {
            type: "array",
            description: "Caveats that should stay attached to the finding.",
            items: { type: "string" }
          }
        },
        required: ["id", "claim", "supportedByRoles", "evidenceRefs", "caveats"]
      }
    },
    disagreements: {
      type: "array",
      description: "Explicit unresolved or partially resolved disagreements across analysts.",
      items: {
        type: "object",
        properties: {
          id: { type: "string", description: "Stable identifier for the disagreement." },
          topic: { type: "string", description: "Short topic for the disagreement." },
          positions: {
            type: "array",
            description: "Role-specific positions on the topic.",
            items: {
              type: "object",
              properties: {
                role: {
                  type: "string",
                  enum: ["data_quality", "business", "risk"]
                },
                stance: { type: "string", description: "How the role characterizes the issue." },
                evidenceRefs: {
                  type: "array",
                  description: "Evidence ids backing that stance.",
                  items: { type: "string" }
                }
              },
              required: ["role", "stance", "evidenceRefs"]
            }
          },
          resolution: {
            type: "string",
            enum: ["unresolved", "partially_resolved", "resolved"],
            description: "Whether the disagreement is still open after aggregation."
          }
        },
        required: ["id", "topic", "positions", "resolution"]
      }
    },
    overallConfidence: {
      type: "string",
      enum: ["low", "medium", "high"],
      description: "Overall confidence for the merged forum summary."
    },
    executiveSummary: {
      type: "string",
      description: "An executive summary that explains the final merged take."
    },
    recommendedActions: {
      type: "array",
      description: "Concrete actions to reduce risk or improve report readiness.",
      items: { type: "string" }
    }
  },
  required: ["consensusFindings", "disagreements", "overallConfidence", "executiveSummary", "recommendedActions"]
};
const buildPromptBundleView = (bundle) => ({
  dataset: bundle.dataset,
  workflow: {
    topWarnings: bundle.workflow.topWarnings,
    verification: bundle.workflow.verification,
    diff: bundle.workflow.diff
  },
  summaries: bundle.summaries,
  query: bundle.query,
  cards: bundle.cards.map((card) => ({
    evidenceId: card.evidenceId,
    title: card.title,
    displayTitle: card.displayTitle,
    description: card.description,
    artifactType: card.artifactType,
    chartType: card.chartType,
    groupByColumn: card.groupByColumn,
    valueColumn: card.valueColumn,
    aggregation: card.aggregation,
    rowCount: card.rowCount,
    summary: card.summary,
    aggregatedDataSample: card.aggregatedDataSample,
    semanticRole: card.semanticRole,
    helperExposureLevel: card.helperExposureLevel,
    businessMeaningConfidence: card.businessMeaningConfidence,
    aggregationQualityFlags: card.aggregationQualityFlags
  })),
  evidenceCatalog: bundle.evidenceCatalog
});
const createAnalystMemoPrompt = (roleDefinition, bundle, language, briefing) => `
You are the ${roleDefinition.label} in a bounded multi-analyst report workflow.

Your objective:
- ${roleDefinition.objective}

Your focus areas:
${roleDefinition.focusAreas.map((area) => `- ${area}`).join("\n")}

Operating rules:
- Use only the evidence ids listed in the EVIDENCE_CATALOG.
- Every finding must cite at least one evidence id.
- If evidence is weak or incomplete, downgrade the claim into a caveat or blocker instead of guessing.
- Keep the memo bounded: prefer 2-4 findings, 0-3 blockers, and 1-4 recommended next checks.
- Do not invent new datasets, metrics, cards, or workflow steps that are not present in the evidence bundle.
- Write user-facing prose in ${language} where possible.
- Use uppercase ISO currency codes (SGD, USD, EUR — never sgd, usd, eur).
- Replace null or missing category labels with "Unclassified" in user-facing text.
- Avoid internal column names, reason codes, or enum values. Use business-friendly language.
- Use "X times" for ratios instead of "X.Xx" notation.
- Return a single JSON object matching the provided schema.
${briefing ? `
EVIDENCE BRIEFING (harness-generated — use this to guide your analysis focus):
${briefing.briefingMarkdown}
` : ""}
EVIDENCE BUNDLE JSON:
${JSON.stringify(buildPromptBundleView(bundle), null, 2)}
`;
const buildPromptMemoView = (memos) => memos.map((memo) => ({
  role: memo.role,
  headline: memo.headline,
  summary: memo.summary,
  findings: memo.findings,
  blockers: memo.blockers,
  caveats: memo.caveats,
  confidence: memo.confidence,
  recommendedNextChecks: memo.recommendedNextChecks
}));
const createForumSummaryPrompt = (memos, bundle, language, briefing) => `
You are the forum aggregator in a bounded multi-analyst report workflow.

Your job:
- merge the analyst memos into a structured forum summary
- preserve disagreements instead of flattening them away
- promote only evidence-backed findings into consensusFindings

Operating rules:
- Use only the analyst memos and evidence ids provided below.
- Do not invent new evidence ids, roles, datasets, cards, or metrics.
- Every consensus finding must include at least one evidence ref.
- Use disagreements when analyst positions materially diverge or confidence remains mixed.
- Keep the forum summary bounded: prefer 2-5 consensus findings, 0-3 disagreements, and 2-5 recommended actions.
- Write user-facing prose in ${language} where possible.
- Use uppercase ISO currency codes (SGD, USD, EUR — never sgd, usd, eur).
- Replace null or missing category labels with "Unclassified" in user-facing text.
- Avoid technical terms like "helper exposure", "narrative ineligible", or "row expansion ratio" in user-facing text.
- Phrase each recommended action as a single clear sentence starting with a verb. Do not prefix actions with numbers.
- The executiveSummary should read like a professional analyst briefing for senior management.
- Return a single JSON object matching the provided schema.
${briefing ? `
EVIDENCE BRIEFING (harness-generated — use these insights to frame the executive summary):
${briefing.briefingMarkdown}
` : ""}
ANALYST MEMOS JSON:
${JSON.stringify(buildPromptMemoView(memos), null, 2)}

EVIDENCE BUNDLE JSON:
${JSON.stringify(buildPromptBundleView(bundle), null, 2)}
`;
const filterPredicateSchema = {
  type: "object",
  properties: {
    column: { type: "string", minLength: 1 },
    operator: { type: "string", enum: ["eq", "neq", "gt", "gte", "lt", "lte", "between", "contains", "starts_with", "ends_with", "in", "is_null", "not_null"] },
    value: {}
  },
  required: ["column", "operator"]
};
const filterPredicateGroupSchema = {
  type: "object",
  properties: {
    predicates: {
      type: "array",
      items: filterPredicateSchema
    }
  },
  required: ["predicates"]
};
const filterRowsOperationSchema = {
  type: "object",
  properties: {
    id: { type: "string", description: "Unique operation identifier." },
    type: { type: "string", enum: ["filter_rows"] },
    reason: { type: "string", description: "Reason for applying this filter." },
    predicates: {
      type: "array",
      items: filterPredicateSchema
    },
    groups: {
      type: "array",
      description: "Optional OR groups. Each group is AND-only internally; the overall result matches if any group matches.",
      items: filterPredicateGroupSchema
    }
  },
  required: ["id", "type", "reason"],
  anyOf: [{ required: ["predicates"] }, { required: ["groups"] }]
};
const columnProfileSchema = {
  type: "object",
  properties: {
    name: { type: "string", description: "The column name." },
    type: { type: "string", enum: ["numerical", "categorical", "date", "time", "currency", "percentage"], description: "The data type of the column. Identify specific types like 'date', 'currency', etc., where possible." }
  },
  required: ["name", "type"]
};
const queryWhereSchema = {
  type: "object",
  properties: {
    predicates: {
      type: "array",
      minItems: 1,
      items: filterPredicateSchema
    },
    groups: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        properties: {
          predicates: {
            type: "array",
            minItems: 1,
            items: filterPredicateSchema
          }
        },
        required: ["predicates"]
      }
    }
  },
  anyOf: [
    { required: ["predicates"] },
    { required: ["groups"] }
  ]
};
const queryOrderBySchema = {
  type: "object",
  properties: {
    column: { type: "string", minLength: 1 },
    direction: { type: "string", enum: ["asc", "desc"] }
  },
  required: ["column", "direction"]
};
const postAggregatePredicateSchema = {
  type: "object",
  properties: {
    column: { type: "string", minLength: 1 },
    operator: { type: "string", enum: ["eq", "neq", "gt", "gte", "lt", "lte", "between", "is_null", "not_null"] },
    value: {}
  },
  required: ["column", "operator"]
};
const queryAggregateSchema = {
  anyOf: [
    {
      type: "object",
      properties: {
        function: { type: "string", enum: ["count"] },
        column: { type: "string", minLength: 1, description: "Optional source column. Omit for row-count aggregation." },
        as: { type: "string", minLength: 1, description: "Required output alias for this aggregate column." },
        where: { ...queryWhereSchema, description: "Optional aggregate-scoped filter. Use this when each aggregate must summarize a different subset of source rows." }
      },
      required: ["function", "as"]
    },
    {
      type: "object",
      properties: {
        function: { type: "string", enum: ["count_distinct", "sum", "avg", "min", "max", "median"] },
        column: { type: "string", minLength: 1, description: "Required source column for numeric aggregates." },
        as: { type: "string", minLength: 1, description: "Required output alias for this aggregate column." },
        where: { ...queryWhereSchema, description: "Optional aggregate-scoped filter. Use this when each aggregate must summarize a different subset of source rows." }
      },
      required: ["function", "column", "as"]
    },
    {
      type: "object",
      properties: {
        function: { type: "string", enum: ["percentile"] },
        column: { type: "string", minLength: 1, description: "Required source column for percentile aggregation." },
        as: { type: "string", minLength: 1, description: "Required output alias for this aggregate column." },
        percentile: { type: "number", minimum: 0, maximum: 1 },
        where: { ...queryWhereSchema, description: "Optional aggregate-scoped filter. Use this when each aggregate must summarize a different subset of source rows." }
      },
      required: ["function", "column", "as", "percentile"]
    }
  ]
};
const queryPlanSchema = {
  type: "object",
  properties: {
    select: {
      type: "array",
      description: "Optional whitelist of columns to return.",
      minItems: 1,
      items: { type: "string", minLength: 1 }
    },
    where: queryWhereSchema,
    groupBy: {
      type: "array",
      description: "Optional grouping columns for read-only summary queries. If present, pair them with aggregates.",
      minItems: 1,
      items: { type: "string", minLength: 1 }
    },
    aggregates: {
      type: "array",
      description: "Optional aggregate definitions for grouped or grand-total queries. Use bounded aggregate functions and give every aggregate a stable alias.",
      minItems: 1,
      items: queryAggregateSchema
    },
    postAggregateFilter: {
      type: "object",
      properties: {
        predicates: {
          type: "array",
          minItems: 1,
          items: postAggregatePredicateSchema
        },
        groups: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            properties: {
              predicates: {
                type: "array",
                minItems: 1,
                items: postAggregatePredicateSchema
              }
            },
            required: ["predicates"]
          }
        }
      },
      anyOf: [
        { required: ["predicates"] },
        { required: ["groups"] }
      ]
    },
    orderBy: {
      type: "array",
      description: "Optional list of bounded sort clauses. Every orderBy column must also appear in select.",
      minItems: 1,
      items: queryOrderBySchema
    },
    limit: {
      type: "integer",
      description: "Optional maximum rows to return. Runtime will clamp this to a safety limit.",
      minimum: 0
    }
  },
  anyOf: [
    { required: ["select"] },
    { required: ["where"] },
    { required: ["groupBy"] },
    { required: ["aggregates"] },
    { required: ["postAggregateFilter"] },
    { required: ["orderBy"] },
    { required: ["limit"] }
  ]
};
let _dataPreparationSchema = null;
const getDataPreparationSchema = () => {
  if (!_dataPreparationSchema) {
    _dataPreparationSchema = {
      type: "object",
      properties: {
        explanation: { type: "string", description: "A brief, user-facing explanation of the transformations that will be applied to the data." },
        operations: {
          type: "array",
          description: "A short sequence of deterministic data operations. Keep the list empty if no permanent cleaning is needed.",
          items: getDataOperationSchema(),
          maxItems: 8
        },
        outputColumns: {
          type: "array",
          description: "A list of column profiles describing the structure of the data AFTER the transformation. If no transformation is performed, this should be the same as the input column profiles.",
          items: columnProfileSchema
        }
      },
      required: ["explanation", "operations", "outputColumns"]
    };
  }
  return _dataPreparationSchema;
};
const dataPreparationSchema = new Proxy({}, {
  get: (_target, prop) => getDataPreparationSchema()[prop],
  ownKeys: () => Reflect.ownKeys(getDataPreparationSchema()),
  getOwnPropertyDescriptor: (_target, prop) => Reflect.getOwnPropertyDescriptor(getDataPreparationSchema(), prop),
  has: (_target, prop) => prop in getDataPreparationSchema()
});
const dataPreparationProviderOperationTypes = [
  "drop_rows_by_index",
  "drop_rows_by_condition",
  "drop_blank_rows",
  "promote_header_row",
  "rename_columns",
  "drop_columns",
  "trim_whitespace",
  "normalize_empty_values",
  "replace_values",
  "cast_column",
  "fill_missing",
  "dedupe_rows",
  "filter_rows",
  "split_column",
  "unpivot_columns"
];
let _baseProviderSchema = null;
const resolveBaseProviderSchema = () => {
  if (!_baseProviderSchema) {
    const base = getDataPreparationSchema();
    _baseProviderSchema = {
      ...base,
      properties: {
        ...base.properties,
        operations: {
          ...base.properties.operations,
          items: getDataOperationSchemaForTypes(dataPreparationProviderOperationTypes)
        }
      }
    };
  }
  return _baseProviderSchema;
};
const dataPreparationProviderSchema = new Proxy({}, {
  get: (_target, prop) => resolveBaseProviderSchema()[prop],
  ownKeys: () => Reflect.ownKeys(resolveBaseProviderSchema()),
  getOwnPropertyDescriptor: (_target, prop) => Reflect.getOwnPropertyDescriptor(resolveBaseProviderSchema(), prop),
  has: (_target, prop) => prop in resolveBaseProviderSchema()
});
const compactColumnProfileSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    type: { type: "string", enum: ["numerical", "categorical", "date", "time", "currency", "percentage"] }
  },
  required: ["name", "type"]
};
const compactFilterPredicateSchema = {
  type: "object",
  properties: {
    column: { type: "string" },
    operator: { type: "string", enum: ["eq", "neq", "gt", "gte", "lt", "lte", "between", "contains", "starts_with", "ends_with", "in", "is_null", "not_null"] },
    value: { type: "string" }
  },
  required: ["column", "operator"]
};
const compactFilterPredicateGroupSchema = {
  type: "object",
  properties: {
    predicates: {
      type: "array",
      items: compactFilterPredicateSchema
    }
  },
  required: ["predicates"]
};
const compactRenameMappingSchema = {
  type: "object",
  properties: {
    from: { type: "string" },
    to: { type: "string" }
  },
  required: ["from", "to"]
};
const compactUnpivotLabelMappingSchema = {
  type: "object",
  properties: {
    sourceColumn: { type: "string" },
    label: { type: "string" }
  },
  required: ["sourceColumn", "label"]
};
const compactUnpivotLabelColumnSchema = {
  type: "object",
  properties: {
    outputColumn: { type: "string" },
    mappings: {
      type: "array",
      items: compactUnpivotLabelMappingSchema
    }
  },
  required: ["outputColumn", "mappings"]
};
const compactUnpivotRowClassMappingSchema = {
  type: "object",
  properties: {
    sourceRowIndex: { type: "integer" },
    rowClass: { type: "string" }
  },
  required: ["sourceRowIndex", "rowClass"]
};
const compactUnpivotHierarchyDepthMappingSchema = {
  type: "object",
  properties: {
    sourceRowIndex: { type: "integer" },
    depth: { type: "integer" }
  },
  required: ["sourceRowIndex", "depth"]
};
const compactWideTableProviderOperationTypes = [
  "drop_rows_by_index",
  "drop_rows_by_condition",
  "drop_blank_rows",
  "promote_header_row",
  "rename_columns",
  "drop_columns",
  "trim_whitespace",
  "normalize_empty_values",
  "cast_column",
  "unpivot_columns"
];
const compactWideTableOperationSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    reason: { type: "string" },
    type: { type: "string", enum: compactWideTableProviderOperationTypes },
    indices: {
      type: "array",
      items: { type: "integer" }
    },
    predicates: {
      type: "array",
      items: compactFilterPredicateSchema
    },
    groups: {
      type: "array",
      items: compactFilterPredicateGroupSchema
    },
    rowIndex: { type: "integer" },
    mappings: {
      type: "array",
      items: compactRenameMappingSchema
    },
    columns: {
      type: "array",
      items: { type: "string" }
    },
    emptyMarkers: {
      type: "array",
      items: { type: "string" }
    },
    column: { type: "string" },
    targetType: { type: "string", enum: ["number", "currency", "percentage", "date", "boolean", "string"] },
    sourceColumns: {
      type: "array",
      items: { type: "string" }
    },
    keyColumn: { type: "string" },
    valueColumn: { type: "string" },
    keepColumns: {
      type: "array",
      items: { type: "string" }
    },
    labelColumn: { type: "string" },
    labelMappings: {
      type: "array",
      items: compactUnpivotLabelMappingSchema
    },
    labelColumns: {
      type: "array",
      items: compactUnpivotLabelColumnSchema
    },
    sourceColumnNameColumn: { type: "string" },
    sourceRowIndexColumn: { type: "string" },
    rowClassColumn: { type: "string" },
    rowClassMappings: {
      type: "array",
      items: compactUnpivotRowClassMappingSchema
    },
    hierarchyDepthColumn: { type: "string" },
    hierarchyDepthMappings: {
      type: "array",
      items: compactUnpivotHierarchyDepthMappingSchema
    }
  },
  required: ["id", "type", "reason"]
};
const compactWideTableDataPreparationProviderSchema = {
  type: "object",
  properties: {
    explanation: { type: "string" },
    operations: {
      type: "array",
      items: compactWideTableOperationSchema,
      maxItems: 8
    },
    outputColumns: {
      type: "array",
      items: compactColumnProfileSchema
    }
  },
  required: ["explanation", "operations", "outputColumns"]
};
const getDataPreparationProviderSchema = (options) => (options == null ? void 0 : options.compactWideTable) ? compactWideTableDataPreparationProviderSchema : dataPreparationProviderSchema;
const reportContextExtractionSchema = {
  type: "object",
  properties: {
    reportTitle: {
      type: "string",
      description: "A concise human-readable report title. You may rephrase or clean up raw text for readability, but it must be grounded in visible CSV evidence."
    },
    reportDescription: {
      type: "string",
      description: "A 1-2 sentence description of what this CSV dataset contains (domain, time period, scope). Ground in visible evidence from metadata, headers, and body sample."
    },
    parameterLines: {
      type: "array",
      description: "Up to 5 report parameter or filter lines that were preserved outside the body table.",
      items: { type: "string" },
      maxItems: 5
    },
    footerLines: {
      type: "array",
      description: "Up to 5 footer, memo, or remark lines that belong below the body table.",
      items: { type: "string" },
      maxItems: 5
    },
    candidateHeaderLine: {
      type: "array",
      description: "A likely tabular header row or header-layer labels. Return an empty array if unknown.",
      items: { type: "string" },
      maxItems: 20
    },
    confidence: {
      type: "string",
      enum: ["high", "medium", "low"],
      description: "How confident you are that the extracted report context is correct."
    },
    reasoning: {
      type: "string",
      description: "A short explanation of which report evidence supported the extraction."
    }
  },
  required: ["reportTitle", "reportDescription", "parameterLines", "footerLines", "candidateHeaderLine", "confidence", "reasoning"]
};
const datasetSemanticAnnotationSchema = {
  type: "object",
  properties: {
    datasetRole: {
      type: "string",
      enum: ["detail_table", "summary_report", "mixed_report", "unknown"],
      description: "Overall semantic role of the prepared dataset."
    },
    rowAnnotations: {
      type: "array",
      description: "Semantic judgments for the provided candidate rows only. Do not invent row indices that were not provided.",
      maxItems: 80,
      items: {
        type: "object",
        properties: {
          rowIndex: { type: "integer", minimum: 0 },
          rowRole: {
            type: "string",
            enum: ["detail", "subtotal", "grand_total", "group_header", "footer", "note", "bucket", "noise", "unknown"]
          },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          reason: { type: "string" },
          confidenceBand: {
            type: "string",
            enum: ["high", "medium", "low"]
          },
          evidenceSources: {
            type: "array",
            items: {
              type: "string",
              enum: ["ai_prompt_context", "sample_values", "type_profile", "report_context", "deterministic_pattern"]
            }
          },
          excludeFromDefaultAnalysis: { type: "boolean" },
          unsafeForNarrative: { type: "boolean" }
        },
        required: ["rowIndex", "rowRole", "confidence", "reason"]
      }
    },
    columnAnnotations: {
      type: "array",
      description: "Semantic role guesses for columns in the prepared dataset.",
      maxItems: 80,
      items: {
        type: "object",
        properties: {
          columnName: { type: "string" },
          semanticRole: {
            type: "string",
            enum: ["business_entity", "business_dimension", "metric", "time_dimension", "descriptor", "code", "helper_dimension", "note", "unknown"]
          },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          reason: { type: "string" },
          rawHeader: { type: "string" },
          businessLabel: { type: "string" },
          sampleValueHints: {
            type: "array",
            items: { type: "string" },
            maxItems: 5
          },
          isPrimaryGrainCandidate: { type: "boolean" },
          isMetricCandidate: { type: "boolean" },
          isBusinessSafe: { type: "boolean" },
          confidenceBand: {
            type: "string",
            enum: ["high", "medium", "low"]
          },
          evidenceSources: {
            type: "array",
            items: {
              type: "string",
              enum: ["ai_prompt_context", "sample_values", "type_profile", "report_context", "deterministic_pattern"]
            }
          }
        },
        required: ["columnName", "semanticRole", "confidence", "reason"]
      }
    },
    headerSemantics: {
      type: "object",
      properties: {
        reportTitle: { type: "string" },
        reportType: {
          type: "string",
          enum: ["financial_statement", "project_report", "operational_report", "detail_listing", "unknown"]
        },
        headerRoleHints: {
          type: "array",
          items: {
            type: "object",
            properties: {
              headerValue: { type: "string" },
              role: {
                type: "string",
                enum: ["grain", "metric", "helper", "filter_scope", "unknown"]
              },
              confidence: { type: "number", minimum: 0, maximum: 1 },
              reason: { type: "string" }
            },
            required: ["headerValue", "role", "confidence", "reason"]
          },
          maxItems: 20
        },
        scopeHints: {
          type: "object",
          properties: {
            period: { type: "string" },
            businessUnit: { type: "string" },
            region: { type: "string" },
            scenario: { type: "string" }
          }
        },
        businessTerminology: {
          type: "array",
          items: { type: "string" },
          maxItems: 12
        },
        headerConfidence: { type: "number", minimum: 0, maximum: 1 },
        confidenceBand: {
          type: "string",
          enum: ["high", "medium", "low"]
        },
        evidenceSources: {
          type: "array",
          items: {
            type: "string",
            enum: ["ai_prompt_context", "sample_values", "type_profile", "report_context", "deterministic_pattern"]
          }
        },
        conflictDetected: { type: "boolean" },
        reason: { type: "string" }
      },
      required: ["reportTitle", "reportType", "headerRoleHints", "scopeHints", "businessTerminology", "headerConfidence", "reason"]
    },
    summary: {
      type: "string",
      description: "Short explanation of the semantic structure and any likely non-detail rows."
    }
  },
  required: ["datasetRole", "rowAnnotations", "columnAnnotations", "headerSemantics", "summary"]
};
const sqlPrecheckAssessmentSchema = {
  type: "object",
  properties: {
    status: {
      type: "string",
      enum: ["passed", "blocked"],
      description: "Whether the prepared dataset looks ready for grouped SQL analysis."
    },
    summary: {
      type: "string",
      description: "Short explanation of the precheck decision."
    },
    candidatePairs: {
      type: "array",
      description: "Up to 3 metric/dimension pairs that look suitable for grouped SQL cards.",
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          dimension: { type: "string" },
          metric: { type: "string" },
          confidence: {
            type: "string",
            enum: ["high", "medium", "low"]
          },
          reason: { type: "string" }
        },
        required: ["dimension", "metric", "confidence", "reason"]
      }
    },
    findings: {
      type: "array",
      description: "Specific blockers or warnings that explain the decision.",
      maxItems: 8,
      items: {
        type: "object",
        properties: {
          kind: {
            type: "string",
            enum: [
              "null_heavy_metric",
              "constant_metric",
              "zero_total_metric",
              "flat_grouped_metric",
              "low_distinct_dimension",
              "parse_failures_remaining",
              "high_fragmentation",
              "no_viable_candidates"
            ]
          },
          severity: {
            type: "string",
            enum: ["warn", "block"]
          },
          message: { type: "string" },
          column: { type: "string" },
          metric: { type: "string" },
          dimension: { type: "string" }
        },
        required: ["kind", "severity", "message"]
      }
    }
  },
  required: ["status", "summary", "candidatePairs", "findings"]
};
const filterFunctionSchema = {
  type: "object",
  properties: {
    explanation: { type: "string", description: "A brief, user-facing explanation of the filter that was created from the natural language query." },
    operation: {
      type: "object",
      description: "Exactly one deterministic filter_rows operation. At least one of predicates or groups must be present.",
      properties: {
        id: { type: "string", description: "Stable operation identifier." },
        type: { type: "string", enum: ["filter_rows"] },
        reason: { type: "string", description: "Short explanation for why this filter is needed." },
        predicates: {
          type: "array",
          items: filterPredicateSchema
        },
        groups: {
          type: "array",
          items: filterPredicateGroupSchema
        }
      },
      required: ["id", "type", "reason"]
    }
  },
  required: ["explanation", "operation"]
};
const dataQuerySchema = {
  type: "object",
  properties: {
    explanation: { type: "string", minLength: 1, description: "A brief, user-facing explanation of the read-only query." },
    plan: queryPlanSchema,
    fallbackFilterOperation: filterRowsOperationSchema
  },
  required: ["explanation", "plan"]
};
const dataDescribeSchema = {
  type: "object",
  properties: {
    explanation: { type: "string", minLength: 1, description: "A brief explanation of what summary statistics to compute." },
    columns: { type: "array", items: { type: "string" }, description: "Optional list of numeric columns to describe. Defaults to all numeric columns." }
  },
  required: ["explanation"]
};
const dataValueCountsSchema = {
  type: "object",
  properties: {
    explanation: { type: "string", minLength: 1, description: "A brief explanation of what frequency distribution to compute." },
    column: { type: "string", minLength: 1, description: "The categorical column to count values for." },
    limit: { type: "number", minimum: 1, maximum: 100, description: "Maximum number of values to return. Defaults to 20." }
  },
  required: ["explanation", "column"]
};
const dataOutliersSchema = {
  type: "object",
  properties: {
    explanation: { type: "string", minLength: 1, description: "A brief explanation of what outlier detection to perform." },
    column: { type: "string", minLength: 1, description: "The numeric column to detect outliers in." }
  },
  required: ["explanation", "column"]
};
const dataMissingSchema = {
  type: "object",
  properties: {
    explanation: { type: "string", minLength: 1, description: "A brief explanation of what missing data analysis to perform." },
    columns: { type: "array", items: { type: "string" }, description: "Optional list of columns to analyze. Defaults to all columns." }
  },
  required: ["explanation"]
};
const reportStructureProposalSchema = {
  type: "object",
  properties: {
    bodyRowRoles: {
      type: "array",
      maxItems: 48,
      items: {
        type: "object",
        properties: {
          rowIndex: {
            type: "integer",
            minimum: 0
          },
          role: {
            type: "string",
            enum: ["title", "parameter", "header", "detail", "group_header", "subtotal", "summary", "note", "footer", "blank", "unknown"]
          },
          confidence: {
            type: "number",
            minimum: 0,
            maximum: 1
          },
          notes: {
            type: "array",
            maxItems: 3,
            items: { type: "string" }
          }
        },
        required: ["rowIndex", "role", "confidence"]
      }
    },
    carryForwardColumns: {
      type: "array",
      maxItems: 8,
      items: { type: "string" }
    },
    sectionLabelColumns: {
      type: "array",
      maxItems: 8,
      items: { type: "string" }
    },
    detailInclusionRoles: {
      type: "array",
      maxItems: 4,
      items: {
        type: "string",
        enum: ["detail", "group_header", "subtotal", "note", "unknown"]
      }
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1
    },
    reasoning: {
      type: "string"
    }
  },
  required: [
    "bodyRowRoles",
    "carryForwardColumns",
    "sectionLabelColumns",
    "detailInclusionRoles",
    "confidence",
    "reasoning"
  ]
};
const debugLog = (stage, details, error) => {
  const payload = { stage, ...details };
  {
    console.debug(`[LLM][${stage}]`, payload);
  }
};
const normalizeText = (text) => text.replace(/\s+/g, " ").trim().toLowerCase();
const normalizeInsightGroupBy = (insight) => {
  const candidate = insight.groupBy ?? insight.groupByColumns ?? insight.groupByColumn;
  if (Array.isArray(candidate)) {
    return candidate.filter((value) => typeof value === "string").map((value) => value.trim()).filter(Boolean);
  }
  if (typeof candidate === "string" && candidate.trim()) {
    return [candidate.trim()];
  }
  return [];
};
const formatCompactRowSample = (rows, maxRows = 3) => rows.length > 0 ? safeJsonStringify(rows.slice(0, maxRows), 2) : "[]";
const summarizeOlderToolOutputs = (omittedCount, label) => omittedCount > 0 ? `Older ${label} summarized: ${omittedCount} earlier item(s) were omitted from detailed context.` : null;
const trimRelatedCards = (relatedCards, maxCards = resolveLongSessionContextPolicy().relatedCards) => relatedCards.slice(0, maxCards);
const trimMemoryHits = (memoryHits, maxHits = resolveLongSessionContextPolicy().memoryHits) => memoryHits.slice(0, maxHits);
const trimRawDataSample = (rows, maxRows = resolveLongSessionContextPolicy().rawSampleRows) => rows.slice(0, maxRows);
const trimCardContext = (cardContext, maxCards = resolveLongSessionContextPolicy().cardContextCards, maxRows = resolveLongSessionContextPolicy().cardContextRows) => cardContext.slice(0, maxCards).map((card) => ({
  ...card,
  aggregatedDataSample: card.aggregatedDataSample.slice(0, maxRows)
}));
const trimAnalysisCards = (cards, maxCards = resolveLongSessionContextPolicy().cardContextCards, maxRows = resolveLongSessionContextPolicy().cardContextRows) => cards.slice(0, maxCards).map((card) => ({
  ...card,
  aggregatedData: card.aggregatedData.slice(0, maxRows)
}));
const MODEL_TRANSCRIPT_ENTRY_CAP = 280;
const FULL_VISIBILITY_TYPES = /* @__PURE__ */ new Set([
  "user_message",
  "ai_message",
  "ai_clarification",
  "ai_goal_clarification",
  "ai_proactive_insight",
  "ai_enhancement_suggestion"
]);
const HIDDEN_VISIBILITY_TYPES = /* @__PURE__ */ new Set([
  "ai_thinking",
  "ai_thought",
  "ai_plan_start"
]);
const inferContextVisibility = (message) => {
  if (message.contextVisibility) return message.contextVisibility;
  const type = message.type ?? (message.sender === "user" ? "user_message" : "ai_message");
  if (FULL_VISIBILITY_TYPES.has(type)) return "full";
  if (HIDDEN_VISIBILITY_TYPES.has(type)) return "hidden";
  return "summarized";
};
const summarizeMutationConfirmation = (message) => {
  var _a;
  const count = ((_a = message.mutationConfirmation) == null ? void 0 : _a.matchedRowCount) ?? 0;
  return `Assistant staged a row deletion confirmation for ${count} rows; pending confirmation exists.`;
};
const summarizeQueryTrace = (message) => {
  const trace = message.queryTrace;
  if (!trace) return `Assistant ran a query.`;
  return `Assistant ran a ${trace.phase} query via ${trace.engine}; rows ${trace.returnedRows}/${trace.totalMatchedRows}.`;
};
const summarizeCleaningStep = (message) => {
  const step = message.cleaningStep;
  if (!step) return `Cleaning step reported.`;
  const toolSuffix = step.toolName ? ` via ${step.toolName}` : "";
  return `Cleaning ${step.kind} step is ${step.status}${toolSuffix}.`;
};
const summarizeCleaningFailure = (message) => {
  const text = (message.text || "").slice(0, MODEL_TRANSCRIPT_ENTRY_CAP);
  return `Cleaning runtime reported an error: ${text}.`;
};
const buildSummaryText = (message) => {
  if (message.modelText !== void 0 && message.modelText !== null) {
    return message.modelText;
  }
  switch (message.type) {
    case "ai_mutation_confirmation":
      return summarizeMutationConfirmation(message);
    case "ai_query_trace":
      return summarizeQueryTrace(message);
    case "ai_cleaning_step":
      return summarizeCleaningStep(message);
    case "ai_cleaning_failure":
      return summarizeCleaningFailure(message);
    default:
      return (message.text || "").slice(0, MODEL_TRANSCRIPT_ENTRY_CAP);
  }
};
const capEntryText = (text) => text.length <= MODEL_TRANSCRIPT_ENTRY_CAP ? text : text.slice(0, MODEL_TRANSCRIPT_ENTRY_CAP) + "...";
const sanitizeChatHistoryForModel = (chatHistory) => {
  const entries = [];
  let prevNormalizedKey = "";
  for (const message of chatHistory) {
    const visibility = inferContextVisibility(message);
    if (visibility === "hidden") continue;
    const type = message.type ?? (message.sender === "user" ? "user_message" : "ai_message");
    let text;
    if (visibility === "full") {
      text = message.modelText ?? message.text;
    } else {
      text = capEntryText(buildSummaryText(message));
    }
    const normalizedKey = `${message.sender}:${text.replace(/\s+/g, " ").trim()}`;
    if (normalizedKey === prevNormalizedKey && normalizedKey.length > 2) continue;
    prevNormalizedKey = normalizedKey;
    entries.push({ sender: message.sender, text, type });
  }
  return entries;
};
const formatTranscriptEntry = (entry) => `${entry.sender === "ai" ? "Assistant" : "User"}: ${entry.text}`;
const formatSanitizedTranscript = (entries) => entries.length > 0 ? entries.map(formatTranscriptEntry).join("\n") : "No recent conversation.";
const trimSanitizedTranscript = (entries, maxEntries = resolveLongSessionContextPolicy().recentChatWindow) => entries.slice(-maxEntries);
const formatCollapsedChatHistory = (chatHistory, settings) => {
  const windowSize = resolveLongSessionContextPolicy(settings).recentChatWindow;
  const sanitized = sanitizeChatHistoryForModel(chatHistory);
  return formatSanitizedTranscript(sanitized.slice(-windowSize));
};
const formatColumnProfiles = (columns) => columns.length > 0 ? safeJsonStringify(columns, 2) : "[]";
const formatColumnQualitySummary = (columns, maxColumns = 24) => {
  if (columns.length === 0) {
    return "No column quality profile is available.";
  }
  const lines = columns.slice(0, maxColumns).map((column) => {
    const missing = typeof column.missingPercentage === "number" ? `${column.missingPercentage.toFixed(1)}% missing` : "missing n/a";
    const unique = typeof column.uniqueValues === "number" ? `${column.uniqueValues} unique` : "unique n/a";
    const range = column.valueRange ? `, range ${column.valueRange[0]} to ${column.valueRange[1]}` : "";
    return `- ${column.name}: ${column.type}, ${missing}, ${unique}${range}`;
  });
  if (columns.length > maxColumns) {
    lines.push(`- ... ${columns.length - maxColumns} more columns not shown`);
  }
  return lines.join("\n");
};
const formatColumnNames = (columns) => columns.length > 0 ? columns.map((column) => column.name).join(", ") : "None available";
const formatRows = (rows) => rows.length > 0 ? safeJsonStringify(rows, 2) : "[]";
const formatRelatedCards = (relatedCards) => relatedCards.length > 0 ? relatedCards.map((card) => `- (${card.relevance.toFixed(2)}) ${card.displayTitle || card.title} | Group By: ${card.groupByColumn || "n/a"} | Value: ${card.valueColumn || "n/a"} | Aggregation: ${card.aggregation || "n/a"} | Card ID: ${card.id}`).join("\n") : "No high-confidence matches were found for this query.";
const formatCardContext = (cardContext) => cardContext.length > 0 ? safeJsonStringify(cardContext, 2) : "No cards yet.";
const formatCardTitles = (cards) => cards.length > 0 ? cards.map((card) => card.plan.title).join(", ") : "No cards created yet.";
const formatLongTermMemory = (memoryHits) => memoryHits.length > 0 ? memoryHits.join("\n---\n") : "No relevant long-term memory.";
const formatActiveDataQueryEvidence = (state) => {
  const activeDataQuery = state.activeDataQuery;
  if (!activeDataQuery) {
    return "No active data.query result.";
  }
  return [
    `Explanation: ${activeDataQuery.explanation}`,
    `Engine: ${activeDataQuery.engine}`,
    `Selected columns: ${activeDataQuery.result.selectedColumns.join(", ") || "none"}`,
    `Rows: ${activeDataQuery.result.returnedRows}/${activeDataQuery.result.totalMatchedRows}`,
    `Order: ${activeDataQuery.result.appliedOrderBy.length > 0 ? activeDataQuery.result.appliedOrderBy.map((order) => `${order.column} ${order.direction}`).join(", ") : "none"}`,
    `Preview rows:
${formatCompactRowSample(activeDataQuery.result.rows)}`
  ].join("\n");
};
const formatActiveSpreadsheetFilterEvidence = (state) => {
  const activeSpreadsheetFilter = state.activeSpreadsheetFilter;
  if (!activeSpreadsheetFilter) {
    return "No active spreadsheet filter.";
  }
  return [
    `Query: ${activeSpreadsheetFilter.query}`,
    `Matched rows: ${activeSpreadsheetFilter.observation.matchedRowCount}`,
    `Selected column: ${activeSpreadsheetFilter.observation.selectedColumn ?? "n/a"}`,
    `Operator: ${activeSpreadsheetFilter.observation.operator ?? "n/a"}`,
    `Value: ${activeSpreadsheetFilter.observation.value === null || activeSpreadsheetFilter.observation.value === void 0 ? "n/a" : safeJsonStringify(activeSpreadsheetFilter.observation.value)}`,
    `Preview rows:
${formatCompactRowSample(activeSpreadsheetFilter.observation.previewRows)}`
  ].join("\n");
};
const formatActiveMetricMappingValidationEvidence = (state) => {
  const artifact = state.activeMetricMappingValidation;
  if (!artifact) {
    return "No active metric mapping validation.";
  }
  const grain = Array.isArray(artifact.grain) ? artifact.grain : [];
  const blockers = Array.isArray(artifact.blockers) ? artifact.blockers : [];
  return [
    `Metric: ${artifact.metricName}`,
    `Recommended action: ${artifact.recommendedAction}`,
    `Recommended path: ${artifact.recommendedPath}`,
    `Grain: ${grain.join(", ") || "none"}`,
    `Blockers: ${blockers.join(" | ") || "none"}`
  ].join("\n");
};
const formatLatestRuntimeBlockerEvidence = (state, settings) => {
  var _a;
  const observation = (_a = state.activeTurn) == null ? void 0 : _a.lastObservation;
  if (!observation || observation.status !== "blocked" && observation.status !== "error") {
    return "No active runtime blocker.";
  }
  const policy = resolveLongSessionContextPolicy(settings);
  return [
    `Status: ${observation.status}`,
    `Summary: ${truncateContextText(observation.summary, policy.maxObservationChars)}`,
    `Retry hint: ${truncateContextText(observation.retryHint || "n/a", policy.maxObservationChars)}`
  ].join("\n");
};
const formatCleaningRuntimeEvidence = (state, settings) => {
  const cleaningRun = state.cleaningRun;
  if (!cleaningRun) {
    return "No active cleaning runtime.";
  }
  const policy = resolveLongSessionContextPolicy(settings);
  return [
    `Status: ${cleaningRun.status}`,
    `Strategy: ${cleaningRun.strategyKind ?? "n/a"}`,
    `Verification gap: ${cleaningRun.lastVerificationReason ?? "n/a"}`,
    `Last error: ${truncateContextText(cleaningRun.lastError ?? "n/a", policy.maxObservationChars)}`
  ].join("\n");
};
const formatAnalysisCardEvidence = (cards) => {
  if (cards.length === 0) {
    return "No cards are currently visible.";
  }
  const evaluationByCardId = new Map(
    evaluateAutoAnalysisCards(cards).cards.map((card) => [card.cardId, card])
  );
  return trimAnalysisCards(cards).map((card) => {
    var _a, _b, _c, _d, _e, _f;
    const verdict = ((_a = card.autoAnalysisEvaluation) == null ? void 0 : _a.verdict) ?? ((_b = evaluationByCardId.get(card.id)) == null ? void 0 : _b.verdict) ?? "unknown";
    const verdictDetail = (((_c = card.autoAnalysisEvaluation) == null ? void 0 : _c.reasonCodes.length) ?? ((_d = evaluationByCardId.get(card.id)) == null ? void 0 : _d.reasonCodes.length) ?? 0) > 0 ? ` (${((_e = card.autoAnalysisEvaluation) == null ? void 0 : _e.detail) ?? ((_f = evaluationByCardId.get(card.id)) == null ? void 0 : _f.detail)})` : "";
    const valueGate = card.evidenceValueGate;
    const valueGateLine = valueGate ? `  Value gate: ${valueGate.decision}${valueGate.reasonCodes.length > 0 ? ` [${valueGate.reasonCodes.join(", ")}]` : ""}${valueGate.detail ? ` — ${valueGate.detail}` : ""}` : null;
    return [
      `- ${card.plan.title}`,
      `  Chart: ${card.displayChartType}`,
      `  Group/value: ${card.plan.groupByColumn ?? "n/a"} / ${card.plan.valueColumn ?? card.plan.yValueColumn ?? "n/a"}`,
      `  Rows: ${card.aggregatedData.length}`,
      `  Evidence: ${verdict}${verdictDetail}`,
      valueGateLine,
      `  Sample:
${formatCompactRowSample(card.aggregatedData)}`
    ].filter(Boolean).join("\n");
  }).join("\n\n");
};
const formatRecentQueryEvidence = (state, settings) => {
  const toolOutputCutoff = resolveToolOutputCutoff(settings);
  const recentQueries = state.queryHistory.slice(-toolOutputCutoff);
  const omittedCount = Math.max(0, state.queryHistory.length - recentQueries.length);
  if (recentQueries.length === 0) {
    return "No recent query trace.";
  }
  return [
    summarizeOlderToolOutputs(omittedCount, "query traces"),
    ...recentQueries.map((entry) => [
      `- ${entry.explanation}`,
      `  Engine: ${entry.engine}`,
      `  Rows: ${entry.result.returnedRows}/${entry.result.totalMatchedRows}`,
      `  Order: ${entry.result.appliedOrderBy.length > 0 ? entry.result.appliedOrderBy.map((order) => `${order.column} ${order.direction}`).join(", ") : "none"}`,
      `  Preview rows:
${formatCompactRowSample(entry.result.previewRows)}`
    ].join("\n"))
  ].filter((value) => Boolean(value)).join("\n\n");
};
const buildVisibleEvidenceState = (state) => ({
  contextualSummary: state.contextualSummary ?? null,
  activeDataQuery: state.activeDataQuery ?? null,
  activeMetricMappingValidation: state.activeMetricMappingValidation ?? null,
  activeSpreadsheetFilter: state.activeSpreadsheetFilter ?? null,
  analysisCards: state.analysisCards ?? [],
  queryHistory: state.queryHistory ?? [],
  chatHistory: state.chatHistory ?? [],
  cleaningRun: state.cleaningRun ?? null,
  activeTurn: state.activeTurn ?? null
});
const formatCompactVisibleEvidenceSummary = (state, settings) => {
  var _a;
  const visibleEvidenceState = buildVisibleEvidenceState(state);
  const sections = [
    `Contextual summary:
${((_a = visibleEvidenceState.contextualSummary) == null ? void 0 : _a.trim()) || "No contextual summary yet."}`,
    `Latest runtime blocker:
${formatLatestRuntimeBlockerEvidence(visibleEvidenceState, settings)}`,
    `Cleaning runtime:
${formatCleaningRuntimeEvidence(visibleEvidenceState, settings)}`,
    `Active data query:
${formatActiveDataQueryEvidence(visibleEvidenceState)}`,
    `Active spreadsheet filter:
${formatActiveSpreadsheetFilterEvidence(visibleEvidenceState)}`,
    `Visible cards:
${formatAnalysisCardEvidence(visibleEvidenceState.analysisCards)}`,
    `Recent query trace:
${formatRecentQueryEvidence(visibleEvidenceState, settings)}`
  ];
  return sections.join("\n\n");
};
const formatVisibleTrace = (state, settings) => {
  var _a;
  const visibleEvidenceState = buildVisibleEvidenceState(state);
  const sections = [
    `Contextual summary:
${((_a = visibleEvidenceState.contextualSummary) == null ? void 0 : _a.trim()) || "No contextual summary yet."}`,
    `Latest runtime blocker:
${formatLatestRuntimeBlockerEvidence(visibleEvidenceState, settings)}`,
    `Cleaning runtime:
${formatCleaningRuntimeEvidence(visibleEvidenceState, settings)}`,
    `Recent query trace:
${formatRecentQueryEvidence(visibleEvidenceState, settings)}`
  ];
  return sections.join("\n\n");
};
const formatGroundedArtifacts = (state, settings) => {
  const visibleEvidenceState = buildVisibleEvidenceState(state);
  const sections = [
    `Active data query:
${formatActiveDataQueryEvidence(visibleEvidenceState)}`,
    `Active metric mapping validation:
${formatActiveMetricMappingValidationEvidence(visibleEvidenceState)}`,
    `Active spreadsheet filter:
${formatActiveSpreadsheetFilterEvidence(visibleEvidenceState)}`,
    `Visible cards:
${formatAnalysisCardEvidence(visibleEvidenceState.analysisCards)}`
  ];
  return sections.join("\n\n");
};
const formatDetailedRecentQueryTrace = (queryHistory, settings) => {
  const { toolOutputCutoff, maxSqlPreviewChars } = resolveLongSessionContextPolicy(settings);
  const recentEntries = queryHistory.slice(-toolOutputCutoff);
  const omittedCount = Math.max(0, queryHistory.length - recentEntries.length);
  if (recentEntries.length === 0) {
    return "No recent database queries.";
  }
  return [
    summarizeOlderToolOutputs(omittedCount, "database tool outputs"),
    ...recentEntries.map((entry) => `${getDataQueryTraceLabel(entry.phase, entry.plan)} | ${entry.explanation} | ${entry.engine} | rows ${entry.result.returnedRows}/${entry.result.totalMatchedRows} | ${entry.result.durationMs}ms${entry.fallbackReason ? ` | fallback: ${entry.fallbackReason}` : ""}${entry.sqlPreview ? `
SQL: ${truncateContextText(entry.sqlPreview, maxSqlPreviewChars)}` : ""}`)
  ].filter((value) => Boolean(value)).join("\n\n");
};
const formatRecentWorkspaceActionEvidence = (workspaceActionHistory, settings) => {
  const { toolOutputCutoff, maxWorkspaceActionChars } = resolveLongSessionContextPolicy(settings);
  const recentActions = workspaceActionHistory.slice(-toolOutputCutoff);
  const omittedCount = Math.max(0, workspaceActionHistory.length - recentActions.length);
  return [
    summarizeOlderToolOutputs(omittedCount, "workspace tool outputs"),
    ...recentActions.map((action) => {
      const timestamp = action.timestamp instanceof Date ? action.timestamp.toISOString() : String(action.timestamp);
      return `${timestamp} ${action.operation} ${action.path} ${action.success ? "ok" : "failed"}: ${truncateContextText(action.message, maxWorkspaceActionChars)}`;
    })
  ].filter((value) => Boolean(value)).join("\n") || "No recent workspace actions.";
};
const formatDatasetKnowledge = (datasetKnowledge) => {
  if (!datasetKnowledge) {
    return "DatasetKnowledge unavailable.";
  }
  const highValueDimensions = (Array.isArray(datasetKnowledge.highValueDimensions) ? datasetKnowledge.highValueDimensions : []).slice(0, 5).map((item) => `${item.name} (${item.reason})`).join("; ") || "None";
  const suspiciousMetrics = (Array.isArray(datasetKnowledge.suspiciousMetrics) ? datasetKnowledge.suspiciousMetrics : []).slice(0, 5).map((item) => `${item.name}: ${item.reason}`).join("; ") || "None";
  const recentInsights = (Array.isArray(datasetKnowledge.groupByInsights) ? datasetKnowledge.groupByInsights : []).slice(-5).map((insight) => {
    const groupBy = normalizeInsightGroupBy(insight);
    const groupByLabel = groupBy.join(", ") || "n/a";
    return `• ${groupByLabel} vs ${insight.metric || "value"} -> ${insight.verdict} (${insight.commentary || insight.dropReason || "no note"})`;
  }).join("\n") || "None";
  return [
    `Summary: ${datasetKnowledge.summary || "Dataset cleaned and analyzed."}`,
    `Rows: ${datasetKnowledge.facts.cleanedRowCount} of ${datasetKnowledge.facts.originalRowCount}, Columns: ${datasetKnowledge.facts.cleanedColumnCount}`,
    `Primary dimensions: ${datasetKnowledge.facts.primaryDimensions.join(", ") || "n/a"}`,
    `Primary metrics: ${datasetKnowledge.facts.primaryMetrics.join(", ") || "n/a"}`,
    `High-value dimensions: ${highValueDimensions}`,
    `Suspicious metrics: ${suspiciousMetrics}`,
    `Recent group-by insights:
${recentInsights}`
  ].join("\n");
};
const formatDataPreparationExplanation = (plan) => {
  var _a, _b, _c, _d, _e;
  if (!plan) {
    return "No AI-driven data preparation was performed.";
  }
  const numericStatus = plan.numericReconciliation ? plan.numericReconciliation.passed ? "passed" : "failed" : "not_run";
  const sqlPrecheckStatus = ((_a = plan.sqlPrecheck) == null ? void 0 : _a.status) ?? "not_run";
  const sqlPlannerAction = ((_c = (_b = plan.sqlPrecheck) == null ? void 0 : _b.plannerGuidance) == null ? void 0 : _c.nextAction) ?? "not_set";
  const preferredSqlPairs = ((_e = (_d = plan.sqlPrecheck) == null ? void 0 : _d.plannerGuidance) == null ? void 0 : _e.preferredPairs.length) ? plan.sqlPrecheck.plannerGuidance.preferredPairs.map((pair) => `${pair.metric} by ${pair.dimension}`).join(", ") : "n/a";
  return `Explanation: ${plan.explanation}
Numeric reconciliation: ${numericStatus}
SQL precheck: ${sqlPrecheckStatus}
SQL planner action: ${sqlPlannerAction}
Preferred SQL pairs: ${preferredSqlPairs}`;
};
const formatDataPreparationOperations = (plan) => {
  if (!plan || plan.operations.length === 0) return "";
  return `Operations Executed:
${plan.operations.map((operation) => `- ${operation.type}: ${operation.reason}`).join("\n")}`;
};
const formatDataPreparationCode = (plan) => {
  var _a;
  return ((_a = plan == null ? void 0 : plan.legacy) == null ? void 0 : _a.jsFunctionBody) ? `Legacy Code Preview:
\`\`\`javascript
${plan.legacy.jsFunctionBody}
\`\`\`` : "";
};
const getFallbackSoftPromptBudget = (callType) => FALLBACK_SOFT_PROMPT_BUDGETS[callType];
const resolveModelContextProfileSafely = (settings, modelId) => {
  if (typeof resolveModelContextProfile === "function") {
    return resolveModelContextProfile(settings, modelId);
  }
  return {
    contextWindow: null,
    reserveTokens: 0,
    keepRecentTokens: 0,
    strategy: "fallback_static"
  };
};
const resolvePromptBudgetProfile = (callType, modelProfile, compactionMode = "normal") => {
  let softBudget = getFallbackSoftPromptBudget(callType);
  const historyShare = HISTORY_SHARE_BY_CALL_TYPE[callType];
  if ((modelProfile == null ? void 0 : modelProfile.strategy) === "model_aware" && modelProfile.contextWindow !== null) {
    const availableTokens = Math.max(1, modelProfile.contextWindow - modelProfile.reserveTokens);
    if (callType === "chat") {
      softBudget = Math.min(CONTEXT_CHAT_SOFT_BUDGET_CAP, Math.max(12e3, Math.floor(availableTokens * 0.12)));
    } else if (callType === "planner" || callType === "tool" || callType === "data_prep" || callType === "next_step") {
      softBudget = Math.min(CONTEXT_PLANNER_SOFT_BUDGET_CAP, Math.max(8e3, Math.floor(availableTokens * 0.08)));
    } else if (callType === "summary" || callType === "goal" || callType === "insight") {
      softBudget = Math.min(CONTEXT_SUMMARY_SOFT_BUDGET_CAP, Math.max(4e3, Math.floor(availableTokens * 0.03)));
    } else {
      softBudget = Math.min(CONTEXT_RUNTIME_EVAL_SOFT_BUDGET_CAP, Math.max(2500, Math.floor(availableTokens * 0.02)));
    }
  }
  if (compactionMode === "overflow_retry") {
    softBudget = Math.max(2e3, Math.floor(softBudget * 0.6));
  }
  return {
    softBudget,
    historyShare,
    historyBudget: Math.max(500, Math.floor(softBudget * historyShare))
  };
};
const estimateTokens = (text) => Math.ceil(text.length / 4);
const getSoftPromptBudget = (callType, settings, modelId, compactionMode = "normal") => resolvePromptBudgetProfile(
  callType,
  settings && modelId ? resolveModelContextProfileSafely(settings, modelId) : void 0,
  compactionMode
).softBudget;
const createContextSection = (key, text, priority, bucket) => ({
  key,
  text,
  priority,
  bucket,
  estimatedTokens: estimateTokens(text)
});
const getPruneRank = (key) => {
  if (key === "workspace_actions") return 1;
  if (key === "long_term_memory") return 2;
  if (key === "related_cards") return 3;
  if (key === "card_context") return 4;
  if (key === "recent_query_trace") return 5;
  if (key === "observe_data_sample") return 6;
  if (key === "recent_history") return 7;
  if (key === "raw_data_sample") return 8;
  if (key === "data_prep_code") return 9;
  return 10;
};
const recalculateTokens = (systemText, baseUserText, sections) => estimateTokens(systemText) + estimateTokens(baseUserText) + sections.reduce((sum, section) => sum + section.estimatedTokens, 0);
const isHistorySection = (key) => HISTORY_SECTION_KEYS.has(key);
const buildRecentTail$1 = (text, keepRecentTokens) => {
  const keepChars = Math.max(400, keepRecentTokens * 4);
  if (text.length <= keepChars) {
    return text.trim();
  }
  const tail = text.slice(-keepChars).trim();
  return `Earlier content compacted. Keep the most recent details below.
...
${tail}`;
};
const buildSectionCollapsedText = (section, collapsedSections, keepRecentTokens) => {
  var _a;
  const explicit = (_a = collapsedSections == null ? void 0 : collapsedSections[section.key]) == null ? void 0 : _a.trim();
  if (explicit && normalizeText(explicit) !== normalizeText(section.text)) {
    return explicit;
  }
  if (section.key === "recent_history" || section.key === "recent_query_trace") {
    const compacted = buildRecentTail$1(section.text, keepRecentTokens);
    return normalizeText(compacted) === normalizeText(section.text) ? null : compacted;
  }
  if (isHistorySection(section.key)) {
    const compacted = buildRecentTail$1(section.text, Math.max(300, Math.floor(keepRecentTokens / 2)));
    return normalizeText(compacted) === normalizeText(section.text) ? null : compacted;
  }
  return null;
};
const collapseSectionAtIndex = (includedSections, index, usedCollapsedSections, collapsedSections, keepRecentTokens) => {
  const section = includedSections[index];
  const collapsedText = buildSectionCollapsedText(section, collapsedSections, keepRecentTokens);
  if (!collapsedText) {
    return false;
  }
  includedSections[index] = createContextSection(
    section.key,
    collapsedText,
    section.priority,
    section.bucket
  );
  if (!usedCollapsedSections.includes(section.key)) {
    usedCollapsedSections.push(section.key);
  }
  return true;
};
const pruneHistorySectionsToBudget = ({
  systemText,
  baseUserText,
  includedSections,
  droppedSections,
  usedCollapsedSections,
  historyBudget,
  collapsedSections,
  keepRecentTokens,
  compactionMode,
  deferHistoryDrop = false
}) => {
  let historyPruneApplied = false;
  const shouldForceHistoryDrop = compactionMode === "overflow_retry";
  const historyDropCutoff = 3;
  const calculateHistoryTokens = () => includedSections.filter((section) => isHistorySection(section.key)).reduce((sum, section) => sum + section.estimatedTokens, 0);
  let historyTokens = calculateHistoryTokens();
  while (historyTokens > historyBudget) {
    const candidates = includedSections.map((section, index) => ({ index, section })).filter(({ section }) => isHistorySection(section.key)).sort((a, b) => getPruneRank(a.section.key) - getPruneRank(b.section.key));
    if (candidates.length === 0) {
      break;
    }
    historyPruneApplied = true;
    const candidate = candidates[0];
    const collapsed = collapseSectionAtIndex(
      includedSections,
      candidate.index,
      usedCollapsedSections,
      collapsedSections,
      keepRecentTokens
    );
    if (!collapsed) {
      if (deferHistoryDrop && !shouldForceHistoryDrop) {
        break;
      }
      includedSections.splice(candidate.index, 1);
      droppedSections.push({ key: candidate.section.key, reason: "budget" });
    } else if (shouldForceHistoryDrop && getPruneRank(candidate.section.key) <= historyDropCutoff) {
      includedSections.splice(candidate.index, 1);
      droppedSections.push({ key: candidate.section.key, reason: "budget" });
    }
    historyTokens = calculateHistoryTokens();
  }
  return {
    historyPruneApplied,
    promptTokens: recalculateTokens(systemText, baseUserText, includedSections)
  };
};
const applyCollapsedSubstitutionsToBudget = ({
  systemText,
  baseUserText,
  includedSections,
  droppedSections,
  usedCollapsedSections,
  softBudget,
  collapsedSections,
  keepRecentTokens
}) => {
  let promptTokens = recalculateTokens(systemText, baseUserText, includedSections);
  while (promptTokens > softBudget) {
    const candidate = includedSections.map((section, index) => ({ index, section })).filter(({ section }) => section.bucket === "prunable").sort((a, b) => getPruneRank(a.section.key) - getPruneRank(b.section.key)).find(({ index }) => collapseSectionAtIndex(
      includedSections,
      index,
      usedCollapsedSections,
      collapsedSections,
      keepRecentTokens
    ));
    if (!candidate) {
      break;
    }
    promptTokens = recalculateTokens(systemText, baseUserText, includedSections);
  }
  return promptTokens;
};
const dropSectionsToBudget = ({
  systemText,
  baseUserText,
  includedSections,
  droppedSections,
  softBudget
}) => {
  let promptTokens = recalculateTokens(systemText, baseUserText, includedSections);
  while (promptTokens > softBudget) {
    const candidates = includedSections.map((section, index) => ({ index, section })).filter(({ section }) => section.bucket === "prunable").sort((a, b) => getPruneRank(a.section.key) - getPruneRank(b.section.key));
    if (candidates.length === 0) {
      break;
    }
    const candidate = candidates[0];
    includedSections.splice(candidate.index, 1);
    droppedSections.push({ key: candidate.section.key, reason: "budget" });
    promptTokens = recalculateTokens(systemText, baseUserText, includedSections);
  }
  return promptTokens;
};
const buildManagedContext = ({
  callType,
  systemText,
  baseUserText,
  sections,
  collapsedSections,
  settings,
  modelId,
  compactionMode = "normal",
  deferPrunableDrop = false
}) => {
  const droppedSections = [];
  const seen = [normalizeText(systemText), normalizeText(baseUserText)];
  const includedSections = [];
  const usedCollapsedSections = [];
  for (const section of sections) {
    const trimmed = section.text.trim();
    const normalized = normalizeText(trimmed);
    if (!normalized) {
      droppedSections.push({ key: section.key, reason: "empty" });
      continue;
    }
    const isDuplicate = normalized.length > 24 && seen.some((previous) => previous.includes(normalized) || normalized.includes(previous));
    if (isDuplicate) {
      droppedSections.push({ key: section.key, reason: "duplicate" });
      continue;
    }
    seen.push(normalized);
    includedSections.push({
      ...section,
      text: trimmed,
      estimatedTokens: estimateTokens(trimmed)
    });
  }
  const modelProfile = settings && modelId ? resolveModelContextProfileSafely(settings, modelId) : {
    contextWindow: null,
    reserveTokens: 0,
    keepRecentTokens: 0,
    strategy: "fallback_static"
  };
  const budgetProfile = resolvePromptBudgetProfile(callType, modelProfile, compactionMode);
  const keepRecentTokens = modelProfile.keepRecentTokens || 4e3;
  const historyResult = pruneHistorySectionsToBudget({
    systemText,
    baseUserText,
    includedSections,
    droppedSections,
    usedCollapsedSections,
    historyBudget: budgetProfile.historyBudget,
    collapsedSections,
    keepRecentTokens,
    compactionMode,
    deferHistoryDrop: deferPrunableDrop
  });
  let promptTokens = applyCollapsedSubstitutionsToBudget({
    systemText,
    baseUserText,
    includedSections,
    droppedSections,
    usedCollapsedSections,
    softBudget: budgetProfile.softBudget,
    collapsedSections,
    keepRecentTokens
  });
  if (!deferPrunableDrop) {
    promptTokens = dropSectionsToBudget({
      systemText,
      baseUserText,
      includedSections,
      droppedSections,
      softBudget: budgetProfile.softBudget
    });
  }
  const diagnostics = {
    callType,
    estimatedPromptTokens: promptTokens,
    systemPromptChars: systemText.length,
    userPromptChars: [baseUserText, ...includedSections.map((section) => section.text)].join("\n\n").length,
    budget: budgetProfile.softBudget,
    softBudget: budgetProfile.softBudget,
    historyBudget: budgetProfile.historyBudget,
    contextWindow: modelProfile.contextWindow,
    budgetStrategy: modelProfile.strategy,
    reserveTokens: modelProfile.reserveTokens,
    keepRecentTokens,
    includedSectionKeys: includedSections.map((section) => section.key),
    droppedSectionKeys: droppedSections.map((section) => section.key),
    droppedSections,
    usedCollapsedSections,
    collapsedSectionKeys: [...usedCollapsedSections],
    historyPruneApplied: historyResult.historyPruneApplied,
    compactionMode,
    overflowRetryTriggered: compactionMode === "overflow_retry",
    summaryRefreshTriggered: false,
    stagedSummaryParts: 0,
    compactionTriggered: historyResult.historyPruneApplied || usedCollapsedSections.length > 0 || droppedSections.some((section) => section.reason === "budget")
  };
  return {
    systemText,
    userText: [baseUserText, ...includedSections.map((section) => section.text)].join("\n\n"),
    includedSections,
    droppedSections,
    estimatedPromptTokens: diagnostics.estimatedPromptTokens,
    diagnostics
  };
};
const buildContextDetail = (diagnostics, stage) => `${stage} | ${diagnostics.callType} | ${diagnostics.estimatedPromptTokens}/${diagnostics.softBudget} tokens`;
const buildContextMeta = (diagnostics) => ({
  callType: diagnostics.callType,
  estimatedPromptTokens: diagnostics.estimatedPromptTokens,
  systemPromptChars: diagnostics.systemPromptChars,
  userPromptChars: diagnostics.userPromptChars,
  budget: diagnostics.budget,
  softBudget: diagnostics.softBudget,
  historyBudget: diagnostics.historyBudget,
  contextWindow: diagnostics.contextWindow,
  budgetStrategy: diagnostics.budgetStrategy,
  reserveTokens: diagnostics.reserveTokens,
  keepRecentTokens: diagnostics.keepRecentTokens,
  includedSectionKeys: diagnostics.includedSectionKeys,
  droppedSectionKeys: diagnostics.droppedSectionKeys,
  droppedSections: diagnostics.droppedSections,
  usedCollapsedSections: diagnostics.usedCollapsedSections,
  collapsedSectionKeys: diagnostics.collapsedSectionKeys,
  historyPruneApplied: diagnostics.historyPruneApplied,
  compactionMode: diagnostics.compactionMode,
  overflowRetryTriggered: diagnostics.overflowRetryTriggered,
  summaryRefreshTriggered: diagnostics.summaryRefreshTriggered,
  stagedSummaryParts: diagnostics.stagedSummaryParts,
  compactionTriggered: diagnostics.compactionTriggered
});
const buildFallbackContextDiagnostics = ({
  callType,
  text,
  settings,
  modelId,
  compactionMode = "normal"
}) => {
  const modelProfile = settings && modelId ? resolveModelContextProfileSafely(settings, modelId) : {
    contextWindow: null,
    reserveTokens: 0,
    keepRecentTokens: 0,
    strategy: "fallback_static"
  };
  const budgetProfile = resolvePromptBudgetProfile(callType, modelProfile, compactionMode);
  const keepRecentTokens = modelProfile.keepRecentTokens || 4e3;
  return {
    callType,
    estimatedPromptTokens: estimateTokens(text),
    systemPromptChars: 0,
    userPromptChars: text.length,
    budget: budgetProfile.softBudget,
    softBudget: budgetProfile.softBudget,
    historyBudget: budgetProfile.historyBudget,
    contextWindow: modelProfile.contextWindow,
    budgetStrategy: modelProfile.strategy,
    reserveTokens: modelProfile.reserveTokens,
    keepRecentTokens,
    includedSectionKeys: [],
    droppedSectionKeys: [],
    droppedSections: [],
    usedCollapsedSections: [],
    collapsedSectionKeys: [],
    historyPruneApplied: false,
    compactionMode,
    overflowRetryTriggered: compactionMode === "overflow_retry",
    summaryRefreshTriggered: false,
    stagedSummaryParts: 0,
    compactionTriggered: true
  };
};
const OPENAI_OVERFLOW_PATTERNS = [
  "context_length_exceeded",
  "maximum context length",
  "prompt too long",
  "too many tokens"
];
const GOOGLE_OVERFLOW_PATTERNS = [
  "token count",
  "input token limit",
  "request too large",
  "context window"
];
const getErrorMessage = (error) => {
  if (error instanceof Error) {
    return error.message.toLowerCase();
  }
  if (typeof error === "string") {
    return error.toLowerCase();
  }
  return String(error).toLowerCase();
};
const isContextOverflowError = (provider, error) => {
  const message = getErrorMessage(error);
  const patterns = provider === "openai" ? OPENAI_OVERFLOW_PATTERNS : GOOGLE_OVERFLOW_PATTERNS;
  return patterns.some((pattern) => message.includes(pattern));
};
const runWithOverflowCompaction = async ({
  provider,
  execute,
  abortSignal
}) => {
  throwIfAborted(abortSignal);
  try {
    return await execute("normal");
  } catch (error) {
    if (isRuntimeAbortError(error, abortSignal)) {
      throw error;
    }
    if (!isContextOverflowError(provider, error)) {
      throw error;
    }
    throwIfAborted(abortSignal);
    return execute("overflow_retry");
  }
};
const lastCompactedMessageCountBySession = /* @__PURE__ */ new Map();
const canTriggerSummaryRefresh = (callType) => callType !== "summary" && callType !== "runtime_eval";
const shouldRefreshContextualSummary = (sessionId, chatMessageCount) => {
  const lastCount = lastCompactedMessageCountBySession.get(sessionId) ?? 0;
  if (lastCount === 0) {
    return chatMessageCount > CONTEXT_SUMMARY_TRIGGER_LENGTH;
  }
  return chatMessageCount - lastCount >= CONTEXT_SUMMARY_REFRESH_DELTA;
};
const markContextualSummaryRefreshed = (sessionId, chatMessageCount) => {
  lastCompactedMessageCountBySession.set(sessionId, chatMessageCount);
};
const buildRecentTail = (text, keepRecentTokens) => {
  const keepChars = Math.max(400, keepRecentTokens * 4);
  if (text.length <= keepChars) {
    return text.trim();
  }
  const tail = text.slice(-keepChars).trim();
  return `Earlier content compacted. Keep the most recent details below.
...
${tail}`;
};
const buildDeterministicCompactionSummary = (sections) => sections.slice(-6).map((section) => {
  const compacted = buildRecentTail(section.text, 600);
  return `${section.key}:
${compacted}`;
}).join("\n\n").slice(0, 2200);
const splitCompactionSectionsIntoChunks = (sections, maxChunkTokens) => {
  if (sections.length === 0) {
    return [];
  }
  const chunks = [];
  let currentChunk = [];
  let currentTokens = 0;
  for (const section of sections) {
    const sectionTokens = estimateTokens(section.text);
    if (currentChunk.length > 0 && currentTokens + sectionTokens > maxChunkTokens && chunks.length < CONTEXT_COMPACTION_SUMMARY_MAX_PARTS - 1) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentTokens = 0;
    }
    currentChunk.push(section);
    currentTokens += sectionTokens;
  }
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }
  return chunks;
};
const summarizeCompactionChunk = async ({
  settings,
  modelId,
  chunkText,
  previousSummary
}) => {
  const { model } = createProviderModel(settings, modelId);
  const messages = [
    {
      role: "system",
      content: `You compact prompt context for future AI calls. Preserve user goals, current work, visible evidence, tool failures, explicit identifiers, dataset columns, and the latest requested follow-up. Return concise Markdown in ${settings.language}.`
    },
    {
      role: "user",
      content: [
        previousSummary ? `Previous compacted summary:
${previousSummary}` : "",
        "Condense the following context while preserving recent facts and explicit identifiers.",
        chunkText
      ].filter(Boolean).join("\n\n")
    }
  ];
  const result = await withTransientRetry(
    (fb) => streamGenerateText({ model: fb ?? model, messages }),
    { settings, primaryModelId: modelId, label: "compactionChunk" }
  );
  return result.text.trim();
};
const COMPACTION_TIMEOUT_MS = 3e4;
const generateCompactionSummaryCore = async ({
  settings,
  modelId,
  sections
}) => {
  const fallback = buildDeterministicCompactionSummary(sections);
  const summaryBudget = getSoftPromptBudget("summary", settings, modelId);
  const maxChunkTokens = Math.max(
    600,
    Math.floor((summaryBudget - CONTEXT_COMPACTION_SUMMARY_OVERHEAD_TOKENS) / CONTEXT_COMPACTION_SAFETY_MARGIN)
  );
  const chunks = splitCompactionSectionsIntoChunks(sections, maxChunkTokens);
  if (chunks.length === 0) {
    return {
      summary: fallback,
      usedFallback: true,
      stagedSummaryParts: 0
    };
  }
  const partialSummaries = [];
  for (const chunk of chunks) {
    const chunkText = chunk.map((section) => `${section.key}:
${section.text}`).join("\n\n");
    const partial = await summarizeCompactionChunk({
      settings,
      modelId,
      chunkText
    });
    partialSummaries.push(partial || buildDeterministicCompactionSummary(chunk));
  }
  if (partialSummaries.length === 1) {
    return {
      summary: partialSummaries[0],
      usedFallback: false,
      stagedSummaryParts: 1
    };
  }
  const merged = await summarizeCompactionChunk({
    settings,
    modelId,
    chunkText: partialSummaries.map((summary, index) => `Part ${index + 1}:
${summary}`).join("\n\n")
  });
  return {
    summary: merged || partialSummaries.join("\n\n"),
    usedFallback: false,
    stagedSummaryParts: partialSummaries.length
  };
};
const generateCompactionSummary = async ({
  settings,
  modelId,
  sections
}) => {
  const fallback = buildDeterministicCompactionSummary(sections);
  if (!isProviderConfigured(settings)) {
    return { summary: fallback, usedFallback: true, stagedSummaryParts: 0 };
  }
  try {
    const result = await Promise.race([
      generateCompactionSummaryCore({ settings, modelId, sections }),
      new Promise(
        (_, reject) => setTimeout(() => reject(new Error("Compaction timeout")), COMPACTION_TIMEOUT_MS)
      )
    ]);
    return result;
  } catch (error) {
    console.warn("[ContextSummary] Compaction failed or timed out, using deterministic fallback:", error);
    return { summary: fallback, usedFallback: true, stagedSummaryParts: 0 };
  }
};
const buildDeterministicContextualSummary = ({
  confirmedGoal,
  aiCoreAnalysisSummary,
  datasetKnowledge,
  chatHistory,
  analysisCards
}) => {
  const latestMessages = chatHistory.slice(-4).map((message) => `${message.sender === "ai" ? "Assistant" : "User"}: ${message.text}`).join(" | ") || "No recent messages.";
  return [
    `Goal: ${confirmedGoal || "No confirmed goal yet."}`,
    `Dataset: ${(datasetKnowledge == null ? void 0 : datasetKnowledge.summary) || aiCoreAnalysisSummary || "No dataset summary available."}`,
    `Cards: ${formatCardTitles(analysisCards)}`,
    `Recent messages: ${latestMessages}`
  ].join("\n");
};
const generateContextualSummary = async ({
  settings,
  confirmedGoal,
  aiCoreAnalysisSummary,
  contextualSummary,
  datasetKnowledge,
  chatHistory,
  analysisCards,
  telemetryTarget
}) => {
  const { prepareManagedContext: prepareManagedContext2, reportContextDiagnostics: reportContextDiagnostics2, reportContextCompaction: reportContextCompaction2 } = await __vitePreload(async () => {
    const { prepareManagedContext: prepareManagedContext3, reportContextDiagnostics: reportContextDiagnostics3, reportContextCompaction: reportContextCompaction3 } = await Promise.resolve().then(() => contextManager);
    return { prepareManagedContext: prepareManagedContext3, reportContextDiagnostics: reportContextDiagnostics3, reportContextCompaction: reportContextCompaction3 };
  }, true ? void 0 : void 0, import.meta.url);
  const fallback = buildDeterministicContextualSummary({
    confirmedGoal,
    aiCoreAnalysisSummary,
    datasetKnowledge,
    chatHistory,
    analysisCards
  });
  let diagnostics = null;
  if (!isProviderConfigured(settings)) {
    reportContextCompaction2(
      telemetryTarget,
      diagnostics ?? buildFallbackContextDiagnostics({
        callType: "summary",
        text: fallback,
        settings,
        modelId: settings.simpleModel
      }),
      {
        usedFallback: true,
        reason: "fallback_no_api_key",
        summaryLength: fallback.length
      }
    );
    return { summary: fallback, usedFallback: true, diagnostics };
  }
  try {
    const systemText = `You create a short working-memory summary for future AI calls. Return concise Markdown with only these fields: Goal, Dataset, Decisions, Cards, Open Questions. Keep it under 220 words and in ${settings.language}. Tool execution failures, tool restriction messages, and blocked-tool errors from previous turns are transient operational details — do not carry them forward as current-session constraints. Focus on what the user wants, what data is available, and what analysis has been completed.`;
    const { model, modelId } = createProviderModel(settings, settings.simpleModel);
    const result = await runWithOverflowCompaction({
      provider: settings.provider,
      execute: async (compactionMode) => {
        const managed = await prepareManagedContext2({
          callType: "summary",
          systemText,
          baseUserText: "Create a compact session summary for reuse in future prompts.",
          sections: [
            createContextSection("current_goal", `Current goal:
${confirmedGoal || "No confirmed goal yet."}`, "required", "sticky"),
            createContextSection("dataset_knowledge", `Dataset knowledge:
${formatDatasetKnowledge(datasetKnowledge)}`, "high", "sticky"),
            createContextSection("core_analysis", `Core analysis briefing:
${aiCoreAnalysisSummary || "No core analysis summary."}`, "high", "sticky"),
            createContextSection("existing_contextual_summary", `Existing contextual summary:
${contextualSummary || "None yet."}`, "medium", "sticky"),
            createContextSection("card_titles", `Cards on screen:
${formatCardTitles(analysisCards)}`, "medium", "prunable"),
            createContextSection("recent_history", `Recent conversation:
${formatCollapsedChatHistory(chatHistory, settings)}`, "high", "prunable")
          ],
          settings,
          modelId,
          compactionMode
        });
        diagnostics = managed.diagnostics;
        reportContextDiagnostics2(telemetryTarget, diagnostics);
        const msgs = [
          { role: "system", content: managed.systemText },
          { role: "user", content: managed.userText }
        ];
        try {
          return await streamGenerateText({ model, messages: msgs });
        } catch (primaryErr) {
          if (isTransientProviderError(primaryErr)) {
            const fb = createFallbackProviderModel(settings, modelId);
            if (fb) {
              console.warn(`[ContextSummary] Primary model "${modelId}" transient error, retrying with fallback "${fb.modelId}"`);
              return streamGenerateText({ model: fb.model, messages: msgs });
            }
          }
          throw primaryErr;
        }
      }
    });
    const summary = result.text || fallback;
    const usedFallback = !result.text;
    reportContextCompaction2(telemetryTarget, diagnostics, {
      usedFallback,
      reason: usedFallback ? "fallback_empty_response" : "ai",
      summaryLength: summary.length
    });
    return { summary, usedFallback, diagnostics };
  } catch (error) {
    console.error("Failed to generate contextual summary:", error);
    reportContextCompaction2(
      telemetryTarget,
      diagnostics ?? buildFallbackContextDiagnostics({
        callType: "summary",
        text: fallback,
        settings,
        modelId: settings.simpleModel
      }),
      {
        usedFallback: true,
        reason: "fallback_error",
        summaryLength: fallback.length
      }
    );
    return { summary: fallback, usedFallback: true, diagnostics };
  }
};
const FALLBACK_SOFT_PROMPT_BUDGETS = {
  chat: 7e3,
  planner: 5e3,
  tool: 5e3,
  data_prep: 5e3,
  next_step: 5e3,
  runtime_eval: 2500,
  summary: 3500,
  goal: 3500,
  insight: 3500
};
const HISTORY_SHARE_BY_CALL_TYPE = {
  chat: 0.45,
  planner: 0.45,
  tool: 0.45,
  data_prep: 0.45,
  next_step: 0.45,
  runtime_eval: 0.2,
  summary: 0.35,
  goal: 0.35,
  insight: 0.35
};
const HISTORY_SECTION_KEYS = /* @__PURE__ */ new Set([
  "workspace_actions",
  "long_term_memory",
  "related_cards",
  "card_context",
  "recent_query_trace",
  "recent_history"
]);
const truncateContextText = (text, maxChars) => text.length <= maxChars ? text : `${text.slice(0, maxChars)}... [truncated]`;
const prepareManagedContext = async ({
  callType,
  systemText,
  baseUserText,
  sections,
  collapsedSections,
  settings,
  modelId,
  compactionMode = "normal"
}) => {
  const initial = buildManagedContext({
    callType,
    systemText,
    baseUserText,
    sections,
    collapsedSections,
    settings,
    modelId,
    compactionMode,
    deferPrunableDrop: canTriggerSummaryRefresh(callType)
  });
  if (!canTriggerSummaryRefresh(callType) || initial.estimatedPromptTokens <= initial.diagnostics.softBudget) {
    return canTriggerSummaryRefresh(callType) ? buildManagedContext({
      callType,
      systemText,
      baseUserText,
      sections,
      collapsedSections,
      settings,
      modelId,
      compactionMode
    }) : initial;
  }
  const isHistorySection2 = (key) => HISTORY_SECTION_KEYS.has(key);
  const historySections = initial.includedSections.filter((section) => isHistorySection2(section.key));
  if (historySections.length === 0) {
    return buildManagedContext({
      callType,
      systemText,
      baseUserText,
      sections,
      collapsedSections,
      settings,
      modelId,
      compactionMode
    });
  }
  const compactionSummary = await generateCompactionSummary({
    settings,
    modelId,
    sections: historySections
  });
  const rebuilt = buildManagedContext({
    callType,
    systemText,
    baseUserText,
    sections: [
      ...sections.filter((section) => !isHistorySection2(section.key)),
      createContextSection(
        "compacted_history_summary",
        `Compacted history summary:
${compactionSummary.summary}`,
        "high",
        "sticky"
      )
    ],
    collapsedSections,
    settings,
    modelId,
    compactionMode
  });
  rebuilt.diagnostics.summaryRefreshTriggered = true;
  rebuilt.diagnostics.stagedSummaryParts = compactionSummary.stagedSummaryParts;
  rebuilt.diagnostics.compactionTriggered = true;
  rebuilt.estimatedPromptTokens = rebuilt.diagnostics.estimatedPromptTokens;
  return rebuilt;
};
const reportContextDiagnostics = (target, diagnostics) => {
  var _a, _b;
  const stage = "context_prepared";
  const detail = buildContextDetail(diagnostics, stage);
  const meta = buildContextMeta(diagnostics);
  debugLog(stage, meta);
  (_a = target == null ? void 0 : target.logTelemetryEvent) == null ? void 0 : _a.call(target, {
    stage,
    responseType: diagnostics.callType,
    detail,
    meta
  });
  (_b = target == null ? void 0 : target.logAgentToolUsage) == null ? void 0 : _b.call(target, {
    tool: "context_manager",
    description: `Prepared ${diagnostics.callType} context`,
    detail: meta
  });
};
const reportContextCompaction = (target, diagnostics, options) => {
  var _a, _b, _c;
  const stage = "context_compacted";
  const diagnosticPayload = {
    ...diagnostics,
    compactionTriggered: true
  };
  const meta = {
    ...buildContextMeta(diagnosticPayload),
    usedFallback: options.usedFallback,
    compactionReason: options.reason,
    summaryLength: options.summaryLength
  };
  const detail = `${stage} | ${diagnosticPayload.callType} | ${options.usedFallback ? "fallback" : "ai"} | ${options.summaryLength} chars`;
  debugLog(stage, meta);
  (_a = target == null ? void 0 : target.logTelemetryEvent) == null ? void 0 : _a.call(target, {
    stage,
    responseType: diagnosticPayload.callType,
    detail,
    meta
  });
  (_b = target == null ? void 0 : target.logAgentToolUsage) == null ? void 0 : _b.call(target, {
    tool: "context_manager",
    description: `Compacted ${diagnosticPayload.callType} context`,
    detail: meta
  });
  (_c = target == null ? void 0 : target.recordAgentEvent) == null ? void 0 : _c.call(target, {
    phase: "chat",
    step: stage,
    status: "done",
    message: options.usedFallback ? "Contextual summary refreshed with deterministic fallback." : "Contextual summary refreshed with AI compaction.",
    detail: meta
  });
};
const contextManager = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  FALLBACK_SOFT_PROMPT_BUDGETS,
  HISTORY_SECTION_KEYS,
  HISTORY_SHARE_BY_CALL_TYPE,
  buildContextDetail,
  buildContextMeta,
  buildDeterministicContextualSummary,
  buildFallbackContextDiagnostics,
  buildManagedContext,
  createContextSection,
  estimateTokens,
  formatCardContext,
  formatCardTitles,
  formatCollapsedChatHistory,
  formatColumnNames,
  formatColumnProfiles,
  formatColumnQualitySummary,
  formatCompactVisibleEvidenceSummary,
  formatDataPreparationCode,
  formatDataPreparationExplanation,
  formatDataPreparationOperations,
  formatDatasetKnowledge,
  formatDetailedRecentQueryTrace,
  formatGroundedArtifacts,
  formatLongTermMemory,
  formatRecentWorkspaceActionEvidence,
  formatRelatedCards,
  formatRows,
  formatSanitizedTranscript,
  formatVisibleTrace,
  generateContextualSummary,
  getSoftPromptBudget,
  inferContextVisibility,
  markContextualSummaryRefreshed,
  prepareManagedContext,
  reportContextCompaction,
  reportContextDiagnostics,
  sanitizeChatHistoryForModel,
  shouldRefreshContextualSummary,
  trimAnalysisCards,
  trimCardContext,
  trimMemoryHits,
  trimRawDataSample,
  trimRelatedCards,
  trimSanitizedTranscript,
  truncateContextText
}, Symbol.toStringTag, { value: "Module" }));
const formatRow = (row) => `Row ${row.rowIndex}: ${row.cells.map((cell) => cell.trim().slice(0, 60)).join(" | ")}`;
const reportStructureProposalSystemPrompt = "You normalize report-style CSV tables into analysis-ready detail rows. Return exactly one schema-valid JSON object. Use only the visible boundary, header, and row evidence. Prefer conservative detail inclusion and lower confidence when uncertain.";
const formatReportStructureProposalPrompt = (params) => `
Review the report structure evidence and propose a normalization plan for canonical detail rows.

Return:
- bodyRowRoles
- carryForwardColumns
- sectionLabelColumns
- detailInclusionRoles
- confidence
- reasoning

Decision contract:
- Only propose carry-forward for parent dimension fields such as order date, buyer confirmation/invoice, or payment terms.
- Never propose carry-forward for quantities, prices, amounts, totals, margins, commissions, or other numeric fact columns.
- Use bodyRowRoles only for rows visible in the evidence.
- Group headers, notes, subtotals, summaries, and footers must stay out of canonical detail rows.
- detailInclusionRoles should stay minimal. Prefer ['detail'] unless the evidence strongly supports otherwise.
- If the structure is ambiguous, keep arrays minimal and lower confidence instead of guessing.

## Resolved Boundary
${params.boundarySummary}

## Merged Headers
${params.mergedHeaders.map((header) => `- ${header}`).join("\n")}

## Deterministic Row Inspection
${params.rowInspectionSummary}

## Sampled Raw Rows
${params.sampledRows.map(formatRow).join("\n")}
`;
const LOG_PREFIX$2 = "[ReportStructureProposal]";
const MAX_HEAD_BODY_ROWS = 18;
const MAX_TAIL_ROWS = 6;
const formatBoundarySummary = (boundary, runtimeTableAssessment) => [
  `headerRowIndex: ${boundary.headerRowIndex ?? "unknown"}`,
  `headerLayerRowIndexes: [${boundary.headerLayerRowIndexes.join(", ")}]`,
  `bodyStartIndex: ${boundary.bodyStartIndex ?? "unknown"}`,
  `summaryStartIndex: ${boundary.summaryStartIndex ?? "none"}`,
  `parameterRowIndexes: [${boundary.parameterRowIndexes.join(", ")}]`,
  `repeatedHeaderRowIndexes: [${boundary.repeatedHeaderRowIndexes.join(", ")}]`,
  runtimeTableAssessment ? `runtimeTableAssessment: ${runtimeTableAssessment.status}; requiresReshape=${runtimeTableAssessment.requiresReshape}; reason=${runtimeTableAssessment.reason}` : "runtimeTableAssessment: unavailable"
].join("\n");
const formatRowInspectionSummary = (rowInspection) => {
  if (!rowInspection) {
    return "No deterministic row inspection bundle is available.";
  }
  return [
    `totalRows: ${rowInspection.totalRows}`,
    `detail: ${rowInspection.countsByRole.detail ?? 0}`,
    `group_header: ${rowInspection.countsByRole.group_header ?? 0}`,
    `summary_like: ${rowInspection.countsByRole.summary_like ?? 0}`,
    `note: ${rowInspection.countsByRole.note ?? 0}`,
    `blank: ${rowInspection.countsByRole.blank ?? 0}`
  ].join("\n");
};
const MAX_AMBIGUOUS_INJECT_ROWS = 4;
const buildSampledRows = (rawIntakeIr, boundary, rowInspection) => {
  const bodyStart = boundary.bodyStartIndex ?? 0;
  const summaryStart = boundary.summaryStartIndex ?? rawIntakeIr.normalizedRows.length;
  const bodyRows = rawIntakeIr.normalizedRows.slice(bodyStart, summaryStart);
  const sampled = bodyRows.slice(0, MAX_HEAD_BODY_ROWS).map((cells, index) => ({ rowIndex: bodyStart + index, cells: cells.map(normalizeReportCellText) }));
  const tailStart = Math.max(bodyStart + MAX_HEAD_BODY_ROWS, summaryStart - MAX_TAIL_ROWS);
  for (let rowIndex = tailStart; rowIndex < summaryStart; rowIndex += 1) {
    const cells = rawIntakeIr.normalizedRows[rowIndex];
    if (!cells) {
      continue;
    }
    sampled.push({
      rowIndex,
      cells: cells.map(normalizeReportCellText)
    });
  }
  const summaryRow = boundary.summaryStartIndex !== null ? rawIntakeIr.normalizedRows[boundary.summaryStartIndex] : null;
  if (summaryRow) {
    sampled.push({
      rowIndex: boundary.summaryStartIndex,
      cells: summaryRow.map(normalizeReportCellText)
    });
  }
  if (rowInspection) {
    const sampledIndexes = new Set(sampled.map((row) => row.rowIndex));
    const ambiguousIndexes = [
      ...rowInspection.residualUnknownRowIndexes ?? [],
      ...rowInspection.residualSummaryLikeRowIndexes ?? []
    ].filter((idx) => !sampledIndexes.has(idx) && idx >= bodyStart && idx < summaryStart);
    for (const idx of ambiguousIndexes.slice(0, MAX_AMBIGUOUS_INJECT_ROWS)) {
      const cells = rawIntakeIr.normalizedRows[idx];
      if (cells) {
        sampled.push({ rowIndex: idx, cells: cells.map(normalizeReportCellText) });
      }
    }
  }
  const seen = /* @__PURE__ */ new Set();
  return sampled.filter((row) => {
    if (seen.has(row.rowIndex)) {
      return false;
    }
    seen.add(row.rowIndex);
    return true;
  });
};
const normalizeProposal = (value) => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const raw = value;
  if (!Array.isArray(raw.carryForwardColumns) || !Array.isArray(raw.sectionLabelColumns) || !Array.isArray(raw.detailInclusionRoles)) {
    return null;
  }
  if (typeof raw.confidence !== "number" || typeof raw.reasoning !== "string" || !Array.isArray(raw.bodyRowRoles)) {
    return null;
  }
  return {
    bodyRowRoles: raw.bodyRowRoles.filter((candidate) => candidate && typeof candidate.rowIndex === "number" && typeof candidate.role === "string" && typeof candidate.confidence === "number").map((candidate) => ({
      rowIndex: candidate.rowIndex,
      role: candidate.role,
      confidence: candidate.confidence,
      notes: Array.isArray(candidate.notes) ? candidate.notes.filter((note) => typeof note === "string") : void 0
    })),
    carryForwardColumns: raw.carryForwardColumns.filter((column) => typeof column === "string"),
    sectionLabelColumns: raw.sectionLabelColumns.filter((column) => typeof column === "string"),
    detailInclusionRoles: raw.detailInclusionRoles.filter((role) => typeof role === "string"),
    confidence: raw.confidence,
    reasoning: raw.reasoning
  };
};
const shouldRequestReportStructureProposal = (params) => {
  var _a, _b, _c, _d, _e, _f;
  if (!isProviderConfigured(params.settings) || !params.rawIntakeIr || !params.boundary) {
    return false;
  }
  const ambiguousRowCount = (((_a = params.rowInspection) == null ? void 0 : _a.countsByRole.note) ?? 0) + (((_b = params.rowInspection) == null ? void 0 : _b.countsByRole.unknown) ?? 0) + (((_c = params.rowInspection) == null ? void 0 : _c.countsByRole.summary_like) ?? 0);
  const totalInspected = ((_d = params.rowInspection) == null ? void 0 : _d.totalRows) ?? 0;
  const hasAmbiguousBodyRows = totalInspected > 0 && ambiguousRowCount >= 3 && ambiguousRowCount / totalInspected >= 0.08;
  return Boolean(
    params.rawIntakeIr.diagnostics.headerShapeDrift || params.boundary.headerLayerRowIndexes.length > 0 || params.boundary.repeatedHeaderRowIndexes.length > 0 || ((_e = params.runtimeTableAssessment) == null ? void 0 : _e.requiresReshape) || ((_f = params.runtimeTableAssessment) == null ? void 0 : _f.status) === "ambiguous" || hasAmbiguousBodyRows
  );
};
const detectReportStructureProposalWithAi = async (params) => {
  if (!shouldRequestReportStructureProposal({
    settings: params.settings,
    rawIntakeIr: params.rawIntakeIr,
    boundary: params.boundary,
    runtimeTableAssessment: params.runtimeTableAssessment,
    rowInspection: params.rowInspection
  })) {
    return null;
  }
  try {
    const { model, modelId } = createProviderModel(params.settings, params.settings.simpleModel);
    const mergedHeaders = buildMergedBoundaryHeaders(params.rawIntakeIr.normalizedRows, params.boundary);
    const sampledRows = buildSampledRows(params.rawIntakeIr, params.boundary, params.rowInspection);
    const boundarySummary = formatBoundarySummary(params.boundary, params.runtimeTableAssessment);
    const rowInspectionSummary = formatRowInspectionSummary(params.rowInspection);
    const result = await runWithOverflowCompaction({
      provider: params.settings.provider,
      execute: async (compactionMode) => {
        const managed = await prepareManagedContext({
          callType: "goal",
          systemText: reportStructureProposalSystemPrompt,
          baseUserText: "Propose a normalization plan for a report-style CSV.",
          sections: [
            createContextSection("boundary", boundarySummary, "required", "sticky"),
            createContextSection("merged_headers", mergedHeaders.join("\n"), "required", "sticky"),
            createContextSection("row_inspection", rowInspectionSummary, "high", "sticky"),
            createContextSection(
              "sampled_rows",
              sampledRows.map((row) => `Row ${row.rowIndex}: ${row.cells.join(" | ")}`).join("\n"),
              "required",
              "sticky"
            )
          ],
          settings: params.settings,
          modelId,
          compactionMode
        });
        if (params.telemetryTarget) {
          reportContextDiagnostics(params.telemetryTarget, managed.diagnostics);
        }
        return withTransientRetry(
          (fb) => streamGenerateText({
            model: fb ?? model,
            messages: [
              { role: "system", content: managed.systemText },
              {
                role: "user",
                content: formatReportStructureProposalPrompt({
                  mergedHeaders,
                  boundarySummary,
                  rowInspectionSummary,
                  sampledRows
                })
              }
            ],
            output: output_exports.object({
              schema: jsonSchema(prepareSchemaForProvider(reportStructureProposalSchema, params.settings.provider))
            })
          }),
          { settings: params.settings, primaryModelId: modelId, label: "reportStructureProposal" }
        );
      }
    });
    const proposal = normalizeProposal(result.output);
    if (!proposal) {
      console.warn(`${LOG_PREFIX$2} AI returned an invalid normalization proposal; ignoring it.`, result.output);
      return null;
    }
    return proposal;
  } catch (error) {
    console.warn(`${LOG_PREFIX$2} AI structure proposal failed; continuing with deterministic normalization.`, error);
    return null;
  }
};
const intakeStructureBoundarySchema = {
  type: "object",
  properties: {
    headerRowIndex: {
      type: "integer",
      minimum: -1,
      description: "Zero-based index of the primary header row. This row contains the column names that describe the body data. Set to -1 when NO header row exists in the file (headerless report). When -1, you MUST provide syntheticHeaders."
    },
    headerLayerIndexes: {
      type: "array",
      items: { type: "integer", minimum: 0 },
      maxItems: 4,
      description: "Indexes of additional header layers (e.g., multi-line headers with code series above label rows). Exclude the primary header index."
    },
    bodyStartIndex: {
      type: "integer",
      minimum: 0,
      description: "Zero-based index of the first data/body row, immediately after the header (and any parameter rows between header and body)."
    },
    summaryStartIndex: {
      type: "integer",
      minimum: 0,
      description: "Zero-based index where summary/total/footer rows begin. Set equal to total row count if there is no summary section."
    },
    parameterRowIndexes: {
      type: "array",
      items: { type: "integer", minimum: 0 },
      maxItems: 10,
      description: 'Indexes of parameter/filter label rows between the header area and body start (e.g., "Sales Person Name", "Print Date").'
    },
    repeatedHeaderRowIndexes: {
      type: "array",
      items: { type: "integer", minimum: 0 },
      maxItems: 10,
      description: "Indexes of rows that repeat the primary header (common in paginated report exports)."
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
      description: "Your confidence in this boundary detection (0.0 to 1.0). Use lower values when the structure is ambiguous."
    },
    reasoning: {
      type: "string",
      description: "Brief explanation (1-3 sentences) of why these boundaries were chosen."
    },
    syntheticHeaders: {
      type: "array",
      items: { type: "string" },
      description: 'AI-inferred column names when headerRowIndex is -1 (headerless file). Array length MUST equal the column count. Infer names from data patterns: e.g. sparse text columns → dimension names, columns with monthly quantities → "Jan", "Feb", etc., total columns → "Total Qty", "Total Amount".'
    }
  },
  required: [
    "headerRowIndex",
    "bodyStartIndex",
    "summaryStartIndex",
    "confidence",
    "reasoning"
  ]
};
const intakeStructureSystemPrompt = "You locate CSV report boundaries. Return exactly one schema-valid JSON object. Use only visible row evidence and the pre-scan summary. Lower confidence when the structure is ambiguous.";
const formatRowForDisplay = (row, index) => {
  const cells = row.map((cell) => {
    const trimmed = String(cell ?? "").trim();
    return trimmed.length > 40 ? `${trimmed.slice(0, 37)}...` : trimmed;
  });
  return `Row ${index}: ${cells.join(" | ")}`;
};
const formatRowsForIntakePrompt = (normalizedRows, maxHeadRows = 26, maxTailRows = 6, boundaryRegion) => {
  const headEnd = Math.min(normalizedRows.length, maxHeadRows);
  const tailStart = Math.max(headEnd, normalizedRows.length - maxTailRows);
  const windowSize = (boundaryRegion == null ? void 0 : boundaryRegion.windowSize) ?? 2;
  let brStart = -1;
  let brEnd = -1;
  if (boundaryRegion && boundaryRegion.summaryStartIndex > headEnd && boundaryRegion.summaryStartIndex < tailStart) {
    brStart = Math.max(headEnd, boundaryRegion.summaryStartIndex - windowSize);
    brEnd = Math.min(tailStart, boundaryRegion.summaryStartIndex + windowSize);
  }
  const lines = [];
  for (let i = 0; i < headEnd; i += 1) {
    lines.push(formatRowForDisplay(normalizedRows[i], i));
  }
  if (brStart > 0) {
    if (brStart > headEnd) {
      lines.push(`... (${brStart - headEnd} rows omitted) ...`);
    }
    lines.push(`--- boundary region (deterministic summaryStartIndex = ${boundaryRegion.summaryStartIndex}) ---`);
    for (let i = brStart; i < brEnd; i += 1) {
      lines.push(formatRowForDisplay(normalizedRows[i], i));
    }
    lines.push("--- end boundary region ---");
    if (tailStart > brEnd) {
      lines.push(`... (${tailStart - brEnd} rows omitted) ...`);
    }
  } else if (tailStart > headEnd) {
    lines.push(`... (${tailStart - headEnd} rows omitted) ...`);
  }
  for (let i = tailStart; i < normalizedRows.length; i += 1) {
    lines.push(formatRowForDisplay(normalizedRows[i], i));
  }
  return lines.join("\n");
};
const classificationLabel = (signal) => {
  const parts = [signal.classification];
  if (signal.nonEmptyCellCount > 0) {
    parts.push(`${signal.nonEmptyCellCount}/${signal.totalCellCount} cells`);
    parts.push(`${(signal.numericRatio * 100).toFixed(0)}% numeric`);
  }
  if (signal.bodyEvidenceKind !== "unknown") {
    parts.push(signal.bodyEvidenceKind);
  }
  return parts.join(", ");
};
const formatPreScanSignalsForPrompt = (signals) => {
  const lines = [
    "## Pre-Scan Row Classifications",
    ...signals.rowSignals.map((s) => `  Row ${s.rowIndex}: ${classificationLabel(s)}`),
    "",
    "## Candidate Summary",
    `  Header candidates: ${signals.headerCandidateIndexes.length > 0 ? `rows [${signals.headerCandidateIndexes.join(", ")}]` : "none detected"}`,
    `  Data candidates: ${signals.dataCandidateIndexes.length > 0 ? `rows [${signals.dataCandidateIndexes.join(", ")}]` : "none detected"}`,
    `  Title rows: [${signals.titleRowIndexes.join(", ")}]`,
    `  Footer rows: [${signals.footerRowIndexes.join(", ")}]`,
    `  Blank rows: [${signals.blankRowIndexes.join(", ")}]`,
    `  Parameter rows: [${signals.parameterRowIndexes.join(", ")}]`
  ];
  if (signals.deterministicSelection) {
    lines.push(
      "",
      "## Deterministic Best Guess",
      `  ${signals.deterministicSelection.reason} (confidence: ${signals.deterministicSelection.confidence.toFixed(2)})`
    );
  } else {
    lines.push(
      "",
      "## Deterministic Best Guess",
      "  No header could be identified by the deterministic pre-scan."
    );
  }
  if (typeof signals.deterministicSummaryStartIndex === "number") {
    lines.push(
      "",
      "## Deterministic Summary Boundary",
      `  summaryStartIndex: ${signals.deterministicSummaryStartIndex} (full backward scan of all rows)`,
      `  If this equals the total row count, no summary/footer was found.`,
      `  Prefer this value unless boundary-region rows clearly contradict it.`
    );
  }
  return lines.join("\n");
};
const createIntakeStructurePrompt = (contextText) => `
Choose the CSV report boundaries from the provided evidence.

Return:
- headerRowIndex
- headerLayerIndexes
- bodyStartIndex
- summaryStartIndex
- parameterRowIndexes
- repeatedHeaderRowIndexes
- confidence
- reasoning

Decision contract:
- Use only row indexes that are visible in the evidence.
- Prefer the deterministic candidate rows unless the raw row evidence clearly contradicts them.
- The header row is the row whose cells should become body column names.
- Title, subtitle, metadata, and footer rows are not headers.
- A year, period code, or category code may appear in the header row.
- Parameter rows are optional and should only be returned when directly supported.
- If a matching header line appears both before and after a parameter block, choose the later line immediately above the body as headerRowIndex and mark the earlier line as repeatedHeaderRowIndexes.
- Repeated headers should only be returned when they match the main header.
- summaryStartIndex must be the first non-body row after the final body row.
- If no summary/footer exists, set summaryStartIndex to the total row count.
- A deterministic summary boundary (full backward scan) is provided when available. Prefer it unless the boundary-region rows clearly show summary/footer data starts earlier or body data continues past it.
- If you are unsure, keep auxiliary arrays minimal and lower confidence instead of guessing.

Headerless file handling:
- If no row qualifies as a header (no row contains column labels for the body data), set headerRowIndex to -1.
- When headerRowIndex is -1, you MUST provide syntheticHeaders: an array of inferred column names with length equal to the column count.
- Infer column purposes from data patterns: sparse text columns are dimensions, columns dominated by numbers or zero-placeholder markers ('-) are metrics (e.g. monthly values), trailing total columns are "Total Qty"/"Total Amount".
- For monthly quantity columns, use abbreviated month names (e.g. "Jan", "Feb", ..., "Dec") if 12 consecutive numeric columns appear.
- For unknown columns, use descriptive positional names (e.g. "Indent", "Section", "Category", "Description", "Code").
- bodyStartIndex should be the first row containing actual data values (skip section headers, blank separators, and metadata).

${contextText}
`;
const reportContextExtractionSystemPrompt = "You extract framing context from imported CSV report evidence. Return exactly one schema-valid JSON object. Prefer precision over recall. The reportTitle may be cleaned up for readability but must be grounded in evidence. Do not invent parameter or footer lines.";
const createReportContextExtractionPrompt = (contextText) => `
Extract framing context only. Do not solve table structure here.

Return:
- reportTitle
- reportDescription
- parameterLines
- footerLines
- candidateHeaderLine
- confidence
- reasoning

Decision contract:
- reportTitle may be rephrased for readability but must be grounded in visible CSV evidence. Do not invent content absent from the data.
- reportTitle should be the main human-readable report title, not a body value.
- reportDescription: a 1-2 sentence summary of what the dataset contains (domain, time period, scope), grounded in metadata, headers, and body evidence.
- parameterLines should contain preserved filter or scope lines (use exact visible text).
- footerLines should contain preserved footer, memo, remark, or timestamp lines (use exact visible text).
- candidateHeaderLine is optional supporting evidence; return [] when weak or ambiguous.
- Do not copy body facts into title, parameterLines, or footerLines.
- Deduplicate short repeated lines.
- When evidence is weak, return empty fields and lower confidence instead of guessing.

${contextText}
`;
const LOG_PREFIX$1 = "[IntakeStructureDetector]";
const normalizeRowKey = (row) => (row ?? []).map((cell) => String(cell ?? "").trim()).filter(Boolean).join(" | ").toLowerCase();
const inferRepeatedHeaderRowIndexes = (rows, headerRowIndex, bodyStartIndex) => {
  const headerKey = normalizeRowKey(rows[headerRowIndex]);
  if (!headerKey) {
    return [];
  }
  const repeatedHeaderRowIndexes = [];
  for (let index = 0; index < Math.min(bodyStartIndex, rows.length); index += 1) {
    if (index === headerRowIndex) continue;
    if (normalizeRowKey(rows[index]) === headerKey) {
      repeatedHeaderRowIndexes.push(index);
    }
  }
  return repeatedHeaderRowIndexes;
};
const detectIntakeStructureWithAi = async (normalizedRows, preScanSignals, settings, telemetryTarget) => {
  var _a;
  if (!isProviderConfigured(settings)) {
    return null;
  }
  try {
    const { model, modelId } = createProviderModel(settings, settings.simpleModel);
    const result = await runWithOverflowCompaction({
      provider: settings.provider,
      execute: async (compactionMode) => {
        var _a2;
        const managed = await prepareManagedContext({
          callType: "goal",
          systemText: intakeStructureSystemPrompt,
          baseUserText: "Detect the header, body, and summary boundaries for this CSV file.",
          sections: [
            createContextSection(
              "raw_rows",
              `Total rows: ${normalizedRows.length}, columns: ${((_a2 = normalizedRows[0]) == null ? void 0 : _a2.length) ?? 0}

${formatRowsForIntakePrompt(
                normalizedRows,
                26,
                6,
                typeof preScanSignals.deterministicSummaryStartIndex === "number" ? { summaryStartIndex: preScanSignals.deterministicSummaryStartIndex } : void 0
              )}`,
              "required",
              "sticky"
            ),
            createContextSection(
              "prescan_signals",
              formatPreScanSignalsForPrompt(preScanSignals),
              "high",
              "sticky"
            )
          ],
          settings,
          modelId,
          compactionMode
        });
        if (telemetryTarget) {
          reportContextDiagnostics(telemetryTarget, managed.diagnostics);
        }
        return withTransientRetry(
          (fb) => streamGenerateText({
            model: fb ?? model,
            messages: [
              { role: "system", content: managed.systemText },
              { role: "user", content: createIntakeStructurePrompt(managed.userText) }
            ],
            output: output_exports.object({
              schema: jsonSchema(prepareSchemaForProvider(intakeStructureBoundarySchema, settings.provider))
            })
          }),
          { settings, primaryModelId: modelId, label: "intakeStructureDetector" }
        );
      }
    });
    const raw = result.output;
    if (typeof (raw == null ? void 0 : raw.headerRowIndex) !== "number" || typeof (raw == null ? void 0 : raw.bodyStartIndex) !== "number" || typeof (raw == null ? void 0 : raw.summaryStartIndex) !== "number") {
      console.warn(`${LOG_PREFIX$1} AI returned incomplete boundary, discarding.`, raw);
      return null;
    }
    const repeatedHeaderRowIndexes = raw.headerRowIndex >= 0 ? Array.from(/* @__PURE__ */ new Set([
      ...inferRepeatedHeaderRowIndexes(normalizedRows, raw.headerRowIndex, raw.bodyStartIndex),
      ...Array.isArray(raw.repeatedHeaderRowIndexes) ? raw.repeatedHeaderRowIndexes.filter((index) => Number.isInteger(index)) : []
    ])).sort((left, right) => left - right) : [];
    return {
      headerRowIndex: raw.headerRowIndex,
      headerLayerIndexes: Array.isArray(raw.headerLayerIndexes) ? raw.headerLayerIndexes : [],
      bodyStartIndex: raw.bodyStartIndex,
      summaryStartIndex: raw.summaryStartIndex,
      parameterRowIndexes: Array.isArray(raw.parameterRowIndexes) ? raw.parameterRowIndexes : [],
      repeatedHeaderRowIndexes,
      confidence: typeof raw.confidence === "number" ? raw.confidence : 0.5,
      reasoning: typeof raw.reasoning === "string" ? raw.reasoning : "",
      // Pass through AI-inferred synthetic headers for headerless files.
      // If AI returned -1 but omitted syntheticHeaders, generate positional
      // fallback names so the headerless path can still proceed.
      ...raw.headerRowIndex === -1 ? {
        syntheticHeaders: Array.isArray(raw.syntheticHeaders) && raw.syntheticHeaders.length > 0 ? raw.syntheticHeaders : Array.from({ length: ((_a = normalizedRows[0]) == null ? void 0 : _a.length) ?? 0 }, (_, i) => `Column_${i + 1}`)
      } : {}
    };
  } catch (error) {
    console.warn(`${LOG_PREFIX$1} AI detection failed, falling back to deterministic.`, error);
    return null;
  }
};
const formatTextRows = (rows, emptyMessage) => {
  if (!rows || rows.length === 0) {
    return emptyMessage;
  }
  return rows.map((row, index) => `${index + 1}. ${row.filter(Boolean).join(" | ")}`).join("\n");
};
const formatSummaryRows = (data) => {
  if (!data.summaryRows || data.summaryRows.length === 0) {
    return "No summary rows were preserved.";
  }
  return formatRows(trimRawDataSample(data.summaryRows, 5));
};
const extractAiReportContext = async (data, settings, telemetryTarget) => {
  if (!isProviderConfigured(settings)) {
    return null;
  }
  try {
    const { model, modelId } = createProviderModel(settings, settings.complexModel);
    const result = await runWithOverflowCompaction({
      provider: settings.provider,
      execute: async (compactionMode) => {
        const managed = await prepareManagedContext({
          callType: "goal",
          systemText: reportContextExtractionSystemPrompt,
          baseUserText: "Extract the report title, parameter lines, footer lines, and likely header hint.",
          sections: [
            createContextSection("report_file", `File name: ${data.fileName}
Header depth: ${data.headerDepth ?? 1}`, "high", "sticky"),
            createContextSection("metadata_rows", `Metadata rows:
${formatTextRows(data.metadataRows, "No metadata rows were preserved.")}`, "required", "sticky"),
            createContextSection("header_layers", `Header layers:
${formatTextRows(data.headerLayers, "No header layers were preserved.")}`, "high", "sticky"),
            createContextSection("summary_rows", `Summary rows:
${formatSummaryRows(data)}`, "medium", "sticky"),
            createContextSection("body_sample", `Body sample:
${formatRows(trimRawDataSample(data.data, 5))}`, "high", "prunable")
          ],
          settings,
          modelId,
          compactionMode
        });
        return withTransientRetry(
          (fb) => streamGenerateText({
            model: fb ?? model,
            messages: [
              { role: "system", content: managed.systemText },
              { role: "user", content: createReportContextExtractionPrompt(managed.userText) }
            ],
            output: output_exports.object({
              schema: jsonSchema(prepareSchemaForProvider(reportContextExtractionSchema, settings.provider))
            })
          }),
          { settings, primaryModelId: modelId, label: "reportContextExtractor" }
        );
      }
    });
    const extracted = sanitizeAiExtractedReportContext(result.output);
    if (!extracted) {
      return null;
    }
    return mergeAiExtractedReportContextWithFallback(extracted, createFallbackReportContext(data));
  } catch (error) {
    console.warn("[ReportContextExtractor] AI extraction failed, falling back to deterministic verification.", error);
    return null;
  }
};
const commonPromptSnippets = {
  numberParsing: `- **CRITICAL RULE on NUMBER PARSING**: This is the most common source of errors. Numeric-looking strings (for example "$1,234.56", "50%", "1.0000") must be handled as proper numbers by choosing a deterministic \`cast_column\` operation with the correct \`targetType\`.
    - **DO NOT describe code helpers, utility functions, or custom parsing code.**
    - **DO describe the intended deterministic operation only** (for example, cast a column to \`currency\`, \`percentage\`, or \`number\`).`
};
const dataPreparationSystemPrompt = "You produce the smallest deterministic cleanup or reshape plan that makes an imported report query-ready. Return one valid JSON object only. Use only approved operations and make outputColumns match the post-operation schema exactly.";
const filterGeneratorSystemPrompt = "You are an expert data analyst. Your task is to convert a user's natural language query into one deterministic filter_rows operation for a dataset. You MUST respond with a single valid JSON object, and nothing else. The JSON object must adhere to the provided schema.";
const commonRules = commonPromptSnippets;
const dataPreparationAllowedOperations = "drop_rows_by_index, drop_rows_by_condition, drop_blank_rows, promote_header_row, rename_columns, drop_columns, trim_whitespace, normalize_empty_values, replace_values, cast_column, fill_missing, dedupe_rows, filter_rows, split_column, unpivot_columns";
const wideTableAllowedOperations = "drop_rows_by_index, drop_rows_by_condition, drop_blank_rows, promote_header_row, rename_columns, drop_columns, trim_whitespace, normalize_empty_values, cast_column, unpivot_columns";
const createDataPreparationPrompt = (contextText, retryFeedback, options) => {
  var _a, _b;
  return `
Return one concise deterministic data-preparation plan.

Priority order:
1. Preserve business detail rows.
2. Remove only rows or columns that are clearly non-data.
3. Promote the true header row only when needed.
4. If the dataset is pivot, crosstab, or wide-matrix shaped, convert it into a long table.
5. Keep the plan as small as possible.

Rules:
- Do not emit JavaScript, pseudo-code, helpers, or custom parsing logic.
- Use only deterministic operations that are explicitly supported by the schema.
- Numeric-looking strings must use a deterministic \`cast_column\` with the correct \`targetType\` when a permanent cast is needed.
- Distinguish detail rows from titles, parameters, summaries, and footers.
- Keep hierarchical parent rows when identifier values follow prefix relationships such as 50 -> 5010 -> 501001.
- Rows with a blank primary identifier plus label text are likely metadata or summaries; remove them only when clearly non-data.
${(options == null ? void 0 : options.wideTable) ? "- This dataset has repeated metric columns, so prefer `unpivot_columns` after only the structural cleanup that is truly needed." : ""}
${(options == null ? void 0 : options.wideTable) ? "- Do not cast or reference derived long-table columns such as Value before an explicit `unpivot_columns` step creates them." : ""}
${(options == null ? void 0 : options.wideTable) ? "- For genuine wide report matrices, zero-operation plans are invalid. Use `unpivot_columns` to create a long table before final typing." : ""}
${(options == null ? void 0 : options.wideTable) && (options.requiredLabelLayers ?? 0) > 0 ? `- This wide report preserves ${options.requiredLabelLayers} header label layer(s). If you use \`unpivot_columns\`, you MUST preserve all of them with \`labelColumns\` entries such as \`SeriesLabelL1\` through \`SeriesLabelL${options.requiredLabelLayers}\`.` : ""}
${(options == null ? void 0 : options.wideTable) && (options.requiredLabelLayers ?? 0) > 0 ? "- Do not collapse multi-header labels into SeriesKey alone when raw header label layers are available." : ""}
${(options == null ? void 0 : options.wideTable) && (options.requiredLabelLayers ?? 0) > 0 ? "- If the report also has hierarchical code/description rows, preserve them during unpivot with `rowClassColumn`, `hierarchyDepthColumn`, `sourceRowIndexColumn`, and `hierarchyDepthMappings`." : ""}
${(options == null ? void 0 : options.hierarchySignal) ? "- This dataset contains hierarchical parent/detail rows. Zero-operation plans are invalid; preserve hierarchy during reshape with `hierarchyDepthColumn`, `hierarchyDepthMappings`, and `sourceRowIndexColumn`." : ""}
${(options == null ? void 0 : options.hierarchySignal) ? "- If you are not reshaping the dataset, append `annotate_hierarchy` instead of returning a hierarchy-losing cleanup or schema-only plan." : ""}
${(options == null ? void 0 : options.wideTable) && (options == null ? void 0 : options.hierarchySignal) ? "- If you cannot produce a complete hierarchy-preserving unpivot, prefer `annotate_hierarchy` over an incomplete wide-table plan." : ""}
- Completely empty columns (100% missing) are already removed deterministically before this stage. Mostly-empty columns (>90% but <100%) remain in the schema unless an explicit operation removes them.
- If no executable mutation is needed, return zero operations and explicitly say the prepared rows remain unchanged while only refining schema/types.

Allowed operations:
- ${(options == null ? void 0 : options.wideTable) ? wideTableAllowedOperations : dataPreparationAllowedOperations}

Requirements:
- Always return \`explanation\`, \`operations\`, and \`outputColumns\`.
- \`outputColumns\` must exactly match the post-operation structure.
- Zero-operation plans must not add, remove, or rename columns.
- Use specific output types when justified: \`date\`, \`time\`, \`currency\`, \`percentage\`.
- Keep the plan concise, direct, and deterministic.
${(options == null ? void 0 : options.inspectionSummary) ? `- Current row inspection summary: ${options.inspectionSummary}` : ""}
${(options == null ? void 0 : options.iterationContext) ? `- This is cleaning round ${options.iterationContext.round} of ${options.iterationContext.maxRounds}; do not repeat failed generic retries.` : ""}
${((_a = options == null ? void 0 : options.priorVerificationFailures) == null ? void 0 : _a.length) ? `- Prior verification failures to avoid repeating:
${options.priorVerificationFailures.map((reason) => `  - ${reason}`).join("\n")}` : ""}
${((_b = options == null ? void 0 : options.allowedOperationTypes) == null ? void 0 : _b.length) ? `- In this runtime pass, prefer only these bounded operations: ${options.allowedOperationTypes.join(", ")}` : ""}

${contextText}
${(options == null ? void 0 : options.residualRowsPreview) ? `Residual uncertain rows preview:
${options.residualRowsPreview}` : ""}
${retryFeedback ? `Retry guidance:
${retryFeedback}` : ""}
`;
};
const createFilterFunctionPrompt = (query, contextText) => `
    You are an expert data analyst. Your task is to convert a user's natural language query into a deterministic filter_rows operation for a dataset.
    
    **User Query:** "${query}"
    
    ${contextText}
    
    **CRITICAL Rules for Filter Planning:**
    ${commonRules.numberParsing}
    - You MUST return exactly one \`filter_rows\` operation inside the \`operation\` field.
    - Use only these operators: \`eq\`, \`neq\`, \`gt\`, \`gte\`, \`lt\`, \`lte\`, \`between\`, \`contains\`, \`starts_with\`, \`ends_with\`, \`in\`, \`is_null\`, \`not_null\`.
    - If the request is simple AND logic, use \`predicates\`.
    - If the request needs simple OR logic, use \`groups\`, where each group is AND-only and the overall operation matches if any group matches.
    - Never emit JavaScript code or pseudo-code.
    
    **Your Task:**
    1.  **Analyze Query:** Understand the user's intent. Identify columns, values, and operators (e.g., >, <, =, contains).
    2.  **Write Filter Operation:** Return one deterministic \`filter_rows\` operation with stable \`id\`, \`reason\`, and \`predicates\`.
    3.  **Explain:** Briefly explain the filter you created in plain language.
    
    **Example:**
    - User Query: "show me all rows where sales > 5000 and region is North America"
    - Columns: [{ name: 'sales', type: 'currency' }, { name: 'region', type: 'categorical' }]
    - Your Response (JSON):
    {
      "explanation": "Filtering for rows where 'sales' is greater than 5000 and 'region' is 'North America'.",
      "operation": {
        "id": "filter_sales_region",
        "type": "filter_rows",
        "reason": "Keep only high-sales North America rows.",
        "predicates": [
          { "column": "sales", "operator": "gt", "value": 5000 },
          { "column": "region", "operator": "eq", "value": "North America" }
        ]
      }
    }

    **Example with simple OR groups:**
    {
      "explanation": "Filtering for rows where region is East or West.",
      "operation": {
        "id": "filter_east_or_west",
        "type": "filter_rows",
        "reason": "Keep only the requested regions.",
        "groups": [
          { "predicates": [{ "column": "region", "operator": "eq", "value": "East" }] },
          { "predicates": [{ "column": "region", "operator": "eq", "value": "West" }] }
        ]
      }
    }
`;
const MUTATION_CLAIM_PATTERN = /\b(remov(?:e|ed|ing)|drop(?:s|ped|ping)?|filter(?:s|ed|ing)?|cast(?:s|ed|ing)?|convert(?:s|ed|ing)?|standardiz(?:e|es|ed|ing)|standardis(?:e|es|ed|ing)|rename(?:s|d|ing)?|dedup(?:e|es|ed|ing)?|split(?:s|ting)?|unpivot(?:s|ed|ing)?|trim(?:s|med|ming)?|normaliz(?:e|es|ed|ing)|normalis(?:e|es|ed|ing)|fill(?:s|ed|ing)?|deriv(?:e|es|ed|ing))\b/i;
const MAX_DATA_PREP_ATTEMPTS = 2;
const WIDE_TABLE_NUMERIC_COLUMN_THRESHOLD = 12;
const WIDE_TABLE_NUMERIC_SHARE_THRESHOLD = 0.55;
const MULTI_HEADER_NUMERIC_COLUMN_THRESHOLD = 6;
const MULTI_HEADER_NUMERIC_SHARE_THRESHOLD = 0.4;
const WIDE_TABLE_SAMPLE_ROW_LIMIT = 4;
const WIDE_TABLE_SAMPLE_MATRIX_COLUMNS = 4;
const WIDE_TABLE_SAMPLE_BUSINESS_METRIC_COLUMNS = 3;
const RETRY_EXAMPLE_LIMIT = 3;
const RETRY_DETAIL_MAX_CHARS = 220;
const DIGIT_HEAVY_COLUMN_PATTERN = /^\d{4,}$/;
const IDENTIFIER_COLUMN_PATTERN = /(code|account|acct|document|project|job|site|description|name|label|category|series|type)/i;
const BUSINESS_METRIC_COLUMN_PATTERN = /(total|amount|revenue|sales|cost|expense|profit|margin|balance|value)/i;
const DIMENSION_HINT_PATTERN = /(brand|category|description|name|label|group|type|customer|vendor|supplier|uom)/i;
const CODE_LIKE_COLUMN_PATTERN = /(code|id|number|num|no|sku|document|account|acct|stock[ _-]?code)/i;
const PLACEHOLDER_MARKERS = ["", "-", "--", "'-", "' -", "n/a", "na", "null", "nil", "none"];
const WIDE_TABLE_VALUE_CAST_ORDER_ERROR = 'Wide-table plans may cast "Value" only after an unpivot_columns step emits valueColumn "Value".';
const LABEL_LAYER_RETENTION_SIGNAL = "label_layer_retention_complete";
const LABEL_LAYER_RETENTION_REASON = "Multi-header label layers were not preserved during reshaping.";
const LOSSLESS_STABILIZER_PRUNABLE_OPERATION_TYPES = /* @__PURE__ */ new Set([
  "cast_column",
  "replace_values",
  "trim_whitespace",
  "normalize_empty_values"
]);
const LOSSLESS_STABILIZER_RESHAPE_OPERATION_TYPES = /* @__PURE__ */ new Set([
  "unpivot_columns",
  "split_column"
]);
const LOSSLESS_STABILIZER_DESTRUCTIVE_OPERATION_TYPES = /* @__PURE__ */ new Set([
  "drop_rows_by_index",
  "drop_rows_by_condition",
  "drop_blank_rows",
  "drop_columns",
  "filter_rows",
  "dedupe_rows"
]);
const DEFAULT_DATA_PREPARATION_OPTIONS = {
  maxAttempts: MAX_DATA_PREP_ATTEMPTS,
  allowInternalRetry: true,
  allowDeterministicFallback: true,
  allowHierarchyAnnotationFallback: true
};
const normalizeColumnName = (value) => value.trim().replace(/\s+/g, " ").toLowerCase();
const normalizeCellValue = (value) => String(value ?? "").trim();
const normalizeMarker = (value) => normalizeCellValue(value).toLowerCase();
const isFilledValue = (value) => normalizeCellValue(value).length > 0;
const isNumericType = (type) => type === "numerical" || type === "currency" || type === "percentage";
const isMeaningfulHeaderLayer = (row) => Array.isArray(row) && row.some((value) => String(value ?? "").trim().length > 0);
const resolveDataPreparationOptions = (options) => {
  const merged = {
    ...DEFAULT_DATA_PREPARATION_OPTIONS,
    ...options ?? {}
  };
  if (!merged.allowInternalRetry) {
    merged.maxAttempts = 1;
  }
  merged.maxAttempts = Math.max(1, Math.floor(merged.maxAttempts));
  return merged;
};
const emitDataPreparationTelemetry = (telemetryTarget, responseType, detail, meta) => {
  var _a;
  return (_a = telemetryTarget == null ? void 0 : telemetryTarget.logTelemetryEvent) == null ? void 0 : _a.call(telemetryTarget, {
    stage: "planner_ready",
    responseType,
    detail,
    meta: {
      reasonCode: typeof (meta == null ? void 0 : meta.reasonCode) === "string" ? meta.reasonCode : responseType,
      ...meta ?? {}
    }
  });
};
const classifyDataPreparationFailureReason = (error) => {
  const message = error instanceof Error ? error.message : String(error);
  if (/no output generated/i.test(message)) {
    return "provider_no_output";
  }
  if (/timed out|timeout|abort/i.test(message)) {
    return "timeout_model_call";
  }
  if (/verification failed|collapsed to a single descriptor group|wide crosstab|hierarchy depth/i.test(message)) {
    return "shape_mismatch";
  }
  if (/semantic/i.test(message)) {
    return "semantic_miss";
  }
  if (/consistency/i.test(message)) {
    return "consistency_validation";
  }
  return "operation_execution";
};
const emitDataPreparationStageTiming = (telemetryTarget, stage, elapsedMs, meta) => emitDataPreparationTelemetry(
  telemetryTarget,
  "data_prep_stage_timing",
  `${stage} completed in ${elapsedMs}ms.`,
  {
    reasonCode: "data_prep_stage_timing",
    stage,
    elapsedMs,
    ...meta ?? {}
  }
);
const inferOperationMode = (operations) => {
  if (operations.some((operation) => LOSSLESS_STABILIZER_RESHAPE_OPERATION_TYPES.has(operation.type))) {
    return "reshape";
  }
  if (operations.some((operation) => LOSSLESS_STABILIZER_DESTRUCTIVE_OPERATION_TYPES.has(operation.type))) {
    return "destructive";
  }
  return "lossless";
};
const buildColumnTypeLookup = (columns) => {
  const lookup = /* @__PURE__ */ new Map();
  columns.forEach((column) => {
    lookup.set(normalizeColumnName(column.name), column.type);
  });
  return lookup;
};
const hasColumnOperation = (operations, columnName, operationTypes) => {
  const normalizedColumn = normalizeColumnName(columnName);
  return operations.some((operation) => {
    if (!operationTypes.includes(operation.type)) {
      return false;
    }
    if (operation.type === "normalize_empty_values") {
      return operation.columns === "*" || operation.columns.some((column) => normalizeColumnName(column) === normalizedColumn);
    }
    if ("column" in operation && typeof operation.column === "string") {
      return normalizeColumnName(operation.column) === normalizedColumn;
    }
    return false;
  });
};
const operationTargetsColumn = (operation, columnName) => {
  const normalizedColumn = normalizeColumnName(columnName);
  if (operation.type === "normalize_empty_values") {
    return operation.columns === "*" || operation.columns.some((column) => normalizeColumnName(column) === normalizedColumn);
  }
  if ("column" in operation && typeof operation.column === "string") {
    return normalizeColumnName(operation.column) === normalizedColumn;
  }
  return false;
};
const buildDeterministicNormalizationPlan = (candidatePlan, columns, sourceRows) => {
  if (sourceRows.length === 0) {
    return {
      plan: candidatePlan,
      normalizedPlaceholderColumns: [],
      numericStringNormalizedColumns: []
    };
  }
  const placeholderMarkerSet = new Set(PLACEHOLDER_MARKERS.map(normalizeMarker));
  const placeholderColumns = columns.filter((column) => !isNumericType(column.type)).filter((column) => {
    if (hasColumnOperation(candidatePlan.operations, column.name, ["replace_values", "fill_missing"])) {
      return false;
    }
    if (CODE_LIKE_COLUMN_PATTERN.test(column.name) && !DIMENSION_HINT_PATTERN.test(column.name)) {
      return false;
    }
    const nonEmptyValues = sourceRows.map((row) => normalizeCellValue(row[column.name])).filter(Boolean);
    if (nonEmptyValues.length < 3) {
      return false;
    }
    const placeholderCount = nonEmptyValues.filter((value) => placeholderMarkerSet.has(value.toLowerCase())).length;
    if (placeholderCount === 0) {
      return false;
    }
    const placeholderRatio = placeholderCount / nonEmptyValues.length;
    if (DIMENSION_HINT_PATTERN.test(column.name)) {
      return placeholderRatio <= 0.5;
    }
    return placeholderRatio <= 0.2 && nonEmptyValues.length - placeholderCount >= 3;
  }).map((column) => column.name);
  const numericStringColumns = columns.filter((column) => Boolean(column.hasFormattedNumbers)).filter((column) => isNumericType(column.type)).filter((column) => !hasColumnOperation(candidatePlan.operations, column.name, ["cast_column"])).map((column) => column.name);
  if (placeholderColumns.length === 0 && numericStringColumns.length === 0) {
    return {
      plan: candidatePlan,
      normalizedPlaceholderColumns: [],
      numericStringNormalizedColumns: []
    };
  }
  const updatedOperations = candidatePlan.operations.map((operation) => {
    if (operation.type !== "normalize_empty_values") {
      return operation;
    }
    const targetsDetectedPlaceholder = placeholderColumns.some((columnName) => operationTargetsColumn(operation, columnName));
    if (!targetsDetectedPlaceholder) {
      return operation;
    }
    const mergedMarkers = [.../* @__PURE__ */ new Set([...operation.emptyMarkers ?? [], ...PLACEHOLDER_MARKERS])];
    return {
      ...operation,
      emptyMarkers: mergedMarkers
    };
  });
  const coveredPlaceholderColumns = new Set(
    placeholderColumns.filter((columnName) => updatedOperations.some(
      (operation) => operation.type === "normalize_empty_values" && operationTargetsColumn(operation, columnName)
    ))
  );
  const normalizationOperations = [];
  const pendingPlaceholderColumns = placeholderColumns.filter((columnName) => !coveredPlaceholderColumns.has(columnName));
  if (pendingPlaceholderColumns.length > 0) {
    normalizationOperations.push({
      id: "normalize_placeholder_dimensions",
      type: "normalize_empty_values",
      reason: "Normalize placeholder dimension values into null so they do not pollute grouping.",
      columns: pendingPlaceholderColumns,
      emptyMarkers: PLACEHOLDER_MARKERS
    });
  }
  numericStringColumns.forEach((columnName) => {
    const profile = columns.find((column) => column.name === columnName);
    const targetType = (profile == null ? void 0 : profile.type) === "currency" ? "currency" : (profile == null ? void 0 : profile.type) === "percentage" ? "percentage" : "number";
    normalizationOperations.push({
      id: `cast_numeric_string_${normalizeColumnName(columnName).replace(/[^a-z0-9]+/g, "_")}`,
      type: "cast_column",
      reason: "Cast numeric-looking text into a queryable numeric type before SQL precheck.",
      column: columnName,
      targetType
    });
  });
  return {
    plan: {
      ...candidatePlan,
      operations: [...normalizationOperations, ...updatedOperations],
      normalizedPlaceholderColumns: [
        ...candidatePlan.normalizedPlaceholderColumns ?? [],
        ...placeholderColumns
      ],
      numericStringNormalizedColumns: [
        ...candidatePlan.numericStringNormalizedColumns ?? [],
        ...numericStringColumns
      ]
    },
    normalizedPlaceholderColumns: placeholderColumns,
    numericStringNormalizedColumns: numericStringColumns
  };
};
const cloneRows = (rows) => rows.map((row) => ({ ...row }));
const stabilizeLosslessOnlyPlan = (candidatePlan, columns, sampleRows) => {
  var _a;
  if (candidatePlan.operations.length === 0 || inferOperationMode(candidatePlan.operations) !== "lossless") {
    return {
      plan: candidatePlan,
      prunedOperations: [],
      abortedReason: null
    };
  }
  let currentRows = cloneRows(sampleRows);
  const keptOperations = [];
  const prunedOperations = [];
  for (const operation of candidatePlan.operations) {
    if (!LOSSLESS_STABILIZER_PRUNABLE_OPERATION_TYPES.has(operation.type)) {
      try {
        currentRows = applyDataOperations(currentRows, [operation], { allowEmptyResult: false }).data;
        keptOperations.push(operation);
        continue;
      } catch (error) {
        return {
          plan: candidatePlan,
          prunedOperations: [],
          abortedReason: error instanceof Error ? error.message : String(error)
        };
      }
    }
    try {
      const beforeRows = cloneRows(currentRows);
      const execution = applyDataOperations(beforeRows, [operation], { allowEmptyResult: false });
      const stepReport = reconcileAiCleaningStep(
        {
          id: `lossless_stabilizer_${operation.id}`,
          mode: "lossless",
          reason: operation.reason,
          operations: [operation]
        },
        beforeRows,
        execution.data,
        columns
      );
      if (!stepReport.passed) {
        prunedOperations.push({
          operation,
          reason: ((_a = stepReport.failures[0]) == null ? void 0 : _a.detail) ?? `Pruned ${operation.type} after bounded lossless stabilization.`
        });
        continue;
      }
      currentRows = execution.data;
      keptOperations.push(operation);
    } catch (error) {
      return {
        plan: candidatePlan,
        prunedOperations: [],
        abortedReason: error instanceof Error ? error.message : String(error)
      };
    }
  }
  return {
    plan: {
      ...candidatePlan,
      operations: keptOperations,
      planStatus: keptOperations.length > 0 ? "operations" : "schema_only",
      consistencyIssues: keptOperations.length > 0 ? candidatePlan.consistencyIssues : []
    },
    prunedOperations,
    abortedReason: null
  };
};
const alignSchemaOnlyOutputColumns = (baselineColumns, outputColumns) => {
  const outputLookup = new Map(
    outputColumns.map((column) => [normalizeColumnName(column.name), column])
  );
  return baselineColumns.map((column) => {
    const candidate = outputLookup.get(normalizeColumnName(column.name));
    return candidate ? {
      ...column,
      ...candidate,
      name: column.name
    } : column;
  });
};
const buildHeaderLayerAliasMap = (baselineColumns, sourceData) => {
  const aliasMap = /* @__PURE__ */ new Map();
  const columnNames = baselineColumns.map((column) => column.name);
  const headerLayers = (sourceData == null ? void 0 : sourceData.headerLayers) ?? [];
  headerLayers.forEach((layer) => {
    layer.forEach((rawLabel, index) => {
      const actualColumnName = columnNames[index];
      const alias = normalizeCellValue(rawLabel);
      if (!actualColumnName || alias.length === 0) {
        return;
      }
      const normalizedAlias = normalizeColumnName(alias);
      const normalizedActual = normalizeColumnName(actualColumnName);
      if (normalizedAlias === normalizedActual || aliasMap.has(normalizedAlias)) {
        return;
      }
      aliasMap.set(normalizedAlias, actualColumnName);
    });
  });
  return aliasMap;
};
const rewriteFilterPredicateColumns = (predicates, resolveColumnName) => predicates == null ? void 0 : predicates.map((predicate) => ({
  ...predicate,
  column: resolveColumnName(predicate.column)
}));
const rewriteDeriveOperand = (operand, resolveColumnName) => operand.kind === "column" ? { ...operand, column: resolveColumnName(operand.column) } : operand;
const rewriteOperationColumnAliases = (operation, resolveColumnName) => {
  var _a, _b, _c, _d, _e;
  switch (operation.type) {
    case "rename_columns":
      return {
        ...operation,
        mappings: operation.mappings.map((mapping) => ({
          ...mapping,
          from: resolveColumnName(mapping.from)
        }))
      };
    case "drop_columns":
      return {
        ...operation,
        columns: operation.columns.map(resolveColumnName)
      };
    case "trim_whitespace":
    case "normalize_empty_values":
      return {
        ...operation,
        columns: operation.columns === "*" ? "*" : operation.columns.map(resolveColumnName)
      };
    case "replace_values":
    case "cast_column":
    case "fill_missing":
    case "split_column":
      return {
        ...operation,
        column: resolveColumnName(operation.column)
      };
    case "dedupe_rows":
      return {
        ...operation,
        keyColumns: operation.keyColumns.map(resolveColumnName)
      };
    case "filter_rows":
    case "drop_rows_by_condition":
      return {
        ...operation,
        predicates: rewriteFilterPredicateColumns(operation.predicates, resolveColumnName),
        groups: (_a = operation.groups) == null ? void 0 : _a.map((group) => ({
          ...group,
          predicates: rewriteFilterPredicateColumns(group.predicates, resolveColumnName) ?? []
        }))
      };
    case "derive_column":
      return {
        ...operation,
        expression: operation.expression.kind === "copy" ? {
          ...operation.expression,
          source: rewriteDeriveOperand(operation.expression.source, resolveColumnName)
        } : operation.expression.kind === "concat" ? {
          ...operation.expression,
          parts: operation.expression.parts.map((part) => rewriteDeriveOperand(part, resolveColumnName))
        } : operation.expression.kind === "math_binary" ? {
          ...operation.expression,
          left: rewriteDeriveOperand(operation.expression.left, resolveColumnName),
          right: rewriteDeriveOperand(operation.expression.right, resolveColumnName)
        } : {
          ...operation.expression,
          numerator: rewriteDeriveOperand(operation.expression.numerator, resolveColumnName),
          denominator: rewriteDeriveOperand(operation.expression.denominator, resolveColumnName)
        }
      };
    case "derive_metric_by_label":
      return {
        ...operation,
        groupByColumns: operation.groupByColumns.map(resolveColumnName),
        labelColumn: resolveColumnName(operation.labelColumn),
        valueColumn: resolveColumnName(operation.valueColumn),
        carryForwardColumns: (_b = operation.carryForwardColumns) == null ? void 0 : _b.map(resolveColumnName)
      };
    case "unpivot_columns":
      return {
        ...operation,
        sourceColumns: operation.sourceColumns.map(resolveColumnName),
        keepColumns: (_c = operation.keepColumns) == null ? void 0 : _c.map(resolveColumnName),
        labelMappings: (_d = operation.labelMappings) == null ? void 0 : _d.map((mapping) => ({
          ...mapping,
          sourceColumn: resolveColumnName(mapping.sourceColumn)
        })),
        labelColumns: (_e = operation.labelColumns) == null ? void 0 : _e.map((labelColumn) => ({
          ...labelColumn,
          mappings: labelColumn.mappings.map((mapping) => ({
            ...mapping,
            sourceColumn: resolveColumnName(mapping.sourceColumn)
          }))
        }))
      };
    default:
      return operation;
  }
};
const rewritePlanColumnAliasesFromHeaderLayers = (candidatePlan, baselineColumns, sourceData) => {
  const baselineLookup = new Set(baselineColumns.map((column) => normalizeColumnName(column.name)));
  const aliasMap = buildHeaderLayerAliasMap(baselineColumns, sourceData);
  if (aliasMap.size === 0) {
    return {
      plan: candidatePlan,
      rewrites: []
    };
  }
  const rewrites = [];
  const resolveColumnName = (columnName) => {
    const normalized = normalizeColumnName(columnName);
    if (baselineLookup.has(normalized)) {
      return columnName;
    }
    const aliased = aliasMap.get(normalized);
    if (!aliased) {
      return columnName;
    }
    rewrites.push({ from: columnName, to: aliased });
    return aliased;
  };
  const rewrittenPlan = {
    ...candidatePlan,
    operations: candidatePlan.operations.map((operation) => rewriteOperationColumnAliases(operation, resolveColumnName)),
    outputColumns: candidatePlan.outputColumns.map((column) => {
      const rewrittenName = resolveColumnName(column.name);
      return rewrittenName === column.name ? column : { ...column, name: rewrittenName };
    })
  };
  return {
    plan: rewrittenPlan,
    rewrites: rewrites.filter(
      (rewrite, index, array) => array.findIndex((candidate) => candidate.from === rewrite.from && candidate.to === rewrite.to) === index
    )
  };
};
const compareSchemaOnlyOutput = (baselineColumns, outputColumns) => {
  const issues = [];
  const baselineLookup = buildColumnTypeLookup(baselineColumns);
  buildColumnTypeLookup(outputColumns);
  const baselineNames = new Set(baselineColumns.map((column) => normalizeColumnName(column.name)));
  const outputNames = new Set(outputColumns.map((column) => normalizeColumnName(column.name)));
  const removedColumns = [...baselineNames].filter((name) => !outputNames.has(name));
  const addedColumns = [...outputNames].filter((name) => !baselineNames.has(name));
  if (removedColumns.length > 0) {
    issues.push(`Schema-only plan removed columns: ${removedColumns.join(", ")}`);
  }
  if (addedColumns.length > 0) {
    issues.push(`Schema-only plan added columns: ${addedColumns.join(", ")}`);
  }
  outputColumns.forEach((column) => {
    const baselineType = baselineLookup.get(normalizeColumnName(column.name));
    if (!baselineType) return;
    if (baselineType !== column.type) return;
  });
  return issues;
};
const hasSchemaOnlyTypeRefinement = (baselineColumns, outputColumns) => {
  const baselineLookup = new Map(
    baselineColumns.map((column) => [normalizeColumnName(column.name), column.type])
  );
  return outputColumns.some((column) => baselineLookup.get(normalizeColumnName(column.name)) !== column.type);
};
const buildStableSchemaOnlyExplanation = (baselineColumns, outputColumns) => hasSchemaOnlyTypeRefinement(baselineColumns, outputColumns) ? "Prepared rows remain unchanged while refining schema types for analysis." : "Prepared rows remain unchanged and the tabular schema is preserved for analysis.";
const stabilizeZeroOperationSchemaOnlyPlan = (plan, baselineColumns) => {
  var _a;
  if (plan.operations.length > 0) {
    return plan;
  }
  const outputColumns = ((_a = plan.outputColumns) == null ? void 0 : _a.length) > 0 ? plan.outputColumns : baselineColumns;
  const schemaIssues = compareSchemaOnlyOutput(baselineColumns, outputColumns);
  const explanationClaimsMutation = MUTATION_CLAIM_PATTERN.test(plan.explanation);
  if (!explanationClaimsMutation && schemaIssues.length === 0) {
    return {
      ...plan,
      outputColumns
    };
  }
  const alignedOutputColumns = alignSchemaOnlyOutputColumns(baselineColumns, outputColumns);
  return {
    ...plan,
    explanation: buildStableSchemaOnlyExplanation(baselineColumns, alignedOutputColumns),
    outputColumns: alignedOutputColumns,
    planStatus: "schema_only",
    consistencyIssues: []
  };
};
const summarizeColumnListIssue = (message, pattern, label) => {
  const match = message.match(pattern);
  if (!(match == null ? void 0 : match[1])) {
    return null;
  }
  const columns = match[1].split(",").map((column) => column.trim()).filter(Boolean);
  return [
    `${label}_count=${columns.length}`,
    `${label}_examples=${columns.slice(0, RETRY_EXAMPLE_LIMIT).join(",") || "none"}`
  ];
};
const buildRetryFeedback = (error) => {
  if (!error) {
    return null;
  }
  const message = error.message || "";
  const feedbackLines = [];
  const removedSummary = summarizeColumnListIssue(
    message,
    /Schema-only plan removed columns:\s*(.+?)(?=\s+Schema-only plan added columns:|\s+Schema-only plan explanation claims executed mutations despite having zero operations\.|$)/,
    "schema_only_removed_columns"
  );
  const addedSummary = summarizeColumnListIssue(
    message,
    /Schema-only plan added columns:\s*(.+?)(?=\s+Schema-only plan explanation claims executed mutations despite having zero operations\.|$)/,
    "schema_only_added_columns"
  );
  if (removedSummary) {
    feedbackLines.push(...removedSummary);
  }
  if (addedSummary) {
    feedbackLines.push(...addedSummary);
  }
  if (message.includes("Schema-only plan explanation claims executed mutations despite having zero operations.")) {
    feedbackLines.push("mutation_claim_in_explanation=true");
  }
  if (message.includes(WIDE_TABLE_VALUE_CAST_ORDER_ERROR)) {
    feedbackLines.push("wide_table_value_requires_unpivot=true");
    feedbackLines.push("Do not assume derived long-table columns such as Value, SeriesKey, or SeriesLabelL* already exist.");
    feedbackLines.push('If you need Value, first emit it with unpivot_columns using valueColumn="Value", then cast it in a later operation.');
  }
  if (feedbackLines.length === 0) {
    feedbackLines.push(`execution_error_summary=${truncateContextText(message, RETRY_DETAIL_MAX_CHARS)}`);
  }
  feedbackLines.push("Fix the prior inconsistency. Keep the schema unchanged unless emitted operations explicitly change it.");
  return feedbackLines.join("\n");
};
const buildWideTableProfile = (columns, sourceData) => {
  const numericColumns = columns.filter((column) => isNumericType(column.type));
  const identifierColumns = columns.filter(
    (column) => IDENTIFIER_COLUMN_PATTERN.test(column.name) || column.type === "categorical" || column.type === "date" || column.type === "time"
  );
  const repeatedMatrixColumns = numericColumns.filter((column) => DIGIT_HEAVY_COLUMN_PATTERN.test(column.name));
  const businessMetricColumns = numericColumns.filter(
    (column) => !DIGIT_HEAVY_COLUMN_PATTERN.test(column.name) && BUSINESS_METRIC_COLUMN_PATTERN.test(column.name)
  );
  const numericShare = columns.length > 0 ? numericColumns.length / columns.length : 0;
  const preservedHeaderLayers = ((sourceData == null ? void 0 : sourceData.headerLayers) ?? []).filter(isMeaningfulHeaderLayer).length;
  const repeatedBundleTable = isRepeatedAttributeBundleTable(sourceData ?? null);
  const hasMatrixSignal = repeatedMatrixColumns.length >= WIDE_TABLE_SAMPLE_MATRIX_COLUMNS || preservedHeaderLayers > 0;
  const meetsNumericDensity = preservedHeaderLayers > 0 ? numericColumns.length >= MULTI_HEADER_NUMERIC_COLUMN_THRESHOLD && numericShare >= MULTI_HEADER_NUMERIC_SHARE_THRESHOLD : numericColumns.length >= WIDE_TABLE_NUMERIC_COLUMN_THRESHOLD && numericShare >= WIDE_TABLE_NUMERIC_SHARE_THRESHOLD;
  return {
    isWide: !repeatedBundleTable && meetsNumericDensity && hasMatrixSignal,
    identifierColumns,
    repeatedMatrixColumns,
    businessMetricColumns
  };
};
const getWideTableValueCastOrderIssue = (operations, wideProfile) => {
  if (!wideProfile.isWide) {
    return null;
  }
  let valueColumnEmitted = false;
  for (const operation of operations) {
    if (operation.type === "unpivot_columns" && normalizeColumnName(operation.valueColumn) === "value") {
      valueColumnEmitted = true;
    }
    if (operation.type === "cast_column" && normalizeColumnName(operation.column) === "value" && !valueColumnEmitted) {
      return 'Wide-table plans may cast "Value" only after an unpivot_columns step emits valueColumn "Value".';
    }
  }
  return null;
};
const formatCompactColumnProfiles = (columns) => columns.length === 0 ? "None" : formatColumnProfiles(columns);
const buildDataPreparationSchemaContext = (columns, sourceData) => {
  const wideProfile = buildWideTableProfile(columns, sourceData);
  if (!wideProfile.isWide) {
    return {
      schemaText: formatColumnProfiles(columns),
      wideTableSummary: null,
      wideProfile
    };
  }
  const remainingColumns = columns.filter(
    (column) => !wideProfile.identifierColumns.includes(column) && !wideProfile.repeatedMatrixColumns.includes(column) && !wideProfile.businessMetricColumns.includes(column)
  );
  return {
    schemaText: [
      `Wide-table hint: many repeated numeric matrix columns plus descriptor columns.`,
      `Identifier-like columns:
${formatCompactColumnProfiles(wideProfile.identifierColumns.slice(0, 6))}`,
      `Repeated numeric matrix columns: ${wideProfile.repeatedMatrixColumns.length} column(s); examples:
${formatCompactColumnProfiles(wideProfile.repeatedMatrixColumns.slice(0, 8))}`,
      `Business metric columns:
${formatCompactColumnProfiles(wideProfile.businessMetricColumns.slice(0, 6))}`,
      remainingColumns.length > 0 ? `Other columns not expanded individually: ${remainingColumns.length}` : null
    ].filter(Boolean).join("\n\n"),
    wideTableSummary: [
      `identifier_like_columns=${wideProfile.identifierColumns.map((column) => column.name).slice(0, 6).join(", ") || "none"}`,
      `repeated_numeric_matrix_columns_count=${wideProfile.repeatedMatrixColumns.length}`,
      `repeated_numeric_matrix_examples=${wideProfile.repeatedMatrixColumns.map((column) => column.name).slice(0, 6).join(", ") || "none"}`,
      `business_metric_columns=${wideProfile.businessMetricColumns.map((column) => column.name).slice(0, 6).join(", ") || "none"}`
    ].join("\n"),
    wideProfile
  };
};
const uniqueIndices = (indices) => Array.from(new Set(indices.filter((index) => index >= 0)));
const findHierarchyParentRowIndex = (sampleData, identifierColumnName) => {
  if (!identifierColumnName) return null;
  const values = sampleData.map((row, index) => ({ index, value: normalizeCellValue(row[identifierColumnName]) })).filter((entry) => entry.value.length > 0);
  for (const candidate of values) {
    const hasChild = values.some(
      (other) => other.index !== candidate.index && other.value.length > candidate.value.length && other.value.startsWith(candidate.value)
    );
    if (hasChild) {
      return candidate.index;
    }
  }
  return null;
};
const buildWideTableSampleColumns = (columns, wideProfile) => {
  const selected = [];
  const pushColumn = (columnName) => {
    if (!selected.includes(columnName)) {
      selected.push(columnName);
    }
  };
  wideProfile.identifierColumns.slice(0, 4).forEach((column) => pushColumn(column.name));
  wideProfile.repeatedMatrixColumns.slice(0, WIDE_TABLE_SAMPLE_MATRIX_COLUMNS).forEach((column) => pushColumn(column.name));
  wideProfile.businessMetricColumns.slice(0, WIDE_TABLE_SAMPLE_BUSINESS_METRIC_COLUMNS).forEach((column) => pushColumn(column.name));
  const totalColumn = columns.find((column) => /total/i.test(column.name));
  if (totalColumn) {
    pushColumn(totalColumn.name);
  }
  columns.slice(0, 2).forEach((column) => pushColumn(column.name));
  return {
    selectedColumns: selected,
    omittedColumnCount: Math.max(columns.length - selected.length, 0)
  };
};
const buildDataPreparationSampleRows = (columns, sampleData, sourceData) => {
  var _a, _b, _c, _d, _e, _f;
  const wideProfile = buildWideTableProfile(columns, sourceData);
  if (!wideProfile.isWide) {
    return {
      rows: sampleData.slice(0, 8),
      sampleSummary: null,
      hasHierarchySignal: false
    };
  }
  const { selectedColumns, omittedColumnCount } = buildWideTableSampleColumns(columns, wideProfile);
  const primaryIdentifierColumn = ((_a = wideProfile.identifierColumns.find(
    (column) => /code|account|acct|id|document|project/i.test(column.name)
  )) == null ? void 0 : _a.name) ?? ((_b = wideProfile.identifierColumns[0]) == null ? void 0 : _b.name) ?? null;
  const descriptionColumn = ((_c = wideProfile.identifierColumns.find(
    (column) => /description|name|label/i.test(column.name)
  )) == null ? void 0 : _c.name) ?? ((_d = wideProfile.identifierColumns[1]) == null ? void 0 : _d.name) ?? null;
  const detailIndex = sampleData.findIndex(
    (row) => (primaryIdentifierColumn ? isFilledValue(row[primaryIdentifierColumn]) : true) && (descriptionColumn ? isFilledValue(row[descriptionColumn]) : true)
  );
  const hierarchyIndex = findHierarchyParentRowIndex(sampleData, primaryIdentifierColumn);
  const hierarchyChildIndex = hierarchyIndex != null ? sampleData.findIndex(
    (row, index) => {
      var _a2, _b2;
      return index !== hierarchyIndex && primaryIdentifierColumn && isFilledValue(row[primaryIdentifierColumn]) && normalizeCellValue(row[primaryIdentifierColumn]).startsWith(
        normalizeCellValue((_a2 = sampleData[hierarchyIndex]) == null ? void 0 : _a2[primaryIdentifierColumn])
      ) && normalizeCellValue(row[primaryIdentifierColumn]).length > normalizeCellValue((_b2 = sampleData[hierarchyIndex]) == null ? void 0 : _b2[primaryIdentifierColumn]).length;
    }
  ) : null;
  const summaryIndex = sampleData.findIndex(
    (row) => primaryIdentifierColumn ? !isFilledValue(row[primaryIdentifierColumn]) && (descriptionColumn ? isFilledValue(row[descriptionColumn]) : true) : false
  );
  const anomalyIndex = sampleData.findIndex(
    (row) => selectedColumns.some((columnName) => normalizeCellValue(row[columnName]).startsWith("-"))
  );
  const chosenIndices = uniqueIndices([
    detailIndex,
    hierarchyIndex ?? -1,
    summaryIndex,
    anomalyIndex,
    ...sampleData.map((_row, index) => index)
  ]).slice(0, WIDE_TABLE_SAMPLE_ROW_LIMIT);
  const rows = chosenIndices.map((index) => {
    const sourceRow = sampleData[index];
    const projected = selectedColumns.reduce((accumulator, columnName) => {
      accumulator[columnName] = sourceRow[columnName] ?? null;
      return accumulator;
    }, {});
    const role = index === detailIndex ? "detail_candidate" : index === hierarchyIndex ? "hierarchy_parent_candidate" : index === summaryIndex ? "summary_or_metadata_candidate" : index === anomalyIndex ? "anomaly_candidate" : "sample_candidate";
    return {
      SampleRole: role,
      SourceSampleIndex: index,
      ...projected
    };
  });
  return {
    rows,
    sampleSummary: [
      `wide_table_hint=many repeated numeric matrix columns plus descriptor columns`,
      `sample_columns=${selectedColumns.join(", ")}`,
      `omitted_repeated_or_secondary_columns=${omittedColumnCount}`,
      hierarchyIndex != null && primaryIdentifierColumn ? `hierarchy_signal=identifier prefix hierarchy detected in ${primaryIdentifierColumn}` : null,
      hierarchyIndex != null && primaryIdentifierColumn ? `hierarchy_parent_example=${normalizeCellValue((_e = sampleData[hierarchyIndex]) == null ? void 0 : _e[primaryIdentifierColumn])}` : null,
      hierarchyChildIndex != null && primaryIdentifierColumn ? `hierarchy_child_example=${normalizeCellValue((_f = sampleData[hierarchyChildIndex]) == null ? void 0 : _f[primaryIdentifierColumn])}` : null
    ].filter(Boolean).join("\n"),
    hasHierarchySignal: hierarchyIndex != null
  };
};
const buildHeaderLayerContext = (sourceData) => {
  const headerLayers = ((sourceData == null ? void 0 : sourceData.headerLayers) ?? []).filter(isMeaningfulHeaderLayer);
  if (headerLayers.length === 0) {
    return {
      summary: null,
      requiredLabelLayers: 0
    };
  }
  return {
    summary: [
      `Preserved header label layers: ${headerLayers.length}`,
      ...headerLayers.map((row, index) => `Layer ${index + 1}: ${row.map((value) => String(value ?? "").trim() || "∅").join(" | ")}`)
    ].join("\n"),
    requiredLabelLayers: headerLayers.length
  };
};
const buildHierarchyAnnotationFallbackPlan = (columns) => ({
  explanation: "Add hierarchy annotations so hierarchical parent/detail rows remain verifiable in the cleaned output.",
  operations: [
    {
      id: "annotate_hierarchy_fallback",
      type: "annotate_hierarchy",
      reason: "Preserve hierarchy depth, row class, and source row index for hierarchical statements.",
      rowClassColumn: "RowClass",
      hierarchyDepthColumn: "HierarchyDepth",
      sourceRowIndexColumn: "SourceRowIndex"
    }
  ],
  outputColumns: [
    ...ensureStructuralMetadataOutputColumns(columns)
  ],
  planStatus: "operations",
  consistencyIssues: []
});
const ensureHierarchyOutputColumns = (outputColumns) => {
  return ensureStructuralMetadataOutputColumns(outputColumns);
};
const appendAnnotateHierarchyOperation = (plan, baselineColumns) => {
  var _a;
  if (plan.operations.some((operation) => operation.type === "annotate_hierarchy")) {
    return plan;
  }
  const outputColumns = ensureHierarchyOutputColumns(
    ((_a = plan.outputColumns) == null ? void 0 : _a.length) > 0 ? [...plan.outputColumns] : [...baselineColumns]
  );
  return {
    ...plan,
    explanation: `${plan.explanation} Preserve hierarchy metadata for verification and downstream analysis.`,
    operations: [
      ...plan.operations,
      {
        id: "append_hierarchy_annotation",
        type: "annotate_hierarchy",
        reason: "Preserve hierarchy depth, row class, and source row coordinates for hierarchical rows.",
        rowClassColumn: "RowClass",
        hierarchyDepthColumn: "HierarchyDepth",
        sourceRowIndexColumn: "SourceRowIndex"
      }
    ],
    outputColumns,
    planStatus: "operations",
    consistencyIssues: []
  };
};
const reorderWideValueCastAfterUnpivot = (operations) => {
  const lastUnpivotIndex = operations.reduce((index, operation, currentIndex) => operation.type === "unpivot_columns" && normalizeColumnName(operation.valueColumn) === "value" ? currentIndex : index, -1);
  if (lastUnpivotIndex < 0) {
    return null;
  }
  const valueCastIndexes = operations.reduce((indexes, operation, currentIndex) => {
    if (currentIndex < lastUnpivotIndex && operation.type === "cast_column" && normalizeColumnName(operation.column) === "value") {
      indexes.push(currentIndex);
    }
    return indexes;
  }, []);
  if (valueCastIndexes.length === 0) {
    return null;
  }
  const reordered = operations.filter((_operation, index) => !valueCastIndexes.includes(index));
  const castOperations = valueCastIndexes.map((index) => operations[index]);
  reordered.splice(lastUnpivotIndex + 1 - valueCastIndexes.filter((index) => index <= lastUnpivotIndex).length, 0, ...castOperations);
  return reordered;
};
const patchHierarchyUnpivotFromFallback = (operations, fallbackPlan) => {
  var _a, _b, _c;
  if (!fallbackPlan) {
    return null;
  }
  const fallbackUnpivot = [...fallbackPlan.operations].reverse().find((operation) => operation.type === "unpivot_columns");
  const targetIndex = ((_a = [...operations].map((operation, index) => ({ operation, index })).reverse().find((candidate) => candidate.operation.type === "unpivot_columns")) == null ? void 0 : _a.index) ?? -1;
  if (!fallbackUnpivot || fallbackUnpivot.type !== "unpivot_columns" || targetIndex < 0) {
    return null;
  }
  const targetOperation = operations[targetIndex];
  if (targetOperation.type !== "unpivot_columns") {
    return null;
  }
  const nextOperation = {
    ...targetOperation,
    sourceRowIndexColumn: targetOperation.sourceRowIndexColumn ?? fallbackUnpivot.sourceRowIndexColumn,
    rowClassColumn: targetOperation.rowClassColumn ?? fallbackUnpivot.rowClassColumn,
    rowClassMappings: (((_b = targetOperation.rowClassMappings) == null ? void 0 : _b.length) ?? 0) > 0 ? targetOperation.rowClassMappings : fallbackUnpivot.rowClassMappings,
    hierarchyDepthColumn: targetOperation.hierarchyDepthColumn ?? fallbackUnpivot.hierarchyDepthColumn,
    hierarchyDepthMappings: (((_c = targetOperation.hierarchyDepthMappings) == null ? void 0 : _c.length) ?? 0) > 0 ? targetOperation.hierarchyDepthMappings : fallbackUnpivot.hierarchyDepthMappings
  };
  const nextOperations = [...operations];
  nextOperations[targetIndex] = nextOperation;
  return nextOperations;
};
const simulatePlanOnRows = (sourceData, plan) => {
  if (plan.operations.length === 0) {
    return {
      ...sourceData,
      data: [...sourceData.data]
    };
  }
  const result = applyDataOperations(sourceData.data, plan.operations);
  if (!Array.isArray(result.data)) {
    throw new Error("Generated operations did not return an array.");
  }
  return {
    ...sourceData,
    data: result.data
  };
};
const getHierarchyWidePlanIssue = (operations, shouldForceHierarchyFallback, requireHierarchyDepth) => {
  if (!shouldForceHierarchyFallback) {
    return null;
  }
  if (operations.some((operation) => operation.type === "annotate_hierarchy")) {
    return null;
  }
  const latestUnpivot = [...operations].reverse().find((operation) => operation.type === "unpivot_columns");
  if (!latestUnpivot || latestUnpivot.type !== "unpivot_columns") {
    return {
      message: "Hierarchical wide plans must either add annotate_hierarchy or reshape with unpivot_columns that preserves hierarchy fields.",
      canUseAnnotationFallback: true
    };
  }
  if (!latestUnpivot.rowClassColumn) {
    return {
      message: "Hierarchical wide unpivot plans must preserve rowClassColumn.",
      canUseAnnotationFallback: false
    };
  }
  if (requireHierarchyDepth && !latestUnpivot.hierarchyDepthColumn) {
    return {
      message: "Hierarchical wide unpivot plans must preserve hierarchyDepthColumn.",
      canUseAnnotationFallback: false
    };
  }
  if (!latestUnpivot.sourceRowIndexColumn) {
    return {
      message: "Hierarchical wide unpivot plans must preserve sourceRowIndexColumn.",
      canUseAnnotationFallback: true
    };
  }
  if (requireHierarchyDepth && normalizeUnpivotHierarchyDepthMappings(latestUnpivot).length === 0) {
    return {
      message: "Hierarchical wide unpivot plans must preserve hierarchyDepthMappings.",
      canUseAnnotationFallback: true
    };
  }
  return null;
};
const hasExecutableHierarchyShape = (sampleData, sourceData) => {
  var _a;
  const probeData = {
    fileName: (sourceData == null ? void 0 : sourceData.fileName) ?? "hierarchy-probe.csv",
    data: (((_a = sourceData == null ? void 0 : sourceData.data) == null ? void 0 : _a.length) ?? 0) > 0 ? sourceData.data : sampleData,
    // Match annotate_hierarchy mutator semantics exactly so preflight checks
    // do not accept shapes that the executor would later reject.
    metadataRows: [],
    headerLayers: [],
    summaryRows: [],
    headerDepth: 1
  };
  const profile = detectReportShape(probeData);
  return profile.primaryKind === "hierarchical_statement" || profile.rowRoles.some(
    (candidate) => ["group_header", "subtotal", "total"].includes(candidate.role)
  );
};
const canAppendAnnotateHierarchyOperation = (plan, sampleData, sourceData) => {
  if (plan.operations.some((operation) => operation.type === "annotate_hierarchy")) {
    return true;
  }
  try {
    const simulatedSample = {
      fileName: "hierarchy-append-probe.csv",
      data: applyDataOperations(sampleData, plan.operations).data,
      metadataRows: [],
      headerLayers: [],
      summaryRows: [],
      headerDepth: 1
    };
    if (!hasExecutableHierarchyShape(simulatedSample.data, simulatedSample)) {
      return false;
    }
    if (!sourceData) {
      return true;
    }
    const simulatedSource = simulatePlanOnRows(sourceData, plan);
    return hasExecutableHierarchyShape(simulatedSource.data, simulatedSource);
  } catch {
    return false;
  }
};
const canAppendSourceOnlyAnnotateHierarchyOperation = (plan, sourceData) => {
  if (!sourceData) {
    return false;
  }
  if (plan.operations.some((operation) => operation.type === "annotate_hierarchy")) {
    return true;
  }
  try {
    const simulatedSource = simulatePlanOnRows(sourceData, plan);
    return hasExecutableHierarchyShape(simulatedSource.data, simulatedSource);
  } catch {
    return false;
  }
};
const canBypassSampleExecutionForSourceOnlyHierarchyPlan = (plan, sampleData, sourceData) => {
  if (!sourceData || plan.operations.every((operation) => operation.type !== "annotate_hierarchy")) {
    return false;
  }
  const annotateIndex = plan.operations.findIndex((operation) => operation.type === "annotate_hierarchy");
  const preAnnotateOperations = annotateIndex > 0 ? plan.operations.slice(0, annotateIndex) : [];
  try {
    const sampleRowsBeforeAnnotate = preAnnotateOperations.length > 0 ? applyDataOperations(sampleData, preAnnotateOperations).data : sampleData;
    if (hasExecutableHierarchyShape(sampleRowsBeforeAnnotate, null)) {
      return false;
    }
    const sourceRowsBeforeAnnotate = preAnnotateOperations.length > 0 ? applyDataOperations(sourceData.data, preAnnotateOperations).data : sourceData.data;
    return hasExecutableHierarchyShape(sourceRowsBeforeAnnotate, {
      ...sourceData,
      data: sourceRowsBeforeAnnotate
    });
  } catch {
    return false;
  }
};
const buildDeterministicWideFallbackPlan = (columns, sourceData) => {
  var _a, _b, _c;
  if (!sourceData) {
    return null;
  }
  const action = buildWideReshapeFallbackAction(sourceData) ?? buildDeterministicCleaningFallbackAction(
    sourceData,
    void 0,
    {
      status: "confirmed",
      summaryStartIndex: sourceData.data.length,
      requiresReshape: true,
      requiresCleanupOnly: false
    }
  );
  if (!action) {
    return null;
  }
  const explanation = typeof ((_a = action.args) == null ? void 0 : _a.explanation) === "string" ? action.args.explanation : "Apply deterministic fallback cleaning for a wide report.";
  const operations = Array.isArray((_b = action.args) == null ? void 0 : _b.operations) ? action.args.operations : [];
  const outputColumns = Array.isArray((_c = action.args) == null ? void 0 : _c.outputColumns) && action.args.outputColumns.length > 0 ? action.args.outputColumns : columns;
  if (operations.length === 0) {
    return null;
  }
  return {
    explanation,
    operations,
    outputColumns,
    planStatus: "operations",
    consistencyIssues: []
  };
};
const buildDeterministicCleanupFallbackPlan = (columns, sourceData, runtimeTableAssessment) => {
  var _a, _b, _c;
  if (!sourceData) {
    return null;
  }
  const action = buildDeterministicCleaningFallbackAction(sourceData, void 0, runtimeTableAssessment);
  if (!action) {
    return null;
  }
  const explanation = typeof ((_a = action.args) == null ? void 0 : _a.explanation) === "string" ? action.args.explanation : "Apply deterministic fallback cleaning for a tabular report.";
  const operations = Array.isArray((_b = action.args) == null ? void 0 : _b.operations) ? action.args.operations : [];
  const outputColumns = Array.isArray((_c = action.args) == null ? void 0 : _c.outputColumns) && action.args.outputColumns.length > 0 ? action.args.outputColumns : columns;
  if (operations.length === 0) {
    return null;
  }
  return {
    explanation,
    operations,
    outputColumns,
    planStatus: "operations",
    consistencyIssues: []
  };
};
const buildConfirmedCleanupOnlyAssessment = (sourceData, reason) => ({
  source: "raw_inspect",
  status: "confirmed",
  headerRowIndex: 0,
  headerLayerRowIndexes: (sourceData.headerLayers ?? []).map((_, index) => index),
  bodyStartIndex: 0,
  summaryStartIndex: sourceData.data.length,
  repeatedHeaderRowIndexes: [],
  parameterRowIndexes: [],
  noiseRowIndexes: [],
  requiresReshape: false,
  requiresCleanupOnly: true,
  reason
});
const resolveDeterministicFastPathPlan = (params) => {
  var _a, _b, _c, _d, _e;
  if (!params.sourceData) {
    return null;
  }
  const evaluate = (plan) => {
    try {
      const cleanedData = simulatePlanOnRows(params.sourceData, plan);
      return verifyCleanedDatasetShape(params.sourceData, cleanedData, plan);
    } catch (error) {
      return {
        passed: false,
        reason: error instanceof Error ? error.message : String(error),
        signalKey: null,
        detail: null
      };
    }
  };
  const isStructuredHierarchyNormalizationCandidate = ((_a = params.sourceShapeProfile) == null ? void 0 : _a.primaryKind) === "already_tabular" && params.hierarchyPreservationRequired;
  if (isStructuredHierarchyNormalizationCandidate && params.boundedHierarchyAnnotationAvailable) {
    const hierarchyNormalizationPlan = buildDeterministicNormalizationPlan(
      buildHierarchyAnnotationFallbackPlan(params.columns),
      params.columns,
      params.sourceData.data
    ).plan;
    const verification = evaluate(hierarchyNormalizationPlan);
    if (verification.passed) {
      emitDataPreparationTelemetry(
        params.telemetryTarget,
        "data_prep_hierarchy_annotation_normalized",
        "Skipped provider planning because hierarchy annotation already satisfied the cleaning contract for a grouped tabular report.",
        {
          reasonCode: "hierarchy_annotation_fast_path",
          fastPath: true,
          reportShapeKind: ((_b = params.sourceShapeProfile) == null ? void 0 : _b.primaryKind) ?? "unknown"
        }
      );
      return hierarchyNormalizationPlan;
    }
  }
  const isHierarchyHeavy = ((_c = params.sourceShapeProfile) == null ? void 0 : _c.primaryKind) === "mixed_report" || isRepeatedAttributeBundleTable(params.sourceData);
  if (isHierarchyHeavy && params.boundedHierarchyAnnotationAvailable) {
    const hierarchyFallbackPlan = buildHierarchyAnnotationFallbackPlan(params.columns);
    const verification = evaluate(hierarchyFallbackPlan);
    if (verification.passed) {
      emitDataPreparationTelemetry(
        params.telemetryTarget,
        "data_prep_hierarchy_annotation_normalized",
        "Skipped provider planning because annotate_hierarchy already satisfied the cleaning contract for a hierarchy-heavy report.",
        {
          reasonCode: "hierarchy_annotation_fast_path",
          fastPath: true,
          reportShapeKind: ((_d = params.sourceShapeProfile) == null ? void 0 : _d.primaryKind) ?? "unknown"
        }
      );
      return hierarchyFallbackPlan;
    }
  }
  if (isHierarchyHeavy && params.deterministicCleanupFallback) {
    const verification = evaluate(params.deterministicCleanupFallback);
    if (verification.passed) {
      emitDataPreparationTelemetry(
        params.telemetryTarget,
        "data_prep_deterministic_fallback_used",
        "Skipped provider planning because deterministic cleanup already satisfied the cleaning contract for a hierarchy-heavy report.",
        {
          reasonCode: "shape_mismatch",
          fastPath: true,
          reportShapeKind: ((_e = params.sourceShapeProfile) == null ? void 0 : _e.primaryKind) ?? "unknown"
        }
      );
      return params.deterministicCleanupFallback;
    }
  }
  return null;
};
const buildBlankRowCleanupFallbackPlan = (columns, sampleData, sourceData) => {
  var _a;
  const rows = (((_a = sourceData == null ? void 0 : sourceData.data) == null ? void 0 : _a.length) ?? 0) > 0 ? sourceData.data : sampleData;
  const hasBlankRows = rows.some((row) => Object.values(row).every((value) => String(value ?? "").trim().length === 0));
  if (!hasBlankRows) {
    return null;
  }
  return {
    explanation: "Remove fully blank rows while preserving the existing tabular schema.",
    operations: [
      {
        id: "drop_blank_rows_fallback",
        type: "drop_blank_rows",
        reason: "Remove fully blank rows that would otherwise leak into verification."
      }
    ],
    outputColumns: columns,
    planStatus: "operations",
    consistencyIssues: []
  };
};
const validateDataPreparationPlan = (plan, baselineColumns) => {
  if (plan.operations.length > 0) {
    return {
      ...plan,
      planStatus: "operations",
      consistencyIssues: []
    };
  }
  const issues = [];
  const explanationClaimsMutation = MUTATION_CLAIM_PATTERN.test(plan.explanation);
  const schemaIssues = compareSchemaOnlyOutput(baselineColumns, plan.outputColumns);
  if (!explanationClaimsMutation && schemaIssues.length > 0) {
    return {
      ...plan,
      outputColumns: alignSchemaOnlyOutputColumns(baselineColumns, plan.outputColumns),
      planStatus: "schema_only",
      consistencyIssues: []
    };
  }
  issues.push(...schemaIssues);
  if (explanationClaimsMutation) {
    issues.push("Schema-only plan explanation claims executed mutations despite having zero operations.");
  }
  return {
    ...plan,
    planStatus: issues.length > 0 ? "inconsistent" : "schema_only",
    consistencyIssues: issues
  };
};
const generateDataPreparationPlan = async (columns, sampleData, settings, lastError, telemetryTarget, sourceData, runtimeContext, options) => {
  var _a, _b;
  const resolvedOptions = resolveDataPreparationOptions(options);
  const abortSignal = resolvedOptions.abortSignal;
  const schemaContext = buildDataPreparationSchemaContext(columns, sourceData);
  const sampleContext = buildDataPreparationSampleRows(columns, sampleData, sourceData);
  const headerLayerContext = buildHeaderLayerContext(sourceData);
  const sourceShapeProfile = sourceData ? detectReportShape(sourceData) : null;
  const sourcePrimaryHypothesis = sourceData && sourceShapeProfile ? buildReshapeHypotheses(sourceShapeProfile, sourceData)[0] ?? null : null;
  const useCompactWideTableSchema = settings.provider === "google" && schemaContext.wideProfile.isWide;
  const responseSchema = getDataPreparationProviderSchema({ compactWideTable: useCompactWideTableSchema });
  const hierarchyPreservationRequired = sampleContext.hasHierarchySignal || (sourceShapeProfile == null ? void 0 : sourceShapeProfile.primaryKind) === "hierarchical_statement" || (sourceShapeProfile == null ? void 0 : sourceShapeProfile.primaryKind) === "mixed_report" && Boolean(sourcePrimaryHypothesis == null ? void 0 : sourcePrimaryHypothesis.hierarchyDepthColumn) || Boolean(sourcePrimaryHypothesis == null ? void 0 : sourcePrimaryHypothesis.hierarchyDepthColumn);
  const hierarchyDepthPreservationRequired = Boolean(sourcePrimaryHypothesis == null ? void 0 : sourcePrimaryHypothesis.hierarchyDepthColumn) || Boolean(sourceShapeProfile == null ? void 0 : sourceShapeProfile.rowRoles.some((candidate) => (candidate.depth ?? 0) > 0));
  const shouldForceHierarchyFallback = schemaContext.wideProfile.isWide && hierarchyPreservationRequired;
  const sampleHierarchyAnnotationAvailable = hasExecutableHierarchyShape(sampleData, null);
  const sourceHierarchyAnnotationAvailable = hasExecutableHierarchyShape(sampleData, sourceData);
  const boundedHierarchyAnnotationAvailable = sourceHierarchyAnnotationAvailable;
  const canUseHierarchyAnnotationFallback = resolvedOptions.allowHierarchyAnnotationFallback && shouldForceHierarchyFallback && boundedHierarchyAnnotationAvailable;
  const repeatedBundleCleanupAssessment = sourceData && isRepeatedAttributeBundleTable(sourceData) ? buildConfirmedCleanupOnlyAssessment(
    sourceData,
    "Repeated attribute bundle reports should prefer deterministic cleanup and hierarchy preservation over reshape."
  ) : null;
  const treatHierarchyAnnotationAsPrimaryNormalization = hierarchyPreservationRequired && ((sourceShapeProfile == null ? void 0 : sourceShapeProfile.primaryKind) === "hierarchical_statement" || (sourceShapeProfile == null ? void 0 : sourceShapeProfile.primaryKind) === "mixed_report" || Boolean(repeatedBundleCleanupAssessment));
  const treatWideFallbackAsPrimaryNormalization = schemaContext.wideProfile.isWide && !hierarchyDepthPreservationRequired && (((_a = sourceData == null ? void 0 : sourceData.headerLayers) == null ? void 0 : _a.some(isMeaningfulHeaderLayer)) ?? false);
  const strictMode = resolvedOptions.maxAttempts === 1 && !resolvedOptions.allowInternalRetry;
  const salvageWideFallback = buildDeterministicWideFallbackPlan(columns, sourceData);
  const salvageStagingCleanupFallback = sourceData ? buildDeterministicCleanupFallbackPlan(columns, sourceData, repeatedBundleCleanupAssessment) : null;
  const deterministicCleanupFallback = resolvedOptions.allowDeterministicFallback ? schemaContext.wideProfile.isWide ? shouldForceHierarchyFallback ? salvageStagingCleanupFallback ?? salvageWideFallback : salvageWideFallback ?? salvageStagingCleanupFallback : buildDeterministicCleanupFallbackPlan(columns, sourceData, repeatedBundleCleanupAssessment) : null;
  let selfCorrectionTelemetryEmitted = false;
  const fastPathStartedAt = Date.now();
  const deterministicFastPathPlan = resolveDeterministicFastPathPlan({
    columns,
    sourceData,
    sourceShapeProfile,
    hierarchyPreservationRequired,
    shouldForceHierarchyFallback,
    boundedHierarchyAnnotationAvailable,
    deterministicCleanupFallback,
    telemetryTarget
  });
  if (deterministicFastPathPlan) {
    emitDataPreparationStageTiming(
      telemetryTarget,
      "fast_path_verification",
      Date.now() - fastPathStartedAt,
      { fastPath: true }
    );
    return deterministicFastPathPlan;
  }
  for (let i = 0; i < resolvedOptions.maxAttempts; i++) {
    try {
      throwIfAborted(abortSignal);
      const systemPrompt = dataPreparationSystemPrompt;
      const { model, modelId } = createProviderModel(settings, settings.complexModel);
      const providerCallStartedAt = Date.now();
      const result = await runWithOverflowCompaction({
        provider: settings.provider,
        abortSignal,
        execute: async (compactionMode) => {
          var _a2, _b2;
          throwIfAborted(abortSignal);
          const managed = await prepareManagedContext({
            callType: "data_prep",
            systemText: systemPrompt,
            baseUserText: "Dataset context for planning:",
            sections: [
              createContextSection("dataset_schema", `Dataset columns (initial schema):
${schemaContext.schemaText}`, "required", "sticky"),
              createContextSection("wide_table_summary", `Wide-table structure summary:
${schemaContext.wideTableSummary ?? "No wide-table compression applied."}`, "high", "sticky"),
              createContextSection("header_layers", `Preserved raw header layers:
${headerLayerContext.summary ?? "No preserved header label layers."}`, "high", "sticky"),
              createContextSection("sample_data", `Sample data:
${formatRows(sampleContext.rows)}`, "high", "prunable"),
              createContextSection("sample_summary", `Sample summary:
${sampleContext.sampleSummary ?? "Using standard row preview without wide-table compression."}`, "medium", "prunable")
            ],
            settings,
            modelId,
            compactionMode
          });
          reportContextDiagnostics(telemetryTarget, managed.diagnostics);
          const promptContent = createDataPreparationPrompt(
            managed.userText,
            buildRetryFeedback(lastError),
            {
              wideTable: schemaContext.wideProfile.isWide,
              requiredLabelLayers: headerLayerContext.requiredLabelLayers,
              hierarchySignal: sampleContext.hasHierarchySignal,
              inspectionSummary: ((_a2 = runtimeContext == null ? void 0 : runtimeContext.iterationContext) == null ? void 0 : _a2.inspectionSummary) ?? ((runtimeContext == null ? void 0 : runtimeContext.rowInspection) ? `unknown=${runtimeContext.rowInspection.residualUnknownRowIndexes.length}, summary_like=${runtimeContext.rowInspection.residualSummaryLikeRowIndexes.length}` : null),
              priorVerificationFailures: runtimeContext == null ? void 0 : runtimeContext.priorVerificationFailures,
              residualRowsPreview: ((_b2 = runtimeContext == null ? void 0 : runtimeContext.residualRowsPreview) == null ? void 0 : _b2.length) ? formatRows(runtimeContext.residualRowsPreview.slice(0, 8)) : null,
              allowedOperationTypes: runtimeContext == null ? void 0 : runtimeContext.allowedOperationTypes,
              iterationContext: (runtimeContext == null ? void 0 : runtimeContext.iterationContext) ? {
                round: runtimeContext.iterationContext.round,
                maxRounds: runtimeContext.iterationContext.maxRounds
              } : void 0
            }
          );
          return withTransientRetry(
            (fb) => streamGenerateText({
              model: fb ?? model,
              messages: [
                { role: "system", content: managed.systemText },
                { role: "user", content: promptContent }
              ],
              abortSignal,
              output: output_exports.object({
                schema: jsonSchema(prepareSchemaForProvider(responseSchema, settings.provider))
              })
            }),
            { settings, primaryModelId: modelId, label: "dataPreparer", abortSignal }
          );
        }
      });
      emitDataPreparationStageTiming(
        telemetryTarget,
        "provider_generation",
        Date.now() - providerCallStartedAt,
        { attempt: i + 1, strictMode }
      );
      const plan = normalizeDataPreparationPlan(result.output);
      if (!plan) {
        throw new Error("AI returned an invalid data preparation plan.");
      }
      const telemetryMetaBase = {
        strictMode
      };
      const emitPlanSalvage = (responseType, detail, meta) => emitDataPreparationTelemetry(
        telemetryTarget,
        responseType,
        detail,
        {
          ...telemetryMetaBase,
          ...meta ?? {}
        }
      );
      const emitHierarchyAnnotationNormalization = (detail, meta) => emitDataPreparationTelemetry(
        telemetryTarget,
        "data_prep_hierarchy_annotation_normalized",
        detail,
        {
          ...telemetryMetaBase,
          reasonCode: "hierarchy_annotation_normalized",
          ...meta ?? {}
        }
      );
      const emitWideReshapeNormalization = (detail, meta) => emitDataPreparationTelemetry(
        telemetryTarget,
        "data_prep_wide_reshape_normalized",
        detail,
        {
          ...telemetryMetaBase,
          reasonCode: "wide_reshape_normalized",
          ...meta ?? {}
        }
      );
      const emitHierarchyNormalizationOrSalvage = (detail, meta) => {
        if (treatHierarchyAnnotationAsPrimaryNormalization) {
          emitHierarchyAnnotationNormalization(detail, meta);
          return;
        }
        emitPlanSalvage(
          "data_prep_plan_salvaged_hierarchy",
          detail,
          meta
        );
      };
      const emitWideFallbackNormalizationOrSalvage = (detail, meta) => {
        if (treatWideFallbackAsPrimaryNormalization) {
          emitWideReshapeNormalization(detail, meta);
          return;
        }
        emitPlanSalvage(
          "data_prep_plan_salvaged_wide_fallback",
          detail,
          meta
        );
      };
      const headerAliasRewrite = rewritePlanColumnAliasesFromHeaderLayers(plan, columns, sourceData);
      let candidatePlan = headerAliasRewrite.plan;
      if (headerAliasRewrite.rewrites.length > 0) {
        emitDataPreparationTelemetry(
          telemetryTarget,
          "data_prep_slow_path_diagnostic",
          `Rewrote header-layer alias columns before execution: ${headerAliasRewrite.rewrites.map((rewrite) => `${rewrite.from} -> ${rewrite.to}`).join(", ")}.`,
          {
            ...telemetryMetaBase,
            reasonCode: "header_layer_alias_rewrite",
            rewrites: headerAliasRewrite.rewrites
          }
        );
      }
      const deterministicNormalization = buildDeterministicNormalizationPlan(
        candidatePlan,
        columns,
        (sourceData == null ? void 0 : sourceData.data) ?? sampleData
      );
      if (deterministicNormalization.normalizedPlaceholderColumns.length > 0 || deterministicNormalization.numericStringNormalizedColumns.length > 0) {
        candidatePlan = deterministicNormalization.plan;
        if (deterministicNormalization.normalizedPlaceholderColumns.length > 0) {
          emitDataPreparationTelemetry(
            telemetryTarget,
            "data_prep_placeholder_normalized",
            `Normalized placeholder values in ${deterministicNormalization.normalizedPlaceholderColumns.join(", ")} before SQL readiness checks.`,
            {
              ...telemetryMetaBase,
              normalizedPlaceholderColumns: deterministicNormalization.normalizedPlaceholderColumns
            }
          );
        }
        if (deterministicNormalization.numericStringNormalizedColumns.length > 0) {
          emitDataPreparationTelemetry(
            telemetryTarget,
            "data_prep_numeric_string_casted",
            `Cast numeric-looking string columns before SQL readiness checks: ${deterministicNormalization.numericStringNormalizedColumns.join(", ")}.`,
            {
              ...telemetryMetaBase,
              numericStringNormalizedColumns: deterministicNormalization.numericStringNormalizedColumns
            }
          );
        }
      }
      const reorderedWideOperations = getWideTableValueCastOrderIssue(candidatePlan.operations, schemaContext.wideProfile) ? reorderWideValueCastAfterUnpivot(candidatePlan.operations) : null;
      if (reorderedWideOperations) {
        candidatePlan = {
          ...candidatePlan,
          operations: reorderedWideOperations,
          planStatus: "operations",
          consistencyIssues: []
        };
        emitPlanSalvage(
          "data_prep_plan_salvaged_wide_cast_order",
          "Moved cast_column(Value) after unpivot_columns to keep the plan executable.",
          { salvageType: "wide_cast_order", originalFailureReason: WIDE_TABLE_VALUE_CAST_ORDER_ERROR }
        );
      } else if (getWideTableValueCastOrderIssue(candidatePlan.operations, schemaContext.wideProfile) && schemaContext.wideProfile.isWide) {
        if (hierarchyPreservationRequired && boundedHierarchyAnnotationAvailable) {
          candidatePlan = buildHierarchyAnnotationFallbackPlan(columns);
          emitHierarchyNormalizationOrSalvage(
            "Replaced a hierarchy-losing wide-table plan with annotate_hierarchy.",
            { salvageType: "hierarchy", originalFailureReason: WIDE_TABLE_VALUE_CAST_ORDER_ERROR }
          );
        } else if (strictMode) {
          const wideFallbackPlan = salvageWideFallback;
          if (wideFallbackPlan) {
            candidatePlan = wideFallbackPlan;
            emitPlanSalvage(
              "data_prep_plan_salvaged_wide_fallback",
              "Replaced a wide-table plan that referenced Value before unpivot with deterministic wide fallback.",
              { salvageType: "wide_fallback", originalFailureReason: WIDE_TABLE_VALUE_CAST_ORDER_ERROR }
            );
          } else if (salvageStagingCleanupFallback) {
            candidatePlan = salvageStagingCleanupFallback;
            emitPlanSalvage(
              "data_prep_plan_salvaged_wide_fallback",
              "Replaced a wide-table plan that referenced Value before unpivot with deterministic cleanup fallback.",
              { salvageType: "wide_fallback", originalFailureReason: WIDE_TABLE_VALUE_CAST_ORDER_ERROR }
            );
          }
        }
      }
      if (schemaContext.wideProfile.isWide && candidatePlan.operations.length === 0) {
        if (hierarchyPreservationRequired && boundedHierarchyAnnotationAvailable) {
          candidatePlan = buildHierarchyAnnotationFallbackPlan(columns);
          emitHierarchyNormalizationOrSalvage(
            "Replaced a zero-op hierarchical plan with annotate_hierarchy.",
            { salvageType: "hierarchy", originalFailureReason: "Hierarchical datasets must not return a zero-op or schema-only plan." }
          );
        } else if (strictMode) {
          const wideFallbackPlan = salvageWideFallback;
          if (wideFallbackPlan) {
            candidatePlan = wideFallbackPlan;
            emitPlanSalvage(
              "data_prep_plan_salvaged_wide_fallback",
              "Replaced a zero-op wide-table plan with deterministic wide fallback.",
              { salvageType: "wide_fallback", originalFailureReason: "Wide datasets must not return a zero-op or schema-only plan." }
            );
          } else if (salvageStagingCleanupFallback) {
            candidatePlan = salvageStagingCleanupFallback;
            emitPlanSalvage(
              "data_prep_plan_salvaged_wide_fallback",
              "Replaced a zero-op wide-table plan with deterministic cleanup fallback.",
              { salvageType: "wide_fallback", originalFailureReason: "Wide datasets must not return a zero-op or schema-only plan." }
            );
          }
        }
      }
      if (hierarchyPreservationRequired && !candidatePlan.operations.some((operation) => operation.type === "annotate_hierarchy")) {
        const hierarchyIssue = getHierarchyWidePlanIssue(
          candidatePlan.operations,
          shouldForceHierarchyFallback,
          hierarchyDepthPreservationRequired
        );
        if (hierarchyIssue) {
          const patchedHierarchyOperations = patchHierarchyUnpivotFromFallback(
            candidatePlan.operations,
            salvageWideFallback
          );
          if (patchedHierarchyOperations) {
            const patchedPlan = {
              ...candidatePlan,
              operations: patchedHierarchyOperations,
              outputColumns: ensureHierarchyOutputColumns(
                ((_b = candidatePlan.outputColumns) == null ? void 0 : _b.length) > 0 ? [...candidatePlan.outputColumns] : [...columns]
              ),
              planStatus: "operations",
              consistencyIssues: []
            };
            if (!getHierarchyWidePlanIssue(
              patchedPlan.operations,
              shouldForceHierarchyFallback,
              hierarchyDepthPreservationRequired
            )) {
              candidatePlan = patchedPlan;
              emitPlanSalvage(
                "data_prep_plan_salvaged_hierarchy",
                "Patched missing hierarchy-preserving metadata onto unpivot_columns from the deterministic fallback template.",
                { salvageType: "hierarchy", originalFailureReason: hierarchyIssue.message }
              );
              continue;
            }
          }
          if (salvageWideFallback && !getHierarchyWidePlanIssue(
            salvageWideFallback.operations,
            shouldForceHierarchyFallback,
            hierarchyDepthPreservationRequired
          )) {
            candidatePlan = salvageWideFallback;
            emitWideFallbackNormalizationOrSalvage(
              "Replaced an incomplete hierarchical reshape with deterministic wide fallback.",
              { salvageType: "wide_fallback", originalFailureReason: hierarchyIssue.message }
            );
          } else if (sampleHierarchyAnnotationAvailable) {
            candidatePlan = buildHierarchyAnnotationFallbackPlan(columns);
            emitPlanSalvage(
              "data_prep_plan_salvaged_hierarchy",
              "Replaced an incomplete hierarchical reshape with annotate_hierarchy.",
              { salvageType: "hierarchy", originalFailureReason: hierarchyIssue.message }
            );
          } else if (strictMode) {
            const wideFallbackPlan = salvageWideFallback;
            if (wideFallbackPlan) {
              candidatePlan = wideFallbackPlan;
              emitWideFallbackNormalizationOrSalvage(
                "Replaced an incomplete hierarchical reshape with deterministic wide fallback.",
                { salvageType: "wide_fallback", originalFailureReason: hierarchyIssue.message }
              );
            } else if (salvageStagingCleanupFallback) {
              candidatePlan = salvageStagingCleanupFallback;
              emitPlanSalvage(
                "data_prep_plan_salvaged_wide_fallback",
                "Replaced an incomplete hierarchical reshape with deterministic cleanup fallback.",
                { salvageType: "wide_fallback", originalFailureReason: hierarchyIssue.message }
              );
            }
          }
        } else {
          const canAppendHierarchy = !schemaContext.wideProfile.isWide && (canAppendAnnotateHierarchyOperation(candidatePlan, sampleData, sourceData) || canAppendSourceOnlyAnnotateHierarchyOperation(candidatePlan, sourceData));
          if (canAppendHierarchy) {
            candidatePlan = appendAnnotateHierarchyOperation(candidatePlan, columns);
            emitHierarchyAnnotationNormalization(
              "Appended annotate_hierarchy so hierarchical rows remain verifiable.",
              {
                normalizationType: "append_hierarchy_annotation",
                originalFailureReason: "Hierarchy-preserving columns were missing from the candidate plan."
              }
            );
          }
        }
      }
      const losslessStabilization = stabilizeLosslessOnlyPlan(candidatePlan, columns, sampleData);
      if (losslessStabilization.prunedOperations.length > 0) {
        candidatePlan = losslessStabilization.plan;
        emitDataPreparationTelemetry(
          telemetryTarget,
          "data_prep_lossless_op_pruned",
          `Pruned ${losslessStabilization.prunedOperations.length} lossless operation(s) that changed stable numeric fingerprints before first-attempt execution.`,
          {
            ...telemetryMetaBase,
            prunedOperations: losslessStabilization.prunedOperations.map((entry) => ({
              type: entry.operation.type,
              reason: entry.reason,
              column: "column" in entry.operation ? entry.operation.column : void 0
            }))
          }
        );
      } else if (losslessStabilization.abortedReason) {
        emitDataPreparationTelemetry(
          telemetryTarget,
          "data_prep_slow_path_diagnostic",
          `Skipped bounded lossless stabilization because simulation could not complete: ${losslessStabilization.abortedReason}`,
          {
            ...telemetryMetaBase,
            reasonCode: "lossless_stabilization_skipped"
          }
        );
      }
      if (candidatePlan.operations.length > 0) {
        try {
          const wideTableValueCastIssue = getWideTableValueCastOrderIssue(candidatePlan.operations, schemaContext.wideProfile);
          if (wideTableValueCastIssue) {
            throw new Error(wideTableValueCastIssue);
          }
          const hierarchyWidePlanIssue = getHierarchyWidePlanIssue(
            candidatePlan.operations,
            shouldForceHierarchyFallback,
            hierarchyDepthPreservationRequired
          );
          if (hierarchyWidePlanIssue) {
            if (hierarchyWidePlanIssue.canUseAnnotationFallback && canUseHierarchyAnnotationFallback && i >= resolvedOptions.maxAttempts - 1) {
              console.warn("[DataPreparer] Replacing hierarchy-incomplete plan with hierarchy annotation fallback for hierarchical wide statement.");
              emitDataPreparationTelemetry(
                telemetryTarget,
                "data_prep_hierarchy_fallback_used",
                "Hierarchy-incomplete wide-table plan was replaced with annotate_hierarchy fallback.",
                { reason: hierarchyWidePlanIssue.message }
              );
              return buildHierarchyAnnotationFallbackPlan(columns);
            }
            if (i >= resolvedOptions.maxAttempts - 1) {
              if (deterministicCleanupFallback) {
                console.warn("[DataPreparer] Replacing hierarchy-incomplete plan with deterministic cleanup fallback.");
                emitDataPreparationTelemetry(
                  telemetryTarget,
                  "data_prep_deterministic_fallback_used",
                  "Hierarchy-incomplete wide-table plan was replaced with deterministic cleanup fallback.",
                  { reason: hierarchyWidePlanIssue.message }
                );
                return deterministicCleanupFallback;
              }
            }
            throw new Error(hierarchyWidePlanIssue.message);
          }
          const bypassSampleExecutionForSourceOnlyHierarchyPlan = canBypassSampleExecutionForSourceOnlyHierarchyPlan(
            candidatePlan,
            sampleData,
            sourceData
          );
          const sampleResult = bypassSampleExecutionForSourceOnlyHierarchyPlan ? { data: sampleData, logs: [] } : applyDataOperations(sampleData, candidatePlan.operations);
          if (!Array.isArray(sampleResult.data)) throw new Error("Generated operations did not return an array.");
          if (!candidatePlan.outputColumns || candidatePlan.outputColumns.length === 0) {
            candidatePlan.outputColumns = columns;
          }
          let verifiedCandidatePlan = validateDataPreparationPlan(candidatePlan, columns);
          const shouldRunFullSourceVerification = Boolean(
            sourceData && (schemaContext.wideProfile.isWide || hierarchyPreservationRequired || sourceShapeProfile && isWideReportShape(sourceShapeProfile) || (sourceShapeProfile == null ? void 0 : sourceShapeProfile.primaryKind) === "mixed_report")
          );
          if (shouldRunFullSourceVerification && sourceData) {
            const verificationStartedAt = Date.now();
            const evaluateCandidate = (planToEvaluate) => {
              const cleanedData = simulatePlanOnRows(sourceData, planToEvaluate);
              return {
                cleanedData,
                verification: verifyCleanedDatasetShape(sourceData, cleanedData, planToEvaluate)
              };
            };
            let verificationResult = evaluateCandidate(verifiedCandidatePlan);
            if (!verificationResult.verification.passed) {
              emitDataPreparationTelemetry(
                telemetryTarget,
                "data_prep_pre_return_verification_failed",
                verificationResult.verification.reason ?? "Pre-return verification failed.",
                {
                  ...telemetryMetaBase,
                  verificationReason: verificationResult.verification.reason,
                  signalKey: verificationResult.verification.signalKey
                }
              );
              if (verificationResult.verification.reason === "Hierarchy depth was not preserved in the cleaned output.") {
                const canAppendHierarchy = canAppendAnnotateHierarchyOperation(
                  verifiedCandidatePlan,
                  sampleData,
                  sourceData
                ) || canAppendSourceOnlyAnnotateHierarchyOperation(
                  verifiedCandidatePlan,
                  sourceData
                );
                if (canAppendHierarchy) {
                  const hierarchyCandidate = appendAnnotateHierarchyOperation(verifiedCandidatePlan, columns);
                  const hierarchyVerification = evaluateCandidate(hierarchyCandidate);
                  if (hierarchyVerification.verification.passed) {
                    verifiedCandidatePlan = hierarchyCandidate;
                    emitHierarchyAnnotationNormalization(
                      "Appended annotate_hierarchy after full-source verification detected lost hierarchy depth.",
                      {
                        normalizationType: "verify_append_hierarchy_annotation",
                        originalFailureReason: verificationResult.verification.reason
                      }
                    );
                    verificationResult = hierarchyVerification;
                  } else if (boundedHierarchyAnnotationAvailable) {
                    const hierarchyFallbackPlan = buildHierarchyAnnotationFallbackPlan(columns);
                    const fallbackVerification = evaluateCandidate(hierarchyFallbackPlan);
                    if (fallbackVerification.verification.passed) {
                      verifiedCandidatePlan = hierarchyFallbackPlan;
                      emitHierarchyNormalizationOrSalvage(
                        "Replaced the candidate plan with annotate_hierarchy after full-source verification detected lost hierarchy depth.",
                        { salvageType: "hierarchy", originalFailureReason: verificationResult.verification.reason }
                      );
                      verificationResult = fallbackVerification;
                    }
                  }
                } else if (boundedHierarchyAnnotationAvailable) {
                  const hierarchyFallbackPlan = buildHierarchyAnnotationFallbackPlan(columns);
                  const fallbackVerification = evaluateCandidate(hierarchyFallbackPlan);
                  if (fallbackVerification.verification.passed) {
                    verifiedCandidatePlan = hierarchyFallbackPlan;
                    emitHierarchyNormalizationOrSalvage(
                      "Replaced the candidate plan with annotate_hierarchy after full-source verification detected lost hierarchy depth.",
                      { salvageType: "hierarchy", originalFailureReason: verificationResult.verification.reason }
                    );
                    verificationResult = fallbackVerification;
                  }
                }
              } else if (verificationResult.verification.reason === "The cleaned dataset appears to have collapsed to a single descriptor group after unpivot." || verificationResult.verification.reason === "Summary columns were incorrectly treated as detail series during reshaping.") {
                if (boundedHierarchyAnnotationAvailable) {
                  const hierarchyFallbackPlan = buildHierarchyAnnotationFallbackPlan(columns);
                  const fallbackVerification = evaluateCandidate(hierarchyFallbackPlan);
                  if (fallbackVerification.verification.passed) {
                    verifiedCandidatePlan = hierarchyFallbackPlan;
                    emitHierarchyNormalizationOrSalvage(
                      "Replaced a collapsing reshape with annotate_hierarchy after pre-return verification failed.",
                      { salvageType: "hierarchy", originalFailureReason: verificationResult.verification.reason }
                    );
                    verificationResult = fallbackVerification;
                  }
                }
                if (!verificationResult.verification.passed) {
                  const wideFallbackPlan = salvageWideFallback ?? salvageStagingCleanupFallback;
                  if (wideFallbackPlan) {
                    const fallbackVerification = evaluateCandidate(wideFallbackPlan);
                    if (fallbackVerification.verification.passed) {
                      verifiedCandidatePlan = wideFallbackPlan;
                      emitPlanSalvage(
                        "data_prep_plan_salvaged_wide_fallback",
                        "Replaced a collapsing reshape with deterministic fallback after pre-return verification failed.",
                        { salvageType: "wide_fallback", originalFailureReason: verificationResult.verification.reason }
                      );
                      verificationResult = fallbackVerification;
                    }
                  }
                }
              } else if (verificationResult.verification.reason === "The cleaned dataset still looks like a wide crosstab." || verificationResult.verification.signalKey === LABEL_LAYER_RETENTION_SIGNAL) {
                if (verificationResult.verification.signalKey === LABEL_LAYER_RETENTION_SIGNAL && boundedHierarchyAnnotationAvailable) {
                  const hierarchyFallbackPlan = buildHierarchyAnnotationFallbackPlan(columns);
                  const fallbackVerification = evaluateCandidate(hierarchyFallbackPlan);
                  if (fallbackVerification.verification.passed) {
                    verifiedCandidatePlan = hierarchyFallbackPlan;
                    emitHierarchyNormalizationOrSalvage(
                      "Replaced a label-losing reshape with annotate_hierarchy after pre-return verification failed.",
                      { salvageType: "hierarchy", originalFailureReason: verificationResult.verification.reason }
                    );
                    verificationResult = fallbackVerification;
                  }
                }
                const wideFallbackPlan = salvageWideFallback ?? salvageStagingCleanupFallback;
                if (wideFallbackPlan && !verificationResult.verification.passed) {
                  const fallbackVerification = evaluateCandidate(wideFallbackPlan);
                  if (fallbackVerification.verification.passed) {
                    verifiedCandidatePlan = wideFallbackPlan;
                    emitPlanSalvage(
                      "data_prep_plan_salvaged_wide_fallback",
                      "Replaced the candidate plan with deterministic wide fallback after pre-return verification failed.",
                      { salvageType: "wide_fallback", originalFailureReason: verificationResult.verification.reason }
                    );
                    verificationResult = fallbackVerification;
                  }
                }
                if (verificationResult.verification.signalKey === LABEL_LAYER_RETENTION_SIGNAL && !verificationResult.verification.passed && deterministicCleanupFallback) {
                  const fallbackVerification = evaluateCandidate(deterministicCleanupFallback);
                  if (fallbackVerification.verification.passed) {
                    verifiedCandidatePlan = deterministicCleanupFallback;
                    emitDataPreparationTelemetry(
                      telemetryTarget,
                      "data_prep_deterministic_fallback_used",
                      "Label-layer verification failed, so the plan switched directly to deterministic cleanup fallback.",
                      { reason: verificationResult.verification.reason ?? LABEL_LAYER_RETENTION_REASON }
                    );
                    verificationResult = fallbackVerification;
                  }
                }
              }
              if (!verificationResult.verification.passed) {
                throw new Error(verificationResult.verification.reason ?? "Pre-return verification failed.");
              }
            }
            emitDataPreparationStageTiming(
              telemetryTarget,
              "full_source_verification",
              Date.now() - verificationStartedAt,
              { attempt: i + 1, strictMode }
            );
          }
          const postOperationCleanupFallback = !schemaContext.wideProfile.isWide && sourceData && !verifiedCandidatePlan.operations.some((operation) => operation.type === "annotate_hierarchy") ? buildDeterministicCleanupFallbackPlan(
            verifiedCandidatePlan.outputColumns,
            { ...sourceData, data: sampleResult.data }
          ) : null;
          if (postOperationCleanupFallback) {
            const canUseBoundedCleanupSalvage = i >= resolvedOptions.maxAttempts - 1 && (resolvedOptions.allowDeterministicFallback || strictMode);
            if (canUseBoundedCleanupSalvage) {
              console.warn("[DataPreparer] Replacing operation plan that left report noise in place with deterministic cleanup fallback.");
              emitDataPreparationTelemetry(
                telemetryTarget,
                "data_prep_deterministic_fallback_used",
                "Operation plan that leaked report noise was replaced with deterministic cleanup fallback.",
                { reason: "Generated operations left header, footer, or blank noise rows in the staged table." }
              );
              return postOperationCleanupFallback;
            }
            throw new Error("Generated operations left header, footer, or blank noise rows in the staged table.");
          }
          return verifiedCandidatePlan;
        } catch (e) {
          if (isRuntimeAbortError(e, abortSignal)) {
            throw e;
          }
          lastError = e;
          const typedFailureReason = classifyDataPreparationFailureReason(lastError);
          if (i === 0) {
            emitDataPreparationTelemetry(
              telemetryTarget,
              "data_prep_first_attempt_failed",
              lastError.message,
              { failureClass: "operation_execution", reasonCode: typedFailureReason, typedReasonCode: typedFailureReason }
            );
          }
          if (resolvedOptions.allowInternalRetry && !selfCorrectionTelemetryEmitted && i < resolvedOptions.maxAttempts - 1) {
            emitDataPreparationTelemetry(
              telemetryTarget,
              "data_prep_self_correction_used",
              "Data preparation used internal self-correction after the first failed attempt.",
              { failedAttempt: i + 1, failureReason: lastError.message, reasonCode: typedFailureReason, typedReasonCode: typedFailureReason }
            );
            selfCorrectionTelemetryEmitted = true;
          }
          if (typedFailureReason === "provider_no_output" || typedFailureReason === "timeout_model_call") {
            emitDataPreparationTelemetry(
              telemetryTarget,
              "data_prep_slow_path_diagnostic",
              "Provider-driven planning entered a slow path and required bounded recovery.",
              { attempt: i + 1, reasonCode: typedFailureReason, typedReasonCode: typedFailureReason }
            );
          }
          if (deterministicCleanupFallback && lastError.message.includes(LABEL_LAYER_RETENTION_REASON)) {
            console.warn("[DataPreparer] Replacing label-layer verification failure with deterministic cleanup fallback.");
            emitDataPreparationTelemetry(
              telemetryTarget,
              "data_prep_deterministic_fallback_used",
              "Label-layer verification failure was replaced with deterministic cleanup fallback instead of retrying the same reshape prompt.",
              { reason: lastError.message }
            );
            return deterministicCleanupFallback;
          }
          if (i >= resolvedOptions.maxAttempts - 1 && deterministicCleanupFallback) {
            console.warn("[DataPreparer] Replacing final failed AI operation plan with deterministic cleanup fallback.");
            emitDataPreparationTelemetry(
              telemetryTarget,
              "data_prep_deterministic_fallback_used",
              "Final failed AI operation plan was replaced with deterministic cleanup fallback.",
              { reason: lastError.message }
            );
            return deterministicCleanupFallback;
          }
          if (!resolvedOptions.allowInternalRetry || i >= resolvedOptions.maxAttempts - 1) {
            throw lastError;
          }
          console.warn(`AI self-correction attempt ${i + 1} failed due to operation execution error. Retrying...`, lastError);
          continue;
        }
      }
      if (!plan.outputColumns || plan.outputColumns.length === 0) {
        plan.outputColumns = columns;
      }
      const stabilizedPlan = stabilizeZeroOperationSchemaOnlyPlan(candidatePlan, columns);
      const validated = validateDataPreparationPlan(stabilizedPlan, columns);
      if (validated.planStatus === "inconsistent" && i < resolvedOptions.maxAttempts - 1 && resolvedOptions.allowInternalRetry) {
        lastError = new Error(`The previous data preparation plan failed consistency validation: ${validated.consistencyIssues.join(" ")}`);
        const typedFailureReason = classifyDataPreparationFailureReason(lastError);
        if (i === 0) {
          emitDataPreparationTelemetry(
            telemetryTarget,
            "data_prep_first_attempt_failed",
            lastError.message,
            { failureClass: "consistency_validation", reasonCode: typedFailureReason, typedReasonCode: typedFailureReason }
          );
        }
        if (!selfCorrectionTelemetryEmitted) {
          emitDataPreparationTelemetry(
            telemetryTarget,
            "data_prep_self_correction_used",
            "Data preparation used internal self-correction after an inconsistent first attempt.",
            { failedAttempt: i + 1, failureReason: lastError.message, reasonCode: typedFailureReason, typedReasonCode: typedFailureReason }
          );
          selfCorrectionTelemetryEmitted = true;
        }
        console.warn(`AI self-correction attempt ${i + 1} failed due to plan consistency validation. Retrying...`, lastError);
        continue;
      }
      if (validated.planStatus === "inconsistent") {
        const typedFailureReason = classifyDataPreparationFailureReason(validated.consistencyIssues.join(" "));
        if (i === 0) {
          emitDataPreparationTelemetry(
            telemetryTarget,
            "data_prep_first_attempt_failed",
            validated.consistencyIssues.join(" "),
            { failureClass: "consistency_validation", reasonCode: typedFailureReason, typedReasonCode: typedFailureReason }
          );
        }
        console.warn(
          `[DataPreparer] Auto-healing inconsistent schema-only plan after ${resolvedOptions.maxAttempts} attempts. Issues: ${validated.consistencyIssues.join(" ")} — resetting outputColumns to baseline.`
        );
        const healedPlan = {
          ...validated,
          outputColumns: columns,
          planStatus: "schema_only",
          consistencyIssues: []
        };
        if (canUseHierarchyAnnotationFallback) {
          console.warn("[DataPreparer] Replacing schema-only plan with hierarchy annotation fallback for hierarchical wide statement.");
          emitDataPreparationTelemetry(
            telemetryTarget,
            "data_prep_hierarchy_fallback_used",
            "Inconsistent schema-only plan was replaced with hierarchy annotation fallback.",
            { reason: validated.consistencyIssues }
          );
          return buildHierarchyAnnotationFallbackPlan(columns);
        }
        if (deterministicCleanupFallback) {
          console.warn("[DataPreparer] Replacing schema-only plan with deterministic cleanup fallback.");
          emitDataPreparationTelemetry(
            telemetryTarget,
            "data_prep_deterministic_fallback_used",
            "Inconsistent schema-only plan was replaced with deterministic cleanup fallback.",
            { reason: validated.consistencyIssues }
          );
          return deterministicCleanupFallback;
        }
        const blankRowCleanupFallback = buildBlankRowCleanupFallbackPlan(columns, sampleData, sourceData);
        if (blankRowCleanupFallback) {
          console.warn("[DataPreparer] Replacing auto-healed schema-only plan with blank-row cleanup fallback.");
          emitDataPreparationTelemetry(
            telemetryTarget,
            "data_prep_deterministic_fallback_used",
            "Inconsistent schema-only plan was replaced with blank-row cleanup fallback.",
            { reason: validated.consistencyIssues }
          );
          return blankRowCleanupFallback;
        }
        emitDataPreparationTelemetry(
          telemetryTarget,
          "data_prep_schema_only_auto_healed",
          "Inconsistent schema-only plan was auto-healed to the baseline schema.",
          { reason: validated.consistencyIssues }
        );
        return healedPlan;
      }
      if (validated.planStatus === "schema_only" && canUseHierarchyAnnotationFallback) {
        console.warn("[DataPreparer] Replacing zero-op schema-only plan with hierarchy annotation fallback for hierarchical wide statement.");
        emitDataPreparationTelemetry(
          telemetryTarget,
          "data_prep_hierarchy_fallback_used",
          "Zero-op schema-only plan was replaced with hierarchy annotation fallback."
        );
        return buildHierarchyAnnotationFallbackPlan(columns);
      }
      if (validated.planStatus === "schema_only" && deterministicCleanupFallback) {
        console.warn("[DataPreparer] Replacing zero-op schema-only plan with deterministic cleanup fallback.");
        emitDataPreparationTelemetry(
          telemetryTarget,
          "data_prep_deterministic_fallback_used",
          "Zero-op schema-only plan was replaced with deterministic cleanup fallback."
        );
        return deterministicCleanupFallback;
      }
      if (validated.planStatus === "schema_only") {
        const blankRowCleanupFallback = buildBlankRowCleanupFallbackPlan(columns, sampleData, sourceData);
        if (blankRowCleanupFallback) {
          console.warn("[DataPreparer] Replacing zero-op schema-only plan with blank-row cleanup fallback.");
          emitDataPreparationTelemetry(
            telemetryTarget,
            "data_prep_deterministic_fallback_used",
            "Zero-op schema-only plan was replaced with blank-row cleanup fallback."
          );
          return blankRowCleanupFallback;
        }
      }
      return validated;
    } catch (error) {
      if (isRuntimeAbortError(error, abortSignal)) {
        throw error;
      }
      console.error(`Error in data preparation plan generation (Attempt ${i + 1}):`, error);
      lastError = error;
      const typedFailureReason = classifyDataPreparationFailureReason(lastError);
      if (i === 0) {
        emitDataPreparationTelemetry(
          telemetryTarget,
          "data_prep_first_attempt_failed",
          lastError.message,
          { failureClass: "provider_generation", reasonCode: typedFailureReason, typedReasonCode: typedFailureReason }
        );
      }
      if (resolvedOptions.allowInternalRetry && !selfCorrectionTelemetryEmitted && i < resolvedOptions.maxAttempts - 1) {
        emitDataPreparationTelemetry(
          telemetryTarget,
          "data_prep_self_correction_used",
          "Data preparation used internal self-correction after a provider-generation failure.",
          { failedAttempt: i + 1, failureReason: lastError.message, reasonCode: typedFailureReason, typedReasonCode: typedFailureReason }
        );
        selfCorrectionTelemetryEmitted = true;
      }
      if (typedFailureReason === "provider_no_output" || typedFailureReason === "timeout_model_call") {
        emitDataPreparationTelemetry(
          telemetryTarget,
          "data_prep_slow_path_diagnostic",
          "Provider-driven planning entered a slow path and required bounded recovery.",
          { attempt: i + 1, reasonCode: typedFailureReason, typedReasonCode: typedFailureReason }
        );
      }
    }
  }
  throw new Error(`AI failed to generate a valid data preparation plan after multiple attempts. Last error: ${lastError == null ? void 0 : lastError.message}`);
};
const CLEANING_LLM_TIMEOUT_MS = 6e4;
const deriveRequirements = (plan) => {
  const requirements = /* @__PURE__ */ new Set();
  if (plan.operations.some((operation) => operation.type === "annotate_hierarchy")) {
    requirements.add("hierarchical_shape");
  }
  if (plan.operations.some((operation) => operation.type === "unpivot_columns")) {
    requirements.add("wide_shape");
    requirements.add("label_preservation");
  }
  return [...requirements];
};
const toCandidate = (plan, fallbackColumns, source, priority, intentSummary) => {
  const outputColumns = plan.outputColumns.length > 0 ? plan.outputColumns : fallbackColumns;
  const program = createAiCleaningProgramFromPlan(plan, outputColumns);
  return {
    strategyId: createId(`cleaning-${source}`),
    source,
    program,
    plan,
    intentSummary,
    requires: deriveRequirements(plan),
    priority
  };
};
const generateAiCleaningProgram = async (columns, sampleData, settings, lastError, sourceData, runtimeContext) => {
  var _a, _b, _c;
  const primaryAbort = new AbortController();
  const primaryTimer = setTimeout(() => primaryAbort.abort(), CLEANING_LLM_TIMEOUT_MS);
  let plan;
  try {
    plan = await generateDataPreparationPlan(columns, sampleData, settings, lastError, void 0, sourceData, runtimeContext, { abortSignal: primaryAbort.signal });
  } finally {
    clearTimeout(primaryTimer);
  }
  const primary = toCandidate(
    plan,
    columns,
    "agent_primary",
    1,
    "Primary AI cleaning strategy for the current working dataset."
  );
  const candidates = [primary];
  const shouldGenerateSafeRetry = (((_a = runtimeContext == null ? void 0 : runtimeContext.iterationContext) == null ? void 0 : _a.round) ?? 1) > 1 && (primary.requires.includes("hierarchical_shape") || Boolean((_b = lastError == null ? void 0 : lastError.message) == null ? void 0 : _b.includes("hierarchical statement shape")) || Boolean((_c = runtimeContext == null ? void 0 : runtimeContext.disallowedStrategyRequirements) == null ? void 0 : _c.includes("hierarchical_shape")));
  if (shouldGenerateSafeRetry) {
    const safeAbort = new AbortController();
    const safeTimer = setTimeout(() => safeAbort.abort(), CLEANING_LLM_TIMEOUT_MS);
    let safePlan;
    try {
      safePlan = await generateDataPreparationPlan(
        columns,
        sampleData,
        settings,
        lastError,
        void 0,
        sourceData,
        {
          ...runtimeContext,
          disallowedStrategyRequirements: [
            ...(runtimeContext == null ? void 0 : runtimeContext.disallowedStrategyRequirements) ?? [],
            "hierarchical_shape"
          ]
        },
        {
          allowHierarchyAnnotationFallback: false,
          allowInternalRetry: false,
          maxAttempts: 1,
          abortSignal: safeAbort.signal
        }
      );
    } finally {
      clearTimeout(safeTimer);
    }
    candidates.push(toCandidate(
      safePlan,
      columns,
      "agent_retry",
      2,
      "Agent-safe retry that avoids hierarchy-only fallback paths on the current working dataset."
    ));
  }
  candidates.sort((left, right) => left.priority - right.priority);
  return {
    primary,
    candidates
  };
};
const sqlPrecheckSystemPrompt = "You decide whether a prepared dataset is ready for grouped SQL analysis. Return one JSON object that follows the schema exactly.";
const createSqlPrecheckPrompt = (managedContext) => `Review whether this prepared dataset is ready for grouped SQL analysis.

${managedContext}

Return exactly one JSON object that matches the schema.

Rules:
- Prefer semantic judgment over column-name heuristics.
- Choose candidatePairs only when the dimension and metric are likely meaningful for a grouped chart or card.
- Ignore technical identifiers, source row counters, and bookkeeping columns unless they are clearly business-facing dimensions.
- If the dataset is a label/value table, prefer the business label column as the dimension and the numeric amount/value column as the metric.
- Missing values (NULLs) in a dimension column do NOT prevent grouped SQL analysis. SQL GROUP BY handles NULLs gracefully. Do not use missing values in a dimension column as a reason to exclude it from candidatePairs or to set status=blocked.
- Use "blocked" only when there are truly NO categorical/date dimension columns AND NO numeric metric columns in the dataset. A dataset with at least one dimension and one metric is viable for grouped SQL analysis regardless of null rates.
- Keep the summary short and evidence-based.`;
const VALID_FINDING_KINDS = /* @__PURE__ */ new Set([
  "null_heavy_metric",
  "constant_metric",
  "zero_total_metric",
  "flat_grouped_metric",
  "low_distinct_dimension",
  "parse_failures_remaining",
  "high_fragmentation",
  "no_viable_candidates"
]);
const VALID_CONFIDENCE = /* @__PURE__ */ new Set(["high", "medium", "low"]);
const NUMERIC_TYPES = /* @__PURE__ */ new Set(["numerical", "currency", "percentage"]);
const DIMENSION_TYPES = /* @__PURE__ */ new Set(["categorical", "date", "time"]);
const sanitizeFinding = (value, profileMap) => {
  var _a, _b;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const candidate = value;
  const kind = typeof candidate.kind === "string" && VALID_FINDING_KINDS.has(candidate.kind) ? candidate.kind : null;
  const severity = candidate.severity === "block" ? "block" : candidate.severity === "warn" ? "warn" : null;
  const message = typeof candidate.message === "string" ? candidate.message.trim() : "";
  if (!kind || !severity || !message) {
    return null;
  }
  const finding = { kind, severity, message };
  if (typeof candidate.column === "string" && profileMap.has(candidate.column)) {
    finding.column = candidate.column;
  }
  if (typeof candidate.metric === "string" && NUMERIC_TYPES.has(((_a = profileMap.get(candidate.metric)) == null ? void 0 : _a.type) ?? "categorical")) {
    finding.metric = candidate.metric;
  }
  if (typeof candidate.dimension === "string" && DIMENSION_TYPES.has(((_b = profileMap.get(candidate.dimension)) == null ? void 0 : _b.type) ?? "numerical")) {
    finding.dimension = candidate.dimension;
  }
  return finding;
};
const sanitizeCandidatePair = (value, profileMap) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const candidate = value;
  const dimension = typeof candidate.dimension === "string" ? candidate.dimension.trim() : "";
  const metric = typeof candidate.metric === "string" ? candidate.metric.trim() : "";
  const confidence = typeof candidate.confidence === "string" && VALID_CONFIDENCE.has(candidate.confidence) ? candidate.confidence : "medium";
  const reason = typeof candidate.reason === "string" ? candidate.reason.trim() : "";
  if (!dimension || !metric || !reason) {
    return null;
  }
  const dimensionProfile = profileMap.get(dimension);
  const metricProfile = profileMap.get(metric);
  if (!dimensionProfile || !metricProfile) {
    return null;
  }
  if (!DIMENSION_TYPES.has(dimensionProfile.type) || !NUMERIC_TYPES.has(metricProfile.type)) {
    return null;
  }
  return { dimension, metric, confidence, reason };
};
const evaluateAiSqlPrecheck = async ({
  data,
  columns,
  settings
}) => {
  if (!isProviderConfigured(settings)) {
    return null;
  }
  const profileMap = new Map(columns.map((column) => [column.name, column]));
  try {
    const { model, modelId } = createProviderModel(settings, settings.complexModel);
    const result = await runWithOverflowCompaction({
      provider: settings.provider,
      execute: async (compactionMode) => {
        const managed = await prepareManagedContext({
          callType: "goal",
          systemText: sqlPrecheckSystemPrompt,
          baseUserText: "Assess SQL analysis readiness, propose stable metric/dimension pairs, and list any blockers.",
          sections: [
            createContextSection("dataset_identity", `File name: ${data.fileName}
Prepared row count: ${data.data.length}`, "required", "sticky"),
            createContextSection("column_profiles", `Column profiles:
${formatColumnQualitySummary(columns)}`, "required", "sticky"),
            createContextSection("row_sample", `Prepared row sample:
${formatRows(trimRawDataSample(data.data, 12))}`, "required", "sticky")
          ],
          settings,
          modelId,
          compactionMode
        });
        return withTransientRetry(
          (fb) => streamGenerateText({
            model: fb ?? model,
            messages: [
              { role: "system", content: managed.systemText },
              { role: "user", content: createSqlPrecheckPrompt(managed.userText) }
            ],
            output: output_exports.object({
              schema: jsonSchema(prepareSchemaForProvider(sqlPrecheckAssessmentSchema, settings.provider))
            })
          }),
          { settings, primaryModelId: modelId, label: "sqlPrecheckEvaluator" }
        );
      }
    });
    const rawOutput = result.output ?? {};
    const aiCandidatePairs = Array.isArray(rawOutput.candidatePairs) ? rawOutput.candidatePairs.map((candidate) => sanitizeCandidatePair(candidate, profileMap)).filter((candidate) => Boolean(candidate)).filter((candidate, index, array) => array.findIndex((entry) => entry.dimension === candidate.dimension && entry.metric === candidate.metric) === index).slice(0, 3) : [];
    const findings = Array.isArray(rawOutput.findings) ? rawOutput.findings.map((finding) => sanitizeFinding(finding, profileMap)).filter((finding) => Boolean(finding)).slice(0, 8) : [];
    const candidatePairs = aiCandidatePairs.length > 0 ? aiCandidatePairs : (() => {
      const dimCol = columns.filter((p) => DIMENSION_TYPES.has(p.type) && (p.missingPercentage ?? 0) < 100).sort((a, b) => (a.missingPercentage ?? 0) - (b.missingPercentage ?? 0))[0];
      const isMetricLike = (p) => NUMERIC_TYPES.has(p.type) || p.hasFormattedNumbers === true;
      const metricCol = columns.filter((p) => isMetricLike(p) && (p.missingPercentage ?? 0) < 100).sort((a, b) => (a.missingPercentage ?? 0) - (b.missingPercentage ?? 0))[0];
      if (dimCol && metricCol) {
        console.info("[SqlPrecheckEvaluator] AI returned 0 candidate pairs; synthesizing profile-based fallback pair:", dimCol.name, "x", metricCol.name);
        return [{
          dimension: dimCol.name,
          metric: metricCol.name,
          confidence: "low",
          reason: "Profile-based fallback: AI returned no candidates but valid dimension and metric columns were detected from column profiles."
        }];
      }
      return [];
    })();
    const status = rawOutput.status === "blocked" || candidatePairs.length === 0 ? "blocked" : "passed";
    const summary = typeof rawOutput.summary === "string" && rawOutput.summary.trim() ? rawOutput.summary.trim() : status === "passed" ? "AI SQL precheck found at least one viable grouped analysis path." : "AI SQL precheck did not find a stable grouped analysis path.";
    return {
      status,
      summary,
      findings,
      candidatePairs
    };
  } catch (error) {
    console.warn("[SqlPrecheckEvaluator] AI SQL precheck failed, falling back to deterministic guard.", error);
    return null;
  }
};
const assistantMessageSchema = {
  type: "object",
  properties: {
    thought: { type: "string", description: "The reasoning for the assistant message." },
    type: { type: "string", enum: ["assistant_message"] },
    message: { type: "string", description: "Markdown response for the user." },
    cardId: { type: "string", description: "Optional related card id." },
    suggestedActions: {
      type: "array",
      description: "Optional 2-3 follow-up suggestions.",
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          label: { type: "string", description: "Short user-facing button text." },
          action: { type: "string", description: "The exact user-facing follow-up prompt to send when clicked. Never use an internal tool name." }
        },
        required: ["label", "action"]
      }
    }
  },
  required: ["type", "thought", "message"]
};
const createToolCallSchema = (descriptor) => ({
  type: "object",
  properties: {
    thought: { type: "string", description: "The reasoning for the tool call." },
    type: { type: "string", enum: ["tool_call"] },
    toolName: { type: "string", enum: [descriptor.name] },
    args: descriptor.inputSchema
  },
  required: ["type", "thought", "toolName", "args"]
});
const createChatDecisionSchema = (descriptors) => {
  const actionSchema = {
    anyOf: [
      assistantMessageSchema,
      ...descriptors.map(createToolCallSchema)
    ]
  };
  return {
    type: "object",
    properties: {
      action: actionSchema
    },
    required: ["action"]
  };
};
const createChatResponderSystemPrompt = (params) => {
  const { language, evidenceOrder, workflowStage, analystCapabilityText, appliedRuntimeStepContract } = params;
  return `You are an expert data analyst and business strategist, required to operate using a Reason-Act (ReAct) framework. Your goal is to respond to the user by providing insightful analysis. Your final conversational responses should be in ${language}.
Always prefer evidence in this order: ${evidenceOrder}
Current workflow stage: ${workflowStage}. During cleaning stage, do not create or modify analysis cards.
Current analyst skill/recipe packaging:
${analystCapabilityText}
Current runtime step contract:
- Goal: ${appliedRuntimeStepContract.goalSummary}
- Task mode: ${appliedRuntimeStepContract.taskMode}
- Completion mode: ${appliedRuntimeStepContract.completionMode}
- Assistant response allowed: ${appliedRuntimeStepContract.allowAssistantResponse ? "yes" : "no"}
- Prefer clarification: ${appliedRuntimeStepContract.preferClarification ? "yes" : "no"}
- Instruction: ${appliedRuntimeStepContract.instruction ?? "No extra instruction."}
Your output MUST be a single valid JSON object with exactly one "action" that matches the provided schema.`;
};
const renderToolList = (tools) => tools.map((tool, index) => {
  const hints = tool.promptHints && tool.promptHints.length > 0 ? `
   - ${tool.promptHints.join("\n   - ")}` : "";
  return `${index + 1}. **${tool.name}** (${tool.risk} risk): ${tool.description}${hints}`;
}).join("\n");
const createChatPrompt = (userPrompt, managedContextText, language, tools) => {
  const toolNames = new Set(tools.map((tool) => tool.name));
  const canMutateData = toolNames.has("data.mutate");
  const canCreatePlans = toolNames.has("analysis.create_plan");
  const canPivotMatrix = toolNames.has("analysis.pivot_matrix");
  const canValidateMetricMapping = toolNames.has("analysis.validate_metric_mapping");
  const canAddCalculatedColumn = toolNames.has("card.add_calculated_column");
  const runtimeRules = [
    "- **INVESTIGATE FIRST**: When the user mentions a value, code, name, or asks about specific data, your first move must be `data.query` or `spreadsheet.filter` to look it up. Only respond with `assistant_message` after you have queried evidence for this specific request. Existing cards or prior results do not satisfy a new lookup request.",
    "- **THINK**: Every object must include a non-empty `thought`.",
    "- **ACT**: Use the least-destructive tool that satisfies the request.",
    `- **BIAS TOWARD ACTION**: Always attempt to answer the user's request with the data available. If you have queried data and found results, proceed to analyze or summarize them — do NOT pause to ask the user "how would you like to proceed?" or "what would you like me to do?". The user expects you to act as an expert analyst who delivers insights, not asks for direction.`,
    "- **CLARIFICATION — LAST RESORT ONLY**: Use `conversation.request_clarification` ONLY when you genuinely cannot proceed because critical information is missing (e.g., which of 5 possible metrics to compare, which time period to filter, which entity the user means when the name is ambiguous across multiple records). Never use it as a polite hand-off or when you simply have multiple possible analyses — just pick the most useful one.",
    '- When using `conversation.request_clarification`, you MUST provide 2-3 concrete labeled options that each describe a specific analytical path (e.g., "Compare Sales Target vs Grand Total", "Show monthly trend of Grand Total"). Never ask vague questions like "How would you like to proceed?" or "What analysis would you prefer?".',
    "- **CRITICAL ON COLUMN NAMES**: Only use columns listed in the managed context. Never invent columns.",
    "- Treat the `Dataset Semantics` section as authoritative for non-detail rows and semantic column roles. Do not treat subtotal/footer/bucket rows as detail facts, and do not flip metric versus dimension roles without direct evidence.",
    "- When visible evidence already answers the user's current question exactly, you may use it. But if the user asks about something not yet queried or a specific record/value, investigate first.",
    "- Respect the runtime step contract in the managed context. It overrides your default tendency to keep exploring.",
    "- Treat the Evidence Chain section as the authoritative trace for metric definition, grain, and source artifacts. When answering, reference that chain instead of inventing unsupported semantics.",
    "- Do not repeat the same tool call unless the arguments or evidence materially changed.",
    "- Use `assistant_message` only when the current request is already satisfied by existing evidence or by a completed workflow step. Do not stop early when the user still expects a table, grouped result, or chart.",
    "- When replying with `assistant_message`, state the metric definition/grain/source artifacts when they are available in the managed context. Keep it concise but explicit.",
    "- When handing control back to the user, include 1-3 concrete `suggestedActions` whenever there is a clear next analytical move. Keep labels short, executable, and never return more than three suggestions.",
    "- Every `suggestedActions.action` must be the exact user-facing follow-up prompt to send on click. Never emit internal tool names such as `analysis.validate_metric_mapping`.",
    "- Use `data.query` only with a structured `args.plan`. Do not send a naked natural-language string to `data.query`.",
    "- For verification, counting, sorting, filtering, or grouped read-only results, prefer `data.query` over `analysis.create_plan`.",
    "- When the user wants analysis output, first make the grouped evidence legible: validate grain, aggregates, and data quality with bounded `data.query` or `spreadsheet.filter`, then decide whether the best user-facing result is a direct answer, an aggregate table, or a chart.",
    "- Do not treat chart creation as the default end state. If the grouped table already answers the question better than a chart, keep the result as a table or concise explanation.",
    "- If the latest visible query is only a preview without filters or aggregates, describe it as a preview. Do not overclaim that matching records were found."
  ];
  if (canCreatePlans) {
    runtimeRules.push("- Use `analysis.create_plan` only when the user wants a new visualization or dashboard card and the grouped evidence is already stable enough to justify the chart design. Do not use it as a fallback when a query payload fails.");
    runtimeRules.push("- `analysis.create_plan` must return an executable payload. Use either a SQL-first plan with `queryMode`, `query`, and `bindings`, or a classic chart plan with `groupByColumn` and the needed value bindings.");
    runtimeRules.push("- Before calling `analysis.create_plan`, prefer one more bounded `data.query` when you still need to confirm the best grouping, metric alias, or whether the result is better shown as a table than a chart.");
    runtimeRules.push("- If the visible evidence already includes aggregated aliases from `data.query` such as `total_revenue` or `total_cost`, prefer `analysis.create_plan` with `query + bindings` that reuse that query result.");
    runtimeRules.push("- Do not return visualization-only placeholders such as `xAxis`, `yAxis`, `metrics`, `values`, `columns`, or `valueColumns` unless they are backed by executable bindings in the same payload.");
    runtimeRules.push('- SQL-first `analysis.create_plan` example: `args.plan = { chartType: "combo", title: "Project Profitability", description: "Compare total revenue and total cost by project.", queryMode: "aggregate", aggregation: "sum", secondaryAggregation: "sum", bindings: { groupByColumn: "SeriesLabelL1", valueColumn: "total_revenue", secondaryValueColumn: "total_cost" }, query: { select: ["SeriesLabelL1", "total_revenue", "total_cost"], groupBy: ["SeriesLabelL1"], aggregates: [{ function: "sum", column: "Value", as: "total_revenue", where: { predicates: [{ column: "Description", operator: "in", value: ["Revenue", "Net Sales / Revenue"] }] } }, { function: "sum", column: "Value", as: "total_cost", where: { predicates: [{ column: "Description", operator: "in", value: ["Cost of Sales", "Project Costs of Sales"] }] } }], orderBy: [{ column: "total_revenue", direction: "desc" }], limit: 10 } }`.');
  }
  if (canPivotMatrix) {
    runtimeRules.push("- `analysis.pivot_matrix` creates a read-only pivot/crosstab card. Use `rows` for the row dimension and `columns` for the cross-tab dimension. Only use documented properties: `rows`, `columns`, `metric`, `aggregate`, `title`, `description`, `topN`, `sort`. Do NOT send `pivotColumns`, `matrixValueColumns`, or other invented fields.");
    runtimeRules.push('- `analysis.pivot_matrix` example: `args = { rows: ["ProjectCode"], columns: ["Quarter"], metric: "Value", aggregate: "sum", title: "Revenue by Project and Quarter", description: "Cross-tab of project revenue across quarters." }`.');
    runtimeRules.push("- `analysis.pivot_matrix` performs a full cross-tab of the `columns` dimension — every unique value becomes a matrix column. It cannot filter which column values to include. If the user wants a selective comparison (e.g., only Revenue vs Cost from a Description column with 10+ values), prefer `analysis.create_plan` with SQL-first conditional aggregates instead.");
  }
  if (canMutateData) {
    runtimeRules.push("- For permanent dataset fixes, `data.mutate` must use supported deterministic operations such as `replace_values`, `cast_column`, `normalize_empty_values`, or `filter_rows`. Do not invent generic operation types such as `mutate`.");
    runtimeRules.push("- If numeric-looking strings contain commas, currency symbols, percentages, or accounting negatives, prefer a deterministic `data.mutate` repair using `replace_values` and/or `cast_column` instead of describing ad-hoc parsing code.");
    runtimeRules.push("- When the dataset is a label/value table where metrics such as Revenue and Cost appear as row labels, prefer `data.mutate` with `derive_metric_by_label` before `analysis.create_plan`.");
    runtimeRules.push('- Label/value derived metric example: `args.operations = [{ type: "derive_metric_by_label", groupByColumns: ["Project"], labelColumn: "Description", valueColumn: "Value", outputMetricLabel: "Profit", formula: { kind: "linear_combination", components: [{ operator: "add", matchAny: ["revenue"] }, { operator: "subtract", matchAny: ["cost"] }] } }]`.');
  } else {
    runtimeRules.push("- If `data.mutate` is not available in Available Tools, do not propose permanent dataset edits or cleanup workflows. Stay read-only and use `data.query`, `spreadsheet.filter`, or `assistant_message`.");
  }
  if (canValidateMetricMapping) {
    runtimeRules.push("- For profit, margin, variance, or budget-vs-actual requests, prefer `analysis.validate_metric_mapping` before `data.mutate` or `analysis.create_plan` unless the metric mapping is already validated in the Evidence Chain.");
  }
  if (canMutateData || canAddCalculatedColumn) {
    runtimeRules.push("- If the user asks for profit, margin, or variance, derive the metric deterministically before charting it. Do not invent arithmetic directly inside `analysis.create_plan`.");
  }
  if (canMutateData) {
    runtimeRules.push("- When the source metrics are real numeric columns, prefer `data.mutate` with `derive_column` or `card.add_calculated_column` before `analysis.create_plan`.");
  } else if (canAddCalculatedColumn) {
    runtimeRules.push("- When the source metrics are real numeric columns and `data.mutate` is unavailable, prefer `card.add_calculated_column` only for row-level visible-card formulas before creating a chart.");
  }
  runtimeRules.push('- Aggregate `data.query` example: `plan = { groupBy: ["Project"], aggregates: [{ function: "sum", column: "Amount", as: "total_amount" }], select: ["Project", "total_amount"], orderBy: [{ column: "total_amount", direction: "desc" }], limit: 10 }`.');
  runtimeRules.push('- Conditional aggregate `data.query` example: `plan = { groupBy: ["Project"], aggregates: [{ function: "sum", column: "Value", as: "total_revenue", where: { predicates: [{ column: "Description", operator: "in", value: ["Revenue", "Net Sales / Revenue"] }] } }, { function: "sum", column: "Value", as: "total_cost", where: { predicates: [{ column: "Description", operator: "in", value: ["Cost of Sales", "Project Costs of Sales"] }] } }], select: ["Project", "total_revenue", "total_cost"], orderBy: [{ column: "total_revenue", direction: "desc" }], limit: 10 }`.');
  runtimeRules.push('- Row-level `data.query` example: `plan = { select: ["Description", "Amount"], where: { predicates: [{ column: "Description", operator: "contains", value: "Cost" }] }, limit: 25 }`.');
  runtimeRules.push('- OR `data.query` example: `plan = { select: ["Description", "Amount"], where: { groups: [{ predicates: [{ column: "Description", operator: "contains", value: "revenue" }] }, { predicates: [{ column: "Description", operator: "contains", value: "cost" }] }] }, limit: 25 }`.');
  runtimeRules.push("- Inside `plan.where`, top-level `predicates` are combined with AND, while `groups` are combined with OR.");
  runtimeRules.push("- If the user explicitly asks for OR / either-term matching, do not place both alternatives in one `predicates` array. Split them across `plan.where.groups`.");
  runtimeRules.push("- If you use `groupBy`, include at least one aggregate. If you use `orderBy`, include that sorted column in `select`.");
  runtimeRules.push("- Use `plan.aggregates[].where` when each aggregate needs its own label/value filter. Keep `plan.where` only for shared row filters that apply to every aggregate.");
  runtimeRules.push("- Use only real source dataset columns inside `plan.where`. Do not filter on aggregate aliases such as `record_count` or `total_amount`.");
  runtimeRules.push("- `data.query` does not support a HAVING clause. If you need grouped counts or totals, return grouped rows with an aggregate alias, sort them, and explain the result instead of filtering on the alias.");
  if (canAddCalculatedColumn) {
    runtimeRules.push("- `card.add_calculated_column` only supports row-level expressions like `'Revenue' - 'Cost'`. Do not use SQL, subqueries, or `SUM/COUNT/AVG` inside that tool.");
  }
  runtimeRules.push("**Multi-Step Task Planning:** For complex requests that require multiple steps, choose the best immediate next action only. The runtime will call you again after observation.");
  runtimeRules.push("- Always be conversational in `assistant_message`.");
  return `
        You are an expert data analyst and business strategist, required to operate using a Reason-Act (ReAct) framework. Your final conversational responses should be in ${language}.
        Your core working principle: investigate data first, then respond with evidence. When in doubt, query the dataset — do not speculate or give generic overviews when the user is asking about specific records, values, or codes.
        ${managedContextText}

        **The user's latest message is:** "${userPrompt}"

        **Output Contract**
        You MUST respond with one JSON object only:
        \`{ "action": { ... } }\`
        The nested \`action\` must be exactly one of:
        1.  \`{ "type": "assistant_message", "thought": "...", "message": "...", "cardId"?: "...", "suggestedActions"?: [...] }\`
        2.  \`{ "type": "tool_call", "thought": "...", "toolName": "...", "args": { ... } }\`
        Choose exactly one next move per response.

        **Available Tools**
        ${renderToolList(tools)}

        **Decision-Making Process (ReAct Framework):**
        ${runtimeRules.join("\n        ")}
`;
};
const normalizeToolOverrides = (contract) => {
  const allowedToolNames = new Set(contract.allowedToolNames ?? []);
  const denyOverrides = new Set(contract.denyOverrides ?? []);
  ALL_RUNTIME_TOOLS.forEach((toolName) => {
    if (!allowedToolNames.has(toolName)) {
      denyOverrides.add(toolName);
    }
  });
  return {
    allowOverrides: (contract.allowOverrides ?? []).filter((toolName) => allowedToolNames.has(toolName)),
    denyOverrides: Array.from(denyOverrides)
  };
};
const buildToolExposureDiagnostics = (contract, resolvedToolNames, promptToolNames) => {
  const allowedToolNames = contract.allowedToolNames ?? [];
  if (allowedToolNames.length === 0) {
    return "No tool exposure conflicts detected.";
  }
  const unexpectedPromptTools = promptToolNames.filter((toolName) => !allowedToolNames.includes(toolName));
  if (unexpectedPromptTools.length === 0) {
    return "No tool exposure conflicts detected.";
  }
  return [
    `Contract allowed tools: ${allowedToolNames.join(", ") || "none"}`,
    `Registry allowed tools before contract filter: ${resolvedToolNames.join(", ") || "none"}`,
    unexpectedPromptTools.length > 0 ? `Prompt still exposes tools outside the runtime contract: ${unexpectedPromptTools.join(", ")}` : null,
    `Final prompt tools after contract filter: ${promptToolNames.join(", ") || "none"}`
  ].filter(Boolean).join("\n");
};
const TOOL_SECTION_MAP = {
  "data.query": /* @__PURE__ */ new Set([
    "runtime_step_contract",
    "dataset_columns",
    "column_display_labels",
    "dataset_knowledge",
    "analysis_intent_brief",
    "observe_step_result",
    "observe_data_sample",
    "observe_quality_status",
    "observe_guidance",
    "report_context",
    "recent_history",
    "evidence_chain",
    "active_turn_steps",
    "self_correction_feedback",
    "workflow_stage"
  ]),
  "analysis.create_plan": /* @__PURE__ */ new Set([
    "runtime_step_contract",
    "dataset_columns",
    "column_display_labels",
    "evidence_chain",
    "observe_step_result",
    "observe_data_sample",
    "observe_quality_status",
    "observe_guidance",
    "grounded_artifacts",
    "analysis_intent_brief",
    "dataset_knowledge",
    "active_turn_steps",
    "self_correction_feedback",
    "workflow_stage",
    "answerable_evidence"
  ]),
  "analysis.pivot_matrix": /* @__PURE__ */ new Set([
    "runtime_step_contract",
    "dataset_columns",
    "column_display_labels",
    "dataset_knowledge",
    "observe_step_result",
    "observe_data_sample",
    "observe_quality_status",
    "observe_guidance",
    "evidence_chain",
    "active_turn_steps",
    "column_quality_snapshot",
    "self_correction_feedback",
    "workflow_stage"
  ]),
  "assistant_message": /* @__PURE__ */ new Set([
    "runtime_step_contract",
    "answerable_evidence",
    "evidence_chain",
    "recent_history",
    "core_analysis_summary",
    "grounded_artifacts",
    "contextual_summary",
    "active_turn_steps",
    "workflow_stage",
    "dataset_columns",
    "column_display_labels",
    "observe_step_result",
    "observe_quality_status",
    "observe_guidance"
  ]),
  "conversation.request_clarification": /* @__PURE__ */ new Set([
    "runtime_step_contract",
    "evidence_chain",
    "recent_history",
    "dataset_columns",
    "column_display_labels",
    "active_turn_steps",
    "workflow_stage",
    "observe_guidance"
  ])
};
const DEFAULT_TOOL_SECTIONS = /* @__PURE__ */ new Set([
  "runtime_step_contract",
  "dataset_columns",
  "column_display_labels",
  "dataset_knowledge",
  "evidence_chain",
  "observe_step_result",
  "observe_data_sample",
  "observe_quality_status",
  "observe_guidance",
  "recent_history",
  "grounded_artifacts",
  "active_turn_steps",
  "self_correction_feedback",
  "workflow_stage",
  "answerable_evidence"
]);
const EMPTY_SENTINELS = /* @__PURE__ */ new Set([
  "No contextual summary yet.",
  "No core analysis has been performed yet.",
  "No tool exposure conflicts detected.",
  "No evidence chain artifacts are available yet."
]);
const isEmptySectionBody = (body) => {
  const afterHeader = body.includes("\n") ? body.slice(body.indexOf("\n") + 1) : body;
  return EMPTY_SENTINELS.has(afterHeader.trim());
};
const formatActiveTurnSteps = (turn) => {
  if (!turn || turn.steps.length === 0) {
    return "No completed runtime steps yet in this turn.";
  }
  const contextPolicy = resolveLongSessionContextPolicy();
  const recentSteps = turn.steps.slice(-contextPolicy.activeTurnStepWindow).map((step) => {
    var _a, _b;
    const actionLabel = step.action.type === "tool_call" ? step.action.toolName : "assistant_message";
    const observationSummary = truncateContextText(((_a = step.observation) == null ? void 0 : _a.summary) ?? "No observation recorded.", contextPolicy.maxObservationChars);
    const retryHint = ((_b = step.observation) == null ? void 0 : _b.retryHint) ? ` | retryHint: ${truncateContextText(step.observation.retryHint, contextPolicy.maxObservationChars)}` : "";
    return `Step ${step.index}: ${actionLabel} | status: ${step.status} | observation: ${observationSummary}${retryHint}`;
  });
  return [
    `Steps used: ${turn.budgetStatus.stepsUsed}/${turn.budgetStatus.maxSteps}`,
    ...recentSteps
  ].join("\n");
};
const formatEvidenceChain = (state, analysisIntentBriefText) => {
  var _a, _b, _c, _d, _e;
  const parts = [];
  if (analysisIntentBriefText) {
    parts.push(`Metric semantics:
${analysisIntentBriefText}`);
  }
  if (state == null ? void 0 : state.activeDataQuery) {
    parts.push(
      `Active data.query artifact: ${state.activeDataQuery.explanation ?? "n/a"} | groupBy: ${((_b = (_a = state.activeDataQuery.plan) == null ? void 0 : _a.groupBy) == null ? void 0 : _b.join(", ")) || "none"} | selected columns: ${((_d = (_c = state.activeDataQuery.result) == null ? void 0 : _c.selectedColumns) == null ? void 0 : _d.join(", ")) || "none"}`
    );
  }
  if (state == null ? void 0 : state.activeMetricMappingValidation) {
    const grain = Array.isArray(state.activeMetricMappingValidation.grain) ? state.activeMetricMappingValidation.grain : [];
    const blockers = Array.isArray(state.activeMetricMappingValidation.blockers) ? state.activeMetricMappingValidation.blockers : [];
    parts.push(
      `Metric mapping validation: ${state.activeMetricMappingValidation.metricName} | grain: ${grain.join(", ") || "none"} | blockers: ${blockers.join(" | ") || "none"} | recommended next step: ${state.activeMetricMappingValidation.recommendedAction}`
    );
  }
  if ((((_e = state == null ? void 0 : state.analysisCards) == null ? void 0 : _e.length) ?? 0) > 0) {
    const visibleCards = ((state == null ? void 0 : state.analysisCards) ?? []).slice(-3);
    const evaluationByCardId = new Map(
      evaluateAutoAnalysisCards(visibleCards).cards.map((card) => [card.cardId, card])
    );
    parts.push(
      `Visible cards: ${visibleCards.map((card) => {
        const evaluation = card.autoAnalysisEvaluation ?? evaluationByCardId.get(card.id);
        const verdict = (evaluation == null ? void 0 : evaluation.verdict) ?? "unknown";
        const topic = card.sourceTopic ? ` topic=${card.sourceTopic}` : "";
        return `${card.id}:${card.plan.title} [${verdict}]${topic}`;
      }).join(" | ")}`
    );
  }
  if (state == null ? void 0 : state.activeSpreadsheetFilter) {
    parts.push(`Active spreadsheet filter: ${state.activeSpreadsheetFilter.query}`);
  }
  return parts.join("\n\n") || "No evidence chain artifacts are available yet.";
};
const buildChatRequest = async (columns, chatHistory, userPrompt, cardContext, relatedCards, settings, aiCoreAnalysisSummary, rawDataSample, longTermMemory, dataPreparationPlan, selfCorrectionFeedback, datasetKnowledge, telemetryTarget, contextualSummary, sessionGoalContext, runtimeStepContract, modelId, compactionMode = "normal", sanitizedChatHistory, columnDisplayMap, observeContextSections, preSelectedTool) => {
  var _a;
  const modelTranscript = sanitizedChatHistory ?? sanitizeChatHistoryForModel(chatHistory);
  const allColumnNames = columns.map((c) => c.name);
  const state = telemetryTarget;
  const appliedRuntimeStepContract = runtimeStepContract ?? buildRuntimeStepContract(userPrompt, state);
  const toolOverrides = normalizeToolOverrides(appliedRuntimeStepContract);
  const resolvedRegistry = resolveAllowedTools(buildBuiltinToolRegistry(allColumnNames), state ? buildToolAvailabilityContext({
    analysisCards: state.analysisCards ?? [],
    cardEnhancementSuggestions: state.cardEnhancementSuggestions ?? [],
    columnProfiles: columns,
    csvData: state.csvData,
    cleaningRun: state.cleaningRun,
    sessionId: state.sessionId ?? "unknown-session",
    currentDatasetId: state.currentDatasetId ?? null,
    settings: state.settings ?? settings
  }, {
    columnNames: allColumnNames,
    toolStage: !state.cleaningRun || state.cleaningRun.status === "completed" ? "analysis" : "cleaning",
    allowOverrides: toolOverrides.allowOverrides,
    denyOverrides: toolOverrides.denyOverrides
  }) : {
    cardIds: [],
    columnNames: allColumnNames,
    hasCsvData: false,
    hasCards: false,
    hasCleaningRun: false,
    cleaningRunStatus: null,
    suggestionIds: [],
    cleaningCompleted: true,
    toolStage: "analysis",
    allowOverrides: toolOverrides.allowOverrides,
    denyOverrides: toolOverrides.denyOverrides
  });
  const workflowStage = resolvedRegistry.stage;
  const allowedToolNames = new Set(appliedRuntimeStepContract.allowedToolNames ?? ALL_RUNTIME_TOOLS);
  const resolvedToolNames = resolvedRegistry.exposedTools.map((tool) => tool.name);
  const exposedTools = resolvedRegistry.exposedTools.filter((tool) => allowedToolNames.has(tool.name));
  const toolExposureDiagnostics = buildToolExposureDiagnostics(
    appliedRuntimeStepContract,
    resolvedToolNames,
    exposedTools.map((tool) => tool.name)
  );
  const evidenceOrder = "visible evidence already on screen, current cards, bounded dataset tools, then workspace inspection only when direct dataset tools are insufficient.";
  const analysisIntentBrief = buildAnalysisIntentBrief({
    columns,
    csvData: (state == null ? void 0 : state.csvData) ?? null,
    dataPreparationPlan,
    datasetSemanticSnapshot: (state == null ? void 0 : state.datasetSemanticSnapshot) ?? null,
    semanticDatasetVersion: (state == null ? void 0 : state.semanticDatasetVersion) ?? null
  });
  const reportContext = resolveEffectiveReportContext(
    (state == null ? void 0 : state.reportContextResolution) ?? null,
    (state == null ? void 0 : state.rawCsvData) ?? null,
    (state == null ? void 0 : state.csvData) ?? null
  );
  const analystCapabilityText = formatAnalystCapabilitySelection(appliedRuntimeStepContract.analystCapabilitySelection);
  const semanticContextText = formatDatasetSemanticsForPrompt(
    (state == null ? void 0 : state.datasetSemanticSnapshot) ?? null,
    (state == null ? void 0 : state.semanticDatasetVersion) ?? null,
    (state == null ? void 0 : state.csvData) ?? null,
    columns
  );
  const displayLabelLines = Object.entries(columnDisplayMap ?? {}).filter(([physicalName, displayLabel]) => displayLabel && displayLabel !== physicalName).map(([physicalName, displayLabel]) => `${displayLabel} -> ${physicalName}`);
  const isReadOnlyInspectTurn = (appliedRuntimeStepContract.taskMode === "inspect" || appliedRuntimeStepContract.taskMode === "explain") && !((_a = appliedRuntimeStepContract.allowedToolNames) == null ? void 0 : _a.includes("data.mutate"));
  const baseSystemPrompt = createChatResponderSystemPrompt({
    language: settings.language,
    evidenceOrder,
    workflowStage,
    analystCapabilityText,
    appliedRuntimeStepContract
  });
  const systemPrompt = preSelectedTool ? `${baseSystemPrompt}

IMPORTANT: You MUST use tool "${preSelectedTool}". Construct the arguments for this tool. Do not select a different tool.` : baseSystemPrompt;
  const focusedSectionSet = preSelectedTool ? TOOL_SECTION_MAP[preSelectedTool] ?? DEFAULT_TOOL_SECTIONS : null;
  const allSections = [
    createContextSection("analyst_capability_packaging", `**Analyst Skill/Recipe Packaging:**
${analystCapabilityText}`, "high", "sticky"),
    createContextSection("analysis_intent_brief", `**Analysis Intent Brief:**
${formatAnalysisIntentBrief(analysisIntentBrief)}`, "high", "sticky"),
    createContextSection("evidence_chain", `**Evidence Chain:**
${formatEvidenceChain(state, formatAnalysisIntentBrief(analysisIntentBrief))}`, "high", "sticky"),
    createContextSection("report_context", `**Report Context:**
${formatReportContextForPrompt(reportContext)}`, "high", "sticky"),
    createContextSection("dataset_semantics", `**Dataset Semantics:**
${semanticContextText}`, "high", "sticky"),
    createContextSection("dataset_knowledge", `**Dataset Knowledge:**
${formatDatasetKnowledge(datasetKnowledge)}`, "required", "sticky"),
    createContextSection("dataset_columns", `**Dataset Columns:**
${formatColumnNames(columns)}`, "required", "sticky"),
    ...displayLabelLines.length > 0 ? [createContextSection("column_display_labels", `**Display Labels -> Physical Columns:**
${displayLabelLines.join("\n")}`, "high", "sticky")] : [],
    // Column quality merged into dataset_columns; standalone snapshot dropped to reduce overlap.
    createContextSection("column_quality_snapshot", `**Column Quality Snapshot:**
${formatColumnQualitySummary(columns)}`, "low", "prunable"),
    ...contextualSummary ? [createContextSection("contextual_summary", `**Contextual Summary:**
${contextualSummary}`, "high", "sticky")] : [],
    ...sessionGoalContext ? [createContextSection("session_goal", `**Session Goal & Exploration Context:**
${sessionGoalContext}`, "high", "sticky")] : [],
    createContextSection("runtime_step_contract", `**Runtime Step Contract:**
${formatRuntimeStepContract(appliedRuntimeStepContract)}`, "required", "sticky"),
    // Only emit tool diagnostics when actual conflicts exist — saves ~300 bytes per call.
    ...!isEmptySectionBody(`**Tool Exposure Diagnostics:**
${toolExposureDiagnostics}`) ? [createContextSection("tool_exposure_diagnostics", `**Tool Exposure Diagnostics:**
${toolExposureDiagnostics}`, "medium", "sticky")] : [],
    // AGENT-104: Three-layer evidence context — deduped.
    // evidence_chain (above) is the primary evidence summary.
    // session_trace: full trace, most redundant with evidence_chain → low/prunable.
    // grounded_artifacts: card metadata not in evidence_chain → medium/prunable.
    createContextSection("session_trace", `**Session Trace:**
${formatVisibleTrace({
      contextualSummary: contextualSummary ?? null,
      activeDataQuery: (state == null ? void 0 : state.activeDataQuery) ?? null,
      activeMetricMappingValidation: (state == null ? void 0 : state.activeMetricMappingValidation) ?? null,
      activeSpreadsheetFilter: (state == null ? void 0 : state.activeSpreadsheetFilter) ?? null,
      analysisCards: (state == null ? void 0 : state.analysisCards) ?? [],
      queryHistory: (state == null ? void 0 : state.queryHistory) ?? [],
      chatHistory,
      cleaningRun: (state == null ? void 0 : state.cleaningRun) ?? null,
      activeTurn: (state == null ? void 0 : state.activeTurn) ?? null
    }, settings)}`, "low", "prunable"),
    createContextSection("grounded_artifacts", `**Grounded Artifacts:**
${formatGroundedArtifacts({
      contextualSummary: contextualSummary ?? null,
      activeDataQuery: (state == null ? void 0 : state.activeDataQuery) ?? null,
      activeMetricMappingValidation: (state == null ? void 0 : state.activeMetricMappingValidation) ?? null,
      activeSpreadsheetFilter: (state == null ? void 0 : state.activeSpreadsheetFilter) ?? null,
      analysisCards: (state == null ? void 0 : state.analysisCards) ?? [],
      queryHistory: (state == null ? void 0 : state.queryHistory) ?? [],
      chatHistory,
      cleaningRun: (state == null ? void 0 : state.cleaningRun) ?? null,
      activeTurn: (state == null ? void 0 : state.activeTurn) ?? null
    })}`, "medium", "prunable"),
    createContextSection("answerable_evidence", `**Answerable Evidence:**
${appliedRuntimeStepContract.answerableEvidenceSummary || "No answerable evidence for current question."}`, "required", "sticky"),
    // Skip core analysis summary when empty — saves ~60 tokens of "No core analysis..." noise.
    ...aiCoreAnalysisSummary ? [createContextSection("core_analysis_summary", `**Core Analysis Briefing:**
${aiCoreAnalysisSummary}`, "high", "sticky")] : [],
    // Stage-aware: in analysis stage (no active cleaning), data_prep sections are low/prunable.
    createContextSection(
      "data_prep_explanation",
      `**Data Preparation Explanation:**
${formatDataPreparationExplanation(dataPreparationPlan)}`,
      workflowStage === "analysis" ? "low" : "medium",
      workflowStage === "analysis" ? "prunable" : "sticky"
    ),
    ...!isReadOnlyInspectTurn && workflowStage !== "analysis" ? [
      createContextSection("data_prep_operations", `**Data Preparation Operations:**
${formatDataPreparationOperations(dataPreparationPlan)}`, "medium", "sticky"),
      createContextSection("data_prep_code", `**Data Preparation Code:**
${formatDataPreparationCode(dataPreparationPlan)}`, "low", "prunable")
    ] : [],
    // AGENT-108 / 108A: Structured observe context is injected for ALL turn types
    // (including read-only inspect/explain) — these turns are the most dependent on
    // prior-step rows/columns/quality signals. Only data_prep_operations/code are
    // gated behind !isReadOnlyInspectTurn.
    ...observeContextSections && observeContextSections.length > 0 ? observeContextSections.map((s) => createContextSection(s.key, s.content, s.priority, s.retention)) : [createContextSection("self_correction_feedback", `**Self-Correction Feedback:**
${selfCorrectionFeedback ? `CRITICAL: ${selfCorrectionFeedback}` : "No previous errors in this turn."}`, "required", "sticky")],
    createContextSection("workflow_stage", `**Workflow Stage:**
${workflowStage === "analysis" ? "Analysis stage. Cards may be created, updated, reviewed, deleted, and SQL may be used if needed." : "Cleaning stage. Only inspect workspace files or run verify queries. Do not create analysis cards yet."}`, "required", "sticky"),
    createContextSection("active_turn_steps", `**Current Runtime Turn:**
${formatActiveTurnSteps(state == null ? void 0 : state.activeTurn)}`, "high", "sticky"),
    createContextSection("long_term_memory", `**Long-Term Memory:**
${formatLongTermMemory(trimMemoryHits(longTermMemory))}`, "medium", "prunable"),
    createContextSection("related_cards", `**Likely Relevant Cards:**
${formatRelatedCards(trimRelatedCards(relatedCards))}`, "medium", "prunable"),
    createContextSection("card_context", `**Analysis Cards On Screen:**
${formatCardContext(trimCardContext(cardContext))}`, "medium", "prunable"),
    createContextSection("recent_query_trace", `**Recent Query Trace:**
${formatDetailedRecentQueryTrace(
      (state == null ? void 0 : state.queryHistory) ?? [],
      settings
    )}`, "medium", "prunable"),
    ...!isReadOnlyInspectTurn ? [createContextSection("raw_data_sample", `**Raw Data Sample:**
${formatRows(trimRawDataSample(rawDataSample))}`, "low", "prunable")] : [],
    createContextSection("recent_history", `**Recent Conversation:**
${formatSanitizedTranscript(trimSanitizedTranscript(modelTranscript, resolveLongSessionContextPolicy(settings).recentChatWindow))}`, "high", "prunable"),
    ...!isReadOnlyInspectTurn ? [createContextSection("workspace_actions", `**Recent Workspace Actions:**
${formatRecentWorkspaceActionEvidence(
      (state == null ? void 0 : state.workspaceActionHistory) ?? [],
      settings
    )}`, "low", "prunable")] : []
  ];
  const sections = focusedSectionSet ? allSections.filter((s) => focusedSectionSet.has(s.key)) : allSections;
  const managed = await prepareManagedContext({
    callType: "chat",
    systemText: systemPrompt,
    baseUserText: preSelectedTool ? `Construct a "${preSelectedTool}" tool call using the following context.` : "Use the following managed context before deciding on actions.",
    sections,
    collapsedSections: {
      recent_history: `**Recent Conversation:**
${formatSanitizedTranscript(trimSanitizedTranscript(modelTranscript, resolveLongSessionContextPolicy(settings).recentChatWindow))}`
    },
    settings,
    modelId: modelId ?? settings.simpleModel,
    compactionMode
  });
  reportContextDiagnostics(telemetryTarget, managed.diagnostics);
  const promptTools = exposedTools;
  const promptContent = createChatPrompt(userPrompt, managed.userText, settings.language, promptTools);
  const messages = [
    { role: "system", content: managed.systemText },
    { role: "user", content: promptContent }
  ];
  return {
    messages,
    tools: promptTools,
    responseSchema: createChatDecisionSchema(promptTools),
    stream: true
  };
};
const generateFilterFunction = async (query, columns, sampleData, settings, telemetryTarget, abortSignal) => {
  let lastError;
  for (let i = 0; i < 2; i++) {
    try {
      throwIfAborted(abortSignal);
      const systemPrompt = filterGeneratorSystemPrompt;
      const { model, modelId } = createProviderModel(settings, settings.complexModel);
      const result = await runWithOverflowCompaction({
        provider: settings.provider,
        abortSignal,
        execute: async (compactionMode) => {
          const managed = await prepareManagedContext({
            callType: "tool",
            systemText: systemPrompt,
            baseUserText: `Convert the user query into a dataset filter.
User query: "${query}"`,
            sections: [
              createContextSection("dataset_schema", `Dataset columns (schema):
${formatColumnProfiles(columns)}`, "required", "sticky"),
              createContextSection("sample_data", `Sample data:
${formatRows(trimRawDataSample(sampleData, 8))}`, "high", "prunable")
            ],
            settings,
            modelId,
            compactionMode
          });
          reportContextDiagnostics(telemetryTarget, managed.diagnostics);
          const promptContent = createFilterFunctionPrompt(query, managed.userText);
          return withTransientRetry(
            (fb) => streamGenerateText({
              model: fb ?? model,
              messages: [
                { role: "system", content: managed.systemText },
                { role: "user", content: promptContent }
              ],
              output: output_exports.object({ schema: jsonSchema(prepareSchemaForProvider(filterFunctionSchema, settings.provider)) }),
              abortSignal
            }),
            { settings, primaryModelId: modelId, label: "filterGenerator", abortSignal }
          );
        }
      });
      const parsed = result.output;
      if (parsed.operation && parsed.operation.type === "filter_rows" && parsed.explanation) {
        return parsed;
      }
      throw new Error("AI response was missing required fields 'operation' or 'explanation'.");
    } catch (error) {
      if (isRuntimeAbortError(error, abortSignal)) {
        throw error;
      }
      console.error(`Error in filter function generation (Attempt ${i + 1}):`, error);
      lastError = error;
    }
  }
  throw new Error(`AI failed to generate a valid filter function. Last error: ${lastError == null ? void 0 : lastError.message}`);
};
const cardSummarySystemPrompt = 'You are a business intelligence analyst. Return professional Markdown that starts with at most three short bullets before any heading. If more detail is useful, place it in a compact "Expanded Analysis" section after the opening bullets. Only make claims that are directly supported by the chart data, chart title, or explicitly listed columns. If label semantics are unclear or mixed, refer to them neutrally as labels, entries, or values instead of inventing domain meaning. Do not introduce unsupported business causes, dominant-driver claims, concentration claims, or budget-variance commentary unless the evidence is explicit. Call out specific numbers when available and never wrap the response in code fences.';
const coreAnalysisBriefingSystemPrompt = (language) => `You are a senior data analyst presenting an initial automated analysis briefing. Write in ${language}.

Your briefing must cover these areas using SPECIFIC numbers from the generated cards — no vague language like "significant" or "warrants monitoring":
1.  **Initial Observations**: Two sentences. State what the report is (use the report title/parameters if available) and the most notable pattern you see in the cards. Cite actual values.
2.  **Key Dimensions & Metrics**: One bullet for dimensions, one for metrics. Name the actual columns used.
3.  **Suggested Next Analyses**: Three concrete follow-up questions that CANNOT be answered by the current cards — e.g. cross-dimension comparisons, derived metrics (margins, ratios), or drill-downs.

Rules:
- If the report title or parameters indicate a specific report type (e.g. "Income Statement By Project"), acknowledge that structure and suggest analyses appropriate for that report type (e.g. project-level profitability, cost breakdowns, margin analysis).
- When card data shows identical values across multiple labels (e.g. same amount under different codes), explain this likely reflects a parent-child hierarchy or consolidation structure — do not just say "review".
- If a card shows a dominant null/unknown category, quantify it and suggest a specific reconciliation action.
- Avoid corporate filler ("warrants monitoring", "significant activity", "continued oversight"). Every sentence must contain a number or a specific column/label reference.
- Only infer the business domain when column names or cards clearly support it. Stay neutral if ambiguous.`;
const executiveBriefSystemPrompt = (language) => `You are a senior business strategist producing a structured executive brief from automated data analyses.
Write every sentence in ${language}. Return professional Markdown only — no code fences.

Your brief must follow this exact structure:
1. **Key Findings** — 3 to 5 numbered findings, each formatted as:
   N. **[Concise finding title]** — [One sentence with at least one specific number from the source data]. Confidence: [high | medium | low]
      → Recommended Action: [One concrete, specific next step the business can take. No vague suggestions like "review the data".]
2. **Data Confidence Assessment** — A short paragraph (2-3 sentences) that explains the overall confidence level based on the quality and coverage of the underlying cards (e.g. how many cards were available, whether any were caveated or helper-heavy, and what that means for decision reliability).

Rules:
- Only surface findings that are directly supported by the provided card summaries. Do not invent causes, diagnoses, or entity types.
- Confidence for each finding is "high" when the card verdict is trusted and the number is unambiguous, "medium" when the card is caveated or the number requires context, "low" when data is sparse or the card is helper-heavy.
- If source summaries use neutral terms (labels, entries, values), preserve that framing — do not upgrade to projects, locations, or business units.
- Recommended actions must be concrete tasks: "Reconcile the 98.6M null-code entries against the project ledger" is good; "Review the data" is not.
- Mention budget variance, forecast, or plan-vs-actual only when explicitly present in the source summaries.`;
const createExecutiveBriefPrompt = (contextText, language) => `
Produce a structured executive brief in ${language} using only the findings from the provided card summaries.

${contextText}

Your response **must** be polished Markdown in ${language} with this exact structure:

### Key Findings

1. **[Finding title]** — [One sentence with a specific number]. Confidence: high | medium | low
   → Recommended Action: [Concrete next step]

2. **[Finding title]** — [One sentence with a specific number]. Confidence: high | medium | low
   → Recommended Action: [Concrete next step]

(3 to 5 findings total)

### Data Confidence Assessment

[2-3 sentences: overall confidence level, number of cards used, any caveats or helper-heavy cards, and what this means for decision reliability.]

Rules:
- Every finding must contain at least one specific number (amount, percentage, count, or ratio) from the source data.
- Do NOT use vague language: "significant", "notable", "warrants monitoring", or "continued oversight".
- Only synthesize claims supported by source summaries. Do not invent causal explanations.
- If source summaries use neutral terms, preserve them.
- When identical values appear across multiple dimensions, explain the reporting structure (parent-child hierarchy, consolidation) rather than treating them as independent findings.
`;
const createSummaryPrompt = (title, contextText, language) => {
  const markdownTemplate = `
- Start immediately with 2-3 short bullet points. No heading before them.
- Each bullet must be one sentence, under 18 words, and explain why the finding matters.

### Expanded Analysis
- Add up to 3 short bullets with supporting numbers, caveats, or one actionable follow-up.
`;
  const languageInstruction = `Produce a single professional Markdown section in ${language}.`;
  return `
        You are a business intelligence analyst.
        The following data is for a chart titled "${title}".
        ${contextText}
        
        ${languageInstruction}

        Your Markdown must follow this template strictly (use ${language}):
        ${markdownTemplate}

        CRITICAL RULE: The summary should highlight key trends, outliers, or business implications. Do not just describe the data; interpret its meaning.
        - The opening bullet block is the default on-card summary, so it must stay scannable in 3 lines or fewer.
        - Only state conclusions that are directly supported by this chart's values, labels, title, or explicitly named columns.
        - If the context includes user-facing display label hints, prefer those exact labels.
        - If the context includes a report title or parameter lines, use them as framing context for the summary without pretending they are chart results.
        - If the labels mix different concepts or the business meaning is unclear, refer to them neutrally as labels, entries, or values. Do not rename them as projects, facilities, cost centers, capital allocation, maintenance, or other domain entities unless those words are explicitly supported by the chart title or column names.
        - Do not invent qualifiers such as fiscal, primary, secondary, category, or classification unless those exact words are explicitly supported by the title, listed columns, or provided display label hints.
        - If one value is simply the highest, describe it as the largest label, highest single entry, or one of the top entries. Do not escalate that into claims like core driver, strategic priority, dominant investment, or highly concentrated unless the chart clearly proves it.
        - Mention budget variance, forecast, planning, or plan-vs-actual only when this specific chart or its listed columns explicitly include that evidence.
        - Do not use report-style headings such as "Insight Overview", "Metric Signals", or "Recommended Action".
        - Prefer evidence-tied phrasing like "Region A is the largest entry at 500" instead of unsupported interpretation like "Region A is the company's strongest market."
        - If you notice a relevant metric is missing from THIS SPECIFIC chart's data (but it exists in the full column list), do not claim it's missing from the entire dataset. Instead, suggest that it could be a valuable addition for a more complete picture. For example, if a sales chart doesn't show margins, you could say: "While this chart highlights top sales performers, incorporating GrossMarginPct would provide a clearer view of their profitability."
        - Do not wrap your markdown inside code fences.
    `;
};
const createCoreAnalysisPrompt = (contextText, language) => `
    You are a senior data analyst. After performing an initial automated analysis of a dataset, your task is to create a concise "Core Analysis Briefing". This briefing will be shown to the user and will serve as the shared foundation of understanding for your conversation.
    Based on the columns and the analysis cards you have just generated, summarize the dataset's primary characteristics.
    
    **Available Information:**
    ${contextText}
    
    Your response **must** be returned as polished Markdown with the following structure (use ${language}):

    ### Initial Observations
    - One or two bullet points about the fundamental nature of the dataset (e.g., "This appears to be a transactional sales ledger...").
    
    ### Key Dimensions & Metrics
    - Briefly list the most important categorical columns for grouping (Dimensions).
    - Briefly list the most important numerical columns for analysis (Metrics).

    ### Suggested Next Analyses
    - Based on the initial cards, suggest 2-3 specific areas for deeper investigation to guide the user.
    
    CRITICAL:
    - Only infer the dataset's subject matter when the column names or card titles clearly support it.
    - If the context includes a report title or parameter lines, use them to sharpen the framing of the briefing without overstating them as observed metrics.
    - If the context includes user-facing display label hints, prefer those exact labels.
    - If the schema is semantically ambiguous, describe it conservatively as a dataset with several label/dimension columns and numerical columns, then cite the specific columns that support that description.
    - Do not invent qualifiers such as fiscal, primary, secondary, category, or classification unless those exact words are explicitly supported by the available information.
    - Do not claim this is project data, budget data, maintenance data, a transaction ledger, or any other business domain unless the available information clearly says so.
    - Ground every high-level statement in the provided columns or generated cards. Do not wrap the response in code fences.
`;
const visualEvaluationSystemPrompt = `You are a data visualization quality evaluator. Analyze the rendered chart image for visual quality issues.

Check for these problems:
1. **Label readability**: Are axis labels or data labels overlapping, truncated, or too small to read?
2. **Segment crowding**: Are pie/doughnut slices too thin or numerous to distinguish?
3. **Chart-type fitness**: Does the chart type suit the visible data shape? (e.g., pie for 15+ categories is poor)
4. **Layout issues**: Is the legend overlapping the chart? Is the title truncated?

Respond with ONLY valid JSON (no markdown, no code fences):
{"quality":"good","suggestedChartType":null,"reason":null}

Rules:
- quality: "good" (no issues), "acceptable" (minor issues, usable), "poor" (significant readability problems)
- suggestedChartType: only set when quality is "poor" and a better chart type exists. Valid types: bar, horizontal_bar, line, area, pie, doughnut, scatter, combo, multi_line, stacked_bar, stacked_column, radar, bubble, polar_area
- reason: brief explanation when quality is not "good", otherwise null
- Do NOT suggest changes if the chart is acceptable. Only flag genuinely poor visualizations.`;
const wrapAsTelemetryStore = (target) => ({
  getState: () => target ?? {}
});
const generateSummary = async (title, data, settings, allColumns, telemetryTarget) => {
  if (!isProviderConfigured(settings)) {
    return {
      language: settings.language,
      text: "AI Summaries are disabled. No API Key provided."
    };
  }
  try {
    const state = telemetryTarget;
    const reportContext = resolveEffectiveReportContext(
      (state == null ? void 0 : state.reportContextResolution) ?? null,
      (state == null ? void 0 : state.rawCsvData) ?? null,
      (state == null ? void 0 : state.csvData) ?? null
    );
    const systemPrompt = cardSummarySystemPrompt;
    const { model, modelId } = createProviderModel(settings, settings.simpleModel);
    const result = await runWithOverflowCompaction({
      provider: settings.provider,
      execute: async (compactionMode) => {
        const managed = await prepareManagedContext({
          callType: "summary",
          systemText: systemPrompt,
          baseUserText: `Summarize the chart titled "${title}".`,
          sections: [
            createContextSection("report_context", `Report context:
${formatReportContextForPrompt(reportContext)}`, "high", "sticky"),
            createContextSection("chart_data", `Chart data sample:
${formatRows(trimRawDataSample(data, 8))}`, "required", "sticky"),
            createContextSection("dataset_columns", `Dataset columns:
${formatColumnNames(allColumns)}`, "medium", "prunable"),
            createContextSection("column_display_hints", `User-facing column label hints:
${formatColumnDisplayHints(allColumns)}`, "medium", "prunable")
          ],
          settings,
          modelId,
          compactionMode
        });
        reportContextDiagnostics(telemetryTarget, managed.diagnostics);
        const promptContent = createSummaryPrompt(title, managed.userText, settings.language);
        return withTransientRetry(
          (fb) => streamGenerateText({
            model: fb ?? model,
            messages: [
              { role: "system", content: managed.systemText },
              { role: "user", content: promptContent }
            ]
          }),
          { settings, primaryModelId: modelId, label: "summaryGenerator" }
        );
      }
    });
    return {
      language: settings.language,
      text: result.text || "No summary generated."
    };
  } catch (error) {
    console.error("Error generating summary:", error);
    emitSilentFailure(wrapAsTelemetryStore(telemetryTarget), error, {
      component: "SummaryGenerator",
      recoveryAction: "fallback_text_shown",
      userNotified: false
    });
    return {
      language: settings.language,
      text: "Failed to generate AI summary."
    };
  }
};
const generateCoreAnalysisSummary = async (cardContext, columns, settings, telemetryTarget) => {
  if (!isProviderConfigured(settings) || cardContext.length === 0) {
    return {
      language: settings.language,
      text: "Could not generate an initial analysis summary."
    };
  }
  try {
    const state = telemetryTarget;
    const reportContext = resolveEffectiveReportContext(
      (state == null ? void 0 : state.reportContextResolution) ?? null,
      (state == null ? void 0 : state.rawCsvData) ?? null,
      (state == null ? void 0 : state.csvData) ?? null
    );
    const planHints = cardContext.map((card) => ({
      title: card.title,
      description: card.description ?? "",
      groupByColumn: card.groupByColumn,
      valueColumn: card.valueColumn
    }));
    const displayCardContext = buildDisplayCardContext(trimCardContext(cardContext));
    const systemPrompt = coreAnalysisBriefingSystemPrompt(settings.language);
    const { model, modelId } = createProviderModel(settings, settings.complexModel);
    const result = await runWithOverflowCompaction({
      provider: settings.provider,
      execute: async (compactionMode) => {
        const managed = await prepareManagedContext({
          callType: "summary",
          systemText: systemPrompt,
          baseUserText: "Create an initial briefing based on the generated cards and dataset columns.",
          sections: [
            createContextSection("report_context", `Report context:
${formatReportContextForPrompt(reportContext)}`, "high", "sticky"),
            createContextSection("dataset_columns", `Dataset columns:
${formatColumnNames(columns)}`, "required", "sticky"),
            createContextSection("column_display_hints", `User-facing column label hints:
${formatColumnDisplayHints(columns, planHints)}`, "high", "sticky"),
            createContextSection("generated_cards", `Generated cards:
${formatCardContext(displayCardContext)}`, "required", "sticky")
          ],
          settings,
          modelId,
          compactionMode
        });
        reportContextDiagnostics(telemetryTarget, managed.diagnostics);
        const promptContent = createCoreAnalysisPrompt(managed.userText, settings.language);
        return withTransientRetry(
          (fb) => streamGenerateText({
            model: fb ?? model,
            messages: [
              { role: "system", content: managed.systemText },
              { role: "user", content: promptContent }
            ]
          }),
          { settings, primaryModelId: modelId, label: "coreAnalysisSummary" }
        );
      }
    });
    return {
      language: settings.language,
      text: result.text || "No summary generated."
    };
  } catch (error) {
    console.error("Error generating core analysis summary:", error);
    emitSilentFailure(wrapAsTelemetryStore(telemetryTarget), error, {
      component: "SummaryGenerator",
      recoveryAction: "core_analysis_fallback_text_shown",
      userNotified: false
    });
    return {
      language: settings.language,
      text: "An error occurred while the AI was forming its initial analysis."
    };
  }
};
const generateFinalSummary = async (cards, settings, telemetryTarget) => {
  if (!isProviderConfigured(settings)) {
    return {
      language: settings.language,
      text: "AI Summaries are disabled. No API Key provided."
    };
  }
  const trimmedCards = trimAnalysisCards(cards, 6, 5);
  const narrativeInputs = selectNarrativeAnalysisInputs(buildNarrativeAnalysisIrInputList(trimmedCards), 6);
  const narrativePayload = formatNarrativeAnalysisInputs(narrativeInputs);
  try {
    const state = telemetryTarget;
    const reportContext = resolveEffectiveReportContext(
      (state == null ? void 0 : state.reportContextResolution) ?? null,
      (state == null ? void 0 : state.rawCsvData) ?? null,
      (state == null ? void 0 : state.csvData) ?? null
    );
    const systemPrompt = executiveBriefSystemPrompt(settings.language);
    const { model, modelId } = createProviderModel(settings, settings.complexModel);
    const result = await runWithOverflowCompaction({
      provider: settings.provider,
      execute: async (compactionMode) => {
        const managed = await prepareManagedContext({
          callType: "summary",
          systemText: systemPrompt,
          baseUserText: "Create a structured executive brief from the completed analysis cards.",
          sections: [
            createContextSection("report_context", `Report context:
${formatReportContextForPrompt(reportContext)}`, "high", "sticky"),
            createContextSection("generated_card_summaries", `Narrative-ready card summaries:
${narrativePayload || "[]"}`, "required", "sticky")
          ],
          settings,
          modelId,
          compactionMode
        });
        reportContextDiagnostics(telemetryTarget, managed.diagnostics);
        const promptContent = createExecutiveBriefPrompt(managed.userText, settings.language);
        return withTransientRetry(
          (fb) => streamGenerateText({
            model: fb ?? model,
            messages: [
              { role: "system", content: managed.systemText },
              { role: "user", content: promptContent }
            ]
          }),
          { settings, primaryModelId: modelId, label: "executiveBrief" }
        );
      }
    });
    return {
      language: settings.language,
      text: result.text || "No final summary generated."
    };
  } catch (error) {
    console.error("Error generating final summary:", error);
    emitSilentFailure(wrapAsTelemetryStore(telemetryTarget), error, {
      component: "SummaryGenerator",
      recoveryAction: "final_summary_fallback_text_shown",
      userNotified: false
    });
    return {
      language: settings.language,
      text: "Failed to generate the final AI summary."
    };
  }
};
const goalGeneratorSystemPrompt = "You are a senior business strategist. Your task is to analyze the schema and sample data from a new dataset and infer 2-3 likely primary business analysis goals. Your response must be a single valid JSON object adhering to the provided schema.";
const createGoalCandidatesPrompt = (contextText) => `
    You are a senior business strategist. Your task is to analyze the schema and sample data from a new dataset and infer 2-3 likely primary business analysis goals for the user.
    
    ${contextText}
    
    Your Task:
    1.  **Analyze the Data**: Look at the report title, parameter lines, available columns, and their data types.
    2.  **Infer Goals**: Based on common business analysis patterns, what are the 2-3 most probable objectives? Is it sales performance analysis, financial health assessment, customer segmentation, etc.?
    3.  **Formulate Goals**: For each goal, provide a short title, a one-sentence description, and a confidence score (0.0 to 1.0).
    4.  **Naming Discipline**: If the context includes user-facing display label hints, prefer those exact labels. If helper fields like SeriesLabelL1 or SeriesKey remain ambiguous, use neutral names like "Series Label 1" or "Series Key" rather than repeating raw helper names or inventing qualifiers like "fiscal", "primary", or "classification".
    5.  **Business Wording Discipline**: If preferred business terms are provided, use them to replace generic metric wording like "Value" or "Amount" when the report title, parameter lines, or semantic metric evidence support a clearer business phrase.
    6.  **Report Context Discipline**: If the report title or parameter lines reveal the reporting scope, period, or filters, use that to sharpen the goal framing. Do not invent extra scope that is not explicitly present.
    
    **Example:**
    - Columns: ['Region', 'Salesperson', 'Revenue', 'Costs', 'GrossProfit']
    - Your Response (a single JSON object):
    {
      "goals": [
        {
          "title": "Analyze Regional and Salesperson Performance",
          "description": "Evaluate sales, costs, and profit by region and salesperson to identify top performers.",
          "confidence": 0.9
        },
        {
          "title": "Assess Overall Financial Health",
          "description": "Summarize total revenue, costs, and gross profit to get a high-level view of business profitability.",
          "confidence": 0.7
        }
      ]
    }
`;
const generateAnalysisGoalCandidates = async (columns, sampleData, settings, telemetryTarget) => {
  var _a;
  if (!isProviderConfigured(settings)) return [{ title: "Perform a general analysis of the dataset.", description: "Explore the data to find key patterns and insights.", confidence: 0.5, isRecommended: true }];
  try {
    const state = telemetryTarget;
    const reportContext = resolveEffectiveReportContext(
      (state == null ? void 0 : state.reportContextResolution) ?? null,
      (state == null ? void 0 : state.rawCsvData) ?? null,
      (state == null ? void 0 : state.csvData) ?? null
    );
    const semanticContext = formatDatasetSemanticsForPrompt(
      (state == null ? void 0 : state.datasetSemanticSnapshot) ?? null,
      (state == null ? void 0 : state.semanticDatasetVersion) ?? null,
      (state == null ? void 0 : state.csvData) ?? null,
      columns
    );
    const analysisBrief = buildAnalysisIntentBrief({
      columns,
      csvData: (state == null ? void 0 : state.csvData) ?? null,
      dataPreparationPlan: (state == null ? void 0 : state.dataPreparationPlan) ?? null,
      datasetSemanticSnapshot: (state == null ? void 0 : state.datasetSemanticSnapshot) ?? null,
      semanticDatasetVersion: (state == null ? void 0 : state.semanticDatasetVersion) ?? null
    });
    const rankingHints = buildAnalysisRankingHints(analysisBrief, columns, {
      title: ((_a = state == null ? void 0 : state.csvData) == null ? void 0 : _a.fileName) ?? null,
      reportTitle: (reportContext == null ? void 0 : reportContext.reportTitle) ?? null,
      parameterLines: (reportContext == null ? void 0 : reportContext.parameterLines) ?? []
    });
    const systemPrompt = goalGeneratorSystemPrompt;
    const { model, modelId } = createProviderModel(settings, settings.complexModel);
    const result = await runWithOverflowCompaction({
      provider: settings.provider,
      execute: async (compactionMode) => {
        const managed = await prepareManagedContext({
          callType: "goal",
          systemText: systemPrompt,
          baseUserText: "Infer the most likely analysis goals for this dataset.",
          sections: [
            createContextSection("report_context", `Report context:
${formatReportContextForPrompt(reportContext)}`, "high", "sticky"),
            createContextSection("dataset_semantics", `Dataset semantics:
${semanticContext}`, "high", "sticky"),
            createContextSection("analysis_intent_brief", `Analysis intent brief:
${formatAnalysisIntentBrief(analysisBrief)}`, "high", "sticky"),
            createContextSection("planning_hints", `Preferred grain columns: ${rankingHints.preferredGrainColumns.join(", ") || "none"}
Preferred time columns: ${rankingHints.preferredTimeColumns.join(", ") || "none"}
Avoid grain columns: ${rankingHints.avoidGrainColumns.join(", ") || "none"}
Preferred metric terms: ${rankingHints.preferredMetricTerms.join(", ") || "none"}
Preferred business terms: ${rankingHints.preferredBusinessTerms.join(", ") || "none"}`, "high", "sticky"),
            createContextSection("dataset_schema", `Dataset columns (schema):
${formatColumnProfiles(columns)}`, "required", "sticky"),
            createContextSection("column_display_hints", `User-facing column label hints:
${formatColumnDisplayHints(columns)}`, "high", "sticky"),
            createContextSection("sample_data", `Sample data:
${formatRows(trimRawDataSample(sampleData, 8))}`, "high", "prunable")
          ],
          settings,
          modelId,
          compactionMode
        });
        reportContextDiagnostics(telemetryTarget, managed.diagnostics);
        const promptContent = createGoalCandidatesPrompt(managed.userText);
        return withTransientRetry(
          (fb) => streamGenerateText({
            model: fb ?? model,
            messages: [
              { role: "system", content: managed.systemText },
              { role: "user", content: promptContent }
            ],
            output: output_exports.object({ schema: jsonSchema(prepareSchemaForProvider(analysisGoalCandidateSchema, settings.provider)) })
          }),
          { settings, primaryModelId: modelId, label: "goalGenerator" }
        );
      }
    });
    const parsed = result.output !== void 0 ? result.output : robustlyParseJsonObject(result.text);
    const goals = parsed.goals;
    if (!goals || goals.length === 0) {
      throw new Error("AI did not return any goal candidates.");
    }
    let highestConfidence = -1;
    let recommendedIndex = -1;
    goals.forEach((goal, index) => {
      if (goal.confidence > highestConfidence) {
        highestConfidence = goal.confidence;
        recommendedIndex = index;
      }
    });
    if (recommendedIndex !== -1) {
      goals[recommendedIndex].isRecommended = true;
    }
    return goals;
  } catch (error) {
    console.error("Error generating analysis goal candidates:", error);
    return [{ title: "Perform a general analysis of the dataset.", description: "Explore the data to find key patterns and insights.", confidence: 0.5, isRecommended: true }];
  }
};
const insightGeneratorSystemPrompt = `You are a proactive data analyst. Review the following summaries of data visualizations. Your task is to identify the single most commercially significant or surprising insight.
Use the IR narrative signals exactly as provided.
- Prefer cards where \`narrativeEligibility\` is \`preferred\`.
- If no \`preferred\` card exists, you may choose a card marked \`allowed_neutral\`.
- Avoid cards marked \`avoid_if_possible\` unless no better candidate exists.
- If the surviving cards are helper-heavy, keep the wording neutral and do not upgrade them into projects, business units, facilities, or financial entities.
CRITICAL GROUNDING RULE: Every entity, concept, and domain you mention must be directly traceable to the provided card data. Never introduce business domains (e.g., supply chain, logistics, manufacturing, procurement) unless those exact terms appear in the data columns or values. If you cannot find an actionable insight grounded in the actual data, return {"insight": "", "cardId": ""}.
Your response must be a single JSON object with 'insight' and 'cardId' keys.`;
const createProactiveInsightPrompt = (contextText, language) => `
    You are a proactive data analyst. Review the generated analysis cards and find the single most ACTIONABLE insight — something a decision-maker would act on immediately.

    **Generated Analysis Cards & Data Samples:**
    ${contextText}

    Priority ranking for insight selection (pick the highest-priority one you can support with data):
    1. A calculated ratio or comparison that reveals a problem (e.g. margin erosion, cost overrun, concentration risk)
    2. A structural data anomaly with financial impact (e.g. 43% of value under null/unknown code = 98.6M unclassified)
    3. A cross-card pattern (e.g. top project by revenue is NOT the top by cost, implying different margin profiles)
    4. A dominant outlier that skews the entire dataset

    Do NOT pick insights that merely restate what a card already shows (e.g. "X is the largest category"). The insight must ADD value beyond reading the chart.

    Format in ${language}:
    - **Bold title**: the finding in ≤10 words
    - 1-2 sentences with SPECIFIC numbers (amounts, percentages, ratios)
    - **Suggestion:** one concrete next action

    Return a JSON object with 'insight' (markdown string) and 'cardId' (the most related card ID).

    Naming rules: use user-facing display labels if available. Do not invent qualifiers (fiscal, primary, category) unless the data explicitly supports them.

    GROUNDING RULE: Your insight must ONLY reference entities, dimensions, metrics, and concepts present in the cards above. You may paraphrase column names (e.g., "NET TOTAL FOREX" → "revenue"), but you must NOT introduce entirely new domains or processes absent from the data. If unsure, stay closer to the data labels.
`;
const DOMAIN_BLOCKLIST = [
  "supply chain",
  "logistics hub",
  "logistics",
  "procurement",
  "warehouse",
  "manufacturing",
  "shipping",
  "transportation",
  "delivery delay",
  "inventory volume",
  "bottleneck"
];
function buildGroundingVocabulary(inputs) {
  const terms = /* @__PURE__ */ new Set();
  for (const input of inputs) {
    if (input.safeNarrativeLabels.dimension) terms.add(input.safeNarrativeLabels.dimension.toLowerCase());
    if (input.safeNarrativeLabels.metric) terms.add(input.safeNarrativeLabels.metric.toLowerCase());
    for (const word of input.displayTitle.split(/\s+/)) {
      if (word.length > 2) terms.add(word.toLowerCase());
    }
    for (const row of input.aggregatedDataSample) {
      for (const [key, val] of Object.entries(row)) {
        terms.add(key.toLowerCase());
        if (typeof val === "string" && val.length > 1) terms.add(val.toLowerCase());
      }
    }
    for (const word of (input.summary ?? "").split(/\s+/)) {
      if (word.length > 2) terms.add(word.toLowerCase());
    }
  }
  return [...terms];
}
function validateInsightGrounding(insightText, narrativeInputs) {
  const vocabulary = buildGroundingVocabulary(narrativeInputs);
  const lowerInsight = insightText.replace(/\*\*/g, "").toLowerCase();
  const ungroundedTerms = [];
  for (const blocked of DOMAIN_BLOCKLIST) {
    if (lowerInsight.includes(blocked) && !vocabulary.some((v) => v.includes(blocked) || blocked.includes(v))) {
      ungroundedTerms.push(blocked);
    }
  }
  return { grounded: ungroundedTerms.length === 0, ungroundedTerms };
}
const buildLegacyNarrativeInputs = (cardContext) => cardContext.map((card) => ({
  cardId: card.id,
  displayTitle: card.title,
  displayDescription: card.description ?? "",
  safeNarrativeLabels: {
    title: card.title,
    dimension: card.groupByColumn ?? null,
    metric: card.valueColumn ?? null
  },
  semanticRole: "business_dimension",
  helperExposureLevel: "medium",
  businessMeaningConfidence: 0.4,
  aggregationQualityFlags: ["legacy_card_context"],
  narrativeEligibility: "allowed_neutral",
  selectionScore: 0,
  selectionReasons: ["legacy_card_context"],
  summary: card.summary ?? "",
  aggregatedDataSample: card.aggregatedDataSample.slice(0, 5),
  isFallback: false
}));
const generateProactiveInsights = async (cardContext, settings, telemetryTarget, narrativeInputs) => {
  var _a;
  if (!isProviderConfigured(settings) || cardContext.length === 0) return null;
  try {
    const safeNarrativeInputs = selectNarrativeAnalysisInputs(
      narrativeInputs && narrativeInputs.length > 0 ? narrativeInputs : buildLegacyNarrativeInputs(cardContext),
      6
    );
    const systemPrompt = insightGeneratorSystemPrompt;
    const { model, modelId } = createProviderModel(settings, settings.simpleModel);
    const result = await runWithOverflowCompaction({
      provider: settings.provider,
      execute: async (compactionMode) => {
        const managed = await prepareManagedContext({
          callType: "insight",
          systemText: systemPrompt,
          baseUserText: "Identify the single most important proactive insight from the generated cards.",
          sections: [
            createContextSection(
              "generated_cards",
              `Narrative-ready analysis cards:
${formatNarrativeAnalysisInputs(safeNarrativeInputs)}`,
              "required",
              "sticky"
            )
          ],
          settings,
          modelId,
          compactionMode
        });
        reportContextDiagnostics(telemetryTarget, managed.diagnostics);
        const promptContent = createProactiveInsightPrompt(managed.userText, settings.language);
        return withTransientRetry(
          (fb) => streamGenerateText({
            model: fb ?? model,
            messages: [
              { role: "system", content: managed.systemText },
              { role: "user", content: promptContent }
            ],
            output: output_exports.object({ schema: jsonSchema(prepareSchemaForProvider(proactiveInsightSchema, settings.provider)) })
          }),
          { settings, primaryModelId: modelId, label: "insightGenerator" }
        );
      }
    });
    const parsed = result.output !== void 0 ? result.output : robustlyParseJsonObject(result.text);
    if (!parsed || !parsed.insight || parsed.insight.trim() === "") return null;
    if (!safeNarrativeInputs.some((i) => i.cardId === parsed.cardId)) {
      parsed.cardId = ((_a = safeNarrativeInputs[0]) == null ? void 0 : _a.cardId) ?? "";
    }
    const grounding = validateInsightGrounding(parsed.insight, safeNarrativeInputs);
    if (!grounding.grounded) {
      console.warn("[InsightGenerator] Suppressed ungrounded insight:", parsed.insight, "terms:", grounding.ungroundedTerms);
      return null;
    }
    return parsed;
  } catch (error) {
    console.error("Error generating proactive insight:", error);
    return null;
  }
};
const SEMANTIC_TYPE_REFERENCE = `
Column semantic categories for topic generation:
| Category | Typical terms | Aggregation guidance |
|---|---|---|
| Revenue | revenue, sales, income, turnover | SUM; compare across dimensions |
| Cost | cost, expense, salary, wages, depreciation | SUM; breakdown by category |
| Profit | profit, margin, gross, net, earnings | SUM or derived (Revenue - Cost); signed values |
| Temporal | date, month, quarter, year, period | Use as groupBy for trends |
| Categorical | name, type, category, region, project | Use as groupBy for comparisons |
| Identifier | ID, code, key, index | Do NOT use as groupBy |
`.trim();
const buildAnalysisPlannerSystemPrompt = (stage = "evidence_query") => {
  if (stage === "topics") {
    return [
      "You are a senior business intelligence analyst designing SQL-safe analysis topics for DuckDB.",
      "",
      "When the context includes a data investigation section:",
      "- Respect parent-child hierarchies: avoid topics that would double-count subtotals.",
      "- Use leaf-level descriptions for groupBy, not parent/subtotal descriptions.",
      "- Leverage detected metric relationships (A - B ≈ C) to suggest derived metric topics.",
      "- Observe semantic categories (revenue, cost, profit) when choosing aggregation functions.",
      "- Note data quality warnings (missing values, outliers) and avoid affected columns as primary groupBy.",
      "",
      SEMANTIC_TYPE_REFERENCE,
      "",
      'Return one JSON object with a "topics" array.'
    ].join("\n");
  }
  if (stage === "presentation") {
    return [
      "You are a senior business intelligence analyst deciding how to present already-executed SQL evidence.",
      "Your goal is to choose the chart type and presentation mode that best communicates the evidence to a business reader.",
      "",
      "Chart type selection — apply in priority order:",
      '1. "line": Use ONLY when the groupBy column is a time column (date/datetime) or a recognized ordinal sequence (month names, quarter names, weekday names) AND the preview rows are in chronological or ordinal order. Time series with ≤ 24 rows → "table_then_chart". Time series with > 24 rows → "chart".',
      '2. "combo": Use ONLY when the evidence exposes exactly TWO stable aggregate metric columns AND the row count is ≤ 12.',
      '3. "scatter": Use ONLY when the evidence is a rowset query (queryMode=rowset) with TWO numeric columns for x/y axes AND row count ≤ 60.',
      '4. "pie" or "doughnut": Use when grouped aggregate evidence has ≤ 6 distinct groups AND a single metric. Prefer "pie" when group count ≤ 4, "doughnut" when 5–6. Never use pie/doughnut with > 8 groups.',
      '5. "bar": The default for grouped aggregate evidence with > 6 groups or when other types do not fit.',
      "",
      "Presentation mode selection:",
      '- "chart": Use ONLY for time series evidence with > 24 rows where the trend is the primary story.',
      '- "table_then_chart": The preferred mode for most grouped evidence — data table shown first, chart accessible.',
      '- "table": Use when evidence is informative but not chart-friendly, or when the quality signals indicate caution.',
      "",
      "TopN guidance:",
      "- When distinct group count > 8 for a bar chart, set defaultTopN to 8 and defaultHideOthers to true.",
      "",
      "Hard safety rules — these override your chart and mode choices:",
      '- If the review context contains helper_dimension, blocked_dimension, hierarchy_contamination, duplicate_label_contamination, missing_detail_row_filter, reshape_required, low_signal_confidence, unsafe_business_narrative, or not_chart_worthy → use "table" with no chart.',
      '- If the review context shows value gate "table_only" → ceiling is "table_then_chart"; do NOT choose "chart".',
      '- If the review context shows value gate "reject" → use presentationMode "hidden".',
      '- If evidence has < 2 rows or ≤ 1 distinct group → use "table" with no chart.',
      "- All binding columns (groupByColumn, valueColumn, etc.) MUST exist in the executed output columns list.",
      "- Never choose radar, bubble, stacked_bar, or stacked_column.",
      "- pie and doughnut are allowed for ≤ 6 distinct groups with a single metric.",
      '- When in doubt, prefer "table" or "table_then_chart" over forcing a chart.'
    ].join("\n");
  }
  return [
    "You are an expert analytics engineer planning SQL evidence queries for DuckDB.",
    "Your job is to produce a valid evidence query first.",
    "Do not decide the final chart before the query evidence is stable.",
    "Do not invent output aliases unless they are explicitly declared in query.aggregates[].as and included in query.select.",
    "Use only the supported SQL contract: select, groupBy, aggregates, where, orderBy, and limit.",
    "Prefer simple, deterministic grouped queries that are likely to return meaningful evidence."
  ].join(" ");
};
const buildPlanRetryFeedback = (lastError) => {
  if (!lastError) return "";
  const normalized = lastError.toLowerCase();
  if (normalized.includes("bindings.valuecolumn")) {
    return `Previous attempt failed because the plan referenced a value binding that was not present in the selected query output. Rebuild the query first and only use aliases that appear in query.select.`;
  }
  if (normalized.includes("selected output column")) {
    return "Previous attempt failed because a referenced column or alias was not included in query.select. Ensure every referenced output field is explicitly selected.";
  }
  if (normalized.includes("sql compilation failed")) {
    return "Previous attempt failed during SQL compilation. Keep the query simpler and use only legal dataset columns, legal aggregate aliases, and deterministic orderBy fields.";
  }
  if (normalized.includes("empty result")) {
    return "Previous attempt returned no rows. Broaden the slice while keeping the same business intent.";
  }
  return `Previous attempt failed with this system validation error: "${lastError}". Fix that exact problem and avoid repeating the same structure.`;
};
const buildTopicPlanningUserPrompt = (topic, contextText, retryFeedback, learningHints) => `
    Plan a SQL evidence query for this analysis topic.

    Analysis Topic: "${topic}"

    ${retryFeedback ? `Retry guidance:
${retryFeedback}
` : ""}
    ${(learningHints == null ? void 0 : learningHints.avoidGroupBys) && learningHints.avoidGroupBys.length > 0 ? `Historical context only: these groupings previously produced flat or noisy evidence. Treat them as hints, not hard rules: ${learningHints.avoidGroupBys.join(", ")}.` : ""}
    ${(learningHints == null ? void 0 : learningHints.preferGroupBys) && learningHints.preferGroupBys.length > 0 ? `Historical context only: these groupings previously produced stable evidence. Use them when they fit, but do not force them: ${learningHints.preferGroupBys.join(", ")}.` : ""}

    ${contextText}

    Return one JSON object for an evidence query plan with these fields:
    - title
    - queryMode
    - query
    - intentSummary
    - optional preferredResultShape

    Evidence-query rules (hard constraints — SQL contract limits):
    - First decide what grouped evidence should be computed.
    - Do not decide chartType yet.
    - Do not return bindings, defaultTopN, or defaultHideOthers.
    - query.select must explicitly include every output column or aggregate alias used later.
    - If you define aggregate aliases, keep them simple and legal, and include them in query.select.
    - Use only the supported SQL contract: select, groupBy, aggregates, where, orderBy, and limit.

    Evidence-query preferences (ranked guidance — use your judgement):
    - Do NOT use blocked dimensions as groupBy columns. Use business grains instead. However, blocked dimensions CAN be used in WHERE clauses for filtering.
    - Prefer a single stable metric over speculative multi-metric comparisons.
    - Prefer aggregate evidence over raw rowset evidence unless the topic clearly requires a scatter-style rowset.
    - For any grouped aggregate query, ALWAYS include orderBy sorting by the primary aggregate descending and set a reasonable limit (8–15 unless the topic specifies a different N). This keeps results focused and chart-ready.
    - If the topic implies a time trend and a stable time column exists, set preferredResultShape to "time_series".
    - If the topic implies ranked grouped evidence, set preferredResultShape to "ranked_aggregate".
    - If the best result is a row-level exploratory view, set preferredResultShape to "rowset_scatter_candidate" or "detail_table".
    - Use business-facing naming when the dataset evidence supports it, but do not invent unsupported business aliases.
    - If the data exploration context mentions a row-classification column with detail/fact rows, ALWAYS include a WHERE predicate filtering to detail rows only. This prevents double-counting from subtotal/header rows.
`;
const createAnalysisTopicsPrompt = (contextText, goal, availableDimensions, existingCardTitles) => {
  const dimCount = (availableDimensions == null ? void 0 : availableDimensions.length) ?? 999;
  const groupByConstraint = dimCount <= 1 ? `3. Only ${dimCount} groupBy dimension${dimCount === 1 ? ` ("${availableDimensions[0]}")` : ""} is available. Generate at most 2 topics. Vary topics by metric scope (different WHERE filters, different value ranges), filter conditions, or aggregation granularity (e.g. top-5 vs full breakdown) — NOT by groupBy column.` : dimCount <= 2 ? `3. Only ${dimCount} groupBy dimensions are available: ${availableDimensions.join(", ")}. Generate at most ${Math.min(4, dimCount * 2)} topics. Each topic SHOULD use a different groupBy when possible, but you may reuse a groupBy if you vary the metric or filter.` : `3. Each topic MUST use a DIFFERENT groupBy dimension — no two topics with the same groupBy column. Spread across available dimensions${availableDimensions ? `: ${availableDimensions.join(", ")}` : ""}.`;
  return `
    You are a senior business intelligence analyst designing SQL-first analyses for DuckDB.
    Your task is to identify ${dimCount <= 1 ? "1 to 2" : dimCount <= 2 ? "2 to 4" : "4 to 8"} high-level analysis topics or questions that can be answered with a deterministic SQL query against the provided dataset schema and sample.

    ${goal ? `
The user's primary analysis goal is: "${goal}". Your topics should be highly relevant to this goal.
` : ""}

    ${contextText}

    Based on this, generate a list of concise analysis topics.
    - Good examples: "Sum of Revenue by Product Category", "Count of Orders per Month", "Relationship between Unit Cost and Profit".
    - Bad examples: "Chart of the data", "Analyze everything", "Make a pie chart".

    Hard constraints (SQL contract limits — these cannot be violated):
    - Each topic must be answerable with one SQL query using grouping, filtering, ordering, and limiting.
    - Each topic must be compatible with the available SQL contract and supported chart bindings.
    - Avoid topics requesting descriptive statistics (like mean, median, standard deviation, quartiles) that the current SQL contract cannot express directly.

    Preferences:
    1. Do NOT use blocked dimensions as groupBy — use only the available non-blocked dimensions listed below. Blocked dimensions are identified by the data investigation harness based on data content, not column names.
    2. Use preferred business terms from report title/parameters when supported. Use report scope for topic selection (e.g. "Income Statement By Project" → compare across projects).
    ${groupByConstraint}
    4. Prefer SUM for financial metric aggregations. Use COUNT when the topic asks about frequency or occurrence count.
    5. If exploration results are provided, use them: low-cardinality dimensions are good for groupBy, fragmented dimensions need WHERE filters.
    6. Do not invent qualifiers (fiscal, primary, category) unless explicitly supported by the data.
    7. Do NOT mention row-classification or row-index columns in topic text. Row filtering is handled automatically during query planning.
    ${availableDimensions && availableDimensions.length > 0 ? `
    Available non-blocked groupBy dimensions: ${availableDimensions.join(", ")}.` : ""}
    ${(existingCardTitles == null ? void 0 : existingCardTitles.length) ? `
    IMPORTANT: The following analysis cards already exist. Do NOT propose topics that overlap with them — find genuinely new angles, metrics, or dimensions instead:
${existingCardTitles.map((t) => `    - ${t}`).join("\n")}` : ""}
`;
};
const getResolvedToolRegistry = (context) => {
  const normalizedContext = normalizeToolAvailabilityContext(context);
  return resolveAllowedTools(buildBuiltinToolRegistry(normalizedContext.columnNames), normalizedContext);
};
const buildError = (code, message, toolName) => ({
  code,
  message,
  toolName
});
const validateAction = (action, context, registry = getResolvedToolRegistry(context)) => {
  var _a;
  const normalizedContext = normalizeToolAvailabilityContext(context);
  if (!action.thought) {
    const error = buildError("invalid_action", "Every action must include a non-empty 'thought'.");
    return { isValid: false, errors: error.message, error };
  }
  if (action.type === "assistant_message") {
    if (!action.message) {
      const error = buildError("invalid_action", "Assistant messages require a 'message'.");
      return { isValid: false, errors: error.message, error };
    }
    if (action.cardId && !normalizedContext.cardIds.includes(action.cardId)) {
      const error = buildError("invalid_args", `"cardId" ('${action.cardId}') must reference one of [${normalizedContext.cardIds.join(", ")}].`);
      return { isValid: false, errors: error.message, error };
    }
    return { isValid: true, errors: "" };
  }
  const descriptor = registry.descriptorMap.get(action.toolName);
  if (!descriptor) {
    const error = buildError("invalid_tool_name", `Tool "${action.toolName}" is not registered or not allowed.`, action.toolName);
    return { isValid: false, errors: error.message, error };
  }
  const decision = registry.decisions[action.toolName];
  if (decision && !decision.allowed) {
    const error = buildError(
      decision.source === "availability" ? "tool_unavailable" : "blocked_tool",
      decision.reason,
      action.toolName
    );
    error.detail = {
      stage: decision.stage,
      source: decision.source,
      category: decision.category,
      risk: decision.risk
    };
    return { isValid: false, errors: error.message, error };
  }
  const workspaceRuleViolation = getWorkspaceRuleViolation(action, normalizedContext.runtimeAccessControl);
  if (workspaceRuleViolation) {
    const error = buildError("blocked_tool", workspaceRuleViolation.message, action.toolName);
    error.detail = {
      source: "workspace_rule",
      normalizedPath: workspaceRuleViolation.normalizedPath,
      matchedPrefix: workspaceRuleViolation.matchedPrefix,
      field: workspaceRuleViolation.field,
      stage: registry.stage
    };
    return { isValid: false, errors: error.message, error };
  }
  const semanticErrors = ((_a = descriptor.validate) == null ? void 0 : _a.call(descriptor, action.args ?? {}, normalizedContext)) ?? [];
  if (semanticErrors.length > 0) {
    const error = buildError("malformed_tool_payload", semanticErrors.join(" "), action.toolName);
    return { isValid: false, errors: semanticErrors.join(" "), error };
  }
  return { isValid: true, errors: "" };
};
const buildClarificationAssessmentPrompt = (clarificationQuestion, userReply, availableOptions) => ({
  system: `You assess whether a user's reply to a clarification question provides enough information to proceed.

Context: A data analysis app asked the user a clarification question. The user replied. You decide the outcome.

Categories:

resolved — The user's reply directly answers the question or selects a specific option/value.
Examples: "use March 2025", "the second one", "Campaign name column", "TRF_CBE_2025"

best_effort_continue — The user wants to proceed without giving a precise answer. They delegate the decision to the system, express impatience, confirm generically, or provide vague direction.
Examples: "just do it", "you decide", "whatever works", "ok la", "go check yourself", "idk", "don't care", "sure", "yes", "ha? you go check la", "just pick one", "anything", "can", "proceed"

still_ambiguous — The user's reply is ONLY pure punctuation (e.g. "?" "..." "!") with zero meaningful content. This should be very rare — when in doubt, prefer best_effort_continue over still_ambiguous. Never block the user from proceeding.

IMPORTANT:
- Prefer best_effort_continue over still_ambiguous. Only use still_ambiguous for replies that are literally empty or pure punctuation.
- Any reply with words — even vague, impatient, or colloquial — should be best_effort_continue or resolved.
- The goal is to NEVER trap the user in a clarification loop.
${availableOptions.length > 0 ? `
Available options were: ${availableOptions.join(", ")}` : ""}

Reply with ONLY the category name (resolved, best_effort_continue, or still_ambiguous). Nothing else.`,
  user: `Clarification question: ${clarificationQuestion}
User reply: ${userReply}`
});
const datasetSemanticAnnotationSystemPrompt = "You classify the semantic structure of a prepared dataset for downstream AI analysis. Return one JSON object that matches the schema exactly. Your job is semantic labeling only, not chart or business-card generation.";
const createDatasetSemanticAnnotationPrompt = (managedContext) => `Classify the prepared dataset semantics from the evidence below.

${managedContext}

Return exactly one JSON object that matches the schema.

Rules:
- Judge dataset semantics from the provided evidence only.
- rowAnnotations apply to the provided candidate rows only.
- Do not invent extra row indices.
- Use "detail" only for business-entity, transactional, or project-level rows.
- Use "subtotal", "grand_total", "group_header", "footer", "note", "bucket", or "noise" for non-detail or explanatory rows.
- If uncertain, return "unknown" or use lower confidence.
- Column roles should reflect semantic meaning, not SQL type.
- Prefer semantic column roles such as "business_entity", "business_dimension", "metric", "time_dimension", "descriptor", "code", "helper_dimension", and "note".
- Provide businessLabel when a clearer end-user label is supported by the evidence.
- Mark helper or technical fields as unsafe for direct business grouping.
- Fill headerSemantics using report title, candidate header lines, parameters, and footer evidence.
- Use evidenceSources and confidenceBand when supported by the evidence.
- Keep the summary short and evidence-based.`;
const FULL_ANNOTATION_ROW_LIMIT = 40;
const HEAD_SAMPLE = 8;
const TAIL_SAMPLE = 6;
const EVEN_SAMPLE = 6;
const PRIORITY_NON_DETAIL_SAMPLE = 8;
const MAX_CONTEXT_COLUMNS = 8;
const MAX_CONTEXT_TEXT_LENGTH = 180;
const MAX_CANDIDATE_ROWS = 20;
const truncateText = (value, limit = MAX_CONTEXT_TEXT_LENGTH) => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length <= limit) {
    return trimmed;
  }
  return `${trimmed.slice(0, limit - 3).trimEnd()}...`;
};
const formatSemanticDatasetContext = (context) => [
  `Title: ${context.reportTitle ?? context.title ?? "unknown"}`,
  context.reportShapeKind ? `Detected report shape: ${context.reportShapeKind}` : null,
  context.headerHintPreview ? `Header hint: ${truncateText(context.headerHintPreview)}` : null,
  typeof context.rowCount === "number" ? `Prepared rows: ${context.rowCount}` : null,
  `Dimension columns: ${context.dimensionColumns.slice(0, MAX_CONTEXT_COLUMNS).join(", ") || "none"}`,
  `Metric columns: ${context.metricColumns.slice(0, MAX_CONTEXT_COLUMNS).join(", ") || "none"}`,
  truncateText(context.parameterPreview) ? `Parameters: ${truncateText(context.parameterPreview)}` : null,
  truncateText(context.footerPreview) ? `Footer: ${truncateText(context.footerPreview)}` : null,
  truncateText(context.metadataPreview) ? `Metadata preview: ${truncateText(context.metadataPreview)}` : null,
  truncateText(context.summaryPreview) ? `Summary preview: ${truncateText(context.summaryPreview)}` : null
].filter(Boolean).join("\n");
const formatCandidateRows = (data, rowIndices) => rowIndices.map((index) => ({
  rowIndex: index,
  ...data.data[index]
}));
const buildPriorityNonDetailRowIndices = (data) => {
  const context = inferTabularShapeContext(data);
  if (!context) {
    return [];
  }
  return data.data.map((row, rowIndex) => ({
    rowIndex,
    detection: detectTabularRowRole(row, context)
  })).filter(
    (candidate) => ["subtotal", "total", "comment", "group_header", "noise"].includes(candidate.detection.role) && candidate.detection.confidence >= 0.7
  ).sort((left, right) => right.detection.confidence - left.detection.confidence || left.rowIndex - right.rowIndex).slice(0, PRIORITY_NON_DETAIL_SAMPLE).map((candidate) => candidate.rowIndex);
};
const buildCandidateRowIndices = (data) => {
  const rowCount = data.data.length;
  if (rowCount <= FULL_ANNOTATION_ROW_LIMIT) {
    return Array.from({ length: rowCount }, (_, index) => index);
  }
  const orderedCandidates = [
    ...buildPriorityNonDetailRowIndices(data),
    ...Array.from({ length: Math.min(HEAD_SAMPLE, rowCount) }, (_, index) => index),
    ...Array.from({ length: TAIL_SAMPLE }, (_, offset) => Math.max(rowCount - TAIL_SAMPLE + offset, 0)),
    ...Array.from({ length: EVEN_SAMPLE }, (_, slot) => Math.floor((slot + 1) * rowCount / (EVEN_SAMPLE + 1)))
  ];
  const indices = [];
  const seen = /* @__PURE__ */ new Set();
  for (const index of orderedCandidates) {
    if (index < 0 || index >= rowCount || seen.has(index)) {
      continue;
    }
    seen.add(index);
    indices.push(index);
    if (indices.length >= MAX_CANDIDATE_ROWS) {
      break;
    }
  }
  return indices.sort((left, right) => left - right);
};
const annotateDatasetSemantics = async ({
  data,
  rawData,
  columns,
  settings,
  reportContextResolution,
  telemetryTarget
}) => {
  if (!isProviderConfigured(settings)) {
    return null;
  }
  const datasetVersion = buildSemanticDatasetVersion(data);
  const candidateRowIndices = buildCandidateRowIndices(data);
  const candidateRows = formatCandidateRows(data, candidateRowIndices);
  const datasetContext = buildDatasetContext(data, columns, reportContextResolution, void 0, void 0, void 0, rawData ?? data);
  try {
    const { model, modelId } = createProviderModel(settings, settings.complexModel);
    const result = await runWithOverflowCompaction({
      provider: settings.provider,
      execute: async (compactionMode) => {
        var _a, _b, _c, _d, _e, _f, _g;
        const managed = await prepareManagedContext({
          callType: "goal",
          systemText: datasetSemanticAnnotationSystemPrompt,
          baseUserText: "Classify dataset semantics, annotate candidate rows, infer column roles, and summarize header/report semantics.",
          sections: [
            createContextSection("dataset_identity", `File name: ${data.fileName}
Dataset version: ${datasetVersion}
Prepared row count: ${data.data.length}`, "required", "sticky"),
            createContextSection("dataset_context", `Dataset context summary:
${formatSemanticDatasetContext(datasetContext)}`, "medium", "sticky"),
            createContextSection(
              "report_context",
              `Report title: ${((_a = reportContextResolution == null ? void 0 : reportContextResolution.effective) == null ? void 0 : _a.reportTitle) ?? "unknown"}
Parameters:
${((_c = (_b = reportContextResolution == null ? void 0 : reportContextResolution.effective) == null ? void 0 : _b.parameterLines) == null ? void 0 : _c.join("\n")) || "none"}
Footer lines:
${((_e = (_d = reportContextResolution == null ? void 0 : reportContextResolution.effective) == null ? void 0 : _d.footerLines) == null ? void 0 : _e.join("\n")) || "none"}
Candidate header line: ${((_g = (_f = reportContextResolution == null ? void 0 : reportContextResolution.effective) == null ? void 0 : _f.candidateHeaderLine) == null ? void 0 : _g.join(" | ")) || "none"}`,
              "high",
              "sticky"
            ),
            createContextSection("column_profiles", `Column profiles:
${formatColumnQualitySummary(columns)}`, "required", "sticky"),
            createContextSection("candidate_rows", `Candidate rows (rowIndex is zero-based):
${formatRows(trimRawDataSample(candidateRows, candidateRows.length))}`, "required", "sticky"),
            createContextSection("report_metadata", `Metadata rows:
${formatRows(trimRawDataSample((data.summaryRows ?? []).map((row, index) => ({ rowIndex: index, ...row })), 5))}`, "medium", "prunable")
          ],
          settings,
          modelId,
          compactionMode
        });
        return withTransientRetry(
          (fb) => streamGenerateText({
            model: fb ?? model,
            messages: [
              { role: "system", content: managed.systemText },
              { role: "user", content: createDatasetSemanticAnnotationPrompt(managed.userText) }
            ],
            output: output_exports.object({
              schema: jsonSchema(prepareSchemaForProvider(datasetSemanticAnnotationSchema, settings.provider))
            })
          }),
          { settings, primaryModelId: modelId, label: "datasetSemanticAnnotator" }
        );
      }
    });
    return sanitizeDatasetSemanticSnapshot(
      {
        ...result.output,
        generatedAt: (/* @__PURE__ */ new Date()).toISOString()
      },
      data,
      modelId,
      datasetVersion,
      columns,
      reportContextResolution
    );
  } catch (error) {
    console.warn("[DatasetSemanticAnnotator] Semantic annotation failed. Falling back to prepared dataset.", error);
    return null;
  }
};
const datasetSemanticAnnotator = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  annotateDatasetSemantics
}, Symbol.toStringTag, { value: "Module" }));
const runtimeEvaluationSchema = {
  type: "object",
  properties: {
    decision: {
      type: "string",
      enum: ["accept", "retry", "clarify"],
      description: "Whether the last completed runtime step should be accepted, retried, or redirected to clarification."
    },
    reason: {
      type: "string",
      description: "A concise explanation grounded in the last action and observation."
    },
    retryHint: {
      type: "string",
      description: "Optional guidance for the next runtime step when decision is retry or clarify."
    },
    isFinalEnough: {
      type: "boolean",
      description: "Whether the current request could reasonably end after this accepted step."
    },
    needsExplanation: {
      type: "boolean",
      description: "Whether the accepted step still needs a grounded assistant_message to explain it to the user."
    },
    scorecard: {
      type: "object",
      description: "Qualitative self-evaluation scorecard for the step. Optional — omit when confidence is low.",
      properties: {
        goalMatch: {
          type: "string",
          enum: ["low", "medium", "high"],
          description: "How well the step output matches the user goal."
        },
        evidenceQuality: {
          type: "string",
          enum: ["low", "medium", "high"],
          description: "Quality of the evidence produced by this step."
        },
        toolFit: {
          type: "string",
          enum: ["poor", "adequate", "strong"],
          description: "How well the chosen tool matched the task."
        },
        repeatRisk: {
          type: "string",
          enum: ["low", "medium", "high"],
          description: "Risk that retrying would produce the same outcome."
        },
        completionReadiness: {
          type: "string",
          enum: ["low", "medium", "high"],
          description: "How close the task is to being fully complete."
        },
        failurePattern: {
          type: "string",
          enum: ["none", "semantic_miss", "tool_mismatch", "tool_contract", "tool_policy", "weak_evidence", "premature_answer", "parse_failure", "unknown"],
          description: "Identified failure pattern if the step did not fully succeed."
        },
        insightValue: {
          type: "string",
          enum: ["low", "medium", "high"],
          description: "Business insight value of the result. low = all values nearly identical (flat metric), medium = some variation exists, high = clear pattern or outlier visible."
        }
      },
      required: ["goalMatch", "evidenceQuality", "toolFit", "repeatRisk", "completionReadiness", "failurePattern"]
    },
    finalReadiness: {
      type: "string",
      enum: ["ready", "needs_response", "partial_only", "not_ready"],
      description: "Overall readiness to finalize the task after this step."
    },
    recommendedNextMode: {
      type: "string",
      enum: ["accept", "retry", "clarify", "fallback_answer", "repair", "replan", "stop"],
      description: "Recommended next action mode. May differ from decision when richer recovery is available."
    }
  },
  required: ["decision", "reason"]
};
const runtimeEvaluationSystemPrompt = `
You are a runtime evaluator inside a browser-only AI agent loop.
Judge whether the last completed step satisfied the user's committed objective and advance toward the done criteria.

Return exactly one JSON object matching the schema.
Return JSON only. No markdown. No prose before or after the JSON object.

Context interpretation:
- The runtime step contract contains "taskCommitment", "doneCriteria", and "fallbackPolicy" to guide your evaluation.
- "taskCommitment" defines the original user request, committed objective, expected outcome, and assumption mode.
- "doneCriteria" lists the "isDoneWhen" conditions that signal task completion and "mustNotDo" constraints.
- "fallbackPolicy" defines how to handle blocked or denied tools (fallback_answer, switch_tool_family, clarify_once).

Decision rules:
- accept: the step materially advances or satisfies the committed objective and matches at least one "isDoneWhen" criterion when applicable.
- retry: the step executed, but chose the wrong tool, wrong field, weak evidence, or otherwise missed the committed objective.
- clarify: the committed objective requires user disambiguation before the agent can continue safely.
- When you choose accept, also decide whether the task is final enough to end now (isFinalEnough) and whether the user still needs an explanatory assistant_message.
- Prefer retry over clarify when a smaller bounded next step could still reduce uncertainty from the existing dataset, such as another grouped query, aggregate check, filter, or chart-design validation.
- Do not choose clarify just because the current result is incomplete. Choose clarify only when the remaining ambiguity truly requires user input and cannot be resolved from the available tools and evidence.
- Do not mark a step as final enough unless the committed objective is satisfied and at least one "isDoneWhen" condition is met.

Contract-aware evaluation:
- The runtime step contract contains "expectedOutcome" and "allowAssistantResponse". These fields are authoritative.
- If allowAssistantResponse is false and the action is assistant_message, this is a tool_mismatch. Choose retry with toolFit "poor" and failurePattern "tool_mismatch".
- If expectedOutcome is "card" and the action is assistant_message, the step has not produced the committed outcome. Choose retry unless the message explains why the card cannot be produced.
- When the action type contradicts the contract's expectedOutcome, set failurePattern to "tool_mismatch" in the scorecard.

Harness and semantic context usage:
- The "harness_context" section contains the data investigation summary produced before analysis began. It describes detected hierarchies, duplicate labels, metric relationships, and outliers. Use it to judge whether the current step's groupBy, filters, and aggregations are consistent with the dataset's actual structure.
- The "semantic_context" section lists classified column roles: business grains (preferred groupBy), candidate metrics (safe for SUM), helper dimensions (filter-only, not primary groupBy), and blocked dimensions (never use as groupBy — a label counterpart exists). Use these to evaluate whether the step chose appropriate columns.
- If the step grouped by a blocked dimension, set evidenceQuality to "low" and failurePattern to "semantic_miss".
- If the step used a helper dimension as a primary groupBy when a business grain was available, set evidenceQuality to "medium" and failurePattern to "semantic_miss".
- If the step aggregated a non-metric column, set evidenceQuality to "low".

Self-evaluation scorecard:
- When you have enough context, include a "scorecard" object rating this step on goalMatch, evidenceQuality, toolFit, repeatRisk, completionReadiness, failurePattern, and insightValue.
- Also include "finalReadiness" and "recommendedNextMode" when you can judge them.
- For evidenceQuality, use harness_context and semantic_context to ground your judgement: blocked dimensions, helper dimension misuse, and non-metric aggregation should lower evidenceQuality.
- For insightValue: assess the business usefulness of the result data itself. Set "low" when all values in the result are nearly identical (flat metric — the chart or table would reveal nothing actionable), "medium" when there is measurable variation between groups but no standout pattern, "high" when a clear pattern, outlier, concentration, or business signal is visible. A flat bar chart where every region has the same revenue is insightValue "low". A chart showing Region A with 10x the revenue of others is insightValue "high". When the step did not produce data (e.g. assistant_message only), omit insightValue.
- These fields are optional. Omit them when your confidence is low rather than guessing.

Do not invent new facts. Base your judgment only on the supplied user request, runtime step contract, action, observation, artifacts summary, semantic context, and runtime feedback.
`.trim();
const createRuntimeEvaluationPrompt = () => `
Evaluate the most recent runtime step against the task commitment and done criteria.
- **Task commitment**: Understand what the original user request committed to achieve, and whether the step advances toward that goal.
- **Done criteria**: Apply the committed "isDoneWhen" conditions to judge whether the task could reasonably conclude.
- **Fallback policy**: Use the fallback strategy (fallback_answer, clarify_once, etc.) to guide your next-mode recommendation when a step fails.

Decision logic:
- If the step succeeded technically but did not satisfy the committed goal, choose "retry".
- If the step needs user disambiguation before the agent can continue safely, choose "clarify".
- If the step is good enough to keep and matches at least one "isDoneWhen" criteria, choose "accept".
- Set "isFinalEnough" to true only when at least one "isDoneWhen" criterion is met and the user request is reasonably complete.
- Set "needsExplanation" to true when a tool result is acceptable but the user still needs a grounded assistant_message that interprets or summarizes it.
- For an accepted assistant_message, "needsExplanation" should be false.
- If a visible query is only a preview without a real filter or aggregate, prefer "retry".
- If the latest step produced useful grouped evidence but the committed goal is not yet satisfied, prefer "accept" with "isFinalEnough": false instead of forcing early finality.
- If the current ambiguity can likely be reduced by one more bounded tool step, prefer "retry" instead of "clarify".
- Check the contract's "expectedOutcome" and "allowAssistantResponse". If the action contradicts these constraints, prefer "retry" with failurePattern "tool_mismatch".
- Use the fallback policy to decide between retry, clarify, and fallback_answer when the step fails to meet the commitment.
- When possible, include "scorecard", "finalReadiness", and "recommendedNextMode" to explain your reasoning. These are optional — omit them if you are unsure.
- Response format example: {"decision":"retry","reason":"The filter targeted the wrong column but commitment is achievable.","retryHint":"Use ProjectCode instead of Description.","isFinalEnough":false,"needsExplanation":false,"scorecard":{"goalMatch":"low","evidenceQuality":"low","toolFit":"adequate","repeatRisk":"medium","completionReadiness":"low","failurePattern":"semantic_miss","insightValue":"low"},"finalReadiness":"not_ready","recommendedNextMode":"retry"}
`.trim();
const buildQueryUnderstandingPrompt = (message, columnSummary) => ({
  system: `You are a query understanding engine for a CSV data analysis app. Your job is to DESCRIBE the user's request as a structured JSON object. You do not decide what the system should do — you describe what the user is asking for.

${columnSummary ? `Dataset columns: ${columnSummary}
` : ""}Output exactly ONE JSON object (no markdown, no wrapping):

{
  "intent": "batch_analysis | precise_card | data_query | conversation",
  "confidence": "high | medium | low",
  "taskSignal": "create_chart | inspect_data | explain_existing | compare_periods | analyze_cohort | find_root_cause | statistical | derive_metric | answer_scalar | converse",
  "expectedOutput": "chart_card | data_table | text_answer | scalar_answer | derived_metric | needs_clarification",
  "referencedColumns": [],
  "aggregationFunctions": [],
  "groupingColumns": [],
  "filterDescription": null,
  "subjectRefs": [],
  "timeScope": { "kind": "none" },
  "comparisonScope": { "kind": "none" },
  "unresolvedReferences": [],
  "reason": ""
}

## Field definitions

**intent** — what broad category does this request fall into?
- batch_analysis: the user wants autonomous multi-insight exploration without specifying columns or metrics
- precise_card: the user specifies what to analyze (columns, aggregation, grouping, chart type)
- data_query: the user wants to see, inspect, filter, or browse specific data rows or values
- conversation: general chat, follow-up about existing results, clarification, greeting

**confidence** — how confident are you in this classification?
- high: the request is clear and unambiguous
- medium: reasonable interpretation but some ambiguity
- low: the request is vague, incomplete, or could mean multiple things

**taskSignal** — what does the user want the system to do? Describe the action, not the routing.
- create_chart: create a visualization or analysis card
- inspect_data: browse, filter, or view data rows
- explain_existing: explain or elaborate on something already visible or previously shown
- compare_periods: compare across time periods (year-over-year, month-over-month, etc.)
- analyze_cohort: cohort analysis, retention, churn analysis
- find_root_cause: identify drivers, contributors, or root causes of a metric change
- statistical: correlation, regression, distribution, outlier, or trend analysis
- derive_metric: calculate a new metric from existing data (margins, rates, ratios)
- answer_scalar: answer a single-entity, single-metric question with a direct value (e.g. "What is the total sales for Denso?", "How much revenue did we get?")
- converse: general conversation, greeting, or meta-question about the system

**expectedOutput** — what form should the answer take?
- chart_card: a chart or analysis card
- data_table: a table of data rows
- text_answer: a text explanation or conversational response
- scalar_answer: a single numeric or text value (e.g. "the total is 1,234,567")
- derived_metric: a new calculated metric added to the dataset
- needs_clarification: the request is too ambiguous to determine what output the user expects

**referencedColumns** — column names from the dataset that the user explicitly mentioned.${columnSummary ? " Match against the dataset columns listed above." : ""} Empty array if none.

**aggregationFunctions** — aggregation functions the user requested (SUM, COUNT, AVG, MIN, MAX, MEDIAN, STDEV). Empty array if none detected.

**groupingColumns** — columns the user wants to group by. Empty array if none.

**filterDescription** — natural language description of any filter/where condition the user specified. null if none.

**subjectRefs** — entities the user refers to: card names, metric names, campaigns, specific data entities. Empty array if none.

**timeScope** — time reference in the message:
- kind: "explicit" (specific date/range like "Q1 2024"), "relative" (like "last month", "this year"), "dataset_relative" (like "the latest period"), "none"
- value: the raw phrase from the message (e.g. "this month", "Q1 2024")

**comparisonScope** — comparison reference in the message:
- kind: "previous_card" (compare to a prior card), "previous_result" (compare to a prior query), "previous_period" (compare to prior time period), "none"
- value: the raw phrase (e.g. "vs last month", "compared to the previous card")

**unresolvedReferences** — phrases in the message that refer to something context-dependent and cannot be resolved from the message alone. Examples: "this month", "that campaign", "the previous card", "those results". List the raw phrases. Empty array if everything is self-contained.

**reason** — brief explanation of your classification (1 sentence).

## Output constraints

- Return valid JSON only. No markdown fences, no explanation outside the JSON.
- Fill every field. Use empty arrays, null, or { "kind": "none" } for absent values.
- Do not invent column names — only list columns the user actually mentioned.
- Set confidence to "low" if the message is a single word, a fragment, or genuinely ambiguous.
- Set confidence to "medium" if you can reasonably interpret the request but it has some ambiguity.
- Set confidence to "high" only when the request is clear and complete.`,
  user: message
});
const enhancementSystemPrompt = "You help product analysts improve dashboards. Return a single JSON object with a 'suggestions' array describing up to three concrete improvements.";
const createCardEnhancementPrompt = (cardContext, language) => {
  return `
You are a senior analytics engineer. Review the current dashboard cards listed below and propose up to three targeted enhancements.

Focus on practical improvements that unlock deeper insight, most often by adding calculated columns (ratios, spreads, growth, margin). Only propose ideas that can be executed with the available columns inside each card's aggregated table.

For each suggestion, provide:
- cardId: Which card should be improved.
- cardTitle: Optional human-readable title.
- rationale: Why this matters for the business stakeholder (use ${language} where possible).
- priority: high / medium / low.
- action: Use 'add_calculated_column' when a new derived column is suitable, otherwise 'none'. (Future actions may be added.)
- proposedColumnName + formula: When adding a column, reference existing columns in single-quotes, e.g., "('Revenue' - 'Cost') / 'Revenue'".
- updateChart: Only when the new column should replace or supplement the existing metric.

Keep suggestions specific and data-driven. Do not exceed three suggestions.

CARDS JSON:
${JSON.stringify(cardContext, null, 2)}
`;
};
const isExecutableEnhancementSuggestion = (suggestion) => suggestion.action === "add_calculated_column" && typeof suggestion.cardId === "string" && suggestion.cardId.trim().length > 0 && typeof suggestion.proposedColumnName === "string" && suggestion.proposedColumnName.trim().length > 0 && typeof suggestion.formula === "string" && suggestion.formula.trim().length > 0;
const generateCardEnhancementSuggestions = async (cardContext, settings) => {
  if (!isProviderConfigured(settings) || cardContext.length === 0) return [];
  try {
    const promptContent = createCardEnhancementPrompt(cardContext, settings.language);
    const systemPrompt = enhancementSystemPrompt;
    const { model, modelId } = createProviderModel(settings, settings.complexModel);
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: promptContent }
    ];
    const result = await withTransientRetry(
      (fb) => streamGenerateText({
        model: fb ?? model,
        messages,
        output: output_exports.object({ schema: jsonSchema(prepareSchemaForProvider(cardEnhancementSuggestionsSchema, settings.provider)) })
      }),
      { settings, primaryModelId: modelId, label: "enhancementGenerator" }
    );
    const parsed = result.output !== void 0 ? result.output : robustlyParseJsonObject(result.text);
    return Array.isArray(parsed == null ? void 0 : parsed.suggestions) ? parsed.suggestions.filter(isExecutableEnhancementSuggestion) : [];
  } catch (error) {
    console.error("Failed to generate card enhancement suggestions:", error);
    return [];
  }
};
const enhancementGenerator = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  generateCardEnhancementSuggestions
}, Symbol.toStringTag, { value: "Module" }));
const LOG_PREFIX = "[VisualEvaluation]";
const VISUAL_EVALUATION_TIMEOUT_MS = 12e3;
const VALID_QUALITIES = /* @__PURE__ */ new Set(["good", "acceptable", "poor"]);
const parseEvaluationResponse = (text) => {
  try {
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(cleaned);
    if (!parsed || typeof parsed !== "object") return null;
    if (!VALID_QUALITIES.has(parsed.quality)) return null;
    return {
      quality: parsed.quality,
      suggestedChartType: parsed.suggestedChartType ?? void 0,
      reason: parsed.reason ?? void 0
    };
  } catch {
    return null;
  }
};
const evaluateChartPresentation = async (chartImageBase64, plan, displayChartType, categoryCount, settings) => {
  var _a;
  if (!isProviderConfigured(settings)) {
    return null;
  }
  try {
    const { model, modelId } = createProviderModel(settings, settings.simpleModel);
    const rawBase64 = chartImageBase64.replace(/^data:image\/\w+;base64,/, "");
    const context = `Chart type: ${displayChartType}. Title: "${plan.title ?? ""}". Categories: ${categoryCount}. Group by: ${plan.groupByColumn ?? "N/A"}. Value: ${plan.valueColumn ?? plan.yValueColumn ?? "N/A"}.`;
    const result = await withTransientRetry(
      (fb) => streamGenerateText({
        model: fb ?? model,
        messages: [
          { role: "system", content: visualEvaluationSystemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: context },
              { type: "image", image: rawBase64 }
            ]
          }
        ],
        activityTimeoutMs: VISUAL_EVALUATION_TIMEOUT_MS
      }),
      { settings, primaryModelId: modelId, label: "visualPresentationEvaluator" }
    );
    const text = (_a = result.text) == null ? void 0 : _a.trim();
    if (!text) {
      console.warn(`${LOG_PREFIX} Empty response.`);
      return null;
    }
    const evaluation = parseEvaluationResponse(text);
    if (!evaluation) {
      console.warn(`${LOG_PREFIX} Unparseable response: ${text.slice(0, 120)}`);
      return null;
    }
    console.log(`${LOG_PREFIX} quality=${evaluation.quality}, suggested=${evaluation.suggestedChartType ?? "none"}, reason=${evaluation.reason ?? "none"}`);
    return evaluation;
  } catch (err) {
    console.warn(`${LOG_PREFIX} Failed (non-blocking):`, err instanceof Error ? err.message : err);
    return null;
  }
};
export {
  analystMemoSchema as $,
  validateAction as A,
  isTransientProviderError as B,
  prepareSchemaForProvider as C,
  runWithOverflowCompaction as D,
  prepareManagedContext as E,
  createContextSection as F,
  formatCompactVisibleEvidenceSummary as G,
  createRuntimeEvaluationPrompt as H,
  runtimeEvaluationSystemPrompt as I,
  reportContextDiagnostics as J,
  createFallbackProviderModel as K,
  runtimeEvaluationSchema as L,
  sanitizeChatHistoryForModel as M,
  buildChatRequest as N,
  validateProviderHealth as O,
  buildQueryUnderstandingPrompt as P,
  formatColumnNames as Q,
  formatRows as R,
  trimRawDataSample as S,
  buildAnalysisPlannerSystemPrompt as T,
  createAnalysisTopicsSchema as U,
  createAnalysisTopicsPrompt as V,
  createSqlEvidenceQueryPlanSchema as W,
  buildTopicPlanningUserPrompt as X,
  buildPlanRetryFeedback as Y,
  generateAnalysisGoalCandidates as Z,
  createAnalystMemoPrompt as _,
  dataQuerySchema as a,
  createForumSummaryPrompt as a0,
  forumSummarySchema as a1,
  evaluateChartPresentation as a2,
  GOOGLE_MODELS as a3,
  OPENAI_MODELS as a4,
  DEFAULT_FALLBACK_MODEL as a5,
  providerConfig as a6,
  transientRetry as a7,
  contextManager as a8,
  datasetSemanticAnnotator as a9,
  enhancementGenerator as aa,
  dataDescribeSchema as b,
  createToolCreatePlanSchema as c,
  dataPreparationSchema as d,
  dataValueCountsSchema as e,
  dataOutliersSchema as f,
  dataMissingSchema as g,
  detectReportStructureProposalWithAi as h,
  isProviderConfigured as i,
  detectIntakeStructureWithAi as j,
  extractAiReportContext as k,
  evaluateAiSqlPrecheck as l,
  buildDeterministicNormalizationPlan as m,
  hasExecutableHierarchyShape as n,
  generateAiCleaningProgram as o,
  generateSummary as p,
  generateFinalSummary as q,
  generateCoreAnalysisSummary as r,
  shouldRequestReportStructureProposal as s,
  generateProactiveInsights as t,
  generateFilterFunction as u,
  createProviderModel as v,
  buildClarificationAssessmentPrompt as w,
  withTransientRetry as x,
  streamGenerateText as y,
  getResolvedToolRegistry as z
};
