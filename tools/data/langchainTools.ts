import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { CsvData, AnalysisPlan } from '@/types';
import { graphDataTools } from './index';
import type { GraphToolResponse } from './facade';

export interface ToolRuntimeContext {
    getDatasetId: () => string | null;
    getCsvData: () => CsvData | null;
    getCurrentPlan: () => AnalysisPlan | null;
}

export const createLangChainTools = (runtime: ToolRuntimeContext) => {
    const requireDataset = () => {
        const datasetId = runtime.getDatasetId();
        if (!datasetId) {
            throw new Error('Dataset is not loaded.');
        }
        return datasetId;
    };

    const requireCsvData = () => {
        const data = runtime.getCsvData();
        if (!data || data.data.length === 0) {
            throw new Error('CSV data is not available.');
        }
        return data;
    };

    const profileDatasetTool = new StructuredTool({
        name: 'csv_profile_dataset',
        description: 'Profile the current dataset to understand columns, row count, and sample distribution.',
        schema: z.object({
            sampleSize: z.number().int().positive().max(10_000).optional().describe('Optional sample size override.'),
        }),
        func: async ({ sampleSize }): Promise<GraphToolResponse<'profile_dataset'>> => {
            const datasetId = requireDataset();
            return graphDataTools.profileDataset(datasetId, sampleSize);
        },
    });

    const normalizeInvoiceMonthTool = new StructuredTool({
        name: 'csv_clean_invoice_month',
        description: 'Normalize an Invoice month column to YYYY-MM format.',
        schema: z.object({
            column: z.string().default('InvoiceMonth'),
        }),
        func: async ({ column }): Promise<GraphToolResponse<'normalize_invoice_month'>> => {
            const csvData = requireCsvData();
            return graphDataTools.normalizeInvoiceMonth(csvData, column);
        },
    });

    const detectOutliersTool = new StructuredTool({
        name: 'csv_detect_outliers',
        description: 'Detect top outliers for a numeric column using mean + std multiplier.',
        schema: z.object({
            valueColumn: z.string(),
            thresholdMultiplier: z.number().positive().default(2),
        }),
        func: async ({ valueColumn, thresholdMultiplier }): Promise<GraphToolResponse<'detect_outliers'>> => {
            const csvData = requireCsvData();
            return graphDataTools.detectOutliers(csvData, valueColumn, thresholdMultiplier);
        },
    });

    const planInputSchema = z.object({
        chartType: z.string(),
        title: z.string(),
        description: z.string().default(''),
        aggregation: z.string().optional(),
        groupByColumn: z.string().optional(),
        valueColumn: z.string().optional(),
        xValueColumn: z.string().optional(),
        yValueColumn: z.string().optional(),
        secondaryValueColumn: z.string().optional(),
        secondaryAggregation: z.string().optional(),
        defaultTopN: z.number().optional(),
        defaultHideOthers: z.boolean().optional(),
        limit: z.number().int().positive().nullable().optional(),
    });

    const aggregatePlanTool = new StructuredTool({
        name: 'csv_aggregate_plan',
        description: 'Execute the current analysis plan against the dataset and return aggregate rows.',
        schema: z.object({
            plan: planInputSchema.partial().optional(),
            rowCountHint: z.number().int().positive().optional(),
        }),
        func: async ({ plan, rowCountHint }): Promise<GraphToolResponse<'aggregate_plan'>> => {
            const datasetId = requireDataset();
            const csvData = runtime.getCsvData();
            const planToRun = (plan as AnalysisPlan | undefined) ?? runtime.getCurrentPlan();
            if (!planToRun || !csvData) {
                throw new Error('Analysis plan is not available.');
            }
            return graphDataTools.aggregatePlan({
                plan: planToRun,
                datasetId,
                csvData,
                rowCountHint,
            });
        },
    });

    return {
        profileDatasetTool,
        normalizeInvoiceMonthTool,
        detectOutliersTool,
        aggregatePlanTool,
    };
};

export type LangChainToolRegistry = ReturnType<typeof createLangChainTools>;
