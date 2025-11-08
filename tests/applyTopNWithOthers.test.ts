import assert from 'node:assert/strict';
import { applyTopNWithOthers } from '../utils/dataProcessor';
import { CsvRow } from '../types';

const run = (name: string, fn: () => void) => {
    try {
        fn();
        console.log(`✅ ${name}`);
    } catch (error) {
        console.error(`❌ ${name}`);
        throw error;
    }
};

run('returns data untouched when row count is <= topN', () => {
    const data: CsvRow[] = [
        { Country: 'Mexico', NetRevenue: 130000 },
        { Country: 'Germany', NetRevenue: 120000 },
    ];

    const result = applyTopNWithOthers(data, 'Country', 'NetRevenue', 5);

    assert.strictEqual(result.length, data.length);
    assert.deepStrictEqual(result, data);
});

run('sorts data by value and aggregates the remainder into Others', () => {
    const data: CsvRow[] = [
        { Country: 'Mexico', NetRevenue: 138000 },
        { Country: 'Germany', NetRevenue: 134000 },
        { Country: 'Australia', NetRevenue: 131000 },
        { Country: 'Japan', NetRevenue: 122000 },
        { Country: 'UAE', NetRevenue: 122000 },
        { Country: 'Singapore', NetRevenue: 116000 },
        { Country: 'United States', NetRevenue: 92000 },
        { Country: 'Canada', NetRevenue: 91000 },
    ];

    const result = applyTopNWithOthers(data, 'Country', 'NetRevenue', 5);

    const expectedLeaders = ['Mexico', 'Germany', 'Australia', 'Japan', 'UAE'];
    const leaders = result.slice(0, 5).map(row => row['Country']);
    assert.deepStrictEqual(leaders, expectedLeaders);

    const othersRow = result[5];
    assert.strictEqual(othersRow['Country'], 'Others');
    assert.strictEqual(othersRow['NetRevenue'], 116000 + 92000 + 91000);
});

run('treats non-numeric values as zero when summing Others', () => {
    const data: CsvRow[] = [
        { Country: 'Mexico', NetRevenue: '138000' },
        { Country: 'Germany', NetRevenue: 134000 },
        { Country: 'Australia', NetRevenue: 131000 },
        { Country: 'Japan', NetRevenue: 122000 },
        { Country: 'UAE', NetRevenue: 122000 },
        { Country: 'Singapore', NetRevenue: 'bad-value' },
        { Country: 'United States', NetRevenue: null as unknown as number },
    ];

    const result = applyTopNWithOthers(data, 'Country', 'NetRevenue', 5);

    const othersRow = result[5];
    assert.strictEqual(othersRow['NetRevenue'], 0);
});

console.log('🎉 applyTopNWithOthers tests completed successfully.');
