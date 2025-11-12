import assert from 'node:assert/strict';
import { evaluateAwaitBusyInvariant, type AwaitBusySnapshot } from '../utils/awaitBusyInvariant';

const baseSnapshot: AwaitBusySnapshot = {
    isBusy: false,
    busyRunId: null,
    agentAwaitingUserInput: false,
    graphActiveRunId: null,
};

const run = async (name: string, fn: () => Promise<void> | void) => {
    try {
        await fn();
        console.log(`✅ ${name}`);
    } catch (error) {
        console.error(`❌ ${name}`);
        throw error;
    }
};

await run('passes when busy run is active without awaiting prompt', () => {
    const snapshot: AwaitBusySnapshot = {
        ...baseSnapshot,
        isBusy: true,
        busyRunId: 'run-1',
        graphActiveRunId: 'run-1',
    };
    const result = evaluateAwaitBusyInvariant(snapshot);
    assert.ok(result.ok);
});

await run('flags violation when awaiting prompt keeps busy flag', () => {
    const snapshot: AwaitBusySnapshot = {
        ...baseSnapshot,
        isBusy: true,
        agentAwaitingUserInput: true,
    };
    const result = evaluateAwaitBusyInvariant(snapshot);
    assert.ok(!result.ok);
    assert.strictEqual(result.violations[0]?.code, 'awaiting_still_busy');
});

await run('flags violation when graphActiveRunId survives after busy cleared', () => {
    const snapshot: AwaitBusySnapshot = {
        ...baseSnapshot,
        graphActiveRunId: 'run-2',
    };
    const result = evaluateAwaitBusyInvariant(snapshot);
    assert.ok(!result.ok);
    assert.strictEqual(result.violations[0]?.code, 'active_run_without_busy');
});
