import type { AiAction, AiChatResponse, AgentPlanState, AgentPlanStep } from '../../../types';
import type {
    EngineActionCandidate,
    EngineContext,
    EnginePlaybook,
    EnginePlaybookQuickActionRule,
    ToolRegistryEntry,
} from './contracts';
import { lookupToolProfile, TOOL_REGISTRY } from './toolRegistry';
import { selectPlaybookForIntent } from './playbooks';
import { runAutoHealPipeline } from './autoHeal';
import { StateTagFactory } from '../stateTagFactory';

const riskWeight: Record<string, number> = { low: 0.1, medium: 0.4, high: 0.9 };
const latencyWeight: Record<string, number> = { short: 0.1, medium: 0.3, long: 0.7 };

const DEFAULT_GREET_QUICK_CHOICES = [
    '快速 Profile：掃描 CSV 缺失值/分布 (auto profile)',
    '毛利 KPI：比較 Salesperson 毛利率 (top/bottom)',
    '自定义提问：直接告诉我想分析什么',
];

const formatQuickChoiceList = (choices: string[]): string => {
    return choices.map((choice, index) => `${index + 1}) ${choice}`).join('\n');
};

const matchesQuickActionRule = (entry: ToolRegistryEntry, rule: EnginePlaybookQuickActionRule): boolean => {
    if (rule.filter?.tags_any && !rule.filter.tags_any.some(tag => entry.tags.includes(tag))) {
        return false;
    }
    if (rule.filter?.context && rule.filter.context.length > 0) {
        const entryContexts = entry.applicableIf?.context;
        if (entryContexts && !rule.filter.context.some(ctx => entryContexts.includes(ctx))) {
            return false;
        }
    }
    return true;
};

const pickQuickActionLabels = (playbook?: EnginePlaybook): string[] => {
    if (!playbook?.ui.quick_action_rules || playbook.ui.quick_action_rules.length === 0) {
        return DEFAULT_GREET_QUICK_CHOICES;
    }
    const labels: string[] = [];
    for (const rule of playbook.ui.quick_action_rules) {
        if (rule.source !== 'tools') continue;
        const cap = Math.max(1, rule.top_k ?? 3);
        for (const entry of TOOL_REGISTRY) {
            if (!matchesQuickActionRule(entry, rule)) continue;
            const label = entry.quickActionLabel ?? entry.description ?? entry.name;
            if (!label || labels.includes(label)) continue;
            labels.push(label);
            if (labels.length >= cap) break;
        }
    }
    const seeded = labels.length >= 2 ? labels : [...labels, ...DEFAULT_GREET_QUICK_CHOICES];
    const deduped = Array.from(new Set(seeded));
    return deduped.slice(0, 4);
};

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

const renderTemplate = (
    template: string,
    context: EngineContext,
    tokens: Record<string, string> = {},
): string => {
    const cardTitle = context.detectedIntent?.payloadHints?.cardTitle ?? 'the selected card';
    const replacements: Record<string, string> = {
        greeting: '嗨 hi',
        quick_actions: tokens.quick_actions ?? '[Filter Data, Create Chart, Clean Data]',
        quick_choice_list: tokens.quick_choice_list ?? '',
        cardTitle,
        userMessage: context.userMessage ?? '',
    };
    return Object.entries(replacements).reduce((acc, [key, value]) => {
        const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
        return acc.replace(pattern, () => value ?? '');
    }, template);
};

const createPlaybookTextResponse = (playbook: EnginePlaybook, context: EngineContext): AiAction => {
    const wantsQuickChoices = playbook.ui.message_template.includes('{{quick_choice_list}}');
    const quickChoices = wantsQuickChoices ? pickQuickActionLabels(playbook) : [];
    const quickChoiceList = wantsQuickChoices ? formatQuickChoiceList(quickChoices) : '';
    const templateTokens = wantsQuickChoices
        ? {
              quick_actions: quickChoices.join(', '),
              quick_choice_list: quickChoiceList,
          }
        : undefined;
    return {
        type: 'text_response',
        responseType: 'text_response',
        stepId: context.planState?.currentStepId ?? 'ad_hoc_response',
        reason: `Applying playbook ${playbook.id} for intent ${playbook.intent}.`,
        text: renderTemplate(playbook.ui.message_template, context, templateTokens),
    };
};

const GREETING_INTENTS = new Set(['greeting', 'smalltalk', 'ask_user_choice']);
const GREETING_PLAN_STEP: AgentPlanStep = {
    id: 'acknowledge_user_greeting',
    label: 'Acknowledge the greeting and ask what to analyze next.',
    intent: 'conversation',
    status: 'in_progress',
};

const createGreetingPlanState = (): AgentPlanState => ({
    planId: null,
    goal: 'Acknowledge the user and gather their request.',
    contextSummary: 'User greeted the assistant; no task has been specified yet.',
    progress: 'Greeting acknowledged.',
    nextSteps: [GREETING_PLAN_STEP],
    steps: [GREETING_PLAN_STEP],
    currentStepId: GREETING_PLAN_STEP.id,
    blockedBy: null,
    observationIds: [],
    confidence: 0.5,
    updatedAt: new Date().toISOString(),
    stateTag: 'context_ready',
});

const normalizeGreetingPlanAction = (action: AiAction): AiAction => {
    const normalizedState: AgentPlanState = {
        ...(action.planState ?? createGreetingPlanState()),
        goal: action.planState?.goal || 'Acknowledge the user and gather their request.',
        contextSummary:
            action.planState?.contextSummary ?? 'User greeted the assistant; awaiting instructions.',
        progress: action.planState?.progress || 'Greeting acknowledged.',
        nextSteps:
            action.planState?.nextSteps && action.planState.nextSteps.length > 0
                ? action.planState.nextSteps
                : [GREETING_PLAN_STEP],
        steps:
            action.planState?.steps && action.planState.steps.length > 0
                ? action.planState.steps
                : [GREETING_PLAN_STEP],
        currentStepId: action.planState?.currentStepId ?? GREETING_PLAN_STEP.id,
        stateTag: 'context_ready',
        updatedAt: new Date().toISOString(),
    };
    return { ...action, planState: normalizedState, stateTag: 'context_ready' };
};

const sanitizeGreetingTextAction = (action: AiAction | undefined, fallbackStepId: string): AiAction | null => {
    if (!action) return null;
    return {
        ...action,
        type: 'text_response',
        responseType: 'text_response',
        stepId: action.stepId ?? fallbackStepId,
        meta: action.meta
            ? { ...action.meta, awaitUser: false, haltAfter: false }
            : undefined,
    };
};

const enforceGreetingResponse = (
    actions: AiAction[],
    context: EngineContext,
    playbook?: EnginePlaybook,
): AiAction[] => {
    if (!GREETING_INTENTS.has(context.detectedIntent?.intent ?? '')) {
        return actions;
    }
    const planCandidate =
        actions.find(action => action.responseType === 'plan_state_update') ??
        ({
            type: 'plan_state_update',
            responseType: 'plan_state_update',
            reason: 'Auto-initialized greeting plan tracker.',
            stepId: context.planState?.currentStepId ?? GREETING_PLAN_STEP.id,
        } as AiAction);
    const fallbackText: AiAction =
        playbook
            ? createPlaybookTextResponse(playbook, context)
            : {
                  type: 'text_response',
                  responseType: 'text_response',
                  stepId: planCandidate.stepId ?? GREETING_PLAN_STEP.id,
                  reason: 'Auto-generated greeting response.',
                  text: '嗨！我在这等你。告诉我想从哪一步开始探索 CSV 数据吧。',
              };
    const sanitizedExisting = sanitizeGreetingTextAction(
        actions.find(action => action.responseType === 'text_response'),
        fallbackText.stepId ?? GREETING_PLAN_STEP.id,
    );
    const textCandidate = sanitizedExisting ?? fallbackText;
    return [normalizeGreetingPlanAction(planCandidate), textCandidate];
};

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
    isPlanOnly: boolean,
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

    if (!isPlanOnly && nonPlanCandidates.length > 0) {
        selected.push(nonPlanCandidates[0].action);
    }

    if (isPlanOnly) {
        const planActions = selected.filter(action => action.responseType === 'plan_state_update');
        if (planActions.length > 0) {
            return planActions.slice(0, 1);
        }
        return [
            {
                type: 'plan_state_update',
                responseType: 'plan_state_update',
                reason: 'Auto-initializing plan because plan-only prompt requires it.',
                stepId: context.planState?.currentStepId ?? 'ad_hoc_response',
            } as AiAction,
        ];
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
        const isPlanOnly = context.promptMode === 'plan_only';
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

        let actions = limitAtomicActions(candidates, context, isPlanOnly);

        if (isPlanOnly) {
            const hasTextResponse = actions.some(action => action.responseType === 'text_response');
            if (!hasTextResponse) {
                const primaryStepId =
                    actions[0]?.stepId ??
                    context.planState?.currentStepId ??
                    context.pendingSteps[0]?.id ??
                    'plan_ack';
                actions = [
                    ...actions,
                    {
                        type: 'text_response',
                        responseType: 'text_response',
                        stepId: primaryStepId,
                        reason: 'Confirm the updated plan with the user before continuing.',
                        text: '计划已更新，请确认是否要继续执行下一步。',
                    },
                ];
            }
        }

        const isGreetingIntent = GREETING_INTENTS.has(context.detectedIntent?.intent ?? '');
        const shouldEnforceGreeting = isGreetingIntent && !isPlanOnly;
        if (shouldEnforceGreeting) {
            actions = enforceGreetingResponse(actions, context, playbook);
            actions = ensureFallbackTextAction(actions, context);
        } else if (!isPlanOnly) {
            actions = ensureFallbackTextAction(actions, context);
        }

        const healed = runAutoHealPipeline(actions, context, hint => this.stateTagFactory.mint(context.now, hint), {
            stampOnly: isPlanOnly,
            maxActions: isPlanOnly ? 2 : undefined,
        });
        return {
            ...rawResponse,
            actions: healed.actions,
        };
    }
}

export const createAgentEngine = (): AgentEngine => new AgentEngine();
