export const formatCellValue = (value: unknown, depth = 0): string => {
    if (value === null || value === undefined) {
        return '';
    }

    if (typeof value === 'number') {
        return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }

    if (typeof value === 'string') {
        return value;
    }

    if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
    }

    if (Array.isArray(value)) {
        if (depth >= 1) {
            return `[${value.length} items]`;
        }
        return value.map(item => formatCellValue(item, depth + 1)).join(', ');
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
            .map(([key, val]) => `${key}: ${formatCellValue(val, depth + 1)}`)
            .join('; ');
    }

    return String(value);
};
