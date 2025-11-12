import assert from 'node:assert/strict';
import { planNode } from '../src/graph/nodes/plan';
import { createGraphState } from '../src/graph/schema';
import type { LangChainPlanGraphPayload } from '../services/langchain/types';
import type { AwaitUserOption } from '../types';

const createLangChainPayload = (): LangChainPlanGraphPayload => ({
    source: 'langchain',
    planId: 'plan-autogen',
    stepId: 'plan-step',
    summary: 'Auto-generated plan ready to execute.',
    plan: {
        chartType: 'bar',
        title: 'Top Channels',
        description: 'Compare channels by revenue.',
        aggregation: 'sum',
        groupByColumn: 'Channel',
        valueColumn: 'Amount',
    },
    planState: {
        planId: 'plan-autogen',
        goal: 'Summarize top channels',
        contextSummary: 'User asked for best channels.',
        progress: 'Ready to build chart.',
        nextSteps: [{ id: 'plan-step', label: 'Build chart', intent: 'analysis', status: 'ready' }],
        steps: [{ id: 'plan-step', label: 'Build chart', intent: 'analysis', status: 'ready' }],
        currentStepId: 'plan-step',
        blockedBy: null,
        observationIds: [],
        confidence: 0.8,
        updatedAt: new Date().toISOString(),
        stateTag: 'context_ready',
    },
    telemetry: {
        latencyMs: 1200,
        startedAt: Date.now() - 1200,
        finishedAt: Date.now(),
    },
});

const awaitOptions: AwaitUserOption[] = [
    { id: 'clean_month', label: '标准化 InvoiceMonth' },
    { id: 'outlier', label: '侦测异常金额' },
];

const createPendingReply = () => ({
    optionId: 'clean_month' as string,
    freeText: null,
    promptId: 'prompt-abc',
    question: '要先做哪项？',
    options: awaitOptions,
    at: new Date().toISOString(),
});

const run = (name: string, fn: () => void) => {
    try {
        fn();
        console.log(`✅ ${name}`);
    } catch (error) {
        console.error(`❌ ${name}`);
        throw error;
    }
};

run('processes LangChain plan even without pending user reply', () => {
    const state = createGraphState('test-session');
    const payload = { langChainPlan: createLangChainPayload() };
    const result = planNode({ state, payload });
    assert.strictEqual(result.actions.length, 1);
    const [planAction] = result.actions;
    assert.strictEqual(planAction.responseType, 'plan_state_update');
    assert.ok(result.state.pendingPlan?.plan, 'pendingPlan should be populated with the LangChain plan');
});

run('manual tool choice no longer references undefined pending plan entry', () => {
    const state = {
        ...createGraphState('manual-session'),
        pendingUserReply: createPendingReply(),
    };
    const result = planNode({ state, payload: {} });
    assert.strictEqual(result.actions.length, 2);
    assert.strictEqual(result.state.pendingPlan, null, 'manual branch should not seed pendingPlan entries');
});

console.log('🎉 planNode tests completed successfully.');
