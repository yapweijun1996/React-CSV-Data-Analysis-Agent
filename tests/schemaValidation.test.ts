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
    const requiredFields = ['goal', 'contextSummary', 'progress', 'nextSteps', 'blockedBy', 'observationIds', 'confidence', 'updatedAt'];
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

console.log('🎉 schemaValidation tests completed successfully.');
