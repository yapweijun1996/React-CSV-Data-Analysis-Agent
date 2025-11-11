
import {
    ColumnProfile,
    ChatMessage,
    CardContext,
    Settings,
    AppView,
    CsvRow,
    DataPreparationPlan,
    AiChatResponse,
    AgentActionTrace,
    AgentObservation,
    AgentPlanState,
} from '../../types';
import { callGemini, callOpenAI, type LlmUsageMetrics } from './apiClient';
import { multiActionChatResponseSchema, multiActionChatResponseJsonSchema } from './schemas';
import { createChatPrompt, createChatPromptForStage, createPlanPrimerPrompt } from '../promptTemplates';
import type { PromptStage } from '../utils/promptBudget';
import { StateTagFactory } from '../agent/stateTagFactory';

export interface PromptProfile {
    mode: 'plan_only' | 'full';
    charCount: number;
    estimatedTokens: number;
    promptLabel: string;
}

export interface ChatResponseOptions {
    signal?: AbortSignal;
    mode?: 'full' | 'plan_only';
    onPromptProfile?: (profile: PromptProfile) => void;
    onUsage?: (usage: LlmUsageMetrics) => void;
    promptStage?: PromptStage | PromptStage[];
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
      "stateTag": "1731234567890-1",
      "timestamp": "2024-05-18T09:00:00.000Z",
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
        "nextSteps": [{ "id": "plan-init", "label": "Draft comparison plan", "status": "in_progress" }],
        "steps": [{ "id": "plan-init", "label": "Draft comparison plan", "status": "in_progress" }],
        "stateTag": "1731234567890-1"
      }
    },
    {
      "type": "text_response",
      "responseType": "text_response",
      "stepId": "plan-init",
      "stateTag": "1731234567890-2",
      "timestamp": "2024-05-18T09:00:05.000Z",
      "reason": "Let the user know I captured the plan.",
      "text": "Plan updated—ready when you are to proceed with the channel comparison."
    }
  ]
}
\`\`\``;

export const generateChatResponse = async (
    columns: ColumnProfile[],
    chatHistory: ChatMessage[],
    userPrompt: string,
    cardContext: CardContext[],
    settings: Settings,
    aiCoreAnalysisSummary: string | null,
    currentView: AppView,
    rawDataSample: CsvRow[],
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
                              rawDataSample,
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
                      rawDataSample,
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

        const baseSystemPrompt = `You are an expert data analyst and business strategist, required to operate using a Reason-Act (ReAct) framework. For every action you take, you must first explain your reasoning in the 'reason' field, and then define the action itself. Keep each reason under 280 characters (ideally two sentences or fewer) and tie it to the plan step you're executing. You also maintain an explicit goal tracker by emitting a 'plan_state_update' action at the start of each response (and whenever the mission changes) so the UI can display your progress. Every action JSON object must include \`type\`, \`responseType\`, \`stepId\`, a monotonic \`stateTag\` formatted as "<epochMs>-<seq>" (or a known label like \`awaiting_clarification\`), **and** a \`timestamp\` string in ISO-8601 format. The plan_state_update payload must include \`planId\`, \`currentStepId\`, and a \`steps\` array (each entry with intent + status). Emit at most two actions per response: the plan_state_update plus a single atomic action. Your final conversational responses should be in ${settings.language}.
${ACTION_SCHEMA_EXAMPLE}
Your output MUST be a single JSON object with an "actions" key containing an array of action objects.`;
        const maxAttempts = settings.provider === 'openai' ? 2 : 1;
        let retryInstruction = '';

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            let jsonStr: string;
            if (settings.provider === 'openai') {
                const systemPrompt = `${baseSystemPrompt}${retryInstruction}`;
                const messages = [{ role: 'system', content: systemPrompt }, { role: 'user', content: promptContent }];
                jsonStr = await callOpenAI(
                    settings,
                    messages,
                    { name: 'MultiActionResponse', schema: multiActionChatResponseJsonSchema, strict: true },
                    {
                        signal: options?.signal,
                        operation: usageOperation,
                        onUsage: usage => options?.onUsage?.({ ...usage, operation: usageOperation }),
                    },
                );
            } else {
                jsonStr = await callGemini(settings, promptContent, multiActionChatResponseSchema, {
                    signal: options?.signal,
                    operation: usageOperation,
                    onUsage: usage => options?.onUsage?.({ ...usage, operation: usageOperation }),
                });
            }

            const chatResponse = JSON.parse(jsonStr) as AiChatResponse;

            if (!chatResponse.actions || !Array.isArray(chatResponse.actions)) {
                throw new Error("Invalid response structure from AI: 'actions' array not found.");
            }

            const missingExecutableCode = settings.provider === 'openai' && hasMissingExecutableCode(chatResponse);
            if (missingExecutableCode && attempt < maxAttempts - 1) {
                retryInstruction = `\nIMPORTANT VALIDATION FAILURE: Your previous response included an action with responseType=execute_js_code but did not include a valid code.jsFunctionBody. You must respond with executable JavaScript that mutates the provided data and returns the updated array (including an explicit return statement). Provide only valid JSON matching the required schema.`;
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
