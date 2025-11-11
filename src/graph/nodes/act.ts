import type { PipelineContext, NodeResult } from './types';
import type { AiAction } from '@/types';

export const actNode = ({ state }: PipelineContext): NodeResult => {
    const pendingPlan = state.pendingPlan;
    if (!pendingPlan || !pendingPlan.plan) {
        return { state, actions: [], label: 'act' };
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
    return {
        state: {
            ...state,
            pendingPlan: null,
            pendingVerification: {
                id: pendingPlan.id,
                description: pendingPlan.summary,
                createdAt: new Date().toISOString(),
            },
        },
        actions: [action],
        label: 'act',
    };
};
