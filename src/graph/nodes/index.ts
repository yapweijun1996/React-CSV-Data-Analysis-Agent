import type { PipelineContext, NodeResult } from './types';
import type { AiAction } from '@/types';
import { diagnoseNode } from './diagnose';
import { askUserNode } from './askUser';
import { planNode } from './plan';
import { actNode } from './act';
import { verifyNode } from './verify';
import { adjustNode } from './adjust';

const NODE_SEQUENCE = [diagnoseNode, askUserNode, planNode, actNode, verifyNode, adjustNode];

export const runGraphPipeline = (context: PipelineContext): NodeResult => {
    let currentState = context.state;
    const aggregatedActions: AiAction[] = [];
    for (const node of NODE_SEQUENCE) {
        const result = node({ state: currentState, payload: context.payload });
        currentState = result.state;
        if (result.actions.length > 0) {
            aggregatedActions.push(...result.actions);
        }
        if (result.halted) {
            return {
                state: currentState,
                actions: aggregatedActions,
                halted: true,
                label: result.label,
            };
        }
    }
    return {
        state: currentState,
        actions: aggregatedActions,
        halted: false,
        label: 'complete',
    };
};
