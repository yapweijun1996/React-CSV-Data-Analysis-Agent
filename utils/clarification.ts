import type {
    AnalysisPlan,
    ClarificationOption,
    ClarificationRequestPayload,
    CsvRow,
} from '../types';

const normalizeText = (value: string) =>
    value
        .toLowerCase()
        .replace(/[_-]+/g, ' ')
        .replace(/[^a-z0-9 ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

export const COLUMN_TARGET_PROPERTIES: Array<keyof AnalysisPlan> = [
    'groupByColumn',
    'valueColumn',
    'xValueColumn',
    'yValueColumn',
    'secondaryValueColumn',
];

export const columnHasUsableData = (
    columnName: string,
    data: CsvRow[],
    minDistinct = 1,
    maxDistinct = Infinity,
): boolean => {
    if (!data || data.length === 0) return false;
    const values = data
        .map(row => row[columnName])
        .filter(value => value !== null && value !== undefined && String(value).trim() !== '');
    if (values.length === 0) return false;
    const distinctCount = new Set(values.map(value => String(value))).size;
    return distinctCount >= minDistinct && distinctCount <= maxDistinct;
};

export const resolveColumnChoice = (
    option: ClarificationOption,
    targetProperty: keyof AnalysisPlan,
    availableColumns: string[],
): string | undefined => {
    if (!COLUMN_TARGET_PROPERTIES.includes(targetProperty)) {
        return option.value;
    }

    const directMatch = availableColumns.find(col => col === option.value);
    if (directMatch) return directMatch;

    const caseInsensitiveMatch = availableColumns.find(col => col.toLowerCase() === option.value.toLowerCase());
    if (caseInsensitiveMatch) return caseInsensitiveMatch;

    const normalizedLabel = normalizeText(option.label);
    return availableColumns.find(col => normalizedLabel.includes(normalizeText(col)));
};

interface ClarificationFilterOptions {
    /**
     * Columns that should be treated as valid even if they do not show up
     * in the current column profile list (e.g., alias/group-by fields from cards).
     */
    preferredColumns?: string[];
}

export const filterClarificationOptions = (
    clarification: ClarificationRequestPayload,
    data: CsvRow[] | undefined,
    availableColumns: string[],
    options?: ClarificationFilterOptions,
): ClarificationRequestPayload | null => {
    if (!COLUMN_TARGET_PROPERTIES.includes(clarification.targetProperty) || !data || data.length === 0) {
        return clarification;
    }

    const preferredColumns = options?.preferredColumns?.filter(
        (value): value is string => typeof value === 'string' && value.trim().length > 0,
    ) ?? [];
    const expandedColumns = Array.from(new Set([...availableColumns, ...preferredColumns]));

    const columnHintSet = new Set<string>(clarification.columnHints ?? []);

    const filteredOptions = clarification.options
        .map(option => {
            const resolvedColumn = resolveColumnChoice(option, clarification.targetProperty, expandedColumns);
            if (!resolvedColumn) return null;
            columnHintSet.add(resolvedColumn);
            const isPreferredColumn = preferredColumns.includes(resolvedColumn);
            if (clarification.targetProperty === 'groupByColumn') {
                if (!columnHasUsableData(resolvedColumn, data, 2, isPreferredColumn ? Infinity : 50)) return null;
            } else if (!columnHasUsableData(resolvedColumn, data)) {
                return null;
            }
            return { ...option, value: resolvedColumn };
        })
        .filter((option): option is ClarificationOption => option !== null);

    if (filteredOptions.length === 0) {
        return null;
    }

    return {
        ...clarification,
        options: filteredOptions,
        columnHints: Array.from(columnHintSet),
    };
};
