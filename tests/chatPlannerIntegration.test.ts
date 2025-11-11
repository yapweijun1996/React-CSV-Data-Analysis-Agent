import assert from 'node:assert/strict';
import { runPlannerWorkflow } from '../store/slices/chatSlice';
import type {
    AiAction,
    AiChatResponse,
    AgentPlanState,
    AgentPlanStep,
    ChatMessage,
    ColumnProfile,
    CsvData,
    DomAction,
    AgentValidationEvent,
} from '../types';

if (typeof globalThis.document === 'undefined') {
    const noop = () => undefined;
    (globalThis as any).document = {
        getElementById: () => ({
            scrollIntoView: noop,
        }),
    };
}

type PlannerTrace = { id: string; actionType: string; status: string };

type PlannerStore = {
    chatHistory: ChatMessage[];
    agentActionTraces: PlannerTrace[];
    plannerSession: { planState: any; observations: any[] };
    plannerPendingSteps: AgentPlanStep[];
    progressLog: string[];
    pendingClarifications: any[];
    activeClarificationId: string | null;
    agentAwaitingUserInput: boolean;
    agentAwaitingPromptId: string | null;
    csvData: CsvData | null;
    columnProfiles: ColumnProfile[];
    executedPlans: string[];
    columnAliasMap: Record<string, string>;
    pendingDataTransform: any;
    domActions: DomAction[];
    lastFilterQuery: string | null;
    validationEvents: AgentValidationEvent[];
    analysisCards: Array<{ id: string; plan: { title: string } }>;
};

const DEFAULT_TEST_TIMEOUT_MS = Number(process.env.PLANNER_TEST_TIMEOUT_MS ?? '20000');

const defaultStore = (): PlannerStore => ({
    chatHistory: [],
    agentActionTraces: [],
    plannerSession: { planState: null, observations: [] },
    plannerPendingSteps: [],
    progressLog: [],
    pendingClarifications: [],
    activeClarificationId: null,
    agentAwaitingUserInput: false,
    agentAwaitingPromptId: null,
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
    domActions: [],
    lastFilterQuery: null,
    validationEvents: [],
    analysisCards: [],
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
        plannerPendingSteps: store.plannerPendingSteps,
        updatePlannerPlanState: (state: any) => {
            store.plannerSession.planState = state;
            store.plannerPendingSteps = state?.nextSteps ?? [];
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
        executeDomAction: (domAction: DomAction) => {
            store.domActions.push(domAction);
        },
        analysisCards: store.analysisCards,
        handleNaturalLanguageQuery: async (query: string) => {
            store.lastFilterQuery = query;
            store.progressLog.push(`filter:${query}`);
        },
        recordAgentValidationEvent: (event: any) => {
            const enriched: AgentValidationEvent = {
                id: `val-${store.validationEvents.length + 1}`,
                timestamp: event.timestamp ?? new Date().toISOString(),
                ...event,
            };
            store.validationEvents.push(enriched);
        },
        dismissAgentValidationEvent: (eventId: string) => {
            store.validationEvents = store.validationEvents.filter(ev => ev.id !== eventId);
        },
        clearAgentValidationEvents: () => {
            store.validationEvents = [];
        },
        annotateAgentActionTrace: (traceId: string, metadata: Record<string, any>) => {
            const trace = store.agentActionTraces.find(t => t.id === traceId);
            if (trace) {
                (trace as any).metadata = { ...(trace as any).metadata, ...metadata };
            }
        },
        setPlannerPendingSteps: (steps: AgentPlanStep[]) => {
            store.plannerPendingSteps = steps;
        },
        completePlannerPendingStep: () => {
            store.plannerPendingSteps = store.plannerPendingSteps.slice(1);
        },
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
        policy: { allowLooseSteps: false },
    } as const;

    return { runtime, store };
};

const buildPlannerContext = (response: AiChatResponse) => ({
    memorySnapshot: [],
    requestAiResponse: async () => wrapResponse(response),
});

const buildRawPlannerContext = (response: AiChatResponse) => ({
    memorySnapshot: [],
    requestAiResponse: async () => response,
});

const buildMultiResponseContext = (responses: AiChatResponse[]) => {
    const queue = [...responses];
    let requestCount = 0;
    let exhausted = false;
    return {
        memorySnapshot: [],
        requestAiResponse: async () => {
            requestCount++;
            if (queue.length === 0) {
                exhausted = true;
                return wrapResponse(responses[responses.length - 1]);
            }
            return wrapResponse(queue.shift()!);
        },
        getRequestCount: () => requestCount,
        wasExhausted: () => exhausted,
    };
};

const test = async (name: string, fn: () => Promise<void>, timeoutMs = DEFAULT_TEST_TIMEOUT_MS) => {
    const startedAt = Date.now();
    console.log(`⏳ ${name}`);
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error(`Test "${name}" timed out after ${timeoutMs}ms. Set PLANNER_TEST_TIMEOUT_MS to override.`));
        }, timeoutMs);
    });
    try {
        await Promise.race([fn(), timeoutPromise]);
        const duration = Date.now() - startedAt;
        console.log(`✅ ${name} (${duration}ms)`);
    } catch (error) {
        const duration = Date.now() - startedAt;
        console.error(`❌ ${name} (${duration}ms)`);
        throw error;
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }
};

const buildSteps = (...labels: string[]): AgentPlanStep[] =>
    labels.map((label, idx) => {
        const normalized = label
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        return {
            id: normalized || `step-${idx + 1}`,
            label,
        };
    });

const primaryPlanSteps = buildSteps('Draft cohort analysis', 'Run pipeline forecast').map((step, index) => ({
    ...step,
    status: index === 0 ? 'in_progress' : 'ready',
}));
const FIRST_STEP_ID = primaryPlanSteps[0].id;
const SECOND_STEP_ID = primaryPlanSteps[1].id;

let plannerStateTagSeq = 1;
const nextPlannerStateTag = () => `200000-${plannerStateTagSeq++}-planner`;

const buildPlanStatePayload = (overrides: Partial<AgentPlanState> = {}): AgentPlanState => {
    const sourceSteps =
        overrides.nextSteps && overrides.nextSteps.length > 0 ? overrides.nextSteps : primaryPlanSteps;
    const normalizedSteps = sourceSteps.map(step => ({
        ...step,
        status: step.status ?? 'ready',
    }));
    const normalizedAllSteps =
        overrides.steps && overrides.steps.length > 0
            ? overrides.steps.map(step => ({
                  ...step,
                  status: step.status ?? 'ready',
              }))
            : normalizedSteps;
    return {
        planId: overrides.planId ?? 'plan-primary',
        goal: overrides.goal ?? 'Increase ARR by 10%',
        contextSummary: overrides.contextSummary ?? null,
        progress: overrides.progress ?? 'Outlined metrics',
        nextSteps: normalizedSteps,
        steps: normalizedAllSteps,
        currentStepId: overrides.currentStepId ?? normalizedSteps[0]?.id ?? FIRST_STEP_ID,
        blockedBy: overrides.blockedBy ?? null,
        observationIds: overrides.observationIds ?? ['obs-1'],
        confidence: overrides.confidence ?? 0.66,
        updatedAt: overrides.updatedAt ?? '2024-01-02T00:00:00.000Z',
        stateTag: overrides.stateTag ?? 'context_ready',
    };
};

const wrapActionEnvelope = (action: AiAction, defaultStepId: string = FIRST_STEP_ID): AiAction => {
    const stepId =
        typeof action.stepId === 'string' && action.stepId.trim().length >= 3 ? action.stepId.trim() : defaultStepId;
    const enriched: AiAction = {
        ...action,
        type: action.type ?? action.responseType,
        stepId,
        stateTag: action.stateTag ?? nextPlannerStateTag(),
    };
    if (enriched.responseType === 'plan_state_update') {
        enriched.planState = buildPlanStatePayload(enriched.planState ?? {});
    }
    return enriched;
};

const wrapResponse = (response: AiChatResponse): AiChatResponse => ({
    actions: response.actions.map(action => wrapActionEnvelope({ ...action })),
});

const planStateAction = {
    responseType: 'plan_state_update' as const,
    reason: 'Clarify mission',
    planState: buildPlanStatePayload(),
};

const buildTextResponseAction = (text: string, reason = 'Acknowledged'): AiAction => ({
    responseType: 'text_response',
    reason,
    text,
    stepId: FIRST_STEP_ID,
});

await test('runPlannerWorkflow executes plan_state then reply', async () => {
    const textResponseAction = {
        responseType: 'text_response' as const,
        reason: 'Acknowledge plan',
        text: 'Plan noted. Starting with cohort analysis.',
        stepId: FIRST_STEP_ID,
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
    // Continuation should trigger because nextSteps remain and no tool action executed.
    assert.deepStrictEqual(
        store.agentActionTraces.map(t => t.actionType),
        ['plan_state_update', 'text_response', 'plan_state_update', 'text_response', 'plan_state_update', 'text_response', 'plan_state_update', 'text_response'],
    );
    const lastMessage = store.chatHistory.at(-1);
    assert.strictEqual(lastMessage?.text, 'Plan noted. Starting with cohort analysis.');
    assert.ok(store.progressLog.some(msg => msg.includes('busy:Thinking through your question...')));
});

await test('missing plan_state_update triggers validation retry', async () => {
    const textResponseAction = {
        responseType: 'text_response' as const,
        reason: 'Jump straight to reply',
        text: 'On it.',
        stepId: FIRST_STEP_ID,
    };
    const correctedResponse: AiChatResponse = {
        actions: [planStateAction, textResponseAction],
    };
    const invalidResponse: AiChatResponse = {
        actions: [textResponseAction],
    };

    const { runtime, store } = createPlannerHarness();
    await runPlannerWorkflow(
        'Outline the plan',
        buildMultiResponseContext([invalidResponse, correctedResponse]),
        runtime as any,
    );

    assert.ok(
        store.progressLog.some(msg => msg.includes('text_response action is invalid')),
        'validation message should be logged when plan_state_update is missing',
    );
    assert.strictEqual(store.validationEvents.length, 1);
    assert.strictEqual(store.validationEvents[0].actionType, 'text_response');
    assert.deepStrictEqual(
        store.agentActionTraces.map(t => t.actionType),
        ['text_response', 'plan_state_update', 'text_response', 'plan_state_update', 'text_response', 'plan_state_update', 'text_response', 'plan_state_update', 'text_response'],
    );
    const lastMessage = store.chatHistory.at(-1);
    assert.strictEqual(lastMessage?.text, 'On it.');
});

await test('greeting auto-fills missing plan_state_update payload', async () => {
    const incompletePlanStateAction = {
        responseType: 'plan_state_update' as const,
        reason: 'Wave back',
    };
    const greetingReply = {
        responseType: 'text_response' as const,
        reason: 'Say hello',
        text: 'Hi there! How can I help today?',
    };

    const { runtime, store } = createPlannerHarness();
    runtime.userMessage = 'hi';
    (runtime as any).detectedIntent = { intent: 'greeting', confidence: 0.95 };
    (runtime as any).intentRequirementSatisfied = true;

    await runPlannerWorkflow(
        'hi',
        buildPlannerContext({ actions: [incompletePlanStateAction, greetingReply] }),
        runtime as any,
    );

    assert.strictEqual(store.validationEvents.length, 1, 'greeting auto-fill should only emit an auto-tag notice');
    assert.strictEqual(store.validationEvents[0].reason, 'auto_step_id_greeting_ack');
    assert.strictEqual(
        store.plannerSession.planState?.goal,
        'Acknowledge the user and gather their request.',
        'greeting plan should be seeded automatically',
    );
    const finalMessage = store.chatHistory.at(-1);
    assert.strictEqual(finalMessage?.text, greetingReply.text);
    assert.ok(
        store.progressLog.some(msg => msg.includes('Relaxed plan tracker requirement for greeting')),
        'should log that the greeting plan payload was auto-filled',
    );
});

await test('auto-heals missing plan_state_update when no plan tracker exists', async () => {
    const planCreationAction: AiAction = {
        responseType: 'plan_creation',
        type: 'plan_creation',
        reason: 'Build auto-heal chart',
        stepId: 'auto-heal-step',
        stateTag: nextPlannerStateTag(),
        plan: {
            chartType: 'bar',
            title: 'Auto-Heal Chart',
            description: 'Auto-healed plan creation',
            aggregation: 'sum',
            groupByColumn: 'Month',
            valueColumn: 'Revenue_total',
        },
    };

    const { runtime, store } = createPlannerHarness();
    await runPlannerWorkflow(
        'Create a revenue chart',
        buildPlannerContext({ actions: [planCreationAction] }),
        runtime as any,
    );

    assert.deepStrictEqual(store.executedPlans, ['Auto-Heal Chart']);
    assert.ok(
        store.agentActionTraces.some(trace => trace.actionType === 'plan_state_update'),
        'plan_state_update should be auto-inserted ahead of the plan_creation action',
    );
    assert.ok(
        store.progressLog.includes('Auto-inserted plan_state_update to bootstrap the planner.'),
        'auto-heal should log bootstrap message',
    );
});

await test('auto-assigns stepId for non-text actions missing it', async () => {
    const primerAction = wrapActionEnvelope({ ...planStateAction });
    const planCreationMissingStep: AiAction = {
        responseType: 'plan_creation',
        type: 'plan_creation',
        reason: 'Build auto-step chart',
        stateTag: nextPlannerStateTag(),
        plan: {
            chartType: 'bar',
            title: 'Auto-Step Chart',
            description: 'Plan creation without explicit stepId',
            aggregation: 'sum',
            groupByColumn: 'Month',
            valueColumn: 'Revenue_total',
        },
    };

    const { runtime, store } = createPlannerHarness();
    await runPlannerWorkflow(
        'Need another chart',
        buildRawPlannerContext({ actions: [primerAction, planCreationMissingStep] }),
        runtime as any,
    );

    assert.deepStrictEqual(store.executedPlans, ['Auto-Step Chart']);
    assert.ok(
        store.validationEvents.some(event => event.reason === 'auto_step_id_assigned'),
        'auto-assignment should record a validation event',
    );
});

await test('text_response without stepId auto-tags when planner steps empty', async () => {
    const { runtime, store } = createPlannerHarness({
        plannerSession: {
            planState: {
                goal: 'Follow up with user',
                contextSummary: null,
                progress: 'Ready for chatter',
                nextSteps: [],
                blockedBy: null,
                observationIds: [],
                confidence: 0.5,
                updatedAt: new Date().toISOString(),
            },
            observations: [],
        },
        plannerPendingSteps: [],
    });

    await runPlannerWorkflow(
        'Any updates?',
        buildPlannerContext({
            actions: [
                {
                    responseType: 'text_response',
                    reason: 'Respond casually',
                    text: 'Still here and ready to help.',
                },
            ],
        }),
        runtime as any,
    );

    const lastMessage = store.chatHistory.at(-1);
    assert.strictEqual(lastMessage?.text, 'Still here and ready to help.');
});

await test('invalid dom_action payload triggers validation telemetry before retry', async () => {
    const invalidDomAction = {
        responseType: 'dom_action' as const,
        reason: 'Highlight the chart',
        stepId: FIRST_STEP_ID,
        domAction: {
            toolName: 'highlightCard' as const,
            args: { cardId: '' },
        },
    };
    const validDomAction = {
        responseType: 'dom_action' as const,
        reason: 'Highlight the chart',
        stepId: FIRST_STEP_ID,
        domAction: {
            toolName: 'highlightCard' as const,
            args: { cardId: 'card-123' },
        },
    };

    const { runtime, store } = createPlannerHarness();
    await runPlannerWorkflow(
        'Show me card 3',
        buildMultiResponseContext([
            { actions: [planStateAction, invalidDomAction] },
            { actions: [planStateAction, validDomAction] },
        ]),
        runtime as any,
    );

    assert.ok(
        store.progressLog.some(msg => msg.includes('DOM action')),
        'Should log validation error for dom_action',
    );
    assert.strictEqual(store.validationEvents.length, 1);
    assert.strictEqual(store.validationEvents[0].actionType, 'dom_action');
    assert.deepStrictEqual(
        store.agentActionTraces.map(t => t.actionType),
        ['dom_action', 'plan_state_update', 'dom_action'],
    );
});

await test('removeCard dom_action can rely on cardTitle fallback', async () => {
    const removeByTitleAction = {
        responseType: 'dom_action' as const,
        reason: 'Clean redundant chart',
        stepId: FIRST_STEP_ID,
        domAction: {
            toolName: 'removeCard' as const,
            args: { cardId: '', cardTitle: 'Monthly Expenses' },
        },
    };

    const { runtime, store } = createPlannerHarness({
        analysisCards: [{ id: 'card-auto', plan: { title: 'Monthly Expenses' } }],
    });
    await runPlannerWorkflow(
        'Delete extra chart',
        buildPlannerContext({ actions: [planStateAction, removeByTitleAction] }),
        runtime as any,
    );

    const executedRemove = store.domActions.find(action => action.toolName === 'removeCard');
    assert.ok(executedRemove, 'removeCard action should execute');
    assert.strictEqual(executedRemove?.args?.cardId, 'card-auto', 'cardId should be auto-resolved from title');
});

await test('required remove_card action auto-inserted when missing', async () => {
    const { runtime, store } = createPlannerHarness({
        analysisCards: [{ id: 'card-1', plan: { title: 'Aged Payables' } }],
    });
    runtime.userMessage = 'please remove the aged payables card';
    (runtime as any).detectedIntent = {
        intent: 'remove_card',
        confidence: 0.95,
        requiredTool: {
            responseType: 'dom_action',
            domToolName: 'removeCard',
            payloadHints: { cardId: 'card-1', cardTitle: 'Aged Payables' },
        },
        payloadHints: { cardTitle: 'Aged Payables' },
    };
    (runtime as any).intentRequirementSatisfied = false;

    console.log('debug: starting auto-insert remove_card test');
    await runPlannerWorkflow(
        'please remove the aged payables card',
        buildPlannerContext({ actions: [planStateAction, buildTextResponseAction('Working on it')] }),
        runtime as any,
    );
    console.log('debug: finished auto-insert remove_card test');

    const executedRemove = store.domActions.find(action => action.toolName === 'removeCard');
    assert.ok(executedRemove, 'removeCard action should be auto-inserted and executed');
    assert.strictEqual(executedRemove?.args?.cardId, 'card-1');
    assert.ok(
        store.progressLog.some(msg => msg.includes('Auto-inserted removeCard')),
        'Should log that removeCard was auto-inserted',
    );
});

await test('too-short filter query triggers validation retry', async () => {
    const shortFilterAction = {
        responseType: 'filter_spreadsheet' as const,
        reason: 'Need to scan entries',
        args: { query: 'hi' },
        stepId: FIRST_STEP_ID,
    };
    const validFilterAction = {
        responseType: 'filter_spreadsheet' as const,
        reason: 'Zoom into Hannah orders',
        args: { query: 'show orders for Hannah in March' },
        stepId: FIRST_STEP_ID,
    };

    const { runtime, store } = createPlannerHarness();
    await runPlannerWorkflow(
        'Filter Hannah',
        buildMultiResponseContext([
            { actions: [planStateAction, shortFilterAction] },
            { actions: [planStateAction, validFilterAction] },
        ]),
        runtime as any,
    );

    assert.ok(
        store.progressLog.some(msg => msg.includes('filter_spreadsheet action is invalid')),
        'Should log validation error for short filter query',
    );
    assert.strictEqual(store.validationEvents.length, 1);
    assert.strictEqual(store.validationEvents[0].actionType, 'filter_spreadsheet');
    assert.strictEqual(store.lastFilterQuery, 'show orders for Hannah in March');
    assert.deepStrictEqual(
        store.agentActionTraces.map(t => t.actionType),
        ['filter_spreadsheet', 'plan_state_update', 'filter_spreadsheet'],
    );
});

await test('required filter action auto-inserted when missing', async () => {
    const { runtime, store } = createPlannerHarness();
    runtime.userMessage = 'show invoices above 5000';
    (runtime as any).detectedIntent = {
        intent: 'data_filter',
        confidence: 0.82,
        requiredTool: { responseType: 'filter_spreadsheet' },
        payloadHints: { query: 'amount > 5000' },
    };
    (runtime as any).intentRequirementSatisfied = false;

    await runPlannerWorkflow(
        'show invoices above 5000',
        buildPlannerContext({ actions: [planStateAction, buildTextResponseAction('On it.')] }),
        runtime as any,
    );

    assert.strictEqual(store.lastFilterQuery, 'amount > 5000');
    assert.ok(
        store.progressLog.some(msg => msg.includes('Auto-inserted filter_spreadsheet')),
        'Should log that filter was auto inserted',
    );
    assert.ok(
        store.agentActionTraces.some(trace => trace.actionType === 'filter_spreadsheet'),
        'Auto-inserted filter action should produce a trace',
    );
});

await test('filter payload auto-filled using user request when intent is filter', async () => {
    const blankFilterAction = {
        responseType: 'filter_spreadsheet' as const,
        reason: 'Need to narrow results',
        stepId: FIRST_STEP_ID,
        args: {},
    };
    const { runtime, store } = createPlannerHarness();
    runtime.userMessage = 'filter february invoices only';
    (runtime as any).detectedIntent = {
        intent: 'data_filter',
        confidence: 0.78,
        requiredTool: { responseType: 'filter_spreadsheet' },
    };
    (runtime as any).intentRequirementSatisfied = false;

    await runPlannerWorkflow(
        'filter february invoices only',
        buildPlannerContext({ actions: [planStateAction, blankFilterAction] }),
        runtime as any,
    );

    assert.strictEqual(
        store.lastFilterQuery,
        'filter february invoices only',
        'Filter query should reuse the user message',
    );
    assert.ok(
        store.validationEvents.some(event => event.reason === 'auto_filter_query_filled'),
        'Auto fill event should be recorded',
    );
});

await test('dom_action payload auto-filled using intent hints', async () => {
    const missingPayloadAction = {
        responseType: 'dom_action' as const,
        reason: 'Clean chart',
        stepId: FIRST_STEP_ID,
        domAction: {
            toolName: 'removeCard' as const,
            args: {},
        },
    };

    const { runtime, store } = createPlannerHarness({
        analysisCards: [{ id: 'card-intent', plan: { title: 'Aged Payables' } }],
    });
    runtime.userMessage = 'delete aged payables card';
    (runtime as any).detectedIntent = {
        intent: 'remove_card',
        confidence: 0.9,
        requiredTool: {
            responseType: 'dom_action',
            domToolName: 'removeCard',
            payloadHints: { cardId: 'card-intent', cardTitle: 'Aged Payables' },
        },
        payloadHints: { cardTitle: 'Aged Payables' },
    };
    (runtime as any).intentRequirementSatisfied = false;

    await runPlannerWorkflow(
        'delete aged payables card',
        buildPlannerContext({ actions: [planStateAction, missingPayloadAction] }),
        runtime as any,
    );

    const executedRemove = store.domActions.find(action => action.toolName === 'removeCard');
    assert.strictEqual(executedRemove?.args?.cardId, 'card-intent');
    assert.ok(
        store.validationEvents.some(event => event.reason === 'auto_dom_payload_filled'),
        'Should record auto dom payload event',
    );
});

await test('execute_js_code without return statement is rejected before retry', async () => {
    const invalidTransformAction = {
        responseType: 'execute_js_code' as const,
        reason: 'Scale revenue',
        code: {
            explanation: 'Scale totals',
            jsFunctionBody: 'data.map(row => ({ ...row, Revenue_total: row.Revenue_total * 1.1 }));',
        },
        stepId: FIRST_STEP_ID,
    };
    const validTransformAction = {
        responseType: 'execute_js_code' as const,
        reason: 'Scale revenue properly',
        code: {
            explanation: 'Scale totals by 10%',
            jsFunctionBody:
                'return data.map(row => ({ ...row, Revenue_total: Number(row.Revenue_total) * 1.1 }));',
        },
        stepId: FIRST_STEP_ID,
    };

    const { runtime, store } = createPlannerHarness();
    await runPlannerWorkflow(
        'Scale revenue',
        buildMultiResponseContext([
            { actions: [planStateAction, invalidTransformAction] },
            { actions: [planStateAction, validTransformAction] },
        ]),
        runtime as any,
    );

    assert.ok(
        store.progressLog.some(msg => msg.includes('execute_js_code action is invalid')),
        'Should log validation error for missing return',
    );
    assert.strictEqual(store.validationEvents.length, 1);
    assert.strictEqual(store.validationEvents[0].actionType, 'execute_js_code');
    assert.ok(store.pendingDataTransform, 'Valid transform should queue after retry');
    assert.deepStrictEqual(
        store.agentActionTraces.map(t => t.actionType),
        ['execute_js_code', 'plan_state_update', 'execute_js_code'],
    );
});

await test('runPlannerWorkflow halts when clarification is required', async () => {
    const clarificationAction = {
        responseType: 'clarification_request' as const,
        reason: 'Need target metric',
        stepId: FIRST_STEP_ID,
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
    assert.strictEqual(store.plannerSession.planState?.stateTag, 'awaiting_clarification');
    assert.strictEqual(store.agentAwaitingUserInput, true);
    assert.ok(
        store.progressLog.includes('Waiting for your choice to continue.'),
        'planner should announce await-user pause',
    );
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
        reason: 'Execute requested chart',
        stepId: FIRST_STEP_ID,
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
        reason: 'Explain result',
        text: 'Created the revenue chart.',
        stepId: SECOND_STEP_ID,
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
        reason: 'Need metric column',
        stepId: FIRST_STEP_ID,
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
        reason: 'Execute after auto clarification',
        stepId: SECOND_STEP_ID,
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

await test('planner continues when plan_state next steps remain', async () => {
    const continuationPlanSteps = buildSteps('Generate continuation chart');
    const followUpSteps = buildSteps('Build continuation chart', 'Finalize summary');

    const continuationPlanState = {
        responseType: 'plan_state_update' as const,
        reason: 'Need to keep going',
        planState: {
            goal: 'Deliver continuation chart',
            contextSummary: 'User wants more detail',
            progress: 'Outlined the approach',
            nextSteps: continuationPlanSteps,
            blockedBy: null,
            observationIds: [],
            confidence: 0.7,
            updatedAt: new Date().toISOString(),
        },
    };

    const followUpPlanState = {
        responseType: 'plan_state_update' as const,
        reason: 'Continuing execution',
        planState: {
            goal: 'Deliver continuation chart',
            contextSummary: 'User wants more detail',
            progress: 'Running the requested chart',
            nextSteps: followUpSteps,
            blockedBy: null,
            observationIds: [],
            confidence: 0.8,
            updatedAt: new Date().toISOString(),
        },
    };

    const planCreationAction = {
        responseType: 'plan_creation' as const,
        reason: 'Build continuation chart',
        stepId: followUpSteps[0].id,
        plan: {
            chartType: 'bar',
            title: 'Continuation Chart',
            description: 'Follow-up analysis',
            aggregation: 'sum',
            groupByColumn: 'Month',
            valueColumn: 'Revenue_total',
        },
    };

    const { runtime, store } = createPlannerHarness();
    const plannerContext = buildMultiResponseContext([
        { actions: [continuationPlanState] },
        { actions: [followUpPlanState, planCreationAction] },
    ]);
    await runPlannerWorkflow(
        'Keep going',
        plannerContext,
        runtime as any,
    );

    assert.ok(
        store.progressLog.some(msg => msg.includes('Continuing plan')),
        'continuation status should be logged',
    );
    assert.deepStrictEqual(store.executedPlans, ['Continuation Chart']);
    assert.deepStrictEqual(
        store.agentActionTraces.map(t => t.actionType),
        ['plan_state_update', 'plan_state_update', 'plan_creation'],
    );
    assert.strictEqual(plannerContext.wasExhausted(), false, 'should not consume more responses than provided');
    assert.strictEqual(plannerContext.getRequestCount(), 2);
});

await test('planner halts continuation when stateTag is blocked', async () => {
    const blockedPlanState = {
        responseType: 'plan_state_update' as const,
        reason: 'Waiting on user input',
        planState: {
            goal: 'Await clarification',
            contextSummary: 'Need user to confirm column',
            progress: 'Asked user for more info',
            nextSteps: buildSteps('Resume plan after user replies'),
            blockedBy: 'Clarification required',
            observationIds: [],
            confidence: 0.4,
            updatedAt: new Date().toISOString(),
            stateTag: 'awaiting_clarification' as const,
        },
    };

    const { runtime, store } = createPlannerHarness();
    await runPlannerWorkflow(
        'Hold request',
        buildPlannerContext({ actions: [blockedPlanState, blockedPlanState, blockedPlanState] }),
        runtime as any,
    );

    assert.strictEqual(store.executedPlans.length, 0, 'No continuation should be triggered');
    assert.ok(
        store.agentActionTraces.every(trace => trace.actionType === 'plan_state_update'),
        'Only plan_state_update actions should run',
    );
});

await test('execute_js_code failure triggers auto-retry flow', async () => {
    const failingTransformAction = {
        responseType: 'execute_js_code' as const,
        reason: 'Transform dataset',
        stepId: FIRST_STEP_ID,
        code: {
            explanation: 'Attempt transform',
            jsFunctionBody: 'return data.map(row => { throw new Error("Boom"); });',
        },
    };
    const successTextAction = {
        responseType: 'text_response' as const,
        reason: 'Explain retry result',
        text: 'Transformation failed, so I shared the error details.',
        stepId: SECOND_STEP_ID,
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
    assert.ok(store.progressLog.some(msg => msg.includes('Auto-retrying last action (attempt 2)...')));
    assert.deepStrictEqual(
        store.agentActionTraces.map(t => t.actionType),
        [
            'plan_state_update',
            'execute_js_code',
            'plan_state_update',
            'text_response',
            'plan_state_update',
            'text_response',
            'plan_state_update',
            'text_response',
            'plan_state_update',
            'text_response',
        ],
    );
});

await test('execute_js_code intent stays unsatisfied until a successful tool runs', async () => {
    const noChangeTransform = {
        responseType: 'execute_js_code' as const,
        reason: 'Try transform without effect',
        stepId: FIRST_STEP_ID,
        code: {
            explanation: 'Return the dataset unchanged',
            jsFunctionBody: 'return data;',
        },
    };
    const missingToolText = {
        responseType: 'text_response' as const,
        reason: 'Skip tool for now',
        text: 'Let me re-evaluate before changing the data.',
        stepId: FIRST_STEP_ID,
    };
    const successfulTransform = {
        responseType: 'execute_js_code' as const,
        reason: 'Add a normalized metric',
        stepId: FIRST_STEP_ID,
        code: {
            explanation: 'Create a bonus column for each row',
            jsFunctionBody:
                'return data.map(row => ({ ...row, Bonus: Number(row.Revenue_total || 0) * 0.1 }));',
        },
    };

    const { runtime, store } = createPlannerHarness();
    const plannerContext = buildMultiResponseContext([
        { actions: [planStateAction, noChangeTransform] },
        { actions: [planStateAction, missingToolText] },
        { actions: [planStateAction, successfulTransform] },
    ]);
    runtime.userMessage = 'Please transform the dataset';
    (runtime as any).detectedIntent = {
        intent: 'data_transform',
        confidence: 0.9,
        requiredTool: { responseType: 'execute_js_code' },
    };
    (runtime as any).intentRequirementSatisfied = false;

    await runPlannerWorkflow(
        'Please transform the dataset',
        plannerContext,
        runtime as any,
    );

    assert.ok(store.progressLog.some(msg => msg.includes('Auto-retrying last action (attempt 2)...')));
    assert.strictEqual(store.validationEvents.length, 1);
    assert.strictEqual(store.validationEvents[0].reason, 'Required tool execute_js_code missing.');
    assert.ok(store.pendingDataTransform, 'Successful final transform should queue preview data.');
    assert.strictEqual(plannerContext.getRequestCount(), 3);
    assert.strictEqual((runtime as any).intentRequirementSatisfied, true);
});

await test('execute_js_code success queues pending data transform', async () => {
    const transformAction = {
        responseType: 'execute_js_code' as const,
        reason: 'Normalize revenue columns',
        stepId: FIRST_STEP_ID,
        code: {
            explanation: 'Trim whitespace from columns',
            jsFunctionBody: 'return data.map(row => ({ ...row, Revenue_total: Number(row.Revenue_total) * 1.05 }));',
        },
    };
    const textResponseAction = {
        responseType: 'text_response' as const,
        reason: 'Inform user of pending transform',
        text: 'I staged a data cleanup. Please review before applying.',
        stepId: SECOND_STEP_ID,
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
        reason: 'Scale revenue for inflation',
        stepId: FIRST_STEP_ID,
        code: {
            explanation: 'Increase revenue totals by 5%',
            jsFunctionBody: 'return data.map(row => ({ ...row, Revenue_total: Number(row.Revenue_total) * 1.05 }));',
        },
    };
    const planCreationAction = {
        responseType: 'plan_creation' as const,
        reason: 'Build chart using adjusted revenue',
        stepId: SECOND_STEP_ID,
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
        reason: 'Attempt risky transform',
        stepId: FIRST_STEP_ID,
        code: {
            explanation: 'Normalize totals',
            jsFunctionBody: 'return data.map(row => ({ ...row, Revenue_total: Number(row.Revenue_total) * 2 }));',
        },
    };
    const planCreationAction = {
        responseType: 'plan_creation' as const,
        reason: 'Proceed without prior transform',
        stepId: SECOND_STEP_ID,
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
