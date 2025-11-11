import assert from 'node:assert/strict';
import type { AiAction } from '@/types';
import { createGuardState, enforceTurnGuards } from '../src/graph/guards';

const mkAction = (overrides: Partial<AiAction>): AiAction => ({
    type: overrides.responseType ?? overrides.type ?? 'plan_state_update',
    responseType: overrides.responseType ?? 'plan_state_update',
    stepId: overrides.stepId ?? 'step-1',
    stateTag: overrides.stateTag ?? 'ts36-0001',
    timestamp: overrides.timestamp ?? new Date().toISOString(),
    reason: overrides.reason ?? 'test action',
    ...overrides,
});

const mkPlanAction = (overrides: Partial<AiAction> = {}): AiAction =>
    mkAction({
        responseType: 'plan_state_update',
        planState: {
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
            stateTag: 'ts36-0001',
        },
        ...overrides,
    });

const mkTextAction = (overrides: Partial<AiAction> = {}): AiAction =>
    mkAction({
        responseType: 'text_response',
        text: overrides.text ?? 'hello',
        ...overrides,
    });

const run = async (name: string, fn: () => Promise<void> | void) => {
    try {
        await fn();
        console.log(`✅ ${name}`);
    } catch (error) {
        console.error(`❌ ${name}`);
        throw error;
    }
};

await run('accepts plan_state_update + text_response turn', () => {
    const state = createGuardState('session-test');
    const result = enforceTurnGuards(state, [mkPlanAction(), mkTextAction()]);
    assert.ok(result.ok);
    assert.ok(result.nextState);
    assert.strictEqual(result.nextState.planId, 'plan-1');
});

await run('rejects when awaitingUser flag true', () => {
    const state = { ...createGuardState(), awaitingUser: true, blockedBy: 'awaiting_user_choice' };
    const result = enforceTurnGuards(state, [mkPlanAction()]);
    assert.ok(!result.ok);
    assert.strictEqual(result.violations?.[0]?.code, 'awaiting_user');
});

await run('rejects when turn budget exceeded', () => {
    const state = createGuardState();
    const result = enforceTurnGuards(state, [mkPlanAction(), mkTextAction(), mkTextAction()]);
    assert.ok(!result.ok);
    assert.strictEqual(result.violations?.[0]?.code, 'turn_budget_exceeded');
});

await run('rejects when stateTag missing', () => {
    const state = createGuardState();
    const plan = mkPlanAction({ stateTag: undefined });
    const result = enforceTurnGuards(state, [plan]);
    assert.ok(!result.ok);
    assert.strictEqual(result.violations?.[0]?.code, 'invalid_state_tag');
});

await run('marks awaitingUser when atomic asks', () => {
    const state = createGuardState();
    const textAction = mkTextAction({
        responseType: 'await_user',
        stateTag: 'ts36-0002',
    });
    const result = enforceTurnGuards(state, [mkPlanAction(), textAction]);
    assert.ok(result.ok);
    assert.strictEqual(result.nextState?.awaitingUser, true);
});
