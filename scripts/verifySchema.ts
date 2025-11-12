import type { AgentSchemaPhase } from '../types';
import { listPhaseConventions } from '../services/ai/phaseConventions';
import { intentContractSchema, normalizeIntentContract } from '../services/ai/schemas.ts';

const fail = (message: string): never => {
    console.error(`❌ Convention verification failed: ${message}`);
    process.exit(1);
};

const verifyPhaseConventions = () => {
    const conventions = listPhaseConventions();
    const expectedPhases: AgentSchemaPhase[] = ['plan', 'talk', 'act'];
    expectedPhases.forEach(phase => {
        const match = conventions.find(convention => convention.phase === phase);
        if (!match) {
            fail(`Missing phase convention for "${phase}".`);
        }
        if (!match.expectations.length) {
            fail(`Phase "${phase}" must declare at least one expectation.`);
        }
        const combined = `${match.summary} ${match.expectations.join(' ')}`.toLowerCase();
        if (!combined.includes('plan_state_update')) {
            fail(`Phase "${phase}" instructions must mention plan_state_update.`);
        }
        if (phase === 'plan' && !combined.includes('text_response')) {
            fail('Plan phase must describe the text_response acknowledgement.');
        }
        if (phase === 'act' && !combined.includes('execute_js_code')) {
            fail('Act phase must remind the model about execute_js_code behavior.');
        }
    });
    console.log('✅ Phase conventions verified successfully.');
};

const expectContractPass = (label: string, payload: Record<string, any>) => {
    try {
        intentContractSchema.parse(payload);
    } catch (error) {
        fail(`IntentContract "${label}" should have passed but failed: ${error}`);
    }
};

const expectContractFail = (label: string, payload: Record<string, any>) => {
    let threw = false;
    try {
        intentContractSchema.parse(payload);
    } catch {
        threw = true;
    }
    if (!threw) {
        fail(`IntentContract "${label}" should have failed but succeeded.`);
    }
};

const verifyIntentContractSchema = () => {
    const validSamples = [
        { intent: 'aggregate', tool: 'csv.aggregate' },
        { intent: 'profile', tool: 'csv.profile' },
        { intent: 'clean', tool: 'csv.clean_invoice_month' },
        { intent: 'detect_anomaly', tool: 'csv.detect_outliers' },
        { intent: 'remove_card', tool: 'ui.remove_card' },
        { intent: 'save_view', tool: 'idb.save_view' },
        { intent: 'ask_clarify', tool: null, awaitUser: true },
    ];
    validSamples.forEach(sample => {
        expectContractPass(`${sample.intent}:${sample.tool}`, sample);
    });

    expectContractFail('aggregate uses profile tool', { intent: 'aggregate', tool: 'csv.profile' });
    expectContractFail('ask_clarify without awaitUser', { intent: 'ask_clarify', tool: null, awaitUser: false });
    expectContractFail('ask_clarify specifying a tool', { intent: 'ask_clarify', tool: 'csv.aggregate', awaitUser: true });

    const normalized = normalizeIntentContract({
        intent: 'aggregate',
        tool: 'csv.aggregate',
        args: { datasetId: 'ds-123' },
    });
    if (normalized.args.aggregation !== 'sum') {
        fail('IntentContract default aggregation is not sum.');
    }
    if (!Array.isArray(normalized.args.groupBy) || normalized.args.groupBy.length !== 0) {
        fail('IntentContract default groupBy must be an empty array.');
    }
    if (!Array.isArray(normalized.args.filters) || normalized.args.filters.length !== 0) {
        fail('IntentContract default filters must be an empty array.');
    }
    console.log('✅ Intent contract schema verified successfully.');
};

const scopeArg = process.argv.slice(2).find(arg => arg.startsWith('--scope='));
const scope = scopeArg ? scopeArg.split('=')[1] : 'all';

const scopeRunners: Record<string, () => void> = {
    phase_conventions: verifyPhaseConventions,
    intent_contract: verifyIntentContractSchema,
};

const scopesToRun = scope === 'all' ? Object.keys(scopeRunners) : [scope];

scopesToRun.forEach(scopeName => {
    const runner = scopeRunners[scopeName];
    if (!runner) {
        fail(`Unknown convention scope "${scopeName}".`);
    }
    runner();
});
