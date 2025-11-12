import assert from 'node:assert/strict';
import { coerceJsonObject, JsonCoercionError } from '../services/ai/jsonRepair';

const run = async (name: string, fn: () => Promise<void> | void) => {
    try {
        await fn();
        console.log(`✅ ${name}`);
    } catch (error) {
        console.error(`❌ ${name}`);
        throw error;
    }
};

const sampleObject = {
    explanation: 'Trim header rows',
    jsFunctionBody: null,
};

await run('returns existing objects untouched', () => {
    const parsed = coerceJsonObject(sampleObject);
    assert.strictEqual(parsed, sampleObject);
});

await run('parses fenced JSON objects', () => {
    const raw = `Sure:\n\`\`\`json\n${JSON.stringify(sampleObject, null, 2)}\n\`\`\``;
    const parsed = coerceJsonObject<typeof sampleObject>(raw);
    assert.strictEqual(parsed.explanation, sampleObject.explanation);
});

await run('extracts first balanced object when narration surrounds JSON', () => {
    const raw = `Plan detail: ${JSON.stringify(sampleObject)}.`;
    const parsed = coerceJsonObject<typeof sampleObject>(raw);
    assert.strictEqual(parsed.jsFunctionBody, null);
});

await run('throws JsonCoercionError for non-parsable payloads', () => {
    assert.throws(
        () => coerceJsonObject('no json here'),
        (error: unknown) => error instanceof JsonCoercionError,
    );
});
