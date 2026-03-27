import { i as injectDirectivesIntoQueryPlan, c as createEmptyRuntimeDirectives, n as normalizePreFilterOperator, d as detectQuarterIntent, f as findMissingQuarterColumns, t as throwIfAborted, a as createAnalysisTopicsSchema, r as robustlyParseJsonObject, b as isRuntimeAbortError, e as isStructuralMetadataColumn, g as isTimeLikeDimensionColumn, h as formatAnalysisSteeringBundle, j as detectPeriodColumnFamilies, k as compileQueryPlanToDuckDbSql, l as createSqlEvidenceQueryPlanSchema, m as createSqlPresentationPlanSchema, o as recommendChartType, p as isSequentialDimensionName, q as resolvePivotDecision, s as hasDuplicateNormalizedBuckets, u as isMonotonicSequence, v as resolveOrdinalIndices, w as emitAgentEvent, x as buildDatasetContext, y as buildRuntimeSemanticUnderstanding, z as buildAnalysisIntentBrief, A as recordRuntimeEvent, B as buildEvidenceSignature, C as buildPlanOnlySemanticSignature, D as vectorStore, E as executeEvidenceQuery, F as buildEvidenceResultSummary, G as callAiEvidenceEvaluation, H as evaluateEvidenceValue, I as executePresentationPlanAndCreateCard, J as findTemplateMatches, K as resolveEffectiveReportContext, L as getSemanticSampleRows, M as formatPatternPreferences, N as mapGoalCandidatesToSuggestedActions, O as getTranslation, P as buildAnalysisRankingHints, Q as createChatMessage } from "./csv_data_analysis_app-agent.js";
import { g as generateText, o as output_exports, j as jsonSchema } from "./csv_data_analysis_vendor-ai-sdk.js";
import { m as createProviderModel, y as createContextSection, u as runWithOverflowCompaction, x as prepareManagedContext, I as buildAnalysisPlannerSystemPrompt, C as reportContextDiagnostics, w as withTransientRetry, p as prepareSchemaForProvider, J as createAnalysisTopicsPrompt, K as formatColumnNames, L as formatRows, M as trimRawDataSample, N as buildTopicPlanningUserPrompt, O as buildPlanRetryFeedback, i as isProviderConfigured, P as createSqlPresentationPlanPrompt, Q as generateAnalysisGoalCandidates } from "./csv_data_analysis_app-ai.js";
import { h as formatColumnDisplayHints } from "./csv_data_analysis_app-reporting.js";
const AGENT_CHART_TYPE_MAP = {
  // Canonical identity mappings
  "bar": "bar",
  "horizontal_bar": "horizontal_bar",
  "line": "line",
  "area": "area",
  "pie": "pie",
  "doughnut": "doughnut",
  "polar_area": "polar_area",
  "scatter": "scatter",
  "combo": "combo",
  "radar": "radar",
  "bubble": "bubble",
  "stacked_bar": "stacked_bar",
  "stacked_column": "stacked_column",
  "multi_line": "multi_line",
  // AI aliases
  "bar_chart": "bar",
  "bar chart": "bar",
  "column": "bar",
  "column_chart": "bar",
  "horizontal bar": "horizontal_bar",
  "hbar": "horizontal_bar",
  "line_chart": "line",
  "line chart": "line",
  "area_chart": "area",
  "area chart": "area",
  "pie_chart": "pie",
  "pie chart": "pie",
  "donut": "doughnut",
  "donut_chart": "doughnut",
  "doughnut_chart": "doughnut",
  "scatter_plot": "scatter",
  "scatter plot": "scatter",
  "scatterplot": "scatter",
  "bubble_chart": "bubble",
  "bubble chart": "bubble",
  "combo_chart": "combo",
  "mixed": "combo",
  "radar_chart": "radar",
  "spider": "radar",
  "polar": "polar_area",
  "polar_chart": "polar_area",
  "stacked": "stacked_bar",
  "stacked bar": "stacked_bar",
  "stacked_bar_chart": "stacked_bar",
  "stacked bar chart": "stacked_bar",
  "stacked column": "stacked_column",
  "stacked_column_chart": "stacked_column",
  "multiline": "multi_line",
  "multi line": "multi_line"
};
const DEFAULT_FALLBACK = "bar";
function resolveAiChartType(aiChartType, fallback) {
  if (!aiChartType) return fallback ?? DEFAULT_FALLBACK;
  const normalized = aiChartType.trim().toLowerCase();
  if (!normalized) return fallback ?? DEFAULT_FALLBACK;
  return AGENT_CHART_TYPE_MAP[normalized] ?? fallback ?? DEFAULT_FALLBACK;
}
function tryResolveAiChartType(aiChartType) {
  if (!aiChartType) return void 0;
  const normalized = aiChartType.trim().toLowerCase();
  if (!normalized) return void 0;
  return AGENT_CHART_TYPE_MAP[normalized];
}
const TEMPORAL_COLUMN_TYPES = /* @__PURE__ */ new Set(["date", "time"]);
const normalizeString$1 = (value) => {
  if (typeof value !== "string") {
    return void 0;
  }
  const normalized = value.trim();
  return normalized ? normalized : void 0;
};
const normalizeBindings = (bindings) => ({
  groupByColumn: normalizeString$1(bindings == null ? void 0 : bindings.groupByColumn),
  valueColumn: normalizeString$1(bindings == null ? void 0 : bindings.valueColumn),
  secondaryValueColumn: normalizeString$1(bindings == null ? void 0 : bindings.secondaryValueColumn),
  xValueColumn: normalizeString$1(bindings == null ? void 0 : bindings.xValueColumn),
  yValueColumn: normalizeString$1(bindings == null ? void 0 : bindings.yValueColumn)
});
const isTemporalGroupByColumn = (groupByColumn, columns) => {
  if (!groupByColumn) {
    return false;
  }
  const profile = columns.find((column) => column.name.toLowerCase() === groupByColumn.toLowerCase());
  return Boolean(profile && TEMPORAL_COLUMN_TYPES.has(profile.type));
};
const bindingsEqual = (left, right) => left.groupByColumn === right.groupByColumn && left.valueColumn === right.valueColumn && left.secondaryValueColumn === right.secondaryValueColumn && left.xValueColumn === right.xValueColumn && left.yValueColumn === right.yValueColumn;
const downgradeChartType = (groupByColumn, columns) => isTemporalGroupByColumn(groupByColumn, columns) ? "line" : "bar";
const determineFailureReason = (params) => {
  const { groupByColumn, valueColumn, secondaryValueColumn, aggregateAliases, columns } = params;
  if (!groupByColumn) {
    return "missing_group_binding";
  }
  if (!valueColumn) {
    return aggregateAliases.length === 1 ? "single_stable_alias" : "missing_primary_metric";
  }
  if (!secondaryValueColumn) {
    if (aggregateAliases.length === 1) {
      return "single_stable_alias";
    }
    return isTemporalGroupByColumn(groupByColumn, columns) ? "temporal_comparison" : "non_temporal_comparison";
  }
  if (valueColumn.toLowerCase() === secondaryValueColumn.toLowerCase()) {
    return isTemporalGroupByColumn(groupByColumn, columns) ? "temporal_comparison" : "non_temporal_comparison";
  }
  return "missing_secondary_metric";
};
const resolveStructuredComboDecision = ({
  chartType,
  bindings,
  aggregation,
  secondaryAggregation,
  query,
  columns,
  isSqlFirst
}) => {
  var _a, _b;
  const normalizedBindings = normalizeBindings(bindings);
  if (chartType !== "combo") {
    return {
      chartType: chartType ?? "bar",
      bindings: normalizedBindings,
      aggregation,
      secondaryAggregation,
      resolution: "unchanged",
      reason: null
    };
  }
  const aggregateAliases = [];
  const firstGroupByColumn = void 0;
  const repairedBindings = {
    groupByColumn: normalizedBindings.groupByColumn || firstGroupByColumn,
    valueColumn: normalizedBindings.valueColumn,
    secondaryValueColumn: normalizedBindings.secondaryValueColumn,
    xValueColumn: void 0,
    yValueColumn: void 0
  };
  const repairedSecondaryAggregation = repairedBindings.secondaryValueColumn ? secondaryAggregation ?? aggregation : void 0;
  const hasStableCombo = Boolean(repairedBindings.groupByColumn) && Boolean(repairedBindings.valueColumn) && Boolean(repairedBindings.secondaryValueColumn) && ((_a = repairedBindings.valueColumn) == null ? void 0 : _a.toLowerCase()) !== ((_b = repairedBindings.secondaryValueColumn) == null ? void 0 : _b.toLowerCase());
  const originalBindings = normalizeBindings(bindings);
  const repaired = !bindingsEqual(originalBindings, repairedBindings) || repairedSecondaryAggregation !== secondaryAggregation;
  if (hasStableCombo) {
    return {
      chartType: "combo",
      bindings: repairedBindings,
      aggregation,
      secondaryAggregation: repairedSecondaryAggregation,
      resolution: repaired ? "repaired" : "unchanged",
      reason: null
    };
  }
  const reason = determineFailureReason({
    groupByColumn: repairedBindings.groupByColumn,
    valueColumn: repairedBindings.valueColumn,
    secondaryValueColumn: repairedBindings.secondaryValueColumn,
    aggregateAliases,
    columns
  });
  return {
    chartType: downgradeChartType(repairedBindings.groupByColumn, columns),
    bindings: {
      groupByColumn: repairedBindings.groupByColumn,
      valueColumn: repairedBindings.valueColumn,
      secondaryValueColumn: void 0,
      xValueColumn: void 0,
      yValueColumn: void 0
    },
    aggregation,
    secondaryAggregation: void 0,
    resolution: "downgraded",
    reason
  };
};
const normalizeTopicText$2 = (value) => value.trim().toLowerCase().replace(/\bno\.\b/g, "number ").replace(/[_/.-]+/g, " ").replace(/\s+/g, " ").trim();
const RATIO_METRIC_PATTERN = /(?:^|[\s_])(ratio|margin|pct|percentage|percent)(?:$|[\s_])|%/i;
const AVERAGE_INTENT_PATTERN = /\b(avg|average|mean)\b/i;
const CUMULATIVE_RATIO_INTENT_PATTERN = /\b(sum|total|cumulative|accumulated)\b/i;
const SUMMARY_ROW_TOPIC_PATTERN = /\b(row class|rowclass|hierarchy|subtotal|sub total|group header|header row|parent row|summary row|summary rows|total row|total rows)\b/i;
const normalizeAlias = (value) => value.trim().toLowerCase();
const buildAggregateAlias = (fn, column) => `${fn}_${column.toLowerCase().replace(/\s+/g, "_")}`;
const updateAliasReferences = (query, oldAlias, newAlias) => {
  var _a, _b;
  const oldKey = normalizeAlias(oldAlias);
  query.select = (query.select ?? []).map((column) => normalizeAlias(column) === oldKey ? newAlias : column);
  query.orderBy = (query.orderBy ?? []).map(
    (clause) => normalizeAlias(clause.column) === oldKey ? { ...clause, column: newAlias } : clause
  );
  query.postAggregateFilter = query.postAggregateFilter ? {
    predicates: (_a = query.postAggregateFilter.predicates) == null ? void 0 : _a.map(
      (predicate) => normalizeAlias(predicate.column) === oldKey ? { ...predicate, column: newAlias } : predicate
    ),
    groups: (_b = query.postAggregateFilter.groups) == null ? void 0 : _b.map((group) => ({
      predicates: group.predicates.map(
        (predicate) => normalizeAlias(predicate.column) === oldKey ? { ...predicate, column: newAlias } : predicate
      )
    }))
  } : query.postAggregateFilter;
};
const hasMatchingPredicate = (where, predicate) => {
  const predicates = [
    ...(where == null ? void 0 : where.predicates) ?? [],
    ...((where == null ? void 0 : where.groups) ?? []).flatMap((group) => group.predicates)
  ];
  return predicates.some((existing) => {
    if (normalizeAlias(existing.column) !== normalizeAlias(predicate.column) || existing.operator !== predicate.operator) {
      return false;
    }
    if (Array.isArray(existing.value) || Array.isArray(predicate.value)) {
      const existingValues = Array.isArray(existing.value) ? existing.value.map(String) : [String(existing.value)];
      const predicateValues = Array.isArray(predicate.value) ? predicate.value.map(String) : [String(predicate.value)];
      return existingValues.length === predicateValues.length && existingValues.every((value, index) => value === predicateValues[index]);
    }
    return String(existing.value ?? "") === String(predicate.value ?? "");
  });
};
const appendPredicate = (where, predicate) => {
  var _a;
  if (hasMatchingPredicate(where, predicate)) {
    return where;
  }
  return {
    predicates: [...(where == null ? void 0 : where.predicates) ?? [], predicate],
    ...((_a = where == null ? void 0 : where.groups) == null ? void 0 : _a.length) ? { groups: where.groups } : {}
  };
};
const normalizePreFilterClause = (clause) => ({
  column: clause.column,
  operator: clause.operator ?? "eq",
  value: clause.value
});
const hasMatchingPreFilterClause = (preFilter, clause) => {
  const normalized = normalizePreFilterClause(clause);
  return (preFilter ?? []).some((existing) => {
    const nextExisting = normalizePreFilterClause(existing);
    if (normalizeAlias(nextExisting.column) !== normalizeAlias(normalized.column) || nextExisting.operator !== normalized.operator) {
      return false;
    }
    if (Array.isArray(nextExisting.value) || Array.isArray(normalized.value)) {
      const existingValues = Array.isArray(nextExisting.value) ? nextExisting.value.map(String) : [String(nextExisting.value)];
      const clauseValues = Array.isArray(normalized.value) ? normalized.value.map(String) : [String(normalized.value)];
      return existingValues.length === clauseValues.length && existingValues.every((value, index) => value === clauseValues[index]);
    }
    return String(nextExisting.value ?? "") === String(normalized.value ?? "");
  });
};
const appendPreFilterClause = (preFilter, clause) => {
  if (hasMatchingPreFilterClause(preFilter, clause)) {
    return [...preFilter ?? []];
  }
  return [...preFilter ?? [], normalizePreFilterClause(clause)];
};
const toPredicate = (clause) => ({
  column: clause.column,
  operator: clause.operator ?? "eq",
  value: clause.value
});
const mergeEvidencePreFilterIntoQuery = (query, preFilter) => {
  if (!(preFilter == null ? void 0 : preFilter.length)) {
    return query;
  }
  let nextWhere = query.where;
  for (const clause of preFilter) {
    nextWhere = appendPredicate(nextWhere, toPredicate(clause));
  }
  return {
    ...query,
    ...nextWhere ? { where: nextWhere } : {}
  };
};
const isRatioLikeMetric = (columnName, profile) => {
  if (!columnName) {
    return false;
  }
  return (profile == null ? void 0 : profile.type) === "percentage" || RATIO_METRIC_PATTERN.test(columnName);
};
const topicPrefersAverageAggregation = (topic, columnName, profile) => {
  if (!isRatioLikeMetric(columnName, profile)) {
    return false;
  }
  const normalizedTopic = normalizeTopicText$2(topic ?? "");
  if (!normalizedTopic) {
    return (profile == null ? void 0 : profile.type) === "percentage";
  }
  if (AVERAGE_INTENT_PATTERN.test(normalizedTopic)) {
    return true;
  }
  if (RATIO_METRIC_PATTERN.test(normalizedTopic) && !CUMULATIVE_RATIO_INTENT_PATTERN.test(normalizedTopic)) {
    return true;
  }
  return (profile == null ? void 0 : profile.type) === "percentage" && !CUMULATIVE_RATIO_INTENT_PATTERN.test(normalizedTopic);
};
const applyEvidenceQuerySemanticDefaults = (plan, columns, options) => {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i;
  const nextPlan = {
    ...plan,
    preFilter: (plan.preFilter ?? []).map((clause) => normalizePreFilterClause(clause)),
    query: {
      ...plan.query,
      select: [...plan.query.select ?? []],
      groupBy: [...plan.query.groupBy ?? []],
      orderBy: [...plan.query.orderBy ?? []],
      aggregates: (plan.query.aggregates ?? []).map((aggregate) => ({ ...aggregate })),
      ...plan.query.where ? {
        where: {
          predicates: [...plan.query.where.predicates ?? []],
          groups: (_a = plan.query.where.groups) == null ? void 0 : _a.map((group) => ({
            predicates: group.predicates.map((predicate) => ({ ...predicate }))
          }))
        }
      } : {},
      ...plan.query.postAggregateFilter ? {
        postAggregateFilter: {
          predicates: (_b = plan.query.postAggregateFilter.predicates) == null ? void 0 : _b.map((predicate) => ({ ...predicate })),
          groups: (_c = plan.query.postAggregateFilter.groups) == null ? void 0 : _c.map((group) => ({
            predicates: group.predicates.map((predicate) => ({ ...predicate }))
          }))
        }
      } : {}
    }
  };
  const primaryAggregate = (_d = nextPlan.query.aggregates) == null ? void 0 : _d[0];
  if (primaryAggregate == null ? void 0 : primaryAggregate.column) {
    const profile = columns.find((column) => column.name === primaryAggregate.column);
    if (primaryAggregate.function === "sum" && topicPrefersAverageAggregation(options == null ? void 0 : options.topic, primaryAggregate.column, profile)) {
      const previousAlias = primaryAggregate.as;
      primaryAggregate.function = "avg";
      if (normalizeAlias(previousAlias) === normalizeAlias(buildAggregateAlias("sum", primaryAggregate.column))) {
        primaryAggregate.as = buildAggregateAlias("avg", primaryAggregate.column);
        updateAliasReferences(nextPlan.query, previousAlias, primaryAggregate.as);
      }
    }
  }
  const detailRowFilter = ((_e = options == null ? void 0 : options.steering) == null ? void 0 : _e.detailRowFilter) ?? (((_f = options == null ? void 0 : options.steering) == null ? void 0 : _f.detailRowColumn) && ((_g = options == null ? void 0 : options.steering) == null ? void 0 : _g.detailRowValue) ? { column: options.steering.detailRowColumn, value: options.steering.detailRowValue } : null);
  const detailRowColumnExists = (detailRowFilter == null ? void 0 : detailRowFilter.column) ? columns.some((col) => col.name.toLowerCase() === detailRowFilter.column.toLowerCase()) : false;
  if ((detailRowFilter == null ? void 0 : detailRowFilter.column) && (detailRowFilter == null ? void 0 : detailRowFilter.value) && detailRowColumnExists && !SUMMARY_ROW_TOPIC_PATTERN.test(normalizeTopicText$2((options == null ? void 0 : options.topic) ?? ""))) {
    nextPlan.preFilter = appendPreFilterClause(nextPlan.preFilter, {
      column: detailRowFilter.column,
      operator: "eq",
      value: detailRowFilter.value
    });
  }
  nextPlan.query = mergeEvidencePreFilterIntoQuery(nextPlan.query, nextPlan.preFilter);
  if (((_i = (_h = options == null ? void 0 : options.steering) == null ? void 0 : _h.excludeFromAggregation) == null ? void 0 : _i.length) && options.steering.hierarchyColumn) {
    const injectionResult = injectDirectivesIntoQueryPlan(nextPlan.query, {
      directives: {
        ...createEmptyRuntimeDirectives(),
        excludeFromAggregation: options.steering.excludeFromAggregation,
        hierarchyColumn: options.steering.hierarchyColumn
      },
      availableColumns: columns.map((c) => c.name),
      isSummaryRowTopic: SUMMARY_ROW_TOPIC_PATTERN.test(normalizeTopicText$2((options == null ? void 0 : options.topic) ?? ""))
    });
    if (injectionResult.validationError) {
      throw new Error(injectionResult.validationError);
    }
    nextPlan.query = injectionResult.plan;
  }
  return nextPlan;
};
const PLANNER_STABILITY_REASON_CODES = {
  intentMismatchRecovered: "intent_mismatch_recovered",
  presentationTimeoutFallback: "presentation_timeout_fallback",
  tableForcedByValueGate: "table_forced_by_value_gate",
  plannerDegradedNonBlocking: "planner_degraded_non_blocking"
};
const PLANNER_STABILITY_REASON_CODE_SET = new Set(
  Object.values(PLANNER_STABILITY_REASON_CODES)
);
const isPlannerStabilityReasonCode = (value) => typeof value === "string" && PLANNER_STABILITY_REASON_CODE_SET.has(value);
const logPlannerStabilitySignal = (telemetryTarget, reasonCode, detail, meta) => {
  var _a;
  return (_a = telemetryTarget == null ? void 0 : telemetryTarget.logTelemetryEvent) == null ? void 0 : _a.call(telemetryTarget, {
    stage: "planner_ready",
    responseType: "planner_stability_signal",
    detail,
    meta: {
      reasonCode,
      ...(meta == null ? void 0 : meta.reasonCodes) ? {} : { reasonCodes: [reasonCode] },
      ...meta ?? {}
    }
  });
};
const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const normalizeString = (value) => typeof value === "string" ? value.trim() : "";
const normalizeTopicText$1 = (value) => value.trim().toLowerCase().replace(/\bno\.\b/g, "number ").replace(/[_/.-]+/g, " ").replace(/\s+/g, " ").trim();
const normalizeColumnWords$1 = (value) => normalizeTopicText$1(
  value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2").replace(/([a-zA-Z])(\d)/g, "$1 $2").replace(/(\d)([a-zA-Z])/g, "$1 $2")
);
const singularizeToken$1 = (token) => {
  if (token.length <= 3) return token;
  if (token.endsWith("ies") && token.length > 4) {
    return `${token.slice(0, -3)}y`;
  }
  if (token.endsWith("es") && token.length > 4) {
    return token.slice(0, -2);
  }
  if (token.endsWith("s") && !token.endsWith("ss")) {
    return token.slice(0, -1);
  }
  return token;
};
const tokenizeForTopicMatch$1 = (value) => normalizeTopicText$1(value).split(" ").map((token) => singularizeToken$1(token.trim())).filter((token) => token.length >= 2);
const topicMentionsColumn$1 = (topic, column) => {
  const normalizedTopic = normalizeTopicText$1(topic);
  const normalizedColumn = normalizeColumnWords$1(column);
  const rawColumn = normalizeString(column).toLowerCase();
  if (!normalizedTopic || !normalizedColumn) {
    return false;
  }
  if (rawColumn && normalizedTopic.includes(rawColumn)) {
    return true;
  }
  if (normalizedTopic.includes(normalizedColumn)) {
    return true;
  }
  const columnTokens = tokenizeForTopicMatch$1(normalizedColumn);
  if (columnTokens.length === 0) {
    return false;
  }
  const topicTokens = new Set(tokenizeForTopicMatch$1(normalizedTopic));
  return columnTokens.every((token) => topicTokens.has(token));
};
const hasWholePhraseMatch = (topic, phrase) => {
  if (!topic || !phrase) {
    return false;
  }
  return ` ${topic} `.includes(` ${phrase} `);
};
const getTopicColumnMatchScore = (topic, column) => {
  const normalizedTopic = normalizeTopicText$1(topic);
  const normalizedColumn = normalizeColumnWords$1(column);
  const rawColumn = normalizeString(column).toLowerCase();
  if (!normalizedTopic || !normalizedColumn) {
    return Number.NEGATIVE_INFINITY;
  }
  let score = Number.NEGATIVE_INFINITY;
  if (hasWholePhraseMatch(normalizedTopic, normalizedColumn)) {
    score = 300;
  } else if (rawColumn && hasWholePhraseMatch(normalizedTopic, rawColumn)) {
    score = 260;
  } else if (topicMentionsColumn$1(normalizedTopic, column)) {
    score = 100;
  } else {
    return Number.NEGATIVE_INFINITY;
  }
  const tokenCount = tokenizeForTopicMatch$1(normalizedColumn).length;
  return score + tokenCount * 10 + normalizedColumn.length;
};
const hasDistinctTopicTargetMention = (topic, column, candidates) => {
  const candidateScore = getTopicColumnMatchScore(topic, column);
  if (!Number.isFinite(candidateScore)) {
    return false;
  }
  const normalizedColumn = normalizeColumnWords$1(column);
  return !candidates.some((candidate) => {
    if (candidate === column) {
      return false;
    }
    const candidateMatchScore = getTopicColumnMatchScore(topic, candidate);
    if (!Number.isFinite(candidateMatchScore) || candidateMatchScore <= candidateScore) {
      return false;
    }
    const normalizedCandidate = normalizeColumnWords$1(candidate);
    return normalizedCandidate.length > normalizedColumn.length && normalizedCandidate.includes(normalizedColumn);
  });
};
const COUNT_INTENT_PATTERN$1 = /\b(count|counts|number of|numbers of|how many|frequency|occurrence|occurrences)\b/i;
const GENERIC_COUNT_TOPIC_PATTERN = /\b(record|records|row|rows|entry|entries|line|lines)\b/i;
const extractTopicGroupingClause = (topic) => {
  var _a;
  const normalizedTopic = normalizeTopicText$1(topic);
  const byMatch = normalizedTopic.match(/\b(?:by|per)\s+(.+)$/);
  if (!byMatch) {
    return null;
  }
  const tail = (_a = byMatch[1]) == null ? void 0 : _a.trim();
  if (!tail) {
    return null;
  }
  return tail;
};
const inferTopicGroupByTarget$1 = (topic, candidates) => {
  var _a;
  const tail = extractTopicGroupingClause(topic);
  if (!tail) {
    return null;
  }
  return ((_a = candidates.map((candidate) => ({ candidate, score: getTopicColumnMatchScore(tail, candidate) })).filter((match) => Number.isFinite(match.score)).sort((left, right) => right.score - left.score)[0]) == null ? void 0 : _a.candidate) ?? null;
};
const inferCountTopicOperandTarget$1 = (topic, candidates) => {
  const normalizedTopic = normalizeTopicText$1(topic);
  if (!COUNT_INTENT_PATTERN$1.test(normalizedTopic)) {
    return null;
  }
  const head = normalizedTopic.replace(/\b(?:by|per)\s+.+$/, "").trim();
  if (!head) {
    return null;
  }
  return candidates.find((candidate) => topicMentionsColumn$1(head, candidate)) ?? null;
};
const TEMPORAL_PREFIX_PATTERN = /^(ytd|mtd|qtd|ly|py|cy|fytd|prior\s+year|current\s+year)\s+/i;
const stripTemporalPrefix = (value) => value.replace(TEMPORAL_PREFIX_PATTERN, "").trim();
const columnsShareTopicIdentity = (left, right) => {
  const leftTokens = left ? tokenizeForTopicMatch$1(normalizeColumnWords$1(left)) : [];
  const rightTokens = right ? tokenizeForTopicMatch$1(normalizeColumnWords$1(right)) : [];
  if (leftTokens.length === 0 || rightTokens.length === 0) {
    return false;
  }
  const leftSet = new Set(leftTokens);
  const rightSet = new Set(rightTokens);
  const leftSubsetOfRight = leftTokens.every((token) => rightSet.has(token));
  const rightSubsetOfLeft = rightTokens.every((token) => leftSet.has(token));
  if (leftSubsetOfRight || rightSubsetOfLeft) {
    return true;
  }
  const leftStripped = left ? tokenizeForTopicMatch$1(normalizeColumnWords$1(stripTemporalPrefix(left))) : [];
  const rightStripped = right ? tokenizeForTopicMatch$1(normalizeColumnWords$1(stripTemporalPrefix(right))) : [];
  if (leftStripped.length > 0 && rightStripped.length > 0) {
    const leftStrippedSet = new Set(leftStripped);
    const rightStrippedSet = new Set(rightStripped);
    return leftStripped.every((t) => rightStrippedSet.has(t)) || rightStripped.every((t) => leftStrippedSet.has(t));
  }
  return false;
};
const normalizeAggregateAliases = (aggregates) => new Set((aggregates ?? []).map((aggregate) => aggregate.as.trim().toLowerCase()));
const normalizeOutputKey = (value) => value.trim().toLowerCase();
const splitAggregateSourceExpression = (value) => {
  const parts = value.split(/\s*\+\s*/).map((part) => part.trim()).filter(Boolean);
  return parts.length >= 2 ? parts : null;
};
const buildUniqueAggregateAlias = (baseAlias, takenKeys) => {
  let suffix = 2;
  let candidate = `${baseAlias}_Part${suffix}`;
  while (takenKeys.has(normalizeOutputKey(candidate))) {
    suffix += 1;
    candidate = `${baseAlias}_Part${suffix}`;
  }
  return candidate;
};
const repairAggregateAliasConflicts = (query) => {
  var _a;
  const repairs = [];
  const aggregates = [...query.aggregates ?? []];
  const aggregatesByAlias = /* @__PURE__ */ new Map();
  for (const aggregate of aggregates) {
    const alias = normalizeString(aggregate.as);
    if (!alias) {
      continue;
    }
    const aliasKey = normalizeOutputKey(alias);
    const group = aggregatesByAlias.get(aliasKey) ?? [];
    group.push(aggregate);
    aggregatesByAlias.set(aliasKey, group);
  }
  for (const [aliasKey, group] of aggregatesByAlias.entries()) {
    if (group.length < 2) {
      continue;
    }
    const alias = normalizeString((_a = group[0]) == null ? void 0 : _a.as);
    const canMergeIntoExpression = group.every(
      (aggregate) => normalizeString(aggregate.as).toLowerCase() === aliasKey && aggregate.function === "sum" && !aggregate.where && !("percentile" in aggregate && aggregate.percentile !== void 0) && Boolean(normalizeString(aggregate.column))
    );
    if (!alias || !canMergeIntoExpression) {
      continue;
    }
    const mergedColumns = [...new Set(
      group.map((aggregate) => normalizeString(aggregate.column)).filter(Boolean)
    )];
    if (mergedColumns.length < 2) {
      continue;
    }
    const leader = group[0];
    leader.column = mergedColumns.join(" + ");
    const mergedGroup = new Set(group.slice(1));
    query.aggregates = (query.aggregates ?? []).filter((aggregate) => !mergedGroup.has(aggregate));
    repairs.push(`Merged duplicate aggregate alias "${alias}" into combined source columns "${mergedColumns.join(" + ")}"`);
  }
  const takenKeys = new Set((query.groupBy ?? []).map(normalizeOutputKey));
  query.aggregates = (query.aggregates ?? []).map((aggregate) => {
    const alias = normalizeString(aggregate.as);
    if (!alias) {
      return aggregate;
    }
    const aliasKey = normalizeOutputKey(alias);
    if (!takenKeys.has(aliasKey)) {
      takenKeys.add(aliasKey);
      return aggregate;
    }
    const repairedAlias = buildUniqueAggregateAlias(alias, takenKeys);
    takenKeys.add(normalizeOutputKey(repairedAlias));
    repairs.push(`Renamed conflicting aggregate alias "${alias}" to "${repairedAlias}"`);
    return { ...aggregate, as: repairedAlias };
  });
  return { repaired: repairs.length > 0, repairs };
};
const normalizeEvidenceQuery = (plan) => {
  const normalizedQuery = {
    ...plan.query,
    groupBy: Array.isArray(plan.query.groupBy) ? plan.query.groupBy.filter(Boolean) : [],
    aggregates: Array.isArray(plan.query.aggregates) ? plan.query.aggregates : [],
    orderBy: Array.isArray(plan.query.orderBy) ? plan.query.orderBy : [],
    select: Array.isArray(plan.query.select) ? plan.query.select.filter(Boolean) : [],
    limit: Number.isInteger(plan.query.limit) ? Number(plan.query.limit) : void 0
  };
  if (!normalizedQuery.limit) {
    normalizedQuery.limit = plan.queryMode === "rowset" ? 150 : 50;
  }
  return normalizedQuery;
};
const repairEvidenceQuerySelectAlignment = (query) => {
  const repairs = [];
  const selectSet = new Set((query.select ?? []).map((s) => s.trim().toLowerCase()));
  for (const col of query.groupBy ?? []) {
    const key = col.trim().toLowerCase();
    if (key && !selectSet.has(key)) {
      query.select = [...query.select ?? [], col];
      selectSet.add(key);
      repairs.push(`Added missing groupBy column "${col}" to select`);
    }
  }
  for (const agg of query.aggregates ?? []) {
    if (!agg.as) continue;
    const key = agg.as.trim().toLowerCase();
    if (key && !selectSet.has(key)) {
      query.select = [...query.select ?? [], agg.as];
      selectSet.add(key);
      repairs.push(`Added missing aggregate alias "${agg.as}" to select`);
    }
  }
  return { repaired: repairs.length > 0, repairs };
};
const aggregateSourceExists = (value, availableColumns) => {
  if (!value) {
    return true;
  }
  if (availableColumns.has(value.toLowerCase())) {
    return true;
  }
  const expressionParts = splitAggregateSourceExpression(value);
  return Boolean(expressionParts && expressionParts.every((part) => availableColumns.has(part.toLowerCase())));
};
const normalizeEvidencePreFilter = (value) => {
  const rawClauses = Array.isArray(value) ? value : isObject(value) ? [value] : [];
  if (rawClauses.length === 0) {
    return void 0;
  }
  const normalized = rawClauses.flatMap((rawClause) => {
    if (!isObject(rawClause)) {
      return [];
    }
    const column = normalizeString(rawClause.column);
    if (!column) {
      return [];
    }
    const value2 = rawClause.value;
    if (value2 === void 0 || Array.isArray(value2) && value2.length === 0) {
      return [];
    }
    const operator = normalizePreFilterOperator(normalizeString(rawClause.operator) || void 0).normalized;
    return [{
      column,
      operator,
      value: value2
    }];
  });
  return normalized.length > 0 ? normalized : void 0;
};
const validateEvidenceQuery = (plan, columns) => {
  var _a, _b, _c;
  const errors = [];
  const availableColumns = new Set(columns.map((column) => column.name.toLowerCase()));
  const outputColumns = new Set((plan.query.select ?? []).map((column) => column.trim().toLowerCase()).filter(Boolean));
  const aliases = normalizeAggregateAliases(plan.query.aggregates);
  const ensureColumnExists = (value, label) => {
    if (!value) return;
    if (!availableColumns.has(value.toLowerCase())) {
      errors.push(`${label} references missing dataset column: ${value}`);
    }
  };
  (plan.query.groupBy ?? []).forEach((column, index) => {
    ensureColumnExists(column, `query.groupBy[${index}]`);
    if (!outputColumns.has(column.toLowerCase())) {
      errors.push(`query.groupBy[${index}] must also appear in query.select: ${column}`);
    }
  });
  (plan.query.aggregates ?? []).forEach((aggregate, index) => {
    if (!aggregateSourceExists(aggregate.column, availableColumns)) {
      errors.push(`query.aggregates[${index}].column references missing dataset column: ${aggregate.column}`);
    }
    if (aggregate.as && !outputColumns.has(aggregate.as.toLowerCase())) {
      errors.push(`query.aggregates[${index}].as must appear in query.select: ${aggregate.as}`);
    }
  });
  (plan.query.select ?? []).forEach((column, index) => {
    const key = column.toLowerCase();
    if (!availableColumns.has(key) && !aliases.has(key)) {
      errors.push(`query.select[${index}] must reference a dataset column or aggregate alias: ${column}`);
    }
  });
  if (plan.queryMode === "aggregate") {
    if ((((_a = plan.query.groupBy) == null ? void 0 : _a.length) ?? 0) === 0) {
      errors.push("Aggregate evidence queries must include at least one groupBy column.");
    }
    if ((((_b = plan.query.aggregates) == null ? void 0 : _b.length) ?? 0) === 0) {
      errors.push("Aggregate evidence queries must include at least one aggregate clause.");
    }
  }
  if (plan.queryMode === "rowset" && (((_c = plan.query.select) == null ? void 0 : _c.length) ?? 0) < 2) {
    errors.push("Rowset evidence queries must expose at least two selected output columns.");
  }
  if (!plan.intentSummary.trim()) {
    errors.push("Evidence plan is missing required field: 'intentSummary'.");
  }
  (plan.preFilter ?? []).forEach((filter, index) => {
    ensureColumnExists(filter.column, `preFilter[${index}].column`);
  });
  return errors;
};
const isSemanticDimension = (columnName, profile, hints) => {
  var _a, _b;
  if (!hints || !profile) return false;
  if (!["categorical", "date", "time"].includes(profile.type)) return false;
  return ((_a = hints.knownDimensionColumns) == null ? void 0 : _a.includes(columnName)) === true || ((_b = hints.businessGrains) == null ? void 0 : _b.includes(columnName)) === true;
};
const isSemanticMetric = (columnName, profile, hints) => {
  var _a, _b;
  if (!hints || !profile) return false;
  if (!["numerical", "currency", "percentage"].includes(profile.type)) return false;
  return ((_a = hints.knownMetricColumns) == null ? void 0 : _a.includes(columnName)) === true || ((_b = hints.candidateMetrics) == null ? void 0 : _b.includes(columnName)) === true;
};
const validateTopicAlignment = (plan, columns, topic, intent, semanticHints, options) => {
  var _a, _b, _c, _d, _e, _f, _g, _h;
  const errors = [];
  const columnByName = new Map(columns.map((column) => [column.name, column]));
  const countIntent = COUNT_INTENT_PATTERN$1.test(normalizeString(topic));
  const preferredGroupByColumn = (intent == null ? void 0 : intent.preferredGroupBy) ? columnByName.get(intent.preferredGroupBy) : null;
  const preferredMetricColumn = (intent == null ? void 0 : intent.preferredMetric) ? columnByName.get(intent.preferredMetric) : null;
  const preferredGroupByLooksUsable = preferredGroupByColumn ? ["categorical", "date", "time"].includes(preferredGroupByColumn.type) : false;
  const preferredMetricLooksUsable = preferredMetricColumn ? ["numerical", "currency", "percentage"].includes(preferredMetricColumn.type) || countIntent && ["categorical", "date", "time"].includes(preferredMetricColumn.type) : false;
  const topicGroupingClause = extractTopicGroupingClause(normalizeString(topic));
  const candidateColumnNames = columns.map((column) => column.name);
  const topicGroupByTarget = inferTopicGroupByTarget$1(normalizeString(topic), candidateColumnNames);
  const topicCountOperandTarget = inferCountTopicOperandTarget$1(normalizeString(topic), candidateColumnNames);
  const targetTopicMatchScore = topicGroupingClause && topicGroupByTarget ? getTopicColumnMatchScore(topicGroupingClause, topicGroupByTarget) : Number.NEGATIVE_INFINITY;
  const preferredTopicMatchScore = topicGroupingClause && (intent == null ? void 0 : intent.preferredGroupBy) ? getTopicColumnMatchScore(topicGroupingClause, intent.preferredGroupBy) : Number.NEGATIVE_INFINITY;
  const targetIsDistinctTopicTarget = Boolean(
    topicGroupingClause && topicGroupByTarget && hasDistinctTopicTargetMention(topicGroupingClause, topicGroupByTarget, candidateColumnNames)
  );
  const preferredIsDistinctTopicTarget = Boolean(
    topicGroupingClause && (intent == null ? void 0 : intent.preferredGroupBy) && hasDistinctTopicTargetMention(topicGroupingClause, intent.preferredGroupBy, candidateColumnNames)
  );
  const recoveredExplicitTopicGroupBy = Boolean(
    topicGroupByTarget && ((_a = plan.query.groupBy) == null ? void 0 : _a[0]) === topicGroupByTarget && (intent == null ? void 0 : intent.preferredGroupBy) && intent.preferredGroupBy !== topicGroupByTarget && targetIsDistinctTopicTarget && !preferredIsDistinctTopicTarget && targetTopicMatchScore > preferredTopicMatchScore
  );
  const recoveredCountIntentSwap = Boolean(
    countIntent && topicGroupByTarget && topicCountOperandTarget && ((_b = plan.query.groupBy) == null ? void 0 : _b[0]) === topicGroupByTarget && ((_d = (_c = plan.query.aggregates) == null ? void 0 : _c[0]) == null ? void 0 : _d.column) === topicCountOperandTarget && ((intent == null ? void 0 : intent.preferredGroupBy) === topicCountOperandTarget || (intent == null ? void 0 : intent.preferredMetric) === topicGroupByTarget)
  );
  if (preferredGroupByLooksUsable && (intent == null ? void 0 : intent.preferredGroupBy) && ((_e = plan.query.groupBy) == null ? void 0 : _e[0]) && plan.query.groupBy[0] !== intent.preferredGroupBy && !recoveredCountIntentSwap && !recoveredExplicitTopicGroupBy) {
    if (!columnsShareTopicIdentity(plan.query.groupBy[0], intent.preferredGroupBy)) {
      if (!(options == null ? void 0 : options.lenient)) {
        errors.push(`Evidence query groupBy "${plan.query.groupBy[0]}" does not match runtime intent "${intent.preferredGroupBy}".`);
        return errors;
      }
    }
  }
  if (preferredMetricLooksUsable && (intent == null ? void 0 : intent.preferredMetric) && ((_g = (_f = plan.query.aggregates) == null ? void 0 : _f[0]) == null ? void 0 : _g.column) && plan.query.aggregates[0].column !== intent.preferredMetric && !recoveredCountIntentSwap) {
    if (!columnsShareTopicIdentity(plan.query.aggregates[0].column, intent.preferredMetric)) {
      if (!(options == null ? void 0 : options.lenient)) {
        errors.push(`Evidence query metric "${plan.query.aggregates[0].column}" does not match runtime intent "${intent.preferredMetric}".`);
        return errors;
      }
    }
  }
  const normalizedTopic = normalizeString(topic);
  if (!normalizedTopic) {
    return errors;
  }
  const dimensionColumns = columns.filter((column) => column.type === "categorical" || column.type === "date" || column.type === "time").map((column) => column.name);
  const mentionedDimensions = dimensionColumns.filter((column) => topicMentionsColumn$1(normalizedTopic, column));
  const groupByColumn = (_h = plan.query.groupBy) == null ? void 0 : _h[0];
  const topicGroupByTargetFromDimensions = inferTopicGroupByTarget$1(normalizedTopic, dimensionColumns);
  if (groupByColumn && topicGroupByTargetFromDimensions && groupByColumn !== topicGroupByTargetFromDimensions) {
    const groupingClause = extractTopicGroupingClause(normalizedTopic);
    const planGroupByIsValidAlternative = Boolean(
      groupingClause && topicMentionsColumn$1(groupingClause, groupByColumn) && hasDistinctTopicTargetMention(groupingClause, groupByColumn, candidateColumnNames)
    );
    if (!planGroupByIsValidAlternative && !(options == null ? void 0 : options.lenient)) {
      errors.push(`Evidence query groupBy "${groupByColumn}" does not match the topic grouping target "${topicGroupByTargetFromDimensions}".`);
      return errors;
    }
  }
  if (groupByColumn && mentionedDimensions.length > 0 && !mentionedDimensions.includes(groupByColumn)) {
    const groupingClause = extractTopicGroupingClause(normalizedTopic);
    const planGroupByIsValidAlternative = Boolean(
      groupingClause && topicMentionsColumn$1(groupingClause, groupByColumn) && hasDistinctTopicTargetMention(groupingClause, groupByColumn, candidateColumnNames)
    );
    if (!planGroupByIsValidAlternative && !(options == null ? void 0 : options.lenient)) {
      const profile = columnByName.get(groupByColumn);
      if (!isSemanticDimension(groupByColumn, profile, semanticHints)) {
        errors.push(`Evidence query groupBy "${groupByColumn}" does not match the topic wording. Expected one of: ${mentionedDimensions.join(", ")}`);
      }
    }
  }
  const aggregates = plan.query.aggregates ?? [];
  if (aggregates.length === 0) {
    return errors;
  }
  const mentionedColumns = columns.map((column) => column.name).filter((column) => topicMentionsColumn$1(normalizedTopic, column));
  const mentionedMetricColumns = mentionedColumns.filter((column) => column !== groupByColumn);
  const primaryAggregate = aggregates[0];
  if (!primaryAggregate) {
    return errors;
  }
  if (countIntent) {
    const specificCountTargets = mentionedMetricColumns.filter(
      (column) => !GENERIC_COUNT_TOPIC_PATTERN.test(column) && !columnsShareTopicIdentity(column, groupByColumn) && !columnsShareTopicIdentity(column, topicGroupByTargetFromDimensions)
    );
    if (specificCountTargets.length > 0) {
      if (!primaryAggregate.column) {
        errors.push(`Count topic mentions ${specificCountTargets.join(", ")}, but the evidence query uses COUNT(*) instead of that column.`);
      } else if (!specificCountTargets.includes(primaryAggregate.column)) {
        errors.push(`Count topic mentions ${specificCountTargets.join(", ")}, but the evidence query counts "${primaryAggregate.column}" instead.`);
      }
    }
    return errors;
  }
  if (primaryAggregate.function !== "count" && primaryAggregate.function !== "count_distinct" && mentionedMetricColumns.length > 0 && primaryAggregate.column && !mentionedMetricColumns.includes(primaryAggregate.column)) {
    const hasSemanticRelation = mentionedMetricColumns.some(
      (column) => columnsShareTopicIdentity(column, primaryAggregate.column)
    );
    if (!hasSemanticRelation) {
      const metricProfile = columnByName.get(primaryAggregate.column);
      if (!isSemanticMetric(primaryAggregate.column, metricProfile, semanticHints)) {
        errors.push(`Evidence query metric "${primaryAggregate.column}" does not match the topic wording. Expected one of: ${mentionedMetricColumns.join(", ")}`);
      }
    }
  }
  if (primaryAggregate.column && primaryAggregate.function === "sum" && topicPrefersAverageAggregation(
    topic,
    primaryAggregate.column,
    columnByName.get(primaryAggregate.column) ?? null
  )) {
    errors.push(`Evidence query metric "${primaryAggregate.column}" is ratio-like for topic "${topic}", so the aggregate function must be AVG instead of SUM.`);
  }
  return errors;
};
const collectEvidencePlanStabilityReasonCodes = (plan, columns, options) => {
  var _a, _b, _c;
  const reasonCodes = /* @__PURE__ */ new Set();
  const topic = options == null ? void 0 : options.topic;
  const intent = options == null ? void 0 : options.intent;
  const groupByColumn = ((_a = plan.query.groupBy) == null ? void 0 : _a[0]) ?? null;
  const metricColumn = ((_c = (_b = plan.query.aggregates) == null ? void 0 : _b[0]) == null ? void 0 : _c.column) ?? null;
  if (!intent || !topic) {
    return [];
  }
  const candidateColumnNames = columns.map((column) => column.name);
  const topicGroupByTarget = inferTopicGroupByTarget$1(topic, candidateColumnNames);
  const topicGroupingClause = extractTopicGroupingClause(topic);
  const targetTopicMatchScore = topicGroupingClause && topicGroupByTarget ? getTopicColumnMatchScore(topicGroupingClause, topicGroupByTarget) : Number.NEGATIVE_INFINITY;
  const preferredTopicMatchScore = topicGroupingClause && intent.preferredGroupBy ? getTopicColumnMatchScore(topicGroupingClause, intent.preferredGroupBy) : Number.NEGATIVE_INFINITY;
  const targetIsDistinctTopicTarget = Boolean(
    topicGroupingClause && topicGroupByTarget && hasDistinctTopicTargetMention(topicGroupingClause, topicGroupByTarget, candidateColumnNames)
  );
  const preferredIsDistinctTopicTarget = Boolean(
    topicGroupingClause && intent.preferredGroupBy && hasDistinctTopicTargetMention(topicGroupingClause, intent.preferredGroupBy, candidateColumnNames)
  );
  const topicCountOperandTarget = inferCountTopicOperandTarget$1(topic, candidateColumnNames);
  if (COUNT_INTENT_PATTERN$1.test(normalizeString(topic)) && topicGroupByTarget && topicCountOperandTarget && groupByColumn === topicGroupByTarget && metricColumn === topicCountOperandTarget && (intent.preferredGroupBy === topicCountOperandTarget || intent.preferredMetric === topicGroupByTarget)) {
    reasonCodes.add(PLANNER_STABILITY_REASON_CODES.intentMismatchRecovered);
  }
  if (intent.preferredGroupBy && intent.preferredMetric && groupByColumn && metricColumn && intent.preferredGroupBy === metricColumn && intent.preferredMetric === groupByColumn) {
    reasonCodes.add(PLANNER_STABILITY_REASON_CODES.intentMismatchRecovered);
  }
  if (intent.preferredGroupBy && groupByColumn && intent.preferredGroupBy !== groupByColumn && topicGroupByTarget && topicGroupByTarget === groupByColumn && targetIsDistinctTopicTarget && !preferredIsDistinctTopicTarget && targetTopicMatchScore > preferredTopicMatchScore) {
    reasonCodes.add(PLANNER_STABILITY_REASON_CODES.intentMismatchRecovered);
  }
  if (intent.preferredMetric && metricColumn && intent.preferredMetric !== metricColumn && topicMentionsColumn$1(topic, metricColumn) && !topicMentionsColumn$1(topic, intent.preferredMetric)) {
    reasonCodes.add(PLANNER_STABILITY_REASON_CODES.intentMismatchRecovered);
  }
  if (intent.preferredGroupBy && groupByColumn && intent.preferredGroupBy !== groupByColumn && columnsShareTopicIdentity(groupByColumn, intent.preferredGroupBy)) {
    reasonCodes.add(PLANNER_STABILITY_REASON_CODES.intentMismatchRecovered);
  }
  if (intent.preferredMetric && metricColumn && intent.preferredMetric !== metricColumn && columnsShareTopicIdentity(metricColumn, intent.preferredMetric)) {
    reasonCodes.add(PLANNER_STABILITY_REASON_CODES.intentMismatchRecovered);
  }
  if (groupByColumn && topicGroupByTarget && groupByColumn !== topicGroupByTarget && topicGroupingClause && topicMentionsColumn$1(topicGroupingClause, groupByColumn) && hasDistinctTopicTargetMention(topicGroupingClause, groupByColumn, candidateColumnNames)) {
    reasonCodes.add(PLANNER_STABILITY_REASON_CODES.intentMismatchRecovered);
  }
  return [...reasonCodes];
};
const repairQuarterSemanticDrift = (plan, columns, topic, periodFamilies) => {
  const repairs = [];
  if (!topic || periodFamilies.length === 0) {
    return { repaired: false, repairs };
  }
  const quarterIntent = detectQuarterIntent(topic, periodFamilies);
  if (!quarterIntent || quarterIntent.monthColumns.length < 2) {
    return { repaired: false, repairs };
  }
  const requiredColumns = quarterIntent.monthColumns;
  const requiredColumnsLower = new Set(requiredColumns.map((c) => c.toLowerCase()));
  for (const aggregate of plan.query.aggregates ?? []) {
    if (!aggregate.column || aggregate.function !== "sum") continue;
    const missing = findMissingQuarterColumns(aggregate.column, quarterIntent);
    if (missing.length > 0 && missing.length < requiredColumns.length) {
      const fullExpression = requiredColumns.join(" + ");
      repairs.push(
        `Expanded aggregate "${aggregate.as}" column from "${aggregate.column}" to "${fullExpression}" to cover full ${quarterIntent.quarter}`
      );
      aggregate.column = fullExpression;
    } else if (missing.length === requiredColumns.length) {
      const colLower = aggregate.column.trim().toLowerCase();
      if (requiredColumnsLower.has(colLower)) {
        const fullExpression = requiredColumns.join(" + ");
        repairs.push(
          `Expanded single-month aggregate "${aggregate.as}" from "${aggregate.column}" to "${fullExpression}" to cover full ${quarterIntent.quarter}`
        );
        aggregate.column = fullExpression;
      }
    }
  }
  const quarterLabel = quarterIntent.year ? `${quarterIntent.quarter} ${quarterIntent.year}` : quarterIntent.quarter;
  for (const monthCol of requiredColumns) {
    const monthPattern = new RegExp(`\\b${escapeRegex(monthCol)}\\b`, "gi");
    if (monthPattern.test(plan.title)) {
      const oldTitle = plan.title;
      plan.title = plan.title.replace(monthPattern, quarterLabel);
      repairs.push(`Repaired title from "${oldTitle}" to "${plan.title}" to reflect full ${quarterIntent.quarter}`);
      break;
    }
  }
  for (const monthCol of requiredColumns) {
    const monthPattern = new RegExp(`\\b${escapeRegex(monthCol)}\\b`, "gi");
    if (monthPattern.test(plan.intentSummary)) {
      plan.intentSummary = plan.intentSummary.replace(monthPattern, quarterLabel);
      repairs.push(`Repaired intentSummary to reflect full ${quarterIntent.quarter}`);
      break;
    }
  }
  return { repaired: repairs.length > 0, repairs };
};
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normalizeAndValidateSqlEvidenceQueryPlan = (rawPlan, columns, options) => {
  var _a;
  if (!isObject(rawPlan) || !isObject(rawPlan.query)) {
    return { validPlan: null, errors: ["Evidence query plan must include an object-shaped query field."] };
  }
  const plan = {
    title: normalizeString(rawPlan.title),
    queryMode: normalizeString(rawPlan.queryMode) === "rowset" ? "rowset" : "aggregate",
    query: rawPlan.query,
    intentSummary: normalizeString(rawPlan.intentSummary),
    preferredResultShape: normalizeString(rawPlan.preferredResultShape),
    preFilter: normalizeEvidencePreFilter(rawPlan.preFilter)
  };
  const errors = [];
  if (!plan.title) errors.push("Evidence plan is missing required field: 'title'.");
  plan.query = normalizeEvidenceQuery(plan);
  const aliasRepair = repairAggregateAliasConflicts(plan.query);
  if (aliasRepair.repaired) {
    console.debug("[SqlPlanValidator] Auto-repaired evidence plan aggregate aliases:", aliasRepair.repairs.join("; "));
  }
  const selectRepair = repairEvidenceQuerySelectAlignment(plan.query);
  if (selectRepair.repaired) {
    console.debug("[SqlPlanValidator] Auto-repaired evidence plan select alignment:", selectRepair.repairs.join("; "));
  }
  if ((options == null ? void 0 : options.periodFamilies) && options.periodFamilies.length > 0) {
    const quarterRepair = repairQuarterSemanticDrift(plan, columns, options.topic, options.periodFamilies);
    if (quarterRepair.repaired) {
      console.debug("[SqlPlanValidator] Auto-repaired quarter semantic drift:", quarterRepair.repairs.join("; "));
    }
  }
  errors.push(...validateEvidenceQuery(plan, columns));
  errors.push(...validateTopicAlignment(plan, columns, options == null ? void 0 : options.topic, options == null ? void 0 : options.intent, options == null ? void 0 : options.semanticHints, { lenient: options == null ? void 0 : options.lenient }));
  if ((((_a = plan.query.select) == null ? void 0 : _a.length) ?? 0) === 0) {
    errors.push("The evidence query plan must expose at least one selected output column.");
  }
  return errors.length > 0 ? { validPlan: null, errors } : { validPlan: plan, errors: [] };
};
class SqlAutoAnalysisError extends Error {
  constructor(code, message, detail) {
    super(message);
    this.name = "SqlAutoAnalysisError";
    this.code = code;
    this.detail = detail;
  }
}
const isSqlAutoAnalysisError = (value) => value instanceof SqlAutoAnalysisError;
const normalizeAggregation = (aggregation, valueColumn) => {
  if (!aggregation && valueColumn) return "sum";
  if (!aggregation && !valueColumn) return "count";
  if (aggregation === "average") return "avg";
  if (aggregation === "sum" || aggregation === "count" || aggregation === "avg") {
    return aggregation;
  }
  return void 0;
};
const preparePlan = (rawPlan) => {
  const plan = { ...rawPlan };
  plan.title = plan.title || "AI Generated Analysis";
  plan.description = plan.description || `Analysis of ${plan.title}.`;
  plan.chartType = resolveAiChartType(plan.chartType);
  plan.aggregation = normalizeAggregation(plan.aggregation, plan.valueColumn);
  if (plan.chartType !== "scatter" && !plan.groupByColumn && plan.valueColumn) {
    plan.groupByColumn = plan.valueColumn;
  }
  return plan;
};
const LOG_PREFIX$3 = "[PlanGenerator]";
const MAX_ATTEMPTS = 3;
const PLAN_GENERATION_TIMEOUT_MS = 3e4;
class PlanGenerationTimeoutError extends Error {
  constructor(ms) {
    super(`Plan generation model call timed out after ${ms}ms`);
    this.name = "PlanGenerationTimeoutError";
  }
}
const isPlanGenerationTimeout = (e) => e instanceof PlanGenerationTimeoutError;
const raceWithPlanTimeout = (promise, ms) => {
  let handle;
  const timer = new Promise((_, reject) => {
    handle = setTimeout(() => reject(new PlanGenerationTimeoutError(ms)), ms);
  });
  return Promise.race([promise, timer]).finally(() => clearTimeout(handle));
};
const buildDeterministicTopics = (columns, datasetContext) => {
  var _a, _b, _c, _d, _e;
  const blockedSet = new Set(datasetContext.blockedDimensions ?? []);
  const avoidedDimensions = new Set(datasetContext.avoidGrainColumns ?? []);
  const safeDimensionSet = new Set(datasetContext.dimensionColumns ?? []);
  const availableColumnSet = new Set(columns.map((column) => column.name));
  const dims = columns.filter((c) => ["categorical", "date", "time"].includes(c.type)).filter((c) => safeDimensionSet.size === 0 || safeDimensionSet.has(c.name)).filter((c) => !blockedSet.has(c.name)).filter((c) => !avoidedDimensions.has(c.name)).sort((a, b) => (b.uniqueValues ?? 0) - (a.uniqueValues ?? 0)).slice(0, 3);
  const avoidedMetrics = new Set(datasetContext.avoidMetricColumns ?? []);
  const preferredMetric = (datasetContext.preferredMetricTerms ?? []).find(
    (column) => availableColumnSet.has(column) && !avoidedMetrics.has(column) && !isStructuralMetadataColumn(column)
  );
  const metric = preferredMetric ?? ((_a = datasetContext.metricColumns) == null ? void 0 : _a.find((column) => !avoidedMetrics.has(column))) ?? ((_b = columns.find(
    (c) => ["numerical", "currency", "percentage"].includes(c.type) && !avoidedMetrics.has(c.name) && !isStructuralMetadataColumn(c.name)
  )) == null ? void 0 : _b.name) ?? ((_c = datasetContext.metricColumns) == null ? void 0 : _c.find((column) => !isStructuralMetadataColumn(column))) ?? ((_d = columns.find(
    (c) => ["numerical", "currency", "percentage"].includes(c.type) && !isStructuralMetadataColumn(c.name)
  )) == null ? void 0 : _d.name);
  if (!metric || dims.length === 0) return [];
  const topics = dims.map((dim) => `${metric} by ${dim.name}`);
  const periodFamilies = (_e = datasetContext.analysisSteering) == null ? void 0 : _e.periodColumnFamilies;
  if (periodFamilies && periodFamilies.length > 0) {
    const timeDim = dims.find((d) => isTimeLikeDimensionColumn(d.name));
    if (timeDim && !topics.some((t) => /\b(trend|over time|monthly)\b/i.test(t))) {
      topics.push(`${metric} monthly trend by ${timeDim.name}`);
    }
  }
  return topics;
};
const extractSemanticHints = (ctx) => {
  var _a, _b, _c, _d;
  if (!ctx) return void 0;
  const hints = {};
  if ((_a = ctx.metricColumns) == null ? void 0 : _a.length) hints.knownMetricColumns = ctx.metricColumns;
  if ((_b = ctx.dimensionColumns) == null ? void 0 : _b.length) hints.knownDimensionColumns = ctx.dimensionColumns;
  if ((_c = ctx.businessGrains) == null ? void 0 : _c.length) hints.businessGrains = ctx.businessGrains;
  if ((_d = ctx.preferredMetricTerms) == null ? void 0 : _d.length) hints.candidateMetrics = ctx.preferredMetricTerms;
  return Object.keys(hints).length > 0 ? hints : void 0;
};
const TIME_INTENT_PATTERN = /\b(trend|over time|time|month|monthly|quarter|quarterly|year|yearly|period|daily|weekly|mom|yoy|qoq)\b/i;
const COUNT_INTENT_PATTERN = /\b(count|counts|number of|numbers of|how many|frequency|occurrence|occurrences)\b/i;
const IDENTIFIER_LIKE_COLUMN_PATTERN = /\b(id|ids|code|codes|number|numbers|no|ref|reference|order)\b/i;
const normalizeText = (value) => value.trim().toLowerCase();
const normalizeTopicText = (value) => value.trim().toLowerCase().replace(/\bno\.\b/g, "number ").replace(/[_/.-]+/g, " ").replace(/\s+/g, " ").trim();
const normalizeColumnWords = (value) => normalizeTopicText(
  value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2").replace(/([a-zA-Z])(\d)/g, "$1 $2").replace(/(\d)([a-zA-Z])/g, "$1 $2")
);
const normalizeColumnKey = (value) => normalizeColumnWords(value).replace(/\s+/g, " ").trim();
const stripColumnQuotes = (value) => value.trim().replace(/^["'`\[]+|["'`\]]+$/g, "").trim();
const buildColumnNameMap = (columns) => new Map(
  columns.map((column) => [normalizeColumnKey(column.name), column.name])
);
const resolveExactColumnMatch = (candidate, columnNameMap) => {
  if (!candidate) {
    return null;
  }
  return columnNameMap.get(normalizeColumnKey(stripColumnQuotes(candidate))) ?? null;
};
const parseSteppedPredicateLine = (line, columnNameMap) => {
  var _a, _b;
  const match = line.match(/^\s*(?:"([^"]+)"|'([^']+)'|`([^`]+)`|\[([^\]]+)\]|([^=<>]+?))\s*(=|<>|!=)\s*(.+?)\s*$/);
  if (!match) {
    return { predicate: null };
  }
  const rawColumn = ((_a = [match[1], match[2], match[3], match[4], match[5]].find(Boolean)) == null ? void 0 : _a.trim()) ?? "";
  const mappedColumn = resolveExactColumnMatch(rawColumn, columnNameMap);
  if (!mappedColumn) {
    return {
      predicate: null,
      error: `Unknown filter column "${rawColumn}" in stepped planner filter response.`
    };
  }
  const rawValue = ((_b = match[7]) == null ? void 0 : _b.trim()) ?? "";
  const normalizedValue = rawValue.replace(/^["'`](.*)["'`]$/s, "$1").trim();
  return {
    predicate: {
      column: mappedColumn,
      operator: match[6] === "=" ? "eq" : "neq",
      value: normalizedValue
    }
  };
};
const singularizeToken = (token) => {
  if (token.length <= 3) return token;
  if (token.endsWith("ies") && token.length > 4) {
    return `${token.slice(0, -3)}y`;
  }
  if (token.endsWith("es") && token.length > 4) {
    return token.slice(0, -2);
  }
  if (token.endsWith("s") && !token.endsWith("ss")) {
    return token.slice(0, -1);
  }
  return token;
};
const tokenizeForTopicMatch = (value) => normalizeTopicText(value).split(" ").map((token) => singularizeToken(token.trim())).filter((token) => token.length >= 2);
const topicMentionsColumn = (topic, column) => {
  const normalizedTopic = normalizeTopicText(topic);
  const normalizedColumn = normalizeColumnWords(column);
  const rawColumn = normalizeText(column);
  if (!normalizedTopic || !normalizedColumn) {
    return false;
  }
  if (rawColumn && normalizedTopic.includes(rawColumn)) {
    return true;
  }
  if (normalizedTopic.includes(normalizedColumn)) {
    return true;
  }
  const columnTokens = tokenizeForTopicMatch(normalizedColumn);
  if (columnTokens.length === 0) {
    return false;
  }
  const topicTokens = new Set(tokenizeForTopicMatch(normalizedTopic));
  return columnTokens.every((token) => topicTokens.has(token));
};
const inferTopicGroupByTarget = (topic, candidates) => {
  var _a;
  const normalizedTopic = normalizeTopicText(topic);
  const byMatch = normalizedTopic.match(/\b(?:by|per)\s+(.+)$/);
  if (!byMatch) {
    return null;
  }
  const tail = (_a = byMatch[1]) == null ? void 0 : _a.trim();
  if (!tail) {
    return null;
  }
  return candidates.find((candidate) => topicMentionsColumn(tail, candidate)) ?? null;
};
const inferCountTopicOperandTarget = (topic, candidates) => {
  const normalizedTopic = normalizeTopicText(topic);
  if (!COUNT_INTENT_PATTERN.test(normalizedTopic)) {
    return null;
  }
  const head = normalizedTopic.replace(/\b(?:by|per)\s+.+$/, "").trim();
  if (!head) {
    return null;
  }
  return candidates.find((candidate) => topicMentionsColumn(head, candidate)) ?? null;
};
const suggestAlternativeDimensions = (columns, learningHints) => {
  const blocked = new Set(((learningHints == null ? void 0 : learningHints.avoidGroupBys) ?? []).map((value) => value.toLowerCase()));
  return columns.filter((column) => column.type === "categorical" || column.type === "date" || column.type === "time").filter((column) => !blocked.has(column.name.toLowerCase())).sort((left, right) => (left.uniqueValues ?? Number.MAX_SAFE_INTEGER) - (right.uniqueValues ?? Number.MAX_SAFE_INTEGER)).slice(0, 6).map((column) => column.name);
};
const classifyCompileFailure = (message) => message.toLowerCase().includes("query") || message.toLowerCase().includes("duckdb") ? "sql_compile_failed" : "planning_invalid";
const isTopicBlockedBySemanticUnderstanding = (topic, datasetContext) => (datasetContext.blockedDimensions ?? []).some((column) => topicMentionsColumn(topic, column));
const isTopicDeprioritizedByQualityGovernance = (topic, datasetContext) => {
  const avoidColumns = /* @__PURE__ */ new Set([
    ...datasetContext.avoidGrainColumns ?? [],
    ...datasetContext.avoidMetricColumns ?? []
  ]);
  return Array.from(avoidColumns).some((column) => topicMentionsColumn(topic, column));
};
const buildDatasetOverviewText = (datasetContext) => `Dataset title: ${datasetContext.title || "Unknown Report"}
Report title: ${datasetContext.reportTitle || datasetContext.title || "Unknown Report"}
Report shape: ${datasetContext.reportShapeKind || "unknown"}
Header hint: ${datasetContext.headerHintPreview || "No candidate header hint was detected."}
Total rows: ${datasetContext.rowCount ?? "N/A"}
Report parameters:
${datasetContext.parameterPreview || "No parameter lines were detected."}
Metadata:
${datasetContext.metadataPreview || "No metadata or notes were detected."}
Footer / notes:
${datasetContext.footerPreview || "No footer lines were detected."}
Summary highlights:
${datasetContext.summaryPreview || "No summary rows were detected."}`;
const buildPlanningHintsText = (datasetContext) => {
  var _a, _b, _c, _d, _e, _f, _g, _h;
  const lines = [];
  const steeringSummary = formatAnalysisSteeringBundle(datasetContext.analysisSteering);
  if ((_a = datasetContext.businessGrains) == null ? void 0 : _a.length) {
    lines.push(`Use these groupBy dimensions: ${datasetContext.businessGrains.join(", ")}`);
  }
  if ((_b = datasetContext.preferredTimeColumns) == null ? void 0 : _b.length) {
    lines.push(`Time columns for trends: ${datasetContext.preferredTimeColumns.join(", ")}`);
  }
  if ((_c = datasetContext.preferredMetricTerms) == null ? void 0 : _c.length) {
    lines.push(`Key metrics: ${datasetContext.preferredMetricTerms.join(", ")}`);
  }
  if ((_d = datasetContext.blockedDimensions) == null ? void 0 : _d.length) {
    lines.push(`Do NOT groupBy: ${datasetContext.blockedDimensions.join(", ")}`);
  }
  if ((_e = datasetContext.avoidGrainColumns) == null ? void 0 : _e.length) {
    lines.push(`Avoid low-quality dimensions for automatic analysis: ${datasetContext.avoidGrainColumns.join(", ")}`);
  }
  if ((_f = datasetContext.avoidMetricColumns) == null ? void 0 : _f.length) {
    lines.push(`Avoid risky metrics for automatic analysis: ${datasetContext.avoidMetricColumns.join(", ")}`);
  }
  if (datasetContext.qualityHintsSummary) {
    lines.push(`Quality governance summary: ${datasetContext.qualityHintsSummary}`);
  }
  if (datasetContext.headerSemantics) {
    lines.push(`Report context: ${datasetContext.headerSemantics}`);
  }
  if ((_g = datasetContext.suggestedDerivedTopics) == null ? void 0 : _g.length) {
    lines.push(`Detected metric relationships (A - B ≈ C) — consider including derived metric topics:`);
    datasetContext.suggestedDerivedTopics.forEach((t) => lines.push(`  - ${t}`));
  }
  if ((_h = datasetContext.pivotOnlyCombinations) == null ? void 0 : _h.length) {
    lines.push(`High-cardinality dimension pairs — use pivot chart type, NOT flat bar chart:`);
    datasetContext.pivotOnlyCombinations.forEach(
      (c) => lines.push(`  - ${c.dimA} × ${c.dimB} (${c.product} combinations)`)
    );
  }
  if (steeringSummary) {
    lines.push(`Structured steering bundle:
${steeringSummary}`);
  }
  return lines.join("\n") || "No specific planning hints.";
};
const createPlannerSections = (columns, datasetContext, sampleData, learningHints, explorationContext, harnessSummary) => {
  var _a, _b;
  return [
    createContextSection("dataset_overview", buildDatasetOverviewText(datasetContext), "high", "sticky"),
    createContextSection("column_roles", `Dimensions: ${datasetContext.dimensionColumns.join(", ") || "None detected"}
Metrics: ${datasetContext.metricColumns.join(", ") || "None detected"}`, "high", "sticky"),
    createContextSection("planning_hints", buildPlanningHintsText(datasetContext), "high", "sticky"),
    ...datasetContext.analysisSteering ? [createContextSection("analysis_steering", formatAnalysisSteeringBundle(datasetContext.analysisSteering) ?? "No structured steering bundle.", "high", "sticky")] : [],
    createContextSection("dataset_columns", `Available columns:
${formatColumnNames(columns)}`, "required", "sticky"),
    createContextSection("column_display_hints", `User-facing column label hints:
${formatColumnDisplayHints(columns)}`, "high", "sticky"),
    createContextSection("sample_data", `Sample data:
${formatRows(trimRawDataSample(sampleData, 20))}`, "high", "prunable"),
    ...explorationContext ? [
      createContextSection("data_exploration_results", explorationContext, "high", "prunable")
    ] : [],
    // Harness investigation summary is compact and critical — keep it sticky
    // so it's never pruned by context budget even when exploration context is dropped.
    ...harnessSummary ? [
      createContextSection("harness_investigation", harnessSummary, "high", "sticky")
    ] : [],
    createContextSection(
      "learning_hints",
      [
        ((_a = learningHints == null ? void 0 : learningHints.avoidGroupBys) == null ? void 0 : _a.length) ? `Avoid weak groupings: ${learningHints.avoidGroupBys.join(", ")}` : "",
        ((_b = learningHints == null ? void 0 : learningHints.preferGroupBys) == null ? void 0 : _b.length) ? `Historically useful groupings: ${learningHints.preferGroupBys.join(", ")}` : ""
      ].filter(Boolean).join("\n") || "No prior learning hints available.",
      "medium",
      "prunable"
    )
  ];
};
const inferPreferredResultShape = (topic, datasetContext) => {
  var _a;
  if ((((_a = datasetContext == null ? void 0 : datasetContext.preferredTimeColumns) == null ? void 0 : _a.length) ?? 0) > 0 && TIME_INTENT_PATTERN.test(topic)) {
    return "time_series";
  }
  if (/scatter|relationship|correlation/i.test(topic)) {
    return "rowset_scatter_candidate";
  }
  return "ranked_aggregate";
};
const rankAnalysisTopics = (topics, datasetContext) => Array.from(new Set(topics.map((t) => t.trim()).filter(Boolean))).filter((topic) => !isTopicBlockedBySemanticUnderstanding(topic, datasetContext)).sort((a, b) => {
  const aDeprioritized = isTopicDeprioritizedByQualityGovernance(a, datasetContext) ? 1 : 0;
  const bDeprioritized = isTopicDeprioritizedByQualityGovernance(b, datasetContext) ? 1 : 0;
  return aDeprioritized - bDeprioritized;
});
const generateAnalysisTopics = async (columns, sampleData, settings, goal, datasetContext, telemetryTarget, explorationContext, harnessSummary, existingCardTitles, _options) => {
  const effectiveTimeout = PLAN_GENERATION_TIMEOUT_MS;
  const abortSignal = _options == null ? void 0 : _options.abortSignal;
  const { model, modelId } = createProviderModel(settings, settings.complexModel);
  const systemPrompt = buildAnalysisPlannerSystemPrompt("topics");
  const hardBlockedDimensions = new Set(datasetContext.blockedDimensions ?? []);
  const availableDimensions = datasetContext.dimensionColumns.filter(
    (d) => !hardBlockedDimensions.has(d)
  );
  const blockedDimensionCount = datasetContext.dimensionColumns.length - availableDimensions.length;
  const effectiveDimensionCount = availableDimensions.length + Math.ceil(blockedDimensionCount * 0.5);
  const [minTopics, maxTopics] = resolveAnalysisTopicRange(datasetContext, effectiveDimensionCount);
  const deterministicTopics = buildDeterministicTopics(columns, datasetContext);
  const priorAnalysisSections = (existingCardTitles == null ? void 0 : existingCardTitles.length) ? [createContextSection("prior_analysis", `Already completed analysis cards (do NOT repeat these):
${existingCardTitles.map((t) => `- ${t}`).join("\n")}`, "high", "sticky")] : [];
  try {
    const result = await raceWithPlanTimeout(
      runWithOverflowCompaction({
        provider: settings.provider,
        abortSignal,
        execute: async (compactionMode) => {
          throwIfAborted(abortSignal);
          const managed = await prepareManagedContext({
            callType: "planner",
            systemText: systemPrompt,
            baseUserText: "Generate SQL-safe automatic analysis topics for this dataset.",
            sections: [...createPlannerSections(columns, datasetContext, sampleData, void 0, explorationContext, harnessSummary), ...priorAnalysisSections],
            settings,
            modelId,
            compactionMode
          });
          reportContextDiagnostics(telemetryTarget, managed.diagnostics);
          return withTransientRetry(
            (fb) => generateText({
              model: fb ?? model,
              messages: [
                { role: "system", content: managed.systemText },
                {
                  role: "user",
                  content: createAnalysisTopicsPrompt(
                    managed.userText,
                    goal,
                    availableDimensions,
                    existingCardTitles
                  )
                }
              ],
              abortSignal,
              output: output_exports.object({ schema: jsonSchema(prepareSchemaForProvider(createAnalysisTopicsSchema(minTopics, maxTopics), settings.provider)) })
            }),
            { settings, primaryModelId: modelId, label: "planGenerator.topics", abortSignal }
          );
        }
      }),
      effectiveTimeout
    );
    const parsed = result.output !== void 0 ? result.output : robustlyParseJsonObject(result.text);
    const rankedTopics = rankAnalysisTopics(parsed.topics || [], datasetContext);
    if (rankedTopics.length > 0 || deterministicTopics.length === 0) {
      return rankedTopics;
    }
    console.warn(`${LOG_PREFIX$3} generateAnalysisTopics returned no executable topics, using deterministic fallback.`);
    return deterministicTopics;
  } catch (error) {
    if (isRuntimeAbortError(error, abortSignal)) throw error;
    if (!isPlanGenerationTimeout(error)) throw error;
    console.warn(`${LOG_PREFIX$3} generateAnalysisTopics timed out (first attempt), retrying with simplified prompt.`);
    try {
      const colList = columns.map((c) => `${c.name} (${c.type})`).join(", ");
      const text = await raceWithPlanTimeout(
        callSmallAiStep(
          settings,
          'You are a data analyst. Generate SQL-safe analysis topics. Return JSON only: {"topics": [...]}.',
          `Goal: ${goal ?? "Explore the data"}
Columns: ${colList}
Return 3-5 topics as JSON.`,
          abortSignal
        ),
        effectiveTimeout
      );
      const parsed = robustlyParseJsonObject(text);
      const rankedTopics = rankAnalysisTopics(parsed.topics || [], datasetContext);
      if (rankedTopics.length > 0 || deterministicTopics.length === 0) {
        return rankedTopics;
      }
      console.warn(`${LOG_PREFIX$3} generateAnalysisTopics simplified retry returned no executable topics, using deterministic fallback.`);
      return deterministicTopics;
    } catch (retryError) {
      if (isPlanGenerationTimeout(retryError)) {
        console.warn(`${LOG_PREFIX$3} generateAnalysisTopics retry also timed out, using deterministic fallback.`);
        return deterministicTopics;
      }
      throw retryError;
    }
  }
};
const resolveAnalysisTopicRange = (datasetContext, availableDimensionCount) => {
  const dimCount = availableDimensionCount ?? datasetContext.dimensionColumns.filter(
    (d) => !(datasetContext.blockedDimensions ?? []).includes(d)
  ).length;
  const baseRange = dimCount <= 1 ? [1, 2] : dimCount <= 2 ? [2, 4] : [4, 8];
  const steering = datasetContext.analysisSteering;
  const signalConfidence = (steering == null ? void 0 : steering.signalConfidence) ?? "medium";
  const reportShapeClass = (steering == null ? void 0 : steering.reportShapeClass) ?? "detail_table";
  if (signalConfidence === "low") {
    return dimCount <= 1 ? [1, 1] : [1, Math.min(3, baseRange[1])];
  }
  if (reportShapeClass === "hierarchical_statement" || reportShapeClass === "wide_pivot") {
    return [Math.min(baseRange[0], 2), Math.min(4, baseRange[1])];
  }
  if (signalConfidence === "high" && reportShapeClass === "detail_table" && dimCount >= 3) {
    return [baseRange[0], Math.min(10, baseRange[1] + 1)];
  }
  return baseRange;
};
const generateEvidenceQueryPlanWithRetry = async (topic, columns, settings, learningHints, telemetryTarget, retryFeedback, datasetContext, sampleData = [], explorationContext, harnessSummary, planningIntent, _options) => {
  var _a, _b, _c;
  const effectiveTimeout = PLAN_GENERATION_TIMEOUT_MS;
  const abortSignal = _options == null ? void 0 : _options.abortSignal;
  const allColumnNames = columns.map((column) => column.name);
  const periodFamilies = detectPeriodColumnFamilies(allColumnNames);
  const preferredDimensions = suggestAlternativeDimensions(columns, learningHints);
  const plannerDatasetContext = datasetContext ?? {
    title: "Dataset",
    dimensionColumns: preferredDimensions,
    metricColumns: columns.filter((column) => ["numerical", "currency", "percentage"].includes(column.type)).map((column) => column.name),
    preferredGrainColumns: preferredDimensions,
    preferredMetricTerms: columns.filter((column) => ["numerical", "currency", "percentage"].includes(column.type)).map((column) => column.name)
  };
  let lastError = retryFeedback;
  const planningIntentSummary = [
    (planningIntent == null ? void 0 : planningIntent.preferredGroupBy) ? `Preferred groupBy from runtime hypothesis: ${planningIntent.preferredGroupBy}` : "",
    (planningIntent == null ? void 0 : planningIntent.preferredMetric) ? `Preferred metric from runtime hypothesis: ${planningIntent.preferredMetric}` : "",
    (planningIntent == null ? void 0 : planningIntent.preferredFilterIntent) ? `Preferred filter intent from runtime hypothesis: ${planningIntent.preferredFilterIntent}` : ""
  ].filter(Boolean).join("\n");
  let lastFailureCategory = "unknown";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const strategyDirective = attempt === 1 ? "" : attempt === 2 && lastFailureCategory === "structural" ? "\n\nIMPORTANT: The previous attempt had structural issues. Use a SIMPLER query shape: one groupBy column, one aggregate, and ensure every aggregate alias appears in query.select. Do NOT attempt multi-aggregate plans." : attempt === 2 ? "\n\nIMPORTANT: The previous attempt failed. Simplify the query: use a single primary metric, one groupBy dimension, and keep the plan minimal." : "\n\nCRITICAL: This is the final attempt. Use the SIMPLEST possible query: one groupBy, one SUM/COUNT aggregate, include all selected columns explicitly. Do NOT use complex multi-aggregate or derived-column patterns.";
    console.log(`${LOG_PREFIX$3} Generating evidence query plan for topic "${topic}", attempt ${attempt}/${MAX_ATTEMPTS}${attempt > 1 ? ` (strategy: ${lastFailureCategory})` : ""}`);
    try {
      const { model, modelId } = createProviderModel(settings, settings.complexModel);
      const result = await raceWithPlanTimeout(
        runWithOverflowCompaction({
          provider: settings.provider,
          abortSignal,
          execute: async (compactionMode) => {
            throwIfAborted(abortSignal);
            const managed = await prepareManagedContext({
              callType: "planner",
              systemText: buildAnalysisPlannerSystemPrompt("evidence_query"),
              baseUserText: `Create a SQL evidence query plan for the topic "${topic}".${strategyDirective}`,
              sections: [
                ...createPlannerSections(columns, plannerDatasetContext, sampleData, learningHints, explorationContext ?? void 0, harnessSummary),
                ...planningIntentSummary ? [createContextSection("runtime_hypothesis_intent", planningIntentSummary, "high", "sticky")] : []
              ],
              settings,
              modelId,
              compactionMode
            });
            reportContextDiagnostics(telemetryTarget, managed.diagnostics);
            return withTransientRetry(
              (fb) => generateText({
                model: fb ?? model,
                messages: [
                  { role: "system", content: managed.systemText },
                  {
                    role: "user",
                    content: buildTopicPlanningUserPrompt(
                      topic,
                      managed.userText,
                      buildPlanRetryFeedback(lastError),
                      learningHints
                    )
                  }
                ],
                abortSignal,
                output: output_exports.object({ schema: jsonSchema(prepareSchemaForProvider(createSqlEvidenceQueryPlanSchema(allColumnNames), settings.provider)) })
              }),
              { settings, primaryModelId: modelId, label: "planGenerator.plan", abortSignal }
            );
          }
        }),
        effectiveTimeout
      );
      const rawPlan = result.output !== void 0 ? result.output : robustlyParseJsonObject(result.text);
      console.debug(`${LOG_PREFIX$3} Raw evidence plan from AI for "${topic}":`, rawPlan);
      const semanticDefaultsApplied = applyEvidenceQuerySemanticDefaults({
        preferredResultShape: inferPreferredResultShape(topic, plannerDatasetContext),
        ...rawPlan
      }, columns, {
        topic,
        steering: plannerDatasetContext.analysisSteering ?? null
      });
      const semanticHints = extractSemanticHints(plannerDatasetContext);
      const { validPlan, errors } = normalizeAndValidateSqlEvidenceQueryPlan(
        semanticDefaultsApplied,
        columns,
        {
          topic,
          intent: planningIntent ?? void 0,
          semanticHints,
          lenient: true,
          periodFamilies
        }
      );
      if (!validPlan) {
        lastError = `AI created an invalid SQL evidence query plan: ${errors.join(", ")}`;
        const errorText = errors.join(" ").toLowerCase();
        if (errorText.includes("must appear in query.select") || errorText.includes("must reference") || errorText.includes("aggregate")) {
          lastFailureCategory = "structural";
        } else if (errorText.includes("does not match") || errorText.includes("topic wording") || errorText.includes("intent")) {
          lastFailureCategory = "semantic";
        } else {
          lastFailureCategory = "unknown";
        }
        continue;
      }
      const stabilityReasonCodes = collectEvidencePlanStabilityReasonCodes(validPlan, columns, {
        topic,
        intent: planningIntent ?? void 0,
        semanticHints
      });
      if (stabilityReasonCodes.includes(PLANNER_STABILITY_REASON_CODES.intentMismatchRecovered)) {
        logPlannerStabilitySignal(
          telemetryTarget,
          PLANNER_STABILITY_REASON_CODES.intentMismatchRecovered,
          `Runtime hypothesis mismatched the final evidence plan for "${topic}", but topic semantics recovered a valid SQL-first plan.`,
          {
            topic,
            reasonCodes: stabilityReasonCodes,
            groupByColumn: ((_a = validPlan.query.groupBy) == null ? void 0 : _a[0]) ?? null,
            metricColumn: ((_c = (_b = validPlan.query.aggregates) == null ? void 0 : _b[0]) == null ? void 0 : _c.column) ?? null,
            preferredGroupBy: (planningIntent == null ? void 0 : planningIntent.preferredGroupBy) ?? null,
            preferredMetric: (planningIntent == null ? void 0 : planningIntent.preferredMetric) ?? null
          }
        );
      }
      try {
        compileQueryPlanToDuckDbSql(validPlan.query, {
          allowedColumns: allColumnNames,
          tableName: "session_clean_dataset",
          maxRows: validPlan.queryMode === "rowset" ? 500 : 100,
          maxColumns: 50,
          maxOrderBy: 3
        });
      } catch (error) {
        lastError = `SQL compilation failed: ${error instanceof Error ? error.message : String(error)}`;
        lastFailureCategory = "compilation";
        continue;
      }
      return validPlan;
    } catch (error) {
      if (isRuntimeAbortError(error, abortSignal)) {
        throw error;
      }
      lastError = error instanceof Error ? error.message : String(error);
      lastFailureCategory = "unknown";
    }
  }
  throw new SqlAutoAnalysisError(
    classifyCompileFailure(lastError ?? "Unknown SQL-first planning error"),
    `AI failed to generate a valid SQL evidence query plan for topic "${topic}" after ${MAX_ATTEMPTS} attempts. Last error: ${lastError}`,
    { topic, lastFailureCategory }
  );
};
const callSmallAiStep = async (settings, systemPrompt, userPrompt, abortSignal) => {
  throwIfAborted(abortSignal);
  const { model, modelId } = createProviderModel(settings, settings.complexModel);
  const result = await withTransientRetry(
    (fb) => generateText({
      model: fb ?? model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      abortSignal
    }),
    { settings, primaryModelId: modelId, label: "callSmallAiStep", abortSignal }
  );
  return (result.text ?? "").trim();
};
const generateEvidenceQueryPlanStepped = async (topic, columns, settings, harnessSummary, datasetContext, planningIntent, retryFeedback, _options) => {
  var _a, _b, _c, _d, _e, _f, _g;
  const abortSignal = _options == null ? void 0 : _options.abortSignal;
  const steering = (datasetContext == null ? void 0 : datasetContext.analysisSteering) ?? null;
  const blockedGroupBys = /* @__PURE__ */ new Set([
    ...(datasetContext == null ? void 0 : datasetContext.blockedDimensions) ?? [],
    ...(steering == null ? void 0 : steering.blockGroupBy) ?? []
  ]);
  const softDeprioritized = new Set((steering == null ? void 0 : steering.softDeprioritizeGroupBy) ?? []);
  const preferredGroupBys = /* @__PURE__ */ new Set([
    ...(datasetContext == null ? void 0 : datasetContext.preferredGrainColumns) ?? [],
    ...(steering == null ? void 0 : steering.preferGroupBy) ?? []
  ]);
  const columnNameMap = buildColumnNameMap(columns);
  const dimensions = columns.filter((c) => ["categorical", "date", "time"].includes(c.type)).filter((c) => !blockedGroupBys.has(c.name)).sort((left, right) => {
    const leftPreferred = preferredGroupBys.has(left.name) ? 1 : 0;
    const rightPreferred = preferredGroupBys.has(right.name) ? 1 : 0;
    if (leftPreferred !== rightPreferred) {
      return rightPreferred - leftPreferred;
    }
    const leftSoft = softDeprioritized.has(left.name) ? 1 : 0;
    const rightSoft = softDeprioritized.has(right.name) ? 1 : 0;
    if (leftSoft !== rightSoft) {
      return leftSoft - rightSoft;
    }
    return (left.uniqueValues ?? 0) - (right.uniqueValues ?? 0);
  });
  const numericMetrics = columns.filter((c) => ["numerical", "currency", "percentage"].includes(c.type));
  const countIntent = COUNT_INTENT_PATTERN.test(topic);
  const inferredCountGroupBy = countIntent ? inferTopicGroupByTarget(topic, dimensions.map((column) => column.name)) : null;
  const explicitGroupBy = inferredCountGroupBy ?? ((_a = dimensions.find((column) => column.name === (planningIntent == null ? void 0 : planningIntent.preferredGroupBy))) == null ? void 0 : _a.name) ?? inferTopicGroupByTarget(topic, dimensions.map((column) => column.name)) ?? ((_b = dimensions.find((column) => topicMentionsColumn(topic, column.name))) == null ? void 0 : _b.name) ?? null;
  const inferredCountOperand = countIntent ? inferCountTopicOperandTarget(topic, columns.map((column) => column.name)) : null;
  const explicitMetricColumn = ((_c = columns.find(
    (column) => countIntent ? column.name === inferredCountOperand && column.name !== explicitGroupBy : column.name === (planningIntent == null ? void 0 : planningIntent.preferredMetric) && column.name !== explicitGroupBy
  )) == null ? void 0 : _c.name) ?? ((_d = columns.find(
    (column) => countIntent ? column.name === (planningIntent == null ? void 0 : planningIntent.preferredGroupBy) && column.name !== explicitGroupBy : false
  )) == null ? void 0 : _d.name) ?? ((_e = columns.find(
    (column) => column.name !== explicitGroupBy && topicMentionsColumn(topic, column.name)
  )) == null ? void 0 : _e.name) ?? null;
  const metrics = countIntent ? columns.filter((column) => column.name !== explicitGroupBy) : numericMetrics;
  if (dimensions.length === 0 || metrics.length === 0) {
    throw new SqlAutoAnalysisError("planning_invalid", "No usable dimensions or metrics found for stepped planning.", { topic });
  }
  const systemPrompt = "You are a data analyst. Answer concisely with ONLY the requested value. No explanations.";
  const dimList = dimensions.map((c) => {
    const nullPct = c.missingPercentage != null ? `${Math.round(c.missingPercentage)}% null` : "null% unknown";
    return `${c.name} (${c.uniqueValues ?? "?"} unique, ${nullPct})`;
  }).join("\n");
  let groupBy = explicitGroupBy;
  if (!groupBy) {
    const step1Response = await callSmallAiStep(
      settings,
      systemPrompt,
      `Topic: "${topic}"
${retryFeedback ? `Retry guidance: ${retryFeedback}
` : ""}${steering ? `Structured steering:
${formatAnalysisSteeringBundle(steering)}
` : ""}
Which ONE column is best for groupBy? Prefer columns with 0% null and do not choose blocked dimensions.
${dimList}

Reply with ONLY the exact column name.`,
      abortSignal
    );
    groupBy = resolveExactColumnMatch(step1Response, columnNameMap);
    if (!groupBy || !dimensions.some((column) => column.name === groupBy)) {
      throw new SqlAutoAnalysisError("planning_invalid", `Stepped planner could not map groupBy response "${step1Response}" to a valid dimension.`, {
        topic,
        step: "group_by_selection"
      });
    }
  }
  const metricList = metrics.map((c) => {
    const range = c.valueRange ? `range: ${c.valueRange[0]} to ${c.valueRange[1]}` : "";
    return `${c.name}${range ? ` (${range})` : ""}`;
  }).join("\n");
  let aggFunction;
  let aggColumn;
  if (countIntent && explicitMetricColumn) {
    aggColumn = explicitMetricColumn;
    aggFunction = IDENTIFIER_LIKE_COLUMN_PATTERN.test(explicitMetricColumn) ? "count_distinct" : "count";
  } else if (countIntent && !explicitMetricColumn) {
    aggColumn = void 0;
    aggFunction = "count";
  } else if (explicitMetricColumn && numericMetrics.some((column) => column.name === explicitMetricColumn)) {
    aggColumn = explicitMetricColumn;
    aggFunction = "sum";
  } else if (!countIntent && metrics.length === 1) {
    aggColumn = metrics[0].name;
    aggFunction = "sum";
  } else {
    const step2Response = await callSmallAiStep(
      settings,
      systemPrompt,
      `Topic: "${topic}"
GroupBy: ${groupBy}
${retryFeedback ? `Retry guidance: ${retryFeedback}
` : ""}Available metrics:
${metricList}

Which metric and function (SUM, COUNT, AVG, COUNT_DISTINCT) best fits the topic?
Reply as: FUNCTION(exact column name) or COUNT(*) when counting records.`,
      abortSignal
    );
    const functionMatch = step2Response.match(/\b(SUM|COUNT|AVG|COUNT_DISTINCT|MIN|MAX)\s*\(\s*([^)]+)\s*\)/i);
    const rawFunction = (_f = functionMatch == null ? void 0 : functionMatch[1]) == null ? void 0 : _f.toLowerCase();
    aggFunction = rawFunction === "count_distinct" ? "count_distinct" : rawFunction === "count" ? "count" : rawFunction === "avg" ? "avg" : "sum";
    const rawColumn = (_g = functionMatch == null ? void 0 : functionMatch[2]) == null ? void 0 : _g.trim();
    aggColumn = rawColumn === "*" ? void 0 : resolveExactColumnMatch(rawColumn ?? step2Response, columnNameMap) ?? void 0;
    if (aggColumn && !metrics.some((column) => column.name === aggColumn)) {
      throw new SqlAutoAnalysisError("planning_invalid", `Stepped planner selected unsupported metric "${aggColumn}" for topic "${topic}".`, {
        topic,
        step: "metric_selection"
      });
    }
    if (!countIntent && !aggColumn) {
      throw new SqlAutoAnalysisError("planning_invalid", `Stepped planner could not map metric response "${step2Response}" to a valid metric column.`, {
        topic,
        step: "metric_selection"
      });
    }
  }
  if (aggColumn && aggFunction === "sum" && topicPrefersAverageAggregation(
    topic,
    aggColumn,
    columns.find((column) => column.name === aggColumn)
  )) {
    aggFunction = "avg";
  }
  const aggAlias = aggColumn ? `${aggFunction}_${aggColumn.toLowerCase().replace(/\s+/g, "_")}` : "count_rows";
  let wherePredicates = [];
  if ((steering == null ? void 0 : steering.detailRowColumn) && steering.detailRowValue) {
    wherePredicates.push({
      column: steering.detailRowColumn,
      operator: "eq",
      value: steering.detailRowValue
    });
  }
  if (harnessSummary || steering) {
    const step3Response = await callSmallAiStep(
      settings,
      systemPrompt,
      `Topic: "${topic}"
GroupBy: ${groupBy}
Aggregate: ${aggFunction.toUpperCase()}(${aggColumn ?? "*"})
${retryFeedback ? `Retry guidance: ${retryFeedback}
` : ""}${steering ? `Structured steering:
${formatAnalysisSteeringBundle(steering)}
` : ""}
Data findings:
${harnessSummary ?? "None"}

What additional WHERE filters are needed? Reply as one predicate per line using the exact column name, for example:
"Row Class" = fact
Country <> Internal
Or reply NONE if no extra filters are needed.`,
      abortSignal
    );
    if (step3Response.toUpperCase() !== "NONE") {
      const filterLines = step3Response.split("\n").filter((l) => l.includes("=") || l.includes("<>"));
      const parsedPredicates = [];
      for (const line of filterLines) {
        const parsed = parseSteppedPredicateLine(line, columnNameMap);
        if (parsed.error) {
          throw new SqlAutoAnalysisError("planning_invalid", parsed.error, {
            topic,
            step: "filter_selection"
          });
        }
        if (parsed.predicate) {
          parsedPredicates.push(parsed.predicate);
        }
      }
      wherePredicates = [...wherePredicates, ...parsedPredicates];
    }
  }
  const isTemporalGroupBy = dimensions.some((c) => c.name === groupBy && c.type === "date") || isTimeLikeDimensionColumn(groupBy);
  const preferredResultShape = isTemporalGroupBy ? "time_series" : "ranked_aggregate";
  const recommendedTopN = (steering == null ? void 0 : steering.recommendedTopN) && steering.recommendedTopN > 0 ? steering.recommendedTopN : 10;
  const plan = {
    title: topic,
    queryMode: "aggregate",
    intentSummary: `${aggFunction.toUpperCase()}(${aggColumn ?? "*"}) grouped by ${groupBy}`,
    preferredResultShape,
    query: {
      select: [groupBy, aggAlias],
      groupBy: [groupBy],
      aggregates: [{ function: aggFunction, column: aggColumn, as: aggAlias }],
      where: wherePredicates.length > 0 ? { predicates: wherePredicates } : void 0,
      orderBy: isTemporalGroupBy ? [{ column: groupBy, direction: "asc" }] : [{ column: aggAlias, direction: "desc" }],
      limit: isTemporalGroupBy ? void 0 : recommendedTopN
    }
  };
  const allColumnNames = columns.map((c) => c.name);
  const steppedPeriodFamilies = detectPeriodColumnFamilies(allColumnNames);
  const semanticDefaultsApplied = applyEvidenceQuerySemanticDefaults(plan, columns, {
    topic,
    steering
  });
  const steppedSemanticHints = extractSemanticHints(datasetContext);
  const { validPlan, errors } = normalizeAndValidateSqlEvidenceQueryPlan(semanticDefaultsApplied, columns, {
    topic,
    intent: planningIntent ?? void 0,
    semanticHints: steppedSemanticHints,
    lenient: true,
    periodFamilies: steppedPeriodFamilies
  });
  if (!validPlan) {
    throw new SqlAutoAnalysisError(
      "planning_invalid",
      `Stepped plan assembly failed: ${errors.join(", ")}`,
      { topic }
    );
  }
  try {
    compileQueryPlanToDuckDbSql(validPlan.query, {
      allowedColumns: allColumnNames,
      tableName: "session_clean_dataset",
      maxRows: 100,
      maxColumns: 50,
      maxOrderBy: 3
    });
  } catch (error) {
    throw new SqlAutoAnalysisError(
      "sql_compile_failed",
      `Stepped plan SQL compilation failed: ${error instanceof Error ? error.message : String(error)}`,
      { topic }
    );
  }
  return validPlan;
};
const LOG_PREFIX$2 = "[SqlPresentationPlanner]";
const AI_PRESENTATION_TIMEOUT_MS = 3e4;
const AI_PRESENTATION_TIMEOUT_MESSAGE = `AI presentation planning timed out after ${AI_PRESENTATION_TIMEOUT_MS}ms`;
const VALID_PRESENTATION_MODES = /* @__PURE__ */ new Set(["table", "chart", "table_then_chart"]);
const createPresentationTimeoutReason = () => {
  const reason = new Error(AI_PRESENTATION_TIMEOUT_MESSAGE);
  reason.name = "AbortError";
  return reason;
};
const isPresentationTimeoutError = (error) => error instanceof Error && error.name === "AbortError" && error.message === AI_PRESENTATION_TIMEOUT_MESSAGE || typeof error === "object" && error !== null && "name" in error && "message" in error && error.name === "AbortError" && error.message === AI_PRESENTATION_TIMEOUT_MESSAGE;
const isTimeColumn = (column) => column ? ["date", "time"].includes(column.type) : false;
const findAggregateAliases = (aggregates) => (aggregates ?? []).map((aggregate) => {
  var _a;
  return (_a = aggregate.as) == null ? void 0 : _a.trim();
}).filter((alias) => Boolean(alias));
const buildPresentationDescription = (evidencePlan, summary, mode) => {
  const rowText = `${summary.rowCount} row${summary.rowCount === 1 ? "" : "s"}`;
  if (mode === "table") {
    return `${evidencePlan.intentSummary} The result is exposed as a table-first SQL evidence view (${rowText}) because a chart would likely overstate the signal.`;
  }
  if (mode === "table_then_chart") {
    return `${evidencePlan.intentSummary} Review the SQL evidence table first, then use the chart as a compact visual summary (${rowText}).`;
  }
  if (mode === "hidden") {
    return `${evidencePlan.intentSummary} The SQL evidence was kept out of the default view because the result is too weak or too technical for a user-facing chart (${rowText}).`;
  }
  return `${evidencePlan.intentSummary} The result is chart-ready after validating the SQL evidence output (${rowText}).`;
};
const buildDeterministicSqlPresentationPlan = (evidencePlan, summary, columns, options) => {
  var _a, _b;
  const aggregateAliases = findAggregateAliases(evidencePlan.query.aggregates);
  const groupByColumn = (_a = evidencePlan.query.groupBy) == null ? void 0 : _a[0];
  const groupByProfile = columns.find((column) => column.name === groupByColumn);
  const firstMetric = aggregateAliases[0] ?? summary.numericColumns[0];
  const secondMetric = aggregateAliases[1] ?? summary.numericColumns[1];
  const semanticUnderstanding = options == null ? void 0 : options.semanticUnderstanding;
  const valueGate = options == null ? void 0 : options.valueGate;
  const harnessContext = options == null ? void 0 : options.harnessContext;
  const promotedChartType = (harnessContext == null ? void 0 : harnessContext.promotedChartType) ?? null;
  const blockedChartTypeSet = new Set((harnessContext == null ? void 0 : harnessContext.blockedChartTypes) ?? []);
  const suggestedHideOthers = (harnessContext == null ? void 0 : harnessContext.suggestedHideOthers) ?? false;
  const helperDimension = Boolean(groupByColumn && (semanticUnderstanding == null ? void 0 : semanticUnderstanding.helperDimensions.includes(groupByColumn)));
  const blockedDimension = Boolean(groupByColumn && (semanticUnderstanding == null ? void 0 : semanticUnderstanding.blockedDimensions.includes(groupByColumn)));
  const businessConfidenceLow = (semanticUnderstanding == null ? void 0 : semanticUnderstanding.businessGrainConfidence) === "low";
  const chartSafe = (valueGate == null ? void 0 : valueGate.decision) === "pass" && !helperDimension && !blockedDimension && !businessConfidenceLow && !(semanticUnderstanding == null ? void 0 : semanticUnderstanding.unsafeForBusinessNarrative) && summary.rowCount >= 2 && (summary.distinctGroupCount ?? summary.rowCount) > 1 && !summary.isWideCategorySet;
  const tableOnlySafe = (valueGate == null ? void 0 : valueGate.decision) === "table_only" && !(semanticUnderstanding == null ? void 0 : semanticUnderstanding.unsafeForBusinessNarrative) && summary.rowCount >= 2 && (summary.distinctGroupCount ?? summary.rowCount) > 1;
  if (evidencePlan.queryMode === "rowset") {
    const xValueColumn = summary.numericColumns[0];
    const yValueColumn = summary.numericColumns[1];
    const scatterReady = Boolean(xValueColumn && yValueColumn);
    const presentationMode2 = (valueGate == null ? void 0 : valueGate.decision) === "reject" ? "hidden" : scatterReady && (chartSafe || tableOnlySafe) && summary.rowCount <= 60 ? "table_then_chart" : "table";
    return {
      title: evidencePlan.title,
      description: buildPresentationDescription(evidencePlan, summary, presentationMode2),
      presentationMode: presentationMode2,
      chartType: scatterReady ? "scatter" : void 0,
      bindings: scatterReady ? { xValueColumn, yValueColumn } : void 0
    };
  }
  const periodTimeLike = Boolean(
    groupByColumn && !isTimeColumn(groupByProfile) && (((_b = harnessContext == null ? void 0 : harnessContext.periodColumnFamilies) == null ? void 0 : _b.length) ?? 0) > 0 && isSequentialDimensionName(groupByColumn)
  );
  const isTimeSeries = Boolean(
    groupByColumn && (isTimeColumn(groupByProfile) || periodTimeLike) && firstMetric
  );
  const comboReady = Boolean(
    groupByColumn && firstMetric && secondMetric && aggregateAliases.length >= 2 && chartSafe && summary.rowCount <= 12
  );
  const passWithWideCategories = (valueGate == null ? void 0 : valueGate.decision) === "pass" && !helperDimension && !blockedDimension && !businessConfidenceLow && !(semanticUnderstanding == null ? void 0 : semanticUnderstanding.unsafeForBusinessNarrative) && summary.rowCount >= 2 && (summary.distinctGroupCount ?? summary.rowCount) > 1 && summary.isWideCategorySet;
  const chartReady = Boolean(groupByColumn && firstMetric && (chartSafe || tableOnlySafe || passWithWideCategories));
  let presentationMode = (valueGate == null ? void 0 : valueGate.decision) === "reject" ? "hidden" : "table";
  let chartType;
  let bindings;
  let defaultTopN;
  let defaultHideOthers;
  if (presentationMode !== "hidden" && chartReady) {
    const recommended = recommendChartType({
      rowCount: summary.rowCount,
      distinctGroupCount: summary.distinctGroupCount ?? summary.rowCount,
      hasNegativeValues: summary.hasNegativeValues,
      isTimeSeries: isTimeSeries && chartSafe,
      metricCount: secondMetric && comboReady ? 2 : 1
    });
    const afterHarness = promotedChartType && !blockedChartTypeSet.has(promotedChartType) ? promotedChartType : recommended;
    chartType = blockedChartTypeSet.has(afterHarness) ? "bar" : afterHarness;
    if (chartType === "combo" && !comboReady) {
      chartType = "bar";
    }
    presentationMode = isTimeSeries && summary.rowCount > 24 ? "chart" : "table_then_chart";
    bindings = {
      groupByColumn,
      valueColumn: firstMetric,
      ...chartType === "combo" && secondMetric ? { secondaryValueColumn: secondMetric } : {}
    };
    defaultTopN = summary.rowCount > 8 ? 8 : void 0;
    defaultHideOthers = suggestedHideOthers || summary.rowCount > 8;
  }
  if (!chartType || !bindings) {
    presentationMode = "table";
    if ((valueGate == null ? void 0 : valueGate.decision) === "reject") {
      presentationMode = "hidden";
    }
  }
  return {
    title: evidencePlan.title,
    description: buildPresentationDescription(evidencePlan, summary, presentationMode),
    presentationMode,
    chartType,
    bindings,
    defaultTopN,
    defaultHideOthers
  };
};
const buildEvidenceSummaryForPrompt = (plan, summary) => {
  var _a;
  const lines = [
    `Query mode: ${plan.queryMode}`,
    `Rows: ${summary.rowCount}, Columns: ${summary.columnCount}`,
    `Numeric: ${summary.numericColumns.join(", ") || "none"}`,
    `Categorical: ${summary.categoricalColumns.join(", ") || "none"}`,
    `Time: ${summary.timeColumns.join(", ") || "none"}`
  ];
  if ((_a = plan.query.groupBy) == null ? void 0 : _a.length) lines.push(`GroupBy: ${plan.query.groupBy.join(", ")}`);
  if (summary.distinctGroupCount != null) lines.push(`Distinct groups: ${summary.distinctGroupCount}`);
  lines.push(`Time series candidate: ${summary.isTimeSeriesCandidate ? "yes" : "no"}`);
  lines.push(`Has secondary metric: ${summary.hasSecondaryMetric ? "yes" : "no"}`);
  if (summary.previewRows.length > 0) {
    lines.push("Preview:");
    summary.previewRows.slice(0, 3).forEach((row) => lines.push(`  ${JSON.stringify(row)}`));
  }
  return lines.join("\n");
};
const ALLOWED_CHART_FAMILIES = /* @__PURE__ */ new Set(["bar", "line", "area", "combo", "scatter", "pie", "doughnut"]);
const TABLE_FORCE_REASON_CODES = /* @__PURE__ */ new Set([
  "helper_dimension",
  "blocked_dimension",
  "hierarchy_contamination",
  "duplicate_label_contamination",
  "missing_detail_row_filter",
  "reshape_required",
  "low_signal_confidence",
  "unsafe_business_narrative",
  "not_chart_worthy"
]);
const buildReviewContextForPrompt = (options) => {
  if (!options) return null;
  const lines = [];
  const { semanticUnderstanding, valueGate, harnessContext } = options;
  if (valueGate) {
    lines.push(`Value gate decision: ${valueGate.decision}`);
    if (valueGate.reasonCodes.length > 0) {
      lines.push(`Value gate reason codes: ${valueGate.reasonCodes.join(", ")}`);
    }
    if (valueGate.detail) {
      lines.push(`Value gate detail: ${valueGate.detail}`);
    }
  }
  if (semanticUnderstanding) {
    if (semanticUnderstanding.helperDimensions.length > 0) {
      lines.push(`Helper dimensions: ${semanticUnderstanding.helperDimensions.join(", ")}`);
    }
    if (semanticUnderstanding.blockedDimensions.length > 0) {
      lines.push(`Blocked dimensions: ${semanticUnderstanding.blockedDimensions.join(", ")}`);
    }
    lines.push(`Business grain confidence: ${semanticUnderstanding.businessGrainConfidence}`);
    if (semanticUnderstanding.unsafeForBusinessNarrative) {
      lines.push("Unsafe for business narrative: true");
    }
  }
  if (harnessContext) {
    if (harnessContext.reportShapeClass) {
      lines.push(`Canonical report shape class: ${harnessContext.reportShapeClass}`);
    }
    if (harnessContext.detailRowPolicy) {
      lines.push(`Canonical detail row policy: ${harnessContext.detailRowPolicy}`);
    }
    if (harnessContext.hierarchyMode) {
      lines.push(`Canonical hierarchy mode: ${harnessContext.hierarchyMode}`);
    }
    if (harnessContext.widePivotMode) {
      lines.push(`Canonical wide pivot mode: ${harnessContext.widePivotMode}`);
    }
    if (harnessContext.signalConfidence) {
      lines.push(`Canonical signal confidence: ${harnessContext.signalConfidence}`);
    }
    if (harnessContext.parentDescriptions.length > 0) {
      lines.push(`Hierarchy contamination signals: parent labels = ${harnessContext.parentDescriptions.join(", ")}`);
    }
    if (harnessContext.duplicateDescriptions.length > 0) {
      lines.push(`Duplicate label contamination: ${harnessContext.duplicateDescriptions.join(", ")}`);
    }
  }
  return lines.length > 0 ? lines.join("\n    ") : null;
};
const emitPresentationPlannerDegrade = (options, reasonCode, detail, meta) => {
  logPlannerStabilitySignal(options == null ? void 0 : options.telemetryTarget, reasonCode, detail, meta);
  if (reasonCode !== PLANNER_STABILITY_REASON_CODES.plannerDegradedNonBlocking) {
    logPlannerStabilitySignal(
      options == null ? void 0 : options.telemetryTarget,
      PLANNER_STABILITY_REASON_CODES.plannerDegradedNonBlocking,
      detail,
      {
        reasonCodes: [reasonCode, PLANNER_STABILITY_REASON_CODES.plannerDegradedNonBlocking],
        ...meta ?? {}
      }
    );
  }
};
const applyPresentationSafetyFloor = (plan, summary, evidencePlan, options) => {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t;
  const valueGate = options == null ? void 0 : options.valueGate;
  const semanticUnderstanding = options == null ? void 0 : options.semanticUnderstanding;
  let result = { ...plan };
  const stripPivotFields = (next) => ({
    ...next,
    pivotPresentation: void 0,
    pivotDecision: void 0,
    pivotRequest: void 0
  });
  if ((valueGate == null ? void 0 : valueGate.decision) === "reject") {
    return stripPivotFields({ ...result, presentationMode: "hidden", chartType: void 0, bindings: void 0 });
  }
  const hasTableForceReason = (valueGate == null ? void 0 : valueGate.reasonCodes.some((c) => TABLE_FORCE_REASON_CODES.has(c))) ?? false;
  const lowConfidence = (semanticUnderstanding == null ? void 0 : semanticUnderstanding.businessGrainConfidence) === "low";
  if (hasTableForceReason || lowConfidence) {
    return stripPivotFields({ ...result, presentationMode: "table", chartType: void 0, bindings: void 0 });
  }
  if ((valueGate == null ? void 0 : valueGate.decision) === "table_only" && result.presentationMode === "chart") {
    result = { ...result, presentationMode: "table_then_chart" };
  }
  if (summary.rowCount < 2 || (summary.distinctGroupCount ?? summary.rowCount) <= 1) {
    return stripPivotFields({ ...result, presentationMode: "table", chartType: void 0, bindings: void 0 });
  }
  if (result.presentationMode === "table") {
    return stripPivotFields({ ...result, chartType: void 0, bindings: void 0 });
  }
  if (summary.isWideCategorySet || (summary.distinctGroupCount ?? 0) > 8) {
    if (result.presentationMode === "chart") {
      result = { ...result, presentationMode: "table_then_chart" };
    }
    result = { ...result, defaultTopN: 8, defaultHideOthers: true };
  }
  if (((_a = options == null ? void 0 : options.harnessContext) == null ? void 0 : _a.suggestedHideOthers) && !result.defaultHideOthers) {
    result = { ...result, defaultHideOthers: true };
  }
  const pivotResolution = resolvePivotDecision({
    pivotPreference: plan.pivotPreference ?? "none",
    evidencePlan,
    evidenceSummary: summary,
    valueGate,
    harnessContext: (options == null ? void 0 : options.harnessContext) ?? null
  });
  if (result.chartType === "bar" && pivotResolution.decision === "prefer_pivot" && pivotResolution.pivotRequest) {
    result = {
      ...result,
      presentationMode: "table_then_chart",
      pivotPresentation: true,
      pivotDecision: "prefer_pivot",
      pivotRequest: pivotResolution.pivotRequest
    };
  }
  if (!result.chartType) return result;
  const harnessBlockedTypes = new Set(((_b = options == null ? void 0 : options.harnessContext) == null ? void 0 : _b.blockedChartTypes) ?? []);
  if (result.chartType && harnessBlockedTypes.has(result.chartType)) {
    if (result.chartType === "line") {
      const valueColumn = (_c = result.bindings) == null ? void 0 : _c.valueColumn;
      const groupByCol = ((_d = result.bindings) == null ? void 0 : _d.groupByColumn) ?? ((_e = evidencePlan.query.groupBy) == null ? void 0 : _e[0]);
      if (valueColumn && groupByCol) {
        result = { ...result, chartType: "bar" };
      } else {
        return { ...result, presentationMode: "table", chartType: void 0, bindings: void 0 };
      }
    } else if (result.chartType === "bar") {
      return stripPivotFields({ ...result, presentationMode: "table", chartType: void 0, bindings: void 0 });
    } else {
      return { ...result, presentationMode: "table", chartType: void 0, bindings: void 0 };
    }
  }
  if (!ALLOWED_CHART_FAMILIES.has(result.chartType)) {
    const groupByColumn = ((_f = result.bindings) == null ? void 0 : _f.groupByColumn) ?? ((_g = evidencePlan.query.groupBy) == null ? void 0 : _g[0]);
    const valueColumn = (_h = result.bindings) == null ? void 0 : _h.valueColumn;
    if (evidencePlan.queryMode === "aggregate" && groupByColumn && valueColumn) {
      result = { ...result, chartType: "bar" };
    } else {
      return { ...result, presentationMode: "table", chartType: void 0, bindings: void 0 };
    }
  }
  if ((result.chartType === "pie" || result.chartType === "doughnut") && (summary.distinctGroupCount ?? summary.rowCount) > 8) {
    result = { ...result, chartType: "bar" };
  }
  const aggregateAliases = findAggregateAliases(evidencePlan.query.aggregates);
  const evidenceColumns = new Set(summary.columns);
  if (result.chartType === "bar") {
    const groupByColumn = ((_i = result.bindings) == null ? void 0 : _i.groupByColumn) ?? ((_j = evidencePlan.query.groupBy) == null ? void 0 : _j[0]);
    const valueColumn = (_k = result.bindings) == null ? void 0 : _k.valueColumn;
    if (evidencePlan.queryMode !== "aggregate" || !groupByColumn || !valueColumn) {
      return { ...result, presentationMode: "table", chartType: void 0, bindings: void 0 };
    }
    const barPreviewLabels = summary.previewRows.map((row) => row[groupByColumn]).filter((v) => v != null).map(String);
    if (hasDuplicateNormalizedBuckets(barPreviewLabels)) {
      return { ...result, presentationMode: "table", chartType: void 0, bindings: void 0 };
    }
  }
  if (result.chartType === "line") {
    const groupByColumn = ((_l = result.bindings) == null ? void 0 : _l.groupByColumn) ?? ((_m = evidencePlan.query.groupBy) == null ? void 0 : _m[0]);
    if (evidencePlan.queryMode !== "aggregate" || !groupByColumn) {
      return { ...result, presentationMode: "table", chartType: void 0, bindings: void 0 };
    }
    const previewValues = summary.previewRows.map((row) => row[groupByColumn]).filter((v) => v != null).map(String);
    if (hasDuplicateNormalizedBuckets(previewValues)) {
      const valueColumn = (_n = result.bindings) == null ? void 0 : _n.valueColumn;
      if (valueColumn) {
        result = { ...result, chartType: "bar" };
      } else {
        return { ...result, presentationMode: "table", chartType: void 0, bindings: void 0 };
      }
    }
    if (result.chartType === "line") {
      let lineAllowed = false;
      if (summary.timeColumns.includes(groupByColumn) || summary.isTimeSeriesCandidate) {
        if (previewValues.length < 2) {
          lineAllowed = true;
        } else {
          const timestamps = previewValues.map((v) => new Date(v).getTime());
          lineAllowed = !timestamps.some(isNaN) && isMonotonicSequence(timestamps);
        }
      } else {
        const ordinalIndices = resolveOrdinalIndices(previewValues);
        if (ordinalIndices) {
          lineAllowed = true;
        }
      }
      if (!lineAllowed) {
        const valueColumn = (_o = result.bindings) == null ? void 0 : _o.valueColumn;
        if (valueColumn) {
          result = { ...result, chartType: "bar" };
        } else {
          return { ...result, presentationMode: "table", chartType: void 0, bindings: void 0 };
        }
      }
    }
  }
  if (result.chartType === "combo") {
    const comboGroupBy = ((_p = result.bindings) == null ? void 0 : _p.groupByColumn) ?? ((_q = evidencePlan.query.groupBy) == null ? void 0 : _q[0]);
    if (evidencePlan.queryMode !== "aggregate" || aggregateAliases.length < 2 || summary.rowCount > 12) {
      const valueColumn = (_r = result.bindings) == null ? void 0 : _r.valueColumn;
      if (comboGroupBy && valueColumn) {
        result = { ...result, chartType: "bar", bindings: { ...result.bindings, secondaryValueColumn: void 0 } };
      } else {
        return { ...result, presentationMode: "table", chartType: void 0, bindings: void 0 };
      }
    }
    if (result.chartType === "combo" && comboGroupBy) {
      const comboPreviewLabels = summary.previewRows.map((row) => row[comboGroupBy]).filter((v) => v != null).map(String);
      if (hasDuplicateNormalizedBuckets(comboPreviewLabels)) {
        return { ...result, presentationMode: "table", chartType: void 0, bindings: void 0 };
      }
    }
  }
  if (result.chartType === "scatter") {
    const xVal = (_s = result.bindings) == null ? void 0 : _s.xValueColumn;
    const yVal = (_t = result.bindings) == null ? void 0 : _t.yValueColumn;
    const xNumeric = xVal && summary.numericColumns.includes(xVal);
    const yNumeric = yVal && summary.numericColumns.includes(yVal);
    if (evidencePlan.queryMode !== "rowset" || !xNumeric || !yNumeric || summary.rowCount > 60) {
      return { ...result, presentationMode: "table", chartType: void 0, bindings: void 0 };
    }
  }
  if (result.bindings) {
    const { groupByColumn, valueColumn, secondaryValueColumn, xValueColumn, yValueColumn } = result.bindings;
    const invalid = [groupByColumn, valueColumn, secondaryValueColumn, xValueColumn, yValueColumn].filter(Boolean).some((col) => !evidenceColumns.has(col));
    if (invalid) {
      return { ...result, presentationMode: "table", chartType: void 0, bindings: void 0 };
    }
  }
  if (result.presentationMode !== "table" && result.chartType && !result.bindings) {
    return { ...result, presentationMode: "table", chartType: void 0, bindings: void 0 };
  }
  if (result.presentationMode === "table" || result.presentationMode === "hidden") {
    return stripPivotFields({ ...result, chartType: void 0, bindings: void 0 });
  }
  return result;
};
const callAiPresentationPlan = async (topic, evidencePlan, summary, columns, settings, options) => {
  var _a, _b, _c, _d;
  if (!isProviderConfigured(settings)) {
    return null;
  }
  try {
    const { model, modelId } = createProviderModel(settings, settings.simpleModel);
    const evidenceText = buildEvidenceSummaryForPrompt(evidencePlan, summary);
    const evidenceColumnNames = summary.columns;
    const contextText = `Executed output columns: ${evidenceColumnNames.join(", ")}`;
    const reviewContext = buildReviewContextForPrompt(options);
    const prompt = createSqlPresentationPlanPrompt(topic, contextText, evidenceText, reviewContext);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(createPresentationTimeoutReason()), AI_PRESENTATION_TIMEOUT_MS);
    try {
      const result = await withTransientRetry(
        (fb) => generateText({
          model: fb ?? model,
          messages: [
            { role: "system", content: buildAnalysisPlannerSystemPrompt("presentation") },
            { role: "user", content: prompt }
          ],
          output: output_exports.object({
            schema: jsonSchema(prepareSchemaForProvider(createSqlPresentationPlanSchema(evidenceColumnNames), settings.provider))
          }),
          abortSignal: controller.signal
        }),
        { settings, primaryModelId: modelId, label: "sqlPresentationPlanner", abortSignal: controller.signal }
      );
      clearTimeout(timeout);
      const parsed = result.output !== void 0 ? result.output : robustlyParseJsonObject(result.text);
      if (!parsed || !parsed.presentationMode || !parsed.title) {
        console.warn(`${LOG_PREFIX$2} AI presentation plan returned invalid structure, falling back.`);
        return null;
      }
      const presentationMode = VALID_PRESENTATION_MODES.has(parsed.presentationMode) ? parsed.presentationMode : "table";
      const chartType = tryResolveAiChartType(parsed.chartType);
      let bindings;
      if (parsed.bindings && typeof parsed.bindings === "object") {
        const rawBindings = parsed.bindings;
        const columnSet = new Set(evidenceColumnNames);
        const validGroupBy = rawBindings.groupByColumn && columnSet.has(rawBindings.groupByColumn) ? rawBindings.groupByColumn : void 0;
        const validValue = rawBindings.valueColumn && columnSet.has(rawBindings.valueColumn) ? rawBindings.valueColumn : void 0;
        const validSecondary = rawBindings.secondaryValueColumn && columnSet.has(rawBindings.secondaryValueColumn) ? rawBindings.secondaryValueColumn : void 0;
        const validX = rawBindings.xValueColumn && columnSet.has(rawBindings.xValueColumn) ? rawBindings.xValueColumn : void 0;
        const validY = rawBindings.yValueColumn && columnSet.has(rawBindings.yValueColumn) ? rawBindings.yValueColumn : void 0;
        if (validGroupBy || validValue || validX || validY) {
          bindings = {
            ...validGroupBy ? { groupByColumn: validGroupBy } : {},
            ...validValue ? { valueColumn: validValue } : {},
            ...validSecondary ? { secondaryValueColumn: validSecondary } : {},
            ...validX ? { xValueColumn: validX } : {},
            ...validY ? { yValueColumn: validY } : {}
          };
        }
      }
      if (presentationMode !== "table" && chartType && !bindings) {
        return applyPresentationSafetyFloor({
          title: String(parsed.title),
          description: String(parsed.description || evidencePlan.intentSummary),
          presentationMode: "table"
        }, summary, evidencePlan, options);
      }
      const aiPlan = {
        title: String(parsed.title),
        description: String(parsed.description || evidencePlan.intentSummary),
        presentationMode,
        chartType,
        bindings,
        defaultTopN: typeof parsed.defaultTopN === "number" ? parsed.defaultTopN : void 0,
        defaultHideOthers: typeof parsed.defaultHideOthers === "boolean" ? parsed.defaultHideOthers : void 0
      };
      const safePlan = applyPresentationSafetyFloor(aiPlan, summary, evidencePlan, options);
      if (safePlan.chartType === "bar" && safePlan.presentationMode !== "table" && safePlan.presentationMode !== "hidden") {
        const recommended = recommendChartType({
          rowCount: summary.rowCount,
          distinctGroupCount: summary.distinctGroupCount ?? summary.rowCount,
          hasNegativeValues: summary.hasNegativeValues,
          isTimeSeries: summary.isTimeSeriesCandidate,
          metricCount: ((_a = safePlan.bindings) == null ? void 0 : _a.secondaryValueColumn) ? 2 : 1
        });
        if (recommended !== "bar") {
          safePlan.chartType = recommended;
        }
      }
      const tableForcedByValueGate = safePlan.presentationMode === "table" && aiPlan.presentationMode !== "table" && (((_b = options == null ? void 0 : options.valueGate) == null ? void 0 : _b.reasonCodes.some((code) => TABLE_FORCE_REASON_CODES.has(code))) === true || ((_c = options == null ? void 0 : options.semanticUnderstanding) == null ? void 0 : _c.businessGrainConfidence) === "low");
      if (tableForcedByValueGate) {
        emitPresentationPlannerDegrade(
          options,
          PLANNER_STABILITY_REASON_CODES.tableForcedByValueGate,
          `AI presentation planning for "${topic}" was downgraded to table mode by the deterministic safety floor.`,
          {
            topic,
            presentationModeBefore: aiPlan.presentationMode,
            presentationModeAfter: safePlan.presentationMode,
            chartTypeBefore: aiPlan.chartType ?? null,
            chartTypeAfter: safePlan.chartType ?? null,
            reasonCodes: [
              PLANNER_STABILITY_REASON_CODES.tableForcedByValueGate,
              PLANNER_STABILITY_REASON_CODES.plannerDegradedNonBlocking
            ],
            valueGateReasonCodes: ((_d = options == null ? void 0 : options.valueGate) == null ? void 0 : _d.reasonCodes) ?? []
          }
        );
      } else if (safePlan.presentationMode !== aiPlan.presentationMode || safePlan.chartType !== aiPlan.chartType) {
        emitPresentationPlannerDegrade(
          options,
          PLANNER_STABILITY_REASON_CODES.plannerDegradedNonBlocking,
          `AI presentation planning for "${topic}" was adjusted by the deterministic safety floor.`,
          {
            topic,
            presentationModeBefore: aiPlan.presentationMode,
            presentationModeAfter: safePlan.presentationMode,
            chartTypeBefore: aiPlan.chartType ?? null,
            chartTypeAfter: safePlan.chartType ?? null
          }
        );
      }
      return safePlan;
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    if (isPresentationTimeoutError(error)) {
      emitPresentationPlannerDegrade(
        options,
        PLANNER_STABILITY_REASON_CODES.presentationTimeoutFallback,
        `${AI_PRESENTATION_TIMEOUT_MESSAGE} Deterministic presentation fallback was used for "${topic}".`,
        {
          topic,
          timeoutMs: AI_PRESENTATION_TIMEOUT_MS,
          reasonCodes: [
            PLANNER_STABILITY_REASON_CODES.presentationTimeoutFallback,
            PLANNER_STABILITY_REASON_CODES.plannerDegradedNonBlocking
          ]
        }
      );
      console.info(`${LOG_PREFIX$2} ${AI_PRESENTATION_TIMEOUT_MESSAGE}, using deterministic fallback.`);
      return null;
    }
    console.warn(`${LOG_PREFIX$2} AI presentation planning failed, falling back to deterministic.`, error);
    return null;
  }
};
const buildAnalysisPlanFromPresentation = (evidencePlan, presentationPlan, evidenceSummary) => {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q;
  if (presentationPlan.pivotDecision === "prefer_pivot") {
    return null;
  }
  if (presentationPlan.presentationMode === "hidden") {
    return null;
  }
  const smartDefaultChartType = (metricCount = 1) => {
    if (!evidenceSummary) return "bar";
    return recommendChartType({
      rowCount: evidenceSummary.rowCount,
      distinctGroupCount: evidenceSummary.distinctGroupCount ?? evidenceSummary.rowCount,
      hasNegativeValues: evidenceSummary.hasNegativeValues,
      isTimeSeries: evidenceSummary.isTimeSeriesCandidate,
      metricCount
    });
  };
  if (presentationPlan.presentationMode === "table") {
    const groupByColumn2 = (_a = evidencePlan.query.groupBy) == null ? void 0 : _a[0];
    const primaryMetric2 = (evidencePlan.query.aggregates ?? []).map((a) => {
      var _a2;
      return (_a2 = a.as) == null ? void 0 : _a2.trim();
    }).find((v) => Boolean(v)) ?? evidencePlan.query.select.find((c) => c !== groupByColumn2);
    return {
      chartType: smartDefaultChartType(),
      title: presentationPlan.title,
      description: presentationPlan.description,
      groupByColumn: groupByColumn2,
      valueColumn: primaryMetric2,
      preFilter: evidencePlan.preFilter,
      defaultDataVisible: false,
      artifactMetadata: {
        artifactType: "distribution",
        dataTableFirst: false
      }
    };
  }
  const groupByColumn = ((_b = presentationPlan.bindings) == null ? void 0 : _b.groupByColumn) ?? ((_c = evidencePlan.query.groupBy) == null ? void 0 : _c[0]);
  const primaryMetric = ((_d = presentationPlan.bindings) == null ? void 0 : _d.valueColumn) ?? ((_g = (_f = (_e = evidencePlan.query.aggregates) == null ? void 0 : _e[0]) == null ? void 0 : _f.as) == null ? void 0 : _g.trim()) ?? evidencePlan.query.select.find((column) => column !== groupByColumn);
  const xValueColumn = (_h = presentationPlan.bindings) == null ? void 0 : _h.xValueColumn;
  const yValueColumn = (_i = presentationPlan.bindings) == null ? void 0 : _i.yValueColumn;
  const secondaryValueColumn = ((_j = presentationPlan.bindings) == null ? void 0 : _j.secondaryValueColumn) ?? ((_m = (_l = (_k = evidencePlan.query.aggregates) == null ? void 0 : _k[1]) == null ? void 0 : _l.as) == null ? void 0 : _m.trim());
  const fallbackChartType = evidencePlan.queryMode === "rowset" ? "scatter" : smartDefaultChartType(secondaryValueColumn ? 2 : 1);
  const chartType = presentationPlan.chartType ?? fallbackChartType;
  if (!groupByColumn && !xValueColumn && !yValueColumn) {
    return null;
  }
  const primaryAggregate = (_o = (_n = evidencePlan.query.aggregates) == null ? void 0 : _n[0]) == null ? void 0 : _o.function;
  const secondaryAggregate = (_q = (_p = evidencePlan.query.aggregates) == null ? void 0 : _p[1]) == null ? void 0 : _q.function;
  return {
    chartType,
    title: presentationPlan.title,
    description: presentationPlan.description,
    aggregation: primaryAggregate === "sum" || primaryAggregate === "count" || primaryAggregate === "avg" ? primaryAggregate : void 0,
    secondaryAggregation: secondaryAggregate === "sum" || secondaryAggregate === "count" || secondaryAggregate === "avg" ? secondaryAggregate : void 0,
    groupByColumn,
    valueColumn: primaryMetric,
    xValueColumn,
    yValueColumn,
    secondaryValueColumn,
    preFilter: evidencePlan.preFilter,
    defaultTopN: presentationPlan.defaultTopN,
    defaultHideOthers: presentationPlan.defaultHideOthers,
    defaultDataVisible: false,
    artifactMetadata: {
      artifactType: "distribution",
      dataTableFirst: false
    }
  };
};
const LOG_PREFIX$1 = "[TopicProcessor]";
const MAX_EXECUTION_ATTEMPTS = 3;
const RETRYABLE_EXECUTION_CODES = /* @__PURE__ */ new Set(["empty_result"]);
const SOFT_SKIP_CODES = /* @__PURE__ */ new Set(["empty_result"]);
const EXECUTION_RETRY_LIMIT_BY_CODE = {
  empty_result: 2
};
const EXECUTION_TYPED_REASON_BY_CODE = {
  empty_result: "empty_result"
};
const getExecutionRetryLimit = (code) => EXECUTION_RETRY_LIMIT_BY_CODE[code] ?? MAX_EXECUTION_ATTEMPTS;
const buildExecutionReplanReasonCode = (code) => {
  switch (code) {
    case "empty_result":
      return "replan_after_empty_result";
    default:
      return code;
  }
};
const buildTypedExecutionReasonCode = (code) => EXECUTION_TYPED_REASON_BY_CODE[code] ?? code;
const buildPlannerFeedbackForExecutionError = (topic, error) => {
  switch (error.code) {
    case "empty_result":
      return `The previous SQL evidence query returned no rows. Rewrite the plan so it still answers "${topic}" but broadens the query enough to produce a non-empty result.`;
    default:
      return void 0;
  }
};
const buildLearningHintsFromHistory = (runs, blockedDimensions) => {
  if (!runs || runs.length === 0) return void 0;
  const blocked = new Set(blockedDimensions ?? []);
  const avoidMap = /* @__PURE__ */ new Map();
  const preferMap = /* @__PURE__ */ new Map();
  runs.forEach((run) => {
    run.findings.explorations.forEach((exploration) => {
      if (!exploration.groupBy || exploration.groupBy.length === 0) return;
      const key = exploration.groupBy[0];
      if (!key) return;
      if (blocked.has(key)) return;
      if (exploration.verdict === "flat_metric" || exploration.verdict === "no_data") {
        avoidMap.set(key, (avoidMap.get(key) ?? 0) + 1);
      } else if (exploration.cardCreated || exploration.verdict === "useful") {
        preferMap.set(key, (preferMap.get(key) ?? 0) + 1);
      }
    });
  });
  const toSortedList = (map) => Array.from(map.entries()).filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1]).map(([name]) => name).slice(0, 8);
  const avoidGroupBys = toSortedList(avoidMap);
  const preferGroupBys = toSortedList(preferMap);
  return avoidGroupBys.length > 0 || preferGroupBys.length > 0 ? { avoidGroupBys, preferGroupBys } : void 0;
};
const classifyTopicFailure = (error) => {
  if (isSqlAutoAnalysisError(error)) {
    return { code: error.code, message: error.message };
  }
  const message = error instanceof Error ? error.message : String(error);
  return {
    code: "planning_invalid",
    message
  };
};
const FULL_DATE_VALUE_PATTERN = /^\d{1,4}[/-]\d{1,2}[/-]\d{1,4}$/;
const DAY_OF_MONTH_PATTERN = /^(?:[1-9]|[12]\d|3[01])$/;
const normalizeScalarText = (value) => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
};
const isFullDateValue = (value) => typeof value === "string" && FULL_DATE_VALUE_PATTERN.test(value.trim());
const isDayOfMonthValue = (value) => DAY_OF_MONTH_PATTERN.test(normalizeScalarText(value) ?? "");
const detectTemporalGrainCollapse = (data, groupByColumns, semanticUnderstanding, evidenceSummary, columnProfiles) => {
  if (groupByColumns.length === 0 || evidenceSummary.previewRows.length === 0) {
    return null;
  }
  for (const column of groupByColumns) {
    const profile = columnProfiles.find((candidate) => candidate.name === column);
    const isTimeLike = semanticUnderstanding.timeGrains.includes(column) || evidenceSummary.timeColumns.includes(column) || (profile == null ? void 0 : profile.type) === "date" || (profile == null ? void 0 : profile.type) === "time";
    if (!isTimeLike) {
      continue;
    }
    const sourceSamples = data.data.map((row) => row[column]).map(normalizeScalarText).filter((value) => Boolean(value)).slice(0, 50);
    const previewValues = evidenceSummary.previewRows.map((row) => row[column]).map(normalizeScalarText).filter((value) => Boolean(value));
    if (sourceSamples.length === 0 || previewValues.length === 0) {
      continue;
    }
    const sourceHasFullDates = sourceSamples.some(isFullDateValue);
    const previewCollapsedToDay = previewValues.every(isDayOfMonthValue);
    const previewStillHasFullDates = previewValues.some(isFullDateValue);
    if (sourceHasFullDates && previewCollapsedToDay && !previewStillHasFullDates) {
      return {
        column,
        sourceExample: sourceSamples.find(isFullDateValue) ?? sourceSamples[0],
        previewExample: previewValues[0]
      };
    }
  }
  return null;
};
const buildTemporalPlanningGuardrail = (data, semanticUnderstanding, columnProfiles) => {
  const guardedColumns = columnProfiles.filter(
    (profile) => (profile.type === "date" || profile.type === "time" || semanticUnderstanding.timeGrains.includes(profile.name)) && data.data.some((row) => isFullDateValue(row[profile.name]))
  ).map((profile) => ({
    name: profile.name,
    example: data.data.map((row) => row[profile.name]).find(isFullDateValue) ?? null
  })).filter((entry) => entry.example);
  if (guardedColumns.length === 0) {
    return void 0;
  }
  const examples = guardedColumns.map((entry) => `"${entry.name}" (e.g. "${entry.example}")`).join(", ");
  return `Temporal columns ${examples} contain full date values. Preserve full-date grain in SQL planning and grouping. Do not collapse these columns to day-of-month values such as 1-31 unless the user explicitly asks for a monthly-cycle or day-of-month analysis.`;
};
const normalizeTemporalTopic = (topic, data, semanticUnderstanding, columnProfiles) => {
  if (!/\bday of (?:the )?month\b/i.test(topic)) {
    return null;
  }
  const fullDateColumn = columnProfiles.find(
    (profile) => (profile.type === "date" || profile.type === "time" || semanticUnderstanding.timeGrains.includes(profile.name)) && data.data.some((row) => isFullDateValue(row[profile.name]))
  );
  if (!fullDateColumn) {
    return null;
  }
  const normalizedTopic = topic.replace(/\bday of (?:the )?month\b/ig, fullDateColumn.name);
  return normalizedTopic !== topic ? { topic: normalizedTopic, column: fullDateColumn.name } : null;
};
const processSingleTopic = async (topic, data, store, binding, existingAcceptedOutputs = [], options) => {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i;
  const { getState } = store;
  if (getState().isChangingGoal) {
    return { status: "aborted" };
  }
  const sourceStepIds = [];
  const recordStep = (record) => {
    var _a2;
    const stepId = (_a2 = options == null ? void 0 : options.recordAnalysisStep) == null ? void 0 : _a2.call(options, record);
    if (stepId) {
      sourceStepIds.push(stepId);
    }
    return stepId;
  };
  emitAgentEvent(store, {
    phase: "planning",
    step: "plan_topic",
    status: "in_progress",
    message: `Planning SQL-first analysis for topic "${topic}".`,
    detail: { analysisEngine: "duckdb", duckDbRequired: true }
  });
  try {
    const learningHints = buildLearningHintsFromHistory(
      getState().agentMemoryHistory,
      (_a = options == null ? void 0 : options.semanticUnderstanding) == null ? void 0 : _a.blockedDimensions
    );
    let plannerFeedback;
    let completedResult = null;
    const datasetContext = (options == null ? void 0 : options.datasetContext) ?? buildDatasetContext(
      data,
      getState().columnProfiles,
      getState().reportContextResolution,
      getState().datasetSemanticSnapshot,
      getState().semanticDatasetVersion,
      getState().dataPreparationPlan,
      getState().rawCsvData ?? data
    );
    const semanticUnderstanding = (options == null ? void 0 : options.semanticUnderstanding) ?? buildRuntimeSemanticUnderstanding({
      columns: getState().columnProfiles,
      analysisBrief: buildAnalysisIntentBrief({
        columns: getState().columnProfiles,
        csvData: data,
        dataPreparationPlan: getState().dataPreparationPlan ?? null,
        datasetSemanticSnapshot: getState().datasetSemanticSnapshot,
        semanticDatasetVersion: getState().semanticDatasetVersion
      }),
      reportContextResolution: getState().reportContextResolution,
      datasetSemanticSnapshot: getState().datasetSemanticSnapshot
    });
    const temporalPlanningGuardrail = buildTemporalPlanningGuardrail(
      data,
      semanticUnderstanding,
      getState().columnProfiles
    );
    const temporalTopicNormalization = normalizeTemporalTopic(
      topic,
      data,
      semanticUnderstanding,
      getState().columnProfiles
    );
    const planningTopic = (temporalTopicNormalization == null ? void 0 : temporalTopicNormalization.topic) ?? topic;
    if (temporalTopicNormalization) {
      recordStep({
        type: "refine_hypothesis",
        status: "succeeded",
        inputSummary: `Normalize temporal topic "${topic}" to preserve full-date grain.`,
        inputSummaryI18n: {
          key: "analysis_trace_refine_hypothesis_input",
          vars: { topic }
        },
        outputSummary: `Rewrote temporal topic to "${planningTopic}" so "${temporalTopicNormalization.column}" keeps full-date grain.`,
        outputSummaryI18n: {
          key: "analysis_trace_refine_hypothesis_output_feedback",
          vars: { message: `Rewrote temporal topic to preserve "${temporalTopicNormalization.column}" full-date grain.` }
        },
        decision: "plan_probe_query",
        hypothesisId: (options == null ? void 0 : options.hypothesisId) ?? null,
        reasonCodes: ["temporal_topic_normalized"]
      });
    }
    if (!datasetContext.analysisSteering && (options == null ? void 0 : options.harnessContext)) {
      const currentColNames = getState().columnProfiles.map((p) => p.name);
      const harness = options.harnessContext;
      const detailCol = harness.detailRowColumn;
      if (detailCol && !currentColNames.some((c) => c.toLowerCase() === detailCol.toLowerCase())) {
        const fallbackName = currentColNames.find((c) => /^(rowrole|resolvedrowrole|rowclass)$/i.test(c)) ?? null;
        datasetContext.analysisSteering = {
          ...harness,
          detailRowColumn: fallbackName,
          detailRowValue: fallbackName ? harness.detailRowValue : null,
          detailRowFilter: fallbackName && harness.detailRowValue ? { column: fallbackName, value: harness.detailRowValue } : null
        };
      } else {
        datasetContext.analysisSteering = harness;
      }
    }
    let escalatedToFull = false;
    const emitPlannerEscalation = (reason, attempt, detail) => {
      if (escalatedToFull) {
        return;
      }
      escalatedToFull = true;
      recordRuntimeEvent(store, {
        type: "planner_escalated_to_full",
        stage: "executing",
        message: `Escalated planner to full mode for topic "${topic}" after ${reason}.`,
        detail: {
          topic,
          attempt,
          reason,
          ...detail ?? {}
        }
      });
    };
    const mergePlannerFeedback = (feedback) => [temporalPlanningGuardrail, feedback].filter((value) => typeof value === "string" && value.trim().length > 0).join("\n\n") || void 0;
    for (let attempt = 1; attempt <= MAX_EXECUTION_ATTEMPTS; attempt += 1) {
      const shouldUseSteppedPlanner = attempt === 1 && !escalatedToFull;
      let evidencePlan;
      if (shouldUseSteppedPlanner) {
        try {
          evidencePlan = await generateEvidenceQueryPlanStepped(
            planningTopic,
            getState().columnProfiles,
            getState().settings,
            options == null ? void 0 : options.harnessSummary,
            datasetContext,
            options == null ? void 0 : options.planningIntent,
            mergePlannerFeedback(plannerFeedback)
          );
        } catch (error) {
          emitPlannerEscalation(
            isSqlAutoAnalysisError(error) ? error.code : "stepped_planner_failure",
            attempt,
            { plannerFeedback: plannerFeedback ?? null }
          );
          evidencePlan = await generateEvidenceQueryPlanWithRetry(
            planningTopic,
            getState().columnProfiles,
            getState().settings,
            learningHints,
            getState(),
            mergePlannerFeedback(plannerFeedback),
            datasetContext,
            data.data,
            options == null ? void 0 : options.explorationContext,
            options == null ? void 0 : options.harnessSummary,
            options == null ? void 0 : options.planningIntent
          );
        }
      } else {
        evidencePlan = await generateEvidenceQueryPlanWithRetry(
          planningTopic,
          getState().columnProfiles,
          getState().settings,
          learningHints,
          getState(),
          mergePlannerFeedback(plannerFeedback),
          datasetContext,
          data.data,
          options == null ? void 0 : options.explorationContext,
          options == null ? void 0 : options.harnessSummary,
          options == null ? void 0 : options.planningIntent
        );
      }
      recordStep({
        type: "plan_probe_query",
        status: "succeeded",
        inputSummary: `Plan ${attempt} evidence query for topic "${topic}".`,
        inputSummaryI18n: {
          key: "analysis_trace_plan_probe_query_input",
          vars: {
            topic,
            attempt
          }
        },
        outputSummary: `Generated ${evidencePlan.queryMode === "aggregate" ? "aggregate" : "detail"} query plan "${evidencePlan.title}".`,
        outputSummaryI18n: {
          key: "analysis_trace_plan_probe_query_output",
          vars: {
            queryMode: evidencePlan.queryMode === "aggregate" ? "aggregate" : "detail",
            title: evidencePlan.title
          }
        },
        decision: "execute_probe_query",
        hypothesisId: (options == null ? void 0 : options.hypothesisId) ?? null,
        queryRef: null
      });
      if (getState().isChangingGoal) {
        return { status: "aborted" };
      }
      if (evidencePlan.queryMode === "aggregate" && semanticUnderstanding) {
        const planGroupBys = evidencePlan.query.groupBy ?? [];
        const blockedDims = semanticUnderstanding.blockedDimensions ?? [];
        const businessGrains = semanticUnderstanding.businessGrains ?? [];
        const blockedGroupBy = planGroupBys.find(
          (col) => blockedDims.includes(col) && !businessGrains.includes(col)
        );
        if (blockedGroupBy) {
          if (attempt < MAX_EXECUTION_ATTEMPTS) {
            emitPlannerEscalation("blocked_dimension_replan", attempt, { blockedGroupBy });
            const allowedDims = businessGrains.length > 0 ? businessGrains : (((_b = options == null ? void 0 : options.datasetContext) == null ? void 0 : _b.dimensionColumns) ?? []).filter((d) => !blockedDims.includes(d));
            const steeringDetailCol = ((_c = datasetContext.analysisSteering) == null ? void 0 : _c.detailRowColumn) ?? null;
            const steeringDetailVal = ((_d = datasetContext.analysisSteering) == null ? void 0 : _d.detailRowValue) ?? "fact";
            const isDetailRowDim = (col) => steeringDetailCol ? col.toLowerCase() === steeringDetailCol.toLowerCase() : /^rowclass$/i.test(col);
            const blockedForGroupByOnly = blockedDims.filter((d) => !isDetailRowDim(d));
            const detailRowNote = steeringDetailCol ? `Note: "${steeringDetailCol}" can still be used in a WHERE clause (e.g. WHERE "${steeringDetailCol}"='${steeringDetailVal}') — it is only blocked as a groupBy.` : "Note: RowClass can still be used in a WHERE clause (e.g. WHERE RowClass='fact') — it is only blocked as a groupBy.";
            plannerFeedback = `The previous query plan grouped by "${blockedGroupBy}", which is a blocked/metadata dimension and must not be used as a groupBy column. Rewrite the plan for "${topic}" using only these allowed groupBy dimensions: ${allowedDims.join(", ") || "none identified"}. Do NOT use any of these as groupBy: ${blockedForGroupByOnly.join(", ")}. Do NOT use row index or row number columns as groupBy. ${detailRowNote}`;
            recordStep({
              type: "refine_hypothesis",
              status: "succeeded",
              inputSummary: `Evidence plan for "${topic}" used blocked dimension "${blockedGroupBy}"; retrying with corrected guidance.`,
              inputSummaryI18n: {
                key: "analysis_trace_refine_hypothesis_input",
                vars: { topic }
              },
              outputSummary: `Blocked dimension "${blockedGroupBy}" detected in groupBy — replanning with explicit dimension constraints.`,
              outputSummaryI18n: {
                key: "analysis_trace_refine_hypothesis_output_feedback",
                vars: { message: `Blocked dimension "${blockedGroupBy}" — replanning.` }
              },
              decision: "plan_probe_query",
              hypothesisId: (options == null ? void 0 : options.hypothesisId) ?? null,
              reasonCodes: ["blocked_dimension_replan", "blocked_dimension"]
            });
            continue;
          }
          recordStep({
            type: "evaluate_evidence",
            status: "rejected",
            inputSummary: `Assess whether evidence query "${evidencePlan.title}" is worth presenting.`,
            inputSummaryI18n: {
              key: "analysis_trace_evaluate_evidence_input",
              vars: { title: evidencePlan.title }
            },
            outputSummary: `Evidence gate decision: reject (groupBy "${blockedGroupBy}" is a blocked dimension after ${attempt} attempts).`,
            outputSummaryI18n: {
              key: "analysis_trace_evaluate_evidence_output",
              vars: { decision: "reject" }
            },
            decision: "reject_hypothesis",
            hypothesisId: (options == null ? void 0 : options.hypothesisId) ?? null,
            reasonCodes: ["blocked_dimension"]
          });
          completedResult = {
            status: "completed",
            cardCreated: false,
            tableFirst: false,
            accepted: false,
            valueDecision: "reject",
            evidenceLoopState: null,
            sourceStepIds,
            rejectionReason: `groupBy "${blockedGroupBy}" is a blocked dimension`
          };
          break;
        }
      }
      {
        const preExecQuerySig = buildEvidenceSignature(evidencePlan);
        const preExecSemanticSig = buildPlanOnlySemanticSignature(evidencePlan, semanticUnderstanding);
        const isDuplicateQuery = existingAcceptedOutputs.some((o) => o.querySignature === preExecQuerySig);
        const isDuplicateSemantic = existingAcceptedOutputs.some((o) => o.semanticSignature === preExecSemanticSig);
        if (isDuplicateQuery || isDuplicateSemantic) {
          const dupReasonCodes = [];
          if (isDuplicateQuery) dupReasonCodes.push("duplicate_query");
          if (isDuplicateSemantic) dupReasonCodes.push("duplicate_semantic");
          recordStep({
            type: "evaluate_evidence",
            status: "rejected",
            inputSummary: `Pre-execution duplicate check for "${evidencePlan.title}".`,
            inputSummaryI18n: {
              key: "analysis_trace_evaluate_evidence_input",
              vars: { title: evidencePlan.title }
            },
            outputSummary: `Plan rejected before execution: ${dupReasonCodes.join(", ")}.`,
            outputSummaryI18n: {
              key: "analysis_trace_evaluate_evidence_output",
              vars: { decision: "reject" }
            },
            decision: "reject_hypothesis",
            hypothesisId: (options == null ? void 0 : options.hypothesisId) ?? null,
            reasonCodes: dupReasonCodes,
            querySignature: preExecQuerySig,
            semanticSignature: preExecSemanticSig,
            queryTitle: evidencePlan.title,
            queryMode: evidencePlan.queryMode
          });
          completedResult = {
            status: "completed",
            cardCreated: false,
            tableFirst: false,
            accepted: false,
            valueDecision: "reject",
            evidenceLoopState: null,
            sourceStepIds,
            rejectionReason: `pre-execution duplicate: ${dupReasonCodes.join(", ")}`
          };
          break;
        }
        const titleTokens = (t) => new Set(t.toLowerCase().match(/\w+/g) ?? []);
        const jaccardScore = (a, b) => {
          if (a.size === 0 && b.size === 0) return 1;
          const intersection = [...a].filter((w) => b.has(w)).length;
          const union = (/* @__PURE__ */ new Set([...a, ...b])).size;
          return union === 0 ? 0 : intersection / union;
        };
        const newTitleTokens = titleTokens(evidencePlan.title);
        const highJaccardMatch = existingAcceptedOutputs.find((o) => {
          const score = jaccardScore(newTitleTokens, titleTokens(o.title));
          return score >= 0.6;
        });
        let highEmbeddingMatch = null;
        try {
          const hits = await vectorStore.searchIfReady(evidencePlan.title, 3);
          const bestHit = hits.find((h) => h.score >= 0.85);
          if (bestHit) {
            highEmbeddingMatch = { title: bestHit.text };
          }
        } catch {
        }
        if (highJaccardMatch ?? highEmbeddingMatch) {
          const matchedTitle = (highJaccardMatch == null ? void 0 : highJaccardMatch.title) ?? (highEmbeddingMatch == null ? void 0 : highEmbeddingMatch.title) ?? "";
          recordStep({
            type: "evaluate_evidence",
            status: "rejected",
            inputSummary: `Semantic fuzzy duplicate check for "${evidencePlan.title}".`,
            inputSummaryI18n: {
              key: "analysis_trace_evaluate_evidence_input",
              vars: { title: evidencePlan.title }
            },
            outputSummary: `Plan rejected: semantically similar to "${matchedTitle}".`,
            outputSummaryI18n: {
              key: "analysis_trace_evaluate_evidence_output",
              vars: { decision: "reject" }
            },
            decision: "reject_hypothesis",
            hypothesisId: (options == null ? void 0 : options.hypothesisId) ?? null,
            reasonCodes: ["duplicate_semantic_fuzzy"],
            querySignature: preExecQuerySig,
            semanticSignature: preExecSemanticSig,
            queryTitle: evidencePlan.title,
            queryMode: evidencePlan.queryMode
          });
          completedResult = {
            status: "completed",
            cardCreated: false,
            tableFirst: false,
            accepted: false,
            valueDecision: "reject",
            evidenceLoopState: null,
            sourceStepIds,
            rejectionReason: `pre-execution semantic fuzzy duplicate of "${matchedTitle}"`
          };
          break;
        }
      }
      try {
        const evidenceExecution = await executeEvidenceQuery(evidencePlan, store, binding, { topic, dataset: data });
        recordStep({
          type: "execute_probe_query",
          status: "succeeded",
          inputSummary: `Execute evidence query "${evidencePlan.title}".`,
          inputSummaryI18n: {
            key: "analysis_trace_execute_probe_query_input",
            vars: {
              title: evidencePlan.title
            }
          },
          outputSummary: `Query returned ${evidenceExecution.result.rows.length} rows and ${((_e = evidenceExecution.result.selectedColumns) == null ? void 0 : _e.length) ?? 0} columns.`,
          outputSummaryI18n: {
            key: "analysis_trace_execute_probe_query_output",
            vars: {
              rows: evidenceExecution.result.rows.length,
              columns: ((_f = evidenceExecution.result.selectedColumns) == null ? void 0 : _f.length) ?? 0
            }
          },
          decision: "evaluate_evidence",
          hypothesisId: (options == null ? void 0 : options.hypothesisId) ?? null,
          queryRef: evidenceExecution.execution.sqlPreview ?? null,
          queryTitle: evidencePlan.title,
          queryMode: evidencePlan.queryMode
        });
        const evidenceSummary = buildEvidenceResultSummary(
          evidencePlan,
          evidenceExecution.result,
          getState().columnProfiles
        );
        const temporalCollapse = detectTemporalGrainCollapse(
          data,
          evidencePlan.query.groupBy ?? [],
          semanticUnderstanding,
          evidenceSummary,
          getState().columnProfiles
        );
        if (temporalCollapse) {
          const temporalFeedback = `The previous SQL evidence query collapsed full dates in "${temporalCollapse.column}" into day-of-month values like "${temporalCollapse.previewExample}". Rewrite the plan for "${topic}" so "${temporalCollapse.column}" preserves full-date grain such as "${temporalCollapse.sourceExample}" instead of extracting only the day number.`;
          if (attempt < MAX_EXECUTION_ATTEMPTS) {
            emitPlannerEscalation("temporal_grain_collapse", attempt, {
              column: temporalCollapse.column,
              previewExample: temporalCollapse.previewExample,
              sourceExample: temporalCollapse.sourceExample
            });
            plannerFeedback = temporalFeedback;
            recordStep({
              type: "refine_hypothesis",
              status: "succeeded",
              inputSummary: `Evidence for "${topic}" collapsed "${temporalCollapse.column}" to day-of-month values; retrying with full-date guidance.`,
              inputSummaryI18n: {
                key: "analysis_trace_refine_hypothesis_input",
                vars: { topic }
              },
              outputSummary: `Detected temporal grain collapse in "${temporalCollapse.column}" — replanning with full-date preservation guidance.`,
              outputSummaryI18n: {
                key: "analysis_trace_refine_hypothesis_output_feedback",
                vars: { message: `Temporal grain collapse in "${temporalCollapse.column}" — replanning.` }
              },
              decision: "plan_probe_query",
              hypothesisId: (options == null ? void 0 : options.hypothesisId) ?? null,
              reasonCodes: ["replan_after_temporal_grain_collapse", "temporal_grain_collapse"],
              queryTitle: evidencePlan.title,
              queryMode: evidencePlan.queryMode
            });
            continue;
          }
          throw new SqlAutoAnalysisError(
            "planning_invalid",
            `Evidence query "${evidencePlan.title}" collapsed "${temporalCollapse.column}" to day-of-month values.`,
            {
              topic,
              column: temporalCollapse.column,
              previewExample: temporalCollapse.previewExample,
              sourceExample: temporalCollapse.sourceExample
            }
          );
        }
        const harnessContext = (options == null ? void 0 : options.harnessContext) ?? null;
        const aiEvaluation = await callAiEvidenceEvaluation(
          planningTopic,
          evidencePlan,
          evidenceSummary,
          semanticUnderstanding,
          getState().settings,
          harnessContext
        );
        const valueGate = evaluateEvidenceValue({
          semanticUnderstanding,
          evidencePlan,
          evidenceSummary,
          existingAcceptedOutputs,
          aiEvaluation,
          harnessContext
        });
        recordStep({
          type: "evaluate_evidence",
          status: valueGate.decision === "reject" ? "rejected" : "succeeded",
          inputSummary: `Assess whether evidence query "${evidencePlan.title}" is worth presenting.`,
          inputSummaryI18n: {
            key: "analysis_trace_evaluate_evidence_input",
            vars: {
              title: evidencePlan.title
            }
          },
          outputSummary: `Evidence gate decision: ${valueGate.decision}.`,
          outputSummaryI18n: {
            key: "analysis_trace_evaluate_evidence_output",
            vars: {
              decision: valueGate.decision
            }
          },
          decision: valueGate.decision === "reject" ? "reject_hypothesis" : "plan_presentation",
          hypothesisId: (options == null ? void 0 : options.hypothesisId) ?? null,
          reasonCodes: valueGate.reasonCodes,
          querySignature: valueGate.querySignature,
          semanticSignature: valueGate.semanticSignature,
          queryRef: evidenceExecution.execution.sqlPreview ?? null,
          queryTitle: evidencePlan.title,
          queryMode: evidencePlan.queryMode
        });
        const evidenceLoopState = {
          queryPlan: evidencePlan,
          resultSummary: evidenceSummary,
          semanticRisk: valueGate.semanticRisk,
          nextBestAction: valueGate.decision === "pass" ? "promote_to_presentation" : valueGate.decision === "table_only" ? "accept_table" : "stop_low_value"
        };
        if (valueGate.decision === "reject") {
          completedResult = {
            status: "completed",
            cardCreated: false,
            tableFirst: false,
            accepted: false,
            valueDecision: valueGate.decision,
            evidenceLoopState,
            sourceStepIds,
            rejectionReason: valueGate.detail,
            valueReasonCodes: valueGate.reasonCodes,
            evidenceDetail: valueGate.detail
          };
          break;
        }
        const shouldUseAiPresentation = valueGate.decision === "pass" && (harnessContext == null ? void 0 : harnessContext.signalConfidence) !== "low";
        const aiPresentationPlan = shouldUseAiPresentation ? await callAiPresentationPlan(
          planningTopic,
          evidencePlan,
          evidenceSummary,
          getState().columnProfiles,
          getState().settings,
          {
            semanticUnderstanding,
            valueGate,
            harnessContext,
            telemetryTarget: getState()
          }
        ) : null;
        const presentationPlan = aiPresentationPlan ?? buildDeterministicSqlPresentationPlan(
          evidencePlan,
          evidenceSummary,
          getState().columnProfiles,
          {
            semanticUnderstanding,
            valueGate,
            harnessContext
          }
        );
        recordStep({
          type: "plan_presentation",
          status: presentationPlan.presentationMode === "hidden" ? "rejected" : "succeeded",
          inputSummary: `Decide presentation mode for topic "${topic}" based on evidence shape.`,
          inputSummaryI18n: {
            key: "analysis_trace_plan_presentation_input",
            vars: {
              topic
            }
          },
          outputSummary: `Presentation mode = ${presentationPlan.presentationMode}${presentationPlan.chartType ? `, chart = ${presentationPlan.chartType}` : ""}.`,
          outputSummaryI18n: {
            key: "analysis_trace_plan_presentation_output",
            vars: {
              presentationMode: presentationPlan.presentationMode,
              chartTypeSuffix: presentationPlan.chartType ? `, chart = ${presentationPlan.chartType}` : ""
            }
          },
          decision: presentationPlan.presentationMode === "hidden" ? "reject_hypothesis" : "emit_standard_card",
          hypothesisId: (options == null ? void 0 : options.hypothesisId) ?? null,
          reasonCodes: valueGate.reasonCodes
        });
        const presentation = await executePresentationPlanAndCreateCard(
          evidencePlan,
          presentationPlan,
          store,
          evidenceSummary,
          evidenceExecution,
          {
            topic: planningTopic,
            valueGate,
            sourceStepIds,
            analysisSessionRunId: (options == null ? void 0 : options.analysisSessionRunId) ?? null
          }
        );
        if (presentation.card) {
          recordStep({
            type: "emit_standard_card",
            status: "succeeded",
            inputSummary: `Generate standard card for topic "${topic}".`,
            inputSummaryI18n: {
              key: "analysis_trace_emit_standard_card_input",
              vars: {
                topic
              }
            },
            outputSummary: `Created card "${((_g = presentation.card.plan) == null ? void 0 : _g.title) ?? presentationPlan.title}".`,
            outputSummaryI18n: {
              key: "analysis_trace_emit_standard_card_output",
              vars: {
                title: ((_h = presentation.card.plan) == null ? void 0 : _h.title) ?? presentationPlan.title
              }
            },
            decision: "dedupe_candidate",
            hypothesisId: (options == null ? void 0 : options.hypothesisId) ?? null
          });
        }
        completedResult = {
          status: "completed",
          cardCreated: Boolean(presentation.card),
          tableFirst: presentation.presentationPlan.presentationMode !== "chart",
          accepted: Boolean(presentation.card),
          valueDecision: valueGate.decision,
          evidenceLoopState,
          sourceStepIds,
          cardId: ((_i = presentation.card) == null ? void 0 : _i.id) ?? null,
          acceptedEvidence: {
            querySignature: valueGate.querySignature,
            semanticSignature: valueGate.semanticSignature,
            decision: valueGate.decision,
            title: evidencePlan.title
          },
          valueReasonCodes: valueGate.reasonCodes,
          evidenceDetail: valueGate.detail
        };
        break;
      } catch (error) {
        if (!(error instanceof SqlAutoAnalysisError) || !RETRYABLE_EXECUTION_CODES.has(error.code)) {
          throw error;
        }
        const retryLimit = getExecutionRetryLimit(error.code);
        if (attempt >= retryLimit) {
          throw error;
        }
        emitPlannerEscalation(error.code, attempt, { retryFeedback: plannerFeedback ?? null });
        plannerFeedback = buildPlannerFeedbackForExecutionError(topic, error);
        recordStep({
          type: "refine_hypothesis",
          status: "succeeded",
          inputSummary: `First-pass evidence for topic "${topic}" was weak; applying controlled refinement.`,
          inputSummaryI18n: {
            key: "analysis_trace_refine_hypothesis_input",
            vars: {
              topic
            }
          },
          outputSummary: plannerFeedback ?? `Retrying after ${error.code}.`,
          outputSummaryI18n: plannerFeedback ? {
            key: "analysis_trace_refine_hypothesis_output_feedback",
            vars: {
              message: plannerFeedback
            }
          } : {
            key: "analysis_trace_refine_hypothesis_output_retry",
            vars: {
              errorCode: error.code
            }
          },
          decision: "plan_probe_query",
          hypothesisId: (options == null ? void 0 : options.hypothesisId) ?? null,
          reasonCodes: [.../* @__PURE__ */ new Set([buildExecutionReplanReasonCode(error.code), buildTypedExecutionReasonCode(error.code), error.code])]
        });
      }
    }
    if (!completedResult || completedResult.status !== "completed") {
      throw new SqlAutoAnalysisError("planning_invalid", `SQL-first planning did not produce a usable plan for "${topic}".`, { topic });
    }
    emitAgentEvent(store, {
      phase: "planning",
      step: "plan_topic",
      status: "done",
      message: `Completed SQL-first topic "${topic}".`,
      detail: {
        analysisEngine: "duckdb",
        duckDbRequired: true,
        cardCreated: completedResult.cardCreated,
        tableFirst: completedResult.tableFirst,
        valueDecision: completedResult.valueDecision
      }
    });
    return completedResult;
  } catch (error) {
    const failure = classifyTopicFailure(error);
    const isSoftSkip = SOFT_SKIP_CODES.has(failure.code);
    console[isSoftSkip ? "warn" : "error"](`${LOG_PREFIX$1} Topic "${topic}" ${isSoftSkip ? "skipped" : "failed"}.`, error);
    emitAgentEvent(store, {
      phase: "planning",
      step: "plan_topic",
      status: isSoftSkip ? "done" : "error",
      message: isSoftSkip ? `SQL-first planning skipped topic "${topic}": ${failure.message}` : `SQL-first planning failed for topic "${topic}": ${failure.message}`,
      detail: {
        failureStage: failure.code,
        outcome: isSoftSkip ? "skipped_topic" : "failed_topic",
        analysisEngine: "duckdb",
        duckDbRequired: true
      }
    });
    recordStep({
      type: "stop_session",
      status: isSoftSkip ? "skipped" : "failed",
      inputSummary: `Topic "${topic}" could not complete evidence analysis.`,
      inputSummaryI18n: {
        key: "analysis_trace_topic_failed_input",
        vars: {
          topic
        }
      },
      outputSummary: failure.message,
      outputSummaryI18n: {
        key: "analysis_trace_topic_failed_output",
        vars: {
          reason: failure.message
        }
      },
      decision: "stop_session",
      hypothesisId: (options == null ? void 0 : options.hypothesisId) ?? null,
      reasonCodes: [failure.code]
    });
    throw error instanceof SqlAutoAnalysisError ? error : new SqlAutoAnalysisError(failure.code, failure.message, { topic, rowCount: data.data.length });
  }
};
const LOG_PREFIX = "[GoalProposer]";
const formatTemplateHints = (matches) => matches.map((m) => ({
  label: `📋 ${m.title}`,
  action: m.description || m.title
}));
const proposeAnalysisGoals = async (dataForAnalysis, store) => {
  const { getState, setState } = store;
  if (!dataForAnalysis) {
    return;
  }
  getState().addProgress("AI is preparing follow-up analysis suggestions...", "system", getState().settings.complexModel);
  console.log(`${LOG_PREFIX} Generating follow-up analysis suggestions...`);
  try {
    const columnProfiles = getState().columnProfiles;
    const templateMatchesPromise = findTemplateMatches(columnProfiles, 2).catch((error) => {
      console.warn(`${LOG_PREFIX} Template match retrieval failed (non-blocking):`, error);
      return [];
    });
    const patternQueryText = `Analysis patterns: ${columnProfiles.map((c) => `${c.name} (${c.type})`).join(", ")}`;
    const patternMatchesPromise = vectorStore.searchIfReady(patternQueryText, 3).catch((error) => {
      console.warn(`${LOG_PREFIX} Vector pattern search failed (non-blocking):`, error);
      return [];
    });
    const reportContext = resolveEffectiveReportContext(
      getState().reportContextResolution ?? null,
      getState().rawCsvData ?? null,
      dataForAnalysis
    );
    const brief = buildAnalysisIntentBrief({
      columns: columnProfiles,
      csvData: dataForAnalysis,
      dataPreparationPlan: getState().dataPreparationPlan ?? null,
      datasetSemanticSnapshot: getState().datasetSemanticSnapshot ?? null,
      semanticDatasetVersion: getState().semanticDatasetVersion ?? null
    });
    const goals = await generateAnalysisGoalCandidates(
      columnProfiles,
      getSemanticSampleRows(
        dataForAnalysis,
        getState().datasetSemanticSnapshot,
        getState().semanticDatasetVersion,
        5
      ),
      getState().settings,
      getState()
    );
    console.log(`${LOG_PREFIX} AI suggested follow-up goals:`, goals);
    const [templateMatches, patternMatches] = await Promise.all([templateMatchesPromise, patternMatchesPromise]);
    if (templateMatches.length > 0) {
      console.log(`${LOG_PREFIX} Found ${templateMatches.length} template hints from prior analyses.`);
    }
    const patternSummary = formatPatternPreferences(patternMatches);
    if (patternSummary) {
      console.log(`${LOG_PREFIX} Found cross-session pattern preferences.`);
    }
    const suggestedActions = [
      ...mapGoalCandidatesToSuggestedActions(goals, buildAnalysisRankingHints(brief, columnProfiles, {
        title: dataForAnalysis.fileName,
        reportTitle: (reportContext == null ? void 0 : reportContext.reportTitle) ?? null,
        parameterLines: (reportContext == null ? void 0 : reportContext.parameterLines) ?? []
      })),
      ...formatTemplateHints(templateMatches),
      ...patternSummary ? [{ label: getTranslation("goal_history_preference", getState().settings.language), action: patternSummary }] : []
    ];
    setState((prev) => ({
      chatHistory: [...prev.chatHistory, createChatMessage({
        sender: "ai",
        text: "Initial analysis is ready. If you want to go deeper, choose one of these follow-up directions or type your own question.",
        timestamp: /* @__PURE__ */ new Date(),
        type: "ai_message",
        suggestedActions
      })]
    }));
    getState().addProgress("Follow-up analysis suggestions are ready.");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`${LOG_PREFIX} Failed to suggest follow-up goals:`, error);
    getState().addProgress(`Could not prepare follow-up suggestions: ${errorMessage}`, "warning");
    setState((prev) => ({
      chatHistory: [...prev.chatHistory, createChatMessage({
        sender: "ai",
        text: "Initial analysis is ready. You can ask for trends, anomalies, or segment comparisons to refine it further.",
        timestamp: /* @__PURE__ */ new Date(),
        type: "ai_message",
        suggestedActions: mapGoalCandidatesToSuggestedActions([])
      })]
    }));
  }
};
const goalProposer = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  proposeAnalysisGoals
}, Symbol.toStringTag, { value: "Module" }));
export {
  SqlAutoAnalysisError as S,
  processSingleTopic as a,
  buildAnalysisPlanFromPresentation as b,
  callSmallAiStep as c,
  proposeAnalysisGoals as d,
  isPlannerStabilityReasonCode as e,
  goalProposer as f,
  generateAnalysisTopics as g,
  isSqlAutoAnalysisError as i,
  mergeEvidencePreFilterIntoQuery as m,
  preparePlan as p,
  resolveStructuredComboDecision as r
};
