import { profileData } from '../utils/dataProcessor';
import type { CsvRow, ColumnProfile } from '../types';
import type { ColumnStoreRecord } from './csvAgentDb';
import type {
    AggregatePayload,
    AggregateResult,
    AggregateMode,
    ProfileResult,
    SampleResult,
} from './dataToolTypes';

export interface DataWorkerDeps {
    readColumnStoreRecord: (datasetId: string) => Promise<ColumnStoreRecord | null>;
    readSampledRows: (datasetId: string, limit: number) => Promise<CsvRow[]>;
    readAllRows: (datasetId: string) => Promise<CsvRow[]>;
}

export const DEFAULT_PROFILE_SAMPLE = 2000;
export const DEFAULT_SAMPLE_SIZE = 1000;
export const DEFAULT_AGG_SAMPLE = 3000;
export const DEFAULT_TIMEOUT_MS = 3000;

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

export const buildProfileResult = async (
    deps: DataWorkerDeps,
    payload: { datasetId: string; sampleSize?: number },
): Promise<ProfileResult> => {
    const { datasetId, sampleSize = DEFAULT_PROFILE_SAMPLE } = payload;
    if (!datasetId) {
        throw new Error('datasetId is required for profiling.');
    }

    const [columnRecord, sampleRows] = await Promise.all([
        deps.readColumnStoreRecord(datasetId),
        deps.readSampledRows(datasetId, sampleSize),
    ]);

    if (!columnRecord) {
        throw new Error('No cached metadata for this dataset. Try re-uploading the CSV.');
    }

    if (sampleRows.length === 0) {
        throw new Error('No rows available to profile.');
    }

    const profile = profileData(sampleRows);
    const insights: ProfileResult['columns'] = profile.map(col => ({
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

const passesFilter = (row: CsvRow, filters?: AggregatePayload['filter']): boolean => {
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
    const deadline = (typeof performance !== 'undefined' ? performance.now() : Date.now()) + DEFAULT_TIMEOUT_MS;

    for (const row of rows) {
        if (!passesFilter(row, payload.filter)) continue;
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        if (now > deadline) {
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
                    value = accumulator.min === Number.POSITIVE_INFINITY ? null : accumulator.min;
                    break;
                case 'max':
                    value = accumulator.max === Number.NEGATIVE_INFINITY ? null : accumulator.max;
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
                const comparison = String(av).localeCompare(String(bv));
                if (comparison !== 0) {
                    return comparison * dir;
                }
            }
            return 0;
        });
    }

    const limitedRows = typeof payload.limit === 'number' ? rowsOut.slice(0, payload.limit) : rowsOut;
    const processedRows = rows.length;
    const isSampled = mode !== 'full' && processedRows < totalRows;
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
            processedRows,
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

export const runAggregate = async (
    deps: DataWorkerDeps,
    payload: AggregatePayload,
): Promise<AggregateResult> => {
    const columnRecord = await deps.readColumnStoreRecord(payload.datasetId);
    if (!columnRecord) {
        throw new Error('No cached metadata for aggregation.');
    }
    const mode: AggregateMode = payload.mode ?? 'sample';
    const sampleSize = payload.sampleSize ?? DEFAULT_AGG_SAMPLE;
    try {
        const rows =
            mode === 'full'
                ? await deps.readAllRows(payload.datasetId)
                : await deps.readSampledRows(payload.datasetId, sampleSize);
        if (rows.length === 0) {
            throw new Error('No rows available for aggregation.');
        }
        return aggregateRows(rows, payload, columnRecord.rowCount);
    } catch (error) {
        if (error instanceof Error && (error as any).message === 'FULL_SCAN_BLOCKED') {
            throw Object.assign(new Error('Full scan requires confirmation.'), {
                code: 'FULL_SCAN_BLOCKED',
            });
        }
        if (error instanceof Error && error.message === 'AGG_TIMEOUT' && mode === 'full') {
            const fallbackRows = await deps.readSampledRows(payload.datasetId, sampleSize);
            const fallback = aggregateRows(fallbackRows, { ...payload, mode: 'sample' }, columnRecord.rowCount);
            fallback.provenance.warnings.push('Full scan timed out. Showing sampled results.');
            return fallback;
        }
        throw error;
    }
};

export const buildSampleResult = async (
    deps: DataWorkerDeps,
    payload: { datasetId: string; n?: number; withColumns?: boolean },
): Promise<SampleResult> => {
    const { datasetId, n = DEFAULT_SAMPLE_SIZE, withColumns = false } = payload;
    if (!datasetId) {
        throw new Error('datasetId is required for sampling.');
    }
    const [rows, columnRecord] = await Promise.all([
        deps.readSampledRows(datasetId, n),
        withColumns ? deps.readColumnStoreRecord(datasetId) : Promise.resolve(null),
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
