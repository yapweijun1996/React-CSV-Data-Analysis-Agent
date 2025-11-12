import type {
    AgentActionTrace,
    AgentObservation,
    AgentPlanState,
    AppView,
    CardContext,
    ChatMessage,
    ColumnProfile,
    DataPreparationPlan,
    Settings,
    AwaitUserPayload,
} from '@/types';

export const GRAPH_PAYLOAD_KIND_LLM_TURN = 'llm_turn';

export interface GraphLlmTurnPayload {
    kind: typeof GRAPH_PAYLOAD_KIND_LLM_TURN;
    requestId: string;
    userMessage: string;
    promptCharCountHint: number;
    columns: ColumnProfile[];
    chatHistory: ChatMessage[];
    cardContext: CardContext[];
    settings: Settings;
    aiCoreAnalysisSummary: string | null;
    currentView: AppView;
    longTermMemory: string[];
    recentObservations: AgentObservation[];
    activePlanState: AgentPlanState | null;
    dataPreparationPlan: DataPreparationPlan | null;
    recentActionTraces: AgentActionTrace[];
    rawDataFilterSummary: string;
    activeSampleTier: number | null;
    sampleTierLabel: string;
    sampleTierConfirmed: boolean;
    askUserPrompt?: AwaitUserPayload;
}

export const isGraphLlmTurnPayload = (payload: unknown): payload is GraphLlmTurnPayload => {
    if (!payload || typeof payload !== 'object') {
        return false;
    }
    return (payload as { kind?: unknown }).kind === GRAPH_PAYLOAD_KIND_LLM_TURN;
};
