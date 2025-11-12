import type { GraphNode } from './types';
import type { AiAction, AgentSchemaPhase } from '@/types';
import type { GraphPhase } from '../schema';
import { enforceTurnGuards } from '../guards';
import { generateChatResponse } from '@/services/aiService';
import { isGraphLlmTurnPayload } from '../payloads';

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

const buildTextResponse = (text: string): AiAction => ({
    type: 'text_response',
    responseType: 'text_response',
    reason: 'Notify user about the planner status.',
    stepId: 'graph-plan',
    stateTag: `ts${Date.now().toString(36)}-plan`,
    timestamp: new Date().toISOString(),
    text,
});

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

    try {
        const response = await generateChatResponse(
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
            },
        );

        const actions = Array.isArray(response.actions) ? response.actions : [];
        const guardResult = enforceTurnGuards(baseState, actions);
        if (!guardResult.ok || !guardResult.nextState) {
            const reason = guardResult.violations?.[0]?.message ?? 'LLM response failed validation.';
            return {
                state: baseState,
                actions: [buildTextResponse(reason)],
                label: 'plan',
            };
        }

        return {
            state: guardResult.nextState,
            actions: guardResult.acceptedActions ?? actions,
            label: 'plan',
        };
    } catch (error) {
        return {
            state: baseState,
            actions: [
                buildTextResponse(
                    `LLM 出错：${error instanceof Error ? error.message : String(error)}。請稍後重試。`,
                ),
            ],
            label: 'plan',
        };
    }
};
