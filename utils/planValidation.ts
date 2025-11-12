import { AnalysisPlan, ColumnProfile, CsvRow, AggregationType } from '../types';
import { inferGroupByColumn } from './groupByInference';

const ALLOWED_AGGREGATIONS: AggregationType[] = ['sum', 'count', 'avg'];
const MAX_COLUMN_PROBE_ROWS = 25;

const normalizeColumnKey = (name: string): string =>
    name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '');

interface ColumnLookup {
    exact: Set<string>;
    caseInsensitive: Map<string, string[]>;
    normalized: Map<string, string[]>;
}

const addLookupEntry = (map: Map<string, string[]>, key: string, value: string) => {
    if (!key) return;
    const existing = map.get(key) ?? [];
    if (!existing.includes(value)) {
        existing.push(value);
        map.set(key, existing);
    }
};

const buildColumnLookup = (columnProfiles: ColumnProfile[], rows: CsvRow[]): ColumnLookup => {
    const exact = new Set<string>();
    columnProfiles.forEach(profile => {
        if (profile?.name) {
            exact.add(profile.name);
        }
    });
    for (let i = 0; i < Math.min(rows.length, MAX_COLUMN_PROBE_ROWS); i++) {
        Object.keys(rows[i] ?? {}).forEach(key => exact.add(key));
    }
    const caseInsensitive = new Map<string, string[]>();
    const normalized = new Map<string, string[]>();
    exact.forEach(name => {
        addLookupEntry(caseInsensitive, name.toLowerCase(), name);
        addLookupEntry(normalized, normalizeColumnKey(name), name);
    });
    return { exact, caseInsensitive, normalized };
};

const resolveColumnReference = (
    candidate: string | undefined | null,
    lookup: ColumnLookup,
): { resolved?: string; ambiguous?: string[] } => {
    if (!candidate) return {};
    if (lookup.exact.has(candidate)) {
        return { resolved: candidate };
    }
    const lowerMatches = lookup.caseInsensitive.get(candidate.toLowerCase());
    if (lowerMatches && lowerMatches.length === 1) {
        return { resolved: lowerMatches[0] };
    }
    const normalizedKey = normalizeColumnKey(candidate);
    if (normalizedKey) {
        const normalizedMatches = lookup.normalized.get(normalizedKey);
        if (normalizedMatches && normalizedMatches.length === 1) {
            return { resolved: normalizedMatches[0] };
        }
        if (normalizedMatches && normalizedMatches.length > 1) {
            return { ambiguous: normalizedMatches };
        }
    }
    return {};
};

const normalizeAggregation = (aggregation?: string, hasValueColumn?: boolean): { value: AggregationType; inferred: boolean } => {
    if (aggregation) {
        const normalized = aggregation.toLowerCase() as AggregationType;
        if (ALLOWED_AGGREGATIONS.includes(normalized)) {
            return { value: normalized, inferred: false };
        }
    }
    const fallback: AggregationType = hasValueColumn ? 'sum' : 'count';
    return { value: fallback, inferred: true };
};

const ensurePlanColumn = (
    plan: AnalysisPlan,
    property: keyof AnalysisPlan,
    lookup: ColumnLookup,
    warnings: string[],
): { success: boolean; errorMessage?: string } => {
    const columnName = plan[property];
    if (!columnName || typeof columnName !== 'string') {
        return { success: true };
    }
    const resolution = resolveColumnReference(columnName, lookup);
    if (resolution.ambiguous && resolution.ambiguous.length > 1) {
        return {
            success: false,
            errorMessage: `Column "${columnName}" is ambiguous. Choose one of: ${resolution.ambiguous.join(', ')}.`,
        };
    }
    if (!resolution.resolved) {
        return {
            success: false,
            errorMessage: `Column "${columnName}" was not found in this dataset.`,
        };
    }
    if (resolution.resolved !== columnName) {
        (plan as any)[property] = resolution.resolved;
        warnings.push(`Normalized column "${columnName}" to "${resolution.resolved}".`);
    }
    return { success: true };
};

export interface PreparedPlanResult {
    plan: AnalysisPlan;
    warnings: string[];
    isValid: boolean;
    errorMessage?: string;
}

export const preparePlanForExecution = (
    originalPlan: AnalysisPlan,
    columnProfiles: ColumnProfile[],
    rows: CsvRow[],
): PreparedPlanResult => {
    const plan: AnalysisPlan = { ...originalPlan };
    const warnings: string[] = [];
    const columnLookup = buildColumnLookup(columnProfiles, rows);

    if (plan.chartType === 'scatter') {
        if (!plan.xValueColumn || !plan.yValueColumn) {
            return {
                plan,
                warnings,
                isValid: false,
                errorMessage: 'Scatter plot plan is missing xValueColumn or yValueColumn.',
            };
        }
        const xResolution = ensurePlanColumn(plan, 'xValueColumn', columnLookup, warnings);
        if (!xResolution.success) {
            return { plan, warnings, isValid: false, errorMessage: xResolution.errorMessage };
        }
        const yResolution = ensurePlanColumn(plan, 'yValueColumn', columnLookup, warnings);
        if (!yResolution.success) {
            return { plan, warnings, isValid: false, errorMessage: yResolution.errorMessage };
        }
        return { plan, warnings, isValid: true };
    }

    if (!rows.length) {
        return { plan, warnings, isValid: false, errorMessage: 'Dataset appears empty for analysis.' };
    }

    const aggregationInfo = normalizeAggregation(plan.aggregation, !!plan.valueColumn);
    if (aggregationInfo.inferred) {
        plan.aggregation = aggregationInfo.value;
        warnings.push(`AI plan missing aggregation; defaulting to ${aggregationInfo.value}.`);
    } else {
        plan.aggregation = aggregationInfo.value;
    }

    if (plan.aggregation !== 'count' && !plan.valueColumn) {
        plan.aggregation = 'count';
        warnings.push('Value column missing for sum/avg; using count aggregation instead.');
    }

    if (plan.chartType === 'combo') {
        if (!plan.valueColumn || !plan.secondaryValueColumn) {
            return {
                plan,
                warnings,
                isValid: false,
                errorMessage: 'Combo chart requires both valueColumn and secondaryValueColumn.',
            };
        }
        if (!plan.secondaryAggregation) {
            plan.secondaryAggregation = plan.aggregation ?? 'sum';
            warnings.push('Secondary aggregation missing; mirroring primary aggregation.');
        }
    }

    const valueAlias =
        !plan.valueColumn || plan.aggregation === 'count' ? 'count' : plan.valueColumn;

    if (!plan.groupByColumn) {
        const inferred = inferGroupByColumn(columnProfiles, rows);
        if (inferred.column) {
            plan.groupByColumn = inferred.column;
            warnings.push(`AI plan missing grouping; defaulting to "${inferred.column}".`);
        } else {
            return {
                plan,
                warnings,
                isValid: false,
                errorMessage: 'Unable to infer a grouping column for this chart.',
            };
        }
    }
    const groupByResolution = ensurePlanColumn(plan, 'groupByColumn', columnLookup, warnings);
    if (!groupByResolution.success) {
        return { plan, warnings, isValid: false, errorMessage: groupByResolution.errorMessage };
    }

    const valueColumnResolution = ensurePlanColumn(plan, 'valueColumn', columnLookup, warnings);
    if (!valueColumnResolution.success) {
        return { plan, warnings, isValid: false, errorMessage: valueColumnResolution.errorMessage };
    }
    if (plan.chartType === 'combo') {
        const secondaryResolution = ensurePlanColumn(plan, 'secondaryValueColumn', columnLookup, warnings);
        if (!secondaryResolution.success) {
            return { plan, warnings, isValid: false, errorMessage: secondaryResolution.errorMessage };
        }
    }

    if (!Array.isArray(plan.orderBy) || plan.orderBy.length === 0) {
        if (plan.chartType === 'line' && plan.groupByColumn) {
            plan.orderBy = [{ column: plan.groupByColumn, direction: 'asc' }];
        } else {
            plan.orderBy = [{ column: valueAlias, direction: 'desc' }];
        }
    } else {
        plan.orderBy = plan.orderBy.map(order => ({
            column: order.column,
            direction: order.direction ?? (plan.chartType === 'line' ? 'asc' : 'desc'),
        }));
    }

    if (typeof plan.limit !== 'number' && typeof plan.defaultTopN === 'number') {
        plan.limit = plan.defaultTopN;
    }

    if (plan.rowFilter) {
        const filterColumn = plan.rowFilter.column;
        let resolvedFilterColumn = filterColumn ?? null;
        if (filterColumn) {
            const filterResolution = resolveColumnReference(filterColumn, columnLookup);
            if (filterResolution.ambiguous && filterResolution.ambiguous.length > 1) {
                return {
                    plan,
                    warnings,
                    isValid: false,
                    errorMessage: `Row filter column "${filterColumn}" is ambiguous. Options: ${filterResolution.ambiguous.join(', ')}.`,
                };
            }
            if (!filterResolution.resolved) {
                resolvedFilterColumn = null;
            } else if (filterResolution.resolved !== filterColumn) {
                resolvedFilterColumn = filterResolution.resolved;
                warnings.push(`Row filter column "${filterColumn}" normalized to "${resolvedFilterColumn}".`);
            }
        }
        const hasColumn = resolvedFilterColumn ? columnLookup.exact.has(resolvedFilterColumn) : false;
        const hasValues = Array.isArray(plan.rowFilter.values) && plan.rowFilter.values.length > 0;
        if (!filterColumn || !hasColumn || !hasValues) {
            const reasons: string[] = [];
            if (!filterColumn) {
                reasons.push('missing column');
            } else if (!hasColumn) {
                reasons.push(`column "${filterColumn}" not found`);
            }
            if (!hasValues) {
                reasons.push('no filter values provided');
            }
            const reasonText = reasons.length ? ` (${reasons.join(', ')})` : '';
            warnings.push(`Row filter invalid${reasonText}; removing filter.`);
            delete plan.rowFilter;
        } else if (resolvedFilterColumn && plan.rowFilter.column !== resolvedFilterColumn) {
            plan.rowFilter.column = resolvedFilterColumn;
        }
    }

    return { plan, warnings, isValid: true };
};
