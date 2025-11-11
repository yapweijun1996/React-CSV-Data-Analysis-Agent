import {
    runAggregateToolForPlan,
    runProfileTool,
    runNormalizeInvoiceMonth,
    runOutlierDetection,
} from './facade';

export const graphDataTools = {
    aggregatePlan: runAggregateToolForPlan,
    profileDataset: runProfileTool,
    normalizeInvoiceMonth: runNormalizeInvoiceMonth,
    detectOutliers: runOutlierDetection,
};

export type { GraphToolResponse } from './facade';
export { GraphToolExecutionError } from './facade';
