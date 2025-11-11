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
    QuickActionId,
    DatasetRuntimeConfig,
    AiAction,
    AwaitUserPayload,
    AwaitInteractionRecord,
    GraphToolCall,
    GraphToolKind,
    GraphToolInFlightSnapshot,
    LlmUsageEntry,
    GraphToolMeta,
} from '../types';
import type { GraphObservation } from '@/src/graph/schema';
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
import { graphBus } from '../src/bus/client';
import { langGraphBus } from '../src/bus/langGraphClient';
import type { GraphClientEvent, GraphWorkerEvent } from '../src/graph/contracts';
import { buildAggregatePayloadForPlan } from '@/utils/aggregatePayload';
import { graphDataTools, GraphToolExecutionError, type GraphToolResponse } from '@/tools/data';
import { isGraphToolOption } from '@/src/graph/toolSpecs';
import { toLangChainPlanGraphPayload } from '@/services/langchain/types';
import type { LangChainPlanEnvelope, LangChainPlanTelemetry } from '@/services/langchain/types';
import type { PlanGenerationUsageEntry } from '@/services/ai/planGenerator';
import { dataTools, type AggregateResult, type AggregatePayload, type ProfileResult } from '../services/dataTools';
import {
    persistCleanDataset,
    readCardResults,
    readAllRows,
    readColumnStoreRecord,
    readProvenance,
    readMemorySnapshots,
    saveMemorySnapshot,
    ensureDatasetRuntimeConfig,
    updateDatasetRuntimeConfig,
    type CardDataRef,
    type ViewStoreRecord,
    type CardKind,
    type MemorySnapshotInput,
} from '../services/csvAgentDb';
import {
    rememberDatasetId,
    forgetDatasetId,
    getRememberedDatasetId,
    LAST_DATASET_STORAGE_KEY,
} from '../utils/datasetCache';
import { getErrorMessage } from '../services/errorMessages';
import { ERROR_CODES, type ErrorCode } from '../services/errorCodes';
import { getGroupableColumnCandidates } from '../utils/groupByInference';
import { AUTO_FULL_SCAN_ROW_THRESHOLD } from '../services/runtimeConfig';
import { estimateLlmCostUsd } from '../services/ai/llmPricing';
import type { LlmUsageMetrics } from '@/services/ai/apiClient';

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
let graphBridgeInitialized = false;
let graphBridgeRuntime: 'legacy' | 'langgraph' | null = null;
let graphBridgeUnsubscribe: (() => void) | null = null;

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

const describeToolFailure = (code?: ErrorCode, reason?: string): string =>
    getErrorMessage(code, reason).detail;

const buildToolObservation = (
    kind: GraphToolCall['kind'],
    summary: string,
    meta: GraphToolMeta,
    payload?: Record<string, unknown>,
): AgentObservation => ({
    id: `obs-tool-${kind}-${Date.now().toString(36)}`,
    actionId: kind,
    responseType: 'execute_js_code',
    status: 'success',
    timestamp: new Date().toISOString(),
    outputs: {
        summary,
        meta,
        payload,
    },
});

const buildToolErrorObservation = (
    kind: GraphToolCall['kind'],
    summary: string,
    payload?: Record<string, unknown>,
    code?: ErrorCode,
): AgentObservation => ({
    id: `obs-tool-${kind}-err-${Date.now().toString(36)}`,
    actionId: kind,
    responseType: 'execute_js_code',
    status: 'error',
    timestamp: new Date().toISOString(),
    outputs: {
        summary,
        ...(payload ?? {}),
    },
    errorCode: code ?? ERROR_CODES.UNKNOWN,
});

const requestFullScanApproval = (title: string): boolean => {
    if (typeof window === 'undefined') return true;
    return window.confirm(
        `“${title}” 需要扫描所有已缓存的行才能完成分析。\n这可能耗时更久。是否启用全量扫描？`,
    );
};

const MAX_LLM_USAGE_LOG = 40;

const createLlmUsageEntry = (usage: Omit<LlmUsageEntry, 'id' | 'timestamp'>): LlmUsageEntry => ({
    ...usage,
    id: `llm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
});

const formatTokenSummary = (entry: LlmUsageEntry): string => {
    const segments: string[] = [];
    if (typeof entry.promptTokens === 'number') {
        segments.push(`in ${entry.promptTokens}`);
    }
    if (typeof entry.completionTokens === 'number') {
        segments.push(`out ${entry.completionTokens}`);
    }
    if (typeof entry.totalTokens === 'number') {
        segments.push(`total ${entry.totalTokens}`);
    }
    return segments.length > 0 ? `tokens ${segments.join(' / ')}` : 'tokens n/a';
};

const describeLlmUsageEntry = (entry: LlmUsageEntry): string => {
    const costText =
        entry.estimatedCostUsd != null ? `$${entry.estimatedCostUsd.toFixed(4)}` : 'cost n/a';
    return `${entry.context}: ${entry.provider}/${entry.model} — ${formatTokenSummary(entry)}, ${costText}`;
};

const mapUsageMetricsToEntry = (
    usage: LlmUsageMetrics,
    fallbackContext: string,
): Omit<LlmUsageEntry, 'id' | 'timestamp'> => ({
    provider: usage.provider,
    model: usage.model,
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    totalTokens: usage.totalTokens,
    context: usage.operation ?? fallbackContext,
});

const graphObservationKindLabel: Record<string, string> = {
    langchain_plan: 'LangChain Plan',
    aggregate_plan: 'Plan Preview',
    profile_dataset: 'Dataset Profile',
    normalize_invoice_month: 'Invoice Month Cleanup',
    detect_outliers: 'Outlier Detection',
    tool_result: 'Tool Result',
};

const formatGraphObservationForLog = (observation: GraphObservation): string => {
    const payload = (observation.payload ?? {}) as Record<string, any>;
    const label = graphObservationKindLabel[observation.kind] ?? observation.kind;
    const parts: string[] = [`[Observation] ${label}`];
    if (typeof payload.summary === 'string') {
        parts.push(payload.summary);
    } else if (typeof payload.description === 'string') {
        parts.push(payload.description);
    }
    const meta = payload.meta ?? {};
    if (typeof meta.rows === 'number') {
        parts.push(`${meta.rows} 行`);
    }
    if (typeof meta.source === 'string') {
        parts.push(meta.source === 'full' ? '全量' : '采样');
    }
    const telemetry = payload.telemetry ?? meta.telemetry;
    if (telemetry) {
        const tokenUsage = telemetry.tokenUsage;
        if (tokenUsage) {
            const tokenParts: string[] = [];
            if (tokenUsage.promptTokens != null) tokenParts.push(`in ${tokenUsage.promptTokens}`);
            if (tokenUsage.completionTokens != null) tokenParts.push(`out ${tokenUsage.completionTokens}`);
            if (tokenUsage.totalTokens != null) tokenParts.push(`total ${tokenUsage.totalTokens}`);
            if (tokenParts.length) {
                parts.push(`Tok ${tokenParts.join(' / ')}`);
            }
        }
        if (telemetry.estimatedCostUsd != null) {
            parts.push(`$${telemetry.estimatedCostUsd.toFixed(4)}`);
        } else if (telemetry.latencyMs != null) {
            parts.push(`${Math.round(telemetry.latencyMs)} ms`);
        }
    } else if (typeof meta.durationMs === 'number') {
        parts.push(`${Math.round(meta.durationMs)} ms`);
    }
    return parts.join(' · ');
};

const formatLangChainTelemetry = (telemetry?: LangChainPlanTelemetry): string => {
    if (!telemetry) {
        return 'latency n/a, tokens n/a, cost n/a';
    }
    const latencyText = `${Math.round(telemetry.latencyMs)} ms`;
    const usage = telemetry.tokenUsage;
    let tokenText = 'tokens n/a';
    if (usage) {
        const prompt = usage.promptTokens;
        const completion = usage.completionTokens;
        const total =
            usage.totalTokens ??
            (prompt != null || completion != null
                ? (prompt ?? 0) + (completion ?? 0)
                : undefined);
        if (prompt != null || completion != null) {
            tokenText = `tokens ${prompt ?? '?'} in / ${completion ?? '?'} out${
                total != null ? ` (${total} total)` : ''
            }`;
        } else if (total != null) {
            tokenText = `tokens ${total}`;
        }
    }
    const costText =
        telemetry.estimatedCostUsd != null ? `$${telemetry.estimatedCostUsd.toFixed(4)}` : 'cost n/a';
    return `${latencyText}, ${tokenText}, cost ${costText}`;
};

const shouldUseLangChainPlannerForReply = (
    state: AppStore,
    optionId?: string | null,
    freeText?: string | null,
): boolean => {
    if (!state.langChainPlannerEnabled || !state.isApiKeySet) return false;
    if (isGraphToolOption(optionId)) return false;
    if (!state.datasetHash || !state.csvData || state.csvData.data.length === 0) return false;
    if (!state.columnProfiles.length) return false;
    // Allow free-text requests or non-tool options.
    return Boolean(optionId || (freeText && freeText.length > 0));
};

const runLangChainPlannerEnvelope = async (state: AppStore): Promise<LangChainPlanEnvelope> => {
    if (!state.datasetHash || !state.csvData) {
        throw new Error('Dataset unavailable for LangChain planner.');
    }
    const { generateLangChainPlanEnvelope } = await import('@/services/langchain/planBridge');
    return generateLangChainPlanEnvelope({
        datasetId: state.datasetHash,
        columns: state.columnProfiles,
        rows: state.csvData.data,
        settings: state.settings,
        addProgress: state.addProgress,
    });
};

const QUICK_ACTION_LABELS: Record<QuickActionId, { label: string; helper: string }> = {
    profile_dataset: {
        label: '📊 数据画像',
        helper: '快速检查列类型、缺失值与示例。',
    },
    open_raw_preview: {
        label: '🧾 查看原始表',
        helper: '跳到 Raw Data Explorer 检视原始行。',
    },
    topn_quick_chart: {
        label: '🏆 生成 Top-N 图',
        helper: '选用最佳分类/数值列，自动绘制 Top-N 视图。',
    },
};

const NUMERIC_PROFILE_TYPES = new Set<ColumnProfile['type']>(['numerical', 'currency', 'percentage']);
const CATEGORICAL_PROFILE_TYPES = new Set<ColumnProfile['type']>(['categorical', 'date', 'time']);

const selectMetricColumn = (profiles: ColumnProfile[]): ColumnProfile | null => {
    return (
        profiles
            .filter(profile => NUMERIC_PROFILE_TYPES.has(profile.type))
            .sort((a, b) => {
                const aScore = a.numericSampleCount ?? a.nonNullCount ?? 0;
                const bScore = b.numericSampleCount ?? b.nonNullCount ?? 0;
                return bScore - aScore;
            })[0] ?? null
    );
};

const buildQuickTopNPlan = (profiles: ColumnProfile[], sampleRows: CsvRow[]): AnalysisPlan | null => {
    const groupCandidates = getGroupableColumnCandidates(
        profiles.filter(profile => CATEGORICAL_PROFILE_TYPES.has(profile.type)),
        sampleRows,
    );
    if (groupCandidates.length === 0) return null;
    const preferredGroup =
        groupCandidates.find(candidate => {
            const distinct = candidate.uniqueValues ?? 0;
            return distinct >= 4 && distinct <= 40;
        }) ?? groupCandidates[0];
    const groupByColumn = preferredGroup?.profile?.name;
    if (!groupByColumn) return null;

    const metricProfile = selectMetricColumn(profiles);
    const valueColumn = metricProfile?.name ?? null;
    const planTitle = valueColumn
        ? `Top ${groupByColumn} by ${valueColumn}`
        : `Top ${groupByColumn} by count`;
    const planDescription = valueColumn
        ? `Summarize the largest ${groupByColumn} values using ${valueColumn}.`
        : `Show the most frequent ${groupByColumn} categories.`;

    const plan: AnalysisPlan = {
        chartType: 'bar',
        title: planTitle,
        description: planDescription,
        aggregation: valueColumn ? 'sum' : 'count',
        groupByColumn,
        valueColumn: valueColumn ?? undefined,
        defaultTopN: 8,
        defaultHideOthers: true,
        limit: 8,
        orderBy: [{ column: valueColumn ?? 'count', direction: 'desc' }],
    };
    return plan;
};

const getNextAwaitingClarificationId = (clarifications: ClarificationRequest[]): string | null =>
    clarifications.find(c => c.status === 'pending')?.id ?? null;

const MAX_GRAPH_AWAIT_HISTORY = 6;

const appendAwaitHistoryEntry = (
    history: AwaitInteractionRecord[],
    prompt: AwaitUserPayload,
    askedAt: string,
): AwaitInteractionRecord[] => {
    if (prompt.promptId) {
        const existingIndex = history.findIndex(entry => entry.promptId === prompt.promptId);
        if (existingIndex >= 0) {
            const nextHistory = [...history];
            nextHistory[existingIndex] = {
                ...nextHistory[existingIndex],
                question: prompt.question,
                optionsSnapshot: prompt.options,
                allowFreeText: prompt.allowFreeText,
                placeholder: prompt.placeholder,
                status: nextHistory[existingIndex].status === 'answered' ? 'answered' : 'waiting',
            };
            return nextHistory;
        }
    }
    const nextEntry: AwaitInteractionRecord = {
        promptId: prompt.promptId ?? null,
        question: prompt.question,
        optionsSnapshot: prompt.options,
        allowFreeText: prompt.allowFreeText,
        placeholder: prompt.placeholder,
        askedAt,
        status: 'waiting',
    };
    const updated = [...history, nextEntry];
    return updated.length > MAX_GRAPH_AWAIT_HISTORY ? updated.slice(-MAX_GRAPH_AWAIT_HISTORY) : updated;
};

const markAwaitHistoryAnswered = (
    history: AwaitInteractionRecord[],
    promptId: string | null,
    respondedAt: string,
    response: { label: string | null; value: string | null; type: 'option' | 'free_text' },
): AwaitInteractionRecord[] => {
    if (!history.length) return history;
    let targetIndex = -1;
    if (promptId) {
        targetIndex = history.findIndex(entry => entry.promptId === promptId);
    }
    if (targetIndex === -1) {
        for (let i = history.length - 1; i >= 0; i -= 1) {
            if (history[i].status === 'waiting') {
                targetIndex = i;
                break;
            }
        }
    }
    if (targetIndex === -1) return history;
    const updated = [...history];
    updated[targetIndex] = {
        ...updated[targetIndex],
        status: 'answered',
        respondedAt,
        responseLabel: response.label ?? response.value ?? null,
        responseValue: response.value,
        responseType: response.type,
    };
    return updated;
};

interface GraphToolVerificationPayload {
    description: string;
    summary: string;
    meta: GraphToolMeta;
    payload?: Record<string, unknown>;
}

const dispatchGraphToolResult = (verification: GraphToolVerificationPayload) => {
    if (!postGraphClientEvent({ type: 'graph/tool_result', verification, timestamp: Date.now() })) {
        return;
    }
    postGraphClientEvent({ type: 'graph/runPipeline', payload: { reason: 'verification' }, timestamp: Date.now() });
};

const describeGraphToolCall = (toolCall: GraphToolCall): string => {
    switch (toolCall.kind) {
        case 'profile_dataset':
            return '生成列画像';
        case 'normalize_invoice_month': {
            const column = typeof toolCall.params?.column === 'string' ? (toolCall.params.column as string) : 'InvoiceMonth';
            return `标准化 ${column}`;
        }
        case 'detect_outliers': {
            const valueColumn = typeof toolCall.params?.valueColumn === 'string' ? (toolCall.params.valueColumn as string) : 'Amount';
            return `侦测 ${valueColumn} 异常值`;
        }
        case 'aggregate_plan':
        default:
            return '运行数据工具';
    }
};

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
    graphToolInFlight: state.graphToolInFlight,
    analysisTimeline: state.analysisTimeline,
    langChainLastPlan: state.langChainLastPlan,
    langChainPlannerEnabled: state.langChainPlannerEnabled,
    useLangGraphRuntime: state.useLangGraphRuntime,
    llmUsageLog: state.llmUsageLog,
    graphObservations: state.graphObservations,
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
const SNAPSHOT_PREVIEW_LIMIT = 12;

const MAX_AGENT_TRACE_HISTORY = 40;
const MAX_PLANNER_OBSERVATIONS = 12;
const MAX_AGENT_VALIDATION_EVENTS = 25;
const deriveAliasMap = (profiles: ColumnProfile[] = []) => buildColumnAliasMap(profiles.map(p => p.name));

const computeSnapshotQualityScore = (rowCount: number, warningsCount: number, sampled: boolean): number => {
    const densityScore = Math.min(rowCount, 60) / 60;
    const warningPenalty = Math.max(0.4, 1 - warningsCount * 0.15);
    const samplingPenalty = sampled ? 0.9 : 1;
    return Number(((0.5 + densityScore * 0.5) * warningPenalty * samplingPenalty).toFixed(3));
};

const buildSnapshotTags = (plan: AnalysisPlan): string[] => {
    const tags = ['auto-memory'];
    if (plan.chartType) tags.push(`chart:${plan.chartType}`);
    if (plan.groupByColumn) tags.push(`group:${plan.groupByColumn}`);
    if (plan.valueColumn) tags.push(`value:${plan.valueColumn}`);
    if (plan.aggregation) tags.push(`agg:${plan.aggregation}`);
    return tags;
};

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
        valueSchema: view.dataRef.schema,
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
        datasetRuntimeConfig: null,
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
    aggregationModePreference: 'full',
    graphStatus: 'idle',
    graphStatusMessage: null,
    graphVersion: null,
    graphLastReadyAt: null,
    graphAwaitPrompt: null,
    graphAwaitPromptId: null,
    graphAwaitHistory: [],
    graphSessionId: null,
    graphLastToolSummary: null,
    graphToolInFlight: null,
    langChainLastPlan: null,
    langChainPlannerEnabled: true,
    useLangGraphRuntime: true,
    llmUsageLog: [],
    graphObservations: [],
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

    const getActiveGraphBus = () => (get().useLangGraphRuntime ? langGraphBus : graphBus);
    const getRuntimeLabel = () => (get().useLangGraphRuntime ? 'LangGraph' : 'Graph');
    const postGraphClientEvent = (event: GraphClientEvent): boolean => {
        const bus = getActiveGraphBus();
        if (!bus.isSupported) return false;
        bus.post(event);
        return true;
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

    const recordPlanTelemetryBatch = (contextPrefix: string, telemetry?: PlanGenerationUsageEntry[]) => {
        if (!telemetry || telemetry.length === 0) return;
        const recorder = get().recordLlmUsage;
        telemetry.forEach(entry => {
            recorder(mapUsageMetricsToEntry(entry, `${contextPrefix}.${entry.label}`));
        });
    };

    const beginGraphTool = (toolCall: GraphToolCall) => {
        const snapshot: GraphToolInFlightSnapshot = {
            kind: toolCall.kind,
            label: describeGraphToolCall(toolCall),
            startedAt: new Date().toISOString(),
        };
        set({ graphToolInFlight: snapshot });
    };

    const endGraphTool = () => {
        set({ graphToolInFlight: null });
    };

    const recordGraphToolSuccess = <K extends GraphToolKind>(
        response: GraphToolResponse<K>,
        options?: { description?: string },
    ) => {
        const payloadForLog = response.viewId
            ? { ...response.payload, viewId: response.viewId }
            : response.payload;
        const description =
            options?.description ??
            graphObservationKindLabel[payloadForLog.kind] ??
            payloadForLog.kind;
        set({ graphLastToolSummary: response.summary });
        get().addProgress(response.summary);
        dispatchGraphToolResult({
            description,
            summary: response.summary,
            meta: response.meta,
            payload: payloadForLog,
        });
        get().appendPlannerObservation(
            buildToolObservation(payloadForLog.kind, response.summary, response.meta, payloadForLog),
        );
    };

    const recordGraphToolFailure = (
        kind: GraphToolCall['kind'],
        code?: ErrorCode,
        reason?: string,
        suggestion?: string,
    ) => {
        const friendly = describeToolFailure(code, reason);
        const summary = `${graphObservationKindLabel[kind] ?? kind} failed：${friendly}`;
        const payload = {
            suggestion: suggestion ?? friendly,
            detail: reason ?? null,
        };
        set({ graphLastToolSummary: summary });
        get().addProgress(summary, 'error');
        get().appendPlannerObservation(buildToolErrorObservation(kind, friendly, payload, code));
        return summary;
    };

    const executeGraphToolCall = async (toolCall?: GraphToolCall): Promise<boolean> => {
        if (!toolCall) {
            return false;
        }
        switch (toolCall.kind) {
            case 'profile_dataset': {
                const datasetId = get().datasetHash;
                if (!datasetId) {
                    get().addProgress('Graph profile request skipped：没有载入的数据集。', 'error');
                    return false;
                }
                beginGraphTool(toolCall);
                try {
                    const sampleSize =
                        typeof toolCall.params?.sampleSize === 'number'
                            ? (toolCall.params.sampleSize as number)
                            : undefined;
                    const profile = await graphDataTools.profileDataset(datasetId, sampleSize);
                    recordGraphToolSuccess(profile, { description: 'Dataset profile' });
                    return true;
                } catch (error) {
                    const graphError = error instanceof GraphToolExecutionError ? error : null;
                    recordGraphToolFailure(
                        'profile_dataset',
                        graphError?.code,
                        graphError?.message ?? (error instanceof Error ? error.message : String(error)),
                        graphError?.suggestion,
                    );
                    return false;
                } finally {
                    endGraphTool();
                }
            }
            case 'normalize_invoice_month': {
                const csvData = get().csvData;
                if (!csvData) {
                    get().addProgress('Graph normalize request skipped：暂无 CSV 数据。', 'error');
                    return false;
                }
                const column = typeof toolCall.params?.column === 'string' ? (toolCall.params.column as string) : 'InvoiceMonth';
                beginGraphTool(toolCall);
                try {
                    const normalization = graphDataTools.normalizeInvoiceMonth(csvData, column);
                    recordGraphToolSuccess(normalization, { description: `Normalize ${column}` });
                    return true;
                } catch (error) {
                    const graphError = error instanceof GraphToolExecutionError ? error : null;
                    recordGraphToolFailure(
                        'normalize_invoice_month',
                        graphError?.code,
                        graphError?.message ?? (error instanceof Error ? error.message : String(error)),
                        graphError?.suggestion,
                    );
                    return false;
                } finally {
                    endGraphTool();
                }
            }
            case 'detect_outliers': {
                const csvData = get().csvData;
                if (!csvData) {
                    get().addProgress('Graph outlier request skipped：暂无 CSV 数据。', 'error');
                    return false;
                }
                const valueColumn = typeof toolCall.params?.valueColumn === 'string' ? (toolCall.params.valueColumn as string) : null;
                if (!valueColumn) {
                    get().addProgress('Graph outlier request failed：未指定 valueColumn。', 'error');
                    return false;
                }
                const thresholdMultiplier = typeof toolCall.params?.multiplier === 'number' ? (toolCall.params.multiplier as number) : 2;
                beginGraphTool(toolCall);
                try {
                    const outliers = graphDataTools.detectOutliers(csvData, valueColumn, thresholdMultiplier);
                    recordGraphToolSuccess(outliers, { description: `Detect outliers (${valueColumn})` });
                    return true;
                } catch (error) {
                    const graphError = error instanceof GraphToolExecutionError ? error : null;
                    recordGraphToolFailure(
                        'detect_outliers',
                        graphError?.code,
                        graphError?.message ?? (error instanceof Error ? error.message : String(error)),
                        graphError?.suggestion,
                    );
                    return false;
                } finally {
                    endGraphTool();
                }
            }
            default:
                return false;
        }
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

    const hydrateRuntimeConfig = async (datasetId: string | null, rowCountHint?: number) => {
        if (!datasetId) return null;
        try {
            const config = await ensureDatasetRuntimeConfig(datasetId, { rowCountHint });
            set({
                datasetRuntimeConfig: config,
                aggregationModePreference: config.mode,
            });
            return config;
        } catch (error) {
            console.error('Failed to sync dataset runtime config:', error);
            return null;
        }
    };

    const updateRuntimeConfig = async (
        datasetId: string,
        updates: Partial<DatasetRuntimeConfig>,
        options?: { rowCountHint?: number },
    ) => {
        try {
            const config = await updateDatasetRuntimeConfig(datasetId, updates, options);
            set({
                datasetRuntimeConfig: config,
                aggregationModePreference: config.mode,
            });
            return config;
        } catch (error) {
            console.error('Failed to update dataset runtime config:', error);
            return null;
        }
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
            await hydrateRuntimeConfig(datasetId, columnRecord?.rowCount ?? rows.length);
            rememberDatasetId(datasetId);
            const profileSampleSize = get().datasetRuntimeConfig?.profileSampleSize;
            const profileResult = await dataTools.profile(datasetId, profileSampleSize);
            if (profileResult.ok) {
                get().applyDatasetProfileSnapshot(profileResult.data);
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
                datasetRuntimeConfig: null,
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
            await hydrateRuntimeConfig(nextDatasetHash, pending.nextData.data.length);
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
                datasetRuntimeConfig: null,
                lastAppliedDataTransform: null,
                isLastAppliedDataTransformBannerDismissed: false,
            });
            get().addProgress('Reverted the last AI data transformation.');
            await hydrateRuntimeConfig(restoredHash, last.previousData.data.length);
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
            const wasLegacyRuntime = currentSession.appState.useLangGraphRuntime === false;
            set({
                ...initialAppState,
                ...currentSession.appState,
                useLangGraphRuntime: true,
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
                graphObservations: currentSession.appState.graphObservations ?? [],
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
            if (wasLegacyRuntime) {
                triggerAutoSaveImmediately();
            }
        } else {
            const cachedDatasetId = getRememberedDatasetId();
            if (cachedDatasetId) {
                await restoreDatasetFromCache(cachedDatasetId);
            }
        }
        await get().loadReportsList();
    },
    connectGraphRuntime: () => {
        const runtimeKey = get().useLangGraphRuntime ? 'langgraph' : 'legacy';
        const runtimeLabel = runtimeKey === 'langgraph' ? 'LangGraph' : 'Graph';
        if (graphBridgeInitialized && graphBridgeRuntime === runtimeKey) {
            return;
        }
        graphBridgeUnsubscribe?.();
        graphBridgeUnsubscribe = null;
        graphBridgeInitialized = true;
        graphBridgeRuntime = runtimeKey;
        const activeBus = getActiveGraphBus();
        if (!activeBus.isSupported) {
            set({
                graphStatus: 'error',
                graphStatusMessage: `当前浏览器不支持 ${runtimeLabel} Web Worker，runtime 无法启动。`,
            });
            return;
        }
        set({
            graphStatus: 'connecting',
            graphStatusMessage: `Spinning up ${runtimeLabel} runtime…`,
        });
        graphBridgeUnsubscribe = activeBus.subscribe((event: GraphWorkerEvent) => {
            switch (event.type) {
                case 'graph/ready': {
                    const readyAt = new Date(event.timestamp).toISOString();
                    set({
                        graphStatus: 'ready',
                        graphStatusMessage: `Graph Ready (v${event.version})`,
                        graphVersion: event.version,
                        graphLastReadyAt: readyAt,
                    });
                    get().addProgress(`Graph runtime ready (v${event.version}).`);
                    return;
                }
                case 'graph/log':
                    get().addProgress(`Graph: ${event.message}`, event.level === 'error' ? 'error' : 'system');
                    return;
                case 'graph/error':
                    set({
                        graphStatus: 'error',
                        graphStatusMessage: event.message,
                    });
                    get().addProgress(`Graph error: ${event.message}`, 'error');
                    return;
                case 'graph/pipeline': {
                    const prevObservations = get().graphObservations ?? [];
                    const prevIds = new Set(prevObservations.map(obs => obs.id));
                    const incomingObservations = event.state.observations ?? [];
                    const newObservations = incomingObservations.filter(obs => !prevIds.has(obs.id));
                    const heartbeat = new Date(event.timestamp).toISOString();
                    const awaitingPrompt = event.state.awaitPrompt ?? null;
                    set(current => ({
                        graphStatus: 'ready',
                        graphStatusMessage: `Pipeline node ${event.node} emitted ${event.actions.length} action(s).`,
                        graphLastReadyAt: heartbeat,
                        graphAwaitPrompt: awaitingPrompt,
                        graphAwaitPromptId: awaitingPrompt?.promptId ?? null,
                        agentAwaitingUserInput: Boolean(awaitingPrompt),
                        graphSessionId: event.state.sessionId ?? current.graphSessionId ?? null,
                        graphAwaitHistory: awaitingPrompt
                            ? appendAwaitHistoryEntry(current.graphAwaitHistory, awaitingPrompt, heartbeat)
                            : current.graphAwaitHistory,
                        graphObservations: event.state.observations ?? current.graphObservations,
                    }));
                    newObservations.forEach(obs => {
                        get().addProgress(formatGraphObservationForLog(obs));
                    });
                    if (awaitingPrompt) {
                        get().addProgress(`Graph awaiting your choice: ${awaitingPrompt.question}`);
                    } else {
                        get().addProgress(`Graph node ${event.node} completed.`);
                        set({
                            agentAwaitingUserInput: false,
                        });
                    }
                    get().processGraphActions(event.actions ?? []);
                    return;
                }
                case 'graph/pong':
                    set({
                        graphLastReadyAt: new Date(event.timestamp).toISOString(),
                    });
                    return;
                default:
                    return;
            }
        });
        activeBus.ensureWorker();
        activeBus.post({ type: 'graph/init', origin: 'ui', timestamp: Date.now() });
    },
    runGraphPipeline: payload => {
        postGraphClientEvent({ type: 'graph/runPipeline', payload, timestamp: Date.now() });
    },
    sendGraphUserReply: async (optionId, freeText) => {
        const activeBus = getActiveGraphBus();
        if (!activeBus.isSupported) return;
        const promptSnapshot = get().graphAwaitPrompt;
        const respondedAt = new Date().toISOString();
        const trimmedFreeText = typeof freeText === 'string' ? freeText.trim() : undefined;
        if (!optionId && !trimmedFreeText) {
            return;
        }
        const optionLabel = optionId && promptSnapshot
            ? promptSnapshot.options.find(opt => opt.id === optionId)?.label ?? optionId
            : null;
        const responseLine = optionId
            ? `我选择了「${optionLabel ?? optionId}」`
            : `我输入了「${trimmedFreeText ?? ''}」`;
        const prefixedText = promptSnapshot
            ? `【${promptSnapshot.question}】\n${responseLine}`
            : responseLine;
        const userMessage: ChatMessage = {
            sender: 'user',
            text: prefixedText,
            timestamp: new Date(),
            type: 'user_message',
        };
        set(state => ({
            chatHistory: [...state.chatHistory, userMessage],
            graphAwaitHistory: promptSnapshot
                ? markAwaitHistoryAnswered(state.graphAwaitHistory, promptSnapshot.promptId ?? null, respondedAt, {
                      label: optionLabel ?? trimmedFreeText ?? null,
                      value: optionId ?? trimmedFreeText ?? null,
                      type: optionId ? 'option' : 'free_text',
                  })
                : state.graphAwaitHistory,
        }));
        activeBus.post({ type: 'graph/userReply', optionId, freeText: trimmedFreeText, timestamp: Date.now() });
        const state = get();
        const useLangChain = shouldUseLangChainPlannerForReply(state, optionId, trimmedFreeText);
        if (!useLangChain) {
            activeBus.post({ type: 'graph/runPipeline', payload: { reason: 'user_reply' }, timestamp: Date.now() });
            return;
        }
        try {
            const envelope = await runLangChainPlannerEnvelope(state);
            get().setLangChainLastPlan(envelope.plan);
            get().appendPlannerObservation(envelope.observation);
            get().updatePlannerPlanState(envelope.planState);
            recordPlanTelemetryBatch('langchain_plan', envelope.usageLog);
            const telemetryText = formatLangChainTelemetry(envelope.telemetry);
            get().addProgress(`↺ LangChain plan ready (${telemetryText}) — ${envelope.summary}`);
            activeBus.post({
                type: 'graph/runPipeline',
                payload: {
                    reason: 'langchain_plan',
                    langChainPlan: toLangChainPlanGraphPayload(envelope),
                },
                timestamp: Date.now(),
            });
        } catch (error) {
            const reason = error instanceof Error ? error.message : String(error);
            get().addProgress(`LangChain planner failed: ${reason}，改用本地 planner。`, 'error');
            activeBus.post({
                type: 'graph/runPipeline',
                payload: { reason: 'langchain_plan_fallback' },
                timestamp: Date.now(),
            });
        }
    },
    processGraphActions: async (actions: AiAction[]) => {
        if (!Array.isArray(actions) || actions.length === 0) return;
        for (const action of actions) {
            switch (action.responseType) {
                case 'plan_state_update':
                    if (action.planState) {
                        get().updatePlannerPlanState(action.planState);
                    }
                    break;
                case 'plan_creation':
                    if (action.plan) {
                        const dataset = get().csvData;
                        if (!dataset) {
                            get().addProgress('Graph plan creation skipped: dataset unavailable.', 'error');
                            break;
                        }
                        const datasetId = get().datasetHash;
                        const rowCountHint = get().datasetProfile?.rowCount ?? dataset.data.length;
                        const aggregateCall: GraphToolCall = {
                            kind: 'aggregate_plan',
                            params: { planTitle: action.plan.title ?? 'analysis' },
                        };
                        beginGraphTool(aggregateCall);
                        try {
                            const preview = await graphDataTools.aggregatePlan({
                                plan: action.plan,
                                datasetId,
                                csvData: dataset,
                                rowCountHint,
                                options: {
                                    preferredMode: get().aggregationModePreference,
                                    runtimeConfig: get().datasetRuntimeConfig,
                                },
                            });
                            recordGraphToolSuccess(preview, { description: action.plan.title ?? 'analysis' });
                        } catch (error) {
                            const graphError = error instanceof GraphToolExecutionError ? error : null;
                            recordGraphToolFailure(
                                'aggregate_plan',
                                graphError?.code,
                                graphError?.message ?? (error instanceof Error ? error.message : String(error)),
                                graphError?.suggestion,
                            );
                        } finally {
                            endGraphTool();
                        }
                        get().addProgress(`Graph executing plan "${action.plan.title ?? 'analysis'}" via data pipeline.`);
                        const runId = createRunId();
                        await runPlanWithChatLifecycle(action.plan, dataset, runId);
                    }
                    break;
                case 'execute_js_code':
                    if (action.toolCall || action.meta?.toolCall) {
                        await executeGraphToolCall(action.toolCall ?? action.meta?.toolCall);
                    }
                    break;
                case 'text_response':
                case 'await_user': {
                    const text = action.text?.trim();
                    if (!text) break;
                    const chatMessage: ChatMessage = {
                        sender: 'ai',
                        text,
                        timestamp: action.timestamp ? new Date(action.timestamp) : new Date(),
                        type: action.responseType === 'await_user' ? 'ai_clarification' : 'ai_message',
                        cardId: action.cardId,
                        meta: action.meta,
                    };
                    set(state => ({ chatHistory: [...state.chatHistory, chatMessage] }));
                    break;
                }
                default:
                    break;
            }
        }
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
        const buildAggregatePayload = (plan: AnalysisPlan): AggregatePayload | null => {
            const state = get();
            return buildAggregatePayloadForPlan(plan, datasetId, data, datasetRowCountHint, {
                preferredMode: state.datasetRuntimeConfig?.mode ?? state.aggregationModePreference,
                runtimeConfig: state.datasetRuntimeConfig,
            });
        };

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
                if (response.code === ERROR_CODES.FULL_SCAN_BLOCKED && !payload.allowFullScan) {
                    const approved = requestFullScanApproval(plan.title);
                    if (approved) {
                        addProgress(`User enabled full scan for "${plan.title}".`, 'system');
                        return aggregateWithWorker(plan, { mode: 'full', allowFullScan: true });
                    }
                    addProgress(`Skipped "${plan.title}" because full scan was not approved.`, 'error');
                    return null;
                }
                const failureDetail = describeToolFailure(response.code, response.reason);
                addProgress(`Aggregation worker failed for "${plan.title}": ${failureDetail}`, 'error');
                if (response.hint) {
                    addProgress(response.hint, 'error');
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
                const summary = await generateSummary(preparedPlan.title, aggregatedData, settings, {
                    signal: requestSignal(),
                    onUsage: usage => {
                        get().recordLlmUsage(
                            mapUsageMetricsToEntry(usage, 'summary.generate'),
                        );
                    },
                });

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
                          normalization: aggregateResult.provenance.normalization,
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
                          requestedMode: get().aggregationModePreference ?? 'full',
                          normalization: aggregateResult?.provenance.normalization,
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
                    valueSchema: aggregateResult?.schema,
                };

                set(prev => ({ analysisCards: [...prev.analysisCards, newCard] }));
                markTimelineStep();

                const cardMemoryText = `[Chart: ${preparedPlan.title}] Description: ${preparedPlan.description}. AI Summary: ${summary.split('---')[0]}`;
                await vectorStore.addDocument({ id: newCard.id, text: cardMemoryText });
                addProgress(`View #${newCard.id.slice(-6)} indexed for long-term memory.`);
                if (datasetId && dataRefId) {
                    const warningsCount = aggregationMeta?.warnings?.length ?? 0;
                    const snapshotPayload: MemorySnapshotInput = {
                        datasetId,
                        viewId: dataRefId,
                        cardId: newCard.id,
                        title: preparedPlan.title,
                        summary,
                        plan: preparedPlan,
                        chartType: preparedPlan.chartType,
                        schema: aggregateResult?.schema,
                        sampleRows: aggregatedData.slice(0, SNAPSHOT_PREVIEW_LIMIT),
                        rowCount: aggregatedData.length,
                        sampled: aggregationMeta?.sampled ?? isSampledResult ?? false,
                        queryHash,
                        qualityScore: computeSnapshotQualityScore(
                            aggregatedData.length,
                            warningsCount,
                            aggregationMeta?.sampled ?? isSampledResult ?? false,
                        ),
                        tags: buildSnapshotTags(preparedPlan),
                    };
                    saveMemorySnapshot(snapshotPayload).catch(error =>
                        console.warn('Failed to persist memory snapshot for dataset cache:', error),
                    );
                }

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

            const coreSummary = await generateCoreAnalysisSummary(cardContext, get().columnProfiles, settings, {
                signal: requestSignal(),
                onUsage: usage => {
                    get().recordLlmUsage(mapUsageMetricsToEntry(usage, 'summary.core_analysis'));
                },
            });
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
            const proactiveInsight = await generateProactiveInsights(cardContext, settings, {
                signal: requestSignal(),
                onUsage: usage => {
                    get().recordLlmUsage(mapUsageMetricsToEntry(usage, 'summary.proactive_insight'));
                },
            });

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

            const finalSummaryText = await generateFinalSummary(createdCards, settings, {
                signal: requestSignal(),
                onUsage: usage => {
                    get().recordLlmUsage(mapUsageMetricsToEntry(usage, 'summary.final'));
                },
            });
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
                    const datasetIdForPlans = get().datasetHash;
                    if (datasetIdForPlans) {
                        await hydrateRuntimeConfig(datasetIdForPlans, dataForAnalysis.data.length);
                    }
                    const memorySnapshots = datasetIdForPlans
                        ? await readMemorySnapshots(datasetIdForPlans, { limit: 6, minScore: 0.4 })
                        : [];
                    const planResult = await generateAnalysisPlans(
                        get().columnProfiles,
                        dataForAnalysis.data.slice(0, 50),
                        get().settings,
                        { signal: getRunSignal(runId), memorySnapshots }
                    );
                    planResult.warnings.forEach((warning: PlanGenerationWarning) => {
                        const warningMessage = `Plan generator warning: ${warning.message}`;
                        get().addProgress(warningMessage, 'error');
                        get().addToast(warning.message, 'error', 6000);
                    });
                    const plans = planResult.plans;
                    recordPlanTelemetryBatch('analysis_plan', planResult.telemetry);

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
                            const newFinalSummary = await generateFinalSummary(newCards, get().settings, {
                                signal: getRunSignal(runId),
                                onUsage: usage => {
                                    get().recordLlmUsage(mapUsageMetricsToEntry(usage, 'summary.final'));
                                },
                            });
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
    
    executeQuickAction: async (actionId: QuickActionId) => {
        const toastMissingDataset = () =>
            get().addToast('请先上传或选择一个 CSV 文件。', 'error', 4000);
        switch (actionId) {
            case 'profile_dataset': {
                const datasetId = get().datasetHash;
                if (!datasetId) {
                    toastMissingDataset();
                    return;
                }
                get().addProgress('Running quick data profile…');
                try {
                    const profileResponse = await graphDataTools.profileDataset(
                        datasetId,
                        get().datasetRuntimeConfig?.profileSampleSize,
                    );
                    const snapshot = (profileResponse.context ?? null) as ProfileResult | null;
                    if (snapshot) {
                        get().applyDatasetProfileSnapshot(snapshot);
                    }
                    recordGraphToolSuccess(profileResponse, { description: 'Dataset profile (quick action)' });
                    const quickSummary = profileResponse.summary;
                    const summaryMessage: ChatMessage = {
                        sender: 'ai',
                        text: `✅ 数据画像完成：共 ${profileResponse.payload.columns} 列、${profileResponse.payload.rowCount.toLocaleString()} 行。展开 “Data Profile” 面板即可查看细节。`,
                        timestamp: new Date(),
                        type: 'ai_message',
                    };
                    set(prev => ({ chatHistory: [...prev.chatHistory, summaryMessage] }));
                } catch (error) {
                    const graphError = error instanceof GraphToolExecutionError ? error : null;
                    recordGraphToolFailure(
                        'profile_dataset',
                        graphError?.code,
                        graphError?.message ?? (error instanceof Error ? error.message : String(error)),
                        graphError?.suggestion,
                    );
                }
                break;
            }
            case 'open_raw_preview': {
                get().focusDataPreview();
                const aiMessage: ChatMessage = {
                    sender: 'ai',
                    text: '🧾 Raw Data Explorer 已打开，你可以在右侧表格查看原始行。',
                    timestamp: new Date(),
                    type: 'ai_message',
                };
                set(prev => ({ chatHistory: [...prev.chatHistory, aiMessage] }));
                break;
            }
            case 'topn_quick_chart': {
                const data = get().csvData;
                if (!data || data.data.length === 0) {
                    toastMissingDataset();
                    return;
                }
                const plan = buildQuickTopNPlan(get().columnProfiles, data.data.slice(0, 200));
                if (!plan) {
                    get().addProgress('找不到合适的分类 / 数值列来构建 Top-N 图。', 'error');
                    return;
                }
                get().addProgress(`Running quick Top-N chart: ${plan.title}`);
                const cards = await get().runAnalysisPipeline([plan], data, { isChatRequest: true });
                const firstCard = cards[0];
                if (firstCard) {
                    const aiMessage: ChatMessage = {
                        sender: 'ai',
                        text: `🏆 已生成 Top-N 图：「${firstCard.plan.title}」。可以点击卡片查看结果。`,
                        timestamp: new Date(),
                        type: 'ai_message',
                        cardId: firstCard.id,
                    };
                    set(prev => ({ chatHistory: [...prev.chatHistory, aiMessage] }));
                } else {
                    get().addProgress('Quick Top-N 图未返回任何结果。', 'error');
                }
                break;
            }
            default:
                get().addProgress('Unknown quick action.', 'error');
        }
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
    applyDatasetProfileSnapshot: (profile: ProfileResult) => {
        const observationId = `obs-profile-${Date.now().toString(36)}`;
        const timestamp = new Date().toISOString();
        const observation: AgentObservation = {
            id: observationId,
            actionId: 'dataset_profile',
            responseType: 'plan_state_update',
            status: 'success',
            timestamp,
            outputs: {
                rowCount: profile.rowCount,
                sampledRows: profile.sampledRows,
                sampleRatio:
                    profile.rowCount > 0
                        ? Number((profile.sampledRows / profile.rowCount).toFixed(3))
                        : 1,
            },
        };
        set(state => {
            const planState = state.plannerSession.planState;
            if (!planState) {
                return { datasetProfile: profile };
            }
            const existingIds = planState.observationIds ?? [];
            if (existingIds.includes(observationId)) {
                return { datasetProfile: profile };
            }
            return {
                datasetProfile: profile,
                plannerSession: {
                    ...state.plannerSession,
                    planState: {
                        ...planState,
                        observationIds: [...existingIds, observationId],
                    },
                },
            };
        });
        get().appendPlannerObservation(observation);
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
        const datasetId = get().datasetHash;
        if (datasetId) {
            void updateRuntimeConfig(datasetId, { mode, allowFullScan: mode === 'full' });
        }
        const summary =
            mode === 'full'
                ? '全量模式开启：后续聚合会扫描整表（需确认）。'
                : '快速模式开启：聚合优先使用采样。';
        get().addProgress(summary);
    },
    recordLlmUsage: usage => {
        const estimatedCostUsd =
            usage.estimatedCostUsd != null
                ? usage.estimatedCostUsd
                : estimateLlmCostUsd({
                      provider: usage.provider,
                      model: usage.model,
                      promptTokens: usage.promptTokens,
                      completionTokens: usage.completionTokens,
                      totalTokens: usage.totalTokens,
                  });
        const entry = createLlmUsageEntry({
            ...usage,
            estimatedCostUsd: estimatedCostUsd ?? null,
        });
        set(state => {
            const next = [...state.llmUsageLog, entry];
            return { llmUsageLog: next.slice(-MAX_LLM_USAGE_LOG) };
        });
        get().addProgress(`LLM ${describeLlmUsageEntry(entry)}`);
    },
    clearLlmUsage: () => {
        set({ llmUsageLog: [] });
    },
    toggleLangGraphRuntime: enabled => {
        if (get().useLangGraphRuntime === enabled) {
            return;
        }
        graphBridgeUnsubscribe?.();
        graphBridgeUnsubscribe = null;
        graphBridgeInitialized = false;
        graphBridgeRuntime = null;
        set({
            useLangGraphRuntime: enabled,
            graphStatus: 'idle',
            graphStatusMessage: 'Graph runtime not connected.',
            graphVersion: null,
            graphLastReadyAt: null,
        });
    },
    setLangChainLastPlan: plan => {
        set({ langChainLastPlan: plan });
    },
    setLangChainPlannerEnabled: enabled => {
        set({ langChainPlannerEnabled: enabled });
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
            preferredMode: get().datasetRuntimeConfig?.mode ?? get().aggregationModePreference,
            runtimeConfig: get().datasetRuntimeConfig,
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
        let response = await dataTools.aggregate(payload);
        if (!response.ok && response.code === ERROR_CODES.FULL_SCAN_BLOCKED && !payload.allowFullScan) {
            const approved = requestFullScanApproval(card.plan.title);
            if (approved) {
                get().addProgress(`User enabled full scan for "${card.plan.title}".`, 'system');
                payload.mode = 'full';
                payload.allowFullScan = true;
                response = await dataTools.aggregate(payload);
            } else {
                get().addProgress(`Skipped "${card.plan.title}" because full scan was not approved.`, 'error');
                get().updateAgentActionTrace(traceId, 'failed', 'Full scan not approved.', {
                    metadata: {
                        cardId,
                        requestedMode: payload.mode,
                        allowFullScan: !!payload.allowFullScan,
                    },
                });
                return false;
            }
        }
        if (!response.ok) {
            const failureDetail = describeToolFailure(response.code, response.reason);
            get().addProgress(`Aggregation refresh failed for "${card.plan.title}": ${failureDetail}`, 'error');
            get().addToast(failureDetail, 'error');
            get().updateAgentActionTrace(traceId, 'failed', failureDetail ?? 'Aggregation failed.', {
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
            normalization: aggregateResult.provenance.normalization,
        };
        set(state => ({
            analysisCards: state.analysisCards.map(existing =>
                existing.id === cardId
                    ? {
                          ...existing,
                          aggregatedData: aggregateResult.rows,
                          isSampledResult: aggregationMeta.sampled,
                          aggregationMeta,
                          valueSchema: aggregateResult.schema,
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
                    useLangGraphRuntime: true,
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
            await hydrateRuntimeConfig(
                report.appState.datasetHash ?? null,
                report.appState.datasetProfile?.rowCount ?? report.appState.csvData?.data.length,
            );
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
