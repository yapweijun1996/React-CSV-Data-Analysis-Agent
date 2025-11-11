import type { PipelineContext, NodeResult } from './types';

export const adjustNode = ({ state }: PipelineContext): NodeResult => ({
    state,
    actions: [],
    label: 'adjust',
});
