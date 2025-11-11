import type { CardKind, CardDataRef } from './csvAgentDb';
import {
    saveCardResult,
    readAllRows,
    readColumnStoreRecord,
    readSampledRows,
    ensureColumnStoreRecord,
    readDatasetRuntimeConfig,
} from './csvAgentDb';
import type { AnalysisPlan } from '../types';
import {
    buildProfileResult,
    buildSampleResult,
    runAggregate,
    type DataWorkerDeps,
    COLUMN_METADATA_ERROR,
} from './dataWorkerShared';
import type { AggregatePayload, AggregateResult, ProfileResult, SampleResult } from './dataToolTypes';
import type { ErrorCode } from './errorCodes';

type WorkerAction = 'profile' | 'sample' | 'aggregate';

interface WorkerEnvelope<T = any> {
    id: string;
    ok: boolean;
    result?: T;
    reason?: string;
    hint?: string;
    durationMs?: number;
    code?: ErrorCode;
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

type WorkerPayloadMap = {
    profile: ProfilePayload;
    sample: SamplePayload;
    aggregate: AggregatePayload;
};

export type ToolResult<T> =
    | { ok: true; data: T; durationMs: number }
    | { ok: false; reason: string; hint?: string; durationMs?: number; code?: ErrorCode };

type PendingResolver<T> = (response: WorkerEnvelope<T>) => void;

let workerInstance: Worker | null = null;
const pendingRequests = new Map<string, PendingResolver<any>>();
let workerDisabledReason: string | null = null;

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
                        code: response.code,
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

const disableWorker = (reason?: string) => {
    if (workerDisabledReason) return;
    workerDisabledReason = reason ?? 'Data worker disabled due to browser limitations.';
    if (workerInstance) {
        workerInstance.terminate();
        workerInstance = null;
    }
    pendingRequests.clear();
    console.warn(`[dataTools] Worker disabled: ${workerDisabledReason}`);
};

const shouldDisableWorker = (reason?: string, hint?: string): boolean => {
    const text = `${reason ?? ''} ${hint ?? ''}`.toLowerCase();
    return text.includes('indexeddb') || text.includes('falling back to main thread');
};

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const formatError = (error: unknown) => (error instanceof Error ? error.message : String(error ?? 'Unknown error'));

const isColumnMetadataError = (reason?: string): boolean => {
    if (typeof reason !== 'string') return false;
    return reason.toUpperCase().includes(COLUMN_METADATA_ERROR);
};

const attemptColumnMetadataRecovery = async (datasetId: string): Promise<boolean> => {
    try {
        const record = await ensureColumnStoreRecord(datasetId);
        if (!record) {
            console.warn(`[dataTools] Unable to rebuild column metadata for dataset ${datasetId}.`);
            return false;
        }
        console.info(`[dataTools] Rebuilt column metadata for dataset ${datasetId}.`);
        return true;
    } catch (error) {
        console.error(`[dataTools] Failed to recover column metadata for dataset ${datasetId}.`, error);
        return false;
    }
};

const runWithMetadataRecovery = async <T>(
    datasetId: string | undefined,
    runner: () => Promise<ToolResult<T>>,
): Promise<ToolResult<T>> => {
    let result = await runner();
    if (!datasetId || result.ok || !isColumnMetadataError(result.reason)) {
        return result;
    }
    const recovered = await attemptColumnMetadataRecovery(datasetId);
    if (!recovered) {
        return {
            ok: false,
            reason: 'Cached column metadata is unavailable and auto-recovery failed. Please re-upload your CSV.',
            hint: result.hint,
            durationMs: result.durationMs,
        };
    }
    const retryResult = await runner();
    if (!retryResult.ok && isColumnMetadataError(retryResult.reason)) {
        return {
            ok: false,
            reason: 'Cached column metadata is still missing. Please re-upload your CSV.',
            hint: retryResult.hint,
            durationMs: retryResult.durationMs,
        };
    }
    return retryResult;
};

const mainThreadDeps: DataWorkerDeps = {
    readColumnStoreRecord,
    readSampledRows,
    readAllRows,
    readDatasetRuntimeConfig,
};

const runLocalProfile = async (datasetId: string, sampleSize?: number): Promise<ToolResult<ProfileResult>> => {
    try {
        const started = now();
        const data = await buildProfileResult(mainThreadDeps, { datasetId, sampleSize });
        return { ok: true, data, durationMs: now() - started };
    } catch (error) {
        return { ok: false, reason: formatError(error) };
    }
};

const runLocalSample = async (
    datasetId: string,
    options: { n?: number; withColumns?: boolean },
): Promise<ToolResult<SampleResult>> => {
    try {
        const started = now();
        const data = await buildSampleResult(mainThreadDeps, { datasetId, ...options });
        return { ok: true, data, durationMs: now() - started };
    } catch (error) {
        return { ok: false, reason: formatError(error) };
    }
};

const runLocalAggregate = async (payload: AggregatePayload): Promise<ToolResult<AggregateResult>> => {
    try {
        const started = now();
        const data = await runAggregate(mainThreadDeps, payload);
        return { ok: true, data, durationMs: now() - started };
    } catch (error) {
        return { ok: false, reason: formatError(error) };
    }
};

const runWithFallback = async <K extends WorkerAction, R>(
    action: K,
    payload: WorkerPayloadMap[K],
    fallback: () => Promise<ToolResult<R>>,
): Promise<ToolResult<R>> => {
    if (workerDisabledReason) {
        return fallback();
    }
    const result = await callWorker<K, R>(action, payload);
    if (!result.ok && shouldDisableWorker(result.reason, result.hint)) {
        disableWorker(result.reason ?? result.hint);
        return fallback();
    }
    return result;
};

export const dataTools = {
    profile: (datasetId: string, sampleSize?: number) =>
        runWithMetadataRecovery(datasetId, () =>
            runWithFallback<'profile', ProfileResult>('profile', { datasetId, sampleSize }, () =>
                runLocalProfile(datasetId, sampleSize),
            ),
        ),
    sample: (datasetId: string, options?: { n?: number; withColumns?: boolean }) =>
        runWithMetadataRecovery(datasetId, () =>
            runWithFallback<'sample', SampleResult>('sample', { datasetId, ...(options ?? {}) }, () =>
                runLocalSample(datasetId, options ?? {}),
            ),
        ),
    aggregate: (payload: AggregatePayload) =>
        runWithMetadataRecovery(payload.datasetId, () =>
            runWithFallback<'aggregate', AggregateResult>('aggregate', payload, () => runLocalAggregate(payload)),
        ),
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

export type { ProfileResult, SampleResult, AggregateResult, AggregatePayload } from './dataToolTypes';
