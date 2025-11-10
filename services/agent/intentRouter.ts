import type { AppStore } from '../../store/appStoreTypes';
import type { DetectedIntent } from '../../types';

const REMOVE_CARD_REGEX = /(remove|delete)\s+card/i;
const FILTER_REGEX = /(filter|show|find)\s+(all\s+)?(rows|entries|records|data)/i;
const TRANSFORM_REGEX = /(clean|transform|restructure|normalize|standardize|add\s+column|create\s+column|calculate)/i;
const CLARIFICATION_REGEX = /(which|what)\s+(column|field|value)/i;
const GREETING_REGEX = /^(hi|hello|hey|hola|ciao|salut|嗨+|哈囉|你好|您好|早上好|晚上好|早安|晚安)([!.?\s]|$)/i;
const SMALLTALK_REGEX = /(how\s+are\s+you|很好|thanks|thank\s+you|謝謝|你呢|what'?s\s+up|聊聊)/i;
const CHOICE_REGEX = /^\s*(?:option|choice)?\s*(?:[1-3]|[abc])(?:[\s.:,-].*)?$/i;

export const detectUserIntent = (message: string, store: AppStore): DetectedIntent => {
    const text = (message || '').trim();
    if (!text) {
        return { intent: 'unknown', confidence: 0.1 };
    }

    if (GREETING_REGEX.test(text)) {
        return { intent: 'greeting', confidence: 0.9 };
    }

    if (SMALLTALK_REGEX.test(text)) {
        return { intent: 'smalltalk', confidence: 0.75 };
    }

    if (CHOICE_REGEX.test(text)) {
        return { intent: 'ask_user_choice', confidence: 0.8 };
    }

    if (REMOVE_CARD_REGEX.test(text)) {
        const cards = Array.isArray(store.analysisCards) ? store.analysisCards : [];
        const normalized = text.toLowerCase();
        const matchedCard = cards.find(card => {
            const title = card?.plan?.title;
            return typeof title === 'string' && normalized.includes(title.toLowerCase());
        });
        if (matchedCard) {
            return {
                intent: 'remove_card',
                confidence: 0.95,
                requiredTool: {
                    responseType: 'dom_action',
                    domToolName: 'removeCard',
                    payloadHints: { cardId: matchedCard.id, cardTitle: matchedCard.plan?.title },
                },
                payloadHints: matchedCard.plan?.title ? { cardTitle: matchedCard.plan.title } : undefined,
            };
        }
        return {
            intent: 'remove_card',
            confidence: 0.8,
            requiredTool: null,
        };
    }

    if (FILTER_REGEX.test(text)) {
        return {
            intent: 'data_filter',
            confidence: 0.75,
            requiredTool: { responseType: 'filter_spreadsheet' },
            payloadHints: { query: text },
        };
    }

    if (TRANSFORM_REGEX.test(text)) {
        return {
            intent: 'data_transform',
            confidence: 0.7,
            requiredTool: { responseType: 'execute_js_code' },
        };
    }

    if (CLARIFICATION_REGEX.test(text) || text.endsWith('?')) {
        return {
            intent: 'clarification',
            confidence: 0.6,
        };
    }

    return {
        intent: 'chart_request',
        confidence: 0.4,
    };
};
