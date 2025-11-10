const STORAGE_KEY = 'csv_agent_last_dataset';

const safeExecute = (fn: () => void) => {
    try {
        fn();
    } catch (error) {
        console.warn('Dataset cache error:', error);
    }
};

export const rememberDatasetId = (datasetId: string) => {
    safeExecute(() => {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(STORAGE_KEY, datasetId);
    });
};

export const forgetDatasetId = () => {
    safeExecute(() => {
        if (typeof localStorage === 'undefined') return;
        localStorage.removeItem(STORAGE_KEY);
    });
};

export const getRememberedDatasetId = (): string | null => {
    try {
        if (typeof localStorage === 'undefined') return null;
        return localStorage.getItem(STORAGE_KEY);
    } catch (error) {
        console.warn('Dataset cache read error:', error);
        return null;
    }
};

export const LAST_DATASET_STORAGE_KEY = STORAGE_KEY;
