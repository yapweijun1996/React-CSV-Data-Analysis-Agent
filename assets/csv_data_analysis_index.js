const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./csv_data_analysis_vendor-ai-sdk.js","./csv_data_analysis_vendor-misc.js","./csv_data_analysis_vendor-data.js","./csv_data_analysis_app-reporting.js","./csv_data_analysis_vendor-storage.js","./csv_data_analysis_ChatPanel.js","./csv_data_analysis_vendor-react-core.js","./csv_data_analysis_vendor-state.js","./csv_data_analysis_MarkdownRenderer.js","./csv_data_analysis_vendor-ui.js","./csv_data_analysis_IconThinking.js","./csv_data_analysis_IconAi.js","./csv_data_analysis_AnalysisPanel.js","./csv_data_analysis_IconClose.js","./csv_data_analysis_TabulatorTable.js","./csv_data_analysis_CleaningRunBanner.js","./csv_data_analysis_AiTaskStatusBubble.js","./csv_data_analysis_SpreadsheetPanel.js","./csv_data_analysis_SettingsModal.js","./csv_data_analysis_HistoryPanel.js","./csv_data_analysis_MemoryPanel.js","./csv_data_analysis_AgentMonitorModal.js","./csv_data_analysis_DatabaseModal.js","./csv_data_analysis_WorkspaceModal.js","./csv_data_analysis_DataPreparationWorkflowModal.js","./csv_data_analysis_copyText.js","./csv_data_analysis_DebugLogsModal.js","./csv_data_analysis_ReportBoundaryConfirmModal.js","./csv_data_analysis_ApiKeyRequiredModal.js"])))=>i.map(i=>d[i]);
import { j as jsxRuntimeExports, r as reactExports, W as We, R as ReactDOM } from "./csv_data_analysis_vendor-react-core.js";
import { aZ as shouldAllowAgentThinkingSurface, a_ as shouldAllowLongTermMemorySurface, a$ as shouldAllowLogsSurface, b0 as shouldAllowWorkflowSurface, b1 as shouldAllowWorkspaceSurface, b2 as shouldAllowDatabaseSurface, b3 as shouldAllowSettingsSurface, b4 as getDefaultSettings, a5 as __vitePreload, b5 as normalizeRuntimeAccessControlSettings, b6 as normalizeAppLanguage, b7 as saveSettings, ar as createId, b8 as disposeDuckDbQueryEngine, b9 as getReport, ba as CURRENT_SESSION_KEY, bb as saveReport, D as vectorStore, bc as deleteReport, bd as deleteOriginalData, be as createIdleDuckDbSessionStatus, bf as purgeAllStorage, bg as normalizeRestoredAppState, bh as normalizeRestoredGoalState, bi as appendUnfinishedCleaningNotice, bj as getReportsList, K as createChatMessage, bk as navigateToCard, bl as buildColumnRegistry, bm as buildEffectiveColumnRegistryFromState, bn as duckDbWorkerClient, bo as DUCKDB_INIT_TIMEOUT_MS, bp as profileDataWithWorker, bq as createBindingDuckDbSessionStatus, br as getOriginalData, I as getTranslation, bs as getAllowedColumns, bt as createProgressMessage, bu as trimProgressMessages, bv as isDuckDbSessionStatusEqual, bw as primeDuckDbDataset, bx as createDuckDbSessionStatusFromBinding, by as createWorkerDiagnosticsTelemetryReporter, bz as parseCardMentions, bA as buildCorrelationFields, bB as toSerializable, b as isRuntimeAbortError, bC as getSettings, bD as shouldShowNewSessionButton, bE as shouldShowHistoryButton, bF as shouldShowDatabaseButton, bG as shouldShowWorkflowButton, bH as shouldShowLogsButton, bI as shouldShowChangeGoalButton, bJ as shouldShowAssistantToggleButton, bK as checkStorageHealth, bL as APP_HEADER_HIDE_FOR_CARD_NAVIGATION_EVENT, bM as shouldShowAgentThinkingModal, bN as shouldShowLongTermMemory, bO as formatUserError } from "./csv_data_analysis_app-agent.js";
import { c as createWithEqualityFn, s as shallow$1 } from "./csv_data_analysis_vendor-state.js";
import { p as parseReportArtifactManifest, l as loadReportArtifactHtml, k as printReportArtifact, o as openReportArtifact, m as hydrateLatestReportWorkspaceFiles, L as LATEST_REPORT_MANIFEST_PATH, n as LATEST_REPORT_READINESS_PATH, q as hasOpenableLatestReport, t as LATEST_REPORT_HTML_PATH, u as generateAnalystReportArtifacts, v as saveReportArtifacts } from "./csv_data_analysis_app-reporting.js";
import "./csv_data_analysis_vendor-data.js";
import "./csv_data_analysis_vendor-monaco.js";
import "./csv_data_analysis_vendor-misc.js";
import "./csv_data_analysis_app-ai.js";
import "./csv_data_analysis_vendor-ai-sdk.js";
import "./csv_data_analysis_app-agent-planning.js";
import "./csv_data_analysis_vendor-storage.js";
(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) {
    return;
  }
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) {
    processPreload(link);
  }
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.tagName === "LINK" && node.rel === "modulepreload")
          processPreload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials")
      fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep)
      return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
const MIN_ASIDE_WIDTH = 320;
const MAX_ASIDE_WIDTH = 800;
const MIN_MAIN_WIDTH = 600;
const createUISlice = (set) => ({
  isAsideVisible: true,
  asideWidth: window.innerWidth / 4 > MIN_ASIDE_WIDTH ? window.innerWidth / 4 : MIN_ASIDE_WIDTH,
  isSpreadsheetVisible: false,
  isSettingsModalOpen: false,
  isHistoryPanelOpen: false,
  isDatabaseModalOpen: false,
  isWorkspaceModalOpen: false,
  isDataPreparationModalOpen: false,
  isDebugLogsModalOpen: false,
  isMemoryPanelOpen: false,
  isAgentModalOpen: false,
  isReportBoundaryConfirmModalOpen: false,
  isApiKeyRequiredModalOpen: false,
  isResizing: false,
  pendingPrecomputedCardData: null,
  globalErrorToast: null,
  setGlobalErrorToast: (toast) => set({ globalErrorToast: toast }),
  setPendingPrecomputedCardData: (data) => set({ pendingPrecomputedCardData: data }),
  handleAsideMouseDown: (e) => {
    e.preventDefault();
    set({ isResizing: true });
    const handleMouseMove = (moveEvent) => {
      const maxAllowedAsideWidth = window.innerWidth - MIN_MAIN_WIDTH;
      let newWidth = window.innerWidth - moveEvent.clientX;
      newWidth = Math.max(MIN_ASIDE_WIDTH, newWidth);
      newWidth = Math.min(MAX_ASIDE_WIDTH, newWidth, maxAllowedAsideWidth);
      set({ asideWidth: newWidth });
    };
    const handleMouseUp = () => {
      set({ isResizing: false });
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  },
  setIsAsideVisible: (isVisible) => set({ isAsideVisible: isVisible }),
  setIsSpreadsheetVisible: (isVisible) => set({ isSpreadsheetVisible: isVisible }),
  setIsSettingsModalOpen: (isOpen) => set({ isSettingsModalOpen: isOpen ? shouldAllowSettingsSurface() : false }),
  setIsHistoryPanelOpen: (isOpen) => set({ isHistoryPanelOpen: isOpen }),
  setIsDatabaseModalOpen: (isOpen) => set({ isDatabaseModalOpen: isOpen ? shouldAllowDatabaseSurface() : false }),
  setIsWorkspaceModalOpen: (isOpen) => set({ isWorkspaceModalOpen: isOpen ? shouldAllowWorkspaceSurface() : false }),
  setIsDataPreparationModalOpen: (isOpen) => set({ isDataPreparationModalOpen: isOpen ? shouldAllowWorkflowSurface() : false }),
  setIsDebugLogsModalOpen: (isOpen) => set({ isDebugLogsModalOpen: isOpen ? shouldAllowLogsSurface() : false }),
  setIsMemoryPanelOpen: (isOpen) => set({ isMemoryPanelOpen: isOpen ? shouldAllowLongTermMemorySurface() : false }),
  setIsAgentModalOpen: (isOpen) => set({ isAgentModalOpen: isOpen ? shouldAllowAgentThinkingSurface() : false }),
  setIsReportBoundaryConfirmModalOpen: (isOpen) => set({ isReportBoundaryConfirmModalOpen: isOpen }),
  setIsApiKeyRequiredModalOpen: (isOpen) => set({ isApiKeyRequiredModalOpen: isOpen })
});
let _isProviderConfigured$1 = null;
const defaultSettings = getDefaultSettings();
const createSettingsSlice = (set, get) => ({
  settings: defaultSettings,
  isApiKeySet: false,
  handleSaveSettings: async (newSettings) => {
    if (!_isProviderConfigured$1) {
      const mod = await __vitePreload(() => import("./csv_data_analysis_app-ai.js").then((n) => n.a6), true ? __vite__mapDeps([0,1,2,3,4]) : void 0, import.meta.url);
      _isProviderConfigured$1 = mod.isProviderConfigured;
    }
    const normalizedSettings = {
      ...newSettings,
      language: normalizeAppLanguage(newSettings.language),
      runtimeAccessControl: normalizeRuntimeAccessControlSettings(newSettings.runtimeAccessControl)
    };
    set({ settings: normalizedSettings, isApiKeySet: _isProviderConfigured$1(normalizedSettings) });
    const { invalidateProviderHealthCache } = await __vitePreload(async () => {
      const { invalidateProviderHealthCache: invalidateProviderHealthCache2 } = await import("./csv_data_analysis_app-ai.js").then((n) => n.a6);
      return { invalidateProviderHealthCache: invalidateProviderHealthCache2 };
    }, true ? __vite__mapDeps([0,1,2,3,4]) : void 0, import.meta.url);
    invalidateProviderHealthCache();
    void saveSettings(normalizedSettings).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      get().addProgress(`Failed to save settings: ${message}`, "error");
    });
  },
  setReportTemplate: (reportTemplate) => {
    const currentSettings = get().settings;
    get().handleSaveSettings({
      ...currentSettings,
      reportTemplate
    });
  }
});
const TAB_SESSION_STORAGE_KEY = "csv_agent_tab_session_id";
const isSessionStorageAvailable = () => typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
const generateSessionId = () => createId("session");
const readTabSessionId = () => {
  if (!isSessionStorageAvailable()) {
    return null;
  }
  return window.sessionStorage.getItem(TAB_SESSION_STORAGE_KEY);
};
const writeTabSessionId = (sessionId) => {
  if (!isSessionStorageAvailable()) {
    return sessionId;
  }
  window.sessionStorage.setItem(TAB_SESSION_STORAGE_KEY, sessionId);
  return sessionId;
};
const createAndStoreTabSessionId = () => writeTabSessionId(generateSessionId());
const createHistorySlice = (set, get) => ({
  reportsList: [],
  loadReportsList: async () => {
    const list = await getReportsList();
    set({ reportsList: list });
  },
  /** Load reports list only if cache is empty or stale (>30s). */
  loadReportsListIfNeeded: async () => {
    const current = get().reportsList;
    const lastLoaded = get()._reportsListLoadedAt;
    const now = Date.now();
    if (current.length > 0 && lastLoaded && now - lastLoaded < 3e4) return;
    const list = await getReportsList();
    set({ reportsList: list, _reportsListLoadedAt: now });
  },
  handleLoadReport: async (id) => {
    var _a, _b;
    const activeTurn = get().activeTurn;
    if (activeTurn && activeTurn.status === "running") {
      get().addProgress("Cannot load a report while an AI turn is running. Please wait for it to finish or cancel it first.", "error");
      return;
    }
    get().addProgress(`Loading report ${id}...`);
    const [report, { normalizeDataPreparationPlan }, { updateCleaningRun }] = await Promise.all([
      getReport(id),
      __vitePreload(() => import("./csv_data_analysis_app-agent.js").then((n) => n.cO), true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url),
      __vitePreload(() => import("./csv_data_analysis_app-agent.js").then((n) => n.cS), true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url)
    ]);
    if (report) {
      const normalizedAppState = normalizeRestoredAppState(report.appState);
      const hydratedWorkspaceFiles = await hydrateLatestReportWorkspaceFiles(normalizedAppState.workspaceFiles ?? {});
      const nextSessionId = createAndStoreTabSessionId();
      const loadedAt = /* @__PURE__ */ new Date();
      await disposeDuckDbQueryEngine();
      await vectorStore.clear();
      set({
        ...normalizedAppState,
        sessionId: nextSessionId,
        workspaceFiles: hydratedWorkspaceFiles,
        workspaceActionHistory: normalizedAppState.workspaceActionHistory ?? [],
        queryHistory: normalizedAppState.queryHistory ?? [],
        duckDbSessionStatus: normalizedAppState.duckDbSessionStatus ?? createIdleDuckDbSessionStatus(),
        dataPreparationPlan: normalizeDataPreparationPlan(normalizedAppState.dataPreparationPlan),
        pendingClarification: null,
        pendingMutationConfirmation: normalizedAppState.pendingMutationConfirmation ?? null,
        activeTurn: null,
        queuedChatTurns: [],
        queuedAgentRuns: [],
        cancelRequestedTurnId: null,
        runtimeEvents: [],
        runtimeRunHistory: [],
        cleaningRun: normalizedAppState.cleaningRun ? updateCleaningRun(normalizedAppState.cleaningRun, {
          status: normalizedAppState.cleaningRun.status === "completed" ? "completed" : "paused",
          shouldAutoResume: false
        }) : null,
        analysisCards: normalizedAppState.cleaningRun && normalizedAppState.cleaningRun.status !== "completed" ? [] : normalizedAppState.analysisCards,
        finalSummary: normalizedAppState.cleaningRun && normalizedAppState.cleaningRun.status !== "completed" ? null : normalizedAppState.finalSummary,
        aiCoreAnalysisSummary: normalizedAppState.cleaningRun && normalizedAppState.cleaningRun.status !== "completed" ? null : normalizedAppState.aiCoreAnalysisSummary,
        initialAnalysisStatus: normalizedAppState.initialAnalysisStatus ?? (normalizedAppState.cleaningRun && normalizedAppState.cleaningRun.status !== "completed" ? "idle" : (((_a = normalizedAppState.analysisCards) == null ? void 0 : _a.length) ?? 0) > 0 || Boolean(normalizedAppState.finalSummary) ? "ready" : "idle"),
        goalState: normalizeRestoredGoalState(normalizedAppState.goalState),
        currentView: normalizedAppState.csvData ? "analysis_dashboard" : "file_upload",
        isHistoryPanelOpen: false,
        isWorkspaceModalOpen: false,
        isDataPreparationModalOpen: false,
        isDebugLogsModalOpen: false,
        activeDataQuery: null,
        activeSpreadsheetFilter: normalizedAppState.activeSpreadsheetFilter ?? null,
        isBusy: false,
        chatLifecycleState: "idle",
        isGeneratingReport: false,
        sessionCreatedAt: loadedAt,
        vectorStoreDocuments: []
      });
      const savedVectorDocs = normalizedAppState.vectorStoreDocuments;
      if (Array.isArray(savedVectorDocs) && savedVectorDocs.length > 0 && savedVectorDocs.every((d) => Array.isArray(d.embedding) && d.embedding.length > 0)) {
        void (async () => {
          try {
            await vectorStore.rehydrate(savedVectorDocs);
            set({ vectorStoreDocuments: savedVectorDocs });
            vectorStore.schedulePersist();
            get().addProgress("Restored AI long-term memory from the loaded report.");
          } catch {
          }
        })();
      } else {
        void __vitePreload(() => import("./csv_data_analysis_app-agent.js").then((n) => n.cT), true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url).then(
          (m) => m.rebuildVectorMemoryFromState({ getState: get, setState: set }, {
            reset: true,
            includeDatasetDocs: true,
            progressMessage: "Rebuilding AI long-term memory from the loaded report..."
          })
        );
      }
      if (((_b = normalizedAppState.cleaningRun) == null ? void 0 : _b.status) === "completed" || !normalizedAppState.cleaningRun) {
        await get().refreshDuckDbSession();
      } else {
        set((prev) => ({
          chatHistory: appendUnfinishedCleaningNotice(prev.chatHistory, "history_load")
        }));
      }
      get().addProgress(`Report "${report.filename}" loaded.`);
    } else {
      get().addProgress(`Failed to load report ${id}.`, "error");
    }
  },
  handleDeleteReport: async (id) => {
    try {
      await deleteReport(id);
      await get().loadReportsList();
    } catch (error) {
      get().addProgress(`Failed to delete report: ${error instanceof Error ? error.message : String(error)}`, "error");
    }
  },
  handlePurgeStorage: async () => {
    try {
      const result = await purgeAllStorage(get().sessionId);
      await get().loadReportsList();
      return result;
    } catch (error) {
      get().addProgress(`Failed to purge storage: ${error instanceof Error ? error.message : String(error)}`, "error");
      return { deletedReports: 0, freedMB: 0 };
    }
  },
  openPersistedReportArtifact: async (id) => {
    var _a, _b;
    const report = await getReport(id);
    const manifest = parseReportArtifactManifest((_b = (_a = report == null ? void 0 : report.appState) == null ? void 0 : _a.workspaceFiles) == null ? void 0 : _b["/workspace/reports/latest-analyst-report.manifest.json"]);
    const html = manifest ? await loadReportArtifactHtml(manifest.reportId) : null;
    if (!html) {
      get().addProgress(`No saved report artifact was found for ${id}.`, "error");
      return;
    }
    const openedWindow = openReportArtifact(html);
    if (!openedWindow) {
      get().addProgress(`Failed to open the saved report for ${id}.`, "error");
    }
  },
  exportPersistedReportPdf: async (id) => {
    var _a, _b;
    const report = await getReport(id);
    const manifest = parseReportArtifactManifest((_b = (_a = report == null ? void 0 : report.appState) == null ? void 0 : _a.workspaceFiles) == null ? void 0 : _b["/workspace/reports/latest-analyst-report.manifest.json"]);
    const html = manifest ? await loadReportArtifactHtml(manifest.reportId) : null;
    if (!html) {
      get().addProgress(`No saved report artifact was found for ${id}.`, "error");
      return;
    }
    const openedWindow = printReportArtifact(html);
    if (!openedWindow) {
      get().addProgress(`Failed to open the saved report for PDF export: ${id}.`, "error");
    }
  },
  handleNewSession: async () => {
    try {
      await disposeDuckDbQueryEngine();
      if (get().csvData) {
        const existingSession = await getReport(CURRENT_SESSION_KEY);
        if (existingSession) {
          const archiveId = `report-${existingSession.createdAt.getTime()}`;
          await saveReport({ ...existingSession, id: archiveId, updatedAt: /* @__PURE__ */ new Date() });
        }
      }
      await vectorStore.clear();
      await deleteReport(CURRENT_SESSION_KEY);
      const outgoingSessionId = get().sessionId;
      if (outgoingSessionId) {
        deleteOriginalData(outgoingSessionId).catch(() => {
        });
      }
      const nextSessionId = createAndStoreTabSessionId();
      const settings = get().settings;
      const isApiKeySet = get().isApiKeySet;
      set({
        currentView: "file_upload",
        sessionId: nextSessionId,
        isBusy: false,
        chatLifecycleState: "idle",
        progressMessages: [],
        telemetryEvents: [],
        agentEvents: [],
        agentMemoryRun: null,
        liveAgentMemoryRun: null,
        agentMemoryHistory: [],
        selectedMemoryRunId: null,
        currentDatasetId: null,
        csvData: null,
        rawCsvData: null,
        rawIntakeIr: null,
        reportStructureResolution: null,
        canonicalCsvData: null,
        canonicalBuildMeta: null,
        canonicalizationStatus: "idle",
        pipelineOutcome: null,
        reportContextResolution: null,
        datasetSemanticSnapshot: null,
        semanticStatus: "idle",
        semanticDatasetVersion: null,
        columnProfiles: [],
        columnRegistry: null,
        analysisCards: [],
        chatHistory: [],
        finalSummary: null,
        aiCoreAnalysisSummary: null,
        dataPreparationPlan: null,
        initialDataSample: null,
        vectorStoreDocuments: [],
        spreadsheetFilterFunction: null,
        activeDataQuery: null,
        activeMetricMappingValidation: null,
        activeSpreadsheetFilter: null,
        aiFilterExplanation: null,
        pendingClarification: null,
        resolvedClarifications: null,
        pendingMutationConfirmation: null,
        activeTurn: null,
        queuedChatTurns: [],
        queuedAgentRuns: [],
        cancelRequestedTurnId: null,
        runtimeEvents: [],
        runtimeRunHistory: [],
        aiTaskStatus: null,
        initialAnalysisStatus: "idle",
        confirmedAnalysisGoal: null,
        goalState: "idle",
        dataQualityIssues: null,
        isChangingGoal: false,
        planQueue: [],
        contextualSummary: null,
        isGeneratingReport: false,
        isSummaryGenerating: false,
        reportGenerationProgress: null,
        sessionCreatedAt: /* @__PURE__ */ new Date(),
        agentToolLogs: [],
        cardEnhancementSuggestions: [],
        isCardReviewInProgress: false,
        isWorkspaceModalOpen: false,
        isDataPreparationModalOpen: false,
        isDebugLogsModalOpen: false,
        workspaceFiles: {},
        workspaceActionHistory: [],
        cleaningRun: null,
        queryHistory: [],
        duckDbSessionStatus: createIdleDuckDbSessionStatus(),
        // Now, restore settings and other preserved state
        settings,
        isApiKeySet
      });
      await get().loadReportsList();
    } catch (error) {
      get().addProgress(`Failed to start a new session: ${error instanceof Error ? error.message : String(error)}`, "error");
    }
  }
});
const MAX_CACHE_SIZE = 100;
const cache = /* @__PURE__ */ new Map();
function computeDataContentHash(data) {
  if (!data || data.length === 0) return "0::";
  const first = JSON.stringify(data[0]);
  const last = data.length > 1 ? JSON.stringify(data[data.length - 1]) : first;
  return `${data.length}:${first}:${last}`;
}
function computeChartCacheKey(input) {
  const sorted = {};
  for (const key of Object.keys(input).sort()) {
    sorted[key] = input[key];
  }
  return JSON.stringify(sorted);
}
function getCachedChart(cardId) {
  return cache.get(cardId);
}
function setCachedChart(cardId, entry) {
  if (!cache.has(cardId) && cache.size >= MAX_CACHE_SIZE) {
    let oldestKey = null;
    let oldestTime = Infinity;
    for (const [key, val] of cache) {
      if (val.capturedAt < oldestTime) {
        oldestTime = val.capturedAt;
        oldestKey = key;
      }
    }
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(cardId, entry);
}
function invalidateChart(cardId) {
  cache.delete(cardId);
}
const createCardSlice = (set, get) => ({
  updateCardVisualSummary: (cardId, visualSummary) => set((state) => ({ analysisCards: state.analysisCards.map((c) => c.id === cardId ? { ...c, visualSummary, visuallyGrounded: true } : c) })),
  handleChartTypeChange: (cardId, newType) => {
    invalidateChart(cardId);
    set((state) => ({ analysisCards: state.analysisCards.map((c) => c.id === cardId ? { ...c, displayChartType: newType } : c) }));
  },
  updateCardVisualEvaluation: (cardId, evaluation, correctedChartType) => set((state) => ({
    analysisCards: state.analysisCards.map((c) => {
      if (c.id !== cardId) return c;
      if (correctedChartType) {
        return {
          ...c,
          visualEvaluation: evaluation,
          visuallyEvaluated: true,
          displayChartType: correctedChartType,
          plan: { ...c.plan, chartType: correctedChartType },
          visuallyGrounded: false
          // reset so visual summary re-fires for corrected chart
        };
      }
      return { ...c, visualEvaluation: evaluation, visuallyEvaluated: true };
    })
  })),
  handleToggleDataVisibility: (cardId) => set((state) => ({ analysisCards: state.analysisCards.map((c) => c.id === cardId ? { ...c, isDataVisible: !c.isDataVisible } : c) })),
  handleTopNChange: (cardId, topN) => {
    invalidateChart(cardId);
    set((state) => ({ analysisCards: state.analysisCards.map((c) => c.id === cardId ? { ...c, topN } : c) }));
  },
  handleHideOthersChange: (cardId, hide) => {
    invalidateChart(cardId);
    set((state) => ({ analysisCards: state.analysisCards.map((c) => c.id === cardId ? { ...c, hideOthers: hide } : c) }));
  },
  handleHideZeroValueRowsChange: (cardId, hide) => {
    invalidateChart(cardId);
    set((state) => ({ analysisCards: state.analysisCards.map((c) => c.id === cardId ? { ...c, hideZeroValueRows: hide } : c) }));
  },
  handlePivotColumnTopNChange: (cardId, topN) => set((state) => ({ analysisCards: state.analysisCards.map((c) => c.id === cardId ? { ...c, pivotColumnTopN: topN } : c) })),
  handlePivotHideOtherColumnsChange: (cardId, hide) => set((state) => ({ analysisCards: state.analysisCards.map((c) => c.id === cardId ? { ...c, pivotHideOtherColumns: hide } : c) })),
  handleTogglePivotSeriesLabel: (cardId, label) => {
    set((state) => ({
      analysisCards: state.analysisCards.map((c) => {
        if (c.id === cardId) {
          const currentHidden = c.hiddenPivotSeriesLabels || [];
          const newHidden = currentHidden.includes(label) ? currentHidden.filter((l) => l !== label) : [...currentHidden, label];
          return { ...c, hiddenPivotSeriesLabels: newHidden };
        }
        return c;
      })
    }));
  },
  handleResetPivotSeriesLabels: (cardId) => set((state) => ({
    analysisCards: state.analysisCards.map((c) => c.id === cardId ? { ...c, hiddenPivotSeriesLabels: [] } : c)
  })),
  handleToggleLegendLabel: (cardId, label) => {
    set((state) => ({
      analysisCards: state.analysisCards.map((c) => {
        if (c.id === cardId) {
          const currentHidden = c.hiddenLabels || [];
          const newHidden = currentHidden.includes(label) ? currentHidden.filter((l) => l !== label) : [...currentHidden, label];
          return { ...c, hiddenLabels: newHidden };
        }
        return c;
      })
    }));
  },
  handleToggleDataLabels: (cardId) => {
    invalidateChart(cardId);
    set((state) => ({ analysisCards: state.analysisCards.map((c) => c.id === cardId ? { ...c, showDataLabels: !c.showDataLabels } : c) }));
  },
  handleTableSortChange: (cardId, sort) => set((state) => ({ analysisCards: state.analysisCards.map((c) => c.id === cardId ? { ...c, tableSort: sort } : c) })),
  handleShowCardFromChat: (cardId) => {
    navigateToCard(cardId);
  },
  deleteAnalysisCard: (cardId) => {
    var _a, _b, _c, _d;
    const card = get().analysisCards.find((item) => item.id === cardId);
    if (!card) return;
    invalidateChart(cardId);
    void __vitePreload(() => import("./csv_data_analysis_app-agent.js").then((n) => n.cT), true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url).then(
      (m) => m.removeCardMemoryDocument({ getState: get, setState: set }, cardId)
    );
    (_b = (_a = get()).addProgress) == null ? void 0 : _b.call(_a, `Removed card "${card.plan.title}".`);
    (_d = (_c = get()).logAgentToolUsage) == null ? void 0 : _d.call(_c, {
      tool: "card.delete",
      description: `Removed card "${card.plan.title}"`,
      detail: { cardId: card.id, title: card.plan.title }
    });
    set((state) => ({
      analysisCards: state.analysisCards.filter((item) => item.id !== cardId),
      cardEnhancementSuggestions: state.cardEnhancementSuggestions.filter((suggestion) => suggestion.cardId !== cardId),
      chatHistory: [
        ...state.chatHistory,
        createChatMessage({
          sender: "ai",
          text: `Deleted card **${card.plan.title}**.`,
          timestamp: /* @__PURE__ */ new Date(),
          type: "ai_message"
        })
      ]
    }));
  },
  addCalculatedColumnToCard: (cardId, newColumnName, formula, updateChart) => {
    let didUpdate = false;
    set((state) => {
      var _a, _b;
      const cardIndex = state.analysisCards.findIndex((c) => c.id === cardId);
      if (cardIndex === -1) {
        console.error(`addCalculatedColumnToCard: Card with ID "${cardId}" not found.`);
        return {};
      }
      const card = state.analysisCards[cardIndex];
      const { aggregatedData } = card;
      if (!aggregatedData || aggregatedData.length === 0) {
        console.error(`addCalculatedColumnToCard: Card with ID "${cardId}" has no data.`);
        return {};
      }
      try {
        const columnNames = Object.keys(aggregatedData[0]);
        const columnSet = new Set(columnNames);
        const tokens = formula.split(/([+\-*/\(\)\s])/).filter((t) => t.trim() !== "");
        const safeTokens = tokens.map((token) => {
          const cleanToken = token.replace(/^['"]|['"]$/g, "");
          if (columnSet.has(cleanToken)) {
            return `row['${cleanToken}']`;
          }
          return token;
        });
        const code = `return ${safeTokens.join("")}`;
        const calcFunction = new Function("row", code);
        const newData = aggregatedData.map((row) => {
          try {
            const value = calcFunction(row);
            const finalValue = typeof value === "number" && isFinite(value) ? value : null;
            return { ...row, [newColumnName]: finalValue };
          } catch (e) {
            console.error(`Error calculating column '${newColumnName}' for row:`, row, e);
            return { ...row, [newColumnName]: null };
          }
        });
        const numericCount = newData.filter((row) => typeof row[newColumnName] === "number" && isFinite(row[newColumnName])).length;
        if (numericCount === 0) {
          console.warn(`addCalculatedColumnToCard: Formula "${formula}" for "${newColumnName}" produced no numeric values.`);
          (_b = (_a = get()).addProgress) == null ? void 0 : _b.call(_a, `Skipped "${newColumnName}" because the formula produced no numeric values.`, "error");
          return {};
        }
        const newCards = [...state.analysisCards];
        const newCard = { ...card, aggregatedData: newData };
        if (updateChart) {
          const newPlan = { ...newCard.plan };
          if (updateChart.useAs === "primaryY") {
            newPlan.valueColumn = newColumnName;
          } else if (updateChart.useAs === "secondaryY") {
            newPlan.secondaryValueColumn = newColumnName;
            if (updateChart.newChartType === "combo" && !newPlan.secondaryAggregation) {
              newPlan.secondaryAggregation = "sum";
            }
          }
          if (updateChart.newChartType) {
            newCard.displayChartType = updateChart.newChartType;
          }
          newCard.plan = newPlan;
        } else {
          const newPlan = { ...newCard.plan, valueColumn: newColumnName };
          if (newPlan.chartType === "scatter") {
            newPlan.chartType = "bar";
            newCard.displayChartType = "bar";
          }
          newCard.plan = newPlan;
        }
        newCards[cardIndex] = newCard;
        didUpdate = true;
        return { analysisCards: newCards };
      } catch (e) {
        console.error(`Failed to create calculation function for formula: "${formula}"`, e);
        return {};
      }
    });
    if (didUpdate) {
      void __vitePreload(() => import("./csv_data_analysis_app-agent.js").then((n) => n.cT), true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url).then(
        (m) => m.upsertCardMemoryDocument({ getState: get, setState: set }, cardId)
      );
    }
  }
});
const createDataSlice = (set, get) => {
  const storeApi = { getState: get, setState: set };
  let inFlightSemanticSnapshot = null;
  let inFlightSemanticDatasetVersion = null;
  let inFlightDuckDbSessionRefresh = null;
  let inFlightDuckDbSessionDatasetVersion = null;
  let inFlightExternalPayloadId = null;
  const recentlyProcessedExternalPayloads = /* @__PURE__ */ new Map();
  let duckDbRefreshHelpersPromise = null;
  const describeTransport = (transport) => {
    switch (transport) {
      case "postMessage":
        return "postMessage";
      case "localStorage":
        return "localStorage";
      case "sessionStorage":
        return "sessionStorage";
      default:
        return "external";
    }
  };
  const buildSyntheticFileName = (event) => {
    const headerBase = (event.payload.header || "ai-chart-report").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "ai-chart-report";
    const timestamp = new Date(event.meta.receivedAt).toISOString().replace(/[:]/g, "-");
    return `${headerBase}-${describeTransport(event.meta.transport)}-${timestamp}.csv`;
  };
  const markExternalPayloadProcessed = (payloadId) => {
    const now = Date.now();
    recentlyProcessedExternalPayloads.set(payloadId, now);
    for (const [candidateId, processedAt] of recentlyProcessedExternalPayloads.entries()) {
      if (now - processedAt > 6e4) {
        recentlyProcessedExternalPayloads.delete(candidateId);
      }
    }
  };
  const cloneCsvData = (data) => ({
    ...data,
    data: data.data.map((row) => ({ ...row })),
    metadataRows: [...data.metadataRows ?? []].map((row) => [...row]),
    headerLayers: [...data.headerLayers ?? []].map((row) => [...row]),
    summaryRows: [...data.summaryRows ?? []].map((row) => ({ ...row }))
  });
  const buildRegistryForDataset = (dataset, profilesOverride, semanticSnapshotOverride) => buildEffectiveColumnRegistryFromState(get(), {
    datasetOverride: dataset,
    columnProfilesOverride: profilesOverride,
    semanticSnapshotOverride
  });
  const persistCurrentSessionSnapshot = async (reason) => {
    const state = get();
    if (!state.sessionId || !state.csvData || state.csvData.data.length === 0) {
      return;
    }
    try {
      const [
        { buildPersistedReportRecord: buildPersistedReportRecord2 },
        { CURRENT_SESSION_KEY: CURRENT_SESSION_KEY2, saveReport: saveReport2 }
      ] = await Promise.all([
        __vitePreload(() => Promise.resolve().then(() => persistedAppState), true ? void 0 : void 0, import.meta.url),
        __vitePreload(() => import("./csv_data_analysis_app-agent.js").then((n) => n.cM), true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url)
      ]);
      const currentReport = buildPersistedReportRecord2(state, {
        id: state.sessionId,
        filename: state.csvData.fileName || "Current Session"
      });
      await saveReport2(currentReport);
      await saveReport2({
        ...currentReport,
        id: CURRENT_SESSION_KEY2
      });
    } catch (error) {
      console.warn(`[DataSlice] Failed to persist the current session snapshot after ${reason}.`, error);
    }
  };
  const proposeGoalsAfterAnalysisSummaries = async (analysisDataset, analysisOutcome) => {
    if (analysisOutcome == null ? void 0 : analysisOutcome.summaryPromise) {
      await analysisOutcome.summaryPromise;
    }
    await get().proposeAnalysisGoals(analysisDataset);
  };
  const getDuckDbRefreshHelpers = async () => {
    duckDbRefreshHelpersPromise ?? (duckDbRefreshHelpersPromise = Promise.all([
      __vitePreload(() => import("./csv_data_analysis_app-agent.js").then((n) => n.cU), true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url),
      __vitePreload(() => import("./csv_data_analysis_app-agent.js").then((n) => n.cV), true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url)
    ]).then(([
      { getPreferredAnalysisDataset },
      { resolveDatasetBindingTarget, isDuckDbSessionCurrentForDataset }
    ]) => ({
      getPreferredAnalysisDataset,
      resolveDatasetBindingTarget,
      isDuckDbSessionCurrentForDataset
    })));
    return duckDbRefreshHelpersPromise;
  };
  const refreshDuckDbSession = async (datasetOverride) => {
    const t0 = performance.now();
    const {
      getPreferredAnalysisDataset,
      resolveDatasetBindingTarget,
      isDuckDbSessionCurrentForDataset
    } = await getDuckDbRefreshHelpers();
    console.log(`[Perf:RefreshDuckDb] dynamic imports: ${Math.round(performance.now() - t0)}ms`);
    const t1 = performance.now();
    const preferredDataset = datasetOverride ?? getPreferredAnalysisDataset(get());
    const currentSnapshot = get().datasetSemanticSnapshot;
    const currentSemanticDatasetVersion = get().semanticDatasetVersion;
    const bindingTarget = resolveDatasetBindingTarget({
      mode: "workspace",
      csvData: preferredDataset,
      snapshot: currentSnapshot,
      semanticDatasetVersion: currentSemanticDatasetVersion
    });
    console.log(`[Perf:RefreshDuckDb] resolveBindingTarget: ${Math.round(performance.now() - t1)}ms`);
    if (!bindingTarget) {
      const idleStatus = createIdleDuckDbSessionStatus();
      set({ duckDbSessionStatus: idleStatus });
      return idleStatus;
    }
    const currentStatus = get().duckDbSessionStatus;
    if (currentStatus.status === "ready" && isDuckDbSessionCurrentForDataset(currentStatus, bindingTarget.dataset)) {
      return currentStatus;
    }
    if (inFlightDuckDbSessionRefresh && inFlightDuckDbSessionDatasetVersion === bindingTarget.datasetVersion) {
      console.log(`[Perf:RefreshDuckDb] reusing in-flight refresh for ${bindingTarget.datasetVersion}`);
      return inFlightDuckDbSessionRefresh;
    }
    const refreshPromise = (async () => {
      const reportDiagnostics = createWorkerDiagnosticsTelemetryReporter(storeApi);
      const bindingStatus = createBindingDuckDbSessionStatus(get().duckDbSessionStatus);
      if (!isDuckDbSessionStatusEqual(get().duckDbSessionStatus, bindingStatus)) {
        set({ duckDbSessionStatus: bindingStatus });
      }
      const t2 = performance.now();
      const registry = buildRegistryForDataset(bindingTarget.dataset);
      console.log(`[Perf:RefreshDuckDb] buildRegistryForDataset: ${Math.round(performance.now() - t2)}ms (${bindingTarget.dataset.data.length} rows)`);
      const t3 = performance.now();
      const binding = await primeDuckDbDataset(
        bindingTarget.dataset,
        void 0,
        reportDiagnostics,
        void 0,
        registry
      );
      console.log(`[Perf:RefreshDuckDb] primeDuckDbDataset (await): ${Math.round(performance.now() - t3)}ms`);
      const t4 = performance.now();
      const nextStatus = binding ? createDuckDbSessionStatusFromBinding(binding) : createIdleDuckDbSessionStatus();
      if (!isDuckDbSessionStatusEqual(get().duckDbSessionStatus, nextStatus)) {
        set({ duckDbSessionStatus: nextStatus });
      }
      console.log(`[Perf:RefreshDuckDb] set(duckDbSessionStatus): ${Math.round(performance.now() - t4)}ms`);
      console.log(`[Perf:RefreshDuckDb] total: ${Math.round(performance.now() - t0)}ms`);
      if ((binding == null ? void 0 : binding.engine) === "duckdb") {
        get().logAgentToolUsage({
          tool: "duckdb_query_engine",
          description: "DuckDB analyst workspace session is ready.",
          detail: {
            tableName: binding.tableName,
            loadVersion: binding.loadVersion,
            semanticDatasetApplied: bindingTarget.semanticDatasetApplied
          }
        });
      } else if ((binding == null ? void 0 : binding.fallbackStage) === "bind_failed" || (binding == null ? void 0 : binding.fallbackStage) === "query_failed") {
        get().logAgentToolUsage({
          tool: "duckdb_query_engine",
          description: "DuckDB analyst workspace session is degraded.",
          detail: {
            tableName: binding.tableName,
            loadVersion: binding.loadVersion,
            fallbackStage: binding.fallbackStage,
            error: binding.fallbackReason,
            semanticDatasetApplied: bindingTarget.semanticDatasetApplied
          }
        });
      }
      return nextStatus;
    })();
    inFlightDuckDbSessionRefresh = refreshPromise;
    inFlightDuckDbSessionDatasetVersion = bindingTarget.datasetVersion;
    try {
      return await refreshPromise;
    } finally {
      if (inFlightDuckDbSessionRefresh === refreshPromise) {
        inFlightDuckDbSessionRefresh = null;
        inFlightDuckDbSessionDatasetVersion = null;
      }
    }
  };
  const rebuildStructureArtifacts = async (humanBoundary) => {
    var _a;
    const [
      { resolveReportStructureArtifactsWithProposal },
      { getPreferredAnalysisDataset },
      { buildSemanticDatasetVersion }
    ] = await Promise.all([
      __vitePreload(() => import("./csv_data_analysis_app-agent.js").then((n) => n.cW), true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url),
      __vitePreload(() => import("./csv_data_analysis_app-agent.js").then((n) => n.cU), true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url),
      __vitePreload(() => import("./csv_data_analysis_app-agent.js").then((n) => n.cN), true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url)
    ]);
    const state = get();
    const artifacts = await resolveReportStructureArtifactsWithProposal({
      rawCsvData: state.rawCsvData,
      csvData: state.csvData,
      rawIntakeIr: state.rawIntakeIr,
      cleaningRun: state.cleaningRun,
      dataPreparationPlan: state.dataPreparationPlan,
      columnProfiles: state.columnProfiles,
      humanBoundary: humanBoundary ?? (((_a = state.reportStructureResolution) == null ? void 0 : _a.source) === "human_confirmed" ? state.reportStructureResolution.humanBoundary : null),
      settings: state.settings,
      telemetryTarget: {
        sessionId: state.sessionId,
        currentDatasetId: state.currentDatasetId
      }
    });
    const prevPreferred = getPreferredAnalysisDataset(get());
    const nextPreferred = artifacts.canonicalCsvData ?? get().csvData;
    const prevVersion = prevPreferred ? buildSemanticDatasetVersion(prevPreferred) : null;
    const nextVersion = nextPreferred ? buildSemanticDatasetVersion(nextPreferred) : null;
    const datasetVersionChanged = prevVersion !== nextVersion;
    set((prev) => ({
      reportStructureResolution: artifacts.reportStructureResolution,
      canonicalCsvData: artifacts.canonicalCsvData,
      canonicalBuildMeta: artifacts.canonicalBuildMeta,
      canonicalizationStatus: artifacts.canonicalizationStatus,
      pipelineOutcome: artifacts.pipelineOutcome,
      ...datasetVersionChanged ? {
        datasetSemanticSnapshot: null,
        semanticStatus: "idle",
        semanticDatasetVersion: null,
        columnRegistry: buildRegistryForDataset(nextPreferred, get().columnProfiles, null)
      } : {},
      activeDataQuery: null,
      duckDbSessionStatus: createBindingDuckDbSessionStatus(prev.duckDbSessionStatus)
    }));
  };
  const runFilePipeline = async (file) => {
    const { orchestrateFileUpload } = await __vitePreload(async () => {
      const { orchestrateFileUpload: orchestrateFileUpload2 } = await import("./csv_data_analysis_app-agent.js").then((n) => n.c_);
      return { orchestrateFileUpload: orchestrateFileUpload2 };
    }, true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url);
    try {
      for await (const update of orchestrateFileUpload(file, storeApi)) {
        switch (update.type) {
          case "progress":
            get().addProgress(update.message, update.messageType, update.model);
            break;
          case "state":
            set((state) => ({ ...state, ...update.payload }));
            break;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[FileProcessor] File processing failed:`, error);
      get().addProgress(`File Processing Error: ${errorMessage}`, "error");
      set({ isBusy: false, chatLifecycleState: "idle", currentView: "file_upload" });
    }
  };
  return {
    addProgress: (message, type = "system", model) => {
      const newMessage = createProgressMessage({ text: message, type, timestamp: /* @__PURE__ */ new Date(), model });
      set((state) => ({ progressMessages: trimProgressMessages([...state.progressMessages, newMessage]) }));
    },
    handleInitialAnalysis: async (dataForAnalysis, goal, options) => {
      const { handleInitialAnalysis } = await __vitePreload(async () => {
        const { handleInitialAnalysis: handleInitialAnalysis2 } = await import("./csv_data_analysis_app-agent.js").then((n) => n.d2);
        return { handleInitialAnalysis: handleInitialAnalysis2 };
      }, true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url);
      return handleInitialAnalysis(dataForAnalysis, goal, storeApi, options);
    },
    proposeAnalysisGoals: async (dataForAnalysis) => {
      const { proposeAnalysisGoals: proposeGoals } = await __vitePreload(async () => {
        const { proposeAnalysisGoals: proposeGoals2 } = await import("./csv_data_analysis_app-agent-planning.js").then((n) => n.h);
        return { proposeAnalysisGoals: proposeGoals2 };
      }, true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url);
      return proposeGoals(dataForAnalysis, storeApi);
    },
    handleFileUpload: runFilePipeline,
    ingestExternalCsvPayload: async (event) => {
      if (!event || !event.payload || typeof event.payload.csv !== "string") {
        get().addProgress("Received malformed CSV payload from legacy report page.", "error");
        return;
      }
      if (event.payloadId === inFlightExternalPayloadId || recentlyProcessedExternalPayloads.has(event.payloadId)) {
        console.debug("[ExternalCsvBridge] Skipped duplicate payload at store ingestion.", {
          payloadId: event.payloadId,
          transport: event.meta.transport
        });
        return;
      }
      const csvText = event.payload.csv;
      if (!csvText.trim()) {
        get().addProgress("External CSV payload was empty.", "error");
        return;
      }
      const fileName = buildSyntheticFileName(event);
      get().addProgress(`Loading dataset shared via ${describeTransport(event.meta.transport)} bridge...`);
      const file = new File([csvText], fileName, { type: "text/csv;charset=utf-8" });
      inFlightExternalPayloadId = event.payloadId;
      try {
        await runFilePipeline(file);
        markExternalPayloadProcessed(event.payloadId);
      } finally {
        if (inFlightExternalPayloadId === event.payloadId) {
          inFlightExternalPayloadId = null;
        }
      }
    },
    regenerateAnalyses: async (newData) => {
      const { regenerateAnalysesWithNewData } = await __vitePreload(async () => {
        const { regenerateAnalysesWithNewData: regenerateAnalysesWithNewData2 } = await import("./csv_data_analysis_app-agent.js").then((n) => n.d3);
        return { regenerateAnalysesWithNewData: regenerateAnalysesWithNewData2 };
      }, true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url);
      await regenerateAnalysesWithNewData(newData, storeApi);
    },
    reproposeAnalysisGoals: async () => {
      const { reproposeAnalysisGoals: reproposeGoalsService } = await __vitePreload(async () => {
        const { reproposeAnalysisGoals: reproposeGoalsService2 } = await import("./csv_data_analysis_app-agent.js").then((n) => n.d3);
        return { reproposeAnalysisGoals: reproposeGoalsService2 };
      }, true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url);
      reproposeGoalsService(storeApi);
    },
    ensureDatasetSemanticSnapshot: async (dataset, options) => {
      const [
        { getPreferredAnalysisDataset },
        { buildSemanticDatasetVersion, isSemanticSnapshotCurrent, getSemanticHiddenRowCount },
        { resolveAnalysisDatasetProfiles },
        { annotateDatasetSemantics }
      ] = await Promise.all([
        __vitePreload(() => import("./csv_data_analysis_app-agent.js").then((n) => n.cU), true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url),
        __vitePreload(() => import("./csv_data_analysis_app-agent.js").then((n) => n.cN), true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url),
        __vitePreload(() => import("./csv_data_analysis_app-agent.js").then((n) => n.cZ), true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url),
        __vitePreload(() => import("./csv_data_analysis_app-ai.js").then((n) => n.a9), true ? __vite__mapDeps([0,1,2,3,4]) : void 0, import.meta.url)
      ]);
      const targetDataset = dataset ?? getPreferredAnalysisDataset(get());
      if (!targetDataset) {
        inFlightSemanticSnapshot = null;
        inFlightSemanticDatasetVersion = null;
        set({ datasetSemanticSnapshot: null, semanticStatus: "idle", semanticDatasetVersion: null, columnRegistry: null });
        return null;
      }
      const datasetVersion = buildSemanticDatasetVersion(targetDataset);
      const existingSnapshot = get().datasetSemanticSnapshot;
      if (!(options == null ? void 0 : options.force) && isSemanticSnapshotCurrent(existingSnapshot, datasetVersion)) {
        if (get().semanticStatus !== "ready") set({ semanticStatus: "ready" });
        return existingSnapshot ?? null;
      }
      if (!(options == null ? void 0 : options.force) && inFlightSemanticSnapshot && inFlightSemanticDatasetVersion === datasetVersion) {
        return inFlightSemanticSnapshot;
      }
      const effectiveColumns = resolveAnalysisDatasetProfiles(targetDataset, get().columnProfiles);
      if (effectiveColumns !== get().columnProfiles) {
        set({
          columnProfiles: effectiveColumns,
          columnRegistry: buildRegistryForDataset(targetDataset, effectiveColumns, get().datasetSemanticSnapshot)
        });
      }
      set({ semanticStatus: "running", semanticDatasetVersion: datasetVersion });
      const semanticPromise = (async () => {
        const SEMANTIC_ANNOTATION_TIMEOUT_MS = 15e3;
        const semanticStart = performance.now();
        let snapshot;
        try {
          const state = get();
          const annotationPromise = annotateDatasetSemantics({
            data: targetDataset,
            rawData: state.rawCsvData ?? state.csvData ?? targetDataset,
            columns: effectiveColumns,
            settings: state.settings,
            reportContextResolution: state.reportContextResolution,
            telemetryTarget: { sessionId: state.sessionId, currentDatasetId: state.currentDatasetId }
          });
          const timeoutPromise = new Promise(
            (resolve) => setTimeout(() => resolve(null), SEMANTIC_ANNOTATION_TIMEOUT_MS)
          );
          snapshot = await Promise.race([annotationPromise, timeoutPromise]);
        } catch (error) {
          console.warn(`[Perf:Semantic] Annotation failed after ${Math.round(performance.now() - semanticStart)}ms`, error);
          set((s) => s.semanticDatasetVersion === datasetVersion ? {
            datasetSemanticSnapshot: null,
            semanticStatus: "fallback",
            semanticDatasetVersion: datasetVersion,
            columnRegistry: buildRegistryForDataset(targetDataset, effectiveColumns, null)
          } : {});
          return null;
        }
        if (!snapshot) {
          console.warn(`[Perf:Semantic] Annotation timed out after ${Math.round(performance.now() - semanticStart)}ms`);
          set((s) => s.semanticDatasetVersion === datasetVersion ? {
            datasetSemanticSnapshot: null,
            semanticStatus: "fallback",
            semanticDatasetVersion: datasetVersion,
            columnRegistry: buildRegistryForDataset(targetDataset, effectiveColumns, null)
          } : {});
          return null;
        }
        console.log(`[Perf:Semantic] Annotation completed: ${Math.round(performance.now() - semanticStart)}ms, ${targetDataset.data.length} rows`);
        const tSemanticSet = performance.now();
        const semanticRegistry = buildRegistryForDataset(targetDataset, effectiveColumns, snapshot);
        console.log(`[Perf:Semantic] buildRegistryForDataset (post-annotation): ${Math.round(performance.now() - tSemanticSet)}ms`);
        const tSemanticStateUpdate = performance.now();
        set((s) => s.semanticDatasetVersion === datasetVersion ? {
          datasetSemanticSnapshot: snapshot,
          semanticStatus: "ready",
          semanticDatasetVersion: datasetVersion,
          columnRegistry: semanticRegistry
        } : {});
        console.log(`[Perf:Semantic] set(snapshot+registry): ${Math.round(performance.now() - tSemanticStateUpdate)}ms`);
        const hiddenRowCount = getSemanticHiddenRowCount(snapshot, datasetVersion, targetDataset);
        if (hiddenRowCount > 0 && get().semanticDatasetVersion === datasetVersion) {
          get().addProgress(`AI semantic view prepared. ${hiddenRowCount} non-detail row(s) will be hidden by default.`, "system", snapshot.modelId);
        }
        return snapshot;
      })();
      inFlightSemanticSnapshot = semanticPromise;
      inFlightSemanticDatasetVersion = datasetVersion;
      try {
        return await semanticPromise;
      } finally {
        if (inFlightSemanticSnapshot === semanticPromise) {
          inFlightSemanticSnapshot = null;
          inFlightSemanticDatasetVersion = null;
        }
      }
    },
    refreshDuckDbSession,
    promoteToCanonicalDataset: ({ reason, reshapeProvenance }) => {
      var _a;
      const currentData = get().csvData;
      if (!currentData) return;
      const columns = ((_a = buildRegistryForDataset(currentData)) == null ? void 0 : _a.columns.map((entry) => entry.physicalName)) ?? [];
      set({
        canonicalCsvData: currentData,
        canonicalBuildMeta: {
          shape: "long_fact_table",
          source: "analysis_reshape",
          rowCount: currentData.data.length,
          columnCount: columns.length,
          lineageColumns: columns,
          summary: reason,
          excludedRowCounts: {},
          carryForwardAppliedCounts: {},
          footerTotalsMatched: null,
          reshapeProvenance
        },
        canonicalizationStatus: "ready",
        // DATA-603: reset semantic snapshot so it rebuilds against the long table
        datasetSemanticSnapshot: null,
        semanticStatus: "idle",
        semanticDatasetVersion: null,
        columnRegistry: buildRegistryForDataset(currentData, get().columnProfiles, null)
      });
    },
    runWorkspaceDataQuery: async (payload) => {
      const [
        { getPreferredAnalysisDataset },
        { resolveDatasetBindingTarget, isDuckDbSessionCurrentForDataset },
        { compileWorkspaceDataQuery },
        { executeStructuredDataQuery }
      ] = await Promise.all([
        __vitePreload(() => import("./csv_data_analysis_app-agent.js").then((n) => n.cU), true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url),
        __vitePreload(() => import("./csv_data_analysis_app-agent.js").then((n) => n.cV), true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url),
        __vitePreload(() => import("./csv_data_analysis_app-agent.js").then((n) => n.d4), true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url),
        __vitePreload(() => import("./csv_data_analysis_app-agent.js").then((n) => n.c$), true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url)
      ]);
      const state = get();
      const preferredDataset = getPreferredAnalysisDataset(state);
      const bindingTarget = resolveDatasetBindingTarget({
        mode: "workspace",
        csvData: preferredDataset,
        snapshot: state.datasetSemanticSnapshot,
        semanticDatasetVersion: state.semanticDatasetVersion
      });
      if (!bindingTarget) throw new Error("Load a dataset before running an analyst workspace query.");
      let sessionStatus = state.duckDbSessionStatus;
      if (!isDuckDbSessionCurrentForDataset(sessionStatus, bindingTarget.dataset) || sessionStatus.status !== "ready") {
        sessionStatus = await refreshDuckDbSession();
      }
      if (sessionStatus.status !== "ready" || !isDuckDbSessionCurrentForDataset(sessionStatus, bindingTarget.dataset)) {
        throw new Error("DuckDB session is not ready. Rebind the session and retry.");
      }
      const columnRegistry = buildRegistryForDataset(bindingTarget.dataset);
      const compiled = compileWorkspaceDataQuery(
        payload,
        {
          selectableColumns: getAllowedColumns(columnRegistry, "select").length > 0 ? getAllowedColumns(columnRegistry, "select") : state.columnProfiles.map((p) => p.name),
          groupableColumns: getAllowedColumns(columnRegistry, "groupBy")
        }
      );
      return executeStructuredDataQuery(storeApi, {
        datasetOverride: bindingTarget.dataset,
        explanation: compiled.explanation,
        plan: compiled.plan,
        phase: "analysis",
        origin: "workspace",
        columnRegistryOverride: columnRegistry,
        templateId: compiled.templateId,
        formSnapshot: compiled.formSnapshot,
        policyReason: "Database analyst workspace",
        toolCategory: "data",
        appendChatTrace: false,
        appendCleaningRunTrace: false,
        scrollToRawDataExplorer: false,
        allowNativeFallback: false,
        progressMessage: `Running analyst workspace query: ${compiled.explanation}`
      });
    },
    resumeCleaningRun: async () => {
      var _a, _b, _c, _d, _e, _f;
      const [
        { updateAgentTaskStatus },
        { orchestrateAutonomousAiCleaning },
        { getPreferredAnalysisDataset },
        { DEFAULT_AUTO_ANALYSIS_GOAL }
      ] = await Promise.all([
        __vitePreload(() => import("./csv_data_analysis_app-agent.js").then((n) => n.cR), true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url),
        __vitePreload(() => import("./csv_data_analysis_app-agent.js").then((n) => n.cX), true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url),
        __vitePreload(() => import("./csv_data_analysis_app-agent.js").then((n) => n.cU), true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url),
        __vitePreload(() => import("./csv_data_analysis_app-agent.js").then((n) => n.cY), true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url)
      ]);
      updateAgentTaskStatus(storeApi, {
        status: "thinking",
        title: "Resuming cleaning",
        titleKey: "ai_task_cleaning_title",
        subtitle: "Continuing cleaning run...",
        totalSteps: 4,
        currentStep: 1
      });
      try {
        await orchestrateAutonomousAiCleaning(storeApi, { resume: true });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Cleaning failed unexpectedly.";
        updateAgentTaskStatus(storeApi, {
          status: "error",
          title: "Cleaning failed",
          titleKey: "ai_task_cleaning_failed",
          subtitle: errorMessage,
          totalSteps: 4,
          currentStep: 1,
          error: errorMessage
        });
        return;
      }
      if (((_a = get().cleaningRun) == null ? void 0 : _a.status) !== "completed") {
        const errorMessage = ((_b = get().cleaningRun) == null ? void 0 : _b.userFacingMessage) ?? ((_c = get().cleaningRun) == null ? void 0 : _c.lastError) ?? "Cleaning did not complete.";
        const technicalDetail = ((_d = get().cleaningRun) == null ? void 0 : _d.technicalDetail) ?? ((_e = get().cleaningRun) == null ? void 0 : _e.lastError) ?? errorMessage;
        updateAgentTaskStatus(storeApi, {
          status: "error",
          title: "Cleaning failed",
          titleKey: "ai_task_cleaning_failed",
          subtitle: errorMessage,
          totalSteps: 4,
          currentStep: 1,
          error: technicalDetail
        });
      }
      if (((_f = get().cleaningRun) == null ? void 0 : _f.status) === "completed" && get().csvData) {
        const transitionStart = performance.now();
        await rebuildStructureArtifacts();
        const analysisDataset = getPreferredAnalysisDataset(get());
        duckDbWorkerClient.initDuckDb(DUCKDB_INIT_TIMEOUT_MS).catch(() => {
        });
        await get().ensureDatasetSemanticSnapshot(analysisDataset);
        await refreshDuckDbSession();
        console.log(`[Perf:PostClean] resume cleaning→analysis-ready: ${Math.round(performance.now() - transitionStart)}ms`);
        if (analysisDataset) {
          const pipelineOutcome = get().pipelineOutcome;
          if ((pipelineOutcome == null ? void 0 : pipelineOutcome.status) === "ready" || (pipelineOutcome == null ? void 0 : pipelineOutcome.status) === "degraded_but_usable") {
            const goal = get().confirmedAnalysisGoal ?? DEFAULT_AUTO_ANALYSIS_GOAL;
            const analysisOutcome = await get().handleInitialAnalysis(analysisDataset, goal, { trigger: "automatic" });
            if (analysisOutcome.status !== "paused" && analysisOutcome.status !== "error") {
              await proposeGoalsAfterAnalysisSummaries(analysisDataset, analysisOutcome);
            }
          } else {
            await proposeGoalsAfterAnalysisSummaries(analysisDataset);
          }
        }
      }
    },
    revertToOriginal: async () => {
      const [
        { createCleaningRun },
        { WORKSPACE_DATASET_CLEAN_CSV, WORKSPACE_DATASET_RAW_CSV, buildWorkspaceCsv }
      ] = await Promise.all([
        __vitePreload(() => import("./csv_data_analysis_app-agent.js").then((n) => n.cS), true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url),
        __vitePreload(() => import("./csv_data_analysis_app-agent.js").then((n) => n.cL), true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url)
      ]);
      const sessionId = get().sessionId;
      let originalData = sessionId ? await getOriginalData(sessionId) : null;
      if (!originalData) originalData = get().rawCsvData;
      if (!originalData) {
        get().addProgress(getTranslation("data_restore_unavailable", get().settings.language), "error");
        return;
      }
      const restoredData = cloneCsvData(originalData);
      const profileResult = await profileDataWithWorker(restoredData.data);
      const restoredRegistry = buildRegistryForDataset(restoredData, profileResult.profiles, null);
      set((prev) => ({
        csvData: restoredData,
        canonicalCsvData: null,
        canonicalBuildMeta: null,
        canonicalizationStatus: "idle",
        pipelineOutcome: null,
        reportStructureResolution: null,
        columnProfiles: profileResult.profiles,
        columnRegistry: restoredRegistry,
        datasetSemanticSnapshot: null,
        semanticStatus: "idle",
        semanticDatasetVersion: null,
        activeDataQuery: null,
        activeMetricMappingValidation: null,
        activeSpreadsheetFilter: null,
        spreadsheetFilterFunction: null,
        aiFilterExplanation: null,
        queryHistory: [],
        analysisCards: [],
        activeAnalysisSession: null,
        latestAnalysisSession: null,
        visibleAnalysisTrace: [],
        finalSummary: null,
        aiCoreAnalysisSummary: null,
        duckDbSessionStatus: createBindingDuckDbSessionStatus(get().duckDbSessionStatus),
        reportGenerationProgress: null,
        isGeneratingReport: false,
        workspaceFiles: {
          ...prev.workspaceFiles ?? {},
          [WORKSPACE_DATASET_RAW_CSV]: buildWorkspaceCsv(restoredData),
          [WORKSPACE_DATASET_CLEAN_CSV]: buildWorkspaceCsv(restoredData)
        },
        dataPreparationPlan: {
          explanation: getTranslation("data_restore_explanation", get().settings.language),
          operations: [],
          outputColumns: profileResult.profiles,
          planStatus: "schema_only",
          consistencyIssues: []
        },
        cleaningRun: createCleaningRun()
      }));
      get().addProgress(getTranslation("data_restore_success", get().settings.language));
      await refreshDuckDbSession();
    },
    restartCleaningRun: async () => {
      var _a, _b, _c, _d, _e, _f;
      const [
        { createCleaningRun },
        { WORKSPACE_DATASET_CLEAN_CSV, WORKSPACE_DATASET_RAW_CSV, buildWorkspaceCsv },
        { updateAgentTaskStatus },
        { orchestrateAutonomousAiCleaning },
        { getPreferredAnalysisDataset },
        { DEFAULT_AUTO_ANALYSIS_GOAL }
      ] = await Promise.all([
        __vitePreload(() => import("./csv_data_analysis_app-agent.js").then((n) => n.cS), true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url),
        __vitePreload(() => import("./csv_data_analysis_app-agent.js").then((n) => n.cL), true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url),
        __vitePreload(() => import("./csv_data_analysis_app-agent.js").then((n) => n.cR), true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url),
        __vitePreload(() => import("./csv_data_analysis_app-agent.js").then((n) => n.cX), true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url),
        __vitePreload(() => import("./csv_data_analysis_app-agent.js").then((n) => n.cU), true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url),
        __vitePreload(() => import("./csv_data_analysis_app-agent.js").then((n) => n.cY), true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url)
      ]);
      const rawCsvData = get().rawCsvData;
      if (!rawCsvData) {
        get().addProgress("Cannot restart cleaning because the original dataset is unavailable.", "error");
        return;
      }
      const currentState = get();
      const preferredDataset = getPreferredAnalysisDataset(currentState) ?? rawCsvData;
      const preferredWasCanonical = Boolean(currentState.canonicalCsvData && preferredDataset === currentState.canonicalCsvData);
      const resetCsvData = cloneCsvData(preferredDataset);
      const profileResult = await profileDataWithWorker(resetCsvData.data);
      const resetRegistry = buildRegistryForDataset(resetCsvData, profileResult.profiles, null);
      set((prev) => ({
        csvData: resetCsvData,
        canonicalCsvData: preferredWasCanonical ? resetCsvData : null,
        canonicalBuildMeta: preferredWasCanonical ? prev.canonicalBuildMeta : null,
        canonicalizationStatus: preferredWasCanonical ? prev.canonicalizationStatus : "idle",
        pipelineOutcome: null,
        reportStructureResolution: prev.reportStructureResolution,
        columnProfiles: profileResult.profiles,
        columnRegistry: resetRegistry,
        datasetSemanticSnapshot: null,
        semanticStatus: "idle",
        semanticDatasetVersion: null,
        activeDataQuery: null,
        activeMetricMappingValidation: null,
        activeSpreadsheetFilter: null,
        spreadsheetFilterFunction: null,
        aiFilterExplanation: null,
        queryHistory: [],
        analysisCards: [],
        activeAnalysisSession: null,
        latestAnalysisSession: null,
        visibleAnalysisTrace: [],
        finalSummary: null,
        aiCoreAnalysisSummary: null,
        duckDbSessionStatus: createBindingDuckDbSessionStatus(get().duckDbSessionStatus),
        reportGenerationProgress: null,
        isGeneratingReport: false,
        workspaceFiles: {
          ...prev.workspaceFiles ?? {},
          [WORKSPACE_DATASET_RAW_CSV]: buildWorkspaceCsv(rawCsvData),
          [WORKSPACE_DATASET_CLEAN_CSV]: buildWorkspaceCsv(resetCsvData)
        },
        dataPreparationPlan: {
          explanation: "AI-first cleaning session restarted. cleaned.csv has been reset to a fresh writable copy of the current prepared dataset snapshot.",
          operations: [],
          outputColumns: profileResult.profiles,
          planStatus: "schema_only",
          consistencyIssues: []
        },
        cleaningRun: createCleaningRun()
      }));
      get().addProgress("Cleaning workflow reset to the current prepared dataset snapshot.");
      await persistCurrentSessionSnapshot("restart cleaning");
      await refreshDuckDbSession();
      updateAgentTaskStatus(storeApi, {
        status: "thinking",
        title: "Restarting cleaning",
        titleKey: "ai_task_cleaning_title",
        subtitle: "Restarting cleaning run from the current prepared dataset...",
        totalSteps: 4,
        currentStep: 1
      });
      try {
        await orchestrateAutonomousAiCleaning(storeApi);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Cleaning failed unexpectedly.";
        updateAgentTaskStatus(storeApi, {
          status: "error",
          title: "Cleaning failed",
          titleKey: "ai_task_cleaning_failed",
          subtitle: errorMessage,
          totalSteps: 4,
          currentStep: 1,
          error: errorMessage
        });
        return;
      }
      if (((_a = get().cleaningRun) == null ? void 0 : _a.status) !== "completed") {
        const errorMessage = ((_b = get().cleaningRun) == null ? void 0 : _b.userFacingMessage) ?? ((_c = get().cleaningRun) == null ? void 0 : _c.lastError) ?? "Cleaning did not complete.";
        const technicalDetail = ((_d = get().cleaningRun) == null ? void 0 : _d.technicalDetail) ?? ((_e = get().cleaningRun) == null ? void 0 : _e.lastError) ?? errorMessage;
        updateAgentTaskStatus(storeApi, {
          status: "error",
          title: "Cleaning failed",
          titleKey: "ai_task_cleaning_failed",
          subtitle: errorMessage,
          totalSteps: 4,
          currentStep: 1,
          error: technicalDetail
        });
      }
      if (((_f = get().cleaningRun) == null ? void 0 : _f.status) === "completed" && get().csvData) {
        const transitionStart = performance.now();
        await rebuildStructureArtifacts();
        const analysisDataset = getPreferredAnalysisDataset(get());
        duckDbWorkerClient.initDuckDb(DUCKDB_INIT_TIMEOUT_MS).catch(() => {
        });
        await get().ensureDatasetSemanticSnapshot(analysisDataset);
        await refreshDuckDbSession();
        console.log(`[Perf:PostClean] restart cleaning→analysis-ready: ${Math.round(performance.now() - transitionStart)}ms`);
        if (analysisDataset) {
          const pipelineOutcome = get().pipelineOutcome;
          if ((pipelineOutcome == null ? void 0 : pipelineOutcome.status) === "ready" || (pipelineOutcome == null ? void 0 : pipelineOutcome.status) === "degraded_but_usable") {
            const goal = get().confirmedAnalysisGoal ?? DEFAULT_AUTO_ANALYSIS_GOAL;
            const analysisOutcome = await get().handleInitialAnalysis(analysisDataset, goal, { trigger: "automatic" });
            if (analysisOutcome.status !== "paused" && analysisOutcome.status !== "error") {
              await proposeGoalsAfterAnalysisSummaries(analysisDataset, analysisOutcome);
            }
          } else {
            await proposeGoalsAfterAnalysisSummaries(analysisDataset);
          }
        }
      }
    },
    saveReportStructureBoundaryOverride: async (boundary) => {
      const [
        { getPreferredAnalysisDataset },
        { resolveAnalysisDatasetProfiles },
        { DEFAULT_AUTO_ANALYSIS_GOAL }
      ] = await Promise.all([
        __vitePreload(() => import("./csv_data_analysis_app-agent.js").then((n) => n.cU), true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url),
        __vitePreload(() => import("./csv_data_analysis_app-agent.js").then((n) => n.cZ), true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url),
        __vitePreload(() => import("./csv_data_analysis_app-agent.js").then((n) => n.cY), true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url)
      ]);
      await rebuildStructureArtifacts(boundary);
      get().setIsReportBoundaryConfirmModalOpen(false);
      const pipelineOutcome = get().pipelineOutcome;
      if ((pipelineOutcome == null ? void 0 : pipelineOutcome.status) === "ready" || (pipelineOutcome == null ? void 0 : pipelineOutcome.status) === "degraded_but_usable") {
        const analysisDataset = getPreferredAnalysisDataset(get());
        if (analysisDataset) {
          const resolvedProfiles = resolveAnalysisDatasetProfiles(analysisDataset, get().columnProfiles);
          set({
            columnProfiles: resolvedProfiles,
            columnRegistry: buildRegistryForDataset(analysisDataset, resolvedProfiles, get().datasetSemanticSnapshot)
          });
          duckDbWorkerClient.initDuckDb(DUCKDB_INIT_TIMEOUT_MS).catch(() => {
          });
          await get().ensureDatasetSemanticSnapshot(analysisDataset, { force: true });
          await refreshDuckDbSession();
          const goal = get().confirmedAnalysisGoal ?? DEFAULT_AUTO_ANALYSIS_GOAL;
          const analysisOutcome = await get().handleInitialAnalysis(analysisDataset, goal, { trigger: "manual" });
          if (analysisOutcome.status !== "paused" && analysisOutcome.status !== "error") {
            await proposeGoalsAfterAnalysisSummaries(analysisDataset, analysisOutcome);
          }
        }
        get().addProgress("Report structure was confirmed and canonical data is ready for analysis.");
      } else {
        get().addProgress((pipelineOutcome == null ? void 0 : pipelineOutcome.message) ?? "Report structure review was saved.", (pipelineOutcome == null ? void 0 : pipelineOutcome.severity) === "blocked" ? "warning" : "system");
      }
    },
    setColumnAnnotation: (annotation) => {
      set((prev) => {
        var _a;
        return {
          userColumnAnnotations: {
            ...prev.userColumnAnnotations,
            [annotation.columnName]: annotation
          },
          columnRegistry: buildColumnRegistry({
            data: prev.canonicalCsvData ?? prev.csvData,
            columnProfiles: prev.columnProfiles,
            semanticSnapshot: prev.datasetSemanticSnapshot,
            userColumnAnnotations: {
              ...prev.userColumnAnnotations,
              [annotation.columnName]: annotation
            },
            steering: (_a = prev.latestAnalysisSession) == null ? void 0 : _a.analysisSteering,
            existingRegistry: prev.columnRegistry
          })
        };
      });
      void __vitePreload(() => import("./csv_data_analysis_app-agent.js").then((n) => n.cT), true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url).then(
        (m) => m.upsertColumnAnnotationDoc(storeApi, annotation)
      );
    },
    removeColumnAnnotation: (columnName) => {
      set((prev) => {
        var _a;
        const next = { ...prev.userColumnAnnotations };
        delete next[columnName];
        return {
          userColumnAnnotations: next,
          columnRegistry: buildColumnRegistry({
            data: prev.canonicalCsvData ?? prev.csvData,
            columnProfiles: prev.columnProfiles,
            semanticSnapshot: prev.datasetSemanticSnapshot,
            userColumnAnnotations: next,
            steering: (_a = prev.latestAnalysisSession) == null ? void 0 : _a.analysisSteering,
            existingRegistry: prev.columnRegistry
          })
        };
      });
      void __vitePreload(() => import("./csv_data_analysis_app-agent.js").then((n) => n.cT), true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url).then(
        (m) => m.removeColumnAnnotationDoc(storeApi, columnName)
      );
    }
  };
};
let _resolveEffectivePendingClarification = null;
let _isProviderConfigured = null;
const LOG_PREFIX = "[ChatSlice]";
const chatDebug$1 = (message, detail) => {
  return;
};
const createChatSlice = (set, get) => {
  const storeApi = { getState: get, setState: set };
  let isDrainingQueuedTurns = false;
  const storeResolvedClarification = (clarification, value) => {
    if (!value.trim()) return;
    const key = clarification.targetProperty ?? clarification.question.slice(0, 60);
    const resolvedAtTurn = get().chatHistory.length;
    const entry = { key, question: clarification.question, value, resolvedAtTurn };
    set((prev) => ({
      resolvedClarifications: [
        ...(prev.resolvedClarifications ?? []).filter((c) => c.key !== key),
        entry
      ]
    }));
  };
  let isRefreshingContext = false;
  const refreshContextualSummaryIfNeeded = async () => {
    var _a, _b;
    if (isRefreshingContext) return;
    isRefreshingContext = true;
    try {
      const { shouldRefreshContextualSummary, generateContextualSummary, markContextualSummaryRefreshed } = await __vitePreload(async () => {
        const { shouldRefreshContextualSummary: shouldRefreshContextualSummary2, generateContextualSummary: generateContextualSummary2, markContextualSummaryRefreshed: markContextualSummaryRefreshed2 } = await import("./csv_data_analysis_app-ai.js").then((n) => n.a8);
        return { shouldRefreshContextualSummary: shouldRefreshContextualSummary2, generateContextualSummary: generateContextualSummary2, markContextualSummaryRefreshed: markContextualSummaryRefreshed2 };
      }, true ? __vite__mapDeps([0,1,2,3,4]) : void 0, import.meta.url);
      const state = get();
      if (!shouldRefreshContextualSummary(state.sessionId, state.chatHistory.length)) {
        return;
      }
      const nextSummary = await generateContextualSummary({
        settings: state.settings,
        confirmedGoal: state.confirmedAnalysisGoal,
        aiCoreAnalysisSummary: ((_a = state.aiCoreAnalysisSummary) == null ? void 0 : _a.text) ?? null,
        contextualSummary: state.contextualSummary,
        datasetKnowledge: (_b = state.agentMemoryRun) == null ? void 0 : _b.findings.datasetKnowledge,
        chatHistory: state.chatHistory,
        analysisCards: state.analysisCards,
        telemetryTarget: state
      });
      set({ contextualSummary: nextSummary.summary });
      markContextualSummaryRefreshed(state.sessionId, get().chatHistory.length);
    } finally {
      isRefreshingContext = false;
    }
  };
  const fireContextRefresh = () => {
    refreshContextualSummaryIfNeeded().catch(
      (err) => console.warn(`${LOG_PREFIX} Background context refresh failed (non-blocking):`, err)
    );
  };
  const appendUserMessage = (text) => {
    const { cardIds, displayText } = parseCardMentions(text);
    set((prev) => ({
      chatHistory: [
        ...prev.chatHistory,
        createChatMessage({
          sender: "user",
          text: displayText,
          timestamp: /* @__PURE__ */ new Date(),
          type: "user_message",
          ...cardIds.length > 0 ? { referencedCardIds: cardIds } : {}
        })
      ]
    }));
  };
  const getQueuedChatTurns = () => get().queuedChatTurns ?? [];
  const getEffectivePendingClarification = () => {
    if (!_resolveEffectivePendingClarification) return null;
    return _resolveEffectivePendingClarification(get());
  };
  const hasRunningTurn = () => {
    var _a;
    return ((_a = get().activeTurn) == null ? void 0 : _a.status) === "running";
  };
  const canDrainQueuedTurns = () => {
    const state = get();
    return !hasRunningTurn() && !getEffectivePendingClarification() && !state.pendingMutationConfirmation;
  };
  const enqueueChatTurn = (message) => {
    const queuedTurn = {
      id: createId("queued-chat-turn"),
      message,
      enqueuedAt: /* @__PURE__ */ new Date()
    };
    set((prev) => ({
      queuedChatTurns: [...prev.queuedChatTurns ?? [], queuedTurn]
    }));
  };
  const appendAiMessage = (text, type = "ai_message", extras) => {
    set((prev) => ({
      chatHistory: [
        ...prev.chatHistory,
        createChatMessage({
          sender: "ai",
          text,
          timestamp: /* @__PURE__ */ new Date(),
          type,
          ...extras
        })
      ]
    }));
  };
  const executeControlledSpreadsheetFilter = async (rawQuery, origin) => {
    var _a, _b, _c;
    const query = rawQuery.trim();
    if (!query) return;
    const action = {
      type: "tool_call",
      toolName: "spreadsheet.filter",
      args: { query }
    };
    appendUserMessage(query);
    set({ isBusy: true, chatLifecycleState: "running", pendingClarification: null });
    try {
      const { handleAiAction } = await __vitePreload(async () => {
        const { handleAiAction: handleAiAction2 } = await import("./csv_data_analysis_app-agent.js").then((n) => n.d1);
        return { handleAiAction: handleAiAction2 };
      }, true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url);
      const result = await handleAiAction(action, storeApi, { spreadsheetFilterOrigin: origin });
      if (result.status === "success") {
        const observedReply = ((_b = (_a = result.observation) == null ? void 0 : _a.summary) == null ? void 0 : _b.trim()) || result.message;
        if (observedReply) {
          appendAiMessage(observedReply);
        }
        return;
      }
      appendAiMessage(((_c = result.observation) == null ? void 0 : _c.summary) ?? result.message, "ai_message", { isError: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      appendAiMessage(
        getTranslation("chat_temporary_filter_failed", get().settings.language, { message: errorMessage }),
        "ai_message",
        { isError: true }
      );
    } finally {
      set({ isBusy: false, chatLifecycleState: "idle" });
    }
  };
  const ensureProviderHealthy = async () => {
    const settings = get().settings;
    if (_isProviderConfigured && !_isProviderConfigured(settings)) {
      if (shouldAllowSettingsSurface()) {
        get().addProgress("API Key is not set.", "error");
        get().setIsSettingsModalOpen(true);
      } else {
        get().addProgress(
          getTranslation("api_key_required_managed_message", settings.language),
          "error"
        );
      }
      return false;
    }
    if (!_isProviderConfigured) return false;
    const { validateProviderHealth } = await __vitePreload(async () => {
      const { validateProviderHealth: validateProviderHealth2 } = await import("./csv_data_analysis_app-ai.js").then((n) => n.a6);
      return { validateProviderHealth: validateProviderHealth2 };
    }, true ? __vite__mapDeps([0,1,2,3,4]) : void 0, import.meta.url);
    const health = await validateProviderHealth(settings);
    if (health.status === "healthy") return true;
    const errorMessages = {
      not_configured: "API Key is not set.",
      invalid_key: getTranslation("provider_health_invalid_key", settings.language),
      unreachable: getTranslation("provider_health_unreachable", settings.language)
    };
    const message = errorMessages[health.status] ?? "AI provider is unavailable.";
    if (shouldAllowSettingsSurface() && health.status !== "unreachable") {
      get().addProgress(message, "error");
      get().setIsSettingsModalOpen(true);
    } else {
      get().addProgress(message, "error");
    }
    return false;
  };
  const runImmediateChatTurn = async (message, options) => {
    if (options.appendUserMessage) {
      set((prev) => ({
        isBusy: true,
        chatLifecycleState: "running",
        pendingClarification: null,
        chatHistory: [
          ...prev.chatHistory,
          createChatMessage({ sender: "user", text: options.displayText ?? message, timestamp: /* @__PURE__ */ new Date(), type: "user_message" })
        ]
      }));
    } else {
      set({ isBusy: true, chatLifecycleState: "running", pendingClarification: null });
    }
    try {
      const { orchestrateChatResponse } = await __vitePreload(async () => {
        const { orchestrateChatResponse: orchestrateChatResponse2 } = await import("./csv_data_analysis_app-agent.js").then((n) => n.d5);
        return { orchestrateChatResponse: orchestrateChatResponse2 };
      }, true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url);
      await orchestrateChatResponse(message, storeApi);
      fireContextRefresh();
      if (options.drainAfter !== false) {
        await drainQueuedChatTurns();
      }
    } finally {
      const currentLifecycle = get().chatLifecycleState;
      set({
        isBusy: false,
        ...currentLifecycle === "running" ? { chatLifecycleState: "failed" } : {}
      });
    }
  };
  const drainQueuedChatTurns = async () => {
    if (isDrainingQueuedTurns || !canDrainQueuedTurns()) {
      return;
    }
    isDrainingQueuedTurns = true;
    try {
      while (canDrainQueuedTurns()) {
        let nextMessage;
        set((prev) => {
          const queue = prev.queuedChatTurns ?? [];
          if (queue.length === 0) return prev;
          nextMessage = queue[0].message;
          return { queuedChatTurns: queue.slice(1) };
        });
        if (!nextMessage) return;
        await runImmediateChatTurn(nextMessage, {
          appendUserMessage: false,
          drainAfter: false
        });
      }
    } finally {
      isDrainingQueuedTurns = false;
    }
  };
  return {
    isAiFiltering: false,
    streamingMessage: null,
    setStreamingMessage: (text) => {
      set((prev) => ({
        streamingMessage: prev.streamingMessage ? { ...prev.streamingMessage, text } : { text, isStreaming: true, startedAt: /* @__PURE__ */ new Date() }
      }));
    },
    clearStreamingMessage: () => set({ streamingMessage: null }),
    confirmGoal: async (goalTitle) => {
      const { confirmAnalysisGoal } = await __vitePreload(async () => {
        const { confirmAnalysisGoal: confirmAnalysisGoal2 } = await import("./csv_data_analysis_app-agent.js").then((n) => n.d3);
        return { confirmAnalysisGoal: confirmAnalysisGoal2 };
      }, true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url);
      await confirmAnalysisGoal(goalTitle, storeApi);
    },
    handleChatMessage: async (message, options) => {
      var _a, _b, _c, _d;
      const displayText = (options == null ? void 0 : options.displayText) ?? message;
      const source = (options == null ? void 0 : options.source) ?? "composer";
      const hasPendingClar = Boolean(get().pendingClarification) && !hasRunningTurn();
      if ((source === "composer" || source === "action") && !hasPendingClar) {
        appendUserMessage(displayText);
      }
      if (!_resolveEffectivePendingClarification || !_isProviderConfigured) {
        const [clarificationMod, providerMod] = await Promise.all([
          __vitePreload(() => import("./csv_data_analysis_app-agent.js").then((n) => n.d0), true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url),
          __vitePreload(() => import("./csv_data_analysis_app-ai.js").then((n) => n.a6), true ? __vite__mapDeps([0,1,2,3,4]) : void 0, import.meta.url),
          __vitePreload(() => import("./csv_data_analysis_app-agent.js").then((n) => n.d5), true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url)
        ]);
        _resolveEffectivePendingClarification = clarificationMod.resolveEffectivePendingClarification;
        _isProviderConfigured = providerMod.isProviderConfigured;
      }
      if (get().goalState === "awaiting_user_confirmation") {
        await get().confirmGoal(message);
        return;
      }
      if (!await ensureProviderHealthy()) {
        return;
      }
      const pendingClarification = getEffectivePendingClarification();
      if (pendingClarification && !hasRunningTurn()) {
        chatDebug$1("Composer message intercepted by pending clarification.", {
          clarificationQuestion: pendingClarification.question,
          clarificationMode: pendingClarification.clarificationMode ?? null,
          allowFreeText: pendingClarification.allowFreeText ?? null,
          activeTurnStatus: ((_a = get().activeTurn) == null ? void 0 : _a.status) ?? null,
          pendingClarificationInStore: Boolean(get().pendingClarification)
        });
        const { buildClarificationFollowUpPrompt, handleClarificationResponse: processClarificationResponse } = await __vitePreload(async () => {
          const { buildClarificationFollowUpPrompt: buildClarificationFollowUpPrompt2, handleClarificationResponse: processClarificationResponse2 } = await import("./csv_data_analysis_app-agent.js").then((n) => n.d0);
          return { buildClarificationFollowUpPrompt: buildClarificationFollowUpPrompt2, handleClarificationResponse: processClarificationResponse2 };
        }, true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url).then(async (clarMod) => {
          const { handleClarificationResponse: procClarResp } = await __vitePreload(async () => {
            const { handleClarificationResponse: procClarResp2 } = await import("./csv_data_analysis_app-agent.js").then((n) => n.d5);
            return { handleClarificationResponse: procClarResp2 };
          }, true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url);
          return { ...clarMod, handleClarificationResponse: procClarResp };
        });
        const trimmedMessage = message.trim();
        if (!trimmedMessage) {
          set((prev) => ({
            chatHistory: [
              ...prev.chatHistory,
              createChatMessage({
                sender: "ai",
                text: buildClarificationFollowUpPrompt(pendingClarification, get().settings.language),
                timestamp: /* @__PURE__ */ new Date(),
                type: "ai_message"
              })
            ]
          }));
          return;
        }
        storeResolvedClarification(pendingClarification, trimmedMessage);
        await processClarificationResponse({
          label: trimmedMessage,
          value: trimmedMessage
        }, storeApi);
        fireContextRefresh();
        await drainQueuedChatTurns();
        return;
      }
      if (hasRunningTurn()) {
        if (source !== "composer") {
          chatDebug$1("Ignored non-composer message while a runtime turn is running.", {
            activeTurnId: ((_b = get().activeTurn) == null ? void 0 : _b.turnId) ?? null
          });
          return;
        }
        console.log(`${LOG_PREFIX} Queued composer message while another turn is running.`, { message });
        chatDebug$1("Queued composer message while runtime turn is running.", {
          activeTurnId: ((_c = get().activeTurn) == null ? void 0 : _c.turnId) ?? null,
          queuedCountBeforeEnqueue: getQueuedChatTurns().length
        });
        enqueueChatTurn(message);
        return;
      }
      console.log(`${LOG_PREFIX} User message received for runtime turn.`, { message });
      chatDebug$1("Starting fresh runtime turn from composer input.", {
        currentView: get().currentView,
        isBusy: get().isBusy,
        activeTurnStatus: ((_d = get().activeTurn) == null ? void 0 : _d.status) ?? null,
        hasPendingClarification: Boolean(getEffectivePendingClarification())
      });
      await runImmediateChatTurn(message, {
        appendUserMessage: false,
        displayText: options == null ? void 0 : options.displayText
      });
    },
    handleClarificationResponse: async (userChoice) => {
      var _a, _b, _c, _d;
      if (get().isBusy) {
        chatDebug$1("Ignored clarification response because chat is already busy.", {
          activeTurnStatus: ((_a = get().activeTurn) == null ? void 0 : _a.status) ?? null,
          hasPendingClarification: Boolean(getEffectivePendingClarification())
        });
        return;
      }
      set({ isBusy: true, chatLifecycleState: "running" });
      chatDebug$1("Handling clarification response.", {
        activeTurnStatus: ((_b = get().activeTurn) == null ? void 0 : _b.status) ?? null,
        pendingClarificationQuestion: ((_c = getEffectivePendingClarification()) == null ? void 0 : _c.question) ?? null
      });
      try {
        if (!_resolveEffectivePendingClarification) {
          const mod = await __vitePreload(() => import("./csv_data_analysis_app-agent.js").then((n) => n.d0), true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url);
          _resolveEffectivePendingClarification = mod.resolveEffectivePendingClarification;
        }
        const pendingClarification = getEffectivePendingClarification();
        if (pendingClarification) {
          storeResolvedClarification(pendingClarification, userChoice.value || userChoice.label);
        }
        const { handleClarificationResponse: processClarificationResponse } = await __vitePreload(async () => {
          const { handleClarificationResponse: processClarificationResponse2 } = await import("./csv_data_analysis_app-agent.js").then((n) => n.d5);
          return { handleClarificationResponse: processClarificationResponse2 };
        }, true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url);
        await processClarificationResponse(userChoice, storeApi);
        fireContextRefresh();
        await drainQueuedChatTurns();
      } finally {
        chatDebug$1("Clarification response handling finished.", {
          activeTurnStatus: ((_d = get().activeTurn) == null ? void 0 : _d.status) ?? null,
          hasPendingClarification: Boolean(getEffectivePendingClarification()),
          isBusy: get().isBusy
        });
        const currentLifecycle = get().chatLifecycleState;
        set({
          isBusy: false,
          ...currentLifecycle === "running" ? { chatLifecycleState: "failed" } : {}
        });
      }
    },
    handleNaturalLanguageQuery: async (query) => {
      await executeControlledSpreadsheetFilter(query, "spreadsheet_panel");
      fireContextRefresh();
    },
    clearAiFilter: () => {
      set({ activeSpreadsheetFilter: null, spreadsheetFilterFunction: null, aiFilterExplanation: null });
      get().addProgress("AI data filter cleared.");
      console.log(`${LOG_PREFIX} AI spreadsheet filter cleared.`);
    },
    clearActiveDataQuery: () => {
      set({ activeDataQuery: null });
      get().addProgress("AI data query cleared.");
      console.log(`${LOG_PREFIX} AI data query cleared.`);
    }
  };
};
const TELEMETRY_FLUSH_INTERVAL_MS$1 = 500;
let shadowTelemetryEvents = null;
let pendingTelemetryEvents = [];
let telemetryEventsFlushTimer = null;
const createTelemetrySlice = (set, get) => ({
  telemetryEvents: [],
  logTelemetryEvent: (eventInput) => {
    const { stage, responseType, detail, chunkSize, meta } = eventInput;
    const provider = get().settings.provider;
    const correlation = buildCorrelationFields(get(), eventInput);
    const event = {
      id: createId("telemetry"),
      provider,
      stage,
      responseType,
      detail,
      chunkSize,
      // meta values from worker diagnostics are already plain primitives —
      // skip the expensive toSerializable deep-clone.
      meta: meta ?? void 0,
      timestamp: /* @__PURE__ */ new Date(),
      sessionId: correlation.sessionId,
      datasetId: correlation.datasetId,
      runId: correlation.runId,
      turnId: correlation.turnId,
      stepId: correlation.stepId,
      toolCallId: correlation.toolCallId,
      cleaningRunId: correlation.cleaningRunId,
      requestId: correlation.requestId
    };
    pendingTelemetryEvents.push(event);
    if (telemetryEventsFlushTimer !== null) return;
    telemetryEventsFlushTimer = setTimeout(() => {
      telemetryEventsFlushTimer = null;
      const batch = pendingTelemetryEvents.splice(0);
      if (batch.length === 0) return;
      if (shadowTelemetryEvents === null) {
        shadowTelemetryEvents = get().telemetryEvents ?? [];
      }
      shadowTelemetryEvents = [...shadowTelemetryEvents, ...batch].slice(-200);
      const state = get();
      if (!state.isDebugLogsModalOpen && !state.isAgentModalOpen) return;
      set(() => ({ telemetryEvents: shadowTelemetryEvents }));
    }, TELEMETRY_FLUSH_INTERVAL_MS$1);
  },
  clearTelemetry: () => {
    shadowTelemetryEvents = [];
    pendingTelemetryEvents = [];
    set({ telemetryEvents: [] });
  },
  syncTelemetryEventsToStore: () => {
    const batch = pendingTelemetryEvents.splice(0);
    if (shadowTelemetryEvents === null) {
      shadowTelemetryEvents = get().telemetryEvents ?? [];
    }
    if (batch.length > 0) {
      shadowTelemetryEvents = [...shadowTelemetryEvents, ...batch].slice(-200);
    }
    set(() => ({ telemetryEvents: shadowTelemetryEvents }));
  }
});
const createEventObject = (event) => ({
  id: event.id ?? createId("agent-event"),
  timestamp: event.timestamp ?? /* @__PURE__ */ new Date(),
  phase: event.phase,
  step: event.step,
  status: event.status,
  message: event.message,
  detail: event.detail ? toSerializable(event.detail) : event.detail,
  sessionId: event.sessionId,
  datasetId: event.datasetId,
  runId: event.runId,
  turnId: event.turnId,
  stepId: event.stepId,
  toolCallId: event.toolCallId,
  cleaningRunId: event.cleaningRunId,
  requestId: event.requestId
});
const createToolLogEntry = (entry) => ({
  id: entry.id ?? createId("agent-tool"),
  timestamp: entry.timestamp ?? /* @__PURE__ */ new Date(),
  sessionId: entry.sessionId,
  datasetId: entry.datasetId,
  runId: entry.runId,
  turnId: entry.turnId,
  stepId: entry.stepId,
  toolCallId: entry.toolCallId,
  cleaningRunId: entry.cleaningRunId,
  requestId: entry.requestId,
  tool: entry.tool,
  description: entry.description,
  detail: entry.detail ? toSerializable(entry.detail) : entry.detail,
  stage: entry.stage,
  category: entry.category,
  risk: entry.risk,
  policyDecision: entry.policyDecision,
  policyReason: entry.policyReason
});
const createRuntimeEventObject = (event) => ({
  id: event.id ?? createId("runtime-event"),
  timestamp: event.timestamp ?? /* @__PURE__ */ new Date(),
  sessionId: event.sessionId,
  runId: event.runId,
  turnId: event.turnId,
  stepId: event.stepId,
  toolCallId: event.toolCallId,
  type: event.type,
  stage: event.stage,
  reason: event.reason,
  retryable: event.retryable,
  failureClass: event.failureClass,
  message: event.message,
  detail: event.detail
});
const TELEMETRY_FLUSH_INTERVAL_MS = 200;
let pendingAgentEvents = [];
let pendingRuntimeEvents = [];
let telemetryFlushTimer = null;
let shadowAgentEvents = null;
let shadowRuntimeEvents = null;
const scheduleTelemetryFlush = (set, get) => {
  if (telemetryFlushTimer !== null) return;
  telemetryFlushTimer = setTimeout(() => {
    telemetryFlushTimer = null;
    const agentBatch = pendingAgentEvents.splice(0);
    const runtimeBatch = pendingRuntimeEvents.splice(0);
    if (agentBatch.length === 0 && runtimeBatch.length === 0) return;
    const state = get();
    if (shadowAgentEvents === null) shadowAgentEvents = state.agentEvents ?? [];
    if (shadowRuntimeEvents === null) shadowRuntimeEvents = state.runtimeEvents ?? [];
    if (agentBatch.length > 0) {
      shadowAgentEvents = [...shadowAgentEvents, ...agentBatch].slice(-200);
    }
    if (runtimeBatch.length > 0) {
      shadowRuntimeEvents = [...shadowRuntimeEvents, ...runtimeBatch].slice(-120);
    }
    const modalOpen = state.isDebugLogsModalOpen || state.isAgentModalOpen;
    if (!modalOpen) return;
    set(() => ({
      ...agentBatch.length > 0 ? { agentEvents: shadowAgentEvents } : {},
      ...runtimeBatch.length > 0 ? { runtimeEvents: shadowRuntimeEvents } : {}
    }));
  }, TELEMETRY_FLUSH_INTERVAL_MS);
};
const flushTelemetryToStore = (set, get) => {
  const agentBatch = pendingAgentEvents.splice(0);
  const runtimeBatch = pendingRuntimeEvents.splice(0);
  if (shadowAgentEvents === null) shadowAgentEvents = (get == null ? void 0 : get().agentEvents) ?? [];
  if (shadowRuntimeEvents === null) shadowRuntimeEvents = (get == null ? void 0 : get().runtimeEvents) ?? [];
  if (agentBatch.length > 0) {
    shadowAgentEvents = [...shadowAgentEvents, ...agentBatch].slice(-200);
  }
  if (runtimeBatch.length > 0) {
    shadowRuntimeEvents = [...shadowRuntimeEvents, ...runtimeBatch].slice(-120);
  }
  set(() => ({
    agentEvents: shadowAgentEvents,
    runtimeEvents: shadowRuntimeEvents
  }));
};
const filterPersistedWorkspaceFiles = (workspaceFiles) => Object.fromEntries(
  Object.entries(workspaceFiles).filter(([path]) => {
    if (!path.startsWith("/workspace/reports/")) {
      return true;
    }
    return path === LATEST_REPORT_MANIFEST_PATH || path === LATEST_REPORT_READINESS_PATH;
  })
);
const hasSavableSession = (state) => Boolean(state.sessionId && state.csvData && state.csvData.data.length > 0);
const buildColumnRegistrySignature = (state) => {
  var _a;
  return ((_a = state.columnRegistry) == null ? void 0 : _a.columns.map((column) => [
    column.physicalName,
    column.displayLabel,
    column.aliases.join(","),
    column.analysisRole,
    column.allowedUsages.groupBy ? "1" : "0",
    column.allowedUsages.filter ? "1" : "0",
    column.allowedUsages.select ? "1" : "0",
    column.allowedUsages.orderBy ? "1" : "0"
  ].join("~")).join("|")) ?? "";
};
const buildPersistedAppState = (state) => ({
  sessionId: state.sessionId,
  settings: state.settings,
  currentView: state.currentView,
  isAppInitializing: state.isAppInitializing,
  isBusy: state.isBusy,
  chatLifecycleState: state.chatLifecycleState,
  progressMessages: state.progressMessages,
  csvData: state.csvData,
  rawCsvData: state.rawCsvData,
  rawIntakeIr: state.rawIntakeIr,
  reportStructureResolution: state.reportStructureResolution,
  canonicalCsvData: state.canonicalCsvData,
  canonicalBuildMeta: state.canonicalBuildMeta,
  canonicalizationStatus: state.canonicalizationStatus,
  pipelineOutcome: state.pipelineOutcome,
  reportContextResolution: state.reportContextResolution,
  datasetSemanticSnapshot: state.datasetSemanticSnapshot,
  semanticStatus: state.semanticStatus,
  semanticDatasetVersion: state.semanticDatasetVersion,
  columnProfiles: state.columnProfiles,
  columnRegistry: state.columnRegistry,
  analysisCards: state.analysisCards,
  chatHistory: state.chatHistory,
  finalSummary: state.finalSummary,
  aiCoreAnalysisSummary: state.aiCoreAnalysisSummary,
  dataPreparationPlan: state.dataPreparationPlan,
  initialDataSample: state.initialDataSample,
  // Use the store's already-synced snapshot — avoids an async call to the
  // vector worker during persistence and keeps buildPersistedAppState sync.
  vectorStoreDocuments: state.vectorStoreDocuments,
  vectorMemoryState: state.vectorMemoryState,
  pendingVectorMemoryDocs: state.pendingVectorMemoryDocs,
  spreadsheetFilterFunction: state.spreadsheetFilterFunction,
  activeDataQuery: null,
  activeMetricMappingValidation: state.activeMetricMappingValidation,
  activeSpreadsheetFilter: state.activeSpreadsheetFilter,
  aiFilterExplanation: state.aiFilterExplanation,
  pendingClarification: null,
  resolvedClarifications: state.resolvedClarifications,
  pendingMutationConfirmation: state.pendingMutationConfirmation,
  activeTurn: null,
  queuedChatTurns: [],
  queuedAgentRuns: [],
  cancelRequestedTurnId: null,
  runtimeEvents: state.runtimeEvents,
  runtimeRunHistory: state.runtimeRunHistory,
  activeAnalysisSession: state.activeAnalysisSession,
  latestAnalysisSession: state.latestAnalysisSession,
  visibleAnalysisTrace: state.visibleAnalysisTrace,
  aiTaskStatus: state.aiTaskStatus,
  initialAnalysisStatus: state.initialAnalysisStatus,
  telemetryEvents: state.telemetryEvents,
  agentEvents: state.agentEvents,
  agentToolLogs: state.agentToolLogs,
  confirmedAnalysisGoal: state.confirmedAnalysisGoal,
  goalState: state.goalState,
  agentMemoryRun: state.agentMemoryRun,
  liveAgentMemoryRun: state.liveAgentMemoryRun,
  agentMemoryHistory: state.agentMemoryHistory,
  selectedMemoryRunId: state.selectedMemoryRunId,
  currentDatasetId: state.currentDatasetId,
  dataQualityIssues: state.dataQualityIssues,
  isChangingGoal: state.isChangingGoal,
  planQueue: state.planQueue,
  contextualSummary: state.contextualSummary,
  isGeneratingReport: state.isGeneratingReport,
  isSummaryGenerating: state.isSummaryGenerating,
  reportGenerationProgress: state.reportGenerationProgress,
  sessionCreatedAt: state.sessionCreatedAt,
  cardEnhancementSuggestions: state.cardEnhancementSuggestions,
  isCardReviewInProgress: state.isCardReviewInProgress,
  workspaceFiles: filterPersistedWorkspaceFiles(state.workspaceFiles),
  workspaceActionHistory: state.workspaceActionHistory,
  cleaningRun: state.cleaningRun,
  queryHistory: state.queryHistory,
  duckDbSessionStatus: state.duckDbSessionStatus,
  userColumnAnnotations: state.userColumnAnnotations ?? {}
});
const buildPersistedAppStateSignature = (state) => {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l;
  if (!hasSavableSession(state)) {
    return null;
  }
  return [
    state.sessionId,
    state.currentView,
    // --- cards (track count, IDs, AND content mutations) ---
    state.analysisCards.length,
    state.analysisCards.map((c) => `${c.id}:${c.displayChartType}:${c.topN ?? ""}:${c.isDataVisible ? "1" : "0"}`).join(","),
    // --- chat (track count + last message) ---
    state.chatHistory.length,
    ((_a = state.chatHistory.at(-1)) == null ? void 0 : _a.id) ?? "",
    ((_c = (_b = state.chatHistory.at(-1)) == null ? void 0 : _b.text) == null ? void 0 : _c.slice(0, 64)) ?? "",
    // --- column/profile state ---
    state.columnProfiles.length,
    buildColumnRegistrySignature(state),
    // --- pipeline / analysis status ---
    state.finalSummary ? "fs" : "",
    state.aiCoreAnalysisSummary ? "acs" : "",
    state.initialAnalysisStatus ?? "",
    state.goalState ?? "",
    ((_d = state.cleaningRun) == null ? void 0 : _d.status) ?? "",
    ((_f = (_e = state.dataPreparationPlan) == null ? void 0 : _e.sqlPrecheck) == null ? void 0 : _f.status) ?? "",
    state.confirmedAnalysisGoal ?? "",
    state.isGeneratingReport ? "rg" : "",
    state.semanticStatus ?? "",
    state.canonicalizationStatus ?? "",
    ((_g = state.pipelineOutcome) == null ? void 0 : _g.status) ?? "",
    // --- AI task / status messages ---
    state.aiTaskStatus ?? "",
    (state.progressMessages ?? []).length,
    // --- analysis session ---
    ((_h = state.latestAnalysisSession) == null ? void 0 : _h.sessionId) ?? "",
    ((_i = state.latestAnalysisSession) == null ? void 0 : _i.status) ?? "",
    ((_j = state.activeAnalysisSession) == null ? void 0 : _j.status) ?? "",
    // --- data quality / clarifications ---
    (state.dataQualityIssues ?? []).length,
    (state.resolvedClarifications ?? []).length,
    state.contextualSummary ? "cs" : "",
    // --- runtime / agent events ---
    (state.runtimeEvents ?? []).length,
    (state.runtimeRunHistory ?? []).length,
    (state.agentEvents ?? []).length,
    (state.agentToolLogs ?? []).length,
    // --- vector / memory ---
    (state.vectorStoreDocuments ?? []).length,
    state.vectorMemoryState ?? "",
    state.selectedMemoryRunId ?? "",
    // --- query / workspace ---
    (state.queryHistory ?? []).length,
    ((_k = state.csvData) == null ? void 0 : _k.fileName) ?? "",
    ((_l = state.csvData) == null ? void 0 : _l.data.length) ?? 0,
    Object.keys(state.workspaceFiles).length,
    (state.workspaceActionHistory ?? []).length,
    // --- misc persistence-worthy state ---
    state.duckDbSessionStatus ?? "",
    state.reportGenerationProgress ?? "",
    state.isCardReviewInProgress ? "1" : "0",
    Object.keys(state.userColumnAnnotations ?? {}).length
  ].join("|");
};
const buildPersistedReportRecord = (state, options) => ({
  id: options.id,
  filename: options.filename,
  createdAt: options.createdAt ?? state.sessionCreatedAt ?? /* @__PURE__ */ new Date(),
  updatedAt: options.updatedAt ?? /* @__PURE__ */ new Date(),
  appState: buildPersistedAppState(state)
});
const persistedAppState = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  buildPersistedAppState,
  buildPersistedAppStateSignature,
  buildPersistedReportRecord,
  hasSavableSession
}, Symbol.toStringTag, { value: "Module" }));
const REPORT_GENERATION_TIMEOUT_MS = 3e5;
let reportAbortController = null;
let reportTimeoutHandle = null;
const cleanupReportAbort = () => {
  if (reportTimeoutHandle) {
    clearTimeout(reportTimeoutHandle);
    reportTimeoutHandle = null;
  }
  reportAbortController = null;
};
const createAgentReportActions = (set, get) => ({
  generateAnalystReport: async () => {
    var _a;
    if (get().isGeneratingReport) {
      get().addProgress("Another report or analysis run is already in progress.", "warning");
      return;
    }
    const state = get();
    if (!state.csvData && !state.rawCsvData) {
      state.addProgress("Cannot generate an analyst report because no dataset is loaded.", "error");
      return;
    }
    const updateProgress = (progress) => {
      set({
        reportGenerationProgress: {
          completed: progress.completed,
          total: progress.total,
          mode: "artifact"
        },
        aiTaskStatus: {
          status: progress.completed >= progress.total ? "done" : "thinking",
          title: progress.title,
          subtitle: progress.subtitle,
          totalSteps: progress.total,
          currentStep: Math.min(progress.total, Math.max(1, progress.completed || 1))
        }
      });
    };
    set({
      isGeneratingReport: true,
      reportGenerationProgress: {
        completed: 0,
        total: 7,
        mode: "artifact"
      },
      aiTaskStatus: {
        status: "thinking",
        title: "Preparing analyst report",
        subtitle: "Collecting the verified dataset and trusted analysis evidence.",
        totalSteps: 7,
        currentStep: 1
      }
    });
    const controller = new AbortController();
    reportAbortController = controller;
    reportTimeoutHandle = setTimeout(() => {
      controller.abort(new Error("Report generation timed out after 5 minutes."));
    }, REPORT_GENERATION_TIMEOUT_MS);
    try {
      const artifacts = await generateAnalystReportArtifacts(state, state.settings, {
        onProgress: updateProgress,
        abortSignal: controller.signal
      });
      await saveReportArtifacts(artifacts.manifest.reportId, artifacts.manifest, artifacts.storedArtifactFiles);
      set((prev) => ({
        workspaceFiles: {
          ...Object.fromEntries(
            Object.entries(prev.workspaceFiles ?? {}).filter(([path]) => !path.startsWith("/workspace/reports/latest-analyst-report."))
          ),
          ...artifacts.workspaceFiles
        },
        isGeneratingReport: false,
        reportGenerationProgress: null,
        aiTaskStatus: null,
        chatHistory: artifacts.artifactStatus === "blocked" ? prev.chatHistory : [
          ...prev.chatHistory,
          createChatMessage({
            sender: "ai",
            text: `Analyst report ready. Workspace artifacts were saved for ${artifacts.title}, and a history snapshot was archived.`,
            timestamp: /* @__PURE__ */ new Date(),
            type: "ai_message"
          })
        ]
      }));
      const nextState = get();
      const reportGeneratedAt = Number.isNaN(new Date(artifacts.manifest.generatedAt).getTime()) ? /* @__PURE__ */ new Date() : new Date(artifacts.manifest.generatedAt);
      const sessionCreatedAt = nextState.sessionCreatedAt ?? reportGeneratedAt;
      if (!nextState.sessionCreatedAt) {
        set({ sessionCreatedAt });
      }
      const currentSessionReport = buildPersistedReportRecord(nextState, {
        id: nextState.sessionId,
        filename: ((_a = nextState.csvData) == null ? void 0 : _a.fileName) || "Current Session",
        createdAt: sessionCreatedAt
      });
      const archivedReport = buildPersistedReportRecord(nextState, {
        id: `report-artifact-${Date.now()}`,
        filename: artifacts.title,
        createdAt: reportGeneratedAt
      });
      await saveReport(currentSessionReport);
      await saveReport({
        ...currentSessionReport,
        id: CURRENT_SESSION_KEY
      });
      if (artifacts.artifactStatus !== "blocked") {
        await saveReport(archivedReport);
      }
      await nextState.loadReportsList();
      if (artifacts.artifactStatus === "blocked") {
        const blockerSummary = artifacts.manifest.gateReasons.length > 0 ? artifacts.manifest.gateReasons.join(" | ") : "Readiness blockers were recorded in the workspace artifacts.";
        nextState.addProgress(`Analyst report was blocked: ${blockerSummary}`, "warning");
        nextState.recordAgentEvent({
          phase: "execution",
          step: "analyst_report_blocked",
          status: "error",
          message: "Blocked analyst report generation before synthesis.",
          detail: {
            reportId: artifacts.manifest.reportId,
            generationGate: artifacts.manifest.generationGate,
            trustedCardsCount: artifacts.manifest.trustedCardsCount,
            excludedEvidenceCount: artifacts.manifest.excludedEvidenceCount,
            artifactStatus: artifacts.manifest.artifactStatus,
            gateReasons: artifacts.manifest.gateReasons
          }
        });
        return;
      }
      const reportHtml = artifacts.workspaceFiles[LATEST_REPORT_HTML_PATH];
      if (!reportHtml) {
        nextState.addProgress("Analyst report HTML is unavailable.", "warning");
      }
      nextState.addProgress(`Analyst report generated: "${artifacts.title}".`, "system");
      nextState.recordAgentEvent({
        phase: "execution",
        step: "analyst_report_generated",
        status: "done",
        message: "Generated bounded analyst report artifacts.",
        detail: {
          reportId: artifacts.manifest.reportId,
          title: artifacts.title,
          htmlPath: LATEST_REPORT_HTML_PATH,
          irPath: "/workspace/reports/latest-analyst-report.ir.json",
          generationGate: artifacts.manifest.generationGate,
          trustedCardsCount: artifacts.manifest.trustedCardsCount,
          excludedEvidenceCount: artifacts.manifest.excludedEvidenceCount,
          artifactStatus: artifacts.manifest.artifactStatus
        }
      });
      if (artifacts.manifest.fallbacksUsed.length > 0) {
        nextState.recordAgentEvent({
          phase: "execution",
          step: "analyst_report_fallback_used",
          status: "done",
          message: "Analyst report generation used bounded fallback paths.",
          detail: {
            reportId: artifacts.manifest.reportId,
            generationGate: artifacts.manifest.generationGate,
            trustedCardsCount: artifacts.manifest.trustedCardsCount,
            excludedEvidenceCount: artifacts.manifest.excludedEvidenceCount,
            artifactStatus: artifacts.manifest.artifactStatus,
            fallbacksUsed: artifacts.manifest.fallbacksUsed
          }
        });
      }
    } catch (error) {
      const cancelled = isRuntimeAbortError(error, controller.signal);
      const message = cancelled ? "Report generation was cancelled." : error instanceof Error ? error.message : String(error);
      console.error("Analyst report generation failed:", error);
      set({
        isGeneratingReport: false,
        reportGenerationProgress: null,
        aiTaskStatus: cancelled ? null : {
          status: "error",
          title: "Analyst report failed",
          subtitle: message,
          totalSteps: 7,
          currentStep: 1,
          error: message
        }
      });
      get().addProgress(
        cancelled ? "Report generation cancelled." : `Analyst report generation failed: ${message}`,
        cancelled ? "system" : "error"
      );
      if (!cancelled) {
        get().recordAgentEvent({
          phase: "execution",
          step: "analyst_report_generated",
          status: "error",
          message: "Failed to generate bounded analyst report artifacts.",
          detail: {
            error: message
          }
        });
      }
    } finally {
      cleanupReportAbort();
    }
  },
  cancelReportGeneration: () => {
    if (reportAbortController && !reportAbortController.signal.aborted) {
      reportAbortController.abort(new Error("Report generation cancelled by user."));
    }
  },
  openLatestAnalystReport: () => {
    const workspaceFiles = get().workspaceFiles ?? {};
    const manifest = parseReportArtifactManifest(workspaceFiles[LATEST_REPORT_MANIFEST_PATH]);
    if (!manifest || !hasOpenableLatestReport(workspaceFiles)) {
      const message = (manifest == null ? void 0 : manifest.artifactStatus) === "blocked" ? "The latest analyst report is blocked. Review the readiness artifact in the workspace." : "No analyst report HTML is available to open yet.";
      get().addProgress(message, "warning");
      return;
    }
    const html = workspaceFiles[LATEST_REPORT_HTML_PATH];
    const openedWindow = openReportArtifact(html);
    if (!openedWindow) {
      get().addProgress("Failed to open the analyst report in a new tab.", "error");
    }
  },
  exportLatestAnalystReportPdf: () => {
    const workspaceFiles = get().workspaceFiles ?? {};
    const manifest = parseReportArtifactManifest(workspaceFiles[LATEST_REPORT_MANIFEST_PATH]);
    if (!manifest || !hasOpenableLatestReport(workspaceFiles)) {
      const message = (manifest == null ? void 0 : manifest.artifactStatus) === "blocked" ? "The latest analyst report is blocked. Review the readiness artifact in the workspace." : "No analyst report HTML is available to export yet.";
      get().addProgress(message, "warning");
      return;
    }
    const html = workspaceFiles[LATEST_REPORT_HTML_PATH];
    const openedWindow = printReportArtifact(html);
    if (!openedWindow) {
      get().addProgress("Failed to open the analyst report for PDF export.", "error");
    }
  }
});
const createAgentSlice = (set, get) => ({
  agentEvents: [],
  agentToolLogs: [],
  activeTurn: null,
  queuedAgentRuns: [],
  cancelRequestedTurnId: null,
  runtimeEvents: [],
  runtimeRunHistory: [],
  lastInsightExtractedAtTurn: 0,
  cardEnhancementSuggestions: [],
  isCardReviewInProgress: false,
  agentMemoryRun: null,
  liveAgentMemoryRun: null,
  agentMemoryHistory: [],
  selectedMemoryRunId: null,
  currentDatasetId: null,
  recordAgentEvent: (eventInput) => {
    const correlation = buildCorrelationFields(get(), eventInput);
    const event = createEventObject({
      ...eventInput,
      sessionId: eventInput.sessionId ?? correlation.sessionId,
      datasetId: eventInput.datasetId ?? correlation.datasetId,
      runId: eventInput.runId ?? correlation.runId,
      turnId: eventInput.turnId ?? correlation.turnId,
      stepId: eventInput.stepId ?? correlation.stepId,
      toolCallId: eventInput.toolCallId ?? correlation.toolCallId,
      cleaningRunId: eventInput.cleaningRunId ?? correlation.cleaningRunId,
      requestId: eventInput.requestId ?? correlation.requestId
    });
    pendingAgentEvents.push(event);
    scheduleTelemetryFlush(set, get);
    return event;
  },
  recordRuntimeEvent: (eventInput) => {
    var _a, _b, _c, _d, _e, _f;
    const event = createRuntimeEventObject({
      ...eventInput,
      sessionId: eventInput.sessionId ?? get().sessionId,
      runId: eventInput.runId ?? ((_a = get().activeTurn) == null ? void 0 : _a.runId),
      turnId: eventInput.turnId ?? ((_b = get().activeTurn) == null ? void 0 : _b.turnId),
      toolCallId: eventInput.toolCallId ?? ((_d = (_c = get().activeTurn) == null ? void 0 : _c.steps.at(-1)) == null ? void 0 : _d.toolCallId) ?? ((_f = (_e = get().activeTurn) == null ? void 0 : _e.steps.at(-1)) == null ? void 0 : _f.stepId)
    });
    pendingRuntimeEvents.push(event);
    scheduleTelemetryFlush(set, get);
    return event;
  },
  enqueueAgentRun: (run) => {
    set((state) => ({
      queuedAgentRuns: [...state.queuedAgentRuns, run]
    }));
  },
  dequeueQueuedAgentRun: (queueId) => {
    const queuedRun = get().queuedAgentRuns.find((run) => run.queueId === queueId) ?? null;
    if (!queuedRun) {
      return null;
    }
    set((state) => ({
      queuedAgentRuns: state.queuedAgentRuns.filter((run) => run.queueId !== queueId)
    }));
    return queuedRun;
  },
  appendRuntimeRunRecord: (record) => {
    set((state) => ({
      runtimeRunHistory: [...state.runtimeRunHistory, record].slice(-50)
    }));
  },
  setActiveTurn: (turn) => set({ activeTurn: turn }),
  clearActiveTurn: () => set({ activeTurn: null, isBusy: false, chatLifecycleState: "idle" }),
  requestActiveTurnCancellation: async () => {
    const activeTurn = get().activeTurn;
    if (!activeTurn || activeTurn.status !== "running") {
      return;
    }
    if (get().cancelRequestedTurnId === activeTurn.turnId) {
      return;
    }
    const [{ abortRuntimeTurn }, { buildRuntimeContractDetail }] = await Promise.all([
      __vitePreload(() => import("./csv_data_analysis_app-agent.js").then((n) => n.cP), true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url),
      __vitePreload(() => import("./csv_data_analysis_app-agent.js").then((n) => n.cQ), true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url)
    ]);
    set({ cancelRequestedTurnId: activeTurn.turnId });
    abortRuntimeTurn(activeTurn.turnId);
    get().recordRuntimeEvent({
      turnId: activeTurn.turnId,
      type: "turn_cancellation_requested",
      message: "Cancellation requested for the active agent turn.",
      detail: buildRuntimeContractDetail({
        reasonCode: "cancellation_requested",
        retryable: false,
        abortMode: "checkpoint_abort",
        abortSource: "runtime_cancellation",
        abortPropagationStatus: "checkpoint_only",
        source: "runtime_cancellation_request"
      })
    });
  },
  clearActiveTurnCancellation: () => set({ cancelRequestedTurnId: null }),
  logAgentToolUsage: (entryInput) => {
    const activeTurn = get().activeTurn;
    const activeStep = activeTurn == null ? void 0 : activeTurn.steps.at(-1);
    const correlation = buildCorrelationFields(get(), entryInput);
    const entry = createToolLogEntry({
      ...entryInput,
      sessionId: entryInput.sessionId ?? correlation.sessionId ?? get().sessionId,
      datasetId: entryInput.datasetId ?? correlation.datasetId,
      runId: entryInput.runId ?? correlation.runId ?? (activeTurn == null ? void 0 : activeTurn.runId),
      turnId: entryInput.turnId ?? correlation.turnId ?? (activeTurn == null ? void 0 : activeTurn.turnId),
      stepId: entryInput.stepId ?? correlation.stepId ?? (activeStep == null ? void 0 : activeStep.stepId),
      toolCallId: entryInput.toolCallId ?? correlation.toolCallId ?? (activeStep == null ? void 0 : activeStep.toolCallId) ?? (activeStep == null ? void 0 : activeStep.stepId),
      cleaningRunId: entryInput.cleaningRunId ?? correlation.cleaningRunId,
      requestId: entryInput.requestId ?? correlation.requestId
    });
    set((state) => {
      const updated = [...state.agentToolLogs, entry];
      return { agentToolLogs: updated.slice(-200) };
    });
  },
  runCardEnhancementReview: async () => {
    const { analysisCards, settings, addProgress } = get();
    if (analysisCards.length === 0) {
      addProgress("No cards available to review yet.", "system");
      return;
    }
    set({ isCardReviewInProgress: true });
    try {
      const { generateCardEnhancementSuggestions } = await __vitePreload(async () => {
        const { generateCardEnhancementSuggestions: generateCardEnhancementSuggestions2 } = await import("./csv_data_analysis_app-ai.js").then((n) => n.aa);
        return { generateCardEnhancementSuggestions: generateCardEnhancementSuggestions2 };
      }, true ? __vite__mapDeps([0,1,2,3,4]) : void 0, import.meta.url);
      const cardContext = analysisCards.map((card) => ({
        id: card.id,
        title: card.plan.title,
        aggregatedDataSample: card.aggregatedData.slice(0, 15),
        groupByColumn: card.plan.groupByColumn,
        valueColumn: card.plan.valueColumn,
        aggregation: card.plan.aggregation
      }));
      const suggestions = await generateCardEnhancementSuggestions(cardContext, settings);
      if (!suggestions || suggestions.length === 0) {
        set((prev) => ({
          cardEnhancementSuggestions: [],
          isCardReviewInProgress: false,
          chatHistory: [
            ...prev.chatHistory,
            createChatMessage({
              sender: "ai",
              text: "AI reviewed all cards but found no additional enhancements at the moment.",
              timestamp: /* @__PURE__ */ new Date(),
              type: "ai_message"
            })
          ]
        }));
        addProgress("AI review complete – no enhancements suggested.", "system");
        return;
      }
      const cardTitleMap = new Map(analysisCards.map((card) => [card.id, card.plan.title]));
      const suggestionsWithMeta = suggestions.map((suggestion, idx) => ({
        ...suggestion,
        cardTitle: String(suggestion.cardTitle ?? cardTitleMap.get(suggestion.cardId) ?? suggestion.cardId),
        id: suggestion.id ?? `card-enhancement-${Date.now()}-${idx}`,
        createdAt: /* @__PURE__ */ new Date(),
        shortCode: `S${idx + 1}`,
        status: "pending",
        updateChart: suggestion.updateChart ? {
          ...suggestion.updateChart,
          newChartType: suggestion.updateChart.newChartType
        } : void 0
      }));
      set((prev) => ({
        cardEnhancementSuggestions: suggestionsWithMeta,
        isCardReviewInProgress: false,
        chatHistory: [
          ...prev.chatHistory,
          createChatMessage({
            sender: "ai",
            text: `AI reviewed all cards and proposed ${suggestionsWithMeta.length} enhancement${suggestionsWithMeta.length > 1 ? "s" : ""}. Reply "Approve S1" or "Dismiss S1" to act on a suggestion.`,
            timestamp: /* @__PURE__ */ new Date(),
            type: "ai_message"
          }),
          ...suggestionsWithMeta.map((s) => createChatMessage({
            sender: "ai",
            text: `Suggestion ${s.shortCode} (${s.priority.toUpperCase()}) for **${s.cardTitle}**:
${s.rationale}

Proposed column: ${s.proposedColumnName ? `**${s.proposedColumnName}** = ${s.formula}` : "N/A"}
Reply "Approve ${s.shortCode}" to apply or "Dismiss ${s.shortCode}" to skip.`,
            timestamp: /* @__PURE__ */ new Date(),
            type: "ai_enhancement_suggestion",
            enhancementSuggestionId: s.id
          }))
        ]
      }));
      addProgress(`AI proposed ${suggestionsWithMeta.length} potential enhancement${suggestionsWithMeta.length > 1 ? "s" : ""}.`, "system");
    } catch (error) {
      console.error("Card enhancement review failed:", error);
      get().addProgress("AI card review failed. Please try again.", "error");
      set({ isCardReviewInProgress: false });
    }
  },
  /* ── Report actions (delegated to agentReportActions.ts) ── */
  ...createAgentReportActions(set, get),
  applyCardEnhancementSuggestion: async (suggestionId) => {
    const { cardEnhancementSuggestions, addCalculatedColumnToCard, addProgress } = get();
    const suggestion = cardEnhancementSuggestions.find((s) => s.id === suggestionId);
    if (!suggestion || suggestion.status === "applied" || suggestion.status === "dismissed") return;
    set({
      cardEnhancementSuggestions: cardEnhancementSuggestions.map(
        (s) => s.id === suggestionId ? { ...s, status: "applying" } : s
      )
    });
    try {
      if (suggestion.action === "add_calculated_column" && suggestion.proposedColumnName && suggestion.formula) {
        const updateInstructions = suggestion.updateChart ?? { useAs: "primaryY" };
        addCalculatedColumnToCard(suggestion.cardId, suggestion.proposedColumnName, suggestion.formula, updateInstructions);
        set({
          cardEnhancementSuggestions: get().cardEnhancementSuggestions.map(
            (s) => s.id === suggestionId ? { ...s, status: "applied" } : s
          )
        });
        addProgress(`Applied enhancement on ${suggestion.cardTitle}.`, "system");
      } else {
        addProgress(`Suggestion ${suggestion.shortCode} is informational only and cannot be auto-applied.`, "error");
        set({
          cardEnhancementSuggestions: get().cardEnhancementSuggestions.map(
            (s) => s.id === suggestionId ? { ...s, status: "failed" } : s
          )
        });
        return;
      }
    } catch (error) {
      console.error("Failed to apply enhancement suggestion:", error);
      addProgress(`Failed to apply enhancement on ${suggestion.cardTitle}.`, "error");
      set({
        cardEnhancementSuggestions: get().cardEnhancementSuggestions.map(
          (s) => s.id === suggestionId ? { ...s, status: "failed" } : s
        )
      });
    }
  },
  dismissCardEnhancementSuggestion: (suggestionId) => {
    set((state) => ({
      cardEnhancementSuggestions: state.cardEnhancementSuggestions.map(
        (s) => s.id === suggestionId ? { ...s, status: "dismissed" } : s
      )
    }));
  },
  setAiTaskStatus: (status) => set({ aiTaskStatus: status }),
  setAgentMemoryRun: (run) => set({ agentMemoryRun: run, selectedMemoryRunId: (run == null ? void 0 : run.runId) ?? null }),
  setLiveAgentMemoryRun: (run) => set({ liveAgentMemoryRun: run }),
  setAgentMemoryHistory: (runs) => set({ agentMemoryHistory: runs }),
  selectAgentMemoryRun: (runId) => {
    if (!runId) {
      const live = get().liveAgentMemoryRun ?? null;
      set({
        agentMemoryRun: live,
        selectedMemoryRunId: (live == null ? void 0 : live.runId) ?? null
      });
      return;
    }
    const historyRun = get().agentMemoryHistory.find((run) => run.runId === runId);
    if (historyRun) {
      set({
        agentMemoryRun: historyRun,
        selectedMemoryRunId: runId
      });
    }
  },
  setCurrentDatasetId: (datasetId) => set({ currentDatasetId: datasetId }),
  clearAgentEvents: () => set({ agentEvents: [], agentToolLogs: [], cardEnhancementSuggestions: [] }),
  syncTelemetryToStore: () => flushTelemetryToStore(set, get)
});
const yieldToMainThread = () => new Promise((resolve) => {
  if (typeof MessageChannel !== "undefined") {
    const ch = new MessageChannel();
    ch.port1.onmessage = () => resolve();
    ch.port2.postMessage(void 0);
  } else {
    setTimeout(resolve, 0);
  }
});
const chatDebug = (message, detail) => {
  return;
};
const normalizeMetricMappingValidationArtifact = (value) => {
  if (!value) {
    return null;
  }
  return {
    ...value,
    validationIssues: Array.isArray(value.validationIssues) ? value.validationIssues : [],
    blockers: Array.isArray(value.blockers) ? value.blockers : [],
    grain: Array.isArray(value.grain) ? value.grain : [],
    sourceArtifactIds: Array.isArray(value.sourceArtifactIds) ? value.sourceArtifactIds : [],
    deriveMetricTemplate: value.deriveMetricTemplate ? {
      ...value.deriveMetricTemplate,
      groupByColumns: Array.isArray(value.deriveMetricTemplate.groupByColumns) ? value.deriveMetricTemplate.groupByColumns : [],
      expectedInputs: Array.isArray(value.deriveMetricTemplate.expectedInputs) ? value.deriveMetricTemplate.expectedInputs : []
    } : void 0
  };
};
const initialAppState = {
  sessionId: generateSessionId(),
  // Generate a temporary ID, will be overridden in init() if restoring
  currentView: "file_upload",
  isAppInitializing: true,
  isBusy: false,
  chatLifecycleState: "idle",
  settings: getDefaultSettings(),
  progressMessages: [],
  telemetryEvents: [],
  agentEvents: [],
  agentToolLogs: [],
  agentMemoryRun: null,
  liveAgentMemoryRun: null,
  agentMemoryHistory: [],
  selectedMemoryRunId: null,
  currentDatasetId: null,
  csvData: null,
  rawCsvData: null,
  rawIntakeIr: null,
  reportStructureResolution: null,
  canonicalCsvData: null,
  canonicalBuildMeta: null,
  canonicalizationStatus: "idle",
  pipelineOutcome: null,
  reportContextResolution: null,
  datasetSemanticSnapshot: null,
  semanticStatus: "idle",
  semanticDatasetVersion: null,
  columnProfiles: [],
  columnRegistry: null,
  analysisCards: [],
  chatHistory: [],
  finalSummary: null,
  aiCoreAnalysisSummary: null,
  dataPreparationPlan: null,
  initialDataSample: null,
  vectorStoreDocuments: [],
  vectorMemoryState: "cold",
  pendingVectorMemoryDocs: [],
  spreadsheetFilterFunction: null,
  activeDataQuery: null,
  activeMetricMappingValidation: null,
  activeSpreadsheetFilter: null,
  aiFilterExplanation: null,
  pendingClarification: null,
  resolvedClarifications: null,
  pendingMutationConfirmation: null,
  activeTurn: null,
  queuedChatTurns: [],
  queuedAgentRuns: [],
  cancelRequestedTurnId: null,
  runtimeEvents: [],
  runtimeRunHistory: [],
  activeAnalysisSession: null,
  latestAnalysisSession: null,
  visibleAnalysisTrace: [],
  aiTaskStatus: null,
  initialAnalysisStatus: "idle",
  confirmedAnalysisGoal: null,
  goalState: "idle",
  dataQualityIssues: null,
  isChangingGoal: false,
  planQueue: [],
  contextualSummary: null,
  isGeneratingReport: false,
  isSummaryGenerating: false,
  reportGenerationProgress: null,
  sessionCreatedAt: null,
  cardEnhancementSuggestions: [],
  isCardReviewInProgress: false,
  workspaceFiles: {},
  workspaceActionHistory: [],
  cleaningRun: null,
  queryHistory: [],
  duckDbSessionStatus: createIdleDuckDbSessionStatus(),
  userColumnAnnotations: {}
};
const useAppStore = createWithEqualityFn()((set, get, store) => ({
  ...initialAppState,
  reportsList: [],
  // Initial value for reportsList
  // Combine all slices
  ...createUISlice(set),
  ...createSettingsSlice(set, get),
  ...createHistorySlice(set, get),
  ...createCardSlice(set, get),
  ...createDataSlice(set, get),
  ...createChatSlice(set, get),
  ...createTelemetrySlice(set, get),
  ...createAgentSlice(set, get),
  // Global init function — guarded to prevent double execution from
  // React StrictMode or effect re-fires.
  init: async () => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    if (get()._initStarted) return;
    set({ _initStarted: true });
    const [
      rawPersistedSettings,
      { isProviderConfigured },
      { normalizeDataPreparationPlan },
      { updateCleaningRun }
    ] = await Promise.all([
      getSettings(),
      __vitePreload(() => import("./csv_data_analysis_app-ai.js").then((n) => n.a6), true ? __vite__mapDeps([0,1,2,3,4]) : void 0, import.meta.url),
      __vitePreload(() => import("./csv_data_analysis_app-agent.js").then((n) => n.cO), true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url),
      __vitePreload(() => import("./csv_data_analysis_app-agent.js").then((n) => n.cS), true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url)
    ]);
    const persistedSettings = {
      ...rawPersistedSettings,
      language: normalizeAppLanguage(rawPersistedSettings.language)
    };
    set({
      isAppInitializing: true,
      settings: persistedSettings,
      isApiKeySet: isProviderConfigured(persistedSettings)
    });
    let activeSessionId = readTabSessionId();
    if (!activeSessionId) {
      activeSessionId = createAndStoreTabSessionId();
    }
    set({ sessionId: activeSessionId });
    try {
      const idbStart = performance.now();
      const currentSession = await getReport(activeSessionId);
      const idbMs = performance.now() - idbStart;
      const { hasExternalPayloadPending: hasExternalPayloadPending2 } = await __vitePreload(async () => {
        const { hasExternalPayloadPending: hasExternalPayloadPending3 } = await Promise.resolve().then(() => externalCsvBridge);
        return { hasExternalPayloadPending: hasExternalPayloadPending3 };
      }, true ? void 0 : void 0, import.meta.url);
      if (currentSession && !hasExternalPayloadPending2) {
        const normalizeStart = performance.now();
        const normalizedAppState = normalizeRestoredAppState(currentSession.appState);
        const normalizeMs = performance.now() - normalizeStart;
        if (idbMs + normalizeMs > 100) {
          console.warn(
            `[Init] ⚠ Session hydration: idb=${Math.round(idbMs)}ms, normalize=${Math.round(normalizeMs)}ms`
          );
        }
        const clearedPersistedClarification = Boolean(normalizedAppState.pendingClarification);
        chatDebug("Hydrating persisted session state.", {
          sessionId: activeSessionId,
          hasPendingClarification: Boolean(normalizedAppState.pendingClarification),
          pendingClarificationQuestion: ((_a = normalizedAppState.pendingClarification) == null ? void 0 : _a.question) ?? null,
          persistedActiveTurnStatus: ((_b = normalizedAppState.activeTurn) == null ? void 0 : _b.status) ?? null,
          persistedChatHistoryCount: ((_c = normalizedAppState.chatHistory) == null ? void 0 : _c.length) ?? 0,
          persistedCurrentView: normalizedAppState.currentView ?? null,
          hasCsvData: Boolean(normalizedAppState.csvData)
        });
        await yieldToMainThread();
        const restoredColumnRegistry = buildColumnRegistry({
          data: normalizedAppState.canonicalCsvData ?? normalizedAppState.csvData,
          columnProfiles: normalizedAppState.columnProfiles,
          semanticSnapshot: normalizedAppState.datasetSemanticSnapshot,
          userColumnAnnotations: normalizedAppState.userColumnAnnotations,
          steering: (_d = normalizedAppState.latestAnalysisSession) == null ? void 0 : _d.analysisSteering,
          existingRegistry: normalizedAppState.columnRegistry ?? null
        });
        const hydratedWorkspaceFiles = await hydrateLatestReportWorkspaceFiles(normalizedAppState.workspaceFiles ?? {});
        const savedSuggestions = ((_e = currentSession.appState.cardEnhancementSuggestions) == null ? void 0 : _e.map((suggestion, idx) => ({
          ...suggestion,
          shortCode: suggestion.shortCode ?? `S${idx + 1}`
        }))) ?? [];
        set({
          ...initialAppState,
          ...normalizedAppState,
          settings: persistedSettings,
          workspaceFiles: hydratedWorkspaceFiles,
          workspaceActionHistory: normalizedAppState.workspaceActionHistory ?? [],
          queryHistory: normalizedAppState.queryHistory ?? [],
          duckDbSessionStatus: normalizedAppState.duckDbSessionStatus ?? createIdleDuckDbSessionStatus(),
          userColumnAnnotations: normalizedAppState.userColumnAnnotations ?? {},
          columnRegistry: restoredColumnRegistry,
          dataPreparationPlan: normalizeDataPreparationPlan(normalizedAppState.dataPreparationPlan),
          pendingClarification: null,
          pendingMutationConfirmation: normalizedAppState.pendingMutationConfirmation ?? null,
          activeTurn: null,
          activeAnalysisSession: normalizedAppState.activeAnalysisSession ?? null,
          latestAnalysisSession: normalizedAppState.latestAnalysisSession ?? null,
          visibleAnalysisTrace: normalizedAppState.visibleAnalysisTrace ?? [],
          queuedChatTurns: [],
          queuedAgentRuns: [],
          cancelRequestedTurnId: null,
          runtimeEvents: normalizedAppState.runtimeEvents ?? [],
          runtimeRunHistory: normalizedAppState.runtimeRunHistory ?? [],
          initialAnalysisStatus: normalizedAppState.initialAnalysisStatus ?? ((((_f = normalizedAppState.analysisCards) == null ? void 0 : _f.length) ?? 0) > 0 || Boolean(normalizedAppState.finalSummary) ? "ready" : "idle"),
          cleaningRun: normalizedAppState.cleaningRun ? updateCleaningRun(normalizedAppState.cleaningRun, {
            status: normalizedAppState.cleaningRun.status === "completed" ? "completed" : "paused",
            shouldAutoResume: false
          }) : null,
          sessionId: activeSessionId,
          // Ensure ID remains consistent
          agentEvents: normalizedAppState.agentEvents ?? [],
          agentToolLogs: normalizedAppState.agentToolLogs ?? [],
          cardEnhancementSuggestions: savedSuggestions,
          activeDataQuery: null,
          activeMetricMappingValidation: normalizeMetricMappingValidationArtifact(normalizedAppState.activeMetricMappingValidation ?? null),
          isCardReviewInProgress: false,
          isBusy: false,
          chatLifecycleState: "idle",
          isGeneratingReport: false,
          isSummaryGenerating: false,
          aiTaskStatus: null,
          goalState: normalizeRestoredGoalState(normalizedAppState.goalState),
          currentView: normalizedAppState.csvData ? "analysis_dashboard" : "file_upload",
          sessionCreatedAt: currentSession.createdAt,
          isApiKeySet: isProviderConfigured(persistedSettings),
          vectorStoreDocuments: []
        });
        chatDebug("Hydrated session state committed.", {
          sessionId: activeSessionId,
          restoredPendingClarification: Boolean(get().pendingClarification),
          restoredPendingClarificationQuestion: ((_g = get().pendingClarification) == null ? void 0 : _g.question) ?? null,
          clearedPersistedClarification,
          activeTurnStatusAfterHydrate: ((_h = get().activeTurn) == null ? void 0 : _h.status) ?? null,
          currentViewAfterHydrate: get().currentView,
          chatHistoryCountAfterHydrate: get().chatHistory.length,
          isBusyAfterHydrate: get().isBusy
        });
        const savedVectorDocs = normalizedAppState.vectorStoreDocuments;
        if (Array.isArray(savedVectorDocs) && savedVectorDocs.length > 0 && savedVectorDocs.every((d) => Array.isArray(d.embedding) && d.embedding.length > 0)) {
          await vectorStore.rehydrate(savedVectorDocs);
          set({ vectorStoreDocuments: savedVectorDocs, vectorMemoryState: "queued" });
          get().addProgress("Restored AI long-term memory from the saved session.");
        } else {
          const restoredFromIdb = await vectorStore.loadFromStorage();
          if (restoredFromIdb) {
            set({ vectorMemoryState: "queued" });
            get().addProgress("Restored AI long-term memory from local storage.");
          } else {
            void __vitePreload(() => import("./csv_data_analysis_app-agent.js").then((n) => n.cT), true ? __vite__mapDeps([2,0,1,3,4]) : void 0, import.meta.url).then(
              (m) => m.rebuildVectorMemoryFromState({ getState: get, setState: set }, {
                reset: true,
                includeDatasetDocs: true,
                progressMessage: "Rebuilding AI long-term memory from the restored session..."
              })
            );
          }
        }
        if (normalizedAppState.cleaningRun && normalizedAppState.cleaningRun.status !== "completed") {
          set((prev) => ({
            chatHistory: appendUnfinishedCleaningNotice(prev.chatHistory, "session_restore")
          }));
        }
        if (normalizedAppState.csvData) {
          await get().refreshDuckDbSession();
        } else {
          set({ duckDbSessionStatus: createIdleDuckDbSessionStatus() });
        }
      }
      try {
        localStorage.removeItem("csv_agent_emergency_snapshot");
      } catch {
      }
    } finally {
      set({ isAppInitializing: false });
    }
    setTimeout(() => {
      void get().loadReportsList();
    }, 500);
  }
}));
const IconApiKeyRequired = (props) => /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "w-16 h-16 text-slate-400 mb-4", fill: "none", viewBox: "0 0 24 24", strokeWidth: "1.5", stroke: "currentColor", ...props, children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" }) });
const IconFileUpload = (props) => /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { className: "w-16 h-16 text-slate-400 mb-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", xmlns: "http://www.w3.org/2000/svg", ...props, children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", d: "M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V7a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2z" }) });
const IconLoadingSpinner = (props) => {
  const { className, ...rest } = props;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { className: `animate-spin ${className || "h-5 w-5"}`, xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", ...rest, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })
  ] });
};
const FileUpload = () => {
  const {
    handleFileUpload,
    isBusy,
    isApiKeySet,
    progressMessages,
    fileName,
    language,
    cleaningRunStatus,
    aiTaskStatus,
    setIsDebugLogsModalOpen
  } = useAppStore((state) => {
    var _a, _b;
    return {
      handleFileUpload: state.handleFileUpload,
      isBusy: state.isBusy,
      isApiKeySet: state.isApiKeySet,
      progressMessages: state.progressMessages,
      fileName: ((_a = state.csvData) == null ? void 0 : _a.fileName) || null,
      language: state.settings.language,
      cleaningRunStatus: ((_b = state.cleaningRun) == null ? void 0 : _b.status) ?? null,
      aiTaskStatus: state.aiTaskStatus,
      setIsDebugLogsModalOpen: state.setIsDebugLogsModalOpen
    };
  }, shallow$1);
  const openDebugLogs = reactExports.useCallback(() => setIsDebugLogsModalOpen(true), [setIsDebugLogsModalOpen]);
  const [dragActive, setDragActive] = reactExports.useState(false);
  const handleDrag = reactExports.useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isApiKeySet) return;
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, [isApiKeySet]);
  const handleDrop = reactExports.useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (!isApiKeySet) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  }, [handleFileUpload, isApiKeySet]);
  const handleChange = (e) => {
    if (!isApiKeySet) return;
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };
  const apiKeyMessage = shouldAllowSettingsSurface() ? getTranslation("api_key_required_settings_message", language) : getTranslation("api_key_required_managed_message", language);
  const allowManualUpload = shouldShowNewSessionButton();
  const latestProgress = progressMessages[progressMessages.length - 1] ?? null;
  const canOpenLogs = shouldAllowLogsSurface();
  const resolveBusyCard = () => {
    if ((latestProgress == null ? void 0 : latestProgress.type) === "error") {
      return {
        title: getTranslation("upload_status_preparing_title", language),
        detail: latestProgress.text,
        tone: "error"
      };
    }
    if (aiTaskStatus && aiTaskStatus.status !== "done" && aiTaskStatus.status !== "error") {
      return {
        title: getTranslation("upload_status_generating_title", language),
        detail: aiTaskStatus.subtitle || getTranslation("upload_status_generating_detail", language),
        tone: "info"
      };
    }
    if (cleaningRunStatus === "running") {
      return {
        title: getTranslation("upload_status_preparing_title", language),
        detail: (latestProgress == null ? void 0 : latestProgress.text) || getTranslation("upload_status_preparing_detail", language),
        tone: "info"
      };
    }
    return {
      title: getTranslation("upload_status_importing_title", language),
      detail: (latestProgress == null ? void 0 : latestProgress.text) || getTranslation("upload_status_importing_detail", language),
      tone: "info"
    };
  };
  if (isBusy && fileName) {
    const busyCard = resolveBusyCard();
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-full items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `w-full max-w-2xl rounded-card border p-6 shadow-sm ${busyCard.tone === "error" ? "border-red-200 bg-red-50" : "border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50"}`, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center text-slate-900", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(IconLoadingSpinner, { className: "mr-3 h-6 w-6" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xl font-semibold", children: busyCard.title }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 text-sm text-slate-600", children: [
            'Working on "',
            fileName,
            '"'
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: `mt-5 text-sm leading-6 ${busyCard.tone === "error" ? "text-red-700" : "text-slate-600"}`, children: busyCard.detail }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 flex items-center justify-between gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-500", children: getTranslation("data_privacy_note", language) }),
        canOpenLogs && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: openDebugLogs,
            className: "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50",
            children: getTranslation("view_technical_details", language)
          }
        )
      ] })
    ] }) });
  }
  if (!allowManualUpload) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-full items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full max-w-3xl rounded-card border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50 p-8 shadow-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-3xl font-bold tracking-tight text-slate-900", children: getTranslation("managed_reports_welcome_title", language) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-4 max-w-2xl text-base leading-7 text-slate-600", children: getTranslation("managed_reports_welcome_message", language) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 max-w-2xl text-sm leading-6 text-slate-500", children: getTranslation("managed_reports_welcome_detail", language) })
    ] }) });
  }
  if (!isApiKeySet) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-card border-slate-300 h-full", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(IconApiKeyRequired, {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xl font-semibold text-slate-800", children: getTranslation("api_key_required_title", language) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 max-w-sm text-center text-slate-500", children: apiKeyMessage }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-6 text-xs text-slate-400", children: getTranslation("data_privacy_note", language) })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      onDragEnter: handleDrag,
      onDragLeave: handleDrag,
      onDragOver: handleDrag,
      onDrop: handleDrop,
      className: `flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-card transition-colors duration-300 h-full ${dragActive ? "border-blue-500 bg-slate-100" : "border-slate-300 hover:border-blue-500"}`,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(IconFileUpload, {}),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xl text-slate-500 mb-2", children: getTranslation("file_upload_drag_drop", language) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-400", children: getTranslation("file_upload_or", language) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "file-upload", className: "mt-4 cursor-pointer bg-blue-600 text-white font-bold py-2 px-4 rounded-card hover:bg-blue-700 transition-colors", children: getTranslation("file_upload_select", language) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { id: "file-upload", type: "file", accept: ".csv", onChange: handleChange, className: "hidden", disabled: isBusy }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-4 text-xs text-slate-500", children: getTranslation("data_privacy_note", language) })
      ]
    }
  );
};
const IconNew = () => /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" }) });
const IconHistory = () => /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" }) });
const IconShowAssistant = () => /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" }) });
const IconChangeGoal = (props) => /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5", viewBox: "0 0 20 20", fill: "currentColor", ...props, children: [
  /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" }),
  /* @__PURE__ */ jsxRuntimeExports.jsx("path", { fillRule: "evenodd", d: "M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z", clipRule: "evenodd" })
] });
const IconCode = (props) => /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5 mr-2", viewBox: "0 0 20 20", fill: "currentColor", ...props, children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { fillRule: "evenodd", d: "M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z", clipRule: "evenodd" }) });
const AppHeader = () => {
  const primaryButtonClass = "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium leading-none transition-colors";
  const secondaryButtonClass = `${primaryButtonClass} border border-slate-300 bg-white text-slate-700 hover:bg-slate-100`;
  const {
    onNewSession,
    onOpenHistory,
    onOpenDatabase,
    onOpenWorkflow,
    onOpenLogs,
    isAsideVisible,
    onShowAssistant,
    confirmedAnalysisGoal,
    reproposeAnalysisGoals,
    showAnalysisTools
  } = useAppStore(
    (state) => ({
      onNewSession: state.handleNewSession,
      onOpenHistory: () => {
        state.loadReportsListIfNeeded();
        state.setIsHistoryPanelOpen(true);
      },
      onOpenDatabase: () => state.setIsDatabaseModalOpen(true),
      onOpenWorkflow: () => state.setIsDataPreparationModalOpen(true),
      onOpenLogs: () => state.setIsDebugLogsModalOpen(true),
      isAsideVisible: state.isAsideVisible,
      onShowAssistant: () => state.setIsAsideVisible(true),
      confirmedAnalysisGoal: state.confirmedAnalysisGoal,
      reproposeAnalysisGoals: state.reproposeAnalysisGoals,
      showAnalysisTools: Boolean(state.csvData)
    }),
    shallow$1
  );
  const showNewSessionButton = shouldShowNewSessionButton();
  const showHistoryButton = shouldShowHistoryButton();
  const showDatabaseButton = shouldShowDatabaseButton();
  const showWorkflowButton = shouldShowWorkflowButton();
  const showLogsButton = shouldShowLogsButton();
  const showChangeGoalButton = shouldShowChangeGoalButton();
  const showAssistantToggleButton = shouldShowAssistantToggleButton();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "header",
    {
      "data-app-header-root": "true",
      className: "flex flex-col gap-2 px-0 py-2 sm:flex-row sm:items-center sm:justify-between",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-w-xs", children: /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-xl font-extrabold text-slate-900 leading-tight", children: "AI Analysis" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center justify-end gap-2", children: [
          showNewSessionButton && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: onNewSession,
              className: `${primaryButtonClass} bg-blue-600 text-white hover:bg-blue-700`,
              title: "Start a new analysis session",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(IconNew, {}),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "hidden sm:inline", children: "New" })
              ]
            }
          ),
          showHistoryButton && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: onOpenHistory,
              className: secondaryButtonClass,
              title: "View analysis history",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(IconHistory, {}),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "hidden sm:inline", children: "History" })
              ]
            }
          ),
          showDatabaseButton && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: onOpenDatabase,
              className: secondaryButtonClass,
              title: "Explore the cleaned dataset with bounded queries",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(IconCode, { className: "h-5 w-5 m-0" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Data Explorer" })
              ]
            }
          ),
          showAnalysisTools && showWorkflowButton && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: onOpenWorkflow,
              className: secondaryButtonClass,
              title: "Open the fullscreen data preparation workflow",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(IconCode, { className: "h-5 w-5 m-0" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Workflow" })
              ]
            }
          ),
          showAnalysisTools && showLogsButton && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: onOpenLogs,
              className: secondaryButtonClass,
              title: "Open runtime logs for debugging",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(IconCode, { className: "h-5 w-5 m-0" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Logs" })
              ]
            }
          ),
          confirmedAnalysisGoal && showChangeGoalButton && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: reproposeAnalysisGoals,
              className: secondaryButtonClass,
              title: "Change current analysis goal",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(IconChangeGoal, {}),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "hidden sm:inline", children: "Change Goal" })
              ]
            }
          ),
          !isAsideVisible && showAssistantToggleButton && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: onShowAssistant,
              className: `${primaryButtonClass} bg-blue-600 text-white hover:bg-blue-700`,
              "aria-label": "Show Assistant Panel",
              title: "Show Assistant Panel",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconShowAssistant, {})
            }
          )
        ] })
      ]
    }
  );
};
const AUTOSAVE_DEBOUNCE_MS = 1500;
const STORAGE_HEALTH_CHECK_INTERVAL_MS = 5 * 60 * 1e3;
const AutoSaveManager = () => {
  const lastSavedSignatureRef = reactExports.useRef(null);
  const timeoutRef = reactExports.useRef(null);
  const isSavingRef = reactExports.useRef(false);
  const pendingFlushRef = reactExports.useRef(false);
  const lastSaveErrorRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const flushSave = async () => {
      var _a;
      const state = useAppStore.getState();
      const stateToSave = buildPersistedAppState(state);
      const nextSignature = buildPersistedAppStateSignature(state);
      if (!nextSignature || nextSignature === lastSavedSignatureRef.current) {
        return;
      }
      if (isSavingRef.current) {
        pendingFlushRef.current = true;
        return;
      }
      isSavingRef.current = true;
      try {
        const currentReport = buildPersistedReportRecord(state, {
          id: state.sessionId,
          filename: ((_a = state.csvData) == null ? void 0 : _a.fileName) || "Current Session"
        });
        currentReport.appState = stateToSave;
        await saveReport(currentReport);
        await saveReport({
          ...currentReport,
          // Keep a shared alias for the latest working session snapshot without
          // letting it define tab identity during init/restore.
          id: CURRENT_SESSION_KEY
        });
        lastSavedSignatureRef.current = nextSignature;
        lastSaveErrorRef.current = null;
        if (!state.sessionCreatedAt) {
          useAppStore.setState({ sessionCreatedAt: currentReport.createdAt });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (lastSaveErrorRef.current !== message) {
          state.addProgress(`Autosave failed: ${message}`, "error");
          lastSaveErrorRef.current = message;
        }
      } finally {
        isSavingRef.current = false;
        if (pendingFlushRef.current) {
          pendingFlushRef.current = false;
          void flushSave();
        }
      }
    };
    const scheduleSave = (delay = AUTOSAVE_DEBOUNCE_MS) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        void flushSave();
      }, delay);
    };
    const flushImmediately = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      void flushSave();
    };
    const emergencySyncSnapshot = () => {
      var _a;
      try {
        const state = useAppStore.getState();
        if (!state.sessionId || !state.csvData) return;
        const snapshot = {
          sessionId: state.sessionId,
          fileName: state.csvData.fileName,
          currentView: state.currentView,
          aiTaskStatus: state.aiTaskStatus,
          initialAnalysisStatus: state.initialAnalysisStatus,
          goalState: state.goalState,
          pipelineOutcome: ((_a = state.pipelineOutcome) == null ? void 0 : _a.status) ?? null,
          cardCount: state.analysisCards.length,
          chatCount: state.chatHistory.length,
          savedAt: Date.now()
        };
        localStorage.setItem("csv_agent_emergency_snapshot", JSON.stringify(snapshot));
      } catch {
      }
    };
    lastSavedSignatureRef.current = buildPersistedAppStateSignature(useAppStore.getState());
    const unsubscribe = useAppStore.subscribe((state) => {
      const nextSignature = buildPersistedAppStateSignature(state);
      if (!nextSignature || nextSignature === lastSavedSignatureRef.current) {
        return;
      }
      scheduleSave();
    });
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushImmediately();
      }
    };
    const handleBeforeUnload = () => {
      emergencySyncSnapshot();
      flushImmediately();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    const runHealthCheck = async () => {
      const sessionId = useAppStore.getState().sessionId;
      const { evictedReports } = await checkStorageHealth(sessionId);
      if (evictedReports > 0) {
        useAppStore.getState().addProgress(
          `Storage cleanup: removed ${evictedReports} old report(s) to free space.`,
          "warning"
        );
      }
    };
    const healthCheckInterval = setInterval(() => {
      void runHealthCheck();
    }, STORAGE_HEALTH_CHECK_INTERVAL_MS);
    void runHealthCheck();
    return () => {
      unsubscribe();
      clearInterval(healthCheckInterval);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);
  return null;
};
const listeners = /* @__PURE__ */ new Set();
const seenPayloadIds = /* @__PURE__ */ new Set();
let lastEvent = null;
let initialized = false;
const PENDING_QUERY_KEY = "pendingPayloadKey";
let hasExternalPayloadPending = false;
const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";
const sanitizeHeaderForFileName = (raw) => {
  if (!raw) return "";
  const firstLine = raw.split(/\r?\n/)[0] ?? raw;
  return firstLine.trim();
};
const buildEventId = () => createId("csv-event");
const hashCsvPayload = (csv, header) => {
  const input = `${header ?? ""}
${csv}`;
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `csv-payload-${(hash >>> 0).toString(36)}`;
};
const emitEvent = (event) => {
  if (seenPayloadIds.has(event.payloadId)) {
    console.debug("[ExternalCsvBridge] Ignored duplicate external CSV payload.", {
      payloadId: event.payloadId,
      transport: event.meta.transport
    });
    return;
  }
  seenPayloadIds.add(event.payloadId);
  lastEvent = event;
  listeners.forEach((listener) => listener(event));
};
const normalizePayload = (data, transport, pendingKey) => {
  if (!data || typeof data !== "object") return null;
  if (data.type !== "table_csv") return null;
  if (typeof data.csv !== "string" || !data.csv.trim()) return null;
  const payloadId = typeof data.payloadId === "string" && data.payloadId.trim() ? data.payloadId.trim() : hashCsvPayload(data.csv, typeof data.header === "string" ? data.header : void 0);
  return {
    payload: {
      csv: data.csv,
      header: typeof data.header === "string" ? sanitizeHeaderForFileName(data.header) : void 0
    },
    payloadId,
    meta: {
      transport,
      receivedAt: Date.now(),
      pendingKey
    },
    eventId: buildEventId()
  };
};
const recoverSessionPayload = (pendingKey) => {
  if (!isBrowser) return null;
  const stores = [];
  try {
    if (window.sessionStorage) stores.push([window.sessionStorage, "sessionStorage"]);
  } catch {
  }
  try {
    if (window.localStorage) stores.push([window.localStorage, "localStorage"]);
  } catch {
  }
  for (const [store, transport] of stores) {
    try {
      const raw = store.getItem(pendingKey);
      if (!raw) continue;
      store.removeItem(pendingKey);
      const parsed = JSON.parse(raw);
      const event = normalizePayload(parsed, transport, pendingKey);
      if (event) return event;
    } catch (error) {
      console.error(`[ExternalCsvBridge] Failed to recover payload from ${transport}:`, error);
    }
  }
  return null;
};
const notifyOpenerReady = () => {
  if (!isBrowser) return;
  const targetOrigin = window.location.origin;
  if (!window.opener || window.opener === window) return;
  try {
    window.opener.postMessage({ type: "ready" }, targetOrigin);
  } catch (error) {
    console.warn("[ExternalCsvBridge] Unable to notify opener about readiness:", error);
  }
};
const handlePostMessage = (event) => {
  if (!isBrowser) return;
  if (event.origin !== window.location.origin) return;
  const normalized = normalizePayload(event.data, "postMessage");
  if (normalized) {
    emitEvent(normalized);
  }
};
const removePendingQueryParam = () => {
  if (!isBrowser) return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has(PENDING_QUERY_KEY)) return;
  url.searchParams.delete(PENDING_QUERY_KEY);
  const newUrl = `${url.pathname}${url.searchParams.toString() ? `?${url.searchParams.toString()}` : ""}${url.hash}`;
  window.history.replaceState({}, document.title, newUrl);
};
const initExternalCsvBridge = () => {
  if (!isBrowser || initialized) return;
  initialized = true;
  const params = new URLSearchParams(window.location.search);
  const pendingKey = params.get(PENDING_QUERY_KEY);
  let recoveredFromStorage = false;
  if (pendingKey) {
    hasExternalPayloadPending = true;
    const sessionEvent = recoverSessionPayload(pendingKey);
    if (sessionEvent) {
      recoveredFromStorage = true;
      emitEvent(sessionEvent);
    } else {
      console.warn("[ExternalCsvBridge] Pending payload key found but no data restored.");
    }
    removePendingQueryParam();
  }
  if (!recoveredFromStorage) {
    if (document.readyState === "complete" || document.readyState === "interactive") {
      notifyOpenerReady();
    } else {
      window.addEventListener("DOMContentLoaded", notifyOpenerReady, { once: true });
    }
    window.addEventListener("message", handlePostMessage);
  }
};
const subscribeToExternalCsvPayload = (listener) => {
  listeners.add(listener);
  if (lastEvent) {
    listener(lastEvent);
  }
  return () => {
    listeners.delete(listener);
  };
};
const externalCsvBridge = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  get hasExternalPayloadPending() {
    return hasExternalPayloadPending;
  },
  initExternalCsvBridge,
  subscribeToExternalCsvPayload
}, Symbol.toStringTag, { value: "Module" }));
const ExternalPayloadListener = () => {
  const ingestExternalCsvPayload = useAppStore((state) => state.ingestExternalCsvPayload);
  const isAppInitializing = useAppStore((state) => state.isAppInitializing);
  const processedPayloadIdsRef = reactExports.useRef(/* @__PURE__ */ new Set());
  reactExports.useEffect(() => {
    if (!ingestExternalCsvPayload) return;
    if (hasExternalPayloadPending && isAppInitializing) return;
    const unsubscribe = subscribeToExternalCsvPayload((event) => {
      const processedPayloadIds = processedPayloadIdsRef.current;
      if (processedPayloadIds.has(event.payloadId)) return;
      processedPayloadIds.add(event.payloadId);
      ingestExternalCsvPayload(event);
    });
    return () => {
      unsubscribe();
    };
  }, [ingestExternalCsvPayload, isAppInitializing]);
  return null;
};
const IconWarning = ({ className }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  "svg",
  {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      "path",
      {
        d: "M12 9v4m0 4h.01M10.29 3.86 1.82 18a1 1 0 0 0 .86 1.5h18.64a1 1 0 0 0 .86-1.5L13.71 3.86a1 1 0 0 0-1.72 0Z",
        stroke: "currentColor",
        strokeWidth: "1.5",
        strokeLinecap: "round",
        strokeLinejoin: "round"
      }
    )
  }
);
class ErrorBoundary extends We.Component {
  constructor() {
    super(...arguments);
    this.state = {
      hasError: false
    };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error in component:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      const { language } = this.props;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-red-50 border border-red-200 rounded-card p-4 shadow-sm text-red-800", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center mb-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(IconWarning, { className: "w-5 h-5 mr-2" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold text-sm uppercase tracking-wide", children: getTranslation("error_boundary_title", language) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm", children: getTranslation("error_boundary_message", language) }),
        this.state.error && /* @__PURE__ */ jsxRuntimeExports.jsxs("pre", { className: "mt-2 text-xs bg-red-100 p-2 rounded overflow-auto", children: [
          this.state.error.name,
          ": ",
          this.state.error.message
        ] })
      ] });
    }
    return this.props.children;
  }
}
const SCROLL_DELTA_THRESHOLD = 10;
const TOP_REVEAL_THRESHOLD = 12;
const useAutoHideHeader = ({
  scrollContainerRef
}) => {
  const headerRef = reactExports.useRef(null);
  const lastScrollTopRef = reactExports.useRef(0);
  const forcedHiddenTimeoutRef = reactExports.useRef(null);
  const [headerHeight, setHeaderHeight] = reactExports.useState(0);
  const [isHeaderHidden, setIsHeaderHidden] = reactExports.useState(false);
  reactExports.useEffect(() => {
    const headerElement = headerRef.current;
    if (!headerElement) {
      return;
    }
    const updateHeaderHeight = () => {
      setHeaderHeight(headerElement.getBoundingClientRect().height);
    };
    updateHeaderHeight();
    const resizeObserver = new ResizeObserver(() => {
      updateHeaderHeight();
    });
    resizeObserver.observe(headerElement);
    return () => {
      resizeObserver.disconnect();
    };
  }, []);
  reactExports.useEffect(() => {
    const handleTemporaryHide = (event) => {
      var _a;
      const customEvent = event;
      const durationMs = ((_a = customEvent.detail) == null ? void 0 : _a.durationMs) ?? 1200;
      if (forcedHiddenTimeoutRef.current !== null) {
        window.clearTimeout(forcedHiddenTimeoutRef.current);
      }
      setIsHeaderHidden(true);
      forcedHiddenTimeoutRef.current = window.setTimeout(() => {
        setIsHeaderHidden(false);
        forcedHiddenTimeoutRef.current = null;
      }, durationMs);
    };
    window.addEventListener(APP_HEADER_HIDE_FOR_CARD_NAVIGATION_EVENT, handleTemporaryHide);
    return () => {
      window.removeEventListener(APP_HEADER_HIDE_FOR_CARD_NAVIGATION_EVENT, handleTemporaryHide);
      if (forcedHiddenTimeoutRef.current !== null) {
        window.clearTimeout(forcedHiddenTimeoutRef.current);
      }
    };
  }, []);
  reactExports.useEffect(() => {
    const scrollElement = scrollContainerRef.current;
    if (!scrollElement) {
      return;
    }
    const onScroll = () => {
      const scrollTop = scrollElement.scrollTop;
      const delta = scrollTop - lastScrollTopRef.current;
      if (forcedHiddenTimeoutRef.current !== null) {
        lastScrollTopRef.current = scrollTop;
        return;
      }
      if (scrollTop <= TOP_REVEAL_THRESHOLD) {
        setIsHeaderHidden(false);
        lastScrollTopRef.current = scrollTop;
        return;
      }
      if (Math.abs(delta) < SCROLL_DELTA_THRESHOLD) {
        return;
      }
      if (delta > 0 && scrollTop > headerHeight) {
        setIsHeaderHidden(true);
      } else if (delta < 0) {
        setIsHeaderHidden(false);
      }
      lastScrollTopRef.current = scrollTop;
    };
    lastScrollTopRef.current = scrollElement.scrollTop;
    scrollElement.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scrollElement.removeEventListener("scroll", onScroll);
    };
  }, [headerHeight, scrollContainerRef]);
  return {
    headerRef,
    headerHeight,
    isHeaderHidden
  };
};
const STALE_CHUNK_RELOAD_KEY = "csv-data-analysis:stale-chunk-reload";
const RELOAD_COOLDOWN_MS = 15e3;
function readReloadMarker(storage) {
  try {
    const raw = storage.getItem(STALE_CHUNK_RELOAD_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (typeof parsed.href !== "string" || typeof parsed.at !== "number") {
      return null;
    }
    return { href: parsed.href, at: parsed.at };
  } catch {
    return null;
  }
}
function writeReloadMarker(storage, href, now) {
  try {
    storage.setItem(STALE_CHUNK_RELOAD_KEY, JSON.stringify({ href, at: now }));
  } catch {
  }
}
function readErrorMessage(reason) {
  if (typeof reason === "string") {
    return reason;
  }
  if (!reason || typeof reason !== "object") {
    return "";
  }
  if ("message" in reason && typeof reason.message === "string") {
    return reason.message;
  }
  if ("reason" in reason) {
    return readErrorMessage(reason.reason);
  }
  if ("payload" in reason) {
    return readErrorMessage(reason.payload);
  }
  if ("detail" in reason) {
    return readErrorMessage(reason.detail);
  }
  return "";
}
function isRecoverableChunkLoadError(reason) {
  const message = readErrorMessage(reason).trim();
  if (!message) {
    return false;
  }
  return message.includes("Failed to fetch dynamically imported module") || message.includes("Importing a module script failed") || message.includes("ChunkLoadError") || message.includes("Loading chunk");
}
function shouldReloadForStaleChunk(storage, href, now) {
  const lastReload = readReloadMarker(storage);
  if (lastReload && lastReload.href === href && now - lastReload.at < RELOAD_COOLDOWN_MS) {
    return false;
  }
  writeReloadMarker(storage, href, now);
  return true;
}
function installStaleChunkRecovery(targetWindow = window) {
  const recover = (reason) => {
    if (!isRecoverableChunkLoadError(reason)) {
      return;
    }
    const canReload = shouldReloadForStaleChunk(
      targetWindow.sessionStorage,
      targetWindow.location.href,
      Date.now()
    );
    if (!canReload) {
      console.error("Dynamic import failed after a recent stale chunk reload attempt.", reason);
      return;
    }
    targetWindow.location.reload();
  };
  const handlePreloadError = (event) => {
    var _a;
    const preloadEvent = event;
    const payload = preloadEvent.payload ?? preloadEvent.detail;
    if (!isRecoverableChunkLoadError(payload)) {
      return;
    }
    (_a = event.preventDefault) == null ? void 0 : _a.call(event);
    recover(payload);
  };
  const handleUnhandledRejection = (event) => {
    if (!isRecoverableChunkLoadError(event.reason)) {
      return;
    }
    event.preventDefault();
    recover(event.reason);
  };
  targetWindow.addEventListener("vite:preloadError", handlePreloadError);
  targetWindow.addEventListener("unhandledrejection", handleUnhandledRejection);
  return () => {
    targetWindow.removeEventListener("vite:preloadError", handlePreloadError);
    targetWindow.removeEventListener("unhandledrejection", handleUnhandledRejection);
  };
}
const GlobalErrorToast = ({
  toast,
  language,
  onDismiss,
  onStartOver
}) => {
  const [isDetailExpanded, setIsDetailExpanded] = reactExports.useState(false);
  const handleDismiss = () => {
    setIsDetailExpanded(false);
    onDismiss();
  };
  const handleStartOver = () => {
    setIsDetailExpanded(false);
    onStartOver();
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      role: "alert",
      "aria-live": "assertive",
      className: "fixed bottom-4 right-4 z-[9999] w-80 rounded-lg border border-amber-300 bg-amber-50 shadow-lg p-4",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-amber-900 leading-snug flex-1", children: toast.message }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: handleDismiss,
              className: "shrink-0 text-amber-600 hover:text-amber-900 text-lg leading-none",
              "aria-label": "close",
              children: "×"
            }
          )
        ] }),
        toast.errorSummary && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => setIsDetailExpanded((v) => !v),
            className: "mt-1 text-xs text-amber-600 hover:underline",
            children: getTranslation(isDetailExpanded ? "error_detail_hide" : "error_detail_show", language)
          }
        ),
        isDetailExpanded && toast.errorSummary && /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "mt-1 text-xs bg-amber-100 rounded p-2 overflow-auto max-h-24 text-amber-800 whitespace-pre-wrap break-all", children: toast.errorSummary }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: handleStartOver,
              className: "flex-1 rounded bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700",
              children: getTranslation("global_error_restart_button", language)
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: handleDismiss,
              className: "flex-1 rounded border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100",
              children: getTranslation("global_error_dismiss_button", language)
            }
          )
        ] })
      ]
    }
  );
};
const ChatPanel = reactExports.lazy(() => __vitePreload(() => import("./csv_data_analysis_ChatPanel.js"), true ? __vite__mapDeps([5,6,2,1,0,3,4,7,8,9,10,11]) : void 0, import.meta.url).then((m) => ({ default: m.ChatPanel })));
const AnalysisPanel = reactExports.lazy(() => __vitePreload(() => import("./csv_data_analysis_AnalysisPanel.js"), true ? __vite__mapDeps([12,6,2,1,0,3,4,7,8,9,13,14,15,16,10]) : void 0, import.meta.url).then((m) => ({ default: m.AnalysisPanel })));
const SpreadsheetPanel = reactExports.lazy(() => __vitePreload(() => import("./csv_data_analysis_SpreadsheetPanel.js"), true ? __vite__mapDeps([17,6,2,1,0,3,4,14,9,13,11,7,15]) : void 0, import.meta.url).then((m) => ({ default: m.SpreadsheetPanel })));
const SettingsModal = reactExports.lazy(() => __vitePreload(() => import("./csv_data_analysis_SettingsModal.js"), true ? __vite__mapDeps([18,6,2,1,0,3,4,7]) : void 0, import.meta.url).then((module) => ({ default: module.SettingsModal })));
const HistoryPanel = reactExports.lazy(() => __vitePreload(() => import("./csv_data_analysis_HistoryPanel.js"), true ? __vite__mapDeps([19,6,2,1,0,3,4,7,13]) : void 0, import.meta.url).then((module) => ({ default: module.HistoryPanel })));
const MemoryPanel = reactExports.lazy(() => __vitePreload(() => import("./csv_data_analysis_MemoryPanel.js"), true ? __vite__mapDeps([20,6,2,1,0,3,4,13,7]) : void 0, import.meta.url).then((module) => ({ default: module.MemoryPanel })));
const AgentMonitorModal = reactExports.lazy(() => __vitePreload(() => import("./csv_data_analysis_AgentMonitorModal.js"), true ? __vite__mapDeps([21,6,2,1,0,3,4,7,13,16,10]) : void 0, import.meta.url).then((module) => ({ default: module.AgentMonitorModal })));
const DatabaseModal = reactExports.lazy(() => __vitePreload(() => import("./csv_data_analysis_DatabaseModal.js"), true ? __vite__mapDeps([22,6,2,1,0,3,4,7,14,9,13]) : void 0, import.meta.url).then((module) => ({ default: module.DatabaseModal })));
const WorkspaceModal = reactExports.lazy(() => __vitePreload(() => import("./csv_data_analysis_WorkspaceModal.js"), true ? __vite__mapDeps([23,2,0,1,3,4,6,7,13]) : void 0, import.meta.url).then((module) => ({ default: module.WorkspaceModal })));
const DataPreparationWorkflowModal = reactExports.lazy(() => __vitePreload(() => import("./csv_data_analysis_DataPreparationWorkflowModal.js"), true ? __vite__mapDeps([24,6,2,1,0,3,4,7,25,13]) : void 0, import.meta.url).then((module) => ({ default: module.DataPreparationWorkflowModal })));
const DebugLogsModal = reactExports.lazy(() => __vitePreload(() => import("./csv_data_analysis_DebugLogsModal.js"), true ? __vite__mapDeps([26,6,2,1,0,3,4,7,25,13]) : void 0, import.meta.url).then((module) => ({ default: module.DebugLogsModal })));
const ReportBoundaryConfirmModal = reactExports.lazy(() => __vitePreload(() => import("./csv_data_analysis_ReportBoundaryConfirmModal.js"), true ? __vite__mapDeps([27,6,2,1,0,3,4,7]) : void 0, import.meta.url).then((module) => ({ default: module.ReportBoundaryConfirmModal })));
const ApiKeyRequiredModal = reactExports.lazy(() => __vitePreload(() => import("./csv_data_analysis_ApiKeyRequiredModal.js"), true ? __vite__mapDeps([28,6,2,1,0,3,4,7]) : void 0, import.meta.url).then((module) => ({ default: module.ApiKeyRequiredModal })));
const SpreadsheetPanelGate = We.memo(({ isVisible }) => {
  const isPipelineActive = useAppStore((state) => {
    const task = state.aiTaskStatus;
    const isTaskRunning = Boolean(task && task.status !== "done" && task.status !== "error");
    const isSummaryPending = state.analysisCards.length > 0 && !state.finalSummary;
    return isTaskRunning || isSummaryPending;
  });
  const prevActiveRef = reactExports.useRef(isPipelineActive);
  reactExports.useEffect(() => {
    if (prevActiveRef.current && !isPipelineActive) {
      useAppStore.getState().setIsSpreadsheetVisible(false);
    }
    prevActiveRef.current = isPipelineActive;
  }, [isPipelineActive]);
  if (isPipelineActive) {
    return null;
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(SpreadsheetPanel, { isVisible }, "spreadsheet");
});
const App = () => {
  const {
    init,
    currentView,
    csvData,
    isAppInitializing,
    isAsideVisible,
    asideWidth,
    isResizing,
    handleAsideMouseDown,
    isSpreadsheetVisible,
    isSettingsModalOpen,
    isHistoryPanelOpen,
    isDatabaseModalOpen,
    isWorkspaceModalOpen,
    isDataPreparationModalOpen,
    isDebugLogsModalOpen,
    isMemoryPanelOpen,
    isAgentModalOpen,
    isReportBoundaryConfirmModalOpen,
    isApiKeyRequiredModalOpen,
    language,
    globalErrorToast,
    setGlobalErrorToast
  } = useAppStore(
    (state) => ({
      init: state.init,
      currentView: state.currentView,
      csvData: state.csvData,
      isAppInitializing: state.isAppInitializing,
      isAsideVisible: state.isAsideVisible,
      asideWidth: state.asideWidth,
      isResizing: state.isResizing,
      handleAsideMouseDown: state.handleAsideMouseDown,
      isSpreadsheetVisible: state.isSpreadsheetVisible,
      isSettingsModalOpen: state.isSettingsModalOpen,
      isHistoryPanelOpen: state.isHistoryPanelOpen,
      isDatabaseModalOpen: state.isDatabaseModalOpen,
      isWorkspaceModalOpen: state.isWorkspaceModalOpen,
      isDataPreparationModalOpen: state.isDataPreparationModalOpen,
      isDebugLogsModalOpen: state.isDebugLogsModalOpen,
      isMemoryPanelOpen: state.isMemoryPanelOpen,
      isAgentModalOpen: state.isAgentModalOpen,
      isReportBoundaryConfirmModalOpen: state.isReportBoundaryConfirmModalOpen,
      isApiKeyRequiredModalOpen: state.isApiKeyRequiredModalOpen,
      language: state.settings.language,
      globalErrorToast: state.globalErrorToast,
      setGlobalErrorToast: state.setGlobalErrorToast
    }),
    shallow$1
  );
  const setIsAsideVisible = useAppStore((state) => state.setIsAsideVisible);
  const handleNewSession = useAppStore((state) => state.handleNewSession);
  const logTelemetryEvent = useAppStore((state) => state.logTelemetryEvent);
  reactExports.useEffect(() => {
    void init();
  }, [init]);
  reactExports.useEffect(() => {
    const handleUnhandledRejection = (event) => {
      if (isRecoverableChunkLoadError(event.reason)) return;
      const userError = formatUserError(event.reason, { surface: "general", language });
      console.error("[App] Unhandled promise rejection caught by global error boundary:", event.reason);
      logTelemetryEvent({
        stage: "executor_error",
        responseType: "unhandled_rejection",
        detail: userError.technicalDetail
      });
      setGlobalErrorToast({
        // Combine message + suggestion so the toast body is complete
        message: userError.fullText,
        errorSummary: userError.technicalDetail
      });
    };
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => window.removeEventListener("unhandledrejection", handleUnhandledRejection);
  }, [language, logTelemetryEvent, setGlobalErrorToast]);
  const showAgentThinking = shouldShowAgentThinkingModal();
  const showLongTermMemory = shouldShowLongTermMemory();
  const canUseSettingsSurface = shouldAllowSettingsSurface();
  const canUseDatabaseSurface = shouldAllowDatabaseSurface();
  const canUseWorkspaceSurface = shouldAllowWorkspaceSurface();
  const canUseWorkflowSurface = shouldAllowWorkflowSurface();
  const canUseLogsSurface = shouldAllowLogsSurface();
  const canUseAgentThinkingSurface = shouldAllowAgentThinkingSurface();
  const canUseLongTermMemorySurface = shouldAllowLongTermMemorySurface();
  const scrollContainerRef = reactExports.useRef(null);
  const { headerRef, headerHeight, isHeaderHidden } = useAutoHideHeader({ scrollContainerRef });
  const renderMainContent = () => {
    if (isAppInitializing) {
      return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-full items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center text-slate-500", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(IconLoadingSpinner, { className: "mr-2" }),
        " Restoring workspace..."
      ] }) });
    }
    if (currentView === "file_upload" || !csvData) {
      return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-full", children: /* @__PURE__ */ jsxRuntimeExports.jsx(FileUpload, {}) });
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx(ErrorBoundary, { language, children: /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Suspense, { fallback: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-full items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center text-slate-500", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(IconLoadingSpinner, { className: "mr-2" }),
      " Loading workspace..."
    ] }) }), children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(AnalysisPanel, {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-8", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SpreadsheetPanelGate, { isVisible: isSpreadsheetVisible }) })
    ] }) }) });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col md:flex-row h-screen bg-slate-50 text-slate-800", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalPayloadListener, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx(AutoSaveManager, {}),
    globalErrorToast && /* @__PURE__ */ jsxRuntimeExports.jsx(
      GlobalErrorToast,
      {
        toast: globalErrorToast,
        language,
        onDismiss: () => setGlobalErrorToast(null),
        onStartOver: () => {
          setGlobalErrorToast(null);
          void handleNewSession();
        }
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(reactExports.Suspense, { fallback: null, children: [
      canUseSettingsSurface && isSettingsModalOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(SettingsModal, {}),
      showAgentThinking && canUseAgentThinkingSurface && isAgentModalOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(AgentMonitorModal, {}),
      isHistoryPanelOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(HistoryPanel, {}),
      canUseDatabaseSurface && isDatabaseModalOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(DatabaseModal, {}),
      canUseWorkspaceSurface && isWorkspaceModalOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(WorkspaceModal, {}),
      canUseWorkflowSurface && isDataPreparationModalOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(DataPreparationWorkflowModal, {}),
      isReportBoundaryConfirmModalOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(ReportBoundaryConfirmModal, {}),
      isApiKeyRequiredModalOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(ApiKeyRequiredModal, {}),
      canUseLogsSurface && isDebugLogsModalOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(DebugLogsModal, {}),
      showLongTermMemory && canUseLongTermMemorySurface && isMemoryPanelOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(MemoryPanel, {})
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "relative flex flex-1 flex-col overflow-hidden px-4 pb-4 pt-0", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        id: "app-main-scroll-container",
        ref: scrollContainerRef,
        className: "min-h-0 flex-1 overflow-y-auto",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              ref: headerRef,
              className: "sticky top-0 z-20 bg-slate-50 pb-4 transition-transform duration-200",
              style: { transform: isHeaderHidden ? `translateY(-${headerHeight}px)` : "translateY(0)" },
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(AppHeader, {})
            }
          ),
          renderMainContent()
        ]
      }
    ) }),
    isAsideVisible && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          onMouseDown: handleAsideMouseDown,
          onDoubleClick: () => setIsAsideVisible(false),
          className: "hidden md:flex group items-center justify-center w-2.5 cursor-col-resize",
          title: "Drag to resize, double-click to hide",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: `w-0.5 h-8 bg-slate-300 rounded-full transition-colors duration-200 group-hover:bg-brand-secondary ${isResizing ? "!bg-blue-600" : ""}`
            }
          )
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("aside", { className: "w-full md:w-auto bg-white flex flex-col h-full border-l border-slate-200", style: { width: asideWidth }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Suspense, { fallback: null, children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChatPanel, {}) }) })
    ] })
  ] });
};
initExternalCsvBridge();
installStaleChunkRecovery();
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}
const root = ReactDOM.createRoot(rootElement);
root.render(
  /* @__PURE__ */ jsxRuntimeExports.jsx(We.StrictMode, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(App, {}) })
);
export {
  ErrorBoundary as E,
  IconWarning as I,
  computeDataContentHash as a,
  IconLoadingSpinner as b,
  computeChartCacheKey as c,
  IconApiKeyRequired as d,
  getCachedChart as g,
  setCachedChart as s,
  useAppStore as u
};
