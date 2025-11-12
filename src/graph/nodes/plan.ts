import type { GraphNode } from './types';
import type { AiAction, AiChatResponse, AgentSchemaPhase, LlmTurnTelemetry } from '@/types';
import type { GraphPhase } from '../schema';
import { enforceTurnGuards } from '../guards';
import { generateChatResponse } from '@/services/aiService';
import { isGraphLlmTurnPayload } from '../payloads';
import type { GraphLlmTurnPayload } from '../payloads';
import { validateStateTag } from '../schema';
import { StateTagFactory } from '@/services/agent/stateTagFactory';

const mapPhaseToSchema = (phase: GraphPhase): AgentSchemaPhase => {
    switch (phase) {
        case 'act':
            return 'act';
        case 'plan':
        case 'observe':
            return 'plan';
        default:
            return 'talk';
    }
};

type ChatResponder = (
    columns: Parameters<typeof generateChatResponse>[0],
    chatHistory: Parameters<typeof generateChatResponse>[1],
    userPrompt: Parameters<typeof generateChatResponse>[2],
    cardContext: Parameters<typeof generateChatResponse>[3],
    settings: Parameters<typeof generateChatResponse>[4],
    aiCoreAnalysisSummary: Parameters<typeof generateChatResponse>[5],
    currentView: Parameters<typeof generateChatResponse>[6],
    longTermMemory: Parameters<typeof generateChatResponse>[7],
    recentObservations: Parameters<typeof generateChatResponse>[8],
    activePlanState: Parameters<typeof generateChatResponse>[9],
    dataPreparationPlan: Parameters<typeof generateChatResponse>[10],
    recentActionTraces: Parameters<typeof generateChatResponse>[11],
    rawDataFilterSummary: Parameters<typeof generateChatResponse>[12],
    options?: Parameters<typeof generateChatResponse>[13],
) => Promise<AiChatResponse>;

let chatResponder: ChatResponder = generateChatResponse;
const stateTagFactory = new StateTagFactory();

export const __setChatResponderForTests = (responder: ChatResponder) => {
    chatResponder = responder;
};

export const __resetChatResponderForTests = () => {
    chatResponder = generateChatResponse;
};

const buildTextResponse = (text: string): AiAction => ({
    type: 'text_response',
    responseType: 'text_response',
    reason: 'Notify user about the planner status.',
    stepId: 'graph-plan',
    stateTag: `ts${Date.now().toString(36)}-plan`,
    timestamp: new Date().toISOString(),
    text,
});

const createTurnTelemetry = (payload: GraphLlmTurnPayload): LlmTurnTelemetry => ({
    requestId: payload.requestId ?? null,
    sampleTier: {
        value: payload.activeSampleTier ?? null,
        label: payload.sampleTierLabel,
        userConfirmedFullScan: payload.sampleTierConfirmed ?? false,
    },
    userMessageChars: payload.userMessage.length,
    promptCharCountHint: payload.promptCharCountHint,
});

const attachTelemetryToActions = (actions: AiAction[], telemetry: LlmTurnTelemetry): AiAction[] => {
    if (!telemetry) {
        return actions;
    }
    if (!Array.isArray(actions) || actions.length === 0) {
        return actions;
    }
    const [first, ...rest] = actions;
    const enrichedFirst: AiAction = {
        ...first,
        meta: {
            ...(first.meta ?? {}),
            telemetry,
        },
    };
    return [enrichedFirst, ...rest];
};

const mintStateTag = (prefix: string): string => stateTagFactory.mint(Date.now(), prefix);

const ensurePlanActionStateTag = (action: AiAction): AiAction => {
    if (action.responseType !== 'plan_state_update' || !action.planState) {
        return action;
    }
    const planStateTag = action.planState.stateTag;
    if (validateStateTag(planStateTag)) {
        return action;
    }
    const minted = mintStateTag('plan');
    return {
        ...action,
        stateTag: minted,
        planState: {
            ...action.planState,
            stateTag: minted,
        },
    };
};

const ensureAtomicActionStateTag = (action: AiAction | undefined): AiAction | undefined => {
    if (!action) return action;
    if (validateStateTag(action.stateTag)) {
        return action;
    }
    const minted = mintStateTag('atomic');
    return {
        ...action,
        stateTag: minted,
    };
};

const normalizeActionStateTags = (actions: AiAction[]): AiAction[] => {
    if (!actions.length) return actions;
    const [planAction, atomicAction] = actions;
    const normalizedPlan = ensurePlanActionStateTag(planAction);
    const normalizedAtomic = ensureAtomicActionStateTag(atomicAction);
    return normalizedAtomic ? [normalizedPlan, normalizedAtomic] : [normalizedPlan];
};

export const planNode: GraphNode = async ({ state, payload }) => {
    const baseState = {
        ...state,
        phase: 'plan',
        updatedAt: new Date().toISOString(),
    };

    if (!payload || !isGraphLlmTurnPayload(payload)) {
        return {
            state: baseState,
            actions: [],
            label: 'plan',
        };
    }

    const turnTelemetry = createTurnTelemetry(payload);
    const turnStartedAt = Date.now();

    try {
        const response = await chatResponder(
            payload.columns,
            payload.chatHistory,
            payload.userMessage,
            payload.cardContext,
            payload.settings,
            payload.aiCoreAnalysisSummary,
            payload.currentView,
            payload.longTermMemory,
            payload.recentObservations,
            payload.activePlanState,
            payload.dataPreparationPlan,
            payload.recentActionTraces,
            payload.rawDataFilterSummary,
            {
                phase: mapPhaseToSchema(baseState.phase),
                onPromptProfile: profile => {
                    turnTelemetry.promptProfile = profile;
                },
                onUsage: usage => {
                    turnTelemetry.tokenUsage = {
                        provider: usage.provider,
                        model: usage.model,
                        promptTokens: usage.promptTokens,
                        completionTokens: usage.completionTokens,
                        totalTokens: usage.totalTokens,
                        operation: usage.operation,
                    };
                },
            },
        );
        turnTelemetry.latencyMs = Date.now() - turnStartedAt;

        const actions = normalizeActionStateTags(Array.isArray(response.actions) ? response.actions : []);
        const guardResult = enforceTurnGuards(baseState, actions);
        if (!guardResult.ok || !guardResult.nextState) {
            const reason = guardResult.violations?.[0]?.message ?? 'LLM response failed validation.';
            const guardedActions = attachTelemetryToActions([buildTextResponse(reason)], turnTelemetry);
            return {
                state: baseState,
                actions: guardedActions,
                label: 'plan',
                telemetry: turnTelemetry,
            };
        }

        const acceptedActions = guardResult.acceptedActions ?? actions;
        if (!acceptedActions || acceptedActions.length === 0) {
            const fallbackActions = attachTelemetryToActions(
                [buildTextResponse('LLM 沒有返回任何可執行動作，已暫停此回合。')],
                turnTelemetry,
            );
            return {
                state: guardResult.nextState,
                actions: fallbackActions,
                label: 'plan',
                telemetry: turnTelemetry,
            };
        }

        const instrumentedActions = attachTelemetryToActions(acceptedActions, turnTelemetry);
        return {
            state: guardResult.nextState,
            actions: instrumentedActions,
            label: 'plan',
            telemetry: turnTelemetry,
        };
    } catch (error) {
        turnTelemetry.latencyMs = Date.now() - turnStartedAt;
        const actions = attachTelemetryToActions(
            [
                buildTextResponse(
                    `LLM 出错：${error instanceof Error ? error.message : String(error)}。請稍後重試。`,
                ),
            ],
            turnTelemetry,
        );
        return {
            state: baseState,
            actions,
            label: 'plan',
            telemetry: turnTelemetry,
        };
    }
};
