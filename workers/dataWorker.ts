/// <reference lib="webworker" />

import { profileData } from '../utils/dataProcessor';
import type { CsvRow, ColumnProfile } from '../types';

declare const self: DedicatedWorkerGlobalScope;

type CsvAgentDbModule = typeof import('../services/csvAgentDb');

let dbModulePromise: Promise<CsvAgentDbModule> | null = null;

const hasIndexedDbSupport = (): boolean => {
    return typeof indexedDB !== 'undefined' && 'IDBDatabase' in self;
};

const ensureDbModule = async (): Promise<CsvAgentDbModule> => {
    if (!hasIndexedDbSupport()) {
        throw new Error('IndexedDB is not available inside the worker context.');
    }
    if (!dbModulePromise) {
        dbModulePromise = import('../services/csvAgentDb');
    }
    return dbModulePromise;
};

type MetricFn = 'sum' | 'avg' | 'count' | 'min' | 'max';

interface AggregateMetric {
    column?: string;
    fn: MetricFn;
    as?: string;
}

type ComparisonOp = 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in';

interface AggregateFilter {
    column: string;
    op: ComparisonOp;
    value?: string | number | null;
    values?: Array<string | number | null>;
    caseInsensitive?: boolean;
}

interface AggregateOrderBy {
    column: string;
    direction?: 'asc' | 'desc';
}

type AggregateMode = 'sample' | 'full';

interface AggregatePayload {
    datasetId: string;
    by?: string[];
    metrics: AggregateMetric[];
    filter?: AggregateFilter[];
    orderBy?: AggregateOrderBy[];
    limit?: number;
    mode?: AggregateMode;
    sampleSize?: number;
    allowFullScan?: boolean;
}

interface WorkerRequestMap {
    profile: { datasetId: string; sampleSize?: number };
    sample: { datasetId: string; n?: number; withColumns?: boolean };
    aggregate: AggregatePayload;
}

type WorkerAction = keyof WorkerRequestMap;

interface WorkerRequest<T extends WorkerAction = WorkerAction> {
    id: string;
    action: T;
    payload: WorkerRequestMap[T];
}

interface WorkerSuccess<T> {
    id: string;
    ok: true;
    result: T;
    durationMs: number;
}

interface WorkerFailure {
    id: string;
    ok: false;
    reason: string;
    hint?: string;
    durationMs: number;
}

type WorkerResponse<T = any> = WorkerSuccess<T> | WorkerFailure;

interface ProfileColumnInsight {
    name: string;
    type: ColumnProfile['type'];
    distinct: number;
    emptyPercentage: number;
    examples: string[];
}

interface ProfileResult {
    rowCount: number;
    sampledRows: number;
    columns: ProfileColumnInsight[];
    warnings: string[];
}

interface SampleResult {
    rows: CsvRow[];
    sampled: boolean;
    columns?: ColumnProfile[];
}

interface AggregateResult {
    schema: Array<{ name: string; type: string }>;
    rows: CsvRow[];
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
}

const DEFAULT_PROFILE_SAMPLE = 2000;
const DEFAULT_SAMPLE_SIZE = 1000;
const DEFAULT_AGG_SAMPLE = 3000;
const DEFAULT_TIMEOUT_MS = 3000;

const simpleHash = (input: string): string => {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        hash = (hash << 5) - hash + input.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash).toString(36);
};

const normalizeValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value.trim();
    return String(value);
};

const extractExamples = (rows: CsvRow[], column: string, limit = 3): string[] => {
    const examples: string[] = [];
    for (const row of rows) {
        const value = row[column];
        if (value === null || value === undefined || value === '') continue;
        const normalized = normalizeValue(value);
        if (!normalized) continue;
        if (!examples.includes(normalized)) {
            examples.push(normalized);
        }
        if (examples.length >= limit) break;
    }
    return examples;
};

const buildProfileResult = async (
    payload: WorkerRequestMap['profile'],
): Promise<ProfileResult> => {
    const { datasetId, sampleSize = DEFAULT_PROFILE_SAMPLE } = payload;
    if (!datasetId) {
        throw new Error('datasetId is required for profiling.');
    }
    const dbModule = await ensureDbModule();
    const [columnRecord, sampleRows] = await Promise.all([
        dbModule.readColumnStoreRecord(datasetId),
        dbModule.readSampledRows(datasetId, sampleSize),
    ]);

    if (!columnRecord) {
        throw new Error('No cached metadata for this dataset. Try re-uploading the CSV.');
    }

    if (sampleRows.length === 0) {
        throw new Error('No rows available to profile.');
    }

    const profile = profileData(sampleRows);
    const insights: ProfileColumnInsight[] = profile.map(col => ({
        name: col.name,
        type: col.type,
        distinct: col.uniqueValues ?? new Set(sampleRows.map(row => row[col.name])).size,
        emptyPercentage: col.missingPercentage ?? 0,
        examples: extractExamples(sampleRows, col.name),
    }));

    const warnings: string[] = [];
    if (columnRecord.rowCount > sampleRows.length) {
        warnings.push(
            `Profiled ${sampleRows.length.toLocaleString()} rows (sample) out of ${columnRecord.rowCount.toLocaleString()}.`,
        );
    }

    return {
        rowCount: columnRecord.rowCount,
        sampledRows: sampleRows.length,
        columns: insights,
        warnings,
    };
};

const passesFilter = (row: CsvRow, filters?: AggregateFilter[]): boolean => {
    if (!filters || filters.length === 0) return true;
    return filters.every(filter => {
        const rawValue = row[filter.column];
        const normalized = normalizeValue(rawValue);
        const needle = normalizeValue(filter.value ?? '');
        switch (filter.op) {
            case 'eq':
                return filter.caseInsensitive
                    ? normalized.toLowerCase() === needle.toLowerCase()
                    : normalized === needle;
            case 'neq':
                return filter.caseInsensitive
                    ? normalized.toLowerCase() !== needle.toLowerCase()
                    : normalized !== needle;
            case 'gt':
                return Number(normalized) > Number(needle);
            case 'gte':
                return Number(normalized) >= Number(needle);
            case 'lt':
                return Number(normalized) < Number(needle);
            case 'lte':
                return Number(normalized) <= Number(needle);
            case 'contains':
                return normalized.toLowerCase().includes(needle.toLowerCase());
            case 'in':
                if (!Array.isArray(filter.values)) return false;
                return filter.values.some(value => normalizeValue(value) === normalized);
            default:
                return true;
        }
    });
};

const parseNumeric = (value: any): number | null => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const cleaned = normalizeValue(value).replace(/[$,%\s]/g, '').replace(/,/g, '');
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
};

const aggregateRows = (
    rows: CsvRow[],
    payload: AggregatePayload,
    totalRows: number,
): AggregateResult => {
    const mode: AggregateMode = payload.mode ?? 'sample';
    if (!Array.isArray(payload.metrics) || payload.metrics.length === 0) {
        throw new Error('metrics[] is required for aggregation.');
    }

    if (mode === 'full' && !payload.allowFullScan) {
        throw new Error('FULL_SCAN_BLOCKED');
    }

    const by = payload.by ?? [];
    const groups = new Map<
        string,
        {
            keys: Record<string, string | number>;
            accumulators: Record<string, { sum: number; count: number; min: number; max: number }>;
        }
    >();
    const filterCount = payload.filter?.length ?? 0;
    const deadline = performance.now() + DEFAULT_TIMEOUT_MS;

    for (const row of rows) {
        if (!passesFilter(row, payload.filter)) continue;
        if (performance.now() > deadline) {
            if (mode === 'full') {
                throw new Error('AGG_TIMEOUT');
            }
            break;
        }
        const keyParts = by.map(column => normalizeValue(row[column]));
        const groupKey = keyParts.length > 0 ? keyParts.join('||') : '__total__';
        if (!groups.has(groupKey)) {
            const keyRecord: Record<string, string | number> = {};
            by.forEach((column, index) => {
                keyRecord[column] = keyParts[index];
            });
            const metricMap: Record<string, { sum: number; count: number; min: number; max: number }> = {};
            payload.metrics.forEach(metric => {
                const alias = metric.as ?? `${metric.fn}_${metric.column ?? 'rows'}`;
                metricMap[alias] = {
                    sum: 0,
                    count: 0,
                    min: Number.POSITIVE_INFINITY,
                    max: Number.NEGATIVE_INFINITY,
                };
            });
            groups.set(groupKey, { keys: keyRecord, accumulators: metricMap });
        }

        const group = groups.get(groupKey)!;
        payload.metrics.forEach(metric => {
            const alias = metric.as ?? `${metric.fn}_${metric.column ?? 'rows'}`;
            const accumulator = group.accumulators[alias];
            if (metric.fn === 'count') {
                accumulator.count += 1;
                accumulator.sum += 1;
                return;
            }

            if (!metric.column) {
                throw new Error(`Metric ${metric.fn} requires a column.`);
            }

            const numeric = parseNumeric(row[metric.column]);
            if (numeric === null) {
                return;
            }
            accumulator.count += 1;
            accumulator.sum += numeric;
            accumulator.min = Math.min(accumulator.min, numeric);
            accumulator.max = Math.max(accumulator.max, numeric);
        });
    }

    const schema: Array<{ name: string; type: string }> = [
        ...by.map(column => ({ name: column, type: 'string' })),
        ...payload.metrics.map(metric => ({
            name: metric.as ?? `${metric.fn}_${metric.column ?? 'rows'}`,
            type: 'number',
        })),
    ];

    const rowsOut: CsvRow[] = [];
    for (const group of groups.values()) {
        const row: CsvRow = { ...group.keys };
        payload.metrics.forEach(metric => {
            const alias = metric.as ?? `${metric.fn}_${metric.column ?? 'rows'}`;
            const accumulator = group.accumulators[alias];
            let value: number | null = null;
            switch (metric.fn) {
                case 'sum':
                    value = accumulator.sum;
                    break;
                case 'avg':
                    value = accumulator.count > 0 ? accumulator.sum / accumulator.count : null;
                    break;
                case 'count':
                    value = accumulator.count;
                    break;
                case 'min':
                    value =
                        accumulator.min === Number.POSITIVE_INFINITY ? null : accumulator.min;
                    break;
                case 'max':
                    value =
                        accumulator.max === Number.NEGATIVE_INFINITY ? null : accumulator.max;
                    break;
            }
            row[alias] = value ?? 0;
        });
        rowsOut.push(row);
    }

    if (payload.orderBy && payload.orderBy.length > 0) {
        rowsOut.sort((a, b) => {
            for (const order of payload.orderBy!) {
                const dir = (order.direction ?? 'desc').toLowerCase() === 'asc' ? 1 : -1;
                const av = a[order.column];
                const bv = b[order.column];
                if (av === bv) continue;
                if (av === undefined || av === null) return 1;
                if (bv === undefined || bv === null) return -1;
                if (typeof av === 'number' && typeof bv === 'number') {
                    return av > bv ? dir : -dir;
                }
                const aVal = String(av).localeCompare(String(bv));
                if (aVal !== 0) {
                    return aVal * dir;
                }
            }
            return 0;
        });
    }

    const limitedRows = typeof payload.limit === 'number' ? rowsOut.slice(0, payload.limit) : rowsOut;
    const isSampled = mode !== 'full';
    const warnings: string[] = [];
    if (isSampled) {
        warnings.push('Aggregated on sampled rows. Retry with allowFullScan for full coverage.');
    }

    return {
        schema,
        rows: limitedRows,
        provenance: {
            datasetId: payload.datasetId,
            sampled: isSampled,
            mode,
            processedRows: rows.length,
            totalRows,
            queryHash: simpleHash(
                JSON.stringify({
                    by,
                    metrics: payload.metrics,
                    filter: payload.filter,
                    orderBy: payload.orderBy,
                    limit: payload.limit,
                    mode,
                }),
            ),
            filterCount,
            warnings,
        },
    };
};

const runAggregate = async (payload: AggregatePayload): Promise<AggregateResult> => {
    const dbModule = await ensureDbModule();
    const columnRecord = await dbModule.readColumnStoreRecord(payload.datasetId);
    if (!columnRecord) {
        throw new Error('No cached metadata for aggregation.');
    }
    const mode: AggregateMode = payload.mode ?? 'sample';
    const sampleSize = payload.sampleSize ?? DEFAULT_AGG_SAMPLE;
    try {
        const rows =
            mode === 'full'
                ? await dbModule.readAllRows(payload.datasetId)
                : await dbModule.readSampledRows(payload.datasetId, sampleSize);
        if (rows.length === 0) {
            throw new Error('No rows available for aggregation.');
        }
        return aggregateRows(rows, payload, columnRecord.rowCount);
    } catch (error) {
        if (error instanceof Error && error.message === 'FULL_SCAN_BLOCKED') {
            throw Object.assign(new Error('Full scan requires confirmation.'), {
                code: 'FULL_SCAN_BLOCKED',
            });
        }
        if (error instanceof Error && error.message === 'AGG_TIMEOUT' && mode === 'full') {
            const fallbackRows = await dbModule.readSampledRows(payload.datasetId, sampleSize);
            const fallback = aggregateRows(fallbackRows, { ...payload, mode: 'sample' }, columnRecord.rowCount);
            fallback.provenance.warnings.push('Full scan timed out. Showing sampled results.');
            return fallback;
        }
        throw error;
    }
};

const buildSampleResult = async (
    payload: WorkerRequestMap['sample'],
): Promise<SampleResult> => {
    const { datasetId, n = DEFAULT_SAMPLE_SIZE, withColumns = false } = payload;
    if (!datasetId) {
        throw new Error('datasetId is required for sampling.');
    }
    const dbModule = await ensureDbModule();
    const [rows, columnRecord] = await Promise.all([
        dbModule.readSampledRows(datasetId, n),
        withColumns ? dbModule.readColumnStoreRecord(datasetId) : Promise.resolve(null),
    ]);
    if (rows.length === 0) {
        throw new Error('No rows available to sample.');
    }
    return {
        rows,
        sampled: true,
        columns: columnRecord?.columns,
    };
};

const handleRequest = async (request: WorkerRequest): Promise<WorkerResponse> => {
    const startedAt = performance.now();
    try {
        let result: any;
        switch (request.action) {
            case 'profile':
                result = await buildProfileResult(request.payload);
                break;
            case 'sample':
                result = await buildSampleResult(request.payload);
                break;
            case 'aggregate':
                result = await runAggregate(request.payload);
                break;
            default:
                throw new Error(`Unknown action: ${request.action}`);
        }
        return {
            id: request.id,
            ok: true,
            result,
            durationMs: performance.now() - startedAt,
        };
    } catch (error) {
        const reason = error instanceof Error ? error.message : 'Unknown worker error';
        let hint: string | undefined;
        if (error instanceof Error && (error as any).code === 'FULL_SCAN_BLOCKED') {
            hint = 'Please confirm full scan with the user, then retry with allowFullScan=true.';
        } else if (reason.includes('IndexedDB')) {
            hint = 'Browser blocked IndexedDB in this worker; falling back to main thread.';
        } else {
            hint = 'Retry with a smaller sample or adjust your query.';
        }
        return {
            id: request.id,
            ok: false,
            reason,
            hint,
            durationMs: performance.now() - startedAt,
        };
    }
};

self.addEventListener('message', event => {
    const data = event.data as WorkerRequest;
    if (!data || typeof data.id !== 'string') {
        return;
    }
    handleRequest(data).then(response => {
        self.postMessage(response);
    });
});

export {};
