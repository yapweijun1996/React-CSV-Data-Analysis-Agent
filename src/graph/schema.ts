import type {
    AgentPlanStep,
    AgentPlanState,
    AwaitUserPayload,
    AwaitUserOption,
    AnalysisPlan,
} from '@/types';

export type StepStatus = 'ready' | 'in_progress' | 'done';

export interface PendingUserReplySnapshot {
    optionId: string | null;
    freeText: string | null;
    promptId: string | null;
    question: string;
    options: AwaitUserOption[];
    at: string;
}

export interface PendingPlanSummary {
    id: string;
    summary: string;
    plan: AnalysisPlan | null;
    createdAt: string;
}

export interface PendingVerificationSummary {
    id: string;
    description: string;
    createdAt: string;
}

export interface GraphObservation {
    id: string;
    kind: string;
    payload: Record<string, unknown> | null;
    at: string;
}

export interface GraphState {
    sessionId: string;
    planId: string | null;
    stateTag: string;
    awaitingUser: boolean;
    awaitPrompt: AwaitUserPayload | null;
    awaitPromptId: string | null;
    pendingUserReply: PendingUserReplySnapshot | null;
    pendingPlan: PendingPlanSummary | null;
    pendingVerification: PendingVerificationSummary | null;
    steps: Array<{ id: string; intent: string; label: string; status: StepStatus }>;
    currentStepId: string | null;
    blockedBy: string | null;
    observations: GraphObservation[];
    viewIds: string[];
    warnings: string[];
    updatedAt: string;
}

const DEFAULT_STATE_TAG = 'context_ready';

const createSessionId = () =>
    (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);

export const createGraphState = (sessionId?: string, overrides?: Partial<GraphState>): GraphState => {
    const now = new Date().toISOString();
    const base: GraphState = {
        sessionId: sessionId ?? createSessionId(),
        planId: null,
        stateTag: DEFAULT_STATE_TAG,
        awaitingUser: false,
        awaitPrompt: null,
        awaitPromptId: null,
        pendingUserReply: null,
        pendingPlan: null,
        pendingVerification: null,
        steps: [],
        currentStepId: null,
        blockedBy: null,
        observations: [],
        viewIds: [],
        warnings: [],
        updatedAt: now,
    };
    return {
        ...base,
        ...overrides,
        steps: overrides?.steps ?? base.steps,
        observations: overrides?.observations ?? base.observations,
        viewIds: overrides?.viewIds ?? base.viewIds,
        warnings: overrides?.warnings ?? base.warnings,
    };
};

const PLAN_STEP_STATUSES: StepStatus[] = ['ready', 'in_progress', 'done'];

const isKnownStateTag = (tag: string): boolean => {
    if (!tag) return false;
    if (['context_ready', 'awaiting_clarification', 'needs_clarification'].includes(tag)) return true;
    return (
        /^\d{5,}-\d+$/.test(tag) || // legacy minted tag
        /^ts[0-9a-z]{2,}-[0-9a-z_-]+$/i.test(tag)
    );
};

export const normalizePlanSteps = (steps?: AgentPlanStep[] | null): GraphState['steps'] => {
    if (!Array.isArray(steps)) return [];
    const seen = new Set<string>();
    const normalized: GraphState['steps'] = [];
    steps.forEach(step => {
        const id = typeof step?.id === 'string' ? step.id.trim() : '';
        const label = typeof step?.label === 'string' ? step.label.trim() : '';
        const intent = typeof step?.intent === 'string' ? step.intent.trim() : 'conversation';
        if (id.length < 3 || label.length < 3 || seen.has(id)) return;
        const status = PLAN_STEP_STATUSES.includes(step.status as StepStatus) ? (step.status as StepStatus) : 'ready';
        normalized.push({ id, label, intent, status });
        seen.add(id);
    });
    return normalized;
};

export const projectPlanStateIntoGraphState = (
    state: GraphState,
    planState?: AgentPlanState,
): GraphState => {
    if (!planState) {
        return state;
    }
    const steps = normalizePlanSteps(planState.steps ?? planState.nextSteps);
    const currentStepId =
        typeof planState.currentStepId === 'string' && planState.currentStepId.trim().length >= 3
            ? planState.currentStepId.trim()
            : steps[0]?.id ?? state.currentStepId;
    const planId =
        typeof planState.planId === 'string' && planState.planId.trim().length >= 3
            ? planState.planId.trim()
            : state.planId;

    return {
        ...state,
        planId,
        steps,
        currentStepId,
        blockedBy: planState.blockedBy ?? state.blockedBy,
        stateTag: planState.stateTag && isKnownStateTag(planState.stateTag) ? planState.stateTag : state.stateTag,
        updatedAt: new Date().toISOString(),
        awaitPrompt: state.awaitPrompt,
        awaitPromptId: state.awaitPromptId,
        pendingUserReply: state.pendingUserReply,
    };
};

export const validateStateTag = (tag: string | undefined | null): boolean => {
    if (!tag) return false;
    return isKnownStateTag(tag);
};
