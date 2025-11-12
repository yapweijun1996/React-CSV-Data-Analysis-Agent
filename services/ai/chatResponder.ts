
import {
    ColumnProfile,
    ChatMessage,
    CardContext,
    Settings,
    AppView,
    DataPreparationPlan,
    AiChatResponse,
    AgentActionTrace,
    AgentObservation,
    AgentPlanState,
    AiAction,
    PromptProfile,
} from '../../types';
import { callGemini, callOpenAI, type LlmUsageMetrics } from './apiClient';
import { createChatPrompt, createChatPromptForStage, createPlanPrimerPrompt } from '../promptTemplates';
import type { PromptStage } from '../utils/promptBudget';
import { StateTagFactory } from '../agent/stateTagFactory';
import type { AgentSchemaPhase } from '@/types';
import { coerceChatResponseJson } from './chatResponseParser';
import { describePhaseConvention } from './phaseConventions';

export interface ChatResponseOptions {
    signal?: AbortSignal;
    mode?: 'full' | 'plan_only';
    onPromptProfile?: (profile: PromptProfile) => void;
    onUsage?: (usage: LlmUsageMetrics) => void;
    promptStage?: PromptStage | PromptStage[];
    phase?: AgentSchemaPhase;
}

const hasMissingExecutableCode = (response: AiChatResponse): boolean => {
    return response.actions.some(action => {
        if (action.responseType !== 'execute_js_code') return false;
        const body = action.code?.jsFunctionBody;
        return !body || body.trim().length === 0;
    });
};

const fallbackStateTagFactory = new StateTagFactory();
const ACTION_SCHEMA_EXAMPLE = `Example JSON response (plan_state_update + text acknowledgement):
\`\`\`json
{
  "actions": [
    {
      "type": "plan_state_update",
      "responseType": "plan_state_update",
      "stepId": "plan-init",
      "reason": "Restating the plan so the UI stays in sync.",
      "planState": {
        "planId": "plan-abc123",
        "goal": "Compare revenue vs. orders by channel.",
        "contextSummary": "User asked for the top-performing channels in 2024.",
        "progress": "Ready to build the comparison card.",
        "blockedBy": null,
        "observationIds": [],
        "confidence": 0.65,
        "updatedAt": "2024-05-18T09:00:00.000Z",
        "currentStepId": "plan-init",
        "nextSteps": [{ "id": "acknowledge_user", "label": "向用户问候并确认需求" }],
        "steps": [
          {
            "id": "acknowledge_user",
            "label": "向用户问候并确认需求",
            "intent": "conversation",
            "status": "in_progress"
          }
        ],
        "stateTag": "context_ready"
      }
    },
    {
      "type": "text_response",
      "responseType": "text_response",
      "stepId": "plan-init",
      "reason": "Let the user know I captured the plan.",
      "text": "计划已更新，随时可以继续。"
    }
  ]
}
\`\`\``;

const clampConfidenceValue = (value: unknown): number => {
    if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
        return 0.65;
    }
    return Math.min(1, Math.max(0, value));
};

const normalizePlanStateDefaults = (action: AiAction) => {
    if (action.type !== 'plan_state_update' || !action.planState) {
        return;
    }
    const planState = action.planState;
    if (typeof planState.updatedAt !== 'string' || !planState.updatedAt.trim()) {
        planState.updatedAt = new Date().toISOString();
    }
    if (typeof planState.stateTag !== 'string' || !planState.stateTag.trim()) {
        planState.stateTag = fallbackStateTagFactory.mint(Date.now(), 'plan');
    }
    if (!Array.isArray(planState.observationIds)) {
        planState.observationIds = [];
    }
    planState.blockedBy = planState.blockedBy ?? null;
    if (
        typeof planState.contextSummary !== 'string' ||
        planState.contextSummary.trim().length === 0
    ) {
        planState.contextSummary = null;
    }
    planState.confidence = clampConfidenceValue(planState.confidence);
};

export const generateChatResponse = async (
    columns: ColumnProfile[],
    chatHistory: ChatMessage[],
    userPrompt: string,
    cardContext: CardContext[],
    settings: Settings,
    aiCoreAnalysisSummary: string | null,
    currentView: AppView,
    longTermMemory: string[],
    recentObservations: AgentObservation[],
    activePlanState: AgentPlanState | null,
    dataPreparationPlan: DataPreparationPlan | null,
    recentActionTraces: AgentActionTrace[],
    rawDataFilterSummary: string,
    options?: ChatResponseOptions
): Promise<AiChatResponse> => {
    const isApiKeySet = (settings.provider === 'google' && !!settings.geminiApiKey) || (settings.provider === 'openai' && !!settings.openAIApiKey);
    if (!isApiKeySet) {
        const fallbackStateTag = fallbackStateTagFactory.mint(Date.now(), 'fallback');
        return {
            actions: [
                {
                    type: 'text_response',
                    responseType: 'text_response',
                    stepId: 'ad_hoc_response',
                    stateTag: fallbackStateTag,
                    text: 'Cloud AI is disabled. API Key not provided.',
                    reason: 'API key is missing, so I must inform the user.',
                },
            ],
        };
    }
    
    try {
        const promptMode = options?.mode ?? 'full';
        const stageOverride = promptMode === 'full' ? options?.promptStage : undefined;
        const usageOperation = promptMode === 'plan_only' ? 'chat.plan_only' : 'chat.full';
        const phaseKey: AgentSchemaPhase | undefined =
            options?.phase ?? (promptMode === 'plan_only' ? 'plan' : undefined);
        const phaseDirective = describePhaseConvention(phaseKey);
        const promptContent =
            promptMode === 'plan_only'
                ? createPlanPrimerPrompt(
                      columns,
                      chatHistory,
                      userPrompt,
                      settings.language,
                      aiCoreAnalysisSummary,
                      longTermMemory,
                      recentObservations,
                      cardContext,
                  )
                : stageOverride
                ? (Array.isArray(stageOverride) ? stageOverride : [stageOverride])
                      .map(stage =>
                          createChatPromptForStage(
                              stage,
                              columns,
                              chatHistory,
                              userPrompt,
                              cardContext,
                              settings.language,
                              aiCoreAnalysisSummary,
                              longTermMemory,
                              recentObservations,
                              activePlanState,
                              dataPreparationPlan,
                              recentActionTraces,
                              rawDataFilterSummary,
                          ),
                      )
                      .join('\n\n')
                : createChatPrompt(
                      columns,
                      chatHistory,
                      userPrompt,
                      cardContext,
                      settings.language,
                      aiCoreAnalysisSummary,
                      longTermMemory,
                      recentObservations,
                      activePlanState,
                      dataPreparationPlan,
                      recentActionTraces,
                      rawDataFilterSummary,
                  );

        if (options?.onPromptProfile) {
            const stageLabel =
                promptMode === 'full' && stageOverride
                    ? (Array.isArray(stageOverride) ? stageOverride.join('+') : stageOverride)
                    : null;
            const promptLabel =
                promptMode === 'plan_only'
                    ? 'chat_plan_primer'
                    : `chat_full${stageLabel ? `_stage_${stageLabel}` : ''}`;
            const charCount = promptContent.length;
            const estimatedTokens = Math.ceil(charCount / 4);
            options.onPromptProfile({
                mode: promptMode,
                charCount,
                estimatedTokens,
                promptLabel,
            });
        }

        const baseSystemPrompt = `You are an expert data analyst and business strategist, required to operate using a Reason-Act (ReAct) framework. For every action you take, you must first explain your reasoning in the 'reason' field, and then define the action itself. Keep each reason under 280 characters (ideally two sentences or fewer) and tie it to the plan step you're executing. You also maintain an explicit goal tracker by emitting a 'plan_state_update' action at the start of each response (and whenever the mission changes) so the UI can display your progress. Every action JSON object must include \`type\`, \`responseType\`, and \`stepId\`. The runtime appends metadata like timestamps and stateTags automatically, so you may omit them. The plan_state_update payload must include \`planId\`, \`currentStepId\`, and a \`steps\` array (each entry with intent + status). Emit at most two actions per response: the plan_state_update plus a single atomic action. When the user's latest message is only a greeting or check-in, the first entry in \`nextSteps\` (and \`steps\`) must be an \`acknowledge_user\` conversation step before any data work. Your final conversational responses should be in ${settings.language}.
${ACTION_SCHEMA_EXAMPLE}
Your output MUST be a single JSON object with an "actions" key containing an array of action objects. Never wrap the JSON in markdown fences or add commentary—the response must start with '{' and end with '}'.`;
        const maxAttempts = settings.provider === 'openai' ? 2 : 1;
        let retryInstruction = '';

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            let jsonStr: string;
            if (settings.provider === 'openai') {
                const systemPrompt = `${baseSystemPrompt}\n${phaseDirective}${retryInstruction}`;
                const messages = [{ role: 'system', content: systemPrompt }, { role: 'user', content: promptContent }];
                jsonStr = await callOpenAI(
                    settings,
                    messages,
                    false,
                    {
                        signal: options?.signal,
                        operation: usageOperation,
                        onUsage: usage => options?.onUsage?.({ ...usage, operation: usageOperation }),
                    },
                );
            } else {
                const augmentedPrompt = `${promptContent}\n\n${phaseDirective}`;
                jsonStr = await callGemini(settings, augmentedPrompt, undefined, {
                    signal: options?.signal,
                    operation: usageOperation,
                    onUsage: usage => options?.onUsage?.({ ...usage, operation: usageOperation }),
                });
            }

            const chatResponse = coerceChatResponseJson(jsonStr);

            if (!chatResponse.actions || !Array.isArray(chatResponse.actions)) {
                throw new Error("Invalid response structure from AI: 'actions' array not found.");
            }
            chatResponse.actions.forEach(action => normalizePlanStateDefaults(action));

            const missingExecutableCode = settings.provider === 'openai' && hasMissingExecutableCode(chatResponse);
            if (missingExecutableCode && attempt < maxAttempts - 1) {
                retryInstruction = `\nIMPORTANT VALIDATION FAILURE: Your previous response included an action with responseType=execute_js_code but did not include a valid code.jsFunctionBody. You must respond with executable JavaScript that mutates the provided data and returns the updated array (including an explicit return statement). Provide only valid JSON matching the required action envelope.`;
                continue;
            }

            return chatResponse;
        }
        throw new Error('Failed to obtain a valid AI response after retries.');
    } catch (error) {
        console.error("Error generating chat response:", error);
        throw new Error(`Failed to get a valid response from the AI. ${error instanceof Error ? error.message : ''}`);
    }
};
