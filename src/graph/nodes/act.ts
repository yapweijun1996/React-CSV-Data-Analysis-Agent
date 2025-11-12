import type { PipelineContext, NodeResult } from './types';
import type { AiAction } from '@/types';

export const actNode = ({ state }: PipelineContext): NodeResult => {
    const pendingPlan = state.pendingPlan;
    if (!pendingPlan || !pendingPlan.plan) {
        return {
            state: {
                ...state,
                phase: 'act',
            },
            actions: [],
            label: 'act',
        };
    }
    const action: AiAction = {
        type: 'plan_creation',
        responseType: 'plan_creation',
        stepId: pendingPlan.id,
        stateTag: `ts${Date.now().toString(36)}-act`,
        timestamp: new Date().toISOString(),
        reason: `根据选择「${pendingPlan.summary}」创建分析计划`,
        plan: pendingPlan.plan,
    };
    const nextActsUsed = Math.min(state.loopBudget.maxActs, state.loopBudget.actsUsed + 1);
    const nextLoopBudget = {
        ...state.loopBudget,
        actsUsed: nextActsUsed,
        exceeded: nextActsUsed >= state.loopBudget.maxActs,
    };

    return {
        state: {
            ...state,
            phase: 'act',
            pendingPlan: pendingPlan,
            pendingVerification: {
                id: pendingPlan.id,
                description: pendingPlan.summary,
                meta: null,
                summary: pendingPlan.summary,
                payload: null,
                createdAt: new Date().toISOString(),
            },
            loopBudget: nextLoopBudget,
        },
        actions: [action],
        label: 'act',
    };
};
