import type { AgentSchemaPhase } from '@/types';

export interface PhaseConvention {
    phase: AgentSchemaPhase;
    title: string;
    summary: string;
    expectations: string[];
}

const PHASE_CONVENTIONS: Record<AgentSchemaPhase, PhaseConvention> = {
    plan: {
        phase: 'plan',
        title: 'Plan Primer',
        summary:
            'During the PLAN phase you are only confirming the mission. Emit exactly two actions in this order: (1) plan_state_update capturing the refreshed plan tracker, (2) text_response that acknowledges the plan and next steps. Do not run tools or code yet.',
        expectations: [
            'The plan_state_update includes planId, goal, contextSummary, progress, currentStepId, nextSteps, steps, blockedBy, observationIds, confidence, updatedAt, stateTag.',
            'The text_response should reassure the user that their request is understood and restate what happens next.',
            'No execute_js_code, dom_action, or proceed_to_analysis actions are allowed in this phase.',
        ],
    },
    talk: {
        phase: 'talk',
        title: 'Conversation & Clarification',
        summary:
            'During the TALK phase you keep the user in the loop or gather missing info. Start with a plan_state_update when the context changes, then follow with a conversational action such as text_response, clarification_request, or await_user.',
        expectations: [
            'Never emit execute_js_code or dom_action in the TALK phase.',
            'If you must wait for the user, use await_user with clear choices; otherwise answer with text_response.',
            'Reuse the existing planId and progress when nothing has changed rather than inventing a new plan.',
        ],
    },
    act: {
        phase: 'act',
        title: 'Action & Tool Execution',
        summary:
            'During the ACT phase you must pair a plan_state_update with a single atomic tool call. Keep the planner in sync, then run exactly one action such as execute_js_code, proceed_to_analysis, filter_spreadsheet, or a dom_action that fulfills the current step.',
        expectations: [
            'When emitting execute_js_code you must provide runnable JavaScript in code.jsFunctionBody that mutates the data array and returns it.',
            'If you are removing or adjusting cards, prefer dom_action with the correct toolName and target metadata.',
            'Keep the action list to two entries max (plan_state_update plus one tool call) so the runtime can stream progress safely.',
        ],
    },
};

const DEFAULT_PHASE: AgentSchemaPhase = 'talk';

export const describePhaseConvention = (phase?: AgentSchemaPhase): string => {
    const convention = phase ? PHASE_CONVENTIONS[phase] : PHASE_CONVENTIONS[DEFAULT_PHASE];
    const bulletList = convention.expectations.map(expectation => `- ${expectation}`).join('\n');
    return `Phase directive — ${convention.title}:\n${convention.summary}\n${bulletList}`;
};

export const listPhaseConventions = (): PhaseConvention[] => Object.values(PHASE_CONVENTIONS);
