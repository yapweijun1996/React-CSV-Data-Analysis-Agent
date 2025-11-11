import type { PipelineContext, NodeResult } from './types';
import type { AiAction } from '@/types';

export const verifyNode = ({ state }: PipelineContext): NodeResult => {
    const pendingVerification = state.pendingVerification;
    if (!pendingVerification) {
        return { state, actions: [], label: 'verify' };
    }
    const verificationAction: AiAction = {
        type: 'text_response',
        responseType: 'text_response',
        stepId: pendingVerification.id,
        stateTag: `ts${Date.now().toString(36)}-verify`,
        timestamp: new Date().toISOString(),
        reason: '确认动作已执行，准备分享结果。',
        text: `已完成「${pendingVerification.description}」的初步执行，准备生成可视化或进一步说明。`,
    };
    return {
        state: {
            ...state,
            pendingVerification: null,
        },
        actions: [verificationAction],
        label: 'verify',
    };
};
