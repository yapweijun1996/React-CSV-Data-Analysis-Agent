import type { MouseEvent as ReactMouseEvent } from 'react';
import type {
    AnalysisCardData,
    AnalysisPlan,
    AppState,
    CardContext,
    ChartType,
    ClarificationOption,
    CsvData,
    ExternalCsvPayload,
    DomAction,
    MemoryReference,
    Report,
    ReportListItem,
    Settings,
    AgentActionStatus,
    AgentActionType,
    AgentActionSource,
    PendingDataTransform,
    AppliedDataTransformRecord,
    SelectionDrilldownFilter,
    AgentActionTrace,
    AgentObservation,
    AgentPlanState,
    AgentPlanStep,
    AgentPhase,
    AgentPromptMetric,
    LlmUsageEntry,
    QuickActionId,
} from '../types';
import type { ProfileResult } from '../services/dataToolTypes';

export interface StoreState extends AppState {
    busyRunId: string | null;
    isCancellationRequested: boolean;
    aiFilterRunId: string | null;
    abortControllers: Record<string, AbortController[]>;
    isAsideVisible: boolean;
    asideWidth: number;
    isSpreadsheetVisible: boolean;
    isDataPrepDebugVisible: boolean;
    isSettingsModalOpen: boolean;
    isHistoryPanelOpen: boolean;
    isMemoryPanelOpen: boolean;
    chatMemoryPreview: MemoryReference[];
    chatMemoryExclusions: string[];
    chatMemoryPreviewQuery: string;
    isMemoryPreviewLoading: boolean;
    isAiFiltering: boolean;
    settings: Settings;
    reportsList: ReportListItem[];
    isResizing: boolean;
    isApiKeySet: boolean;
    pendingDataTransform: PendingDataTransform | null;
    lastAppliedDataTransform: AppliedDataTransformRecord | null;
    isLastAppliedDataTransformBannerDismissed: boolean;
    interactiveSelectionFilter: SelectionDrilldownFilter | null;
    agentPromptMetrics: AgentPromptMetric[];
    aggregationModePreference: 'sample' | 'full';
}

export interface StoreActions {
    beginBusy: (message: string, options?: { cancellable?: boolean }) => string;
    updateBusyStatus: (message: string) => void;
    endBusy: (runId?: string) => void;
    requestBusyCancel: () => void;
    isBusyRunActive: (runId: string) => boolean;
    isRunCancellationRequested: (runId: string) => boolean;
    createAbortController: (runId?: string) => AbortController | null;
    abortRunControllers: (runId: string) => void;
    clearRunControllers: (runId: string) => void;
    init: () => void;
    connectGraphRuntime: () => void;
    addProgress: (message: string, type?: 'system' | 'error') => void;
    loadReportsList: () => Promise<void>;
    handleSaveSettings: (newSettings: Settings) => void;
    handleAsideMouseDown: (e: ReactMouseEvent) => void;
    runAnalysisPipeline: (plans: AnalysisPlan[], data: CsvData, options?: { isChatRequest?: boolean; runId?: string }) => Promise<AnalysisCardData[]>;
    handleInitialAnalysis: (dataForAnalysis: CsvData, options?: { runId?: string }) => Promise<void>;
    handleFileUpload: (file: File) => Promise<void>;
    handleExternalCsvPayload: (payload: ExternalCsvPayload) => Promise<void>;
    regenerateAnalyses: (newData: CsvData) => Promise<void>;
    executeDomAction: (action: DomAction) => void;
    handleChatMessage: (message: string) => Promise<void>;
    executeQuickAction: (actionId: QuickActionId) => Promise<void>;
    previewChatMemories: (query: string) => Promise<void>;
    toggleMemoryPreviewSelection: (id: string) => void;
    clearChatMemoryPreview: () => void;
    handleClarificationResponse: (clarificationId: string, userChoice: ClarificationOption) => Promise<void>;
    skipClarification: (clarificationId: string) => void;
    handleNaturalLanguageQuery: (query: string) => Promise<void>;
    clearAiFilter: () => void;
    cancelAiFilterRequest: () => void;
    applyDatasetProfileSnapshot: (profile: ProfileResult) => void;
    addToast: (
        message: string,
        type?: 'info' | 'success' | 'error',
        duration?: number,
        action?: { label: string; onClick: () => void }
    ) => string;
    dismissToast: (toastId: string) => void;
    handleChartTypeChange: (cardId: string, newType: ChartType) => void;
    handleToggleDataVisibility: (cardId: string) => void;
    handleTopNChange: (cardId: string, topN: number | null) => void;
    handleHideOthersChange: (cardId: string, hide: boolean) => void;
    handleToggleLegendLabel: (cardId: string, label: string) => void;
    rerunAggregationForCard: (cardId: string, options?: { mode?: 'sample' | 'full'; allowFullScan?: boolean }) => Promise<boolean>;
    clearCardFilter: (cardId: string) => void;
    handleLoadReport: (id: string) => Promise<void>;
    handleDeleteReport: (id: string) => Promise<void>;
    handleShowCardFromChat: (cardId: string) => void;
    handleNewSession: () => Promise<void>;
    focusDataPreview: () => void;
    triggerAutoSaveNow: () => void;
    setAgentPhase: (phase: AgentPhase, message?: string | null) => void;
    setIsAsideVisible: (isVisible: boolean) => void;
    setAsideWidth: (width: number) => void;
    setIsSpreadsheetVisible: (isVisible: boolean) => void;
    setIsDataPrepDebugVisible: (isVisible: boolean) => void;
    setIsSettingsModalOpen: (isOpen: boolean) => void;
    setIsHistoryPanelOpen: (isOpen: boolean) => void;
    setIsMemoryPanelOpen: (isOpen: boolean) => void;
    setIsResizing: (isResizing: boolean) => void;
    recordAgentValidationEvent: (event: {
        actionType: AgentActionType;
        reason: string;
        actionIndex: number;
        runId?: string | null;
        retryInstruction?: string;
        timestamp?: string;
    }) => void;
    dismissAgentValidationEvent: (eventId: string) => void;
    clearAgentValidationEvents: () => void;
    beginAgentActionTrace: (actionType: AgentActionType, summary: string, source?: AgentActionSource) => string;
    updateAgentActionTrace: (
        traceId: string,
        status: AgentActionStatus,
        details?: string,
        telemetry?: Partial<Pick<AgentActionTrace, 'durationMs' | 'errorCode' | 'metadata'>>
    ) => void;
    annotateAgentActionTrace: (
        traceId: string,
        metadata: Record<string, any>
    ) => void;
    appendPlannerObservation: (observation: AgentObservation) => void;
    resetPlannerObservations: () => void;
    updatePlannerPlanState: (state: AgentPlanState) => void;
    clearPlannerPlanState: () => void;
    setPlannerPendingSteps: (steps: AgentPlanStep[]) => void;
    completePlannerPendingStep: () => void;
    queuePendingDataTransform: (preview: PendingDataTransform) => void;
    confirmPendingDataTransform: () => Promise<void>;
    discardPendingDataTransform: () => void;
    undoLastDataTransform: () => Promise<void>;
    dismissLastAppliedDataTransformBanner: () => void;
    linkChartSelectionToRawData: (cardId: string, column: string | null, values: (string | number)[], label: string) => void;
    clearInteractiveSelectionFilter: () => void;
    recordPromptMetric: (metric: AgentPromptMetric) => void;
    clearPromptMetrics: () => void;
    setAggregationModePreference: (mode: 'sample' | 'full') => void;
    recordLlmUsage: (entry: Omit<LlmUsageEntry, 'id' | 'timestamp'>) => void;
    clearLlmUsage: () => void;
    toggleLangGraphRuntime: (enabled: boolean) => void;
    runGraphPipeline: (payload?: Record<string, unknown>) => void;
    sendGraphUserReply: (optionId?: string, freeText?: string) => Promise<void>;
    processGraphActions: (actions: AiAction[]) => Promise<void> | void;
    setLangChainLastPlan: (plan: AnalysisPlan | null) => void;
    setLangChainPlannerEnabled: (enabled: boolean) => void;
}

export type AppStore = StoreState & StoreActions;

export type ChatSliceState = Pick<StoreState, 'chatMemoryPreview' | 'chatMemoryExclusions' | 'chatMemoryPreviewQuery' | 'isMemoryPreviewLoading'>;

export type ChatSliceActions = Pick<
    StoreActions,
    'handleChatMessage' | 'previewChatMemories' | 'toggleMemoryPreviewSelection' | 'clearChatMemoryPreview' | 'handleClarificationResponse' | 'skipClarification'
>;

export type ChatSlice = ChatSliceState & ChatSliceActions;
