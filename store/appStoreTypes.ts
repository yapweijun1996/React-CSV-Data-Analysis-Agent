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
} from '../types';

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
    previewChatMemories: (query: string) => Promise<void>;
    toggleMemoryPreviewSelection: (id: string) => void;
    clearChatMemoryPreview: () => void;
    handleClarificationResponse: (clarificationId: string, userChoice: ClarificationOption) => Promise<void>;
    skipClarification: (clarificationId: string) => void;
    handleNaturalLanguageQuery: (query: string) => Promise<void>;
    clearAiFilter: () => void;
    cancelAiFilterRequest: () => void;
    addToast: (message: string, type?: 'info' | 'success' | 'error', duration?: number) => string;
    dismissToast: (toastId: string) => void;
    handleChartTypeChange: (cardId: string, newType: ChartType) => void;
    handleToggleDataVisibility: (cardId: string) => void;
    handleTopNChange: (cardId: string, topN: number | null) => void;
    handleHideOthersChange: (cardId: string, hide: boolean) => void;
    handleToggleLegendLabel: (cardId: string, label: string) => void;
    handleLoadReport: (id: string) => Promise<void>;
    handleDeleteReport: (id: string) => Promise<void>;
    handleShowCardFromChat: (cardId: string) => void;
    handleNewSession: () => Promise<void>;
    focusDataPreview: () => void;
    setIsAsideVisible: (isVisible: boolean) => void;
    setAsideWidth: (width: number) => void;
    setIsSpreadsheetVisible: (isVisible: boolean) => void;
    setIsDataPrepDebugVisible: (isVisible: boolean) => void;
    setIsSettingsModalOpen: (isOpen: boolean) => void;
    setIsHistoryPanelOpen: (isOpen: boolean) => void;
    setIsMemoryPanelOpen: (isOpen: boolean) => void;
    setIsResizing: (isResizing: boolean) => void;
    beginAgentActionTrace: (actionType: AgentActionType, summary: string, source?: AgentActionSource) => string;
    updateAgentActionTrace: (
        traceId: string,
        status: AgentActionStatus,
        details?: string,
        telemetry?: Partial<Pick<AgentActionTrace, 'durationMs' | 'errorCode' | 'metadata'>>
    ) => void;
    queuePendingDataTransform: (preview: PendingDataTransform) => void;
    confirmPendingDataTransform: () => Promise<void>;
    discardPendingDataTransform: () => void;
    undoLastDataTransform: () => Promise<void>;
    dismissLastAppliedDataTransformBanner: () => void;
    linkChartSelectionToRawData: (cardId: string, column: string | null, values: (string | number)[], label: string) => void;
    clearInteractiveSelectionFilter: () => void;
}

export type AppStore = StoreState & StoreActions;

export type ChatSliceState = Pick<StoreState, 'chatMemoryPreview' | 'chatMemoryExclusions' | 'chatMemoryPreviewQuery' | 'isMemoryPreviewLoading'>;

export type ChatSliceActions = Pick<
    StoreActions,
    'handleChatMessage' | 'previewChatMemories' | 'toggleMemoryPreviewSelection' | 'clearChatMemoryPreview' | 'handleClarificationResponse' | 'skipClarification'
>;

export type ChatSlice = ChatSliceState & ChatSliceActions;
