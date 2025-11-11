import { create } from 'zustand';
// Fix: Import MouseEvent from React and alias it to resolve the type error.
import type { MouseEvent as ReactMouseEvent } from 'react';
import {
    AnalysisCardData,
    AggregationMeta,
    ChatMessage,
    ProgressMessage,
    CsvData,
    AnalysisPlan,
    AppState,
    CardContext,
    ChartType,
    DomAction,
    Settings,
    Report,
    ReportListItem,
    ClarificationRequest,
    ClarificationRequestPayload,
    ClarificationStatus,
    ColumnProfile,
    AgentActionStatus,
    AgentActionSource,
    ExternalCsvPayload,
    AgentObservation,
    AgentPlanState,
    AgentPlanStep,
    PlannerSessionState,
    AgentValidationEvent,
    VectorStoreDocument,
    AgentPhaseState,
    AgentPhase,
    AgentPromptMetric,
    CsvRow,
} from '../types';
import { executePlan, applyTopNWithOthers, PlanExecutionError } from '../utils/dataProcessor';
import {
    generateAnalysisPlans,
    generateSummary,
    generateFinalSummary,
    generateCoreAnalysisSummary,
    generateProactiveInsights,
    PlanGenerationFatalError,
    type PlanGenerationWarning,
} from '../services/aiService';
import { getReportsList, getReport, deleteReport, getSettings, saveSettings, CURRENT_SESSION_KEY } from '../storageService';
import { vectorStore } from '../services/vectorStore';
import { runWithBusyState } from '../utils/runWithBusy';
import { preparePlanForExecution } from '../utils/planValidation';
import { buildColumnAliasMap } from '../utils/columnAliases';
import { exportToPng, exportToCsv, exportToHtml } from '../utils/exportUtils';
import type { AppStore, StoreActions, StoreState } from './appStoreTypes';
import { createChatSlice } from './slices/chatSlice';
import { createFileUploadSlice } from './slices/fileUploadSlice';
import { createAiFilterSlice } from './slices/aiFilterSlice';
import { AutoSaveManager, AutoSaveConfig, deriveAutoSaveConfig } from '../utils/autoSaveManager';
import { computeDatasetHash } from '../utils/datasetHash';
import { dataTools, type AggregateResult, type AggregatePayload, type ProfileResult } from '../services/dataTools';
import {
    persistCleanDataset,
    readCardResults,
    readAllRows,
    readColumnStoreRecord,
    readProvenance,
    type CardDataRef,
    type ViewStoreRecord,
    type CardKind,
} from '../services/csvAgentDb';
import {
    rememberDatasetId,
    forgetDatasetId,
    getRememberedDatasetId,
    LAST_DATASET_STORAGE_KEY,
} from '../utils/datasetCache';

const createClarificationId = () =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `clar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createRunId = () => `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const createToastId = () => `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const createValidationEventId = () => `val-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const createPromptMetricId = () => `prompt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

let autoSaveManager: AutoSaveManager | null = null;
let latestAutoSaveConfig: AutoSaveConfig | null = null;

const updateAutoSaveConfiguration = (settings: Settings) => {
    latestAutoSaveConfig = deriveAutoSaveConfig(settings);
    autoSaveManager?.configure(latestAutoSaveConfig);
};

const resetAutoSaveSessionMetadata = () => {
    autoSaveManager?.resetSessionMetadata();
};

const seedAutoSaveCreatedAt = (createdAt: Date | null) => {
    autoSaveManager?.seedCreatedAt(createdAt);
};

const triggerAutoSaveImmediately = () => {
    autoSaveManager?.triggerImmediateSave(true);
};

const getNextAwaitingClarificationId = (clarifications: ClarificationRequest[]): string | null =>
    clarifications.find(c => c.status === 'pending')?.id ?? null;

const normalizePlanSteps = (steps: AgentPlanStep[] | undefined | null): AgentPlanStep[] => {
    return (steps ?? [])
        .map(step => ({
            id: typeof step?.id === 'string' ? step.id.trim() : '',
            label: typeof step?.label === 'string' ? step.label.trim() : '',
            intent: typeof step?.intent === 'string' ? step.intent.trim() || undefined : undefined,
            status: typeof step?.status === 'string' ? (step.status as AgentPlanStep['status']) : undefined,
        }))
        .filter(step => step.id.length >= 3 && step.label.length >= 3);
};

const sanitizeFileStemFromHeader = (header?: string | null) => {
    if (!header) return 'report';
    const firstLine = header
        .split(/\r?\n/)
        .map(line => line.trim())
        .find(Boolean);
    if (!firstLine) return 'report';
    const sanitized = firstLine
        .replace(/[^a-z0-9-_]+/gi, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    return sanitized || 'report';
};

const buildSerializableAppState = (state: AppStore): AppState => ({
    currentView: state.currentView,
    isBusy: state.isBusy,
    busyMessage: state.busyMessage,
    canCancelBusy: state.canCancelBusy,
    progressMessages: state.progressMessages,
    csvData: state.csvData,
    columnProfiles: state.columnProfiles,
    analysisCards: state.analysisCards,
    chatHistory: state.chatHistory,
    finalSummary: state.finalSummary,
    aiCoreAnalysisSummary: state.aiCoreAnalysisSummary,
    dataPreparationPlan: state.dataPreparationPlan,
    initialDataSample: state.initialDataSample,
    datasetHash: state.datasetHash,
    vectorStoreDocuments: vectorStore.getDocuments(),
    spreadsheetFilterFunction: state.spreadsheetFilterFunction,
    aiFilterExplanation: state.aiFilterExplanation,
    datasetProfile: state.datasetProfile,
    pendingClarifications: state.pendingClarifications,
    activeClarificationId: state.activeClarificationId,
    toasts: [],
    agentActionTraces: state.agentActionTraces,
    agentValidationEvents: state.agentValidationEvents,
    columnAliasMap: state.columnAliasMap,
    pendingDataTransform: state.pendingDataTransform,
    lastAppliedDataTransform: state.lastAppliedDataTransform,
    isLastAppliedDataTransformBannerDismissed: state.isLastAppliedDataTransformBannerDismissed,
    interactiveSelectionFilter: state.interactiveSelectionFilter,
    plannerSession: state.plannerSession,
    agentPhase: state.agentPhase,
    plannerPendingSteps: state.plannerPendingSteps,
    agentPromptMetrics: state.agentPromptMetrics,
    plannerDatasetHash: state.plannerDatasetHash,
    agentAwaitingUserInput: state.agentAwaitingUserInput,
    agentAwaitingPromptId: state.agentAwaitingPromptId,
    analysisTimeline: state.analysisTimeline,
});

const buildFileNameFromHeader = (header?: string | null) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const stem = sanitizeFileStemFromHeader(header);
    return `${stem}-${timestamp}.csv`;
};

const restoreVectorMemoryFromSnapshot = async (
    documents: VectorStoreDocument[] | undefined | null,
    snapshotDatasetHash: string | null | undefined,
    currentDatasetHash: string | null,
    addProgress: AppStore['addProgress'],
    addToast: AppStore['addToast'],
    dismissToast: AppStore['dismissToast'],
    successMessage: string,
) => {
    if (!documents || documents.length === 0) return;
    let loadingToastId: string | null = null;
    try {
        const datasetsMatch =
            !!snapshotDatasetHash &&
            !!currentDatasetHash &&
            snapshotDatasetHash === currentDatasetHash;

        if (!datasetsMatch) {
            vectorStore.clear();
            addProgress('Skipped AI memory restore because the dataset changed since last session.');
            addToast('AI memory reset for this dataset.', 'info', 5000);
            return;
        }
        const requiresInit = !vectorStore.getIsInitialized();
        if (requiresInit) {
            loadingToastId = addToast('Preparing AI memory from history...', 'info', 0);
            await vectorStore.init(addProgress);
        }
        if (!vectorStore.getIsInitialized()) {
            addProgress('AI memory model failed to load; saved chat context is unavailable right now.', 'error');
            if (loadingToastId) dismissToast(loadingToastId);
            return;
        }
        if (loadingToastId) dismissToast(loadingToastId);
        vectorStore.rehydrate(documents);
        addProgress(successMessage);
        addToast('AI memory ready for this report.', 'success');
    } catch (error) {
        if (loadingToastId) dismissToast(loadingToastId);
        console.error('Failed to restore AI memory from saved session:', error);
        addProgress('Restoring AI memory failed; chat recall may be incomplete this session.', 'error');
        addToast('AI memory failed to load. Try reloading or re-importing the file.', 'error', 6000);
    }
};

const MIN_ASIDE_WIDTH = 320;
const MAX_ASIDE_WIDTH = 800;
const MIN_MAIN_WIDTH = 600;

const MAX_AGENT_TRACE_HISTORY = 40;
const MAX_PLANNER_OBSERVATIONS = 12;
const MAX_AGENT_VALIDATION_EVENTS = 25;
const AUTO_FULL_SCAN_ROW_THRESHOLD = 5000;

const deriveAliasMap = (profiles: ColumnProfile[] = []) => buildColumnAliasMap(profiles.map(p => p.name));

const normalizePlannerSession = (session?: PlannerSessionState | null): PlannerSessionState => ({
    observations: session?.observations ?? [],
    planState: session?.planState ?? null,
});

const arraysAreEqual = (a: (string | number)[], b: (string | number)[]) => {
    if (a.length !== b.length) return false;
    return a.every((value, index) => value === b[index]);
};

const inferCardKind = (plan: AnalysisPlan): CardKind => {
    switch (plan.chartType) {
        case 'line':
            return 'trend';
        case 'bar':
        case 'pie':
        case 'doughnut':
        case 'combo':
            return 'topn';
        default:
            return 'kpi';
    }
};

const buildAggregatePayloadForPlan = (
    plan: AnalysisPlan,
    datasetId: string | null,
    csvData: CsvData | null,
    rowCountHint?: number,
    options?: { preferredMode?: 'sample' | 'full' },
): AggregatePayload | null => {
    if (!datasetId) return null;
    if (plan.chartType === 'scatter' || plan.chartType === 'combo') return null;
    if (!plan.groupByColumn || !plan.aggregation) return null;
    if (plan.aggregation !== 'count' && !plan.valueColumn) return null;
    const alias = plan.valueColumn ?? 'count';
    const fallbackOrder =
        plan.chartType === 'line'
            ? [{ column: plan.groupByColumn, direction: 'asc' as const }]
            : [{ column: alias, direction: 'desc' as const }];
    const orderBy =
        plan.orderBy && plan.orderBy.length > 0
            ? plan.orderBy.map(order => ({
                  column: order.column,
                  direction: (order.direction ?? (plan.chartType === 'line' ? 'asc' : 'desc')) as 'asc' | 'desc',
              }))
            : fallbackOrder;
    const availableRows = rowCountHint ?? csvData?.data?.length ?? 0;
    const sampleSize = availableRows > 0 ? Math.min(5000, availableRows) : 5000;
    const shouldForceFullScan = availableRows > 0 && availableRows <= AUTO_FULL_SCAN_ROW_THRESHOLD;
    const limit = typeof plan.limit === 'number' ? plan.limit : plan.defaultTopN;
    const payload: AggregatePayload = {
        datasetId,
        by: [plan.groupByColumn],
        metrics: [
            {
                fn: plan.aggregation as AggregatePayload['metrics'][number]['fn'],
                column: plan.aggregation === 'count' ? undefined : plan.valueColumn,
                as: alias,
            },
        ],
        filter: plan.rowFilter
            ? [
                  {
                      column: plan.rowFilter.column,
                      op: 'in',
                      values: plan.rowFilter.values,
                  },
              ]
            : undefined,
        limit: typeof limit === 'number' ? limit : undefined,
        mode: shouldForceFullScan ? 'full' : 'sample',
        sampleSize,
        orderBy,
        allowFullScan: shouldForceFullScan,
    };
    const preferredMode = options?.preferredMode;
    if (shouldForceFullScan) {
        payload.mode = 'full';
        payload.allowFullScan = true;
    } else if (preferredMode === 'full') {
        payload.mode = 'full';
        payload.allowFullScan = true;
    } else {
        payload.mode = 'sample';
        payload.allowFullScan = false;
    }
    return payload;
};

const convertViewToCard = (view: ViewStoreRecord<CardDataRef>): AnalysisCardData => {
    const snapshot = view.dataRef.planSnapshot ?? {};
    const chartType = snapshot.chartType ?? 'bar';
    const plan: AnalysisPlan = {
        chartType,
        title: snapshot.title ?? view.title,
        description: snapshot.description ?? view.explainer ?? '',
        aggregation: snapshot.aggregation,
        groupByColumn: snapshot.groupByColumn,
        valueColumn: snapshot.valueColumn,
        xValueColumn: snapshot.xValueColumn,
        yValueColumn: snapshot.yValueColumn,
        secondaryValueColumn: snapshot.secondaryValueColumn,
        secondaryAggregation: snapshot.secondaryAggregation,
        defaultTopN: snapshot.defaultTopN,
        defaultHideOthers: snapshot.defaultHideOthers,
        rowFilter: snapshot.rowFilter,
        orderBy: snapshot.orderBy,
        limit: snapshot.limit ?? null,
    };
    return {
        id: view.id,
        plan,
        aggregatedData: view.dataRef.rows,
        summary: view.explainer,
        displayChartType: chartType,
        isDataVisible: false,
        topN: snapshot.defaultTopN ?? null,
        hideOthers: snapshot.defaultHideOthers ?? false,
        disableAnimation: true,
        hiddenLabels: [],
        dataRefId: view.id,
        queryHash: view.queryHash,
        isSampledResult: view.dataRef.sampled,
        aggregationMeta: {
            mode: view.dataRef.sampled ? 'sample' : 'full',
            sampled: view.dataRef.sampled,
            processedRows: view.dataRef.rows.length,
            totalRows: view.dataRef.rows.length,
            warnings: [],
            lastRunAt: view.createdAt ?? new Date().toISOString(),
            requestedMode: view.dataRef.sampled ? 'sample' : 'full',
        },
    };
};

const initialAppState: AppState = {
    currentView: 'file_upload',
    isBusy: false,
    busyMessage: null,
    canCancelBusy: false,
    progressMessages: [],
    csvData: null,
    columnProfiles: [],
    analysisCards: [],
    chatHistory: [],
    finalSummary: null,
    aiCoreAnalysisSummary: null,
    dataPreparationPlan: null,
    initialDataSample: null,
    datasetHash: null,
    vectorStoreDocuments: [],
    spreadsheetFilterFunction: null,
    aiFilterExplanation: null,
    datasetProfile: null,
    pendingClarifications: [],
    activeClarificationId: null,
    toasts: [],
    agentActionTraces: [],
    agentValidationEvents: [],
    columnAliasMap: {},
    pendingDataTransform: null,
    lastAppliedDataTransform: null,
    isLastAppliedDataTransformBannerDismissed: false,
    interactiveSelectionFilter: null,
    plannerSession: normalizePlannerSession(),
    agentPhase: { phase: 'idle', message: null, enteredAt: null },
    plannerPendingSteps: [],
    agentPromptMetrics: [],
    plannerDatasetHash: null,
    agentAwaitingUserInput: false,
    agentAwaitingPromptId: null,
    analysisTimeline: { stage: 'idle', totalCards: 0, completedCards: 0 },
    aggregationModePreference: 'sample',
};

export const useAppStore = create<StoreState & StoreActions>((set, get) => {
    const registerClarification = (clarificationPayload: ClarificationRequestPayload): ClarificationRequest => {
        const newClarification: ClarificationRequest = {
            ...clarificationPayload,
            id: createClarificationId(),
            status: 'pending',
            contextType: clarificationPayload.contextType ?? 'plan',
        };
        set(state => ({
            pendingClarifications: [...state.pendingClarifications, newClarification],
            activeClarificationId: newClarification.id,
        }));
        return newClarification;
    };

    const updateClarificationStatus = (clarificationId: string, status: ClarificationStatus) => {
        const existingClarifications = get().pendingClarifications;
        if (!existingClarifications.some(req => req.id === clarificationId)) return;
        set(state => {
            const updatedClarifications = state.pendingClarifications.map(req =>
                req.id === clarificationId ? { ...req, status } : req
            );
            const nextActive =
                status === 'pending' || status === 'resolving'
                    ? clarificationId
                    : getNextAwaitingClarificationId(updatedClarifications);
            return {
                pendingClarifications: updatedClarifications,
                activeClarificationId: nextActive,
            };
        });
    };

    const getRunSignal = (runId?: string) => (runId ? get().createAbortController(runId)?.signal : undefined);

    const runPlanWithChatLifecycle = async (plan: AnalysisPlan, data: CsvData, runId?: string): Promise<AnalysisCardData[]> => {
        if (runId && get().isRunCancellationRequested(runId)) return [];
        const planTitle = plan.title ?? 'your requested chart';
        const planStartMessage: ChatMessage = {
            sender: 'ai',
            text: `Okay, creating a chart for "${planTitle}".`,
            timestamp: new Date(),
            type: 'ai_plan_start',
        };
        set(prev => ({ chatHistory: [...prev.chatHistory, planStartMessage] }));

        const createdCards = await get().runAnalysisPipeline([plan], data, { isChatRequest: true, runId });

        if (createdCards.length > 0) {
            const cardSummary = createdCards[0].summary.split('---')[0].trim();
            const completionMessage: ChatMessage = {
                sender: 'ai',
                text: `Created the chart for "${planTitle}". Here's what I observed:\n${cardSummary}`,
                timestamp: new Date(),
                type: 'ai_message',
                cardId: createdCards[0].id,
            };
            set(prev => ({ chatHistory: [...prev.chatHistory, completionMessage] }));
        }

        return createdCards;
    };

    const chatSlice = createChatSlice(set, get, {
        registerClarification,
        updateClarificationStatus,
        getRunSignal,
        runPlanWithChatLifecycle,
    });

    const restoreDatasetFromCache = async (datasetId: string): Promise<boolean> => {
        get().addProgress('Restoring cached dataset from IndexedDB…');
        try {
            const [provenance, columnRecord, rows, views] = await Promise.all([
                readProvenance(datasetId),
                readColumnStoreRecord(datasetId),
                readAllRows(datasetId),
                readCardResults<CardDataRef>(datasetId),
            ]);
            if (!rows || rows.length === 0) {
                get().addProgress('Cached dataset was empty. Please re-upload your CSV.', 'error');
                return false;
            }
            const csvData: CsvData = {
                fileName: provenance?.fileName ?? 'cached.csv',
                data: rows,
            };
            const columnProfiles = columnRecord?.columns ?? [];
            const aliasMap = buildColumnAliasMap(columnProfiles.map(p => p.name));
            const restoredCards = views.map(convertViewToCard);
            set({
                ...initialAppState,
                csvData,
                columnProfiles,
                columnAliasMap: aliasMap,
                analysisCards: restoredCards,
                datasetHash: datasetId,
                currentView: 'analysis_dashboard',
                analysisTimeline: restoredCards.length
                    ? { stage: 'insight', totalCards: restoredCards.length, completedCards: restoredCards.length }
                    : { stage: 'profiling', totalCards: 0, completedCards: 0 },
                initialDataSample: rows.slice(0, 50),
            });
            rememberDatasetId(datasetId);
            const profileResult = await dataTools.profile(datasetId);
            if (profileResult.ok) {
                set({ datasetProfile: profileResult.data });
            } else {
                addProgress(`Profiling worker failed: ${profileResult.reason}`, 'error');
            }
            return true;
        } catch (error) {
            console.error('Failed to restore cached dataset:', error);
            get().addProgress('Cached dataset restore failed. Please re-upload.', 'error');
            return false;
        }
    };
    const fileUploadSlice = createFileUploadSlice(set, get, {
        initialAppState,
        resetAutoSaveSession: resetAutoSaveSessionMetadata,
    });
    const aiFilterSlice = createAiFilterSlice(set, get, { createRunId });

    return {
        ...initialAppState,
        ...chatSlice,
        ...fileUploadSlice,
        ...aiFilterSlice,
        busyRunId: null,
        isCancellationRequested: false,
        aiFilterRunId: null,
        abortControllers: {},
        isAsideVisible: true,
        asideWidth: window.innerWidth / 4 > MIN_ASIDE_WIDTH ? window.innerWidth / 4 : MIN_ASIDE_WIDTH,
        isSpreadsheetVisible: true,
        isDataPrepDebugVisible: false,
        isSettingsModalOpen: false,
        isHistoryPanelOpen: false,
        isMemoryPanelOpen: false,
        isAiFiltering: false,
        settings: getSettings(),
        reportsList: [],
        isResizing: false,
        isApiKeySet: (() => {
            const settings = getSettings();
            if (settings.provider === 'google') {
                return !!settings.geminiApiKey;
            }
            return !!settings.openAIApiKey;
        })(),
        beginBusy: (message, options) => {
            const runId = createRunId();
            set({
                isBusy: true,
                busyMessage: message,
                canCancelBusy: !!options?.cancellable,
                busyRunId: runId,
                isCancellationRequested: false,
            });
            return runId;
        },
        updateBusyStatus: (message) => {
            if (!get().isBusy) return;
            set({ busyMessage: message });
        },
        endBusy: (runId) => {
            const activeRunId = get().busyRunId;
            if (runId && activeRunId && activeRunId !== runId) return;
            set({
                isBusy: false,
                busyMessage: null,
                canCancelBusy: false,
                busyRunId: null,
                isCancellationRequested: false,
            });
            const targetRunId = runId ?? activeRunId;
            if (targetRunId) {
                get().clearRunControllers(targetRunId);
            }
        },
        requestBusyCancel: () => {
            if (!get().busyRunId || get().isCancellationRequested) return;
            set({
                isCancellationRequested: true,
                canCancelBusy: false,
                busyMessage: 'Cancelling… wrapping up safely.',
            });
            get().addProgress('Cancelling current request...');
            const activeRunId = get().busyRunId;
            if (activeRunId) {
                get().abortRunControllers(activeRunId);
            }
        },
        isBusyRunActive: (runId) => get().busyRunId === runId,
        isRunCancellationRequested: (runId) =>
            get().isCancellationRequested && get().busyRunId === runId,
        createAbortController: (runId) => {
            if (!runId) return null;
            const controller = new AbortController();
            set(state => ({
                abortControllers: {
                    ...state.abortControllers,
                    [runId]: [...(state.abortControllers[runId] ?? []), controller],
                },
            }));
            return controller;
        },
        abortRunControllers: (runId) => {
            set(state => {
                const controllers = state.abortControllers[runId];
                controllers?.forEach(controller => {
                    if (!controller.signal.aborted) {
                        controller.abort();
                    }
                });
                if (!controllers) return {};
                const next = { ...state.abortControllers };
                delete next[runId];
                return { abortControllers: next };
            });
        },
        clearRunControllers: (runId) => {
            set(state => {
                if (!state.abortControllers[runId]) return {};
                const next = { ...state.abortControllers };
                delete next[runId];
                return { abortControllers: next };
            });
        },
        addToast: (message, type = 'info', duration = 4000, action) => {
            const id = createToastId();
            set(state => ({
                toasts: [
                    ...state.toasts,
                    {
                        id,
                        message,
                        type,
                        actionLabel: action?.label,
                        onAction: action?.onClick,
                    },
                ],
            }));
            if (duration > 0) {
                setTimeout(() => {
                    get().dismissToast(id);
                }, duration);
            }
            return id;
        },
        dismissToast: (toastId) => {
            set(state => ({
                toasts: state.toasts.filter(t => t.id !== toastId),
            }));
        },
        queuePendingDataTransform: (preview) => {
            if (get().pendingDataTransform) {
                get().addProgress('An AI data transformation is already awaiting approval. Please confirm or discard it first.', 'error');
                return;
            }
            set({ pendingDataTransform: preview });
            get().addProgress('AI proposed a data transformation. Review it above the dashboard before applying.');
            get().addToast('AI data change pending confirmation.', 'info', 5000);
        },
        confirmPendingDataTransform: async () => {
            const pending = get().pendingDataTransform;
            if (!pending) {
                get().addProgress('No pending data transformation to confirm.', 'error');
                return;
            }
            const previousData = get().csvData;
            const previousProfiles = get().columnProfiles;
            const previousAliasMap = get().columnAliasMap;
            const nextDatasetHash = computeDatasetHash(pending.nextData);
            set({
                csvData: pending.nextData,
                columnProfiles: pending.nextColumnProfiles,
                columnAliasMap: pending.nextAliasMap,
                datasetHash: nextDatasetHash,
                pendingDataTransform: null,
                isLastAppliedDataTransformBannerDismissed: false,
                lastAppliedDataTransform: {
                    id: pending.id,
                    summary: pending.summary,
                    explanation: pending.explanation,
                    meta: pending.meta,
                    previousData,
                    previousColumnProfiles: previousProfiles,
                    previousAliasMap,
                    appliedAt: new Date().toISOString(),
                },
            });
            get().addProgress('Applied the AI data transformation after confirmation.');
            await get().regenerateAnalyses(pending.nextData);
            const formatColumnPreview = (columns: string[]): string => {
                if (!columns || columns.length === 0) return '(none)';
                const preview = columns.slice(0, 8).join(', ');
                return columns.length > 8 ? `${preview}, …` : preview;
            };
            const extractColumns = (profiles: ColumnProfile[], fallbackRows: CsvRow[] | undefined): string[] => {
                if (profiles && profiles.length > 0) return profiles.map(profile => profile.name);
                const sampleRow = fallbackRows?.find(row => row && typeof row === 'object');
                return sampleRow ? Object.keys(sampleRow) : [];
            };
            const beforeColumns =
                pending.beforeColumns ?? extractColumns(previousProfiles, previousData?.data ?? undefined);
            const afterColumns = pending.afterColumns ?? pending.nextColumnProfiles.map(profile => profile.name);
            const removedColumns = beforeColumns.filter(name => !afterColumns.includes(name));
            const addedColumns = afterColumns.filter(name => !beforeColumns.includes(name));
            const columnDiffSummary = [
                `Before (${beforeColumns.length}): ${formatColumnPreview(beforeColumns)}`,
                `After (${afterColumns.length}): ${formatColumnPreview(afterColumns)}`,
                removedColumns.length ? `Removed: ${formatColumnPreview(removedColumns)}` : null,
                addedColumns.length ? `Added: ${formatColumnPreview(addedColumns)}` : null,
            ]
                .filter(Boolean)
                .join('\n');
            const aiMessage: ChatMessage = {
                sender: 'ai',
                text: `Applied transform "${pending.summary}".\n${columnDiffSummary}`,
                timestamp: new Date(),
                type: 'ai_message',
            };
            set(prev => ({
                chatHistory: [...prev.chatHistory, aiMessage],
            }));
        },
        discardPendingDataTransform: () => {
            if (!get().pendingDataTransform) {
                get().addProgress('No pending data transformation to discard.', 'error');
                return;
            }
            set({ pendingDataTransform: null });
            get().addProgress('Discarded the pending AI data transformation.');
        },
        undoLastDataTransform: async () => {
            if (get().pendingDataTransform) {
                get().addProgress('Resolve the pending AI transformation before undoing.', 'error');
                return;
            }
            const last = get().lastAppliedDataTransform;
            if (!last || !last.previousData) {
                get().addProgress('No AI data transformation is available to undo.', 'error');
                return;
            }
            const restoredHash = computeDatasetHash(last.previousData);
            set({
                csvData: last.previousData,
                columnProfiles: last.previousColumnProfiles,
                columnAliasMap: last.previousAliasMap,
                datasetHash: restoredHash,
                lastAppliedDataTransform: null,
                isLastAppliedDataTransformBannerDismissed: false,
            });
            get().addProgress('Reverted the last AI data transformation.');
            await get().regenerateAnalyses(last.previousData);
        },
        dismissLastAppliedDataTransformBanner: () => {
            if (!get().lastAppliedDataTransform) {
                return;
            }
            set({ isLastAppliedDataTransformBannerDismissed: true });
        },
        linkChartSelectionToRawData: (cardId, column, values, label) => {
            const hasValues = !!column && values.length > 0;
            const current = get().interactiveSelectionFilter;
            if (!hasValues) {
                if (current && current.sourceCardId === cardId) {
                    set({ interactiveSelectionFilter: null });
                }
                return;
            }
            const normalizedValues = values.map(val => (typeof val === 'number' ? val : String(val)));
            if (
                current &&
                current.sourceCardId === cardId &&
                current.column === column &&
                arraysAreEqual(current.values, normalizedValues)
            ) {
                return;
            }
            set({
                interactiveSelectionFilter: {
                    sourceCardId: cardId,
                    column,
                    values: normalizedValues,
                    label,
                    createdAt: new Date().toISOString(),
                },
                isSpreadsheetVisible: true,
            });
            setTimeout(() => {
                document
                    .getElementById('raw-data-explorer')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 150);
        },
        clearInteractiveSelectionFilter: () => {
            const current = get().interactiveSelectionFilter;
            if (!current) {
                return;
            }
            const systemNote: ChatMessage = {
                sender: 'ai',
                text: `System note: Cleared chart drilldown "${current.label}" (${current.column}); Raw Data Explorer now shows all rows.`,
                timestamp: new Date(),
                type: 'ai_message',
            };
            set(state => ({
                interactiveSelectionFilter: null,
                chatHistory: [...state.chatHistory, systemNote],
            }));
            get().addProgress('Cleared the linked chart selection filter.');
            const traceId = get().beginAgentActionTrace('dom_action', 'User cleared chart drilldown', 'system');
            get().updateAgentActionTrace(traceId, 'succeeded', 'Chart drilldown reset via UI', {
                metadata: {
                    drilldownLabel: current.label,
                    drilldownColumn: current.column,
                    valueCount: current.values.length,
                },
            });
        },

    init: async () => {
        const currentSession = await getReport(CURRENT_SESSION_KEY);
        if (currentSession) {
            set({
                ...initialAppState,
                ...currentSession.appState,
                isBusy: false,
                busyMessage: null,
                canCancelBusy: false,
                busyRunId: null,
                isCancellationRequested: false,
                aiFilterRunId: null,
                abortControllers: {},
                toasts: [],
                currentView: currentSession.appState.csvData ? 'analysis_dashboard' : 'file_upload',
                pendingClarifications: currentSession.appState.pendingClarifications ?? [],
                activeClarificationId: currentSession.appState.activeClarificationId ?? null,
                agentActionTraces: currentSession.appState.agentActionTraces ?? [],
                agentValidationEvents: currentSession.appState.agentValidationEvents ?? [],
                chatMemoryPreview: [],
                chatMemoryExclusions: [],
                chatMemoryPreviewQuery: '',
                isMemoryPreviewLoading: false,
                columnAliasMap: currentSession.appState.columnAliasMap ?? deriveAliasMap(currentSession.appState.columnProfiles ?? []),
                pendingDataTransform: null,
                lastAppliedDataTransform: null,
                interactiveSelectionFilter: null,
                plannerSession: normalizePlannerSession(currentSession.appState.plannerSession),
                plannerDatasetHash: currentSession.appState.plannerDatasetHash ?? currentSession.appState.datasetHash ?? null,
                datasetProfile: currentSession.appState.datasetProfile ?? null,
                analysisTimeline: currentSession.appState.analysisTimeline ?? { ...initialAppState.analysisTimeline },
            });
            await restoreVectorMemoryFromSnapshot(
                currentSession.appState.vectorStoreDocuments,
                currentSession.appState.datasetHash,
                get().datasetHash,
                get().addProgress,
                get().addToast,
                get().dismissToast,
                'Restored AI long-term memory from last session.',
            );
            seedAutoSaveCreatedAt(currentSession.createdAt);
        } else {
            const cachedDatasetId = getRememberedDatasetId();
            if (cachedDatasetId) {
                await restoreDatasetFromCache(cachedDatasetId);
            }
        }
        await get().loadReportsList();
    },

    // FIX: Explicitly type the 'type' parameter to match the ProgressMessage interface.
    addProgress: (message: string, type: 'system' | 'error' = 'system') => {
        const newMessage: ProgressMessage = { text: message, type, timestamp: new Date() };
        set(state => ({ progressMessages: [...state.progressMessages, newMessage] }));
    },
    
    loadReportsList: async () => {
        const list = await getReportsList();
        set({ reportsList: list });
    },

    handleSaveSettings: (newSettings) => {
        saveSettings(newSettings);
        const isSet = newSettings.provider === 'google'
            ? !!newSettings.geminiApiKey
            : !!newSettings.openAIApiKey;
        set({ 
            settings: newSettings,
            isApiKeySet: isSet,
        });
        updateAutoSaveConfiguration(newSettings);
    },

    handleAsideMouseDown: (e) => {
        e.preventDefault();
        get().setIsResizing(true);
        const handleMouseMove = (moveEvent: MouseEvent) => {
            const maxAllowedAsideWidth = window.innerWidth - MIN_MAIN_WIDTH;
            let newWidth = window.innerWidth - moveEvent.clientX;
            newWidth = Math.max(MIN_ASIDE_WIDTH, newWidth);
            newWidth = Math.min(MAX_ASIDE_WIDTH, newWidth, maxAllowedAsideWidth);
            get().setAsideWidth(newWidth);
        };
        const handleMouseUp = () => {
            get().setIsResizing(false);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    },
    
    runAnalysisPipeline: async (plans, data, options = {}) => {
        const { isChatRequest = false, runId } = options;
        const addProgress = get().addProgress;
        const settings = get().settings;
        const shouldAbort = () => (runId ? get().isRunCancellationRequested(runId) : false);
        const requestSignal = () => getRunSignal(runId);
        let isFirstCardInPipeline = true;
        const beginTrace = get().beginAgentActionTrace;
        const completeTrace = get().updateAgentActionTrace;
        const datasetId = get().datasetHash;
        const shouldTrackTimeline = !isChatRequest;
        const markTimelineStep = () => {
            if (!shouldTrackTimeline) return;
            set(state => {
                const timeline = state.analysisTimeline;
                if (!timeline.totalCards) {
                    return {};
                }
                const completed = Math.min(timeline.totalCards, timeline.completedCards + 1);
                const nextStage = timeline.stage === 'profiling' && completed > 0 ? 'insight' : timeline.stage;
                return {
                    analysisTimeline: {
                        ...timeline,
                        completedCards: completed,
                        stage: nextStage,
                    },
                };
            });
        };

        const datasetRowCountHint = get().datasetProfile?.rowCount ?? data.data.length;
        const buildAggregatePayload = (plan: AnalysisPlan): AggregatePayload | null =>
            buildAggregatePayloadForPlan(plan, datasetId, data, datasetRowCountHint, {
                preferredMode: get().aggregationModePreference,
            });

        const aggregateWithWorker = async (
            plan: AnalysisPlan,
            overrides?: { mode?: 'sample' | 'full'; allowFullScan?: boolean },
        ): Promise<{ result: AggregateResult; durationMs: number } | null> => {
            const payload = buildAggregatePayload(plan);
            if (!payload) return null;
            if (overrides?.mode) {
                payload.mode = overrides.mode;
            }
            if (overrides?.allowFullScan) {
                payload.allowFullScan = true;
            }
            const response = await dataTools.aggregate(payload);
            if (!response.ok) {
                addProgress(`Aggregation worker failed for "${plan.title}": ${response.reason}`, 'error');
                if (response.reason?.includes('IndexedDB')) {
                    addProgress('Your browser blocked IndexedDB inside workers; falling back to main thread.', 'error');
                }
                return null;
            }
            if (response.data.rows.length === 0) {
                addProgress(`Skipping "${plan.title}" due to empty aggregation result.`, 'error');
                return null;
            }
            return { result: response.data, durationMs: response.durationMs ?? 0 };
        };

        if (shouldTrackTimeline && plans.length > 0) {
            set(state => ({
                analysisTimeline: {
                    stage: state.analysisTimeline.stage === 'persisting' ? 'profiling' : state.analysisTimeline.stage,
                    totalCards: plans.length,
                    completedCards: 0,
                },
            }));
        }

        const processPlan = async (plan: AnalysisPlan) => {
            const planTraceId = beginTrace('proceed_to_analysis', `Run analysis "${plan.title}"`, 'pipeline');
            const finalizeTrace = (status: AgentActionStatus, details?: string) =>
                completeTrace(planTraceId, status, details);
            if (shouldAbort()) return null;
            try {
                addProgress(`Executing plan: ${plan.title}...`);
                if (runId) get().updateBusyStatus(`Executing "${plan.title}"...`);
                const preparation = preparePlanForExecution(plan, get().columnProfiles, data.data);
                if (!preparation.isValid) {
                    addProgress(`Skipping "${plan.title}" because ${preparation.errorMessage ?? 'the plan is invalid.'}`, 'error');
                    finalizeTrace('failed', preparation.errorMessage ?? 'Plan invalid.');
                    return null;
                }
                preparation.warnings.forEach(warning => addProgress(`${plan.title}: ${warning}`));

                const preparedPlan = preparation.plan;
                let aggregateResultWrapper: { result: AggregateResult; durationMs: number } | null = null;
                let aggregateResult: AggregateResult | null = null;
                let aggregateDuration = 0;
                let aggregatedData: CsvRow[] = [];
                try {
                    if (datasetId) {
                        aggregateResultWrapper = await aggregateWithWorker(preparedPlan);
                        if (aggregateResultWrapper) {
                            aggregateResult = aggregateResultWrapper.result;
                            aggregateDuration = aggregateResultWrapper.durationMs;
                        }
                    }
                    if (aggregateResult) {
                        aggregatedData = aggregateResult.rows;
                    } else {
                        aggregatedData = executePlan(data, preparedPlan);
                    }
                } catch (error) {
                    if (error instanceof PlanExecutionError && error.code === 'no_rows') {
                        const filterMessage = preparedPlan.rowFilter
                            ? `${preparedPlan.rowFilter.column} → ${preparedPlan.rowFilter.values.join(', ')}`
                            : 'the requested filter';
                        addProgress(`Skipping "${plan.title}" because ${filterMessage} returned no rows.`, 'error');
                        finalizeTrace('failed', error.message);
                        markTimelineStep();
                        return null;
                    }
                    throw error;
                }
                if (aggregatedData.length === 0) {
                    addProgress(`Skipping "${plan.title}" due to empty result.`, 'error');
                    finalizeTrace('failed', 'Aggregation returned 0 rows.');
                    markTimelineStep();
                    return null;
                }

                if (shouldAbort()) return null;

                addProgress(`AI is summarizing: ${plan.title}...`);
                if (runId) get().updateBusyStatus(`Summarizing "${plan.title}"...`);
                const summary = await generateSummary(preparedPlan.title, aggregatedData, settings, { signal: requestSignal() });

                if (shouldAbort()) return null;

                let dataRefId: string | null = null;
                let queryHash: string | null = aggregateResult?.provenance.queryHash ?? null;
                const isSampledResult = aggregateResult?.provenance.sampled ?? false;
                if (aggregateResult && datasetId) {
                    const persistResult = await dataTools.createCardFromResult({
                        datasetId,
                        title: preparedPlan.title,
                        kind: inferCardKind(preparedPlan),
                        explainer: summary,
                        result: aggregateResult,
                        plan: preparedPlan,
                    });
                    if (persistResult.ok) {
                        dataRefId = persistResult.data.cardId;
                    } else {
                        addProgress(`View cache save failed for "${preparedPlan.title}": ${persistResult.reason}`, 'error');
                    }
                }

                const categoryCount = aggregatedData.length;
                const shouldApplyDefaultTop8 = preparedPlan.chartType !== 'scatter' && categoryCount > 15;
                const aggregationMeta: AggregationMeta | undefined = aggregateResult
                    ? {
                          mode: aggregateResult.provenance.mode,
                          sampled: aggregateResult.provenance.sampled,
                          processedRows: aggregateResult.provenance.processedRows,
                          totalRows: aggregateResult.provenance.totalRows,
                          warnings: aggregateResult.provenance.warnings,
                          durationMs: aggregateDuration,
                          lastRunAt: new Date().toISOString(),
                          filterCount: aggregateResult.provenance.filterCount,
                          requestedMode:
                              aggregateResult.provenance.requestedMode ?? aggregateResult.provenance.mode,
                          downgradedFrom: aggregateResult.provenance.downgradedFrom,
                          downgradeReason: aggregateResult.provenance.downgradeReason,
                      }
                    : {
                          mode: 'full',
                          sampled: false,
                          processedRows: aggregatedData.length,
                          totalRows: aggregatedData.length,
                          warnings: datasetId
                              ? ['Aggregated on main thread because the worker response was unavailable.']
                              : [],
                          durationMs: aggregateDuration || undefined,
                          lastRunAt: new Date().toISOString(),
                          filterCount: preparedPlan.rowFilter ? 1 : 0,
                          requestedMode: get().aggregationModePreference ?? 'sample',
                      };

                const newCard: AnalysisCardData = {
                    id: `card-${Date.now()}-${Math.random()}`,
                    plan: preparedPlan,
                    aggregatedData,
                    summary,
                    displayChartType: preparedPlan.chartType,
                    isDataVisible: false,
                    topN: shouldApplyDefaultTop8 ? 8 : (preparedPlan.defaultTopN || null),
                    hideOthers: shouldApplyDefaultTop8 ? true : (preparedPlan.defaultHideOthers || false),
                    disableAnimation: isChatRequest || !isFirstCardInPipeline || get().analysisCards.length > 0,
                    hiddenLabels: [],
                    dataRefId,
                    queryHash,
                    isSampledResult: aggregationMeta?.sampled ?? isSampledResult,
                    aggregationMeta,
                };

                set(prev => ({ analysisCards: [...prev.analysisCards, newCard] }));
                markTimelineStep();

                const cardMemoryText = `[Chart: ${preparedPlan.title}] Description: ${preparedPlan.description}. AI Summary: ${summary.split('---')[0]}`;
                await vectorStore.addDocument({ id: newCard.id, text: cardMemoryText });
                addProgress(`View #${newCard.id.slice(-6)} indexed for long-term memory.`);

                isFirstCardInPipeline = false;
                addProgress(`Saved as View #${newCard.id.slice(-6)}`);
                finalizeTrace('succeeded', `Created card with ${aggregatedData.length} rows.`);
                return newCard;
            } catch (error) {
                if (shouldAbort()) {
                    addProgress(`Cancelled "${plan.title}" before completion.`);
                    completeTrace(planTraceId, 'failed', 'Cancelled before completion.');
                    markTimelineStep();
                    return null;
                }
                console.error('Error executing plan:', plan.title, error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                addProgress(`Error executing plan "${plan.title}": ${errorMessage}`, 'error');
                finalizeTrace('failed', errorMessage);
                markTimelineStep();
                return null;
            }
        };

        const createdCards = (await Promise.all(plans.map(processPlan))).filter((c): c is AnalysisCardData => c !== null);

        if (!isChatRequest && createdCards.length > 0 && !shouldAbort()) {
            addProgress('AI is forming its core understanding of the data...');
            if (runId) get().updateBusyStatus('Forming core understanding...');

            const cardContext: CardContext[] = createdCards.map(c => ({
                id: c.id,
                title: c.plan.title,
                aggregatedDataSample: c.aggregatedData.slice(0, 10),
            }));

            const coreSummary = await generateCoreAnalysisSummary(cardContext, get().columnProfiles, settings, { signal: requestSignal() });
            if (shouldAbort()) return createdCards;

            const thinkingMessage: ChatMessage = { sender: 'ai', text: coreSummary, timestamp: new Date(), type: 'ai_thinking' };
            set(prev => ({
                aiCoreAnalysisSummary: coreSummary,
                chatHistory: [...prev.chatHistory, thinkingMessage],
            }));

            addProgress("Indexing core analysis for long-term memory...");
            await vectorStore.addDocument({ id: 'core-summary', text: `Core Analysis Summary: ${coreSummary}` });
            addProgress("Core analysis indexed.");

            if (shouldAbort()) return createdCards;

            addProgress('AI is looking for key insights...');
            if (runId) get().updateBusyStatus('Looking for key insights...');
            const proactiveInsight = await generateProactiveInsights(cardContext, settings, { signal: requestSignal() });

            if (shouldAbort()) return createdCards;

            if (proactiveInsight) {
                const insightMessage: ChatMessage = {
                    sender: 'ai',
                    text: proactiveInsight.insight,
                    timestamp: new Date(),
                    type: 'ai_proactive_insight',
                    cardId: proactiveInsight.cardId,
                };
                set(prev => ({ chatHistory: [...prev.chatHistory, insightMessage] }));
                addProgress(`AI proactively identified an insight in View #${proactiveInsight.cardId.slice(-6)}.`);
            }

            if (shouldAbort()) return createdCards;

            const finalSummaryText = await generateFinalSummary(createdCards, settings, { signal: requestSignal() });
            if (shouldAbort()) return createdCards;

            set({ finalSummary: finalSummaryText });
            addProgress('Overall summary generated.');
        }
        return createdCards;
    },
    
    handleInitialAnalysis: async (dataForAnalysis, options = {}) => {
        if (!dataForAnalysis) return;
        set(state => {
            if (state.analysisTimeline.stage === 'persisting') {
                return {};
            }
            return {
                analysisTimeline: {
                    ...state.analysisTimeline,
                    stage: 'profiling',
                    totalCards: 0,
                    completedCards: 0,
                },
            };
        });
        const { runId: providedRunId } = options;
        await runWithBusyState(
            {
                beginBusy: get().beginBusy,
                endBusy: get().endBusy,
            },
            'Running analysis...',
            async (runId) => {
                get().addProgress('Starting main analysis...');
                try {
                    get().addProgress('AI is generating analysis plans...');
                    get().updateBusyStatus('Drafting analysis plans...');
                    const planResult = await generateAnalysisPlans(
                        get().columnProfiles,
                        dataForAnalysis.data.slice(0, 5),
                        get().settings,
                        { signal: getRunSignal(runId) }
                    );
                    planResult.warnings.forEach((warning: PlanGenerationWarning) => {
                        const warningMessage = `Plan generator warning: ${warning.message}`;
                        get().addProgress(warningMessage, 'error');
                        get().addToast(warning.message, 'error', 6000);
                    });
                    const plans = planResult.plans;

                    if (runId && get().isRunCancellationRequested(runId)) {
                        get().addProgress('Analysis cancelled before execution.');
                        return;
                    }

                    get().addProgress(`AI proposed ${plans.length} plans.`);
                    
                    if (plans.length > 0) {
                        await get().runAnalysisPipeline(plans, dataForAnalysis, { runId });
                    } else {
                        get().addProgress('AI did not propose any analysis plans.', 'error');
                        set(state => ({
                            analysisTimeline: { ...state.analysisTimeline, stage: 'idle', totalCards: 0, completedCards: 0 },
                        }));
                    }
                } catch (error) {
                    if (error instanceof PlanGenerationFatalError) {
                        error.warnings.forEach(warning => {
                            get().addProgress(`Plan generator warning: ${warning.message}`, 'error');
                            get().addToast(warning.message, 'error', 7000);
                        });
                        get().addProgress('Plan generation failed. Please retry analysis or adjust your prompt.', 'error');
                        get().addToast('Plan generation failed. Retry?', 'error', 0, {
                            label: 'Retry analysis',
                            onClick: () => {
                                const latestData = get().csvData;
                                if (latestData) {
                                    get().handleInitialAnalysis(latestData);
                                }
                            },
                        });
                        set(state => ({
                            analysisTimeline: { ...state.analysisTimeline, stage: 'idle' },
                        }));
                    } else if (!(runId && get().isRunCancellationRequested(runId))) {
                        console.error('Analysis pipeline error:', error);
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        get().addProgress(`Error during analysis: ${errorMessage}`, 'error');
                        get().addToast('Analysis failed. Retry?', 'error', 0, {
                            label: 'Retry',
                            onClick: () => {
                                const latestData = get().csvData;
                                if (latestData) {
                                    get().handleInitialAnalysis(latestData);
                                }
                            },
                        });
                    }
                } finally {
                    if (runId && get().isRunCancellationRequested(runId)) {
                        get().addProgress('Stopped current analysis.');
                    } else {
                        get().addProgress('Analysis complete. Ready for chat.');
                    }
                }
            },
            { runId: providedRunId, cancellable: true },
        );
    },

    regenerateAnalyses: async (newData) => {
        get().addProgress('Data has changed. Regenerating all analysis cards...');
        const existingPlans = get().analysisCards.map(card => card.plan);
        set({ analysisCards: [], finalSummary: null });

        await runWithBusyState(
            {
                beginBusy: get().beginBusy,
                endBusy: get().endBusy,
            },
            'Regenerating insight cards...',
            async (runId) => {
                try {
                    if (existingPlans.length > 0) {
                        const newCards = await get().runAnalysisPipeline(existingPlans, newData, { isChatRequest: true, runId });
                        if (newCards.length > 0 && !(runId && get().isRunCancellationRequested(runId))) {
                            const newFinalSummary = await generateFinalSummary(newCards, get().settings, { signal: getRunSignal(runId) });
                            if (!(runId && get().isRunCancellationRequested(runId))) {
                                set({ finalSummary: newFinalSummary });
                                get().addProgress('All analysis cards have been updated.');
                            }
                        }
                    } else {
                        get().addProgress('No existing plans found to regenerate.', 'error');
                    }
                } catch (error) {
                    if (!(runId && get().isRunCancellationRequested(runId))) {
                        console.error('Error regenerating analyses:', error);
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        get().addProgress(`Error updating analyses: ${errorMessage}`, 'error');
                    }
                }
            },
            { cancellable: true },
        );
    },
    
    executeDomAction: (action) => {
        get().addProgress(`AI is performing action: ${action.toolName}...`);
        const updateCardById = (cardId: string, updater: (card: AnalysisCardData) => AnalysisCardData | null) => {
            set(prev => {
                const cardIndex = prev.analysisCards.findIndex(c => c.id === cardId);
                if (cardIndex === -1) return {};
                const updatedCard = updater(prev.analysisCards[cardIndex]);
                if (!updatedCard) return {};
                const newCards = [...prev.analysisCards];
                newCards[cardIndex] = updatedCard;
                return { analysisCards: newCards };
            });
        };

        const getCardById = (cardId: string) => get().analysisCards.find(c => c.id === cardId);
        const buildDisplayData = (card: AnalysisCardData) => {
            const groupByKey = card.plan.groupByColumn || '';
            const valueKey = card.plan.valueColumn || 'count';
            let data = card.aggregatedData;
            const activeFilter = card.filter;

            if (activeFilter?.column && activeFilter.values && activeFilter.values.length > 0) {
                data = data.filter(row => activeFilter.values.includes(row[activeFilter.column]));
            }

            if (card.plan.chartType !== 'scatter' && groupByKey && card.topN) {
                data = applyTopNWithOthers(data, groupByKey, valueKey, card.topN);
            }

            if (card.topN && card.hideOthers && groupByKey) {
                data = data.filter(row => row[groupByKey] !== 'Others');
            }

            if (groupByKey && card.hiddenLabels && card.hiddenLabels.length > 0) {
                const hiddenSet = new Set(card.hiddenLabels.map(String));
                data = data.filter(row => !hiddenSet.has(String(row[groupByKey])));
            }
            return data;
        };

        switch(action.toolName) {
            case 'highlightCard': {
                const cardId = action.args.cardId;
                const element = document.getElementById(cardId);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.classList.add('ring-4', 'ring-blue-500', 'transition-all', 'duration-500');
                    setTimeout(() => element.classList.remove('ring-4', 'ring-blue-500'), 2500);
                }
                break;
            }
            case 'changeCardChartType': {
                const { cardId, newType } = action.args;
                updateCardById(cardId, card => ({ ...card, displayChartType: newType as ChartType }));
                break;
            }
            case 'showCardData': {
                const { cardId, visible } = action.args;
                const isVisible = typeof visible === 'boolean' ? visible : true;
                updateCardById(cardId, card => ({ ...card, isDataVisible: isVisible }));
                break;
            }
            case 'filterCard': {
                const { cardId, column, values } = action.args;
                if (!column) break;
                const filterValues = Array.isArray(values) ? values : [];
                updateCardById(cardId, card => ({
                    ...card,
                    filter: filterValues.length > 0 ? { column, values: filterValues } : undefined,
                }));
                break;
            }
            case 'setTopN': {
                const { cardId, topN } = action.args;
                const normalizedTopN =
                    topN === null || topN === undefined || topN === 'all'
                        ? null
                        : Number(topN);
                if (normalizedTopN !== null && (!Number.isFinite(normalizedTopN) || normalizedTopN <= 0)) {
                    break;
                }
                updateCardById(cardId, card => ({ ...card, topN: normalizedTopN }));
                break;
            }
            case 'toggleHideOthers': {
                const { cardId, hide } = action.args;
                updateCardById(cardId, card => ({
                    ...card,
                    hideOthers: typeof hide === 'boolean' ? hide : !card.hideOthers,
                }));
                break;
            }
            case 'toggleLegendLabel': {
                const { cardId, label } = action.args;
                if (!label) break;
                updateCardById(cardId, card => {
                    const currentHidden = card.hiddenLabels || [];
                    const exists = currentHidden.includes(label);
                    const newHidden = exists ? currentHidden.filter(l => l !== label) : [...currentHidden, label];
                    return { ...card, hiddenLabels: newHidden };
                });
                break;
            }
            case 'exportCard': {
                const { cardId, format = 'png' } = action.args;
                const card = getCardById(cardId);
                const cardElement = document.getElementById(cardId);
                if (!card || !cardElement) {
                    console.warn('exportCard: card or DOM node not found', cardId);
                    break;
                }
                const dataForDisplay = buildDisplayData(card);
                const normalizedFormat = typeof format === 'string' ? format.toLowerCase() : 'png';
                (async () => {
                    try {
                        switch(normalizedFormat) {
                            case 'csv':
                                exportToCsv(dataForDisplay, card.plan.title);
                                break;
                            case 'html':
                                await exportToHtml(cardElement, card.plan.title, dataForDisplay, card.summary);
                                break;
                            default:
                                await exportToPng(cardElement, card.plan.title);
                                break;
                        }
                        get().addProgress(`Exported "${card.plan.title}" as ${normalizedFormat.toUpperCase()}.`);
                    } catch (error) {
                        console.error('Failed to export card', error);
                        get().addProgress('Export failed. Please try again.', 'error');
                    }
                })();
                break;
            }
            case 'removeCard': {
                const { cardId } = action.args;
                if (!cardId || typeof cardId !== 'string') break;
                let removedTitle: string | null = null;
                let removed = false;
                set(state => {
                    const target = state.analysisCards.find(card => card.id === cardId);
                    if (!target) {
                        return {};
                    }
                    removed = true;
                    removedTitle = target.plan?.title ?? cardId;
                    const next: Partial<StoreState> = {
                        analysisCards: state.analysisCards.filter(card => card.id !== cardId),
                    };
                    if (state.interactiveSelectionFilter?.sourceCardId === cardId) {
                        next.interactiveSelectionFilter = null;
                    }
                    return next;
                });
                if (removed) {
                    get().addProgress(`Removed card "${removedTitle ?? cardId}" as requested.`);
                } else {
                    get().addProgress('Unable to remove the requested card because it was not found.', 'error');
                }
                break;
            }
            default:
                break;
        }
    },


    handleExternalCsvPayload: async (payload: ExternalCsvPayload) => {
        if (!payload || typeof payload.csv !== 'string' || !payload.csv.trim()) {
            get().addToast('Received empty CSV payload from source page.', 'error');
            return;
        }
        const fileName = payload.fileName?.trim() || buildFileNameFromHeader(payload.header);
        const blob = new Blob([payload.csv], { type: 'text/csv' });
        let file: File;
        try {
            file = new File([blob], fileName, { type: 'text/csv' });
        } catch {
            file = Object.assign(blob, { name: fileName, lastModified: Date.now() }) as File;
        }

        try {
            await get().handleFileUpload(file);
        } catch (error) {
            console.error('Failed to import CSV payload from opener.', error);
            get().addToast('Failed to import CSV from report page.', 'error');
        }
    },

    handleChartTypeChange: (cardId, newType) => {
        set(state => ({
            analysisCards: state.analysisCards.map(c => c.id === cardId ? {...c, displayChartType: newType} : c)
        }));
    },
    
    handleToggleDataVisibility: (cardId) => {
        set(state => ({
            analysisCards: state.analysisCards.map(c => c.id === cardId ? {...c, isDataVisible: !c.isDataVisible} : c)
        }));
    },
    
    handleTopNChange: (cardId, topN) => {
        set(state => ({
            analysisCards: state.analysisCards.map(c => c.id === cardId ? {...c, topN: topN} : c)
        }));
    },
    
    handleHideOthersChange: (cardId, hide) => {
        set(state => ({
            analysisCards: state.analysisCards.map(c => c.id === cardId ? {...c, hideOthers: hide} : c)
        }));
    },
    
    handleToggleLegendLabel: (cardId, label) => {
        set(state => ({
            analysisCards: state.analysisCards.map(c => {
                if (c.id === cardId) {
                    const currentHidden = c.hiddenLabels || [];
                    const newHidden = currentHidden.includes(label) ? currentHidden.filter(l => l !== label) : [...currentHidden, label];
                    return { ...c, hiddenLabels: newHidden };
                }
                return c;
            })
        }));
    },
    setAggregationModePreference: (mode) => {
        if (get().aggregationModePreference === mode) return;
        set({ aggregationModePreference: mode });
        const summary =
            mode === 'full'
                ? 'Full scan mode enabled — charts will process every cached row.'
                : 'Sample mode enabled — charts will use a fast preview.';
        get().addProgress(summary);
    },
    rerunAggregationForCard: async (cardId, options = {}) => {
        const card = get().analysisCards.find(c => c.id === cardId);
        const datasetId = get().datasetHash;
        const csvData = get().csvData;
        if (!card || !datasetId) {
            get().addProgress('Cannot refresh this chart because the dataset is unavailable.', 'error');
            return false;
        }
        const datasetRowCount = get().datasetProfile?.rowCount ?? csvData?.data?.length ?? 0;
        const payload = buildAggregatePayloadForPlan(card.plan, datasetId, csvData, datasetRowCount, {
            preferredMode: get().aggregationModePreference,
        });
        if (!payload) {
            get().addProgress(`"${card.plan.title}" cannot be recalculated automatically.`, 'error');
            return false;
        }
        if (options.mode) {
            payload.mode = options.mode;
        }
        if (options.allowFullScan) {
            payload.allowFullScan = true;
        }
        const traceId = get().beginAgentActionTrace(
            'proceed_to_analysis',
            `Manual aggregation rerun: ${card.plan.title}`,
            'system',
        );
        get().updateAgentActionTrace(traceId, 'executing', undefined, {
            metadata: {
                cardId,
                requestedMode: payload.mode,
                allowFullScan: !!payload.allowFullScan,
            },
        });
        const response = await dataTools.aggregate(payload);
        if (!response.ok) {
            get().addProgress(`Aggregation refresh failed for "${card.plan.title}": ${response.reason}`, 'error');
            get().addToast(`Full scan failed: ${response.reason}`, 'error');
            get().updateAgentActionTrace(traceId, 'failed', response.reason ?? 'Aggregation failed.', {
                metadata: {
                    cardId,
                    requestedMode: payload.mode,
                    allowFullScan: !!payload.allowFullScan,
                },
            });
            return false;
        }
        const aggregateResult = response.data;
        const aggregationMeta: AggregationMeta = {
            mode: aggregateResult.provenance.mode,
            sampled: aggregateResult.provenance.sampled,
            processedRows: aggregateResult.provenance.processedRows,
            totalRows: aggregateResult.provenance.totalRows,
            warnings: aggregateResult.provenance.warnings,
            durationMs: response.durationMs ?? 0,
            lastRunAt: new Date().toISOString(),
            filterCount: aggregateResult.provenance.filterCount,
            requestedMode: aggregateResult.provenance.requestedMode ?? aggregateResult.provenance.mode,
            downgradedFrom: aggregateResult.provenance.downgradedFrom,
            downgradeReason: aggregateResult.provenance.downgradeReason,
        };
        set(state => ({
            analysisCards: state.analysisCards.map(existing =>
                existing.id === cardId
                    ? {
                          ...existing,
                          aggregatedData: aggregateResult.rows,
                          isSampledResult: aggregationMeta.sampled,
                          aggregationMeta,
                      }
                    : existing,
            ),
        }));
        get().addProgress(
            `${card.plan.title} refreshed (${aggregationMeta.sampled ? 'sampled' : 'full scan'}).`,
        );
        get().addToast(
            aggregationMeta.sampled
                ? `"${card.plan.title}" refreshed on sampled rows.`
                : `"${card.plan.title}" full scan completed.`,
            'success',
        );
        get().updateAgentActionTrace(traceId, 'succeeded', 'Aggregation refreshed.', {
            metadata: {
                cardId,
                mode: aggregationMeta.mode,
                processedRows: aggregationMeta.processedRows,
                totalRows: aggregationMeta.totalRows,
                durationMs: aggregationMeta.durationMs,
                warnings: aggregationMeta.warnings,
            },
        });
        return true;
    },

    clearCardFilter: (cardId) => {
        set(state => ({
            analysisCards: state.analysisCards.map(card =>
                card.id === cardId ? { ...card, filter: undefined } : card
            ),
        }));
    },

    triggerAutoSaveNow: () => {
        triggerAutoSaveImmediately();
    },

    handleLoadReport: async (id) => {
        get().addProgress(`Loading report ${id}...`);
        const report = await getReport(id);
        if (report) {
            vectorStore.clear();
            set({ 
                ...report.appState, 
                agentAwaitingUserInput: report.appState.agentAwaitingUserInput ?? false,
                agentAwaitingPromptId: report.appState.agentAwaitingPromptId ?? null,
                currentView: 'analysis_dashboard', 
                isHistoryPanelOpen: false,
                chatMemoryPreview: [],
                chatMemoryExclusions: [],
                chatMemoryPreviewQuery: '',
                isMemoryPreviewLoading: false,
                agentActionTraces: report.appState.agentActionTraces ?? [],
                agentValidationEvents: report.appState.agentValidationEvents ?? [],
                columnAliasMap: report.appState.columnAliasMap ?? deriveAliasMap(report.appState.columnProfiles ?? []),
                plannerSession: normalizePlannerSession(report.appState.plannerSession),
                plannerDatasetHash: report.appState.plannerDatasetHash ?? report.appState.datasetHash ?? null,
            });
            await restoreVectorMemoryFromSnapshot(
                report.appState.vectorStoreDocuments,
                report.appState.datasetHash,
                get().datasetHash,
                get().addProgress,
                get().addToast,
                get().dismissToast,
                'Restored AI long-term memory from loaded report.',
            );
            get().addProgress(`Report "${report.filename}" loaded.`);
            seedAutoSaveCreatedAt(report.createdAt);
        } else {
            get().addProgress(`Failed to load report ${id}.`, 'error');
        }
    },

    handleDeleteReport: async (id) => {
        await deleteReport(id);
        await get().loadReportsList();
    },
    
    handleShowCardFromChat: (cardId) => {
        const element = document.getElementById(cardId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('ring-4', 'ring-blue-500', 'transition-all', 'duration-500');
            setTimeout(() => element.classList.remove('ring-4', 'ring-blue-500'), 2500);
        }
    },

    // Simple setters
    setAgentPhase: (phase, message) =>
        set({
            agentPhase: {
                phase,
                message: message ?? null,
                enteredAt: new Date().toISOString(),
            },
        }),
    setIsAsideVisible: (isVisible) => set({ isAsideVisible: isVisible }),
    setAsideWidth: (width) => set({ asideWidth: width }),
    setIsSpreadsheetVisible: (isVisible) => set({ isSpreadsheetVisible: isVisible }),
    setIsDataPrepDebugVisible: (isVisible) => set({ isDataPrepDebugVisible: isVisible }),
    setIsSettingsModalOpen: (isOpen) => set({ isSettingsModalOpen: isOpen }),
    setIsHistoryPanelOpen: (isOpen) => set({ isHistoryPanelOpen: isOpen }),
    setIsMemoryPanelOpen: (isOpen) => set({ isMemoryPanelOpen: isOpen }),
    setIsResizing: (isResizing) => set({ isResizing: isResizing }),
    recordAgentValidationEvent: ({ actionType, reason, actionIndex, runId, retryInstruction, timestamp }) => {
        const event: AgentValidationEvent = {
            id: createValidationEventId(),
            actionType,
            reason,
            actionIndex,
            runId: runId ?? null,
            retryInstruction,
            timestamp: timestamp ?? new Date().toISOString(),
        };
        set(state => {
            const updated = [...state.agentValidationEvents, event];
            return {
                agentValidationEvents: updated.slice(-MAX_AGENT_VALIDATION_EVENTS),
            };
        });
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
            window.dispatchEvent(new CustomEvent('agent-validation-event', { detail: event }));
        }
    },
    dismissAgentValidationEvent: (eventId) => {
        set(state => ({
            agentValidationEvents: state.agentValidationEvents.filter(event => event.id !== eventId),
        }));
    },
    clearAgentValidationEvents: () => set({ agentValidationEvents: [] }),
    recordPromptMetric: (metric: AgentPromptMetric) => {
        set(state => {
            const next = [...state.agentPromptMetrics, metric];
            return { agentPromptMetrics: next.slice(-20) };
        });
    },
    clearPromptMetrics: () => set({ agentPromptMetrics: [] }),
    beginAgentActionTrace: (actionType, summary, source: AgentActionSource = 'chat') => {
        const traceId = `trace-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const newTrace = {
            id: traceId,
            actionType,
            status: 'observing' as AgentActionStatus,
            summary,
            timestamp: new Date(),
            source,
        };
        set(state => {
            const updated = [...state.agentActionTraces, newTrace];
            return { agentActionTraces: updated.slice(-MAX_AGENT_TRACE_HISTORY) };
        });
        return traceId;
    },
        updateAgentActionTrace: (traceId, status, details, telemetry) => {
            set(state => ({
                agentActionTraces: state.agentActionTraces.map(trace => {
                    if (trace.id !== traceId) return trace;
                    const mergedMetadata = telemetry?.metadata
                        ? { ...(trace.metadata ?? {}), ...telemetry.metadata }
                        : trace.metadata;
                    return {
                        ...trace,
                        status,
                        details,
                        timestamp: new Date(),
                        durationMs: telemetry?.durationMs ?? trace.durationMs,
                        errorCode: telemetry?.errorCode ?? trace.errorCode,
                        metadata: mergedMetadata,
                    };
                }),
            }));
        },
        annotateAgentActionTrace: (traceId, metadata) => {
            if (!metadata || Object.keys(metadata).length === 0) {
                return;
            }
            set(state => ({
                agentActionTraces: state.agentActionTraces.map(trace =>
                    trace.id === traceId
                        ? { ...trace, metadata: { ...(trace.metadata ?? {}), ...metadata } }
                        : trace,
                ),
            }));
        },
        appendPlannerObservation: (observation: AgentObservation) => {
            set(state => {
                const nextObservations = [...state.plannerSession.observations, observation].slice(-MAX_PLANNER_OBSERVATIONS);
                return { plannerSession: { ...state.plannerSession, observations: nextObservations } };
            });
        },
        resetPlannerObservations: () => {
            set(state => ({ plannerSession: { ...state.plannerSession, observations: [] } }));
        },
        updatePlannerPlanState: (planState: AgentPlanState) => {
            const normalizedSteps = normalizePlanSteps(planState.nextSteps);
            set(state => ({
                plannerSession: { ...state.plannerSession, planState: { ...planState, nextSteps: normalizedSteps } },
                plannerPendingSteps: normalizedSteps,
                plannerDatasetHash: state.datasetHash ?? null,
            }));
        },
        clearPlannerPlanState: () => {
            set(state => ({
                plannerSession: { ...state.plannerSession, planState: null },
                plannerPendingSteps: [],
                plannerDatasetHash: null,
            }));
        },
        setPlannerPendingSteps: (steps: AgentPlanStep[]) => {
            set({ plannerPendingSteps: normalizePlanSteps(steps) });
        },
        completePlannerPendingStep: () => {
            set(state =>
                state.plannerPendingSteps.length === 0
                    ? {}
                    : { plannerPendingSteps: state.plannerPendingSteps.slice(1) },
            );
        },
    focusDataPreview: () => {
        set({ isSpreadsheetVisible: true });
        setTimeout(() => {
            document.getElementById('raw-data-explorer')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    },
};
});

updateAutoSaveConfiguration(useAppStore.getState().settings);
autoSaveManager = new AutoSaveManager({
    getStore: () => useAppStore.getState(),
    buildSnapshot: buildSerializableAppState,
    addToast: (message, type, duration, action) =>
        useAppStore.getState().addToast(message, type, duration, action),
    dismissToast: (toastId) => useAppStore.getState().dismissToast(toastId),
});
if (latestAutoSaveConfig) {
    autoSaveManager.configure(latestAutoSaveConfig);
}
