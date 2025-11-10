
import { CsvData, ColumnProfile, Settings, AnalysisPlan, CsvRow, AggregationType } from '../../types';
import { callGemini, callOpenAI, robustlyParseJsonArray, PlanParsingError } from './apiClient';
import { planSchema, planJsonSchema } from './schemas';
import { createCandidatePlansPrompt, createRefinePlansPrompt } from '../promptTemplates';
import { executePlan } from '../../utils/dataProcessor';

const ALLOWED_AGGREGATIONS: Set<AggregationType> = new Set(['sum', 'count', 'avg']);

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

const generateCandidatePlans = async (
    columns: ColumnProfile[],
    sampleData: CsvRow[],
    settings: Settings,
    numPlans: number,
    signal?: AbortSignal
): Promise<AnalysisPlan[]> => {
    const categoricalCols = columns.filter(c => c.type === 'categorical' || c.type === 'date' || c.type === 'time').map(c => c.name);
    const numericalCols = columns.filter(c => c.type === 'numerical' || c.type === 'currency' || c.type === 'percentage').map(c => c.name);
    
    let plans: AnalysisPlan[];
    const promptContent = createCandidatePlansPrompt(categoricalCols, numericalCols, sampleData, numPlans);

    if (settings.provider === 'openai') {
        const systemPrompt = `You are a senior business intelligence analyst specializing in ERP and financial data. Your task is to generate a diverse list of insightful analysis plan candidates for a given dataset by identifying common data patterns.
You MUST respond with JSON that adheres exactly to the provided schema (an array of plan objects) and includes no extra commentary.`;

        const messages = [{ role: 'system', content: systemPrompt }, { role: 'user', content: promptContent }];
        const content = await callOpenAI(
            settings,
            messages,
            { name: 'AnalysisPlanArray', schema: planJsonSchema, strict: true },
            signal
        );
        plans = robustlyParseJsonArray(content);
    
    } else { // Google Gemini
        const content = await callGemini(settings, promptContent, planSchema, signal);
        plans = robustlyParseJsonArray(content);
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
    signal?: AbortSignal
): Promise<AnalysisPlan[]> => {
    let rawPlans: any[];
    const promptContent = createRefinePlansPrompt(plansWithData);

    if(settings.provider === 'openai') {
        const systemPrompt = `You are a Quality Review Data Analyst. Your job is to review a list of proposed analysis plans and their data samples. Select ONLY the most insightful and readable charts and configure them for the best default view.
You MUST respond with JSON that strictly adheres to the provided schema (an array of plan objects) and contains no additional explanation.`;
        
        const messages = [{ role: 'system', content: systemPrompt }, { role: 'user', content: promptContent }];
        const content = await callOpenAI(
            settings,
            messages,
            { name: 'RefinedAnalysisPlanArray', schema: planJsonSchema, strict: true },
            signal
        );
        rawPlans = robustlyParseJsonArray(content);

    } else { // Google Gemini
        const content = await callGemini(settings, promptContent, planSchema, signal);
        rawPlans = robustlyParseJsonArray(content);
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
}

const generatePlansWithQualityGate = async (
    columns: ColumnProfile[], 
    sampleData: CsvData['data'],
    settings: Settings,
    options?: AnalysisPlanOptions
): Promise<AnalysisPlan[]> => {
    const isApiKeySet = (settings.provider === 'google' && !!settings.geminiApiKey) || (settings.provider === 'openai' && !!settings.openAIApiKey);
    if (!isApiKeySet) throw new Error("API Key not provided.");

    // Step 1: Generate a broad list of candidate plans (already validated inside the function)
    const candidatePlans = await generateCandidatePlans(columns, sampleData, settings, 12, options?.signal);
    if (candidatePlans.length === 0) return [];

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
    
    if (plansWithDataForReview.length === 0) {
        console.warn("No candidate plans produced data for AI review, returning initial valid candidates.");
        return candidatePlans.slice(0, 4);
    }
    
    // Step 3: AI Quality Gate - Ask AI to review and refine the plans (already validated inside the function)
    const refinedPlans = await refineAndConfigurePlans(plansWithDataForReview, settings, columns, options?.signal);

    // Ensure we have a minimum number of plans
    let finalPlans = refinedPlans;
    if (finalPlans.length < 4 && candidatePlans.length > finalPlans.length) {
        const refinedPlanTitles = new Set(finalPlans.map(p => p.title));
        const fallbackPlans = candidatePlans.filter(p => !refinedPlanTitles.has(p.title));
        const needed = 4 - finalPlans.length;
        finalPlans.push(...fallbackPlans.slice(0, needed));
    }

    return finalPlans.slice(0, 12); // Return between 4 and 12 of the best plans
};

export interface PlanGenerationWarning {
    code: 'plan_parse_error' | 'plan_generation_error';
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
        const plans = await generatePlansWithQualityGate(columns, sampleData, settings, options);
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
            const fallbackPlans = await generateCandidatePlans(columns, sampleData, settings, 8, options?.signal);
            return { plans: fallbackPlans, warnings };
        } catch (fallbackError) {
            console.error("Fallback plan generation also failed:", fallbackError);
            throw new PlanGenerationFatalError("Failed to generate any analysis plans from AI.", warnings, fallbackError);
        }
    }
};
