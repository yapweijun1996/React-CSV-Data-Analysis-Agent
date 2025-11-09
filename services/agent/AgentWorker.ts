import type { GetState, SetState } from 'zustand';
import { executeJavaScriptDataTransform, profileData } from '../../utils/dataProcessor';
import { generateChatResponse } from '../aiService';
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
    DomAction,
    MemoryReference,
    AgentActionStatus,
    AgentStateTag,
    AgentObservation,
    AgentObservationStatus,
    AgentPlanState,
    PendingPlan,
    AgentActionType,
} from '../../types';
import { AGENT_STATE_TAGS } from '../../types';
import type { AppStore } from '../../store/appStoreTypes';

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
}

interface PlannerRuntime {
    set: SetState<AppStore>;
    get: GetState<AppStore>;
    deps: ChatSliceDependencies;
    runId: string;
    userMessage: string;
    memorySnapshot: MemoryReference[];
    memoryTagAttached: boolean;
}

interface ChatPlannerContext {
    memorySnapshot: MemoryReference[];
    requestAiResponse: (prompt: string) => Promise<AiChatResponse>;
}

interface ActionObservationPayload {
    status: AgentObservationStatus;
    outputs?: Record<string, any> | null;
    errorCode?: string | null;
    uiDelta?: string | null;
}

type ActionStepResult =
    | { type: 'continue'; observation?: ActionObservationPayload }
    | { type: 'retry'; reason: string; observation?: ActionObservationPayload }
    | { type: 'halt'; observation?: ActionObservationPayload };

type DispatchResult =
    | { type: 'complete' }
    | { type: 'retry'; reason: string }
    | { type: 'halt' };

const STATE_TAG_SET = new Set<AgentStateTag>(AGENT_STATE_TAGS);
const STATE_TAG_WARNING_THROTTLE_MS = 5000;
const THOUGHTLESS_TOAST_THROTTLE_MS = 8000;
const PLAN_PRIMER_INSTRUCTION =
    'Begin every response with a plan_state_update that lists your goal, context, progress, next steps, blockers (or null), referenced observations, confidence, and updatedAt before any other action.';
const MAX_PLAN_CONTINUATIONS = 3;
const CONTINUATION_STATE_TAG_DENYLIST = new Set<AgentStateTag>(['awaiting_clarification', 'blocked']);

let lastStateTagWarningAt = 0;
let lastThoughtlessToastAt = 0;

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
} as const;

type ActionErrorCode = (typeof ACTION_ERROR_CODES)[keyof typeof ACTION_ERROR_CODES];

const createObservationId = () =>
    `obs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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

const hasFilterArgsPayload = (action: AiAction): action is AiAction & { args: { query: string } } => {
    return typeof action.args?.query === 'string' && action.args.query.trim().length > 0;
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
    const hasNextSteps = Array.isArray(payload.nextSteps) && payload.nextSteps.length > 0;
    return hasGoal && hasProgress && hasNextSteps;
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
        planState.nextSteps.some(step => typeof step === 'string' && step.trim().length > 0)
    );
    return {
        hasPendingSteps: hasSteps,
        stateTag: planState?.stateTag as AgentStateTag | undefined,
        hasBlocker: !!(planState?.blockedBy && planState.blockedBy.trim().length > 0),
    };
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

    const requestAiResponse = (prompt: string) =>
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
            { signal: deps.getRunSignal(runId) },
        );

    return {
        memorySnapshot,
        requestAiResponse,
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
    if (!cardId) {
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
        default:
            break;
    }
    return null;
};

const describeNoOpDomAction = (runtime: PlannerRuntime, domAction: DomAction): string | null => {
    const args = domAction.args ?? {};
    const cardId = typeof args.cardId === 'string' ? args.cardId.trim() : '';
    if (!cardId) return null;

    const card = runtime.get().analysisCards.find(current => current.id === cardId);
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

const validateFilterArgsPayload = (query: string): string | null => {
    const trimmed = query.trim();
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

    const firstAction = response.actions[0];
    const currentPlanState = runtime.get().plannerSession.planState;

    if (!currentPlanState) {
        if (firstAction.responseType !== 'plan_state_update') {
            return buildPayloadValidationFailure(
                firstAction ?? null,
                0,
                'First action must be plan_state_update when no plan tracker is active.',
                PLAN_PRIMER_INSTRUCTION,
            );
        }
        if (!hasPlanStatePayload(firstAction)) {
            return buildPayloadValidationFailure(
                firstAction,
                0,
                'Plan tracker snapshot missing required fields.',
                'Your initial plan_state_update must include goal, contextSummary, progress, nextSteps, blockedBy (or null), referenced observationIds, confidence, and updatedAt before other actions.',
            );
        }
    } else if (firstAction.responseType === 'plan_state_update' && !hasPlanStatePayload(firstAction)) {
        return buildPayloadValidationFailure(
            firstAction,
            0,
            'Plan tracker update missing required fields.',
            'Any plan_state_update must include goal, contextSummary, progress, nextSteps, blockedBy, observationIds, confidence, and updatedAt.',
        );
    }

    for (let index = 0; index < response.actions.length; index++) {
        const action = response.actions[index];
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
                    return buildPayloadValidationFailure(
                        action,
                        index,
                        'Filter query is missing.',
                        'Provide args.query describing how to filter the spreadsheet.',
                    );
                }
                {
                    const filterIssue = validateFilterArgsPayload(action.args!.query);
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

    return { isValid: true };
};

const planAgentActions = async (
    prompt: string,
    requestAiResponse: (prompt: string) => Promise<AiChatResponse>,
    updateBusyStatus: (message: string) => void,
    statusMessage: string,
): Promise<AiChatResponse> => {
    updateBusyStatus(statusMessage);
    return requestAiResponse(prompt);
};

const runPlannerWorkflow = async (
    originalPrompt: string,
    plannerContext: ChatPlannerContext,
    runtime: PlannerRuntime,
): Promise<void> => {
    const MAX_AUTO_RETRIES = 1;
    const MAX_VALIDATION_RETRIES = 2;
    const PLAN_CORRECTION_STATUS = 'Requesting corrected plan outline...';
    let retryAttempts = 0;
    let validationRetries = 0;
    let continuationAttempts = 0;
    const updateBusyStatus = runtime.get().updateBusyStatus;
    let response = await planAgentActions(
        originalPrompt,
        plannerContext.requestAiResponse,
        updateBusyStatus,
        'Thinking through your question...',
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
            if (validationRetries >= MAX_VALIDATION_RETRIES) {
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
            response = await planAgentActions(
                `${runtime.userMessage}\n\nSYSTEM NOTE: ${validation.retryInstruction}`,
                plannerContext.requestAiResponse,
                updateBusyStatus,
                PLAN_CORRECTION_STATUS,
            );
            continue;
        }

        const remainingAutoRetries = MAX_AUTO_RETRIES - retryAttempts;
        const containsToolActions = response.actions.some(action =>
            action.responseType === 'plan_creation' ||
            action.responseType === 'execute_js_code' ||
            action.responseType === 'filter_spreadsheet' ||
            action.responseType === 'dom_action' ||
            action.responseType === 'clarification_request' ||
            action.responseType === 'proceed_to_analysis'
        );
        const dispatchResult = await dispatchAgentActions(response, runtime, remainingAutoRetries);

        if (dispatchResult.type === 'halt') {
            return;
        }

        if (dispatchResult.type === 'retry') {
            const nextAttemptNumber = retryAttempts + 2;
            retryAttempts++;
            const retryMessage: ChatMessage = {
                sender: 'ai',
                text: `The previous data transformation failed (${dispatchResult.reason}). I'll try again automatically (attempt ${nextAttemptNumber}).`,
                timestamp: new Date(),
                type: 'ai_message',
                isError: true,
            };
            runtime.set(prev => ({ chatHistory: [...prev.chatHistory, retryMessage] }));
            runtime.get().addProgress(`Auto-retrying data transformation (attempt ${nextAttemptNumber})...`);
            response = await planAgentActions(
                `${runtime.userMessage}\n\nSYSTEM NOTE: Previous data transformation failed because ${dispatchResult.reason}. Please adjust the code and try again.`,
                plannerContext.requestAiResponse,
                updateBusyStatus,
                'Retrying data transformation...',
            );
            continue;
        }

        const { hasPendingSteps, stateTag, hasBlocker } = plannerHasPendingSteps(runtime);
        const isStateTagBlocked = stateTag ? CONTINUATION_STATE_TAG_DENYLIST.has(stateTag) : false;
        if (
            dispatchResult.type === 'complete' &&
            continuationAttempts < MAX_PLAN_CONTINUATIONS &&
            hasPendingSteps &&
            !isStateTagBlocked &&
            !hasBlocker &&
            !runtime.get().isRunCancellationRequested(runtime.runId) &&
            !containsToolActions
        ) {
            continuationAttempts++;
            const planState = runtime.get().plannerSession.planState;
            const continuationPrompt = [
                runtime.userMessage,
                '',
                `SYSTEM NOTE: Continue executing your plan. Current goal: ${planState?.goal ?? 'N/A'}.`,
                planState?.nextSteps?.length ? `Remaining steps: ${planState.nextSteps.join(' | ')}` : null,
                planState?.blockedBy ? `Known blockers: ${planState.blockedBy}` : null,
            ]
                .filter(Boolean)
                .join('\n');
            const continuationLabel = continuationAttempts === 1 ? 'Continuing plan' : `Continuing plan (cycle ${continuationAttempts}/${MAX_PLAN_CONTINUATIONS})`;
            runtime.get().addProgress(continuationLabel);
            response = await planAgentActions(
                continuationPrompt,
                plannerContext.requestAiResponse,
                updateBusyStatus,
                continuationAttempts === 1 ? 'Continuing plan...' : `Continuing plan (cycle ${continuationAttempts})...`,
            );
            continue;
        }

        break;
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
        const initialTelemetry = normalizedStateTag ? { metadata: { stateTag: normalizedStateTag } } : undefined;
        markTrace('executing', undefined, initialTelemetry);

        const stepResult = await runActionThroughRegistry(action, runtime, remainingAutoRetries, markTrace);
        const observationPayload = normalizeObservationPayload(stepResult);
        runtime.get().appendPlannerObservation(
            toAgentObservation(action, traceId, observationPayload),
        );
        if (stepResult.type === 'retry') {
            return { type: 'retry', reason: stepResult.reason };
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

    const shouldAttachMemory = !runtime.memoryTagAttached && runtime.memorySnapshot.length > 0;
    const aiMessage: ChatMessage = {
        sender: 'ai',
        text: action.text,
        timestamp: new Date(),
        type: 'ai_message',
        cardId: action.cardId,
        usedMemories: shouldAttachMemory ? runtime.memorySnapshot : undefined,
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
    const normalizedState: AgentPlanState = {
        goal: payload.goal.trim(),
        progress: payload.progress.trim(),
        nextSteps: payload.nextSteps.map(step => step.trim()).filter(Boolean),
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
        const aliasMap = runtime.get().columnAliasMap;
        const dataForTransform = cloneRowsWithAliases(dataset.data, aliasMap);
        const transformResult = executeJavaScriptDataTransform(dataForTransform, action.code.jsFunctionBody.trim());
        const normalizedRows = normalizeRowsFromAliases(transformResult.data, aliasMap);
        const newData: CsvData = { ...dataset, data: normalizedRows };
        const updatedProfiles = profileData(newData.data);
        const updatedAliasMap = buildColumnAliasMap(updatedProfiles.map(p => p.name));
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
        });
        const aiMessage: ChatMessage = {
            sender: 'ai',
            text: `I drafted a data transformation (${summaryDescription}). Please review the banner above the dashboard to confirm or discard it.`,
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
    if (!hasFilterArgsPayload(action)) {
        markTrace('failed', 'Missing filter query.', { errorCode: ACTION_ERROR_CODES.FILTER_QUERY_MISSING });
        return {
            type: 'continue',
            observation: {
                status: 'error',
                errorCode: ACTION_ERROR_CODES.FILTER_QUERY_MISSING,
            },
        };
    }

    runtime.get().addProgress('AI is filtering the data explorer based on your request.');
    await runtime.get().handleNaturalLanguageQuery(action.args.query);
    runtime.set({ isSpreadsheetVisible: true });
    setTimeout(() => {
        document.getElementById('raw-data-explorer')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    markTrace('succeeded', `Filter query: ${action.args.query}`);
    return {
        type: 'continue',
        observation: {
            status: 'success',
            outputs: { query: action.args.query },
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
    if (STATE_TAG_SET.has(tag as AgentStateTag)) {
        return tag as AgentStateTag;
    }
    const ts = Date.now();
    if (ts - lastStateTagWarningAt > STATE_TAG_WARNING_THROTTLE_MS) {
        console.warn(`Unknown agent stateTag "${tag}". Allowed values: ${AGENT_STATE_TAGS.join(', ')}`);
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

    constructor(options: AgentWorkerOptions) {
        this.set = options.set;
        this.get = options.get;
        this.deps = options.deps;
    }

    async handleMessage(message: string): Promise<void> {
        const userMessage: ChatMessage = { sender: 'user', text: message, timestamp: new Date(), type: 'user_message' };

        this.get().resetPlannerObservations();
        this.get().clearPlannerPlanState();
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
