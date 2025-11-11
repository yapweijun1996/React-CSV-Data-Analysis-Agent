import type { DatasetRuntimeConfig, NormalizationRuleSummary, StringNormalizationStrategy } from '../types';

export const DEFAULT_PROFILE_SAMPLE = 2000;
export const DEFAULT_SAMPLE_SIZE = 1000;
export const DEFAULT_AGG_SAMPLE = 3000;
export const DEFAULT_TIMEOUT_MS = 3000;
export const AUTO_FULL_SCAN_ROW_THRESHOLD = 5000;
const DEFAULT_NULL_LABEL = '<NULL>';

const clampToRowCount = (rowCount: number | undefined, cap: number): number => {
    if (typeof rowCount === 'number' && rowCount > 0) {
        return Math.min(cap, rowCount);
    }
    return cap;
};

export const normalizeStringStrategy = (
    strategy?: Partial<StringNormalizationStrategy>,
): StringNormalizationStrategy => ({
    trimWhitespace: strategy?.trimWhitespace ?? true,
    caseStrategy: strategy?.caseStrategy ?? 'lower',
    nullReplacement: strategy?.nullReplacement ?? DEFAULT_NULL_LABEL,
});

export const createDefaultDatasetRuntimeConfig = (
    datasetId: string,
    options?: { rowCountHint?: number; preferredMode?: 'sample' | 'full' },
): DatasetRuntimeConfig => {
    const rowCountHint = options?.rowCountHint;
    const prefersFullScan =
        options?.preferredMode === 'full' ||
        (options?.preferredMode === undefined &&
            typeof rowCountHint === 'number' &&
            rowCountHint > 0 &&
            rowCountHint <= AUTO_FULL_SCAN_ROW_THRESHOLD);
    const now = new Date().toISOString();
    return {
        datasetId,
        mode: prefersFullScan ? 'full' : 'sample',
        allowFullScan: prefersFullScan,
        sampleSize: clampToRowCount(rowCountHint, DEFAULT_AGG_SAMPLE),
        profileSampleSize: clampToRowCount(rowCountHint, DEFAULT_PROFILE_SAMPLE),
        timeoutMs: DEFAULT_TIMEOUT_MS,
        updatedAt: now,
        stringStrategy: normalizeStringStrategy(),
    };
};

export const mergeRuntimeConfig = (
    current: DatasetRuntimeConfig,
    updates: Partial<DatasetRuntimeConfig>,
): DatasetRuntimeConfig => ({
    ...current,
    ...updates,
    datasetId: current.datasetId,
    updatedAt: new Date().toISOString(),
    stringStrategy: normalizeStringStrategy({
        ...current.stringStrategy,
        ...updates.stringStrategy,
    }),
});

export const hydrateRuntimeConfig = (
    config: DatasetRuntimeConfig | null | undefined,
): DatasetRuntimeConfig | null => {
    if (!config) return null;
    return {
        ...config,
        stringStrategy: normalizeStringStrategy(config.stringStrategy),
    };
};

export const summarizeStringStrategy = (
    strategy: StringNormalizationStrategy,
): NormalizationRuleSummary => ({
    strategy,
    pipeline: [
        strategy.trimWhitespace ? 'trim' : 'preserve-whitespace',
        'toString',
        strategy.caseStrategy === 'lower' ? 'toLowerCase' : 'case-as-is',
        `nullCoalesce(${strategy.nullReplacement})`,
    ],
});
