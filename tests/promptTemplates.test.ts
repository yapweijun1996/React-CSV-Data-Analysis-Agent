import assert from 'node:assert/strict';
import { createChatPrompt } from '../services/promptTemplates';

const baseArgs = {
    columns: [],
    chatHistory: [],
    userPrompt: 'Help me understand revenue.',
    cardContext: [],
    language: 'English' as const,
    aiCoreAnalysisSummary: null,
    rawDataSample: [],
    longTermMemory: [],
    recentObservations: [],
    dataPreparationPlan: null,
    recentActionTraces: [],
};

const run = (name: string, fn: () => void) => {
    try {
        fn();
        console.log(`✅ ${name}`);
    } catch (error) {
        console.error(`❌ ${name}`);
        throw error;
    }
};

run('prompt instructs plan-state loop when no plan state present', () => {
    const prompt = createChatPrompt(
        baseArgs.columns,
        baseArgs.chatHistory,
        baseArgs.userPrompt,
        baseArgs.cardContext,
        baseArgs.language,
        baseArgs.aiCoreAnalysisSummary,
        baseArgs.rawDataSample,
        baseArgs.longTermMemory,
        baseArgs.recentObservations,
        null,
        baseArgs.dataPreparationPlan,
        baseArgs.recentActionTraces,
    );
    assert.ok(prompt.includes('Plan-State Loop'), 'should mention Plan-State Loop instructions');
    assert.ok(prompt.includes('No structured goal has been recorded yet'), 'should instruct agent to emit plan_state_update first');
});

run('prompt embeds current plan state snapshot when available', () => {
    const planState = {
        goal: 'Cut churn by 5%',
        contextSummary: 'Focused on APAC subscribers',
        progress: 'Identified top churn cohorts',
        nextSteps: ['Explore retention offers', 'Model churn vs tenure'],
        blockedBy: 'Need latest retention data',
        observationIds: ['obs-123'],
        confidence: 0.73,
        updatedAt: '2024-01-01T00:00:00.000Z',
    };
    const prompt = createChatPrompt(
        baseArgs.columns,
        baseArgs.chatHistory,
        baseArgs.userPrompt,
        baseArgs.cardContext,
        baseArgs.language,
        baseArgs.aiCoreAnalysisSummary,
        baseArgs.rawDataSample,
        baseArgs.longTermMemory,
        baseArgs.recentObservations,
        planState,
        baseArgs.dataPreparationPlan,
        baseArgs.recentActionTraces,
    );
    assert.ok(prompt.includes('Goal: Cut churn by 5%'), 'should echo plan goal');
    assert.ok(prompt.includes('Blocked By: Need latest retention data'), 'should include blocker details');
    assert.ok(prompt.includes('Next Steps'), 'should enumerate next steps');
    assert.ok(prompt.includes('Confidence: 0.73'), 'should include confidence value');
});

console.log('🎉 promptTemplates tests completed successfully.');
