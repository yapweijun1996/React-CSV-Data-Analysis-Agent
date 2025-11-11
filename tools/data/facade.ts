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

export interface GraphProfileResponse {
    columns: number;
    rowCount: number;
    sampledRows: number;
    warnings: string[];
    durationMs: number;
}

export interface GraphNormalizationResponse {
    normalizedCount: number;
    skippedCount: number;
    sampleValues: string[];
    column: string;
}

export interface GraphOutlierResponse {
    column: string;
    threshold: number;
    count: number;
    rows: Array<{ label: string; value: number }>;
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

export const runProfileTool = async (
    datasetId: string | null,
    sampleSize?: number,
): Promise<GraphProfileResponse> => {
    if (!datasetId) throw new Error('Dataset unavailable for profiling.');
    const profile = await dataTools.profile(datasetId, sampleSize);
    if (!profile.ok) {
        throw new Error(profile.reason ?? 'Profile tool failed.');
    }
    return {
        columns: profile.data.columns.length,
        rowCount: profile.data.rowCount,
        sampledRows: profile.data.sampledRows,
        warnings: profile.data.warnings,
        durationMs: profile.durationMs ?? 0,
    };
};

const normalizeMonth = (value: unknown): string | null => {
    if (typeof value === 'string') {
        const match = value.match(/(\d{4})[-/.](\d{1,2})/);
        if (match) {
            const month = String(match[2]).padStart(2, '0');
            return `${match[1]}-${month}`;
        }
    }
    return null;
};

export const runNormalizeInvoiceMonth = (csvData: CsvData | null, column = 'InvoiceMonth'): GraphNormalizationResponse => {
    if (!csvData) throw new Error('Dataset unavailable for normalization.');
    let normalizedCount = 0;
    let skippedCount = 0;
    const samples = new Set<string>();
    for (const row of csvData.data) {
        const normalized = normalizeMonth(row[column]);
        if (normalized) {
            normalizedCount++;
            if (samples.size < 6) {
                samples.add(normalized);
            }
        } else {
            skippedCount++;
        }
    }
    return {
        column,
        normalizedCount,
        skippedCount,
        sampleValues: Array.from(samples),
    };
};

export const runOutlierDetection = (
    csvData: CsvData | null,
    valueColumn: string,
    thresholdMultiplier = 2,
): GraphOutlierResponse => {
    if (!csvData) throw new Error('Dataset unavailable for outlier detection.');
    const values = csvData.data
        .map(row => Number(row[valueColumn]))
        .filter(value => Number.isFinite(value));
    if (values.length === 0) {
        return { column: valueColumn, threshold: 0, count: 0, rows: [] };
    }
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const threshold = mean + thresholdMultiplier * stdDev;
    const outliers = csvData.data
        .filter(row => Number(row[valueColumn]) > threshold)
        .map(row => ({
            label: row.id ?? row[valueColumn]?.toString() ?? 'row',
            value: Number(row[valueColumn]),
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
    return {
        column: valueColumn,
        threshold: Number(threshold.toFixed(2)),
        count: outliers.length,
        rows: outliers,
    };
};
