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

export type {
    GraphToolResponse,
    GraphToolMeta,
    GraphProfileResponse,
    GraphNormalizationResponse,
    GraphOutlierResponse,
} from './facade';
