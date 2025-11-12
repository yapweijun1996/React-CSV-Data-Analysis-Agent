import type { PipelineContext, NodeResult } from './types';
import type { AiAction, AnalysisPlan } from '@/types';
import type { PendingPlanSummary } from '../schema';

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
    const planCreationAction: AiAction = {
        type: 'plan_creation',
        responseType: 'plan_creation',
        stepId: pendingPlan.id,
        stateTag: `ts${Date.now().toString(36)}-act`,
        timestamp: new Date().toISOString(),
        reason: `根据选择「${pendingPlan.summary}」创建分析计划`,
        plan: pendingPlan.plan,
    };

    const removalTransform = buildRemovalTransformAction(pendingPlan) ?? null;
    const nextActsUsed = Math.min(state.loopBudget.maxActs, state.loopBudget.actsUsed + 1);
    const nextLoopBudget = {
        ...state.loopBudget,
        actsUsed: nextActsUsed,
        exceeded: nextActsUsed >= state.loopBudget.maxActs,
    };
    const actions: AiAction[] = [planCreationAction];
    if (removalTransform) {
        actions.push(removalTransform);
    }

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
        actions,
        label: 'act',
    };
};

const buildRemovalTransformAction = (pendingPlan: PendingPlanSummary): AiAction | null => {
    if (pendingPlan.intent !== 'remove_rows' || !pendingPlan.plan) {
        return null;
    }
    const plan = pendingPlan.plan;
    const metadata = (pendingPlan.metadata ?? {}) as {
        column?: string;
        values?: unknown[];
    };
    const column =
        typeof metadata.column === 'string' && metadata.column.trim().length > 0
            ? metadata.column.trim()
            : typeof plan.rowFilter?.column === 'string'
              ? plan.rowFilter.column
              : null;
    const valueSource = Array.isArray(metadata.values) ? metadata.values : plan.rowFilter?.values ?? [];
    const values = valueSource
        .map(value => (value != null ? String(value).trim() : ''))
        .filter(value => value.length > 0);
    if (!column || values.length === 0) {
        return null;
    }

    const explanation = `从数据集中移除 ${column} 匹配 ${values.join(', ')} 的记录。`;
    const body = `
const blocked = new Set(${JSON.stringify(values.map(value => value.toLowerCase()))});
return data.filter(row => {
    const cell = row[${JSON.stringify(column)}];
    return !blocked.has(String(cell ?? '').toLowerCase());
});
    `.trim();
    return {
        type: 'execute_js_code',
        responseType: 'execute_js_code',
        stepId: `remove-${column.toLowerCase()}`,
        stateTag: `ts${Date.now().toString(36)}-transform`,
        timestamp: new Date().toISOString(),
        reason: `执行删除：${column} ∉ {${values.join(', ')}}`,
        code: {
            explanation,
            jsFunctionBody: body,
        },
        meta: {
            toolCall: undefined,
            removalContext: {
                column,
                values,
            },
        },
    };
};
