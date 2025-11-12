import type { AiAction, AwaitUserPayload } from '@/types';
import type { PipelineContext, NodeResult } from './types';
import type { StepStatus } from '../schema';
import { isGraphLlmTurnPayload } from '../payloads';

const ASK_USER_QUESTION = '你想先做哪項？';
const ASK_USER_OPTIONS: AwaitUserPayload['options'] = [
    { id: 'clean_month', label: '清洗/标准化 InvoiceMonth', metadata: { column: 'InvoiceMonth' } },
    { id: 'outlier', label: '异常大额清单', metadata: { valueColumn: 'Amount' } },
];
const DEFAULT_PLACEHOLDER = '輸入分析請求，例如「Top10 by amount desc」';

const createPromptId = () =>
    `prompt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export const askUserNode = ({ state, payload }: PipelineContext): NodeResult => {
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

    const template = isGraphLlmTurnPayload(payload) ? payload.askUserPrompt : null;
    const promptId = createPromptId();
    const question = template?.question?.trim() ? template.question : ASK_USER_QUESTION;
    const options =
        template?.options && template.options.length > 0 ? template.options : ASK_USER_OPTIONS;
    const placeholder = template?.placeholder ?? DEFAULT_PLACEHOLDER;
    const allowFreeText = template?.allowFreeText ?? true;

    const awaitPayload: AwaitUserPayload = {
        promptId,
        question,
        options,
        allowFreeText,
        placeholder,
    };
    const action: AiAction = {
        type: 'await_user',
        responseType: 'await_user',
        stepId: state.currentStepId ?? 'ask-user-choice',
        stateTag: 'awaiting_clarification',
        timestamp: new Date().toISOString(),
        reason: 'Need user choice before continuing the analysis plan.',
        text: question,
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
