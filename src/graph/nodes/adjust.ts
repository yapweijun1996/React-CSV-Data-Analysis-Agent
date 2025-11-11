import type { PipelineContext, NodeResult } from './types';
import type { AiAction } from '@/types';

export const adjustNode = ({ state }: PipelineContext): NodeResult => {
    const followUpAction: AiAction = {
        type: 'text_response',
        responseType: 'text_response',
        stepId: state.currentStepId ?? 'adjust-next-step',
        stateTag: `ts${Date.now().toString(36)}-adjust`,
        timestamp: new Date().toISOString(),
        reason: '提出下一步建议以延伸分析。',
        text: '下一步可继续筛选特定供应商或启用异常侦测。随时告诉我想要深入的角度。',
    };
    return {
        state,
        actions: [followUpAction],
        label: 'adjust',
    };
};
