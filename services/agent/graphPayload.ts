import type { GraphLlmTurnPayload } from '@/src/graph/payloads';
import { GRAPH_PAYLOAD_KIND_LLM_TURN } from '@/src/graph/payloads';
import type { AppStore } from '@/store/appStoreTypes';
import type { AnalysisCardData, CardContext } from '@/types';

const MAX_CARD_CONTEXT = 5;
const MAX_AGG_ROWS = 50;

const buildCardContext = (cards: AnalysisCardData[]): CardContext[] =>
    cards
        .slice(-MAX_CARD_CONTEXT)
        .map(card => ({
            id: card.id,
            title: card.plan?.title ?? card.plan?.description ?? 'Analysis card',
            aggregatedDataSample: card.aggregatedData.slice(0, MAX_AGG_ROWS),
        }))
        .reverse();

const describeRawDataFilter = (store: AppStore): string => {
    const filter = store.interactiveSelectionFilter;
    if (!filter) {
        return 'Raw Data Explorer 显示全部資料（未套用篩選）。';
    }
    const preview = filter.values.slice(0, 5).map(value => String(value));
    const suffix = filter.values.length > preview.length ? '…' : '';
    return `Raw Data Explorer 目前鎖定 ${filter.column} ∈ {${preview.join(', ')}${suffix}}（來源：${filter.label ?? filter.sourceCardId}）。`;
};

const collectLongTermMemory = (store: AppStore): string[] => {
    const exclusions = new Set(store.chatMemoryExclusions);
    const preview = store.chatMemoryPreview.filter(mem => !exclusions.has(mem.id));
    if (preview.length > 0) {
        return preview.map(mem => mem.text ?? mem.summary ?? '');
    }
    return [];
};

export const buildGraphLlmTurnPayload = (
    message: string,
    store: AppStore,
    requestId: string,
): GraphLlmTurnPayload => ({
    kind: GRAPH_PAYLOAD_KIND_LLM_TURN,
    requestId,
    userMessage: message,
    columns: store.columnProfiles ?? [],
    chatHistory: store.chatHistory ?? [],
    cardContext: buildCardContext(store.analysisCards ?? []),
    settings: store.settings,
    aiCoreAnalysisSummary: store.aiCoreAnalysisSummary ?? null,
    currentView: store.currentView,
    longTermMemory: collectLongTermMemory(store),
    recentObservations: store.graphObservations ?? [],
    activePlanState: store.plannerSession?.planState ?? null,
    dataPreparationPlan: store.dataPreparationPlan ?? null,
    recentActionTraces: store.agentActionTraces.slice(-10),
    rawDataFilterSummary: describeRawDataFilter(store),
});
