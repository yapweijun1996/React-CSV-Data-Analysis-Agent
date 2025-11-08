import type { AnalysisPlan, ColumnProfile } from '../types';

const getColumnFriendlyName = (columnName: string | undefined, columns: ColumnProfile[]): string | null => {
    if (!columnName) return null;
    const profile = columns.find(c => c.name === columnName);
    return profile ? profile.name : columnName;
};

export const applyFriendlyPlanCopy = (plan: AnalysisPlan, columns: ColumnProfile[]): AnalysisPlan => {
    const metricLabel = getColumnFriendlyName(plan.valueColumn, columns)
        || (plan.aggregation === 'count' ? 'Records' : 'Value');
    const dimensionLabel = getColumnFriendlyName(plan.groupByColumn, columns)
        || (plan.chartType === 'scatter' ? 'X Axis' : 'Category');

    const replacements: Record<string, string> = {
        '[metric]': metricLabel,
        '[value]': metricLabel,
        '[dimension]': dimensionLabel,
        '[group]': dimensionLabel,
    };

    const hasRunawayRepetition = (text: string): boolean => {
        if (!text) return false;
        const compact = text.replace(/\s+/g, '');
        return /(.{3,20})\1{3,}/i.test(compact);
    };

    const rewrite = (text: string | undefined, fallback: string): string => {
        if (!text || text.trim() === '') return fallback;
        let rewritten = text;
        for (const key of Object.keys(replacements)) {
            const regex = new RegExp(key, 'gi');
            rewritten = rewritten.replace(regex, replacements[key]);
        }
        if (/\[.*\]/.test(rewritten)) {
            return fallback;
        }
        if (rewritten.length > 150 || hasRunawayRepetition(rewritten)) {
            return fallback;
        }
        return rewritten.trim();
    };

    const defaultTitle = `${metricLabel} by ${dimensionLabel}`;
    const defaultDescription = `A chart showing ${metricLabel} grouped by ${dimensionLabel}.`;

    return {
        ...plan,
        title: rewrite(plan.title, defaultTitle),
        description: rewrite(plan.description, defaultDescription),
    };
};
