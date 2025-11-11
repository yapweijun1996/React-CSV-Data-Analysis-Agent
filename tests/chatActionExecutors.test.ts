import assert from 'node:assert/strict';
import type {
    AiAction,
    AgentActionType,
    AgentPlanState,
    AgentPlanStep,
    ClarificationRequest,
} from '../types';
import { agentSdk } from '../store/slices/chatSlice';

const { errorCodes: ACTION_ERROR_CODES, runAction: runActionThroughRegistry } = agentSdk;

const ensureDocumentStub = () => {
    if (typeof globalThis.document === 'undefined') {
        (globalThis as any).document = { getElementById: () => null };
    }
};

ensureDocumentStub();

const buildSteps = (...labels: string[]): AgentPlanStep[] =>
    labels.map((label, idx) => {
        const normalized = label
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        return {
            id: normalized || `step-${idx + 1}`,
            label: label.trim(),
        };
    });

const TEST_STEP_ID = 'test-step';
let testStateTagSeq = 1;

const nextTestStateTag = () => `100000-${testStateTagSeq++}-test`;

const withEnvelope = (action: Partial<AiAction> & { responseType: AgentActionType }): AiAction => {
    const stepId =
        typeof action.stepId === 'string' && action.stepId.trim().length >= 3 ? action.stepId.trim() : TEST_STEP_ID;
    return {
        ...action,
        type: action.type ?? action.responseType,
        stepId,
        stateTag: action.stateTag ?? nextTestStateTag(),
    } as AiAction;
};

const buildPlanStatePayload = (overrides: Partial<AgentPlanState> = {}): AgentPlanState => {
    const nextSteps = overrides.nextSteps && overrides.nextSteps.length > 0 ? overrides.nextSteps : buildSteps('collect metrics', 'build chart');
    const normalizedSteps = nextSteps.map(step => ({
        ...step,
        status: step.status ?? 'ready',
    }));
    const allStepsSource =
        overrides.steps && overrides.steps.length > 0
            ? overrides.steps.map(step => ({ ...step, status: step.status ?? 'ready' }))
            : normalizedSteps;
    return {
        planId: overrides.planId ?? 'plan-test',
        goal: overrides.goal ?? 'Increase revenue insights',
        contextSummary: overrides.contextSummary ?? null,
        progress: overrides.progress ?? 'outlined targets',
        nextSteps: normalizedSteps,
        steps: allStepsSource,
        currentStepId: overrides.currentStepId ?? normalizedSteps[0]?.id ?? TEST_STEP_ID,
        blockedBy: overrides.blockedBy ?? null,
        observationIds: overrides.observationIds ?? ['obs-1'],
        confidence: overrides.confidence ?? 0.42,
        updatedAt: overrides.updatedAt ?? '2024-01-01T00:00:00.000Z',
        stateTag: overrides.stateTag ?? 'context_ready',
    };
};

type RuntimeState = {
    chatHistory: any[];
    isSpreadsheetVisible: boolean;
    columnAliasMap: Record<string, string>;
    columnProfiles: Array<{ name: string; type: string }>;
    csvData: any;
    pendingDataTransform: any;
    analysisCards: any[];
    queuePendingDataTransform: () => void;
    handleNaturalLanguageQuery: (query: string) => Promise<void>;
    executeDomAction: () => void;
    handleClarificationResponse: () => Promise<void>;
    addProgress: (message: string, type?: 'system' | 'error') => void;
    addToast: (message: string, type?: 'info' | 'success' | 'error', duration?: number) => string;
    endBusy: () => void;
    updatePlannerPlanState: (state: Record<string, any>) => void;
    plannerSession: { planState: any; observations: any[] };
    plannerPendingSteps: AgentPlanStep[];
    setPlannerPendingSteps: (steps: AgentPlanStep[]) => void;
    completePlannerPendingStep: () => void;
    annotateAgentActionTrace: (traceId: string, metadata: Record<string, any>) => void;
    lastFilterQuery: string | null;
    pendingClarifications: ClarificationRequest[];
    activeClarificationId: string | null;
    agentAwaitingUserInput: boolean;
    agentAwaitingPromptId: string | null;
};

const createRuntime = (
    overrides: Partial<RuntimeState> = {},
    options?: { userMessage?: string; policy?: { allowLooseSteps?: boolean } },
) => {
    const baseState: RuntimeState = {
        chatHistory: [],
        isSpreadsheetVisible: false,
        columnAliasMap: {},
        columnProfiles: [],
        csvData: null,
        pendingDataTransform: null,
        analysisCards: [],
        queuePendingDataTransform: () => {},
        handleNaturalLanguageQuery: async (query: string) => {
            baseState.lastFilterQuery = query;
        },
        executeDomAction: () => {},
        handleClarificationResponse: async () => {},
        addProgress: () => {},
        addToast: () => 'toast-id',
        endBusy: () => {},
        updatePlannerPlanState: (state) => {
            baseState.plannerSession.planState = state;
            baseState.plannerPendingSteps = state?.nextSteps ?? [];
        },
        plannerSession: { planState: null, observations: [] },
        plannerPendingSteps: [],
        setPlannerPendingSteps: steps => {
            baseState.plannerPendingSteps = steps;
        },
        completePlannerPendingStep: () => {
            baseState.plannerPendingSteps = baseState.plannerPendingSteps.slice(1);
        },
        annotateAgentActionTrace: () => {},
        lastFilterQuery: null,
        pendingClarifications: [],
        activeClarificationId: null,
        agentAwaitingUserInput: false,
        agentAwaitingPromptId: null,
        ...overrides,
    };

    const set = (updater: any) => {
        if (typeof updater === 'function') {
            const partial = updater(baseState);
            if (partial && typeof partial === 'object') {
                Object.assign(baseState, partial);
            }
        } else if (updater && typeof updater === 'object') {
            Object.assign(baseState, updater);
        }
    };

    const runtime: any = {
        set,
        get: () => baseState,
        deps: {
            registerClarification: (clarification: any) => {
                const clarificationId = `clar-${baseState.pendingClarifications.length + 1}`;
                const record: ClarificationRequest = {
                    ...clarification,
                    id: clarificationId,
                    status: 'pending',
                    createdAt: new Date().toISOString(),
                    contextType: clarification.contextType ?? 'plan',
                };
                baseState.pendingClarifications = [...baseState.pendingClarifications, record];
                baseState.activeClarificationId = clarificationId;
                return record;
            },
            updateClarificationStatus: () => {},
            getRunSignal: () => undefined,
            runPlanWithChatLifecycle: async () => [],
        },
        runId: 'run-test',
        userMessage: options?.userMessage ?? 'hello world',
        memorySnapshot: [],
        memoryTagAttached: false,
        policy: {
            allowLooseSteps: options?.policy?.allowLooseSteps ?? false,
        },
    };

    return { runtime, state: baseState };
};

const createTraceRecorder = () => {
    const entries: Array<{ status: string; details?: string; telemetry?: Record<string, any> }> = [];
    const markTrace = (status: string, details?: string, telemetry?: Record<string, any>) => {
        entries.push({ status, details, telemetry });
    };
    return { entries, markTrace };
};

const run = async (name: string, fn: () => Promise<void>) => {
    try {
        await fn();
        console.log(`✅ ${name}`);
    } catch (error) {
        console.error(`❌ ${name}`);
        throw error;
    }
};

await run('blocks actions without reason content', async () => {
    const { runtime } = createRuntime();
    const { entries, markTrace } = createTraceRecorder();
    const action = withEnvelope({ responseType: 'text_response', reason: undefined });

    const result = await runActionThroughRegistry(action, runtime, 0, markTrace);
    assert.strictEqual(result.type, 'continue');
    const failure = entries.find(entry => entry.status === 'failed');
    assert.ok(failure);
    assert.strictEqual(failure?.telemetry?.errorCode, ACTION_ERROR_CODES.REASON_MISSING);
});

await run('text_response without payload emits error telemetry', async () => {
    const { runtime } = createRuntime();
    const { entries, markTrace } = createTraceRecorder();
    const action = withEnvelope({ responseType: 'text_response', reason: 'Respond politely' });

    await runActionThroughRegistry(action, runtime, 0, markTrace);
    const failure = entries.find(entry => entry.status === 'failed');
    assert.strictEqual(failure?.telemetry?.errorCode, ACTION_ERROR_CODES.MISSING_TEXT);
});

await run('await_user without explicit options requests retry', async () => {
    const { runtime } = createRuntime();
    const { entries, markTrace } = createTraceRecorder();
    const action = withEnvelope({
        responseType: 'await_user',
        reason: 'Need the user to select a metric',
        text: 'Which metric should I rank?',
    });

    const result = await runActionThroughRegistry(action, runtime, 0, markTrace);
    assert.strictEqual(result.type, 'retry');
    const failure = entries.find(entry => entry.status === 'failed');
    assert.strictEqual(failure?.telemetry?.errorCode, ACTION_ERROR_CODES.VALIDATION_FAILED);
});

await run('await_user with numbered options halts planner and flags awaiting user', async () => {
    const { runtime, state } = createRuntime();
    const { markTrace } = createTraceRecorder();
    const action = withEnvelope({
        responseType: 'await_user',
        reason: 'Need clarification on metric',
        text: '请选择分析指标：\n1) 按金额\n2) 按订单数',
        meta: { awaitUser: true },
    });

    const result = await runActionThroughRegistry(action, runtime, 0, markTrace);
    assert.strictEqual(result.type, 'halt');
    assert.strictEqual(state.agentAwaitingUserInput, true);
    assert.strictEqual(state.agentAwaitingPromptId !== null, true);
});

await run('plan_creation without dataset reports missing payload', async () => {
    const { runtime } = createRuntime();
    const { entries, markTrace } = createTraceRecorder();
    const action = withEnvelope({
        responseType: 'plan_creation',
        reason: 'Need a chart',
        stepId: TEST_STEP_ID,
        plan: {
            chartType: 'bar',
            title: 'Sales',
            description: 'desc',
        },
    });

    await runActionThroughRegistry(action, runtime, 0, markTrace);
    const failure = entries.find(entry => entry.status === 'failed');
    assert.strictEqual(failure?.telemetry?.errorCode, ACTION_ERROR_CODES.MISSING_PLAN_PAYLOAD);
});

await run('plan_creation requests metric column clarification when missing valueColumn', async () => {
    const { runtime, state } = createRuntime({
        csvData: {
            fileName: 'test.csv',
            data: [
                { Region: 'APAC', Revenue: 120 },
                { Region: 'EMEA', Revenue: 95 },
            ],
        },
        columnProfiles: [
            { name: 'Region', type: 'categorical' },
            { name: 'Revenue', type: 'numerical' },
        ],
    });
    const { entries, markTrace } = createTraceRecorder();
    const action = withEnvelope({
        responseType: 'plan_creation',
        reason: 'Need average revenue',
        plan: {
            chartType: 'bar',
            title: 'Avg revenue by region',
            description: 'desc',
            aggregation: 'avg',
            groupByColumn: 'Region',
        },
    });

    const result = await runActionThroughRegistry(action, runtime, 0, markTrace);
    assert.strictEqual(result.type, 'halt');
    assert.strictEqual(result.observation?.status, 'pending');
    assert.strictEqual(state.pendingClarifications.length, 1);
    assert.strictEqual(state.pendingClarifications[0]?.targetProperty, 'valueColumn');
    assert.strictEqual(state.agentAwaitingUserInput, true);
    const successTrace = entries.find(entry => entry.status === 'succeeded');
    assert.ok(successTrace);
});

await run('dom_action without payload is rejected', async () => {
    const { runtime } = createRuntime();
    const { entries, markTrace } = createTraceRecorder();
    const action = withEnvelope({ responseType: 'dom_action', reason: 'Need to tweak card' });

    await runActionThroughRegistry(action, runtime, 0, markTrace);
    const failure = entries.find(entry => entry.status === 'failed');
    assert.strictEqual(failure?.telemetry?.errorCode, ACTION_ERROR_CODES.DOM_PAYLOAD_MISSING);
});

await run('removeCard dom_action invokes executor when payload valid', async () => {
    let removed = false;
    const { runtime } = createRuntime({
        executeDomAction: (domAction: any) => {
            if (domAction.toolName === 'removeCard' && domAction.args?.cardId === 'card-123') {
                removed = true;
            }
        },
        analysisCards: [
            { id: 'card-123', plan: { title: 'Total Amount by Payee Name' } },
        ],
    });
    const { markTrace } = createTraceRecorder();
    const action = withEnvelope({
        responseType: 'dom_action',
        reason: 'Clean up card',
        domAction: { toolName: 'removeCard', args: { cardId: 'card-123' } },
    });

    const result = await runActionThroughRegistry(action, runtime, 0, markTrace);
    assert.strictEqual(result.type, 'continue');
    assert.ok(removed, 'removeCard should call executeDomAction with cardId');
});

await run('removeCard dom_action auto-resolves cardId from title', async () => {
    let resolvedCardId: string | null = null;
    const { runtime } = createRuntime({
        executeDomAction: (domAction: any) => {
            if (domAction.toolName === 'removeCard') {
                resolvedCardId = domAction.args?.cardId ?? null;
            }
        },
        analysisCards: [
            { id: 'card-auto', plan: { title: 'Total Amount by Payee Name' } },
        ],
    });
    const { entries, markTrace } = createTraceRecorder();
    const action = withEnvelope({
        responseType: 'dom_action',
        reason: 'Clean up card by title',
        domAction: { toolName: 'removeCard', args: { cardTitle: 'Total Amount by Payee Name' } },
    });

    const result = await runActionThroughRegistry(action, runtime, 0, markTrace);
    assert.strictEqual(result.type, 'continue');
    assert.strictEqual(resolvedCardId, 'card-auto');
});

await run('execute_js_code without dataset produces dataset error', async () => {
    const { runtime } = createRuntime();
    const { entries, markTrace } = createTraceRecorder();
    const action = withEnvelope({
        responseType: 'execute_js_code',
        reason: 'Need transform',
        code: { explanation: 'noop', jsFunctionBody: 'return data;' },
    });

    await runActionThroughRegistry(action, runtime, 1, markTrace);
    const failure = entries.find(entry => entry.status === 'failed');
    assert.strictEqual(failure?.telemetry?.errorCode, ACTION_ERROR_CODES.DATASET_UNAVAILABLE);
});

await run('execute_js_code no-op triggers retry with transform error', async () => {
    const { runtime } = createRuntime({
        csvData: {
            fileName: 'test.csv',
            data: [
                { Metric: 'Revenue', Value: 120 },
                { Metric: 'Cost', Value: 45 },
            ],
        },
        columnAliasMap: {},
    });
    const { entries, markTrace } = createTraceRecorder();
    const action = withEnvelope({
        responseType: 'execute_js_code',
        reason: 'Attempt transform with no change',
        code: {
            explanation: 'Return the dataset as-is (should be rejected)',
            jsFunctionBody: 'return data;',
        },
    });

    const result = await runActionThroughRegistry(action, runtime, 1, markTrace);
    assert.strictEqual(result.type, 'retry');
    assert.strictEqual(result.observation?.errorCode, ACTION_ERROR_CODES.TRANSFORM_FAILED);
    const failure = entries.find(entry => entry.status === 'failed');
    assert.strictEqual(failure?.telemetry?.errorCode, ACTION_ERROR_CODES.TRANSFORM_FAILED);
});

await run('filter_spreadsheet without query reuses meaningful user message', async () => {
    const { runtime, state } = createRuntime({}, { userMessage: 'focus on general ledger invoices' });
    const { entries, markTrace } = createTraceRecorder();
    const action = withEnvelope({
        responseType: 'filter_spreadsheet',
        reason: 'Need focus',
        args: { query: '' },
    });

    const result = await runActionThroughRegistry(action, runtime, 0, markTrace);
    assert.strictEqual(result.type, 'continue');
    const success = entries.find(entry => entry.status === 'succeeded');
    assert.ok(success, 'filter action should succeed with fallback');
    assert.strictEqual(state.lastFilterQuery, runtime.userMessage);
});

await run('filter_spreadsheet without query and blank message shows full table', async () => {
    const { runtime, state } = createRuntime({}, { userMessage: '' });
    const { entries, markTrace } = createTraceRecorder();
    const action = withEnvelope({
        responseType: 'filter_spreadsheet',
        reason: 'Need focus',
        args: {},
    });

    const result = await runActionThroughRegistry(action, runtime, 0, markTrace);
    assert.strictEqual(result.type, 'continue');
    const success = entries.find(entry => entry.status === 'succeeded');
    assert.ok(success, 'filter fallback should still succeed');
    assert.strictEqual(state.lastFilterQuery, 'show entire table');
});

await run('filter_spreadsheet ignores greeting fallback', async () => {
    const { runtime, state } = createRuntime({}, { userMessage: 'hi there' });
    const { entries, markTrace } = createTraceRecorder();
    const action = withEnvelope({
        responseType: 'filter_spreadsheet',
        reason: 'Need focus',
        args: {},
    });

    const result = await runActionThroughRegistry(action, runtime, 0, markTrace);
    assert.strictEqual(result.type, 'continue');
    const success = entries.find(entry => entry.status === 'succeeded');
    assert.ok(success, 'filter fallback should succeed');
    assert.strictEqual(state.lastFilterQuery, 'show entire table');
});

await run('clarification_request without payload is rejected', async () => {
    const { runtime } = createRuntime();
    const { entries, markTrace } = createTraceRecorder();
    const action = withEnvelope({ responseType: 'clarification_request', reason: 'Need more info' });

    await runActionThroughRegistry(action, runtime, 0, markTrace);
    const failure = entries.find(entry => entry.status === 'failed');
    assert.strictEqual(failure?.telemetry?.errorCode, ACTION_ERROR_CODES.CLARIFICATION_PAYLOAD_MISSING);
});

await run('proceed_to_analysis succeeds and records duration', async () => {
    const { runtime } = createRuntime();
    const { entries, markTrace } = createTraceRecorder();
    const action = withEnvelope({
        responseType: 'proceed_to_analysis',
        reason: 'Continue',
        stateTag: 'analysis_shared',
    });

    await runActionThroughRegistry(action, runtime, 0, markTrace);
    const success = entries.find(entry => entry.status === 'succeeded');
    assert.ok(success);
    assert.ok(typeof success?.telemetry?.durationMs === 'number');
    assert.ok(success.telemetry!.durationMs! >= 0);
});

await run('plan_state_update without payload is rejected', async () => {
    const { runtime } = createRuntime();
    const { entries, markTrace } = createTraceRecorder();
    const action = withEnvelope({ responseType: 'plan_state_update', reason: 'Need to log goal' });

    await runActionThroughRegistry(action, runtime, 0, markTrace);
    const failure = entries.find(entry => entry.status === 'failed');
    assert.strictEqual(failure?.telemetry?.errorCode, ACTION_ERROR_CODES.PLAN_STATE_PAYLOAD_MISSING);
});

await run('plan_state_update normalizes payload and stores plan state', async () => {
    const addProgressCalls: string[] = [];
    const { runtime, state } = createRuntime({
        addProgress: (msg: string) => addProgressCalls.push(msg),
    });
    const { entries, markTrace } = createTraceRecorder();
    const action = withEnvelope({
        responseType: 'plan_state_update',
        reason: 'Clarify mission',
        stepId: 'collect-metrics',
        planState: buildPlanStatePayload({
            goal: '  Increase revenue insights  ',
            progress: ' outlined targets ',
            blockedBy: '',
            observationIds: ['obs-1'],
            nextSteps: buildSteps(' collect metrics ', 'build chart'),
            steps: buildSteps(' collect metrics ', 'build chart'),
        }),
    });

    await runActionThroughRegistry(action, runtime, 0, markTrace);
    const success = entries.find(entry => entry.status === 'succeeded');
    assert.ok(success);
    assert.deepStrictEqual(state.plannerSession.planState?.goal, 'Increase revenue insights');
    const storedSteps = (state.plannerSession.planState?.nextSteps ?? []).map(step => ({
        id: step.id,
        label: step.label,
    }));
    assert.deepStrictEqual(storedSteps, buildSteps('collect metrics', 'build chart'));
    assert.strictEqual(state.plannerSession.planState?.blockedBy, null);
    assert.strictEqual(state.plannerSession.planState?.contextSummary, null);
    assert.strictEqual(state.plannerSession.planState?.confidence, 0.42);
    assert.ok(addProgressCalls.some(message => message.includes('Plan goal updated')));
});

await run('plan_state_update leaves steps untouched when user just greeted', async () => {
    const { runtime, state } = createRuntime(
        {
            addProgress: () => {},
        },
        { userMessage: 'hi' },
    );
    const { entries, markTrace } = createTraceRecorder();
    const greetingSteps = buildSteps('acknowledge user greeting');
    const action = withEnvelope({
        responseType: 'plan_state_update',
        reason: 'Set baseline plan',
        stepId: greetingSteps[0].id,
        planState: buildPlanStatePayload({
            goal: ' Analyze data ',
            progress: ' waiting ',
            nextSteps: greetingSteps,
            steps: greetingSteps,
            observationIds: [],
            confidence: 0.5,
        }),
    });

    await runActionThroughRegistry(action, runtime, 0, markTrace);
    const success = entries.find(entry => entry.status === 'succeeded');
    assert.ok(success);
    assert.strictEqual(state.plannerPendingSteps.length, 1);
    assert.strictEqual(state.plannerPendingSteps[0]?.id, greetingSteps[0].id);
});

await run('plan_creation enforces pending step when policy is strict', async () => {
    const pendingSteps = buildSteps('Build chart');
    const dataset = { fileName: 'test.csv', data: [{ vendor: 'A', amount: 100 }] };
    const { runtime } = createRuntime({
        csvData: dataset,
        plannerPendingSteps: pendingSteps,
        plannerSession: { planState: { nextSteps: pendingSteps }, observations: [] },
    });
    const { entries, markTrace } = createTraceRecorder();
    const action = withEnvelope({
        responseType: 'plan_creation',
        reason: 'Need chart',
        plan: {
            chartType: 'bar',
            title: 'Spend by Vendor',
            description: 'desc',
        },
    });

    await runActionThroughRegistry(action, runtime, 0, markTrace);
    const failure = entries.find(entry => entry.status === 'failed');
    assert.strictEqual(failure?.telemetry?.errorCode, ACTION_ERROR_CODES.PLAN_STEP_OUT_OF_ORDER);
});

await run('plan_creation allows loose steps when policy permits', async () => {
    const pendingSteps = buildSteps('Build chart');
    const dataset = { fileName: 'test.csv', data: [{ vendor: 'A', amount: 100 }] };
    const { runtime } = createRuntime(
        {
            csvData: dataset,
            plannerPendingSteps: pendingSteps,
            plannerSession: { planState: { nextSteps: pendingSteps }, observations: [] },
        },
        { policy: { allowLooseSteps: true } },
    );
    const { entries, markTrace } = createTraceRecorder();
    const action = withEnvelope({
        responseType: 'plan_creation',
        reason: 'Need chart',
        plan: {
            chartType: 'bar',
            title: 'Spend by Vendor',
            description: 'desc',
        },
    });

    await runActionThroughRegistry(action, runtime, 0, markTrace);
    const success = entries.find(entry => entry.status === 'succeeded');
    assert.ok(success, 'plan_creation should succeed when loose steps are allowed');
});

console.log('🎉 chatActionExecutors tests completed successfully.');
