import type { AiChatResponse } from '../../types';
import { coerceJsonObject, JsonCoercionError } from './jsonRepair';

export class AiChatResponseParsingError extends Error {
    readonly rawContent: string;

    constructor(message: string, rawContent: string) {
        super(message);
        this.name = 'AiChatResponseParsingError';
        this.rawContent = rawContent;
    }
}

export const coerceChatResponseJson = (rawContent: unknown): AiChatResponse => {
    try {
        const parsed = coerceJsonObject<AiChatResponse>(rawContent);
        if (!parsed.actions || !Array.isArray(parsed.actions)) {
            throw new AiChatResponseParsingError("Invalid response structure: 'actions' array missing.", JSON.stringify(parsed));
        }
        return parsed;
    } catch (error) {
        if (error instanceof JsonCoercionError) {
            throw new AiChatResponseParsingError(error.message, error.rawContent);
        }
        throw error;
    }
};
