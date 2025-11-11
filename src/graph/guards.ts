import type { AiAction, AgentActionType } from '@/types';
import { createGraphState, projectPlanStateIntoGraphState, validateStateTag, type GraphState } from './schema';

export type GuardViolationCode =
    | 'awaiting_user'
    | 'turn_budget_exceeded'
    | 'first_action_plan_required'
    | 'invalid_state_tag'
    | 'missing_plan_state'
    | 'atomic_type_invalid';

export interface GuardViolation {
    code: GuardViolationCode;
    message: string;
}

export interface GuardResult {
    ok: boolean;
    violations?: GuardViolation[];
    nextState?: GraphState;
    acceptedActions?: AiAction[];
}

const ATOMIC_ALLOWED: AgentActionType[] = [
    'text_response',
    'await_user',
    'dom_action',
    'execute_js_code',
    'proceed_to_analysis',
    'filter_spreadsheet',
    'clarification_request',
];

export const enforceTurnGuards = (state: GraphState, actions: AiAction[]): GuardResult => {
    if (!Array.isArray(actions) || actions.length === 0) {
        return { ok: true, nextState: state, acceptedActions: [] };
    }

    if (state.awaitingUser) {
        return violationResult('awaiting_user', 'Graph is waiting for user input; no actions can run.', state);
    }

    if (actions.length > 2) {
        return violationResult('turn_budget_exceeded', 'Each turn may include at most 2 actions.', state);
    }

    const planAction = actions[0];
    if (planAction.responseType !== 'plan_state_update') {
        return violationResult('first_action_plan_required', 'First action must be plan_state_update.', state);
    }

    if (!validateStateTag(planAction.stateTag)) {
        return violationResult('invalid_state_tag', 'plan_state_update is missing a valid stateTag.', state);
    }

    if (!planAction.planState) {
        return violationResult('missing_plan_state', 'plan_state_update is missing planState payload.', state);
    }

    const atomicAction = actions[1];
    if (atomicAction) {
        if (atomicAction.responseType === 'plan_state_update') {
            return violationResult('atomic_type_invalid', 'Second action must be atomic, not plan_state_update.', state);
        }
        if (!ATOMIC_ALLOWED.includes(atomicAction.responseType)) {
            return violationResult(
                'atomic_type_invalid',
                `Atomic action ${atomicAction.responseType} is not permitted in this turn.`,
                state,
            );
        }
        if (!validateStateTag(atomicAction.stateTag)) {
            return violationResult('invalid_state_tag', 'Atomic action is missing a valid stateTag.', state);
        }
    }

    const updatedState = deriveNextState(state, planAction, atomicAction);
    return {
        ok: true,
        nextState: updatedState,
        acceptedActions: actions,
    };
};

const deriveNextState = (prev: GraphState, planAction: AiAction, atomicAction?: AiAction): GraphState => {
    let nextState = projectPlanStateIntoGraphState(prev, planAction.planState);
    nextState = {
        ...nextState,
        stateTag: planAction.stateTag ?? nextState.stateTag,
        updatedAt: new Date().toISOString(),
    };
    const awaitingUser =
        Boolean(planAction.meta?.awaitUser) ||
        Boolean(planAction.planState?.blockedBy === 'awaiting_user_choice') ||
        Boolean(atomicAction?.meta?.awaitUser) ||
        atomicAction?.responseType === 'await_user';
    if (awaitingUser) {
        nextState = {
            ...nextState,
            awaitingUser: true,
            blockedBy: planAction.planState?.blockedBy ?? atomicAction?.reason ?? 'awaiting_user_choice',
            awaitPrompt: atomicAction?.awaitUserPayload ?? nextState.awaitPrompt,
            awaitPromptId: atomicAction?.awaitUserPayload?.promptId ?? nextState.awaitPromptId,
        };
    } else {
        nextState = {
            ...nextState,
            awaitingUser: false,
            blockedBy: planAction.planState?.blockedBy ?? null,
            awaitPrompt: null,
            awaitPromptId: null,
        };
    }
    return nextState;
};

const violationResult = (code: GuardViolationCode, message: string, state: GraphState): GuardResult => ({
    ok: false,
    violations: [{ code, message }],
    nextState: state,
});

export const createGuardState = (sessionId?: string): GraphState => createGraphState(sessionId);
