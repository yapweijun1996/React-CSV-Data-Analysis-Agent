
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
import { callGemini, callOpenAI } from './apiClient';
import { multiActionChatResponseSchema, multiActionChatResponseJsonSchema } from './schemas';
import { createChatPrompt } from '../promptTemplates';

interface ChatResponseOptions {
    signal?: AbortSignal;
}

const hasMissingExecutableCode = (response: AiChatResponse): boolean => {
    return response.actions.some(action => {
        if (action.responseType !== 'execute_js_code') return false;
        const body = action.code?.jsFunctionBody;
        return !body || body.trim().length === 0;
    });
};

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
        return { actions: [{ responseType: 'text_response', text: 'Cloud AI is disabled. API Key not provided.', thought: 'API key is missing, so I must inform the user.' }] };
    }
    
    try {
        const promptContent = createChatPrompt(
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

        const baseSystemPrompt = `You are an expert data analyst and business strategist, required to operate using a Reason-Act (ReAct) framework. For every action you take, you must first explain your reasoning in the 'thought' field, and then define the action itself. You also maintain an explicit goal tracker by emitting a 'plan_state_update' action at the start of each response (and whenever the mission changes) so the UI can display your progress. Your final conversational responses should be in ${settings.language}.
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
                    { name: 'MultiActionChatResponse', schema: multiActionChatResponseJsonSchema, strict: true },
                    options?.signal
                );
            } else {
                jsonStr = await callGemini(settings, promptContent, multiActionChatResponseSchema, options?.signal);
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
