import type { PipelineContext, NodeResult } from './types';

export const observeNode = ({ state }: PipelineContext): NodeResult => {
    const nextState = {
        ...state,
        phase: 'observe',
        updatedAt: new Date().toISOString(),
    };
    return {
        state: nextState,
        actions: [],
        label: 'observe',
    };
};
