import assert from 'node:assert/strict';
import type { ColumnProfile } from '../types';
import { inferGroupByColumn } from '../utils/groupByInference';

const run = async (name: string, fn: () => Promise<void> | void) => {
    try {
        await fn();
        console.log(`✅ ${name}`);
    } catch (error) {
        console.error(`❌ ${name}`);
        throw error;
    }
};

const buildRows = (column: string, values: string[]) => values.map(value => ({ [column]: value }));

await run('infers grouping when column profiles lack uniqueValues', () => {
    const columnProfiles: ColumnProfile[] = [{ name: 'Month', type: 'date' }];
    const rows = buildRows('Month', ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']);
    const result = inferGroupByColumn(columnProfiles, rows);
    assert.deepEqual(result, { column: 'Month', inferred: true });
});

await run('handles large datasets by sampling rows when inferring grouping columns', () => {
    const columnProfiles: ColumnProfile[] = [
        { name: 'Month', type: 'date' },
        { name: 'CustomerId', type: 'categorical' },
    ];
    const rows = Array.from({ length: 800 }, (_, index) => ({
        Month: `Month ${index % 12}`,
        CustomerId: `Customer ${index}`,
    }));
    const result = inferGroupByColumn(columnProfiles, rows);
    assert.strictEqual(result.column, 'Month');
    assert.strictEqual(result.inferred, true);
});
