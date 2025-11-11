import { dataTools } from '../../services/dataTools';
import type { AnalysisPlan, CsvData, DatasetRuntimeConfig } from '@/types';
import { buildAggregatePayloadForPlan } from '@/utils/aggregatePayload';

export type GraphToolSource = 'sample' | 'full';

export interface GraphToolMeta {
    source: GraphToolSource;
    rows: number;
    warnings: string[];
    processedRows: number;
    totalRows: number;
    durationMs: number;
}

export interface GraphToolResponse {
    viewId: string;
    meta: GraphToolMeta;
    rows: Array<Record<string, unknown>>;
    schema: Array<{ name: string; type: string }>;
}

export interface GraphAggregateRequest {
    plan: AnalysisPlan;
    datasetId: string | null;
    csvData: CsvData | null;
    rowCountHint?: number;
    options?: { preferredMode?: 'sample' | 'full'; runtimeConfig?: DatasetRuntimeConfig | null };
}

export const runAggregateToolForPlan = async (request: GraphAggregateRequest): Promise<GraphToolResponse> => {
    const { plan, datasetId, csvData, rowCountHint, options } = request;
    const payload = buildAggregatePayloadForPlan(plan, datasetId, csvData, rowCountHint, options);
    if (!payload) {
        throw new Error('Plan is not eligible for aggregate tool.');
    }
    const response = await dataTools.aggregate(payload);
    if (!response.ok) {
        throw new Error(response.reason ?? 'Aggregate tool failed.');
    }
    const result = response.data;
    const meta: GraphToolMeta = {
        source: result.provenance.mode,
        rows: result.rows.length,
        warnings: result.provenance.warnings ?? [],
        processedRows: result.provenance.processedRows,
        totalRows: result.provenance.totalRows,
        durationMs: response.durationMs ?? 0,
    };
    return {
        viewId: result.provenance.queryHash,
        meta,
        rows: result.rows,
        schema: result.schema,
    };
};
