import type { CardKind, CardDataRef } from './csvAgentDb';
import { saveCardResult } from './csvAgentDb';
import type { AnalysisPlan } from '../types';

type WorkerAction = 'profile' | 'sample' | 'aggregate';

interface WorkerEnvelope<T = any> {
    id: string;
    ok: boolean;
    result?: T;
    reason?: string;
    hint?: string;
    durationMs?: number;
}

interface ProfilePayload {
    datasetId: string;
    sampleSize?: number;
}

interface SamplePayload {
    datasetId: string;
    n?: number;
    withColumns?: boolean;
}

type AggregatePayload = {
    datasetId: string;
    by?: string[];
    metrics: Array<{ column?: string; fn: 'sum' | 'avg' | 'count' | 'min' | 'max'; as?: string }>;
    filter?: Array<{
        column: string;
        op: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in';
        value?: string | number | null;
        values?: Array<string | number | null>;
        caseInsensitive?: boolean;
    }>;
    orderBy?: Array<{ column: string; direction?: 'asc' | 'desc' }>;
    limit?: number;
    mode?: 'sample' | 'full';
    sampleSize?: number;
    allowFullScan?: boolean;
};

type WorkerPayloadMap = {
    profile: ProfilePayload;
    sample: SamplePayload;
    aggregate: AggregatePayload;
};

export type ToolResult<T> =
    | { ok: true; data: T; durationMs: number }
    | { ok: false; reason: string; hint?: string; durationMs?: number };

type ProfileResult = {
    rowCount: number;
    sampledRows: number;
    columns: Array<{
        name: string;
        type: string;
        distinct: number;
        emptyPercentage: number;
        examples: string[];
    }>;
    warnings: string[];
};

type SampleResult = {
    rows: Array<Record<string, any>>;
    sampled: boolean;
    columns?: Array<{ name: string; type: string }>;
};

type AggregateResult = {
    schema: Array<{ name: string; type: string }>;
    rows: Array<Record<string, any>>;
    provenance: {
        datasetId: string;
        sampled: boolean;
        mode: 'sample' | 'full';
        processedRows: number;
        totalRows: number;
        queryHash: string;
        filterCount: number;
        warnings: string[];
    };
};

type PendingResolver<T> = (response: WorkerEnvelope<T>) => void;

let workerInstance: Worker | null = null;
const pendingRequests = new Map<string, PendingResolver<any>>();

const createWorker = (): Worker => {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
        throw new Error('Web Workers are not supported in this environment.');
    }
    const worker = new Worker(new URL('../workers/dataWorker.ts', import.meta.url), {
        type: 'module',
    });
    worker.onmessage = event => {
        const message = event.data as WorkerEnvelope;
        if (!message || typeof message.id !== 'string') return;
        const resolver = pendingRequests.get(message.id);
        if (resolver) {
            pendingRequests.delete(message.id);
            resolver(message);
        }
    };
    worker.onerror = errorEvent => {
        console.error('dataWorker runtime error:', errorEvent);
        const reason =
            (errorEvent as ErrorEvent)?.message && typeof (errorEvent as ErrorEvent).message === 'string'
                ? `Data worker crashed: ${(errorEvent as ErrorEvent).message}`
                : 'Data worker crashed.';
        pendingRequests.forEach(resolver =>
            resolver({
                id: 'error',
                ok: false,
                reason,
                hint: 'Reload and retry your action.',
            }),
        );
        pendingRequests.clear();
        worker.terminate();
        workerInstance = null;
    };
    return worker;
};

const getWorker = (): Worker => {
    workerInstance = workerInstance ?? createWorker();
    return workerInstance;
};

const callWorker = async <K extends WorkerAction, R>(
    action: K,
    payload: WorkerPayloadMap[K],
): Promise<ToolResult<R>> => {
    try {
        const worker = getWorker();
        const requestId = `${action}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        return await new Promise(resolve => {
            pendingRequests.set(requestId, response => {
                if (response.ok && response.result) {
                    resolve({ ok: true, data: response.result as R, durationMs: response.durationMs ?? 0 });
                } else {
                    resolve({
                        ok: false,
                        reason: response.reason ?? 'Worker failed to respond.',
                        hint: response.hint,
                        durationMs: response.durationMs,
                    });
                }
            });
            worker.postMessage({ id: requestId, action, payload });
        });
    } catch (error) {
        const reason = error instanceof Error ? error.message : 'Failed to start worker.';
        return {
            ok: false,
            reason,
            hint: 'This browser may not support Web Workers. Try a modern Chromium-based browser.',
        };
    }
};

export const dataTools = {
    profile: (datasetId: string, sampleSize?: number) =>
        callWorker<'profile', ProfileResult>('profile', { datasetId, sampleSize }),
    sample: (datasetId: string, options?: { n?: number; withColumns?: boolean }) =>
        callWorker<'sample', SampleResult>('sample', { datasetId, ...(options ?? {}) }),
    aggregate: (payload: AggregatePayload) =>
        callWorker<'aggregate', AggregateResult>('aggregate', payload),
    createCardFromResult: async ({
        datasetId,
        title,
        kind,
        explainer,
        result,
        plan,
    }: {
        datasetId: string;
        title: string;
        kind: CardKind;
        explainer: string;
        result: AggregateResult;
        plan?: AnalysisPlan;
    }): Promise<ToolResult<{ cardId: string }>> => {
        try {
            const dataRef: CardDataRef = {
                schema: result.schema,
                rows: result.rows,
                sampled: result.provenance.sampled,
                source: 'aggregate',
                planSnapshot: plan,
            };
            const cardId = await saveCardResult({
                datasetId,
                title,
                kind,
                queryHash: result.provenance.queryHash,
                explainer,
                dataRef,
            });
            return { ok: true, data: { cardId }, durationMs: 0 };
        } catch (error) {
            const reason = error instanceof Error ? error.message : 'Failed to store card.';
            return {
                ok: false,
                reason,
                hint: 'Retry after checking IndexedDB permissions.',
            };
        }
    },
};

export type { ProfileResult, SampleResult, AggregateResult, AggregatePayload };
