import assert from 'node:assert/strict';
import { describePhaseConvention, listPhaseConventions } from '../services/ai/phaseConventions';
import type { AgentSchemaPhase } from '../types';

const test = (name: string, fn: () => void) => {
    try {
        fn();
        console.log(`✅ ${name}`);
    } catch (error) {
        console.error(`❌ ${name}`);
        throw error;
    }
};

const REQUIRED_KEYWORDS: Record<AgentSchemaPhase, string[]> = {
    plan: ['plan_state_update', 'text_response'],
    talk: ['plan_state_update', 'text_response'],
    act: ['plan_state_update', 'execute_js_code'],
};

test('every phase has conventions with required keywords', () => {
    const conventions = listPhaseConventions();
    (Object.keys(REQUIRED_KEYWORDS) as AgentSchemaPhase[]).forEach(phase => {
        const match = conventions.find(convention => convention.phase === phase);
        assert.ok(match, `Missing convention for phase ${phase}`);
        const haystack = `${match.summary} ${match.expectations.join(' ')}`.toLowerCase();
        REQUIRED_KEYWORDS[phase].forEach(keyword => {
            assert.ok(haystack.includes(keyword), `Phase ${phase} must mention "${keyword}"`);
        });
    });
});

test('describePhaseConvention falls back to TALK phase', () => {
    const fallbackDirective = describePhaseConvention();
    assert.ok(fallbackDirective.includes('Conversation'), 'Fallback should describe TALK phase');
    assert.ok(fallbackDirective.includes('plan_state_update'), 'Fallback directive must mention plan_state_update');
});

test('describePhaseConvention returns distinct text per phase', () => {
    const planDirective = describePhaseConvention('plan');
    const actDirective = describePhaseConvention('act');
    assert.notStrictEqual(planDirective, actDirective, 'Each phase should have unique directive text');
    assert.ok(planDirective.includes('text_response'), 'Plan directive must reference text_response');
    assert.ok(actDirective.includes('execute_js_code'), 'Act directive must reference execute_js_code');
});

console.log('🎉 Phase convention tests completed successfully.');
