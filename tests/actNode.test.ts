import assert from 'node:assert/strict';
import { actNode } from '../src/graph/nodes/act';
import { createGraphState } from '../src/graph/schema';
import type { AnalysisPlan, PendingPlanIntent } from '../types';

const buildPlan = (overrides: Partial<AnalysisPlan> = {}): AnalysisPlan => ({
    chartType: 'bar',
    title: 'Average Gross Margin by Salesperson',
    description: 'Compare gross margin by salesperson',
    aggregation: 'avg',
    groupByColumn: 'Salesperson_2',
    valueColumn: 'GrossMarginPct_2',
    ...overrides,
});

const createPendingPlanState = (
    plan: AnalysisPlan,
    summary = 'remove record fiona',
    intent: PendingPlanIntent = 'analysis',
    metadata: Record<string, unknown> | null = null,
) => ({
    id: 'plan-remove',
    summary,
    plan,
    intent,
    metadata,
    createdAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
});

const withState = (pendingPlan: ReturnType<typeof createPendingPlanState> | null) => ({
    ...createGraphState('act-test'),
    pendingPlan,
});

const run = (name: string, fn: () => void) => {
    try {
        fn();
        console.log(`✅ ${name}`);
    } catch (error) {
        console.error(`❌ ${name}`);
        throw error;
    }
};

run('actNode skips when pending plan missing plan payload', () => {
    const result = actNode({ state: withState(null) });
    assert.strictEqual(result.actions.length, 0);
    assert.strictEqual(result.state.phase, 'act');
});

run('actNode emits only plan_creation for standard plan', () => {
    const pendingPlan = createPendingPlanState(buildPlan({ rowFilter: undefined }), 'rebuild chart', 'analysis', null);
    const result = actNode({ state: withState(pendingPlan) });
    assert.strictEqual(result.actions.length, 1);
    assert.strictEqual(result.actions[0].responseType, 'plan_creation');
});

run('actNode emits execute_js_code when plan summary indicates row removal', () => {
    const removalPlan = buildPlan({
        rowFilter: { column: 'Salesperson_2', values: ['Fiona'] },
        description: 'Remove Fiona rows then rebuild chart',
    });
    const pendingPlan = createPendingPlanState(removalPlan, 'remove record fiona', 'remove_rows', {
        column: 'Salesperson_2',
        values: ['Fiona'],
    });
    const result = actNode({ state: withState(pendingPlan) });
    assert.strictEqual(result.actions.length, 2);
    const [planCreation, transform] = result.actions;
    assert.strictEqual(planCreation.responseType, 'plan_creation');
    assert.strictEqual(transform.responseType, 'execute_js_code');
    assert.ok(transform.code?.jsFunctionBody.toLowerCase().includes('fiona'));
    assert.ok(transform.reason?.includes('Fiona'));
});

console.log('🎉 actNode tests completed successfully.');
