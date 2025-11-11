
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import OpenAI from 'openai';
import type { ResponseCreateParams } from 'openai/resources/responses/responses';
import { Settings } from '../../types';

// Helper for retrying API calls
export const withRetry = async <T>(fn: () => Promise<T>, retries = 2, signal?: AbortSignal): Promise<T> => {
    let lastError: Error | undefined;
    for (let i = 0; i < retries; i++) {
        if (signal?.aborted) {
            throw new DOMException('Aborted', 'AbortError');
        }
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;
            if (signal?.aborted || i === retries - 1) {
                throw lastError;
            }
            console.warn(`API call failed, retrying... (${i + 1}/${retries})`, error);
            await new Promise(res => setTimeout(res, 500));
        }
    }
    throw lastError;
};

/**
 * Parses a string that is expected to contain a JSON array, but might be malformed.
 * Handles cases where the array is wrapped in markdown, is inside an object, or is just a single object.
 * @param responseText The raw text response from the AI.
 * @returns A parsed array of objects.
 */
export class PlanParsingError extends Error {
    readonly rawContent: string;
    constructor(message: string, rawContent: string) {
        super(message);
        this.name = 'PlanParsingError';
        this.rawContent = rawContent;
    }
}

const tryJsonParse = (text: string): any | null => {
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
};

const extractJsonSegment = (content: string): string | null => {
    const delimiters: Array<[string, string]> = [
        ['[', ']'],
        ['{', '}'],
    ];
    for (const [startChar, endChar] of delimiters) {
        const start = content.indexOf(startChar);
        const end = content.lastIndexOf(endChar);
        if (start !== -1 && end !== -1 && end > start) {
            const segment = content.slice(start, end + 1).trim();
            if (segment) {
                const parsed = tryJsonParse(segment);
                if (parsed !== null) {
                    return segment;
                }
            }
        }
    }
    return null;
};

export const robustlyParseJsonArray = (responseText: string): any[] => {
    let content = responseText.trim();

    // 1. Try to extract JSON from markdown code blocks
    const markdownMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (markdownMatch && markdownMatch[1]) {
        content = markdownMatch[1];
    }

    const initialParse = tryJsonParse(content);
    let parsedContent = initialParse;
    if (parsedContent === null) {
        const extractedSegment = extractJsonSegment(content);
        if (extractedSegment) {
            parsedContent = tryJsonParse(extractedSegment);
        }
    }

    if (parsedContent !== null) {
        const resultObject = parsedContent;

        if (Array.isArray(resultObject)) {
            return resultObject;
        }

        if (typeof resultObject === 'object' && resultObject !== null) {
            const nestedArray = Object.values(resultObject).find(v => Array.isArray(v));
            if (nestedArray && Array.isArray(nestedArray)) {
                return nestedArray;
            }
            if ('chartType' in resultObject && 'title' in resultObject) {
                return [resultObject];
            }
        }
    }

    console.error("Failed to parse AI response as JSON. Content:", content);
    throw new PlanParsingError(
        `AI response could not be parsed as JSON. Content starts with: "${content.substring(0, 150)}..."`,
        content,
    );
};


type OpenAIJsonSchemaFormat = {
    name: string;
    schema: Record<string, any>;
    strict?: boolean;
};

type ResponseFormatConfig =
    | { type: 'json_object' }
    | { type: 'json_schema'; name: string; schema: Record<string, any>; strict?: boolean };

const RESPONSE_ROLE_MAP = new Set(['user', 'assistant', 'system', 'developer'] as const);

const mapMessageRole = (role: string): 'user' | 'assistant' | 'system' | 'developer' => {
    if (RESPONSE_ROLE_MAP.has(role as any)) {
        return role as 'user' | 'assistant' | 'system' | 'developer';
    }
    // Default to user role for unsupported ones (e.g., 'function' or 'tool')
    return 'user';
};

const stringifyMessageContent = (
    content: OpenAI.Chat.Completions.ChatCompletionMessageParam['content'],
): string => {
    if (typeof content === 'string') {
        return content;
    }
    if (Array.isArray(content)) {
        return content
            .map(part => {
                if (typeof part === 'string') return part;
                if ('text' in part && typeof part.text === 'string') {
                    return part.text;
                }
                return JSON.stringify(part);
            })
            .join('\n');
    }
    if (content && typeof content === 'object' && 'text' in content) {
        const textPart = (content as { text?: string }).text;
        if (typeof textPart === 'string') {
            return textPart;
        }
    }
    return '';
};

const convertMessagesToResponseInput = (
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
) => {
    return messages.map(message => ({
        role: mapMessageRole(message.role),
        content: stringifyMessageContent(message.content),
        type: 'message' as const,
    }));
};

const resolveResponseFormat = (format?: boolean | OpenAIJsonSchemaFormat): ResponseFormatConfig | undefined => {
    if (typeof format === 'boolean') {
        return format ? { type: 'json_object' } : undefined;
    }
    if (format) {
        return {
            type: 'json_schema',
            name: format.name,
            schema: format.schema,
            strict: format.strict ?? true,
        };
    }
    return undefined;
};

export const callOpenAI = async (
    settings: Settings,
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    jsonFormatOrSchema?: boolean | OpenAIJsonSchemaFormat,
    signal?: AbortSignal
): Promise<string> => {
    if (!settings.openAIApiKey) throw new Error("OpenAI API key is not set.");
    const openai = new OpenAI({ apiKey: settings.openAIApiKey, dangerouslyAllowBrowser: true });

    const responseFormat = resolveResponseFormat(jsonFormatOrSchema);
    const requestPayload: ResponseCreateParams = {
        model: settings.model,
        input: convertMessagesToResponseInput(messages),
    };
    if (responseFormat) {
        requestPayload.text = {
            format: responseFormat,
        };
    }

    const response = await withRetry(
        () => openai.responses.create(requestPayload, signal ? { signal } : undefined),
        2,
        signal,
    );

    const content = (response.output_text ?? '').trim();
    if (!content) {
        throw new Error('OpenAI returned an empty response.');
    }
    return content;
};

export const callGemini = async (settings: Settings, prompt: string, schema?: any, signal?: AbortSignal): Promise<string> => {
    if (!settings.geminiApiKey) throw new Error("Gemini API key is not set.");
    const ai = new GoogleGenAI({ apiKey: settings.geminiApiKey });
    
    // The Gemini API works better if the schema instruction is part of the main prompt text, not just in config.
    const finalPrompt = `${prompt}\n${schema ? 'Your response must be a valid JSON object adhering to the provided schema.' : ''}`;

    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent(
        {
            model: settings.model,
            contents: finalPrompt,
            config: schema ? {
                responseMimeType: 'application/json',
                responseSchema: schema,
            } : undefined,
        },
        signal ? { signal } : undefined
    ), 2, signal);
    return response.text.trim();
}
