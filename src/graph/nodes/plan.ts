import type { PipelineContext, NodeResult } from './types';
import type { AiAction, AnalysisPlan, GraphToolCall } from '@/types';
import type { GraphObservation, StepStatus } from '../schema';
import { getGraphToolSpec } from '../toolSpecs';
import type { LangChainPlanGraphPayload } from '@/services/langchain/types';
import { isLangChainPlanGraphPayload } from '@/services/langchain/types';

const createPlanId = () => `plan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const MAX_OBSERVATIONS = 20;

const createToolAction = (spec: {
    toolCall: GraphToolCall;
    stepId: string;
    reason: string;
    text: string;
}): AiAction => ({
    type: 'execute_js_code',
    responseType: 'execute_js_code',
    stepId: spec.stepId,
    stateTag: `ts${Date.now().toString(36)}-tool`,
    timestamp: new Date().toISOString(),
    reason: spec.reason,
    text: spec.text,
    meta: {
        toolCall: spec.toolCall,
    },
    toolCall: spec.toolCall,
});

const trimObservations = (existing: GraphObservation[], next: GraphObservation): GraphObservation[] => {
    const updated = [...existing, next];
    return updated.length > MAX_OBSERVATIONS ? updated.slice(updated.length - MAX_OBSERVATIONS) : updated;
};

const extractLangChainPlan = (payload?: Record<string, unknown>): LangChainPlanGraphPayload | null => {
    if (!payload) return null;
    const candidate = (payload as { langChainPlan?: unknown }).langChainPlan;
    return isLangChainPlanGraphPayload(candidate) ? candidate : null;
};

const handleLangChainPlan = (state: PipelineContext['state'], plan: LangChainPlanGraphPayload): NodeResult => {
    const planAction: AiAction = {
        type: 'plan_state_update',
        responseType: 'plan_state_update',
        stepId: plan.stepId,
        stateTag: `ts${Date.now().toString(36)}-plan`,
        timestamp: new Date().toISOString(),
        reason: `LangChain 计划完成：${plan.summary}`,
        planState: plan.planState,
        meta: {
            source: 'langchain',
            telemetry: plan.telemetry,
        },
    };

    const pendingPlanEntry = {
        id: plan.stepId,
        summary: plan.summary,
        plan: plan.plan,
        createdAt: new Date().toISOString(),
    };

    const observation: GraphObservation = {
        id: `langchain-plan-${Date.now().toString(36)}`,
        kind: 'langchain_plan',
        payload: {
            summary: plan.summary,
            telemetry: plan.telemetry,
        },
        at: new Date().toISOString(),
    };

    return {
        state: {
            ...state,
            planId: plan.planId,
            steps: plan.planState.steps ?? state.steps,
            currentStepId: plan.planState.currentStepId ?? plan.stepId,
            pendingPlan: pendingPlanEntry,
            pendingUserReply: null,
            observations: trimObservations(state.observations, observation),
        },
        actions: [planAction],
        label: 'plan',
    };
};

export const planNode = ({ state, payload }: PipelineContext): NodeResult => {
    const pendingReply = state.pendingUserReply;
    if (!pendingReply) {
        return { state, actions: [], label: 'plan' };
    }

    const langChainPlan = extractLangChainPlan(payload);
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
    const toolSpec = pendingReply.optionId ? getGraphToolSpec(pendingReply.optionId) : undefined;

    if (!toolSpec && langChainPlan) {
        return handleLangChainPlan(state, langChainPlan);
    }

    const shouldCreatePlan = !toolSpec;
    const analysisPlan: AnalysisPlan = shouldCreatePlan
        ? {
              chartType: 'bar',
              title: readableSummary ?? 'Custom Analysis',
              description: `Based on your selection ${readableSummary}`,
              aggregation: 'sum',
              groupByColumn: 'auto_inferred_column',
              valueColumn: 'auto_inferred_metric',
              defaultTopN: 8,
              defaultHideOthers: true,
          }
        : {
              chartType: 'bar',
              title: readableSummary ?? 'Data operation',
              description: readableSummary ?? 'Data operation',
              aggregation: 'count',
              groupByColumn: 'auto_inferred_column',
              valueColumn: 'auto_inferred_metric',
          };
    const currentStepId = toolSpec?.stepId ?? (pendingReply.optionId ? `plan-${pendingReply.optionId}` : 'plan-custom');
    const step: { id: string; intent: string; label: string; status: StepStatus } = toolSpec
        ? {
              id: currentStepId,
              intent: toolSpec.stepIntent,
              label: toolSpec.stepLabel,
              status: 'in_progress',
          }
        : {
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
            goal: toolSpec?.planGoal ?? '完成你刚刚点选的分析任务',
            contextSummary: pendingReply.question,
            progress:
                toolSpec?.planProgress ?? `收到你的选择「${readableSummary}」，准备执行。`,
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

    const actions: AiAction[] = [planAction];
    if (toolSpec) {
        actions.push(
            createToolAction({
                toolCall: toolSpec.toolCall,
                stepId: toolSpec.stepId,
                reason: toolSpec.reason,
                text: toolSpec.text,
            }),
        );
    }

    const pendingPlanEntry = shouldCreatePlan
        ? {
              id: currentStepId,
              summary: readableSummary ?? summary,
              plan: analysisPlan,
              createdAt: new Date().toISOString(),
          }
        : null;

    return {
        state: {
            ...state,
            planId,
            steps: [step],
            currentStepId,
            pendingPlan: pendingPlanEntry,
            pendingUserReply: null,
        },
        actions,
        label: 'plan',
    };
};
