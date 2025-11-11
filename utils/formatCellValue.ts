export const formatCellValue = (value: unknown, depth = 0, columnType?: string): string => {
    if (value === null || value === undefined) {
        return '';
    }

    if (typeof value === 'number') {
        return formatNumberByType(value, columnType);
    }

    if (typeof value === 'string') {
        if (columnType && (columnType === 'currency' || columnType === 'percentage' || columnType === 'number')) {
            const numeric = Number(value);
            if (!Number.isNaN(numeric)) {
                return formatNumberByType(numeric, columnType);
            }
        }
        return value;
    }

    if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
    }

    if (Array.isArray(value)) {
        if (depth >= 1) {
            return `[${value.length} items]`;
        }
        return value.map(item => formatCellValue(item, depth + 1, columnType)).join(', ');
    }

    if (typeof value === 'object') {
        const entries = Object.entries(value as Record<string, unknown>);
        if (entries.length === 0) {
            return '{}';
        }

        if (depth >= 1) {
            return `{${entries.length} keys}`;
        }

        return entries
            .map(([key, val]) => `${key}: ${formatCellValue(val, depth + 1, columnType)}`)
            .join('; ');
    }

    return String(value);
};

const formatNumberByType = (value: number, columnType?: string): string => {
    const normalizedType = columnType?.toLowerCase();
    if (normalizedType === 'currency') {
        return value.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    }
    if (normalizedType === 'percentage') {
        return `${value.toFixed(2)}%`;
    }
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
};
