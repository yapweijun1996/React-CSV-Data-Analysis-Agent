import type { GetState, SetState } from 'zustand';
import { executeJavaScriptDataTransform, executeJavaScriptFilter, profileData } from '../../utils/dataProcessor';
import { extractQuickChoices } from '../../utils/questionChoices';
import { generateChatResponse } from '../aiService';
import type { ChatResponseOptions } from '../aiService';
import { vectorStore } from '../vectorStore';
import { filterClarificationOptions, COLUMN_TARGET_PROPERTIES } from '../../utils/clarification';
import { buildColumnAliasMap, cloneRowsWithAliases, normalizeRowsFromAliases } from '../../utils/columnAliases';
import type {
    AiAction,
    AiChatResponse,
    AnalysisCardData,
    AnalysisPlan,
    CardContext,
    ChatMessage,
    ClarificationRequest,
    ClarificationRequestPayload,
    ClarificationStatus,
    CsvData,
    CsvRow,
    DomAction,
    MemoryReference,
    AgentActionStatus,
    AgentStateTag,
    AgentObservation,
    AgentObservationStatus,
    AgentPlanState,
    AgentPlanStep,
    AgentPhase,
    PendingPlan,
    AgentActionType,
    AgentPromptMetric,
    DetectedIntent,
    RequiredToolHint,
    AgentIntent,
} from '../../types';
import { AGENT_STATE_TAGS } from '../../types';
import type { AppStore } from '../../store/appStoreTypes';
import { detectUserIntent } from './intentRouter';
import { createAgentEngine } from './engine';
import type { EngineContext } from './engine';

/**
 * Core runtime that keeps the agent flow sandboxed outside the chat slice.
 * It owns validation, action dispatch, telemetry, plan-state book-keeping,
 * and busy-run coordination so the slice can stay focused on UI state.
 */

/**
 * Minimal hooks the worker needs from the store slices.
 * Keeping this surface tiny helps unit test AgentWorker in isolation.
 */
export interface ChatSliceDependencies {
    registerClarification: (clarification: ClarificationRequestPayload) => ClarificationRequest;
    updateClarificationStatus: (id: string, status: ClarificationStatus) => void;
    getRunSignal: (runId?: string) => AbortSignal | undefined;
    runPlanWithChatLifecycle: (plan: AnalysisPlan, data: CsvData, runId?: string) => Promise<AnalysisCardData[]>;
}

export interface AgentWorkerOptions {
    set: SetState<AppStore>;
    get: GetState<AppStore>;
    deps: ChatSliceDependencies;
    policy?: PlannerPolicy;
}

export interface PlannerPolicy {
    allowLooseSteps: boolean;
}

const DEFAULT_PLANNER_POLICY: PlannerPolicy = {
    allowLooseSteps: false,
};

interface PlannerRuntime {
    set: SetState<AppStore>;
    get: GetState<AppStore>;
    deps: ChatSliceDependencies;
    runId: string;
    userMessage: string;
    memorySnapshot: MemoryReference[];
    memoryTagAttached: boolean;
    policy: PlannerPolicy;
    intentNotes?: string[];
    detectedIntent?: DetectedIntent | null;
    intentRequirementSatisfied?: boolean;
}

interface ChatPlannerContext {
    memorySnapshot: MemoryReference[];
    requestAiResponse: (prompt: string, options?: ChatResponseOptions) => Promise<AiChatResponse>;
}

interface ActionObservationPayload {
    status: AgentObservationStatus;
    outputs?: Record<string, any> | null;
    errorCode?: string | null;
    uiDelta?: string | null;
}

type RetryMetadata = {
    retryPrompt?: string;
    userFacingMessage?: string;
    progressMessage?: string;
    phaseMessage?: string;
    statusMessage?: string;
    promptMode?: ChatResponseOptions['mode'];
};

type ActionStepResult =
    | { type: 'continue'; observation?: ActionObservationPayload }
    | ({ type: 'retry'; reason: string; observation?: ActionObservationPayload } & RetryMetadata)
    | { type: 'halt'; observation?: ActionObservationPayload };

type DispatchResult =
    | { type: 'complete' }
    | ({ type: 'retry'; reason: string } & RetryMetadata)
    | { type: 'halt' };

const STATE_TAG_SET = new Set<AgentStateTag>(AGENT_STATE_TAGS);
const MINTED_STATE_TAG_REGEX = /^(\d{5,})-(\d+)(?:-[\w-]+)?$/;
const STATE_TAG_WARNING_THROTTLE_MS = 5000;
const THOUGHTLESS_TOAST_THROTTLE_MS = 8000;
const PLAN_PRIMER_INSTRUCTION =
    'Begin every response with a plan_state_update that lists your goal, context, progress, next steps, blockers (or null), referenced observations, confidence, and updatedAt before any other action. Immediately after the plan_state_update, include a short text_response (in Mandarin) that restates the user’s latest question or intent in your own words so they know you understood it.';
const MAX_PLAN_CONTINUATIONS = 3;
const MAX_VALIDATION_RETRIES = 2;
const MAX_ACTIONS_PER_RESPONSE = 2;
const CONTINUATION_STATE_TAG_DENYLIST = new Set<AgentStateTag>(['awaiting_clarification', 'blocked']);
const FALLBACK_TEXT_RESPONSE_STEP_ID = 'ad_hoc_response';
const DEFAULT_ACK_STEP: AgentPlanStep = {
    id: 'acknowledge_user_greeting',
    label: 'Acknowledge the greeting and ask what to analyze next.',
};
const SHOW_ALL_FILTER_QUERY = 'show entire table';
const PLAN_RESET_KEYWORDS = ['reset plan', 'start over', '重新開始', '重新开始', '重新規劃', '重新规划'];
const GREETING_REGEX_STRICT = /^(hi|hello|hey|hola|ciao|salut|嗨+|哈囉|你好|您好|早上好|晚上好|早安|晚安)([!.?\s]|$)/i;
const FALLBACK_PLAN_STATUS = 'Requesting simplified plan outline...';
const REMOVE_CARD_REGEX = /(remove|delete)\s+card/i;
const agentEngine = createAgentEngine();

interface MintedStateTagInfo {
    epochMs: number;
    seq: number;
    raw: string;
}

const parseMintedStateTag = (tag: string): MintedStateTagInfo | null => {
    const match = tag.match(MINTED_STATE_TAG_REGEX);
    if (!match) return null;
    return {
        epochMs: Number(match[1]),
        seq: Number(match[2]),
        raw: tag,
    };
};

const createValidationStateTag = (): string => mintRuntimeStateTag();

const messageRequestsPlanReset = (message: string): boolean => {
    const normalized = message.trim().toLowerCase();
    if (!normalized) return false;
    if (PLAN_RESET_KEYWORDS.some(keyword => normalized.includes(keyword))) {
        return true;
    }
    return false;
};

const CANONICAL_ACTION_TYPES: AgentActionType[] = [
    'text_response',
    'plan_creation',
    'dom_action',
    'execute_js_code',
    'proceed_to_analysis',
    'filter_spreadsheet',
    'clarification_request',
    'plan_state_update',
];

const ACTION_TYPE_ALIAS_MAP: Record<string, AgentActionType> = {
    plan_update: 'plan_state_update',
    planstateupdate: 'plan_state_update',
    planstep: 'plan_state_update',
    domaction: 'dom_action',
    agent_action: 'text_response',
    agentmessage: 'text_response',
    respond: 'text_response',
};

const LOW_INTENT_INTENTS = new Set<AgentIntent>(['greeting', 'smalltalk', 'ask_user_choice']);
const MULTIPLE_CHOICE_LINE_REGEX = /(^|\n)\s*(?:\d+[\.\)]|[A-Z][\.\)]|[-•]\s*(?:option|choice)\s*\d+)/i;
const QUESTION_PROMPT_HINT_REGEX = /\b(option|choice|選項|請選|Type a custom answer)\b/i;
const PROMPT_ID_REGEX = /prompt[-\s]*([A-Za-z0-9_-]+)/i;

const textResponseLooksLikeQuestion = (text?: string | null): boolean => {
    if (!text) return false;
    const normalized = text.trim();
    if (!normalized) return false;
    if (MULTIPLE_CHOICE_LINE_REGEX.test(normalized)) return true;
    if (QUESTION_PROMPT_HINT_REGEX.test(normalized) && normalized.includes('?')) return true;
    if (/Type a custom answer/i.test(normalized)) return true;
    return false;
};

const applyAwaitUserMetaSignal = (actions: AiAction[]): boolean => {
    if (!Array.isArray(actions) || actions.length === 0) {
        return false;
    }
    const candidate = [...actions]
        .reverse()
        .find(action => action.responseType === 'text_response' && typeof action.text === 'string' && action.text.trim().length > 0);
    if (!candidate) {
        return false;
    }
    if (!textResponseLooksLikeQuestion(candidate.text)) {
        return false;
    }
    const meta = candidate.meta ?? (candidate.meta = {});
    meta.awaitUser = true;
    meta.haltAfter = true;
    if (!meta.promptId) {
        const match = (candidate.text ?? '').match(PROMPT_ID_REGEX);
        meta.promptId = match?.[1] ?? createPromptInteractionId();
    }
    return true;
};

const enforceClarificationAwaitSignal = (actions: AiAction[]): void => {
    if (!Array.isArray(actions) || actions.length === 0) return;
    actions.forEach(action => {
        if (action.responseType !== 'clarification_request') return;
        const meta = action.meta ?? (action.meta = {});
        meta.awaitUser = true;
        meta.haltAfter = true;
        if (!meta.promptId) {
            meta.promptId = createPromptInteractionId();
        }
    });
};

interface IntentExecutionPolicy {
    maxValidationRetries: number;
    allowPlanFallbackPrompt: boolean;
    allowAutoContinuation: boolean;
}

const DEFAULT_INTENT_EXECUTION_POLICY: IntentExecutionPolicy = {
    maxValidationRetries: MAX_VALIDATION_RETRIES,
    allowPlanFallbackPrompt: true,
    allowAutoContinuation: false,
};

const AUTO_CONTINUE_INTENTS = new Set<AgentIntent>(['chart_request', 'data_filter', 'data_transform']);
const PIPELINE_CONTINUATION_ACTIONS = new Set<AgentActionType>([
    'plan_creation',
    'execute_js_code',
    'filter_spreadsheet',
    'proceed_to_analysis',
]);

const resolveIntentExecutionPolicy = (detectedIntent?: DetectedIntent | null): IntentExecutionPolicy => {
    if (detectedIntent && LOW_INTENT_INTENTS.has(detectedIntent.intent)) {
        return {
            maxValidationRetries: 0,
            allowPlanFallbackPrompt: false,
            allowAutoContinuation: false,
        };
    }
    if (detectedIntent && AUTO_CONTINUE_INTENTS.has(detectedIntent.intent)) {
        return {
            maxValidationRetries: MAX_VALIDATION_RETRIES,
            allowPlanFallbackPrompt: true,
            allowAutoContinuation: true,
        };
    }
    return DEFAULT_INTENT_EXECUTION_POLICY;
};

const normalizeActionTypeAlias = (raw?: string | null): AgentActionType | null => {
    if (!raw) return null;
    const normalized = raw.trim().toLowerCase();
    if (!normalized) return null;
    if (CANONICAL_ACTION_TYPES.includes(normalized as AgentActionType)) {
        return normalized as AgentActionType;
    }
    return ACTION_TYPE_ALIAS_MAP[normalized] ?? null;
};

const clipActionsToPolicy = (actions: AiAction[]): AiAction[] => {
    if (!Array.isArray(actions) || actions.length === 0) {
        return [];
    }
    const ordered = actions.filter(Boolean);
    const planAction = ordered.find(action => action.responseType === 'plan_state_update');
    const atomicAction = ordered.find(action => action.responseType !== 'plan_state_update');
    const result: AiAction[] = [];
    if (planAction) {
        result.push(planAction);
    }
    if (atomicAction) {
        result.push(atomicAction);
    }
    if (result.length === 0) {
        result.push(ordered[0]);
    }
    return result;
};

const applyResponseEnvelopeAutoHeal = (response: AiChatResponse, runtime: PlannerRuntime) => {
    if (!Array.isArray(response.actions)) {
        response.actions = [];
        return;
    }
    const mintTag = () => mintRuntimeStateTag();
    const healed: AiAction[] = [];
    for (const rawAction of response.actions) {
        if (!rawAction) continue;
        const canonicalType =
            normalizeActionTypeAlias(rawAction.type) ??
            normalizeActionTypeAlias(rawAction.responseType) ??
            (rawAction.domAction ? 'dom_action' : rawAction.plan ? 'plan_creation' : rawAction.text ? 'text_response' : null);
        if (!canonicalType) continue;
        const nextAction: AiAction = {
            ...rawAction,
            type: canonicalType,
            responseType: canonicalType,
        };
        const normalizedTag = normalizeStateTag(nextAction.stateTag);
        const isSpecialLabel =
            normalizedTag && STATE_TAG_SET.has(normalizedTag as AgentStateTag) ? normalizedTag : null;
        nextAction.stateTag = isSpecialLabel ?? mintTag();
        if (typeof nextAction.stepId !== 'string' || nextAction.stepId.trim().length < 3) {
            nextAction.stepId = pickPlannerStepIdForAutoAction(runtime);
        } else {
            nextAction.stepId = nextAction.stepId.trim();
        }
        healed.push(nextAction);
    }
    if (healed.length === 0) {
        response.actions = [];
        return;
    }
    const clipped = clipActionsToPolicy(healed);
    if (clipped.length < healed.length) {
        runtime.get().addProgress('Trimmed extra actions to keep this turn atomic.', 'system');
    }
    const awaitingMetaApplied = applyAwaitUserMetaSignal(clipped);
    enforceClarificationAwaitSignal(clipped);
    const isLowIntent = runtime.detectedIntent?.intent ? LOW_INTENT_INTENTS.has(runtime.detectedIntent.intent) : false;
    if (isLowIntent && !clipped.some(action => action.responseType === 'text_response')) {
        clipped.push({
            type: 'text_response',
            responseType: 'text_response',
            stepId: clipped[0]?.stepId ?? pickPlannerStepIdForAutoAction(runtime),
            thought: 'Auto-generated greeting reply so the assistant can acknowledge the user.',
            text: '嗨 hi～很高興見到你！告訴我想分析什麼資料吧。',
        });
    }
    if (isLowIntent) {
        const textAction = clipped.find(action => action.responseType === 'text_response');
        if (textAction) {
            const meta = textAction.meta ?? (textAction.meta = {});
            if (!awaitingMetaApplied) {
                meta.awaitUser = true;
                meta.haltAfter = true;
                meta.promptId = meta.promptId ?? createPromptInteractionId();
            }
        }
    }
    response.actions = clipped;
};

interface PlannerMetaSignal {
    awaitUser: boolean;
    haltAfter: boolean;
    resumePlanner: boolean;
    promptId: string | null;
}

const BLANK_META_SIGNAL: PlannerMetaSignal = {
    awaitUser: false,
    haltAfter: false,
    resumePlanner: false,
    promptId: null,
};

const extractPlannerMetaSignal = (actions?: AiAction[] | null): PlannerMetaSignal => {
    if (!Array.isArray(actions) || actions.length === 0) {
        return { ...BLANK_META_SIGNAL };
    }
    return actions.reduce<PlannerMetaSignal>((acc, action) => {
        if (!action?.meta) return acc;
        return {
            awaitUser: acc.awaitUser || !!action.meta.awaitUser,
            haltAfter: acc.haltAfter || !!action.meta.haltAfter,
            resumePlanner: acc.resumePlanner || !!action.meta.resumePlanner,
            promptId: action.meta.promptId ?? acc.promptId,
        };
    }, { ...BLANK_META_SIGNAL });
};

const markAwaitingUserInput = (runtime: PlannerRuntime, promptId?: string | null) => {
    runtime.set(() => ({
        agentAwaitingUserInput: true,
        agentAwaitingPromptId: promptId ?? null,
    }));
    const store = runtime.get();
    store.addProgress('Waiting for your choice to continue.');
    if (typeof store.setAgentPhase === 'function') {
        store.setAgentPhase('idle', 'Waiting for your choice...');
    }
};

const clearAwaitingUserInput = (runtime: PlannerRuntime) => {
    runtime.set(() => ({
        agentAwaitingUserInput: false,
        agentAwaitingPromptId: null,
    }));
};

const pausePlannerForUser = (runtime: PlannerRuntime, signal: PlannerMetaSignal) => {
    markAwaitingUserInput(runtime, signal.promptId);
    const store = runtime.get();
    const planState = store.plannerSession.planState;
    if (!planState) {
        return;
    }
    const baseSteps =
        Array.isArray(planState.steps) && planState.steps.length > 0 ? planState.steps : planState.nextSteps;
    const updatedSteps = baseSteps?.map(step =>
        step.id === planState.currentStepId
            ? { ...step, status: 'waiting_user' as AgentPlanStep['status'] }
            : step,
    );
    store.updatePlannerPlanState({
        ...planState,
        steps: updatedSteps ?? planState.steps,
        nextSteps: [],
        blockedBy: planState.blockedBy ?? 'Waiting for your choice',
    });
};

const shareObservationSummary = (runtime: PlannerRuntime, response: AiChatResponse): boolean => {
    const alreadyResponded = response.actions.some(action => action.responseType === 'text_response');
    if (alreadyResponded) {
        return true;
    }
    const planAction = response.actions.find(action => action.responseType === 'plan_state_update');
    const planState = planAction && hasPlanStatePayload(planAction) ? planAction.planState : runtime.get().plannerSession.planState;
    if (!planState) return false;
    const summaryParts: string[] = [];
    if (planState.progress) {
        summaryParts.push(`Progress: ${planState.progress}`);
    }
    if (planState.nextSteps && planState.nextSteps.length > 0) {
        summaryParts.push(`Next: ${planState.nextSteps[0].label}`);
    }
    if (planState.blockedBy) {
        summaryParts.push(`Blocked by: ${planState.blockedBy}`);
    }
    if (summaryParts.length === 0) {
        return false;
    }
    const aiMessage: ChatMessage = {
        sender: 'ai',
        text: `Status update:\n${summaryParts.join('\n')}`,
        timestamp: new Date(),
        type: 'ai_message',
    };
    runtime.set(prev => ({ chatHistory: [...prev.chatHistory, aiMessage] }));
    return true;
};

const buildIntentNotes = (detectedIntent: DetectedIntent | null | undefined, store: AppStore): string[] => {
    if (!detectedIntent) return [];
    switch (detectedIntent.intent) {
        case 'remove_card': {
            const cardTitle: string | undefined = detectedIntent.payloadHints?.cardTitle;
            const cardId: string | undefined = detectedIntent.requiredTool?.payloadHints?.cardId;
            if (cardId && cardTitle) {
                return [
                    `USER INTENT: Remove the chart titled "${cardTitle}" (cardId: ${cardId}). ACTION REQUIREMENT: Emit a dom_action removeCard with cardId=${cardId} (or cardTitle matching that text). Do not use other dom_action tools for this request.`,
                ];
            }
            const titles = (store.analysisCards ?? []).map(card => card?.plan?.title).filter(Boolean);
            return [
                `USER INTENT: Remove a chart but no exact title match was found. Ask the user which chart to remove before proceeding. Available charts: ${titles.join(', ')}.`,
            ];
        }
        case 'data_filter':
            return [
                'USER INTENT: Filter the raw data view. ACTION REQUIREMENT: Use filter_spreadsheet immediately with args.query echoing their request before creating new charts.',
            ];
        case 'data_transform':
            return [
                'USER INTENT: Permanently transform the dataset. ACTION REQUIREMENT: Use execute_js_code with valid transformation code before continuing.',
            ];
        case 'clarification':
            return [
                'USER INTENT: Needs clarification. ACTION REQUIREMENT: Ask a clarification_request that lists concrete options or explicitly states the missing detail.',
            ];
        case 'smalltalk':
            return [
                'USER INTENT: Casual smalltalk. Keep the reply lightweight and do not run tools until the user asks for a concrete analysis.',
            ];
        case 'ask_user_choice':
            return [
                'USER INTENT: Responding to a multiple-choice prompt. Acknowledge the selection, restate what it maps to, and resume the pending step without rebuilding the entire plan.',
            ];
        default:
            return [];
    }
};

let lastStateTagWarningAt = 0;
let lastThoughtlessToastAt = 0;

const enterAgentPhase = (runtime: PlannerRuntime, phase: AgentPhase, message?: string) => {
    const store = runtime.get();
    if (typeof store.setAgentPhase === 'function') {
        store.setAgentPhase(phase, message ?? null);
    }
};

const resetAgentPhase = (runtime: PlannerRuntime) => {
    const store = runtime.get();
    if (typeof store.setAgentPhase === 'function') {
        store.setAgentPhase('idle', null);
    }
};

const hasActiveClarifications = (runtime: PlannerRuntime) =>
    runtime
        .get()
        .pendingClarifications?.some(req => req.status === 'pending' || req.status === 'resolving');

type TraceRecorder = (status: AgentActionStatus, details?: string, telemetry?: ActionTraceTelemetry) => void;

interface ActionExecutionContext {
    action: AiAction;
    runtime: PlannerRuntime;
    remainingAutoRetries: number;
    markTrace: TraceRecorder;
}

type AgentActionExecutor = (context: ActionExecutionContext) => Promise<ActionStepResult>;
type ActionMiddleware = (
    context: ActionExecutionContext,
    next: () => Promise<ActionStepResult>
) => Promise<ActionStepResult>;

interface ActionTraceTelemetry {
    durationMs?: number;
    errorCode?: string;
    metadata?: Record<string, any>;
}

interface ValidationFailureDetails {
    actionType: AgentActionType;
    actionIndex: number;
    reason: string;
}

type AgentResponseValidationResult =
    | { isValid: true }
    | {
          isValid: false;
          userMessage: string;
          retryInstruction: string;
          details?: ValidationFailureDetails;
      };

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

const ACTION_ERROR_CODES = {
    MISSING_TEXT: 'MISSING_TEXT',
    MISSING_PLAN_PAYLOAD: 'MISSING_PLAN_PAYLOAD',
    DOM_PAYLOAD_MISSING: 'DOM_PAYLOAD_MISSING',
    DATASET_UNAVAILABLE: 'DATASET_UNAVAILABLE',
    MISSING_JS_CODE: 'MISSING_JS_CODE',
    TRANSFORM_PENDING: 'TRANSFORM_PENDING',
    TRANSFORM_FAILED: 'TRANSFORM_FAILED',
    FILTER_QUERY_MISSING: 'FILTER_QUERY_MISSING',
    CLARIFICATION_PAYLOAD_MISSING: 'CLARIFICATION_PAYLOAD_MISSING',
    CLARIFICATION_NO_OPTIONS: 'CLARIFICATION_NO_OPTIONS',
    THOUGHT_MISSING: 'THOUGHT_MISSING',
    UNSUPPORTED_ACTION: 'UNSUPPORTED_ACTION',
    PLAN_STATE_PAYLOAD_MISSING: 'PLAN_STATE_PAYLOAD_MISSING',
    VALIDATION_FAILED: 'VALIDATION_FAILED',
    PLAN_STEP_OUT_OF_ORDER: 'PLAN_STEP_OUT_OF_ORDER',
} as const;

type ActionErrorCode = (typeof ACTION_ERROR_CODES)[keyof typeof ACTION_ERROR_CODES];

const createObservationId = () =>
    `obs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const createPromptInteractionId = () =>
    `prompt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const mintRuntimeStateTag = (() => {
    let lastEpoch = 0;
    let seq = 0;
    const format = (epoch: number, sequence: number) => `${epoch.toString().padStart(13, '0')}-${sequence}`;
    return () => {
        const now = Date.now();
        const epoch = now > lastEpoch ? now : lastEpoch;
        if (epoch !== lastEpoch) {
            lastEpoch = epoch;
            seq = 0;
        }
        seq += 1;
        return format(lastEpoch, seq);
    };
})();

interface RawDataExplorerSnapshot {
    summary: string;
    metadata: {
        totalRows: number;
        filteredRows: number;
        snippetHash: string | null;
        drilldownLabel: string | null;
        drilldownValueCount: number;
    };
}

const computeSnippetHash = (rows: CsvRow[]): string => {
    const json = JSON.stringify(rows);
    let hash = 0;
    for (let i = 0; i < json.length; i++) {
        hash = (hash << 5) - hash + json.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash).toString(36);
};

const formatCsvValue = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    const text = String(value);
    const needsQuotes = /[",\n]/.test(text);
    const normalized = text.replace(/"/g, '""');
    return needsQuotes ? `"${normalized}"` : normalized;
};

const buildRawDataExplorerSnapshot = (store: AppStore): RawDataExplorerSnapshot => {
    const { csvData, spreadsheetFilterFunction, aiFilterExplanation, interactiveSelectionFilter } = store;
    const dataset = csvData?.data ?? [];
    if (dataset.length === 0) {
        return {
            summary: 'No dataset loaded; Raw Data Explorer summary unavailable.',
            metadata: {
                totalRows: 0,
                filteredRows: 0,
                snippetHash: null,
                drilldownLabel: null,
                drilldownValueCount: 0,
            },
        };
    }

    let workingRows = dataset;
    const parts: string[] = [];
    let snippetHash: string | null = null;
    let drilldownLabel: string | null = null;
    let drilldownValueCount = 0;

    if (interactiveSelectionFilter && interactiveSelectionFilter.column) {
        const { label, column, values } = interactiveSelectionFilter;
        const normalized = new Set(values.map(value => String(value)));
        workingRows = workingRows.filter(row => normalized.has(String(row[column] ?? '')));
        const preview = values.slice(0, 4).map(value => `"${String(value)}"`).join(', ');
        const remainder = values.length > 4 ? ` +${values.length - 4}` : '';
        parts.push(`Chart drilldown "${label}" (${column}) → ${preview}${remainder}.`);
        drilldownLabel = label;
        drilldownValueCount = values.length;
    }

    if (spreadsheetFilterFunction) {
        try {
            workingRows = executeJavaScriptFilter(workingRows, spreadsheetFilterFunction);
            if (aiFilterExplanation?.trim()) {
                parts.push(`AI filter active: ${aiFilterExplanation.trim()}`);
            } else {
                parts.push('AI filter active via natural-language query (no explanation available).');
            }
        } catch (error) {
            const friendly = error instanceof Error ? error.message : String(error);
            parts.push(`AI filter active but preview failed: ${friendly}`);
        }
    }

    const filteredRows = workingRows.length;
    const totalRows = dataset.length;

    const buildSampleSnippet = (): string => {
        if (workingRows.length === 0) {
            return 'No rows available.';
        }
        if (workingRows.length > 1000) {
            const columns = Object.keys(workingRows[0]);
            const header = columns.join(',');
            const pageSize = 5;
            const rows = workingRows.slice(0, pageSize).map(row =>
                columns.map(col => formatCsvValue(row[col])).join(','),
            );
            const totalPages = Math.ceil(workingRows.length / pageSize);
            const hash = computeSnippetHash(workingRows.slice(0, pageSize));
            snippetHash = hash;
            return `CSV snippet page 1/${totalPages} (hash ${hash}):\n${[header, ...rows].join('\n')}`;
        }
        const previewSample = workingRows.slice(0, 3);
        const previewText = previewSample.length > 0 ? JSON.stringify(previewSample, null, 2) : '[]';
        return previewText.length > 600 ? `${previewText.slice(0, 600)}…` : previewText;
    };

    const snippet = buildSampleSnippet();
    parts.push(`Filtered rows: ${filteredRows}/${totalRows}. Preview sample: ${snippet}`);

    return {
        summary: parts.join(' '),
        metadata: {
            totalRows,
            filteredRows,
            snippetHash,
            drilldownLabel,
            drilldownValueCount,
        },
    };
};

const normalizeObservationPayload = (result: ActionStepResult): ActionObservationPayload => {
    if (result.observation) {
        return result.observation;
    }
    if (result.type === 'retry') {
        return {
            status: 'error',
            outputs: { reason: result.reason },
        };
    }
    return { status: 'success' };
};

const PLAN_STEP_KEY_MAX_WORDS = 6;

const deriveStepKey = (step: string | undefined | null): string | null => {
    if (!step) return null;
    const key = step
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, PLAN_STEP_KEY_MAX_WORDS)
        .join(' ')
        .trim();
    return key.length >= 3 ? key : null;
};

const normalizePlanStepsPayload = (steps: AgentPlanStep[] | undefined | null): AgentPlanStep[] => {
    if (!Array.isArray(steps)) return [];
    const normalized: AgentPlanStep[] = [];
    const seenIds = new Set<string>();
    for (const raw of steps) {
        const id = typeof raw?.id === 'string' ? raw.id.trim() : '';
        const label = typeof raw?.label === 'string' ? raw.label.trim() : '';
        if (id.length >= 3 && label.length >= 3 && !seenIds.has(id)) {
            const intent = typeof raw?.intent === 'string' ? raw.intent.trim() || undefined : undefined;
            const status = typeof raw?.status === 'string' ? (raw.status as AgentPlanStep['status']) : undefined;
            normalized.push({ id, label, intent, status });
            seenIds.add(id);
        }
    }
    return normalized;
};

const autoAssignTextResponseStepId = (
    action: AiAction,
    runtime: PlannerRuntime,
    actionIndex: number,
): boolean => {
    if (action.responseType !== 'text_response') return false;
    const store = runtime.get();
    const pendingSteps = store.plannerPendingSteps ?? [];
    if (pendingSteps.length > 0) {
        const firstPending = pendingSteps[0];
        if (
            runtime.detectedIntent?.intent === 'greeting' &&
            pendingSteps.length === 1 &&
            firstPending?.id === DEFAULT_ACK_STEP.id
        ) {
            action.stepId = firstPending.id;
            store.addProgress(
                `Auto-tagged greeting reply to step "${firstPending.id}" so it can proceed.`,
                'system',
            );
            if (typeof store.recordAgentValidationEvent === 'function') {
                store.recordAgentValidationEvent({
                    actionType: 'text_response',
                    reason: 'auto_step_id_greeting_ack',
                    actionIndex,
                    runId: runtime.runId,
                    retryInstruction:
                        'stepId was auto-filled with the greeting acknowledgement step so you can keep chatting.',
                });
            }
            return true;
        }
        return false;
    }
    action.stepId = FALLBACK_TEXT_RESPONSE_STEP_ID;
    store.addProgress('Auto-assigned fallback stepId "ad_hoc_response" so the agent can keep chatting.');
    if (typeof store.recordAgentValidationEvent === 'function') {
        store.recordAgentValidationEvent({
            actionType: 'text_response',
            reason: 'auto_step_id_assigned',
            actionIndex,
            runId: runtime.runId,
            retryInstruction: 'stepId was auto-filled because no pending steps were tracked.',
        });
    }
    return true;
};

const pickPlannerStepIdForAutoAction = (runtime: PlannerRuntime): string => {
    const pending = runtime.get().plannerPendingSteps;
    if (Array.isArray(pending) && pending.length > 0) {
        const candidate = pending[0]?.id?.trim();
        if (candidate && candidate.length >= 3) {
            return candidate;
        }
    }
    return FALLBACK_TEXT_RESPONSE_STEP_ID;
};

const thoughtMentionsStep = (thought: string | undefined, stepKey: string | null): boolean => {
    if (!stepKey) return true;
    if (!thought) return false;
    return thought.toLowerCase().includes(stepKey);
};

const toAgentObservation = (
    action: AiAction,
    traceId: string,
    payload: ActionObservationPayload,
): AgentObservation => ({
    id: createObservationId(),
    actionId: traceId,
    responseType: action.responseType,
    status: payload.status,
    timestamp: new Date().toISOString(),
    outputs: payload.outputs ?? null,
    errorCode: payload.errorCode ?? null,
    uiDelta: payload.uiDelta ?? null,
});

const summarizeAction = (action: AiAction): string => {
    switch (action.responseType) {
        case 'text_response':
            return action.text ? action.text.slice(0, 120) : 'AI text response';
        case 'plan_creation':
            return action.plan?.title ? `Create analysis "${action.plan.title}"` : 'Create new analysis card';
        case 'dom_action':
            return action.domAction ? `DOM action: ${action.domAction.toolName}` : 'DOM action';
        case 'execute_js_code':
            return action.code?.explanation || 'Execute data transformation';
        case 'filter_spreadsheet':
            return action.args?.query ? `Filter spreadsheet by "${action.args.query}"` : 'Filter spreadsheet';
        case 'clarification_request':
            return action.clarification?.question || 'Ask user for clarification';
        case 'proceed_to_analysis':
            return 'Proceed to analysis pipeline';
        default:
            return 'Agent action';
    }
};

const hasTextPayload = (action: AiAction): action is AiAction & { text: string } => {
    return typeof action.text === 'string' && action.text.trim().length > 0;
};

const hasPlanPayload = (action: AiAction): action is AiAction & { plan: AnalysisPlan } => {
    return !!action.plan;
};

const hasDomActionPayload = (action: AiAction): action is AiAction & { domAction: DomAction } => {
    return !!action.domAction;
};

const hasExecutableCodePayload = (action: AiAction): action is AiAction & {
    code: { explanation: string; jsFunctionBody: string };
} => {
    return (
        !!action.code &&
        typeof action.code.jsFunctionBody === 'string' &&
        action.code.jsFunctionBody.trim().length > 0
    );
};

const hasFilterArgsPayload = (action: AiAction): action is AiAction & { args: { query?: string | null } } => {
    return typeof action.args === 'object';
};

const hasClarificationPayload = (
    action: AiAction,
): action is AiAction & { clarification: ClarificationRequestPayload } => {
    return !!action.clarification;
};

const hasPlanStatePayload = (action: AiAction): action is AiAction & { planState: AgentPlanState } => {
    const payload = action.planState;
    if (!payload) return false;
    const hasGoal = typeof payload.goal === 'string' && payload.goal.trim().length > 0;
    const hasProgress = typeof payload.progress === 'string' && payload.progress.trim().length > 0;
    const hasNextStepsArray = Array.isArray(payload.nextSteps) && payload.nextSteps.length > 0;
    const hasPlanId = typeof payload.planId === 'string' && payload.planId.trim().length > 0;
    const hasCurrentStep =
        typeof payload.currentStepId === 'string' && payload.currentStepId.trim().length >= 3;
    const normalizedSteps = normalizePlanStepsPayload(payload.steps ?? payload.nextSteps);
    const hasStepsList = normalizedSteps.length > 0;
    return hasGoal && hasProgress && hasNextStepsArray && hasPlanId && hasCurrentStep && hasStepsList;
};

const extractPendingPlanColumns = (plan?: PendingPlan | null): string[] => {
    if (!plan) return [];
    return COLUMN_TARGET_PROPERTIES.map(prop => plan?.[prop])
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
};

const plannerHasPendingSteps = (
    runtime: PlannerRuntime,
): { hasPendingSteps: boolean; stateTag?: AgentStateTag; hasBlocker: boolean } => {
    const planState = runtime.get().plannerSession.planState;
    const hasSteps = !!(
        planState &&
        Array.isArray(planState.nextSteps) &&
        planState.nextSteps.some(
            step => typeof step?.id === 'string' && step.id.trim().length > 0 && typeof step?.label === 'string',
        )
    );
    return {
        hasPendingSteps: hasSteps,
        stateTag: planState?.stateTag as AgentStateTag | undefined,
        hasBlocker: !!(planState?.blockedBy && planState.blockedBy.trim().length > 0),
    };
};

const formatPlanStepsForPrompt = (plan?: AgentPlanState | null): string => {
    if (!plan || !Array.isArray(plan.nextSteps) || plan.nextSteps.length === 0) {
        return 'No pending steps were captured previously.';
    }
    return plan.nextSteps.map(step => `- [${step.id}] ${step.label}`).join('\n');
};

const buildFallbackPlanPrompt = (runtime: PlannerRuntime): string => {
    const priorPlan = runtime.get().plannerSession.planState;
    const priorSummary = priorPlan
        ? `LAST_KNOWN_PLAN:\nGoal: ${priorPlan.goal}\nProgress: ${priorPlan.progress}\nNext Steps:\n${formatPlanStepsForPrompt(priorPlan)}`
        : 'No previous plan was captured; establish a brand new plan.';
    return `
${runtime.userMessage}

SYSTEM NOTE: The UI failed to parse your plan. Respond with ONLY a plan_state_update (plus an optional short text_response) that restates or refines the current goal tracker. Do not execute tools yet.

${PLAN_PRIMER_INSTRUCTION}

${priorSummary}
    `.trim();
};

const appendIntentNotesToPrompt = (prompt: string, intentNotes?: string[]): string => {
    if (!intentNotes || intentNotes.length === 0) return prompt;
    const noteBlock = intentNotes.map(note => `- ${note}`).join('\n');
    return `${prompt}\n\nSYSTEM INTENT NOTES:\n${noteBlock}`;
};

const resolveCardIdFromArgs = (runtime: PlannerRuntime, domAction: DomAction): void => {
    if (!domAction || domAction.toolName !== 'removeCard') return;
    const store = runtime.get();
    const args = domAction.args ?? (domAction.args = {});
    if (typeof args.cardId === 'string' && args.cardId.trim().length > 0) {
        return;
    }
    const cards = store.analysisCards ?? [];
    if (!Array.isArray(cards) || cards.length === 0) return;

    const intentHints = runtime.detectedIntent?.requiredTool?.payloadHints ?? {};
    const candidateIds = [args.cardId, intentHints.cardId].filter(
        (value): value is string => typeof value === 'string' && value.trim().length > 0,
    );
    for (const candidateId of candidateIds) {
        const matched = cards.find(card => card?.id === candidateId);
        if (matched) {
            args.cardId = matched.id;
            if (!args.cardTitle && matched.plan?.title) {
                args.cardTitle = matched.plan.title;
            }
            store.addProgress(`Auto-selected cardId ${matched.id} for removeCard using intent hints.`, 'system');
            return;
        }
    }

    const normalizeTitle = (value?: string | null) =>
        (value ?? '')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
    const candidateTitles = [
        typeof args.cardTitle === 'string' ? args.cardTitle : '',
        typeof intentHints.cardTitle === 'string' ? intentHints.cardTitle : '',
    ]
        .map(normalizeTitle)
        .filter(title => title.length >= 3);
    if (candidateTitles.length === 0) return;

    const matches = cards.filter(card => {
        const title = normalizeTitle(card?.plan?.title);
        if (!title) return false;
        return candidateTitles.some(candidate => title.includes(candidate) || candidate.includes(title));
    });

    if (matches.length === 1) {
        const target = matches[0];
        args.cardId = target.id;
        args.cardTitle = target.plan?.title ?? args.cardTitle;
        store.addProgress(
            `Auto-selected cardId ${target.id} for removeCard using title "${target.plan?.title ?? ''}".`,
            'system',
        );
        return;
    }

    if (matches.length > 1) {
        store.addProgress(
            `Multiple charts matched "${candidateTitles[0]}". Please clarify which card to remove.`,
            'error',
        );
    }
};

const promptUserForCardSelection = (runtime: PlannerRuntime, domAction: DomAction): string | null => {
    const store = runtime.get();
    const cards = store.analysisCards ?? [];
    if (!Array.isArray(cards) || cards.length === 0) {
        const warning = 'There are no charts available yet. Create one before using this action.';
        store.addProgress(warning, 'error');
        const aiMessage: ChatMessage = {
            sender: 'ai',
            text: warning,
            timestamp: new Date(),
            type: 'ai_message',
            isError: true,
        };
        runtime.set(prev => ({ chatHistory: [...prev.chatHistory, aiMessage] }));
        return null;
    }
    const intent = domAction.toolName === 'removeCard' ? 'Which chart should I remove?' : 'Which chart should I update?';
    const clarificationPayload: ClarificationRequestPayload = {
        question: intent,
        options: cards.slice(0, 9).map((card, index) => ({
            label: card?.plan?.title?.trim() || `Chart ${index + 1}`,
            value: card.id,
        })),
        pendingPlan: {
            domActionContext: {
                toolName: domAction.toolName,
                args: { ...(domAction.args ?? {}) },
            },
        },
        targetProperty: 'title',
        contextType: 'dom_action',
    };
    const clarification = runtime.deps.registerClarification(clarificationPayload);
    const clarificationMessage: ChatMessage = {
        sender: 'ai',
        text: clarification.question,
        timestamp: new Date(),
        type: 'ai_clarification',
        clarificationRequest: clarification,
    };
    runtime.set(prev => ({
        chatHistory: [...prev.chatHistory, clarificationMessage],
    }));
    runtime.set({ activeClarificationId: clarification.id });
    enterAgentPhase(runtime, 'clarifying', 'Need your input to keep going...');
    runtime.get().endBusy(runtime.runId);
    markAwaitingUserInput(runtime, clarification.id);
    return clarification.id;
};

const isMeaningfulFilterQuery = (query: string): boolean => {
    const trimmed = query.trim();
    if (trimmed.length < 3) return false;
    if (GREETING_REGEX_STRICT.test(trimmed)) return false;
    const hasAlphaNumeric = /[\p{L}\p{N}]/u.test(trimmed);
    return hasAlphaNumeric;
};

type FilterQuerySource = 'payload' | 'intent_hint' | 'user_message' | 'default';

const computeFilterQuery = (
    runtime: PlannerRuntime,
    existingQuery?: string | null,
    hint?: RequiredToolHint,
): { query: string; source: FilterQuerySource } => {
    const normalizedExisting = typeof existingQuery === 'string' ? existingQuery.trim() : '';
    if (normalizedExisting) {
        return { query: normalizedExisting, source: 'payload' };
    }
    const hinted = typeof hint?.payloadHints?.query === 'string' ? hint.payloadHints.query.trim() : '';
    if (hinted) {
        return { query: hinted, source: 'intent_hint' };
    }
    const fallback = runtime.userMessage?.trim() ?? '';
    if (isMeaningfulFilterQuery(fallback)) {
        return { query: fallback, source: 'user_message' };
    }
    return { query: SHOW_ALL_FILTER_QUERY, source: 'default' };
};

const repairFilterActionFromIntent = (
    action: AiAction,
    runtime: PlannerRuntime,
    actionIndex: number,
): boolean => {
    if (action.responseType !== 'filter_spreadsheet') return false;
    const intentHint =
        runtime.detectedIntent?.intent === 'data_filter' ? runtime.detectedIntent.requiredTool : undefined;
    if (!intentHint && action.args?.query) {
        return false;
    }
    const currentQuery = typeof action.args?.query === 'string' ? action.args.query : '';
    const { query, source } = computeFilterQuery(runtime, currentQuery, intentHint);
    if (currentQuery?.trim() === query) {
        return false;
    }
    action.args = { ...(action.args ?? {}), query };
    const progressMessage =
        source === 'default'
            ? 'Auto-filled filter query with "show entire table" to keep the conversation moving.'
            : 'Auto-filled filter query using your latest request so the filter tool can run.';
    runtime.get().addProgress(progressMessage, 'system');
    runtime.get().recordAgentValidationEvent?.({
        actionType: 'filter_spreadsheet',
        reason: 'auto_filter_query_filled',
        actionIndex,
        runId: runtime.runId,
        retryInstruction: 'Filter query was auto-filled using the user intent/context.',
    });
    return true;
};

const repairDomActionFromIntent = (
    action: AiAction,
    runtime: PlannerRuntime,
    actionIndex: number,
): boolean => {
    if (action.responseType !== 'dom_action' || !action.domAction) return false;
    const hint = runtime.detectedIntent?.requiredTool;
    if (!hint || hint.responseType !== 'dom_action') return false;
    if (hint.domToolName && action.domAction.toolName !== hint.domToolName) return false;
    const args = action.domAction.args ?? (action.domAction.args = {});
    let mutated = false;
    const hintedId = typeof hint.payloadHints?.cardId === 'string' ? hint.payloadHints.cardId.trim() : '';
    const hintedTitle =
        typeof hint.payloadHints?.cardTitle === 'string' ? hint.payloadHints.cardTitle.trim() : '';
    if (!args.cardId && hintedId) {
        args.cardId = hintedId;
        mutated = true;
    }
    if (!args.cardTitle && hintedTitle) {
        args.cardTitle = hintedTitle;
        mutated = true;
    }
    if (mutated) {
        runtime.get().addProgress('Auto-filled DOM action payload using intent hints.', 'system');
        runtime.get().recordAgentValidationEvent?.({
            actionType: 'dom_action',
            reason: 'auto_dom_payload_filled',
            actionIndex,
            runId: runtime.runId,
            retryInstruction: 'DOM payload fields were auto-filled using the user intent hints.',
        });
    }
    return mutated;
};

const buildRequiredToolFallbackAction = (
    runtime: PlannerRuntime,
    hint: RequiredToolHint,
): AiAction | null => {
    const stepId = pickPlannerStepIdForAutoAction(runtime);
    switch (hint.responseType) {
        case 'dom_action': {
            if (!hint.domToolName) return null;
            const args: Record<string, any> = {};
            if (hint.payloadHints?.cardId) {
                args.cardId = hint.payloadHints.cardId;
            }
            if (hint.payloadHints?.cardTitle) {
                args.cardTitle = hint.payloadHints.cardTitle;
            }
            const domAction: DomAction = { toolName: hint.domToolName, args };
            resolveCardIdFromArgs(runtime, domAction);
            if (!domAction.args?.cardId) {
                return null;
            }
            return {
                type: 'dom_action',
                responseType: 'dom_action',
                thought: 'Auto-inserted DOM action to satisfy the user intent.',
                stepId,
                stateTag: createValidationStateTag(),
                domAction,
            };
        }
        case 'filter_spreadsheet': {
            const { query } = computeFilterQuery(runtime, hint.payloadHints?.query ?? null, hint);
            return {
                type: 'filter_spreadsheet',
                responseType: 'filter_spreadsheet',
                thought: 'Auto-inserted filter to satisfy the user intent.',
                stepId,
                stateTag: createValidationStateTag(),
                args: { query },
            };
        }
        case 'execute_js_code': {
            const store = runtime.get();
            const userMessage = runtime.userMessage?.toLowerCase() ?? '';
            const columnProfiles = store.columnProfiles ?? [];
            const matchedColumn =
                hint.payloadHints?.column ??
                columnProfiles.find(profile => userMessage.includes(profile.name.toLowerCase()))?.name ??
                null;
            if (!matchedColumn) {
                return null;
            }
            const safeColumnName = matchedColumn.replace(/"/g, '\\"');
            const jsFunctionBody = `
const result = data.map(row => {
    const next = { ...row };
    delete next["${safeColumnName}"];
    return next;
});
return result;
            `.trim();
            return {
                type: 'execute_js_code',
                responseType: 'execute_js_code',
                thought: `Auto-inserted data transform to remove the column "${matchedColumn}".`,
                stepId,
                stateTag: createValidationStateTag(),
                code: {
                    explanation: `Removes the column "${matchedColumn}" from every row of the dataset.`,
                    jsFunctionBody,
                },
            };
        }
        default:
            return null;
    }
};

const buildChatPlannerContext = async (
    message: string,
    get: GetState<AppStore>,
    deps: ChatSliceDependencies,
    runId?: string,
): Promise<ChatPlannerContext> => {
    const cardContext: CardContext[] = get().analysisCards.map(c => ({
        id: c.id,
        title: c.plan.title,
        aggregatedDataSample: c.aggregatedData.slice(0, 100),
    }));

    const getSelectedMemories = (): MemoryReference[] => {
        const { chatMemoryPreview, chatMemoryExclusions } = get();
        return chatMemoryPreview.filter(mem => !chatMemoryExclusions.includes(mem.id));
    };

    let selectedMemories = getSelectedMemories();
    if (selectedMemories.length === 0 && vectorStore.getDocumentCount() > 0) {
        try {
            selectedMemories = await vectorStore.search(message, 3, { signal: deps.getRunSignal(runId) });
        } catch (error) {
            if (!(error instanceof DOMException && error.name === 'AbortError')) {
                console.error('Fallback memory search failed:', error);
            }
        }
    }

    const memorySnapshot = selectedMemories;
    const memoryPayload = memorySnapshot.map(mem => mem.text);

    const getRawDataExplorerSummary = (): string => buildRawDataExplorerSnapshot(get()).summary;

    const requestAiResponse = (prompt: string, options?: ChatResponseOptions) =>
        generateChatResponse(
            get().columnProfiles,
            get().chatHistory,
            prompt,
            cardContext,
            get().settings,
            get().aiCoreAnalysisSummary,
            get().currentView,
            (get().csvData?.data || []).slice(0, 20),
            memoryPayload,
            get().plannerSession.observations,
            get().plannerSession.planState,
            get().dataPreparationPlan,
            get().agentActionTraces.slice(-10),
            getRawDataExplorerSummary(),
            {
                signal: options?.signal ?? deps.getRunSignal(runId),
                mode: options?.mode,
                onPromptProfile: profile => {
                    const recordPromptMetric = get().recordPromptMetric;
                    if (typeof recordPromptMetric === 'function') {
                        const metric: AgentPromptMetric = {
                            id: `prompt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                            mode: profile.mode,
                            charCount: profile.charCount,
                            estimatedTokens: profile.estimatedTokens,
                            promptLabel: profile.promptLabel,
                            createdAt: new Date().toISOString(),
                            runId,
                        };
                        recordPromptMetric(metric);
                    }
                    options?.onPromptProfile?.(profile);
                },
            },
        );

    return {
        memorySnapshot,
        requestAiResponse,
    };
};

const buildEngineContext = (runtime: PlannerRuntime): EngineContext => {
    const store = runtime.get();
    return {
        planState: store.plannerSession.planState,
        pendingSteps: store.plannerPendingSteps ?? [],
        detectedIntent: runtime.detectedIntent,
        userMessage: runtime.userMessage,
        runId: runtime.runId,
        now: Date.now(),
        lastStateTag: store.plannerSession.planState?.stateTag ?? null,
    };
};

const chainOfThoughtGuardMiddleware: ActionMiddleware = async (context, next) => {
    const thought = context.action.thought?.trim();
    if (!thought) {
        context.runtime.get().addProgress('AI response missing reasoning; action skipped.', 'error');
        maybeShowThoughtlessToast(context.runtime);
        context.markTrace('failed', 'Action blocked because no reasoning was provided.', {
            errorCode: ACTION_ERROR_CODES.THOUGHT_MISSING,
        });
        return {
            type: 'continue',
            observation: {
                status: 'error',
                errorCode: ACTION_ERROR_CODES.THOUGHT_MISSING,
                outputs: { note: 'Action skipped because thought field was empty.' },
            },
        };
    }
    return next();
};

const planActionMatchesStep = (action: AiAction, stepKey: string | null): boolean => {
    if (!stepKey) return false;
    if (action.responseType !== 'plan_creation' || !action.plan) return false;
    const haystacks = [
        action.plan.title,
        action.plan.description,
        action.plan.groupByColumn,
        action.plan.valueColumn,
        action.plan.secondaryValueColumn,
    ]
        .filter(Boolean)
        .map(value => String(value).toLowerCase());
    return haystacks.some(text => text.includes(stepKey));
};

const matchesRequiredTool = (action: AiAction, hint: RequiredToolHint): boolean => {
    if (action.responseType !== hint.responseType) return false;
    if (hint.responseType === 'dom_action' && hint.domToolName) {
        return action.domAction?.toolName === hint.domToolName;
    }
    return true;
};

const planStepViolationCounts: Record<string, number> = Object.create(null);
const MAX_PLAN_STEP_VIOLATIONS = 3;

const seedGreetingPlanState = (runtime: PlannerRuntime) => {
    const store = runtime.get();
    const existingPlan = store.plannerSession.planState;
    if (existingPlan) return;
    const now = new Date().toISOString();
    const planState: AgentPlanState = {
        goal: 'Acknowledge the user and gather their request.',
        contextSummary: 'User greeted the assistant; no task specified yet.',
        progress: 'Greeting acknowledged.',
        nextSteps: [DEFAULT_ACK_STEP],
        blockedBy: null,
        observationIds: [],
        confidence: 0.5,
        updatedAt: now,
        stateTag: 'context_ready',
    };
    store.updatePlannerPlanState(planState);
    store.addProgress('Auto-seeded a greeting plan tracker so the assistant can respond.');
};

const stateConsistencyMiddleware: ActionMiddleware = async (context, next) => {
    const runId = context.runtime.runId;
    const isPlanOrText =
        context.action.responseType === 'plan_state_update' ||
        context.action.responseType === 'text_response';
    if (isPlanOrText) {
        planStepViolationCounts[runId] = 0;
        return next();
    }

    if (context.runtime.policy.allowLooseSteps) {
        planStepViolationCounts[runId] = 0;
        return next();
    }

    const pendingSteps = context.runtime.get().plannerPendingSteps || [];
    const expectedStep = pendingSteps[0];
    if (!expectedStep) {
        planStepViolationCounts[runId] = 0;
        return next();
    }

    const actionStepId = typeof context.action.stepId === 'string' ? context.action.stepId.trim() : '';
    const structuredMatch = actionStepId.length > 0 && actionStepId === expectedStep.id;
    const stepKey = deriveStepKey(expectedStep.label);
    const fallbackMatch =
        !!stepKey &&
        (thoughtMentionsStep(context.action.thought, stepKey) || planActionMatchesStep(context.action, stepKey));

    if (!structuredMatch && !fallbackMatch) {
        const nextCount = (planStepViolationCounts[runId] ?? 0) + 1;
        planStepViolationCounts[runId] = nextCount;

        if (nextCount >= MAX_PLAN_STEP_VIOLATIONS) {
            context.runtime
                .get()
                .addProgress(
                    'Relaxing plan-step enforcement after repeated attempts. Proceed carefully and build the pending chart immediately.',
                );
            planStepViolationCounts[runId] = 0;
            if (typeof context.runtime.get().completePlannerPendingStep === 'function') {
                context.runtime.get().completePlannerPendingStep();
            }
            return next();
        }

        const stepLabel = `"${expectedStep.label}" [${expectedStep.id}]`;
        context.runtime
            .get()
            .addProgress(
                `State consistency check failed. Next planned step is ${stepLabel}. Reference it explicitly and set stepId="${expectedStep.id}" before taking other actions.`,
                'error',
            );
        context.markTrace('failed', 'Plan step order violation.', {
            errorCode: ACTION_ERROR_CODES.PLAN_STEP_OUT_OF_ORDER,
            metadata: { expectedStepId: expectedStep.id, expectedStepLabel: expectedStep.label },
        });
        const retryPrompt = `SYSTEM NOTE: You attempted to skip the plan step ${stepLabel}. Reference it explicitly and set stepId="${expectedStep.id}" before taking other actions.`;
        return {
            type: 'retry',
            reason: `Plan step enforcement triggered for ${stepLabel}.`,
            retryPrompt,
            userFacingMessage: `Plan step enforcement triggered for ${stepLabel}. I'll restate the pending step and try again.`,
            progressMessage: `Refocusing on pending step ${stepLabel}...`,
            phaseMessage: 'Reordering plan execution after a failed attempt...',
            statusMessage: 'Refocusing on the pending step...',
            promptMode: 'full',
            observation: {
                status: 'error',
                errorCode: ACTION_ERROR_CODES.PLAN_STEP_OUT_OF_ORDER,
                outputs: { expectedStepId: expectedStep.id, expectedStepLabel: expectedStep.label },
            },
        };
    }

    const originalMarkTrace = context.markTrace;
    context.markTrace = (status, details, telemetry) => {
        if (status === 'succeeded') {
            planStepViolationCounts[runId] = 0;
            if (expectedStep && (structuredMatch || fallbackMatch)) {
                if (!structuredMatch) {
                    context.runtime
                        .get()
                        .addProgress(
                            `Step ${expectedStep.id} completed via fallback inference. Future actions must include stepId="${expectedStep.id}" to avoid guard warnings.`,
                            'error',
                        );
                }
                if (typeof context.runtime.get().completePlannerPendingStep === 'function') {
                    context.runtime.get().completePlannerPendingStep();
                }
            }
        }
        originalMarkTrace(status, details, telemetry);
    };

    try {
        return await next();
    } finally {
        context.markTrace = originalMarkTrace;
    }
};

const thoughtLoggingMiddleware: ActionMiddleware = async (context, next) => {
    if (context.action.thought) {
        context.runtime.get().addProgress(`AI Thought: ${context.action.thought}`);
    }
    return next();
};

const telemetryMiddleware: ActionMiddleware = async (context, next) => {
    const start = now();
    const originalMarkTrace = context.markTrace;
    context.markTrace = (status, details, telemetry) => {
        const shouldAnnotate = status === 'succeeded' || status === 'failed';
        const enhancedTelemetry = shouldAnnotate
            ? { ...(telemetry ?? {}), durationMs: Math.max(0, now() - start) }
            : telemetry;
        originalMarkTrace(status, details, enhancedTelemetry);
    };
    try {
        return await next();
    } finally {
        context.markTrace = originalMarkTrace;
    }
};

const registeredMiddlewares: ActionMiddleware[] = [];
const coreMiddlewares: ActionMiddleware[] = [
    chainOfThoughtGuardMiddleware,
    stateConsistencyMiddleware,
    thoughtLoggingMiddleware,
    telemetryMiddleware,
];

const getActionMiddlewares = (): ActionMiddleware[] => [...coreMiddlewares, ...registeredMiddlewares];

export const registerActionMiddleware = (middleware: ActionMiddleware) => {
    registeredMiddlewares.push(middleware);
};

const composeMiddlewares = (
    middlewares: ActionMiddleware[],
    executor: AgentActionExecutor,
): AgentActionExecutor =>
    middlewares.reduceRight(
        (next, middleware) => async context => middleware(context, () => next(context)),
        executor,
    );

const runActionThroughRegistry = async (
    action: AiAction,
    runtime: PlannerRuntime,
    remainingAutoRetries: number,
    markTrace: TraceRecorder,
): Promise<ActionStepResult> => {
    if (action.responseType === 'dom_action' && action.domAction) {
        resolveCardIdFromArgs(runtime, action.domAction);
    }
    const executor = actionExecutorRegistry[action.responseType];
    if (!executor) {
        markTrace('failed', 'Unsupported action type.', { errorCode: ACTION_ERROR_CODES.UNSUPPORTED_ACTION });
        return {
            type: 'continue',
            observation: {
                status: 'error',
                errorCode: ACTION_ERROR_CODES.UNSUPPORTED_ACTION,
            },
        };
    }
    const context: ActionExecutionContext = { action, runtime, remainingAutoRetries, markTrace };
    const pipeline = composeMiddlewares(getActionMiddlewares(), executor);
    return pipeline(context);
};

const buildPayloadValidationFailure = (
    action: AiAction | null,
    actionIndex: number,
    reason: string,
    retryInstruction: string,
): AgentResponseValidationResult => ({
    isValid: false,
    userMessage: action
        ? `AI ${action.responseType} action is invalid: ${reason}. Asking it to correct the payload...`
        : reason,
    retryInstruction,
    details: action
        ? {
              actionType: action.responseType,
              actionIndex,
              reason,
          }
        : undefined,
});

const validateClarificationPayload = (
    action: AiAction & { clarification: ClarificationRequestPayload },
): string | null => {
    const payload = action.clarification;
    if (!payload.question?.trim()) {
        return 'Clarification question is empty.';
    }
    if (!Array.isArray(payload.options) || payload.options.length === 0) {
        return 'Clarification options are missing.';
    }
    const invalidOption = payload.options.find(
        option => !option || typeof option.label !== 'string' || typeof option.value !== 'string',
    );
    if (invalidOption) {
        return 'Clarification option missing label or value.';
    }
    if (!payload.targetProperty) {
        return 'Clarification targetProperty is missing.';
    }
    return null;
};

const validateDomActionPayload = (domAction: DomAction): string | null => {
    const args = domAction.args ?? {};
    const cardId = typeof args.cardId === 'string' ? args.cardId.trim() : '';
    const cardTitle = typeof args.cardTitle === 'string' ? args.cardTitle.trim() : '';
    const requiresCardId = domAction.toolName !== 'removeCard';
    if (requiresCardId && !cardId) {
        return 'DOM action missing cardId.';
    }
    switch (domAction.toolName) {
        case 'changeCardChartType':
            if (!args.newType) return 'changeCardChartType requires newType.';
            break;
        case 'filterCard':
            if (!args.column || typeof args.column !== 'string') {
                return 'filterCard requires a column.';
            }
            if (!Array.isArray(args.values) || args.values.length === 0) {
                return 'filterCard requires at least one value.';
            }
            if (args.values.some((value: unknown) => typeof value !== 'string' && typeof value !== 'number')) {
                return 'filterCard values must be strings or numbers.';
            }
            break;
        case 'setTopN':
            if (args.topN === undefined || args.topN === null) {
                return 'setTopN requires the topN value.';
            }
            if (
                args.topN !== 'all' &&
                (!Number.isFinite(Number(args.topN)) || Number(args.topN) <= 0 || !Number.isInteger(Number(args.topN)))
            ) {
                return 'setTopN must be a positive integer or "all".';
            }
            break;
        case 'toggleLegendLabel':
            if (!args.label || typeof args.label !== 'string') {
                return 'toggleLegendLabel requires a label.';
            }
            break;
        case 'exportCard':
            if (!args.format || typeof args.format !== 'string') {
                return 'exportCard requires a format.';
            }
            break;
        case 'removeCard':
            if (!cardId && !cardTitle) {
                return 'removeCard requires a cardId (or cardTitle that uniquely identifies the card).';
            }
            break;
        default:
            break;
    }
    return null;
};

const describeNoOpDomAction = (runtime: PlannerRuntime, domAction: DomAction): string | null => {
    const args = domAction.args ?? {};
    const cardId = typeof args.cardId === 'string' ? args.cardId.trim() : '';
    if (!cardId) return null;

    const cards = Array.isArray(runtime.get().analysisCards) ? runtime.get().analysisCards : [];
    const card = cards.find(current => current.id === cardId);
    if (!card) return null;
    const cardLabel = card.plan?.title ?? 'this card';

    switch (domAction.toolName) {
        case 'changeCardChartType': {
            const desiredType = typeof args.newType === 'string' ? args.newType : null;
            const currentType = card.displayChartType ?? card.plan.chartType;
            if (desiredType && desiredType === currentType) {
                return `Skipped chart switch because "${cardLabel}" is already a ${desiredType} chart.`;
            }
            break;
        }
        case 'showCardData': {
            if (typeof args.visible !== 'boolean') break;
            if (card.isDataVisible === args.visible) {
                return args.visible
                    ? `Raw data for "${cardLabel}" is already visible.`
                    : `Raw data for "${cardLabel}" is already hidden.`;
            }
            break;
        }
        case 'setTopN': {
            if (args.topN === undefined) break;
            const desiredTopN =
                args.topN === 'all'
                    ? null
                    : Number(args.topN);
            if (desiredTopN !== null && !Number.isFinite(desiredTopN)) {
                break;
            }
            const currentTopN = typeof card.topN === 'number' ? card.topN : null;
            if (currentTopN === desiredTopN) {
                const label = desiredTopN === null ? 'all categories' : `Top ${desiredTopN}`;
                return `Skipped Top N change because "${cardLabel}" already shows ${label}.`;
            }
            break;
        }
        case 'toggleHideOthers': {
            if (typeof args.hide !== 'boolean') break;
            if (card.hideOthers === args.hide) {
                return args.hide
                    ? `"${cardLabel}" already hides the "Others" bucket.`
                    : `"${cardLabel}" is already showing the "Others" bucket.`;
            }
            break;
        }
        default:
            break;
    }

    return null;
};

const validateFilterArgsPayload = (query?: string | null): string | null => {
    if (typeof query !== 'string') return null;
    const trimmed = query.trim();
    if (trimmed.length === 0) {
        // Empty queries are allowed and mapped to "show all rows" fallback.
        return null;
    }
    if (trimmed.length < 3) {
        return 'Filter query must be at least 3 characters.';
    }
    if (trimmed.length > 200) {
        return 'Filter query is too long (max 200 characters).';
    }
    return null;
};

const validateExecuteCodePayload = (
    action: AiAction & { code: { explanation: string; jsFunctionBody: string } },
): string | null => {
    const explanation = action.code.explanation?.trim() ?? '';
    if (explanation.length < 10) {
        return 'Code explanation must be at least 10 characters.';
    }
    const body = action.code.jsFunctionBody.trim();
    if (!/return\s+/i.test(body)) {
        return 'JavaScript transform must include a return statement.';
    }
    return null;
};

const recordValidationTelemetry = (
    runtime: PlannerRuntime,
    details?: ValidationFailureDetails,
    retryInstruction?: string,
) => {
    if (!details) return;
    const summary = `Validation failed at step ${details.actionIndex + 1}`;
    const traceId = runtime
        .get()
        .beginAgentActionTrace(details.actionType, summary, 'system');
    runtime.get().updateAgentActionTrace(traceId, 'failed', details.reason, {
        errorCode: ACTION_ERROR_CODES.VALIDATION_FAILED,
        metadata: { actionIndex: details.actionIndex },
    });
    runtime.get().recordAgentValidationEvent({
        actionType: details.actionType,
        reason: details.reason,
        actionIndex: details.actionIndex,
        runId: runtime.runId,
        retryInstruction,
    });
};

const validateAgentResponse = (
    response: AiChatResponse,
    runtime: PlannerRuntime,
): AgentResponseValidationResult => {
    if (!Array.isArray(response.actions) || response.actions.length === 0) {
        return {
            isValid: false,
            userMessage: 'AI response was empty; requesting it to restate the plan...',
            retryInstruction:
                'You must return at least one action. Begin with a plan_state_update that satisfies the required schema before any other steps.',
        };
    }
    if (response.actions.length > MAX_ACTIONS_PER_RESPONSE) {
        const offendingAction = response.actions[1] ?? response.actions[0];
        return buildPayloadValidationFailure(
            offendingAction,
            Math.min(1, response.actions.length - 1),
            'Too many actions returned in a single response.',
            'Limit every response to a plan_state_update followed by exactly one atomic action (text_response, dom_action, execute_js_code, etc.).',
        );
    }

    const firstAction = response.actions[0];
    let currentPlanState = runtime.get().plannerSession.planState;
    const isGreetingIntent = runtime.detectedIntent?.intent === 'greeting';
    let lastMintedStateTagInfo: MintedStateTagInfo | null = null;

    const enforceActionEnvelope = (action: AiAction, index: number): AgentResponseValidationResult | null => {
        const normalizedType = typeof action.type === 'string' ? action.type.trim() : '';
        if (!normalizedType) {
            return buildPayloadValidationFailure(
                action,
                index,
                'Action type is missing.',
                'Every action must include the type field (matching responseType) along with stepId and stateTag.',
            );
        }
        if (action.responseType !== normalizedType) {
            return buildPayloadValidationFailure(
                action,
                index,
                'Action type must match responseType.',
                'Keep the type field identical to responseType for every action.',
            );
        }
        action.type = normalizedType as AgentActionType;

        const rawStateTag = typeof action.stateTag === 'string' ? action.stateTag.trim() : '';
        if (!rawStateTag) {
            return buildPayloadValidationFailure(
                action,
                index,
                'stateTag is missing.',
                'Every action must include a monotonic stateTag formatted as "<epochMs>-<seq>" (or a known label like "awaiting_clarification").',
            );
        }
        const normalizedStateTag = normalizeStateTag(rawStateTag);
        if (!normalizedStateTag) {
            return buildPayloadValidationFailure(
                action,
                index,
                'stateTag format is invalid.',
                'Mint stateTag tokens as "<epochMs>-<seq>" (optionally with a suffix) or use one of the known labels.',
            );
        }
        const mintedInfo = parseMintedStateTag(normalizedStateTag);
        if (mintedInfo) {
            if (
                lastMintedStateTagInfo &&
                (mintedInfo.epochMs < lastMintedStateTagInfo.epochMs ||
                    (mintedInfo.epochMs === lastMintedStateTagInfo.epochMs &&
                        mintedInfo.seq <= lastMintedStateTagInfo.seq))
            ) {
                return buildPayloadValidationFailure(
                    action,
                    index,
                    'stateTag must strictly increase with each action.',
                    'Ensure every new action increments the numeric portion of the stateTag so it remains monotonic.',
                );
            }
            lastMintedStateTagInfo = mintedInfo;
        }
        action.stateTag = normalizedStateTag;
        return null;
    };

    const attachGreetingPlanPayload = (): boolean => {
        seedGreetingPlanState(runtime);
        currentPlanState = runtime.get().plannerSession.planState;
        if (!currentPlanState) {
            return false;
        }
        firstAction.planState = currentPlanState;
        runtime
            .get()
            .addProgress(
                'Relaxed plan tracker requirement for greeting; auto-filled plan_state_update payload.',
                'system',
            );
        return true;
    };

    if (!currentPlanState) {
        if (firstAction.responseType !== 'plan_state_update') {
            if (isGreetingIntent && firstAction.responseType === 'text_response') {
                seedGreetingPlanState(runtime);
                return { isValid: true };
            }
            return buildPayloadValidationFailure(
                firstAction ?? null,
                0,
                'First action must be plan_state_update when no plan tracker is active.',
                PLAN_PRIMER_INSTRUCTION,
            );
        }
        if (!hasPlanStatePayload(firstAction)) {
            if (!(isGreetingIntent && attachGreetingPlanPayload())) {
                return buildPayloadValidationFailure(
                    firstAction,
                    0,
                    'Plan tracker snapshot missing required fields.',
                    'Your initial plan_state_update must include planId, currentStepId, steps[], goal, contextSummary, progress, nextSteps, blockedBy (or null), referenced observationIds, confidence, and updatedAt before other actions.',
                );
            }
        }
    } else if (firstAction.responseType === 'plan_state_update' && !hasPlanStatePayload(firstAction)) {
        return buildPayloadValidationFailure(
            firstAction,
            0,
            'Plan tracker update missing required fields.',
            'Any plan_state_update must include planId, currentStepId, steps[], goal, contextSummary, progress, nextSteps, blockedBy, observationIds, confidence, and updatedAt.',
        );
    }

    for (let index = 0; index < response.actions.length; index++) {
        const action = response.actions[index];
        const envelopeError = enforceActionEnvelope(action, index);
        if (envelopeError) {
            return envelopeError;
        }
        const trimmedStepId = typeof action.stepId === 'string' ? action.stepId.trim() : '';
        if (trimmedStepId.length < 3) {
            const autoAssigned =
                action.responseType === 'text_response' ? autoAssignTextResponseStepId(action, runtime, index) : false;
            if (!autoAssigned) {
                return buildPayloadValidationFailure(
                    action,
                    index,
                    'stepId is missing or invalid.',
                    'Every action must include stepId matching the pending plan step id (>=3 characters, typically kebab-case).',
                );
            }
        } else {
            action.stepId = trimmedStepId;
        }
        switch (action.responseType) {
            case 'plan_state_update':
                if (!hasPlanStatePayload(action)) {
                    return buildPayloadValidationFailure(
                        action,
                        index,
                        'Plan tracker update missing required fields.',
                        'Ensure every plan_state_update includes goal, progress, nextSteps, blockedBy, observationIds, confidence, and updatedAt.',
                    );
                }
                break;
            case 'plan_creation':
                if (!hasPlanPayload(action)) {
                    return buildPayloadValidationFailure(
                        action,
                        index,
                        'Plan payload is missing.',
                        'Provide a full analysis plan object with chart type, title, description, and column selections.',
                    );
                }
                break;
            case 'dom_action':
                if (!hasDomActionPayload(action)) {
                    return buildPayloadValidationFailure(
                        action,
                        index,
                        'DOM action payload is missing.',
                        'Include domAction with the toolName and args for card interactions.',
                    );
                }
                repairDomActionFromIntent(action, runtime, index);
                {
                    const domIssue = validateDomActionPayload(action.domAction);
                    if (domIssue) {
                        return buildPayloadValidationFailure(
                            action,
                            index,
                            domIssue,
                            'Provide the required DOM tool arguments, including cardId and any tool-specific fields.',
                        );
                    }
                }
                break;
            case 'execute_js_code':
                if (!hasExecutableCodePayload(action)) {
                    return buildPayloadValidationFailure(
                        action,
                        index,
                        'Executable code payload is missing.',
                        'Every execute_js_code action must include explanation and a non-empty jsFunctionBody.',
                    );
                }
                {
                    const codeIssue = validateExecuteCodePayload(action as AiAction & {
                        code: { explanation: string; jsFunctionBody: string };
                    });
                    if (codeIssue) {
                        return buildPayloadValidationFailure(
                            action,
                            index,
                            codeIssue,
                            'Ensure your data transform includes a clear explanation and a return statement.',
                        );
                    }
                }
                break;
            case 'filter_spreadsheet':
                if (!hasFilterArgsPayload(action)) {
                    const repaired = repairFilterActionFromIntent(action, runtime, index);
                    if (!repaired) {
                        return buildPayloadValidationFailure(
                            action,
                            index,
                            'Filter query is missing.',
                            'Provide args.query describing how to filter the spreadsheet.',
                        );
                    }
                }
                {
                    let filterIssue = validateFilterArgsPayload(action.args?.query ?? null);
                    if (filterIssue) {
                        const repaired = repairFilterActionFromIntent(action, runtime, index);
                        if (repaired) {
                            filterIssue = validateFilterArgsPayload(action.args?.query ?? null);
                        }
                    }
                    if (filterIssue) {
                        return buildPayloadValidationFailure(
                            action,
                            index,
                            filterIssue,
                            'Provide a natural-language filter query between 3 and 200 characters.',
                        );
                    }
                }
                break;
            case 'clarification_request':
                if (!hasClarificationPayload(action)) {
                    return buildPayloadValidationFailure(
                        action,
                        index,
                        'Clarification payload is missing.',
                        'Include question, options, pendingPlan, and targetProperty fields.',
                    );
                }
                {
                    const clarIssue = validateClarificationPayload(action);
                    if (clarIssue) {
                        return buildPayloadValidationFailure(
                            action,
                            index,
                            clarIssue,
                            'Clarification requests must include a question, at least one option, and a targetProperty.',
                        );
                    }
                }
                break;
            default:
                break;
        }
    }

    const requiredToolHint = runtime.detectedIntent?.requiredTool;
    if (requiredToolHint && !runtime.intentRequirementSatisfied) {
        const hasRequiredTool = response.actions.some(action => matchesRequiredTool(action, requiredToolHint));
        if (!hasRequiredTool) {
            const autoAction = buildRequiredToolFallbackAction(runtime, requiredToolHint);
            if (autoAction) {
                const planAction = response.actions[0];
                response.actions = [planAction, autoAction];
                lastMintedStateTagInfo = parseMintedStateTag(planAction?.stateTag ?? '') ?? null;
                const envelopeFailure = enforceActionEnvelope(autoAction, 1);
                if (envelopeFailure) {
                    return envelopeFailure;
                }
                const requiredLabel =
                    requiredToolHint.domToolName ?? requiredToolHint.responseType ?? 'the required tool';
                runtime
                    .get()
                    .addProgress(`Auto-inserted ${requiredLabel} to satisfy the user's request.`, 'system');
                runtime.get().recordAgentValidationEvent?.({
                    actionType: autoAction.responseType,
                    reason: 'auto_insert_required_tool',
                    actionIndex: response.actions.length - 1,
                    runId: runtime.runId,
                    retryInstruction: `Inserted ${requiredLabel} automatically because it was required by the user intent.`,
                });
            } else {
                const requiredLabel =
                    requiredToolHint.domToolName ?? requiredToolHint.responseType ?? 'the required tool';
                return buildPayloadValidationFailure(
                    response.actions[0] ?? null,
                    0,
                    `Required tool ${requiredLabel} missing.`,
                    `The user's intent requires using ${requiredLabel}. Include that action (with the correct payload) in your response before other tools.`,
                );
            }
        }
    }

    return { isValid: true };
};

const planAgentActions = async (
    prompt: string,
    plannerContext: ChatPlannerContext,
    runtime: PlannerRuntime,
    statusMessage: string,
    options?: ChatResponseOptions,
): Promise<AiChatResponse> => {
    runtime.get().updateBusyStatus(statusMessage);
    const rawResponse = await plannerContext.requestAiResponse(prompt, options);
    return agentEngine.run(rawResponse, buildEngineContext(runtime));
};

const resolvePromptModeForRuntime = (runtime: PlannerRuntime): 'plan_only' | 'full' => {
    return runtime.get().plannerSession.planState ? 'full' : 'plan_only';
};

const runPlannerWorkflow = async (
    originalPrompt: string,
    plannerContext: ChatPlannerContext,
    runtime: PlannerRuntime,
): Promise<void> => {
    const MAX_AUTO_RETRIES = 1;
    const PLAN_CORRECTION_STATUS = 'Requesting corrected plan outline...';
    let retryAttempts = 0;
    let validationRetries = 0;
    let usedFallbackPlanPrompt = false;
    let usedRestatementPrompt = false;
    let continuationAttempts = 0;
    const withIntentNotes = (prompt: string) => appendIntentNotesToPrompt(prompt, runtime.intentNotes);
    const executionPolicy = resolveIntentExecutionPolicy(runtime.detectedIntent);
    const validationLimit = executionPolicy.maxValidationRetries;
    const allowFallbackPlanPrompt = executionPolicy.allowPlanFallbackPrompt;
    const allowAutoContinuation = executionPolicy.allowAutoContinuation;

    const requestAgentResponse = async (
        prompt: string,
        statusMessage: string,
        options?: ChatResponseOptions,
    ): Promise<{ response: AiChatResponse; meta: PlannerMetaSignal }> => {
        const aiResponse = await planAgentActions(prompt, plannerContext, runtime, statusMessage, options);
        applyResponseEnvelopeAutoHeal(aiResponse, runtime);
        const metaSignal = extractPlannerMetaSignal(aiResponse.actions);
        if (metaSignal.resumePlanner) {
            clearAwaitingUserInput(runtime);
        }
        return { response: aiResponse, meta: metaSignal };
    };

    enterAgentPhase(runtime, 'observing', 'Reviewing the current dataset and prior context...');
    try {
        enterAgentPhase(runtime, 'planning', 'Thinking through your question...');
        let { response, meta: responseMeta } = await requestAgentResponse(
            withIntentNotes(originalPrompt),
            'Thinking through your question...',
            { mode: resolvePromptModeForRuntime(runtime) },
        );

        while (response) {
            if (runtime.get().isRunCancellationRequested(runtime.runId)) {
                runtime.get().addProgress('Stopped processing request.');
                return;
            }

            const validation = validateAgentResponse(response, runtime);
            if (!validation.isValid) {
                validationRetries++;
                recordValidationTelemetry(runtime, validation.details, validation.retryInstruction);
                runtime.get().addProgress(validation.userMessage, 'error');
                if (validationRetries >= validationLimit) {
                    if (!usedRestatementPrompt) {
                        usedRestatementPrompt = true;
                        validationRetries = 0;
                        runtime.get().addProgress(
                            'Plan validation failed; asking the AI to restate your request and try again.',
                            'system',
                        );
                        enterAgentPhase(runtime, 'planning', 'Restating your request before continuing...');
                        ({ response, meta: responseMeta } = await requestAgentResponse(
                            withIntentNotes(
                                `${runtime.userMessage}\n\nSYSTEM NOTE: Restate the user's latest request in your own words to confirm understanding, then provide a valid plan_state_update that follows the shared schema exactly.`,
                            ),
                            'Restating your request...',
                            { mode: resolvePromptModeForRuntime(runtime) },
                        ));
                        continue;
                    }
                    if (!usedFallbackPlanPrompt && allowFallbackPlanPrompt) {
                        usedFallbackPlanPrompt = true;
                        validationRetries = 0;
                        runtime.get().addProgress('Plan validation failed twice; requesting a simplified plan snapshot...', 'system');
                        enterAgentPhase(runtime, 'planning', 'Rebuilding the plan outline...');
                        ({ response, meta: responseMeta } = await requestAgentResponse(
                            appendIntentNotesToPrompt(buildFallbackPlanPrompt(runtime), runtime.intentNotes),
                            FALLBACK_PLAN_STATUS,
                            { mode: 'plan_only' },
                        ));
                        continue;
                    }
                    runtime.get().addProgress('Unable to obtain a valid plan update after multiple attempts.', 'error');
                    const failureMessage: ChatMessage = {
                        sender: 'ai',
                        text: 'Sorry, I could not establish a valid plan_state_update. Please try again or rephrase your question.',
                        timestamp: new Date(),
                        type: 'ai_message',
                        isError: true,
                    };
                    runtime.set(prev => ({ chatHistory: [...prev.chatHistory, failureMessage] }));
                    return;
                }
                enterAgentPhase(runtime, 'planning', 'Revising the plan outline based on validation feedback...');
                ({ response, meta: responseMeta } = await requestAgentResponse(
                    withIntentNotes(`${runtime.userMessage}\n\nSYSTEM NOTE: ${validation.retryInstruction}`),
                    PLAN_CORRECTION_STATUS,
                    { mode: resolvePromptModeForRuntime(runtime) },
                ));
                continue;
            }

            const remainingAutoRetries = MAX_AUTO_RETRIES - retryAttempts;
            const containsOperationalActions = response.actions.some(
                action => !['plan_state_update', 'text_response'].includes(action.responseType),
            );
            const containsPipelineActions = response.actions.some(action =>
                PIPELINE_CONTINUATION_ACTIONS.has(action.responseType),
            );
            enterAgentPhase(
                runtime,
                'acting',
                containsOperationalActions ? 'Executing the next step of the plan...' : 'Delivering the latest reasoning step...',
            );
            const dispatchResult = await dispatchAgentActions(response, runtime, remainingAutoRetries);
            let observationSatisfied = response.actions.some(action => action.responseType === 'text_response');
            if (dispatchResult.type === 'complete' && !observationSatisfied) {
                observationSatisfied = shareObservationSummary(runtime, response);
            }

            if (dispatchResult.type === 'halt') {
                return;
            }

            if (dispatchResult.type === 'retry') {
                const nextAttemptNumber = retryAttempts + 2;
                retryAttempts++;
                const attemptLabel = `attempt ${nextAttemptNumber}`;
                const retryPhaseMessage = dispatchResult.phaseMessage ?? 'Retrying the last action automatically...';
                enterAgentPhase(runtime, 'retrying', retryPhaseMessage);
                const chatMessageText =
                    dispatchResult.userFacingMessage ??
                    `The previous action failed (${dispatchResult.reason}). I'll try again automatically (${attemptLabel}).`;
                const retryMessage: ChatMessage = {
                    sender: 'ai',
                    text: chatMessageText,
                    timestamp: new Date(),
                    type: 'ai_message',
                    isError: true,
                };
                runtime.set(prev => ({ chatHistory: [...prev.chatHistory, retryMessage] }));
                const progressMessage =
                    dispatchResult.progressMessage ?? `Auto-retrying last action (${attemptLabel})...`;
                runtime.get().addProgress(progressMessage);
                const planningStatusMessage = dispatchResult.statusMessage ?? 'Adjusting the plan after a failed attempt...';
                enterAgentPhase(runtime, 'planning', planningStatusMessage);
                const retryPrompt =
                    dispatchResult.retryPrompt ??
                    `SYSTEM NOTE: Previous action failed because ${dispatchResult.reason}. Please adjust and try again.`;
                const retryPromptMode = dispatchResult.promptMode ?? 'full';
                ({ response, meta: responseMeta } = await requestAgentResponse(
                    withIntentNotes(`${runtime.userMessage}\n\n${retryPrompt}`),
                    planningStatusMessage,
                    { mode: retryPromptMode },
                ));
                continue;
            }

            if (responseMeta.awaitUser) {
                pausePlannerForUser(runtime, responseMeta);
                return;
            }

            if (responseMeta.haltAfter) {
                runtime.get().addProgress('Stopped auto-continue per AI instruction.');
                return;
            }

            enterAgentPhase(runtime, 'verifying', 'Reviewing what just happened before continuing...');
            const { hasPendingSteps, stateTag, hasBlocker } = plannerHasPendingSteps(runtime);
            const isStateTagBlocked = stateTag ? CONTINUATION_STATE_TAG_DENYLIST.has(stateTag) : false;
            if (
                dispatchResult.type === 'complete' &&
                observationSatisfied &&
                allowAutoContinuation &&
                containsPipelineActions &&
                continuationAttempts < MAX_PLAN_CONTINUATIONS &&
                hasPendingSteps &&
                !isStateTagBlocked &&
                !hasBlocker &&
                !runtime.get().isRunCancellationRequested(runtime.runId) &&
                !containsOperationalActions
            ) {
                continuationAttempts++;
                const planState = runtime.get().plannerSession.planState;
                const continuationPrompt = [
                    runtime.userMessage,
                    '',
                    `SYSTEM NOTE: Continue executing your plan. Current goal: ${planState?.goal ?? 'N/A'}.`,
                    planState?.nextSteps?.length
                        ? `Remaining steps: ${planState.nextSteps
                              .map(step => `[${step.id}] ${step.label}`)
                              .join(' | ')}`
                        : null,
                    planState?.blockedBy ? `Known blockers: ${planState.blockedBy}` : null,
                ]
                    .filter(Boolean)
                    .join('\n');
                const continuationLabel =
                    continuationAttempts === 1 ? 'Continuing plan' : `Continuing plan (cycle ${continuationAttempts}/${MAX_PLAN_CONTINUATIONS})`;
                runtime.get().addProgress(continuationLabel);
                enterAgentPhase(runtime, 'planning', 'Continuing with the remaining plan steps...');
                ({ response, meta: responseMeta } = await requestAgentResponse(
                    withIntentNotes(continuationPrompt),
                    continuationAttempts === 1 ? 'Continuing plan...' : `Continuing plan (cycle ${continuationAttempts})...`,
                    { mode: 'full' },
                ));
                continue;
            }

            break;
        }

        enterAgentPhase(runtime, 'reporting', 'Summarizing the latest findings...');
    } finally {
        if (!hasActiveClarifications(runtime)) {
            resetAgentPhase(runtime);
        }
    }
};

const shouldRecordPostActionObservation = (action: AiAction): boolean => {
    if (action.responseType === 'filter_spreadsheet' || action.responseType === 'execute_js_code') {
        return true;
    }
    if (action.responseType === 'dom_action' && action.domAction) {
        return [
            'filterCard',
            'setTopN',
            'toggleHideOthers',
            'toggleLegendLabel',
            'highlightCard',
            'showCardData',
            'removeCard',
        ].includes(action.domAction.toolName);
    }
    return false;
};

const recordPostActionObservation = (
    runtime: PlannerRuntime,
    action: AiAction,
    traceId: string,
    observation: AgentObservation,
) => {
    if (observation.status !== 'success' || !shouldRecordPostActionObservation(action)) {
        return;
    }
    const snapshot = buildRawDataExplorerSnapshot(runtime.get());
    const outputs = {
        rawDataExplorerSummary: snapshot.summary,
        filteredRows: snapshot.metadata.filteredRows,
        totalRows: snapshot.metadata.totalRows,
        snippetHash: snapshot.metadata.snippetHash,
        drilldownLabel: snapshot.metadata.drilldownLabel,
        drilldownValueCount: snapshot.metadata.drilldownValueCount,
    };
    runtime.get().appendPlannerObservation({
        id: createObservationId(),
        actionId: traceId,
        responseType: action.responseType,
        status: 'success',
        timestamp: new Date().toISOString(),
        outputs,
        errorCode: null,
        uiDelta: null,
    });
    if (typeof runtime.get().annotateAgentActionTrace === 'function') {
        runtime.get().annotateAgentActionTrace(traceId, outputs);
    }
};

const dispatchAgentActions = async (
    response: AiChatResponse,
    runtime: PlannerRuntime,
    remainingAutoRetries: number,
): Promise<DispatchResult> => {
    for (const action of response.actions) {
        if (runtime.get().isRunCancellationRequested(runtime.runId)) {
            runtime.get().addProgress('Cancelled remaining actions.');
            return { type: 'halt' };
        }

        const traceSummary = summarizeAction(action);
        const traceId = runtime.get().beginAgentActionTrace(action.responseType, traceSummary, 'chat');
        const markTrace: TraceRecorder = (status, details, telemetry) => {
            runtime.get().updateAgentActionTrace(traceId, status, details, telemetry);
        };
        const normalizedStateTag = normalizeStateTag(action.stateTag);
        const metadata: Record<string, any> = {};
        if (normalizedStateTag) {
            metadata.stateTag = normalizedStateTag;
        }
        if (typeof action.stepId === 'string' && action.stepId.trim().length > 0) {
            metadata.stepId = action.stepId.trim();
        }
        const initialTelemetry = Object.keys(metadata).length > 0 ? { metadata } : undefined;
        markTrace('executing', undefined, initialTelemetry);

        if (action.responseType === 'dom_action' && action.domAction) {
            resolveCardIdFromArgs(runtime, action.domAction);
        }
        const stepResult = await runActionThroughRegistry(action, runtime, remainingAutoRetries, markTrace);
        const observationPayload = normalizeObservationPayload(stepResult);
        const recordedObservation = toAgentObservation(action, traceId, observationPayload);
        runtime.get().appendPlannerObservation(recordedObservation);
        recordPostActionObservation(runtime, action, traceId, recordedObservation);
        const satisfiedByAction =
            runtime.detectedIntent?.requiredTool &&
            !runtime.intentRequirementSatisfied &&
            matchesRequiredTool(action, runtime.detectedIntent.requiredTool) &&
            recordedObservation.status === 'success';
        if (satisfiedByAction) {
            runtime.intentRequirementSatisfied = true;
            runtime.get().addProgress(
                `Intent requirement satisfied via ${runtime.detectedIntent.requiredTool.domToolName ?? runtime.detectedIntent.requiredTool.responseType}.`,
            );
            runtime.get().annotateAgentActionTrace(traceId, {
                intentSatisfied: true,
                intent: runtime.detectedIntent.intent,
            });
        }
        if (stepResult.type === 'retry') {
            return {
                type: 'retry',
                reason: stepResult.reason,
                retryPrompt: stepResult.retryPrompt,
                userFacingMessage: stepResult.userFacingMessage,
                progressMessage: stepResult.progressMessage,
                phaseMessage: stepResult.phaseMessage,
                statusMessage: stepResult.statusMessage,
                promptMode: stepResult.promptMode,
            };
        }
        if (stepResult.type === 'halt') {
            return { type: 'halt' };
        }
    }

    return { type: 'complete' };
};

const handleTextResponseAction: AgentActionExecutor = async ({ action, runtime, markTrace }) => {
    if (!hasTextPayload(action)) {
        markTrace('failed', 'No AI text response provided.', { errorCode: ACTION_ERROR_CODES.MISSING_TEXT });
        return {
            type: 'continue',
            observation: {
                status: 'error',
                errorCode: ACTION_ERROR_CODES.MISSING_TEXT,
            },
        };
    }

    if (action.meta?.awaitUser) {
        const quickChoices = extractQuickChoices(action.text ?? '');
        if (quickChoices.length === 0) {
            const retryPrompt =
                'SYSTEM NOTE: Your previous message asked the user for a choice but did not include explicit options. Restate the question and list at least two options using a numbered format (e.g., "1) … 2) …").';
            runtime
                .get()
                .addProgress('Await-user question lacked explicit options. Asking the AI to restate it with numbered choices...', 'error');
            markTrace('failed', 'Await-user prompt missing options.', {
                errorCode: ACTION_ERROR_CODES.VALIDATION_FAILED,
            });
            return {
                type: 'retry',
                reason: 'Await-user prompt missing selectable options.',
                retryPrompt,
                userFacingMessage: 'The assistant needed to restate the question with concrete options. Retrying...',
                progressMessage: 'Requesting a multiple-choice restatement from the assistant...',
                phaseMessage: 'Rephrasing question to include explicit options...',
                statusMessage: 'Rebuilding prompt with options...',
                promptMode: 'full',
                observation: {
                    status: 'error',
                    errorCode: ACTION_ERROR_CODES.VALIDATION_FAILED,
                    outputs: { issue: 'missing_options' },
                },
            };
        }
    }

    const shouldAttachMemory = !runtime.memoryTagAttached && runtime.memorySnapshot.length > 0;
    const aiMessage: ChatMessage = {
        sender: 'ai',
        text: action.text,
        timestamp: new Date(),
        type: 'ai_message',
        cardId: action.cardId,
        usedMemories: shouldAttachMemory ? runtime.memorySnapshot : undefined,
        meta: action.meta,
    };

    runtime.set(prev => ({ chatHistory: [...prev.chatHistory, aiMessage] }));
    if (shouldAttachMemory) {
        runtime.memoryTagAttached = true;
    }
    markTrace('succeeded', 'Shared response with user.');
    return {
        type: 'continue',
        observation: {
            status: 'success',
            outputs: {
                textPreview: action.text.slice(0, 200),
                cardId: action.cardId ?? null,
            },
        },
    };
};

const handlePlanStateUpdateAction: AgentActionExecutor = async ({ action, runtime, markTrace }) => {
    if (!hasPlanStatePayload(action)) {
        markTrace('failed', 'Missing plan state payload.', {
            errorCode: ACTION_ERROR_CODES.PLAN_STATE_PAYLOAD_MISSING,
        });
        return {
            type: 'continue',
            observation: {
                status: 'error',
                errorCode: ACTION_ERROR_CODES.PLAN_STATE_PAYLOAD_MISSING,
            },
        };
    }

    const payload = action.planState;
    const normalizedSteps = normalizePlanStepsPayload(payload.nextSteps);
    const normalizedAllSteps = normalizePlanStepsPayload(payload.steps);
    const fallbackStepId =
        normalizedSteps[0]?.id ?? normalizedAllSteps[0]?.id ?? runtime.get().plannerPendingSteps[0]?.id ?? FALLBACK_TEXT_RESPONSE_STEP_ID;
    const derivedPlanId =
        typeof payload.planId === 'string' && payload.planId.trim().length > 0
            ? payload.planId.trim()
            : runtime.get().plannerSession.planState?.planId ?? `plan-${Date.now().toString(36)}`;
    const derivedCurrentStepId =
        typeof payload.currentStepId === 'string' && payload.currentStepId.trim().length >= 3
            ? payload.currentStepId.trim()
            : fallbackStepId;
    const normalizedState: AgentPlanState = {
        planId: derivedPlanId,
        goal: payload.goal.trim(),
        progress: payload.progress.trim(),
        nextSteps: normalizedSteps,
        steps: normalizedAllSteps.length > 0 ? normalizedAllSteps : normalizedSteps,
        currentStepId: derivedCurrentStepId,
        blockedBy: payload.blockedBy?.trim() || null,
        contextSummary: payload.contextSummary?.trim() || null,
        observationIds: Array.isArray(payload.observationIds)
            ? payload.observationIds.filter(id => typeof id === 'string' && id.trim().length > 0)
            : [],
        confidence:
            typeof payload.confidence === 'number'
                ? Math.min(1, Math.max(0, payload.confidence))
                : payload.confidence ?? null,
        updatedAt: payload.updatedAt || new Date().toISOString(),
        stateTag: normalizeStateTag(payload.stateTag) ?? null,
    };

    runtime.get().updatePlannerPlanState(normalizedState);
    runtime.get().addProgress(`Plan goal updated: ${normalizedState.goal}`);
    markTrace('succeeded', 'Plan state captured.');
    return {
        type: 'continue',
        observation: {
            status: 'success',
            outputs: {
                goal: normalizedState.goal,
                nextSteps: normalizedState.nextSteps,
                blockedBy: normalizedState.blockedBy,
            },
        },
    };
};

const handlePlanCreationAction: AgentActionExecutor = async ({ action, runtime, markTrace }) => {
    const dataset = runtime.get().csvData;
    if (!hasPlanPayload(action) || !dataset) {
        markTrace('failed', 'Missing plan payload or dataset.', {
            errorCode: ACTION_ERROR_CODES.MISSING_PLAN_PAYLOAD,
        });
        return {
            type: 'continue',
            observation: {
                status: 'error',
                errorCode: ACTION_ERROR_CODES.MISSING_PLAN_PAYLOAD,
            },
        };
    }

    const createdCards = await runtime.deps.runPlanWithChatLifecycle(action.plan, dataset, runtime.runId);
    markTrace('succeeded', `Executed plan for "${action.plan.title ?? 'analysis'}".`);
    return {
        type: 'continue',
        observation: {
            status: 'success',
            outputs: {
                planTitle: action.plan.title ?? 'analysis',
                cardsCreated: createdCards.length,
            },
        },
    };
};

const handleDomAction: AgentActionExecutor = async ({ action, runtime, markTrace }) => {
    if (!hasDomActionPayload(action)) {
        markTrace('failed', 'Missing DOM action payload.', {
            errorCode: ACTION_ERROR_CODES.DOM_PAYLOAD_MISSING,
        });
        return {
            type: 'continue',
            observation: {
                status: 'error',
                errorCode: ACTION_ERROR_CODES.DOM_PAYLOAD_MISSING,
            },
        };
    }

    const hasTarget =
        typeof action.domAction.target?.byId === 'string' ||
        typeof action.domAction.target?.byTitle === 'string' ||
        typeof action.domAction.target?.selector === 'string' ||
        typeof action.domAction.args?.cardId === 'string' ||
        typeof action.domAction.args?.cardTitle === 'string';
    if (!hasTarget) {
        const warning = 'I need you to pick a specific chart before I can perform that action.';
        runtime.get().addProgress(warning, 'error');
        const aiMessage: ChatMessage = {
            sender: 'ai',
            text: `${warning} Please tap the chart or tell me its title so I can continue.`,
            timestamp: new Date(),
            type: 'ai_message',
            isError: true,
        };
        runtime.set(prev => ({ chatHistory: [...prev.chatHistory, aiMessage] }));
        markTrace('succeeded', 'DOM action skipped due to missing target.', {
            metadata: { downgraded: true },
        });
        return {
            type: 'continue',
            observation: {
                status: 'success',
                outputs: { downgraded: true },
            },
        };
    }

    const skipReason = describeNoOpDomAction(runtime, action.domAction);
    if (skipReason) {
        runtime.get().addProgress(skipReason);
        const aiMessage: ChatMessage = {
            sender: 'ai',
            text: skipReason,
            timestamp: new Date(),
            type: 'ai_message',
        };
        runtime.set(prev => ({ chatHistory: [...prev.chatHistory, aiMessage] }));
        markTrace('succeeded', 'DOM action skipped (already satisfied).', {
            metadata: { skipped: true, toolName: action.domAction.toolName },
        });
        return {
            type: 'continue',
            observation: {
                status: 'success',
                outputs: {
                    skipped: true,
                    reason: skipReason,
                },
            },
        };
    }

    const domArgs = action.domAction.args ?? (action.domAction.args = {});
    if (typeof domArgs.cardId !== 'string' || domArgs.cardId.trim().length === 0) {
        const clarificationId = promptUserForCardSelection(runtime, action.domAction);
        markTrace('succeeded', 'Requested card selection before executing DOM action.', {
            metadata: { clarificationId },
        });
        if (!clarificationId) {
            return {
                type: 'halt',
                observation: {
                    status: 'error',
                    errorCode: ACTION_ERROR_CODES.DOM_PAYLOAD_MISSING,
                },
            };
        }
        return {
            type: 'halt',
            observation: {
                status: 'pending',
                outputs: {
                    clarificationId,
                    awaitingCardSelection: true,
                },
            },
        };
    }

    runtime.get().executeDomAction(action.domAction);
    markTrace('succeeded', `DOM action ${action.domAction.toolName} completed.`);
    return {
        type: 'continue',
        observation: {
            status: 'success',
            outputs: {
                toolName: action.domAction.toolName,
                args: action.domAction.args ?? null,
            },
            uiDelta: action.domAction.toolName,
        },
    };
};

const handleExecuteCodeAction: AgentActionExecutor = async ({ action, runtime, remainingAutoRetries, markTrace }) => {
    const dataset = runtime.get().csvData;

    if (!dataset) {
        const warning = 'Dataset unavailable for transformation.';
        runtime.get().addProgress(warning, 'error');
        const aiMessage: ChatMessage = {
            sender: 'ai',
            text: `${warning} I could not run the requested update.`,
            timestamp: new Date(),
            type: 'ai_message',
            isError: true,
        };
        runtime.set(prev => ({ chatHistory: [...prev.chatHistory, aiMessage] }));
        markTrace('failed', warning, { errorCode: ACTION_ERROR_CODES.DATASET_UNAVAILABLE });
        return {
            type: 'continue',
            observation: {
                status: 'error',
                errorCode: ACTION_ERROR_CODES.DATASET_UNAVAILABLE,
            },
        };
    }

    if (!hasExecutableCodePayload(action)) {
        const warning = 'AI requested a data transformation but did not include executable code, so no changes were applied.';
        runtime.get().addProgress(warning, 'error');
        const aiMessage: ChatMessage = {
            sender: 'ai',
            text: warning,
            timestamp: new Date(),
            type: 'ai_message',
            isError: true,
        };
       runtime.set(prev => ({ chatHistory: [...prev.chatHistory, aiMessage] }));
        markTrace('failed', 'Missing jsFunctionBody in execute_js_code payload.', {
            errorCode: ACTION_ERROR_CODES.MISSING_JS_CODE,
        });
        return {
            type: 'continue',
            observation: {
                status: 'error',
                errorCode: ACTION_ERROR_CODES.MISSING_JS_CODE,
            },
        };
    }

    if (runtime.get().pendingDataTransform) {
        const warning =
            'A previous AI transformation is still awaiting your approval. Please confirm or discard it before running another one.';
        runtime.get().addProgress(warning, 'error');
        const aiMessage: ChatMessage = {
            sender: 'ai',
            text: `${warning} You can review it in the Data Change banner above the dashboard.`,
            timestamp: new Date(),
            type: 'ai_message',
            isError: true,
        };
        runtime.set(prev => ({ chatHistory: [...prev.chatHistory, aiMessage] }));
        markTrace('failed', warning, { errorCode: ACTION_ERROR_CODES.TRANSFORM_PENDING });
        return {
            type: 'continue',
            observation: {
                status: 'error',
                errorCode: ACTION_ERROR_CODES.TRANSFORM_PENDING,
            },
        };
    }

    try {
        const extractColumnNames = (profiles: { name: string }[], sampleRows: CsvRow[]): string[] => {
            if (Array.isArray(profiles) && profiles.length > 0) {
                return profiles.map(profile => profile.name);
            }
            const sampleRow = sampleRows.find(row => row && typeof row === 'object');
            return sampleRow ? Object.keys(sampleRow) : [];
        };
        const formatColumnPreview = (columns: string[]): string => {
            if (!columns || columns.length === 0) return '(none)';
            const preview = columns.slice(0, 8).join(', ');
            return columns.length > 8 ? `${preview}, …` : preview;
        };
        const aliasMap = runtime.get().columnAliasMap;
        const dataForTransform = cloneRowsWithAliases(dataset.data, aliasMap);
        const transformResult = executeJavaScriptDataTransform(dataForTransform, action.code.jsFunctionBody.trim());
        const normalizedRows = normalizeRowsFromAliases(transformResult.data, aliasMap);
        const newData: CsvData = { ...dataset, data: normalizedRows };
        const updatedProfiles = profileData(newData.data);
        const updatedAliasMap = buildColumnAliasMap(updatedProfiles.map(p => p.name));
        const beforeColumns = extractColumnNames(runtime.get().columnProfiles, dataset.data);
        const afterColumns = extractColumnNames(updatedProfiles, normalizedRows);
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
        const { rowsBefore, rowsAfter, removedRows, addedRows, modifiedRows } = transformResult.meta;
        const summaryParts = [
            `${rowsBefore} → ${rowsAfter} rows`,
            removedRows ? `${removedRows} removed` : null,
            addedRows ? `${addedRows} added` : null,
            modifiedRows ? `${modifiedRows} modified` : null,
        ].filter(Boolean);
        const summaryDescription = summaryParts.length > 0 ? summaryParts.join(', ') : 'changes detected';
        const pendingTransformId = `transform-${Date.now()}`;
        runtime.get().queuePendingDataTransform({
            id: pendingTransformId,
            summary: summaryDescription,
            explanation: action.code.explanation,
            meta: transformResult.meta,
            previewRows: normalizedRows.slice(0, 5),
            nextData: newData,
            nextColumnProfiles: updatedProfiles,
            nextAliasMap: updatedAliasMap,
            sourceCode: action.code.jsFunctionBody.trim(),
            createdAt: new Date().toISOString(),
            beforeColumns,
            afterColumns,
        });
        const aiMessage: ChatMessage = {
            sender: 'ai',
            text: `I drafted a data transformation (${summaryDescription}). Please review the banner above the dashboard to confirm or discard it.\n\n${columnDiffSummary}`,
            timestamp: new Date(),
            type: 'ai_message',
            cardId: action.cardId,
        };
        runtime.set(prev => ({ chatHistory: [...prev.chatHistory, aiMessage] }));
        markTrace('succeeded', `${summaryDescription} (awaiting confirmation)`);
        return {
            type: 'continue',
            observation: {
                status: 'success',
                outputs: {
                    summary: summaryDescription,
                    rowsBefore,
                    rowsAfter,
                    pendingTransformId,
                },
            },
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        runtime.get().addProgress(`AI data transformation failed: ${errorMessage}`, 'error');
        const failureMessage: ChatMessage = {
            sender: 'ai',
            text: `I couldn't apply that data transformation: ${errorMessage}`,
            timestamp: new Date(),
            type: 'ai_message',
            isError: true,
        };
        runtime.set(prev => ({ chatHistory: [...prev.chatHistory, failureMessage] }));
        markTrace('failed', errorMessage, { errorCode: ACTION_ERROR_CODES.TRANSFORM_FAILED });
        const observation = {
            status: 'error',
            errorCode: ACTION_ERROR_CODES.TRANSFORM_FAILED,
            outputs: { message: errorMessage },
        };
        if (remainingAutoRetries > 0) {
            return { type: 'retry', reason: errorMessage, observation };
        }
        return { type: 'halt', observation };
    }
};

const handleFilterSpreadsheetAction: AgentActionExecutor = async ({ action, runtime, markTrace }) => {
    const { query: finalQuery, source } = computeFilterQuery(
        runtime,
        action.args?.query ?? null,
        runtime.detectedIntent?.intent === 'data_filter' ? runtime.detectedIntent.requiredTool : undefined,
    );
    const isShowAll = finalQuery === SHOW_ALL_FILTER_QUERY;

    if (!action.args) {
        action.args = { query: finalQuery };
    } else {
        action.args.query = finalQuery;
    }
    if (source === 'user_message') {
        runtime.get().addProgress('No filter payload provided; inferring filter from your latest message.');
    } else if (source === 'default') {
        runtime.get().addProgress('No useful filter found; showing the entire dataset so you can refine it.');
    }

    runtime
        .get()
        .addProgress(
            isShowAll
                ? 'Showing the full raw dataset for you. Apply a natural-language filter any time.'
                : 'AI is filtering the data explorer based on your request.',
        );
    await runtime.get().handleNaturalLanguageQuery(finalQuery);
    runtime.set({ isSpreadsheetVisible: true });
    setTimeout(() => {
        document.getElementById('raw-data-explorer')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    markTrace('succeeded', `Filter query: ${finalQuery}`);
    return {
        type: 'continue',
        observation: {
            status: 'success',
            outputs: { query: finalQuery, showAll: isShowAll },
            uiDelta: 'filter_spreadsheet',
        },
    };
};

const handleClarificationRequestAction: AgentActionExecutor = async ({ action, runtime, markTrace }) => {
    if (!hasClarificationPayload(action)) {
        markTrace('failed', 'Clarification payload missing.', {
            errorCode: ACTION_ERROR_CODES.CLARIFICATION_PAYLOAD_MISSING,
        });
        return {
            type: 'continue',
            observation: {
                status: 'error',
                errorCode: ACTION_ERROR_CODES.CLARIFICATION_PAYLOAD_MISSING,
            },
        };
    }

    const filteredClarification = filterClarificationOptions(
        action.clarification,
        runtime.get().csvData?.data,
        runtime.get().columnProfiles.map(p => p.name),
        {
            preferredColumns: extractPendingPlanColumns(action.clarification.pendingPlan),
        },
    );

    if (!filteredClarification) {
        const warning =
            'I could not find any usable columns for that question. Try inspecting the data preview to pick a different column.';
        runtime.get().addProgress(warning, 'error');
        const aiMessage: ChatMessage = {
            sender: 'ai',
            text: `${warning}\nYou can also open the Data Preview to double-check column names.`,
            timestamp: new Date(),
            type: 'ai_message',
            isError: true,
            cta: {
                type: 'open_data_preview',
                label: 'Open Data Preview',
                helperText: 'Review the raw columns before asking again.',
            },
        };
        runtime.set(prev => ({ chatHistory: [...prev.chatHistory, aiMessage] }));
        markTrace('failed', 'Unable to find usable clarification options.', {
            errorCode: ACTION_ERROR_CODES.CLARIFICATION_NO_OPTIONS,
        });
        return {
            type: 'continue',
            observation: {
                status: 'error',
                errorCode: ACTION_ERROR_CODES.CLARIFICATION_NO_OPTIONS,
            },
        };
    }

    if (!filteredClarification.options || filteredClarification.options.length === 0) {
        const retryPrompt =
            'SYSTEM NOTE: Clarification requests must include at least two concrete options the user can pick. Please restate the clarification with enumerated options (e.g., Option A, Option B).';
        markTrace('failed', 'Clarification request missing options.', {
            errorCode: ACTION_ERROR_CODES.CLARIFICATION_NO_OPTIONS,
        });
        runtime.get().addProgress('Clarification request missing options. Asking the AI to restate with explicit choices...', 'error');
        return {
            type: 'retry',
            reason: 'Clarification request missing options.',
            retryPrompt,
            userFacingMessage: 'Clarification was missing explicit options, so I asked the AI to restate it.',
            progressMessage: 'Requesting a clarification with explicit options...',
            phaseMessage: 'Retrying clarification step...',
            statusMessage: 'Rebuilding clarification request...',
            promptMode: 'full',
        };
    }

    const enrichedClarification = runtime.deps.registerClarification(filteredClarification);

    if (enrichedClarification.options.length === 1) {
        const autoOption = enrichedClarification.options[0];
        runtime.get().addProgress(`AI inferred you meant "${autoOption.label}" (${autoOption.value}).`);
        await runtime.get().handleClarificationResponse(enrichedClarification.id, autoOption);
        markTrace('succeeded', 'Auto-resolved clarification based on single option.');
        return {
            type: 'continue',
            observation: {
                status: 'success',
                outputs: {
                    clarificationId: enrichedClarification.id,
                    autoResolved: true,
                },
            },
        };
    }

    const clarificationMessage: ChatMessage = {
        sender: 'ai',
        text:
            enrichedClarification.columnHints && enrichedClarification.columnHints.length > 0
                ? `${enrichedClarification.question}\n\n(Column context: ${enrichedClarification.columnHints.join(
                      ', ',
                  )})`
                : enrichedClarification.question,
        timestamp: new Date(),
        type: 'ai_clarification',
        clarificationRequest: enrichedClarification,
    };
    runtime.set(prev => ({
        chatHistory: [...prev.chatHistory, clarificationMessage],
    }));
    runtime.set({ activeClarificationId: enrichedClarification.id });
    enterAgentPhase(runtime, 'clarifying', 'Need your input to keep going...');
    runtime.get().endBusy(runtime.runId);
    markTrace('succeeded', 'Requested user clarification.');
    return {
        type: 'halt',
        observation: {
            status: 'pending',
            outputs: {
                clarificationId: enrichedClarification.id,
                optionCount: enrichedClarification.options.length,
            },
        },
    };
};

const handleProceedToAnalysisAction: AgentActionExecutor = async ({ markTrace }) => {
    markTrace('succeeded', 'Proceed to analysis acknowledged.');
    return {
        type: 'continue',
        observation: {
            status: 'success',
        },
    };
};

const actionExecutorRegistry: Record<AgentActionType, AgentActionExecutor> = {
    text_response: handleTextResponseAction,
    plan_creation: handlePlanCreationAction,
    plan_state_update: handlePlanStateUpdateAction,
    dom_action: handleDomAction,
    execute_js_code: handleExecuteCodeAction,
    filter_spreadsheet: handleFilterSpreadsheetAction,
    clarification_request: handleClarificationRequestAction,
    proceed_to_analysis: handleProceedToAnalysisAction,
};

export { runPlannerWorkflow };

const normalizeStateTag = (tag?: string | null): AgentStateTag | undefined => {
    if (!tag) return undefined;
    const normalized = tag.trim();
    if (!normalized) return undefined;
    if (STATE_TAG_SET.has(normalized as AgentStateTag)) {
        return normalized as AgentStateTag;
    }
    if (MINTED_STATE_TAG_REGEX.test(normalized)) {
        return normalized as AgentStateTag;
    }
    const ts = Date.now();
    if (ts - lastStateTagWarningAt > STATE_TAG_WARNING_THROTTLE_MS) {
        console.warn(`Unknown agent stateTag "${normalized}". Allowed values: ${AGENT_STATE_TAGS.join(', ')} or minted "<epoch>-<seq>" tokens.`);
        lastStateTagWarningAt = ts;
    }
    return undefined;
};

const maybeShowThoughtlessToast = (runtime: PlannerRuntime) => {
    const ts = Date.now();
    if (ts - lastThoughtlessToastAt < THOUGHTLESS_TOAST_THROTTLE_MS) {
        return;
    }
    lastThoughtlessToastAt = ts;
    runtime.get().addToast('AI 正在重新思考，請稍候。', 'info');
};

export const agentSdk = {
    errorCodes: ACTION_ERROR_CODES,
    runAction: runActionThroughRegistry,
    getMiddlewares: getActionMiddlewares,
    registerMiddleware: registerActionMiddleware,
    executors: actionExecutorRegistry,
};

/**
 * Thin orchestrator class the chat slice instantiates once.
 * Each incoming chat message flows through `handleMessage`, which
 * handles busy state, planner initialization, and error surfacing.
 */
export class AgentWorker {
    private readonly set: SetState<AppStore>;
    private readonly get: GetState<AppStore>;
    private readonly deps: ChatSliceDependencies;
    private readonly policy: PlannerPolicy;

    constructor(options: AgentWorkerOptions) {
        this.set = options.set;
        this.get = options.get;
        this.deps = options.deps;
        this.policy = options.policy ?? DEFAULT_PLANNER_POLICY;
    }

    async handleMessage(message: string): Promise<void> {
        const trimmedMessage = message.trim();
        const userMessage: ChatMessage = { sender: 'user', text: message, timestamp: new Date(), type: 'user_message' };

        const stateSnapshot = this.get();
        const datasetHash = stateSnapshot.datasetHash ?? null;
        const plannerDatasetHash = stateSnapshot.plannerDatasetHash ?? null;
        const datasetChanged = Boolean(plannerDatasetHash && datasetHash && plannerDatasetHash !== datasetHash);
        const shouldForcePlanReset = messageRequestsPlanReset(message);
        const isGreeting = GREETING_REGEX_STRICT.test(trimmedMessage);

        const detectedIntent = detectUserIntent(message, stateSnapshot);
        if (detectedIntent.intent !== 'unknown') {
            const requiredToolLabel =
                detectedIntent.requiredTool?.domToolName ?? detectedIntent.requiredTool?.responseType ?? 'n/a';
            stateSnapshot.addProgress(
                `[IntentRouter] Detected intent=${detectedIntent.intent} (conf=${detectedIntent.confidence.toFixed(
                    2,
                )}) tool=${requiredToolLabel}`,
            );
        }
        const intentNotes = buildIntentNotes(detectedIntent, stateSnapshot);

        if (datasetChanged || shouldForcePlanReset || (isGreeting && !!stateSnapshot.plannerSession.planState)) {
            stateSnapshot.resetPlannerObservations();
            stateSnapshot.clearPlannerPlanState();
            if (datasetChanged) {
                stateSnapshot.addProgress('Detected new dataset; resetting the analysis plan tracker.');
            } else if (shouldForcePlanReset) {
                stateSnapshot.addProgress('Resetting the analysis plan as requested.');
            } else if (isGreeting) {
                stateSnapshot.addProgress('Greeting detected; starting a fresh plan for this interaction.');
            }
        }

        this.set({ agentAwaitingUserInput: false, agentAwaitingPromptId: null });

        const runId = this.get().beginBusy('Working on your request...', { cancellable: true });
        this.set(prev => ({ chatHistory: [...prev.chatHistory, userMessage] }));

        try {
            const plannerContext = await buildChatPlannerContext(message, this.get, this.deps, runId);
            if (this.get().isRunCancellationRequested(runId)) {
                this.get().addProgress('Stopped processing request.');
                return;
            }

            await runPlannerWorkflow(message, plannerContext, {
                set: this.set,
                get: this.get,
                deps: this.deps,
                runId,
                userMessage: message,
                memorySnapshot: plannerContext.memorySnapshot,
                memoryTagAttached: false,
                policy: this.policy,
                intentNotes,
                detectedIntent,
                intentRequirementSatisfied: !detectedIntent?.requiredTool,
            });
        } catch (error) {
            if (!this.get().isRunCancellationRequested(runId)) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.get().addProgress(`Error: ${errorMessage}`, 'error');
                const aiMessage: ChatMessage = {
                    sender: 'ai',
                    text: `Sorry, an error occurred: ${errorMessage}`,
                    timestamp: new Date(),
                    type: 'ai_message',
                    isError: true,
                };
                this.set(prev => ({ chatHistory: [...prev.chatHistory, aiMessage] }));
            }
        } finally {
            if (!this.get().pendingClarifications.some(req => req.status === 'pending' || req.status === 'resolving')) {
                this.get().endBusy(runId);
            }
            this.get().clearChatMemoryPreview();
        }
    }
}
