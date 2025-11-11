import { ERROR_CODES, type ErrorCode } from './errorCodes';

type ErrorCopy = {
    title: string;
    detail: string;
};

const ERROR_MESSAGE_MAP: Record<ErrorCode, ErrorCopy> = {
    [ERROR_CODES.FULL_SCAN_BLOCKED]: {
        title: 'Full scan needs confirmation',
        detail: 'Please ask the user before scanning every cached row.',
    },
    [ERROR_CODES.AGG_TIMEOUT]: {
        title: 'Full scan timed out',
        detail: 'The analysis fell back to a sampled preview. Retry or limit the scope.',
    },
    [ERROR_CODES.COLUMN_METADATA_MISSING]: {
        title: 'Dataset cache incomplete',
        detail: 'The cached schema is missing. Re-upload or rebuild the dataset to continue.',
    },
    [ERROR_CODES.VERSION_ERROR]: {
        title: 'Browser storage mismatch',
        detail: 'Local IndexedDB version changed. Refresh or clear site data, then retry.',
    },
    [ERROR_CODES.ORIGIN_BLOCKED]: {
        title: 'Source not allowed',
        detail: 'The embedding origin is not on the allow list for CSV hand-off.',
    },
    [ERROR_CODES.DATASET_UNCHANGED]: {
        title: 'Dataset unchanged',
        detail: 'This CSV matches the cached dataset. You can skip the import or force a refresh.',
    },
    [ERROR_CODES.INDEXEDDB_UNAVAILABLE]: {
        title: 'Browser blocked storage access',
        detail: 'IndexedDB is unavailable in this context. Enable storage permissions and retry.',
    },
    [ERROR_CODES.UNKNOWN]: {
        title: 'Action failed',
        detail: 'The agent could not finish this step. Try again or adjust your request.',
    },
};

export const getErrorMessage = (code?: ErrorCode, fallback?: string): ErrorCopy => {
    if (code && ERROR_MESSAGE_MAP[code]) {
        return ERROR_MESSAGE_MAP[code];
    }
    if (fallback) {
        return { title: ERROR_MESSAGE_MAP[ERROR_CODES.UNKNOWN].title, detail: fallback };
    }
    return ERROR_MESSAGE_MAP[ERROR_CODES.UNKNOWN];
};
