import { z } from 'zod';

export const INTENT_CONTRACT_INTENTS = [
    'aggregate',
    'profile',
    'clean',
    'detect_anomaly',
    'remove_card',
    'save_view',
    'ask_clarify',
] as const;

export const INTENT_CONTRACT_TOOLS = [
    'csv.aggregate',
    'csv.profile',
    'csv.clean_invoice_month',
    'csv.detect_outliers',
    'ui.remove_card',
    'idb.save_view',
] as const;

const INTENT_TOOL_MATRIX: Record<
    (typeof INTENT_CONTRACT_INTENTS)[number],
    Array<(typeof INTENT_CONTRACT_TOOLS)[number]>
> = {
    aggregate: ['csv.aggregate'],
    profile: ['csv.profile'],
    clean: ['csv.clean_invoice_month'],
    detect_anomaly: ['csv.detect_outliers'],
    remove_card: ['ui.remove_card'],
    save_view: ['idb.save_view'],
    ask_clarify: [],
};

const filterOperatorSchema = z.enum(['=', '!=', '>', '>=', '<', '<=', 'in', 'contains']);

const filterConditionSchema = z
    .object({
        column: z.string().min(1, 'Filter column is required.'),
        op: filterOperatorSchema.default('='),
        value: z.union([
            z.string(),
            z.number(),
            z.boolean(),
            z.array(z.union([z.string(), z.number(), z.boolean()])).nonempty(),
        ]),
    })
    .strict();

const intentArgsSchema = z
    .object({
        datasetId: z.string().min(1).optional().nullable(),
        column: z.string().min(1).optional(),
        valueColumn: z.string().min(1).optional(),
        groupBy: z.array(z.string().min(1)).default([]),
        aggregation: z.enum(['sum', 'avg', 'count', 'min', 'max']).default('sum'),
        filters: z.array(filterConditionSchema).default([]),
        limit: z.number().int().positive().optional(),
        topN: z.number().int().positive().optional(),
        thresholdMultiplier: z.number().positive().optional(),
        viewTitle: z.string().min(1).optional(),
        cardId: z.string().min(1).optional(),
    })
    .strict();

export const intentContractSchema = z
    .object({
        intent: z.enum(INTENT_CONTRACT_INTENTS),
        tool: z
            .enum(INTENT_CONTRACT_TOOLS)
            .nullable()
            .default(null),
        args: intentArgsSchema.default({}),
        awaitUser: z.boolean().default(false),
        message: z
            .string()
            .max(280)
            .optional()
            .nullable(),
    })
    .superRefine((value, ctx) => {
        const allowedTools = INTENT_TOOL_MATRIX[value.intent] ?? [];
        if (allowedTools.length === 0) {
            if (value.tool !== null) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `Intent "${value.intent}" should not specify a tool.`,
                    path: ['tool'],
                });
            }
        } else if (!value.tool || !allowedTools.includes(value.tool)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Tool "${value.tool}" is not allowed for intent "${value.intent}".`,
                path: ['tool'],
            });
        }
        if (value.intent === 'ask_clarify' && !value.awaitUser) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'ask_clarify intent must set awaitUser=true.',
                path: ['awaitUser'],
            });
        }
    });

export type IntentContract = z.infer<typeof intentContractSchema>;
export type IntentContractInput = z.input<typeof intentContractSchema>;

export const normalizeIntentContract = (input: IntentContractInput): IntentContract => {
    const withDefaults = {
        awaitUser: false,
        args: {
            groupBy: [],
            aggregation: 'sum',
            filters: [],
        },
        ...input,
    };
    const parsed = intentContractSchema.safeParse(withDefaults);
    if (!parsed.success) {
        throw parsed.error;
    }
    return parsed.data;
};
