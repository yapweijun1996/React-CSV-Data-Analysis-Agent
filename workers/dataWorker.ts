/// <reference lib="webworker" />

import {
    buildProfileResult,
    buildSampleResult,
    runAggregate,
    type DataWorkerDeps,
} from '../services/dataWorkerShared';
import { ERROR_CODES, type ErrorCode } from '../services/errorCodes';
import type { AggregatePayload, ProfileResult, SampleResult, AggregateResult } from '../services/dataToolTypes';

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
    code?: ErrorCode;
}

type WorkerResponse<T = any> = WorkerSuccess<T> | WorkerFailure;

const getDeps = async (): Promise<DataWorkerDeps> => {
    const module = await ensureDbModule();
    return {
        readColumnStoreRecord: module.readColumnStoreRecord,
        readSampledRows: module.readSampledRows,
        readAllRows: module.readAllRows,
        readDatasetRuntimeConfig: module.readDatasetRuntimeConfig,
    };
};

const handleRequest = async (request: WorkerRequest): Promise<WorkerResponse> => {
    const startedAt = performance.now();
    try {
        let result: any;
        const deps = await getDeps();
        switch (request.action) {
            case 'profile':
                result = await buildProfileResult(deps, request.payload);
                break;
            case 'sample':
                result = await buildSampleResult(deps, request.payload);
                break;
            case 'aggregate':
                result = await runAggregate(deps, request.payload);
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
        let code = (error as any)?.code as ErrorCode | undefined;
        if (error instanceof Error && (error as any).code === 'FULL_SCAN_BLOCKED') {
            hint = 'Please confirm full scan with the user, then retry with allowFullScan=true.';
        } else if (reason.includes('IndexedDB')) {
            hint = 'Browser blocked IndexedDB in this worker; falling back to main thread.';
            code = code ?? ERROR_CODES.INDEXEDDB_UNAVAILABLE;
        } else {
            hint = 'Retry with a smaller sample or adjust your query.';
        }
        return {
            id: request.id,
            ok: false,
            reason,
            hint,
            code,
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
