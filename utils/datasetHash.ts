import { CsvData } from '../types';

const SAMPLE_ROWS = 25;

const simpleHash = (input: string): string => {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        hash = (hash << 5) - hash + input.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash).toString(36);
};

export const computeDatasetHash = (csvData?: CsvData | null): string | null => {
    if (!csvData || !csvData.data) return null;
    const sample = csvData.data.slice(0, SAMPLE_ROWS);
    const payload = JSON.stringify({
        name: csvData.fileName ?? 'unknown',
        rows: csvData.data.length,
        sample,
        columns: sample[0] ? Object.keys(sample[0]) : [],
    });
    return `ds_${simpleHash(payload)}`;
};
