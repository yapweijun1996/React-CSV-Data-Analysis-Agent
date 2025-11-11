import { useAppStore } from '@/store/useAppStore';
import type { AnalysisPlan } from '@/types';
import { generateLangChainPlanEnvelope } from '@/services/langchain/planBridge';
import type { LangChainPlanEnvelope, ProfileSnapshot } from '@/services/langchain/types';

export type AnalysisPlanFromLangChain = AnalysisPlan;

export interface LangChainPromptOptions {
    datasetId?: string | null;
    sampleSize?: number;
    fallbackProfile?: ProfileSnapshot;
    debug?: boolean;
}

export interface LangChainPromptResult {
    plan: AnalysisPlanFromLangChain;
    profile: ProfileSnapshot;
    envelope: LangChainPlanEnvelope;
}

export const runLangChainPrompt = async (options: LangChainPromptOptions = {}): Promise<LangChainPromptResult> => {
    const store = useAppStore.getState();
    const columns = store.columnProfiles;
    const rows = store.csvData?.data ?? [];
    if (!rows.length || !columns.length) {
        throw new Error('LangChain PoC requires a loaded dataset.');
    }
    const envelope = await generateLangChainPlanEnvelope({
        datasetId: options.datasetId ?? store.datasetHash,
        sampleSize: options.sampleSize,
        fallbackProfile: options.fallbackProfile,
        debug: options.debug,
        columns,
        rows,
        settings: store.settings,
        addProgress: store.addProgress,
    });
    store.setLangChainLastPlan(envelope.plan);
    store.addProgress(
        `LangChain PoC 生成計畫：「${envelope.plan.title ?? 'Untitled plan'}」 (${envelope.telemetry.latencyMs.toFixed(0)} ms)`,
        'system',
    );
    store.appendPlannerObservation(envelope.observation);
    store.updatePlannerPlanState(envelope.planState);
    return { plan: envelope.plan, profile: envelope.profile, envelope };
};
