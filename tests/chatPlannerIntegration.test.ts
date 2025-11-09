import assert from 'node:assert/strict';
import { runPlannerWorkflow } from '../store/slices/chatSlice';
import type { AiChatResponse, ChatMessage, ColumnProfile, CsvData } from '../types';

type PlannerTrace = { id: string; actionType: string; status: string };

type PlannerStore = {
    chatHistory: ChatMessage[];
    agentActionTraces: PlannerTrace[];
    plannerSession: { planState: any; observations: any[] };
    progressLog: string[];
    pendingClarifications: any[];
    activeClarificationId: string | null;
    csvData: CsvData | null;
    columnProfiles: ColumnProfile[];
    executedPlans: string[];
    columnAliasMap: Record<string, string>;
    pendingDataTransform: any;
};

const defaultStore = (): PlannerStore => ({
    chatHistory: [],
    agentActionTraces: [],
    plannerSession: { planState: null, observations: [] },
    progressLog: [],
    pendingClarifications: [],
    activeClarificationId: null,
    csvData: {
        fileName: 'test.csv',
        data: [
            { Month: 'Jan', Revenue_total: 100, Revenue_net: 90 },
            { Month: 'Feb', Revenue_total: 120, Revenue_net: 95 },
        ],
    },
    columnProfiles: [
        { name: 'Month', type: 'categorical' },
        { name: 'Revenue_total', type: 'numerical' },
        { name: 'Revenue_net', type: 'numerical' },
    ],
    executedPlans: [],
    columnAliasMap: {},
    pendingDataTransform: null,
});

const createPlannerHarness = (overrides: Partial<PlannerStore> = {}) => {
    const store: PlannerStore = { ...defaultStore(), ...overrides };

    const applyUpdate = (partial: any) => {
        if (partial && typeof partial === 'object') {
            Object.assign(store as any, partial);
        }
    };

    const set = (updater: any) => {
        if (typeof updater === 'function') {
            applyUpdate(updater(store as any));
        } else {
            applyUpdate(updater);
        }
    };

    const beginTrace = (actionType: string) => {
        const id = `trace-${store.agentActionTraces.length + 1}`;
        store.agentActionTraces.push({ id, actionType, status: 'observing' });
        return id;
    };

    const updateTrace = (traceId: string, status: string) => {
        const trace = store.agentActionTraces.find(t => t.id === traceId);
        if (trace) trace.status = status;
    };

    const handleClarificationResponse = async (clarificationId: string, choice: { label: string; value: string }) => {
        store.pendingClarifications = store.pendingClarifications.filter(c => c.id !== clarificationId);
        store.activeClarificationId = null;
        store.chatHistory.push({
            sender: 'user',
            text: `Selected: ${choice.label}`,
            timestamp: new Date(),
            type: 'user_message',
        } as ChatMessage);
    };

    const queuePendingDataTransform = (preview: any) => {
        store.pendingDataTransform = preview;
    };

    const snapshot = () => ({
        updateBusyStatus: (msg: string) => store.progressLog.push(`busy:${msg}`),
        isRunCancellationRequested: () => false,
        addProgress: (msg: string) => store.progressLog.push(msg),
        beginAgentActionTrace: beginTrace,
        updateAgentActionTrace: updateTrace,
        appendPlannerObservation: (obs: any) => store.plannerSession.observations.push(obs),
        plannerSession: store.plannerSession,
        updatePlannerPlanState: (state: any) => {
            store.plannerSession.planState = state;
        },
        chatHistory: store.chatHistory,
        pendingClarifications: store.pendingClarifications,
        activeClarificationId: store.activeClarificationId,
        csvData: store.csvData,
        columnProfiles: store.columnProfiles,
        columnAliasMap: store.columnAliasMap,
        queuePendingDataTransform,
        pendingDataTransform: store.pendingDataTransform,
        handleClarificationResponse,
        endBusy: () => store.progressLog.push('busy:end'),
    });

    const runtime = {
        set,
        get: snapshot,
        deps: {
            registerClarification: (clar: any) => {
                const enriched = {
                    ...clar,
                    id: `clar-${store.pendingClarifications.length + 1}`,
                    status: 'pending',
                };
                store.pendingClarifications.push(enriched);
                store.activeClarificationId = enriched.id;
                return enriched;
            },
            updateClarificationStatus: (id: string, status: string) => {
                const target = store.pendingClarifications.find(c => c.id === id);
                if (target) target.status = status;
            },
            getRunSignal: () => undefined,
            runPlanWithChatLifecycle: async (plan: any) => {
                store.executedPlans.push(plan.title ?? 'plan');
                return [];
            },
        },
        runId: 'run-test',
        userMessage: 'Need summary',
        memorySnapshot: [],
        memoryTagAttached: false,
    } as const;

    return { runtime, store };
};

const buildPlannerContext = (response: AiChatResponse) => ({
    memorySnapshot: [],
    requestAiResponse: async () => response,
});

const buildMultiResponseContext = (responses: AiChatResponse[]) => {
    const queue = [...responses];
    return {
        memorySnapshot: [],
        requestAiResponse: async () => {
            const next = queue.shift();
            if (!next) {
                throw new Error('No stubbed response remaining');
            }
            return next;
        },
    };
};

const test = async (name: string, fn: () => Promise<void>) => {
    try {
        await fn();
        console.log(`✅ ${name}`);
    } catch (error) {
        console.error(`❌ ${name}`);
        throw error;
    }
};

const planStateAction = {
    responseType: 'plan_state_update' as const,
    thought: 'Clarify mission',
    planState: {
        goal: 'Increase ARR by 10%',
        contextSummary: 'Focus on enterprise deals',
        progress: 'Outlined metrics',
        nextSteps: ['Draft cohort analysis', 'Run pipeline forecast'],
        blockedBy: null,
        observationIds: ['obs-1'],
        confidence: 0.66,
        updatedAt: '2024-01-02T00:00:00.000Z',
    },
};

await test('runPlannerWorkflow executes plan_state then reply', async () => {
    const textResponseAction = {
        responseType: 'text_response' as const,
        thought: 'Acknowledge plan',
        text: 'Plan noted. Starting with cohort analysis.',
    };
    const fakeResponse: AiChatResponse = {
        actions: [planStateAction, textResponseAction],
    };

    const { runtime, store } = createPlannerHarness();
    await runPlannerWorkflow(
        'How can we grow ARR?',
        buildPlannerContext(fakeResponse),
        runtime as any,
    );

    assert.strictEqual(store.plannerSession.planState?.goal, 'Increase ARR by 10%');
    assert.deepStrictEqual(
        store.agentActionTraces.map(t => t.actionType),
        ['plan_state_update', 'text_response'],
    );
    const lastMessage = store.chatHistory.at(-1);
    assert.strictEqual(lastMessage?.text, 'Plan noted. Starting with cohort analysis.');
    assert.ok(store.progressLog.some(msg => msg.includes('busy:Thinking through your question...')));
});

await test('runPlannerWorkflow halts when clarification is required', async () => {
    const clarificationAction = {
        responseType: 'clarification_request' as const,
        thought: 'Need target metric',
        clarification: {
            question: 'Which revenue metric should I use?',
            options: [
                { label: 'Total Revenue', value: 'Revenue_total' },
                { label: 'Net Revenue', value: 'Revenue_net' },
            ],
            pendingPlan: {
                chartType: 'bar',
                title: 'Revenue by Month',
                description: 'Compare revenue across months',
                aggregation: 'sum',
                groupByColumn: 'Month',
            },
            targetProperty: 'valueColumn',
        },
    };
    const clarResponse: AiChatResponse = {
        actions: [planStateAction, clarificationAction],
    };

    const { runtime, store } = createPlannerHarness();
    await runPlannerWorkflow(
        'Which metric should we use?',
        buildPlannerContext(clarResponse),
        runtime as any,
    );

    assert.strictEqual(store.pendingClarifications.length, 1);
    assert.ok(store.activeClarificationId, 'active clarification should be set');
    const clarMessage = store.chatHistory.at(-1);
    assert.strictEqual(clarMessage?.type, 'ai_clarification');
    assert.deepStrictEqual(
        store.agentActionTraces.map(t => t.actionType),
        ['plan_state_update', 'clarification_request'],
    );
    assert.ok(store.progressLog.includes('busy:end'), 'busy state should end after clarification');
});

await test('clarification resolution allows planner to continue with plan execution', async () => {
    const { runtime, store } = createPlannerHarness();
    const clarificationId = 'clar-manual';
    store.pendingClarifications = [
        {
            id: clarificationId,
            question: 'Which revenue metric should I use?',
            options: [
                { label: 'Total Revenue', value: 'Revenue_total' },
                { label: 'Net Revenue', value: 'Revenue_net' },
            ],
            pendingPlan: {
                chartType: 'bar',
                title: 'Revenue trend',
                description: 'desc',
                aggregation: 'sum',
                groupByColumn: 'Month',
            },
            targetProperty: 'valueColumn',
            status: 'pending',
        },
    ];
    store.activeClarificationId = clarificationId;

    await runtime.get().handleClarificationResponse(clarificationId, { label: 'Total Revenue', value: 'Revenue_total' });

    const planCreationAction = {
        responseType: 'plan_creation' as const,
        thought: 'Execute requested chart',
        plan: {
            chartType: 'bar',
            title: 'Revenue trend',
            description: 'desc',
            aggregation: 'sum',
            groupByColumn: 'Month',
            valueColumn: 'Revenue_total',
        },
    };
    const textResponseAction = {
        responseType: 'text_response' as const,
        thought: 'Explain result',
        text: 'Created the revenue chart.',
    };

    await runPlannerWorkflow(
        'Proceed with plan',
        buildPlannerContext({ actions: [planStateAction, planCreationAction, textResponseAction] }),
        runtime as any,
    );

    assert.deepStrictEqual(store.executedPlans, ['Revenue trend']);
    const lastMessage = store.chatHistory.at(-1);
    assert.strictEqual(lastMessage?.text, 'Created the revenue chart.');
    assert.deepStrictEqual(
        store.agentActionTraces.map(t => t.actionType),
        ['plan_state_update', 'plan_creation', 'text_response'],
    );
});

await test('single-option clarification auto-resolves and continues immediately', async () => {
    const clarificationAction = {
        responseType: 'clarification_request' as const,
        thought: 'Need metric column',
        clarification: {
            question: 'Confirm revenue metric?',
            options: [
                { label: 'Total Revenue', value: 'Revenue_total' },
            ],
            pendingPlan: {
                chartType: 'bar',
                title: 'Revenue forecast',
                description: 'desc',
                aggregation: 'sum',
                groupByColumn: 'Month',
            },
            targetProperty: 'valueColumn',
        },
    };
    const planCreationAction = {
        responseType: 'plan_creation' as const,
        thought: 'Execute after auto clarification',
        plan: {
            chartType: 'bar',
            title: 'Revenue forecast',
            description: 'desc',
            aggregation: 'sum',
            groupByColumn: 'Month',
            valueColumn: 'Revenue_total',
        },
    };

    const { runtime, store } = createPlannerHarness();
    await runPlannerWorkflow(
        'Auto clarify metric',
        buildPlannerContext({ actions: [planStateAction, clarificationAction, planCreationAction] }),
        runtime as any,
    );

    assert.strictEqual(store.pendingClarifications.length, 0, 'auto clarification should not persist');
    assert.strictEqual(store.activeClarificationId, null);
    assert.deepStrictEqual(store.executedPlans, ['Revenue forecast']);
    assert.deepStrictEqual(
        store.agentActionTraces.map(t => t.actionType),
        ['plan_state_update', 'clarification_request', 'plan_creation'],
    );
});

await test('execute_js_code failure triggers auto-retry flow', async () => {
    const failingTransformAction = {
        responseType: 'execute_js_code' as const,
        thought: 'Transform dataset',
        code: {
            explanation: 'Attempt transform',
            jsFunctionBody: 'throw new Error("Boom");',
        },
    };
    const successTextAction = {
        responseType: 'text_response' as const,
        thought: 'Explain retry result',
        text: 'Transformation failed, so I shared the error details.',
    };

    const responseSequence: AiChatResponse[] = [
        { actions: [planStateAction, failingTransformAction] },
        { actions: [planStateAction, successTextAction] },
    ];

    const { runtime, store } = createPlannerHarness();
    await runPlannerWorkflow(
        'Clean the dataset',
        buildMultiResponseContext(responseSequence),
        runtime as any,
    );

    const errorMessage = store.chatHistory.find(msg => msg.isError)?.text ?? '';
    assert.ok(errorMessage.includes("couldn't apply that data transformation"));
    assert.ok(store.progressLog.some(msg => msg.includes('Auto-retrying data transformation (attempt 2)...')));
    assert.deepStrictEqual(
        store.agentActionTraces.map(t => t.actionType),
        ['plan_state_update', 'execute_js_code', 'plan_state_update', 'text_response'],
    );
});

await test('execute_js_code success queues pending data transform', async () => {
    const transformAction = {
        responseType: 'execute_js_code' as const,
        thought: 'Normalize revenue columns',
        code: {
            explanation: 'Trim whitespace from columns',
            jsFunctionBody: 'return data.map(row => ({ ...row, Revenue_total: Number(row.Revenue_total) * 1.05 }));',
        },
    };
    const textResponseAction = {
        responseType: 'text_response' as const,
        thought: 'Inform user of pending transform',
        text: 'I staged a data cleanup. Please review before applying.',
    };

    const { runtime, store } = createPlannerHarness();
    await runPlannerWorkflow(
        'Clean whitespace',
        buildPlannerContext({ actions: [planStateAction, transformAction, textResponseAction] }),
        runtime as any,
    );

    assert.ok(store.pendingDataTransform, 'pending transform should exist');
    assert.strictEqual(store.pendingDataTransform?.summary?.includes('rows'), true);
    assert.strictEqual(store.pendingDataTransform?.explanation, 'Trim whitespace from columns');
    const lastMessage = store.chatHistory.at(-1);
    assert.strictEqual(lastMessage?.text, 'I staged a data cleanup. Please review before applying.');
});

await test('approving pending transform updates dataset before next plan', async () => {
    const transformAction = {
        responseType: 'execute_js_code' as const,
        thought: 'Scale revenue for inflation',
        code: {
            explanation: 'Increase revenue totals by 5%',
            jsFunctionBody: 'return data.map(row => ({ ...row, Revenue_total: Number(row.Revenue_total) * 1.05 }));',
        },
    };
    const planCreationAction = {
        responseType: 'plan_creation' as const,
        thought: 'Build chart using adjusted revenue',
        plan: {
            chartType: 'bar',
            title: 'Adjusted Revenue Trend',
            description: 'desc',
            aggregation: 'sum',
            groupByColumn: 'Month',
            valueColumn: 'Revenue_total',
        },
    };

    const { runtime, store } = createPlannerHarness();
    await runPlannerWorkflow(
        'Stage inflation adjustment',
        buildPlannerContext({ actions: [planStateAction, transformAction] }),
        runtime as any,
    );

    const pending = store.pendingDataTransform;
    assert.ok(pending, 'pending transform should exist');

    // Simulate user approving the pending transform
    store.csvData = pending.nextData;
    store.columnProfiles = pending.nextColumnProfiles;
    store.columnAliasMap = pending.nextAliasMap;
    store.pendingDataTransform = null;

    await runPlannerWorkflow(
        'Run adjusted chart',
        buildPlannerContext({ actions: [planStateAction, planCreationAction] }),
        runtime as any,
    );

    assert.deepStrictEqual(store.executedPlans, ['Adjusted Revenue Trend']);
    assert.strictEqual(Number(store.csvData?.data[0].Revenue_total).toFixed(2), '105.00');
});

await test('discarding pending transform keeps dataset unchanged and planner continues', async () => {
    const transformAction = {
        responseType: 'execute_js_code' as const,
        thought: 'Attempt risky transform',
        code: {
            explanation: 'Normalize totals',
            jsFunctionBody: 'return data.map(row => ({ ...row, Revenue_total: Number(row.Revenue_total) * 2 }));',
        },
    };
    const planCreationAction = {
        responseType: 'plan_creation' as const,
        thought: 'Proceed without prior transform',
        plan: {
            chartType: 'bar',
            title: 'Original Revenue Trend',
            description: 'desc',
            aggregation: 'sum',
            groupByColumn: 'Month',
            valueColumn: 'Revenue_total',
        },
    };

    const { runtime, store } = createPlannerHarness();
    await runPlannerWorkflow(
        'Propose aggressive transform',
        buildPlannerContext({ actions: [planStateAction, transformAction] }),
        runtime as any,
    );
    assert.ok(store.pendingDataTransform, 'pending transform must exist before discard');

    // Simulate user discarding the pending transform
    store.pendingDataTransform = null;

    await runPlannerWorkflow(
        'Skip transform and chart anyway',
        buildPlannerContext({ actions: [planStateAction, planCreationAction] }),
        runtime as any,
    );

    assert.deepStrictEqual(store.executedPlans, ['Original Revenue Trend']);
    assert.strictEqual(Number(store.csvData?.data[0].Revenue_total), 100);
});

console.log('🎉 chatPlannerIntegration tests completed successfully.');
