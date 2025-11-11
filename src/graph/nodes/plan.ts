import type { PipelineContext, NodeResult } from './types';
import type { AiAction, AnalysisPlan } from '@/types';
import type { StepStatus } from '../schema';

const createPlanId = () => `plan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export const planNode = ({ state }: PipelineContext): NodeResult => {
    const pendingReply = state.pendingUserReply;
    if (!pendingReply) {
        return { state, actions: [], label: 'plan' };
    }
    const summary =
        pendingReply.optionId ??
        pendingReply.freeText ??
        pendingReply.question ??
        'user-choice';
    const readableSummary =
        pendingReply.freeText ||
        pendingReply.options.find(option => option.id === pendingReply.optionId)?.label ||
        pendingReply.optionId ||
        pendingReply.question;
    const planId = state.planId ?? createPlanId();
    const analysisPlan: AnalysisPlan = {
        chartType: 'bar',
        title: readableSummary ?? 'Custom Analysis',
        description: `Based on your selection ${readableSummary}`,
        aggregation: 'sum',
        groupByColumn: 'auto_inferred_column',
        valueColumn: 'auto_inferred_metric',
        defaultTopN: 8,
        defaultHideOthers: true,
    };
    const currentStepId = pendingReply.optionId ? `plan-${pendingReply.optionId}` : 'plan-custom';
    const step: { id: string; intent: string; label: string; status: StepStatus } = {
        id: currentStepId,
        intent: 'analysis',
        label: `执行：${readableSummary}`,
        status: 'in_progress',
    };
    const planAction: AiAction = {
        type: 'plan_state_update',
        responseType: 'plan_state_update',
        stepId: currentStepId,
        stateTag: `ts${Date.now().toString(36)}-plan`,
        timestamp: new Date().toISOString(),
        reason: `根据你的选择更新计划：${readableSummary}`,
        planState: {
            planId,
            goal: '完成你刚刚点选的分析任务',
            contextSummary: pendingReply.question,
            progress: `收到你的选择「${readableSummary}」，准备执行。`,
            nextSteps: [step],
            steps: [step],
            currentStepId,
            blockedBy: null,
            observationIds: [],
            confidence: 0.62,
            updatedAt: new Date().toISOString(),
            stateTag: `ts${Date.now().toString(36)}-planstate`,
        },
    };

    return {
        state: {
            ...state,
            planId,
            steps: [step],
            currentStepId,
            pendingPlan: {
                id: currentStepId,
                summary: readableSummary ?? summary,
                plan: analysisPlan,
                createdAt: new Date().toISOString(),
            },
            pendingUserReply: null,
        },
        actions: [planAction],
        label: 'plan',
    };
};
