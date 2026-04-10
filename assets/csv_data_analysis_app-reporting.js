import { aJ as robustParseFloat, aK as saveReportArtifactRecord, aL as getReportArtifactRecord, aM as classifyAnalysisColumnRole, aN as buildCleaningInspectionBundle, aO as buildDataPreparationWorkflowBundle, aP as analyzeDatasetQualityGovernance, q as buildDatasetContext, aQ as attachAutoAnalysisEvaluationToCards, r as robustlyParseJsonObject, b as isRuntimeAbortError, aR as getTemporalSortTimestamp, aS as hasDuplicateNormalizedBuckets, m as isSequentialDimensionName, aT as isSortableSequence, aU as resolveOrdinalIndices, aV as isMonotonicSequence, aW as formatTemporalDisplayValue, aX as getOrdinalSortKey, I as getTranslation, n as normalizePreFilterOperator, aY as applyPreFilter } from "./csv_data_analysis_app-agent.js";
import { o as output_exports, j as jsonSchema } from "./csv_data_analysis_vendor-ai-sdk.js";
import { i as isProviderConfigured, _ as createAnalystMemoPrompt, v as createProviderModel, x as withTransientRetry, y as streamGenerateText, C as prepareSchemaForProvider, $ as analystMemoSchema, a0 as createForumSummaryPrompt, a1 as forumSummarySchema } from "./csv_data_analysis_app-ai.js";
const PERCENTAGE_LIKE_PATTERN = /pct|percent|percentage|rate|ratio|share|margin/i;
const TRAILING_PUNCTUATION_PATTERN = /[\s._:;,)\]-]+$/;
const NON_ASCII_PATTERN = /[^\x00-\x7F]/;
const FIXED_HELPER_LABEL_PATTERN = /^(source row|source column|row class|series key|series label \d+|hierarchy depth)$/i;
const trimTrailingPunctuation = (value) => {
  let nextValue = value.trim();
  while (TRAILING_PUNCTUATION_PATTERN.test(nextValue)) {
    nextValue = nextValue.replace(TRAILING_PUNCTUATION_PATTERN, "").trim();
  }
  return nextValue;
};
const normalizeDisplayLabel = (value, fallback) => {
  if (!value) return fallback;
  const trimmed = trimTrailingPunctuation(value);
  if (!trimmed) return fallback;
  return trimmed.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
};
const isNeutralHelperDisplayLabel = (value) => FIXED_HELPER_LABEL_PATTERN.test(trimTrailingPunctuation(value));
const toDisplayLabel = (value, fallback) => {
  return normalizeDisplayLabel(value, fallback).replace(/\b\w/g, (char) => char.toUpperCase());
};
const pluralizeLabel = (value) => {
  const cleanedValue = trimTrailingPunctuation(value || "");
  if (!cleanedValue || /[\u3400-\u9FBF]/.test(cleanedValue) || isNeutralHelperDisplayLabel(cleanedValue)) {
    return cleanedValue || "Groups";
  }
  const words = cleanedValue.split(" ");
  if (words.length > 4) {
    return cleanedValue;
  }
  const lastWord = words[words.length - 1];
  if (!lastWord || NON_ASCII_PATTERN.test(lastWord) || !/^[A-Za-z]+$/.test(lastWord)) {
    return cleanedValue;
  }
  const lowerLast = lastWord.toLowerCase();
  let pluralLast = lastWord;
  if (/(s|x|z|ch|sh)$/i.test(lastWord)) {
    pluralLast = `${lastWord}es`;
  } else if (/[^aeiou]y$/i.test(lastWord)) {
    pluralLast = `${lastWord.slice(0, -1)}ies`;
  } else if (!/s$/i.test(lastWord)) {
    pluralLast = `${lastWord}s`;
  }
  words[words.length - 1] = lowerLast === lastWord ? pluralLast.toLowerCase() : pluralLast;
  return words.join(" ");
};
const getColumnProfile = (columnProfiles, columnName) => {
  if (!columnName) return void 0;
  return columnProfiles.find((profile) => profile.name.toLowerCase() === columnName.toLowerCase());
};
const getRowValue = (row, columnName) => {
  if (!columnName) return void 0;
  if (columnName in row) {
    return row[columnName];
  }
  const lowered = columnName.toLowerCase();
  const matchingKey = Object.keys(row).find((key) => key.toLowerCase() === lowered);
  return matchingKey ? row[matchingKey] : void 0;
};
const toNumericValue$3 = (value) => robustParseFloat(value);
const formatMetricValue = (value, columnName, columnProfiles) => {
  const profile = getColumnProfile(columnProfiles, columnName);
  const normalizedName = (columnName ?? "").toLowerCase();
  const maximumFractionDigits = Math.abs(value) >= 100 ? 0 : 2;
  if ((profile == null ? void 0 : profile.type) === "percentage" || PERCENTAGE_LIKE_PATTERN.test(normalizedName)) {
    const percentValue = Math.abs(value) <= 1 ? value * 100 : value;
    return `${percentValue.toLocaleString(void 0, { maximumFractionDigits: 1 })}%`;
  }
  return value.toLocaleString(void 0, { maximumFractionDigits });
};
const formatShareValue = (ratio) => `${(ratio * 100).toLocaleString(void 0, { maximumFractionDigits: ratio >= 0.1 ? 0 : 1 })}%`;
const buildMetricLabel$1 = (columnName) => {
  if (!columnName || columnName === "count") {
    return "Records";
  }
  return toDisplayLabel(columnName, "Metric");
};
const GENERIC_QUALIFIER_PREFIXES = [
  "primary",
  "secondary",
  "tertiary",
  "fiscal",
  "financial",
  "report",
  "row",
  "distinct",
  "different",
  "grouped",
  "aggregate",
  "aggregated",
  "overall",
  "general"
];
const HELPER_SUFFIXES_BY_COLUMN = {
  serieskey: ["serieskey", "seriesidentifier", "seriesidentifiers", "identifier", "identifiers", "key", "keys", "series"],
  serieslabell1: ["serieslabel", "serieslabels", "label", "labels", "category", "categories"],
  serieslabell2: ["serieslabel", "serieslabels", "label", "labels", "category", "categories"],
  serieslabell3: ["serieslabel", "serieslabels", "label", "labels", "category", "categories"],
  rowclass: ["rowclass", "classification", "class"],
  sourcecolumnname: ["sourcecolumn", "sourcecolumnname", "reportcolumn", "column"],
  sourcerowindex: ["sourcerow", "sourcerowindex", "rowindex"],
  hierarchydepth: ["hierarchydepth", "depth"]
};
const normalizeKey$2 = (value) => (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
const stripGenericQualifierPrefixes = (value) => {
  let nextValue = value;
  let changed = true;
  while (changed) {
    changed = false;
    for (const prefix of GENERIC_QUALIFIER_PREFIXES) {
      if (nextValue.startsWith(prefix) && nextValue.length > prefix.length) {
        nextValue = nextValue.slice(prefix.length);
        changed = true;
        break;
      }
    }
  }
  return nextValue;
};
const isHelperLikeGroupHint = (column, label) => {
  const helperSuffixes = HELPER_SUFFIXES_BY_COLUMN[normalizeKey$2(column)];
  if (!helperSuffixes || !label) {
    return false;
  }
  const normalizedLabel = normalizeKey$2(label);
  const strippedLabel = stripGenericQualifierPrefixes(normalizedLabel);
  return helperSuffixes.some((suffix) => strippedLabel === suffix);
};
const INTERNAL_GROUP_COLUMNS = /* @__PURE__ */ new Set([
  "rowlabel",
  "serieskey",
  "serieslabel",
  "serieslabell1",
  "serieslabell2",
  "serieslabell3",
  "sourcecolumnname",
  "sourcerowindex",
  "rowclass",
  "hierarchydepth"
]);
const INTERNAL_METRIC_COLUMNS = /* @__PURE__ */ new Set([
  "rowtotal",
  "value",
  "amount",
  "metric",
  "measure"
]);
const GENERIC_LABELS = /* @__PURE__ */ new Set([
  "group",
  "groups",
  "label",
  "labels",
  "series",
  "serieslabel",
  "serieslabels",
  "serieskey",
  "value",
  "amount",
  "metric",
  "measure"
]);
const TOP_BY_PATTERN = /^\s*top\s+(.+?)\s+by\s+(.+?)\s*$/i;
const BY_PATTERN = /^\s*(.+?)\s+by\s+(.+?)\s*$/i;
const CROSS_TAB_DESCRIPTION_PATTERN = /^\s*cross-tabulation of (.+?) across (.+?) \(rows\) and (.+?) \(columns\)\.?\s*$/i;
const SERIES_LABEL_LAYER_PATTERN = /^serieslabell(\d+)$/i;
const SYSTEM_TERM_PATTERN = /\b(matrix grains?|sum \d+|pc \d+|grain\b)/gi;
const DOUBLE_COLON_PATTERN = /\s*::\s*/g;
const normalizeKey$1 = (value) => (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const sanitizeTitleSystemTerms = (title) => {
  let result = title.replace(DOUBLE_COLON_PATTERN, " — ").replace(SYSTEM_TERM_PATTERN, "").replace(/\s*—\s*$/g, "").replace(/^\s*—\s*/g, "").replace(/\s+/g, " ").trim();
  if (!result || result === "—") return title.replace(DOUBLE_COLON_PATTERN, " — ").trim();
  return result;
};
const sanitizePhrase = (value) => {
  const normalized = value == null ? void 0 : value.replace(/[`"'()]/g, " ").replace(/\s+/g, " ").trim();
  return normalized ? normalized : null;
};
const singularizeLabel = (value) => {
  if (!value || /[\u3400-\u9FBF]/.test(value)) {
    return value;
  }
  const words = value.split(" ");
  const lastWord = words[words.length - 1];
  let singularLast = lastWord;
  if (/^series$/i.test(lastWord)) {
    singularLast = lastWord;
  } else if (/ies$/i.test(lastWord) && lastWord.length > 3) {
    singularLast = `${lastWord.slice(0, -3)}y`;
  } else if (/(ches|shes|xes|zes|ses)$/i.test(lastWord) && lastWord.length > 3) {
    singularLast = lastWord.slice(0, -2);
  } else if (/s$/i.test(lastWord) && !/ss$/i.test(lastWord) && lastWord.length > 1) {
    singularLast = lastWord.slice(0, -1);
  }
  words[words.length - 1] = singularLast;
  return words.join(" ");
};
const pluralizeTitleGroupLabel = (value) => /^series label\b/i.test(value) || /^source /i.test(value) ? value : pluralizeLabel(value);
const getFallbackDisplayLabel = (value, fallback) => {
  if (!value) return fallback;
  const normalized = normalizeKey$1(value);
  const seriesLabelMatch = normalized.match(SERIES_LABEL_LAYER_PATTERN);
  if (seriesLabelMatch) {
    return `Series Label ${seriesLabelMatch[1]}`;
  }
  if (normalized === "sourcecolumnname") return "Source Column";
  if (normalized === "sourcerowindex") return "Source Row";
  if (normalized === "serieskey") return "Series Key";
  if (normalized === "rowclass") return "Row Class";
  if (normalized === "hierarchydepth") return "Hierarchy Depth";
  return toDisplayLabel(value, fallback);
};
const isMeaningfulLabel = (value, blocked) => {
  if (!value) return false;
  const normalized = normalizeKey$1(value);
  return Boolean(normalized) && !blocked.has(normalized) && !GENERIC_LABELS.has(normalized);
};
const extractTitleHints = (title) => {
  const sanitizedTitle = sanitizePhrase(title);
  if (!sanitizedTitle) return {};
  const topMatch = sanitizedTitle.match(TOP_BY_PATTERN);
  if (topMatch) {
    return {
      groupLabel: singularizeLabel(topMatch[1]),
      metricLabel: topMatch[2]
    };
  }
  const byMatch = sanitizedTitle.match(BY_PATTERN);
  if (byMatch) {
    return {
      metricLabel: byMatch[1],
      groupLabel: singularizeLabel(byMatch[2])
    };
  }
  return {};
};
const extractCrossTabHints = (description) => {
  const sanitizedDescription = sanitizePhrase(description);
  if (!sanitizedDescription) return {};
  const match = sanitizedDescription.match(CROSS_TAB_DESCRIPTION_PATTERN);
  if (!match) return {};
  return {
    metricLabel: match[1],
    groupLabel: match[2],
    columnLabel: match[3]
  };
};
const getPivotMetadataHints = (plan) => {
  const metadata = plan.artifactMetadata;
  if ((metadata == null ? void 0 : metadata.artifactType) !== "pivot_matrix") {
    return {};
  }
  return {
    groupLabel: sanitizePhrase(metadata.matrixRowLabel),
    columnLabel: sanitizePhrase(metadata.matrixColumnLabel),
    metricLabel: sanitizePhrase(metadata.matrixMetricLabel)
  };
};
const getPlanHints = (plan) => {
  const titleHints = extractTitleHints(plan.title);
  const descriptionHints = extractTitleHints(plan.description);
  const crossTabHints = extractCrossTabHints(plan.description);
  const metadataHints = getPivotMetadataHints(plan);
  return {
    groupLabel: metadataHints.groupLabel ?? crossTabHints.groupLabel ?? titleHints.groupLabel ?? descriptionHints.groupLabel ?? null,
    columnLabel: metadataHints.columnLabel ?? crossTabHints.columnLabel ?? null,
    metricLabel: metadataHints.metricLabel ?? crossTabHints.metricLabel ?? titleHints.metricLabel ?? descriptionHints.metricLabel ?? null
  };
};
const pickMostCommonLabel = (values) => {
  const counts = /* @__PURE__ */ new Map();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  let bestValue = null;
  let bestCount = -1;
  counts.forEach((count, value) => {
    if (count > bestCount) {
      bestValue = value;
      bestCount = count;
    }
  });
  return bestValue;
};
const replaceWholeWord = (text, search, replacement) => {
  if (!search) return text;
  return text.replace(new RegExp(`\\b${escapeRegExp(search)}\\b`, "g"), replacement);
};
const resolvePlanGroupLabel = (plan) => {
  const fallback = getFallbackDisplayLabel(plan.groupByColumn, "Group");
  if (!plan.groupByColumn || !INTERNAL_GROUP_COLUMNS.has(normalizeKey$1(plan.groupByColumn))) {
    return fallback;
  }
  const hints = getPlanHints(plan);
  if (isMeaningfulLabel(hints.groupLabel ?? null, INTERNAL_GROUP_COLUMNS) && !isHelperLikeGroupHint(plan.groupByColumn, hints.groupLabel ?? null)) {
    return toDisplayLabel(hints.groupLabel, "Group");
  }
  return fallback;
};
const resolvePlanMetricLabel = (plan) => {
  if (!plan.valueColumn) return null;
  const fallback = getFallbackDisplayLabel(plan.valueColumn, "Metric");
  if (!INTERNAL_METRIC_COLUMNS.has(normalizeKey$1(plan.valueColumn))) {
    return fallback;
  }
  const hints = getPlanHints(plan);
  if (isMeaningfulLabel(hints.metricLabel ?? null, INTERNAL_METRIC_COLUMNS)) {
    return toDisplayLabel(hints.metricLabel, "Metric");
  }
  return fallback;
};
const resolveDisplayPlanTitle = (plan) => {
  var _a;
  const rawTitle = sanitizePhrase(plan.title) ?? "AI Generated Analysis";
  const title = sanitizeTitleSystemTerms(rawTitle);
  const metricLabel = resolvePlanMetricLabel(plan);
  const groupLabel = resolvePlanGroupLabel(plan);
  const columnLabel = getPlanHints(plan).columnLabel;
  const topMatch = title.match(TOP_BY_PATTERN);
  if (topMatch && metricLabel) {
    return `Top ${pluralizeTitleGroupLabel(groupLabel)} by ${metricLabel}`;
  }
  if (((_a = plan.artifactMetadata) == null ? void 0 : _a.artifactType) === "pivot_matrix" && metricLabel && groupLabel && isMeaningfulLabel(groupLabel, INTERNAL_GROUP_COLUMNS) && columnLabel && isMeaningfulLabel(columnLabel, INTERNAL_GROUP_COLUMNS)) {
    return `${metricLabel} by ${groupLabel} and ${toDisplayLabel(columnLabel, "Column")}`;
  }
  const byMatch = title.match(BY_PATTERN);
  if (byMatch) {
    return `${metricLabel ?? sanitizePhrase(byMatch[1]) ?? byMatch[1]} by ${groupLabel}`;
  }
  let nextTitle = title;
  if (plan.groupByColumn) {
    nextTitle = replaceWholeWord(nextTitle, plan.groupByColumn, groupLabel);
  }
  if (plan.valueColumn && metricLabel) {
    nextTitle = replaceWholeWord(nextTitle, plan.valueColumn, metricLabel);
  }
  return nextTitle;
};
const resolveDisplayPlanDescription = (plan) => {
  var _a;
  const description = sanitizeTitleSystemTerms(plan.description ?? "");
  const metricLabel = resolvePlanMetricLabel(plan);
  const groupLabel = resolvePlanGroupLabel(plan);
  const columnLabel = getPlanHints(plan).columnLabel;
  if (((_a = plan.artifactMetadata) == null ? void 0 : _a.artifactType) === "pivot_matrix" && metricLabel && columnLabel && isMeaningfulLabel(groupLabel, INTERNAL_GROUP_COLUMNS) && isMeaningfulLabel(columnLabel, INTERNAL_GROUP_COLUMNS)) {
    return `Cross-tabulation of ${metricLabel} across ${groupLabel} (rows) and ${toDisplayLabel(columnLabel, "Column")} (columns).`;
  }
  if (!description) return description;
  let nextDescription = description;
  if (plan.groupByColumn) {
    nextDescription = replaceWholeWord(nextDescription, plan.groupByColumn, groupLabel);
  }
  if (plan.valueColumn && metricLabel) {
    nextDescription = replaceWholeWord(nextDescription, plan.valueColumn, metricLabel);
  }
  return nextDescription;
};
const resolveColumnDisplayLabel = (column, plans = []) => {
  const normalized = normalizeKey$1(column);
  const fallback = getFallbackDisplayLabel(column, column);
  if (INTERNAL_GROUP_COLUMNS.has(normalized)) {
    const candidates = plans.filter((plan) => normalizeKey$1(plan.groupByColumn) === normalized).map(resolvePlanGroupLabel).filter((label) => isMeaningfulLabel(label, INTERNAL_GROUP_COLUMNS) && !isHelperLikeGroupHint(column, label));
    return pickMostCommonLabel(candidates) ?? fallback;
  }
  if (INTERNAL_METRIC_COLUMNS.has(normalized)) {
    const candidates = plans.filter((plan) => normalizeKey$1(plan.valueColumn) === normalized).map(resolvePlanMetricLabel).filter((label) => Boolean(label) && isMeaningfulLabel(label, INTERNAL_METRIC_COLUMNS));
    return pickMostCommonLabel(candidates) ?? fallback;
  }
  return fallback;
};
const buildColumnDisplayLabels = (columns, plans = [], inferredLabels = {}) => Object.fromEntries(columns.map((column) => [
  column,
  // AI-inferred labels (from harness Phase 4) take priority for unnamed columns
  inferredLabels[column] ?? resolveColumnDisplayLabel(column, plans)
]));
const formatColumnDisplayHints = (columns, plans = []) => columns.map((column) => {
  const displayLabel = resolveColumnDisplayLabel(column.name, plans);
  return displayLabel !== column.name ? `- ${column.name} -> ${displayLabel}` : `- ${column.name}`;
}).join("\n");
const BLOB_URL_REVOKE_DELAY_MS = 18e4;
const openReportWindow = (html, mode) => {
  if (typeof window === "undefined" || typeof Blob === "undefined" || typeof URL === "undefined") {
    return null;
  }
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const targetUrl = mode === "print" ? `${objectUrl}#print` : objectUrl;
  const openedWindow = window.open(targetUrl, "_blank", "noopener,noreferrer");
  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, BLOB_URL_REVOKE_DELAY_MS);
  return openedWindow;
};
const openReportArtifact = (html) => openReportWindow(html, "open");
const printReportArtifact = (html) => openReportWindow(html, "print");
const LATEST_REPORT_HTML_PATH = "/workspace/reports/latest-analyst-report.html";
const LATEST_REPORT_IR_PATH = "/workspace/reports/latest-analyst-report.ir.json";
const LATEST_REPORT_MEMOS_PATH = "/workspace/reports/latest-analyst-report.memos.json";
const LATEST_REPORT_FORUM_PATH = "/workspace/reports/latest-analyst-report.forum.json";
const LATEST_REPORT_BUNDLE_PATH = "/workspace/reports/latest-analyst-report.bundle.json";
const LATEST_REPORT_MANIFEST_PATH = "/workspace/reports/latest-analyst-report.manifest.json";
const LATEST_REPORT_READINESS_PATH = "/workspace/reports/latest-analyst-report.readiness.json";
const parseReportArtifactManifest = (value) => {
  if (!value) {
    return null;
  }
  try {
    const manifest = JSON.parse(value);
    return {
      ...manifest,
      reportTemplate: manifest.reportTemplate ?? "management_review"
    };
  } catch (error) {
    console.warn("[ReportArtifactManifest] parseReportArtifactManifest: manifest JSON is corrupt or incompatible. Report viewer will degrade gracefully.", String(error));
    return null;
  }
};
const resolveLatestReportBlockedInfo = (workspaceFiles) => {
  const manifest = parseReportArtifactManifest(workspaceFiles == null ? void 0 : workspaceFiles[LATEST_REPORT_MANIFEST_PATH]);
  if (!manifest || manifest.artifactStatus !== "blocked") {
    return null;
  }
  return {
    blocked: true,
    reasons: manifest.gateReasons,
    trustedCardsCount: manifest.trustedCardsCount,
    excludedEvidenceCount: manifest.excludedEvidenceCount
  };
};
const isLatestReportPartial = (workspaceFiles) => {
  const manifest = parseReportArtifactManifest(workspaceFiles == null ? void 0 : workspaceFiles[LATEST_REPORT_MANIFEST_PATH]);
  return (manifest == null ? void 0 : manifest.artifactStatus) === "partial";
};
const hasOpenableLatestReport = (workspaceFiles) => {
  const manifest = parseReportArtifactManifest(workspaceFiles == null ? void 0 : workspaceFiles[LATEST_REPORT_MANIFEST_PATH]);
  if (!manifest) {
    return false;
  }
  if (manifest.artifactStatus === "blocked") {
    return false;
  }
  return Boolean(workspaceFiles == null ? void 0 : workspaceFiles[LATEST_REPORT_HTML_PATH]);
};
const saveReportArtifacts = async (reportId, manifest, files) => {
  const record = {
    reportId,
    generatedAt: manifest.generatedAt,
    manifest,
    files
  };
  await saveReportArtifactRecord(record);
};
const loadReportArtifacts = async (reportId) => {
  return await getReportArtifactRecord(reportId) ?? null;
};
const loadReportArtifactHtml = async (reportId) => {
  const record = await loadReportArtifacts(reportId);
  if (!record) {
    return null;
  }
  const htmlPath = record.manifest.archiveFiles.html ?? record.manifest.latestFiles.html;
  if (!htmlPath) {
    return null;
  }
  return record.files[htmlPath] ?? null;
};
const hydrateLatestReportWorkspaceFiles = async (workspaceFiles) => {
  const nextFiles = { ...workspaceFiles ?? {} };
  const manifest = parseReportArtifactManifest(nextFiles[LATEST_REPORT_MANIFEST_PATH]);
  if (!manifest) {
    return nextFiles;
  }
  const record = await loadReportArtifacts(manifest.reportId);
  if (!record) {
    return nextFiles;
  }
  if (manifest.artifactStatus !== "blocked") {
    const latestHtmlPath = manifest.latestFiles.html ?? LATEST_REPORT_HTML_PATH;
    const archivedHtmlPath = manifest.archiveFiles.html ?? latestHtmlPath;
    const html = record.files[latestHtmlPath] ?? record.files[archivedHtmlPath];
    if (html) {
      nextFiles[LATEST_REPORT_HTML_PATH] = html;
    }
  }
  const readinessPath = manifest.latestFiles.readiness ?? LATEST_REPORT_READINESS_PATH;
  if (record.files[readinessPath]) {
    nextFiles[LATEST_REPORT_READINESS_PATH] = record.files[readinessPath];
  }
  nextFiles[LATEST_REPORT_MANIFEST_PATH] = JSON.stringify(record.manifest, null, 2);
  return nextFiles;
};
const resolveDisplayPlanLabels = (plan, plans = [plan]) => ({
  ...plan,
  title: resolveDisplayPlanTitle(plan),
  description: resolveDisplayPlanDescription(plan),
  groupByColumn: plan.groupByColumn ? resolveColumnDisplayLabel(plan.groupByColumn, plans) : plan.groupByColumn,
  valueColumn: plan.valueColumn ? resolveColumnDisplayLabel(plan.valueColumn, plans) : plan.valueColumn
});
const buildDisplayCardContext = (cardContext) => {
  const plans = cardContext.map((card) => ({
    title: card.title,
    description: card.description ?? "",
    groupByColumn: card.groupByColumn,
    valueColumn: card.valueColumn
  }));
  return cardContext.map((card) => {
    const displayPlan = resolveDisplayPlanLabels({
      title: card.title,
      description: card.description ?? "",
      groupByColumn: card.groupByColumn,
      valueColumn: card.valueColumn
    }, plans);
    return {
      ...card,
      title: displayPlan.title,
      description: displayPlan.description,
      groupByColumn: displayPlan.groupByColumn,
      valueColumn: displayPlan.valueColumn
    };
  });
};
const CURRENCY_LIKE_PATTERN = /amount|revenue|sales|cost|spend|budget|actual|price|profit|expense|value|total/i;
const HELPER_ROW_INDEX_PATTERN = /^(sourcerowindex|source row)$/i;
const HELPER_CLASSIFICATION_PATTERN = /^(rowclass|row class|hierarchydepth|hierarchy depth)$/i;
const HELPER_DIMENSION_PATTERN = /^(rowlabel|row label|sourcecolumnname|source column|serieskey|series key|serieslabel|series label \d+|serieslabell\d+)$/i;
const NULL_LIKE_LABEL_PATTERN = /^(null|n\/a|na|none|unknown)$/i;
const normalizeKey = (value) => (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
const clampConfidence = (value) => Math.max(0, Math.min(1, Number(value.toFixed(2))));
const toFiniteNumbers = (card) => {
  const valueColumn = card.plan.valueColumn;
  if (!valueColumn) return [];
  return card.aggregatedData.map((row) => {
    const raw = row[valueColumn];
    if (typeof raw === "number") return raw;
    if (typeof raw !== "string") return Number.NaN;
    const normalized = raw.replace(/,/g, "").trim();
    return Number(normalized);
  }).filter((value) => Number.isFinite(value));
};
const hasNullLikeGroupValues = (card) => {
  const groupByColumn = card.plan.groupByColumn;
  if (!groupByColumn) return false;
  return card.aggregatedData.some((row) => {
    const raw = row[groupByColumn];
    if (raw === null || raw === void 0) return true;
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      return trimmed.length === 0 || NULL_LIKE_LABEL_PATTERN.test(trimmed);
    }
    return false;
  });
};
const classifySemanticRole = (card, displayGroupLabel, columnProfiles) => {
  if (card.plan.isFallback) {
    return "fallback";
  }
  if (!card.plan.groupByColumn) {
    return "metric_only";
  }
  const rawGroupKey = normalizeKey(card.plan.groupByColumn);
  const displayKey = displayGroupLabel.toLowerCase();
  const displayIsNeutralHelper = isNeutralHelperDisplayLabel(displayGroupLabel);
  if (HELPER_ROW_INDEX_PATTERN.test(rawGroupKey) || HELPER_ROW_INDEX_PATTERN.test(displayKey)) {
    return "helper_row_index";
  }
  if (HELPER_CLASSIFICATION_PATTERN.test(rawGroupKey) || HELPER_CLASSIFICATION_PATTERN.test(displayKey)) {
    return "helper_classification";
  }
  if (HELPER_DIMENSION_PATTERN.test(rawGroupKey) && displayIsNeutralHelper || HELPER_DIMENSION_PATTERN.test(displayKey) || displayIsNeutralHelper) {
    return "helper_dimension";
  }
  const groupColumn = columnProfiles.find((column) => column.name === card.plan.groupByColumn);
  if (groupColumn) {
    const sharedRole = classifyAnalysisColumnRole(groupColumn, columnProfiles);
    if (sharedRole === "repeated_bundle_member") {
      return "repeated_bundle_member";
    }
    if (sharedRole === "helper_dimension") {
      return "helper_dimension";
    }
  }
  return "business_dimension";
};
const buildAggregationQualityFlags = (card, semanticRole, displayGroupLabel) => {
  const flags = /* @__PURE__ */ new Set();
  const numericValues = toFiniteNumbers(card);
  const neutralHelperLabel = isNeutralHelperDisplayLabel(displayGroupLabel);
  if (card.plan.isFallback) {
    flags.add("fallback_view");
  }
  if (semanticRole === "helper_row_index" || semanticRole === "helper_classification") {
    flags.add("helper_dimension_heavy");
  }
  if (semanticRole === "helper_dimension" && neutralHelperLabel) {
    flags.add("helper_dimension_heavy");
    flags.add("neutral_only_labels");
  }
  if (semanticRole === "repeated_bundle_member") {
    flags.add("helper_dimension_heavy");
    flags.add("repeated_bundle_dimension");
  }
  if (semanticRole === "metric_only") {
    flags.add("metric_only_view");
  }
  if (card.plan.aggregation === "count") {
    flags.add("count_only_view");
  }
  if (card.aggregatedData.length >= 30) {
    flags.add("fragmented_groups");
  }
  if (hasNullLikeGroupValues(card)) {
    flags.add("null_group_labels");
  }
  if (numericValues.length >= 2) {
    const max = Math.max(...numericValues);
    const min = Math.min(...numericValues);
    const uniqueRounded = new Set(numericValues.map((value) => value.toFixed(2)));
    if (uniqueRounded.size <= 1 || Math.abs(max - min) < 1e-9 || max !== 0 && min !== 0 && Math.abs(max - min) / Math.abs(max) < 0.01) {
      flags.add("low_signal_distribution");
    }
  }
  return [...flags];
};
const buildNarrativeSignals = (card, semanticRole, displayTitle, displayGroupLabel, displayMetricLabel, aggregationQualityFlags) => {
  var _a;
  const neutralHelperLabel = isNeutralHelperDisplayLabel(displayGroupLabel);
  const titleLooksBusinessLike = !/source row|source column|row class|series key|series label|row label|row total/i.test(displayTitle);
  let helperExposureLevel = "medium";
  let businessMeaningConfidence = 0.4;
  let narrativeEligibility = "allowed_neutral";
  switch (semanticRole) {
    case "fallback":
      helperExposureLevel = "high";
      businessMeaningConfidence = 0.3;
      narrativeEligibility = "allowed_neutral";
      break;
    case "helper_row_index":
    case "helper_classification":
      helperExposureLevel = "high";
      businessMeaningConfidence = 0.15;
      narrativeEligibility = "avoid_if_possible";
      break;
    case "helper_dimension":
      helperExposureLevel = neutralHelperLabel ? "high" : "medium";
      businessMeaningConfidence = neutralHelperLabel ? 0.3 : 0.5;
      narrativeEligibility = "allowed_neutral";
      break;
    case "repeated_bundle_member":
      helperExposureLevel = "high";
      businessMeaningConfidence = 0.22;
      narrativeEligibility = "avoid_if_possible";
      break;
    case "metric_only":
      helperExposureLevel = "medium";
      businessMeaningConfidence = 0.4;
      narrativeEligibility = "allowed_neutral";
      break;
    case "business_dimension":
      helperExposureLevel = neutralHelperLabel ? "low" : "none";
      businessMeaningConfidence = titleLooksBusinessLike && displayMetricLabel ? 0.84 : 0.74;
      narrativeEligibility = "preferred";
      break;
  }
  if (aggregationQualityFlags.includes("count_only_view")) {
    businessMeaningConfidence -= semanticRole === "business_dimension" ? 0.12 : 0.05;
    if (semanticRole === "business_dimension") {
      narrativeEligibility = "allowed_neutral";
    }
  }
  if (aggregationQualityFlags.includes("fragmented_groups")) {
    businessMeaningConfidence -= 0.1;
    if (semanticRole === "business_dimension") {
      narrativeEligibility = "allowed_neutral";
    }
  }
  if (aggregationQualityFlags.includes("low_signal_distribution")) {
    businessMeaningConfidence -= 0.08;
    if (semanticRole === "business_dimension") {
      narrativeEligibility = "allowed_neutral";
    }
  }
  if (aggregationQualityFlags.includes("null_group_labels")) {
    businessMeaningConfidence -= 0.05;
  }
  if (aggregationQualityFlags.includes("helper_dimension_heavy")) {
    helperExposureLevel = "high";
  }
  const autoAnalysisVerdict = ((_a = card.autoAnalysisEvaluation) == null ? void 0 : _a.verdict) ?? null;
  if (autoAnalysisVerdict === "caveated") {
    businessMeaningConfidence -= 0.18;
    if (narrativeEligibility === "preferred") {
      narrativeEligibility = "allowed_neutral";
    }
  } else if (autoAnalysisVerdict === "weak") {
    helperExposureLevel = "high";
    businessMeaningConfidence = Math.min(businessMeaningConfidence, 0.2);
    narrativeEligibility = "avoid_if_possible";
  }
  return {
    helperExposureLevel,
    businessMeaningConfidence: clampConfidence(businessMeaningConfidence),
    narrativeEligibility
  };
};
const buildSelectionScore = (card, semanticRole) => {
  var _a, _b, _c, _d;
  const reasons = [];
  if (card.plan.isFallback) {
    return { score: Number.NEGATIVE_INFINITY, reasons: ["fallback_card_excluded"] };
  }
  if (!card.plan.groupByColumn) {
    return { score: Number.NEGATIVE_INFINITY, reasons: ["missing_group_by"] };
  }
  if (card.aggregatedData.length === 0) {
    return { score: Number.NEGATIVE_INFINITY, reasons: ["missing_aggregated_rows"] };
  }
  let score = 0;
  if (!((_a = card.plan.preFilter) == null ? void 0 : _a.length)) {
    score += 20;
    reasons.push("no_prefilter");
  }
  if (!((_c = (_b = card.filter) == null ? void 0 : _b.values) == null ? void 0 : _c.length)) {
    score += 12;
    reasons.push("no_card_filter");
  }
  if (card.plan.aggregation === "sum") {
    score += 40;
    reasons.push("sum_aggregation");
  } else if (card.plan.aggregation === "count") {
    score += 24;
    reasons.push("count_aggregation");
  } else if (card.plan.aggregation === "avg") {
    score += 12;
    reasons.push("avg_aggregation");
  }
  if (card.plan.valueColumn) {
    score += 8;
    reasons.push("has_value_column");
  }
  if (card.aggregatedData.length >= 2) {
    score += 6;
    reasons.push("multi_row_result");
  }
  if (card.aggregatedData.length <= 30) {
    score += 4;
    reasons.push("manageable_row_count");
  }
  if (CURRENCY_LIKE_PATTERN.test(card.plan.valueColumn ?? "")) {
    score += 10;
    reasons.push("currency_like_metric");
  }
  switch (semanticRole) {
    case "business_dimension":
      score += 24;
      reasons.push("business_dimension");
      break;
    case "repeated_bundle_member":
      score -= 95;
      reasons.push("repeated_bundle_penalty");
      break;
    case "helper_dimension":
      score -= 80;
      reasons.push("helper_dimension_penalty");
      break;
    case "helper_row_index":
      score -= 120;
      reasons.push("helper_row_penalty");
      break;
    case "helper_classification":
      score -= 110;
      reasons.push("helper_classification_penalty");
      break;
    case "metric_only":
      score -= 140;
      reasons.push("metric_only_penalty");
      break;
  }
  const autoAnalysisVerdict = ((_d = card.autoAnalysisEvaluation) == null ? void 0 : _d.verdict) ?? null;
  if (autoAnalysisVerdict === "caveated") {
    score -= 30;
    reasons.push("caveated_verdict_penalty");
  } else if (autoAnalysisVerdict === "weak") {
    score -= 140;
    reasons.push("weak_verdict_penalty");
  }
  return { score, reasons };
};
const buildDisplayAnalysisIr = (card, allCards = [card], columnProfiles = []) => {
  var _a;
  const plans = allCards.map((candidate) => candidate.plan);
  const displayPlan = resolveDisplayPlanLabels(card.plan, plans);
  const displayGroupLabel = resolvePlanGroupLabel(card.plan);
  const displayMetricLabel = resolvePlanMetricLabel(card.plan) ?? buildMetricLabel$1(card.plan.valueColumn);
  const semanticRole = classifySemanticRole(card, displayGroupLabel, columnProfiles);
  const aggregationQualityFlags = buildAggregationQualityFlags(card, semanticRole, displayGroupLabel);
  const narrativeSignals = buildNarrativeSignals(
    card,
    semanticRole,
    displayPlan.title,
    displayGroupLabel,
    displayMetricLabel,
    aggregationQualityFlags
  );
  const selection = buildSelectionScore(card, semanticRole);
  return {
    cardId: card.id,
    sourcePlan: card.plan,
    displayTitle: displayPlan.title,
    displayDescription: displayPlan.description,
    displayGroupLabel,
    displayMetricLabel,
    groupByColumn: card.plan.groupByColumn,
    valueColumn: card.plan.valueColumn,
    aggregation: card.plan.aggregation,
    aggregatedData: card.aggregatedData,
    aggregatedRows: card.aggregatedData.length,
    isFallback: Boolean(card.plan.isFallback),
    semanticRole,
    autoAnalysisVerdict: ((_a = card.autoAnalysisEvaluation) == null ? void 0 : _a.verdict) ?? null,
    helperExposureLevel: narrativeSignals.helperExposureLevel,
    businessMeaningConfidence: narrativeSignals.businessMeaningConfidence,
    aggregationQualityFlags,
    safeNarrativeLabels: {
      title: displayPlan.title,
      dimension: card.plan.groupByColumn ? displayGroupLabel : null,
      metric: displayMetricLabel
    },
    narrativeEligibility: narrativeSignals.narrativeEligibility,
    selectionScore: selection.score,
    selectionReasons: selection.reasons
  };
};
const buildDisplayAnalysisIrList = (cards, columnProfiles = []) => cards.map((card) => buildDisplayAnalysisIr(card, cards, columnProfiles));
const formatConfidence = (value) => typeof value === "number" ? value.toFixed(2) : "unknown";
const buildDetail = (card, reasonCodes) => {
  const reasons = reasonCodes.map((code) => {
    switch (code) {
      case "narrative_ineligible":
        return `narrative=${String(card.semanticRole ?? "unknown")}`;
      case "helper_exposure":
        return `helperExposure=${String(card.helperExposureLevel ?? "unknown")}`;
      case "low_business_confidence":
        return `businessMeaningConfidence=${formatConfidence(card.businessMeaningConfidence)}`;
      case "aggregation_quality_warning":
        return `aggregationFlags=${card.aggregationQualityFlags.join(", ")}`;
      case "fallback_plan":
        return "fallback_plan=true";
      case "dimension_quality_warning":
        return "dimension_quality_warning=true";
      case "metric_quality_warning":
        return "metric_quality_warning=true";
      case "unclassified_share_warning":
        return "unclassified_share_warning=true";
      default:
        return code;
    }
  });
  return reasons.join(" | ");
};
const HARD_EXCLUDE_REASONS = /* @__PURE__ */ new Set([
  "fallback_plan",
  "narrative_ineligible",
  "helper_exposure"
]);
const resolveReportCardTrust = (cards) => {
  const includedCards = [];
  const excludedEvidence = [];
  let caveatedIncludedCount = 0;
  cards.forEach((card) => {
    var _a, _b, _c;
    const reasonCodes = [];
    if (card.helperExposureLevel !== "none") {
      reasonCodes.push("helper_exposure");
    }
    if (card.semanticRole === "helper_dimension" || card.semanticRole === "helper_row_index" || card.semanticRole === "helper_classification") {
      reasonCodes.push("narrative_ineligible");
    }
    if ((card.businessMeaningConfidence ?? 0) < 0.75) {
      reasonCodes.push("low_business_confidence");
    }
    if (card.aggregationQualityFlags.length > 0) {
      reasonCodes.push("aggregation_quality_warning");
    }
    if (card.isFallback) {
      reasonCodes.push("fallback_plan");
    }
    if ((_a = card.autoAnalysisReasonCodes) == null ? void 0 : _a.includes("dimension_quality_warning")) {
      reasonCodes.push("dimension_quality_warning");
    }
    if ((_b = card.autoAnalysisReasonCodes) == null ? void 0 : _b.includes("metric_quality_warning")) {
      reasonCodes.push("metric_quality_warning");
    }
    if ((_c = card.autoAnalysisReasonCodes) == null ? void 0 : _c.includes("unclassified_share_warning")) {
      reasonCodes.push("unclassified_share_warning");
    }
    if (reasonCodes.length === 0) {
      includedCards.push(card);
      return;
    }
    const hasHardExclude = reasonCodes.some((code) => HARD_EXCLUDE_REASONS.has(code));
    if (!hasHardExclude) {
      includedCards.push(card);
      caveatedIncludedCount += 1;
      return;
    }
    excludedEvidence.push({
      decision: "excluded",
      evidenceId: card.evidenceId,
      cardId: card.cardId,
      title: card.title,
      displayTitle: card.displayTitle,
      detail: buildDetail(card, reasonCodes),
      reasonCodes
    });
  });
  return {
    includedCards,
    excludedEvidence,
    includedCardIds: includedCards.map((card) => card.cardId),
    excludedCardIds: excludedEvidence.map((entry) => entry.cardId),
    trustedIncludedCount: includedCards.length - caveatedIncludedCount,
    caveatedIncludedCount
  };
};
const resolveReportGenerationGateV2 = (reportReadiness, includedCardsCount, caveatedIncludedCount, reportReadinessReason) => {
  if (reportReadiness === "blocked") {
    return { gate: "blocked", blockers: [reportReadinessReason] };
  }
  if (includedCardsCount === 0) {
    return { gate: "blocked", blockers: ["No trusted report evidence cards qualified for analyst reporting."] };
  }
  const allCaveated = caveatedIncludedCount === includedCardsCount;
  if (reportReadiness === "partial" || allCaveated) {
    return { gate: "allowed_with_caveats", blockers: [] };
  }
  return { gate: "allowed", blockers: [] };
};
const resolveArtifactStatus = (gate) => {
  if (gate === "blocked") {
    return "blocked";
  }
  return gate === "allowed_with_caveats" ? "partial" : "ready";
};
const MAX_CARD_SAMPLE_ROWS = 8;
const MAX_REPORT_CHART_ROWS = 24;
const MAX_CAVEATS$3 = 8;
const MAX_DETAIL_CHARS = 140;
const PARTIAL_ROW_EXPANSION_THRESHOLD = 3;
const trimText$6 = (value) => String(value ?? "").trim();
const dedupeStrings$5 = (values, limit) => {
  const seen = /* @__PURE__ */ new Set();
  const output = [];
  for (const value of values) {
    const normalized = trimText$6(value);
    if (!normalized) {
      continue;
    }
    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(normalized);
    if (typeof limit === "number" && output.length >= limit) {
      break;
    }
  }
  return output;
};
const truncateDetail = (value, maxChars = MAX_DETAIL_CHARS) => {
  if (value.length <= maxChars) {
    return value;
  }
  return `${value.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
};
const buildDatasetContextDetail = (dataset) => truncateDetail([
  dataset.reportTitle || dataset.fileName || "Untitled dataset",
  `${dataset.rawRowCount} raw row(s) -> ${dataset.cleanedRowCount} cleaned row(s)`,
  dataset.parserConfidence ? `parser=${dataset.parserConfidence}` : null
].filter(Boolean).join(" | "));
const buildPreparationDetail = (dataset, workflow) => truncateDetail([
  dataset.preparationState,
  `${workflow.issueMappings.length} issue mapping(s)`,
  `${dataset.cardsCount} card(s)`
].join(" | "));
const buildVerificationDetail = (workflow) => truncateDetail([
  `overall=${workflow.verification.overallStatus}`,
  `sql=${workflow.verification.sqlPrecheckStatus}`,
  `blocked=${workflow.verification.downstreamAnalysisBlocked ? "yes" : "no"}`
].join(" | "));
const buildSummaryDetail = (value) => truncateDetail(value.replace(/\s+/g, " "));
const buildQueryDetail = (query) => truncateDetail([
  query.engine ? `${query.engine} query` : "query",
  `${query.returnedRows ?? 0}/${query.totalMatchedRows ?? 0} row(s)`,
  query.explanation
].filter(Boolean).join(" | "));
const buildCardDetail = (card) => {
  var _a;
  return truncateDetail([
    card.artifactType ?? card.chartType,
    `${card.rowCount} row(s)`,
    trimText$6(((_a = card.summary) == null ? void 0 : _a.text) ?? "")
  ].filter(Boolean).join(" | "));
};
const formatRatio = (value) => value.toFixed(1);
const buildReadinessLabel = (readiness) => {
  if (readiness === "ready") {
    return "Ready for bounded analyst synthesis";
  }
  if (readiness === "partial") {
    return "Usable with material caveats";
  }
  return "Not ready for analyst synthesis";
};
const resolveReportReadinessAssessment = (state, workflow, inspection, caveats) => {
  var _a;
  const rawRowCount = inspection.importFacts.rawRowCount;
  const cleanedRowCount = inspection.importFacts.cleanedRowCount;
  const rowExpansionRatio = rawRowCount > 0 ? cleanedRowCount / rawRowCount : null;
  const parserConfidence = inspection.importFacts.parserConfidence;
  const cardsCount = state.analysisCards.length;
  const verificationWarnings = dedupeStrings$5([
    ...workflow.issueSummary.topWarnings,
    ...workflow.verification.warnings
  ]);
  const hasWorkflowWarnings = verificationWarnings.length > 0;
  const usedFallbackContext = Boolean((_a = inspection.reportContext.verification) == null ? void 0 : _a.usedFallback) || inspection.reportContext.effective.source === "fallback";
  const hasContextNotes = inspection.reportContext.effective.notes.length > 0;
  const hasStructuralAmbiguity = (inspection.importFacts.metadataRowCount > 0 || inspection.importFacts.headerDepth > 1) && hasContextNotes;
  const hasShapeInflation = rowExpansionRatio !== null && rowExpansionRatio > PARTIAL_ROW_EXPANSION_THRESHOLD;
  const parserConfidenceLimited = parserConfidence !== "high";
  const structuralSignals = {
    rowExpansionRatio,
    hasMetadataRows: inspection.importFacts.metadataRowCount > 0,
    hasMultiRowHeader: inspection.importFacts.headerDepth > 1,
    usedFallbackContext
  };
  const readinessDrivers = dedupeStrings$5([
    cardsCount > 0 ? `Trusted analysis cards exist (${cardsCount}).` : null,
    parserConfidence === "high" ? "Parser confidence is high." : null,
    workflow.verification.overallStatus === "passed" && workflow.verification.sqlPrecheckStatus === "passed" && !hasWorkflowWarnings ? "Workflow verification passed without unresolved warnings." : null,
    !hasShapeInflation && !hasStructuralAmbiguity && !usedFallbackContext ? "No material structural ambiguity was detected." : null,
    caveats.length === 0 ? "No dataset caveats were recorded in the evidence bundle." : null
  ], MAX_CAVEATS$3);
  const readinessRisks = dedupeStrings$5([
    !state.csvData ? "No prepared dataset is loaded." : null,
    cardsCount === 0 ? "Trusted analysis cards are not available yet." : null,
    parserConfidenceLimited ? "Parser confidence is limited." : null,
    workflow.summary.intakeGateStatus === "warning" ? "Intake diagnostics still carry warning-level uncertainty." : null,
    hasWorkflowWarnings ? "Workflow warnings remain unresolved." : null,
    workflow.verification.sqlPrecheckStatus !== "passed" ? `SQL precheck status is ${workflow.verification.sqlPrecheckStatus}.` : null,
    caveats.length > 0 ? `${caveats.length} dataset caveat(s) remain active.` : null,
    hasShapeInflation && rowExpansionRatio !== null ? `Cleaned rows expanded ${formatRatio(rowExpansionRatio)}x over raw rows.` : null,
    hasStructuralAmbiguity ? "Metadata/header recovery signals suggest structural ambiguity." : null,
    usedFallbackContext ? "Report context required fallback recovery." : null
  ], MAX_CAVEATS$3);
  const base = { readinessDrivers, readinessRisks, structuralSignals };
  const blocked = (reason) => ({ reportReadiness: "blocked", reportReadinessReason: reason, ...base });
  if (!state.csvData) {
    return blocked("Not ready for analyst synthesis because no prepared dataset is loaded.");
  }
  if (workflow.summary.intakeGateStatus === "blocked") {
    return blocked(trimText$6(workflow.summary.intakeGateMessage) || "Not ready for analyst synthesis because intake diagnostics blocked analysis.");
  }
  if (workflow.verification.datasetSafetyStatus === "failed") {
    return blocked("Not ready for analyst synthesis because dataset safety checks failed.");
  }
  if (workflow.verification.cleaningConsistencyStatus === "blocked" || workflow.verification.downstreamAnalysisBlocked) {
    return blocked("Not ready for analyst synthesis because cleaning consistency blocked downstream analysis.");
  }
  if (workflow.verification.sqlPrecheckStatus === "blocked") {
    return blocked(inspection.verification.sqlPrecheckSummary ?? "Not ready for analyst synthesis because SQL precheck blocked automatic analysis.");
  }
  if (workflow.verification.sqlPrecheckStatus === "warning") {
    return {
      reportReadiness: "partial",
      ...base,
      reportReadinessReason: inspection.verification.sqlPrecheckSummary ?? "SQL precheck could not confirm the preferred SQL path, so analyst synthesis should proceed with explicit caveats."
    };
  }
  if (!workflow.summary.canAnalyze) {
    return blocked("Not ready for analyst synthesis because the prepared dataset is not eligible for downstream analysis.");
  }
  const shouldDowngradeToPartial = cardsCount === 0 || parserConfidenceLimited || hasWorkflowWarnings || caveats.length > 0 || hasShapeInflation || hasStructuralAmbiguity || usedFallbackContext;
  if (shouldDowngradeToPartial) {
    let reason = "Usable for bounded synthesis, but material caveats still limit executive certainty.";
    if (cardsCount === 0) {
      reason = "Usable for bounded synthesis inputs, but trusted analysis cards are still missing.";
    } else if (hasShapeInflation || hasStructuralAmbiguity) {
      reason = "Usable for bounded synthesis, but structural caveats still limit executive certainty.";
    } else if (parserConfidenceLimited || hasWorkflowWarnings || usedFallbackContext) {
      reason = "Usable for bounded synthesis, but workflow and context caveats still limit executive certainty.";
    }
    return { reportReadiness: "partial", reportReadinessReason: reason, ...base };
  }
  return {
    reportReadiness: "ready",
    ...base,
    reportReadinessReason: "Ready for bounded analyst synthesis with no material structural or workflow caveats detected."
  };
};
const applyQualityReadinessAdjustment = (assessment, qualityHintsSummary, datasetSignalsCount, trustedCardsCount, includedCardsCount) => {
  if (assessment.reportReadiness === "blocked") {
    return assessment;
  }
  if (datasetSignalsCount === 0 && !(includedCardsCount > 0 && trustedCardsCount === 0)) {
    return assessment;
  }
  const readinessRisks = dedupeStrings$5([
    ...assessment.readinessRisks,
    qualityHintsSummary || null,
    includedCardsCount > 0 && trustedCardsCount === 0 ? "Only caveated analysis cards are available; definitive reporting should remain limited." : null
  ], MAX_CAVEATS$3);
  return {
    ...assessment,
    reportReadiness: "partial",
    reportReadinessReason: assessment.reportReadiness === "ready" ? "Usable for bounded synthesis, but data quality caveats still limit executive certainty." : assessment.reportReadinessReason,
    readinessRisks
  };
};
const buildCardEvidence = (card, irByCardId) => {
  var _a, _b, _c, _d, _e, _f;
  const ir = irByCardId.get(card.id);
  return {
    evidenceId: `card.${card.id}`,
    cardId: card.id,
    isFallback: card.plan.isFallback === true,
    title: card.plan.title,
    displayTitle: (ir == null ? void 0 : ir.displayTitle) ?? card.plan.title,
    description: (ir == null ? void 0 : ir.displayDescription) ?? card.plan.description,
    artifactType: card.plan.artifactType ?? null,
    chartType: card.displayChartType,
    groupByColumn: card.plan.groupByColumn ?? null,
    valueColumn: card.plan.valueColumn ?? null,
    aggregation: card.plan.aggregation ?? null,
    rowCount: card.aggregatedData.length,
    summary: card.summary ?? null,
    aggregatedDataSample: card.aggregatedData.slice(0, MAX_CARD_SAMPLE_ROWS),
    reportChartRows: card.aggregatedData.slice(0, MAX_REPORT_CHART_ROWS),
    semanticRole: (ir == null ? void 0 : ir.semanticRole) ?? null,
    helperExposureLevel: (ir == null ? void 0 : ir.helperExposureLevel) ?? null,
    businessMeaningConfidence: typeof (ir == null ? void 0 : ir.businessMeaningConfidence) === "number" ? ir.businessMeaningConfidence : null,
    aggregationQualityFlags: (ir == null ? void 0 : ir.aggregationQualityFlags) ?? [],
    sourceTopic: card.sourceTopic ?? null,
    autoAnalysisVerdict: ((_a = card.autoAnalysisEvaluation) == null ? void 0 : _a.verdict) ?? null,
    autoAnalysisVerdictDetail: ((_b = card.autoAnalysisEvaluation) == null ? void 0 : _b.detail) ?? null,
    autoAnalysisReasonCodes: ((_c = card.autoAnalysisEvaluation) == null ? void 0 : _c.reasonCodes) ?? [],
    evidenceValueGateDecision: ((_d = card.evidenceValueGate) == null ? void 0 : _d.decision) ?? null,
    evidenceValueGateDetail: ((_e = card.evidenceValueGate) == null ? void 0 : _e.detail) ?? null,
    evidenceValueGateReasonCodes: ((_f = card.evidenceValueGate) == null ? void 0 : _f.reasonCodes) ?? []
  };
};
const buildReportEvidenceBundle = (state) => {
  var _a, _b, _c, _d, _e;
  if (!state.csvData && !state.rawCsvData) {
    return null;
  }
  const generatedAt = (/* @__PURE__ */ new Date()).toISOString();
  const inspection = buildCleaningInspectionBundle(state);
  const workflow = buildDataPreparationWorkflowBundle(state);
  const displayIrs = buildDisplayAnalysisIrList(state.analysisCards ?? [], state.columnProfiles ?? []);
  const irByCardId = new Map(displayIrs.map((ir) => [ir.cardId, ir]));
  const caveats = dedupeStrings$5([
    workflow.summary.intakeGateMessage,
    ...workflow.issueSummary.topWarnings,
    ...workflow.verification.warnings,
    ...inspection.cleaning.consistencyIssues,
    ...inspection.reportContext.effective.notes
  ], MAX_CAVEATS$3);
  const readinessAssessment = resolveReportReadinessAssessment(
    state,
    workflow,
    inspection,
    caveats
  );
  const workflowEvidence = {
    topWarnings: workflow.issueSummary.topWarnings,
    issueMappings: workflow.issueSummary.mappings,
    verification: workflow.verification,
    diff: workflow.diff
  };
  const summaries = {
    coreAnalysisSummary: state.aiCoreAnalysisSummary ?? null,
    finalSummary: state.finalSummary ?? null,
    contextualSummary: state.contextualSummary ?? null
  };
  const query = state.activeDataQuery ? {
    hasActiveQuery: true,
    explanation: state.activeDataQuery.explanation ?? null,
    sqlPreview: state.activeDataQuery.sqlPreview ?? null,
    engine: state.activeDataQuery.engine ?? null,
    totalMatchedRows: ((_a = state.activeDataQuery.result) == null ? void 0 : _a.totalMatchedRows) ?? null,
    returnedRows: ((_b = state.activeDataQuery.result) == null ? void 0 : _b.returnedRows) ?? null,
    selectedColumns: ((_c = state.activeDataQuery.result) == null ? void 0 : _c.selectedColumns) ?? []
  } : null;
  const reportDataset = state.csvData ?? state.rawCsvData;
  const baseQualityGovernance = reportDataset ? analyzeDatasetQualityGovernance(
    state.columnProfiles,
    reportDataset,
    buildDatasetContext(
      reportDataset,
      state.columnProfiles,
      state.reportContextResolution,
      state.datasetSemanticSnapshot,
      state.semanticDatasetVersion,
      state.dataPreparationPlan ?? null,
      state.rawCsvData ?? reportDataset
    ),
    {
      rowExpansionRatio: readinessAssessment.structuralSignals.rowExpansionRatio
    }
  ) : null;
  const evaluatedCards = baseQualityGovernance ? attachAutoAnalysisEvaluationToCards(state.analysisCards ?? [], { qualityGovernance: baseQualityGovernance }) : state.analysisCards;
  const allCards = evaluatedCards.map((card) => buildCardEvidence(card, irByCardId));
  const trustedEvidence = resolveReportCardTrust(allCards);
  const qualityGovernance = reportDataset ? analyzeDatasetQualityGovernance(
    state.columnProfiles,
    reportDataset,
    buildDatasetContext(
      reportDataset,
      state.columnProfiles,
      state.reportContextResolution,
      state.datasetSemanticSnapshot,
      state.semanticDatasetVersion,
      state.dataPreparationPlan ?? null,
      state.rawCsvData ?? reportDataset
    ),
    {
      rowExpansionRatio: readinessAssessment.structuralSignals.rowExpansionRatio,
      totalCardCount: allCards.length,
      trustedCardCount: trustedEvidence.trustedIncludedCount
    }
  ) : null;
  const finalReadinessAssessment = qualityGovernance ? applyQualityReadinessAdjustment(
    readinessAssessment,
    qualityGovernance.qualityHintsSummary,
    qualityGovernance.datasetSignals.length,
    trustedEvidence.trustedIncludedCount,
    trustedEvidence.includedCards.length
  ) : readinessAssessment;
  const gateAssessment = resolveReportGenerationGateV2(
    finalReadinessAssessment.reportReadiness,
    trustedEvidence.includedCards.length,
    trustedEvidence.caveatedIncludedCount,
    finalReadinessAssessment.reportReadinessReason
  );
  const dataset = {
    fileName: inspection.importFacts.fileName,
    reportTitle: inspection.reportContext.effective.reportTitle,
    rawRowCount: inspection.importFacts.rawRowCount,
    cleanedRowCount: inspection.importFacts.cleanedRowCount,
    metadataRowCount: inspection.importFacts.metadataRowCount,
    headerDepth: inspection.importFacts.headerDepth,
    summaryRowCount: inspection.importFacts.summaryRowCount,
    parserStrategy: inspection.importFacts.parserStrategy,
    parserConfidence: inspection.importFacts.parserConfidence,
    intakeGateStatus: workflow.summary.intakeGateStatus,
    preparationState: workflow.summary.preparationState,
    analysisState: workflow.summary.analysisState,
    reportReadiness: finalReadinessAssessment.reportReadiness,
    reportReadinessReason: finalReadinessAssessment.reportReadinessReason,
    readinessDrivers: finalReadinessAssessment.readinessDrivers,
    readinessRisks: finalReadinessAssessment.readinessRisks,
    structuralSignals: finalReadinessAssessment.structuralSignals,
    canAnalyze: workflow.summary.canAnalyze,
    cardsCount: state.analysisCards.length,
    includedCardsCount: trustedEvidence.includedCards.length,
    trustedCardsCount: trustedEvidence.trustedIncludedCount,
    caveatedCardsCount: trustedEvidence.caveatedIncludedCount,
    weakCardsCount: allCards.filter((card) => card.autoAnalysisVerdict === "weak").length,
    caveats,
    qualitySignals: (qualityGovernance == null ? void 0 : qualityGovernance.datasetSignals) ?? [],
    qualityHintsSummary: (qualityGovernance == null ? void 0 : qualityGovernance.qualityHintsSummary) ?? null,
    reportGenerationGate: gateAssessment.gate,
    reportGenerationBlockers: gateAssessment.blockers
  };
  const evidenceCatalog = [
    {
      id: "dataset.context",
      kind: "dataset",
      label: "Dataset Context",
      source: "derived",
      detail: buildDatasetContextDetail(dataset)
    },
    {
      id: "dataset.readiness",
      kind: "dataset",
      label: "Dataset Readiness",
      source: "derived",
      detail: truncateDetail(`${buildReadinessLabel(dataset.reportReadiness)}: ${dataset.reportReadinessReason}`)
    },
    ...dataset.qualityHintsSummary ? [{
      id: "dataset.quality_governance",
      kind: "dataset",
      label: "Dataset Quality Governance",
      source: "derived",
      detail: truncateDetail(dataset.qualityHintsSummary)
    }] : [],
    {
      id: "workflow.preparation",
      kind: "workflow",
      label: "Preparation Workflow",
      source: "derived",
      detail: buildPreparationDetail(dataset, workflowEvidence)
    },
    {
      id: "workflow.verification",
      kind: "workflow",
      label: "Verification Status",
      source: "derived",
      detail: buildVerificationDetail(workflowEvidence)
    }
  ];
  const coreSummaryText = trimText$6(((_d = summaries.coreAnalysisSummary) == null ? void 0 : _d.text) ?? "");
  if (coreSummaryText) {
    evidenceCatalog.push({
      id: "summary.core",
      kind: "summary",
      label: "Core Analysis Summary",
      source: "state",
      detail: buildSummaryDetail(coreSummaryText)
    });
  }
  const finalSummaryText = trimText$6(((_e = summaries.finalSummary) == null ? void 0 : _e.text) ?? "");
  if (finalSummaryText) {
    evidenceCatalog.push({
      id: "summary.final",
      kind: "summary",
      label: "Final Summary",
      source: "state",
      detail: buildSummaryDetail(finalSummaryText)
    });
  }
  if (query) {
    evidenceCatalog.push({
      id: "query.active",
      kind: "query",
      label: "Active Data Query",
      source: "state",
      detail: buildQueryDetail(query)
    });
  }
  trustedEvidence.includedCards.forEach((card) => {
    evidenceCatalog.push({
      id: card.evidenceId,
      kind: "card",
      label: card.displayTitle,
      source: "state",
      detail: buildCardDetail(card)
    });
  });
  return {
    generatedAt,
    sessionId: state.sessionId,
    datasetId: state.currentDatasetId ?? null,
    currentView: state.currentView,
    dataset,
    workflow: workflowEvidence,
    summaries,
    query,
    allCards,
    cards: trustedEvidence.includedCards,
    includedCardIds: trustedEvidence.includedCardIds,
    excludedCardIds: trustedEvidence.excludedCardIds,
    excludedEvidence: trustedEvidence.excludedEvidence,
    evidenceCatalog
  };
};
const commonEvidenceIds = ["dataset.context", "dataset.readiness"];
const analystRoleDefinitions = {
  data_quality: {
    role: "data_quality",
    label: "Data Quality Analyst",
    objective: "Assess whether the prepared dataset is trustworthy enough for report synthesis.",
    focusAreas: [
      "dataset readiness and analysis eligibility",
      "preparation workflow warnings and verification outcomes",
      "structural caveats that could distort downstream interpretation"
    ],
    preferredEvidenceIds: [...commonEvidenceIds, "workflow.preparation", "workflow.verification"],
    fallbackNextChecks: [
      "Review intake warnings and parser confidence before promoting the dataset to report mode.",
      "Verify that preparation issues and SQL verification warnings are resolved or explicitly accepted."
    ]
  },
  business: {
    role: "business",
    label: "Business Analyst",
    objective: "Extract only the strongest business-facing findings supported by trusted analysis cards.",
    focusAreas: [
      "commercially meaningful patterns in trusted cards",
      "high-signal summaries already present in the evidence bundle",
      "actions that stay within the verified evidence boundary"
    ],
    preferredEvidenceIds: [...commonEvidenceIds, "summary.core", "summary.final", "query.active"],
    fallbackNextChecks: [
      "Validate that the most important cards align with the intended business question before drafting a report.",
      "Add or refresh trusted cards if the current card set does not support a concrete business conclusion."
    ]
  },
  risk: {
    role: "risk",
    label: "Risk Analyst",
    objective: "Surface uncertainty, downside exposure, and unsupported inference risk before a report is finalized.",
    focusAreas: [
      "confidence limits caused by warnings, caveats, or sparse evidence",
      "claims that should remain conditional rather than definitive",
      "follow-up checks that reduce decision risk before export"
    ],
    preferredEvidenceIds: [...commonEvidenceIds, "workflow.verification", "workflow.preparation", "query.active"],
    fallbackNextChecks: [
      "Inspect unresolved caveats before treating any finding as report-ready.",
      "Confirm that high-impact conclusions are backed by explicit evidence ids rather than summary-only language."
    ]
  }
};
const analystRoles = Object.freeze(
  Object.keys(analystRoleDefinitions)
);
const getAnalystRoleDefinition = (role) => analystRoleDefinitions[role];
const resolvePreferredEvidenceIds = (role, bundle) => {
  const allowedEvidenceIds = new Set(bundle.evidenceCatalog.map((entry) => entry.id));
  const roleDefinition = getAnalystRoleDefinition(role);
  const roleScopedCardIds = role === "business" ? bundle.cards.map((card) => card.evidenceId) : bundle.cards.slice(0, 2).map((card) => card.evidenceId);
  return [...roleDefinition.preferredEvidenceIds, ...roleScopedCardIds].filter((id) => allowedEvidenceIds.has(id)).filter((id, index, values) => values.indexOf(id) === index);
};
const MAX_FINDINGS = 4;
const MAX_EVIDENCE_REFS$1 = 4;
const MAX_METRIC_REFS = 6;
const MAX_BLOCKERS = 4;
const MAX_CAVEATS$2 = 6;
const MAX_NEXT_CHECKS = 4;
const trimText$5 = (value) => String(value ?? "").trim();
const dedupeStrings$4 = (values, limit) => {
  const seen = /* @__PURE__ */ new Set();
  const output = [];
  for (const value of values) {
    const normalized = trimText$5(value);
    if (!normalized) {
      continue;
    }
    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(normalized);
    if (output.length >= limit) {
      break;
    }
  }
  return output;
};
const resolveFallbackConfidence = (role, bundle) => {
  if (bundle.dataset.reportReadiness === "blocked") {
    return "low";
  }
  if (bundle.dataset.reportReadiness === "partial") {
    return role === "business" ? "low" : "medium";
  }
  if (bundle.workflow.topWarnings.length > 0 || bundle.dataset.caveats.length > 0) {
    return "medium";
  }
  return "high";
};
const buildFallbackFinding = (role, bundle, preferredEvidenceIds) => {
  const cardEvidenceIds = bundle.cards.map((card) => card.evidenceId);
  if (role === "business") {
    const evidenceRefs = dedupeStrings$4(
      [...preferredEvidenceIds, ...cardEvidenceIds],
      MAX_EVIDENCE_REFS$1
    );
    const includedCardsCount = bundle.dataset.includedCardsCount ?? bundle.cards.length;
    const trustedCardsCount = bundle.dataset.trustedCardsCount;
    return {
      id: `${role}.finding.1`,
      claim: trustedCardsCount > 0 ? `${trustedCardsCount} trusted analysis card(s) are available for business interpretation.` : includedCardsCount > 0 ? `${includedCardsCount} caveated analysis card(s) are available, so business synthesis should remain provisional.` : "No trusted analysis cards exist yet, so business synthesis remains preliminary.",
      importance: includedCardsCount > 0 ? "medium" : "high",
      evidenceRefs: evidenceRefs.length > 0 ? evidenceRefs : ["dataset.readiness"],
      metricRefs: dedupeStrings$4(bundle.cards.flatMap((card) => [card.valueColumn, card.groupByColumn]), MAX_METRIC_REFS),
      caveat: trustedCardsCount > 0 ? bundle.dataset.caveats[0] : includedCardsCount > 0 ? "Business conclusions should stay caveated until at least one trusted card is available." : "Business conclusions should wait until trusted cards exist."
    };
  }
  if (role === "risk") {
    return {
      id: `${role}.finding.1`,
      claim: `Report confidence is constrained by ${bundle.dataset.caveats.length} caveat(s) and ${bundle.workflow.topWarnings.length} workflow warning(s).`,
      importance: "high",
      evidenceRefs: dedupeStrings$4(preferredEvidenceIds, MAX_EVIDENCE_REFS$1),
      metricRefs: [],
      caveat: bundle.dataset.reportReadiness === "ready" ? bundle.dataset.caveats[0] : bundle.dataset.reportReadinessReason
    };
  }
  return {
    id: `${role}.finding.1`,
    claim: `Dataset readiness is ${bundle.dataset.reportReadiness} and analysis eligibility is ${bundle.dataset.canAnalyze ? "enabled" : "blocked"}.`,
    importance: "high",
    evidenceRefs: dedupeStrings$4(preferredEvidenceIds, MAX_EVIDENCE_REFS$1),
    metricRefs: [],
    caveat: bundle.dataset.reportReadinessReason
  };
};
const buildFallbackMemo = (role, bundle, reason) => {
  const roleDefinition = getAnalystRoleDefinition(role);
  const preferredEvidenceIds = resolvePreferredEvidenceIds(role, bundle);
  const failureReason = trimText$5(reason);
  const blockers = dedupeStrings$4([
    bundle.dataset.reportReadiness === "blocked" ? bundle.dataset.reportReadinessReason : null,
    failureReason ? `Memo generation fallback used: ${failureReason}` : null
  ], MAX_BLOCKERS);
  return {
    role,
    headline: `${roleDefinition.label}: bounded fallback memo`,
    summary: failureReason ? `The ${roleDefinition.label.toLowerCase()} could not complete a validated AI memo, so this fallback summary only reflects deterministic evidence from the current bundle.` : `This fallback memo summarizes the current verified evidence bundle without adding new inference.`,
    findings: [buildFallbackFinding(role, bundle, preferredEvidenceIds)],
    blockers,
    caveats: dedupeStrings$4(bundle.dataset.caveats, MAX_CAVEATS$2),
    confidence: resolveFallbackConfidence(role, bundle),
    recommendedNextChecks: dedupeStrings$4(roleDefinition.fallbackNextChecks, MAX_NEXT_CHECKS)
  };
};
const sanitizeFinding = (role, bundle, rawFinding, index) => {
  const preferredEvidenceIds = resolvePreferredEvidenceIds(role, bundle);
  const allowedEvidenceIds = new Set(bundle.evidenceCatalog.map((entry) => entry.id));
  const evidenceRefs = dedupeStrings$4(
    Array.isArray(rawFinding == null ? void 0 : rawFinding.evidenceRefs) ? rawFinding.evidenceRefs.filter((id) => allowedEvidenceIds.has(id)) : [],
    MAX_EVIDENCE_REFS$1
  );
  const metricRefs = dedupeStrings$4(
    Array.isArray(rawFinding == null ? void 0 : rawFinding.metricRefs) ? rawFinding.metricRefs : [],
    MAX_METRIC_REFS
  );
  const claim = trimText$5(rawFinding == null ? void 0 : rawFinding.claim);
  const caveat = trimText$5(rawFinding == null ? void 0 : rawFinding.caveat);
  const importance = (rawFinding == null ? void 0 : rawFinding.importance) === "high" || (rawFinding == null ? void 0 : rawFinding.importance) === "medium" || (rawFinding == null ? void 0 : rawFinding.importance) === "low" ? rawFinding.importance : "medium";
  return {
    id: trimText$5(rawFinding == null ? void 0 : rawFinding.id) || `${role}.finding.${index + 1}`,
    claim: claim || buildFallbackFinding(role, bundle, preferredEvidenceIds).claim,
    importance,
    evidenceRefs: evidenceRefs.length > 0 ? evidenceRefs : preferredEvidenceIds.slice(0, MAX_EVIDENCE_REFS$1),
    metricRefs,
    caveat: caveat || void 0
  };
};
const sanitizeMemo = (role, bundle, rawMemo) => {
  const fallbackMemo = buildFallbackMemo(role, bundle);
  const findings = Array.isArray(rawMemo == null ? void 0 : rawMemo.findings) ? rawMemo.findings.slice(0, MAX_FINDINGS).map((finding, index) => sanitizeFinding(role, bundle, finding, index)) : [];
  return {
    role,
    headline: trimText$5(rawMemo == null ? void 0 : rawMemo.headline) || fallbackMemo.headline,
    summary: trimText$5(rawMemo == null ? void 0 : rawMemo.summary) || fallbackMemo.summary,
    findings: findings.length > 0 ? findings : fallbackMemo.findings,
    blockers: dedupeStrings$4(
      Array.isArray(rawMemo == null ? void 0 : rawMemo.blockers) ? rawMemo.blockers : fallbackMemo.blockers,
      MAX_BLOCKERS
    ),
    caveats: dedupeStrings$4(
      Array.isArray(rawMemo == null ? void 0 : rawMemo.caveats) ? [...rawMemo.caveats, ...bundle.dataset.caveats] : fallbackMemo.caveats,
      MAX_CAVEATS$2
    ),
    confidence: (rawMemo == null ? void 0 : rawMemo.confidence) === "high" || (rawMemo == null ? void 0 : rawMemo.confidence) === "medium" || (rawMemo == null ? void 0 : rawMemo.confidence) === "low" ? rawMemo.confidence : fallbackMemo.confidence,
    recommendedNextChecks: dedupeStrings$4(
      Array.isArray(rawMemo == null ? void 0 : rawMemo.recommendedNextChecks) ? [...rawMemo.recommendedNextChecks, ...getAnalystRoleDefinition(role).fallbackNextChecks] : fallbackMemo.recommendedNextChecks,
      MAX_NEXT_CHECKS
    )
  };
};
const generateAnalystMemoWithDiagnostics = async (role, bundle, settings, briefing, abortSignal) => {
  if (!isProviderConfigured(settings)) {
    return {
      memo: buildFallbackMemo(role, bundle, "No model provider is configured."),
      diagnostics: {
        llmUsed: false,
        usedFallback: true,
        fallbackReason: "No model provider is configured."
      }
    };
  }
  try {
    const roleDefinition = getAnalystRoleDefinition(role);
    const systemPrompt = [
      `You are the ${roleDefinition.label} in a bounded multi-analyst report workflow.`,
      `Produce one structured memo that stays strictly inside the provided evidence bundle.`,
      `Quality standards:`,
      `- A finding is STRONG when it is backed by a card with business confidence >= 0.75 and the pattern accounts for a material share (>20%) of the total.`,
      `- A finding is PRELIMINARY when evidence is sparse, caveated, or the pattern share is below 20%. Mark it as importance "medium" or "low".`,
      `- If two signals conflict (e.g., revenue up but profit down), report both sides rather than choosing one. Use a caveat to flag the tension.`,
      `- Downgrade any claim to a caveat or blocker if the supporting card has aggregation quality warnings or low business confidence.`,
      `- Order your findings by business impact — lead with the insight that would most change a decision-maker's action.`,
      `- Each finding must cite at least one evidence id from the EVIDENCE_CATALOG. Never cite an id that does not appear in the catalog.`,
      `- Keep your memo bounded: prefer 2-4 findings, 0-3 blockers, and 1-4 recommended next checks.`,
      `- Write concise, business-friendly prose. Avoid internal jargon, column names, enum values, or system terminology.`,
      `- If the evidence bundle is too thin to support any finding, return an empty findings array and explain why in a blocker.`
    ].join("\n");
    const promptContent = createAnalystMemoPrompt(roleDefinition, bundle, settings.language, briefing);
    const { model, modelId } = createProviderModel(settings, settings.complexModel);
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: promptContent }
    ];
    const result = await withTransientRetry(
      (fb) => streamGenerateText({
        model: fb ?? model,
        messages,
        output: output_exports.object({ schema: jsonSchema(prepareSchemaForProvider(analystMemoSchema, settings.provider)) })
      }),
      { settings, primaryModelId: modelId, label: "analystMemoGenerator", abortSignal }
    );
    const parsed = result.output !== void 0 ? result.output : robustlyParseJsonObject(result.text);
    return {
      memo: sanitizeMemo(role, bundle, parsed),
      diagnostics: {
        llmUsed: true,
        usedFallback: false,
        fallbackReason: null
      }
    };
  } catch (error) {
    if (isRuntimeAbortError(error, abortSignal)) throw error;
    const message = error instanceof Error ? error.message : "Unknown analyst memo generation failure.";
    console.error("Failed to generate analyst memo:", error);
    return {
      memo: buildFallbackMemo(role, bundle, message),
      diagnostics: {
        llmUsed: true,
        usedFallback: true,
        fallbackReason: message
      }
    };
  }
};
const MAX_CONSENSUS_FINDINGS = 5;
const MAX_DISAGREEMENTS = 3;
const MAX_SUPPORTED_ROLES = 3;
const MAX_EVIDENCE_REFS = 5;
const MAX_CAVEATS$1 = 5;
const MAX_POSITIONS = 3;
const MAX_ACTIONS = 5;
const VALID_ROLES = ["data_quality", "business", "risk"];
const trimText$4 = (value) => String(value ?? "").trim();
const isAnalystRole = (value) => typeof value === "string" && VALID_ROLES.includes(value);
const dedupeStrings$3 = (values, limit) => {
  const seen = /* @__PURE__ */ new Set();
  const output = [];
  for (const value of values) {
    const normalized = trimText$4(value);
    if (!normalized) {
      continue;
    }
    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(normalized);
    if (output.length >= limit) {
      break;
    }
  }
  return output;
};
const dedupeRoles = (roles, limit = MAX_SUPPORTED_ROLES) => {
  const seen = /* @__PURE__ */ new Set();
  const output = [];
  for (const role of roles) {
    if (!isAnalystRole(role) || seen.has(role)) {
      continue;
    }
    seen.add(role);
    output.push(role);
    if (output.length >= limit) {
      break;
    }
  }
  return output;
};
const resolveOverallConfidence = (memos, bundle) => {
  if (bundle.dataset.reportReadiness === "blocked") {
    return "low";
  }
  const memoConfidences = memos.map((memo) => memo.confidence);
  if (memoConfidences.includes("low")) {
    return memoConfidences.includes("high") ? "medium" : "low";
  }
  if (bundle.dataset.reportReadiness === "partial") {
    return "medium";
  }
  if (memoConfidences.every((confidence) => confidence === "high") && bundle.dataset.caveats.length === 0) {
    return "high";
  }
  return "medium";
};
const createRoleEvidenceFallback = (role, memos, bundle) => {
  const memo = memos.find((candidate) => candidate.role === role);
  const evidenceRefs = (memo == null ? void 0 : memo.findings.flatMap((finding) => finding.evidenceRefs)) ?? [];
  const fallbackRefs = role === "business" ? ["summary.core", "summary.final", ...bundle.cards.map((card) => card.evidenceId)] : role === "risk" ? ["workflow.verification", "dataset.readiness"] : ["dataset.context", "workflow.preparation", "workflow.verification"];
  const allowedEvidenceIds = new Set(bundle.evidenceCatalog.map((entry) => entry.id));
  return dedupeStrings$3([...evidenceRefs, ...fallbackRefs].filter((id) => allowedEvidenceIds.has(id)), MAX_EVIDENCE_REFS);
};
const buildFallbackConsensusFindings = (memos, bundle) => {
  const allowedEvidenceIds = new Set(bundle.evidenceCatalog.map((entry) => entry.id));
  const primaryFindings = memos.flatMap((memo) => memo.findings.slice(0, 1).map((finding) => ({ memo, finding }))).slice(0, MAX_CONSENSUS_FINDINGS);
  const derivedFindings = primaryFindings.map(({ memo, finding }, index) => {
    const evidenceRefs = dedupeStrings$3(
      finding.evidenceRefs.filter((id) => allowedEvidenceIds.has(id)),
      MAX_EVIDENCE_REFS
    );
    return {
      id: `forum.finding.${index + 1}`,
      claim: trimText$4(finding.claim) || trimText$4(memo.summary) || `${memo.role} memo provided one bounded finding.`,
      supportedByRoles: [memo.role],
      evidenceRefs: evidenceRefs.length > 0 ? evidenceRefs : createRoleEvidenceFallback(memo.role, memos, bundle),
      caveats: dedupeStrings$3([
        finding.caveat,
        ...memo.caveats
      ], MAX_CAVEATS$1)
    };
  });
  if (derivedFindings.length > 0) {
    return derivedFindings;
  }
  return [{
    id: "forum.finding.1",
    claim: `Report readiness is ${bundle.dataset.reportReadiness} for the current verified dataset.`,
    supportedByRoles: dedupeRoles(memos.map((memo) => memo.role)),
    evidenceRefs: dedupeStrings$3(["dataset.readiness", "dataset.context"], MAX_EVIDENCE_REFS),
    caveats: dedupeStrings$3(bundle.dataset.caveats, MAX_CAVEATS$1)
  }];
};
const buildFallbackDisagreements = (memos, bundle) => {
  const uniqueConfidences = Array.from(new Set(memos.map((memo) => memo.confidence)));
  if (uniqueConfidences.length <= 1 && bundle.dataset.reportReadiness !== "blocked") {
    return [];
  }
  const positions = memos.slice(0, MAX_POSITIONS).map((memo) => ({
    role: memo.role,
    stance: trimText$4(memo.summary) || `${memo.role} confidence is ${memo.confidence}.`,
    evidenceRefs: createRoleEvidenceFallback(memo.role, memos, bundle)
  }));
  return [{
    id: "forum.disagreement.1",
    topic: "Overall report confidence and readiness",
    positions,
    resolution: bundle.dataset.reportReadiness === "blocked" ? "unresolved" : uniqueConfidences.length > 1 ? "partially_resolved" : "resolved"
  }];
};
const buildFallbackForumSummary = (memos, bundle, reason) => {
  const failureReason = trimText$4(reason);
  const consensusFindings = buildFallbackConsensusFindings(memos, bundle);
  const disagreements = buildFallbackDisagreements(memos, bundle);
  const recommendedActions = dedupeStrings$3([
    ...memos.flatMap((memo) => memo.recommendedNextChecks),
    bundle.dataset.reportReadiness !== "ready" ? bundle.dataset.reportReadinessReason : null,
    failureReason ? `Forum summary fallback used: ${failureReason}` : null
  ], MAX_ACTIONS);
  const roleList = dedupeRoles(memos.map((memo) => memo.role));
  return {
    consensusFindings,
    disagreements,
    overallConfidence: resolveOverallConfidence(memos, bundle),
    executiveSummary: failureReason ? `The forum aggregator used a deterministic fallback because a validated aggregation response was not available. ${roleList.length} analyst memo(s) were merged against a dataset with ${bundle.dataset.reportReadiness} readiness.` : `${roleList.length} analyst memo(s) were merged into a bounded forum summary for a dataset with ${bundle.dataset.reportReadiness} readiness.`,
    recommendedActions
  };
};
const sanitizeForumFinding = (rawFinding, index, memos, bundle) => {
  const allowedEvidenceIds = new Set(bundle.evidenceCatalog.map((entry) => entry.id));
  const supportedByRoles = dedupeRoles(
    Array.isArray(rawFinding == null ? void 0 : rawFinding.supportedByRoles) ? rawFinding.supportedByRoles : []
  );
  const fallbackRoles = supportedByRoles.length > 0 ? supportedByRoles : dedupeRoles(memos.map((memo) => memo.role));
  const evidenceRefs = dedupeStrings$3(
    Array.isArray(rawFinding == null ? void 0 : rawFinding.evidenceRefs) ? rawFinding.evidenceRefs.filter((id) => allowedEvidenceIds.has(id)) : [],
    MAX_EVIDENCE_REFS
  );
  const claim = trimText$4(rawFinding == null ? void 0 : rawFinding.claim);
  if (!claim) {
    return null;
  }
  const resolvedRoles = fallbackRoles.length > 0 ? fallbackRoles : ["business"];
  const fallbackEvidence = createRoleEvidenceFallback(resolvedRoles[0], memos, bundle);
  return {
    id: trimText$4(rawFinding == null ? void 0 : rawFinding.id) || `forum.finding.${index + 1}`,
    claim,
    supportedByRoles: resolvedRoles,
    evidenceRefs: evidenceRefs.length > 0 ? evidenceRefs : fallbackEvidence,
    caveats: dedupeStrings$3(
      Array.isArray(rawFinding == null ? void 0 : rawFinding.caveats) ? rawFinding.caveats : [],
      MAX_CAVEATS$1
    )
  };
};
const sanitizeDisagreementPosition = (rawPosition, memos, bundle) => {
  const role = isAnalystRole(rawPosition == null ? void 0 : rawPosition.role) ? rawPosition.role : null;
  const stance = trimText$4(rawPosition == null ? void 0 : rawPosition.stance);
  if (!role || !stance) {
    return null;
  }
  const allowedEvidenceIds = new Set(bundle.evidenceCatalog.map((entry) => entry.id));
  const evidenceRefs = dedupeStrings$3(
    Array.isArray(rawPosition == null ? void 0 : rawPosition.evidenceRefs) ? rawPosition.evidenceRefs.filter((id) => allowedEvidenceIds.has(id)) : [],
    MAX_EVIDENCE_REFS
  );
  return {
    role,
    stance,
    evidenceRefs: evidenceRefs.length > 0 ? evidenceRefs : createRoleEvidenceFallback(role, memos, bundle)
  };
};
const sanitizeForumDisagreement = (rawDisagreement, index, memos, bundle) => {
  const topic = trimText$4(rawDisagreement == null ? void 0 : rawDisagreement.topic);
  if (!topic) {
    return null;
  }
  const positions = Array.isArray(rawDisagreement == null ? void 0 : rawDisagreement.positions) ? rawDisagreement.positions.map((position) => sanitizeDisagreementPosition(position, memos, bundle)).filter((position) => position !== null).filter((position, positionIndex, values) => values.findIndex((candidate) => candidate.role === position.role) === positionIndex).slice(0, MAX_POSITIONS) : [];
  if (positions.length === 0) {
    return null;
  }
  const resolution = (rawDisagreement == null ? void 0 : rawDisagreement.resolution) === "resolved" || (rawDisagreement == null ? void 0 : rawDisagreement.resolution) === "partially_resolved" || (rawDisagreement == null ? void 0 : rawDisagreement.resolution) === "unresolved" ? rawDisagreement.resolution : "unresolved";
  return {
    id: trimText$4(rawDisagreement == null ? void 0 : rawDisagreement.id) || `forum.disagreement.${index + 1}`,
    topic,
    positions,
    resolution
  };
};
const sanitizeForumSummary = (rawSummary, memos, bundle) => {
  const fallback = buildFallbackForumSummary(memos, bundle);
  const consensusFindings = Array.isArray(rawSummary == null ? void 0 : rawSummary.consensusFindings) ? rawSummary.consensusFindings.map((finding, index) => sanitizeForumFinding(finding, index, memos, bundle)).filter((finding) => finding !== null).slice(0, MAX_CONSENSUS_FINDINGS) : [];
  const disagreements = Array.isArray(rawSummary == null ? void 0 : rawSummary.disagreements) ? rawSummary.disagreements.map((disagreement, index) => sanitizeForumDisagreement(disagreement, index, memos, bundle)).filter((disagreement) => disagreement !== null).slice(0, MAX_DISAGREEMENTS) : [];
  return {
    consensusFindings: consensusFindings.length > 0 ? consensusFindings : fallback.consensusFindings,
    disagreements,
    overallConfidence: (rawSummary == null ? void 0 : rawSummary.overallConfidence) === "high" || (rawSummary == null ? void 0 : rawSummary.overallConfidence) === "medium" || (rawSummary == null ? void 0 : rawSummary.overallConfidence) === "low" ? rawSummary.overallConfidence : fallback.overallConfidence,
    executiveSummary: trimText$4(rawSummary == null ? void 0 : rawSummary.executiveSummary) || fallback.executiveSummary,
    recommendedActions: dedupeStrings$3(
      Array.isArray(rawSummary == null ? void 0 : rawSummary.recommendedActions) ? [...rawSummary.recommendedActions, ...memos.flatMap((memo) => memo.recommendedNextChecks)] : fallback.recommendedActions,
      MAX_ACTIONS
    )
  };
};
const generateForumSummaryWithDiagnostics = async (memos, bundle, settings, briefing, abortSignal) => {
  if (!isProviderConfigured(settings)) {
    return {
      forum: buildFallbackForumSummary(memos, bundle, "No model provider is configured."),
      diagnostics: {
        llmUsed: false,
        usedFallback: true,
        fallbackReason: "No model provider is configured."
      }
    };
  }
  try {
    const systemPrompt = [
      "You are the bounded forum aggregator in a multi-analyst report workflow.",
      "Your job is to merge the analyst memos into one structured forum summary. Never invent evidence that does not appear in the memos or evidence bundle.",
      "Quality standards:",
      "- STRONG consensus: a finding is promoted to consensusFindings only when 2 or more analysts support it with overlapping evidence refs.",
      "- WEAK consensus: if only 1 analyst supports a claim, include it only if it cites high-confidence evidence (business confidence >= 0.75). Otherwise, omit it or note it as a caveat.",
      "- When analyst positions materially diverge on the same metric or topic, preserve the disagreement rather than forcing consensus. Use the disagreements array.",
      "- The executiveSummary should read like a 2-3 sentence professional analyst briefing for senior management — lead with the most actionable insight, then the main risk.",
      "- Order consensusFindings by business impact, not by analyst order.",
      "- Each recommended action must be a single clear sentence starting with a verb. Order actions by urgency.",
      '- If all memos have low confidence, set overallConfidence to "low" and explain why in the executiveSummary.',
      '- Avoid technical jargon like "helper exposure", "narrative ineligible", "row expansion ratio", or "parser confidence" in any user-facing text.',
      "- Keep the forum summary bounded: prefer 2-5 consensus findings, 0-3 disagreements, and 2-5 recommended actions."
    ].join("\n");
    const promptContent = createForumSummaryPrompt(memos, bundle, settings.language, briefing);
    const { model, modelId } = createProviderModel(settings, settings.complexModel);
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: promptContent }
    ];
    const result = await withTransientRetry(
      (fb) => streamGenerateText({
        model: fb ?? model,
        messages,
        output: output_exports.object({ schema: jsonSchema(prepareSchemaForProvider(forumSummarySchema, settings.provider)) })
      }),
      { settings, primaryModelId: modelId, label: "forumSummaryGenerator", abortSignal }
    );
    const parsed = result.output !== void 0 ? result.output : robustlyParseJsonObject(result.text);
    return {
      forum: sanitizeForumSummary(parsed, memos, bundle),
      diagnostics: {
        llmUsed: true,
        usedFallback: false,
        fallbackReason: null
      }
    };
  } catch (error) {
    if (isRuntimeAbortError(error, abortSignal)) throw error;
    const message = error instanceof Error ? error.message : "Unknown forum summary generation failure.";
    console.error("Failed to generate forum summary:", error);
    return {
      forum: buildFallbackForumSummary(memos, bundle, message),
      diagnostics: {
        llmUsed: true,
        usedFallback: true,
        fallbackReason: message
      }
    };
  }
};
const trimText$3 = (value) => String(value ?? "").trim();
const collapseWhitespace = (value) => value.replace(/\s+/g, " ").trim();
const sentenceCase = (value) => {
  if (!value) {
    return "";
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
};
const removeMarkdownNoise = (value) => value.replace(/^#{1,6}\s+/gm, "").replace(/^\s*[-*]\s+/gm, "").replace(/\*\*/g, "").replace(/`/g, "").replace(/\[(.*?)\]\((.*?)\)/g, "$1").replace(/\s+[*-]\s+/g, " ");
const stripFieldNoise = (value) => value.replace(/\b([A-Z_]{3,})\b/g, (token) => token.replace(/_/g, " ").toLowerCase()).replace(/\bSeries Key\b/gi, "series key").replace(/\bSource Column\b/gi, "source column");
const CURRENCY_CODES = /\b(sgd|usd|eur|gbp|jpy|cny|myr|hkd|aud|cad|chf|nzd|krw|thb|idr|php|vnd|twd|inr)\b/gi;
const normalizeCurrencyAbbreviations = (value) => value.replace(CURRENCY_CODES, (match) => match.toUpperCase());
const normalizeNullLabels = (value) => value.replace(/\bnull\s+(project\s+)?categor(y|ies)\b/gi, "unclassified category").replace(/\bnull\s+group\b/gi, "unclassified group").replace(/\bnull\b(?=\s+(value|item|entry|record|label))/gi, "missing");
const normalizeCompanyNameCase = (value) => value.replace(/\b(pte|ltd|inc|corp|llc|sdn|bhd)\b/gi, (match) => match.toUpperCase());
const splitSentences = (value) => collapseWhitespace(value).split(new RegExp("(?<=[.!?])\\s+")).map((sentence) => sentence.trim()).filter(Boolean);
const normalizeReportNarrative = (value, options) => {
  const maxSentences = (options == null ? void 0 : options.maxSentences) ?? 2;
  const cleaned = collapseWhitespace(
    normalizeCompanyNameCase(
      normalizeCurrencyAbbreviations(
        normalizeNullLabels(
          stripFieldNoise(removeMarkdownNoise(trimText$3(value)))
        )
      )
    )
  );
  const sentences = splitSentences(cleaned);
  const selected = (sentences.length > 0 ? sentences : cleaned ? [cleaned] : []).slice(0, maxSentences).join(" ");
  const normalized = sentenceCase(collapseWhitespace(selected));
  if (normalized) {
    return normalized;
  }
  return trimText$3(options == null ? void 0 : options.fallback);
};
const buildNarrativeSemanticKey = (value) => collapseWhitespace(
  trimText$3(value).toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\b(the|a|an|is|are|was|were|for|of|to|and|with|by|in)\b/g, " ").replace(/\s+/g, " ")
);
const MAX_CIRCULAR_CATEGORIES = 8;
const hasLongLabels = (labels) => labels.some((label) => label.length > 42);
const validateReportChartPayload = (payload) => {
  let chartType = payload.chartType;
  const chartWarnings = [];
  const labels = payload.labels ?? payload.displayLabels;
  const timeLabelTimestamps = labels.map((label) => getTemporalSortTimestamp(label, payload.groupByColumn) ?? NaN);
  const hasTemporalSequence = !timeLabelTimestamps.some(Number.isNaN);
  if (chartType === "pie" || chartType === "doughnut") {
    if (payload.valueDomain !== "positive") {
      chartType = "bar";
      chartWarnings.push("Circular charts were downgraded because the values are not strictly positive.");
    }
    const effectiveLabelCount = payload.originalLabelCount ?? labels.length;
    if ((chartType === "pie" || chartType === "doughnut") && effectiveLabelCount > MAX_CIRCULAR_CATEGORIES) {
      chartType = "bar";
      chartWarnings.push(`Circular charts were downgraded because the category count (${effectiveLabelCount}) exceeds ${MAX_CIRCULAR_CATEGORIES}.`);
    }
    if ((chartType === "pie" || chartType === "doughnut") && hasDuplicateNormalizedBuckets(labels)) {
      chartType = "bar";
      chartWarnings.push("Circular charts were downgraded because duplicate category labels were detected.");
    }
    if (chartType === "pie" || chartType === "doughnut") {
      const total = payload.numericValues.reduce((sum, v) => sum + Math.abs(v), 0);
      if (total > 0) {
        const maxShare = Math.max(...payload.numericValues.map((v) => Math.abs(v))) / total;
        if (maxShare > 0.95) {
          chartType = "bar";
          chartWarnings.push("Circular charts were downgraded because a single category accounts for over 95% of the total.");
        }
      }
    }
  }
  if (chartType === "line") {
    const isSeqName = isSequentialDimensionName(payload.groupByColumn);
    const sortable = isSortableSequence(labels) || hasTemporalSequence;
    if (!isSeqName && !sortable) {
      chartType = "bar";
      chartWarnings.push("Line chart was downgraded because the grouping dimension is not a clear sequence.");
    }
    if (chartType === "line" && hasDuplicateNormalizedBuckets(labels)) {
      chartType = "bar";
      chartWarnings.push("Line chart was downgraded because duplicate x-axis labels were detected.");
    }
    if (chartType === "line" && labels.length >= 2) {
      const ordinalIndices = resolveOrdinalIndices(labels);
      if (ordinalIndices) {
        if (!isMonotonicSequence(ordinalIndices)) {
          chartType = "bar";
          chartWarnings.push("Line chart was downgraded because the ordinal labels are not in monotonic order.");
        }
      } else {
        if (hasTemporalSequence && !isMonotonicSequence(timeLabelTimestamps)) {
          chartType = "bar";
          chartWarnings.push("Line chart was downgraded because the time labels are not in monotonic order.");
        }
      }
    }
    if (chartType === "line" && labels.length < 2) {
      chartType = "bar";
      chartWarnings.push("Line chart was downgraded because fewer than 2 data points are available.");
    }
  }
  if ((chartType === "pie" || chartType === "doughnut") && hasLongLabels(payload.displayLabels)) {
    chartWarnings.push("Long labels were moved into the legend to preserve chart readability.");
  }
  return {
    chartType,
    chartWarnings
  };
};
const MAX_BAR_POINTS = 6;
const MAX_LINE_POINTS = 8;
const OTHER_LABEL = "Other";
const SUPPORTED_CHART_TYPES = ["bar", "line", "pie", "doughnut"];
const numberFormatter$1 = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2
});
const trimText$2 = (value) => String(value ?? "").trim();
const toNumericValue$2 = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.replace(/,/g, "").trim();
    if (!normalized) {
      return null;
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};
const getRowLabel = (row, groupByColumn, _index) => {
  if (groupByColumn) {
    const value = trimText$2(row[groupByColumn]);
    if (value && !/^(null|n\/a|undefined)$/i.test(value)) {
      return value;
    }
  }
  return "Unclassified";
};
const cleanupLabel = (value, title) => {
  const titleTokens = new Set(
    title.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((token) => token.length > 2)
  );
  const normalized = value.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  const cleaned = normalized.split(/\s+/).filter((token) => !titleTokens.has(token.toLowerCase())).join(" ").trim();
  const candidate = cleaned || normalized;
  if (!candidate) {
    return "Untitled";
  }
  const lower = candidate.toLowerCase();
  if (candidate === candidate.toUpperCase() && /[A-Z]/.test(candidate)) {
    return lower.replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
  return candidate;
};
const disambiguateLabels = (labels) => {
  const seen = /* @__PURE__ */ new Map();
  return labels.map((label) => {
    const key = label.toLowerCase();
    const count = seen.get(key) ?? 0;
    seen.set(key, count + 1);
    return count === 0 ? label : `${label} (${count + 1})`;
  });
};
const resolveValueDomain = (values) => {
  const hasPositive = values.some((value) => value > 0);
  const hasNegative = values.some((value) => value < 0);
  if (hasPositive && hasNegative) {
    return "mixed";
  }
  if (hasNegative) {
    return "negative";
  }
  return "positive";
};
const buildRankedEntries = (card) => card.reportChartRows.map((row, index) => {
  const numericValue = toNumericValue$2(row[card.valueColumn]);
  if (numericValue === null) {
    return null;
  }
  return {
    row,
    rawLabel: getRowLabel(row, card.groupByColumn),
    displayLabel: cleanupLabel(
      formatTemporalDisplayValue(card.groupByColumn, row[card.groupByColumn]) ?? getRowLabel(row, card.groupByColumn),
      card.displayTitle
    ),
    numericValue,
    originalIndex: index
  };
}).filter((value) => Boolean(value));
const aggregateRankedEntries = (entries, limit) => {
  const ranked = [...entries].sort((left, right) => Math.abs(right.numericValue) - Math.abs(left.numericValue));
  if (ranked.length <= limit + 2) {
    return {
      rows: ranked.slice(0, limit),
      aggregationApplied: false,
      aggregatedOtherValue: null
    };
  }
  const topRows = ranked.slice(0, limit - 1);
  const remaining = ranked.slice(limit - 1);
  const aggregatedOtherValue = remaining.reduce((sum, entry) => sum + entry.numericValue, 0);
  return {
    rows: [
      ...topRows,
      {
        row: { label: OTHER_LABEL, value: aggregatedOtherValue },
        rawLabel: OTHER_LABEL,
        displayLabel: OTHER_LABEL,
        numericValue: aggregatedOtherValue,
        originalIndex: Number.MAX_SAFE_INTEGER
      }
    ],
    aggregationApplied: true,
    aggregatedOtherValue
  };
};
const sortEntriesBySequentialOrder = (entries) => {
  if (entries.length < 2) return entries;
  const rawLabels = entries.map((e) => e.rawLabel);
  const displayLabels = entries.map((e) => e.displayLabel);
  const ordinalIndices = resolveOrdinalIndices(rawLabels);
  if (ordinalIndices) {
    const paired = entries.map((entry, i) => ({ entry, key: ordinalIndices[i] }));
    return paired.sort((a, b) => a.key - b.key).map((p) => p.entry);
  }
  const allHaveOrdinalKey = rawLabels.every((l) => getOrdinalSortKey(l) !== null);
  if (allHaveOrdinalKey) {
    return [...entries].sort((a, b) => (getOrdinalSortKey(a.rawLabel) ?? 0) - (getOrdinalSortKey(b.rawLabel) ?? 0));
  }
  const timestamps = rawLabels.map((label) => getTemporalSortTimestamp(label) ?? NaN);
  if (!timestamps.some(Number.isNaN)) {
    const paired = entries.map((entry, i) => ({ entry, key: timestamps[i] }));
    return paired.sort((a, b) => a.key - b.key).map((p) => p.entry);
  }
  const displayTimestamps = displayLabels.map((label) => getTemporalSortTimestamp(label) ?? NaN);
  if (!displayTimestamps.some(Number.isNaN)) {
    const paired = entries.map((entry, i) => ({ entry, key: displayTimestamps[i] }));
    return paired.sort((a, b) => a.key - b.key).map((p) => p.entry);
  }
  return entries;
};
const resolveChartEntries = (card, entries) => {
  if (card.chartType === "line") {
    const sorted = sortEntriesBySequentialOrder(entries);
    return {
      rows: sorted.slice(0, MAX_LINE_POINTS),
      aggregationApplied: false,
      aggregatedOtherValue: null
    };
  }
  return aggregateRankedEntries(entries, MAX_BAR_POINTS);
};
const isSupportedReportChartType = (value) => SUPPORTED_CHART_TYPES.includes(value);
const buildReportChartPayload = (card) => {
  var _a;
  if (!isSupportedReportChartType(card.chartType) || !card.valueColumn) {
    return null;
  }
  const entries = buildRankedEntries(card);
  if (entries.length === 0) {
    return null;
  }
  const { rows, aggregationApplied, aggregatedOtherValue } = resolveChartEntries(card, entries);
  const displayLabels = disambiguateLabels(rows.map((entry) => entry.displayLabel));
  const numericValues = rows.map((entry) => entry.numericValue);
  const valueDomain = resolveValueDomain(numericValues);
  const validation = validateReportChartPayload({
    chartType: card.chartType,
    valueDomain,
    groupByColumn: card.groupByColumn,
    displayLabels,
    labels: rows.map((entry) => entry.rawLabel),
    numericValues,
    originalLabelCount: entries.length
  });
  return {
    chartType: validation.chartType,
    title: card.displayTitle,
    groupByColumn: card.groupByColumn,
    valueColumn: card.valueColumn,
    rows: rows.map((entry) => entry.row),
    sortedRows: [...entries].sort((left, right) => Math.abs(right.numericValue) - Math.abs(left.numericValue)).map((entry) => entry.row),
    labels: rows.map((entry) => entry.rawLabel),
    displayLabels,
    numericValues,
    formattedValues: numericValues.map((value) => numberFormatter$1.format(value)),
    chartNarrative: normalizeReportNarrative(((_a = card.summary) == null ? void 0 : _a.text) || card.description || card.displayTitle, {
      maxSentences: 2,
      fallback: card.displayTitle
    }),
    valueDomain,
    aggregationApplied,
    aggregatedOtherValue,
    chartWarnings: validation.chartWarnings
  };
};
const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2
});
const escapeXml = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const wrapLabel = (value, maxChars = 26, maxLines = 2) => {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return ["Untitled"];
  }
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    if (current) {
      lines.push(current);
      current = word;
    } else {
      lines.push(`${word.slice(0, Math.max(0, maxChars - 1))}…`);
      current = "";
    }
    if (lines.length >= maxLines - 1) {
      break;
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  if (words.join(" ").length > lines.join(" ").length && lines.length > 0) {
    const lastLine = lines[lines.length - 1];
    lines[lines.length - 1] = lastLine.length >= maxChars ? `${lastLine.slice(0, Math.max(0, maxChars - 1))}…` : `${lastLine}…`;
  }
  return lines.slice(0, maxLines);
};
const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  };
};
const describeArc = (centerX, centerY, radius, startAngle, endAngle, innerRadius = 0) => {
  const start = polarToCartesian(centerX, centerY, radius, endAngle);
  const end = polarToCartesian(centerX, centerY, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  if (innerRadius <= 0) {
    return [
      `M ${centerX} ${centerY}`,
      `L ${start.x} ${start.y}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
      "Z"
    ].join(" ");
  }
  const innerStart = polarToCartesian(centerX, centerY, innerRadius, endAngle);
  const innerEnd = polarToCartesian(centerX, centerY, innerRadius, startAngle);
  return [
    `M ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${innerStart.x} ${innerStart.y}`,
    "Z"
  ].join(" ");
};
const buildBarColor = (value, index) => {
  const positivePalette = ["#264f7d", "#356897", "#4a83b5", "#699cc8", "#6b8c55", "#4f7a42"];
  const negativePalette = ["#8a392d", "#a94c3d", "#c46654", "#d98a6f", "#e7b39a", "#f1d7c8"];
  const palette = value < 0 ? negativePalette : positivePalette;
  return palette[index % palette.length];
};
const cleanChartSubtitle = (valueColumn) => {
  if (!valueColumn) return "Metric";
  return valueColumn.replace(/^(sum_|total_|row_|count_)/i, "").replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim() || "Metric";
};
const renderBarChart = (payload) => {
  var _a;
  const labels = ((_a = payload.displayLabels) == null ? void 0 : _a.length) ? payload.displayLabels : payload.labels;
  const rowCount = payload.numericValues.length;
  const width = 860;
  const leftLabelWidth = 228;
  const valueColumnWidth = 118;
  const chartX = leftLabelWidth + 26;
  const chartWidth = width - chartX - valueColumnWidth - 22;
  const topPadding = 28;
  const rowHeight = 26;
  const rowGap = 18;
  const chartHeight = rowCount * rowHeight + Math.max(0, rowCount - 1) * rowGap;
  const height = topPadding + chartHeight + 30;
  const minValue = Math.min(...payload.numericValues, 0);
  const maxValue = Math.max(...payload.numericValues, 0);
  const valueRange = Math.max(1, maxValue - minValue);
  const zeroX = chartX + (0 - minValue) / valueRange * chartWidth;
  const maxGuideX = chartX + (maxValue - minValue) / valueRange * chartWidth;
  const axisLabel = `${cleanChartSubtitle(payload.valueColumn)} by ${payload.groupByColumn ?? "Group"}`;
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(payload.title)}" xmlns="http://www.w3.org/2000/svg" style="font-family: Arial, Helvetica, sans-serif; font-size: 12px;">
  <rect x="0" y="0" width="${width}" height="${height}" rx="16" fill="#fffefb" />
  <text x="0" y="14" font-size="10" font-weight="700" letter-spacing="1.2" fill="#7a6f64">${escapeXml(axisLabel)}</text>
  <line x1="${chartX}" y1="${topPadding - 4}" x2="${chartX + chartWidth}" y2="${topPadding - 4}" stroke="#d9d0c5" stroke-width="1" />
  <line x1="${maxGuideX}" y1="${topPadding - 4}" x2="${maxGuideX}" y2="${topPadding + chartHeight + 4}" stroke="#ece2d4" stroke-width="1" />
  <line x1="${zeroX}" y1="${topPadding - 4}" x2="${zeroX}" y2="${topPadding + chartHeight + 4}" stroke="#cdbca8" stroke-width="1.5" stroke-dasharray="4 4" />
  <text x="${zeroX}" y="${topPadding - 10}" text-anchor="middle" font-size="10" fill="#7a6f64">Zero baseline</text>
  ${labels.map((label, index) => {
    const y = topPadding + index * (rowHeight + rowGap);
    const value = payload.numericValues[index];
    const valueX = chartX + (value - minValue) / valueRange * chartWidth;
    const barX = value >= 0 ? zeroX : valueX;
    const barWidth = Math.abs(valueX - zeroX);
    const textLines = wrapLabel(label, 24, 2);
    const labelY = y + rowHeight / 2 - (textLines.length - 1) * 6;
    const valueLabelX = chartX + chartWidth + 18;
    return `
    <g class="chart-row ${value < 0 ? "negative" : "positive"}">
      ${textLines.map((line, lineIndex) => `
      <text x="0" y="${labelY + lineIndex * 12}" font-size="11" fill="#2d271f">${escapeXml(line)}</text>
      `).join("")}
      <rect x="${chartX}" y="${y}" width="${chartWidth}" height="${rowHeight}" rx="9" fill="#f5efe4" />
      ${barWidth > 0 ? `<rect x="${Math.min(barX, zeroX)}" y="${y}" width="${Math.max(2, barWidth)}" height="${rowHeight}" rx="9" fill="${buildBarColor(value, index)}" />` : `<circle cx="${zeroX}" cy="${y + rowHeight / 2}" r="4" fill="${buildBarColor(value, index)}" />`}
      <text x="${valueLabelX}" y="${y + rowHeight / 2 + 4}" text-anchor="start" font-size="11" font-weight="700" fill="#1f1a14">${escapeXml(payload.formattedValues[index])}</text>
    </g>`;
  }).join("")}
</svg>`;
};
const renderLineChart = (payload) => {
  var _a;
  const labels = ((_a = payload.displayLabels) == null ? void 0 : _a.length) ? payload.displayLabels : payload.labels;
  const width = 860;
  const height = 334;
  const chartX = 58;
  const chartY = 36;
  const chartWidth = 712;
  const chartHeight = 190;
  const isMixed = payload.valueDomain === "mixed";
  const maxValue = isMixed ? Math.max(...payload.numericValues, 0) : Math.max(...payload.numericValues);
  const minValue = isMixed ? Math.min(...payload.numericValues, 0) : Math.min(...payload.numericValues);
  const valueRange = Math.max(1, maxValue - minValue);
  const stepX = payload.numericValues.length === 1 ? 0 : chartWidth / (payload.numericValues.length - 1);
  const zeroY = chartY + chartHeight - (0 - minValue) / valueRange * chartHeight;
  const points = payload.numericValues.map((value, index) => {
    const x = chartX + stepX * index;
    const y = chartY + chartHeight - (value - minValue) / valueRange * chartHeight;
    return { x, y, value, label: labels[index], formattedValue: payload.formattedValues[index] };
  });
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(payload.title)}" xmlns="http://www.w3.org/2000/svg" style="font-family: Arial, Helvetica, sans-serif; font-size: 12px;">
  <rect x="0" y="0" width="${width}" height="${height}" rx="16" fill="#fffefb" />
  <text x="${chartX}" y="16" font-size="10" font-weight="700" letter-spacing="1.2" fill="#7a6f64">${escapeXml(`${cleanChartSubtitle(payload.valueColumn)} trend`)}</text>
  <line x1="${chartX}" y1="${chartY + chartHeight}" x2="${chartX + chartWidth}" y2="${chartY + chartHeight}" stroke="#d9d0c5" stroke-width="1.2" />
  <line x1="${chartX}" y1="${chartY}" x2="${chartX}" y2="${chartY + chartHeight}" stroke="#d9d0c5" stroke-width="1.2" />
  ${isMixed ? `<line x1="${chartX}" y1="${zeroY}" x2="${chartX + chartWidth}" y2="${zeroY}" stroke="#cdbca8" stroke-width="1.2" stroke-dasharray="4 4" />` : ""}
  <polyline fill="none" stroke="#264f7d" stroke-width="2.5" points="${points.map((point) => `${point.x},${point.y}`).join(" ")}" />
  ${points.map((point, index) => `
    <circle cx="${point.x}" cy="${point.y}" r="4.5" fill="${buildBarColor(point.value, index)}" />
    ${wrapLabel(point.label, 20, 2).map((line, lineIndex) => `<text x="${point.x}" y="${chartY + chartHeight + 20 + lineIndex * 12}" text-anchor="middle" font-size="10.5" fill="#6b6156">${escapeXml(line)}</text>`).join("")}
    <text x="${point.x}" y="${point.y - 10}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1f1a14">${escapeXml(point.formattedValue)}</text>
  `).join("")}
</svg>`;
};
const renderCircularChart = (payload, innerRadius) => {
  var _a;
  const labels = ((_a = payload.displayLabels) == null ? void 0 : _a.length) ? payload.displayLabels : payload.labels;
  const width = 860;
  const height = 340;
  const centerX = 176;
  const centerY = 174;
  const radius = 90;
  const total = payload.numericValues.reduce((sum, value) => sum + value, 0) || 1;
  let currentAngle = 0;
  const arcs = payload.numericValues.map((value, index) => {
    const segmentAngle = value / total * 360;
    const path = describeArc(centerX, centerY, radius, currentAngle, currentAngle + segmentAngle, innerRadius);
    currentAngle += segmentAngle;
    return `<path d="${path}" fill="${buildBarColor(value, index)}" />`;
  }).join("");
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(payload.title)}" xmlns="http://www.w3.org/2000/svg" style="font-family: Arial, Helvetica, sans-serif; font-size: 12px;">
  <rect x="0" y="0" width="${width}" height="${height}" rx="16" fill="#fffefb" />
  <text x="36" y="20" font-size="10" font-weight="700" letter-spacing="1.2" fill="#7a6f64">${escapeXml(`${cleanChartSubtitle(payload.valueColumn)} mix`)}</text>
  ${arcs}
  <text x="${centerX}" y="${centerY - 4}" text-anchor="middle" font-size="10" fill="#7a6f64">Total</text>
  <text x="${centerX}" y="${centerY + 16}" text-anchor="middle" font-size="18" font-weight="700" fill="#1f1a14">${escapeXml(numberFormatter.format(total))}</text>
  ${labels.map((label, index) => {
    if (payload.numericValues[index] === 0) return "";
    const lines = wrapLabel(label, 28, 2);
    const nonZeroIndex = payload.numericValues.slice(0, index).filter((v) => v !== 0).length;
    const y = 48 + nonZeroIndex * 42;
    return `
    <rect x="366" y="${y}" width="12" height="12" rx="3" fill="${buildBarColor(payload.numericValues[index], index)}" />
    ${lines.map((line, lineIndex) => `
    <text x="388" y="${y + 10 + lineIndex * 11}" font-size="11" fill="#2d271f">${escapeXml(line)}</text>
    `).join("")}
    <text x="790" y="${y + 10}" text-anchor="end" font-size="11" font-weight="700" fill="#1f1a14">${escapeXml(payload.formattedValues[index])}</text>
    `;
  }).join("")}
</svg>`;
};
const renderFallbackSvg = (title, reason) => {
  const safeTitle = escapeXml(title || "Chart");
  const safeReason = escapeXml(reason || "Unable to render chart.");
  return `<svg viewBox="0 0 860 120" role="img" aria-label="${safeTitle}" xmlns="http://www.w3.org/2000/svg" style="font-family: Arial, Helvetica, sans-serif; font-size: 13px;"><rect x="0" y="0" width="860" height="120" rx="12" fill="#faf8f4" stroke="#d0c8bd" stroke-width="1.5"/><text x="430" y="44" text-anchor="middle" font-size="13" font-weight="700" fill="#5a4e44">${safeTitle}</text><text x="430" y="72" text-anchor="middle" font-size="11" fill="#8a7d70">⚠ ${safeReason}</text><text x="430" y="94" text-anchor="middle" font-size="10" fill="#bbb0a4">Chart data could not be rendered — see the data table below.</text></svg>`;
};
const validateChartPayload = (payload) => {
  var _a, _b, _c;
  const errors = [];
  const warnings = [];
  if (!payload.numericValues || payload.numericValues.length === 0) {
    errors.push("numericValues is empty — no data to render.");
  }
  if (!payload.displayLabels || payload.displayLabels.length === 0) {
    errors.push("displayLabels is empty — chart would have no axis labels.");
  }
  const nLabels = ((_a = payload.displayLabels) == null ? void 0 : _a.length) ?? 0;
  const nValues = ((_b = payload.numericValues) == null ? void 0 : _b.length) ?? 0;
  const nFormatted = ((_c = payload.formattedValues) == null ? void 0 : _c.length) ?? 0;
  if (nLabels > 0 && nValues > 0 && nLabels !== nValues) {
    errors.push(
      `displayLabels length (${nLabels}) does not match numericValues length (${nValues}).`
    );
  }
  if (nValues > 0 && nFormatted > 0 && nValues !== nFormatted) {
    warnings.push(
      `formattedValues length (${nFormatted}) does not match numericValues length (${nValues}). Missing formatted values will be substituted with raw numbers.`
    );
  }
  if (nValues > 0) {
    const allNonFinite = payload.numericValues.every((v) => !Number.isFinite(v));
    if (allNonFinite) {
      errors.push("All numericValues are non-finite (NaN / Infinity). Cannot render chart.");
    }
  }
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};
const repairChartPayload = (payload) => {
  const changes = [];
  let numericValues = [...payload.numericValues ?? []];
  let formattedValues = [...payload.formattedValues ?? []];
  let displayLabels = [...payload.displayLabels ?? []];
  let labels = [...payload.labels ?? payload.displayLabels ?? []];
  let chartType = payload.chartType;
  let valueDomain = payload.valueDomain;
  const repairedNumerics = numericValues.map((v, i) => {
    if (!Number.isFinite(v)) {
      changes.push(`numericValues[${i}] (${v}) replaced with 0.`);
      return 0;
    }
    return v;
  });
  if (repairedNumerics.some((v, i) => v !== numericValues[i])) {
    numericValues = repairedNumerics;
  }
  const nValues = numericValues.length;
  if (formattedValues.length > nValues) {
    formattedValues = formattedValues.slice(0, nValues);
    changes.push(`formattedValues truncated to ${nValues} entries.`);
  } else if (formattedValues.length < nValues) {
    const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
    const padded = numericValues.slice(formattedValues.length).map((v) => fmt.format(v));
    formattedValues = [...formattedValues, ...padded];
    changes.push(`formattedValues padded to ${nValues} entries.`);
  }
  if (displayLabels.length > nValues) {
    displayLabels = displayLabels.slice(0, nValues);
    labels = labels.slice(0, nValues);
    changes.push(`displayLabels truncated to ${nValues} entries.`);
  } else if (displayLabels.length < nValues) {
    const start = displayLabels.length;
    const generated = numericValues.slice(start).map((_, i) => `Item ${start + i + 1}`);
    displayLabels = [...displayLabels, ...generated];
    labels = [...labels, ...generated];
    changes.push(`displayLabels padded to ${nValues} entries with generated names.`);
  }
  const hasPositive = numericValues.some((v) => v > 0);
  const hasNegative = numericValues.some((v) => v < 0);
  const derivedDomain = hasPositive && hasNegative ? "mixed" : hasNegative ? "negative" : "positive";
  if (derivedDomain !== valueDomain) {
    changes.push(
      `valueDomain corrected from '${valueDomain}' to '${derivedDomain}'.`
    );
    valueDomain = derivedDomain;
  }
  const validation = validateReportChartPayload({
    chartType,
    valueDomain,
    groupByColumn: payload.groupByColumn,
    displayLabels,
    labels,
    numericValues,
    originalLabelCount: displayLabels.length
  });
  if (validation.chartType !== chartType) {
    changes.push(
      `chartType downgraded from '${chartType}' to '${validation.chartType}': ` + validation.chartWarnings.join("; ")
    );
    chartType = validation.chartType;
  }
  const repairedPayload = {
    ...payload,
    numericValues,
    formattedValues,
    displayLabels,
    labels,
    valueDomain,
    chartType,
    chartWarnings: [
      ...payload.chartWarnings,
      ...validation.chartWarnings.filter(
        (w) => !payload.chartWarnings.includes(w)
      )
    ]
  };
  return {
    success: nValues > 0,
    payload: repairedPayload,
    changes
  };
};
const normaliseChartType = (payload) => {
  const validation = validateReportChartPayload({
    chartType: payload.chartType,
    valueDomain: payload.valueDomain,
    groupByColumn: payload.groupByColumn,
    displayLabels: payload.displayLabels,
    labels: payload.labels,
    numericValues: payload.numericValues,
    originalLabelCount: payload.displayLabels.length
  });
  if (validation.chartType === payload.chartType && validation.chartWarnings.length === 0) {
    return payload;
  }
  return {
    ...payload,
    chartType: validation.chartType,
    chartWarnings: [
      ...payload.chartWarnings,
      ...validation.chartWarnings.filter((w) => !payload.chartWarnings.includes(w))
    ]
  };
};
const renderReportChartSvg = (payload) => {
  const initial = validateChartPayload(payload);
  if (initial.isValid) {
    const normalised = normaliseChartType(payload);
    return renderChartByType(normalised);
  }
  const repaired = repairChartPayload(payload);
  if (repaired.success) {
    const afterRepair = validateChartPayload(repaired.payload);
    if (afterRepair.isValid) {
      return renderChartByType(repaired.payload);
    }
  }
  const firstError = initial.errors[0] ?? "Payload could not be repaired.";
  return renderFallbackSvg(payload.title, firstError);
};
const renderChartByType = (payload) => {
  switch (payload.chartType) {
    case "line":
      return renderLineChart(payload);
    case "pie":
      return renderCircularChart(payload, 0);
    case "doughnut":
      return renderCircularChart(payload, 48);
    case "bar":
    default:
      return renderBarChart(payload);
  }
};
const MIN_VISUALS = 3;
const MAX_VISUALS = 4;
const MAX_FALLBACK_ROWS = 6;
const trimText$1 = (value) => String(value ?? "").trim();
const dedupeStrings$2 = (values) => {
  const seen = /* @__PURE__ */ new Set();
  const output = [];
  for (const value of values) {
    const normalized = trimText$1(value);
    if (!normalized) {
      continue;
    }
    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(normalized);
  }
  return output;
};
const buildFallbackTable = (card) => {
  const rows = card.reportChartRows.slice(0, MAX_FALLBACK_ROWS);
  if (rows.length === 0) {
    return null;
  }
  const columns = dedupeStrings$2([
    card.groupByColumn,
    card.valueColumn,
    ...Object.keys(rows[0] ?? {})
  ]).slice(0, 3);
  if (columns.length === 0) {
    return null;
  }
  return {
    columns,
    rows: rows.map((row) => columns.map((column) => trimText$1(row[column]) || "—"))
  };
};
const findForumMatch = (card, forum) => forum.consensusFindings.find((finding) => finding.evidenceRefs.includes(card.evidenceId));
const findMemoMatch = (card, memos) => memos.flatMap((memo) => memo.findings).find((finding) => finding.evidenceRefs.includes(card.evidenceId));
const inferTopicKey = (card, forum, memos) => {
  var _a, _b;
  const source = [
    (_a = findForumMatch(card, forum)) == null ? void 0 : _a.claim,
    (_b = findMemoMatch(card, memos)) == null ? void 0 : _b.claim,
    card.displayTitle,
    card.description
  ].find(Boolean);
  const normalized = buildNarrativeSemanticKey(source);
  if (/concentr|top|largest|dominant|majority|lead/.test(normalized)) {
    return "revenue_concentration";
  }
  if (/null|missing|unmapped|quality|complet|classification|helper/.test(normalized)) {
    return "data_quality_gap";
  }
  if (/cost|risk|outflow|expense|loss|profit/.test(normalized)) {
    return "cost_risk_pattern";
  }
  if (/variance|outlier|deviation|spread|trend/.test(normalized)) {
    return "variance_outlier";
  }
  return normalized || buildNarrativeSemanticKey(card.displayTitle) || card.cardId;
};
const buildBusinessTitle = (card, forum, memos) => {
  var _a, _b;
  return normalizeReportNarrative(
    ((_a = findForumMatch(card, forum)) == null ? void 0 : _a.claim) || ((_b = findMemoMatch(card, memos)) == null ? void 0 : _b.claim) || card.displayTitle,
    { maxSentences: 1, fallback: card.displayTitle }
  );
};
const buildWhyItMatters = (card, forum, memos) => {
  var _a, _b, _c;
  return normalizeReportNarrative(
    ((_a = findForumMatch(card, forum)) == null ? void 0 : _a.claim) || ((_b = findMemoMatch(card, memos)) == null ? void 0 : _b.claim) || ((_c = card.summary) == null ? void 0 : _c.text) || card.description || card.displayTitle,
    { maxSentences: 2, fallback: card.displayTitle }
  );
};
const buildWhatItShows = (card) => {
  var _a;
  return normalizeReportNarrative(((_a = card.summary) == null ? void 0 : _a.text) || card.description || card.displayTitle, {
    maxSentences: 2,
    fallback: card.displayTitle
  });
};
const buildCaveat = (card, bundle, forum, memos) => {
  var _a, _b, _c;
  const forumCaveat = (_b = (_a = findForumMatch(card, forum)) == null ? void 0 : _a.caveats) == null ? void 0 : _b.find(Boolean);
  const memoCaveat = (_c = findMemoMatch(card, memos)) == null ? void 0 : _c.caveat;
  const fallback = bundle.dataset.readinessRisks[0] ?? bundle.dataset.caveats[0] ?? null;
  const normalized = normalizeReportNarrative(forumCaveat || memoCaveat || fallback, { maxSentences: 2 });
  return normalized || null;
};
const createCardPriority = (card, forum) => {
  const forumScore = findForumMatch(card, forum) ? 4 : 0;
  const semanticScore = card.semanticRole === "business_dimension" ? 2 : 0;
  const exposurePenalty = card.helperExposureLevel === "high" ? -2 : card.helperExposureLevel === "medium" ? -1 : 0;
  const confidenceScore = card.businessMeaningConfidence ?? 0;
  const chartScore = isSupportedReportChartType(card.chartType) ? 1 : 0;
  return forumScore + semanticScore + exposurePenalty + confidenceScore + chartScore + Math.min(card.rowCount, 12) / 100;
};
const buildCalloutValue = (card) => {
  const payload = buildReportChartPayload(card);
  if (!payload || payload.formattedValues.length === 0) {
    return null;
  }
  return payload.formattedValues[0] ?? null;
};
const buildVisual = (card, bundle, forum, memos) => {
  const chartPayload = buildReportChartPayload(card);
  const fallbackTable = chartPayload ? null : buildFallbackTable(card);
  const topicKey = inferTopicKey(card, forum, memos);
  const businessTitle = buildBusinessTitle(card, forum, memos);
  return {
    cardId: card.cardId,
    title: card.displayTitle,
    businessTitle,
    topicKey,
    chartType: (chartPayload == null ? void 0 : chartPayload.chartType) ?? "table",
    chartPayload,
    svgMarkup: chartPayload ? renderReportChartSvg(chartPayload) : null,
    fallbackTable,
    whatItShows: buildWhatItShows(card),
    whyItMatters: buildWhyItMatters(card, forum, memos),
    caveat: buildCaveat(card, bundle, forum, memos),
    calloutValue: (chartPayload == null ? void 0 : chartPayload.formattedValues[0]) ?? buildCalloutValue(card),
    chartWarnings: (chartPayload == null ? void 0 : chartPayload.chartWarnings) ?? []
  };
};
const buildReportVisualSelection = (bundle, forum, memos) => {
  if (bundle.cards.length === 0) {
    return [];
  }
  const rankedCards = [...bundle.cards].sort((left, right) => createCardPriority(right, forum) - createCardPriority(left, forum));
  const selected = [];
  const topicOwners = /* @__PURE__ */ new Map();
  for (const card of rankedCards) {
    const topicKey = inferTopicKey(card, forum, memos);
    const existing = topicOwners.get(topicKey);
    if (existing) {
      const currentScore = createCardPriority(existing, forum);
      const nextScore = createCardPriority(card, forum);
      if (nextScore <= currentScore) {
        continue;
      }
      const index = selected.findIndex((entry) => entry.cardId === existing.cardId);
      if (index >= 0) {
        selected.splice(index, 1, card);
      }
      topicOwners.set(topicKey, card);
      continue;
    }
    topicOwners.set(topicKey, card);
    selected.push(card);
  }
  const desiredCount = bundle.cards.length >= MIN_VISUALS ? Math.min(MAX_VISUALS, Math.max(MIN_VISUALS, selected.length)) : Math.min(MAX_VISUALS, selected.length);
  return selected.slice(0, desiredCount).map((card) => buildVisual(card, bundle, forum, memos));
};
const MAX_BUSINESS_KPIS = 4;
const REVENUE_PATTERN$1 = /revenue|sales|income|turnover/i;
const PROFIT_PATTERN$1 = /profit|margin|earnings|ebitda|ebit/i;
const COST_PATTERN$1 = /cost|expense|expenditure|spending|outflow/i;
const COUNT_PATTERN$1 = /count|number|quantity|volume/i;
const CURRENCY_DETECT_PATTERN = /\b(SGD|USD|EUR|GBP|JPY|CNY|MYR|HKD|AUD|CAD)\b/i;
const CAVEAT_REWRITES = [
  /* ── row expansion & structural normalization ──────────── */
  [
    /cleaned rows expanded [\d.]+x over raw rows/i,
    "Data preparation expanded the dataset from the original file, which may indicate structural normalization."
  ],
  [
    /metadata\/header recovery signals suggest structural ambiguity/i,
    "The file structure required automated recovery, which may affect data precision."
  ],
  /* ── validation & precheck ────────────────────────────── */
  [
    /sql precheck used a fallback path/i,
    "Some automated data validation checks required alternative approaches."
  ],
  [
    /sql precheck (is )?blocked/i,
    "Automated data validation was unable to complete, which may limit analysis confidence."
  ],
  [
    /verification (status|outcome).*?(warning|fail)/i,
    "Data verification flagged potential issues that may affect result accuracy."
  ],
  /* ── analyst disagreement ─────────────────────────────── */
  [
    /open disagreements remain and should be reviewed/i,
    "Some analytical perspectives differ and should be reviewed before finalizing conclusions."
  ],
  /* ── parser & intake ──────────────────────────────────── */
  [
    /parser confidence.*(limited|low|reduced)/i,
    "The file format was not fully recognized, which may affect how some values are interpreted."
  ],
  [
    /intake gate.*(warning|caution|partial)/i,
    "Initial data intake flagged items that may require manual review."
  ],
  /* ── column & data quality ────────────────────────────── */
  [
    /helper column.*unverified/i,
    "Some auxiliary data columns have not been independently verified."
  ],
  [
    /unclassified.*(share|portion|percentage|rate).*(\d+%|high|significant)/i,
    "A significant portion of the data lacks category labels, which may affect distribution analysis."
  ],
  [
    /null (values?|data|entries|records).*(\d+%|significant|high|many)/i,
    "Missing values are present in the dataset and may affect the completeness of findings."
  ],
  /* ── aggregation & calculation ─────────────────────────── */
  [
    /aggregation quality (warning|flag|concern)/i,
    "The method used to aggregate values may not fully represent the underlying data."
  ],
  [
    /duplicate (labels?|rows?|entries|records).*detected/i,
    "Duplicate entries were detected, which may inflate totals if not accounted for."
  ],
  /* ── workflow & preparation ────────────────────────────── */
  [
    /preparation (state|status).*(partial|incomplete|pending)/i,
    "Data preparation did not fully complete, so some values may not reflect the final cleaned state."
  ],
  [
    /workflow review remains manual/i,
    "Some data quality checks were not automated and may need manual confirmation."
  ],
  [
    /consistency (issues?|problems?|concerns?).*detected/i,
    "Minor data consistency issues were found that could affect precision of certain figures."
  ],
  /* ── precheck & workflow status ────────────────────────── */
  [
    /sql precheck status is warning/i,
    "Some automated data validation checks produced warnings that may warrant review."
  ],
  [
    /workflow warnings remain unresolved/i,
    "Data preparation flagged items that have not yet been resolved."
  ],
  [
    /\d+ dataset caveat\(s\) remain active/i,
    "Multiple data quality caveats are still active and should be reviewed before acting on the findings."
  ]
];
const classifyMetricFromCard = (card) => {
  const signals = [card.valueColumn ?? "", card.displayTitle ?? "", card.description ?? ""].join(" ");
  if (REVENUE_PATTERN$1.test(signals)) return { category: "revenue", priority: 4 };
  if (PROFIT_PATTERN$1.test(signals)) return { category: "profit", priority: 3 };
  if (COST_PATTERN$1.test(signals)) return { category: "cost", priority: 2 };
  if (COUNT_PATTERN$1.test(signals)) return { category: "count", priority: 1 };
  return { category: card.cardId, priority: 0 };
};
const toNumericValue$1 = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = typeof value === "string" ? Number(String(value).replace(/[,$%()]/g, "").trim()) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
};
const computeCardTotal = (rows, valueColumn) => rows.reduce((sum, row) => {
  const numeric = toNumericValue$1(row[valueColumn]);
  return sum + (numeric ?? 0);
}, 0);
const formatKpiValue = (value, currency) => {
  const abs = Math.abs(value);
  const formatted = abs >= 1e6 ? `${(value / 1e6).toFixed(1)}M` : abs >= 1e3 ? `${(value / 1e3).toFixed(0)}K` : value.toLocaleString(void 0, { maximumFractionDigits: 0 });
  return currency ? `${formatted} ${currency}` : formatted;
};
const GENERIC_VALUE_COLUMNS = /^(total_value|value|amount|sum|count|entry_count|total|qty|row_total|sum_\w+|total_\w+|po_qty)$/i;
const buildMetricLabel = (card) => {
  const valueColumn = card.valueColumn ?? "";
  if (GENERIC_VALUE_COLUMNS.test(valueColumn)) {
    return card.displayTitle;
  }
  const clean = valueColumn.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();
  if (/^total\b/i.test(clean)) return clean;
  return `Total ${clean}`;
};
const buildKpiSupportingNote = (m, currency) => {
  var _a;
  const rows = ((_a = m.card.reportChartRows) == null ? void 0 : _a.length) ? m.card.reportChartRows : m.card.aggregatedDataSample;
  if (!(rows == null ? void 0 : rows.length) || !m.card.valueColumn || m.groupCount <= 1) {
    return `Aggregated across ${m.groupCount} ${m.groupLabel.toLowerCase()} categories.`;
  }
  let topLabel = "";
  let topValue = 0;
  for (const row of rows) {
    const num = toNumericValue$1(row[m.card.valueColumn]);
    if (num !== null && Math.abs(num) > Math.abs(topValue)) {
      topValue = num;
      topLabel = String(row[m.card.groupByColumn ?? ""] ?? "").trim();
    }
  }
  if (!topLabel || m.total === 0) {
    return `Aggregated across ${m.groupCount} ${m.groupLabel.toLowerCase()} categories.`;
  }
  const share = Math.round(Math.abs(topValue) / Math.abs(m.total) * 100);
  const topFormatted = formatKpiValue(topValue, currency);
  return `Top: ${topLabel} (${topFormatted}, ${share}% of total) across ${m.groupCount} categories.`;
};
const extractBusinessKpis = (cards, currency) => {
  var _a, _b, _c;
  const metrics = [];
  const seenCategories = /* @__PURE__ */ new Set();
  for (const card of cards) {
    if (!card.valueColumn || card.aggregation !== "sum") continue;
    if (!((_a = card.reportChartRows) == null ? void 0 : _a.length) && !((_b = card.aggregatedDataSample) == null ? void 0 : _b.length)) continue;
    const rows = ((_c = card.reportChartRows) == null ? void 0 : _c.length) ? card.reportChartRows : card.aggregatedDataSample;
    const total = computeCardTotal(rows, card.valueColumn);
    if (!Number.isFinite(total) || total === 0) continue;
    const { category, priority } = classifyMetricFromCard(card);
    if (seenCategories.has(category)) continue;
    seenCategories.add(category);
    metrics.push({
      label: buildMetricLabel(card),
      total,
      groupCount: rows.length,
      groupLabel: card.groupByColumn ?? "items",
      priority,
      card
    });
  }
  metrics.sort((a, b) => b.priority - a.priority);
  const kpis = metrics.slice(0, MAX_BUSINESS_KPIS - 1).map((m) => ({
    label: m.label,
    value: formatKpiValue(m.total, currency),
    supportingNote: buildKpiSupportingNote(m, currency),
    tone: m.priority >= 3 ? "good" : "neutral",
    source: "card_aggregation"
  }));
  const topCard = metrics[0];
  if (topCard && topCard.groupCount > 1) {
    const groupLabel = topCard.groupLabel.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    kpis.push({
      label: groupLabel,
      value: String(topCard.groupCount),
      supportingNote: `Distinct categories in the primary analysis dimension.`,
      tone: "neutral",
      source: "card_count"
    });
  }
  return kpis.slice(0, MAX_BUSINESS_KPIS);
};
const buildCaveatRewrites = (caveats, risks) => {
  const rewrites = /* @__PURE__ */ new Map();
  for (const text of [...caveats, ...risks]) {
    for (const [pattern, replacement] of CAVEAT_REWRITES) {
      if (pattern.test(text)) {
        rewrites.set(text, replacement);
        break;
      }
    }
  }
  return rewrites;
};
const detectCurrency = (bundle) => {
  const titleAndParams = [
    bundle.dataset.reportTitle,
    bundle.dataset.fileName
  ].filter(Boolean).join(" ");
  const titleMatch = CURRENCY_DETECT_PATTERN.exec(titleAndParams);
  if (titleMatch) return titleMatch[1].toUpperCase();
  for (const card of bundle.cards) {
    if (!card.valueColumn) continue;
    const colMatch = CURRENCY_DETECT_PATTERN.exec(card.valueColumn);
    if (colMatch) return colMatch[1].toUpperCase();
  }
  return null;
};
const runReportQualityHarness = (bundle) => {
  const detectedCurrency = detectCurrency(bundle);
  return {
    businessKpis: extractBusinessKpis(bundle.cards, detectedCurrency),
    caveatRewrites: buildCaveatRewrites(
      bundle.dataset.caveats,
      bundle.dataset.readinessRisks
    ),
    detectedCurrency
  };
};
const MAX_INSIGHTS = 3;
const MAX_CARDS_PER_GROUP = 5;
const extractLeadingLabel = (card) => {
  const topRow = card.aggregatedDataSample[0];
  if (!topRow || !card.groupByColumn) {
    return null;
  }
  const raw = topRow[card.groupByColumn];
  if (raw === null || raw === void 0) {
    return null;
  }
  return String(raw).trim() || null;
};
const synthesizeCrossCardInsights = (cards) => {
  const eligible = cards.filter(
    (card) => card.groupByColumn && card.valueColumn && card.aggregatedDataSample.length > 0 && card.autoAnalysisVerdict !== "weak"
  );
  if (eligible.length < 2) {
    return [];
  }
  const byDimension = /* @__PURE__ */ new Map();
  for (const card of eligible) {
    const dim = card.groupByColumn;
    const existing = byDimension.get(dim) ?? [];
    existing.push(card);
    byDimension.set(dim, existing);
  }
  const insights = [];
  for (const [dimension, group] of byDimension) {
    if (group.length < 2) {
      continue;
    }
    const capped = group.slice(0, MAX_CARDS_PER_GROUP);
    const labeled = capped.map((card) => ({ card, label: extractLeadingLabel(card) })).filter((entry) => entry.label !== null);
    if (labeled.length < 2) {
      continue;
    }
    const byLabel = /* @__PURE__ */ new Map();
    for (const entry of labeled) {
      const key = entry.label.toLowerCase();
      const existing = byLabel.get(key) ?? [];
      existing.push(entry);
      byLabel.set(key, existing);
    }
    let dominantLabel = "";
    let dominantGroup = [];
    for (const [, entries] of byLabel) {
      if (entries.length > dominantGroup.length) {
        dominantGroup = entries;
        dominantLabel = entries[0].label;
      }
    }
    const cardIds = labeled.map((e) => e.card.cardId);
    if (dominantGroup.length >= 2) {
      const metricNames = dominantGroup.map((e) => e.card.valueColumn).filter(Boolean);
      const metricList = metricNames.slice(0, 3).join(" and ");
      insights.push({
        type: "convergence",
        cardIds,
        insight: `${dominantLabel} leads in ${metricList} across ${dimension} — multiple metrics converge on the same top performer.`
      });
    } else {
      const pairs = labeled.slice(0, 2).map(
        (e) => `${e.card.valueColumn} peaks in ${e.label}`
      );
      insights.push({
        type: "divergence",
        cardIds,
        insight: `${pairs.join(", while ")} — different ${dimension} values dominate different metrics, suggesting a potential trade-off.`
      });
    }
    if (insights.length >= MAX_INSIGHTS) {
      break;
    }
  }
  return insights.sort((a, b) => (a.type === "convergence" ? -1 : 1) - (b.type === "convergence" ? -1 : 1)).slice(0, MAX_INSIGHTS);
};
const MAX_CAVEATS = 6;
const MAX_RECOMMENDED_ACTIONS = 5;
const MAX_MANAGEMENT_HIGHLIGHTS = 4;
const MAX_KPI_HIGHLIGHTS = 4;
const trimText = (value) => String(value ?? "").trim();
const dedupeStrings$1 = (values, limit) => {
  const seen = /* @__PURE__ */ new Set();
  const output = [];
  for (const value of values) {
    const normalized = trimText(value);
    if (!normalized) {
      continue;
    }
    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(normalized);
    if (typeof limit === "number" && output.length >= limit) {
      break;
    }
  }
  return output;
};
const buildReportId$1 = (bundle) => {
  const normalizedTimestamp = bundle.generatedAt.replace(/[^0-9]/g, "");
  const datasetSegment = trimText(bundle.datasetId) || "no_dataset";
  return `report.${bundle.sessionId}.${datasetSegment}.${normalizedTimestamp}`;
};
const resolveDisplayedReadiness = (readiness, confidence) => readiness === "ready" && confidence === "low" ? "partial" : readiness;
const buildDisplayedReadinessReason = (bundle, displayedReadiness, overallConfidence) => {
  if (bundle.dataset.reportReadiness === "ready" && displayedReadiness === "partial" && overallConfidence === "low") {
    return "Usable for bounded synthesis, but low forum confidence still limits executive certainty.";
  }
  return bundle.dataset.reportReadinessReason;
};
const buildDatasetSection = (bundle, forum, directives) => {
  const workflowStatusParts = [
    `prep=${bundle.dataset.preparationState}`,
    `analysis=${bundle.dataset.analysisState}`,
    `intake=${bundle.dataset.intakeGateStatus}`,
    `cards=${bundle.dataset.cardsCount}`
  ];
  const shapeSummaryParts = [
    `${bundle.dataset.rawRowCount} raw row(s)`,
    `${bundle.dataset.cleanedRowCount} cleaned row(s)`,
    `${bundle.dataset.metadataRowCount} metadata row(s)`,
    `${bundle.dataset.summaryRowCount} summary row(s)`,
    `header depth ${bundle.dataset.headerDepth}`
  ];
  const displayedReadiness = resolveDisplayedReadiness(bundle.dataset.reportReadiness, forum.overallConfidence);
  const readinessRisks = dedupeStrings$1([
    ...bundle.dataset.readinessRisks,
    bundle.dataset.reportReadiness === "ready" && displayedReadiness === "partial" && forum.overallConfidence === "low" ? "Forum overall confidence remained low, so displayed readiness was downgraded to partial." : null
  ], MAX_CAVEATS);
  return {
    title: "Dataset Readiness",
    datasetName: bundle.dataset.reportTitle || bundle.dataset.fileName,
    readiness: displayedReadiness,
    readinessReason: buildDisplayedReadinessReason(bundle, displayedReadiness, forum.overallConfidence),
    generationGate: bundle.dataset.reportGenerationGate,
    generationBlockers: dedupeStrings$1(bundle.dataset.reportGenerationBlockers, MAX_CAVEATS),
    workflowStatus: workflowStatusParts.join(" | "),
    shapeSummary: shapeSummaryParts.join(" | "),
    readinessDrivers: dedupeStrings$1(bundle.dataset.readinessDrivers, MAX_CAVEATS),
    readinessRisks: directives ? readinessRisks.map((risk) => directives.caveatRewrites.get(risk) ?? risk) : readinessRisks,
    structuralSignals: bundle.dataset.structuralSignals,
    caveats: directives ? dedupeStrings$1(bundle.dataset.caveats, MAX_CAVEATS).map((c) => directives.caveatRewrites.get(c) ?? c) : dedupeStrings$1(bundle.dataset.caveats, MAX_CAVEATS),
    trustedCardsCount: bundle.dataset.trustedCardsCount,
    excludedEvidenceCount: bundle.excludedEvidence.length
  };
};
const resolveFindingImportance = (finding, memos) => {
  let resolved = "medium";
  const ranking = {
    low: 0,
    medium: 1,
    high: 2
  };
  for (const memo of memos) {
    for (const memoFinding of memo.findings) {
      const hasMatchingEvidence = memoFinding.evidenceRefs.some((ref) => finding.evidenceRefs.includes(ref));
      const hasMatchingClaim = trimText(memoFinding.claim).toLowerCase() === trimText(finding.claim).toLowerCase();
      if (!hasMatchingEvidence && !hasMatchingClaim) {
        continue;
      }
      if (ranking[memoFinding.importance] > ranking[resolved]) {
        resolved = memoFinding.importance;
      }
    }
  }
  return resolved;
};
const buildFindingSection = (memos, forum) => {
  const findings = forum.consensusFindings.map((finding) => ({
    id: finding.id,
    claim: normalizeReportNarrative(finding.claim, { maxSentences: 1, fallback: finding.claim }),
    importance: resolveFindingImportance(finding, memos),
    supportedByRoles: finding.supportedByRoles,
    caveats: dedupeStrings$1(finding.caveats, MAX_CAVEATS),
    evidenceRefs: finding.evidenceRefs
  })).filter((finding) => finding.evidenceRefs.length > 0);
  if (findings.length === 0) {
    return null;
  }
  return {
    type: "findings",
    title: "Key Findings",
    items: findings
  };
};
const buildEvidenceWhyItMatters = (card, forum, memos) => {
  var _a;
  const forumMatch = forum.consensusFindings.find((finding) => finding.evidenceRefs.includes(card.evidenceId));
  if (forumMatch) {
    return normalizeReportNarrative(forumMatch.claim, { maxSentences: 1, fallback: forumMatch.claim });
  }
  const memoMatch = memos.flatMap((memo) => memo.findings).find((finding) => finding.evidenceRefs.includes(card.evidenceId));
  if (memoMatch) {
    return normalizeReportNarrative(memoMatch.claim, { maxSentences: 1, fallback: memoMatch.claim });
  }
  return normalizeReportNarrative(((_a = card.summary) == null ? void 0 : _a.text) || card.description || card.displayTitle, {
    maxSentences: 1,
    fallback: card.displayTitle
  });
};
const buildEvidenceSection = (bundle, forum, memos) => {
  if (bundle.cards.length === 0) {
    return null;
  }
  return {
    type: "evidence",
    title: "Evidence Appendix Highlights",
    cards: bundle.cards.map((card) => ({
      cardId: card.cardId,
      title: card.displayTitle,
      artifactType: card.artifactType,
      whyItMatters: buildEvidenceWhyItMatters(card, forum, memos)
    }))
  };
};
const buildManagementHighlights = (forum, memos, crossCardInsights = []) => {
  const ranked = [
    ...forum.consensusFindings.map((finding) => ({
      text: normalizeReportNarrative(finding.claim, { maxSentences: 1, fallback: finding.claim }),
      key: buildNarrativeSemanticKey(finding.claim),
      score: 3
    })),
    ...memos.map((memo) => ({
      text: normalizeReportNarrative(memo.headline, { maxSentences: 1, fallback: memo.headline }),
      key: buildNarrativeSemanticKey(memo.headline),
      score: memo.confidence === "high" ? 2 : 1
    }))
  ].filter((entry) => entry.text);
  const selected = [];
  const seen = /* @__PURE__ */ new Set();
  for (const insight of crossCardInsights) {
    const key = buildNarrativeSemanticKey(insight);
    if (!seen.has(key)) {
      seen.add(key);
      selected.push(insight);
      if (selected.length >= MAX_MANAGEMENT_HIGHLIGHTS) {
        break;
      }
    }
  }
  for (const entry of ranked.sort((left, right) => right.score - left.score)) {
    if (seen.has(entry.key)) {
      continue;
    }
    seen.add(entry.key);
    selected.push(entry.text);
    if (selected.length >= MAX_MANAGEMENT_HIGHLIGHTS) {
      break;
    }
  }
  return selected;
};
const buildSummarySection$1 = (bundle, memos, forum) => {
  var _a, _b, _c;
  const executivePosition = normalizeReportNarrative(
    forum.executiveSummary || bundle.dataset.reportReadinessReason,
    { maxSentences: 2, fallback: bundle.dataset.reportReadinessReason }
  );
  const topImplication = normalizeReportNarrative(
    ((_a = forum.consensusFindings[0]) == null ? void 0 : _a.claim) || ((_b = memos.find((memo) => memo.role === "business")) == null ? void 0 : _b.headline) || executivePosition,
    { maxSentences: 2, fallback: executivePosition }
  );
  const mainCaution = normalizeReportNarrative(
    forum.consensusFindings.flatMap((finding) => finding.caveats)[0] || ((_c = memos.find((memo) => memo.role === "risk")) == null ? void 0 : _c.headline) || bundle.dataset.reportReadinessReason,
    { maxSentences: 2, fallback: bundle.dataset.reportReadinessReason }
  );
  return {
    title: "Executive Summary",
    executiveSummary: [executivePosition, topImplication, mainCaution].filter(Boolean).join(" "),
    executivePosition,
    topImplication,
    mainCaution,
    overallConfidence: forum.overallConfidence,
    managementHighlights: buildManagementHighlights(forum, memos, synthesizeCrossCardInsights(bundle.cards).map((i) => i.insight)),
    recommendedActions: dedupeStrings$1(
      forum.recommendedActions.map((action) => normalizeReportNarrative(action, { maxSentences: 1, fallback: action })),
      MAX_RECOMMENDED_ACTIONS
    )
  };
};
const buildSections = (bundle, memos, forum) => {
  const sections = [];
  const findings = buildFindingSection(memos, forum);
  if (findings) {
    sections.push(findings);
  }
  if (forum.disagreements.length > 0) {
    sections.push({
      type: "disagreements",
      title: "Open Disagreements",
      items: forum.disagreements.map((disagreement) => ({
        id: disagreement.id,
        topic: normalizeReportNarrative(disagreement.topic, { maxSentences: 1, fallback: disagreement.topic }),
        resolution: disagreement.resolution,
        positions: disagreement.positions.map((position) => ({
          ...position,
          stance: normalizeReportNarrative(position.stance, { maxSentences: 2, fallback: position.stance })
        }))
      }))
    });
  }
  const evidence = buildEvidenceSection(bundle, forum, memos);
  if (evidence) {
    sections.push(evidence);
  }
  return sections;
};
const buildKpiHighlightsFallback = (bundle, visuals) => {
  const highlights = [];
  const firstVisual = visuals[0];
  if (firstVisual == null ? void 0 : firstVisual.calloutValue) {
    highlights.push({
      label: "Top visual value",
      value: firstVisual.calloutValue,
      supportingNote: firstVisual.businessTitle,
      tone: "good"
    });
  }
  if (bundle.dataset.caveats.length > 0 || bundle.dataset.readinessRisks.length > 0) {
    highlights.push({
      label: "Material caveats",
      value: String(bundle.dataset.caveats.length + bundle.dataset.readinessRisks.length),
      supportingNote: "Caveats and readiness risks still active.",
      tone: "warning"
    });
  }
  if (bundle.cards.length > 0) {
    highlights.push({
      label: "Analysis views",
      value: String(bundle.cards.length),
      supportingNote: "Visual evidence included in this report.",
      tone: "neutral"
    });
  }
  return highlights.slice(0, MAX_KPI_HIGHLIGHTS);
};
const buildKpiHighlights = (bundle, visuals, directives) => {
  if ((directives == null ? void 0 : directives.businessKpis) && directives.businessKpis.length > 0) {
    return directives.businessKpis.slice(0, MAX_KPI_HIGHLIGHTS);
  }
  return buildKpiHighlightsFallback(bundle, visuals);
};
const buildContents = () => [
  { id: "key-takeaways", label: "Key Takeaways" },
  { id: "kpi-strip", label: "KPI Snapshot" },
  { id: "key-findings", label: "Key Findings" },
  { id: "risks-caveats", label: "Risks & Caveats" },
  { id: "recommended-actions", label: "Recommended Actions" },
  { id: "appendix", label: "Appendix" }
];
const buildReportIr = (bundle, memos, forum) => {
  const directives = runReportQualityHarness(bundle);
  const reportVisuals = buildReportVisualSelection(bundle, forum, memos);
  return {
    version: "report_ir_v1",
    reportId: buildReportId$1(bundle),
    generatedAt: bundle.generatedAt,
    dataset: buildDatasetSection(bundle, forum, directives),
    summary: buildSummarySection$1(bundle, memos, forum),
    contents: buildContents(),
    kpiHighlights: buildKpiHighlights(bundle, reportVisuals, directives),
    reportVisuals,
    sections: buildSections(bundle, memos, forum),
    appendix: {
      title: "Evidence Catalog",
      evidenceCatalog: bundle.evidenceCatalog,
      excludedEvidence: bundle.excludedEvidence
    }
  };
};
const printFormScript = 'var PrintForm = function() {\n  "use strict";\n  const TRUE_TOKENS = /* @__PURE__ */ new Set(["y", "yes", "true", "1"]);\n  const FALSE_TOKENS = /* @__PURE__ */ new Set(["n", "no", "false", "0"]);\n  function parseBooleanFlag(value, fallback) {\n    if (value === void 0 || value === null || value === "") return fallback;\n    if (typeof value === "boolean") return value;\n    if (typeof value === "number") return value !== 0;\n    const lowered = String(value).trim().toLowerCase();\n    if (TRUE_TOKENS.has(lowered)) return true;\n    if (FALSE_TOKENS.has(lowered)) return false;\n    return fallback;\n  }\n  function parseNumber(value, fallback) {\n    if (value === void 0 || value === null || value === "") return fallback;\n    const num = Number(value);\n    return Number.isFinite(num) ? num : fallback;\n  }\n  function parseString(value, fallback) {\n    if (value === void 0 || value === null || value === "") return fallback;\n    return String(value);\n  }\n  function normalizeOrientation(value) {\n    const token = String(value || "").trim().toLowerCase();\n    if (token === "landscape") return "landscape";\n    if (token === "portrait") return "portrait";\n    return "";\n  }\n  function normalizePaperSize(value) {\n    const token = String(value || "").trim();\n    if (!token) return "";\n    const upper = token.toUpperCase();\n    if (upper === "A4" || upper === "A5" || upper === "LETTER" || upper === "LEGAL") {\n      return upper;\n    }\n    if (upper === "US_LETTER" || upper === "USLETTER") return "LETTER";\n    if (upper === "US_LEGAL" || upper === "USLEGAL") return "LEGAL";\n    return "";\n  }\n  function mmToPx(mm, dpi) {\n    const mmValue = Number(mm);\n    const dpiValue = Number(dpi);\n    if (!Number.isFinite(mmValue) || !Number.isFinite(dpiValue) || dpiValue <= 0) return 0;\n    return Math.round(mmValue / 25.4 * dpiValue);\n  }\n  const PAPER_SIZES_MM = {\n    A4: { widthMm: 210, heightMm: 297 },\n    A5: { widthMm: 148, heightMm: 210 },\n    LETTER: { widthMm: 215.9, heightMm: 279.4 },\n    LEGAL: { widthMm: 215.9, heightMm: 355.6 }\n  };\n  function resolvePaperDimensions(options) {\n    const paperSize = normalizePaperSize(options && options.paperSize);\n    if (!paperSize) return null;\n    const preset = PAPER_SIZES_MM[paperSize];\n    if (!preset) return null;\n    const dpi = Number(options && options.dpi);\n    const width = mmToPx(preset.widthMm, dpi);\n    const height = mmToPx(preset.heightMm, dpi);\n    if (!width || !height) return null;\n    const orientation = normalizeOrientation(options && options.orientation) || "portrait";\n    if (orientation === "landscape") {\n      return { width: height, height: width };\n    }\n    return { width, height };\n  }\n  function normalizeHeight(value) {\n    const num = Number(value);\n    if (!Number.isFinite(num)) return 0;\n    const epsilon = 1e-6;\n    return Math.max(0, Math.ceil(num - epsilon));\n  }\n  function ensurePageNumberPlaceholder(element) {\n    if (!element) return null;\n    if (element.__pageNumberPlaceholder) {\n      return element.__pageNumberPlaceholder;\n    }\n    const doc = element.ownerDocument || (typeof document !== "undefined" ? document : null);\n    if (!doc) return null;\n    let container = element.querySelector("[data-page-number-container]");\n    if (!container) {\n      container = element.querySelector("td:last-child") || element.querySelector("td") || element;\n    }\n    const placeholder = doc.createElement("span");\n    placeholder.className = "printform_page_number_placeholder";\n    container.appendChild(placeholder);\n    element.__pageNumberPlaceholder = placeholder;\n    return placeholder;\n  }\n  function ensurePhysicalPageNumberPlaceholder(element) {\n    if (!element) return null;\n    if (element.__physicalPageNumberPlaceholder) {\n      return element.__physicalPageNumberPlaceholder;\n    }\n    const doc = element.ownerDocument || (typeof document !== "undefined" ? document : null);\n    if (!doc) return null;\n    let container = element.querySelector("[data-physical-page-number-container]");\n    if (!container) {\n      container = element.querySelector("td:last-child") || element.querySelector("td") || element;\n    }\n    const placeholder = doc.createElement("span");\n    placeholder.className = "printform_physical_page_number_placeholder";\n    container.appendChild(placeholder);\n    element.__physicalPageNumberPlaceholder = placeholder;\n    return placeholder;\n  }\n  function updatePageNumberContent(element, pageNumber, totalPages) {\n    if (!element) return;\n    const numberTargets = element.querySelectorAll("[data-page-number]");\n    if (numberTargets.length > 0) {\n      numberTargets.forEach(function(target) {\n        target.textContent = pageNumber;\n      });\n    }\n    const totalTargets = element.querySelectorAll("[data-page-total]");\n    const totalValue = totalPages !== void 0 && totalPages !== null ? totalPages : "";\n    if (totalTargets.length > 0) {\n      totalTargets.forEach(function(target) {\n        target.textContent = totalValue;\n      });\n    }\n    if (numberTargets.length === 0 && totalTargets.length === 0) {\n      const fallback = ensurePageNumberPlaceholder(element);\n      if (fallback) {\n        fallback.textContent = totalPages !== void 0 && totalPages !== null ? "Page " + pageNumber + " of " + totalPages : "Page " + pageNumber;\n      }\n    }\n  }\n  function updatePhysicalPageNumberContent(element, pageNumber, totalPages) {\n    if (!element) return;\n    const numberTargets = element.querySelectorAll("[data-physical-page-number]");\n    if (numberTargets.length > 0) {\n      numberTargets.forEach(function(target) {\n        target.textContent = pageNumber;\n      });\n    }\n    const totalTargets = element.querySelectorAll("[data-physical-page-total]");\n    const totalValue = totalPages !== void 0 && totalPages !== null ? totalPages : "";\n    if (totalTargets.length > 0) {\n      totalTargets.forEach(function(target) {\n        target.textContent = totalValue;\n      });\n    }\n    if (numberTargets.length === 0 && totalTargets.length === 0) {\n      const fallback = ensurePhysicalPageNumberPlaceholder(element);\n      if (fallback) {\n        fallback.textContent = totalPages !== void 0 && totalPages !== null ? "Sheet " + pageNumber + " of " + totalPages : "Sheet " + pageNumber;\n      }\n    }\n  }\n  const CONFIG_DESCRIPTORS = [\n    { key: "papersizeWidth", datasetKey: "papersizeWidth", legacyKey: "papersize_width", defaultValue: 750, parser: parseNumber },\n    { key: "papersizeHeight", datasetKey: "papersizeHeight", legacyKey: "papersize_height", defaultValue: 1050, parser: parseNumber },\n    { key: "paperSize", datasetKey: "paperSize", legacyKey: "paper_size", defaultValue: "", parser: parseString },\n    { key: "orientation", datasetKey: "orientation", legacyKey: "orientation", defaultValue: "portrait", parser: parseString },\n    { key: "dpi", datasetKey: "dpi", legacyKey: "dpi", defaultValue: 96, parser: parseNumber },\n    { key: "nUp", datasetKey: "nUp", legacyKey: "n_up", defaultValue: 1, parser: parseNumber },\n    {\n      key: "showLogicalPageNumber",\n      datasetKey: "showLogicalPageNumber",\n      legacyKey: "show_logical_page_number",\n      defaultValue: true,\n      parser: parseBooleanFlag\n    },\n    {\n      key: "showPhysicalPageNumber",\n      datasetKey: "showPhysicalPageNumber",\n      legacyKey: "show_physical_page_number",\n      defaultValue: false,\n      parser: parseBooleanFlag\n    },\n    {\n      key: "heightOfDummyRowItem",\n      datasetKey: "heightOfDummyRowItem",\n      legacyKey: "height_of_dummy_row_item",\n      defaultValue: 18,\n      parser: parseNumber\n    },\n    { key: "repeatHeader", datasetKey: "repeatHeader", legacyKey: "repeat_header", defaultValue: true, parser: parseBooleanFlag },\n    { key: "repeatDocinfo", datasetKey: "repeatDocinfo", legacyKey: "repeat_docinfo", defaultValue: true, parser: parseBooleanFlag },\n    { key: "repeatDocinfo002", datasetKey: "repeatDocinfo002", legacyKey: "repeat_docinfo002", defaultValue: true, parser: parseBooleanFlag },\n    { key: "repeatDocinfo003", datasetKey: "repeatDocinfo003", legacyKey: "repeat_docinfo003", defaultValue: true, parser: parseBooleanFlag },\n    { key: "repeatDocinfo004", datasetKey: "repeatDocinfo004", legacyKey: "repeat_docinfo004", defaultValue: true, parser: parseBooleanFlag },\n    { key: "repeatDocinfo005", datasetKey: "repeatDocinfo005", legacyKey: "repeat_docinfo005", defaultValue: true, parser: parseBooleanFlag },\n    { key: "repeatRowheader", datasetKey: "repeatRowheader", legacyKey: "repeat_rowheader", defaultValue: true, parser: parseBooleanFlag },\n    {\n      key: "repeatPtacRowheader",\n      datasetKey: "repeatPtacRowheader",\n      legacyKey: "repeat_ptac_rowheader",\n      defaultValue: true,\n      parser: parseBooleanFlag\n    },\n    { key: "repeatFooter", datasetKey: "repeatFooter", legacyKey: "repeat_footer", defaultValue: false, parser: parseBooleanFlag },\n    { key: "repeatFooter002", datasetKey: "repeatFooter002", legacyKey: "repeat_footer002", defaultValue: false, parser: parseBooleanFlag },\n    { key: "repeatFooter003", datasetKey: "repeatFooter003", legacyKey: "repeat_footer003", defaultValue: false, parser: parseBooleanFlag },\n    { key: "repeatFooter004", datasetKey: "repeatFooter004", legacyKey: "repeat_footer004", defaultValue: false, parser: parseBooleanFlag },\n    { key: "repeatFooter005", datasetKey: "repeatFooter005", legacyKey: "repeat_footer005", defaultValue: false, parser: parseBooleanFlag },\n    { key: "repeatFooterLogo", datasetKey: "repeatFooterLogo", legacyKey: "repeat_footer_logo", defaultValue: false, parser: parseBooleanFlag },\n    { key: "repeatFooterPagenum", datasetKey: "repeatFooterPagenum", legacyKey: "repeat_footer_pagenum", defaultValue: false, parser: parseBooleanFlag },\n    {\n      key: "fillPageHeightAfterFooter",\n      datasetKey: "fillPageHeightAfterFooter",\n      legacyKey: "fill_page_height_after_footer",\n      defaultValue: true,\n      parser: parseBooleanFlag\n    },\n    {\n      key: "insertDummyRowItemWhileFormatTable",\n      datasetKey: "insertDummyRowItemWhileFormatTable",\n      legacyKey: "insert_dummy_row_item_while_format_table",\n      defaultValue: true,\n      parser: parseBooleanFlag\n    },\n    {\n      key: "insertPtacDummyRowItems",\n      datasetKey: "insertPtacDummyRowItems",\n      legacyKey: "insert_ptac_dummy_row_items",\n      defaultValue: true,\n      parser: parseBooleanFlag\n    },\n    {\n      key: "insertDummyRowWhileFormatTable",\n      datasetKey: "insertDummyRowWhileFormatTable",\n      legacyKey: "insert_dummy_row_while_format_table",\n      defaultValue: false,\n      parser: parseBooleanFlag\n    },\n    {\n      key: "insertFooterSpacerWhileFormatTable",\n      datasetKey: "insertFooterSpacerWhileFormatTable",\n      legacyKey: "insert_footer_spacer_while_format_table",\n      defaultValue: true,\n      parser: parseBooleanFlag\n    },\n    {\n      key: "insertFooterSpacerWithDummyRowItemWhileFormatTable",\n      datasetKey: "insertFooterSpacerWithDummyRowItemWhileFormatTable",\n      legacyKey: "insert_footer_spacer_with_dummy_row_item_while_format_table",\n      defaultValue: true,\n      parser: parseBooleanFlag\n    },\n    {\n      key: "customDummyRowItemContent",\n      datasetKey: "customDummyRowItemContent",\n      legacyKey: "custom_dummy_row_item_content",\n      defaultValue: "",\n      parser: parseString\n    },\n    {\n      key: "customDummySpacerContent",\n      datasetKey: "customDummySpacerContent",\n      legacyKey: "custom_dummy_spacer_content",\n      defaultValue: "",\n      parser: parseString\n    },\n    { key: "debug", datasetKey: "debug", legacyKey: "debug_printform", defaultValue: false, parser: parseBooleanFlag }\n  ];\n  const DOCINFO_VARIANTS = [\n    { key: "docInfo", className: "pdocinfo", repeatFlag: "repeatDocinfo" },\n    { key: "docInfo002", className: "pdocinfo002", repeatFlag: "repeatDocinfo002" },\n    { key: "docInfo003", className: "pdocinfo003", repeatFlag: "repeatDocinfo003" },\n    { key: "docInfo004", className: "pdocinfo004", repeatFlag: "repeatDocinfo004" },\n    { key: "docInfo005", className: "pdocinfo005", repeatFlag: "repeatDocinfo005" }\n  ];\n  const FOOTER_VARIANTS = [\n    { key: "footer", className: "pfooter", repeatFlag: "repeatFooter" },\n    { key: "footer002", className: "pfooter002", repeatFlag: "repeatFooter002" },\n    { key: "footer003", className: "pfooter003", repeatFlag: "repeatFooter003" },\n    { key: "footer004", className: "pfooter004", repeatFlag: "repeatFooter004" },\n    { key: "footer005", className: "pfooter005", repeatFlag: "repeatFooter005" }\n  ];\n  const FOOTER_LOGO_VARIANT = { className: "pfooter_logo" };\n  const FOOTER_PAGENUM_VARIANT = { className: "pfooter_pagenum" };\n  const DEFAULT_CONFIG = CONFIG_DESCRIPTORS.reduce((accumulator, descriptor) => {\n    accumulator[descriptor.key] = descriptor.defaultValue;\n    return accumulator;\n  }, {});\n  function readConfigFromLegacy(descriptors) {\n    const source = typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : {};\n    return descriptors.reduce((config, descriptor) => {\n      if (!descriptor.legacyKey) return config;\n      const value = source[descriptor.legacyKey];\n      if (value === void 0 || value === null || value === "") return config;\n      config[descriptor.key] = descriptor.parser(value, descriptor.defaultValue);\n      return config;\n    }, {});\n  }\n  function readConfigFromDataset(descriptors, dataset) {\n    const source = dataset || {};\n    return descriptors.reduce((config, descriptor) => {\n      if (!descriptor.datasetKey) return config;\n      if (!Object.prototype.hasOwnProperty.call(source, descriptor.datasetKey)) return config;\n      const value = source[descriptor.datasetKey];\n      if (value === void 0 || value === null || value === "") return config;\n      config[descriptor.key] = descriptor.parser(value, descriptor.defaultValue);\n      return config;\n    }, {});\n  }\n  function getLegacyConfig() {\n    return readConfigFromLegacy(CONFIG_DESCRIPTORS);\n  }\n  function getDatasetConfig(dataset) {\n    return readConfigFromDataset(CONFIG_DESCRIPTORS, dataset);\n  }\n  function resolveTemplateOverride(formEl, className, fallback) {\n    const template = formEl.querySelector(`template.${className}`);\n    if (template) {\n      return template.innerHTML.trim();\n    }\n    return fallback;\n  }\n  function getPrintformConfig(formEl, overrides = {}) {\n    const legacy = getLegacyConfig();\n    const datasetConfig = getDatasetConfig(formEl.dataset || {});\n    const merged = {\n      ...DEFAULT_CONFIG,\n      ...legacy,\n      ...datasetConfig,\n      ...overrides\n    };\n    merged.customDummyRowItemContent = resolveTemplateOverride(\n      formEl,\n      "custom-dummy-row-item-content",\n      overrides.customDummyRowItemContent !== void 0 ? overrides.customDummyRowItemContent : merged.customDummyRowItemContent\n    );\n    merged.customDummySpacerContent = resolveTemplateOverride(\n      formEl,\n      "custom-dummy-spacer-content",\n      overrides.customDummySpacerContent !== void 0 ? overrides.customDummySpacerContent : merged.customDummySpacerContent\n    );\n    merged.debug = parseBooleanFlag(merged.debug, DEFAULT_CONFIG.debug);\n    merged.nUp = parseNumber(merged.nUp, DEFAULT_CONFIG.nUp);\n    if (!Number.isFinite(merged.nUp) || merged.nUp < 1) {\n      merged.nUp = DEFAULT_CONFIG.nUp;\n    }\n    merged.nUp = Math.floor(merged.nUp);\n    merged.showLogicalPageNumber = parseBooleanFlag(merged.showLogicalPageNumber, DEFAULT_CONFIG.showLogicalPageNumber);\n    merged.showPhysicalPageNumber = parseBooleanFlag(merged.showPhysicalPageNumber, DEFAULT_CONFIG.showPhysicalPageNumber);\n    merged.papersizeWidth = parseNumber(merged.papersizeWidth, DEFAULT_CONFIG.papersizeWidth);\n    merged.papersizeHeight = parseNumber(merged.papersizeHeight, DEFAULT_CONFIG.papersizeHeight);\n    merged.paperSize = parseString(merged.paperSize, DEFAULT_CONFIG.paperSize);\n    merged.orientation = parseString(merged.orientation, DEFAULT_CONFIG.orientation);\n    merged.dpi = parseNumber(merged.dpi, DEFAULT_CONFIG.dpi);\n    if (!Number.isFinite(merged.dpi) || merged.dpi <= 0) merged.dpi = DEFAULT_CONFIG.dpi;\n    const overrideHas = (key) => Object.prototype.hasOwnProperty.call(overrides, key) && overrides[key] !== "";\n    const manualWidthProvided = Object.prototype.hasOwnProperty.call(legacy, "papersizeWidth") || Object.prototype.hasOwnProperty.call(datasetConfig, "papersizeWidth") || overrideHas("papersizeWidth");\n    const manualHeightProvided = Object.prototype.hasOwnProperty.call(legacy, "papersizeHeight") || Object.prototype.hasOwnProperty.call(datasetConfig, "papersizeHeight") || overrideHas("papersizeHeight");\n    if (!manualWidthProvided && !manualHeightProvided) {\n      const resolved = resolvePaperDimensions({ paperSize: merged.paperSize, orientation: merged.orientation, dpi: merged.dpi });\n      if (resolved) {\n        merged.papersizeWidth = resolved.width;\n        merged.papersizeHeight = resolved.height;\n      }\n    }\n    return merged;\n  }\n  const PADDT_CONFIG_DESCRIPTORS = [\n    { key: "repeatPaddt", datasetKey: "repeatPaddt", legacyKey: "repeat_paddt", defaultValue: true, parser: parseBooleanFlag },\n    { key: "insertPaddtDummyRowItems", datasetKey: "insertPaddtDummyRowItems", legacyKey: "insert_paddt_dummy_row_items", defaultValue: true, parser: parseBooleanFlag },\n    { key: "paddtMaxWordsPerSegment", datasetKey: "paddtMaxWordsPerSegment", legacyKey: "paddt_max_words_per_segment", defaultValue: 200, parser: parseNumber },\n    { key: "repeatPaddtRowheader", datasetKey: "repeatPaddtRowheader", legacyKey: "repeat_paddt_rowheader", defaultValue: true, parser: parseBooleanFlag },\n    { key: "paddtDebug", datasetKey: "paddtDebug", legacyKey: "paddt_debug", defaultValue: false, parser: parseBooleanFlag },\n    // PADDT-specific docinfo toggles (show/hide on PADDT pages only)\n    { key: "repeatPaddtDocinfo", datasetKey: "repeatPaddtDocinfo", legacyKey: "repeat_paddt_docinfo", defaultValue: true, parser: parseBooleanFlag },\n    { key: "repeatPaddtDocinfo002", datasetKey: "repeatPaddtDocinfo002", legacyKey: "repeat_paddt_docinfo002", defaultValue: true, parser: parseBooleanFlag },\n    { key: "repeatPaddtDocinfo003", datasetKey: "repeatPaddtDocinfo003", legacyKey: "repeat_paddt_docinfo003", defaultValue: true, parser: parseBooleanFlag },\n    { key: "repeatPaddtDocinfo004", datasetKey: "repeatPaddtDocinfo004", legacyKey: "repeat_paddt_docinfo004", defaultValue: true, parser: parseBooleanFlag },\n    { key: "repeatPaddtDocinfo005", datasetKey: "repeatPaddtDocinfo005", legacyKey: "repeat_paddt_docinfo005", defaultValue: true, parser: parseBooleanFlag }\n  ];\n  const DEFAULT_PADDT_CONFIG = PADDT_CONFIG_DESCRIPTORS.reduce(function(acc, d) {\n    acc[d.key] = d.defaultValue;\n    return acc;\n  }, {});\n  function getPaddtLegacyConfig() {\n    return readConfigFromLegacy(PADDT_CONFIG_DESCRIPTORS);\n  }\n  function getPaddtDatasetConfig(dataset) {\n    return readConfigFromDataset(PADDT_CONFIG_DESCRIPTORS, dataset);\n  }\n  function getPaddtConfig(formEl, overrides) {\n    overrides = overrides || {};\n    var legacy = getPaddtLegacyConfig();\n    var datasetConfig = getPaddtDatasetConfig(formEl && formEl.dataset || {});\n    var merged = {};\n    for (var k in DEFAULT_PADDT_CONFIG) {\n      if (Object.prototype.hasOwnProperty.call(DEFAULT_PADDT_CONFIG, k)) merged[k] = DEFAULT_PADDT_CONFIG[k];\n    }\n    for (var k1 in legacy) {\n      if (Object.prototype.hasOwnProperty.call(legacy, k1)) merged[k1] = legacy[k1];\n    }\n    for (var k2 in datasetConfig) {\n      if (Object.prototype.hasOwnProperty.call(datasetConfig, k2)) merged[k2] = datasetConfig[k2];\n    }\n    for (var k3 in overrides) {\n      if (Object.prototype.hasOwnProperty.call(overrides, k3)) merged[k3] = overrides[k3];\n    }\n    merged.paddtDebug = parseBooleanFlag(merged.paddtDebug, DEFAULT_PADDT_CONFIG.paddtDebug);\n    merged.paddtMaxWordsPerSegment = parseNumber(merged.paddtMaxWordsPerSegment, DEFAULT_PADDT_CONFIG.paddtMaxWordsPerSegment);\n    if (!Number.isFinite(merged.paddtMaxWordsPerSegment) || merged.paddtMaxWordsPerSegment <= 0) {\n      merged.paddtMaxWordsPerSegment = DEFAULT_PADDT_CONFIG.paddtMaxWordsPerSegment;\n    }\n    return merged;\n  }\n  function applyTableSizingReset(table) {\n    if (!table) return;\n    table.style.borderCollapse = "collapse";\n    table.style.borderSpacing = "0";\n    table.style.margin = "0";\n    table.style.padding = "0";\n    table.style.lineHeight = "0";\n    table.style.fontSize = "0";\n  }\n  function createDummyRowTable(config, height) {\n    const table = document.createElement("table");\n    table.className = "dummy_row";\n    table.setAttribute("width", `${config.papersizeWidth}px`);\n    table.setAttribute("cellspacing", "0");\n    table.setAttribute("cellpadding", "0");\n    applyTableSizingReset(table);\n    table.innerHTML = `<tr style="height:${normalizeHeight(height)}px;"><td style="border:0px solid black;padding:0;margin:0;line-height:0;font-size:0;"></td></tr>`;\n    return table;\n  }\n  function createDummyRowItemTable(config) {\n    const table = document.createElement("table");\n    table.className = "dummy_row_item";\n    table.setAttribute("width", `${config.papersizeWidth}px`);\n    table.setAttribute("cellspacing", "0");\n    table.setAttribute("cellpadding", "0");\n    applyTableSizingReset(table);\n    table.style.borderCollapse = "separate";\n    if (config.customDummyRowItemContent) {\n      table.innerHTML = config.customDummyRowItemContent;\n    } else {\n      table.innerHTML = `<tr style="height:${normalizeHeight(config.heightOfDummyRowItem)}px;"><td style="border:0px solid black;padding:0;margin:0;line-height:0;font-size:0;"></td></tr>`;\n    }\n    return table;\n  }\n  function appendDummyRowItems(config, target, diffHeight) {\n    const itemHeight = normalizeHeight(config.heightOfDummyRowItem);\n    const remaining = normalizeHeight(diffHeight);\n    if (itemHeight <= 0 || remaining <= 0) return;\n    const count = Math.floor(remaining / itemHeight);\n    for (let index = 0; index < count; index += 1) {\n      target.appendChild(createDummyRowItemTable(config));\n    }\n  }\n  function appendDummyRow(config, target, diffHeight) {\n    const remaining = normalizeHeight(diffHeight);\n    if (remaining <= 0) return;\n    target.appendChild(createDummyRowTable(config, remaining));\n  }\n  function applyDummyRowItemsStep(config, container, heightPerPage, currentHeight, debug) {\n    if (!config.insertDummyRowItemWhileFormatTable) {\n      if (debug) {\n        console.log(`[printform] applyDummyRowItemsStep: SKIPPED (insertDummyRowItemWhileFormatTable=false)`);\n      }\n      return normalizeHeight(currentHeight);\n    }\n    const remaining = normalizeHeight(heightPerPage - currentHeight);\n    if (debug) {\n      console.log(`[printform] applyDummyRowItemsStep:`);\n      console.log(`[printform]   heightPerPage: ${heightPerPage}px, currentHeight: ${currentHeight}px`);\n      console.log(`[printform]   remaining: ${remaining}px, itemHeight: ${config.heightOfDummyRowItem}px`);\n    }\n    if (remaining > 0) {\n      appendDummyRowItems(config, container, remaining);\n      const itemHeight = normalizeHeight(config.heightOfDummyRowItem);\n      if (itemHeight > 0) {\n        const count = Math.floor(remaining / itemHeight);\n        const remainder = normalizeHeight(remaining % itemHeight);\n        const newHeight = normalizeHeight(heightPerPage - remainder);\n        if (debug) {\n          console.log(`[printform]   inserted ${count} dummy_row_items (${count} x ${itemHeight}px = ${count * itemHeight}px)`);\n          console.log(`[printform]   remainder: ${remainder}px, newHeight: ${newHeight}px`);\n        }\n        return newHeight;\n      }\n    }\n    return normalizeHeight(currentHeight);\n  }\n  function applyDummyRowStep(config, container, heightPerPage, currentHeight, debug) {\n    if (!config.insertDummyRowWhileFormatTable) {\n      if (debug) {\n        console.log(`[printform] applyDummyRowStep: SKIPPED (insertDummyRowWhileFormatTable=false)`);\n      }\n      return normalizeHeight(currentHeight);\n    }\n    const remaining = normalizeHeight(heightPerPage - currentHeight);\n    if (debug) {\n      console.log(`[printform] applyDummyRowStep:`);\n      console.log(`[printform]   heightPerPage: ${heightPerPage}px, currentHeight: ${currentHeight}px`);\n      console.log(`[printform]   remaining: ${remaining}px`);\n    }\n    if (remaining > 0) {\n      appendDummyRow(config, container, remaining);\n      if (debug) {\n        console.log(`[printform]   inserted 1 dummy_row with height: ${remaining}px`);\n      }\n      return normalizeHeight(currentHeight + remaining);\n    }\n    return normalizeHeight(currentHeight);\n  }\n  function applyFooterSpacerWithDummyStep(config, container, heightPerPage, currentHeight, skipDummyRowItems, debug) {\n    if (!config.insertFooterSpacerWithDummyRowItemWhileFormatTable || skipDummyRowItems) {\n      if (debug) {\n        console.log(`[printform] applyFooterSpacerWithDummyStep: SKIPPED (flag=${config.insertFooterSpacerWithDummyRowItemWhileFormatTable}, skipDummy=${skipDummyRowItems})`);\n      }\n      return {\n        currentHeight: normalizeHeight(currentHeight),\n        skipFooterSpacer: false\n      };\n    }\n    const remaining = normalizeHeight(heightPerPage - currentHeight);\n    let workingHeight = normalizeHeight(currentHeight);\n    if (debug) {\n      console.log(`[printform] applyFooterSpacerWithDummyStep:`);\n      console.log(`[printform]   heightPerPage: ${heightPerPage}px, currentHeight: ${currentHeight}px`);\n      console.log(`[printform]   remaining: ${remaining}px`);\n    }\n    if (remaining > 0) {\n      appendDummyRowItems(config, container, remaining);\n      const itemHeight = normalizeHeight(config.heightOfDummyRowItem);\n      if (itemHeight > 0) {\n        const count = Math.floor(remaining / itemHeight);\n        const remainder = normalizeHeight(remaining % itemHeight);\n        workingHeight = normalizeHeight(heightPerPage - remainder);\n        if (debug) {\n          console.log(`[printform]   inserted ${count} spacer dummy_row_items, remainder: ${remainder}px`);\n        }\n      }\n    }\n    return {\n      currentHeight: workingHeight,\n      skipFooterSpacer: true\n    };\n  }\n  function applyFooterSpacerStep(config, container, heightPerPage, currentHeight, footerState, spacerTemplate, debug) {\n    if (!config.insertFooterSpacerWhileFormatTable) {\n      if (debug) {\n        console.log(`[printform] applyFooterSpacerStep: SKIPPED (insertFooterSpacerWhileFormatTable=false)`);\n      }\n      return;\n    }\n    const clone = spacerTemplate.cloneNode(true);\n    let remaining = normalizeHeight(heightPerPage - currentHeight);\n    const nonRepeating = footerState && footerState.nonRepeating ? normalizeHeight(footerState.nonRepeating) : 0;\n    if (nonRepeating > 0) {\n      remaining -= nonRepeating;\n    }\n    const spacerHeight = Math.max(0, remaining);\n    clone.style.height = `${spacerHeight}px`;\n    container.appendChild(clone);\n    if (debug) {\n      console.log(`[printform] applyFooterSpacerStep:`);\n      console.log(`[printform]   heightPerPage: ${heightPerPage}px, currentHeight: ${currentHeight}px`);\n      console.log(`[printform]   nonRepeatingFooter: ${nonRepeating}px`);\n      console.log(`[printform]   pfooter_spacer height: ${spacerHeight}px`);\n    }\n  }\n  function markAsProcessed(element, baseClass) {\n    if (!element || !baseClass) return;\n    if (element.classList.contains(`${baseClass}_processed`)) return;\n    element.classList.remove(baseClass);\n    element.classList.add(`${baseClass}_processed`);\n  }\n  function measureHeight(element) {\n    if (!element) return 0;\n    element.offsetHeight;\n    const rect = element.getBoundingClientRect ? element.getBoundingClientRect() : null;\n    const rectHeight = rect && Number.isFinite(rect.height) ? rect.height : 0;\n    let baseHeight = rectHeight > 0 ? rectHeight : element.offsetHeight;\n    if (baseHeight === 0) {\n      const originalDisplay = element.style.display;\n      const originalVisibility = element.style.visibility;\n      const originalPosition = element.style.position;\n      element.style.display = "block";\n      element.style.visibility = "hidden";\n      element.style.position = "absolute";\n      const tempRect = element.getBoundingClientRect ? element.getBoundingClientRect() : null;\n      const tempRectHeight = tempRect && Number.isFinite(tempRect.height) ? tempRect.height : 0;\n      baseHeight = tempRectHeight > 0 ? tempRectHeight : element.offsetHeight || 0;\n      element.style.display = originalDisplay;\n      element.style.visibility = originalVisibility;\n      element.style.position = originalPosition;\n    }\n    const view = element.ownerDocument && element.ownerDocument.defaultView || (typeof window !== "undefined" ? window : null);\n    if (!view || !view.getComputedStyle) {\n      return normalizeHeight(baseHeight);\n    }\n    const style = view.getComputedStyle(element);\n    const marginTop = Number.parseFloat(style.marginTop) || 0;\n    const marginBottom = Number.parseFloat(style.marginBottom) || 0;\n    return normalizeHeight(baseHeight + marginTop + marginBottom);\n  }\n  function measureHeightRaw(element) {\n    if (!element) return 0;\n    const rect = element.getBoundingClientRect ? element.getBoundingClientRect() : null;\n    const baseHeight = rect && Number.isFinite(rect.height) ? rect.height : element.offsetHeight || 0;\n    const view = element.ownerDocument && element.ownerDocument.defaultView || (typeof window !== "undefined" ? window : null);\n    if (!view || !view.getComputedStyle) {\n      return Number.isFinite(baseHeight) ? Math.max(0, baseHeight) : 0;\n    }\n    const style = view.getComputedStyle(element);\n    const marginTop = Number.parseFloat(style.marginTop) || 0;\n    const marginBottom = Number.parseFloat(style.marginBottom) || 0;\n    const total = baseHeight + marginTop + marginBottom;\n    return Number.isFinite(total) ? Math.max(0, total) : 0;\n  }\n  function createPageBreakDivider(extraClassNames) {\n    const div = document.createElement("div");\n    div.classList.add("div_page_break_before");\n    div.setAttribute("style", "page-break-before: always; font-size: 0pt; height: 0px;");\n    const globalScope2 = typeof window !== "undefined" ? window : globalThis;\n    const resolvedClassNames = typeof extraClassNames === "string" && extraClassNames.trim() ? extraClassNames : globalScope2 && typeof globalScope2.__printFormDividerClassAppend === "string" ? globalScope2.__printFormDividerClassAppend : "";\n    if (resolvedClassNames) {\n      resolvedClassNames.split(/\\s+/).filter(Boolean).forEach((className) => div.classList.add(className));\n    }\n    return div;\n  }\n  function appendClone(target, element, logFn, label) {\n    if (!element) return null;\n    const clone = element.cloneNode(true);\n    target.appendChild(clone);\n    if (logFn) logFn(`append ${label}`);\n    return clone;\n  }\n  function appendRowItem(target, element, logFn, index, label) {\n    if (!element) return null;\n    const clone = element.cloneNode(true);\n    target.appendChild(clone);\n    if (logFn) {\n      const resolvedLabel = label || "prowitem";\n      logFn(`append ${resolvedLabel} ${index}`);\n    }\n    return clone;\n  }\n  const DomHelpers = {\n    markAsProcessed,\n    measureHeight,\n    measureHeightRaw,\n    createPageBreakDivider,\n    appendClone,\n    appendRowItem,\n    createDummyRowTable\n  };\n  function buildDummySpacer(config, remaining, debug) {\n    if (config.customDummySpacerContent) {\n      const template = document.createElement("template");\n      template.innerHTML = config.customDummySpacerContent.trim();\n      const elements = Array.from(template.content.childNodes).filter((node) => node.nodeType === Node.ELEMENT_NODE);\n      if (elements.length === 1) {\n        const spacer2 = elements[0];\n        spacer2.classList.add("dummy_spacer");\n        spacer2.setAttribute("aria-hidden", "true");\n        if (spacer2.tagName !== "TABLE") {\n          spacer2.style.display = "block";\n        }\n        spacer2.style.width = "100%";\n        spacer2.style.height = `${remaining}px`;\n        spacer2.style.margin = "0";\n        spacer2.style.padding = "0";\n        return spacer2;\n      }\n      if (debug) {\n        console.log("[printform] customDummySpacerContent ignored: template must have exactly 1 root element.");\n      }\n    }\n    const spacer = document.createElement("div");\n    spacer.classList.add("dummy_spacer");\n    spacer.setAttribute("aria-hidden", "true");\n    if (spacer.tagName !== "TABLE") {\n      spacer.style.display = "block";\n    }\n    spacer.style.width = "100%";\n    spacer.style.height = `${remaining}px`;\n    spacer.style.margin = "0";\n    spacer.style.padding = "0";\n    return spacer;\n  }\n  function attachPageMethods(FormatterClass) {\n    FormatterClass.prototype.initializeOutputContainer = function initializeOutputContainer() {\n      const container = document.createElement("div");\n      container.classList.add("printform_formatter");\n      container.style.webkitTextSizeAdjust = "100%";\n      container.style.textSizeAdjust = "100%";\n      this.formEl.parentNode.insertBefore(container, this.formEl);\n      return container;\n    };\n    FormatterClass.prototype.initializePhysicalWrapper = function initializePhysicalWrapper(outputContainer) {\n      if (this.currentPhysicalWrapper) {\n        outputContainer.appendChild(DomHelpers.createPageBreakDivider());\n        this.currentPhysicalPage += 1;\n      } else {\n        this.currentPhysicalPage = 1;\n      }\n      const wrapper = document.createElement("div");\n      wrapper.classList.add("physical_page_wrapper");\n      wrapper.style.display = "flex";\n      wrapper.style.flexDirection = "column";\n      wrapper.style.alignItems = "flex-start";\n      wrapper.style.width = `${this.config.papersizeWidth}px`;\n      outputContainer.appendChild(wrapper);\n      this.currentPhysicalWrapper = wrapper;\n      this.pagesInCurrentPhysical = 0;\n      return wrapper;\n    };\n    FormatterClass.prototype.ensureCurrentPageContainer = function ensureCurrentPageContainer(outputContainer) {\n      if (!this.currentPhysicalWrapper) {\n        this.initializePhysicalWrapper(outputContainer);\n      }\n      if (!this.currentPageContainer) {\n        this.createNewLogicalPage(outputContainer);\n      }\n      return this.currentPageContainer;\n    };\n    FormatterClass.prototype.createNewLogicalPage = function createNewLogicalPage(outputContainer) {\n      if (!this.currentPhysicalWrapper || this.pagesInCurrentPhysical >= this.nUp) {\n        this.initializePhysicalWrapper(outputContainer);\n      }\n      const page = document.createElement("div");\n      page.classList.add("printform_page");\n      page.style.width = `${this.config.papersizeWidth}px`;\n      this.currentPhysicalWrapper.appendChild(page);\n      this.currentPageContainer = page;\n      this.pagesInCurrentPhysical += 1;\n      this.logicalPageToPhysicalPage[this.currentPage] = this.currentPhysicalPage;\n      return page;\n    };\n    FormatterClass.prototype.getCurrentPageContainer = function getCurrentPageContainer(outputContainer) {\n      return this.ensureCurrentPageContainer(outputContainer);\n    };\n    FormatterClass.prototype.finalizePageHeight = function finalizePageHeight(pageContainer) {\n      if (!pageContainer) return;\n      const configuredHeight = this.config.papersizeHeight;\n      const fillPageHeightAfterFooter = this.config.fillPageHeightAfterFooter !== false;\n      let appendedSpacerHeight = 0;\n      const formatPx = (value) => {\n        if (!Number.isFinite(value)) return "0";\n        return String(Math.round(value * 100) / 100);\n      };\n      if (fillPageHeightAfterFooter) {\n        const currentHeight = DomHelpers.measureHeightRaw(pageContainer);\n        const remaining = Math.max(0, configuredHeight - currentHeight);\n        if (remaining > 0.01) {\n          const spacer = buildDummySpacer(this.config, remaining, this.debug);\n          const footerSelectors = FOOTER_VARIANTS.map((variant) => `.${variant.className}_processed`).concat([\n            `.${FOOTER_LOGO_VARIANT.className}_processed`,\n            `.${FOOTER_PAGENUM_VARIANT.className}_processed`\n          ]);\n          const firstFooter = pageContainer.querySelector(footerSelectors.join(", "));\n          if (firstFooter && firstFooter.parentNode === pageContainer) {\n            pageContainer.insertBefore(spacer, firstFooter);\n          } else {\n            pageContainer.appendChild(spacer);\n          }\n          appendedSpacerHeight = remaining;\n        }\n      }\n      if (this.debug) {\n        console.log(`\n[printform] ========== PAGE HEIGHT CALCULATION ==========`);\n        console.log(`[printform] Configured page height: ${configuredHeight}px`);\n        console.log(`[printform] -------------------------------------------`);\n        const children = Array.from(pageContainer.children);\n        let cumulativeHeight = 0;\n        console.log(`[printform] Elements breakdown (${children.length} elements):`);\n        children.forEach((child, index) => {\n          const childHeight = DomHelpers.measureHeightRaw(child);\n          cumulativeHeight += childHeight;\n          const className = child.className || "(no class)";\n          const tagName = child.tagName.toLowerCase();\n          console.log(`[printform]   ${index + 1}. <${tagName}.${className}>`);\n          console.log(`[printform]      Height: ${formatPx(childHeight)}px`);\n          console.log(`[printform]      Cumulative: ${formatPx(cumulativeHeight)}px`);\n          console.log(`[printform]      Remaining: ${formatPx(Math.max(0, configuredHeight - cumulativeHeight))}px`);\n          if (childHeight > configuredHeight * 0.5) {\n            console.log(`[printform]      ⚠️  WARNING: Element height is > 50% of page height`);\n          }\n        });\n        console.log(`[printform] -------------------------------------------`);\n        console.log(`[printform] Total content height: ${formatPx(cumulativeHeight)}px`);\n        if (cumulativeHeight < configuredHeight) {\n          const shortfall = configuredHeight - cumulativeHeight;\n          console.log(`[printform] ✓ Content fits (${formatPx(shortfall)}px under limit)`);\n        } else if (cumulativeHeight > configuredHeight) {\n          const overflow = cumulativeHeight - configuredHeight;\n          console.log(`[printform] ⚠️  Content overflow (${formatPx(overflow)}px over limit)`);\n        } else {\n          console.log(`[printform] ✓ Perfect fit (exactly matches configured height)`);\n        }\n        if (appendedSpacerHeight > 0) {\n          console.log(`[printform] ✓ Final spacer appended: ${formatPx(appendedSpacerHeight)}px`);\n        }\n      }\n      if (this.debug) {\n        const actualHeight = DomHelpers.measureHeightRaw(pageContainer);\n        console.log(`[printform] -------------------------------------------`);\n        console.log(`[printform] Actual measured height: ${formatPx(actualHeight)}px`);\n        console.log(`[printform] ℹ️  Height NOT set - using natural content height`);\n        console.log(`[printform] ===============================================\n`);\n      }\n    };\n  }\n  const ROW_SELECTOR = ".prowitem, .ptac-rowitem, .paddt-rowitem";\n  const PTAC_MAX_WORDS_PER_SEGMENT = 200;\n  const PADDT_MAX_WORDS_PER_SEGMENT = 200;\n  function collectWordTokens(node) {\n    var tokens = [];\n    if (!node || !node.ownerDocument || !node.ownerDocument.createTreeWalker) {\n      return tokens;\n    }\n    var walker = node.ownerDocument.createTreeWalker(node, 4, null, false);\n    var current = walker.nextNode();\n    while (current) {\n      var text = current.nodeValue || "";\n      var regex = /\\S+/g;\n      var match = regex.exec(text);\n      while (match) {\n        tokens.push({\n          node: current,\n          start: match.index,\n          end: match.index + match[0].length\n        });\n        match = regex.exec(text);\n      }\n      current = walker.nextNode();\n    }\n    return tokens;\n  }\n  function buildChunkHtml(node, range) {\n    var clone = node.cloneNode(false);\n    clone.appendChild(range.cloneContents());\n    return clone.outerHTML || "";\n  }\n  function splitParagraphIntoHtmlChunks(node, maxWords) {\n    if (!node) {\n      return [];\n    }\n    if (!maxWords || maxWords <= 0) {\n      return [node.outerHTML || ""];\n    }\n    var text = (node.textContent || "").trim();\n    if (!text) {\n      return [node.outerHTML || ""];\n    }\n    if (!node.ownerDocument || !node.ownerDocument.createRange || !node.ownerDocument.createTreeWalker) {\n      return [node.outerHTML || ""];\n    }\n    var tokens = collectWordTokens(node);\n    if (tokens.length === 0) {\n      return [node.outerHTML || ""];\n    }\n    if (tokens.length <= maxWords) {\n      return [node.outerHTML || ""];\n    }\n    var chunks = [];\n    for (var startIndex = 0; startIndex < tokens.length; startIndex += maxWords) {\n      var endIndex = startIndex + maxWords - 1;\n      if (endIndex >= tokens.length) {\n        endIndex = tokens.length - 1;\n      }\n      var range = node.ownerDocument.createRange();\n      if (startIndex === 0) {\n        range.setStart(node, 0);\n      } else {\n        var startToken = tokens[startIndex];\n        range.setStart(startToken.node, startToken.start);\n      }\n      if (endIndex + 1 < tokens.length) {\n        var nextToken = tokens[endIndex + 1];\n        range.setEnd(nextToken.node, nextToken.start);\n      } else {\n        range.setEnd(node, node.childNodes.length);\n      }\n      chunks.push(buildChunkHtml(node, range));\n    }\n    return chunks;\n  }\n  function splitPaddtParagraphIntoHtmlChunks(node, maxWords) {\n    return splitParagraphIntoHtmlChunks(node, maxWords);\n  }\n  function attachSectionMethods(FormatterClass) {\n    FormatterClass.prototype.collectSections = function collectSections() {\n      this.expandPaddtSegments();\n      this.expandPtacSegments();\n      const docInfos = DOCINFO_VARIANTS.map((variant) => {\n        const element = this.formEl.querySelector(`.${variant.className}`);\n        if (!element) return null;\n        return {\n          key: variant.key,\n          className: variant.className,\n          repeatFlag: variant.repeatFlag,\n          element\n        };\n      }).filter(Boolean);\n      const footerVariants = FOOTER_VARIANTS.map((variant) => {\n        const element = this.formEl.querySelector(`.${variant.className}`);\n        if (!element) return null;\n        return {\n          key: variant.key,\n          className: variant.className,\n          repeatFlag: variant.repeatFlag,\n          element\n        };\n      }).filter(Boolean);\n      const allRows = Array.from(this.formEl.querySelectorAll(ROW_SELECTOR));\n      const paddtRows = allRows.filter((row) => this.isPaddtRow(row));\n      const mainRows = allRows.filter((row) => !this.isPaddtRow(row));\n      this.paddtRows = paddtRows;\n      return {\n        header: this.formEl.querySelector(".pheader"),\n        docInfos,\n        rowHeader: this.formEl.querySelector(".prowheader"),\n        footerVariants,\n        footerLogo: this.formEl.querySelector(`.${FOOTER_LOGO_VARIANT.className}`),\n        footerPagenum: this.formEl.querySelector(`.${FOOTER_PAGENUM_VARIANT.className}`),\n        rows: mainRows\n      };\n    };\n    FormatterClass.prototype.measureSections = function measureSections(sections) {\n      const heights = {\n        header: DomHelpers.measureHeight(sections.header),\n        docInfos: {},\n        rowHeader: DomHelpers.measureHeight(sections.rowHeader),\n        footerVariants: {},\n        footerLogo: DomHelpers.measureHeight(sections.footerLogo),\n        footerPagenum: DomHelpers.measureHeight(sections.footerPagenum)\n      };\n      sections.docInfos.forEach((docInfo) => {\n        heights.docInfos[docInfo.key] = DomHelpers.measureHeight(docInfo.element);\n      });\n      sections.footerVariants.forEach((footer) => {\n        heights.footerVariants[footer.key] = DomHelpers.measureHeight(footer.element);\n      });\n      return heights;\n    };\n    FormatterClass.prototype.markSectionsProcessed = function markSectionsProcessed(sections) {\n      DomHelpers.markAsProcessed(sections.header, "pheader");\n      sections.docInfos.forEach((docInfo) => {\n        DomHelpers.markAsProcessed(docInfo.element, docInfo.className);\n      });\n      DomHelpers.markAsProcessed(sections.rowHeader, "prowheader");\n      sections.footerVariants.forEach((footer) => {\n        DomHelpers.markAsProcessed(footer.element, footer.className);\n      });\n      DomHelpers.markAsProcessed(sections.footerLogo, FOOTER_LOGO_VARIANT.className);\n      DomHelpers.markAsProcessed(sections.footerPagenum, FOOTER_PAGENUM_VARIANT.className);\n    };\n    FormatterClass.prototype.createFooterSpacerTemplate = function createFooterSpacerTemplate() {\n      const spacer = document.createElement("div");\n      spacer.classList.add("pfooter_spacer", "paper_width");\n      spacer.style.height = "0px";\n      return spacer;\n    };\n  }\n  function attachRowTypeMethods(FormatterClass) {\n    FormatterClass.prototype.isPaddtRow = function isPaddtRow(row) {\n      if (!row) {\n        return false;\n      }\n      return row.classList.contains("paddt_segment") || row.classList.contains("paddt") || row.classList.contains("paddt-rowitem") || row.classList.contains("paddt-rowitem_processed");\n    };\n    FormatterClass.prototype.isPtacRow = function isPtacRow(row) {\n      if (!row) {\n        return false;\n      }\n      return row.classList.contains("ptac_segment") || row.classList.contains("ptac") || row.classList.contains("ptac-rowitem") || row.classList.contains("ptac-rowitem_processed");\n    };\n    FormatterClass.prototype.isSubtotalRow = function isSubtotalRow(row) {\n      if (!row) {\n        return false;\n      }\n      return row.classList.contains("prowitem_subtotal");\n    };\n    FormatterClass.prototype.isFooterRow = function isFooterRow(row) {\n      if (!row) {\n        return false;\n      }\n      return row.classList.contains("prowitem_footer");\n    };\n    FormatterClass.prototype.getRowBaseClass = function getRowBaseClass(row) {\n      if (!row) {\n        return "prowitem";\n      }\n      if (this.isPaddtRow(row)) return "paddt-rowitem";\n      return this.isPtacRow(row) ? "ptac-rowitem" : "prowitem";\n    };\n    FormatterClass.prototype.shouldSkipRowHeaderForRow = function shouldSkipRowHeaderForRow(row) {\n      if (!row) {\n        return false;\n      }\n      if (!this.config.repeatRowheader) {\n        return false;\n      }\n      if (row.classList.contains("without_prowheader") || row.classList.contains("tb_without_rowheader")) {\n        return true;\n      }\n      if (this.isPtacRow(row)) {\n        if (this.config.repeatPtacRowheader) return false;\n        return true;\n      }\n      if (this.isPaddtRow(row)) {\n        if (this.paddtConfig && this.paddtConfig.repeatPaddtRowheader) return false;\n        return true;\n      }\n      return false;\n    };\n    FormatterClass.prototype.shouldSkipDummyRowItemsForContext = function shouldSkipDummyRowItemsForContext(pageContext) {\n      return Boolean(\n        pageContext && (pageContext.isPtacPage && !this.config.insertPtacDummyRowItems || pageContext.isPaddtPage && !(this.paddtConfig && this.paddtConfig.insertPaddtDummyRowItems))\n      );\n    };\n  }\n  function attachPaddtSegmentMethods(FormatterClass) {\n    FormatterClass.prototype.expandPaddtSegments = function expandPaddtSegments() {\n      if (this.formEl.dataset.paddtExpanded === "true") {\n        return;\n      }\n      const paddtTables = Array.from(this.formEl.querySelectorAll(".paddt"));\n      if (paddtTables.length === 0) {\n        this.formEl.dataset.paddtExpanded = "true";\n        return;\n      }\n      var maxWords = this.paddtConfig && this.paddtConfig.paddtMaxWordsPerSegment || PADDT_MAX_WORDS_PER_SEGMENT;\n      paddtTables.forEach((paddtRoot) => {\n        if (!paddtRoot || paddtRoot.dataset.paddtSegment === "true") {\n          return;\n        }\n        const contentWrapper = paddtRoot.querySelector("td > div") || paddtRoot.querySelector("td");\n        if (!contentWrapper) {\n          paddtRoot.classList.add("paddt-rowitem", "paddt_segment");\n          paddtRoot.dataset.paddtSegment = "true";\n          return;\n        }\n        const allChildren = Array.from(contentWrapper.children);\n        if (allChildren.length === 0) {\n          paddtRoot.classList.add("paddt-rowitem", "paddt_segment");\n          paddtRoot.dataset.paddtSegment = "true";\n          return;\n        }\n        const segments = [];\n        allChildren.forEach((child) => {\n          if (child.tagName.toLowerCase() === "p") {\n            const chunks = splitPaddtParagraphIntoHtmlChunks(child, maxWords);\n            chunks.forEach((chunk) => segments.push(chunk));\n          } else {\n            segments.push(child.outerHTML);\n          }\n        });\n        if (segments.length === 0) {\n          paddtRoot.classList.add("paddt-rowitem", "paddt_segment");\n          paddtRoot.dataset.paddtSegment = "true";\n          return;\n        }\n        contentWrapper.innerHTML = segments[0];\n        paddtRoot.classList.add("paddt-rowitem", "paddt_segment");\n        paddtRoot.dataset.paddtSegment = "true";\n        var lastNode = paddtRoot;\n        for (var index = 1; index < segments.length; index += 1) {\n          const clone = paddtRoot.cloneNode(true);\n          clone.dataset.paddtSegment = "true";\n          const cloneWrapper = clone.querySelector("td > div") || clone.querySelector("td");\n          if (cloneWrapper) {\n            cloneWrapper.innerHTML = segments[index];\n          }\n          lastNode.parentNode.insertBefore(clone, lastNode.nextSibling);\n          lastNode = clone;\n        }\n      });\n      this.formEl.dataset.paddtExpanded = "true";\n    };\n  }\n  function attachPtacSegmentMethods(FormatterClass) {\n    FormatterClass.prototype.expandPtacSegments = function expandPtacSegments() {\n      if (this.formEl.dataset.ptacExpanded === "true") {\n        return;\n      }\n      const ptacTables = Array.from(this.formEl.querySelectorAll(".ptac"));\n      if (ptacTables.length === 0) {\n        this.formEl.dataset.ptacExpanded = "true";\n        return;\n      }\n      ptacTables.forEach((ptacRoot) => {\n        if (!ptacRoot || ptacRoot.dataset.ptacSegment === "true") {\n          return;\n        }\n        const contentWrapper = ptacRoot.querySelector("td > div") || ptacRoot.querySelector("td");\n        if (!contentWrapper) {\n          ptacRoot.classList.add("ptac-rowitem", "ptac_segment");\n          ptacRoot.dataset.ptacSegment = "true";\n          return;\n        }\n        const allChildren = Array.from(contentWrapper.children);\n        if (allChildren.length === 0) {\n          ptacRoot.classList.add("ptac-rowitem", "ptac_segment");\n          ptacRoot.dataset.ptacSegment = "true";\n          return;\n        }\n        const segments = [];\n        allChildren.forEach((child) => {\n          if (child.tagName.toLowerCase() === "p") {\n            const chunks = splitParagraphIntoHtmlChunks(child, PTAC_MAX_WORDS_PER_SEGMENT);\n            chunks.forEach((chunk) => segments.push(chunk));\n          } else {\n            segments.push(child.outerHTML);\n          }\n        });\n        if (segments.length === 0) {\n          ptacRoot.classList.add("ptac-rowitem", "ptac_segment");\n          ptacRoot.dataset.ptacSegment = "true";\n          return;\n        }\n        contentWrapper.innerHTML = segments[0];\n        ptacRoot.classList.add("ptac-rowitem", "ptac_segment");\n        ptacRoot.dataset.ptacSegment = "true";\n        var lastNode = ptacRoot;\n        for (var index = 1; index < segments.length; index += 1) {\n          const clone = ptacRoot.cloneNode(true);\n          clone.classList.remove("tb_page_break_before");\n          clone.dataset.ptacSegment = "true";\n          const cloneWrapper = clone.querySelector("td > div") || clone.querySelector("td");\n          if (cloneWrapper) {\n            cloneWrapper.innerHTML = segments[index];\n          }\n          lastNode.parentNode.insertBefore(clone, lastNode.nextSibling);\n          lastNode = clone;\n        }\n      });\n      this.formEl.dataset.ptacExpanded = "true";\n    };\n  }\n  function attachRenderingMethods(FormatterClass) {\n    FormatterClass.prototype.ensureFirstPageSections = function ensureFirstPageSections(container, sections, heights, logFn, skipRowHeader) {\n      let consumedHeight = 0;\n      if (sections.header) {\n        DomHelpers.appendClone(container, sections.header, logFn, "pheader");\n        if (!this.config.repeatHeader) {\n          consumedHeight += heights.header;\n        }\n      }\n      sections.docInfos.forEach((docInfo) => {\n        const clone = DomHelpers.appendClone(container, docInfo.element, logFn, docInfo.className);\n        this.registerPageNumberClone(clone);\n        if (!this.config[docInfo.repeatFlag]) {\n          consumedHeight += heights.docInfos[docInfo.key] || 0;\n        }\n      });\n      if (sections.rowHeader && !skipRowHeader) {\n        DomHelpers.appendClone(container, sections.rowHeader, logFn, "prowheader");\n        if (!this.config.repeatRowheader) {\n          consumedHeight += heights.rowHeader;\n        }\n      }\n      return consumedHeight;\n    };\n    FormatterClass.prototype.appendRepeatingSections = function appendRepeatingSections(container, sections, logFn, skipRowHeader) {\n      if (this.config.repeatHeader) {\n        DomHelpers.appendClone(container, sections.header, logFn, "pheader");\n      }\n      sections.docInfos.forEach((docInfo) => {\n        if (this.config[docInfo.repeatFlag]) {\n          const clone = DomHelpers.appendClone(container, docInfo.element, logFn, docInfo.className);\n          this.registerPageNumberClone(clone);\n        }\n      });\n      if (this.config.repeatRowheader && !skipRowHeader) {\n        DomHelpers.appendClone(container, sections.rowHeader, logFn, "prowheader");\n      }\n    };\n    FormatterClass.prototype.registerPageNumberClone = function registerPageNumberClone(node) {\n      if (!node) {\n        return false;\n      }\n      let registered = false;\n      if (this.showLogicalPageNumber) {\n        if (node.querySelector("[data-page-number], [data-page-total], [data-page-number-container]")) {\n          updatePageNumberContent(node, this.currentPage, null);\n          this.logicalPageNumberClones.push({ node, pageNumber: this.currentPage });\n          registered = true;\n        }\n      }\n      if (this.showPhysicalPageNumber) {\n        if (node.querySelector("[data-physical-page-number], [data-physical-page-total], [data-physical-page-number-container]")) {\n          const physicalPage = this.logicalPageToPhysicalPage[this.currentPage] || this.currentPhysicalPage || 1;\n          updatePhysicalPageNumberContent(node, physicalPage, null);\n          this.physicalPageNumberClones.push({ node, pageNumber: physicalPage });\n          registered = true;\n        }\n      }\n      return registered;\n    };\n    FormatterClass.prototype.appendRepeatingFooters = function appendRepeatingFooters(container, sections, logFn) {\n      sections.footerVariants.forEach((footer) => {\n        if (this.config[footer.repeatFlag]) {\n          DomHelpers.appendClone(container, footer.element, logFn, footer.className);\n        }\n      });\n      if (this.config.repeatFooterLogo) {\n        DomHelpers.appendClone(container, sections.footerLogo, logFn, FOOTER_LOGO_VARIANT.className);\n      }\n      if (this.config.repeatFooterPagenum) {\n        this.appendFooterPageNumber(container, sections, logFn);\n      }\n    };\n    FormatterClass.prototype.appendFinalFooters = function appendFinalFooters(container, sections, logFn) {\n      sections.footerVariants.forEach((footer) => {\n        DomHelpers.appendClone(container, footer.element, logFn, footer.className);\n      });\n      DomHelpers.appendClone(container, sections.footerLogo, logFn, FOOTER_LOGO_VARIANT.className);\n      this.appendFooterPageNumber(container, sections, logFn);\n    };\n    FormatterClass.prototype.appendFooterPageNumber = function appendFooterPageNumber(container, sections, logFn) {\n      if (!sections.footerPagenum) {\n        return;\n      }\n      const clone = sections.footerPagenum.cloneNode(true);\n      container.appendChild(clone);\n      this.registerPageNumberClone(clone);\n      if (logFn) {\n        logFn(`append ${FOOTER_PAGENUM_VARIANT.className} page ${this.currentPage}`);\n      }\n    };\n    FormatterClass.prototype.updatePageNumberTotals = function updatePageNumberTotals() {\n      if (!this.logicalPageNumberClones.length && !this.physicalPageNumberClones.length) {\n        return;\n      }\n      const totalLogicalPages = this.currentPage;\n      const totalPhysicalPages = this.currentPhysicalPage || 1;\n      this.logicalPageNumberClones.forEach((entry) => {\n        updatePageNumberContent(entry.node, entry.pageNumber, totalLogicalPages);\n      });\n      this.physicalPageNumberClones.forEach((entry) => {\n        updatePhysicalPageNumberContent(entry.node, entry.pageNumber, totalPhysicalPages);\n      });\n    };\n  }\n  function attachPaginationContextMethods(FormatterClass) {\n    FormatterClass.prototype.initializePageContext = function initializePageContext(heightPerPage) {\n      return {\n        baseLimit: heightPerPage,\n        limit: heightPerPage,\n        skipRowHeader: false,\n        isPtacPage: false,\n        isPaddtPage: false,\n        repeatingHeight: 0\n      };\n    };\n    FormatterClass.prototype.refreshPageContextForRow = function refreshPageContextForRow(pageContext, row, heights) {\n      if (!pageContext) {\n        return pageContext;\n      }\n      const skipRowHeader = this.shouldSkipRowHeaderForRow(row);\n      const rowHeaderHeight = heights.rowHeader || 0;\n      pageContext.skipRowHeader = skipRowHeader;\n      pageContext.isPtacPage = this.isPtacRow(row);\n      pageContext.isPaddtPage = this.isPaddtRow(row);\n      pageContext.limit = pageContext.baseLimit + (skipRowHeader ? rowHeaderHeight : 0);\n      return pageContext;\n    };\n    FormatterClass.prototype.computeRepeatingHeightForPage = function computeRepeatingHeightForPage(sections, heights, skipRowHeader) {\n      let total = 0;\n      if (this.config.repeatHeader && sections.header) {\n        total += heights.header || 0;\n      }\n      sections.docInfos.forEach((docInfo) => {\n        if (this.config[docInfo.repeatFlag]) {\n          total += heights.docInfos[docInfo.key] || 0;\n        }\n      });\n      if (this.config.repeatRowheader && sections.rowHeader && !skipRowHeader) {\n        total += heights.rowHeader || 0;\n      }\n      return normalizeHeight(total);\n    };\n    FormatterClass.prototype.measureContentHeight = function measureContentHeight(container, repeatingHeight) {\n      const total = DomHelpers.measureHeightRaw(container);\n      return normalizeHeight(total - (repeatingHeight || 0));\n    };\n  }\n  function attachPaginationDummyMethods(FormatterClass) {\n    FormatterClass.prototype.insertFooterDummyRows = function insertFooterDummyRows(container, pageContext, currentHeight, reservedHeight, footerLabel) {\n      const availableSpace = pageContext.limit - currentHeight - reservedHeight;\n      const dummyHeight = this.config.heightOfDummyRowItem || 27;\n      const numDummies = Math.floor(availableSpace / dummyHeight);\n      if (numDummies > 0 && this.debug) {\n        console.log(`[printform]   >> Inserting ${numDummies} dummy rows before ${footerLabel}`);\n      }\n      const defaultDummyContent = `<table cellpadding="0" cellspacing="0" border="0" style="width:100%;table-layout:fixed;" class="prowitem_dummy"><tr><td style="height:${dummyHeight}px;">&nbsp;</td></tr></table>`;\n      const dummyContent = this.config.customDummyRowItemContent || defaultDummyContent;\n      for (let i = 0; i < numDummies; i++) {\n        if (dummyContent) {\n          const dummyDiv = document.createElement("div");\n          dummyDiv.innerHTML = dummyContent;\n          let dummyNode = dummyDiv.firstElementChild;\n          if (!dummyNode) {\n            dummyDiv.innerHTML = `<div style="height:${dummyHeight}px" class="prowitem_dummy">&nbsp;</div>`;\n            dummyNode = dummyDiv.firstElementChild;\n          }\n          if (dummyNode) {\n            if (!dummyNode.classList.contains("prowitem_dummy")) {\n              dummyNode.classList.add("prowitem_dummy");\n            }\n            container.appendChild(dummyNode);\n          }\n        }\n      }\n      return this.measureContentHeight(container, pageContext.repeatingHeight);\n    };\n  }\n  function attachPaginationRenderMethods(FormatterClass) {\n    FormatterClass.prototype.renderRows = function renderRows(outputContainer, sections, heights, footerState, heightPerPage, footerSpacerTemplate, logFn) {\n      let currentHeight = 0;\n      const pageContext = this.initializePageContext(heightPerPage);\n      if (this.debug) {\n        console.log(`[printform] ===== renderRows START =====`);\n        console.log(`[printform] Total rows: ${sections.rows.length}, heightPerPage: ${heightPerPage}px`);\n      }\n      for (let index = 0; index < sections.rows.length; index++) {\n        const row = sections.rows[index];\n        const nextRow = sections.rows[index + 1];\n        const rowHeight = DomHelpers.measureHeight(row);\n        const baseClass = this.getRowBaseClass(row);\n        const isPtacRow = this.isPtacRow(row);\n        const isPaddtRow = this.isPaddtRow(row);\n        const isSubtotal = this.isSubtotalRow(row);\n        const isFooter = this.isFooterRow(row);\n        const hasFooterCombo = isSubtotal && nextRow && this.isFooterRow(nextRow);\n        const footerRow = hasFooterCombo ? nextRow : null;\n        const footerBaseClass = footerRow ? this.getRowBaseClass(footerRow) : null;\n        const footerHeight = footerRow ? DomHelpers.measureHeight(footerRow) : 0;\n        const comboHeight = rowHeight + footerHeight;\n        if (!rowHeight && (!hasFooterCombo || !footerHeight)) {\n          DomHelpers.markAsProcessed(row, baseClass);\n          if (hasFooterCombo) {\n            DomHelpers.markAsProcessed(footerRow, footerBaseClass);\n            index += 1;\n          }\n          continue;\n        }\n        if (currentHeight === 0) {\n          this.refreshPageContextForRow(pageContext, row, heights);\n          const container2 = this.getCurrentPageContainer(outputContainer);\n          this.ensureFirstPageSections(\n            container2,\n            sections,\n            heights,\n            logFn,\n            pageContext.skipRowHeader\n          );\n          pageContext.repeatingHeight = this.computeRepeatingHeightForPage(sections, heights, pageContext.skipRowHeader);\n          currentHeight = this.measureContentHeight(container2, pageContext.repeatingHeight);\n          if (this.debug) {\n            console.log(`[printform] Page ${this.currentPage} start: firstSectionHeight=${currentHeight}px, pageLimit=${pageContext.limit}px`);\n          }\n        }\n        DomHelpers.markAsProcessed(row, baseClass);\n        if (footerRow) {\n          DomHelpers.markAsProcessed(footerRow, footerBaseClass);\n        }\n        if (hasFooterCombo || isSubtotal || isFooter) {\n          const priorHeight2 = currentHeight;\n          const footerLabel = hasFooterCombo ? "subtotal+footer" : isSubtotal ? "subtotal" : "footer";\n          if (this.debug) {\n            console.log(`[printform]   >> ${footerLabel.toUpperCase()} ROW detected at row[${index}]`);\n          }\n          if (row.classList.contains("tb_page_break_before")) {\n            if (this.debug) {\n              console.log(`[printform]   >> PAGE BREAK (tb_page_break_before) at row[${index}]`);\n            }\n            const skipDummyRowItems3 = this.shouldSkipDummyRowItemsForContext(pageContext);\n            const nextSkipRowHeader2 = this.shouldSkipRowHeaderForRow(row);\n            currentHeight = this.prepareNextPage(\n              outputContainer,\n              sections,\n              logFn,\n              pageContext.limit,\n              currentHeight,\n              footerState,\n              footerSpacerTemplate,\n              nextSkipRowHeader2,\n              skipDummyRowItems3,\n              pageContext.repeatingHeight\n            );\n            this.refreshPageContextForRow(pageContext, row, heights);\n            const container3 = this.getCurrentPageContainer(outputContainer);\n            pageContext.repeatingHeight = this.computeRepeatingHeightForPage(sections, heights, pageContext.skipRowHeader);\n            currentHeight = this.measureContentHeight(container3, pageContext.repeatingHeight);\n          }\n          const container2 = this.getCurrentPageContainer(outputContainer);\n          const testClone = DomHelpers.appendRowItem(container2, row, null, index, baseClass);\n          const testFooterClone = footerRow ? DomHelpers.appendRowItem(container2, footerRow, null, index + 1, footerBaseClass) : null;\n          const testHeight = this.measureContentHeight(container2, pageContext.repeatingHeight);\n          if (testFooterClone && testFooterClone.parentNode === container2) {\n            container2.removeChild(testFooterClone);\n          }\n          if (testClone && testClone.parentNode === container2) {\n            container2.removeChild(testClone);\n          }\n          if (testHeight > pageContext.limit) {\n            if (this.debug) {\n              console.log(`[printform]   >> ${footerLabel.toUpperCase()} would overflow, moving to next page`);\n            }\n            const skipDummyRowItems3 = this.shouldSkipDummyRowItemsForContext(pageContext);\n            const nextSkipRowHeader2 = this.shouldSkipRowHeaderForRow(row);\n            currentHeight = this.prepareNextPage(\n              outputContainer,\n              sections,\n              logFn,\n              pageContext.limit,\n              priorHeight2,\n              footerState,\n              footerSpacerTemplate,\n              nextSkipRowHeader2,\n              skipDummyRowItems3,\n              pageContext.repeatingHeight\n            );\n            this.refreshPageContextForRow(pageContext, row, heights);\n            const nextContainer2 = this.getCurrentPageContainer(outputContainer);\n            pageContext.repeatingHeight = this.computeRepeatingHeightForPage(sections, heights, pageContext.skipRowHeader);\n            currentHeight = this.measureContentHeight(nextContainer2, pageContext.repeatingHeight);\n          }\n          const skipDummyRowItems2 = this.shouldSkipDummyRowItemsForContext(pageContext);\n          if (!skipDummyRowItems2) {\n            const currentContainer = this.getCurrentPageContainer(outputContainer);\n            const reservedHeight = footerRow ? comboHeight : rowHeight;\n            currentHeight = this.insertFooterDummyRows(currentContainer, pageContext, currentHeight, reservedHeight, footerLabel);\n          }\n          const finalContainer = this.getCurrentPageContainer(outputContainer);\n          DomHelpers.appendRowItem(finalContainer, row, null, index, baseClass);\n          if (footerRow) {\n            DomHelpers.appendRowItem(finalContainer, footerRow, null, index + 1, footerBaseClass);\n          }\n          if (logFn) {\n            logFn(`append ${footerLabel} ${index}`);\n          }\n          currentHeight = this.measureContentHeight(finalContainer, pageContext.repeatingHeight);\n          if (this.debug) {\n            console.log(`[printform]   ${footerLabel} row[${index}] added, currentHeight=${currentHeight}px`);\n          }\n          const footerIsPtac = footerRow ? this.isPtacRow(footerRow) : false;\n          const footerIsPaddt = footerRow ? this.isPaddtRow(footerRow) : false;\n          if (!isPtacRow && !footerIsPtac) {\n            pageContext.isPtacPage = false;\n          }\n          if (!isPaddtRow && !footerIsPaddt) {\n            pageContext.isPaddtPage = false;\n          }\n          if (hasFooterCombo) {\n            index += 1;\n          }\n          continue;\n        }\n        if (row.classList.contains("tb_page_break_before")) {\n          if (this.debug) {\n            console.log(`[printform]   >> PAGE BREAK (tb_page_break_before) at row[${index}]`);\n          }\n          const skipDummyRowItems2 = this.shouldSkipDummyRowItemsForContext(pageContext);\n          const nextSkipRowHeader2 = this.shouldSkipRowHeaderForRow(row);\n          currentHeight = this.prepareNextPage(\n            outputContainer,\n            sections,\n            logFn,\n            pageContext.limit,\n            currentHeight,\n            footerState,\n            footerSpacerTemplate,\n            nextSkipRowHeader2,\n            skipDummyRowItems2,\n            pageContext.repeatingHeight\n          );\n          this.refreshPageContextForRow(pageContext, row, heights);\n          const container2 = this.getCurrentPageContainer(outputContainer);\n          pageContext.repeatingHeight = this.computeRepeatingHeightForPage(sections, heights, pageContext.skipRowHeader);\n          currentHeight = this.measureContentHeight(container2, pageContext.repeatingHeight);\n          DomHelpers.appendRowItem(container2, row, null, index, baseClass);\n          if (logFn) {\n            const resolvedLabel = baseClass || "prowitem";\n            logFn(`append ${resolvedLabel} ${index}`);\n          }\n          currentHeight = this.measureContentHeight(container2, pageContext.repeatingHeight);\n          if (this.debug) {\n            console.log(`[printform] Page ${this.currentPage} start: currentHeight=${currentHeight}px, limit=${pageContext.limit}px`);\n          }\n          if (!isPtacRow) {\n            pageContext.isPtacPage = false;\n          }\n          if (!isPaddtRow) {\n            pageContext.isPaddtPage = false;\n          }\n          continue;\n        }\n        const container = this.getCurrentPageContainer(outputContainer);\n        const priorHeight = currentHeight;\n        const clone = DomHelpers.appendRowItem(container, row, null, index, baseClass);\n        const measuredHeight = this.measureContentHeight(container, pageContext.repeatingHeight);\n        if (this.debug) {\n          console.log(`[printform]   row[${index}] height=${rowHeight}px, currentHeight=${measuredHeight}px, limit=${pageContext.limit}px`);\n        }\n        if (measuredHeight <= pageContext.limit) {\n          if (logFn) {\n            const resolvedLabel = baseClass || "prowitem";\n            logFn(`append ${resolvedLabel} ${index}`);\n          }\n          currentHeight = measuredHeight;\n          if (!isPtacRow) {\n            pageContext.isPtacPage = false;\n          }\n          if (!isPaddtRow) {\n            pageContext.isPaddtPage = false;\n          }\n          continue;\n        }\n        if (clone && clone.parentNode === container) {\n          container.removeChild(clone);\n        }\n        if (this.debug) {\n          console.log(`[printform]   >> PAGE BREAK (overflow) at row[${index}]`);\n        }\n        const skipDummyRowItems = this.shouldSkipDummyRowItemsForContext(pageContext);\n        const nextSkipRowHeader = this.shouldSkipRowHeaderForRow(row);\n        currentHeight = this.prepareNextPage(\n          outputContainer,\n          sections,\n          logFn,\n          pageContext.limit,\n          priorHeight,\n          footerState,\n          footerSpacerTemplate,\n          nextSkipRowHeader,\n          skipDummyRowItems,\n          pageContext.repeatingHeight\n        );\n        this.refreshPageContextForRow(pageContext, row, heights);\n        const nextContainer = this.getCurrentPageContainer(outputContainer);\n        pageContext.repeatingHeight = this.computeRepeatingHeightForPage(sections, heights, pageContext.skipRowHeader);\n        currentHeight = this.measureContentHeight(nextContainer, pageContext.repeatingHeight);\n        DomHelpers.appendRowItem(nextContainer, row, null, index, baseClass);\n        if (logFn) {\n          const resolvedLabel = baseClass || "prowitem";\n          logFn(`append ${resolvedLabel} ${index}`);\n        }\n        currentHeight = this.measureContentHeight(nextContainer, pageContext.repeatingHeight);\n        if (this.debug) {\n          console.log(`[printform] Page ${this.currentPage} start: currentHeight=${currentHeight}px, limit=${pageContext.limit}px`);\n        }\n        if (!isPtacRow) {\n          pageContext.isPtacPage = false;\n        }\n        if (!isPaddtRow) {\n          pageContext.isPaddtPage = false;\n        }\n      }\n      if (this.debug) {\n        console.log(`[printform] ===== renderRows END (page ${this.currentPage}, finalHeight=${currentHeight}px) =====`);\n      }\n      return {\n        currentHeight,\n        pageLimit: pageContext.limit,\n        isPtacPage: pageContext.isPtacPage,\n        isPaddtPage: pageContext.isPaddtPage,\n        repeatingHeight: pageContext.repeatingHeight\n      };\n    };\n    FormatterClass.prototype.renderEmptyDocument = function renderEmptyDocument(outputContainer, sections, heights, heightPerPage, logFn) {\n      const container = this.getCurrentPageContainer(outputContainer);\n      const skipRowHeader = false;\n      if (this.debug) {\n        console.log(`[printform] ===== renderEmptyDocument START =====`);\n      }\n      this.ensureFirstPageSections(container, sections, heights, logFn, skipRowHeader);\n      const repeatingHeight = this.computeRepeatingHeightForPage(sections, heights, skipRowHeader);\n      const currentHeight = this.measureContentHeight(container, repeatingHeight);\n      if (this.debug) {\n        console.log(`[printform] Empty document currentHeight=${currentHeight}px, pageLimit=${heightPerPage}px`);\n        console.log(`[printform] ===== renderEmptyDocument END =====`);\n      }\n      return {\n        currentHeight,\n        pageLimit: heightPerPage,\n        isPtacPage: false,\n        isPaddtPage: false,\n        repeatingHeight\n      };\n    };\n  }\n  function attachPaginationSpacingMethods(FormatterClass) {\n    FormatterClass.prototype.prepareNextPage = function prepareNextPage(outputContainer, sections, logFn, pageLimit, currentHeight, footerState, spacerTemplate, skipRowHeader, skipDummyRowItems, repeatingHeight) {\n      const container = this.getCurrentPageContainer(outputContainer);\n      const filledHeight = this.applyRemainderSpacing(\n        container,\n        pageLimit,\n        currentHeight,\n        footerState,\n        spacerTemplate,\n        {\n          skipDummyRowItems,\n          repeatingHeight\n        }\n      );\n      this.appendRepeatingFooters(container, sections, logFn);\n      this.currentPage += 1;\n      this.currentPageContainer = null;\n      this.createNewLogicalPage(outputContainer);\n      const nextContainer = this.getCurrentPageContainer(outputContainer);\n      this.appendRepeatingSections(nextContainer, sections, logFn, skipRowHeader);\n      return filledHeight;\n    };\n    FormatterClass.prototype.applyRemainderSpacing = function applyRemainderSpacing(container, heightPerPage, currentHeight, footerState, spacerTemplate, options) {\n      const skipDummyRowItems = options && options.skipDummyRowItems;\n      const repeatingHeight = options && Number.isFinite(options.repeatingHeight) ? options.repeatingHeight : null;\n      const useCurrentHeight = options && options.useCurrentHeight === true;\n      let workingHeight = normalizeHeight(currentHeight);\n      if (repeatingHeight !== null && !useCurrentHeight) {\n        const measuredTotal = DomHelpers.measureHeightRaw(container);\n        workingHeight = normalizeHeight(measuredTotal - repeatingHeight);\n      }\n      if (this.debug) {\n        console.log(`[printform] ----- applyRemainderSpacing (page ${this.currentPage}) -----`);\n        console.log(`[printform]   heightPerPage: ${heightPerPage}px, currentHeight: ${currentHeight}px`);\n        console.log(`[printform]   skipDummyRowItems: ${skipDummyRowItems}`);\n      }\n      if (!skipDummyRowItems) {\n        workingHeight = applyDummyRowItemsStep(this.config, container, heightPerPage, workingHeight, this.debug);\n      }\n      workingHeight = applyDummyRowStep(this.config, container, heightPerPage, workingHeight, this.debug);\n      const spacerState = applyFooterSpacerWithDummyStep(\n        this.config,\n        container,\n        heightPerPage,\n        workingHeight,\n        skipDummyRowItems,\n        this.debug\n      );\n      workingHeight = spacerState.currentHeight;\n      if (!spacerState.skipFooterSpacer) {\n        applyFooterSpacerStep(\n          this.config,\n          container,\n          heightPerPage,\n          workingHeight,\n          footerState,\n          spacerTemplate,\n          this.debug\n        );\n      }\n      if (this.debug) {\n        console.log(`[printform]   finalHeight after spacing: ${workingHeight}px`);\n        console.log(`[printform] -----------------------------------------`);\n      }\n      return normalizeHeight(workingHeight);\n    };\n  }\n  function attachPaginationFinalizeMethods(FormatterClass) {\n    FormatterClass.prototype.computeHeightPerPage = function computeHeightPerPage(sections, heights) {\n      let available = this.config.papersizeHeight;\n      if (this.debug) {\n        console.log(`[printform] ===== computeHeightPerPage =====`);\n        console.log(`[printform] papersizeHeight (config): ${this.config.papersizeHeight}px`);\n        console.log(`[printform] papersizeWidth (config): ${this.config.papersizeWidth}px`);\n      }\n      if (this.config.repeatHeader && sections.header) {\n        if (this.debug) {\n          console.log(`[printform]   - repeatHeader: ${heights.header}px`);\n        }\n        available -= heights.header;\n      }\n      sections.docInfos.forEach((docInfo) => {\n        if (this.config[docInfo.repeatFlag]) {\n          const h = heights.docInfos[docInfo.key] || 0;\n          if (this.debug) {\n            console.log(`[printform]   - repeat ${docInfo.className}: ${h}px`);\n          }\n          available -= h;\n        }\n      });\n      if (this.config.repeatRowheader && sections.rowHeader) {\n        if (this.debug) {\n          console.log(`[printform]   - repeatRowheader: ${heights.rowHeader}px`);\n        }\n        available -= heights.rowHeader;\n      }\n      sections.footerVariants.forEach((footer) => {\n        if (this.config[footer.repeatFlag]) {\n          const h = heights.footerVariants[footer.key] || 0;\n          if (this.debug) {\n            console.log(`[printform]   - repeat ${footer.className}: ${h}px`);\n          }\n          available -= h;\n        }\n      });\n      if (this.config.repeatFooterLogo && sections.footerLogo) {\n        if (this.debug) {\n          console.log(`[printform]   - repeatFooterLogo: ${heights.footerLogo}px`);\n        }\n        available -= heights.footerLogo;\n      }\n      if (this.config.repeatFooterPagenum && sections.footerPagenum) {\n        const h = heights.footerPagenum || 0;\n        if (this.debug) {\n          console.log(`[printform]   - repeatFooterPagenum: ${h}px`);\n        }\n        available -= h;\n      }\n      if (this.debug) {\n        console.log(`[printform] heightPerPage (available for content): ${Math.max(0, available)}px`);\n        console.log(`[printform] ================================`);\n      }\n      return Math.max(0, available);\n    };\n    FormatterClass.prototype.computeFooterState = function computeFooterState(sections, heights) {\n      const footerLogoHeight = heights.footerLogo || 0;\n      const footerPagenumHeight = heights.footerPagenum || 0;\n      const totalFooterHeight = sections.footerVariants.reduce((sum, footer) => {\n        const height = heights.footerVariants[footer.key] || 0;\n        return sum + height;\n      }, 0);\n      const totalFinal = totalFooterHeight + footerLogoHeight + footerPagenumHeight;\n      const repeatingFooterHeight = sections.footerVariants.reduce((sum, footer) => {\n        const height = heights.footerVariants[footer.key] || 0;\n        return this.config[footer.repeatFlag] ? sum + height : sum;\n      }, 0);\n      let repeating = repeatingFooterHeight;\n      if (this.config.repeatFooterLogo) {\n        repeating += footerLogoHeight;\n      }\n      if (this.config.repeatFooterPagenum) {\n        repeating += footerPagenumHeight;\n      }\n      const nonRepeating = Math.max(0, totalFinal - repeating);\n      return {\n        totalFinal,\n        repeating,\n        nonRepeating\n      };\n    };\n    FormatterClass.prototype.finalizeDocument = function finalizeDocument(outputContainer, sections, heights, footerState, defaultHeightPerPage, renderState, spacerTemplate, logFn) {\n      const baseHeight = renderState ? renderState.currentHeight : 0;\n      const lastPageLimit = renderState && renderState.pageLimit ? renderState.pageLimit : defaultHeightPerPage;\n      const repeatingHeight = renderState && Number.isFinite(renderState.repeatingHeight) ? renderState.repeatingHeight : 0;\n      const skipDummyRowItems = Boolean(\n        renderState && (renderState.isPtacPage && !this.config.insertPtacDummyRowItems || renderState.isPaddtPage && !(this.paddtConfig && this.paddtConfig.insertPaddtDummyRowItems))\n      );\n      const allowance = footerState.totalFinal - footerState.repeating;\n      const heightWithFinalFooters = baseHeight + allowance;\n      if (heightWithFinalFooters <= lastPageLimit) {\n        const container2 = this.getCurrentPageContainer(outputContainer);\n        this.applyRemainderSpacing(\n          container2,\n          lastPageLimit,\n          heightWithFinalFooters,\n          footerState,\n          spacerTemplate,\n          {\n            skipDummyRowItems,\n            repeatingHeight,\n            useCurrentHeight: true\n          }\n        );\n        this.appendFinalFooters(container2, sections, logFn);\n        return;\n      }\n      this.prepareNextPage(\n        outputContainer,\n        sections,\n        logFn,\n        lastPageLimit,\n        baseHeight,\n        footerState,\n        spacerTemplate,\n        false,\n        skipDummyRowItems,\n        repeatingHeight\n      );\n      const finalPageStartHeight = allowance;\n      const container = this.getCurrentPageContainer(outputContainer);\n      const nextRepeatingHeight = this.computeRepeatingHeightForPage(sections, heights, false);\n      this.applyRemainderSpacing(\n        container,\n        defaultHeightPerPage,\n        finalPageStartHeight,\n        footerState,\n        spacerTemplate,\n        {\n          repeatingHeight: nextRepeatingHeight,\n          useCurrentHeight: true\n        }\n      );\n      this.appendFinalFooters(container, sections, logFn);\n    };\n  }\n  function safeSerialize(value) {\n    if (value === null) return "null";\n    if (value === void 0) return "undefined";\n    if (typeof value === "string") return value;\n    if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") return String(value);\n    if (value instanceof Error) {\n      const name = value.name || "Error";\n      const message = value.message || "";\n      return message ? `${name}: ${message}` : name;\n    }\n    try {\n      return JSON.stringify(value);\n    } catch {\n      try {\n        return String(value);\n      } catch {\n        return "[unserializable]";\n      }\n    }\n  }\n  function formatArgs(args) {\n    return Array.from(args).map(safeSerialize).join(" ");\n  }\n  function ensureDebugPanelStyle(doc) {\n    if (!doc || !doc.head) return;\n    const existing = doc.getElementById("printform-debug-panel-style");\n    if (existing) return;\n    const style = doc.createElement("style");\n    style.id = "printform-debug-panel-style";\n    style.textContent = `\n    [data-printform-debug-panel="true"]{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;border:1px solid #ddd;background:#fafafa;color:#111;padding:12px;margin:12px 0;max-width:100%;overflow:auto}\n    [data-printform-debug-panel="true"] .printform-debug-title{font-weight:700;margin-bottom:8px}\n    [data-printform-debug-panel="true"] .printform-debug-meta{font-size:12px;opacity:.85;line-height:1.4;margin-bottom:8px;white-space:pre-wrap}\n    [data-printform-debug-panel="true"] .printform-debug-actions{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px}\n    [data-printform-debug-panel="true"] button{font:inherit;font-size:12px;padding:6px 10px;border:1px solid #bbb;background:#fff;border-radius:6px}\n    [data-printform-debug-panel="true"] button:active{transform:translateY(1px)}\n    [data-printform-debug-panel="true"] .printform-debug-status{font-size:12px;opacity:.8}\n    [data-printform-debug-panel="true"] pre{margin:0;white-space:pre-wrap;word-break:break-word;font-size:12px;line-height:1.35}\n    @media print{[data-printform-debug-panel="true"]{display:none!important}}\n  `.trim();\n    doc.head.appendChild(style);\n  }\n  async function copyTextToClipboard(view, text) {\n    if (!view) return { ok: false, method: "none" };\n    const nav = view.navigator;\n    if (nav && nav.clipboard && typeof nav.clipboard.writeText === "function") {\n      try {\n        await nav.clipboard.writeText(text);\n        return { ok: true, method: "navigator.clipboard.writeText" };\n      } catch {\n      }\n    }\n    const doc = view.document;\n    if (!doc) return { ok: false, method: "none" };\n    const textarea = doc.createElement("textarea");\n    textarea.value = text;\n    textarea.setAttribute("readonly", "true");\n    textarea.style.position = "fixed";\n    textarea.style.left = "-9999px";\n    textarea.style.top = "0";\n    doc.body.appendChild(textarea);\n    textarea.focus();\n    textarea.select();\n    try {\n      const ok = doc.execCommand && doc.execCommand("copy");\n      return { ok: Boolean(ok), method: "document.execCommand(copy)" };\n    } catch {\n      return { ok: false, method: "document.execCommand(copy)" };\n    } finally {\n      doc.body.removeChild(textarea);\n    }\n  }\n  function formatConfigSummary(config) {\n    if (!config) return "";\n    const pick = (key) => config && Object.prototype.hasOwnProperty.call(config, key) ? config[key] : void 0;\n    const parts = [\n      `papersizeWidth=${pick("papersizeWidth")}`,\n      `papersizeHeight=${pick("papersizeHeight")}`,\n      `paperSize=${pick("paperSize")}`,\n      `orientation=${pick("orientation")}`,\n      `dpi=${pick("dpi")}`,\n      `nUp=${pick("nUp")}`,\n      `repeatHeader=${pick("repeatHeader")}`,\n      `repeatRowheader=${pick("repeatRowheader")}`,\n      `repeatFooterLogo=${pick("repeatFooterLogo")}`,\n      `repeatFooterPagenum=${pick("repeatFooterPagenum")}`\n    ];\n    return parts.join(", ");\n  }\n  function createPrintformDebugSession({ enabled, formEl, config }) {\n    const doc = formEl && formEl.ownerDocument ? formEl.ownerDocument : null;\n    const view = doc && doc.defaultView ? doc.defaultView : null;\n    const startMs = Date.now();\n    const lines = [];\n    let installed = false;\n    let originals = null;\n    let removeErrorHandlers = null;\n    const pushLine = (level, args) => {\n      const delta = Date.now() - startMs;\n      const message = formatArgs(args);\n      lines.push(`+${delta}ms [${level}] ${message}`);\n    };\n    const addEventLine = (level, message) => {\n      const delta = Date.now() - startMs;\n      lines.push(`+${delta}ms [${level}] ${message}`);\n    };\n    const install = () => {\n      if (!enabled || installed || !view || !view.console) return;\n      installed = true;\n      const con = view.console;\n      originals = {\n        log: con.log,\n        info: con.info,\n        warn: con.warn,\n        error: con.error\n      };\n      const wrap = (level) => function wrappedConsoleMethod(...args) {\n        pushLine(level, args);\n        const original = originals && originals[level];\n        if (typeof original === "function") {\n          try {\n            original.apply(con, args);\n          } catch {\n          }\n        }\n      };\n      try {\n        con.log = wrap("log");\n        con.info = wrap("info");\n        con.warn = wrap("warn");\n        con.error = wrap("error");\n      } catch {\n        installed = false;\n        originals = null;\n        return;\n      }\n      const onError = (event) => {\n        const message = event && event.message ? event.message : "window.error";\n        addEventLine("error", message);\n      };\n      const onUnhandledRejection = (event) => {\n        const reason = event && event.reason ? safeSerialize(event.reason) : "unhandledrejection";\n        addEventLine("error", `unhandledrejection: ${reason}`);\n      };\n      if (typeof view.addEventListener === "function" && typeof view.removeEventListener === "function") {\n        view.addEventListener("error", onError);\n        view.addEventListener("unhandledrejection", onUnhandledRejection);\n        removeErrorHandlers = () => {\n          view.removeEventListener("error", onError);\n          view.removeEventListener("unhandledrejection", onUnhandledRejection);\n        };\n      }\n      try {\n        con.log("[printform] ===== DEBUG SESSION START =====");\n        con.log(`[printform] time: ${new Date(startMs).toISOString()}`);\n        if (view.navigator && view.navigator.userAgent) {\n          con.log(`[printform] userAgent: ${view.navigator.userAgent}`);\n        }\n        if (typeof view.devicePixelRatio === "number") {\n          con.log(`[printform] devicePixelRatio: ${view.devicePixelRatio}`);\n        }\n        if (typeof view.innerWidth === "number" && typeof view.innerHeight === "number") {\n          con.log(`[printform] viewport: ${view.innerWidth}x${view.innerHeight}`);\n        }\n        if (view.visualViewport) {\n          con.log(`[printform] visualViewport: ${safeSerialize({ width: view.visualViewport.width, height: view.visualViewport.height, scale: view.visualViewport.scale })}`);\n        }\n        con.log(`[printform] config: ${formatConfigSummary(config)}`);\n      } catch {\n      }\n    };\n    const uninstall = () => {\n      if (!installed || !view || !view.console) return;\n      const con = view.console;\n      if (removeErrorHandlers) {\n        try {\n          removeErrorHandlers();\n        } catch {\n        }\n      }\n      if (originals) {\n        con.log = originals.log;\n        con.info = originals.info;\n        con.warn = originals.warn;\n        con.error = originals.error;\n      }\n    };\n    const markEnd = (details) => {\n      if (!enabled || !installed || !view || !view.console) return;\n      const con = view.console;\n      try {\n        con.log("[printform] ===== DEBUG SESSION END =====");\n        if (details && typeof details === "object") {\n          con.log(`[printform] debugSummary: ${safeSerialize(details)}`);\n        }\n      } catch {\n      }\n    };\n    const getText = () => lines.join("\\n");\n    const appendPanel = (outputContainer, details) => {\n      if (!enabled || !doc || !outputContainer) return;\n      ensureDebugPanelStyle(doc);\n      const panel = doc.createElement("div");\n      panel.setAttribute("data-printform-debug-panel", "true");\n      const title = doc.createElement("div");\n      title.className = "printform-debug-title";\n      title.textContent = "PrintForm Debug (data-debug=y)";\n      panel.appendChild(title);\n      const meta = doc.createElement("div");\n      meta.className = "printform-debug-meta";\n      const pageCount = details && Number.isFinite(details.pageCount) ? details.pageCount : null;\n      const formId = formEl && formEl.id ? `#${formEl.id}` : "";\n      const formClass = formEl && typeof formEl.className === "string" ? `.${formEl.className.split(/\\s+/).filter(Boolean).join(".")}` : "";\n      const formLabel = formId || formClass ? `${formId}${formClass}` : "(no id/class)";\n      meta.textContent = [\n        `form: ${formLabel}`,\n        pageCount !== null ? `pages: ${pageCount}` : null,\n        `config: ${formatConfigSummary(config)}`\n      ].filter(Boolean).join("\\n");\n      panel.appendChild(meta);\n      const actions = doc.createElement("div");\n      actions.className = "printform-debug-actions";\n      const copyButton = doc.createElement("button");\n      copyButton.type = "button";\n      copyButton.textContent = "Copy all logs";\n      actions.appendChild(copyButton);\n      const status = doc.createElement("span");\n      status.className = "printform-debug-status";\n      status.textContent = "";\n      actions.appendChild(status);\n      panel.appendChild(actions);\n      const pre = doc.createElement("pre");\n      pre.textContent = getText();\n      panel.appendChild(pre);\n      copyButton.addEventListener("click", async () => {\n        const text = getText();\n        const result = await copyTextToClipboard(view, text);\n        status.textContent = result.ok ? `copied (${result.method})` : `copy failed (${result.method})`;\n      });\n      outputContainer.appendChild(panel);\n    };\n    return {\n      install,\n      markEnd,\n      uninstall,\n      appendPanel,\n      getText\n    };\n  }\n  class PrintFormFormatter {\n    constructor(formEl, config) {\n      this.formEl = formEl;\n      this.config = config;\n      this.debug = Boolean(config.debug);\n      this.nUp = Math.max(1, Math.floor(Number(config.nUp || 1)));\n      this.showLogicalPageNumber = config.showLogicalPageNumber !== false;\n      this.showPhysicalPageNumber = Boolean(config.showPhysicalPageNumber);\n      this.paddtConfig = getPaddtConfig(formEl, {});\n      this.paddtDebug = Boolean(this.paddtConfig.paddtDebug);\n      this.currentPage = 1;\n      this.currentPhysicalPage = 0;\n      this.pagesInCurrentPhysical = 0;\n      this.currentPhysicalWrapper = null;\n      this.currentPageContainer = null;\n      this.logicalPageNumberClones = [];\n      this.physicalPageNumberClones = [];\n      this.logicalPageToPhysicalPage = [];\n      if (this.debug) {\n        console.log(`[printform] ===== PrintFormFormatter initialized =====`);\n        console.log(`[printform] debug mode: ON`);\n        console.log(`[printform] config.debug raw value: ${config.debug}`);\n      }\n    }\n    log(message) {\n      if (this.debug) {\n        console.log(`[printform] ${message}`);\n      }\n    }\n    format() {\n      const debugSession = createPrintformDebugSession({\n        enabled: this.debug,\n        formEl: this.formEl,\n        config: this.config\n      });\n      debugSession.install();\n      const logFn = this.debug ? this.log.bind(this) : null;\n      try {\n        const container = this.initializeOutputContainer();\n        this.ensureCurrentPageContainer(container);\n        const sections = this.collectSections();\n        const heights = this.measureSections(sections);\n        const footerSpacerTemplate = this.createFooterSpacerTemplate();\n        this.markSectionsProcessed(sections);\n        const footerState = this.computeFooterState(sections, heights);\n        const heightPerPage = this.computeHeightPerPage(sections, heights);\n        const renderState = sections.rows.length ? this.renderRows(\n          container,\n          sections,\n          heights,\n          footerState,\n          heightPerPage,\n          footerSpacerTemplate,\n          logFn\n        ) : this.renderEmptyDocument(\n          container,\n          sections,\n          heights,\n          heightPerPage,\n          logFn\n        );\n        this.finalizeDocument(\n          container,\n          sections,\n          heights,\n          footerState,\n          heightPerPage,\n          renderState,\n          footerSpacerTemplate,\n          logFn\n        );\n        if (this.paddtRows && this.paddtRows.length) {\n          this.currentPage += 1;\n          this.currentPageContainer = null;\n          this.initializePhysicalWrapper(container);\n          this.createNewLogicalPage(container);\n          var paddtDocinfoFlags = {\n            docInfo: this.paddtConfig.repeatPaddtDocinfo,\n            docInfo002: this.paddtConfig.repeatPaddtDocinfo002,\n            docInfo003: this.paddtConfig.repeatPaddtDocinfo003,\n            docInfo004: this.paddtConfig.repeatPaddtDocinfo004,\n            docInfo005: this.paddtConfig.repeatPaddtDocinfo005\n          };\n          var paddtDocInfos = sections.docInfos.filter(function(di) {\n            var flag = paddtDocinfoFlags[di.key];\n            return flag === void 0 ? true : !!flag;\n          });\n          const paddtSections = {\n            header: sections.header,\n            docInfos: paddtDocInfos,\n            rowHeader: sections.rowHeader,\n            // Exclude business footers (e.g. pfooter/pfooter002...), keep only logo and page number\n            footerVariants: [],\n            footerLogo: sections.footerLogo,\n            footerPagenum: sections.footerPagenum,\n            rows: this.paddtRows\n          };\n          const paddtFooterState = this.computeFooterState(paddtSections, heights);\n          const paddtHeightPerPage = this.computeHeightPerPage(paddtSections, heights);\n          const paddtRenderState = this.renderRows(\n            container,\n            paddtSections,\n            heights,\n            paddtFooterState,\n            paddtHeightPerPage,\n            footerSpacerTemplate,\n            logFn\n          );\n          this.finalizeDocument(\n            container,\n            paddtSections,\n            heights,\n            paddtFooterState,\n            paddtHeightPerPage,\n            paddtRenderState,\n            footerSpacerTemplate,\n            logFn\n          );\n        }\n        this.updatePageNumberTotals();\n        const allPages = container.querySelectorAll(".printform_page");\n        if (this.debug) {\n          console.log(`[printform] Finalizing heights for ${allPages.length} pages...`);\n        }\n        allPages.forEach((page, index) => {\n          this.finalizePageHeight(page);\n          if (this.debug) {\n            const heightStyle = page.style.height || "(auto)";\n            console.log(`[printform]   Page ${index + 1}: height style = ${heightStyle}`);\n          }\n        });\n        debugSession.markEnd({ pageCount: allPages.length });\n        debugSession.appendPanel(container, { pageCount: allPages.length });\n        container.classList.remove("printform_formatter");\n        container.classList.add("printform_formatter_processed");\n        this.formEl.remove();\n        return container;\n      } finally {\n        debugSession.uninstall();\n      }\n    }\n  }\n  attachPageMethods(PrintFormFormatter);\n  attachSectionMethods(PrintFormFormatter);\n  attachRowTypeMethods(PrintFormFormatter);\n  attachPaddtSegmentMethods(PrintFormFormatter);\n  attachPtacSegmentMethods(PrintFormFormatter);\n  attachRenderingMethods(PrintFormFormatter);\n  attachPaginationContextMethods(PrintFormFormatter);\n  attachPaginationDummyMethods(PrintFormFormatter);\n  attachPaginationRenderMethods(PrintFormFormatter);\n  attachPaginationSpacingMethods(PrintFormFormatter);\n  attachPaginationFinalizeMethods(PrintFormFormatter);\n  function isMobileDevice() {\n    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";\n    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);\n  }\n  function getDeviceDelay() {\n    return isMobileDevice() ? 50 : 1;\n  }\n  function withDividerClassAppend(globalScope2, classAppend, fn) {\n    const prior = globalScope2.__printFormDividerClassAppend;\n    globalScope2.__printFormDividerClassAppend = typeof classAppend === "string" ? classAppend : "";\n    try {\n      return fn();\n    } finally {\n      if (prior === void 0) {\n        delete globalScope2.__printFormDividerClassAppend;\n      } else {\n        globalScope2.__printFormDividerClassAppend = prior;\n      }\n    }\n  }\n  function pauseInMilliseconds(time) {\n    return new Promise((resolve, reject) => {\n      if (typeof time === "number" && time > 0) {\n        setTimeout(resolve, time);\n      } else {\n        reject(new Error("Invalid time value"));\n      }\n    });\n  }\n  async function formatAllPrintForms(overrides = {}) {\n    const globalScope2 = typeof window !== "undefined" ? window : globalThis;\n    if (globalScope2.__printFormProcessing) {\n      return;\n    }\n    if (!overrides.force && globalScope2.__printFormProcessed) {\n      return;\n    }\n    globalScope2.__printFormProcessing = true;\n    try {\n      const doc = globalScope2.document;\n      if (!doc) return;\n      const forms = Array.from(doc.querySelectorAll(".printform"));\n      for (let index = 0; index < forms.length; index += 1) {\n        const formEl = forms[index];\n        const perFormOverrides = { ...overrides };\n        if (perFormOverrides.divPageBreakBeforeClassAppend === void 0 && formEl && formEl.dataset) {\n          const datasetValue = formEl.dataset.divPageBreakBeforeClassAppend;\n          if (typeof datasetValue === "string" && datasetValue.trim()) {\n            perFormOverrides.divPageBreakBeforeClassAppend = datasetValue.trim();\n          }\n        }\n        const dividerClassAppend = perFormOverrides.divPageBreakBeforeClassAppend;\n        const config = getPrintformConfig(formEl, perFormOverrides);\n        try {\n          await pauseInMilliseconds(getDeviceDelay());\n        } catch (error) {\n          console.error("pauseInMilliseconds error", error);\n        }\n        try {\n          const formatted = withDividerClassAppend(globalScope2, dividerClassAppend, () => {\n            const formatter = new PrintFormFormatter(formEl, config);\n            return formatter.format();\n          });\n          if (index > 0 && formatted && formatted.parentNode) {\n            formatted.parentNode.insertBefore(DomHelpers.createPageBreakDivider(dividerClassAppend), formatted);\n          }\n        } catch (error) {\n          console.error("printform format error", error);\n        }\n      }\n      globalScope2.__printFormProcessed = true;\n    } finally {\n      globalScope2.__printFormProcessing = false;\n    }\n  }\n  function formatSinglePrintForm(formEl, overrides = {}) {\n    const globalScope2 = typeof window !== "undefined" ? window : globalThis;\n    const perFormOverrides = { ...overrides };\n    if (perFormOverrides.divPageBreakBeforeClassAppend === void 0 && formEl && formEl.dataset) {\n      const datasetValue = formEl.dataset.divPageBreakBeforeClassAppend;\n      if (typeof datasetValue === "string" && datasetValue.trim()) {\n        perFormOverrides.divPageBreakBeforeClassAppend = datasetValue.trim();\n      }\n    }\n    const dividerClassAppend = perFormOverrides.divPageBreakBeforeClassAppend;\n    const config = getPrintformConfig(formEl, perFormOverrides);\n    return withDividerClassAppend(globalScope2, dividerClassAppend, () => {\n      const formatter = new PrintFormFormatter(formEl, config);\n      return formatter.format();\n    });\n  }\n  const api = {\n    formatAll: formatAllPrintForms,\n    format: formatSinglePrintForm,\n    DEFAULT_CONFIG,\n    DEFAULT_PADDT_CONFIG\n  };\n  const globalScope = typeof window !== "undefined" ? window : null;\n  if (globalScope) {\n    if (globalScope.__printFormScriptLoaded__) {\n      globalScope.PrintForm = globalScope.PrintForm || api;\n    } else {\n      globalScope.__printFormScriptLoaded__ = true;\n      globalScope.PrintForm = globalScope.PrintForm || {};\n      Object.assign(globalScope.PrintForm, api);\n      const doc = globalScope.document;\n      if (doc && doc.addEventListener) {\n        let ensureReadyAndFormat = function() {\n          const isMobile = isMobileDevice();\n          const delay = isMobile ? 150 : 50;\n          if (doc.readyState === "complete") {\n            setTimeout(() => {\n              formatAllPrintForms();\n            }, delay);\n          } else {\n            globalScope.addEventListener("load", () => {\n              setTimeout(() => {\n                formatAllPrintForms();\n              }, delay);\n            });\n          }\n        };\n        doc.addEventListener("DOMContentLoaded", ensureReadyAndFormat);\n      }\n    }\n  }\n  return api;\n}();\n';
const escapeHtml = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const titleCase$1 = (value) => value.split(/[_\s]+/).filter(Boolean).map((token) => token.charAt(0).toUpperCase() + token.slice(1)).join(" ");
const dedupeStrings = (values) => {
  const seen = /* @__PURE__ */ new Set();
  const output = [];
  for (const value of values) {
    const normalized = String(value ?? "").trim();
    if (!normalized) {
      continue;
    }
    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(normalized);
  }
  return output;
};
const SEMANTIC_STOP_WORDS = /* @__PURE__ */ new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "into",
  "over",
  "under",
  "than",
  "are",
  "was",
  "were",
  "been",
  "being",
  "has",
  "have",
  "had",
  "but",
  "can",
  "will",
  "should",
  "could",
  "would",
  "their",
  "there",
  "them",
  "then",
  "such",
  "very",
  "more",
  "most",
  "some",
  "many",
  "few",
  "our",
  "your",
  "its",
  "it",
  "a",
  "an",
  "of",
  "to",
  "in",
  "on",
  "by",
  "or",
  "is",
  "as",
  "at",
  "be",
  "we",
  "they",
  "these",
  "those"
]);
const tokenizeSemanticText = (value) => String(value ?? "").toLowerCase().replace(/<[^>]+>/g, " ").replace(/[^a-z0-9\s]+/g, " ").split(/\s+/).map((token) => token.trim()).filter((token) => token.length > 2 && !SEMANTIC_STOP_WORDS.has(token));
const isSemanticallySimilar = (left, right, threshold = 0.72) => {
  const normalizedLeft = String(left ?? "").trim().toLowerCase();
  const normalizedRight = String(right ?? "").trim().toLowerCase();
  if (!normalizedLeft || !normalizedRight) {
    return false;
  }
  if (normalizedLeft === normalizedRight) {
    return true;
  }
  const leftTokens = new Set(tokenizeSemanticText(left));
  const rightTokens = new Set(tokenizeSemanticText(right));
  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return false;
  }
  let overlap = 0;
  leftTokens.forEach((token) => {
    if (rightTokens.has(token)) {
      overlap += 1;
    }
  });
  return overlap / Math.min(leftTokens.size, rightTokens.size) >= threshold;
};
const filterBusinessFindingSections = (sections, existingClaims) => {
  const seenClaims = [...existingClaims];
  return sections.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      const claim = String(item.claim ?? "").trim();
      if (!claim) {
        return false;
      }
      if (seenClaims.some((existing) => isSemanticallySimilar(existing, claim))) {
        return false;
      }
      seenClaims.push(claim);
      return true;
    })
  })).filter((section) => section.items.length > 0);
};
const chunk = (items, size) => {
  const groups = [];
  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }
  return groups;
};
const isLongText = (value, threshold = 220) => String(value ?? "").trim().length > threshold;
const normalizeReportTemplate = (template) => {
  if (template === "audit_appendix") {
    return "audit_appendix";
  }
  if (template === "management_review") {
    return "management_review";
  }
  return "executive_brief";
};
const renderBadge = (label, tone) => `<span class="badge badge-${tone}">${escapeHtml(label)}</span>`;
const renderReadinessLabel = (readiness) => {
  if (readiness === "ready") {
    return "Ready for bounded analyst synthesis";
  }
  if (readiness === "partial") {
    return "Usable with material caveats";
  }
  return "Not ready for analyst synthesis";
};
const renderList = (items, className = "bullet-list") => {
  if (items.length === 0) {
    return '<p class="empty-state">None.</p>';
  }
  return `<ul class="${className}">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
};
const renderEvidenceRefs = (evidenceRefs) => {
  if (evidenceRefs.length === 0) {
    return '<p class="meta-line">Evidence: none</p>';
  }
  return `<p class="meta-line"><strong>Evidence:</strong> ${evidenceRefs.map((ref) => `<code>${escapeHtml(ref)}</code>`).join(", ")}</p>`;
};
const renderStructuralSignals = (signals) => {
  const items = [];
  if (typeof signals.rowExpansionRatio === "number") {
    items.push(`Row expansion ratio: ${signals.rowExpansionRatio.toFixed(1)}x`);
  }
  if (signals.hasMetadataRows) {
    items.push("Metadata rows were detected in the source report.");
  }
  if (signals.hasMultiRowHeader) {
    items.push("A multi-row header structure was detected.");
  }
  if (signals.usedFallbackContext) {
    items.push("Report context required fallback recovery.");
  }
  return items;
};
const renderFallbackTable = (visual) => {
  if (!visual.fallbackTable) {
    return '<p class="empty-state">No chartable rows were available for this finding.</p>';
  }
  return `
<div class="table-wrap compact-table">
  <table>
    <thead>
      <tr>
        ${visual.fallbackTable.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}
      </tr>
    </thead>
    <tbody>
      ${visual.fallbackTable.rows.map((row) => `
        <tr>${row.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>
      `).join("")}
    </tbody>
  </table>
</div>
`;
};
const renderTableShell = (className, content, options) => `
<table cellpadding="0" cellspacing="0" border="0" class="paper_width ${className} report-shell-table"${(options == null ? void 0 : options.id) ? ` id="${escapeHtml(options.id)}"` : ""}>
  <colgroup>
    <col class="report-shell-col report-shell-col--gutter" />
    <col class="report-shell-col report-shell-col--content" />
    <col class="report-shell-col report-shell-col--gutter" />
  </colgroup>
  <tr>
    <td class="report-shell-gutter"></td>
    <td class="report-shell-content-cell">
      <div class="report-shell-content">
        ${content}
      </div>
    </td>
    <td class="report-shell-gutter"></td>
  </tr>
</table>
`;
const renderProwHeader = (eyebrow, title, id) => `
${renderTableShell("prowheader", `
  <div class="section-heading">
    <div>
      <p class="eyebrow">${escapeHtml(eyebrow)}</p>
      <h2>${escapeHtml(title)}</h2>
    </div>
  </div>
`, id ? { id } : void 0)}`;
const renderProwItem = (content, options) => `
${renderTableShell(
  `prowitem report-row${(options == null ? void 0 : options.extraClassName) ? ` ${options.extraClassName}` : ""}${(options == null ? void 0 : options.pageBreakBefore) ? " tb_page_break_before" : ""}`,
  `
  <div class="report-row__body">
    ${content}
  </div>
`,
  (options == null ? void 0 : options.id) ? { id: options.id } : void 0
)}
`;
const renderParagraphBlock = (label, value) => `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`;
const renderTextParagraph = (value) => `<p>${escapeHtml(value)}</p>`;
const renderNumberedList = (items) => items.length > 0 ? `<ol class="recommended-actions-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>` : "";
const renderPtacSection = (title, eyebrow, paragraphs, options) => {
  const normalized = paragraphs.map((item) => String(item ?? "").trim()).filter(Boolean);
  if (normalized.length === 0) {
    return "";
  }
  return `
${renderTableShell(`ptac narrative-flow${(options == null ? void 0 : options.pageBreakBefore) ? " tb_page_break_before" : ""}`, `
  <div class="narrative-sheet">
    <p class="eyebrow">${escapeHtml(eyebrow)}</p>
    <h2>${escapeHtml(title)}</h2>
    ${normalized.join("")}
  </div>
`, (options == null ? void 0 : options.id) ? { id: options.id } : void 0)}
`;
};
const renderCompactNarrativeSection = (title, eyebrow, paragraphs, options) => {
  const normalized = paragraphs.map((item) => String(item ?? "").trim()).filter(Boolean);
  if (normalized.length === 0) {
    return "";
  }
  return renderProwItem(`
      <article class="supporting-card compact-card section-intro-card">
        <p class="eyebrow">${escapeHtml(eyebrow)}</p>
        <h2>${escapeHtml(title)}</h2>
        ${normalized.join("")}
      </article>
    `, (options == null ? void 0 : options.id) ? { id: options.id } : void 0);
};
const renderPaddtSection = (title, eyebrow, paragraphs, options) => {
  const normalized = paragraphs.map((item) => String(item ?? "").trim()).filter(Boolean);
  if (normalized.length === 0) {
    return "";
  }
  return `
${renderTableShell("paddt appendix-flow", `
  <div class="narrative-sheet">
    <p class="eyebrow">${escapeHtml(eyebrow)}</p>
    <h2>${escapeHtml(title)}</h2>
    ${normalized.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
  </div>
`, (options == null ? void 0 : options.id) ? { id: options.id } : void 0)}
`;
};
const buildDistinctParagraphBlocks = (entries, maxItems) => {
  const selected = [];
  entries.forEach((entry) => {
    const value = String(entry.value ?? "").trim();
    if (!value) {
      return;
    }
    if (selected.some((item) => isSemanticallySimilar(item.value, value))) {
      return;
    }
    if (selected.length >= maxItems) {
      return;
    }
    selected.push({ label: entry.label, value });
  });
  return selected.map((entry) => renderParagraphBlock(entry.label, entry.value));
};
const reportStylesheet = `
    :root {
      color-scheme: light;
      --bg: #f0f2f5;
      --paper: #ffffff;
      --paper-soft: #f8f9fb;
      --ink: #1a1f2e;
      --muted: #64748b;
      --line: #e2e8f0;
      --line-strong: #cbd5e1;
      --accent: #2563eb;
      --accent-soft: #eff6ff;
      --warning: #b45309;
      --danger: #dc2626;
      --good: #16a34a;
    }
    * { box-sizing: border-box; }
    html {
      -webkit-text-size-adjust: 100%;
      text-size-adjust: 100%;
    }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 13px;
      color: var(--ink);
      background: var(--bg);
      line-height: 1.6;
    }
    .viewer-toolbar {
      position: sticky;
      top: 0;
      z-index: 20;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding: 10px 24px;
      border-bottom: 1px solid var(--line);
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(12px);
    }
    .toolbar-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .toolbar-button {
      appearance: none;
      border: 1px solid var(--accent);
      background: var(--accent);
      color: #fff;
      border-radius: 8px;
      padding: 0.5rem 1.25rem;
      font: inherit;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s, box-shadow 0.15s;
    }
    .toolbar-button:hover {
      background: #1d4ed8;
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
    }
    .toolbar-button.secondary {
      background: transparent;
      color: var(--ink);
      border-color: var(--line-strong);
    }
    .toolbar-button.secondary:hover {
      background: var(--paper-soft);
      box-shadow: none;
    }
    main.report-shell {
      max-width: 820px;
      margin: 0 auto;
      padding: 24px 16px 40px;
    }
    .paper_width,
    .printform,
    .printform_formatter_processed,
    .physical_page_wrapper,
    .printform_page {
      width: 780px;
      max-width: 100%;
    }
    .printform,
    .printform_formatter_processed {
      margin: 0 auto;
    }
    .printform_page {
      position: relative;
      margin: 0 auto 20px;
      padding-top: 24px;
      padding-bottom: 48px;
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 8px 24px rgba(0, 0, 0, 0.06);
      overflow: hidden;
    }
    body[data-printform-pages-ready="y"] .physical_page_wrapper,
    body[data-printform-pages-ready="y"] .printform_page {
      min-height: 1080px;
    }
    .div_page_break_before { height: 18px; }
    .pheader, .pheader_processed,
    .pdocinfo, .pdocinfo_processed,
    .prowheader, .prowheader_processed,
    .prowitem, .prowitem_processed,
    .ptac, .ptac_processed,
    .paddt, .paddt_processed,
    .pfooter_pagenum, .pfooter_pagenum_processed {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .pheader, .pheader_processed,
    .pdocinfo, .pdocinfo_processed,
    .prowitem, .prowitem_processed,
    .ptac, .ptac_processed,
    .paddt, .paddt_processed {
      padding: 0 0 14px;
    }
    .report-shell-table,
    .report-shell-table_processed {
      table-layout: fixed;
      border-collapse: collapse;
      background: transparent;
      width: 780px;
    }
    .report-shell-col--gutter {
      width: 24px;
    }
    .report-shell-col--content {
      width: auto;
    }
    .report-shell-table td,
    .report-shell-table_processed td {
      padding: 0;
      border-bottom: none;
      vertical-align: top;
      background: transparent;
    }
    .report-shell-gutter,
    .report-shell-gutter_processed {
      width: 24px;
    }
    .report-shell-content {
      padding-bottom: 16px;
    }
    .report-header-card {
      border: none;
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      color: #f1f5f9;
      border-radius: 10px;
      padding: 28px 24px 24px;
    }
    .report-header-card .eyebrow { color: #94a3b8; font-size: 10px; letter-spacing: 0.22em; }
    .report-header-card h1 { color: #ffffff; font-size: 22px; letter-spacing: -0.01em; }
    .report-header-card p { color: #cbd5e1; }
    .report-header-card .meta-line { color: #64748b; font-size: 10px; }
    .report-header-card .badge { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.12); color: #e2e8f0; }
    .report-header-card .badge-good { color: #4ade80; border-color: rgba(74,222,128,0.3); background: rgba(74,222,128,0.1); }
    .report-header-card .badge-warning { color: #fbbf24; border-color: rgba(251,191,36,0.3); background: rgba(251,191,36,0.1); }
    .report-header-card .badge-danger { color: #f87171; border-color: rgba(248,113,113,0.3); background: rgba(248,113,113,0.1); }
    .report-header-card .badge-neutral { color: #94a3b8; border-color: rgba(148,163,184,0.2); }
    .report-header-card .hero-stat { border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); border-radius: 8px; }
    .report-header-card .hero-stat .eyebrow { color: #94a3b8; font-size: 10px; }
    .report-header-card .hero-stat-value { color: #ffffff; font-size: 20px; }
    .docinfo-card,
    .supporting-card,
    .narrative-sheet,
    .kpi-card,
    .chart-card {
      border: 1px solid var(--line);
      background: var(--paper-soft);
      border-radius: 8px;
    }
    .docinfo-card,
    .narrative-sheet {
      padding: 20px 22px;
    }
    .supporting-card,
    .kpi-card {
      padding: 16px;
    }
    .chart-card {
      padding: 16px;
      background: var(--paper);
    }
    .pfooter_pagenum, .pfooter_pagenum_processed {
      position: absolute;
      right: 0;
      bottom: 18px;
      left: 0;
      padding: 0;
      color: var(--muted);
      font-size: 11px;
    }
    .page-number-shell {
      text-align: right;
    }
    h1, h2, h3, h4 {
      margin: 0 0 8px;
      line-height: 1.25;
    }
    h1 { font-size: 22px; font-weight: 700; letter-spacing: -0.01em; }
    h2 { font-size: 16px; font-weight: 700; }
    h3 { font-size: 14px; font-weight: 600; }
    h4 {
      font-size: 11px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 600;
    }
    p { margin: 0 0 10px; }
    p:last-child { margin-bottom: 0; }
    code {
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 11px;
      background: rgba(100, 116, 139, 0.08);
      padding: 0.1rem 0.3rem;
      border-radius: 4px;
    }
    .eyebrow {
      margin: 0 0 8px;
      color: var(--muted);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }
    .meta-line {
      color: var(--muted);
      font-size: 11px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.65rem;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      border: 1px solid transparent;
      background: var(--paper-soft);
    }
    .badge-neutral { color: var(--muted); border-color: var(--line); }
    .badge-good { color: var(--good); border-color: rgba(22, 163, 74, 0.2); background: rgba(22, 163, 74, 0.06); }
    .badge-warning { color: var(--warning); border-color: rgba(180, 83, 9, 0.2); background: rgba(180, 83, 9, 0.06); }
    .badge-danger { color: var(--danger); border-color: rgba(220, 38, 38, 0.18); background: rgba(220, 38, 38, 0.06); }
    .badge-stack {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 12px;
    }
    .hero-stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      margin-top: 16px;
    }
    .hero-stat {
      border: 1px solid var(--line);
      background: #fff;
      padding: 12px 14px;
      border-radius: 8px;
    }
    .hero-stat-value {
      font-size: 20px;
      font-weight: 700;
      margin-top: 4px;
    }
    .docinfo-card {
      display: grid;
      gap: 12px;
    }
    .contents-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
    }
    .contents-item {
      display: flex;
      align-items: center;
      padding: 10px 12px;
      border: 1px solid var(--line);
      border-radius: 6px;
      color: var(--ink);
      text-decoration: none;
      background: #fff;
      font-size: 12px;
      font-weight: 600;
      transition: border-color 0.15s, background 0.15s;
    }
    .contents-item:hover {
      border-color: var(--accent);
      background: var(--accent-soft);
      color: var(--accent);
    }
    .section-heading {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: flex-end;
      padding: 0 24px 8px;
      margin-top: 4px;
    }
    .report-row__body {
      padding: 0;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }
    .kpi-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
      margin-bottom: 6px;
    }
    .kpi-value {
      font-size: 26px;
      font-weight: 700;
      margin-bottom: 6px;
      color: var(--ink);
    }
    .kpi-value-good { color: var(--good); }
    .kpi-value-warning { color: var(--warning); }
    .kpi-value-neutral { color: var(--ink); }
    .kpi-note {
      color: var(--muted);
      font-size: 11px;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: flex-start;
      margin-bottom: 8px;
    }
    .visual-surface {
      border: 1px solid var(--line);
      background: #fff;
      padding: 14px;
      border-radius: 6px;
    }
    .visual-surface svg {
      width: 100%;
      height: auto;
      display: block;
    }
    .narrative-grid--short {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }
    .chart-warning {
      margin-top: 10px;
    }
    .bullet-list, .compact-list {
      margin: 0;
      padding-left: 18px;
    }
    .compact-list li, .bullet-list li {
      margin-bottom: 4px;
    }
    .empty-state {
      color: var(--muted);
      font-style: italic;
    }
    .finding-high { border-left: 4px solid var(--good); }
    .finding-medium { border-left: 3px solid var(--warning); }
    .finding-low { border-left: 3px solid var(--line); }
    .table-wrap {
      overflow-x: auto;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #fff;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: #fff;
    }
    th, td {
      text-align: left;
      padding: 10px 12px;
      border-bottom: 1px solid var(--line);
      vertical-align: top;
    }
    th {
      background: var(--paper-soft);
      color: var(--muted);
      font-size: 11px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    tr:last-child td { border-bottom: none; }
    .recommended-actions-list {
      counter-reset: action;
      list-style: none;
      padding-left: 0;
      margin: 0;
    }
    .recommended-actions-list li {
      counter-increment: action;
      padding: 0.5em 0 0.5em 2em;
      position: relative;
      line-height: 1.6;
      border-bottom: 1px solid var(--line);
    }
    .recommended-actions-list li:last-child {
      border-bottom: none;
    }
    .recommended-actions-list li::before {
      content: counter(action) ".";
      position: absolute;
      left: 0;
      font-weight: 700;
      color: var(--accent);
    }
    .caveat-notice {
      padding: 10px 14px;
      border: 1px solid rgba(180, 83, 9, 0.2);
      border-radius: 6px;
      background: rgba(180, 83, 9, 0.04);
      font-size: 11px;
      color: #92400e;
    }
    .caveat-notice h4 {
      color: #92400e;
      font-size: 11px;
      margin-bottom: 4px;
    }
    .section-intro-card h2 {
      color: var(--accent);
    }
    @media (max-width: 960px) {
      main.report-shell {
        max-width: none;
        padding: 12px;
      }
      .paper_width,
      .printform,
      .printform_formatter_processed,
      .physical_page_wrapper,
      .printform_page {
        width: calc(100vw - 24px);
      }
      .contents-grid,
      .hero-stats,
      .kpi-grid,
      .narrative-grid--short {
        grid-template-columns: 1fr;
      }
    }
    @media (max-width: 720px) {
      .viewer-toolbar {
        align-items: flex-start;
        flex-direction: column;
      }
      .card-header {
        flex-direction: column;
      }
      .badge-stack {
        justify-content: flex-start;
      }
    }
    @media print {
      @page {
        size: A4 portrait;
        margin: 0;
      }
      body { background: #fff; }
      .viewer-toolbar { display: none !important; }
      main.report-shell {
        max-width: none;
        padding: 0;
        margin: 0;
      }
      .printform_page {
        width: auto;
        margin: 0;
        border: none;
        box-shadow: none;
        page-break-after: always;
      }
      .hero-stats {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
      .contents-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
      .kpi-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
      .narrative-grid--short {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
      .printform_page {
        border-radius: 0;
        border: none;
        box-shadow: none;
      }
      .report-header-card {
        border-radius: 0;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .printform_page:last-child { page-break-after: auto; }
      .div_page_break_before { display: none; }
    }
`;
const getShellText = (language) => {
  if (language === "Mandarin") {
    return {
      viewer: "分析报告查看器",
      exportPdf: "导出 PDF",
      close: "关闭",
      preparedBy: "由 AI 分析生成",
      reportId: "报告 ID",
      readiness: "可交付性",
      confidence: "置信度",
      generated: "生成时间",
      documentMap: "文档导航",
      contents: "目录",
      managementSummary: "管理摘要",
      overallPosition: "总体结论",
      topBusinessImplication: "主要业务含义",
      mainCaution: "主要注意事项",
      deliveryReadiness: "交付就绪度",
      whyThisRating: "为何是这个评级",
      support: "支持信号",
      risks: "风险信号",
      structuralRiskSignals: "结构性风险信号",
      boardSnapshot: "管理层快照",
      kpiSnapshot: "KPI 快照",
      decisionEvidence: "决策证据",
      keyFindings: "关键发现",
      decisionGuardrails: "风险与限制",
      recommendedActions: "建议动作",
      whatToDoNext: "下一步",
      traceability: "可追溯性",
      whatItShows: "图表说明",
      whyItMatters: "业务意义",
      caveat: "注意事项",
      openQuestions: "未决分歧",
      appendixHighlights: "附录亮点",
      evidenceCatalog: "证据目录",
      excludedEvidence: "已排除证据",
      warningBannerTitle: "此报告可生成，但必须带风险提示使用。",
      warningBannerPrefix: "生成原因",
      excludedCount: "已排除证据数",
      keyFinding: "关键发现",
      dataTable: "数据表",
      chart: "图表",
      evidenceReferences: "证据引用数",
      topExcludedItem: "主要排除项",
      preparationVerification: "准备与校验",
      workflowStatus: "工作流状态",
      datasetShape: "数据形态",
      generationBlockers: "生成阻塞项",
      primaryVisualSupport: "该数值来自当前选用图表中的主要指标。",
      supportingDetailAvailable: "更具体的说明已在下方关键发现中呈现。",
      emptyFindings: "当前证据不足以生成具体发现。请添加更多分析卡片或运行更多查询以丰富证据。",
      emptyRisks: "未发现明确的风险或限制条件。",
      emptyActions: "当前没有建议的后续操作。"
    };
  }
  return {
    viewer: "Analyst Report Viewer",
    exportPdf: "Export PDF",
    close: "Close",
    preparedBy: "Prepared by AI Analysis",
    reportId: "Report ID",
    readiness: "Readiness",
    confidence: "Confidence",
    generated: "Generated",
    documentMap: "Document Map",
    contents: "Contents",
    managementSummary: "Management Summary",
    overallPosition: "Overall Position",
    topBusinessImplication: "Top Business Implication",
    mainCaution: "Main Caution",
    deliveryReadiness: "Delivery Readiness",
    whyThisRating: "Why this rating",
    support: "Support",
    risks: "Risks",
    structuralRiskSignals: "Structural risk signals",
    boardSnapshot: "Board Snapshot",
    kpiSnapshot: "KPI Snapshot",
    decisionEvidence: "Decision Evidence",
    keyFindings: "Key Findings",
    decisionGuardrails: "Decision Guardrails",
    recommendedActions: "Recommended Actions",
    whatToDoNext: "What To Do Next",
    traceability: "Traceability",
    whatItShows: "What it shows",
    whyItMatters: "Why it matters",
    caveat: "Caveat",
    openQuestions: "Open Questions",
    appendixHighlights: "Appendix Highlights",
    evidenceCatalog: "Evidence Catalog",
    excludedEvidence: "Excluded Evidence",
    warningBannerTitle: "This report is deliverable only with explicit caveats.",
    warningBannerPrefix: "Generation reason",
    excludedCount: "Excluded evidence",
    keyFinding: "Key Finding",
    dataTable: "Data table",
    chart: "Chart",
    evidenceReferences: "Evidence references",
    topExcludedItem: "Top excluded item",
    preparationVerification: "Preparation & Verification",
    workflowStatus: "Workflow status",
    datasetShape: "Dataset shape",
    generationBlockers: "Generation blockers",
    primaryVisualSupport: "Primary value highlighted by the selected visual.",
    supportingDetailAvailable: "Supporting detail is summarized in the finding cards below.",
    emptyFindings: "Not enough evidence to produce specific findings. Add more analysis cards or run additional queries to strengthen the evidence base.",
    emptyRisks: "No explicit risks or caveats were identified.",
    emptyActions: "No recommended follow-up actions at this time."
  };
};
const REASON_CODE_LABELS = {
  narrative_ineligible: "Not suitable for narrative reporting",
  helper_exposure: "Contains helper/system columns",
  low_business_confidence: "Low business meaning confidence",
  aggregation_quality_warning: "Aggregation quality concern",
  fallback_plan: "Generated from fallback plan"
};
const humanizeReasonCode = (code) => REASON_CODE_LABELS[code] ?? titleCase(code.replace(/_/g, " "));
const titleCase = (value) => value.split(/[_\s]+/).filter(Boolean).map((token) => token.charAt(0).toUpperCase() + token.slice(1)).join(" ");
const renderManagementFindingSentence = (claim, caveat) => `${claim.trim().replace(/\.*$/, "")}.${caveat ? ` Caveat: ${caveat.trim().replace(/\.*$/, "")}.` : ""}`;
const resolveBusinessKpiNote = (item, text, businessContext) => {
  const note = String(item.supportingNote ?? "").trim();
  if (!note) {
    return "";
  }
  if (!businessContext.some((entry) => isSemanticallySimilar(entry, note))) {
    return note;
  }
  const label = item.label.toLowerCase();
  if (label.includes("top visual")) {
    return text.primaryVisualSupport;
  }
  if (label.includes("trusted cards")) {
    return "Visual evidence selected for this report.";
  }
  if (label.includes("row expansion")) {
    return "Prepared rows compared with raw rows.";
  }
  if (label.includes("material caveats")) {
    return "Caveats and readiness risks still active.";
  }
  return text.supportingDetailAvailable;
};
const renderVisualSummaryRow = (visual, index, text, reportTemplate) => renderProwItem(`
  <article class="supporting-card summary-card finding-high">
    <div class="card-header">
      <div>
        <p class="eyebrow">${escapeHtml(text.keyFinding)} ${index + 1}</p>
        <h3>${escapeHtml(reportTemplate === "executive_brief" ? visual.title : visual.businessTitle)}</h3>
        ${reportTemplate === "audit_appendix" ? `<p class="meta-line">${escapeHtml(visual.title)}</p>` : ""}
      </div>
      <div class="badge-stack">
        ${renderBadge(visual.chartType === "table" ? text.dataTable : titleCase$1(visual.chartType), "neutral")}
        ${visual.calloutValue ? renderBadge(visual.calloutValue, "good") : ""}
      </div>
    </div>
    ${reportTemplate === "executive_brief" || reportTemplate === "management_review" ? `<p>${escapeHtml(renderManagementFindingSentence(visual.businessTitle, visual.caveat))}</p>` : visual.caveat ? `<p class="meta-line">${escapeHtml(visual.caveat)}</p>` : ""}
  </article>
`, { id: `finding-${index + 1}` });
const renderVisualChartRow = (visual) => renderProwItem(`
  <article class="supporting-card chart-card">
    <div class="visual-surface">
      ${visual.svgMarkup ?? renderFallbackTable(visual)}
    </div>
    ${visual.chartWarnings.length > 0 ? `<p class="meta-line chart-warning">${escapeHtml(visual.chartWarnings.join(" "))}</p>` : ""}
  </article>
`, { extraClassName: "report-row--chart" });
const renderVisualNarrativeRow = (visual, text) => renderProwItem(`
  <article class="supporting-card narrative-card">
    <div class="narrative-grid narrative-grid--short">
      <div>
        <h4>${escapeHtml(text.whatItShows)}</h4>
        <p>${escapeHtml(visual.whatItShows)}</p>
      </div>
      <div>
        <h4>${escapeHtml(text.whyItMatters)}</h4>
        <p>${escapeHtml(visual.whyItMatters)}</p>
      </div>
      ${visual.caveat ? `
      <div>
        <h4>${escapeHtml(text.caveat)}</h4>
        <p>${escapeHtml(visual.caveat)}</p>
      </div>
      ` : ""}
    </div>
  </article>
`, { extraClassName: "report-row--narrative" });
const renderVisualLongNarrative = (visual, index, text) => renderPtacSection(
  `${text.keyFinding} ${index + 1}: ${visual.businessTitle}`,
  text.decisionEvidence,
  [
    renderParagraphBlock(text.whatItShows, visual.whatItShows),
    renderParagraphBlock(text.whyItMatters, visual.whyItMatters),
    ...visual.caveat ? [renderParagraphBlock(text.caveat, visual.caveat)] : [],
    ...visual.chartWarnings.length > 0 ? [renderParagraphBlock("Chart note", visual.chartWarnings.join(" "))] : []
  ]
);
const renderVisualFindingRows = (reportVisuals, text, reportTemplate) => {
  if (reportVisuals.length === 0) {
    return [];
  }
  return reportVisuals.map((visual, index) => {
    if (reportTemplate === "executive_brief" || reportTemplate === "management_review") {
      return [
        renderVisualSummaryRow(visual, index, text, reportTemplate),
        renderVisualChartRow(visual)
      ].join("");
    }
    const shortNarrative = ![
      visual.whatItShows,
      visual.whyItMatters,
      visual.caveat ?? "",
      visual.chartWarnings.join(" ")
    ].some((item) => isLongText(item, 160));
    return [
      renderVisualSummaryRow(visual, index, text, reportTemplate),
      renderVisualChartRow(visual),
      shortNarrative ? renderVisualNarrativeRow(visual, text) : renderVisualLongNarrative(visual, index, text)
    ].join("");
  });
};
const renderBusinessVisualFindingRows = (reportVisuals, text) => reportVisuals.map((visual, index) => renderProwItem(`
  <article class="supporting-card summary-card finding-high">
    ${index === 0 ? `<div class="section-intro-inline"><p class="eyebrow">${escapeHtml(text.decisionEvidence)}</p><h2>${escapeHtml(text.keyFindings)}</h2></div>` : ""}
    <div class="card-header">
      <div>
        <p class="eyebrow">${escapeHtml(text.keyFinding)} ${index + 1}</p>
        <h3>${escapeHtml(visual.title)}</h3>
      </div>
      <div class="badge-stack">
        ${renderBadge(visual.chartType === "table" ? text.dataTable : titleCase$1(visual.chartType), "neutral")}
        ${visual.calloutValue ? renderBadge(visual.calloutValue, "good") : ""}
      </div>
    </div>
    <div class="visual-surface">
      ${visual.svgMarkup ?? renderFallbackTable(visual)}
    </div>
    <p>${escapeHtml(renderManagementFindingSentence(visual.businessTitle, visual.caveat))}</p>
  </article>
`, { id: index === 0 ? "key-findings" : void 0 }));
const renderBusinessTextFindingRows = (text, findingSections, introAlreadyUsed, startIndex = 0) => {
  let usedIntro = introAlreadyUsed;
  let businessIndex = startIndex > 0 ? startIndex + 1 : introAlreadyUsed ? 2 : 1;
  return findingSections.flatMap((section) => section.items.map((item) => {
    const row = renderProwItem(`
          <article class="supporting-card summary-card finding-${item.importance}">
            ${!usedIntro ? `<div class="section-intro-inline"><p class="eyebrow">${escapeHtml(text.decisionEvidence)}</p><h2>${escapeHtml(text.keyFindings)}</h2></div>` : ""}
            <div class="card-header">
              <div>
                <p class="eyebrow">${escapeHtml(text.keyFinding)} ${businessIndex}</p>
                <h3>${escapeHtml(item.claim)}</h3>
              </div>
              ${renderBadge(titleCase$1(item.importance), item.importance === "high" ? "good" : item.importance === "medium" ? "warning" : "neutral")}
            </div>
            <p>${escapeHtml(renderManagementFindingSentence(item.claim, item.caveats[0]))}</p>
          </article>
        `, { id: !usedIntro ? "key-findings" : void 0 });
    usedIntro = true;
    businessIndex += 1;
    return row;
  }));
};
const renderTextFindingRows = (text, findingSections, reportTemplate) => findingSections.flatMap((section, sectionIndex) => section.items.map((item, index) => renderProwItem(`
      <article class="supporting-card summary-card finding-${item.importance}">
        ${index === 0 ? `<p class="eyebrow">${escapeHtml(section.title)}</p>` : ""}
        <div class="card-header">
          <h3>${escapeHtml(reportTemplate === "audit_appendix" ? item.claim : `${text.keyFinding} ${sectionIndex + index + 1}`)}</h3>
          ${renderBadge(titleCase$1(item.importance), item.importance === "high" ? "good" : item.importance === "medium" ? "warning" : "neutral")}
        </div>
        ${reportTemplate === "executive_brief" || reportTemplate === "management_review" ? `<p>${escapeHtml(renderManagementFindingSentence(item.claim, item.caveats[0]))}</p>` : `
        <p class="meta-line"><strong>Supported by:</strong> ${item.supportedByRoles.map((role) => escapeHtml(titleCase$1(role))).join(", ")}</p>
        ${renderEvidenceRefs(item.evidenceRefs)}
        ${item.caveats.length > 0 ? `<div class="subsection"><h4>Caveats</h4>${renderList(item.caveats, "compact-list")}</div>` : ""}
        `}
      </article>
    `, {
  id: sectionIndex === 0 && index === 0 ? "finding-1" : void 0
})));
const renderFindingRows = (reportVisuals, text, findingSections, options) => {
  const reportTemplate = (options == null ? void 0 : options.reportTemplate) ?? "management_review";
  if (reportTemplate === "executive_brief" || reportTemplate === "management_review") {
    const businessRows = [
      ...renderBusinessVisualFindingRows(reportVisuals, text),
      ...renderBusinessTextFindingRows(text, findingSections, reportVisuals.length > 0, reportVisuals.length)
    ];
    return (typeof (options == null ? void 0 : options.maxItems) === "number" ? businessRows.slice(0, options.maxItems) : businessRows).join("");
  }
  const rows = [
    ...renderVisualFindingRows(reportVisuals, text, reportTemplate),
    ...renderTextFindingRows(text, findingSections, reportTemplate)
  ];
  return (typeof (options == null ? void 0 : options.maxItems) === "number" ? rows.slice(0, options.maxItems) : rows).join("");
};
const renderKpiGridContent = (kpiHighlights, options) => {
  if (kpiHighlights.length === 0) {
    return '<p class="empty-state">No KPI highlights were recorded.</p>';
  }
  return chunk(kpiHighlights, 3).map((group) => `
      <div class="kpi-grid">
        ${group.map((item) => `
        <article class="kpi-card">
          <div class="kpi-label">${escapeHtml(item.label)}</div>
          <div class="kpi-value kpi-value-${item.tone ?? "neutral"}">${escapeHtml(item.value)}</div>
          <p class="kpi-note">${escapeHtml((options == null ? void 0 : options.text) && options.businessContext ? resolveBusinessKpiNote(item, options.text, options.businessContext) : item.supportingNote)}</p>
        </article>
        `).join("")}
      </div>
    `).join("");
};
const renderDisagreementPtac = (section, text, options) => renderPtacSection(
  section.title,
  text.openQuestions,
  section.items.flatMap((item) => [
    renderTextParagraph(`${item.topic} (${titleCase$1(item.resolution)}).`),
    ...item.positions.map((position) => renderParagraphBlock(
      titleCase$1(position.role),
      `${position.stance}${position.evidenceRefs.length > 0 ? ` Evidence: ${position.evidenceRefs.join(", ")}` : ""}`
    ))
  ]),
  options
);
const renderEvidenceHighlightRows = (section, text) => {
  const longForm = [];
  const rows = section.cards.filter((card) => {
    const long = isLongText(card.whyItMatters, 180);
    if (long) {
      longForm.push(`${card.title} (${card.cardId}): ${card.whyItMatters}`);
    }
    return !long;
  }).map((card) => renderProwItem(`
      <article class="supporting-card compact-card">
        <div class="card-header">
          <h3>${escapeHtml(card.title)}</h3>
          ${renderBadge(card.artifactType ? titleCase$1(card.artifactType) : text.chart, "neutral")}
        </div>
        <p class="meta-line"><strong>Card ID:</strong> <code>${escapeHtml(card.cardId)}</code></p>
        <p>${escapeHtml(card.whyItMatters)}</p>
      </article>
    `, {})).join("");
  return { rows, longForm };
};
const splitEvidenceCatalog = (entries) => {
  const shortRows = [];
  const longParagraphs = [];
  entries.forEach((entry) => {
    const detail = `${entry.label} (${entry.id}) - ${titleCase$1(entry.source)}: ${entry.detail}`;
    if (isLongText(entry.detail, 180)) {
      longParagraphs.push(detail);
      return;
    }
    shortRows.push(`
          <article class="supporting-card compact-card">
            <div class="card-header">
              <h3>${escapeHtml(entry.label)}</h3>
              ${renderBadge(titleCase$1(entry.kind), "neutral")}
            </div>
            <p class="meta-line"><strong>ID:</strong> <code>${escapeHtml(entry.id)}</code></p>
            <p class="meta-line"><strong>Source:</strong> ${escapeHtml(titleCase$1(entry.source))}</p>
            <p>${escapeHtml(entry.detail)}</p>
          </article>
        `);
  });
  return { shortRows, longParagraphs };
};
const renderAppendix = (ir, text) => {
  const { shortRows, longParagraphs } = splitEvidenceCatalog(ir.appendix.evidenceCatalog);
  const excludedLongForm = [];
  const excludedRows = ir.appendix.excludedEvidence.filter((item) => {
    const detail = `${item.displayTitle} (${item.cardId}) - ${item.detail}`;
    if (isLongText(item.detail, 180)) {
      excludedLongForm.push(`${detail}. Reasons: ${item.reasonCodes.map(humanizeReasonCode).join(", ")}`);
      return false;
    }
    return true;
  }).map((item) => renderProwItem(`
      <article class="supporting-card compact-card">
        <div class="card-header">
          <h3>${escapeHtml(item.displayTitle)}</h3>
          ${renderBadge(titleCase$1(item.decision), "warning")}
        </div>
        <p class="meta-line"><strong>Card ID:</strong> <code>${escapeHtml(item.cardId)}</code></p>
        <p class="meta-line"><strong>Reasons:</strong> ${escapeHtml(item.reasonCodes.map(humanizeReasonCode).join(", "))}</p>
        <p>${escapeHtml(item.detail)}</p>
      </article>
    `, {})).join("");
  const evidenceRows = shortRows.length > 0 ? shortRows.map((row) => renderProwItem(row, {})).join("") : renderProwItem('<p class="empty-state">No evidence references were recorded.</p>', {});
  const rows = [
    renderProwHeader(text.traceability, ir.appendix.title, "appendix"),
    evidenceRows,
    ir.appendix.excludedEvidence.length > 0 ? renderProwHeader(text.excludedEvidence, text.excludedEvidence) : "",
    excludedRows
  ].join("");
  const longFormParagraphs = [...longParagraphs, ...excludedLongForm];
  return {
    rows,
    longForm: renderPaddtSection(text.evidenceCatalog, text.appendixHighlights, longFormParagraphs)
  };
};
const buildSummarySection = (ir, text, summaryParagraphs, options) => (options == null ? void 0 : options.compact) ? renderCompactNarrativeSection(ir.summary.title, text.managementSummary, summaryParagraphs, { id: "key-takeaways" }) : renderPtacSection(ir.summary.title, text.managementSummary, summaryParagraphs, { id: "key-takeaways" });
const buildKpiSection = (text, kpiHighlights, options) => (options == null ? void 0 : options.compactIntro) ? renderProwItem(`
      <article class="supporting-card compact-card section-intro-card">
        <p class="eyebrow">${escapeHtml(text.boardSnapshot)}</p>
        <h2>${escapeHtml(text.kpiSnapshot)}</h2>
        ${renderKpiGridContent(kpiHighlights, { text, businessContext: options.businessContext })}
      </article>
    `, { id: "kpi-strip" }) : [
  renderProwHeader(text.boardSnapshot, text.kpiSnapshot, "kpi-strip"),
  renderProwItem(renderKpiGridContent(kpiHighlights), {})
].join("");
const buildFindingsSection = (text, findingsMarkup, options) => findingsMarkup ? [
  ...(options == null ? void 0 : options.compactIntro) ? [] : [renderProwHeader(text.decisionEvidence, text.keyFindings, "key-findings")],
  findingsMarkup
].join("") : renderProwItem(`
      <article class="supporting-card compact-card section-intro-card">
        <p class="eyebrow">${escapeHtml(text.decisionEvidence)}</p>
        <h2>${escapeHtml(text.keyFindings)}</h2>
        <p class="empty-state">${escapeHtml(text.emptyFindings)}</p>
      </article>
    `, { id: "key-findings" });
const buildRisksSection = (text, paragraphs, options) => {
  const rendered = (options == null ? void 0 : options.compact) ? renderCompactNarrativeSection(text.decisionGuardrails, text.decisionGuardrails, paragraphs, { id: "risks-caveats" }) : renderPtacSection(text.decisionGuardrails, text.decisionGuardrails, paragraphs, { id: "risks-caveats" });
  return rendered || renderProwItem(`
      <article class="supporting-card compact-card section-intro-card">
        <p class="eyebrow">${escapeHtml(text.decisionGuardrails)}</p>
        <h2>${escapeHtml(text.decisionGuardrails)}</h2>
        <p class="empty-state">${escapeHtml(text.emptyRisks)}</p>
      </article>
    `, { id: "risks-caveats" });
};
const buildActionsSection = (text, paragraphs, options) => {
  const rendered = (options == null ? void 0 : options.compact) ? renderCompactNarrativeSection(text.recommendedActions, text.whatToDoNext, paragraphs, { id: "recommended-actions" }) : renderPtacSection(text.recommendedActions, text.whatToDoNext, paragraphs, { id: "recommended-actions" });
  return rendered || renderProwItem(`
      <article class="supporting-card compact-card section-intro-card">
        <p class="eyebrow">${escapeHtml(text.recommendedActions)}</p>
        <h2>${escapeHtml(text.whatToDoNext)}</h2>
        <p class="empty-state">${escapeHtml(text.emptyActions)}</p>
      </article>
    `, { id: "recommended-actions" });
};
const buildTraceabilitySection = (text, paragraphs) => renderPtacSection(text.preparationVerification, text.traceability, paragraphs, { id: "traceability" });
const buildCompactAppendixSection = (text, ir) => {
  if (ir.appendix.evidenceCatalog.length === 0 && ir.appendix.excludedEvidence.length === 0) {
    return renderProwItem(`
          <article class="supporting-card compact-card section-intro-card">
            <p class="eyebrow">${escapeHtml(text.traceability)}</p>
            <h2>${escapeHtml(text.appendixHighlights)}</h2>
            <p class="empty-state">No evidence references were recorded.</p>
          </article>
        `, { id: "appendix" });
  }
  const topExcludedItem = ir.appendix.excludedEvidence[0];
  const topExcludedSummary = topExcludedItem ? topExcludedItem.reasonCodes.map(humanizeReasonCode).join(", ") : "";
  return renderProwItem(`
      <article class="supporting-card compact-card section-intro-card">
        <div class="card-header">
          <div>
            <p class="eyebrow">${escapeHtml(text.traceability)}</p>
            <h2>${escapeHtml(text.appendixHighlights)}</h2>
          </div>
          ${renderBadge(text.traceability, "neutral")}
        </div>
        <p>${escapeHtml(`${ir.appendix.evidenceCatalog.length} evidence reference(s) and ${ir.appendix.excludedEvidence.length} excluded item(s) remain available in the audit appendix layout.`)}</p>
        <p class="meta-line"><strong>${escapeHtml(text.evidenceReferences)}:</strong> ${escapeHtml(String(ir.appendix.evidenceCatalog.length))}</p>
        <p class="meta-line"><strong>${escapeHtml(text.excludedCount)}:</strong> ${escapeHtml(String(ir.appendix.excludedEvidence.length))}</p>
        ${topExcludedSummary ? `<p class="meta-line"><strong>${escapeHtml(text.topExcludedItem)}:</strong> ${escapeHtml(topExcludedSummary)}</p>` : ""}
      </article>
    `, { id: "appendix" });
};
const assembleReportData = (ir, options) => {
  var _a;
  const text = getShellText(options == null ? void 0 : options.language);
  const reportTemplate = normalizeReportTemplate((options == null ? void 0 : options.reportTemplate) ?? "management_review");
  const documentTitle = ir.dataset.datasetName ? `${ir.dataset.datasetName} Analyst Report` : "Analyst Report";
  const structuralSignals = renderStructuralSignals(ir.dataset.structuralSignals);
  const risksAndCaveats = dedupeStrings([...ir.dataset.readinessRisks, ...ir.dataset.caveats]);
  const findingSections = ir.sections.filter((section) => section.type === "findings");
  const disagreementSections = ir.sections.filter(
    (section) => section.type === "disagreements"
  );
  const evidenceSections = ir.sections.filter(
    (section) => section.type === "evidence"
  );
  const shouldRenderWarningBanner = ((_a = options == null ? void 0 : options.manifest) == null ? void 0 : _a.artifactStatus) === "partial";
  const reportVisuals = reportTemplate === "executive_brief" ? ir.reportVisuals.slice(0, 1) : reportTemplate === "management_review" ? ir.reportVisuals.slice(0, 2) : ir.reportVisuals;
  const findingSectionsForTemplate = reportTemplate === "audit_appendix" ? findingSections : findingSections.map((section) => ({
    ...section,
    items: section.items.slice(0, reportTemplate === "executive_brief" ? 2 : 3)
  })).filter((section) => section.items.length > 0);
  const businessFindingSections = reportTemplate === "audit_appendix" ? findingSectionsForTemplate : filterBusinessFindingSections(
    findingSectionsForTemplate,
    reportVisuals.map((visual) => visual.businessTitle)
  );
  const heroStats = [
    { label: "Dataset", value: ir.dataset.datasetName || "Untitled" },
    { label: "Visuals", value: String(reportVisuals.length) },
    { label: "Material caveats", value: String(risksAndCaveats.length) }
  ];
  const auditSummaryParagraphs = [
    renderParagraphBlock(text.overallPosition, ir.summary.executivePosition),
    renderParagraphBlock(text.topBusinessImplication, ir.summary.topImplication),
    renderParagraphBlock(text.mainCaution, ir.summary.mainCaution),
    renderParagraphBlock(text.deliveryReadiness, ir.dataset.readinessReason),
    ...ir.summary.managementHighlights.map(renderTextParagraph),
    ...ir.dataset.readinessDrivers.length > 0 ? [renderParagraphBlock(text.support, ir.dataset.readinessDrivers.join(" | "))] : [],
    ...ir.dataset.readinessRisks.length > 0 ? [renderParagraphBlock(text.risks, ir.dataset.readinessRisks.join(" | "))] : [],
    ...structuralSignals.length > 0 ? [renderParagraphBlock(text.structuralRiskSignals, structuralSignals.join(" | "))] : []
  ];
  const executiveBriefSummaryParagraphs = buildDistinctParagraphBlocks([
    { label: text.overallPosition, value: ir.summary.executivePosition },
    { label: text.topBusinessImplication, value: ir.summary.topImplication },
    { label: text.mainCaution, value: ir.summary.mainCaution }
  ], 2);
  const managementReviewSummaryParagraphs = buildDistinctParagraphBlocks([
    { label: text.overallPosition, value: ir.summary.executivePosition },
    { label: text.topBusinessImplication, value: ir.summary.topImplication },
    { label: text.mainCaution, value: ir.summary.mainCaution },
    { label: text.deliveryReadiness, value: ir.dataset.readinessReason }
  ], 4);
  const businessContext = dedupeStrings([
    ir.summary.executivePosition,
    ir.summary.topImplication,
    ...reportVisuals.map((visual) => visual.businessTitle),
    ...businessFindingSections.flatMap((section) => section.items.map((item) => item.claim))
  ]);
  const findingsMarkup = renderFindingRows(reportVisuals, text, businessFindingSections, {
    reportTemplate,
    maxItems: reportTemplate === "executive_brief" ? 2 : reportTemplate === "management_review" ? 4 : void 0
  });
  const disagreementsMarkup = disagreementSections.map((section, index) => renderDisagreementPtac(section, text, {
    id: index === 0 ? "open-disagreements" : void 0
  })).join("");
  const evidenceHighlights = evidenceSections.map((section) => renderEvidenceHighlightRows(section, text));
  const evidenceRows = evidenceHighlights.some((result) => result.rows) ? [
    renderProwHeader(text.appendixHighlights, text.appendixHighlights),
    ...evidenceHighlights.map((result) => result.rows)
  ].join("") : "";
  const appendix = renderAppendix(ir, text);
  const dedupedActions = dedupeStrings(ir.summary.recommendedActions).map((action) => action.replace(/^\d+[\.\)]\s*/, "").trim()).filter(Boolean);
  const recommendationParagraphs = dedupedActions.length > 1 ? [renderNumberedList(dedupedActions)] : dedupedActions.map(renderTextParagraph);
  const evidenceLongForm = evidenceHighlights.flatMap((result) => result.longForm);
  const briefRiskItems = risksAndCaveats.slice(0, 3);
  const executiveBriefRiskParagraphs = [
    ...briefRiskItems.length > 1 ? [renderList(briefRiskItems, "bullet-list")] : briefRiskItems.map(renderTextParagraph),
    ...disagreementSections.length > 0 ? [renderTextParagraph("Open disagreements remain and should be reviewed in the audit appendix layout.")] : []
  ];
  const mgmtRiskItems = risksAndCaveats.slice(0, 4);
  const managementReviewRiskParagraphs = [
    ...mgmtRiskItems.length > 1 ? [renderList(mgmtRiskItems, "bullet-list")] : mgmtRiskItems.map(renderTextParagraph),
    ...disagreementSections.length > 0 ? [renderTextParagraph("Open disagreements remain and should be reviewed in the audit appendix layout.")] : []
  ];
  const auditRiskParagraphs = risksAndCaveats.map(renderTextParagraph);
  const auditTraceabilityParagraphs = [
    renderParagraphBlock(text.workflowStatus, ir.dataset.workflowStatus),
    renderParagraphBlock(text.datasetShape, ir.dataset.shapeSummary),
    ...ir.dataset.generationBlockers.length > 0 ? [renderParagraphBlock(text.generationBlockers, ir.dataset.generationBlockers.join(" | "))] : []
  ];
  const activeContents = reportTemplate === "audit_appendix" ? [
    { id: "key-takeaways", label: text.managementSummary },
    { id: "traceability", label: text.traceability },
    { id: "kpi-strip", label: text.kpiSnapshot },
    { id: "key-findings", label: text.keyFindings },
    { id: "risks-caveats", label: text.decisionGuardrails },
    { id: "recommended-actions", label: text.recommendedActions },
    ...disagreementsMarkup ? [{ id: "open-disagreements", label: text.openQuestions }] : [],
    { id: "appendix", label: text.evidenceCatalog }
  ] : [
    { id: "key-takeaways", label: text.managementSummary },
    { id: "kpi-strip", label: text.kpiSnapshot },
    { id: "key-findings", label: text.keyFindings },
    { id: "risks-caveats", label: text.decisionGuardrails },
    { id: "recommended-actions", label: text.recommendedActions },
    { id: "appendix", label: text.appendixHighlights }
  ];
  const shouldRepeatRowHeader = reportTemplate === "audit_appendix";
  const reportBody = reportTemplate === "audit_appendix" ? [
    buildSummarySection(ir, text, auditSummaryParagraphs),
    buildTraceabilitySection(text, auditTraceabilityParagraphs),
    buildKpiSection(text, ir.kpiHighlights ?? []),
    buildFindingsSection(text, findingsMarkup),
    buildRisksSection(text, auditRiskParagraphs),
    buildActionsSection(text, recommendationParagraphs),
    disagreementsMarkup,
    evidenceRows,
    appendix.rows,
    renderPaddtSection(text.evidenceCatalog, text.appendixHighlights, evidenceLongForm, { id: "appendix-highlights" }),
    appendix.longForm
  ].filter(Boolean).join("") : reportTemplate === "executive_brief" ? [
    buildSummarySection(ir, text, executiveBriefSummaryParagraphs, { compact: true }),
    buildKpiSection(text, ir.kpiHighlights ?? [], { compactIntro: true, businessContext }),
    buildFindingsSection(text, findingsMarkup, { compactIntro: true }),
    buildRisksSection(text, executiveBriefRiskParagraphs, { compact: true }),
    buildActionsSection(text, recommendationParagraphs.slice(0, 3), { compact: true }),
    buildCompactAppendixSection(text, ir)
  ].filter(Boolean).join("") : [
    buildSummarySection(ir, text, managementReviewSummaryParagraphs, { compact: true }),
    buildKpiSection(text, ir.kpiHighlights ?? [], { compactIntro: true, businessContext }),
    buildFindingsSection(text, findingsMarkup, { compactIntro: true }),
    buildRisksSection(text, managementReviewRiskParagraphs, { compact: true }),
    buildActionsSection(text, recommendationParagraphs.slice(0, 4), { compact: true }),
    buildCompactAppendixSection(text, ir)
  ].filter(Boolean).join("");
  return {
    text,
    reportTemplate,
    documentTitle,
    structuralSignals,
    risksAndCaveats,
    findingSections,
    disagreementSections,
    evidenceSections,
    shouldRenderWarningBanner,
    reportVisuals,
    findingSectionsForTemplate,
    businessFindingSections,
    heroStats,
    auditSummaryParagraphs,
    executiveBriefSummaryParagraphs,
    managementReviewSummaryParagraphs,
    businessContext,
    findingsMarkup,
    disagreementsMarkup,
    evidenceHighlights,
    evidenceRows,
    appendix,
    dedupedActions,
    recommendationParagraphs,
    evidenceLongForm,
    executiveBriefRiskParagraphs,
    managementReviewRiskParagraphs,
    auditRiskParagraphs,
    auditTraceabilityParagraphs,
    activeContents,
    shouldRepeatRowHeader,
    reportBody
  };
};
const renderHtmlReport = (ir, options) => {
  const data = assembleReportData(ir, options);
  const {
    text,
    documentTitle,
    heroStats,
    activeContents,
    shouldRepeatRowHeader,
    shouldRenderWarningBanner,
    reportBody,
    reportTemplate
  } = data;
  const embeddedPrintFormScript = printFormScript.replace(/<\/script/gi, "<\\/script");
  return `<!DOCTYPE html>
<html lang="${(options == null ? void 0 : options.language) === "Mandarin" ? "zh-CN" : "en"}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(documentTitle)}</title>
  <style>
${reportStylesheet}
  </style>
</head>
<body>
  <div class="viewer-toolbar">
    <div>
      <p class="eyebrow">${escapeHtml(text.viewer)}</p>
      <p class="meta-line">${escapeHtml(documentTitle)}</p>
    </div>
    <div class="toolbar-actions">
      <button type="button" class="toolbar-button" onclick="window.print()">${escapeHtml(text.exportPdf)}</button>
      <button type="button" class="toolbar-button secondary" onclick="window.close()">${escapeHtml(text.close)}</button>
    </div>
  </div>
  <main class="report-shell">
    <div
      class="paper_width printform"
      data-paper-size="A4"
      data-dpi="96"
      data-orientation="portrait"
      data-papersize-width="780"
      data-papersize-height="1080"
      data-repeat-header="n"
      data-repeat-docinfo="n"
      data-repeat-docinfo002="n"
      data-repeat-docinfo003="n"
      data-repeat-docinfo004="n"
      data-repeat-docinfo005="n"
      data-repeat-rowheader="${shouldRepeatRowHeader ? "y" : "n"}"
      data-repeat-ptac-rowheader="n"
      data-repeat-footer="n"
      data-repeat-paddt-rowheader="n"
      data-repeat-paddt-docinfo="n"
      data-repeat-paddt-docinfo002="n"
      data-repeat-paddt-docinfo003="n"
      data-repeat-paddt-docinfo004="n"
      data-repeat-paddt-docinfo005="n"
      data-repeat-footer-logo="n"
      data-repeat-footer-pagenum="y"
      data-insert-dummy-row-item-while-format-table="n"
      data-insert-ptac-dummy-row-items="n"
      data-insert-dummy-row-while-format-table="n"
      data-insert-footer-spacer-while-format-table="n"
      data-insert-footer-spacer-with-dummy-row-item-while-format-table="n"
      data-insert-paddt-dummy-row-items="n"
      data-report-template="${escapeHtml(reportTemplate)}"
    >
      ${renderTableShell("pheader", `
        <article class="report-header-card">
          <p class="eyebrow">${escapeHtml(text.preparedBy)}</p>
          <h1>${escapeHtml(documentTitle)}</h1>
          <p>${escapeHtml(ir.summary.executivePosition)}</p>
          <div class="badge-stack">
            ${renderBadge(`${text.readiness}: ${renderReadinessLabel(ir.dataset.readiness)}`, ir.dataset.readiness === "ready" ? "good" : ir.dataset.readiness === "partial" ? "warning" : "danger")}
            ${renderBadge(`${text.confidence}: ${titleCase$1(ir.summary.overallConfidence)}`, ir.summary.overallConfidence === "high" ? "good" : ir.summary.overallConfidence === "medium" ? "warning" : "danger")}
            ${renderBadge(`${text.generated}: ${ir.generatedAt.split("T")[0]}`, "neutral")}
          </div>
          <div class="hero-stats">
            ${heroStats.map((stat) => `
            <div class="hero-stat">
              <div class="eyebrow">${escapeHtml(stat.label)}</div>
              <div class="hero-stat-value">${escapeHtml(stat.value)}</div>
            </div>
            `).join("")}
          </div>
        </article>
      `)}

      ${renderTableShell("pdocinfo", `
        <article class="docinfo-card">
          <div>
            <p class="eyebrow">${escapeHtml(text.documentMap)}</p>
            <h2>${escapeHtml(text.contents)}</h2>
          </div>
          <div class="contents-grid">
            ${activeContents.map((item) => `<a class="contents-item" href="#${escapeHtml(item.id)}">${escapeHtml(item.label)}</a>`).join("")}
          </div>
          ${shouldRenderWarningBanner && (options == null ? void 0 : options.manifest) ? `
          <div class="caveat-notice">
            <h4>${escapeHtml(text.warningBannerTitle)}</h4>
            <p>${escapeHtml(options.manifest.reportReadinessReason)}</p>
            <p class="meta-line">${escapeHtml(text.excludedCount)}: ${escapeHtml(String(options.manifest.excludedEvidenceCount))}</p>
          </div>
          ` : ""}
        </article>
      `, { id: "report-contents" })}

      ${reportBody}

      <table cellpadding="0" cellspacing="0" border="0" class="paper_width pfooter_pagenum report-shell-table">
        <colgroup>
          <col class="report-shell-col report-shell-col--gutter" />
          <col class="report-shell-col report-shell-col--content" />
          <col class="report-shell-col report-shell-col--gutter" />
        </colgroup>
        <tr>
          <td class="report-shell-gutter"></td>
          <td class="report-shell-content-cell">
            <div class="page-number-shell">Page <span data-page-number></span> of <span data-page-total></span></div>
          </td>
          <td class="report-shell-gutter"></td>
        </tr>
      </table>
    </div>
  </main>
  <script>${embeddedPrintFormScript}<\/script>
  <script>
    (function () {
      const runPrintForm = async () => {
        if (!window.PrintForm || typeof window.PrintForm.formatAll !== 'function') {
          return;
        }
        if (document.fonts && document.fonts.ready) {
          try {
            await document.fonts.ready;
          } catch (error) {
            console.error('Report font readiness failed:', error);
          }
        }
        await window.PrintForm.formatAll({ force: true });
        document.body.dataset.printformPagesReady = 'y';
        if (window.location.hash === "#print") {
          window.requestAnimationFrame(() => window.print());
        }
      };

      window.addEventListener('load', () => {
        void runPrintForm();
      }, { once: true });
    })();
  <\/script>
</body>
</html>`;
};
const validateReportIr = (ir) => {
  var _a, _b, _c, _d;
  const errors = [];
  if (!ir.reportId) {
    errors.push("reportId is required.");
  }
  if (!ir.generatedAt) {
    errors.push("generatedAt is required.");
  }
  if (!((_a = ir.dataset) == null ? void 0 : _a.title)) {
    errors.push("dataset.title is required.");
  }
  if (!((_b = ir.summary) == null ? void 0 : _b.title)) {
    errors.push("summary.title is required.");
  }
  if (!Array.isArray(ir.sections)) {
    errors.push("sections must be an array.");
  }
  if (!Array.isArray(ir.reportVisuals)) {
    errors.push("reportVisuals must be an array.");
  }
  if (!ir.appendix || !Array.isArray(ir.appendix.evidenceCatalog)) {
    errors.push("appendix.evidenceCatalog must be an array.");
  }
  const allowedEvidenceIds = new Set(((_d = (_c = ir.appendix) == null ? void 0 : _c.evidenceCatalog) == null ? void 0 : _d.map((entry) => entry.id)) ?? []);
  ir.sections.filter((section) => section.type === "findings").forEach((section) => {
    section.items.forEach((item) => {
      item.evidenceRefs.forEach((ref) => {
        if (!allowedEvidenceIds.has(ref)) {
          errors.push(`Unknown evidence ref "${ref}" in findings section.`);
        }
      });
    });
  });
  ir.sections.filter((section) => section.type === "disagreements").forEach((section) => {
    section.items.forEach((item) => {
      item.positions.forEach((position) => {
        position.evidenceRefs.forEach((ref) => {
          if (!allowedEvidenceIds.has(ref)) {
            errors.push(`Unknown evidence ref "${ref}" in disagreement section.`);
          }
        });
      });
    });
  });
  if (ir.dataset.generationGate === "blocked" && (ir.sections.length > 0 || ir.reportVisuals.length > 0)) {
    errors.push("Blocked reports must not contain sections or report visuals.");
  }
  return {
    valid: errors.length === 0,
    errors
  };
};
const REVENUE_PATTERN = /revenue|sales|income|turnover/i;
const PROFIT_PATTERN = /profit|margin|earnings|ebitda|ebit/i;
const COST_PATTERN = /cost|expense|expenditure|spending|outflow/i;
const COUNT_PATTERN = /count|number|quantity|volume/i;
const NULL_PATTERN = /^(null|n\/a|unknown|unclassified|undefined|\s*)$/i;
const CURRENCY_PATTERN = /\b(SGD|USD|EUR|GBP|JPY|CNY|MYR|HKD|AUD|CAD)\b/i;
const MAX_TOP_GROUPS = 5;
const MAX_THEMES = 5;
const toNumericValue = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = typeof value === "string" ? Number(String(value).replace(/[,$%()]/g, "").trim()) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
};
const classifyMetric = (column) => {
  if (REVENUE_PATTERN.test(column)) return "revenue";
  if (PROFIT_PATTERN.test(column)) return "profit";
  if (COST_PATTERN.test(column)) return "cost";
  if (COUNT_PATTERN.test(column)) return "count";
  return "other";
};
const formatCurrency = (value, currency) => {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  const formatted = abs >= 1e6 ? `${(abs / 1e6).toFixed(2)}M` : abs >= 1e3 ? `${Math.round(abs).toLocaleString()}` : abs.toFixed(2);
  return currency ? `${sign}${formatted} ${currency}` : `${sign}${formatted}`;
};
const cleanLabel = (value) => value.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();
const isNullLabel = (value) => NULL_PATTERN.test(String(value ?? "").trim());
const profileCard = (card, currency) => {
  var _a;
  if (!card.valueColumn || card.aggregation !== "sum") return null;
  const rows = ((_a = card.reportChartRows) == null ? void 0 : _a.length) ? card.reportChartRows : card.aggregatedDataSample;
  if (!(rows == null ? void 0 : rows.length)) return null;
  const groupCol = card.groupByColumn;
  const valueCol = card.valueColumn;
  const entries = [];
  let total = 0;
  for (const row of rows) {
    const numeric = toNumericValue(row[valueCol]);
    if (numeric == null) continue;
    total += numeric;
    const label = groupCol ? String(row[groupCol] ?? "Unclassified").trim() : "Total";
    entries.push({ label: isNullLabel(label) ? "Unclassified" : label, value: numeric });
  }
  if (!Number.isFinite(total) || total === 0) return null;
  entries.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  const topGroups = entries.slice(0, MAX_TOP_GROUPS).map((e) => ({
    label: e.label,
    value: e.value,
    share: total !== 0 ? e.value / total : 0
  }));
  return {
    column: valueCol,
    displayLabel: cleanLabel(valueCol),
    total,
    formattedTotal: formatCurrency(total, currency),
    groupColumn: groupCol,
    groupCount: entries.length,
    topGroups,
    category: classifyMetric(valueCol),
    cardId: card.cardId
  };
};
const analyzeConcentration = (profile) => {
  if (profile.topGroups.length < 2) return null;
  const top = profile.topGroups[0];
  const top3Total = profile.topGroups.slice(0, 3).reduce((s, g) => s + g.value, 0);
  const unclassifiedGroup = profile.topGroups.find((g) => g.label === "Unclassified");
  return {
    topGroupLabel: top.label,
    topGroupShare: top.share,
    top3Share: profile.total !== 0 ? top3Total / profile.total : 0,
    hasUnclassified: Boolean(unclassifiedGroup),
    unclassifiedValue: (unclassifiedGroup == null ? void 0 : unclassifiedGroup.value) ?? null
  };
};
const detectQualitySignals = (bundle, profiles) => {
  const signals = (bundle.dataset.qualitySignals ?? []).map((signal) => ({
    signal: signal.message,
    severity: signal.severity
  }));
  for (const profile of profiles) {
    const unclassified = profile.topGroups.find((g) => g.label === "Unclassified");
    if (unclassified && profile.total !== 0) {
      const share = Math.round(Math.abs(unclassified.value / profile.total) * 100);
      if (share >= 10) {
        signals.push({
          signal: `${share}% of ${profile.displayLabel} (${formatCurrency(Math.abs(unclassified.value), null)}) is assigned to an unclassified category, preventing granular tracking.`,
          severity: share >= 30 ? "critical" : "warning"
        });
      }
    }
  }
  const ratio = bundle.dataset.structuralSignals.rowExpansionRatio;
  if (typeof ratio === "number" && ratio > 5) {
    signals.push({
      signal: `Data preparation expanded the original file by ${ratio.toFixed(0)} times, which may indicate a hierarchical report structure with embedded subtotals.`,
      severity: ratio > 20 ? "warning" : "info"
    });
  }
  if (bundle.dataset.trustedCardsCount === 0 && bundle.cards.length > 0) {
    signals.push({
      signal: `All ${bundle.cards.length} analysis cards carry caveats — findings should be stated as preliminary observations, not definitive conclusions.`,
      severity: "warning"
    });
  }
  const deduped = /* @__PURE__ */ new Map();
  for (const signal of signals) {
    const key = `${signal.severity}:${signal.signal}`;
    if (!deduped.has(key)) {
      deduped.set(key, signal);
    }
  }
  return Array.from(deduped.values());
};
const buildNarrativeThemes = (profiles, concentration, signals) => {
  const themes = [];
  const revenueProfile = profiles.find((p) => p.category === "revenue");
  const profitProfile = profiles.find((p) => p.category === "profit");
  const costProfile = profiles.find((p) => p.category === "cost");
  if (revenueProfile && profitProfile) {
    themes.push(`Compare revenue (${revenueProfile.formattedTotal}) against profit (${profitProfile.formattedTotal}) to assess margin health.`);
  } else if (profitProfile) {
    themes.push(`Analyze the ${profitProfile.formattedTotal} profit distribution across ${profitProfile.groupCount} categories.`);
  } else if (revenueProfile) {
    themes.push(`Analyze the ${revenueProfile.formattedTotal} revenue distribution across ${revenueProfile.groupCount} categories.`);
  }
  if (concentration && concentration.topGroupShare > 0.4) {
    themes.push(`"${concentration.topGroupLabel}" holds ${Math.round(concentration.topGroupShare * 100)}% — assess whether this concentration poses a risk.`);
  }
  if (concentration && concentration.top3Share > 0.7) {
    themes.push(`Top 3 categories hold ${Math.round(concentration.top3Share * 100)}% of the total — evaluate diversification.`);
  }
  if ((concentration == null ? void 0 : concentration.hasUnclassified) && concentration.unclassifiedValue != null) {
    themes.push(`A significant unclassified amount needs reconciliation before finalizing conclusions.`);
  }
  if (costProfile && costProfile.groupCount > 5) {
    themes.push(`Break down the ${costProfile.formattedTotal} in total costs across ${costProfile.groupCount} categories to identify the largest cost drivers.`);
  }
  return themes.slice(0, MAX_THEMES);
};
const BLOCKED_TOPICS = [
  "row expansion ratio or data cleaning internals",
  "parser confidence or intake gate status",
  "helper exposure levels or semantic role classifications",
  "trusted card counts or evidence gate mechanics",
  "column data types, null rates, or profiling statistics",
  "workflow preparation states or verification pipeline details"
];
const buildBriefingMarkdown = (profiles, concentration, signals, themes, entityName, currency) => {
  const lines = ["## Evidence Briefing (Pre-Analysis Harness)"];
  if (entityName) {
    lines.push(`
Entity: **${entityName}**`);
  }
  if (currency) {
    lines.push(`Currency: **${currency}** (use uppercase in all text)`);
  }
  if (profiles.length > 0) {
    lines.push("\n### Key Metrics Detected");
    for (const p of profiles) {
      lines.push(`- **${p.displayLabel}**: ${p.formattedTotal} across ${p.groupCount} ${p.groupColumn ? cleanLabel(p.groupColumn) : "item"}(s)`);
      if (p.topGroups.length > 0) {
        const topLabels = p.topGroups.slice(0, 3).map(
          (g) => `${g.label} (${Math.round(g.share * 100)}%)`
        ).join(", ");
        lines.push(`  Top: ${topLabels}`);
      }
    }
  }
  if (concentration) {
    lines.push("\n### Concentration Analysis");
    lines.push(`- Top category: "${concentration.topGroupLabel}" at ${Math.round(concentration.topGroupShare * 100)}% share`);
    lines.push(`- Top 3 share: ${Math.round(concentration.top3Share * 100)}%`);
    if (concentration.hasUnclassified && concentration.unclassifiedValue != null) {
      lines.push(`- WARNING: Unclassified category holds ${formatCurrency(Math.abs(concentration.unclassifiedValue), currency)}`);
    }
  }
  if (signals.length > 0) {
    lines.push("\n### Data Quality Signals");
    for (const s of signals) {
      const prefix = s.severity === "critical" ? "CRITICAL" : s.severity === "warning" ? "WARNING" : "INFO";
      lines.push(`- [${prefix}] ${s.signal}`);
    }
  }
  if (themes.length > 0) {
    lines.push("\n### Recommended Narrative Focus");
    lines.push("Prioritize these themes in your findings:");
    for (const theme of themes) {
      lines.push(`- ${theme}`);
    }
  }
  lines.push("\n### BLOCKED Topics (do NOT include in findings)");
  for (const topic of BLOCKED_TOPICS) {
    lines.push(`- ${topic}`);
  }
  return lines.join("\n");
};
const runReportEvidenceHarness = (bundle) => {
  const titleAndFile = [bundle.dataset.reportTitle, bundle.dataset.fileName].filter(Boolean).join(" ");
  const currencyMatch = CURRENCY_PATTERN.exec(titleAndFile) ?? bundle.cards.reduce((found, card) => found ?? (card.valueColumn ? CURRENCY_PATTERN.exec(card.valueColumn) : null), null);
  const detectedCurrency = currencyMatch ? currencyMatch[1].toUpperCase() : null;
  const entityName = bundle.dataset.reportTitle ? bundle.dataset.reportTitle.replace(/\b(income\s+statement|balance\s+sheet|cash\s+flow|report|statement)\b/gi, "").replace(/\b(by|for|of|the)\b/gi, "").replace(/\s+/g, " ").trim() || null : null;
  const metricProfiles = bundle.cards.map((card) => profileCard(card, detectedCurrency)).filter((p) => p !== null).sort((a, b) => {
    const priorityOrder = {
      revenue: 4,
      profit: 3,
      cost: 2,
      count: 1,
      other: 0
    };
    return priorityOrder[b.category] - priorityOrder[a.category];
  });
  const primaryProfile = metricProfiles[0] ?? null;
  const concentration = primaryProfile ? analyzeConcentration(primaryProfile) : null;
  const qualitySignals = detectQualitySignals(bundle, metricProfiles);
  const narrativeThemes = buildNarrativeThemes(metricProfiles, concentration);
  const briefingMarkdown = buildBriefingMarkdown(
    metricProfiles,
    concentration,
    qualitySignals,
    narrativeThemes,
    entityName,
    detectedCurrency
  );
  return {
    metricProfiles,
    concentration,
    qualitySignals,
    narrativeThemes,
    blockedTopics: [...BLOCKED_TOPICS],
    briefingMarkdown,
    detectedCurrency,
    entityName
  };
};
const defaultDependencies = {
  buildEvidenceBundle: buildReportEvidenceBundle,
  generateMemo: generateAnalystMemoWithDiagnostics,
  generateForum: generateForumSummaryWithDiagnostics,
  buildIr: buildReportIr,
  renderHtml: renderHtmlReport,
  validateIr: validateReportIr
};
const formatJson = (value) => JSON.stringify(value, null, 2);
const buildReportId = (bundle) => {
  const normalizedTimestamp = bundle.generatedAt.replace(/[^0-9]/g, "");
  const datasetSegment = String(bundle.datasetId ?? "").trim() || "no_dataset";
  return `report.${bundle.sessionId}.${datasetSegment}.${normalizedTimestamp}`;
};
const buildReportTitle = (bundle) => bundle.dataset.reportTitle || bundle.dataset.fileName ? `${bundle.dataset.reportTitle || bundle.dataset.fileName} Analyst Report` : "Analyst Report";
const buildManifest = (bundle, reportId, title, artifactStatus, fallbacksUsed, llmUsed, reportTemplate) => {
  const archivePrefix = `/workspace/reports/${reportId}`;
  return {
    reportId,
    title,
    generatedAt: bundle.generatedAt,
    artifactStatus,
    generationGate: bundle.dataset.reportGenerationGate,
    reportReadiness: bundle.dataset.reportReadiness,
    reportReadinessReason: bundle.dataset.reportReadinessReason,
    trustedCardsCount: bundle.dataset.trustedCardsCount,
    excludedEvidenceCount: bundle.excludedEvidence.length,
    gateReasons: bundle.dataset.reportGenerationBlockers,
    llmUsed,
    fallbacksUsed,
    reportTemplate,
    latestFiles: {
      html: artifactStatus === "blocked" ? void 0 : LATEST_REPORT_HTML_PATH,
      ir: artifactStatus === "blocked" ? void 0 : LATEST_REPORT_IR_PATH,
      memos: artifactStatus === "blocked" ? void 0 : LATEST_REPORT_MEMOS_PATH,
      forum: artifactStatus === "blocked" ? void 0 : LATEST_REPORT_FORUM_PATH,
      bundle: artifactStatus === "blocked" ? void 0 : LATEST_REPORT_BUNDLE_PATH,
      readiness: LATEST_REPORT_READINESS_PATH,
      manifest: LATEST_REPORT_MANIFEST_PATH
    },
    archiveFiles: {
      html: artifactStatus === "blocked" ? void 0 : `${archivePrefix}.html`,
      ir: artifactStatus === "blocked" ? void 0 : `${archivePrefix}.ir.json`,
      memos: artifactStatus === "blocked" ? void 0 : `${archivePrefix}.memos.json`,
      forum: artifactStatus === "blocked" ? void 0 : `${archivePrefix}.forum.json`,
      bundle: artifactStatus === "blocked" ? void 0 : `${archivePrefix}.bundle.json`,
      readiness: `${archivePrefix}.readiness.json`,
      manifest: `${archivePrefix}.manifest.json`
    }
  };
};
const buildReadinessArtifact = (bundle, reportId, title) => ({
  reportId,
  title,
  generatedAt: bundle.generatedAt,
  reportReadiness: bundle.dataset.reportReadiness,
  reportReadinessReason: bundle.dataset.reportReadinessReason,
  generationGate: bundle.dataset.reportGenerationGate,
  gateReasons: bundle.dataset.reportGenerationBlockers,
  trustedCardsCount: bundle.dataset.trustedCardsCount,
  excludedEvidenceCount: bundle.excludedEvidence.length,
  excludedEvidence: bundle.excludedEvidence
});
const buildBlockedWorkspaceFiles = (readinessArtifact, manifest) => ({
  [LATEST_REPORT_MANIFEST_PATH]: formatJson(manifest),
  [LATEST_REPORT_READINESS_PATH]: formatJson(readinessArtifact)
});
const buildAllowedWorkspaceFiles = (bundle, memos, forum, ir, html, readinessArtifact, manifest) => {
  const storedArtifactFiles = {
    [LATEST_REPORT_HTML_PATH]: html,
    [LATEST_REPORT_IR_PATH]: formatJson(ir),
    [LATEST_REPORT_MEMOS_PATH]: formatJson(memos),
    [LATEST_REPORT_FORUM_PATH]: formatJson(forum),
    [LATEST_REPORT_BUNDLE_PATH]: formatJson(bundle),
    [LATEST_REPORT_MANIFEST_PATH]: formatJson(manifest),
    [LATEST_REPORT_READINESS_PATH]: formatJson(readinessArtifact)
  };
  if (manifest.archiveFiles.html) storedArtifactFiles[manifest.archiveFiles.html] = html;
  if (manifest.archiveFiles.ir) storedArtifactFiles[manifest.archiveFiles.ir] = formatJson(ir);
  if (manifest.archiveFiles.memos) storedArtifactFiles[manifest.archiveFiles.memos] = formatJson(memos);
  if (manifest.archiveFiles.forum) storedArtifactFiles[manifest.archiveFiles.forum] = formatJson(forum);
  if (manifest.archiveFiles.bundle) storedArtifactFiles[manifest.archiveFiles.bundle] = formatJson(bundle);
  if (manifest.archiveFiles.readiness) storedArtifactFiles[manifest.archiveFiles.readiness] = formatJson(readinessArtifact);
  storedArtifactFiles[manifest.archiveFiles.manifest] = formatJson(manifest);
  return {
    workspaceFiles: {
      [LATEST_REPORT_HTML_PATH]: html,
      [LATEST_REPORT_MANIFEST_PATH]: formatJson(manifest),
      [LATEST_REPORT_READINESS_PATH]: formatJson(readinessArtifact)
    },
    storedArtifactFiles
  };
};
const generateAnalystReportArtifacts = async (state, settings, options) => {
  const dependencies = {
    ...defaultDependencies,
    ...(options == null ? void 0 : options.dependencies) ?? {}
  };
  const total = 7;
  const updateProgress = (completed, title2, subtitle) => {
    var _a;
    (_a = options == null ? void 0 : options.onProgress) == null ? void 0 : _a.call(options, { completed, total, title: title2, subtitle });
  };
  updateProgress(0, "Building report evidence", "Collecting the verified dataset, workflow diagnostics, and trusted cards.");
  const bundle = dependencies.buildEvidenceBundle(state);
  if (!bundle) {
    throw new Error("Cannot generate analyst report because no dataset is loaded.");
  }
  const reportId = buildReportId(bundle);
  const title = buildReportTitle(bundle);
  const readinessArtifact = buildReadinessArtifact(bundle, reportId, title);
  const artifactStatus = resolveArtifactStatus(bundle.dataset.reportGenerationGate);
  if (bundle.dataset.reportGenerationGate === "blocked") {
    const manifest2 = buildManifest(
      bundle,
      reportId,
      title,
      artifactStatus,
      [],
      false,
      settings.reportTemplate ?? "management_review"
    );
    const workspaceFiles2 = buildBlockedWorkspaceFiles(readinessArtifact, manifest2);
    const storedArtifactFiles2 = {
      [LATEST_REPORT_MANIFEST_PATH]: workspaceFiles2[LATEST_REPORT_MANIFEST_PATH],
      [LATEST_REPORT_READINESS_PATH]: workspaceFiles2[LATEST_REPORT_READINESS_PATH],
      [manifest2.archiveFiles.manifest]: workspaceFiles2[LATEST_REPORT_MANIFEST_PATH],
      [manifest2.archiveFiles.readiness]: workspaceFiles2[LATEST_REPORT_READINESS_PATH]
    };
    updateProgress(2, "Report blocked", "Readiness blockers were recorded and the report pipeline stopped before synthesis.");
    return {
      title,
      bundle,
      memos: [],
      forum: null,
      ir: null,
      html: null,
      manifest: manifest2,
      readinessArtifact,
      artifactStatus,
      workspaceFiles: workspaceFiles2,
      storedArtifactFiles: storedArtifactFiles2
    };
  }
  const briefing = runReportEvidenceHarness(bundle);
  const abortSignal = options == null ? void 0 : options.abortSignal;
  const memoResults = [];
  for (let index = 0; index < analystRoles.length; index += 1) {
    abortSignal == null ? void 0 : abortSignal.throwIfAborted();
    const role = analystRoles[index];
    updateProgress(index + 1, `Generating ${role.replace(/_/g, " ")} memo`, "Running one bounded analyst role against the shared evidence bundle.");
    memoResults.push(await dependencies.generateMemo(role, bundle, settings, briefing, abortSignal));
  }
  const memos = memoResults.map((result) => result.memo);
  abortSignal == null ? void 0 : abortSignal.throwIfAborted();
  updateProgress(4, "Merging forum summary", "Aggregating the analyst memos into one structured forum summary.");
  const forumResult = await dependencies.generateForum(memos, bundle, settings, briefing, abortSignal);
  const forum = forumResult.forum;
  abortSignal == null ? void 0 : abortSignal.throwIfAborted();
  updateProgress(5, "Building report IR", "Converting evidence, memos, and forum output into a stable report contract.");
  const ir = dependencies.buildIr(bundle, memos, forum);
  const validation = dependencies.validateIr(ir);
  if (!validation.valid) {
    throw new Error(`Report IR validation failed: ${validation.errors.join(" ")}`);
  }
  const llmUsed = memoResults.some((result) => result.diagnostics.llmUsed) || forumResult.diagnostics.llmUsed;
  const fallbacksUsed = [
    ...memoResults.filter((result) => result.diagnostics.usedFallback && result.diagnostics.fallbackReason).map((result) => `memo:${result.diagnostics.fallbackReason}`),
    ...forumResult.diagnostics.usedFallback && forumResult.diagnostics.fallbackReason ? [`forum:${forumResult.diagnostics.fallbackReason}`] : []
  ];
  const manifest = buildManifest(
    bundle,
    reportId,
    title,
    artifactStatus,
    fallbacksUsed,
    llmUsed,
    settings.reportTemplate ?? "management_review"
  );
  updateProgress(6, "Rendering HTML report", "Generating the final HTML document and workspace artifacts.");
  const html = dependencies.renderHtml(ir, {
    language: settings.language,
    manifest,
    reportTemplate: settings.reportTemplate ?? "management_review"
  });
  const { workspaceFiles, storedArtifactFiles } = buildAllowedWorkspaceFiles(
    bundle,
    memos,
    forum,
    ir,
    html,
    readinessArtifact,
    manifest
  );
  updateProgress(7, "Report artifacts ready", "HTML, IR, memo, and forum artifacts have been assembled for workspace and history persistence.");
  return {
    title,
    bundle,
    memos,
    forum,
    ir,
    html,
    manifest,
    readinessArtifact,
    artifactStatus,
    workspaceFiles,
    storedArtifactFiles
  };
};
const sortByNarrativePriority = (left, right) => {
  const trustRank = {
    trusted: 0,
    caveated: 1,
    weak: 2,
    null: 3
  };
  const trustDelta = trustRank[left.autoAnalysisVerdict ?? "null"] - trustRank[right.autoAnalysisVerdict ?? "null"];
  if (trustDelta !== 0) {
    return trustDelta;
  }
  const roleRank = {
    preferred: 0,
    allowed_neutral: 1,
    avoid_if_possible: 2
  };
  const eligibilityDelta = roleRank[left.narrativeEligibility] - roleRank[right.narrativeEligibility];
  if (eligibilityDelta !== 0) {
    return eligibilityDelta;
  }
  return right.selectionScore - left.selectionScore;
};
const buildNarrativeAnalysisIrInputList = (cards, columnProfiles = []) => {
  const irList = buildDisplayAnalysisIrList(cards, columnProfiles);
  return cards.map((card) => {
    var _a;
    const ir = irList.find((candidate) => candidate.cardId === card.id);
    if (!ir) {
      return {
        cardId: card.id,
        displayTitle: card.plan.title,
        displayDescription: card.plan.description,
        safeNarrativeLabels: {
          title: card.plan.title,
          dimension: card.plan.groupByColumn ?? null,
          metric: card.plan.valueColumn ?? null
        },
        semanticRole: "business_dimension",
        autoAnalysisVerdict: ((_a = card.autoAnalysisEvaluation) == null ? void 0 : _a.verdict) ?? null,
        helperExposureLevel: "medium",
        businessMeaningConfidence: 0.4,
        aggregationQualityFlags: ["legacy_card_context"],
        narrativeEligibility: "allowed_neutral",
        selectionScore: 0,
        selectionReasons: ["legacy_card_context"],
        summary: card.summary.text,
        aggregatedDataSample: card.aggregatedData.slice(0, 5),
        isFallback: Boolean(card.plan.isFallback)
      };
    }
    return {
      cardId: ir.cardId,
      displayTitle: ir.displayTitle,
      displayDescription: ir.displayDescription,
      safeNarrativeLabels: ir.safeNarrativeLabels,
      semanticRole: ir.semanticRole,
      autoAnalysisVerdict: ir.autoAnalysisVerdict ?? null,
      helperExposureLevel: ir.helperExposureLevel,
      businessMeaningConfidence: ir.businessMeaningConfidence,
      aggregationQualityFlags: ir.aggregationQualityFlags,
      narrativeEligibility: ir.narrativeEligibility,
      selectionScore: ir.selectionScore,
      selectionReasons: ir.selectionReasons,
      summary: card.summary.text,
      aggregatedDataSample: ir.aggregatedData.slice(0, 5),
      isFallback: ir.isFallback
    };
  }).sort(sortByNarrativePriority);
};
const selectNarrativeAnalysisInputs = (inputs, maxCards = 6) => {
  const trustedInputs = inputs.filter((input) => input.autoAnalysisVerdict === "trusted");
  if (trustedInputs.length === 0) {
    return [];
  }
  const candidateInputs = trustedInputs;
  const preferred = candidateInputs.filter((input) => input.narrativeEligibility === "preferred");
  const allowedNeutral = candidateInputs.filter((input) => input.narrativeEligibility === "allowed_neutral");
  const avoidIfPossible = candidateInputs.filter((input) => input.narrativeEligibility === "avoid_if_possible");
  if (preferred.length > 0) {
    return [
      ...preferred.slice(0, maxCards),
      ...allowedNeutral.slice(0, Math.max(0, maxCards - preferred.length))
    ].slice(0, maxCards);
  }
  if (allowedNeutral.length > 0) {
    return allowedNeutral.slice(0, maxCards);
  }
  return avoidIfPossible.slice(0, maxCards);
};
const formatNarrativeAnalysisInputs = (inputs) => inputs.length > 0 ? JSON.stringify(inputs, null, 2) : "[]";
const TOTAL_PREFIX_PATTERN = /^total\b/i;
const toDetailLabel = (value, language) => language === "English" ? value.toLowerCase() : value;
const buildTotalMetricKpiLabel = (metricLabel, language) => {
  if (TOTAL_PREFIX_PATTERN.test(metricLabel)) {
    return metricLabel;
  }
  return getTranslation("executive_kpi_total_metric_label", language, { metric: metricLabel });
};
const buildTopGroupKpiLabel = (groupLabel, language) => getTranslation("executive_kpi_top_group_label", language, { group: groupLabel });
const buildGroupCountKpiLabel = (pluralGroupLabel, language) => getTranslation("executive_kpi_group_count_label", language, { groups: pluralGroupLabel });
const buildInactiveKpiLabel = (pluralGroupLabel, language) => getTranslation("executive_kpi_inactive_label", language, { groups: pluralGroupLabel });
const buildTopShareKpiLabel = (count, language) => getTranslation("executive_kpi_top_share_label", language, { count });
const buildTotalMetricKpiDetail = ({
  rowCount,
  groupCount,
  pluralGroupLabel,
  language
}) => rowCount ? getTranslation("executive_kpi_total_detail_rows", language, { rows: rowCount.toLocaleString() }) : getTranslation("executive_kpi_total_detail_groups", language, {
  count: groupCount.toLocaleString(),
  groups: toDetailLabel(pluralGroupLabel, language)
});
const buildTopGroupKpiDetail = ({
  topLabelValue,
  shareValue,
  metricLabel,
  language
}) => {
  if (!topLabelValue && shareValue) {
    return getTranslation("executive_kpi_top_group_detail_share_only", language, {
      share: shareValue,
      metric: toDetailLabel(metricLabel, language)
    });
  }
  if (!topLabelValue) {
    return getTranslation("executive_kpi_top_group_detail_unnamed", language);
  }
  return shareValue ? getTranslation("executive_kpi_top_group_detail", language, {
    group: topLabelValue,
    share: shareValue,
    metric: toDetailLabel(metricLabel, language)
  }) : getTranslation("executive_kpi_top_group_detail_fallback", language, {
    group: topLabelValue
  });
};
const buildGroupCountKpiDetail = ({
  pluralGroupLabel,
  language
}) => getTranslation("executive_kpi_group_count_detail", language, {
  groups: toDetailLabel(pluralGroupLabel, language)
});
const buildInactiveKpiDetail = ({
  statusLabel,
  language
}) => getTranslation("executive_kpi_inactive_detail", language, {
  status: statusLabel
});
const buildTopShareKpiDetail = ({
  count,
  pluralGroupLabel,
  language
}) => getTranslation("executive_kpi_top_share_detail", language, {
  count,
  groups: toDetailLabel(pluralGroupLabel, language)
});
const buildPeriodDeltaLabel = (period, language) => getTranslation(period === "month" ? "executive_kpi_delta_month" : "executive_kpi_delta_day", language);
const buildDistributionDeltaLabel = (groupLabel, language) => getTranslation("executive_kpi_delta_distribution", language, {
  group: groupLabel
});
const DATE_SAMPLE_LIMIT = 50;
const DATE_MATCH_THRESHOLD = 0.6;
const FLAT_DELTA_THRESHOLD = 5e-3;
const DATE_TEXT_PATTERN = /\d{4}-\d{1,2}(?:-\d{1,2})?|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2}(?:,?\s+\d{2,4})?/i;
const TIME_TEXT_PATTERN = /\d{1,2}:\d{2}/;
const isDateLikeProfile = (profile) => (profile == null ? void 0 : profile.type) === "date" || (profile == null ? void 0 : profile.type) === "time";
const parseDate = (value) => {
  if (value === null || value === void 0) return null;
  const stringValue = String(value).trim();
  if (!stringValue) return null;
  const parsed = new Date(stringValue);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
};
const isDateLikeSampleValue = (value) => {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime());
  }
  if (typeof value !== "string") {
    return false;
  }
  const stringValue = value.trim();
  if (!stringValue) return false;
  if (!DATE_TEXT_PATTERN.test(stringValue) && !TIME_TEXT_PATTERN.test(stringValue)) {
    return false;
  }
  return parseDate(stringValue) !== null;
};
const toDayKey = (date) => date.toISOString().slice(0, 10);
const toMonthKey = (date) => date.toISOString().slice(0, 7);
const toComparableText = (value) => String(value ?? "").trim().toLowerCase();
const matchesPreFilters = (row, filters) => {
  if (!(filters == null ? void 0 : filters.length)) return true;
  return filters.every((filter) => {
    const operator = normalizePreFilterOperator(filter.operator).normalized;
    return applyPreFilter(getRowValue(row, filter.column), operator, filter.value);
  });
};
const matchesCardFilter = (row, filter) => {
  var _a;
  if (!(filter == null ? void 0 : filter.column) || !((_a = filter.values) == null ? void 0 : _a.length)) return true;
  const actualValue = toComparableText(getRowValue(row, filter.column));
  return filter.values.some((value) => toComparableText(value) === actualValue);
};
const applyCardScope = (rows, card) => rows.filter((row) => matchesPreFilters(row, card.plan.preFilter) && matchesCardFilter(row, card.filter));
const detectDateColumn = (columnProfiles, rows) => {
  const firstProfileMatch = columnProfiles.find(isDateLikeProfile);
  if (firstProfileMatch) {
    return firstProfileMatch.name;
  }
  const sampleRow = rows[0];
  if (!sampleRow) return null;
  return Object.keys(sampleRow).find((columnName) => {
    const sampleValues = rows.map((row) => getRowValue(row, columnName)).filter((value) => value !== null && value !== void 0 && String(value).trim() !== "").slice(0, DATE_SAMPLE_LIMIT);
    if (sampleValues.length === 0) return false;
    const validDates = sampleValues.filter(isDateLikeSampleValue).length;
    return validDates / sampleValues.length >= DATE_MATCH_THRESHOLD;
  }) ?? null;
};
const getAggregationMode = (card) => {
  if (card.plan.aggregation === "avg") return "avg";
  if (card.plan.aggregation === "count") return "count";
  if (!card.plan.valueColumn) return "count";
  return "sum";
};
const aggregateRows = (rows, card) => {
  const aggregationMode = getAggregationMode(card);
  if (aggregationMode === "count") {
    return rows.length;
  }
  const numericValues = rows.map((row) => toNumericValue$3(getRowValue(row, card.plan.valueColumn))).filter((value) => value !== null && Number.isFinite(value));
  if (numericValues.length === 0) {
    return null;
  }
  if (aggregationMode === "avg") {
    return numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;
  }
  return numericValues.reduce((sum, value) => sum + value, 0);
};
const buildBuckets = (rows, keyBuilder) => {
  const buckets = /* @__PURE__ */ new Map();
  rows.forEach(({ row, date }) => {
    const key = keyBuilder(date);
    const bucketRows = buckets.get(key) ?? [];
    bucketRows.push(row);
    buckets.set(key, bucketRows);
  });
  return buckets;
};
const getDirection = (ratio) => {
  if (Math.abs(ratio) < FLAT_DELTA_THRESHOLD) {
    return "flat";
  }
  return ratio > 0 ? "up" : "down";
};
const formatDeltaValue = (ratio) => {
  const percentValue = ratio * 100;
  const sign = percentValue > 0 ? "+" : "";
  const maximumFractionDigits = Math.abs(percentValue) >= 10 ? 0 : 1;
  return `${sign}${percentValue.toLocaleString(void 0, { maximumFractionDigits })}%`;
};
const buildPeriodDelta = (bucketMap, card, label) => {
  const orderedKeys = [...bucketMap.keys()].sort();
  if (orderedKeys.length < 2) return null;
  const currentRows = bucketMap.get(orderedKeys[orderedKeys.length - 1] ?? "");
  const previousRows = bucketMap.get(orderedKeys[orderedKeys.length - 2] ?? "");
  if (!(currentRows == null ? void 0 : currentRows.length) || !(previousRows == null ? void 0 : previousRows.length)) return null;
  const currentValue = aggregateRows(currentRows, card);
  const previousValue = aggregateRows(previousRows, card);
  if (currentValue === null || previousValue === null || previousValue <= 0 || !Number.isFinite(currentValue) || !Number.isFinite(previousValue)) {
    return null;
  }
  const ratio = (currentValue - previousValue) / Math.abs(previousValue);
  if (!Number.isFinite(ratio)) return null;
  return {
    kind: "period",
    direction: getDirection(ratio),
    value: formatDeltaValue(ratio),
    label
  };
};
const buildDistributionDelta = (metricRows, totalValue, groupLabel, language) => {
  if (!metricRows.length || totalValue === 0 || !Number.isFinite(totalValue)) {
    return void 0;
  }
  const topShare = metricRows[0].value / totalValue;
  if (!Number.isFinite(topShare)) {
    return void 0;
  }
  return {
    kind: "distribution",
    direction: "flat",
    value: formatShareValue(topShare),
    label: buildDistributionDeltaLabel(groupLabel, language)
  };
};
const buildExecutiveKpiDelta = ({
  card,
  columnProfiles,
  csvData,
  metricRows,
  totalValue,
  groupLabel,
  language
}) => {
  const scopedRows = applyCardScope((csvData == null ? void 0 : csvData.data) ?? [], card);
  const dateColumn = detectDateColumn(columnProfiles, (csvData == null ? void 0 : csvData.data) ?? []);
  if (dateColumn && scopedRows.length > 0) {
    const datedRows = scopedRows.map((row) => {
      const parsedDate = parseDate(getRowValue(row, dateColumn));
      return parsedDate ? { row, date: parsedDate } : null;
    }).filter((entry) => Boolean(entry));
    if (datedRows.length > 0) {
      const monthDelta = buildPeriodDelta(buildBuckets(datedRows, toMonthKey), card, buildPeriodDeltaLabel("month", language));
      if (monthDelta && new Set(datedRows.map(({ date }) => toMonthKey(date))).size >= 3) {
        return monthDelta;
      }
      const dayDelta = buildPeriodDelta(buildBuckets(datedRows, toDayKey), card, buildPeriodDeltaLabel("day", language));
      if (dayDelta && new Set(datedRows.map(({ date }) => toDayKey(date))).size >= 2) {
        return dayDelta;
      }
    }
  }
  return buildDistributionDelta(metricRows, totalValue, groupLabel, language);
};
const STATUS_COLUMN_PATTERN = /status|state|active|activity|enabled|lifecycle|stage/i;
const INACTIVE_VALUE_PATTERN = /inactive|closed|disabled|archived|cancelled|terminated|dormant|paused|stopped|offboarded|obsolete/;
const FALSEY_INACTIVE_VALUES = /* @__PURE__ */ new Set(["false", "0", "no", "n", "off"]);
const getSortedMetricRows = (card) => {
  const valueKey = card.plan.valueColumn || "count";
  return card.aggregatedData.map((row) => ({
    row,
    value: toNumericValue$3(getRowValue(row, valueKey)) ?? 0
  })).filter((entry) => Number.isFinite(entry.value)).sort((left, right) => right.value - left.value);
};
const buildInteractiveKpi = ({
  id,
  label,
  value,
  detail,
  tone,
  hierarchy,
  sourceCardId
}) => ({
  id,
  label,
  value,
  detail,
  tone,
  hierarchy,
  sourceCardId,
  action: { type: "show-card" }
});
const buildInactiveKpi = (csvData, groupByColumn, groupLabel, sourceCardId, language) => {
  var _a;
  if (!((_a = csvData == null ? void 0 : csvData.data) == null ? void 0 : _a.length)) return null;
  const headerRow = csvData.data[0];
  const statusColumn = Object.keys(headerRow).find((key) => STATUS_COLUMN_PATTERN.test(key));
  if (!statusColumn) return null;
  const inactiveGroups = /* @__PURE__ */ new Set();
  csvData.data.forEach((row) => {
    const rawGroup = getRowValue(row, groupByColumn);
    const rawStatus = getRowValue(row, statusColumn);
    const groupValue = String(rawGroup ?? "").trim();
    const normalizedStatus = String(rawStatus ?? "").trim().toLowerCase();
    if (!groupValue || !normalizedStatus) return;
    if (INACTIVE_VALUE_PATTERN.test(normalizedStatus) || FALSEY_INACTIVE_VALUES.has(normalizedStatus)) {
      inactiveGroups.add(groupValue);
    }
  });
  if (inactiveGroups.size === 0) return null;
  return buildInteractiveKpi({
    id: "inactive-groups",
    label: buildInactiveKpiLabel(pluralizeLabel(groupLabel), language),
    value: inactiveGroups.size.toLocaleString(),
    detail: buildInactiveKpiDetail({
      statusLabel: toDisplayLabel(statusColumn, "status"),
      language
    }),
    tone: "warning",
    hierarchy: "insight",
    sourceCardId
  });
};
const buildExecutiveKpis = ({
  cards,
  columnProfiles,
  csvData,
  language
}) => {
  var _a;
  const safeCards = Array.isArray(cards) ? cards : [];
  const safeProfiles = Array.isArray(columnProfiles) ? columnProfiles : [];
  const cardMap = new Map(safeCards.map((card) => [card.id, card]));
  const candidateIrs = buildDisplayAnalysisIrList(safeCards, safeProfiles).filter((ir) => !ir.isFallback && Boolean(ir.groupByColumn) && ir.aggregatedRows > 0).sort((left, right) => right.selectionScore - left.selectionScore);
  const trustedCandidateIrs = candidateIrs.filter((ir) => ir.autoAnalysisVerdict === "trusted");
  if (trustedCandidateIrs.length === 0) {
    return [];
  }
  const scoringPool = trustedCandidateIrs;
  const businessCandidateIrs = scoringPool.filter((ir) => ir.semanticRole === "business_dimension");
  const primaryIr = businessCandidateIrs[0] ?? scoringPool[0];
  const primaryCard = primaryIr ? cardMap.get(primaryIr.cardId) : void 0;
  if (!(primaryCard == null ? void 0 : primaryCard.plan.groupByColumn) || !primaryIr) {
    return [];
  }
  const metricRows = getSortedMetricRows(primaryCard);
  if (metricRows.length === 0) {
    return [];
  }
  const valueKey = primaryCard.plan.valueColumn || "count";
  const metricLabel = primaryIr.displayMetricLabel ?? buildMetricLabel$1(valueKey);
  const groupLabel = primaryIr.displayGroupLabel;
  const pluralGroupLabel = pluralizeLabel(groupLabel);
  const totalValue = metricRows.reduce((sum, entry) => sum + entry.value, 0);
  const topEntry = metricRows[0];
  const rawTopLabel = getRowValue(topEntry.row, primaryIr.groupByColumn ?? primaryCard.plan.groupByColumn);
  const topLabelValue = rawTopLabel != null && String(rawTopLabel).trim() !== "" ? String(rawTopLabel).trim() : null;
  const topEntryShare = totalValue !== 0 ? topEntry.value / totalValue : null;
  const datasetRowDetail = buildTotalMetricKpiDetail({
    rowCount: ((_a = csvData == null ? void 0 : csvData.data) == null ? void 0 : _a.length) ?? null,
    groupCount: metricRows.length,
    pluralGroupLabel,
    language
  });
  const kpis = [
    {
      ...buildInteractiveKpi({
        id: "total-metric",
        label: buildTotalMetricKpiLabel(metricLabel, language),
        value: formatMetricValue(totalValue, primaryCard.plan.valueColumn, safeProfiles),
        detail: datasetRowDetail,
        tone: "primary",
        hierarchy: "primary",
        sourceCardId: primaryCard.id
      }),
      delta: buildExecutiveKpiDelta({
        card: primaryCard,
        columnProfiles: safeProfiles,
        csvData,
        metricRows,
        totalValue,
        groupLabel,
        language
      })
    },
    buildInteractiveKpi({
      id: "top-group",
      label: buildTopGroupKpiLabel(groupLabel, language),
      value: formatMetricValue(topEntry.value, primaryCard.plan.valueColumn, safeProfiles),
      detail: buildTopGroupKpiDetail({
        topLabelValue,
        shareValue: topEntryShare !== null ? formatShareValue(topEntryShare) : null,
        metricLabel,
        language
      }),
      tone: "accent",
      hierarchy: "secondary",
      sourceCardId: primaryCard.id
    }),
    buildInteractiveKpi({
      id: "group-count",
      label: buildGroupCountKpiLabel(pluralGroupLabel, language),
      value: metricRows.length.toLocaleString(),
      detail: buildGroupCountKpiDetail({
        pluralGroupLabel,
        language
      }),
      tone: "neutral",
      hierarchy: "secondary",
      sourceCardId: primaryCard.id
    })
  ];
  const inactiveKpi = buildInactiveKpi(csvData, primaryCard.plan.groupByColumn, groupLabel, primaryCard.id, language);
  if (inactiveKpi) {
    kpis.push(inactiveKpi);
  } else if (metricRows.length > 1 && totalValue !== 0) {
    const concentrationSize = Math.min(3, metricRows.length);
    const concentrationTotal = metricRows.slice(0, concentrationSize).reduce((sum, entry) => sum + entry.value, 0);
    kpis.push(buildInteractiveKpi({
      id: "top-share",
      label: buildTopShareKpiLabel(concentrationSize, language),
      value: formatShareValue(concentrationTotal / totalValue),
      detail: buildTopShareKpiDetail({
        count: concentrationSize,
        pluralGroupLabel,
        language
      }),
      tone: "accent",
      hierarchy: "insight",
      sourceCardId: primaryCard.id
    }));
  }
  return kpis.slice(0, 4);
};
export {
  buildExecutiveKpis as A,
  LATEST_REPORT_MANIFEST_PATH as L,
  buildDisplayAnalysisIrList as a,
  buildDisplayAnalysisIr as b,
  buildNarrativeAnalysisIrInputList as c,
  buildColumnDisplayLabels as d,
  resolvePlanGroupLabel as e,
  resolvePlanMetricLabel as f,
  resolveDisplayPlanLabels as g,
  formatColumnDisplayHints as h,
  formatNarrativeAnalysisInputs as i,
  buildDisplayCardContext as j,
  printReportArtifact as k,
  loadReportArtifactHtml as l,
  hydrateLatestReportWorkspaceFiles as m,
  LATEST_REPORT_READINESS_PATH as n,
  openReportArtifact as o,
  parseReportArtifactManifest as p,
  hasOpenableLatestReport as q,
  resolveColumnDisplayLabel as r,
  selectNarrativeAnalysisInputs as s,
  LATEST_REPORT_HTML_PATH as t,
  generateAnalystReportArtifacts as u,
  saveReportArtifacts as v,
  resolveDisplayPlanTitle as w,
  resolveDisplayPlanDescription as x,
  isLatestReportPartial as y,
  resolveLatestReportBlockedInfo as z
};
