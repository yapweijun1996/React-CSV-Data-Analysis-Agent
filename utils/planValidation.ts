import { AnalysisPlan, ColumnProfile, CsvRow, AggregationType } from '../types';

const ALLOWED_AGGREGATIONS: AggregationType[] = ['sum', 'count', 'avg'];
const PREFERRED_GROUP_TYPES: ColumnProfile['type'][] = ['categorical', 'date', 'time'];

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

const countUniqueValues = (rows: CsvRow[], column: string, maxSample = 500): number => {
    if (!rows.length) return 0;
    const seen = new Set<string>();
    const limit = Math.min(rows.length, maxSample);
    for (let i = 0; i < limit; i++) {
        const value = rows[i][column];
        if (value === undefined || value === null) continue;
        const normalized = String(value).trim();
        if (!normalized) continue;
        seen.add(normalized);
        if (seen.size > 200) break; // Avoid runaway categories
    }
    return seen.size;
};

const inferGroupByColumn = (columnProfiles: ColumnProfile[], rows: CsvRow[]): { column: string | null; inferred: boolean } => {
    if (!columnProfiles.length) return { column: null, inferred: false };

    const profiledCandidates = columnProfiles.map(profile => ({
        profile,
        uniqueValues: typeof profile.uniqueValues === 'number'
            ? profile.uniqueValues
            : countUniqueValues(rows, profile.name),
    }));

    const preferred = profiledCandidates
        .filter(({ profile, uniqueValues }) => (
            uniqueValues > 1 &&
            (PREFERRED_GROUP_TYPES.includes(profile.type) || uniqueValues <= 50)
        ))
        .sort((a, b) => {
            const typeScore = (type: ColumnProfile['type']) => PREFERRED_GROUP_TYPES.includes(type) ? 0 : 1;
            const aScore = typeScore(a.profile.type);
            const bScore = typeScore(b.profile.type);
            if (aScore !== bScore) return aScore - bScore;
            // Prefer columns with manageable cardinality (closer to 10-15 buckets)
            const ideal = 12;
            const aDistance = Math.abs((a.uniqueValues || 100) - ideal);
            const bDistance = Math.abs((b.uniqueValues || 100) - ideal);
            return aDistance - bDistance;
        });

    if (preferred.length > 0) {
        return { column: preferred[0].profile.name, inferred: true };
    }

    // Fallback: pick the first column that has at least two distinct values.
    const fallback = profiledCandidates.find(c => (c.uniqueValues || 0) > 1);
    return {
        column: fallback?.profile.name ?? null,
        inferred: !!fallback,
    };
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

    if (plan.chartType === 'scatter') {
        if (!plan.xValueColumn || !plan.yValueColumn) {
            return {
                plan,
                warnings,
                isValid: false,
                errorMessage: 'Scatter plot plan is missing xValueColumn or yValueColumn.',
            };
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

    return { plan, warnings, isValid: true };
};
