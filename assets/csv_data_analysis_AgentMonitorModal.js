import { r as reactExports, j as jsxRuntimeExports } from "./csv_data_analysis_vendor-react-core.js";
import { s as shallow$1 } from "./csv_data_analysis_vendor-state.js";
import { u as useAppStore } from "./csv_data_analysis_index.js";
import { I as IconClose } from "./csv_data_analysis_IconClose.js";
import { A as AiTaskStatusBubble } from "./csv_data_analysis_AiTaskStatusBubble.js";
import "./csv_data_analysis_vendor-data.js";
import "./csv_data_analysis_vendor-monaco.js";
import "./csv_data_analysis_vendor-misc.js";
import "./csv_data_analysis_app-agent.js";
import "./csv_data_analysis_app-ai.js";
import "./csv_data_analysis_vendor-ai-sdk.js";
import "./csv_data_analysis_app-reporting.js";
import "./csv_data_analysis_app-agent-planning.js";
import "./csv_data_analysis_vendor-storage.js";
import "./csv_data_analysis_IconThinking.js";
const AgentMemoryView = () => {
  const memory = useAppStore((state) => state.agentMemoryRun);
  const [isQaMode, setIsQaMode] = reactExports.useState(false);
  if (!memory) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center text-slate-500 text-sm", children: "Memory will appear after the current analysis run finishes." });
  }
  const { datasetFacts, columnVerdicts, explorations, warnings } = memory.findings;
  const sortedExplorations = [...explorations].sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
    datasetFacts && /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "border border-slate-200 rounded-card p-4 bg-slate-50", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2", children: "Dataset Facts" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3 text-sm text-slate-700", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold", children: "File:" }),
          " ",
          datasetFacts.fileName
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold", children: "Rows:" }),
          " ",
          datasetFacts.rowCount
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold", children: "Columns:" }),
          " ",
          datasetFacts.columnCount
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold", children: "Dimensions:" }),
          " ",
          datasetFacts.dimensions.join(", ") || "—"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold", children: "Metrics:" }),
          " ",
          datasetFacts.metrics.join(", ") || "—"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "border border-slate-200 rounded-card p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold text-slate-700 uppercase tracking-wide", children: "Columns & Verdicts" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-500 mt-1", children: "Evaluated on original columns before AI cleaning. Enable QA mode for samples." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center text-xs font-semibold text-slate-600 space-x-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "checkbox",
              checked: isQaMode,
              onChange: (event) => setIsQaMode(event.target.checked),
              className: "rounded border-slate-300 text-slate-700 focus:ring-slate-400"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "QA Mode" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "min-w-full text-sm text-left text-slate-700 border border-slate-200 rounded-card overflow-hidden", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-slate-100 text-xs uppercase tracking-wide", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-3 py-2", children: "Column" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-3 py-2", children: "Role" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-3 py-2", children: "Distinct" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-3 py-2", children: "Removed?" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-3 py-2", children: "Reason" }),
          isQaMode && /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-3 py-2", children: "QA Sample (first 5)" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: columnVerdicts.map((verdict) => {
          var _a;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t border-slate-200", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2 font-semibold", children: verdict.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2 capitalize", children: verdict.role }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2", children: verdict.distinctValues ?? "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2", children: verdict.removed ? "Yes" : "No" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2 text-slate-600", children: verdict.reason || "—" }),
            isQaMode && /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2 text-slate-600", children: ((_a = verdict.sampleValues) == null ? void 0 : _a.length) ? verdict.sampleValues.join(", ") : verdict.constantValue || "—" })
          ] }, verdict.name);
        }) })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "border border-slate-200 rounded-card p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3", children: "Group-by Explorations" }),
      sortedExplorations.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-500", children: "No explorations were recorded for this run." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-3", children: sortedExplorations.map((exploration) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "border border-slate-200 rounded-card p-3 bg-white", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between text-xs text-slate-500 mb-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: exploration.startedAt.toLocaleTimeString() }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "uppercase font-semibold", children: exploration.verdict })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold text-slate-800", children: exploration.planTitle }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-slate-600", children: [
          "Group by ",
          exploration.groupBy.join(", ") || "n/a",
          " • Metric ",
          exploration.metric || "n/a"
        ] }),
        exploration.metrics && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-slate-500 mt-1", children: [
          exploration.metrics.groups,
          " groups, unique values ",
          exploration.metrics.uniqueValues,
          ", top share ",
          exploration.metrics.topShare !== null ? `${(exploration.metrics.topShare * 100).toFixed(1)}%` : "n/a"
        ] }),
        exploration.commentary && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-600 mt-1", children: exploration.commentary }),
        exploration.cardCreated && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-block mt-2 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full", children: "Card created" })
      ] }, exploration.id)) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "border border-slate-200 rounded-card p-4 bg-slate-50", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2", children: "High-Level Findings" }),
      warnings.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-500", children: "No warnings were recorded during this run." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-2 text-sm text-slate-700", children: warnings.map((warning) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-start", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-amber-500 mr-2 mt-2" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: warning.message })
      ] }, warning.id)) })
    ] })
  ] });
};
const DatasetKnowledgeView = () => {
  const knowledge = useAppStore((state) => {
    var _a;
    return (_a = state.agentMemoryRun) == null ? void 0 : _a.findings.datasetKnowledge;
  });
  if (!knowledge) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center text-slate-500 text-sm", children: "Dataset knowledge will appear after the current analysis finishes." });
  }
  const renderHighlightList = (title, highlights) => /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "border border-slate-200 rounded-card p-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2", children: title }),
    highlights.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-500", children: "No items recorded." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-2 text-sm text-slate-700", children: highlights.map((entry) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-start", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-slate-500 mr-2 mt-2" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold", children: entry.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-slate-500", children: [
          " — ",
          entry.reason
        ] })
      ] })
    ] }, `${entry.name}-${entry.reason}`)) })
  ] });
  const noiseColumns = knowledge.columns.filter((column) => column.role === "noise" || column.role === "metadata");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "border border-slate-200 rounded-card p-4 bg-slate-50", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2", children: "Dataset Facts" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3 text-sm text-slate-700", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold", children: "Rows (cleaned):" }),
          " ",
          knowledge.facts.cleanedRowCount.toLocaleString()
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold", children: "Columns (cleaned):" }),
          " ",
          knowledge.facts.cleanedColumnCount
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold", children: "Primary Dimensions:" }),
          " ",
          knowledge.facts.primaryDimensions.join(", ") || "—"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold", children: "Primary Metrics:" }),
          " ",
          knowledge.facts.primaryMetrics.join(", ") || "—"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "col-span-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold", children: "Noise / Removed Columns:" }),
          " ",
          noiseColumns.length > 0 ? noiseColumns.map((column) => column.name).join(", ") : "None"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "border border-slate-200 rounded-card p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3", children: "Column Knowledge" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "min-w-full text-xs text-left text-slate-700 border border-slate-200 rounded-card overflow-hidden", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-slate-100 uppercase tracking-wide", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-3 py-2", children: "Name" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-3 py-2", children: "Role" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-3 py-2", children: "Semantic Guess" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-3 py-2", children: "Distinct" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-3 py-2", children: "Missing%" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-3 py-2", children: "Notes" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: knowledge.columns.map((column) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t border-slate-100", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2 font-semibold", children: column.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2 capitalize", children: column.role }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2 text-slate-600", children: column.semanticGuess || "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2", children: column.distinctValues ?? "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2", children: column.missingPercentage !== void 0 ? `${column.missingPercentage.toFixed(1)}%` : "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2 text-slate-500", children: column.notes || "—" })
        ] }, column.name)) })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "border border-slate-200 rounded-card p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2", children: "Dimension Map" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("dl", { className: "grid grid-cols-2 gap-3 text-sm text-slate-700", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { className: "font-semibold", children: "Project" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: knowledge.dimensionMap.project.join(", ") || "—" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { className: "font-semibold", children: "Account" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: knowledge.dimensionMap.account.join(", ") || "—" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { className: "font-semibold", children: "Allocation" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: knowledge.dimensionMap.allocation.join(", ") || "—" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { className: "font-semibold", children: "Keys" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: knowledge.dimensionMap.keys.join(", ") || "—" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { className: "font-semibold", children: "Other Dimensions" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: knowledge.dimensionMap.otherDimensions.join(", ") || "—" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { className: "font-semibold", children: "Metrics" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: knowledge.dimensionMap.metrics.join(", ") || "—" })
        ] })
      ] })
    ] }),
    renderHighlightList("High-Value Dimensions", knowledge.highValueDimensions),
    renderHighlightList("Suspicious Metrics / Noise Signals", knowledge.suspiciousMetrics),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "border border-slate-200 rounded-card p-4 bg-slate-50", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2", children: "Dataset Summary" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-700 whitespace-pre-line", children: knowledge.summary || "Summary pending." })
    ] })
  ] });
};
const statusBadgeClass = {
  pending: "bg-slate-100 text-slate-600",
  in_progress: "bg-blue-100 text-blue-700",
  done: "bg-green-100 text-green-700",
  error: "bg-red-100 text-red-700"
};
const phaseLabels = {
  file: "File Intake",
  profiling: "Profiling",
  topic_generation: "Topic Generation",
  planning: "Planning",
  execution: "Execution",
  evaluation: "Evaluation",
  chat: "Chat"
};
const AgentMonitorModal = () => {
  reactExports.useEffect(() => {
    const state = useAppStore.getState();
    state.syncTelemetryToStore();
    state.syncTelemetryEventsToStore();
  }, []);
  const {
    isAgentModalOpen,
    setIsAgentModalOpen,
    agentEvents,
    agentToolLogs,
    aiTaskStatus,
    agentMemoryRun,
    agentMemoryHistory,
    selectedMemoryRunId,
    liveAgentMemoryRun,
    selectAgentMemoryRun,
    cardEnhancementSuggestions,
    isCardReviewInProgress,
    runCardEnhancementReview,
    applyCardEnhancementSuggestion,
    dismissCardEnhancementSuggestion
  } = useAppStore((state) => ({
    isAgentModalOpen: state.isAgentModalOpen,
    setIsAgentModalOpen: state.setIsAgentModalOpen,
    agentEvents: state.agentEvents,
    agentToolLogs: state.agentToolLogs,
    aiTaskStatus: state.aiTaskStatus,
    agentMemoryRun: state.agentMemoryRun,
    agentMemoryHistory: state.agentMemoryHistory,
    selectedMemoryRunId: state.selectedMemoryRunId,
    liveAgentMemoryRun: state.liveAgentMemoryRun,
    selectAgentMemoryRun: state.selectAgentMemoryRun,
    cardEnhancementSuggestions: state.cardEnhancementSuggestions,
    isCardReviewInProgress: state.isCardReviewInProgress,
    runCardEnhancementReview: state.runCardEnhancementReview,
    applyCardEnhancementSuggestion: state.applyCardEnhancementSuggestion,
    dismissCardEnhancementSuggestion: state.dismissCardEnhancementSuggestion
  }), shallow$1);
  const [activeTab, setActiveTab] = reactExports.useState("timeline");
  const historyOptions = reactExports.useMemo(
    () => [...agentMemoryHistory].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    [agentMemoryHistory]
  );
  const timeline = reactExports.useMemo(() => {
    if ((agentMemoryRun == null ? void 0 : agentMemoryRun.timeline) && selectedMemoryRunId) {
      return [...agentMemoryRun.timeline].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    }
    return [...agentEvents].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [agentEvents, agentMemoryRun, selectedMemoryRunId]);
  const toolLogs = reactExports.useMemo(() => {
    return [...agentToolLogs].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [agentToolLogs]);
  if (!isAgentModalOpen) return null;
  const selectedRunValue = selectedMemoryRunId ?? "live";
  const handleRunSelect = (event) => {
    const value = event.target.value;
    selectAgentMemoryRun(value === "live" ? null : value);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60", onClick: () => setIsAgentModalOpen(false), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      role: "dialog",
      "aria-modal": "true",
      className: "relative flex max-h-[85vh] w-full max-w-3xl flex-col rounded-card border border-slate-200 bg-white shadow-2xl",
      onClick: (event) => event.stopPropagation(),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "border-b border-slate-200 px-4 py-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs uppercase text-slate-500 tracking-wider", children: "Agent intelligence" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-semibold text-slate-900 leading-tight mt-1", children: "How the agent is thinking" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-500 mt-1", children: "Live timeline, tools, memory, and dataset knowledge in one place." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex rounded-full bg-slate-100 p-0.5", children: ["timeline", "tools", "memory", "knowledge"].map((tab) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: () => setActiveTab(tab),
              className: `px-3 py-1 text-sm font-medium rounded-full transition ${activeTab === tab ? "bg-white shadow text-slate-900" : "text-slate-500"}`,
              children: tab === "timeline" ? "Timeline" : tab === "tools" ? "Tools" : tab === "memory" ? "Memory" : "Dataset Knowledge"
            },
            tab
          )) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col text-xs text-slate-500", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "mb-1 font-semibold", children: "Memory Run" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "select",
              {
                className: "text-sm border border-slate-200 rounded-md px-2 py-1 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300",
                value: selectedRunValue,
                onChange: handleRunSelect,
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: "live", children: [
                    "Live analysis ",
                    liveAgentMemoryRun ? "(latest finished)" : "(in progress)"
                  ] }),
                  historyOptions.map((run) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: run.runId, children: new Date(run.createdAt).toLocaleString() }, run.runId))
                ]
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => setIsAgentModalOpen(false),
            className: "absolute top-4 right-4 p-2 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100",
            "aria-label": "Close agent monitor",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconClose, {})
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 space-y-4 overflow-y-auto p-4", children: activeTab === "timeline" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          aiTaskStatus && /* @__PURE__ */ jsxRuntimeExports.jsx(AiTaskStatusBubble, { task: aiTaskStatus }),
          timeline.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center text-slate-500 text-sm", children: "The agent has not logged any reasoning steps yet. Once analysis begins you will see the full timeline here." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("ol", { className: "space-y-3", children: timeline.map((event) => {
            var _a;
            return /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "rounded-card border border-slate-200 bg-slate-50 p-4", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-1 flex items-center justify-between", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-semibold uppercase tracking-wide text-slate-500", children: phaseLabels[event.phase] || event.phase }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-xs px-2 py-0.5 rounded-full ${statusBadgeClass[event.status]}`, children: event.status.replace("_", " ") })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-slate-400", children: event.timestamp.toLocaleString() })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-800 text-sm whitespace-pre-wrap font-semibold", children: event.step }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-700 text-sm whitespace-pre-wrap mt-1", children: event.message }),
              ((_a = event.detail) == null ? void 0 : _a.tablePreview) && Array.isArray(event.detail.tablePreview) && event.detail.tablePreview.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs uppercase tracking-wide text-slate-400 mb-1", children: "Sample preview" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto border border-slate-200 rounded-md bg-white", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "min-w-full text-xs text-left text-slate-600", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-slate-100", children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: (event.detail.columns || Object.keys(event.detail.tablePreview[0])).map((col) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-2 py-1 font-semibold", children: col }, col)) }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: event.detail.tablePreview.map((row, idx) => /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { className: "border-t border-slate-100", children: (event.detail.columns || Object.keys(row)).map((col) => /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1 whitespace-nowrap", children: String(row[col]) }, col)) }, idx)) })
                ] }) })
              ] }) : null,
              event.detail && (() => {
                const detailForJson = { ...event.detail };
                delete detailForJson.tablePreview;
                delete detailForJson.columns;
                if (Object.keys(detailForJson).length === 0) {
                  return null;
                }
                return /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "mt-3 text-xs bg-white text-slate-600 border border-slate-200 rounded-md p-3 overflow-x-auto", children: JSON.stringify(detailForJson, null, 2) });
              })()
            ] }, event.id);
          }) })
        ] }) : activeTab === "tools" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-semibold text-slate-900", children: "AI Review & Suggestions" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-500", children: "Have the agent scan all cards and propose enhancements." })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: () => runCardEnhancementReview(),
                disabled: isCardReviewInProgress,
                className: `px-4 py-2 rounded-md text-sm font-medium shadow transition ${isCardReviewInProgress ? "bg-slate-200 text-slate-500 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"}`,
                children: isCardReviewInProgress ? "Reviewing..." : "Review Cards"
              }
            )
          ] }),
          cardEnhancementSuggestions.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-md p-4 text-center", children: "No AI enhancement suggestions yet. Run a review to generate recommendations." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: cardEnhancementSuggestions.map((suggestion) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border border-slate-200 rounded-card p-4 bg-white shadow-sm", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold text-slate-900", children: suggestion.cardTitle || suggestion.cardId }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: `text-xs px-2 py-0.5 rounded-full ${suggestion.priority === "high" ? "bg-red-100 text-red-700" : suggestion.priority === "medium" ? "bg-yellow-100 text-yellow-700" : "bg-slate-100 text-slate-600"}`,
                  children: suggestion.priority.toUpperCase()
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-700 mt-2 whitespace-pre-wrap", children: suggestion.rationale }),
            suggestion.action === "add_calculated_column" && suggestion.proposedColumnName && suggestion.formula && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 text-xs bg-slate-50 border border-slate-200 rounded-md p-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold text-slate-600 mb-1", children: "Proposed Column" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-slate-700", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: suggestion.proposedColumnName }),
                " = ",
                suggestion.formula
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex items-center gap-2 text-xs", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase tracking-wide", children: suggestion.status }),
              suggestion.status === "failed" && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-red-600 font-medium", children: "Action failed. Try again." })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex flex-wrap gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  disabled: suggestion.status === "applied" || suggestion.status === "applying",
                  onClick: () => applyCardEnhancementSuggestion(suggestion.id),
                  className: `px-3 py-1.5 rounded-md text-sm font-medium ${suggestion.status === "applied" ? "bg-green-100 text-green-700 cursor-default" : suggestion.status === "applying" ? "bg-slate-200 text-slate-500 cursor-progress" : "bg-blue-600 text-white hover:bg-blue-700"}`,
                  children: suggestion.status === "applied" ? "Applied" : suggestion.status === "applying" ? "Applying..." : "Apply Suggestion"
                }
              ),
              suggestion.status !== "applied" && suggestion.status !== "dismissed" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  onClick: () => dismissCardEnhancementSuggestion(suggestion.id),
                  className: "px-3 py-1.5 rounded-md text-sm font-medium border border-slate-300 text-slate-600 hover:bg-slate-50",
                  children: "Dismiss"
                }
              )
            ] })
          ] }, suggestion.id)) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pt-4 border-t border-slate-200", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-sm font-semibold text-slate-800", children: "Tool Usage Log" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-slate-500", children: "Most recent first" })
            ] }),
            toolLogs.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-md p-3 text-center", children: "No automated tools have been triggered yet for this session." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "divide-y divide-slate-200 border border-slate-200 rounded-card bg-white overflow-hidden max-h-72 overflow-y-auto", children: toolLogs.map((log) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "p-4", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-semibold uppercase tracking-wide text-blue-600", children: log.tool }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-slate-400", children: log.timestamp.toLocaleString() })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-slate-800 mt-1", children: log.description }),
              log.detail && /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "mt-3 text-[11px] bg-slate-50 text-slate-600 border border-slate-200 rounded-md p-3 overflow-x-auto", children: JSON.stringify(log.detail, null, 2) })
            ] }, log.id)) })
          ] })
        ] }) : activeTab === "memory" ? /* @__PURE__ */ jsxRuntimeExports.jsx(AgentMemoryView, {}) : /* @__PURE__ */ jsxRuntimeExports.jsx(DatasetKnowledgeView, {}) })
      ]
    }
  ) });
};
export {
  AgentMonitorModal
};
