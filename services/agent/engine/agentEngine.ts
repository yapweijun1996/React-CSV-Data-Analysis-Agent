import type { AiAction, AiChatResponse } from '../../../types';
import type { EngineActionCandidate, EngineContext, EnginePlaybook } from './contracts';
import { lookupToolProfile } from './toolRegistry';
import { selectPlaybookForIntent } from './playbooks';
import { runAutoHealPipeline } from './autoHeal';
import { StateTagFactory } from '../stateTagFactory';

const riskWeight: Record<string, number> = { low: 0.1, medium: 0.4, high: 0.9 };
const latencyWeight: Record<string, number> = { short: 0.1, medium: 0.3, long: 0.7 };

const intentMatchesAction = (intent: string | undefined, action: AiAction): boolean => {
    if (!intent) return false;
    if (intent === 'remove_card') {
        return action.responseType === 'dom_action' && action.domAction?.toolName === 'removeCard';
    }
    if (intent === 'data_filter') {
        return action.responseType === 'filter_spreadsheet';
    }
    if (intent === 'data_transform') {
        return action.responseType === 'execute_js_code';
    }
    if (intent === 'clarification') {
        return action.responseType === 'clarification_request';
    }
    if (intent === 'greeting' || intent === 'smalltalk' || intent === 'ask_user_choice') {
        return action.responseType === 'text_response';
    }
    return false;
};

const renderTemplate = (template: string, context: EngineContext): string => {
    const greeting = '嗨 hi';
    const quickActions = '[Filter Data, Create Chart, Clean Data]';
    const cardTitle = context.detectedIntent?.payloadHints?.cardTitle ?? 'the selected card';
    return template
        .replace(/{{\s*greeting\s*}}/gi, greeting)
        .replace(/{{\s*quick_actions\s*}}/gi, quickActions)
        .replace(/{{\s*cardTitle\s*}}/gi, cardTitle)
        .replace(/{{\s*userMessage\s*}}/gi, context.userMessage);
};

const createPlaybookTextResponse = (playbook: EnginePlaybook, context: EngineContext): AiAction => ({
    type: 'text_response',
    responseType: 'text_response',
    stepId: context.planState?.currentStepId ?? 'ad_hoc_response',
    reason: `Applying playbook ${playbook.id} for intent ${playbook.intent}.`,
    text: renderTemplate(playbook.ui.message_template, context),
});

const deriveCandidate = (
    action: AiAction,
    context: EngineContext,
    source: 'model' | 'playbook',
    playbook?: EnginePlaybook,
): EngineActionCandidate => {
    const profile = lookupToolProfile(action);
    const utilityBase = action.responseType === 'plan_state_update' ? 1.2 : 0.8;
    const utilityBoost = intentMatchesAction(context.detectedIntent?.intent, action) ? 0.4 : 0;
    const confidence = action.reason?.trim() ? Math.min(1, 0.5 + action.reason.trim().length / 200) : 0.4;
    const cost = profile?.costEstimate ?? 3;
    const risk = riskWeight[profile?.risk ?? 'medium'] ?? 0.4;
    const latency = latencyWeight[profile?.latencyClass ?? 'medium'] ?? 0.3;
    return {
        action,
        source,
        playbookId: playbook?.id,
        utility: utilityBase + utilityBoost,
        confidence,
        cost,
        risk,
        latency,
    };
};

const scoreCandidate = (candidate: EngineActionCandidate): number => {
    return candidate.utility + candidate.confidence - candidate.cost * 0.1 - candidate.risk - candidate.latency;
};

const enforceGovernance = (
    candidates: EngineActionCandidate[],
    playbook: EnginePlaybook | undefined,
): EngineActionCandidate[] => {
    if (!playbook?.governance?.deny_tools_if) {
        return candidates;
    }
    const { latency_class, risk } = playbook.governance.deny_tools_if;
    return candidates.filter(candidate => {
        const profileRisk = candidate.risk;
        const profileLatency = candidate.latency;
        const riskBlocked = risk?.some(flag => (flag === 'high' && profileRisk >= riskWeight.high) || (flag === 'medium' && profileRisk >= riskWeight.medium));
        const latencyBlocked =
            latency_class?.some(flag => (flag === 'long' && profileLatency >= latencyWeight.long) || (flag === 'medium' && profileLatency >= latencyWeight.medium));
        return !riskBlocked && !latencyBlocked;
    });
};

const limitAtomicActions = (
    candidates: EngineActionCandidate[],
    context: EngineContext,
): AiAction[] => {
    if (candidates.length === 0) return [];
    const scored = candidates
        .map(candidate => ({ ...candidate, score: scoreCandidate(candidate) }))
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    const planCandidates = scored.filter(candidate => candidate.action.responseType === 'plan_state_update');
    const nonPlanCandidates = scored.filter(candidate => candidate.action.responseType !== 'plan_state_update');
    const selected: AiAction[] = [];

    if (planCandidates.length > 0 && (!context.planState || planCandidates[0].source !== 'model')) {
        selected.push(planCandidates[0].action);
    } else if (planCandidates.length > 0) {
        selected.push(planCandidates[0].action);
    } else if (!context.planState && nonPlanCandidates.length > 0) {
        // No plan found but we must start with one, so synthesize by downgrading first candidate to text.
        selected.push({
            type: 'plan_state_update',
            responseType: 'plan_state_update',
            reason: 'Auto-initializing plan because model skipped it.',
            stepId: 'ad_hoc_response',
        } as AiAction);
    }

    if (nonPlanCandidates.length > 0) {
        selected.push(nonPlanCandidates[0].action);
    }

    return selected.slice(0, 2);
};

const ensureFallbackTextAction = (actions: AiAction[], context: EngineContext): AiAction[] => {
    if (actions.length > 0) {
        return actions;
    }
    return [
        {
            type: 'text_response',
            responseType: 'text_response',
            stepId: context.planState?.currentStepId ?? 'ad_hoc_response',
            reason: 'Fallback explanation: no valid actions after governance.',
            text: 'I am ready to help—please let me know what to analyze or adjust.',
        },
    ];
};

export class AgentEngine {
    private readonly stateTagFactory = new StateTagFactory();

    run(rawResponse: AiChatResponse, context: EngineContext): AiChatResponse {
        const rawActions = Array.isArray(rawResponse.actions) ? rawResponse.actions : [];
        const playbook = selectPlaybookForIntent(context.detectedIntent?.intent);
        let candidates = rawActions.map(action => deriveCandidate(action, context, 'model'));

        if (candidates.length === 0 && playbook) {
            const fallbackAction = createPlaybookTextResponse(playbook, context);
            candidates.push(deriveCandidate(fallbackAction, context, 'playbook', playbook));
        }

        if (playbook && candidates.every(candidate => candidate.action.responseType !== 'plan_state_update')) {
            const planAction: AiAction = {
                type: 'plan_state_update',
                responseType: 'plan_state_update',
                stepId: context.planState?.currentStepId ?? 'ad_hoc_response',
                reason: `Playbook ${playbook.id} requires a plan snapshot.`,
                planState: context.planState ?? undefined,
            };
            candidates.unshift(deriveCandidate(planAction, context, 'playbook', playbook));
        }

        candidates = enforceGovernance(candidates, playbook);

        let actions = limitAtomicActions(candidates, context);
        actions = ensureFallbackTextAction(actions, context);

        const healed = runAutoHealPipeline(actions, context, hint => this.stateTagFactory.mint(context.now, hint));
        return {
            ...rawResponse,
            actions: healed.actions,
        };
    }
}

export const createAgentEngine = (): AgentEngine => new AgentEngine();
