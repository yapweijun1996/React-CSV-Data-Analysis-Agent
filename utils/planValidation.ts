import { AnalysisPlan, ColumnProfile, CsvRow, AggregationType } from '../types';
import { inferGroupByColumn } from './groupByInference';

const ALLOWED_AGGREGATIONS: AggregationType[] = ['sum', 'count', 'avg'];

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
