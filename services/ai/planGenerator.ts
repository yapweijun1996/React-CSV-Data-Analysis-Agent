
import { CsvData, ColumnProfile, Settings, AnalysisPlan, CsvRow, AggregationType } from '../../types';
import { callGemini, callOpenAI, robustlyParseJsonArray, PlanParsingError } from './apiClient';
import { planSchema, planJsonSchema } from './schemas';
import { createCandidatePlansPrompt, createRefinePlansPrompt } from '../promptTemplates';
import { executePlan } from '../../utils/dataProcessor';
import type { MemorySnapshotRecord } from '../csvAgentDb';

const ALLOWED_AGGREGATIONS: Set<AggregationType> = new Set(['sum', 'count', 'avg']);

const formatMemoryHighlights = (snapshots?: MemorySnapshotRecord[], limit = 4): string[] => {
    if (!snapshots || snapshots.length === 0) return [];
    return snapshots.slice(0, limit).map(snapshot => {
        const score = snapshot.qualityScore != null ? `score=${snapshot.qualityScore.toFixed(2)}` : 'score=n/a';
        const tagSummary =
            snapshot.tags && snapshot.tags.length > 0 ? `tags: ${snapshot.tags.slice(0, 3).join(', ')}` : '';
        return `${snapshot.title} — ${snapshot.summary} (${score}${tagSummary ? `, ${tagSummary}` : ''})`;
    });
};

type ColumnUniquenessMap = Record<string, { distinct: number; total: number }>;

const buildColumnUniquenessMap = (rows: CsvRow[]): ColumnUniquenessMap => {
    const stats: Record<string, { distinct: Set<string>; total: number }> = {};
    rows.forEach(row => {
        Object.entries(row || {}).forEach(([key, value]) => {
            if (!key) return;
            if (!stats[key]) {
                stats[key] = { distinct: new Set<string>(), total: 0 };
            }
            stats[key].total += 1;
            if (value !== null && value !== undefined) {
                stats[key].distinct.add(String(value));
            }
        });
    });
    return Object.entries(stats).reduce<ColumnUniquenessMap>((acc, [key, value]) => {
        acc[key] = { distinct: value.distinct.size, total: value.total };
        return acc;
    }, {});
};

const inferGroupByColumn = (plan: AnalysisPlan, columns: ColumnProfile[]): string | null => {
    const categoricalTypes = new Set<ColumnProfile['type']>(['categorical', 'date', 'time']);
    const candidates = columns.filter(col => categoricalTypes.has(col.type));
    const fallback =
        candidates.find(col => col.name !== plan.valueColumn) ?? candidates[0] ?? columns.find(col => col.name !== plan.valueColumn);
    return fallback?.name ?? null;
};

const normalizeGeneratedPlan = (plan: AnalysisPlan, columns: ColumnProfile[]): AnalysisPlan => {
    const normalized = { ...plan };
    if (
        normalized.chartType &&
        normalized.chartType !== 'scatter' &&
        normalized.chartType !== 'combo' &&
        !normalized.groupByColumn
    ) {
        const inferred = inferGroupByColumn(normalized, columns);
        if (inferred) {
            normalized.groupByColumn = inferred;
        }
    }
    return normalized;
};

// Helper to validate a plan object from the AI
const isValidPlan = (plan: any): plan is AnalysisPlan => {
    if (!plan || typeof plan !== 'object' || !plan.chartType || !plan.title) {
        console.warn('Skipping invalid plan: missing chartType or title.', plan);
        return false;
    }
    if (!plan.description || typeof plan.description !== 'string' || plan.description.trim().length < 8) {
        console.warn('Skipping invalid plan: description missing or too short.', plan);
        return false;
    }
    if (plan.chartType === 'scatter') {
        if (!plan.xValueColumn || !plan.yValueColumn) {
            console.warn('Skipping invalid scatter plot plan: missing xValueColumn or yValueColumn.', plan);
            return false;
        }
    } else {
        if (!plan.aggregation || !plan.groupByColumn) {
            console.warn(`Skipping invalid plan: missing aggregation or groupByColumn for chart type ${plan.chartType}.`, plan);
            return false;
        }
        if (!ALLOWED_AGGREGATIONS.has(plan.aggregation)) {
            console.warn(`Skipping invalid plan: unsupported aggregation type "${plan.aggregation}".`, plan);
            return false;
        }
        if (plan.aggregation !== 'count' && !plan.valueColumn) {
            console.warn('Skipping invalid plan: missing valueColumn for sum/avg aggregation.', plan);
            return false;
        }
    }
    return true;
};

const METRIC_UNIFORM_THRESHOLD = 0.01;
const DOMINANT_CATEGORY_THRESHOLD = 0.95;
const UNIQUE_ID_RATIO_THRESHOLD = 0.9;
const MIN_SAMPLE_FOR_UNIQUENESS_CHECK = 8;

const isLikelyUniform = (values: number[]): boolean => {
    if (values.length <= 1) return true;
    const max = Math.max(...values);
    const min = Math.min(...values);
    if (max === min) return true;
    const denominator = Math.max(Math.abs(max), 1);
    const relativeSpread = (max - min) / denominator;
    return relativeSpread <= METRIC_UNIFORM_THRESHOLD;
};

const hasDominantCategory = (values: number[]): boolean => {
    if (values.length === 0) return false;
    const totals = values.reduce((sum, value) => sum + Math.abs(value), 0);
    if (totals === 0) return true;
    const max = Math.max(...values.map(value => Math.abs(value)));
    return max / totals >= DOMINANT_CATEGORY_THRESHOLD;
};

const isLikelyUniqueIdGrouping = (
    plan: AnalysisPlan,
    columnUniqueness: ColumnUniquenessMap,
): boolean => {
    const groupBy = plan.groupByColumn;
    if (!groupBy) return false;
    const stats = columnUniqueness[groupBy];
    if (!stats) return false;
    if (stats.total < MIN_SAMPLE_FOR_UNIQUENESS_CHECK) return false;
    return stats.distinct / stats.total >= UNIQUE_ID_RATIO_THRESHOLD;
};

const detectLowValueReason = (
    plan: AnalysisPlan,
    aggregatedSample: CsvRow[],
    columnUniqueness: ColumnUniquenessMap,
): string | null => {
    if (
        plan.chartType === 'scatter' ||
        plan.chartType === 'combo' ||
        !Array.isArray(aggregatedSample) ||
        aggregatedSample.length === 0
    ) {
        return null;
    }
    const metricKey = plan.valueColumn || 'count';
    const metricValues = aggregatedSample
        .map(row => Number(row[metricKey]))
        .filter(value => Number.isFinite(value));
    if (metricValues.length <= 1) {
        return 'not enough variation for a readable chart';
    }
    if (isLikelyUniform(metricValues)) {
        return 'metric values are nearly identical';
    }
    if (hasDominantCategory(metricValues)) {
        return 'a single category carries ≥95% of the total';
    }
    if (isLikelyUniqueIdGrouping(plan, columnUniqueness)) {
        return `grouping column "${plan.groupByColumn}" behaves like a unique identifier`;
    }
    return null;
};

const filterLowValuePlans = (
    plansWithData: { plan: AnalysisPlan; aggregatedSample: CsvRow[] }[],
    columnUniqueness: ColumnUniquenessMap,
): { viablePlans: { plan: AnalysisPlan; aggregatedSample: CsvRow[] }[]; warnings: PlanGenerationWarning[] } => {
    const viablePlans: { plan: AnalysisPlan; aggregatedSample: CsvRow[] }[] = [];
    const warnings: PlanGenerationWarning[] = [];
    plansWithData.forEach(entry => {
        const reason = detectLowValueReason(entry.plan, entry.aggregatedSample, columnUniqueness);
        if (reason) {
            warnings.push({
                code: 'low_value_plan_discarded',
                message: `Dropped "${entry.plan.title}" because ${reason}.`,
                hint: 'This dataset needs a more varied metric or different grouping to produce an informative chart.',
            });
            return;
        }
        viablePlans.push(entry);
    });
    return { viablePlans, warnings };
};

const generateCandidatePlans = async (
    columns: ColumnProfile[],
    sampleData: CsvRow[],
    settings: Settings,
    numPlans: number,
    options?: { signal?: AbortSignal; memorySnapshots?: MemorySnapshotRecord[] },
): Promise<AnalysisPlan[]> => {
    const categoricalCols = columns.filter(c => c.type === 'categorical' || c.type === 'date' || c.type === 'time').map(c => c.name);
    const numericalCols = columns.filter(c => c.type === 'numerical' || c.type === 'currency' || c.type === 'percentage').map(c => c.name);
    
    let plans: AnalysisPlan[];
    const promptContent = createCandidatePlansPrompt(
        categoricalCols,
        numericalCols,
        sampleData,
        numPlans,
        formatMemoryHighlights(options?.memorySnapshots),
    );

    if (settings.provider === 'openai') {
        const systemPrompt = `You are a senior business intelligence analyst specializing in ERP and financial data. Your task is to generate a diverse list of insightful analysis plan candidates for a given dataset by identifying common data patterns.
You MUST respond with JSON that adheres exactly to the provided schema (an array of plan objects) and includes no extra commentary.`;

        const messages = [{ role: 'system', content: systemPrompt }, { role: 'user', content: promptContent }];
        const content = await callOpenAI(
            settings,
            messages,
            { name: 'AnalysisPlanArray', schema: planJsonSchema, strict: true },
            options?.signal
        );
        plans = robustlyParseJsonArray(content, { rootKey: 'plans', requireRootKeyOnly: true });
    
    } else { // Google Gemini
        const content = await callGemini(settings, promptContent, planSchema, options?.signal);
        plans = robustlyParseJsonArray(content, { rootKey: 'plans', requireRootKeyOnly: true });
    }

    return plans
        .map(plan => normalizeGeneratedPlan(plan, columns))
        .filter(isValidPlan);
};

// Helper function for the second step: the AI Quality Gate
const refineAndConfigurePlans = async (
    plansWithData: { plan: AnalysisPlan; aggregatedSample: CsvRow[] }[],
    settings: Settings,
    columns: ColumnProfile[],
    options?: { signal?: AbortSignal; memorySnapshots?: MemorySnapshotRecord[] },
): Promise<AnalysisPlan[]> => {
    let rawPlans: any[];
    const promptContent = createRefinePlansPrompt(plansWithData, formatMemoryHighlights(options?.memorySnapshots));

    if(settings.provider === 'openai') {
        const systemPrompt = `You are a Quality Review Data Analyst. Your job is to review a list of proposed analysis plans and their data samples. Select ONLY the most insightful and readable charts and configure them for the best default view.
You MUST respond with JSON that strictly adheres to the provided schema (an array of plan objects) and contains no additional explanation.`;
        
        const messages = [{ role: 'system', content: systemPrompt }, { role: 'user', content: promptContent }];
        const content = await callOpenAI(
            settings,
            messages,
            { name: 'RefinedAnalysisPlanArray', schema: planJsonSchema, strict: true },
            options?.signal
        );
        rawPlans = robustlyParseJsonArray(content, { rootKey: 'plans', requireRootKeyOnly: true });

    } else { // Google Gemini
        const content = await callGemini(settings, promptContent, planSchema, options?.signal);
        rawPlans = robustlyParseJsonArray(content, { rootKey: 'plans', requireRootKeyOnly: true });
    }
    
    // FIX: Normalize the AI's response. The AI sometimes returns the full { plan, aggregatedSample }
    // object instead of just the plan. This extracts the `plan` object if it exists.
    const normalizedPlans = rawPlans.map(p => {
        if (p && p.plan && typeof p.plan === 'object') {
            return p.plan;
        }
        return p;
    });

    return normalizedPlans
        .map(plan => normalizeGeneratedPlan(plan, columns))
        .filter(isValidPlan);
};


interface AnalysisPlanOptions {
    signal?: AbortSignal;
    memorySnapshots?: MemorySnapshotRecord[];
}

const generatePlansWithQualityGate = async (
    columns: ColumnProfile[], 
    sampleData: CsvData['data'],
    settings: Settings,
    options?: AnalysisPlanOptions
): Promise<{ plans: AnalysisPlan[]; warnings: PlanGenerationWarning[] }> => {
    const isApiKeySet = (settings.provider === 'google' && !!settings.geminiApiKey) || (settings.provider === 'openai' && !!settings.openAIApiKey);
    if (!isApiKeySet) throw new Error("API Key not provided.");
    const warnings: PlanGenerationWarning[] = [];
    const columnUniqueness = buildColumnUniquenessMap(sampleData);

    // Step 1: Generate a broad list of candidate plans (already validated inside the function)
    const candidatePlans = await generateCandidatePlans(columns, sampleData, settings, 12, {
        signal: options?.signal,
        memorySnapshots: options?.memorySnapshots,
    });
    if (candidatePlans.length === 0) return { plans: [], warnings };

    // Step 2: Execute plans on sample data to get data for the AI to review
    const sampleCsvData = { fileName: 'sample', data: sampleData };
    const plansWithDataForReview = candidatePlans.map(plan => {
        try {
            const aggregatedSample = executePlan(sampleCsvData, plan);
            // A plan is only viable for review if it produces data.
            if (aggregatedSample.length > 0) {
                return { plan, aggregatedSample: aggregatedSample.slice(0, 20) }; // Limit sample size for the prompt
            }
            return null;
        } catch (e) {
            // This catch is a safeguard, but isValidPlan should prevent most errors.
            console.warn(`Execution of plan "${plan.title}" failed during review stage:`, e);
            return null;
        }
    }).filter((p): p is { plan: AnalysisPlan; aggregatedSample: CsvRow[] } => p !== null);
    
    const { viablePlans, warnings: lowValueWarnings } = filterLowValuePlans(plansWithDataForReview, columnUniqueness);
    lowValueWarnings.forEach(warning => warnings.push(warning));
    
    if (viablePlans.length === 0) {
        console.warn("No candidate plans produced high-value samples, returning initial valid candidates.");
        return { plans: candidatePlans.slice(0, 4), warnings };
    }
    
    // Step 3: AI Quality Gate - Ask AI to review and refine the plans (already validated inside the function)
    const refinedPlans = await refineAndConfigurePlans(viablePlans, settings, columns, {
        signal: options?.signal,
        memorySnapshots: options?.memorySnapshots,
    });

    // Ensure we have a minimum number of plans
    let finalPlans = refinedPlans;
    if (finalPlans.length < 4 && candidatePlans.length > finalPlans.length) {
        const refinedPlanTitles = new Set(finalPlans.map(p => p.title));
        const fallbackPlans = candidatePlans.filter(p => !refinedPlanTitles.has(p.title));
        const needed = 4 - finalPlans.length;
        finalPlans.push(...fallbackPlans.slice(0, needed));
    }

    return { plans: finalPlans.slice(0, 12), warnings }; // Return between 4 and 12 of the best plans
};

export interface PlanGenerationWarning {
    code: 'plan_parse_error' | 'plan_generation_error' | 'low_value_plan_discarded';
    message: string;
    hint?: string;
}

export class PlanGenerationFatalError extends Error {
    readonly warnings: PlanGenerationWarning[];
    constructor(message: string, warnings: PlanGenerationWarning[], cause?: unknown) {
        super(message);
        this.name = 'PlanGenerationFatalError';
        this.warnings = warnings;
        if (cause) {
            this.cause = cause;
        }
    }
}

export interface PlanGenerationResult {
    plans: AnalysisPlan[];
    warnings: PlanGenerationWarning[];
}

export const generateAnalysisPlans = async (
    columns: ColumnProfile[], 
    sampleData: CsvData['data'],
    settings: Settings,
    options?: AnalysisPlanOptions
): Promise<PlanGenerationResult> => {
    const isApiKeySet = (settings.provider === 'google' && !!settings.geminiApiKey) || (settings.provider === 'openai' && !!settings.openAIApiKey);
    if (!isApiKeySet) throw new Error("API Key not provided.");

    const warnings: PlanGenerationWarning[] = [];

    try {
        const { plans, warnings: gateWarnings } = await generatePlansWithQualityGate(columns, sampleData, settings, options);
        warnings.push(...gateWarnings);
        return { plans, warnings };
    } catch (error) {
        const isParsingError = error instanceof PlanParsingError;
        const warningMessage = isParsingError
            ? 'AI plan response was not valid JSON. Retrying with a simpler generator.'
            : 'AI plan generator failed on the first attempt. Retrying with a simpler prompt.';
        warnings.push({
            code: isParsingError ? 'plan_parse_error' : 'plan_generation_error',
            message: warningMessage,
            hint: 'If this happens repeatedly, ask the assistant to retry with fewer plans.',
        });
        console.warn("Plan generation warning:", error);
        try {
            const fallbackPlans = await generateCandidatePlans(columns, sampleData, settings, 8, {
                signal: options?.signal,
                memorySnapshots: options?.memorySnapshots,
            });
            return { plans: fallbackPlans, warnings };
        } catch (fallbackError) {
            console.error("Fallback plan generation also failed:", fallbackError);
            throw new PlanGenerationFatalError("Failed to generate any analysis plans from AI.", warnings, fallbackError);
        }
    }
};
