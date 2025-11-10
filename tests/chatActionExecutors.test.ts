import assert from 'node:assert/strict';
import type { AiAction, AgentPlanStep } from '../types';
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

type RuntimeState = {
    chatHistory: any[];
    isSpreadsheetVisible: boolean;
    columnAliasMap: Record<string, string>;
    columnProfiles: { name: string }[];
    csvData: any;
    pendingDataTransform: any;
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
};

const createRuntime = (overrides: Partial<RuntimeState> = {}, options?: { userMessage?: string }) => {
    const baseState: RuntimeState = {
        chatHistory: [],
        isSpreadsheetVisible: false,
        columnAliasMap: {},
        columnProfiles: [],
        csvData: null,
        pendingDataTransform: null,
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
            registerClarification: (clarification: any) => ({
                ...clarification,
                id: 'clar-1',
                status: 'pending',
                createdAt: new Date().toISOString(),
            }),
            updateClarificationStatus: () => {},
            getRunSignal: () => undefined,
            runPlanWithChatLifecycle: async () => [],
        },
        runId: 'run-test',
        userMessage: options?.userMessage ?? 'hello world',
        memorySnapshot: [],
        memoryTagAttached: false,
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

await run('blocks actions without thought content', async () => {
    const { runtime } = createRuntime();
    const { entries, markTrace } = createTraceRecorder();
    const action: AiAction = { responseType: 'text_response', stepId: TEST_STEP_ID };

    const result = await runActionThroughRegistry(action, runtime, 0, markTrace);
    assert.strictEqual(result.type, 'continue');
    const failure = entries.find(entry => entry.status === 'failed');
    assert.ok(failure);
    assert.strictEqual(failure?.telemetry?.errorCode, ACTION_ERROR_CODES.THOUGHT_MISSING);
});

await run('text_response without payload emits error telemetry', async () => {
    const { runtime } = createRuntime();
    const { entries, markTrace } = createTraceRecorder();
    const action: AiAction = { responseType: 'text_response', thought: 'Respond politely', stepId: TEST_STEP_ID };

    await runActionThroughRegistry(action, runtime, 0, markTrace);
    const failure = entries.find(entry => entry.status === 'failed');
    assert.strictEqual(failure?.telemetry?.errorCode, ACTION_ERROR_CODES.MISSING_TEXT);
});

await run('plan_creation without dataset reports missing payload', async () => {
    const { runtime } = createRuntime();
    const { entries, markTrace } = createTraceRecorder();
    const action: AiAction = {
        responseType: 'plan_creation',
        thought: 'Need a chart',
        stepId: TEST_STEP_ID,
        plan: {
            chartType: 'bar',
            title: 'Sales',
            description: 'desc',
        },
    };

    await runActionThroughRegistry(action, runtime, 0, markTrace);
    const failure = entries.find(entry => entry.status === 'failed');
    assert.strictEqual(failure?.telemetry?.errorCode, ACTION_ERROR_CODES.MISSING_PLAN_PAYLOAD);
});

await run('dom_action without payload is rejected', async () => {
    const { runtime } = createRuntime();
    const { entries, markTrace } = createTraceRecorder();
    const action: AiAction = { responseType: 'dom_action', thought: 'Need to tweak card', stepId: TEST_STEP_ID };

    await runActionThroughRegistry(action, runtime, 0, markTrace);
    const failure = entries.find(entry => entry.status === 'failed');
    assert.strictEqual(failure?.telemetry?.errorCode, ACTION_ERROR_CODES.DOM_PAYLOAD_MISSING);
});

await run('execute_js_code without dataset produces dataset error', async () => {
    const { runtime } = createRuntime();
    const { entries, markTrace } = createTraceRecorder();
    const action: AiAction = {
        responseType: 'execute_js_code',
        thought: 'Need transform',
        stepId: TEST_STEP_ID,
        code: { explanation: 'noop', jsFunctionBody: 'return data;' },
    };

    await runActionThroughRegistry(action, runtime, 1, markTrace);
    const failure = entries.find(entry => entry.status === 'failed');
    assert.strictEqual(failure?.telemetry?.errorCode, ACTION_ERROR_CODES.DATASET_UNAVAILABLE);
});

await run('filter_spreadsheet without query defaults to show-all', async () => {
    const { runtime, state } = createRuntime();
    const { entries, markTrace } = createTraceRecorder();
    const action: AiAction = {
        responseType: 'filter_spreadsheet',
        thought: 'Need focus',
        stepId: TEST_STEP_ID,
        args: { query: '' },
    };

    const result = await runActionThroughRegistry(action, runtime, 0, markTrace);
    assert.strictEqual(result.type, 'continue');
    const success = entries.find(entry => entry.status === 'succeeded');
    assert.ok(success, 'filter action should succeed with fallback');
    assert.strictEqual(state.lastFilterQuery, 'show entire table');
});

await run('clarification_request without payload is rejected', async () => {
    const { runtime } = createRuntime();
    const { entries, markTrace } = createTraceRecorder();
    const action: AiAction = { responseType: 'clarification_request', thought: 'Need more info', stepId: TEST_STEP_ID };

    await runActionThroughRegistry(action, runtime, 0, markTrace);
    const failure = entries.find(entry => entry.status === 'failed');
    assert.strictEqual(failure?.telemetry?.errorCode, ACTION_ERROR_CODES.CLARIFICATION_PAYLOAD_MISSING);
});

await run('proceed_to_analysis succeeds and records duration', async () => {
    const { runtime } = createRuntime();
    const { entries, markTrace } = createTraceRecorder();
    const action: AiAction = {
        responseType: 'proceed_to_analysis',
        thought: 'Continue',
        stateTag: 'analysis_shared',
        stepId: TEST_STEP_ID,
    };

    await runActionThroughRegistry(action, runtime, 0, markTrace);
    const success = entries.find(entry => entry.status === 'succeeded');
    assert.ok(success);
    assert.ok(typeof success?.telemetry?.durationMs === 'number');
    assert.ok(success.telemetry!.durationMs! >= 0);
});

await run('plan_state_update without payload is rejected', async () => {
    const { runtime } = createRuntime();
    const { entries, markTrace } = createTraceRecorder();
    const action: AiAction = { responseType: 'plan_state_update', thought: 'Need to log goal' };

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
    const action: AiAction = {
        responseType: 'plan_state_update',
        thought: 'Clarify mission',
        planState: {
            goal: '  Increase revenue insights  ',
            contextSummary: null,
            progress: ' outlined targets ',
            nextSteps: buildSteps(' collect metrics ', 'build chart'),
            blockedBy: '',
            observationIds: ['obs-1'],
            confidence: 0.42,
            updatedAt: '2024-01-01T00:00:00.000Z',
        },
    };

    await runActionThroughRegistry(action, runtime, 0, markTrace);
    const success = entries.find(entry => entry.status === 'succeeded');
    assert.ok(success);
    assert.deepStrictEqual(state.plannerSession.planState?.goal, 'Increase revenue insights');
    assert.deepStrictEqual(
        state.plannerSession.planState?.nextSteps,
        buildSteps('collect metrics', 'build chart'),
    );
    assert.strictEqual(state.plannerSession.planState?.blockedBy, null);
    assert.strictEqual(state.plannerSession.planState?.contextSummary, null);
    assert.strictEqual(state.plannerSession.planState?.confidence, 0.42);
    assert.ok(addProgressCalls.some(message => message.includes('Plan goal updated')));
});

await run('plan_state_update seeds acknowledge step when user just greeted', async () => {
    const { runtime, state } = createRuntime(
        {
            addProgress: () => {},
        },
        { userMessage: 'hi' },
    );
    const { entries, markTrace } = createTraceRecorder();
    const action: AiAction = {
        responseType: 'plan_state_update',
        thought: 'Set baseline plan',
        planState: {
            goal: ' Analyze data ',
            contextSummary: null,
            progress: ' waiting ',
            nextSteps: [],
            blockedBy: '',
            observationIds: [],
            confidence: 0.5,
            updatedAt: '2024-01-01T00:00:00.000Z',
        },
    };

    await runActionThroughRegistry(action, runtime, 0, markTrace);
    const success = entries.find(entry => entry.status === 'succeeded');
    assert.ok(success);
    assert.strictEqual(state.plannerPendingSteps.length, 1);
    assert.strictEqual(state.plannerPendingSteps[0].id, 'acknowledge_user');
});

console.log('🎉 chatActionExecutors tests completed successfully.');
