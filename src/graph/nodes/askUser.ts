import type { AiAction, AwaitUserPayload } from '@/types';
import type { PipelineContext, NodeResult } from './types';
import type { StepStatus } from '../schema';

const ASK_USER_QUESTION = '你想先做哪項？';
const ASK_USER_OPTIONS: AwaitUserPayload['options'] = [
    { id: 'clean_month', label: '清洗/标准化 InvoiceMonth' },
    { id: 'top_payees', label: 'Top 收款方（总额/笔数/客单）' },
    { id: 'outlier', label: '异常大额清单' },
    { id: 'by_type', label: '按 PayeeType 分解' },
];

const createPromptId = () =>
    `prompt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export const askUserNode = ({ state }: PipelineContext): NodeResult => {
    if (state.pendingUserReply) {
        return {
            state,
            actions: [],
            label: 'ask_user',
        };
    }

    if (state.awaitingUser && state.awaitPrompt) {
        // Already awaiting; re-emit same question so UI can refresh.
        const action: AiAction = {
            type: 'await_user',
            responseType: 'await_user',
            stepId: state.currentStepId ?? 'ask-user-choice',
            stateTag: 'awaiting_clarification',
            timestamp: new Date().toISOString(),
            reason: 'Still waiting for your selection before continuing.',
            text: state.awaitPrompt.question,
            meta: {
                awaitUser: true,
                haltAfter: true,
                promptId: state.awaitPrompt.promptId,
            },
            awaitUserPayload: state.awaitPrompt,
        };
        return {
            state,
            actions: [action],
            halted: true,
            label: 'ask_user',
        };
    }

    const promptId = createPromptId();
    const awaitPayload: AwaitUserPayload = {
        promptId,
        question: ASK_USER_QUESTION,
        options: ASK_USER_OPTIONS,
        allowFreeText: true,
        placeholder: '或输入：Top10 by amount desc',
    };
    const action: AiAction = {
        type: 'await_user',
        responseType: 'await_user',
        stepId: state.currentStepId ?? 'ask-user-choice',
        stateTag: 'awaiting_clarification',
        timestamp: new Date().toISOString(),
        reason: 'Need user choice before continuing the analysis plan.',
        text: ASK_USER_QUESTION,
        meta: {
            awaitUser: true,
            haltAfter: true,
            promptId,
        },
        awaitUserPayload: awaitPayload,
    };

    const steps =
        state.steps.length > 0
            ? state.steps
            : [
                  {
                      id: 'ask-user-choice',
                      intent: 'clarification',
                      label: 'Await user choice before planning',
                      status: 'waiting_user' as StepStatus,
                  },
              ];

    return {
        state: {
            ...state,
            awaitingUser: true,
            blockedBy: 'awaiting_user_choice',
            stateTag: 'awaiting_clarification',
            steps,
            awaitPrompt: awaitPayload,
            awaitPromptId: promptId,
            pendingPlan: null,
            pendingVerification: null,
            updatedAt: new Date().toISOString(),
        },
        actions: [action],
        halted: true,
        label: 'ask_user',
    };
};
