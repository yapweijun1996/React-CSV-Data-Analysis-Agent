import type {
    AnalysisPlan,
    ClarificationRequest,
    ClarificationRequestPayload,
    ClarificationStatus,
    CsvData,
    AnalysisCardData,
} from '@/types';

export interface ChatSliceDependencies {
    registerClarification: (clarification: ClarificationRequestPayload) => ClarificationRequest;
    updateClarificationStatus: (id: string, status: ClarificationStatus) => void;
    getRunSignal: (runId?: string) => AbortSignal | undefined;
    runPlanWithChatLifecycle: (plan: AnalysisPlan, data: CsvData, runId?: string) => Promise<AnalysisCardData[]>;
}
