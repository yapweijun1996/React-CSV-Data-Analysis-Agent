import type { PipelineContext, NodeResult } from './types';

export const diagnoseNode = ({ state }: PipelineContext): NodeResult => {
    const updatedState = {
        ...state,
        warnings: state.warnings ?? [],
    };
    return {
        state: updatedState,
        actions: [],
        label: 'diagnose',
    };
};
