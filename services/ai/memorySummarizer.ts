import { ChatMessage, Settings } from '../../types';
import { callGemini, callOpenAI, type LlmUsageMetrics } from './apiClient';
import { createConversationMemoryPrompt } from '../promptTemplates';

interface MemorySummaryOptions {
    signal?: AbortSignal;
    onUsage?: (usage: LlmUsageMetrics) => void;
}

const fallbackConversationSummary = (messages: ChatMessage[]): string => {
    const window = messages.slice(-6);
    return window
        .map(message => {
            const speaker = message.sender === 'ai' ? 'AI' : 'User';
            return `${speaker}: ${message.text}`;
        })
        .join('\n');
};

export const generateConversationMemorySummary = async (
    messages: ChatMessage[],
    settings: Settings,
    options?: MemorySummaryOptions,
): Promise<string> => {
    if (messages.length === 0) return '';

    const promptContent = createConversationMemoryPrompt(messages, settings.language);
    const operation = 'memory.conversation_summary';
    const isApiKeySet =
        (settings.provider === 'google' && !!settings.geminiApiKey) ||
        (settings.provider === 'openai' && !!settings.openAIApiKey);

    if (!isApiKeySet) {
        return fallbackConversationSummary(messages);
    }

    try {
        if (settings.provider === 'openai') {
            const systemPrompt = `You compress conversations between a user and an AI analyst into concise memory notes.
Each response must:
- Contain 2–3 bullet points summarizing the decisions or insights.
- List outstanding questions or promised follow-ups.
- Mention roughly when in the conversation this occurred (e.g., "Early discussion").
Return plain text in ${settings.language}.`;

            const chatMessages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: promptContent },
            ];
            const summary =
                (await callOpenAI(settings, chatMessages, false, {
                    signal: options?.signal,
                    operation,
                    onUsage: usage => options?.onUsage?.({ ...usage, operation }),
                })) || '';
            return summary || fallbackConversationSummary(messages);
        }

        const summary = await callGemini(settings, promptContent, undefined, {
            signal: options?.signal,
            operation,
            onUsage: usage => options?.onUsage?.({ ...usage, operation }),
        });
        return summary || fallbackConversationSummary(messages);
    } catch (error) {
        console.error('Failed to generate conversation memory summary:', error);
        return fallbackConversationSummary(messages);
    }
};
