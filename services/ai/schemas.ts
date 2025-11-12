import { Type } from '@google/genai';
import {
    intentContractSchema,
    normalizeIntentContract,
    INTENT_CONTRACT_INTENTS,
    INTENT_CONTRACT_TOOLS,
} from './intentContract';

export { intentContractSchema, normalizeIntentContract } from './intentContract';
export type { IntentContract, IntentContractInput } from './intentContract';

const makeNullableObject = (schema: Record<string, any>) => {
    const next = { ...schema };
    if (Array.isArray(next.enum)) {
        if (!next.enum.includes(null)) {
            next.enum = [...next.enum, null];
        }
        return next;
    }
    const schemaType = next.type;
    if (Array.isArray(schemaType)) {
        if (!schemaType.includes('null')) {
            next.type = [...schemaType, 'null'];
        }
    } else if (schemaType) {
        next.type = [schemaType, 'null'];
    } else {
        next.type = ['null'];
    }
    return next;
};

const withNullableProperties = (
    properties: Record<string, any>,
    keys: string[],
) => {
    const next = { ...properties };
    keys.forEach(key => {
        if (!next[key]) {
            throw new Error(`Attempted to mark missing property "${key}" as nullable.`);
        }
        next[key] = makeNullableObject(next[key]);
    });
    return next;
};

const analysisPlanItemSchema = {
    type: Type.OBJECT,
    properties: {
        chartType: { type: Type.STRING, enum: ['bar', 'line', 'pie', 'doughnut', 'scatter', 'combo'], description: 'Type of chart to generate.' },
        title: { type: Type.STRING, description: 'A concise title for the analysis.' },
        description: { type: Type.STRING, minLength: 8, description: 'A brief explanation of what the analysis shows. Must be a full sentence with at least 8 characters.' },
        aggregation: { type: Type.STRING, enum: ['sum', 'count', 'avg'], description: 'The aggregation function to apply. Omit for scatter plots.' },
        groupByColumn: { type: Type.STRING, description: 'The column to group data by (categorical). Omit for scatter plots.' },
        valueColumn: { type: Type.STRING, description: 'The column for aggregation (numerical). Not needed for "count".' },
        xValueColumn: { type: Type.STRING, description: 'The column for the X-axis of a scatter plot (numerical). Required for scatter plots.' },
        yValueColumn: { type: Type.STRING, description: 'The column for the Y-axis of a scatter plot (numerical). Required for scatter plots.' },
        secondaryValueColumn: { type: Type.STRING, description: 'For combo charts, the secondary column for aggregation (numerical).' },
        secondaryAggregation: { type: Type.STRING, enum: ['sum', 'count', 'avg'], description: 'For combo charts, the aggregation for the secondary value column.' },
        defaultTopN: { type: Type.INTEGER, description: 'Optional. If the analysis has many categories, this suggests a default Top N view (e.g., 8).' },
        defaultHideOthers: { type: Type.BOOLEAN, description: 'Optional. If using defaultTopN, suggests whether to hide the "Others" category by default.' },
        orderBy: {
            type: Type.ARRAY,
            description: 'Optional ordering instructions applied before limiting rows.',
            items: {
                type: Type.OBJECT,
                properties: {
                    column: { type: Type.STRING, description: 'Column to sort by (group or metric alias).' },
                    direction: { type: Type.STRING, enum: ['asc', 'desc'], description: 'Sort direction (default desc).' },
                },
                required: ['column', 'direction'],
                additionalProperties: false,
            },
        },
        limit: { type: Type.INTEGER, description: 'Optional limit applied after sorting (e.g., Top N rows).' },
        rowFilter: {
            type: Type.OBJECT,
            description: 'Optional row-level filter to limit rows before aggregation (e.g., single customer or region).',
            properties: {
                column: { type: Type.STRING, description: 'Column to filter on. Must be categorical.' },
                values: {
                    type: Type.ARRAY,
                    minItems: 1,
                    description: 'Exact values to keep (case-sensitive, as they appear in the dataset).',
                    items: { type: Type.STRING },
                },
            },
            required: ['column', 'values'],
            additionalProperties: false,
        },
    },
    required: [
        'chartType',
        'title',
        'description',
        'aggregation',
        'groupByColumn',
        'valueColumn',
        'xValueColumn',
        'yValueColumn',
        'secondaryValueColumn',
        'secondaryAggregation',
        'defaultTopN',
        'defaultHideOthers',
        'orderBy',
        'limit',
        'rowFilter',
    ],
    additionalProperties: false,
};

export const planSchema = {
    type: Type.OBJECT,
    properties: {
        plans: {
            type: Type.ARRAY,
            description: 'Array of analysis plans to execute.',
            items: analysisPlanItemSchema,
        },
    },
    required: ['plans'],
    additionalProperties: false,
};

export const columnProfileSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: "The column name." },
        type: { type: Type.STRING, enum: ['numerical', 'categorical', 'date', 'time', 'currency', 'percentage'], description: "The data type of the column. Identify specific types like 'date', 'currency', etc., where possible." },
    },
    required: ['name', 'type'],
    additionalProperties: false,
};

export const dataPreparationSchema = {
    type: Type.OBJECT,
    properties: {
        explanation: { type: Type.STRING, description: "A brief, user-facing explanation of the transformations that will be applied to the data (e.g., 'Removed 3 summary rows and reshaped the data from a cross-tab format')." },
        jsFunctionBody: makeNullableObject({
            type: Type.STRING,
            description:
                "The body of a JavaScript function that takes two arguments `data` (an array of objects) and `_util` (a helper object) and returns the transformed array of objects. This code will be executed to clean and reshape the data.",
        }),
        outputColumns: {
            type: Type.ARRAY,
            description: "A list of column profiles describing the structure of the data AFTER the transformation. If no transformation is performed, this should be the same as the input column profiles.",
            items: columnProfileSchema,
        },
    },
    required: ['explanation', 'jsFunctionBody', 'outputColumns'],
    additionalProperties: false,
};

export const filterFunctionSchema = {
    type: Type.OBJECT,
    properties: {
        explanation: { type: Type.STRING, description: "A brief, user-facing explanation of the filter that was created from the natural language query." },
        jsFunctionBody: {
            type: Type.STRING,
            description: "The body of a JavaScript function that takes 'data' and '_util' as arguments and returns a filtered array of objects. It should be a single line starting with 'return data.filter(...);'."
        },
    },
    required: ['explanation', 'jsFunctionBody'],
    additionalProperties: false,
};

export const proactiveInsightSchema = {
    type: Type.OBJECT,
    properties: {
        insight: { type: Type.STRING, description: "A concise, user-facing message describing the single most important finding." },
        cardId: { type: Type.STRING, description: "The ID of the card where this insight was observed." },
    },
    required: ['insight', 'cardId'],
    additionalProperties: false,
};

export const singlePlanSchema = analysisPlanItemSchema;

const clarificationPendingPlanProperties = {
    chartType: { type: Type.STRING, enum: ['bar', 'line', 'pie', 'doughnut', 'scatter', 'combo'] },
    title: { type: Type.STRING },
    description: { type: Type.STRING },
    aggregation: { type: Type.STRING, enum: ['sum', 'count', 'avg'] },
    groupByColumn: { type: Type.STRING },
    valueColumn: { type: Type.STRING },
    xValueColumn: { type: Type.STRING },
    yValueColumn: { type: Type.STRING },
    secondaryValueColumn: { type: Type.STRING },
    secondaryAggregation: { type: Type.STRING, enum: ['sum', 'count', 'avg'] },
    defaultTopN: { type: Type.INTEGER },
    defaultHideOthers: { type: Type.BOOLEAN },
    orderBy: {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                column: { type: Type.STRING },
                direction: { type: Type.STRING, enum: ['asc', 'desc'] },
            },
            required: ['column', 'direction'],
            additionalProperties: false,
        },
    },
    limit: { type: Type.INTEGER },
    rowFilter: {
        type: Type.OBJECT,
        properties: {
            column: { type: Type.STRING },
            values: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
            },
        },
        additionalProperties: false,
        required: ['column', 'values'],
    },
};

const clarificationPendingPlanKeys = Object.keys(clarificationPendingPlanProperties);

const clarificationRequestSchema = {
    type: Type.OBJECT,
    properties: {
        question: { type: Type.STRING, description: "The clear, user-facing question to ask for clarification." },
        options: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    label: { type: Type.STRING, description: "The user-friendly text for the option button." },
                    value: { type: Type.STRING, description: "The exact column name (case-sensitive) or literal value that should be assigned to the plan when this option is selected. Do not invent new names." }
                },
                required: ['label', 'value'],
                additionalProperties: false,
            }
        },
        pendingPlan: {
            type: Type.OBJECT,
            description: "The partial analysis plan that is waiting for the user's input. It should contain all known parameters.",
            properties: withNullableProperties(
                clarificationPendingPlanProperties,
                clarificationPendingPlanKeys,
            ),
            required: clarificationPendingPlanKeys,
            additionalProperties: false,
        },
        targetProperty: {
            type: Type.STRING,
            description: "The name of the property in the 'pendingPlan' that the user's selected value should be assigned to."
        },
        reasonHint: makeNullableObject({
            type: Type.STRING,
            description: 'Optional short explanation describing why the clarification is required.',
        }),
    },
    required: ['question', 'options', 'pendingPlan', 'targetProperty'],
    additionalProperties: false,
};

const planStepSchema = {
    type: Type.OBJECT,
    description: 'Declarative representation of a pending plan step.',
    properties: {
        id: { type: Type.STRING, minLength: 3, description: 'Stable identifier (kebab-case recommended) used to reference this step in future actions.' },
        label: { type: Type.STRING, minLength: 4, description: 'Human-readable summary of the step.' },
    },
    required: ['id', 'label'],
    additionalProperties: false,
};

const planStateSnapshotProperties = {
    goal: { type: Type.STRING, minLength: 6 },
    contextSummary: { type: Type.STRING },
    progress: { type: Type.STRING, minLength: 6 },
    nextSteps: {
        type: Type.ARRAY,
        minItems: 1,
        items: planStepSchema,
    },
    planId: { type: Type.STRING },
    blockedBy: { type: Type.STRING },
    observationIds: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
    },
    confidence: {
        type: Type.NUMBER,
        minimum: 0,
        maximum: 1,
    },
    updatedAt: { type: Type.STRING },
    currentStepId: { type: Type.STRING },
    steps: {
        type: Type.ARRAY,
        minItems: 1,
        items: {
            type: Type.OBJECT,
            properties: {
                id: { type: Type.STRING },
                label: { type: Type.STRING },
                intent: { type: Type.STRING },
                status: {
                    type: Type.STRING,
                    enum: ['ready', 'in_progress', 'done', 'waiting_user'],
                },
            },
            required: ['id', 'label', 'intent', 'status'],
            additionalProperties: false,
        },
    },
    stateTag: { type: Type.STRING },
};

const planStateSnapshotSchema = {
    type: Type.OBJECT,
    properties: withNullableProperties(planStateSnapshotProperties, ['contextSummary', 'planId', 'blockedBy', 'confidence']),
    required: [
        'goal',
        'contextSummary',
        'progress',
        'nextSteps',
        'planId',
        'blockedBy',
        'observationIds',
        'confidence',
        'updatedAt',
        'currentStepId',
        'steps',
        'stateTag',
    ],
    additionalProperties: false,
};

const actionMetaSchema = {
    type: Type.OBJECT,
    properties: {
        awaitUser: { type: Type.BOOLEAN },
        haltAfter: { type: Type.BOOLEAN },
        resumePlanner: { type: Type.BOOLEAN },
        promptId: { type: Type.STRING },
    },
    required: ['awaitUser', 'haltAfter', 'resumePlanner', 'promptId'],
    additionalProperties: false,
};

const awaitUserOptionSchema = {
    type: Type.OBJECT,
    properties: {
        id: { type: Type.STRING },
        label: { type: Type.STRING },
    },
    required: ['id', 'label'],
    additionalProperties: false,
};

const awaitUserPayloadSchema = {
    type: Type.OBJECT,
    properties: {
        promptId: { type: Type.STRING },
        question: { type: Type.STRING },
        options: {
            type: Type.ARRAY,
            minItems: 1,
            items: awaitUserOptionSchema,
        },
        allowFreeText: { type: Type.BOOLEAN },
        placeholder: { type: Type.STRING },
    },
    required: ['promptId', 'question', 'options', 'allowFreeText', 'placeholder'],
    additionalProperties: false,
};

const domActionTargetProperties = {
    byId: { type: Type.STRING },
    byTitle: { type: Type.STRING },
    selector: { type: Type.STRING },
};

const domActionTargetSchema = {
    type: Type.OBJECT,
    properties: withNullableProperties(domActionTargetProperties, Object.keys(domActionTargetProperties)),
    required: Object.keys(domActionTargetProperties),
    additionalProperties: false,
};

const domActionArgsProperties = {
    cardId: { type: Type.STRING },
    cardTitle: { type: Type.STRING },
    newType: { type: Type.STRING, enum: ['bar', 'line', 'pie', 'doughnut', 'scatter', 'combo'] },
    visible: { type: Type.BOOLEAN },
    column: { type: Type.STRING },
    values: { type: Type.ARRAY, items: { type: Type.STRING } },
    topN: { type: Type.INTEGER },
    hide: { type: Type.BOOLEAN },
    label: { type: Type.STRING },
    format: { type: Type.STRING, enum: ['png', 'csv', 'html'] },
};

const domActionArgsSchema = {
    type: Type.OBJECT,
    properties: withNullableProperties(domActionArgsProperties, Object.keys(domActionArgsProperties)),
    required: Object.keys(domActionArgsProperties),
    additionalProperties: false,
};

const domActionSchema = {
    type: Type.OBJECT,
    properties: {
        toolName: {
            type: Type.STRING,
            enum: [
                'highlightCard',
                'changeCardChartType',
                'showCardData',
                'filterCard',
                'setTopN',
                'toggleHideOthers',
                'toggleLegendLabel',
                'exportCard',
                'removeCard',
            ],
        },
        target: domActionTargetSchema,
        args: domActionArgsSchema,
    },
    required: ['toolName', 'target', 'args'],
    additionalProperties: false,
};

const codePayloadSchema = {
    type: Type.OBJECT,
    properties: {
        explanation: { type: Type.STRING },
        jsFunctionBody: { type: Type.STRING, minLength: 10 },
    },
    required: ['explanation', 'jsFunctionBody'],
    additionalProperties: false,
};

const filterArgsSchema = {
    type: Type.OBJECT,
    properties: {
        query: { type: Type.STRING },
    },
    required: ['query'],
    additionalProperties: false,
};

const ACTION_TYPE_ENUM = [
    'plan_state_update',
    'text_response',
    'await_user',
    'plan_creation',
    'dom_action',
    'execute_js_code',
    'proceed_to_analysis',
    'filter_spreadsheet',
    'clarification_request',
];

const ENVELOPE_NULLABLE_KEYS = [
    'intentContract',
    'meta',
        'planState',
        'text',
        'cardId',
        'awaitUserPayload',
    'plan',
    'domAction',
    'code',
    'args',
    'clarification',
];

const buildActionEnvelopeSchema = (typeEnum: string[] = ACTION_TYPE_ENUM) => ({
    type: Type.OBJECT,
    properties: withNullableProperties(
        {
            type: { type: Type.STRING, enum: typeEnum },
            responseType: { type: Type.STRING, enum: typeEnum },
            reason: { type: Type.STRING, maxLength: 280 },
            stepId: { type: Type.STRING },
            intentContract: intentContractSchema,
            meta: actionMetaSchema,
            planState: planStateSnapshotSchema,
            text: { type: Type.STRING },
            cardId: { type: Type.STRING },
            awaitUserPayload: awaitUserPayloadSchema,
            plan: singlePlanSchema,
            domAction: domActionSchema,
            code: codePayloadSchema,
            args: filterArgsSchema,
            clarification: clarificationRequestSchema,
        },
        ENVELOPE_NULLABLE_KEYS,
    ),
    required: [
        'type',
        'responseType',
        'reason',
        'stepId',
        'intentContract',
        'meta',
        'planState',
        'text',
        'cardId',
        'awaitUserPayload',
        'plan',
        'domAction',
        'code',
        'args',
        'clarification',
    ],
    additionalProperties: false,
});

const actionEnvelopeSchema = buildActionEnvelopeSchema();

const planOnlyActionsSchema = {
    type: Type.ARRAY,
    minItems: 1,
    maxItems: 1,
    items: buildActionEnvelopeSchema(['plan_state_update']),
};

const intentContractResponseSchema = {
    type: Type.OBJECT,
    properties: {
        intent: { type: Type.STRING },
        tool: { type: ['string', 'null'] },
        args: makeNullableObject({
            type: Type.OBJECT,
            description: 'Tool arguments payload (free-form keys allowed).',
            patternProperties: {
                '^.*$': {
                    type: ['string', 'number', 'integer', 'boolean', 'array', 'object', 'null'],
                },
            },
            additionalProperties: false,
        }),
        awaitUser: { type: Type.BOOLEAN },
        message: { type: ['string', 'null'] },
    },
    required: ['intent', 'tool', 'args', 'awaitUser', 'message'],
    additionalProperties: false,
};

export const multiActionChatResponseSchema = {
    type: Type.OBJECT,
    properties: {
        actions: {
            type: Type.ARRAY,
            description: "A sequence of actions for the assistant to perform.",
            minItems: 1,
            items: actionEnvelopeSchema,
        },
    },
    required: ['actions'],
    additionalProperties: false,
};

export const planOnlyChatResponseSchema = {
    type: Type.OBJECT,
    properties: {
        actions: planOnlyActionsSchema,
    },
    required: ['actions'],
    additionalProperties: false,
};

const typeMap = new Map<any, string>([
    [Type.STRING, 'string'],
    [Type.INTEGER, 'integer'],
    [Type.NUMBER, 'number'],
    [Type.BOOLEAN, 'boolean'],
    [Type.ARRAY, 'array'],
    [Type.OBJECT, 'object'],
]);

const requireAllPropsPaths = new Set<string>();

const nullablePropertyPaths = new Set([
    'properties.actions.items.properties.text',
    'properties.actions.items.properties.cardId',
    'properties.actions.items.properties.domAction.properties.args',
    'properties.actions.items.properties.domAction.properties.args.properties.newType',
    'properties.actions.items.properties.domAction.properties.args.properties.visible',
    'properties.actions.items.properties.domAction.properties.args.properties.cardTitle',
    'properties.actions.items.properties.domAction.properties.args.properties.column',
    'properties.actions.items.properties.domAction.properties.args.properties.values',
    'properties.actions.items.properties.domAction.properties.args.properties.topN',
    'properties.actions.items.properties.domAction.properties.args.properties.hide',
    'properties.actions.items.properties.domAction.properties.args.properties.label',
    'properties.actions.items.properties.domAction.properties.args.properties.format',
    'properties.actions.items.properties.domAction.properties.target.properties.byId',
    'properties.actions.items.properties.domAction.properties.target.properties.byTitle',
    'properties.actions.items.properties.domAction.properties.target.properties.selector',
    'properties.actions.items.properties.planState.properties.contextSummary',
    'properties.actions.items.properties.planState.properties.blockedBy',
    'properties.actions.items.properties.planState.properties.confidence',
    'properties.actions.items.properties.intentContract.properties.tool',
    'properties.actions.items.properties.intentContract.properties.args.properties.datasetId',
    'properties.actions.items.properties.intentContract.properties.args.properties.column',
    'properties.actions.items.properties.intentContract.properties.args.properties.valueColumn',
    'properties.actions.items.properties.intentContract.properties.args.properties.limit',
    'properties.actions.items.properties.intentContract.properties.args.properties.topN',
    'properties.actions.items.properties.intentContract.properties.args.properties.thresholdMultiplier',
    'properties.actions.items.properties.intentContract.properties.args.properties.viewTitle',
    'properties.actions.items.properties.intentContract.properties.args.properties.cardId',
    'properties.actions.items.properties.intentContract.properties.message',
    'properties.actions.items.properties.clarification.properties.pendingPlan.properties.chartType',
    'properties.actions.items.properties.clarification.properties.pendingPlan.properties.title',
    'properties.actions.items.properties.clarification.properties.pendingPlan.properties.description',
    'properties.actions.items.properties.clarification.properties.pendingPlan.properties.aggregation',
    'properties.actions.items.properties.clarification.properties.pendingPlan.properties.groupByColumn',
    'properties.actions.items.properties.clarification.properties.pendingPlan.properties.valueColumn',
    'properties.actions.items.properties.clarification.properties.pendingPlan.properties.xValueColumn',
    'properties.actions.items.properties.clarification.properties.pendingPlan.properties.yValueColumn',
    'properties.actions.items.properties.clarification.properties.pendingPlan.properties.secondaryValueColumn',
    'properties.actions.items.properties.clarification.properties.pendingPlan.properties.secondaryAggregation',
    'properties.actions.items.properties.clarification.properties.pendingPlan.properties.defaultTopN',
    'properties.actions.items.properties.clarification.properties.pendingPlan.properties.defaultHideOthers',
    'properties.actions.items.properties.clarification.properties.pendingPlan.properties.orderBy',
    'properties.actions.items.properties.clarification.properties.pendingPlan.properties.orderBy.items.properties.direction',
    'properties.actions.items.properties.clarification.properties.pendingPlan.properties.rowFilter',
    'properties.actions.items.properties.clarification.properties.pendingPlan.properties.rowFilter.properties.column',
    'properties.actions.items.properties.clarification.properties.pendingPlan.properties.rowFilter.properties.values',
    'properties.actions.items.properties.clarification.properties.pendingPlan.properties.limit',
    'properties.plans.items.properties.aggregation',
    'properties.plans.items.properties.groupByColumn',
    'properties.plans.items.properties.valueColumn',
    'properties.plans.items.properties.xValueColumn',
    'properties.plans.items.properties.yValueColumn',
    'properties.plans.items.properties.secondaryValueColumn',
    'properties.plans.items.properties.secondaryAggregation',
    'properties.plans.items.properties.defaultTopN',
    'properties.plans.items.properties.defaultHideOthers',
    'properties.plans.items.properties.orderBy',
    'properties.plans.items.properties.orderBy.items.properties.direction',
    'properties.plans.items.properties.rowFilter',
    'properties.plans.items.properties.rowFilter.properties.column',
    'properties.plans.items.properties.rowFilter.properties.values',
    'properties.plans.items.properties.limit',
]);

const applyNullability = (schema: any) => {
    if (!schema) return schema;
    let skipDefaultNullOnly = false;
    if (schema.enum) {
        skipDefaultNullOnly = true;
        if (!schema.enum.includes(null)) {
            schema.enum = [...schema.enum, null];
        }
    }
    if (schema.type) {
        if (Array.isArray(schema.type)) {
            if (!schema.type.includes('null')) {
                schema.type = [...schema.type, 'null'];
            }
        } else if (schema.type !== 'null') {
            schema.type = [schema.type, 'null'];
        }
    } else if (!skipDefaultNullOnly) {
        schema.type = ['null'];
    }
    return schema;
};

const normalizeSchemaPath = (path: string): string =>
    path.replace(/\.oneOf\[\d+\]/g, '').replace(/\.anyOf\[\d+\]/g, '');

const convertGeminiSchemaToJsonSchema = (node: any, path = ''): any => {
    if (Array.isArray(node)) {
        return node.map(item => convertGeminiSchemaToJsonSchema(item, `${path}[]`));
    }
    if (node && typeof node === 'object') {
        const converted: Record<string, any> = {};
        for (const [key, value] of Object.entries(node)) {
            if (key === 'type') {
                if (Array.isArray(value)) {
                    converted.type = value.map(entry => typeMap.get(entry as number) ?? entry);
                } else {
                    converted.type = typeMap.get(value as number) ?? value;
                }
                continue;
            }
            if (key === 'properties' && value && typeof value === 'object') {
                converted.properties = {};
                for (const [propKey, propValue] of Object.entries(value as Record<string, any>)) {
                    const nextPath = path ? `${path}.properties.${propKey}` : `properties.${propKey}`;
                    converted.properties[propKey] = convertGeminiSchemaToJsonSchema(propValue, nextPath);
                }
                continue;
            }
            if (key === 'items') {
                const nextPath = path ? `${path}.items` : 'items';
                converted.items = convertGeminiSchemaToJsonSchema(value, nextPath);
                continue;
            }
            if (key === 'oneOf' && Array.isArray(value)) {
                converted.oneOf = value.map((item, index) =>
                    convertGeminiSchemaToJsonSchema(item, `${path}.oneOf[${index}]`),
                );
                continue;
            }
            if (key === 'anyOf' && Array.isArray(value)) {
                converted.anyOf = value.map((item, index) =>
                    convertGeminiSchemaToJsonSchema(item, `${path}.anyOf[${index}]`),
                );
                continue;
            }
            converted[key] = convertGeminiSchemaToJsonSchema(value, path ? `${path}.${key}` : key);
        }
        const normalizedPath = normalizeSchemaPath(path);
        if (converted.type === 'object' && requireAllPropsPaths.has(normalizedPath)) {
            const propertyKeys = converted.properties ? Object.keys(converted.properties) : [];
            converted.required = propertyKeys;
        }
        if (nullablePropertyPaths.has(normalizedPath)) {
            return applyNullability(converted);
        }
        return converted;
    }
    const normalizedPath = normalizeSchemaPath(path);
    if (nullablePropertyPaths.has(normalizedPath)) {
        return applyNullability(node);
    }
    return node;
};

export const planJsonSchema = convertGeminiSchemaToJsonSchema(planSchema);
export const dataPreparationJsonSchema = convertGeminiSchemaToJsonSchema(dataPreparationSchema);
export const filterFunctionJsonSchema = convertGeminiSchemaToJsonSchema(filterFunctionSchema);
export const proactiveInsightJsonSchema = convertGeminiSchemaToJsonSchema(proactiveInsightSchema);
export const multiActionChatResponseJsonSchema = convertGeminiSchemaToJsonSchema(multiActionChatResponseSchema);
export const planOnlyChatResponseJsonSchema = convertGeminiSchemaToJsonSchema(planOnlyChatResponseSchema);
