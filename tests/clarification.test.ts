import assert from 'node:assert/strict';
import type { ClarificationRequestPayload } from '../types';
import { filterClarificationOptions } from '../utils/clarification';

const run = async (name: string, fn: () => Promise<void> | void) => {
    try {
        await fn();
        console.log(`✅ ${name}`);
    } catch (error) {
        console.error(`❌ ${name}`);
        throw error;
    }
};

const buildDataset = (column: string, distinct: number) => {
    return Array.from({ length: distinct }, (_, index) => ({ [column]: `Value ${index}` }));
};

const baseClarification: ClarificationRequestPayload = {
    question: 'Pick a column',
    options: [{ label: 'Payee Name', value: 'Payee Name' }],
    pendingPlan: { groupByColumn: 'Payee Name' },
    targetProperty: 'groupByColumn',
};

await run('returns null for high-cardinality columns without preferred override', async () => {
    const data = buildDataset('Payee Name', 60);
    const result = filterClarificationOptions(baseClarification, data, []);
    assert.strictEqual(result, null);
});

await run('preferred columns allow high-cardinality groupBy clarifications', async () => {
    const data = buildDataset('Payee Name', 60);
    const result = filterClarificationOptions(baseClarification, data, [], {
        preferredColumns: ['Payee Name'],
    });
    assert.ok(result, 'clarification should be preserved when preferred columns are provided');
    assert.strictEqual(result?.options.length, 1);
    assert.strictEqual(result?.options[0].value, 'Payee Name');
});

await run('preferred columns also cover names missing from column profiles', async () => {
    const data = buildDataset('Payee Name', 10);
    const result = filterClarificationOptions(baseClarification, data, ['Amount'], {
        preferredColumns: ['Payee Name'],
    });
    assert.ok(result, 'clarification should fall back to preferred columns even if not profiled');
    assert.strictEqual(result?.options[0].value, 'Payee Name');
});
