import assert from 'node:assert/strict';
import type { AiAction, AiChatResponse, AgentPlanState } from '../types';
import { createAgentEngine } from '../services/agent/engine';
import { extractQuickChoices } from '../utils/questionChoices';
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
        promptMode: 'full',
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
                reason: 'Greet the user.',
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
    const context = buildContext({
        detectedIntent: { intent: 'remove_card', confidence: 0.8 },
    });
    const domAction: AiAction = {
        type: 'dom_action',
        responseType: 'dom_action',
        reason: 'Remove a chart.',
        stepId: 'remove_card',
        domAction: {
            toolName: 'removeCard',
            args: {},
        },
    };
    const raw: AiChatResponse = { actions: [domAction] };
    const result = engine.run(raw, context);
    const downgraded = result.actions.find(action => action.text === 'Target not found, please select.');
    assert.ok(downgraded, 'expected downgrade to text_response when target missing');
    assert.strictEqual(downgraded?.responseType, 'text_response');
    assert.ok(downgraded?.stateTag, 'downgraded action must include stateTag');
});

await run('plan-only responses emit plan_state_update plus text confirmation', () => {
    const context = buildContext({
        planState: null,
        pendingSteps: [],
        promptMode: 'plan_only',
        detectedIntent: null,
    });
    const planAction: AiAction = {
        type: 'plan_state_update',
        responseType: 'plan_state_update',
        reason: 'Greeting detected; initializing tracker.',
        stepId: 'acknowledge_user',
        planState: {
            planId: 'plan-hi',
            goal: 'Acknowledge the user and gather their request.',
            contextSummary: 'User said hi.',
            progress: 'Goal tracker initialized.',
            nextSteps: [
                { id: 'acknowledge_user', label: '向用户问候并确认需求', intent: 'conversation', status: 'in_progress' },
                { id: 'clarify_scope', label: '澄清分析范围', intent: 'gather_clarification', status: 'ready' },
            ],
            steps: [
                { id: 'acknowledge_user', label: '向用户问候并确认需求', intent: 'conversation', status: 'in_progress' },
                { id: 'clarify_scope', label: '澄清分析范围', intent: 'gather_clarification', status: 'ready' },
            ],
            currentStepId: 'acknowledge_user',
            blockedBy: null,
            observationIds: [],
            confidence: 0.7,
            updatedAt: '',
        },
    };
    const result = engine.run({ actions: [planAction] }, context);
    assert.strictEqual(result.actions.length, 2);
    const [planActionResult, textAction] = result.actions;
    assert.strictEqual(planActionResult.responseType, 'plan_state_update');
    assert.ok(planActionResult.stateTag, 'plan-only action should include a stateTag');
    assert.ok(planActionResult.planState?.updatedAt, 'plan-only plan_state_update should retain updatedAt after stamping');
    assert.strictEqual(textAction.responseType, 'text_response');
    assert.match(textAction.text ?? '', /计划/i);
});

await run('auto-heal injects fallback reason when missing', () => {
    const context = buildContext();
    const response: AiChatResponse = {
        actions: [
            {
                type: 'text_response',
                responseType: 'text_response',
                stepId: 'acknowledge_user',
                text: 'hello',
            },
        ],
    };
    const result = engine.run(response, context);
    const textAction = result.actions.find(action => action.responseType === 'text_response');
    assert.ok(textAction, 'text action should exist');
    assert.ok(textAction?.reason && textAction.reason.length > 0, 'fallback reason should be injected');
});

await run('greeting playbook response carries numbered quick choices', () => {
    const context = buildContext({ planState: null, pendingSteps: [] });
    const response: AiChatResponse = { actions: [] };
    const result = engine.run(response, context);
    const textAction = result.actions.find(action => action.responseType === 'text_response');
    assert.ok(textAction, 'expected a greeting text response');
    const quickChoices = extractQuickChoices(textAction?.text ?? '');
    assert.ok(quickChoices.length >= 2, 'greeting should expose at least two quick choices');
    assert.ok((textAction?.text ?? '').includes('1)'), 'greeting text should include numbered prefixes');
});

await run('plan-only turns trim AI text but still append confirmation message', () => {
    const context = buildContext({
        planState: null,
        pendingSteps: [],
        promptMode: 'plan_only',
        detectedIntent: null,
    });
    const planAction: AiAction = {
        type: 'plan_state_update',
        responseType: 'plan_state_update',
        stepId: 'acknowledge_user',
        reason: 'Initializing plan tracker.',
        planState: {
            planId: 'plan-planonly',
            goal: 'Acknowledge the user and clarify scope.',
            contextSummary: 'User greeted the agent.',
            progress: 'Greeting acknowledged.',
            nextSteps: [{ id: 'acknowledge_user', label: '向用户问候并确认需求', intent: 'conversation', status: 'ready' }],
            steps: [{ id: 'acknowledge_user', label: '向用户问候并确认需求', intent: 'conversation', status: 'in_progress' }],
            currentStepId: 'acknowledge_user',
            blockedBy: null,
            observationIds: [],
            confidence: 0.5,
            updatedAt: new Date().toISOString(),
            stateTag: 'context_ready',
        },
    };
    const textAction: AiAction = {
        type: 'text_response',
        responseType: 'text_response',
        stepId: 'acknowledge_user',
        reason: 'Stray text that should be trimmed.',
        text: 'Hi there!',
    };
    const result = engine.run({ actions: [planAction, textAction] }, context);
    assert.strictEqual(result.actions.length, 2);
    assert.strictEqual(result.actions[0].responseType, 'plan_state_update');
    assert.strictEqual(result.actions[1].responseType, 'text_response');
    assert.match(result.actions[1].text ?? '', /计划已更新/);
});
