import type { IntentContract } from '@/services/ai/intentContract';
import type { AnalysisPlan, CsvRow } from '@/types';

export const buildRowFilterFromIntentFilters = (
    filters?: IntentContract['args']['filters'],
): AnalysisPlan['rowFilter'] | undefined => {
    if (!filters || filters.length === 0) return undefined;
    for (const filter of filters) {
        const column = typeof filter.column === 'string' && filter.column.trim().length > 0 ? filter.column.trim() : null;
        if (!column) continue;
        if (filter.op === 'in' && Array.isArray(filter.value)) {
            const values = filter.value.filter(
                value => typeof value === 'string' || typeof value === 'number',
            ) as (string | number)[];
            if (values.length > 0) {
                return { column, values };
            }
            continue;
        }
        if (!filter.op || filter.op === '=' ) {
            const value = filter.value;
            if (typeof value === 'string' || typeof value === 'number') {
                return { column, values: [value] };
            }
        }
    }
    return undefined;
};

export const planFromAggregateIntent = (contract: IntentContract): AnalysisPlan | null => {
    if (contract.tool !== 'csv.aggregate') return null;
    const valueColumn = contract.args.valueColumn ?? contract.args.column;
    if (!valueColumn) {
        return null;
    }
    const groupByColumn = contract.args.groupBy?.[0] ?? undefined;
    const aggregation = contract.args.aggregation ?? 'sum';
    const title =
        contract.args.viewTitle ??
        (groupByColumn
            ? `${aggregation.toUpperCase()} of ${valueColumn} by ${groupByColumn}`
            : `${aggregation.toUpperCase()} of ${valueColumn}`);
    const description =
        contract.message ??
        (groupByColumn
            ? `Aggregate ${valueColumn} by ${groupByColumn} using ${aggregation}.`
            : `Aggregate ${valueColumn} using ${aggregation}.`);
    const rowFilter = buildRowFilterFromIntentFilters(contract.args.filters);
    const defaultTopN = typeof contract.args.topN === 'number' ? contract.args.topN : groupByColumn ? 8 : undefined;

    return {
        chartType: groupByColumn ? 'bar' : 'bar',
        title,
        description,
        aggregation,
        groupByColumn,
        valueColumn,
        defaultTopN,
        rowFilter,
        limit: contract.args.limit ?? contract.args.topN ?? undefined,
    };
};

export const deriveSchemaFromRows = (rows: CsvRow[]): Array<{ name: string; type: string }> => {
    if (!rows || rows.length === 0) return [];
    const sample = rows[0];
    return Object.keys(sample).map(name => {
        const value = sample[name];
        const valueType = typeof value;
        const type =
            valueType === 'number'
                ? 'number'
                : valueType === 'boolean'
                ? 'boolean'
                : valueType === 'string'
                ? 'string'
                : 'unknown';
        return { name, type };
    });
};
