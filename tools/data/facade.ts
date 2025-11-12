import { dataTools } from '../../services/dataTools';
import type {
    AnalysisPlan,
    CsvData,
    DatasetRuntimeConfig,
    GraphToolKind,
    GraphToolMeta,
    GraphToolSource,
} from '@/types';
import { buildAggregatePayloadForPlan } from '@/utils/aggregatePayload';
import type { ErrorCode } from '@/services/errorCodes';

type GraphToolPayloadMap = {
    profile_dataset: {
        kind: 'profile_dataset';
        columns: number;
        rowCount: number;
        sampledRows: number;
    };
    normalize_invoice_month: {
        kind: 'normalize_invoice_month';
        column: string;
        normalizedCount: number;
        skippedCount: number;
        sampleValues: string[];
    };
    detect_outliers: {
        kind: 'detect_outliers';
        column: string;
        threshold: number;
        count: number;
        rows: Array<{ label: string; value: number }>;
    };
    aggregate_plan: {
        kind: 'aggregate_plan';
        planTitle: string;
        rows: number;
        viewId: string;
    };
};

export type GraphToolResponse<K extends GraphToolKind = GraphToolKind> = {
    summary: string;
    meta: GraphToolMeta;
    payload: GraphToolPayloadMap[K];
    rows?: Array<Record<string, unknown>>;
    schema?: Array<{ name: string; type: string }>;
    viewId?: string | null;
    context?: unknown;
};

export class GraphToolExecutionError extends Error {
    code?: ErrorCode;
    suggestion?: string;

    constructor(message: string, options?: { code?: ErrorCode; suggestion?: string }) {
        super(message);
        this.name = 'GraphToolExecutionError';
        this.code = options?.code;
        this.suggestion = options?.suggestion;
    }
}

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

export interface GraphAggregateRequest {
    plan: AnalysisPlan;
    datasetId: string | null;
    csvData: CsvData | null;
    rowCountHint?: number;
    options?: { preferredMode?: GraphToolSource; runtimeConfig?: DatasetRuntimeConfig | null };
}

export const runAggregateToolForPlan = async (
    request: GraphAggregateRequest,
): Promise<GraphToolResponse<'aggregate_plan'>> => {
    const { plan, datasetId, csvData, rowCountHint, options } = request;
    const payload = buildAggregatePayloadForPlan(plan, datasetId, csvData, rowCountHint, options);
    if (!payload) {
        throw new GraphToolExecutionError('Plan is not eligible for aggregate tool.');
    }
    const response = await dataTools.aggregate(payload);
    if (!response.ok) {
        throw new GraphToolExecutionError(response.reason ?? 'Aggregate tool failed.', {
            code: response.code,
            suggestion: response.hint,
        });
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
    const summary = `预览 ${plan.title ?? 'analysis'}: ${meta.rows} 行（${meta.source}），警告 ${meta.warnings.length}。`;
    const payloadSnapshot: GraphToolPayloadMap['aggregate_plan'] = {
        kind: 'aggregate_plan',
        planTitle: plan.title ?? 'analysis',
        rows: meta.rows,
        viewId: result.provenance.queryHash,
    };
    return {
        summary,
        meta,
        payload: payloadSnapshot,
        rows: result.rows,
        schema: result.schema,
        viewId: result.provenance.queryHash,
        context: result,
    };
};

export const runProfileTool = async (
    datasetId: string | null,
    sampleSize?: number,
): Promise<GraphToolResponse<'profile_dataset'>> => {
    if (!datasetId) {
        throw new GraphToolExecutionError('Dataset unavailable for profiling.');
    }
    const profile = await dataTools.profile(datasetId, sampleSize);
    if (!profile.ok) {
        throw new GraphToolExecutionError(profile.reason ?? 'Profile tool failed.', {
            code: profile.code,
            suggestion: profile.hint,
        });
    }
    const summary = `数据画像：${profile.data.columns.length} 列 · ${profile.data.rowCount.toLocaleString()} 行（采样 ${profile.data.sampledRows.toLocaleString()}）`;
    const meta: GraphToolMeta = {
        source: profile.data.sampledRows === profile.data.rowCount ? 'full' : 'sample',
        rows: profile.data.rowCount,
        warnings: profile.data.warnings ?? [],
        processedRows: profile.data.sampledRows,
        totalRows: profile.data.rowCount,
        durationMs: profile.durationMs ?? 0,
    };
    const payloadSnapshot: GraphToolPayloadMap['profile_dataset'] = {
        kind: 'profile_dataset',
        columns: profile.data.columns.length,
        rowCount: profile.data.rowCount,
        sampledRows: profile.data.sampledRows,
    };
    return {
        summary,
        meta,
        payload: payloadSnapshot,
        context: profile.data,
    };
};

export const runNormalizeInvoiceMonth = (
    csvData: CsvData | null,
    column = 'InvoiceMonth',
): GraphToolResponse<'normalize_invoice_month'> => {
    if (!csvData) {
        throw new GraphToolExecutionError('Dataset unavailable for normalization.');
    }
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
    const totalRows = normalizedCount + skippedCount;
    const summary = `标准化 ${column}：成功 ${normalizedCount.toLocaleString()}，跳过 ${skippedCount.toLocaleString()}`;
    const meta: GraphToolMeta = {
        source: 'full',
        rows: normalizedCount,
        warnings: skippedCount ? [`Skipped ${skippedCount} rows`] : [],
        processedRows: totalRows,
        totalRows,
        durationMs: 0,
    };
    const payloadSnapshot: GraphToolPayloadMap['normalize_invoice_month'] = {
        kind: 'normalize_invoice_month',
        column,
        normalizedCount,
        skippedCount,
        sampleValues: Array.from(samples),
    };
    return {
        summary,
        meta,
        payload: payloadSnapshot,
    };
};

export const runOutlierDetection = (
    csvData: CsvData | null,
    valueColumn: string,
    thresholdMultiplier = 2,
): GraphToolResponse<'detect_outliers'> => {
    if (!csvData) {
        throw new GraphToolExecutionError('Dataset unavailable for outlier detection.');
    }
    const values = csvData.data
        .map(row => Number(row[valueColumn]))
        .filter(value => Number.isFinite(value));
    if (values.length === 0) {
        return {
            summary: `异常检测 ${valueColumn}：缺少可计算的数值。`,
            meta: {
                source: 'full',
                rows: 0,
                warnings: ['No numeric values detected.'],
                processedRows: csvData.data.length,
                totalRows: csvData.data.length,
                durationMs: 0,
            },
            payload: {
                kind: 'detect_outliers',
                column: valueColumn,
                threshold: 0,
                count: 0,
                rows: [],
            },
        };
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
    const summary = `异常检测 ${valueColumn}：找到 ${outliers.length.toLocaleString()} 条高于阈值 ${threshold.toFixed(2)}`;
    const meta: GraphToolMeta = {
        source: 'full',
        rows: outliers.length,
        warnings: [],
        processedRows: csvData.data.length,
        totalRows: csvData.data.length,
        durationMs: 0,
    };
    const payloadSnapshot: GraphToolPayloadMap['detect_outliers'] = {
        kind: 'detect_outliers',
        column: valueColumn,
        threshold: Number(threshold.toFixed(2)),
        count: outliers.length,
        rows: outliers,
    };
    return {
        summary,
        meta,
        payload: payloadSnapshot,
    };
};
