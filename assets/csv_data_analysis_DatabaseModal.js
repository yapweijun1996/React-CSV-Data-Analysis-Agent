import { j as jsxRuntimeExports, r as reactExports } from "./csv_data_analysis_vendor-react-core.js";
import { s as shallow$1 } from "./csv_data_analysis_vendor-state.js";
import { T as TabulatorTable } from "./csv_data_analysis_TabulatorTable.js";
import { u as useAppStore } from "./csv_data_analysis_index.js";
import { I as IconClose } from "./csv_data_analysis_IconClose.js";
import { cA as summarizeTraceContract, cB as WORKSPACE_QUERY_LIMIT_OPTIONS, cC as DEFAULT_WORKSPACE_QUERY_LIMIT, cD as WORKSPACE_QUERY_TEMPLATE_OPTIONS, bx as buildEffectiveColumnRegistryFromState, cE as createDefaultWorkspaceQueryDrafts, bq as createIdleDuckDbSessionStatus } from "./csv_data_analysis_app-agent.js";
import "./csv_data_analysis_vendor-data.js";
import "./csv_data_analysis_vendor-monaco.js";
import "./csv_data_analysis_vendor-misc.js";
import "./csv_data_analysis_vendor-ui.js";
import "./csv_data_analysis_app-reporting.js";
import "./csv_data_analysis_vendor-ai-sdk.js";
import "./csv_data_analysis_app-ai.js";
import "./csv_data_analysis_app-agent-planning.js";
import "./csv_data_analysis_vendor-storage.js";
const ACTIVE_QUERY_ACTIVITY_ID = "__active_data_query__";
const toDate = (value) => value instanceof Date ? value : new Date(value);
const getActivitySignature = (activity) => [
  toDate(activity.appliedAt).toISOString(),
  activity.engine,
  activity.sqlPreview ?? "",
  activity.tableName ?? "",
  activity.loadVersion ?? ""
].join("::");
const toActivityFromQueryTrace = (entry) => ({
  id: entry.id,
  source: "history",
  phase: entry.phase,
  origin: entry.origin,
  explanation: entry.explanation,
  engine: entry.engine,
  sqlPreview: entry.sqlPreview,
  tableName: entry.tableName,
  loadVersion: entry.loadVersion,
  fallbackReason: entry.fallbackReason ?? null,
  appliedAt: toDate(entry.appliedAt),
  templateId: entry.templateId,
  formSnapshot: entry.formSnapshot,
  result: entry.result,
  traceContract: entry.traceContract
});
const toActivityFromActiveQuery = (query, matchingTrace) => ({
  id: ACTIVE_QUERY_ACTIVITY_ID,
  source: "active",
  phase: (matchingTrace == null ? void 0 : matchingTrace.phase) ?? "analysis",
  origin: (matchingTrace == null ? void 0 : matchingTrace.origin) ?? "analysis",
  explanation: query.explanation,
  engine: query.engine,
  sqlPreview: query.sqlPreview,
  tableName: query.tableName,
  loadVersion: query.loadVersion,
  fallbackReason: query.fallbackReason ?? null,
  appliedAt: toDate(query.appliedAt),
  templateId: matchingTrace == null ? void 0 : matchingTrace.templateId,
  formSnapshot: matchingTrace == null ? void 0 : matchingTrace.formSnapshot,
  traceContract: matchingTrace == null ? void 0 : matchingTrace.traceContract,
  result: {
    totalMatchedRows: query.result.totalMatchedRows,
    returnedRows: query.result.returnedRows,
    truncated: query.result.truncated,
    selectedColumns: query.result.selectedColumns,
    appliedOrderBy: query.result.appliedOrderBy,
    appliedLimit: query.result.appliedLimit,
    durationMs: query.result.durationMs,
    previewRows: query.result.rows.slice(0, 20)
  }
});
const buildDatabaseModalQueryActivities = (activeDataQuery, queryHistory) => {
  const historyActivities = [...queryHistory].reverse().map(toActivityFromQueryTrace);
  if (!activeDataQuery) {
    return historyActivities;
  }
  const matchingTrace = queryHistory.find(
    (entry) => getActivitySignature(toActivityFromQueryTrace(entry)) === getActivitySignature(toActivityFromActiveQuery(activeDataQuery))
  );
  const activeActivity = toActivityFromActiveQuery(activeDataQuery, matchingTrace);
  const activeSignature = getActivitySignature(activeActivity);
  const dedupedHistory = historyActivities.filter((entry) => getActivitySignature(entry) !== activeSignature);
  return [activeActivity, ...dedupedHistory];
};
const formatTimestamp = (value) => value ? new Date(value).toLocaleString() : "N/A";
const formatTemplateLabel = (templateId) => {
  if (!templateId) {
    return "N/A";
  }
  return templateId.split("_").map((token) => token.charAt(0).toUpperCase() + token.slice(1)).join(" ");
};
const formatOriginLabel = (origin) => {
  if (origin === "workspace") return "Explorer";
  if (origin === "chat") return "Chat";
  return "Analysis";
};
const formatOrderBy = (activity) => {
  const appliedOrderBy = (activity == null ? void 0 : activity.result.appliedOrderBy) ?? [];
  if (appliedOrderBy.length === 0) {
    return "No sort applied";
  }
  return appliedOrderBy.map((order) => `${order.column} (${order.direction})`).join(", ");
};
const DatabaseModalSidebar = ({
  csvData,
  queryActivities,
  selectedQueryActivity,
  onSelectQueryActivity,
  onLoadWorkspaceTemplate,
  onRerunWorkspaceTemplate,
  canLoadWorkspaceTemplate = false,
  canRerunWorkspaceTemplate = false
}) => {
  const selectedTrace = summarizeTraceContract((selectedQueryActivity == null ? void 0 : selectedQueryActivity.traceContract) ?? null);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("aside", { className: "min-h-0 space-y-4 overflow-y-auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-card border border-slate-200 bg-white p-4 shadow-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500", children: "Current Result" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm text-slate-600", children: "Inspect the selected query trace, reload its saved template, or rerun it against the current DuckDB session." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-card border border-slate-200 bg-slate-50 px-3 py-2.5 text-right", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500", children: "Recorded" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm font-semibold text-slate-900", children: queryActivities.length })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("dl", { className: "mt-4 space-y-3 text-sm text-slate-700", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "File" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { className: "text-right font-medium text-slate-900", children: (csvData == null ? void 0 : csvData.fileName) ?? "No dataset loaded" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "Origin" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { className: "text-right font-medium text-slate-900", children: selectedQueryActivity ? formatOriginLabel(selectedQueryActivity.origin) : "No query selected" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "Template" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { className: "text-right font-medium text-slate-900", children: formatTemplateLabel(selectedQueryActivity == null ? void 0 : selectedQueryActivity.templateId) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "Phase" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { className: "text-right font-medium uppercase text-slate-900", children: (selectedQueryActivity == null ? void 0 : selectedQueryActivity.source) === "active" ? "Current Query" : (selectedQueryActivity == null ? void 0 : selectedQueryActivity.phase) ?? "N/A" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "Engine" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { className: "text-right font-medium text-slate-900", children: (selectedQueryActivity == null ? void 0 : selectedQueryActivity.engine) ?? "N/A" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "Table" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { className: "break-all text-right font-medium text-slate-900", children: (selectedQueryActivity == null ? void 0 : selectedQueryActivity.tableName) ?? "N/A" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "Load version" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { className: "break-all text-right font-medium text-slate-900", children: (selectedQueryActivity == null ? void 0 : selectedQueryActivity.loadVersion) ?? "N/A" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "Applied at" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { className: "text-right font-medium text-slate-900", children: formatTimestamp((selectedQueryActivity == null ? void 0 : selectedQueryActivity.appliedAt) ?? null) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "Rows" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { className: "text-right font-medium text-slate-900", children: selectedQueryActivity ? `${selectedQueryActivity.result.returnedRows} / ${selectedQueryActivity.result.totalMatchedRows}` : "N/A" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "Columns" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { className: "text-right font-medium text-slate-900", children: (selectedQueryActivity == null ? void 0 : selectedQueryActivity.result.selectedColumns.length) ?? 0 })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "Limit" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { className: "text-right font-medium text-slate-900", children: (selectedQueryActivity == null ? void 0 : selectedQueryActivity.result.appliedLimit) ?? "N/A" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "Order" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { className: "text-right font-medium text-slate-900", children: formatOrderBy(selectedQueryActivity) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "Reason code" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { className: "break-all text-right font-medium text-slate-900", children: (selectedTrace == null ? void 0 : selectedTrace.reasonCode) ?? "N/A" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "Retry class" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { className: "break-all text-right font-medium text-slate-900", children: (selectedTrace == null ? void 0 : selectedTrace.retryClass) ?? "N/A" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "Failure class" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { className: "break-all text-right font-medium text-slate-900", children: (selectedTrace == null ? void 0 : selectedTrace.failureClass) ?? "N/A" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "Trace contract" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { className: "break-all text-right font-medium text-slate-900", children: (selectedTrace == null ? void 0 : selectedTrace.contractVersion) ?? "N/A" })
        ] })
      ] }),
      (selectedQueryActivity == null ? void 0 : selectedQueryActivity.fallbackReason) ? /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-4 rounded-card border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-700", children: [
        "Fallback: ",
        selectedQueryActivity.fallbackReason
      ] }) : null,
      canLoadWorkspaceTemplate || canRerunWorkspaceTemplate ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 flex flex-wrap gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: onLoadWorkspaceTemplate,
            disabled: !canLoadWorkspaceTemplate,
            className: `rounded-card px-3 py-1.5 text-sm font-medium transition ${canLoadWorkspaceTemplate ? "bg-slate-900 text-white hover:bg-slate-800" : "cursor-not-allowed bg-slate-100 text-slate-400"}`,
            children: "Load Template"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: onRerunWorkspaceTemplate,
            disabled: !canRerunWorkspaceTemplate,
            className: `rounded-card px-3 py-1.5 text-sm font-medium transition ${canRerunWorkspaceTemplate ? "border border-slate-300 bg-white text-slate-900 hover:border-slate-400" : "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"}`,
            children: "Rerun Query"
          }
        )
      ] }) : null
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-card border border-slate-200 bg-white p-4 shadow-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-start justify-between gap-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500", children: "Query History" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm text-slate-600", children: "Browse recent explorer, chat, and automatic analysis queries without leaving this view." })
      ] }) }),
      queryActivities.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 max-h-[480px] space-y-3 overflow-y-auto pr-1", children: queryActivities.map((activity) => {
        const isSelected = (selectedQueryActivity == null ? void 0 : selectedQueryActivity.id) === activity.id;
        const traceSummary = summarizeTraceContract(activity.traceContract ?? null);
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            onClick: () => onSelectQueryActivity(activity.id),
            className: `w-full rounded-card border px-3 py-2.5 text-left transition ${isSelected ? "border-blue-300 bg-blue-50 shadow-sm" : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"}`,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white", children: activity.source === "active" ? "Current Query" : formatOriginLabel(activity.origin) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600", children: activity.engine }),
                activity.templateId ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600", children: formatTemplateLabel(activity.templateId) }) : null,
                activity.fallbackReason ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700", children: "Fallback" }) : null,
                (traceSummary == null ? void 0 : traceSummary.reasonCode) ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600", children: traceSummary.reasonCode }) : null
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 text-sm font-semibold text-slate-900", children: activity.explanation }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: formatTimestamp(activity.appliedAt) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                  activity.result.returnedRows,
                  " / ",
                  activity.result.totalMatchedRows,
                  " rows"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                  activity.result.durationMs,
                  " ms"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: (traceSummary == null ? void 0 : traceSummary.retryClass) ?? (activity.result.truncated ? "Preview truncated" : "Preview complete") })
              ] })
            ]
          },
          activity.id
        );
      }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 rounded-card border border-dashed border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500", children: "No query history yet. Run an explorer template or chat data query to populate this analyst timeline." })
    ] })
  ] });
};
const PREDICATE_OPERATOR_OPTIONS = [
  { value: "eq", label: "Equals" },
  { value: "neq", label: "Not equals" },
  { value: "contains", label: "Contains" },
  { value: "starts_with", label: "Starts with" },
  { value: "ends_with", label: "Ends with" },
  { value: "gt", label: "Greater than" },
  { value: "gte", label: "Greater than or equal" },
  { value: "lt", label: "Less than" },
  { value: "lte", label: "Less than or equal" },
  { value: "between", label: "Between" },
  { value: "in", label: "In list" },
  { value: "is_null", label: "Is null / blank" },
  { value: "not_null", label: "Is not null / blank" }
];
const isValueOptionalOperator = (operator) => operator === "is_null" || operator === "not_null";
const usesRangeValues = (operator) => operator === "between";
const usesListValues = (operator) => operator === "in";
const createEmptyPredicate = (availableColumns) => ({
  column: availableColumns[0] ?? "",
  operator: "eq",
  value: ""
});
const createEmptyGroup = (availableColumns) => ({
  predicates: [createEmptyPredicate(availableColumns)]
});
const ColumnPicker = ({ label, availableColumns, selectedColumns, onToggle, description }) => /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block", children: [
  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500", children: label }),
  description ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm text-slate-500", children: description }) : null,
  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 flex max-h-36 flex-wrap gap-2 overflow-y-auto rounded-card border border-slate-200 bg-slate-50 p-3", children: availableColumns.length > 0 ? availableColumns.map((column) => {
    const isSelected = selectedColumns.includes(column);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        onClick: () => onToggle(column),
        className: `rounded-full px-3 py-1.5 text-sm font-medium transition ${isSelected ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300"}`,
        children: column
      },
      column
    );
  }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-500", children: "No columns available." }) })
] });
const SelectField = ({ label, value, onChange, options, disabled = false }) => /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block", children: [
  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500", children: label }),
  /* @__PURE__ */ jsxRuntimeExports.jsx(
    "select",
    {
      value,
      onChange: (event) => onChange(event.target.value),
      disabled,
      className: "mt-2 w-full rounded-card border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100",
      children: options.map((option) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: option.value, children: option.label }, option.value))
    }
  )
] });
const TextField = ({ label, value, onChange, placeholder }) => /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block", children: [
  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500", children: label }),
  /* @__PURE__ */ jsxRuntimeExports.jsx(
    "input",
    {
      type: "text",
      value,
      onChange: (event) => onChange(event.target.value),
      placeholder,
      className: "mt-2 w-full rounded-card border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
    }
  )
] });
const LimitField = ({ limit, onChange }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  SelectField,
  {
    label: "Limit",
    value: String(limit || DEFAULT_WORKSPACE_QUERY_LIMIT),
    onChange: (value) => onChange(Number(value)),
    options: WORKSPACE_QUERY_LIMIT_OPTIONS.map((option) => ({
      value: String(option),
      label: `${option} rows`
    }))
  }
);
const PredicateEditor = ({ title, predicates, availableColumns, onChange }) => {
  const updatePredicate = (index, updater) => {
    onChange(predicates.map((predicate, predicateIndex) => predicateIndex === index ? updater(predicate) : predicate));
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-card border border-slate-200 bg-slate-50 p-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold text-slate-900", children: title }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-xs text-slate-500", children: "Each predicate in this block is AND-ed together." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: () => onChange([...predicates, createEmptyPredicate(availableColumns)]),
          className: "rounded-card border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-300",
          children: "Add predicate"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 space-y-3", children: predicates.map((predicate, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-card border border-slate-200 bg-white p-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          SelectField,
          {
            label: "Column",
            value: predicate.column,
            onChange: (value) => updatePredicate(index, (current) => ({ ...current, column: value })),
            options: availableColumns.map((column) => ({ value: column, label: column }))
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          SelectField,
          {
            label: "Operator",
            value: predicate.operator,
            onChange: (value) => updatePredicate(index, (current) => ({
              ...current,
              operator: value,
              ...value === "between" ? { secondaryValue: current.secondaryValue ?? "" } : {}
            })),
            options: PREDICATE_OPERATOR_OPTIONS.map((option) => ({ value: option.value, label: option.label }))
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-end justify-end", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: () => onChange(predicates.filter((_, predicateIndex) => predicateIndex !== index)),
            disabled: predicates.length <= 1,
            className: `rounded-card px-3 py-1.5 text-sm font-medium transition ${predicates.length > 1 ? "border border-slate-200 bg-white text-slate-700 hover:border-slate-300" : "cursor-not-allowed border border-slate-100 bg-slate-100 text-slate-400"}`,
            children: "Remove"
          }
        ) })
      ] }),
      !isValueOptionalOperator(predicate.operator) ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `mt-3 grid gap-3 ${usesRangeValues(predicate.operator) ? "md:grid-cols-2" : ""}`, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: usesListValues(predicate.operator) ? "Values (comma separated)" : "Value",
            value: predicate.value ?? "",
            onChange: (value) => updatePredicate(index, (current) => ({ ...current, value })),
            placeholder: usesListValues(predicate.operator) ? "A, B, C" : "Enter a value"
          }
        ),
        usesRangeValues(predicate.operator) ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "And",
            value: predicate.secondaryValue ?? "",
            onChange: (value) => updatePredicate(index, (current) => ({ ...current, secondaryValue: value })),
            placeholder: "Upper bound"
          }
        ) : null
      ] }) : null
    ] }, `${title}-${index}`)) })
  ] });
};
const PreviewRowsEditor = ({ draft, availableColumns, onDraftChange }) => {
  var _a, _b, _c;
  const selectableSortColumns = draft.columns.length > 0 ? draft.columns : availableColumns;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ColumnPicker,
      {
        label: "Visible Columns",
        availableColumns,
        selectedColumns: draft.columns,
        onToggle: (column) => onDraftChange({
          ...draft,
          columns: draft.columns.includes(column) ? draft.columns.filter((entry) => entry !== column) : [...draft.columns, column]
        }),
        description: "Choose the columns returned by the row preview."
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SelectField,
        {
          label: "Sort Column",
          value: ((_a = draft.orderBy) == null ? void 0 : _a.column) ?? "",
          onChange: (value) => {
            var _a2;
            return onDraftChange({
              ...draft,
              orderBy: value ? { column: value, direction: ((_a2 = draft.orderBy) == null ? void 0 : _a2.direction) ?? "asc" } : null
            });
          },
          options: [
            { value: "", label: "No sort" },
            ...selectableSortColumns.map((column) => ({ value: column, label: column }))
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SelectField,
        {
          label: "Sort Direction",
          value: ((_b = draft.orderBy) == null ? void 0 : _b.direction) ?? "asc",
          onChange: (value) => onDraftChange({
            ...draft,
            orderBy: draft.orderBy ? { ...draft.orderBy, direction: value === "desc" ? "desc" : "asc" } : null
          }),
          options: [
            { value: "asc", label: "Ascending" },
            { value: "desc", label: "Descending" }
          ],
          disabled: !((_c = draft.orderBy) == null ? void 0 : _c.column)
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      LimitField,
      {
        limit: draft.limit,
        onChange: (limit) => onDraftChange({ ...draft, limit })
      }
    )
  ] });
};
const FilterLookupEditor = ({ draft, availableColumns, onDraftChange }) => {
  var _a, _b, _c;
  const selectableSortColumns = draft.columns.length > 0 ? draft.columns : availableColumns;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ColumnPicker,
      {
        label: "Output Columns",
        availableColumns,
        selectedColumns: draft.columns,
        onToggle: (column) => onDraftChange({
          ...draft,
          columns: draft.columns.includes(column) ? draft.columns.filter((entry) => entry !== column) : [...draft.columns, column]
        }),
        description: "Choose the columns returned after filtering."
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      PredicateEditor,
      {
        title: "Match All",
        predicates: draft.predicates,
        availableColumns,
        onChange: (predicates) => onDraftChange({ ...draft, predicates })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-card border border-slate-200 bg-slate-50 p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold text-slate-900", children: "OR Groups" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-xs text-slate-500", children: "Each group is OR-ed against the Match All block and other groups." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: () => onDraftChange({
              ...draft,
              groups: [...draft.groups ?? [], createEmptyGroup(availableColumns)]
            }),
            className: "rounded-card border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-300",
            children: "Add OR group"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 space-y-3", children: (draft.groups ?? []).length > 0 ? (draft.groups ?? []).map((group, groupIndex) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-card border border-slate-200 bg-white p-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 flex items-center justify-between gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm font-semibold text-slate-900", children: [
            "OR Group ",
            groupIndex + 1
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: () => onDraftChange({
                ...draft,
                groups: (draft.groups ?? []).filter((_, index) => index !== groupIndex)
              }),
              className: "rounded-card border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-300",
              children: "Remove group"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          PredicateEditor,
          {
            title: "Group Predicates",
            predicates: group.predicates,
            availableColumns,
            onChange: (predicates) => onDraftChange({
              ...draft,
              groups: (draft.groups ?? []).map((entry, index) => index === groupIndex ? { ...entry, predicates } : entry)
            })
          }
        )
      ] }, `group-${groupIndex}`)) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-500", children: "No OR groups configured." }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-4 md:grid-cols-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SelectField,
        {
          label: "Sort Column",
          value: ((_a = draft.orderBy) == null ? void 0 : _a.column) ?? "",
          onChange: (value) => {
            var _a2;
            return onDraftChange({
              ...draft,
              orderBy: value ? { column: value, direction: ((_a2 = draft.orderBy) == null ? void 0 : _a2.direction) ?? "asc" } : null
            });
          },
          options: [
            { value: "", label: "No sort" },
            ...selectableSortColumns.map((column) => ({ value: column, label: column }))
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SelectField,
        {
          label: "Sort Direction",
          value: ((_b = draft.orderBy) == null ? void 0 : _b.direction) ?? "asc",
          onChange: (value) => onDraftChange({
            ...draft,
            orderBy: draft.orderBy ? { ...draft.orderBy, direction: value === "desc" ? "desc" : "asc" } : null
          }),
          options: [
            { value: "asc", label: "Ascending" },
            { value: "desc", label: "Descending" }
          ],
          disabled: !((_c = draft.orderBy) == null ? void 0 : _c.column)
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        LimitField,
        {
          limit: draft.limit,
          onChange: (limit) => onDraftChange({ ...draft, limit })
        }
      )
    ] })
  ] });
};
const AggregateBreakdownEditor = ({ draft, groupableColumns, selectableColumns, onDraftChange }) => {
  var _a, _b;
  const sortColumns = Array.from(/* @__PURE__ */ new Set([
    ...draft.groupBy,
    draft.aggregate.as || "row_count"
  ]));
  const currentAlias = draft.aggregate.as || "row_count";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ColumnPicker,
      {
        label: "Group By",
        availableColumns: groupableColumns,
        selectedColumns: draft.groupBy,
        onToggle: (column) => onDraftChange({
          ...draft,
          groupBy: draft.groupBy.includes(column) ? draft.groupBy.filter((entry) => entry !== column) : [...draft.groupBy, column]
        }),
        description: "Choose the grouping columns for the aggregate result."
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-4 md:grid-cols-2 xl:grid-cols-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SelectField,
        {
          label: "Aggregate Function",
          value: draft.aggregate.function,
          onChange: (value) => onDraftChange({
            ...draft,
            aggregate: {
              ...draft.aggregate,
              function: value
            }
          }),
          options: [
            { value: "count", label: "Count" },
            { value: "sum", label: "Sum" },
            { value: "avg", label: "Average" }
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SelectField,
        {
          label: "Aggregate Column",
          value: draft.aggregate.column ?? "",
          onChange: (value) => onDraftChange({
            ...draft,
            aggregate: {
              ...draft.aggregate,
              column: value || null
            }
          }),
          options: [
            { value: "", label: draft.aggregate.function === "count" ? "All rows" : "Select a column" },
            ...selectableColumns.map((column) => ({ value: column, label: column }))
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        TextField,
        {
          label: "Alias",
          value: draft.aggregate.as,
          onChange: (value) => onDraftChange({
            ...draft,
            aggregate: { ...draft.aggregate, as: value },
            orderBy: draft.orderBy ? {
              column: draft.orderBy.column === currentAlias ? value : draft.orderBy.column,
              direction: draft.orderBy.direction
            } : draft.orderBy
          }),
          placeholder: "row_count"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        LimitField,
        {
          limit: draft.limit,
          onChange: (limit) => onDraftChange({ ...draft, limit })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SelectField,
        {
          label: "Sort Column",
          value: ((_a = draft.orderBy) == null ? void 0 : _a.column) ?? currentAlias,
          onChange: (value) => {
            var _a2;
            return onDraftChange({
              ...draft,
              orderBy: value ? { column: value, direction: ((_a2 = draft.orderBy) == null ? void 0 : _a2.direction) ?? "desc" } : null
            });
          },
          options: sortColumns.map((column) => ({ value: column, label: column }))
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SelectField,
        {
          label: "Sort Direction",
          value: ((_b = draft.orderBy) == null ? void 0 : _b.direction) ?? "desc",
          onChange: (value) => {
            var _a2;
            return onDraftChange({
              ...draft,
              orderBy: {
                column: ((_a2 = draft.orderBy) == null ? void 0 : _a2.column) ?? currentAlias,
                direction: value === "asc" ? "asc" : "desc"
              }
            });
          },
          options: [
            { value: "desc", label: "Descending" },
            { value: "asc", label: "Ascending" }
          ]
        }
      )
    ] })
  ] });
};
const DuplicateCandidatesEditor = ({ draft, availableColumns, onDraftChange }) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
  /* @__PURE__ */ jsxRuntimeExports.jsx(
    ColumnPicker,
    {
      label: "Key Columns",
      availableColumns,
      selectedColumns: draft.keyColumns,
      onToggle: (column) => onDraftChange({
        ...draft,
        keyColumns: draft.keyColumns.includes(column) ? draft.keyColumns.filter((entry) => entry !== column) : [...draft.keyColumns, column]
      }),
      description: "Group on the columns that should uniquely identify a record."
    }
  ),
  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      TextField,
      {
        label: "Count Alias",
        value: draft.countAlias ?? "duplicate_count",
        onChange: (value) => onDraftChange({ ...draft, countAlias: value }),
        placeholder: "duplicate_count"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      LimitField,
      {
        limit: draft.limit,
        onChange: (limit) => onDraftChange({ ...draft, limit })
      }
    )
  ] })
] });
const NullBlankScanEditor = ({ draft, availableColumns, onDraftChange }) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
  /* @__PURE__ */ jsxRuntimeExports.jsx(
    SelectField,
    {
      label: "Target Column",
      value: draft.column,
      onChange: (value) => onDraftChange({ ...draft, column: value }),
      options: availableColumns.map((column) => ({ value: column, label: column }))
    }
  ),
  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-card border border-slate-200 bg-slate-50 p-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500", children: "Result Mode" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 flex flex-wrap gap-2", children: [
      { value: "preview", label: "Preview matching rows" },
      { value: "count", label: "Count matching rows" }
    ].map((option) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        onClick: () => onDraftChange({ ...draft, resultMode: option.value }),
        className: `rounded-full px-3 py-1.5 text-sm font-medium transition ${draft.resultMode === option.value ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300"}`,
        children: option.label
      },
      option.value
    )) })
  ] }),
  /* @__PURE__ */ jsxRuntimeExports.jsx(
    LimitField,
    {
      limit: draft.limit,
      onChange: (limit) => onDraftChange({ ...draft, limit })
    }
  )
] });
const DatabaseWorkspaceQueryComposer = ({
  availableColumns,
  groupableColumns,
  templateId,
  draft,
  duckDbSessionStatus,
  onTemplateChange,
  onDraftChange,
  onRunQuery,
  onRefreshSession,
  isSubmitting,
  isRefreshingSession,
  errorMessage
}) => {
  var _a;
  const isDuckDbReady = duckDbSessionStatus.status === "ready";
  const isSubmitDisabled = !isDuckDbReady || availableColumns.length === 0 || isSubmitting;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-card border border-slate-200 bg-white p-4 shadow-sm", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500", children: "Query Templates" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "mt-2 text-lg font-semibold text-slate-900", children: "DuckDB analyst composer" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-slate-600", children: "Build bounded, read-only queries without chat prompts or hand-written SQL." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: onRefreshSession,
            disabled: isRefreshingSession,
            className: `rounded-card px-3 py-1.5 text-sm font-medium transition ${isRefreshingSession ? "cursor-not-allowed bg-slate-100 text-slate-400" : "border border-slate-300 bg-white text-slate-900 hover:border-slate-400"}`,
            children: isRefreshingSession ? "Rebinding..." : "Rebind DuckDB Session"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: onRunQuery,
            disabled: isSubmitDisabled,
            className: `rounded-card px-3 py-1.5 text-sm font-medium transition ${isSubmitDisabled ? "cursor-not-allowed bg-slate-100 text-slate-400" : "bg-slate-900 text-white hover:bg-slate-800"}`,
            children: isSubmitting ? "Running query..." : "Run Query"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 flex flex-wrap gap-2", children: WORKSPACE_QUERY_TEMPLATE_OPTIONS.map((option) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        onClick: () => onTemplateChange(option.id),
        className: `rounded-full px-3 py-1.5 text-sm font-medium transition ${templateId === option.id ? "bg-slate-900 text-white" : "border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white"}`,
        children: option.title
      },
      option.id
    )) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 rounded-card border border-slate-200 bg-slate-50 p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-slate-900", children: (_a = WORKSPACE_QUERY_TEMPLATE_OPTIONS.find((option) => option.id === templateId)) == null ? void 0 : _a.description }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-slate-500", children: "Explorer queries require a ready DuckDB session and never fall back to the native executor." })
    ] }),
    !isDuckDbReady ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 rounded-card border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800", children: [
      "DuckDB session status is ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold", children: duckDbSessionStatus.status }),
      ".",
      duckDbSessionStatus.fallbackReason ? ` ${duckDbSessionStatus.fallbackReason}` : " Rebind the session before running analyst explorer queries."
    ] }) : null,
    errorMessage ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 rounded-card border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700", children: errorMessage }) : null,
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4", children: [
      templateId === "preview_rows" && /* @__PURE__ */ jsxRuntimeExports.jsx(
        PreviewRowsEditor,
        {
          draft,
          availableColumns,
          onDraftChange
        }
      ),
      templateId === "filter_lookup" && /* @__PURE__ */ jsxRuntimeExports.jsx(
        FilterLookupEditor,
        {
          draft,
          availableColumns,
          onDraftChange
        }
      ),
      templateId === "aggregate_breakdown" && /* @__PURE__ */ jsxRuntimeExports.jsx(
        AggregateBreakdownEditor,
        {
          draft,
          groupableColumns,
          selectableColumns: availableColumns,
          onDraftChange
        }
      ),
      templateId === "duplicate_candidates" && /* @__PURE__ */ jsxRuntimeExports.jsx(
        DuplicateCandidatesEditor,
        {
          draft,
          availableColumns: groupableColumns,
          onDraftChange
        }
      ),
      templateId === "null_blank_scan" && /* @__PURE__ */ jsxRuntimeExports.jsx(
        NullBlankScanEditor,
        {
          draft,
          availableColumns,
          onDraftChange
        }
      )
    ] })
  ] });
};
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const getColumns = (rows, preferredColumns) => {
  if (preferredColumns && preferredColumns.length > 0) {
    return preferredColumns;
  }
  return rows.length > 0 ? Object.keys(rows[0]) : [];
};
const filterRows = (rows, columns, searchTerm) => {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  if (!normalizedSearch) {
    return rows;
  }
  return rows.filter((row) => columns.some(
    (column) => String(row[column] ?? "").toLowerCase().includes(normalizedSearch)
  ));
};
const getSortSummary = (sortState) => sortState.column ? `${sortState.column} (${sortState.direction})` : "No sort applied";
const getDefaultSelectedActivityId = (activeDataQuery, queryActivities) => {
  var _a;
  if (activeDataQuery) {
    return ACTIVE_QUERY_ACTIVITY_ID;
  }
  return ((_a = queryActivities[0]) == null ? void 0 : _a.id) ?? null;
};
const formatSessionTimestamp = (value) => value ? new Date(value).toLocaleString() : "Not synced";
const getSelectableColumns = (columnRegistry, rows) => {
  const fromRegistry = (columnRegistry == null ? void 0 : columnRegistry.columns.filter((column) => column.allowedUsages.select).map((column) => column.physicalName)) ?? [];
  return fromRegistry.length > 0 ? fromRegistry : getColumns(rows);
};
const getGroupableColumns = (columnRegistry, fallbackColumns) => {
  const fromRegistry = (columnRegistry == null ? void 0 : columnRegistry.columns.filter((column) => column.allowedUsages.groupBy).map((column) => column.physicalName)) ?? [];
  if (columnRegistry) {
    return fromRegistry;
  }
  return fallbackColumns;
};
const getStatusBadgeClassName = (status) => {
  switch (status) {
    case "ready":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "binding":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "degraded":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "error":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
};
const DatabaseModal = () => {
  const {
    isOpen,
    onClose,
    activeDataQuery,
    csvData,
    columnRegistry,
    columnProfiles,
    datasetSemanticSnapshot,
    userColumnAnnotations,
    analysisSteering,
    queryHistory,
    language,
    duckDbSessionStatus,
    runWorkspaceDataQuery,
    refreshDuckDbSession
  } = useAppStore((state) => {
    var _a;
    return {
      isOpen: state.isDatabaseModalOpen,
      onClose: () => state.setIsDatabaseModalOpen(false),
      activeDataQuery: state.activeDataQuery,
      csvData: state.csvData,
      columnRegistry: state.columnRegistry,
      columnProfiles: state.columnProfiles,
      datasetSemanticSnapshot: state.datasetSemanticSnapshot,
      userColumnAnnotations: state.userColumnAnnotations,
      analysisSteering: ((_a = state.latestAnalysisSession) == null ? void 0 : _a.analysisSteering) ?? null,
      queryHistory: state.queryHistory,
      language: state.settings.language,
      duckDbSessionStatus: state.duckDbSessionStatus,
      runWorkspaceDataQuery: state.runWorkspaceDataQuery,
      refreshDuckDbSession: state.refreshDuckDbSession
    };
  }, shallow$1);
  const [searchTerm, setSearchTerm] = reactExports.useState("");
  const [sortState, setSortState] = reactExports.useState({ column: null, direction: "asc" });
  const [selectedQueryTraceId, setSelectedQueryTraceId] = reactExports.useState(null);
  const [activeTemplateId, setActiveTemplateId] = reactExports.useState("preview_rows");
  const [drafts, setDrafts] = reactExports.useState({
    preview_rows: { templateId: "preview_rows", columns: [], orderBy: null, limit: 25 },
    filter_lookup: { templateId: "filter_lookup", columns: [], predicates: [], groups: [], orderBy: null, limit: 25 },
    aggregate_breakdown: {
      templateId: "aggregate_breakdown",
      groupBy: [],
      aggregate: { function: "count", column: null, as: "row_count" },
      orderBy: { column: "row_count", direction: "desc" },
      limit: 25
    },
    duplicate_candidates: { templateId: "duplicate_candidates", keyColumns: [], countAlias: "duplicate_count", limit: 25 },
    null_blank_scan: { templateId: "null_blank_scan", column: "", resultMode: "preview", limit: 25 }
  });
  const [formError, setFormError] = reactExports.useState(null);
  const [isSubmitting, setIsSubmitting] = reactExports.useState(false);
  const [isRefreshingSession, setIsRefreshingSession] = reactExports.useState(false);
  const wasOpenRef = reactExports.useRef(false);
  const resolvedDuckDbSessionStatus = duckDbSessionStatus ?? createIdleDuckDbSessionStatus();
  const effectiveColumnRegistry = reactExports.useMemo(
    () => buildEffectiveColumnRegistryFromState({
      csvData,
      columnProfiles,
      datasetSemanticSnapshot,
      userColumnAnnotations,
      latestAnalysisSession: {
        analysisSteering
      },
      columnRegistry
    }, {
      datasetOverride: csvData
    }),
    [analysisSteering, columnProfiles, columnRegistry, csvData, datasetSemanticSnapshot, userColumnAnnotations]
  );
  const availableColumns = reactExports.useMemo(
    () => getSelectableColumns(effectiveColumnRegistry, (csvData == null ? void 0 : csvData.data) ?? []),
    [effectiveColumnRegistry, csvData == null ? void 0 : csvData.data]
  );
  const groupableColumns = reactExports.useMemo(
    () => getGroupableColumns(effectiveColumnRegistry, availableColumns),
    [availableColumns, effectiveColumnRegistry]
  );
  const columnSignature = `${availableColumns.join("|")}::${groupableColumns.join("|")}`;
  const defaultDrafts = reactExports.useMemo(
    () => createDefaultWorkspaceQueryDrafts({
      selectableColumns: availableColumns,
      groupableColumns
    }),
    [availableColumns, columnSignature, groupableColumns]
  );
  const queryActivities = reactExports.useMemo(
    () => buildDatabaseModalQueryActivities(activeDataQuery, queryHistory),
    [activeDataQuery, queryHistory]
  );
  const selectedQueryActivity = reactExports.useMemo(
    () => queryActivities.find((activity) => activity.id === selectedQueryTraceId) ?? null,
    [queryActivities, selectedQueryTraceId]
  );
  const resolvedQueryActivity = selectedQueryActivity ?? queryActivities[0] ?? null;
  const currentRows = reactExports.useMemo(() => {
    if (!resolvedQueryActivity) {
      return [];
    }
    if (resolvedQueryActivity.id === ACTIVE_QUERY_ACTIVITY_ID && resolvedQueryActivity.source === "active" && activeDataQuery) {
      return activeDataQuery.result.rows;
    }
    return resolvedQueryActivity.result.previewRows;
  }, [activeDataQuery, resolvedQueryActivity]);
  const currentColumns = reactExports.useMemo(
    () => getColumns(currentRows, resolvedQueryActivity == null ? void 0 : resolvedQueryActivity.result.selectedColumns),
    [currentRows, resolvedQueryActivity == null ? void 0 : resolvedQueryActivity.result.selectedColumns]
  );
  const filteredRows = reactExports.useMemo(
    () => filterRows(currentRows, currentColumns, searchTerm),
    [currentColumns, currentRows, searchTerm]
  );
  const sortSummary = getSortSummary(sortState);
  const emptyStateText = !resolvedQueryActivity ? "Run an explorer template to populate the result grid." : currentColumns.length === 0 ? "This result does not contain any visible columns." : "No rows match the current search.";
  const tableKey = [
    (csvData == null ? void 0 : csvData.fileName) ?? "no-file",
    (resolvedQueryActivity == null ? void 0 : resolvedQueryActivity.id) ?? "no-query",
    (resolvedQueryActivity == null ? void 0 : resolvedQueryActivity.appliedAt) instanceof Date ? resolvedQueryActivity.appliedAt.toISOString() : "no-date",
    (resolvedQueryActivity == null ? void 0 : resolvedQueryActivity.tableName) ?? "no-table",
    (resolvedQueryActivity == null ? void 0 : resolvedQueryActivity.loadVersion) ?? "no-version"
  ].join(":");
  reactExports.useEffect(() => {
    setDrafts(defaultDrafts);
    setActiveTemplateId("preview_rows");
    setFormError(null);
  }, [columnSignature]);
  reactExports.useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setSelectedQueryTraceId(getDefaultSelectedActivityId(activeDataQuery, queryActivities));
    }
    wasOpenRef.current = isOpen;
  }, [activeDataQuery, isOpen, queryActivities]);
  reactExports.useEffect(() => {
    if (!isOpen) {
      return;
    }
    if (selectedQueryTraceId && queryActivities.some((activity) => activity.id === selectedQueryTraceId)) {
      return;
    }
    setSelectedQueryTraceId(getDefaultSelectedActivityId(activeDataQuery, queryActivities));
  }, [activeDataQuery, isOpen, queryActivities, selectedQueryTraceId]);
  reactExports.useEffect(() => {
    setSearchTerm("");
    setSortState({ column: null, direction: "asc" });
  }, [resolvedQueryActivity == null ? void 0 : resolvedQueryActivity.id]);
  if (!isOpen) {
    return null;
  }
  const currentDraft = drafts[activeTemplateId];
  const canLoadSelectedTemplate = (resolvedQueryActivity == null ? void 0 : resolvedQueryActivity.origin) === "workspace" && Boolean(resolvedQueryActivity.templateId && resolvedQueryActivity.formSnapshot);
  const canRerunSelectedTemplate = canLoadSelectedTemplate && resolvedDuckDbSessionStatus.status === "ready" && !isSubmitting;
  const updateDraft = (nextDraft) => {
    setDrafts((prev) => ({
      ...prev,
      [nextDraft.templateId]: nextDraft
    }));
  };
  const runDraft = async (draftToRun, nextTemplateId) => {
    setFormError(null);
    setIsSubmitting(true);
    try {
      await runWorkspaceDataQuery(draftToRun);
      if (nextTemplateId) {
        setActiveTemplateId(nextTemplateId);
      }
      setSelectedQueryTraceId(ACTIVE_QUERY_ACTIVITY_ID);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleRunQuery = async () => {
    await runDraft(currentDraft, activeTemplateId);
  };
  const handleRefreshSession = async () => {
    setFormError(null);
    setIsRefreshingSession(true);
    try {
      await refreshDuckDbSession();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsRefreshingSession(false);
    }
  };
  const handleLoadWorkspaceTemplate = () => {
    if (!(resolvedQueryActivity == null ? void 0 : resolvedQueryActivity.templateId) || !resolvedQueryActivity.formSnapshot) {
      return;
    }
    setActiveTemplateId(resolvedQueryActivity.templateId);
    updateDraft(resolvedQueryActivity.formSnapshot);
    setFormError(null);
  };
  const handleRerunWorkspaceTemplate = async () => {
    if (!(resolvedQueryActivity == null ? void 0 : resolvedQueryActivity.templateId) || !resolvedQueryActivity.formSnapshot) {
      return;
    }
    await runDraft(resolvedQueryActivity.formSnapshot, resolvedQueryActivity.templateId);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm", onClick: onClose, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      role: "dialog",
      "aria-modal": "true",
      className: "relative flex h-screen w-screen flex-col bg-slate-50",
      onClick: (event) => event.stopPropagation(),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("header", { className: "border-b border-slate-200 bg-white/95 backdrop-blur-xl", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-3 px-4 py-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] uppercase tracking-[0.24em] text-slate-500", children: "Data Explorer" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "mt-1 text-2xl font-semibold text-slate-950", children: "DuckDB data explorer" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-slate-600", children: "Validate and explore the cleaned dataset through bounded, read-only DuckDB queries." })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: onClose,
              className: "rounded-card p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900",
              "aria-label": "Close database modal",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconClose, {})
            }
          )
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 py-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "rounded-card border border-slate-200 bg-white p-4 shadow-sm", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500", children: "DuckDB Session" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex flex-wrap items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${getStatusBadgeClassName(resolvedDuckDbSessionStatus.status)}`, children: resolvedDuckDbSessionStatus.status }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600", children: resolvedDuckDbSessionStatus.engine ?? "engine unavailable" })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-2 sm:grid-cols-2 xl:grid-cols-5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-card border border-slate-200 bg-slate-50 px-3 py-2.5", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500", children: "Table" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm font-semibold text-slate-900", children: resolvedDuckDbSessionStatus.tableName ?? "N/A" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-card border border-slate-200 bg-slate-50 px-3 py-2.5", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500", children: "Load Version" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 break-all text-sm font-semibold text-slate-900", children: resolvedDuckDbSessionStatus.loadVersion ?? "N/A" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-card border border-slate-200 bg-slate-50 px-3 py-2.5", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500", children: "Last Sync" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm font-semibold text-slate-900", children: formatSessionTimestamp(resolvedDuckDbSessionStatus.lastSyncedAt) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-card border border-slate-200 bg-slate-50 px-3 py-2.5 sm:col-span-2 xl:col-span-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500", children: "Fallback Reason" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm font-semibold text-slate-900", children: resolvedDuckDbSessionStatus.fallbackReason ?? "None" })
              ] })
            ] })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:grid-rows-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-0 space-y-4 overflow-y-auto pr-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                DatabaseWorkspaceQueryComposer,
                {
                  availableColumns,
                  groupableColumns,
                  templateId: activeTemplateId,
                  draft: currentDraft,
                  duckDbSessionStatus: resolvedDuckDbSessionStatus,
                  onTemplateChange: setActiveTemplateId,
                  onDraftChange: updateDraft,
                  onRunQuery: () => {
                    void handleRunQuery();
                  },
                  onRefreshSession: () => {
                    void handleRefreshSession();
                  },
                  isSubmitting,
                  isRefreshingSession,
                  errorMessage: formError
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-card border border-slate-200 bg-white shadow-sm", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-b border-slate-200 px-4 py-3", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500", children: "Current Result" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "mt-2 text-lg font-semibold text-slate-900", children: (resolvedQueryActivity == null ? void 0 : resolvedQueryActivity.explanation) ?? "No query selected" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-slate-500", children: "Search and local sorting apply only to the currently displayed result preview." })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block xl:max-w-xs", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500", children: "Search Current Result" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "input",
                        {
                          type: "search",
                          value: searchTerm,
                          onChange: (event) => setSearchTerm(event.target.value),
                          placeholder: "Search visible columns in this result",
                          className: "mt-2 w-full rounded-card border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
                        }
                      )
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-card border border-slate-200 bg-slate-50 px-3 py-2.5", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500", children: "Rows" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm font-semibold text-slate-900", children: resolvedQueryActivity ? `${resolvedQueryActivity.result.returnedRows} / ${resolvedQueryActivity.result.totalMatchedRows}` : "N/A" })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-card border border-slate-200 bg-slate-50 px-3 py-2.5", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500", children: "Columns" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm font-semibold text-slate-900", children: currentColumns.length })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-card border border-slate-200 bg-slate-50 px-3 py-2.5", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500", children: "Order" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm font-semibold text-slate-900", children: (resolvedQueryActivity == null ? void 0 : resolvedQueryActivity.result.appliedOrderBy.length) ? resolvedQueryActivity.result.appliedOrderBy.map((order) => `${order.column} (${order.direction})`).join(", ") : "No sort applied" })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-card border border-slate-200 bg-slate-50 px-3 py-2.5", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500", children: "Limit" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm font-semibold text-slate-900", children: (resolvedQueryActivity == null ? void 0 : resolvedQueryActivity.result.appliedLimit) ?? "N/A" })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-card border border-slate-200 bg-slate-50 px-3 py-2.5", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500", children: "Local Sort" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm font-semibold text-slate-900", children: sortSummary })
                    ] })
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-b border-slate-200 px-4 py-3", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500", children: "Generated SQL Preview" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 overflow-hidden rounded-card border border-slate-200 bg-slate-950 text-sm text-slate-100", children: /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "max-h-[220px] overflow-auto px-3 py-2.5 whitespace-pre-wrap break-words", children: (resolvedQueryActivity == null ? void 0 : resolvedQueryActivity.sqlPreview) ?? "No SQL preview available yet. Run an explorer template or select a query trace from history." }) })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  TabulatorTable,
                  {
                    data: filteredRows,
                    columns: currentColumns,
                    pageSize: 25,
                    pageSizeOptions: PAGE_SIZE_OPTIONS,
                    tableKey,
                    language,
                    variant: "database-modal",
                    sortState,
                    onSortChange: setSortState,
                    containerClassName: "h-[420px]",
                    emptyStateText
                  }
                ) })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              DatabaseModalSidebar,
              {
                csvData,
                queryActivities,
                selectedQueryActivity: resolvedQueryActivity,
                onSelectQueryActivity: setSelectedQueryTraceId,
                onLoadWorkspaceTemplate: handleLoadWorkspaceTemplate,
                onRerunWorkspaceTemplate: () => {
                  void handleRerunWorkspaceTemplate();
                },
                canLoadWorkspaceTemplate: canLoadSelectedTemplate,
                canRerunWorkspaceTemplate: canRerunSelectedTemplate
              }
            )
          ] })
        ] })
      ]
    }
  ) });
};
export {
  DatabaseModal
};
