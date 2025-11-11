import type {
    AnalysisPlan,
    AgentObservation,
    AgentPlanState,
    ColumnProfile,
    CsvRow,
    Settings,
} from '@/types';
import type { PlanGenerationUsageEntry } from '@/services/ai/planGenerator';

export type ProfileSnapshot = {
    columns: number;
    rowCount: number;
    sampledRows: number;
    warnings: string[];
};

export interface LangChainPlanTelemetry {
    latencyMs: number;
    startedAt: number;
    finishedAt: number;
    provider?: Settings['provider'];
    estimatedCostUsd?: number;
    tokenUsage?: {
        totalTokens?: number;
        promptTokens?: number;
        completionTokens?: number;
    };
}

export interface LangChainPlanEnvelope {
    source: 'langchain';
    planId: string;
    stepId: string;
    summary: string;
    plan: AnalysisPlan;
    planState: AgentPlanState;
    observation: AgentObservation;
    telemetry: LangChainPlanTelemetry;
    profile: ProfileSnapshot;
    usageLog?: PlanGenerationUsageEntry[];
}

export interface LangChainPlanGraphPayload {
    source: 'langchain';
    planId: string;
    stepId: string;
    summary: string;
    plan: AnalysisPlan;
    planState: AgentPlanState;
    telemetry: LangChainPlanTelemetry;
}

export interface LangChainPlannerContext {
    datasetId?: string | null;
    sampleSize?: number;
    fallbackProfile?: ProfileSnapshot;
    debug?: boolean;
    columns: ColumnProfile[];
    rows: CsvRow[];
    settings: Settings;
    addProgress?: (message: string, type?: 'system' | 'error') => void;
}

export const isLangChainPlanGraphPayload = (value: unknown): value is LangChainPlanGraphPayload => {
    if (!value || typeof value !== 'object') return false;
    const payload = value as Partial<LangChainPlanGraphPayload>;
    return payload.source === 'langchain' && typeof payload.planId === 'string' && typeof payload.stepId === 'string';
};

export const toLangChainPlanGraphPayload = (envelope: LangChainPlanEnvelope): LangChainPlanGraphPayload => ({
    source: envelope.source,
    planId: envelope.planId,
    stepId: envelope.stepId,
    summary: envelope.summary,
    plan: envelope.plan,
    planState: envelope.planState,
    telemetry: envelope.telemetry,
});
