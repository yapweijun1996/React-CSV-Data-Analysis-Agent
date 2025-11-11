import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableLambda, RunnableSequence } from '@langchain/core/runnables';
import { z } from 'zod';
import { graphDataTools, type GraphProfileResponse } from '@/tools/data';
import { generateAnalysisPlans, type PlanGenerationResult } from '@/services/aiService';
import { estimateLlmCostUsd } from '@/services/ai/llmPricing';
import type { PlanGenerationUsageEntry } from '@/services/ai/planGenerator';
import type { AnalysisPlan, AgentPlanState, AgentPlanStep } from '@/types';
import type {
    LangChainPlanEnvelope,
    LangChainPlanTelemetry,
    LangChainPlannerContext,
    ProfileSnapshot,
} from './types';
import type { PlanGenerationUsageEntry } from '@/services/ai/planGenerator';

const DEFAULT_PROFILE: ProfileSnapshot = {
    columns: 12,
    rowCount: 12_345,
    sampledRows: 500,
    warnings: [],
};

const analysisPlanSchema = z.object({
    title: z.string(),
    description: z.string(),
    chartType: z.string(),
});

const buildPlanPrompt = () =>
    PromptTemplate.fromTemplate(
        `You are a data analyst. Dataset profile: \n{dataset}\nGenerate ONE chart plan as JSON with keys "title", "description", "chartType" (bar/line/pie).`,
    );

const profileResponseToSnapshot = (profile: GraphProfileResponse): ProfileSnapshot => ({
    columns: profile.columns,
    rowCount: profile.rowCount,
    sampledRows: profile.sampledRows,
    warnings: profile.warnings,
});

const fallbackPlanFromProfile = (profile: ProfileSnapshot): AnalysisPlan => ({
    title: 'Dataset Overview',
    description: `Profile snapshot：${profile.columns} columns、${profile.rowCount} rows`,
    chartType: 'bar',
    aggregation: 'count',
    groupByColumn: 'auto',
    valueColumn: undefined,
    defaultTopN: 8,
    defaultHideOthers: true,
});

const createLLMRunnable = (
    context: LangChainPlannerContext,
    profile: ProfileSnapshot,
    onTelemetry?: (entries: PlanGenerationResult['telemetry']) => void,
) =>
    RunnableLambda.from(async ({ instructions }: { instructions: string }) => {
        if (!context.columns.length || context.rows.length === 0) {
            if (context.debug) {
                console.warn('[LangChain Plan] Missing dataset/columns, fallback plan used.');
            }
            return fallbackPlanFromProfile(profile);
        }
        try {
            const sampleRows = context.rows.slice(0, 200);
            const { plans, warnings, telemetry } = await generateAnalysisPlans(
                context.columns,
                sampleRows,
                context.settings,
            );
            if (telemetry) {
                onTelemetry?.(telemetry);
            }
            if (warnings.length && context.addProgress) {
                context.addProgress(
                    `[LangChain Plan] Warnings: ${warnings.map(warning => warning.message).join(' / ')}`,
                );
            }
            const plan = plans[0];
            if (plan) {
                return plan;
            }
        } catch (error) {
            if (context.debug) {
                console.error('[LangChain Plan] generateAnalysisPlans failed, fallback plan used.', error, instructions);
            }
        }
        return fallbackPlanFromProfile(profile);
    });

const fetchProfileSnapshot = async (context: LangChainPlannerContext): Promise<ProfileSnapshot> => {
    if (!context.datasetId) {
        if (context.debug) {
            console.warn('[LangChain Plan] datasetId missing, using fallback profile.');
        }
        return context.fallbackProfile ?? DEFAULT_PROFILE;
    }
    try {
        const profile = await graphDataTools.profileDataset(context.datasetId, context.sampleSize);
        return profileResponseToSnapshot(profile);
    } catch (error) {
        if (context.debug) {
            console.warn('[LangChain Plan] profileDataset failed, fallback to stub.', error);
        }
        return context.fallbackProfile ?? DEFAULT_PROFILE;
    }
};

const summarizeTokenUsage = (
    entries?: PlanGenerationUsageEntry[],
): LangChainPlanTelemetry['tokenUsage'] | undefined => {
    if (!entries || entries.length === 0) {
        return undefined;
    }
    let promptTotal = 0;
    let completionTotal = 0;
    let tokensTotal = 0;
    let hasPrompt = false;
    let hasCompletion = false;
    let hasTotal = false;

    entries.forEach(entry => {
        if (typeof entry.promptTokens === 'number') {
            promptTotal += entry.promptTokens;
            hasPrompt = true;
        }
        if (typeof entry.completionTokens === 'number') {
            completionTotal += entry.completionTokens;
            hasCompletion = true;
        }
        if (typeof entry.totalTokens === 'number') {
            tokensTotal += entry.totalTokens;
            hasTotal = true;
        }
    });

    const summary: LangChainPlanTelemetry['tokenUsage'] = {};
    if (hasPrompt) summary.promptTokens = promptTotal;
    if (hasCompletion) summary.completionTokens = completionTotal;
    if (hasTotal) summary.totalTokens = tokensTotal;

    return Object.keys(summary).length > 0 ? summary : undefined;
};

const summarizeCost = (entries?: PlanGenerationUsageEntry[]): number | undefined => {
    if (!entries || entries.length === 0) return undefined;
    let total = 0;
    entries.forEach(entry => {
        const cost = estimateLlmCostUsd(entry);
        if (typeof cost === 'number') {
            total += cost;
        }
    });
    return total > 0 ? Number(total.toFixed(6)) : undefined;
};

export const generateLangChainPlanEnvelope = async (
    context: LangChainPlannerContext,
): Promise<LangChainPlanEnvelope> => {
    const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const profile = await fetchProfileSnapshot(context);
    const prompt = buildPlanPrompt();
    let lastPlanTelemetry: PlanGenerationResult['telemetry'];
    const llmRunnable = createLLMRunnable(context, profile, telemetry => {
        lastPlanTelemetry = telemetry;
    });

    const chain = RunnableSequence.from([
        RunnableLambda.from(async () => ({
            profile,
            promptText: await prompt.format({ dataset: JSON.stringify(profile, null, 2) }),
        })),
        RunnableLambda.from(async ({ profile: profileSnapshot, promptText }) => {
            const plan = await llmRunnable.invoke({ instructions: promptText });
            return { plan, profile: profileSnapshot };
        }),
        RunnableLambda.from(async ({ plan, profile: profileSnapshot }) => {
            analysisPlanSchema.parse({
                title: plan.title ?? 'Untitled plan',
                description: plan.description ?? 'Generated via LangChain PoC',
                chartType: plan.chartType ?? 'bar',
            });
            return { plan, profile: profileSnapshot };
        }),
    ]);

    const result = await chain.invoke();
    const finishedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const latencyMs = Math.max(0, finishedAt - startedAt);
    const tokenUsage = summarizeTokenUsage(lastPlanTelemetry);
    const estimatedCostUsd = summarizeCost(lastPlanTelemetry);

    const planId = `langchain-${Date.now().toString(36)}`;
    const stepId = `${planId}-execute`;
    const summary = result.plan.title ?? 'LangChain plan';
    const planStep: AgentPlanStep = {
        id: stepId,
        label: summary,
        intent: 'analysis',
        status: 'ready',
    };
    const planState: AgentPlanState = {
        planId,
        goal: summary,
        contextSummary: 'Generated via LangChain Runnable',
        progress: `Plan ready (latency ${latencyMs.toFixed(0)} ms)`,
        nextSteps: [planStep],
        steps: [planStep],
        currentStepId: stepId,
        blockedBy: null,
        observationIds: [],
        confidence: 0.55,
        updatedAt: new Date().toISOString(),
        stateTag: 'context_ready',
    };

    const observationId = `obs-langchain-${Date.now().toString(36)}`;
    const observationTimestamp = new Date().toISOString();
    const observation = {
        id: observationId,
        actionId: 'langchain_plan',
        responseType: 'plan_creation',
        status: 'success',
        timestamp: observationTimestamp,
        outputs: {
            summary: `LangChain plan: ${summary}`,
            chartType: result.plan.chartType,
            groupByColumn: result.plan.groupByColumn,
            valueColumn: result.plan.valueColumn,
            latencyMs: Math.round(latencyMs),
        },
    };

    return {
        source: 'langchain',
        planId,
        stepId,
        summary,
        plan: result.plan,
        planState,
        observation,
        telemetry: {
            latencyMs,
            startedAt,
            finishedAt,
            provider: context.settings.provider,
            tokenUsage,
            estimatedCostUsd,
        },
        profile: result.profile,
        usageLog: lastPlanTelemetry ?? [],
    };
};
