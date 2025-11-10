import assert from 'node:assert/strict';
import type { AiAction, AiChatResponse, AgentPlanState } from '../types';
import { createAgentEngine } from '../services/agent/engine';
import type { EngineContext } from '../services/agent/engine';

const engine = createAgentEngine();

const buildContext = (overrides: Partial<EngineContext> = {}): EngineContext => {
    const defaultPlanState: AgentPlanState = {
        planId: 'plan-seeded',
        goal: 'Greet the user and understand intent.',
        progress: 'Initialized.',
        nextSteps: [{ id: 'acknowledge_user', label: 'Acknowledge greeting', intent: 'conversation', status: 'ready' }],
        steps: [{ id: 'acknowledge_user', label: 'Acknowledge greeting', intent: 'conversation', status: 'ready' }],
        currentStepId: 'acknowledge_user',
        blockedBy: null,
        observationIds: [],
        confidence: 0.6,
        updatedAt: new Date().toISOString(),
        stateTag: 'context_ready',
    };
    return {
        planState: defaultPlanState,
        pendingSteps: defaultPlanState.nextSteps,
        detectedIntent: { intent: 'greeting', confidence: 0.9 },
        userMessage: 'hi there',
        runId: 'run-test',
        now: Date.now(),
        lastStateTag: defaultPlanState.stateTag,
        ...overrides,
    };
};

const run = async (name: string, fn: () => void | Promise<void>) => {
    try {
        await fn();
        console.log(`✅ ${name}`);
    } catch (error) {
        console.error(`❌ ${name}`);
        throw error;
    }
};

await run('auto-seeds plan_state_update when none active', () => {
    const context = buildContext({ planState: null, pendingSteps: [] });
    const raw: AiChatResponse = {
        actions: [
            {
                type: 'text_response',
                responseType: 'text_response',
                thought: 'Greet the user.',
                stepId: 'acknowledge_user',
                text: 'Hello there!',
            },
        ],
    };
    const result = engine.run(raw, context);
    assert.ok(result.actions.length >= 1);
    const planAction = result.actions[0];
    assert.strictEqual(planAction.responseType, 'plan_state_update');
    assert.ok(planAction.planState?.planId);
    assert.ok(planAction.planState?.steps && planAction.planState.steps[0]?.status);
    assert.ok(planAction.stateTag, 'plan action should include stateTag');
});

await run('dom_action without target downgrades to text response', () => {
    const context = buildContext();
    const domAction: AiAction = {
        type: 'dom_action',
        responseType: 'dom_action',
        thought: 'Remove a chart.',
        stepId: 'remove_card',
        domAction: {
            toolName: 'removeCard',
            args: {},
        },
    };
    const raw: AiChatResponse = { actions: [domAction] };
    const result = engine.run(raw, context);
    const downgraded = result.actions.find(action => action.responseType === 'text_response');
    assert.ok(downgraded, 'expected downgrade to text_response when target missing');
    assert.strictEqual(downgraded?.text, 'Target not found, please select.');
    assert.ok(downgraded?.stateTag, 'downgraded action must include stateTag');
});
