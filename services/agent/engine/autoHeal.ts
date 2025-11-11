import type { AiAction, AgentPlanState, AgentPlanStep, AgentActionType } from '../../../types';
import type { AutoHealOutcome, EngineContext } from './contracts';

const FALLBACK_STEP_ID = 'ad_hoc_response';
const CANONICAL_ACTION_TYPES: AgentActionType[] = [
    'text_response',
    'plan_creation',
    'dom_action',
    'execute_js_code',
    'proceed_to_analysis',
    'filter_spreadsheet',
    'clarification_request',
    'plan_state_update',
];

const ACTION_TYPE_ALIASES: Record<string, AgentActionType> = {
    plan_update: 'plan_state_update',
    planstateupdate: 'plan_state_update',
    domaction: 'dom_action',
    agent_action: 'text_response',
    agentaction: 'text_response',
    respond: 'text_response',
};


const canonicalizeActionType = (raw?: string | null): AgentActionType | null => {
    if (!raw) return null;
    const normalized = raw.trim().toLowerCase();
    if (!normalized) return null;
    const canonical = ACTION_TYPE_ALIASES[normalized] ?? CANONICAL_ACTION_TYPES.find(value => value === normalized);
    return (canonical as AgentActionType | undefined) ?? null;
};

const inferActionTypeFromPayload = (action: AiAction): AgentActionType => {
    if (action.domAction) return 'dom_action';
    if (action.code) return 'execute_js_code';
    if (action.plan) return 'plan_creation';
    if (action.args) return 'filter_spreadsheet';
    if (action.clarification) return 'clarification_request';
    return 'text_response';
};


const coerceActionType = (action: AiAction): AgentActionType => {
    const preferred = canonicalizeActionType(action.responseType) ?? canonicalizeActionType(action.type);
    const canonical = preferred ?? inferActionTypeFromPayload(action);
    action.type = canonical;
    action.responseType = canonical;
    return canonical;
};

const deriveStepId = (planState: AgentPlanState | null, pendingSteps: AgentPlanStep[]): string => {
    if (planState?.currentStepId && isValidStepId(planState.currentStepId)) {
        return planState.currentStepId.trim();
    }
    const firstPending = pendingSteps.find(step => isValidStepId(step?.id));
    if (firstPending) {
        return firstPending.id.trim();
    }
    return FALLBACK_STEP_ID;
};

const createFallbackStep = (): AgentPlanStep => ({
    id: FALLBACK_STEP_ID,
    label: 'Respond directly to the latest request.',
    intent: 'conversation',
    status: 'ready',
});

const isValidStepId = (value?: string | null): value is string => {
    return typeof value === 'string' && value.trim().length >= 3;
};

const sanitizeSteps = (steps?: AgentPlanStep[] | null): AgentPlanStep[] => {
    if (!Array.isArray(steps)) return [];
    const seen = new Set<string>();
    const sanitized: AgentPlanStep[] = [];
    for (const step of steps) {
        const id = typeof step?.id === 'string' ? step.id.trim() : '';
        const label = typeof step?.label === 'string' ? step.label.trim() : '';
        if (id.length < 3 || label.length < 3 || seen.has(id)) continue;
        const intent = typeof step?.intent === 'string' && step.intent.trim().length > 0 ? step.intent.trim() : step?.intent;
        const status = step?.status ?? 'ready';
        sanitized.push({ id, label, intent, status });
        seen.add(id);
    }
    return sanitized;
};

const buildScaffoldPlan = (context: EngineContext, mintStateTag: () => string): AgentPlanState => {
    const fallbackStep = createFallbackStep();
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
    let steps = sanitizeSteps(scaffold.steps);
    let nextSteps = sanitizeSteps(scaffold.nextSteps);
    if (nextSteps.length === 0) {
        nextSteps = steps.length > 0 ? steps : [createFallbackStep()];
    }
    if (steps.length === 0) {
        steps = nextSteps;
    }

    let canonicalStepId = isValidStepId(scaffold.currentStepId) ? scaffold.currentStepId!.trim() : nextSteps[0].id;
    if (!steps.some(step => step.id === canonicalStepId)) {
        steps = [{ ...nextSteps[0], id: canonicalStepId, status: nextSteps[0].status ?? 'ready' }, ...steps];
    }
    if (!nextSteps.some(step => step.id === canonicalStepId)) {
        nextSteps = [{ ...steps[0], id: canonicalStepId, status: steps[0].status ?? 'ready' }, ...nextSteps];
    }

    return {
        ...scaffold,
        planId: scaffold.planId ?? `plan-${Date.now().toString(36)}`,
        currentStepId: canonicalStepId,
        nextSteps,
        steps,
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
        let planIndex = nextActions.findIndex(action => {
            const inferred = action.type ?? action.responseType;
            return inferred === 'plan_state_update';
        });
        if (planIndex === -1) {
            nextActions.unshift({
                type: 'plan_state_update',
                responseType: 'plan_state_update',
                stepId: FALLBACK_STEP_ID,
                stateTag: mintStateTag('plan'),
                reason: 'Seeding plan tracker automatically.',
                planState: buildScaffoldPlan(context, () => mintStateTag('plan')),
            });
            mutated = true;
            notes.push('Inserted plan_state_update because no active plan was found.');
            planIndex = 0;
        }
        if (planIndex > 0) {
            const [planAction] = nextActions.splice(planIndex, 1);
            nextActions.unshift(planAction);
            mutated = true;
            notes.push('Moved plan_state_update to the beginning of the turn.');
        }
        const leadingPlan = nextActions[0];
        leadingPlan.planState = normalizePlanPayload(leadingPlan.planState, context, () => mintStateTag('plan'));
        leadingPlan.stepId = leadingPlan.stepId ?? leadingPlan.planState?.currentStepId ?? FALLBACK_STEP_ID;
        if (!leadingPlan.stateTag) {
            leadingPlan.stateTag = mintStateTag('plan');
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
