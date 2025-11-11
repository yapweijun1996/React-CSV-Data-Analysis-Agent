import assert from 'node:assert/strict';
import { multiActionChatResponseJsonSchema } from '../services/ai/schemas';

const test = (name: string, fn: () => void) => {
    try {
        fn();
        console.log(`✅ ${name}`);
    } catch (error) {
        console.error(`❌ ${name}`);
        throw error;
    }
};

const getPlanStateSchema = () => {
    const actionsSchema = multiActionChatResponseJsonSchema.properties?.actions;
    assert.ok(actionsSchema && actionsSchema.items, 'actions schema missing');
    const actionSchema = actionsSchema.items;
    const planStateSchema = actionSchema.properties?.planState;
    assert.ok(planStateSchema, 'planState schema missing');
    return planStateSchema;
};

test('plan_state schema mandates all fields and forbids extras', () => {
    const planStateSchema = getPlanStateSchema();
    const requiredFields = [
        'goal',
        'contextSummary',
        'progress',
        'nextSteps',
        'blockedBy',
        'observationIds',
        'confidence',
        'stateTag',
        'updatedAt',
        'planId',
        'currentStepId',
        'steps',
    ];
    assert.deepStrictEqual(planStateSchema.required?.slice().sort(), requiredFields.slice().sort());
    assert.strictEqual(planStateSchema.additionalProperties, false);
});

test('plan_state optional strings allow null values', () => {
    const planStateSchema = getPlanStateSchema();
    const contextSummaryType = planStateSchema.properties?.contextSummary?.type;
    const blockedByType = planStateSchema.properties?.blockedBy?.type;
    assert.ok(Array.isArray(contextSummaryType) && contextSummaryType.includes('null'), 'contextSummary should allow null');
    assert.ok(Array.isArray(blockedByType) && blockedByType.includes('null'), 'blockedBy should allow null');
});

test('action meta object requires all runner hint fields', () => {
    const actionsSchema = multiActionChatResponseJsonSchema.properties?.actions;
    assert.ok(actionsSchema && actionsSchema.items, 'actions schema missing');
    const actionSchema = actionsSchema.items;
    const metaSchema = actionSchema.properties?.meta;
    assert.ok(metaSchema, 'meta schema missing on action');
    const expectedRequired = ['awaitUser', 'haltAfter', 'resumePlanner', 'promptId'];
    assert.deepStrictEqual(metaSchema.required?.slice().sort(), expectedRequired.slice().sort(), 'meta schema missing required fields');
    assert.strictEqual(metaSchema.additionalProperties, false, 'meta schema should forbid extra properties');
    expectedRequired.forEach(field => {
        const property = metaSchema.properties?.[field];
        assert.ok(property, `meta schema missing property ${field}`);
    });
});

test('domAction target schema requires and forbids extras consistently', () => {
    const actionsSchema = multiActionChatResponseJsonSchema.properties?.actions;
    assert.ok(actionsSchema && actionsSchema.items, 'actions schema missing');
    const actionSchema = actionsSchema.items;
    const domActionSchema = actionSchema.properties?.domAction;
    assert.ok(domActionSchema, 'domAction schema missing');
    const targetSchema = domActionSchema.properties?.target;
    assert.ok(targetSchema, 'domAction.target schema missing');
    const expectedRequired = ['byId', 'byTitle', 'selector'];
    assert.deepStrictEqual(targetSchema.required?.slice().sort(), expectedRequired.slice().sort(), 'domAction.target missing required keys');
    assert.strictEqual(targetSchema.additionalProperties, false, 'domAction.target should forbid extra properties');
});

test('actions schema only requires the core envelope fields', () => {
    const actionsSchema = multiActionChatResponseJsonSchema.properties?.actions;
    assert.ok(actionsSchema && actionsSchema.items, 'actions schema missing');
    const actionSchema = actionsSchema.items;
    const requiredFields = ['type', 'responseType', 'reason', 'stateTag', 'stepId', 'timestamp'];
    assert.deepStrictEqual(actionSchema.required?.slice().sort(), requiredFields.slice().sort(), 'action required set mismatch');
});

console.log('🎉 schemaValidation tests completed successfully.');
