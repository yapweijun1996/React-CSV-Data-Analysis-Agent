import assert from 'node:assert/strict';
import { planNode, __setChatResponderForTests, __resetChatResponderForTests } from '@/src/graph/nodes/plan';
import { createGuardState } from '@/src/graph/guards';
import { GRAPH_PAYLOAD_KIND_LLM_TURN, type GraphLlmTurnPayload } from '@/src/graph/payloads';
import type { AiAction, AgentPlanState, AiChatResponse } from '@/types';

const basePlanState = (): AgentPlanState => ({
    planId: 'plan-1',
    goal: 'test goal',
    contextSummary: 'context',
    progress: 'progress',
    nextSteps: [{ id: 'step-1', label: 'Do thing', intent: 'conversation', status: 'in_progress' }],
    steps: [{ id: 'step-1', label: 'Do thing', intent: 'conversation', status: 'in_progress' }],
    blockedBy: null,
    observationIds: [],
    confidence: 0.5,
    updatedAt: new Date().toISOString(),
    currentStepId: 'step-1',
    stateTag: 'ts36-plan0',
});

const basePayload = (): GraphLlmTurnPayload => ({
    kind: GRAPH_PAYLOAD_KIND_LLM_TURN,
    requestId: 'req-test',
    userMessage: 'hello',
    promptCharCountHint: 5,
    columns: [],
    chatHistory: [],
    cardContext: [],
    settings: {
        provider: 'google',
        geminiApiKey: 'dummy',
        openAIApiKey: '',
        model: 'models/gemini',
        language: 'English',
        autoSaveEnabled: false,
        autoSaveIntervalSeconds: 300,
    },
    aiCoreAnalysisSummary: null,
    currentView: 'analysis_dashboard',
    longTermMemory: [],
    recentObservations: [],
    activePlanState: null,
    dataPreparationPlan: null,
    recentActionTraces: [],
    rawDataFilterSummary: '',
    activeSampleTier: 100,
    sampleTierLabel: '100 rows',
    sampleTierConfirmed: false,
});

const makePlanAction = (overrides: Partial<AiAction> = {}): AiAction => ({
    type: 'plan_state_update',
    responseType: 'plan_state_update',
    stepId: 'step-1',
    stateTag: overrides.stateTag ?? 'ts36-0001',
    reason: 'sync plan',
    planState: basePlanState(),
    ...overrides,
});

const run = async (name: string, fn: () => Promise<void> | void) => {
    try {
        await fn();
        console.log(`✅ ${name}`);
    } catch (error) {
        console.error(`❌ ${name}`);
        throw error;
    } finally {
        __resetChatResponderForTests();
    }
};

const mockChatResponse = (actions: AiAction[]): AiChatResponse => ({
    actions,
});

await run('falls back to text when LLM returns zero actions', async () => {
    __setChatResponderForTests(async () => mockChatResponse([]));
    const result = await planNode({ state: createGuardState(), payload: basePayload() });
    assert.strictEqual(result.actions.length, 1);
    const fallback = result.actions[0];
    assert.strictEqual(fallback.responseType, 'text_response');
    assert.ok(
        fallback.text?.includes('沒有返回任何可執行動作'),
        `Unexpected fallback text: ${fallback.text}`,
    );
});

await run('emits fallback when atomic action is invalid', async () => {
    const planAction = makePlanAction({ stateTag: 'ts36-0001' });
    const invalidAtomic = makePlanAction({ stateTag: 'ts36-0002' });
    assert.strictEqual(planAction.stateTag, 'ts36-0001');
    __setChatResponderForTests(async () => mockChatResponse([planAction, invalidAtomic]));
    const result = await planNode({ state: createGuardState(), payload: basePayload() });
    assert.strictEqual(result.actions.length, 1);
    const fallback = result.actions[0];
    assert.strictEqual(fallback.responseType, 'text_response');
    assert.ok(
        fallback.text?.includes('atomic'),
        `Unexpected fallback text: ${fallback.text}`,
    );
});

await run('propagates await_user turn metadata', async () => {
    const awaitAction: AiAction = {
        type: 'await_user',
        responseType: 'await_user',
        stepId: 'step-1',
        stateTag: 'ts36-await',
        reason: 'Need input',
        awaitUserPayload: {
            promptId: 'await-1',
            question: 'Need your answer',
            options: [],
            allowFreeText: true,
        },
    };
    __setChatResponderForTests(async () => mockChatResponse([makePlanAction(), awaitAction]));
    const result = await planNode({ state: createGuardState(), payload: basePayload() });
    assert.ok(result.state.awaitingUser, 'state.awaitingUser should be true');
    assert.ok(result.state.awaitPrompt, 'awaitPrompt should be populated');
    assert.strictEqual(result.actions.length, 2, JSON.stringify(result.actions));
    assert.strictEqual(result.actions[1]?.responseType, 'await_user');
});

await run('returns fallback text when plan_state_update payload is invalid', async () => {
    __setChatResponderForTests(async () =>
        mockChatResponse([
            {
                type: 'plan_state_update',
                responseType: 'plan_state_update',
                stepId: 'step-1',
                stateTag: '',
                reason: 'bad payload',
            },
        ]),
    );
    const result = await planNode({ state: createGuardState(), payload: basePayload() });
    assert.strictEqual(result.actions.length, 1);
    const fallback = result.actions[0];
    assert.ok(
        fallback.text?.includes('plan_state_update is missing a valid stateTag'),
        `Unexpected fallback text: ${fallback.text}`,
    );
});

await run('auto-mints missing state tags for plan + atomic actions', async () => {
    const planAction: AiAction = {
        type: 'plan_state_update',
        responseType: 'plan_state_update',
        stepId: 'plan-step',
        reason: 'sync plan',
        stateTag: '',
        planState: {
            ...basePlanState(),
            stateTag: '',
        },
    };
    const atomicAction: AiAction = {
        type: 'text_response',
        responseType: 'text_response',
        stepId: 'text-step',
        reason: 'explain',
        stateTag: '',
        text: 'hello',
    };
    __setChatResponderForTests(async () => mockChatResponse([planAction, atomicAction]));
    const result = await planNode({ state: createGuardState(), payload: basePayload() });
    assert.strictEqual(result.actions.length, 2);
    const [normalizedPlan, normalizedAtomic] = result.actions;
    assert.ok(/\d{5,}-\d+/.test(normalizedPlan.stateTag ?? ''), normalizedPlan.stateTag);
    assert.ok(
        normalizedPlan.planState?.stateTag === normalizedPlan.stateTag,
        `planState tag mismatch: ${normalizedPlan.planState?.stateTag} vs ${normalizedPlan.stateTag}`,
    );
    assert.ok(/\d{5,}-\d+/.test(normalizedAtomic?.stateTag ?? ''), normalizedAtomic?.stateTag);
});
