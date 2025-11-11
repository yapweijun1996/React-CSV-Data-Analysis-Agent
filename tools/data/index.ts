import { runAggregateToolForPlan } from './facade';

export const graphDataTools = {
    aggregatePlan: runAggregateToolForPlan,
};

export type { GraphToolResponse, GraphToolMeta } from './facade';
