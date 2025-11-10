import type { AiAction, AgentPlanState, AgentPlanStep } from '../../../types';
import type { AutoHealOutcome, EngineContext } from './contracts';

const FALLBACK_STEP_ID = 'ad_hoc_response';

const coerceActionType = (action: AiAction): string => {
    if (action.type) {
        action.responseType = action.responseType ?? action.type;
        return action.type;
    }
    if (action.responseType) {
        action.type = action.responseType;
        return action.responseType;
    }
    const inferred =
        action.domAction ? 'dom_action' : action.code ? 'execute_js_code' : action.plan ? 'plan_creation' : 'text_response';
    action.type = inferred;
    action.responseType = inferred;
    return inferred;
};

const deriveStepId = (planState: AgentPlanState | null, pendingSteps: AgentPlanStep[]): string => {
    if (planState?.currentStepId) {
        return planState.currentStepId;
    }
    if (pendingSteps.length > 0) {
        return pendingSteps[0].id;
    }
    return FALLBACK_STEP_ID;
};

const buildScaffoldPlan = (context: EngineContext, mintStateTag: () => string): AgentPlanState => {
    const fallbackStep: AgentPlanStep = {
        id: FALLBACK_STEP_ID,
        label: 'Respond directly to the latest request.',
        intent: 'conversation',
        status: 'ready',
    };
    return {
        planId: `plan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        goal: context.detectedIntent?.intent
            ? `Address user intent: ${context.detectedIntent.intent}`
            : 'Acknowledge the user and clarify analysis goals.',
        contextSummary: context.userMessage.slice(0, 200),
        progress: 'Initialized plan scaffold automatically.',
        nextSteps: [fallbackStep],
        steps: [fallbackStep],
        currentStepId: fallbackStep.id,
        blockedBy: null,
        observationIds: [],
        confidence: 0.6,
        updatedAt: new Date(context.now).toISOString(),
        stateTag: mintStateTag(),
    };
};

const normalizePlanPayload = (
    planState: AgentPlanState | undefined,
    context: EngineContext,
    mintStateTag: () => string,
): AgentPlanState => {
    const scaffold = planState ?? buildScaffoldPlan(context, mintStateTag);
    const nextSteps = Array.isArray(scaffold.nextSteps) && scaffold.nextSteps.length > 0
        ? scaffold.nextSteps
        : [
              {
                  id: FALLBACK_STEP_ID,
                  label: 'Respond directly to the latest request.',
                  intent: 'conversation',
                  status: 'ready',
              },
          ];

    return {
        ...scaffold,
        planId: scaffold.planId ?? `plan-${Date.now().toString(36)}`,
        currentStepId: scaffold.currentStepId ?? nextSteps[0].id,
        nextSteps,
        steps: scaffold.steps && scaffold.steps.length > 0 ? scaffold.steps : nextSteps,
        updatedAt: scaffold.updatedAt ?? new Date().toISOString(),
        stateTag: scaffold.stateTag ?? mintStateTag(),
    };
};

const ensureDomTarget = (action: AiAction, notes: string[]): void => {
    if (action.responseType !== 'dom_action' || !action.domAction) {
        return;
    }
    const args = action.domAction.args ?? (action.domAction.args = {});
    const target = action.domAction.target ?? (action.domAction.target = {});
    if (!target.byId && typeof args.cardId === 'string') {
        target.byId = args.cardId;
    }
    if (!target.byTitle && typeof args.cardTitle === 'string') {
        target.byTitle = args.cardTitle;
    }
    if (!target.byId && !target.byTitle && !target.selector) {
        notes.push('DOM payload missing target; downgraded to text response.');
        action.domAction = undefined;
        action.responseType = 'text_response';
        action.type = 'text_response';
        action.text = 'Target not found, please select.';
    }
};

export const runAutoHealPipeline = (
    actions: AiAction[],
    context: EngineContext,
    mintStateTag: (hint?: string) => string,
): AutoHealOutcome => {
    const nextActions = [...actions];
    const notes: string[] = [];
    const warnings: string[] = [];
    let mutated = false;

    const ensurePlanPresence = (): void => {
        const hasPlanAction = nextActions.some(action => (action.type ?? action.responseType) === 'plan_state_update');
        if (!context.planState && !hasPlanAction) {
            nextActions.unshift({
                type: 'plan_state_update',
                responseType: 'plan_state_update',
                stepId: FALLBACK_STEP_ID,
                stateTag: mintStateTag('plan'),
                thought: 'Seeding plan tracker automatically.',
                planState: buildScaffoldPlan(context, () => mintStateTag('plan')),
            });
            mutated = true;
            notes.push('Inserted plan_state_update because no active plan was found.');
        }
    };

    ensurePlanPresence();

    const currentStepId = deriveStepId(context.planState, context.pendingSteps);
    nextActions.forEach(action => {
        const type = coerceActionType(action);

        if (type === 'plan_state_update') {
            action.planState = normalizePlanPayload(action.planState, context, () => mintStateTag('plan'));
            action.stepId = action.stepId ?? action.planState?.currentStepId ?? currentStepId;
        } else {
            if (!action.stepId || action.stepId.trim().length < 3) {
                action.stepId = currentStepId;
                mutated = true;
                notes.push(`Attached stepId=${currentStepId} to ${type}.`);
            }
        }

        if (!action.stateTag) {
            action.stateTag = mintStateTag(type);
            mutated = true;
        }

        ensureDomTarget(action, notes);
    });

    return {
        actions: nextActions,
        report: {
            mutated,
            notes,
            warnings,
        },
    };
};
