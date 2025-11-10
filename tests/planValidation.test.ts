import assert from 'node:assert/strict';
import { preparePlanForExecution } from '../utils/planValidation';
import type { AnalysisPlan, ColumnProfile, CsvRow } from '../types';

const columnProfiles: ColumnProfile[] = [
    { name: 'payee', type: 'categorical' },
    { name: 'amount', type: 'currency' },
];

const sampleRows: CsvRow[] = [
    { payee: 'Acme', amount: 1200 },
    { payee: 'Beta', amount: 900 },
];

const run = async (name: string, fn: () => Promise<void>) => {
    try {
        await fn();
        console.log(`✅ ${name}`);
    } catch (error) {
        console.error(`❌ ${name}`);
        throw error;
    }
};

const basePlan: AnalysisPlan = {
    chartType: 'bar',
    title: 'Test Plan',
    description: 'Covers spend by payee.',
    aggregation: 'sum',
    groupByColumn: 'payee',
    valueColumn: 'amount',
};

await run('removes rowFilter when column is missing', async () => {
    const planWithBadFilter: AnalysisPlan = {
        ...basePlan,
        rowFilter: {
            column: 'missing_column',
            values: ['Acme Corp'],
        },
    };

    const result = preparePlanForExecution(planWithBadFilter, columnProfiles, sampleRows);
    assert.ok(result.isValid, 'plan should stay valid');
    assert.strictEqual(result.plan.rowFilter, undefined);
    assert.ok(
        result.warnings.some(warning => warning.includes('Row filter invalid')),
        'expected warning about invalid row filter',
    );
});

await run('keeps rowFilter when column exists', async () => {
    const planWithValidFilter: AnalysisPlan = {
        ...basePlan,
        rowFilter: {
            column: 'payee',
            values: ['Acme'],
        },
    };

    const result = preparePlanForExecution(planWithValidFilter, columnProfiles, sampleRows);
    assert.ok(result.plan.rowFilter, 'rowFilter should survive when column is valid');
    assert.deepEqual(result.plan.rowFilter, planWithValidFilter.rowFilter);
});
