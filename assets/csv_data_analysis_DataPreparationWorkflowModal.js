import { W as We, j as jsxRuntimeExports, r as reactExports } from "./csv_data_analysis_vendor-react-core.js";
import { s as shallow$1 } from "./csv_data_analysis_vendor-state.js";
import { u as useAppStore } from "./csv_data_analysis_index.js";
import { ct as summarizeTraceContract, aO as buildDataPreparationWorkflowBundle, cA as buildWorkflowSnapshotExport, cB as buildCleaningFailureBundleExport } from "./csv_data_analysis_app-agent.js";
import { c as copyText } from "./csv_data_analysis_copyText.js";
import { I as IconClose } from "./csv_data_analysis_IconClose.js";
import "./csv_data_analysis_vendor-data.js";
import "./csv_data_analysis_vendor-monaco.js";
import "./csv_data_analysis_vendor-misc.js";
import "./csv_data_analysis_app-reporting.js";
import "./csv_data_analysis_vendor-ai-sdk.js";
import "./csv_data_analysis_app-ai.js";
import "./csv_data_analysis_app-agent-planning.js";
import "./csv_data_analysis_vendor-storage.js";
const stepStatusClasses = {
  done: "bg-emerald-100 text-emerald-800 border-emerald-200",
  warning: "bg-amber-100 text-amber-800 border-amber-200",
  blocked: "bg-rose-100 text-rose-800 border-rose-200",
  not_started: "bg-slate-100 text-slate-600 border-slate-200"
};
const badgeClasses = {
  "AI Cleaned": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "No Data Edits Applied Yet": "bg-amber-100 text-amber-800 border-amber-200",
  "Cleaning Blocked": "bg-rose-100 text-rose-800 border-rose-200",
  "Baseline Prepared": "bg-sky-100 text-sky-800 border-sky-200"
};
const mappingResultClasses = {
  "baseline-fixed": "bg-sky-100 text-sky-800 border-sky-200",
  "ai-executed": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "proposed-only": "bg-amber-100 text-amber-800 border-amber-200",
  "blocked": "bg-rose-100 text-rose-800 border-rose-200"
};
const countLabel = (count, singular, plural) => `${count} ${count === 1 ? singular : plural}`;
const formatResultLabel = (value) => value.replace("-", " ");
const formatDelimiter = (value) => value === "	" ? "tab" : value ?? "unknown";
const formatQuote = (value) => value === "'" ? "single quote" : value === '"' ? "double quote" : "none";
const DataPreparationWorkflowContent = ({
  workflow,
  onPrimaryAction,
  onOpenWorkspace,
  onConfirmStructureBoundary,
  onSaveStructureBoundaryOverride
}) => {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x;
  const latestPipelineTrace = summarizeTraceContract(workflow.operationalSignals.latestPipelineTrace);
  const latestToolTrace = summarizeTraceContract(workflow.operationalSignals.latestToolTrace);
  const latestTelemetryTrace = summarizeTraceContract(workflow.operationalSignals.latestTelemetryTrace);
  const structureReview = workflow.structureReview;
  const carryForwardAppliedCount = Object.values(((_a = structureReview == null ? void 0 : structureReview.canonicalBuildMeta) == null ? void 0 : _a.carryForwardAppliedCounts) ?? {}).reduce((sum, count) => sum + Number(count), 0);
  const excludedGroupRows = ((_c = (_b = structureReview == null ? void 0 : structureReview.canonicalBuildMeta) == null ? void 0 : _b.excludedRowCounts) == null ? void 0 : _c.group_header) ?? 0;
  const excludedSummaryRows = (((_e = (_d = structureReview == null ? void 0 : structureReview.canonicalBuildMeta) == null ? void 0 : _d.excludedRowCounts) == null ? void 0 : _e.summary) ?? 0) + (((_g = (_f = structureReview == null ? void 0 : structureReview.canonicalBuildMeta) == null ? void 0 : _f.excludedRowCounts) == null ? void 0 : _g.footer) ?? 0) + (((_i = (_h = structureReview == null ? void 0 : structureReview.canonicalBuildMeta) == null ? void 0 : _h.excludedRowCounts) == null ? void 0 : _i.subtotal) ?? 0);
  const [headerRowInput, setHeaderRowInput] = We.useState("");
  const [bodyStartInput, setBodyStartInput] = We.useState("");
  const [summaryStartInput, setSummaryStartInput] = We.useState("");
  We.useEffect(() => {
    const detectedBoundary = structureReview == null ? void 0 : structureReview.detectedBoundary;
    setHeaderRowInput((detectedBoundary == null ? void 0 : detectedBoundary.headerRowIndex) !== null && (detectedBoundary == null ? void 0 : detectedBoundary.headerRowIndex) !== void 0 ? String(detectedBoundary.headerRowIndex + 1) : "");
    setBodyStartInput((detectedBoundary == null ? void 0 : detectedBoundary.bodyStartIndex) !== null && (detectedBoundary == null ? void 0 : detectedBoundary.bodyStartIndex) !== void 0 ? String(detectedBoundary.bodyStartIndex + 1) : "");
    setSummaryStartInput((detectedBoundary == null ? void 0 : detectedBoundary.summaryStartIndex) !== null && (detectedBoundary == null ? void 0 : detectedBoundary.summaryStartIndex) !== void 0 ? String(detectedBoundary.summaryStartIndex + 1) : "");
  }, [structureReview]);
  const parseOneBasedIndex = (value) => {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed - 1 : null;
  };
  const handleSaveBoundaryOverride = () => {
    var _a2, _b2, _c2;
    const headerRowIndex = parseOneBasedIndex(headerRowInput);
    const bodyStartIndex = parseOneBasedIndex(bodyStartInput);
    const summaryStartIndex = summaryStartInput.trim() ? parseOneBasedIndex(summaryStartInput) : null;
    if (headerRowIndex === null || bodyStartIndex === null) {
      return;
    }
    onSaveStructureBoundaryOverride({
      headerRowIndex,
      headerLayerRowIndexes: ((_a2 = structureReview == null ? void 0 : structureReview.detectedBoundary) == null ? void 0 : _a2.headerLayerRowIndexes) ?? [],
      bodyStartIndex,
      summaryStartIndex,
      parameterRowIndexes: ((_b2 = structureReview == null ? void 0 : structureReview.detectedBoundary) == null ? void 0 : _b2.parameterRowIndexes) ?? [],
      repeatedHeaderRowIndexes: ((_c2 = structureReview == null ? void 0 : structureReview.detectedBoundary) == null ? void 0 : _c2.repeatedHeaderRowIndexes) ?? []
    });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-card border border-slate-200 bg-white shadow-sm p-5 lg:p-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs uppercase tracking-wider text-slate-500", children: "AI Data IDE workflow" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "mt-1 text-xl font-semibold text-slate-900", children: "Data Preparation Workflow" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-slate-500", children: "Fullscreen review of import, inspect, prepare, verify, and analysis gating. Use Artifacts for full handoff files and diagnostics." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
        workflow.preparation.badgeLabel && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${badgeClasses[workflow.preparation.badgeLabel]}`, children: workflow.preparation.badgeLabel }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: onPrimaryAction,
            className: "px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors",
            children: workflow.cta.primaryLabel
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: onOpenWorkspace,
            className: "px-3 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-100 transition-colors",
            children: workflow.cta.secondaryLabel
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-5 grid gap-3 md:grid-cols-5", children: workflow.steps.map((step) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-card border border-slate-200 bg-slate-50 p-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold text-slate-900", children: step.label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${stepStatusClasses[step.status]}`, children: step.status.replace("_", " ") })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-xs text-slate-600", children: step.description })
    ] }, step.id)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 grid gap-6 xl:grid-cols-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-card border border-slate-200 p-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-base font-semibold text-slate-900", children: "Dataset Facts" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md bg-slate-50 border border-slate-200 p-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-500", children: "File" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 font-semibold text-slate-900 break-all", children: workflow.summary.fileName })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md bg-slate-50 border border-slate-200 p-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-500", children: "Rows" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 font-semibold text-slate-900", children: [
              workflow.summary.rawRowCount,
              " raw ",
              "->",
              " ",
              workflow.summary.preparedRowCount,
              " prepared"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md bg-slate-50 border border-slate-200 p-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-500", children: "Structure" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 font-semibold text-slate-900", children: [
              "Header ",
              workflow.summary.headerDepth,
              " · Summary ",
              workflow.summary.summaryRowCount
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md bg-slate-50 border border-slate-200 p-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-500", children: "Metadata Rows" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 font-semibold text-slate-900", children: workflow.summary.metadataRowCount })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md bg-slate-50 border border-slate-200 p-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-500", children: "Issues" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 font-semibold text-slate-900", children: workflow.summary.issueCount })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md bg-slate-50 border border-slate-200 p-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-500", children: "Analysis" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 font-semibold text-slate-900", children: workflow.summary.analysisState.replace("_", " ") })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 rounded-md border border-slate-200 bg-slate-50 p-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold text-slate-900", children: "Parser Diagnostics" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 text-sm text-slate-700", children: [
                workflow.summary.parserStrategy ?? "unknown",
                " · ",
                workflow.summary.parserConfidence ?? "unknown",
                " confidence"
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-sm text-slate-600", children: [
              "Delimiter: ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium text-slate-900", children: formatDelimiter(workflow.summary.detectedDelimiter) }),
              " · ",
              "Quote: ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium text-slate-900", children: formatQuote(workflow.summary.detectedQuoteChar) })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold uppercase tracking-wide text-slate-500", children: "Warnings" }),
            workflow.summary.parserWarnings.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-slate-700", children: "No parser warnings recorded." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-1 space-y-1 text-sm text-slate-700 list-disc list-inside", children: workflow.summary.parserWarnings.slice(0, 2).map((warning) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: warning }, warning)) })
          ] })
        ] })
      ] }),
      structureReview && /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-card border border-slate-200 p-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-base font-semibold text-slate-900", children: "Structure Review" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-slate-600", children: structureReview.requiresHumanReview ? "Boundary confirmation is required before automatic analysis can trust the canonical dataset." : "Current report boundary is resolved. You can still override it if needed." })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `inline-flex items-center self-start rounded-full border px-3 py-1 text-xs font-semibold ${structureReview.requiresHumanReview ? "border-amber-200 bg-amber-100 text-amber-800" : "border-emerald-200 bg-emerald-100 text-emerald-800"}`, children: structureReview.source ?? "unknown source" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 grid gap-3 sm:grid-cols-3 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md bg-slate-50 border border-slate-200 p-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-500", children: "Header row" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 font-semibold text-slate-900", children: ((_j = structureReview.detectedBoundary) == null ? void 0 : _j.headerRowIndex) !== null && ((_k = structureReview.detectedBoundary) == null ? void 0 : _k.headerRowIndex) !== void 0 ? structureReview.detectedBoundary.headerRowIndex + 1 : "unknown" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md bg-slate-50 border border-slate-200 p-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-500", children: "Body start" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 font-semibold text-slate-900", children: ((_l = structureReview.detectedBoundary) == null ? void 0 : _l.bodyStartIndex) !== null && ((_m = structureReview.detectedBoundary) == null ? void 0 : _m.bodyStartIndex) !== void 0 ? structureReview.detectedBoundary.bodyStartIndex + 1 : "unknown" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md bg-slate-50 border border-slate-200 p-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-500", children: "Summary start" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 font-semibold text-slate-900", children: ((_n = structureReview.detectedBoundary) == null ? void 0 : _n.summaryStartIndex) !== null && ((_o = structureReview.detectedBoundary) == null ? void 0 : _o.summaryStartIndex) !== void 0 ? structureReview.detectedBoundary.summaryStartIndex + 1 : "none" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 grid gap-3 sm:grid-cols-4 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md bg-slate-50 border border-slate-200 p-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-500", children: "Overall confidence" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 font-semibold text-slate-900", children: [
              Math.round((((_p = structureReview.confidence) == null ? void 0 : _p.overall) ?? 0) * 100),
              "%"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md bg-slate-50 border border-slate-200 p-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-500", children: "Canonicalization" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 font-semibold text-slate-900", children: structureReview.canonicalizationStatus.replace("_", " ") })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md bg-slate-50 border border-slate-200 p-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-500", children: "Canonical rows" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 font-semibold text-slate-900", children: ((_q = structureReview.canonicalBuildMeta) == null ? void 0 : _q.rowCount) ?? 0 })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md bg-slate-50 border border-slate-200 p-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-500", children: "Pipeline outcome" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 font-semibold text-slate-900", children: ((_s = (_r = structureReview.pipelineOutcome) == null ? void 0 : _r.status) == null ? void 0 : _s.replace(/_/g, " ")) ?? "not resolved" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 grid gap-3 sm:grid-cols-4 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md bg-slate-50 border border-slate-200 p-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-500", children: "Group rows excluded" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 font-semibold text-slate-900", children: excludedGroupRows })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md bg-slate-50 border border-slate-200 p-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-500", children: "Summary/footer excluded" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 font-semibold text-slate-900", children: excludedSummaryRows })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md bg-slate-50 border border-slate-200 p-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-500", children: "Carry-forward applied" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 font-semibold text-slate-900", children: carryForwardAppliedCount })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md bg-slate-50 border border-slate-200 p-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-500", children: "Footer totals" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 font-semibold text-slate-900", children: ((_t = structureReview.canonicalBuildMeta) == null ? void 0 : _t.footerTotalsMatched) === null ? "not checked" : ((_u = structureReview.canonicalBuildMeta) == null ? void 0 : _u.footerTotalsMatched) ? "matched" : "mismatch" })
          ] })
        ] }),
        (((_w = (_v = structureReview.verificationSummary) == null ? void 0 : _v.unresolvedMissingKeyDimensions) == null ? void 0 : _w.length) ?? 0) > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold", children: "Unresolved dimensions after carry-forward" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1", children: (_x = structureReview.verificationSummary) == null ? void 0 : _x.unresolvedMissingKeyDimensions.join(", ") })
        ] }),
        structureReview.blockingReasons.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold", children: "Blocking reasons" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-2 space-y-1 list-disc list-inside", children: structureReview.blockingReasons.map((reason) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: reason }, reason)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 rounded-md border border-slate-200 bg-slate-50 p-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold text-slate-900", children: "Boundary confirmation" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-xs text-slate-600", children: "Enter 1-based row numbers. Saving an override marks the structure as human confirmed and rebuilds the canonical dataset." }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 grid gap-3 sm:grid-cols-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "text-sm text-slate-700", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-xs font-semibold uppercase tracking-wide text-slate-500", children: "Header Row" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  value: headerRowInput,
                  onChange: (event) => setHeaderRowInput(event.target.value),
                  className: "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900",
                  inputMode: "numeric"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "text-sm text-slate-700", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-xs font-semibold uppercase tracking-wide text-slate-500", children: "Body Start" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  value: bodyStartInput,
                  onChange: (event) => setBodyStartInput(event.target.value),
                  className: "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900",
                  inputMode: "numeric"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "text-sm text-slate-700", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-xs font-semibold uppercase tracking-wide text-slate-500", children: "Summary Start" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  value: summaryStartInput,
                  onChange: (event) => setSummaryStartInput(event.target.value),
                  className: "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900",
                  inputMode: "numeric",
                  placeholder: "optional"
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 flex flex-wrap gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: onConfirmStructureBoundary,
                className: "rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors",
                children: "Confirm Detected Boundary"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: handleSaveBoundaryOverride,
                className: "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors",
                children: "Save Boundary Override"
              }
            )
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-card border border-slate-200 p-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-base font-semibold text-slate-900", children: "Issue -> Action -> Result" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex flex-wrap gap-2 text-xs", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-700", children: countLabel(workflow.issueSummary.mappings.length, "workflow action", "workflow actions") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-700", children: countLabel(workflow.issueSummary.topWarnings.length, "top warning", "top warnings") })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 space-y-3", children: workflow.issueSummary.mappings.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-500", children: "No deterministic preparation actions or blockers were recorded for this run." }) : workflow.issueSummary.mappings.map((mapping) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md border border-slate-200 bg-slate-50 p-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold uppercase tracking-wide text-slate-500", children: "Issue" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold text-slate-900", children: mapping.issue })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `inline-flex items-center self-start rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${mappingResultClasses[mapping.result]}`, children: formatResultLabel(mapping.result) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 rounded-md border border-white/70 bg-white px-3 py-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold uppercase tracking-wide text-slate-500", children: "Action" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-slate-700", children: mapping.action })
          ] })
        ] }, `${mapping.issue}-${mapping.result}`)) }),
        workflow.issueSummary.topWarnings.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold text-slate-900", children: "Top warnings" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-2 space-y-1 text-sm text-slate-700 list-disc list-inside", children: workflow.issueSummary.topWarnings.map((warning) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: warning }, warning)) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-card border border-slate-200 p-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-base font-semibold text-slate-900", children: "Preparation Result" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 text-sm text-slate-700", children: workflow.preparation.blockedMessage ?? workflow.preparation.explanation ?? "No AI cleaning explanation was stored for this run." }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 grid gap-3 sm:grid-cols-3 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md bg-slate-50 border border-slate-200 p-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-500", children: "Operation pipeline" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 font-semibold text-slate-900", children: workflow.preparation.noExecutableOperations ? "No executable operations" : countLabel(workflow.preparation.operationCount, "operation", "operations") })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md bg-slate-50 border border-slate-200 p-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-500", children: "Baseline noise rows removed" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 font-semibold text-slate-900", children: workflow.summary.baselineNoiseRowsRemoved })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md bg-slate-50 border border-slate-200 p-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-500", children: "Plan status" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 font-semibold text-slate-900", children: workflow.summary.planStatus ?? "not started" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 rounded-md border border-slate-200 bg-slate-50 p-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold text-slate-900", children: "Operation Pipeline" }),
          workflow.preparation.operations.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm text-slate-500", children: "No executable operations were stored for this run. Prepared rows therefore reflect deterministic baseline preparation only." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("ol", { className: "mt-2 space-y-2 text-sm text-slate-700 list-decimal list-inside", children: workflow.preparation.operations.map((operation) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: operation.type }),
            ": ",
            operation.reason
          ] }, operation.id)) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-card border border-slate-200 p-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-base font-semibold text-slate-900", children: "Verification & Diff Preview" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 grid gap-3 sm:grid-cols-3 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md bg-slate-50 border border-slate-200 p-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-500", children: "Overall" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 font-semibold text-slate-900", children: workflow.verification.overallStatus })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md bg-slate-50 border border-slate-200 p-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-500", children: "Dataset Safety" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 font-semibold text-slate-900", children: workflow.verification.datasetSafetyStatus })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md bg-slate-50 border border-slate-200 p-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-500", children: "Cleaning Consistency" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 font-semibold text-slate-900", children: workflow.verification.cleaningConsistencyStatus })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 grid gap-3 sm:grid-cols-2 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md bg-slate-50 border border-slate-200 p-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-500", children: "SQL Precheck" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 font-semibold text-slate-900", children: workflow.verification.sqlPrecheckStatus })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md bg-slate-50 border border-slate-200 p-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-500", children: "Blocking SQL findings" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 font-semibold text-slate-900", children: workflow.verification.sqlPrecheckBlockingFindings.length })
          ] })
        ] }),
        workflow.verification.sqlPrecheckSummary && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold text-slate-900", children: "SQL precheck summary" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1", children: workflow.verification.sqlPrecheckSummary })
        ] }),
        workflow.verification.sqlPrecheckBlockingFindings.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold", children: "Blocking SQL precheck findings" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-2 space-y-1 list-disc list-inside", children: workflow.verification.sqlPrecheckBlockingFindings.map((finding, index) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: finding.message }, `${finding.kind}-${finding.column ?? finding.metric ?? finding.dimension ?? index}`)) })
        ] }),
        workflow.verification.shapeFailureSignalKey && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold", children: "Shape verification detail" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1", children: [
            "Signal: ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono", children: workflow.verification.shapeFailureSignalKey })
          ] }),
          workflow.verification.shapeFailureDetail && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 font-mono text-xs break-all", children: workflow.verification.shapeFailureDetail })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 grid gap-3 sm:grid-cols-2 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md bg-slate-50 border border-slate-200 p-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-500", children: "Row delta" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 font-semibold text-slate-900", children: [
              workflow.diff.rowCountBefore,
              " ",
              "->",
              " ",
              workflow.diff.rowCountAfter,
              " (",
              workflow.diff.rowCountDelta >= 0 ? "+" : "",
              workflow.diff.rowCountDelta,
              ")"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md bg-slate-50 border border-slate-200 p-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-500", children: "Schema delta" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 font-semibold text-slate-900", children: [
              workflow.diff.removedColumns.length,
              " removed · ",
              workflow.diff.addedColumns.length,
              " added · ",
              workflow.diff.changedColumns.length,
              " type changes"
            ] })
          ] })
        ] }),
        (workflow.diff.removedColumns.length > 0 || workflow.diff.addedColumns.length > 0 || workflow.diff.changedColumns.length > 0) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700", children: [
          workflow.diff.removedColumns.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold text-slate-900", children: "Removed columns" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 flex flex-wrap gap-2", children: workflow.diff.removedColumns.map((column) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700", children: column }, `removed-${column}`)) })
          ] }),
          workflow.diff.addedColumns.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold text-slate-900", children: "Added columns" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 flex flex-wrap gap-2", children: workflow.diff.addedColumns.map((column) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700", children: column }, `added-${column}`)) })
          ] }),
          workflow.diff.changedColumns.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold text-slate-900", children: "Type changes" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 flex flex-wrap gap-2", children: workflow.diff.changedColumns.map((change) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800", children: `${change.name}: ${change.before ?? "unknown"} -> ${change.after ?? "unknown"}` }, `changed-${change.name}`)) })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-card border border-slate-200 p-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-base font-semibold text-slate-900", children: "Operational Signals" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm text-slate-600", children: "Canonical trace contract fields exposed directly from cleaning, tool, and telemetry surfaces." }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 grid gap-3 sm:grid-cols-3 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md bg-slate-50 border border-slate-200 p-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-500", children: "Pipeline trace" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 font-semibold text-slate-900", children: (latestPipelineTrace == null ? void 0 : latestPipelineTrace.reasonCode) ?? "None" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-xs text-slate-600", children: (latestPipelineTrace == null ? void 0 : latestPipelineTrace.contractVersion) ?? "N/A" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md bg-slate-50 border border-slate-200 p-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-500", children: "Tool trace" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 font-semibold text-slate-900", children: (latestToolTrace == null ? void 0 : latestToolTrace.reasonCode) ?? "None" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-xs text-slate-600", children: (latestToolTrace == null ? void 0 : latestToolTrace.retryClass) ?? "No retry class" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md bg-slate-50 border border-slate-200 p-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-500", children: "Telemetry trace" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 font-semibold text-slate-900", children: (latestTelemetryTrace == null ? void 0 : latestTelemetryTrace.reasonCode) ?? "None" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-xs text-slate-600", children: (latestTelemetryTrace == null ? void 0 : latestTelemetryTrace.source) ?? "N/A" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold text-slate-900", children: "Latest fallback path" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1", children: workflow.operationalSignals.latestFallbackPath ?? "No fallback path recorded." })
        ] })
      ] })
    ] })
  ] });
};
const pickDataPreparationWorkflowState = (state) => ({
  sessionId: state.sessionId,
  currentView: state.currentView,
  currentDatasetId: state.currentDatasetId,
  csvData: state.csvData,
  rawCsvData: state.rawCsvData,
  rawIntakeIr: state.rawIntakeIr,
  initialDataSample: state.initialDataSample,
  columnProfiles: state.columnProfiles,
  dataPreparationPlan: state.dataPreparationPlan,
  dataQualityIssues: state.dataQualityIssues,
  cleaningRun: state.cleaningRun,
  reportStructureResolution: state.reportStructureResolution,
  canonicalCsvData: state.canonicalCsvData,
  canonicalBuildMeta: state.canonicalBuildMeta,
  canonicalizationStatus: state.canonicalizationStatus,
  pipelineOutcome: state.pipelineOutcome,
  analysisCards: state.analysisCards,
  finalSummary: state.finalSummary,
  agentEvents: state.agentEvents,
  agentToolLogs: state.agentToolLogs,
  telemetryEvents: state.telemetryEvents,
  spreadsheetFilterFunction: state.spreadsheetFilterFunction,
  activeSpreadsheetFilter: state.activeSpreadsheetFilter,
  aiFilterExplanation: state.aiFilterExplanation,
  activeDataQuery: state.activeDataQuery,
  settings: state.settings,
  isGeneratingReport: state.isGeneratingReport
});
const DataPreparationWorkflowModal = () => {
  const {
    isOpen,
    closeModal,
    openWorkspace,
    openLogs,
    workflowState,
    currentDatasetId,
    logAgentToolUsage,
    saveReportStructureBoundaryOverride
  } = useAppStore((state) => ({
    isOpen: state.isDataPreparationModalOpen,
    closeModal: () => state.setIsDataPreparationModalOpen(false),
    openWorkspace: () => state.setIsWorkspaceModalOpen(true),
    openLogs: () => state.setIsDebugLogsModalOpen(true),
    workflowState: pickDataPreparationWorkflowState(state),
    currentDatasetId: state.currentDatasetId,
    logAgentToolUsage: state.logAgentToolUsage,
    saveReportStructureBoundaryOverride: state.saveReportStructureBoundaryOverride
  }), shallow$1);
  const hasLoggedOpenRef = reactExports.useRef(false);
  const workflow = reactExports.useMemo(() => buildDataPreparationWorkflowBundle(workflowState), [workflowState]);
  const [copyStatus, setCopyStatus] = reactExports.useState("idle");
  const workflowSnapshotExport = reactExports.useMemo(() => buildWorkflowSnapshotExport(workflowState), [workflowState]);
  const failureHandoffExport = reactExports.useMemo(() => buildCleaningFailureBundleExport(workflowState), [workflowState]);
  reactExports.useEffect(() => {
    if (!isOpen) {
      hasLoggedOpenRef.current = false;
      setCopyStatus("idle");
      return;
    }
    if (!hasLoggedOpenRef.current) {
      hasLoggedOpenRef.current = true;
      logAgentToolUsage({
        tool: "workspace_builder",
        description: "Opened data preparation workflow modal.",
        detail: {
          datasetId: currentDatasetId,
          fileName: workflow.summary.fileName,
          issueCount: workflow.summary.issueCount
        }
      });
    }
  }, [currentDatasetId, isOpen, logAgentToolUsage, workflow.summary.fileName, workflow.summary.issueCount]);
  if (!isOpen) {
    return null;
  }
  const handleOpenWorkspace = () => {
    closeModal();
    openWorkspace();
  };
  const handleOpenLogs = () => {
    closeModal();
    openLogs();
  };
  const handleCopyWorkflowSnapshot = async () => {
    try {
      await copyText(workflowSnapshotExport);
      setCopyStatus("workflow");
    } catch {
      setCopyStatus("error");
    }
  };
  const handleCopyFailureHandoff = async () => {
    try {
      await copyText(failureHandoffExport);
      setCopyStatus("failure");
    } catch {
      setCopyStatus("error");
    }
  };
  const handlePrimaryAction = () => {
    closeModal();
    if (workflow.cta.primaryAction === "open_workspace") {
      openWorkspace();
      return;
    }
    requestAnimationFrame(() => {
      var _a;
      (_a = document.getElementById("analysis-results-section")) == null ? void 0 : _a.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };
  const handleConfirmStructureBoundary = () => {
    var _a;
    const detectedBoundary = (_a = workflow.structureReview) == null ? void 0 : _a.detectedBoundary;
    if (!detectedBoundary || detectedBoundary.headerRowIndex === null || detectedBoundary.bodyStartIndex === null) {
      return;
    }
    void saveReportStructureBoundaryOverride({
      headerRowIndex: detectedBoundary.headerRowIndex,
      headerLayerRowIndexes: detectedBoundary.headerLayerRowIndexes,
      bodyStartIndex: detectedBoundary.bodyStartIndex,
      summaryStartIndex: detectedBoundary.summaryStartIndex,
      parameterRowIndexes: detectedBoundary.parameterRowIndexes,
      repeatedHeaderRowIndexes: detectedBoundary.repeatedHeaderRowIndexes
    });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm", onClick: closeModal, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      role: "dialog",
      "aria-modal": "true",
      className: "relative h-screen w-screen bg-[linear-gradient(180deg,#f8fbff_0%,#f3f6fb_45%,#eef3f8_100%)] flex flex-col",
      onClick: (event) => event.stopPropagation(),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("header", { className: "sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-2 px-4 py-3 xl:flex-row xl:items-center xl:justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-3xl", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] uppercase tracking-[0.24em] text-slate-500", children: "AI Data IDE workflow" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "mt-1 text-2xl font-semibold text-slate-950 leading-tight", children: "Data Preparation Workflow" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-slate-600", children: "Fullscreen review for import, inspection, preparation, verification, and analysis readiness." })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${copyStatus === "error" ? "bg-red-100 text-red-700" : copyStatus === "workflow" ? "bg-sky-100 text-sky-800" : copyStatus === "failure" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`, children: copyStatus === "workflow" ? "Workflow snapshot copied" : copyStatus === "failure" ? "Cleaning failure bundle copied" : copyStatus === "error" ? "Copy failed" : "Copy ready" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: handleCopyWorkflowSnapshot,
                className: "rounded-card border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100",
                children: "Copy Workflow Snapshot"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: handleCopyFailureHandoff,
                className: "rounded-card border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100",
                children: "Copy Cleaning Failure Bundle"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: handleOpenLogs,
                className: "rounded-card border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100",
                children: "Open Logs"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: handleOpenWorkspace,
                className: "rounded-card bg-slate-950 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800",
                children: "Open Artifacts"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: closeModal,
                className: "rounded-card p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900",
                "aria-label": "Close workflow modal",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconClose, {})
              }
            )
          ] })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 min-h-0 overflow-y-auto px-4 pb-4 pt-4 lg:px-5 xl:px-6", children: !workflow.summary.fileName ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "h-full flex flex-col items-center justify-center text-center text-slate-500 min-h-[320px] rounded-card border border-slate-200 bg-white", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-lg font-semibold text-slate-700", children: "No workflow is available yet." }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 max-w-md text-sm", children: "Upload a CSV or open a saved report first. Then this modal will show the full Data Preparation Workflow." })
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
          DataPreparationWorkflowContent,
          {
            workflow,
            onPrimaryAction: handlePrimaryAction,
            onOpenWorkspace: handleOpenWorkspace,
            onConfirmStructureBoundary: handleConfirmStructureBoundary,
            onSaveStructureBoundaryOverride: (boundary) => {
              void saveReportStructureBoundaryOverride(boundary);
            }
          }
        ) })
      ]
    }
  ) });
};
export {
  DataPreparationWorkflowModal
};
