import { openDB, type IDBPDatabase } from 'idb';
import type { CsvRow, ColumnProfile, AnalysisPlan, DataTransformMeta } from '../types';
import { profileData } from '../utils/dataProcessor';

export interface DatasetProvenanceRecord {
    datasetId: string;
    fileName: string;
    bytes: number;
    checksum: string;
    cleanedAt: string;
}

interface CleanRowChunkRecord {
    chunkId: string;
    datasetId: string;
    rowCount: number;
    startRow: number;
    endRow: number;
    rows: CsvRow[];
    createdAt: string;
}

export interface ColumnStoreRecord {
    datasetId: string;
    columnCount: number;
    rowCount: number;
    columns: ColumnProfile[];
    updatedAt: string;
}

export interface ViewStoreRecord<DataRef = any> {
    id: string;
    datasetId: string;
    title: string;
    kind: string;
    dataRef: DataRef;
    explainer: string;
    queryHash: string;
    createdAt: string;
}

export type CardKind = 'kpi' | 'topn' | 'trend';

export interface CardDataRef {
    schema: Array<{ name: string; type: string }>;
    rows: CsvRow[];
    sampled: boolean;
    source: 'profile' | 'sample' | 'aggregate';
    planSnapshot?: Partial<AnalysisPlan>;
}

export type PreparationLogScope = 'dataset' | 'rows' | 'column';

export interface PreparationLogEntry {
    id: string;
    datasetId: string;
    stepOrder: number;
    scope: PreparationLogScope;
    columnName: string | null;
    rule: string;
    impactSummary: string;
    impactMetrics?: Partial<DataTransformMeta> & {
        totalColumnsBefore?: number;
        totalColumnsAfter?: number;
    };
    details?: Record<string, any>;
    source: 'ai_plan' | 'system' | 'user';
    tags?: string[];
    createdAt: string;
}

export type PreparationLogEntryInput = Omit<PreparationLogEntry, 'id' | 'createdAt'> & {
    id?: string;
    createdAt?: string;
};

export interface MemorySnapshotRecord {
    id: string;
    datasetId: string;
    viewId?: string | null;
    cardId?: string | null;
    title: string;
    summary: string;
    queryHash?: string | null;
    plan?: Partial<AnalysisPlan> | null;
    chartType?: AnalysisPlan['chartType'];
    schema?: Array<{ name: string; type: string }>;
    sampleRows?: CsvRow[];
    rowCount: number;
    sampled: boolean;
    qualityScore?: number;
    tags?: string[];
    createdAt: string;
    expiresAt?: string | null;
}

export type MemorySnapshotInput = Omit<MemorySnapshotRecord, 'id' | 'createdAt'> & {
    id?: string;
    createdAt?: string;
};

const DB_NAME = 'csv_agent_db';
const BASE_VERSION = 3;
const PROVENANCE_STORE = 'provenance';
const CLEAN_ROWS_STORE = 'clean_rows';
const COLUMNS_STORE = 'columns';
const VIEWS_STORE = 'views';
const PREPARATION_LOG_STORE = 'preparation_log';
const MEMORY_SNAPSHOT_STORE = 'memory_snapshots';

const MAX_MEMORY_SNAPSHOTS_PER_DATASET = 32;

let dbPromise: Promise<IDBPDatabase> | null = null;

const createRandomSuffix = () =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const resetDatabase = async () => {
    await new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase(DB_NAME);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        request.onblocked = () => console.warn('IndexedDB delete blocked. Close other tabs to proceed.');
    });
    dbPromise = null;
};

const createStore = (db: IDBPDatabase, storeName: string) => {
    if (db.objectStoreNames.contains(storeName)) return;
    if (storeName === CLEAN_ROWS_STORE) {
        const store = db.createObjectStore(storeName, { keyPath: 'chunkId' });
        store.createIndex('by_dataset', 'datasetId', { unique: false });
        return;
    }
    if (storeName === COLUMNS_STORE) {
        db.createObjectStore(storeName, { keyPath: 'datasetId' });
        return;
    }
    if (storeName === VIEWS_STORE) {
        const store = db.createObjectStore(storeName, { keyPath: 'id' });
        store.createIndex('by_dataset', 'datasetId', { unique: false });
        return;
    }
    if (storeName === PROVENANCE_STORE) {
        db.createObjectStore(storeName, { keyPath: 'datasetId' });
        return;
    }
    if (storeName === PREPARATION_LOG_STORE) {
        const store = db.createObjectStore(storeName, { keyPath: 'id' });
        store.createIndex('by_dataset', 'datasetId', { unique: false });
        return;
    }
    if (storeName === MEMORY_SNAPSHOT_STORE) {
        const store = db.createObjectStore(storeName, { keyPath: 'id' });
        store.createIndex('by_dataset', 'datasetId', { unique: false });
        store.createIndex('by_view', 'viewId', { unique: false });
        return;
    }
    throw new Error(`Unsupported store name: ${storeName}`);
};

const handleVersionMismatch = async <T>(fn: () => Promise<T>): Promise<T> => {
    try {
        return await fn();
    } catch (error) {
        if (error instanceof DOMException && error.name === 'VersionError') {
            console.warn('IndexedDB version mismatch detected. Resetting csv_agent_db...', error);
            await resetDatabase();
            return fn();
        }
        throw error;
    }
};

const DEFAULT_STORE_SET = [
    PROVENANCE_STORE,
    CLEAN_ROWS_STORE,
    COLUMNS_STORE,
    VIEWS_STORE,
    PREPARATION_LOG_STORE,
    MEMORY_SNAPSHOT_STORE,
];

const openDatabase = async (upgradeStores: string[] = []): Promise<IDBPDatabase> => {
    const storesToEnsure = Array.from(new Set([...DEFAULT_STORE_SET, ...upgradeStores]));
    const openWithVersion = (version: number, stores: string[]) =>
        openDB(DB_NAME, version, {
            upgrade(db) {
                stores.forEach(store => createStore(db, store));
            },
        });

    if (!dbPromise) {
        dbPromise = handleVersionMismatch(() => openWithVersion(BASE_VERSION, storesToEnsure));
        return dbPromise;
    }

    const db = await dbPromise;
    const missingStores = storesToEnsure.filter(store => !db.objectStoreNames.contains(store));
    if (missingStores.length === 0) {
        return db;
    }

    db.close();
    const nextVersion = db.version + 1;
    dbPromise = handleVersionMismatch(() => openWithVersion(nextVersion, storesToEnsure));
    return dbPromise;
};

const chunkRows = (rows: CsvRow[], chunkSize: number): CsvRow[][] => {
    const chunks: CsvRow[][] = [];
    for (let i = 0; i < rows.length; i += chunkSize) {
        chunks.push(rows.slice(i, i + chunkSize));
    }
    return chunks;
};

export const persistCleanDataset = async (options: {
    datasetId: string;
    rows: CsvRow[];
    columns: ColumnProfile[];
    provenance: Omit<DatasetProvenanceRecord, 'datasetId'>;
    chunkSize?: number;
}): Promise<{ chunkCount: number; rowCount: number }> => {
    const { datasetId, rows, columns, provenance: provOverrides, chunkSize = 20000 } = options;
    if (!datasetId) throw new Error('persistCleanDataset requires datasetId.');

    const runPersist = async () => {
        const db = await openDatabase([CLEAN_ROWS_STORE, COLUMNS_STORE, VIEWS_STORE]);

        const tx = db.transaction([CLEAN_ROWS_STORE, COLUMNS_STORE, PROVENANCE_STORE], 'readwrite');
        const cleanStore = tx.objectStore(CLEAN_ROWS_STORE);
        const columnStore = tx.objectStore(COLUMNS_STORE);
        const provenanceStore = tx.objectStore(PROVENANCE_STORE);

        const rowsChunks = chunkRows(rows, chunkSize);
        const now = new Date().toISOString();

        try {
            const index = cleanStore.index('by_dataset');
            let existingCursor = await index.openCursor(datasetId);
            while (existingCursor) {
                await existingCursor.delete();
                existingCursor = await existingCursor.continue();
            }

            for (let index = 0; index < rowsChunks.length; index += 1) {
                const chunk = rowsChunks[index];
                const record: CleanRowChunkRecord = {
                    chunkId: `${datasetId}-chunk-${index}`,
                    datasetId,
                    rowCount: chunk.length,
                    startRow: index * chunkSize,
                    endRow: index * chunkSize + chunk.length - 1,
                    rows: chunk,
                    createdAt: now,
                };
                await cleanStore.put(record);
            }

            const columnPayload: ColumnStoreRecord = {
                datasetId,
                columnCount: columns.length,
                columns,
                rowCount: rows.length,
                updatedAt: now,
            };
            await columnStore.put(columnPayload);

            const provenancePayload: DatasetProvenanceRecord = {
                datasetId,
                fileName: provOverrides.fileName,
                bytes: provOverrides.bytes,
                checksum: provOverrides.checksum,
                cleanedAt: provOverrides.cleanedAt,
            };
            await provenanceStore.put(provenancePayload);

            await tx.done;
            return { chunkCount: rowsChunks.length, rowCount: rows.length };
        } catch (error) {
            try {
                tx.abort();
            } catch {
                // ignore abort errors
            }
            await tx.done.catch(() => undefined);
            throw error;
        }
    };

    try {
        return await runPersist();
    } catch (error) {
        if (error instanceof DOMException && error.name === 'NotFoundError') {
            console.warn('IndexedDB store missing detected. Resetting and retrying persist...', error);
            await resetDatabase();
            return runPersist();
        }
        throw error;
    }
};

export const saveCardResult = async (options: {
    datasetId: string;
    title: string;
    kind: CardKind;
    queryHash: string;
    explainer: string;
    dataRef: CardDataRef;
}): Promise<string> => {
    const { datasetId, title, kind, queryHash, explainer, dataRef } = options;
    const db = await openDatabase([VIEWS_STORE]);
    const tx = db.transaction(VIEWS_STORE, 'readwrite');
    const store = tx.objectStore(VIEWS_STORE);
    const id = `${datasetId}-view-${createRandomSuffix()}`;
    const record: ViewStoreRecord<CardDataRef> = {
        id,
        datasetId,
        title,
        kind,
        queryHash,
        explainer,
        dataRef,
        createdAt: new Date().toISOString(),
    };
    await store.put(record);
    await tx.done;
    return id;
};

export const readCardResults = async <T = CardDataRef>(datasetId: string): Promise<Array<ViewStoreRecord<T>>> => {
    const db = await openDatabase([VIEWS_STORE]);
    try {
        const tx = db.transaction(VIEWS_STORE, 'readonly');
        const store = tx.objectStore(VIEWS_STORE);
        const index = store.index('by_dataset');
        const values = (await index.getAll(datasetId)) as Array<ViewStoreRecord<T>>;
        await tx.done;
        return values;
    } catch (error) {
        console.warn(`Failed to read card results for ${datasetId}`, error);
        return [];
    }
};

export const readProvenance = async (datasetId: string): Promise<DatasetProvenanceRecord | undefined> => {
    const db = await openDatabase();
    const tx = db.transaction(PROVENANCE_STORE, 'readonly');
    const store = tx.objectStore(PROVENANCE_STORE);
    const value = (await store.get(datasetId)) as DatasetProvenanceRecord | undefined;
    await tx.done;
    return value ?? undefined;
};

export const readColumnStoreRecord = async (datasetId: string): Promise<ColumnStoreRecord | null> => {
    const db = await openDatabase([COLUMNS_STORE]);
    const tx = db.transaction(COLUMNS_STORE, 'readonly');
    const store = tx.objectStore(COLUMNS_STORE);
    const record = (await store.get(datasetId)) as ColumnStoreRecord | undefined;
    await tx.done;
    return record ?? null;
};

export const readColumnProfiles = async (datasetId: string): Promise<ColumnProfile[] | null> => {
    const record = await readColumnStoreRecord(datasetId);
    return record?.columns ?? null;
};

const iterateChunks = async (
    datasetId: string,
    handler: (chunk: CleanRowChunkRecord, stop: () => void) => void | Promise<void>,
): Promise<void> => {
    const db = await openDatabase([CLEAN_ROWS_STORE]);
    const tx = db.transaction(CLEAN_ROWS_STORE, 'readonly');
    const store = tx.objectStore(CLEAN_ROWS_STORE);
    const index = store.index('by_dataset');
    let shouldStop = false;
    const stop = () => {
        shouldStop = true;
    };
    let cursor = await index.openCursor(datasetId);
    while (cursor && !shouldStop) {
        const chunk = cursor.value as CleanRowChunkRecord;
        await handler(chunk, stop);
        if (shouldStop) break;
        cursor = await cursor.continue();
    }
    await tx.done;
};

const countDatasetRows = async (datasetId: string): Promise<number> => {
    let total = 0;
    await iterateChunks(datasetId, chunk => {
        const chunkSize = typeof chunk.rowCount === 'number' ? chunk.rowCount : chunk.rows.length;
        total += chunkSize;
    });
    return total;
};

export const readSampledRows = async (datasetId: string, limit: number): Promise<CsvRow[]> => {
    const rows: CsvRow[] = [];
    await iterateChunks(datasetId, (chunk, stop) => {
        for (const row of chunk.rows) {
            rows.push(row);
            if (rows.length >= limit) {
                stop();
                break;
            }
        }
    });
    return rows;
};

export const readAllRows = async (datasetId: string): Promise<CsvRow[]> => {
    const rows: CsvRow[] = [];
    await iterateChunks(datasetId, chunk => {
        rows.push(...chunk.rows);
    });
    return rows;
};

const normalizeLogEntries = (
    datasetId: string,
    entries: PreparationLogEntryInput[],
): PreparationLogEntry[] => {
    const now = new Date().toISOString();
    return entries.map((entry, index) => ({
        ...entry,
        datasetId,
        id: entry.id ?? `${datasetId}-prep-${createRandomSuffix()}`,
        stepOrder: typeof entry.stepOrder === 'number' ? entry.stepOrder : index,
        scope: entry.scope ?? 'dataset',
        columnName: entry.columnName ?? null,
        source: entry.source ?? 'ai_plan',
        tags: entry.tags ?? [],
        createdAt: entry.createdAt ?? now,
    }));
};

export const replacePreparationLog = async (
    datasetId: string,
    entries: PreparationLogEntryInput[] = [],
): Promise<void> => {
    if (!datasetId) throw new Error('replacePreparationLog requires datasetId.');
    const db = await openDatabase([PREPARATION_LOG_STORE]);
    const tx = db.transaction(PREPARATION_LOG_STORE, 'readwrite');
    const store = tx.objectStore(PREPARATION_LOG_STORE);
    const index = store.index('by_dataset');
    let cursor = await index.openCursor(datasetId);
    while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
    }
    if (entries.length > 0) {
        const normalized = normalizeLogEntries(datasetId, entries).sort(
            (a, b) => a.stepOrder - b.stepOrder || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
        for (const entry of normalized) {
            await store.put(entry);
        }
    }
    await tx.done;
};

export const readPreparationLog = async (datasetId: string): Promise<PreparationLogEntry[]> => {
    if (!datasetId) return [];
    const db = await openDatabase([PREPARATION_LOG_STORE]);
    try {
        const tx = db.transaction(PREPARATION_LOG_STORE, 'readonly');
        const store = tx.objectStore(PREPARATION_LOG_STORE);
        const index = store.index('by_dataset');
        const values = (await index.getAll(datasetId)) as PreparationLogEntry[];
        await tx.done;
        return values.sort(
            (a, b) => a.stepOrder - b.stepOrder || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
    } catch (error) {
        console.warn(`Failed to read preparation log for ${datasetId}`, error);
        return [];
    }
};

const enforceMemorySnapshotLimit = async (
    store: IDBObjectStore,
    datasetId: string,
    limit: number = MAX_MEMORY_SNAPSHOTS_PER_DATASET,
) => {
    const allRecords = (await store.index('by_dataset').getAll(datasetId)) as MemorySnapshotRecord[];
    if (allRecords.length <= limit) return;
    const survivors = allRecords
        .sort((a, b) => {
            const scoreDiff = (b.qualityScore ?? 0) - (a.qualityScore ?? 0);
            if (scoreDiff !== 0) return scoreDiff;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        })
        .slice(0, limit);
    const survivorIds = new Set(survivors.map(record => record.id));
    const victims = allRecords.filter(record => !survivorIds.has(record.id));
    for (const victim of victims) {
        await store.delete(victim.id);
    }
};

export const saveMemorySnapshot = async (input: MemorySnapshotInput): Promise<string> => {
    if (!input.datasetId) throw new Error('saveMemorySnapshot requires datasetId.');
    const db = await openDatabase([MEMORY_SNAPSHOT_STORE]);
    const tx = db.transaction(MEMORY_SNAPSHOT_STORE, 'readwrite');
    const store = tx.objectStore(MEMORY_SNAPSHOT_STORE);
    const record: MemorySnapshotRecord = {
        ...input,
        id: input.id ?? input.viewId ?? input.cardId ?? `${input.datasetId}-memo-${createRandomSuffix()}`,
        createdAt: input.createdAt ?? new Date().toISOString(),
        plan: input.plan ?? null,
        viewId: input.viewId ?? null,
        cardId: input.cardId ?? null,
        summary: input.summary ?? '',
        title: input.title ?? 'Untitled View',
        sampleRows: input.sampleRows ?? [],
        tags: input.tags ?? [],
        chartType: input.chartType ?? input.plan?.chartType,
        queryHash: input.queryHash ?? null,
        rowCount: typeof input.rowCount === 'number' ? input.rowCount : input.sampleRows?.length ?? 0,
        sampled: input.sampled ?? false,
        expiresAt: input.expiresAt ?? null,
    };
    await store.put(record);
    await enforceMemorySnapshotLimit(store, record.datasetId);
    await tx.done;
    return record.id;
};

export const readMemorySnapshots = async (
    datasetId: string,
    options?: { limit?: number; minScore?: number; tag?: string },
): Promise<MemorySnapshotRecord[]> => {
    if (!datasetId) return [];
    const db = await openDatabase([MEMORY_SNAPSHOT_STORE]);
    try {
        const tx = db.transaction(MEMORY_SNAPSHOT_STORE, 'readonly');
        const store = tx.objectStore(MEMORY_SNAPSHOT_STORE);
        const index = store.index('by_dataset');
        const all = (await index.getAll(datasetId)) as MemorySnapshotRecord[];
        await tx.done;
        const filtered = all
            .filter(record => (options?.minScore ? (record.qualityScore ?? 0) >= options.minScore : true))
            .filter(record => (options?.tag ? record.tags?.includes(options.tag) : true))
            .sort((a, b) => {
                const scoreDiff = (b.qualityScore ?? 0) - (a.qualityScore ?? 0);
                if (scoreDiff !== 0) return scoreDiff;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
        const limit = options?.limit ?? filtered.length;
        return filtered.slice(0, limit);
    } catch (error) {
        console.warn(`Failed to read memory snapshots for ${datasetId}`, error);
        return [];
    }
};

const BACKFILL_SAMPLE_LIMIT = 2000;

const rebuildColumnStoreRecord = async (datasetId: string): Promise<ColumnStoreRecord | null> => {
    try {
        const [sampleRows, totalRows] = await Promise.all([
            readSampledRows(datasetId, BACKFILL_SAMPLE_LIMIT),
            countDatasetRows(datasetId),
        ]);
        if (totalRows === 0 || sampleRows.length === 0) {
            console.warn(
                `CSV Agent: unable to rebuild column metadata for ${datasetId} because the dataset has no cached rows.`,
            );
            return null;
        }
        const columns = profileData(sampleRows);
        const record: ColumnStoreRecord = {
            datasetId,
            columnCount: columns.length,
            columns,
            rowCount: totalRows,
            updatedAt: new Date().toISOString(),
        };
        const db = await openDatabase([COLUMNS_STORE]);
        const tx = db.transaction(COLUMNS_STORE, 'readwrite');
        await tx.objectStore(COLUMNS_STORE).put(record);
        await tx.done;
        console.info(`CSV Agent: rebuilt missing column metadata for dataset ${datasetId}.`);
        return record;
    } catch (error) {
        console.error(`CSV Agent: failed to rebuild column metadata for dataset ${datasetId}.`, error);
        return null;
    }
};

export const ensureColumnStoreRecord = async (datasetId: string): Promise<ColumnStoreRecord | null> => {
    const existing = await readColumnStoreRecord(datasetId);
    if (existing) return existing;
    return rebuildColumnStoreRecord(datasetId);
};

export const clearCardResults = async (datasetId: string): Promise<void> => {
    const db = await openDatabase([VIEWS_STORE]);
    const tx = db.transaction(VIEWS_STORE, 'readwrite');
    const store = tx.objectStore(VIEWS_STORE);
    const index = store.index('by_dataset');
    let cursor = await index.openCursor(datasetId);
    while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
    }
    await tx.done;
};
