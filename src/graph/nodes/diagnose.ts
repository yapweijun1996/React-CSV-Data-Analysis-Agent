import type { PipelineContext, NodeResult } from './types';
import type { AiAction } from '@/types';

export const diagnoseNode = ({ state }: PipelineContext): NodeResult => {
    const updatedState = {
        ...state,
        warnings: state.warnings ?? [],
    };
    const hasProfileObservation = state.observations.some(observation => observation.kind === 'profile_dataset');
    const actions: AiAction[] = [];
    if (!hasProfileObservation) {
        actions.push({
            type: 'execute_js_code',
            responseType: 'execute_js_code',
            stepId: state.currentStepId ?? 'diagnose-profile',
            stateTag: state.stateTag ?? 'context_ready',
            timestamp: new Date().toISOString(),
            reason: '需要列画像来制定计划。',
            meta: { toolCall: { kind: 'profile_dataset' } },
            toolCall: { kind: 'profile_dataset' },
        });
    }
    return {
        state: updatedState,
        actions,
        label: 'diagnose',
    };
};
