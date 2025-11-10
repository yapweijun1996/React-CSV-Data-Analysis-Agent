import { openDB, type IDBPDatabase } from 'idb';
import type { CsvRow, ColumnProfile, AnalysisPlan } from '../types';

export interface DatasetProvenanceRecord {
    datasetId: string;
    fileName: string;
    bytes: number;
    checksum: string;
    cleanedAt: string;
}

interface CleanRowChunkRecord {
    chunkId: string;
    rowCount: number;
    startRow: number;
    endRow: number;
    rows: CsvRow[];
    createdAt: string;
}

export interface ColumnStoreRecord {
    id: 'columns';
    columnCount: number;
    rowCount: number;
    columns: ColumnProfile[];
    updatedAt: string;
}

export interface ViewStoreRecord<DataRef = any> {
    id: string;
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

const DB_NAME = 'csv_agent_db';
const BASE_VERSION = 2;
const PROVENANCE_STORE = 'provenance';

let dbPromise: Promise<IDBPDatabase> | null = null;

const getStoreNamesForDataset = (datasetId: string) => ({
    clean: `clean_rows_${datasetId}`,
    columns: `columns_${datasetId}`,
    views: `views_${datasetId}`,
});

const createStore = (db: IDBPDatabase, storeName: string) => {
    if (db.objectStoreNames.contains(storeName)) return;
    if (storeName.startsWith('clean_rows_')) {
        db.createObjectStore(storeName, { keyPath: 'chunkId' });
        return;
    }
    if (storeName.startsWith('columns_')) {
        db.createObjectStore(storeName, { keyPath: 'id' });
        return;
    }
    if (storeName.startsWith('views_')) {
        db.createObjectStore(storeName, { keyPath: 'id' });
        return;
    }
    if (storeName === PROVENANCE_STORE) {
        db.createObjectStore(storeName, { keyPath: 'datasetId' });
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
            await new Promise<void>((resolve, reject) => {
                const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
                deleteRequest.onsuccess = () => resolve();
                deleteRequest.onerror = () => reject(deleteRequest.error);
                deleteRequest.onblocked = () => console.warn('Delete csv_agent_db blocked. Close other tabs.');
            });
            return fn();
        }
        throw error;
    }
};

const openDatabase = async (upgradeStores: string[] = []): Promise<IDBPDatabase> => {
    const openWithVersion = (version: number, stores: string[]) =>
        openDB(DB_NAME, version, {
            upgrade(db) {
                createStore(db, PROVENANCE_STORE);
                stores.forEach(store => createStore(db, store));
            },
        });

    if (!dbPromise) {
        dbPromise = handleVersionMismatch(() => openWithVersion(BASE_VERSION, upgradeStores));
        return dbPromise;
    }

    const db = await dbPromise;
    const missingStores = upgradeStores.filter(store => !db.objectStoreNames.contains(store));
    if (missingStores.length === 0) {
        return db;
    }

    db.close();
    const nextVersion = db.version + 1;
    dbPromise = handleVersionMismatch(() => openWithVersion(nextVersion, [...upgradeStores, ...missingStores]));
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

    const storeNames = Object.values(getStoreNamesForDataset(datasetId));
    const db = await openDatabase(storeNames);
    const { clean: cleanStoreName, columns: columnStoreName } = getStoreNamesForDataset(datasetId);

    const tx = db.transaction([cleanStoreName, columnStoreName, PROVENANCE_STORE], 'readwrite');
    const cleanStore = tx.objectStore(cleanStoreName);
    const columnStore = tx.objectStore(columnStoreName);
    const provenanceStore = tx.objectStore(PROVENANCE_STORE);

    await cleanStore.clear();
    const rowsChunks = chunkRows(rows, chunkSize);
    const now = new Date().toISOString();
    for (let index = 0; index < rowsChunks.length; index += 1) {
        const chunk = rowsChunks[index];
        const record: CleanRowChunkRecord = {
            chunkId: `${datasetId}-chunk-${index}`,
            rowCount: chunk.length,
            startRow: index * chunkSize,
            endRow: index * chunkSize + chunk.length - 1,
            rows: chunk,
            createdAt: now,
        };
        await cleanStore.put(record);
    }

    const columnPayload: ColumnStoreRecord = {
        id: 'columns',
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
    const { views: storeName } = getStoreNamesForDataset(datasetId);
    const db = await openDatabase([storeName]);
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const randomId =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const id = `${datasetId}-view-${randomId}`;
    const record: ViewStoreRecord<CardDataRef> = {
        id,
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
    const { views: storeName } = getStoreNamesForDataset(datasetId);
    const db = await openDatabase([storeName]);
    try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const values = (await store.getAll()) as Array<ViewStoreRecord<T>>;
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
    const { columns } = getStoreNamesForDataset(datasetId);
    const db = await openDatabase([columns]);
    const tx = db.transaction(columns, 'readonly');
    const store = tx.objectStore(columns);
    const record = (await store.get('columns')) as ColumnStoreRecord | undefined;
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
    const { clean } = getStoreNamesForDataset(datasetId);
    const db = await openDatabase([clean]);
    const tx = db.transaction(clean, 'readonly');
    const store = tx.objectStore(clean);
    let shouldStop = false;
    const stop = () => {
        shouldStop = true;
    };
    let cursor = await store.openCursor();
    while (cursor && !shouldStop) {
        const chunk = cursor.value as CleanRowChunkRecord;
        await handler(chunk, stop);
        if (shouldStop) break;
        cursor = await cursor.continue();
    }
    await tx.done;
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

export const clearCardResults = async (datasetId: string): Promise<void> => {
    const { views } = getStoreNamesForDataset(datasetId);
    const db = await openDatabase([views]);
    const tx = db.transaction(views, 'readwrite');
    const store = tx.objectStore(views);
    await store.clear();
    await tx.done;
};
