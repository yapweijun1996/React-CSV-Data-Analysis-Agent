import type { GetState, SetState } from 'zustand';
import { executeJavaScriptDataTransform, profileData } from '../../utils/dataProcessor';
import { generateChatResponse } from '../../services/aiService';
import { vectorStore } from '../../services/vectorStore';
import { COLUMN_TARGET_PROPERTIES, columnHasUsableData, filterClarificationOptions, resolveColumnChoice } from '../../utils/clarification';
import { applyFriendlyPlanCopy } from '../../utils/planCopy';
import { runWithBusyState } from '../../utils/runWithBusy';
import { buildColumnAliasMap, cloneRowsWithAliases, normalizeRowsFromAliases } from '../../utils/columnAliases';
import type {
    AiAction,
    AiChatResponse,
    AnalysisCardData,
    AnalysisPlan,
    CardContext,
    ChatMessage,
    ClarificationOption,
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
} from '../../types';
import { AGENT_STATE_TAGS } from '../../types';
import type { AppStore, ChatSlice } from '../appStoreTypes';

interface ChatSliceDependencies {
    registerClarification: (clarification: ClarificationRequestPayload) => ClarificationRequest;
    updateClarificationStatus: (id: string, status: ClarificationStatus) => void;
    getRunSignal: (runId?: string) => AbortSignal | undefined;
    runPlanWithChatLifecycle: (plan: AnalysisPlan, data: CsvData, runId?: string) => Promise<AnalysisCardData[]>;
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
    let retryAttempts = 0;
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

        const remainingAutoRetries = MAX_AUTO_RETRIES - retryAttempts;
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
        text: enrichedClarification.question,
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

export const createChatSlice = (
    set: SetState<AppStore>,
    get: GetState<AppStore>,
    deps: ChatSliceDependencies,
): ChatSlice => {
    return {
        chatMemoryPreview: [],
        chatMemoryExclusions: [],
        chatMemoryPreviewQuery: '',
        isMemoryPreviewLoading: false,

    handleChatMessage: async (message: string) => {
        if (!get().isApiKeySet) {
            get().addProgress('API Key not set.', 'error');
            get().setIsSettingsModalOpen(true);
            return;
        }

        get().resetPlannerObservations();
        get().clearPlannerPlanState();
        const runId = get().beginBusy('Working on your request...', { cancellable: true });
            const newChatMessage: ChatMessage = { sender: 'user', text: message, timestamp: new Date(), type: 'user_message' };
            set(prev => ({ chatHistory: [...prev.chatHistory, newChatMessage] }));

            try {
                const plannerContext = await buildChatPlannerContext(message, get, deps, runId);
                if (get().isRunCancellationRequested(runId)) {
                    get().addProgress('Stopped processing request.');
                    return;
                }

                await runPlannerWorkflow(message, plannerContext, {
                    set,
                    get,
                    deps,
                    runId,
                    userMessage: message,
                    memorySnapshot: plannerContext.memorySnapshot,
                    memoryTagAttached: false,
                });
            } catch (error) {
                if (!get().isRunCancellationRequested(runId)) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    get().addProgress(`Error: ${errorMessage}`, 'error');
                    const aiMessage: ChatMessage = {
                        sender: 'ai',
                        text: `Sorry, an error occurred: ${errorMessage}`,
                        timestamp: new Date(),
                        type: 'ai_message',
                        isError: true,
                    };
                    set(prev => ({ chatHistory: [...prev.chatHistory, aiMessage] }));
                }
            } finally {
                if (!get().pendingClarifications.some(req => req.status === 'pending' || req.status === 'resolving')) {
                    get().endBusy(runId);
                }
                get().clearChatMemoryPreview();
            }
        },

    previewChatMemories: async (query: string) => {
        const trimmed = query.trim();
        if (!trimmed) {
            set({
                chatMemoryPreview: [],
                chatMemoryExclusions: [],
                chatMemoryPreviewQuery: '',
                isMemoryPreviewLoading: false,
            });
            return;
        }
        if (!vectorStore.getIsInitialized() || vectorStore.getDocumentCount() === 0) {
            set({
                chatMemoryPreview: [],
                chatMemoryExclusions: [],
                chatMemoryPreviewQuery: trimmed,
                isMemoryPreviewLoading: false,
            });
            return;
        }
        set({
            chatMemoryPreviewQuery: trimmed,
            isMemoryPreviewLoading: true,
        });
        try {
            const results = await vectorStore.search(trimmed, 3);
            if (get().chatMemoryPreviewQuery === trimmed) {
                set({
                    chatMemoryPreview: results,
                    chatMemoryExclusions: [],
                    isMemoryPreviewLoading: false,
                });
            }
        } catch (error) {
            console.error('Preview memory search failed:', error);
            if (get().chatMemoryPreviewQuery === trimmed) {
                set({ isMemoryPreviewLoading: false });
            }
        }
    },

    toggleMemoryPreviewSelection: (id: string) => {
        set(state => {
            const exists = state.chatMemoryExclusions.includes(id);
            return {
                chatMemoryExclusions: exists
                    ? state.chatMemoryExclusions.filter(memId => memId !== id)
                    : [...state.chatMemoryExclusions, id],
            };
        });
    },

    clearChatMemoryPreview: () => {
        set({
            chatMemoryPreview: [],
            chatMemoryExclusions: [],
            chatMemoryPreviewQuery: '',
            isMemoryPreviewLoading: false,
        });
    },

    handleClarificationResponse: async (clarificationId: string, userChoice: ClarificationOption) => {
        const { csvData, columnProfiles } = get();
        const targetClarification = get().pendingClarifications.find(req => req.id === clarificationId && req.status === 'pending');
        if (!targetClarification || !csvData) return;

        const userResponseMessage: ChatMessage = {
            sender: 'user',
            text: `Selected: ${userChoice.label}`,
            timestamp: new Date(),
            type: 'user_message',
        };
        set(prev => ({
            chatHistory: [...prev.chatHistory, userResponseMessage],
        }));

        await runWithBusyState(
            {
                beginBusy: get().beginBusy,
                endBusy: get().endBusy,
            },
            'Applying clarification...',
            async (runId) => {
                try {
                    deps.updateClarificationStatus(clarificationId, 'resolving');
                    const { pendingPlan, targetProperty } = targetClarification;

                    const availableColumns = columnProfiles.map(p => p.name);
                    const resolvedValue = resolveColumnChoice(userChoice, targetProperty, availableColumns);

                    if (COLUMN_TARGET_PROPERTIES.includes(targetProperty) && (!resolvedValue || !availableColumns.includes(resolvedValue))) {
                        const friendlyError = `I couldn't find a column matching "${userChoice.label}". Please pick another option so I know which column to use.`;
                        get().addProgress(friendlyError, 'error');
                        const aiErrorMessage: ChatMessage = {
                            sender: 'ai',
                            text: friendlyError,
                            timestamp: new Date(),
                            type: 'ai_message',
                            isError: true,
                        };
                        set(prev => ({
                            chatHistory: [...prev.chatHistory, aiErrorMessage],
                        }));
                        deps.updateClarificationStatus(clarificationId, 'pending');
                        return;
                    }

                    const requiresCategorical = targetProperty === 'groupByColumn';
                    const hasUsableData = requiresCategorical
                        ? columnHasUsableData(resolvedValue!, csvData.data, 2, 50)
                        : columnHasUsableData(resolvedValue!, csvData.data);

                    if (COLUMN_TARGET_PROPERTIES.includes(targetProperty) && resolvedValue && !hasUsableData) {
                        const friendlyError = requiresCategorical
                            ? `The column "${resolvedValue}" doesn't look like a good grouping (not enough distinct categories). Please pick another option.`
                            : `Looks like "${resolvedValue}" does not contain data right now. Please pick another option or ask about a different metric.`;
                        get().addProgress(friendlyError, 'error');
                        const aiErrorMessage: ChatMessage = {
                            sender: 'ai',
                            text: friendlyError,
                            timestamp: new Date(),
                            type: 'ai_message',
                            isError: true,
                        };
                        set(prev => ({
                            chatHistory: [...prev.chatHistory, aiErrorMessage],
                        }));
                        deps.updateClarificationStatus(clarificationId, 'pending');
                        return;
                    }

                    const basePlan = {
                        ...pendingPlan,
                        [targetProperty]: resolvedValue ?? userChoice.value,
                    } as AnalysisPlan;
                    const completedPlan = applyFriendlyPlanCopy(basePlan, columnProfiles);

                    if (!completedPlan.aggregation) {
                        completedPlan.aggregation = completedPlan.valueColumn ? 'sum' : 'count';
                    }
                    if (!completedPlan.chartType) {
                        completedPlan.chartType = 'bar';
                    }

                    if (completedPlan.chartType !== 'scatter') {
                        delete (completedPlan as any).xValueColumn;
                        delete (completedPlan as any).yValueColumn;
                    }
                    if (completedPlan.chartType !== 'combo') {
                        delete (completedPlan as any).secondaryValueColumn;
                        delete (completedPlan as any).secondaryAggregation;
                    }

                    if (!completedPlan.groupByColumn && completedPlan.chartType !== 'scatter') {
                        const allColumnNames = columnProfiles.map(p => p.name);
                        let inferredGroupBy: string | null = null;

                        const sortedColumnNames = [...allColumnNames].sort((a, b) => b.length - a.length);

                        for (const colName of sortedColumnNames) {
                            const formattedColName = colName.toLowerCase().replace(/_/g, ' ');
                            if (userChoice.label.toLowerCase().includes(formattedColName)) {
                                inferredGroupBy = colName;
                                break;
                            }
                        }

                        if (inferredGroupBy) {
                            completedPlan.groupByColumn = inferredGroupBy;
                            get().addProgress(`AI inferred grouping by "${inferredGroupBy}" based on your selection.`);
                        } else {
                            const suitableColumns = columnProfiles.filter(
                                p => p.type === 'categorical' && (p.uniqueValues || 0) < csvData.data.length && (p.uniqueValues || 0) > 1
                            );

                            if (suitableColumns.length > 0) {
                                suitableColumns.sort((a, b) => (a.uniqueValues || Infinity) - (b.uniqueValues || Infinity));
                                completedPlan.groupByColumn = suitableColumns[0].name;
                                get().addProgress(`AI inferred grouping by "${suitableColumns[0].name}" as a fallback.`);
                            }
                        }
                    }

                    if (!completedPlan.title) completedPlan.title = `Analysis of ${userChoice.label}`;
                    if (!completedPlan.description) completedPlan.description = `A chart showing an analysis of ${userChoice.label}.`;

                    if (completedPlan.chartType !== 'scatter' && (!completedPlan.chartType || !completedPlan.groupByColumn || !completedPlan.aggregation)) {
                        const missingFields = ['chartType', 'groupByColumn', 'aggregation'].filter(f => !(completedPlan as any)[f]);
                        throw new Error(`The clarified plan is still missing required fields like ${missingFields.join(', ')}.`);
                    }

                    await deps.runPlanWithChatLifecycle(completedPlan, csvData, runId);
                    deps.updateClarificationStatus(clarificationId, 'resolved');
                } catch (error) {
                    if (!get().isRunCancellationRequested(runId)) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        get().addProgress(`Error processing clarification: ${errorMessage}`, 'error');
                        const aiMessage: ChatMessage = {
                            sender: 'ai',
                            text: `Sorry, an error occurred while creating the chart: ${errorMessage}`,
                            timestamp: new Date(),
                            type: 'ai_message',
                            isError: true,
                        };
                        set(prev => ({ chatHistory: [...prev.chatHistory, aiMessage] }));
                        deps.updateClarificationStatus(clarificationId, 'pending');
                    }
                }
            },
            { cancellable: true },
        );
    },

    skipClarification: (clarificationId: string) => {
        const targetClarification = get().pendingClarifications.find(req => req.id === clarificationId && req.status === 'pending');
        if (!targetClarification) return;
        const userResponseMessage: ChatMessage = {
            sender: 'user',
            text: `Skipped: ${targetClarification.question}`,
            timestamp: new Date(),
            type: 'user_message',
        };
        const aiMessage: ChatMessage = {
            sender: 'ai',
            text: 'No problem—I cancelled that request. Ask me something else whenever you are ready.',
            timestamp: new Date(),
            type: 'ai_message',
        };
        deps.updateClarificationStatus(clarificationId, 'skipped');
        set(prev => ({
            chatHistory: [...prev.chatHistory, userResponseMessage, aiMessage],
        }));
        get().endBusy();
    },
    };
};
