import type { AnalysisPlan, CsvData, DatasetRuntimeConfig } from '@/types';
import type { AggregatePayload } from '../services/dataToolTypes';
import { AUTO_FULL_SCAN_ROW_THRESHOLD } from '../services/runtimeConfig';

export const buildAggregatePayloadForPlan = (
    plan: AnalysisPlan,
    datasetId: string | null,
    csvData: CsvData | null,
    rowCountHint?: number,
    options?: { preferredMode?: 'sample' | 'full'; runtimeConfig?: DatasetRuntimeConfig | null },
): AggregatePayload | null => {
    if (!datasetId) return null;
    if (plan.chartType === 'scatter' || plan.chartType === 'combo') return null;
    if (!plan.groupByColumn || !plan.aggregation) return null;
    if (plan.aggregation !== 'count' && !plan.valueColumn) return null;
    const alias = plan.valueColumn ?? 'count';
    const fallbackOrder =
        plan.chartType === 'line'
            ? [{ column: plan.groupByColumn, direction: 'asc' as const }]
            : [{ column: alias, direction: 'desc' as const }];
    const orderBy =
        plan.orderBy && plan.orderBy.length > 0
            ? plan.orderBy.map(order => ({
                  column: order.column,
                  direction: (order.direction ?? (plan.chartType === 'line' ? 'asc' : 'desc')) as 'asc' | 'desc',
              }))
            : fallbackOrder;
    const runtimeConfig = options?.runtimeConfig ?? null;
    const availableRows = rowCountHint ?? csvData?.data?.length ?? 0;
    const fallbackSampleSize = availableRows > 0 ? Math.min(5000, availableRows) : 5000;
    const sampleSize = runtimeConfig?.sampleSize ?? fallbackSampleSize;
    const shouldForceFullScan = availableRows > 0 && availableRows <= AUTO_FULL_SCAN_ROW_THRESHOLD;
    const limit = typeof plan.limit === 'number' ? plan.limit : plan.defaultTopN;
    const payload: AggregatePayload = {
        datasetId,
        by: [plan.groupByColumn],
        metrics: [
            {
                fn: plan.aggregation as AggregatePayload['metrics'][number]['fn'],
                column: plan.aggregation === 'count' ? undefined : plan.valueColumn,
                as: alias,
            },
        ],
        filter: plan.rowFilter
            ? [
                  {
                      column: plan.rowFilter.column,
                      op: 'in',
                      values: plan.rowFilter.values,
                  },
              ]
            : undefined,
        limit: typeof limit === 'number' ? limit : undefined,
        mode: shouldForceFullScan ? 'full' : 'sample',
        sampleSize,
        orderBy,
        allowFullScan: runtimeConfig?.allowFullScan ?? shouldForceFullScan,
        timeoutMs: runtimeConfig?.timeoutMs,
    };
    const preferredMode = options?.preferredMode ?? runtimeConfig?.mode;
    if (shouldForceFullScan) {
        payload.mode = 'full';
        payload.allowFullScan = true;
    } else if (preferredMode === 'full') {
        payload.mode = 'full';
        payload.allowFullScan = true;
    } else {
        payload.mode = 'sample';
        payload.allowFullScan = runtimeConfig?.allowFullScan ?? false;
    }
    return payload;
};
