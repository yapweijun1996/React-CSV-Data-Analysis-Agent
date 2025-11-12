import type { AiAction, AgentPlanState, AgentPlanStep, AgentActionType } from '../../../types';
import type { AutoHealOutcome, EngineContext } from './contracts';

const FALLBACK_STEP_ID = 'ad_hoc_response';
const createPromptInteractionId = (): string =>
    `prompt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const CANONICAL_ACTION_TYPES: AgentActionType[] = [
    'text_response',
    'await_user',
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

const FALLBACK_REASONS: Partial<Record<AgentActionType, string>> = {
    plan_state_update: 'Auto-initialized plan tracker to keep progress visible.',
    text_response: 'Auto-generated acknowledgement to keep the chat responsive.',
    await_user: 'Pausing to gather your clarification before continuing.',
    plan_creation: 'Creating the requested analysis plan.',
    dom_action: 'Executing the requested UI adjustment.',
    execute_js_code: 'Running the requested data transformation.',
    proceed_to_analysis: 'Proceeding with the pending analysis step.',
    filter_spreadsheet: 'Applying the requested data filter.',
    clarification_request: 'Need an answer to continue with the plan.',
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
    if (action.meta?.awaitUser) return 'await_user';
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

    const fallbackSummarySource = typeof context.userMessage === 'string' ? context.userMessage.slice(0, 200) : '';
    const normalizedSummary =
        typeof scaffold.contextSummary === 'string' && scaffold.contextSummary.trim().length > 0
            ? scaffold.contextSummary
            : fallbackSummarySource || 'User intent pending clarification.';

    const updatedAtValue =
        typeof scaffold.updatedAt === 'string' && scaffold.updatedAt.trim().length > 0
            ? scaffold.updatedAt
            : new Date().toISOString();

    return {
        ...scaffold,
        planId: scaffold.planId ?? `plan-${Date.now().toString(36)}`,
        currentStepId: canonicalStepId,
        nextSteps,
        steps,
        contextSummary: normalizedSummary,
        updatedAt: updatedAtValue,
        stateTag: scaffold.stateTag ?? mintStateTag(),
    };
};

const ensureEnvelopeDefaults = (action: AiAction): void => {
    if (action.intentContract === undefined) action.intentContract = null;
    if (action.meta === undefined) action.meta = { awaitUser: false, haltAfter: false, resumePlanner: false, promptId: '' };
    if (action.planState === undefined) action.planState = null;
    if (action.text === undefined) action.text = null as any;
    if (action.cardId === undefined) action.cardId = null as any;
    if (action.awaitUserPayload === undefined) action.awaitUserPayload = null;
    if (action.plan === undefined) action.plan = null as any;
    if (action.domAction === undefined) action.domAction = null as any;
    if (action.code === undefined) action.code = null as any;
    if (action.args === undefined) action.args = null as any;
    if (action.clarification === undefined) action.clarification = null as any;
};

const ensurePlanStateCompliance = (
    action: AiAction,
    context: EngineContext,
    mintStateTag: (hint?: string) => string,
    notes: string[],
    warnings: string[],
): void => {
    if (action.responseType !== 'plan_state_update') return;
    const hadPlanState = Boolean(action.planState);
    action.planState = normalizePlanPayload(action.planState, context, () => mintStateTag('plan'));
    if (!hadPlanState) {
        warnings.push('plan_state_update missing planState; auto-generated scaffold.');
    }
    if (!action.planState.nextSteps || action.planState.nextSteps.length === 0) {
        action.planState.nextSteps = action.planState.steps?.length
            ? action.planState.steps
            : [createFallbackStep()];
        notes.push('Backfilled nextSteps for plan_state_update.');
    }
};

const ensureDomTarget = (action: AiAction, notes: string[], warnings: string[]): void => {
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
        warnings.push('DOM payload missing target; downgraded to text response.');
        action.domAction = undefined;
        action.responseType = 'text_response';
        action.type = 'text_response';
        action.text = 'Target not found, please select.';
    }
};

interface AutoHealOptions {
    stampOnly?: boolean;
    maxActions?: number;
}

export const runAutoHealPipeline = (
    actions: AiAction[],
    context: EngineContext,
    mintStateTag: (hint?: string) => string,
    options?: AutoHealOptions,
): AutoHealOutcome => {
    const nextActions = [...actions];
    const notes: string[] = [];
    const warnings: string[] = [];
    let mutated = false;

    const stampOnly = Boolean(options?.stampOnly);
    const maxActions = options?.maxActions ?? null;

    const applyPlanOnlyStamp = (action: AiAction) => {
        if (!action.stateTag) {
            action.stateTag = mintStateTag(action.responseType ?? 'plan_state_update');
            mutated = true;
            notes.push(`Stamped stateTag for ${action.responseType ?? 'action'}.`);
        }
        if (action.responseType === 'plan_state_update') {
            ensurePlanStateCompliance(action, context, mintStateTag, notes, warnings);
        }
    };

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
    const enforceActionLimit = (limit: number | null | undefined) => {
        if (typeof limit !== 'number' || limit < 1) return;
        if (nextActions.length <= limit) return;
        nextActions.splice(limit);
        mutated = true;
        const trimmedCount = nextActions.length - limit;
        notes.push(`Trimmed actions to max=${limit}. Initial count exceeded by ${trimmedCount}.`);
    };
    enforceActionLimit(maxActions);

    if (stampOnly) {
        nextActions.forEach(applyPlanOnlyStamp);
        return {
            actions: nextActions,
            report: { mutated, notes, warnings },
        };
    }

    const currentStepId = deriveStepId(context.planState, context.pendingSteps);
    const backfillAtomicPayloads = (action: AiAction, type: AgentActionType) => {
        if (type === 'await_user') {
            action.meta = action.meta ?? { awaitUser: true, haltAfter: true, resumePlanner: false, promptId: createPromptInteractionId() };
            if (!action.meta.promptId) {
                action.meta.promptId = createPromptInteractionId();
            }
        }
    };

    nextActions.forEach(action => {
        const type = coerceActionType(action);
        ensureEnvelopeDefaults(action);
        const trimmedReason = typeof action.reason === 'string' ? action.reason.trim() : '';
        if (trimmedReason) {
            action.reason = trimmedReason;
        } else {
            action.reason = FALLBACK_REASONS[type] ?? `Auto-filled rationale for ${type}.`;
            mutated = true;
            notes.push(`Filled missing reason for ${type}.`);
        }

        if (type === 'plan_state_update') {
            ensurePlanStateCompliance(action, context, mintStateTag, notes, warnings);
            action.stepId = action.stepId ?? action.planState?.currentStepId ?? currentStepId;
        } else {
            if (!action.stepId || action.stepId.trim().length < 3) {
                action.stepId = currentStepId;
                mutated = true;
                notes.push(`Attached stepId=${currentStepId} to ${type}.`);
            }
            backfillAtomicPayloads(action, type);
        }

        if (!action.stateTag) {
            action.stateTag = mintStateTag(type);
            mutated = true;
        }

        ensureDomTarget(action, notes, warnings);
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
