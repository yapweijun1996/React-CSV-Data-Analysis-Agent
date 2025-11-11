import type { CsvRow, ColumnProfile } from '../types';

export type MetricFn = 'sum' | 'avg' | 'count' | 'min' | 'max';

export interface AggregateMetric {
    column?: string;
    fn: MetricFn;
    as?: string;
}

export type ComparisonOp = 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in';

export interface AggregateFilter {
    column: string;
    op: ComparisonOp;
    value?: string | number | null;
    values?: Array<string | number | null>;
    caseInsensitive?: boolean;
}

export interface AggregateOrderBy {
    column: string;
    direction?: 'asc' | 'desc';
}

export type AggregateMode = 'sample' | 'full';

export type AggregatePayload = {
    datasetId: string;
    by?: string[];
    metrics: AggregateMetric[];
    filter?: AggregateFilter[];
    orderBy?: AggregateOrderBy[];
    limit?: number;
    mode?: AggregateMode;
    sampleSize?: number;
    allowFullScan?: boolean;
};

export type ProfileResult = {
    rowCount: number;
    sampledRows: number;
    columns: Array<{
        name: string;
        type: ColumnProfile['type'];
        distinct: number;
        emptyPercentage: number;
        examples: string[];
    }>;
    warnings: string[];
};

export type SampleResult = {
    rows: Array<Record<string, any>>;
    sampled: boolean;
    columns?: Array<{ name: string; type: ColumnProfile['type'] }>;
};

export type AggregateResult = {
    schema: Array<{ name: string; type: string }>;
    rows: Array<Record<string, any>>;
    provenance: {
        datasetId: string;
        sampled: boolean;
        mode: AggregateMode;
        processedRows: number;
        totalRows: number;
        queryHash: string;
        filterCount: number;
        warnings: string[];
    };
};

