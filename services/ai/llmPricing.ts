import type { LlmUsageMetrics } from './apiClient';

type PricingTier = {
    promptPerMillion: number;
    completionPerMillion: number;
};

type Provider = 'openai' | 'gemini';

const MODEL_PRICING: Array<{ provider: Provider; pattern: RegExp; tier: PricingTier }> = [
    {
        provider: 'openai',
        pattern: /gpt-4o-mini/i,
        tier: { promptPerMillion: 0.15, completionPerMillion: 0.6 },
    },
    {
        provider: 'openai',
        pattern: /gpt-4o-?mini-?audio/i,
        tier: { promptPerMillion: 0.3, completionPerMillion: 1.2 },
    },
    {
        provider: 'openai',
        pattern: /gpt-4o/i,
        tier: { promptPerMillion: 5, completionPerMillion: 15 },
    },
    {
        provider: 'openai',
        pattern: /gpt-4-turbo/i,
        tier: { promptPerMillion: 10, completionPerMillion: 30 },
    },
    {
        provider: 'openai',
        pattern: /gpt-3\.5-turbo/i,
        tier: { promptPerMillion: 0.5, completionPerMillion: 1.5 },
    },
    {
        provider: 'gemini',
        pattern: /gemini-1\.5-pro/i,
        tier: { promptPerMillion: 7, completionPerMillion: 21 },
    },
    {
        provider: 'gemini',
        pattern: /gemini-1\.5-flash/i,
        tier: { promptPerMillion: 0.35, completionPerMillion: 1.05 },
    },
    {
        provider: 'gemini',
        pattern: /gemini-1\.(0|1)-pro/i,
        tier: { promptPerMillion: 3.5, completionPerMillion: 10.5 },
    },
];

const PROVIDER_DEFAULT: Record<Provider, PricingTier> = {
    openai: { promptPerMillion: 5, completionPerMillion: 15 },
    gemini: { promptPerMillion: 3.5, completionPerMillion: 10.5 },
};

const findPricingTier = (provider: Provider, model: string): PricingTier => {
    const entry = MODEL_PRICING.find(item => item.provider === provider && item.pattern.test(model));
    return entry?.tier ?? PROVIDER_DEFAULT[provider];
};

export const estimateLlmCostUsd = (usage: LlmUsageMetrics): number | null => {
    if (usage.promptTokens == null && usage.completionTokens == null) {
        return null;
    }
    const tier = findPricingTier(usage.provider, usage.model);
    if (!tier) {
        return null;
    }
    const promptTokens = usage.promptTokens ?? 0;
    const completionTokens = usage.completionTokens ?? 0;
    const promptCost = (promptTokens / 1_000_000) * tier.promptPerMillion;
    const completionCost = (completionTokens / 1_000_000) * tier.completionPerMillion;
    const totalCost = promptCost + completionCost;
    if (!Number.isFinite(totalCost) || totalCost === 0) {
        return null;
    }
    return Number(totalCost.toFixed(6));
};
