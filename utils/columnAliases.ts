import { CsvRow } from '../types';

export type ColumnAliasMap = Record<string, string>;

const sanitizeColumnName = (name: string): string =>
    name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

const generateAliasCandidates = (name: string): string[] => {
    const aliases = new Set<string>();
    const sanitized = sanitizeColumnName(name);
    if (sanitized && sanitized !== name) {
        aliases.add(sanitized);
    }

    // If column uses prefixed scheme like "A - project_code" keep suffix
    const trimmedPrefixMatch = sanitized.match(/^[a-z]\d?_(.+)$/);
    if (trimmedPrefixMatch && trimmedPrefixMatch[1]) {
        aliases.add(trimmedPrefixMatch[1]);
    }

    // Add version without double underscores
    if (sanitized.includes('__')) {
        aliases.add(sanitized.replace(/_+/g, '_'));
    }

    // Add version removing generic prefixes like "column_"
    if (sanitized.startsWith('column_')) {
        aliases.add(sanitized.replace(/^column_/, ''));
    }

    return Array.from(aliases).filter(Boolean);
};

export const buildColumnAliasMap = (columnNames: string[]): ColumnAliasMap => {
    const aliasMap: ColumnAliasMap = {};
    columnNames.forEach(name => {
        const aliases = generateAliasCandidates(name);
        aliases.forEach(alias => {
            if (!aliasMap[alias]) {
                aliasMap[alias] = name;
            }
        });
    });
    return aliasMap;
};

export const cloneRowsWithAliases = (rows: CsvRow[], aliasMap: ColumnAliasMap): CsvRow[] => {
    const aliasEntries = Object.entries(aliasMap);
    if (aliasEntries.length === 0) return rows;
    return rows.map(row => {
        const newRow: CsvRow = { ...row };
        for (const [alias, original] of aliasEntries) {
            if (!(alias in newRow) && newRow[original] !== undefined) {
                newRow[alias] = newRow[original];
            }
        }
        return newRow;
    });
};

export const normalizeRowsFromAliases = (rows: CsvRow[], aliasMap: ColumnAliasMap): CsvRow[] => {
    const aliasEntries = Object.entries(aliasMap);
    if (aliasEntries.length === 0) return rows;
    return rows.map(row => {
        const newRow: CsvRow = { ...row };
        for (const [alias, original] of aliasEntries) {
            if (Object.prototype.hasOwnProperty.call(newRow, alias)) {
                if (!Object.prototype.hasOwnProperty.call(newRow, original)) {
                    newRow[original] = newRow[alias];
                }
                delete newRow[alias];
            }
        }
        return newRow;
    });
};
