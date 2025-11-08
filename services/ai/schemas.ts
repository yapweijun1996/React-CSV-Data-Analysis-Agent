import { Type } from "@google/genai";

export const planSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      chartType: { type: Type.STRING, enum: ['bar', 'line', 'pie', 'doughnut', 'scatter', 'combo'], description: 'Type of chart to generate.' },
      title: { type: Type.STRING, description: 'A concise title for the analysis.' },
      description: { type: Type.STRING, description: 'A brief explanation of what the analysis shows.' },
      aggregation: { type: Type.STRING, enum: ['sum', 'count', 'avg'], description: 'The aggregation function to apply. Omit for scatter plots.' },
      groupByColumn: { type: Type.STRING, description: 'The column to group data by (categorical). Omit for scatter plots.' },
      valueColumn: { type: Type.STRING, description: 'The column for aggregation (numerical). Not needed for "count".' },
      xValueColumn: { type: Type.STRING, description: 'The column for the X-axis of a scatter plot (numerical). Required for scatter plots.' },
      yValueColumn: { type: Type.STRING, description: 'The column for the Y-axis of a scatter plot (numerical). Required for scatter plots.' },
      secondaryValueColumn: { type: Type.STRING, description: 'For combo charts, the secondary column for aggregation (numerical).' },
      secondaryAggregation: { type: Type.STRING, enum: ['sum', 'count', 'avg'], description: 'For combo charts, the aggregation for the secondary value column.' },
      defaultTopN: { type: Type.INTEGER, description: 'Optional. If the analysis has many categories, this suggests a default Top N view (e.g., 8).' },
      defaultHideOthers: { type: Type.BOOLEAN, description: 'Optional. If using defaultTopN, suggests whether to hide the "Others" category by default.' },
    },
    required: ['chartType', 'title', 'description'],
  },
};

export const columnProfileSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: "The column name." },
        type: { type: Type.STRING, enum: ['numerical', 'categorical', 'date', 'time', 'currency', 'percentage'], description: "The data type of the column. Identify specific types like 'date', 'currency', etc., where possible." },
    },
    required: ['name', 'type'],
};

export const dataPreparationSchema = {
    type: Type.OBJECT,
    properties: {
        explanation: { type: Type.STRING, description: "A brief, user-facing explanation of the transformations that will be applied to the data (e.g., 'Removed 3 summary rows and reshaped the data from a cross-tab format')." },
        jsFunctionBody: {
            type: Type.STRING,
            description: "The body of a JavaScript function that takes two arguments `data` (an array of objects) and `_util` (a helper object) and returns the transformed array of objects. This code will be executed to clean and reshape the data. If no transformation is needed, this should be null."
        },
        outputColumns: {
            type: Type.ARRAY,
            description: "A list of column profiles describing the structure of the data AFTER the transformation. If no transformation is performed, this should be the same as the input column profiles.",
            items: columnProfileSchema,
        },
    },
    required: ['explanation', 'outputColumns']
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
    required: ['explanation', 'jsFunctionBody']
};

export const proactiveInsightSchema = {
    type: Type.OBJECT,
    properties: {
        insight: { type: Type.STRING, description: "A concise, user-facing message describing the single most important finding." },
        cardId: { type: Type.STRING, description: "The ID of the card where this insight was observed." },
    },
    required: ['insight', 'cardId'],
};

export const singlePlanSchema = {
    type: Type.OBJECT,
    properties: {
      chartType: { type: Type.STRING, enum: ['bar', 'line', 'pie', 'doughnut', 'scatter', 'combo'], description: 'Type of chart to generate.' },
      title: { type: Type.STRING, description: 'A concise title for the analysis.' },
      description: { type: Type.STRING, description: 'A brief explanation of what the analysis shows.' },
      aggregation: { type: Type.STRING, enum: ['sum', 'count', 'avg'], description: 'The aggregation function to apply. Omit for scatter plots.' },
      groupByColumn: { type: Type.STRING, description: 'The column to group data by (categorical). Omit for scatter plots.' },
      valueColumn: { type: Type.STRING, description: 'The column for aggregation (numerical). Not needed for "count".' },
      xValueColumn: { type: Type.STRING, description: 'The column for the X-axis of a scatter plot (numerical). Required for scatter plots.' },
      yValueColumn: { type: Type.STRING, description: 'The column for the Y-axis of a scatter plot (numerical). Required for scatter plots.' },
      secondaryValueColumn: { type: Type.STRING, description: 'For combo charts, the secondary column for aggregation (numerical).' },
      secondaryAggregation: { type: Type.STRING, enum: ['sum', 'count', 'avg'], description: 'For combo charts, the aggregation for the secondary value column.' },
      defaultTopN: { type: Type.INTEGER, description: 'Optional. If the analysis has many categories, this suggests a default Top N view (e.g., 8).' },
      defaultHideOthers: { type: Type.BOOLEAN, description: 'Optional. If using defaultTopN, suggests whether to hide the "Others" category by default.' },
    },
    required: ['chartType', 'title', 'description'],
};

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
                required: ['label', 'value']
            }
        },
        pendingPlan: {
            type: Type.OBJECT,
            description: "The partial analysis plan that is waiting for the user's input. It should contain all known parameters.",
            // FIX: Gemini requires OBJECT types to have a non-empty `properties` field.
            // A pending plan is a partial plan, so we list all possible properties but make none of them required.
            properties: {
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
            },
        },
        targetProperty: {
            type: Type.STRING,
            description: "The name of the property in the 'pendingPlan' that the user's selected value should be assigned to."
        }
    },
    required: ['question', 'options', 'pendingPlan', 'targetProperty']
};


export const multiActionChatResponseSchema = {
    type: Type.OBJECT,
    properties: {
        actions: {
            type: Type.ARRAY,
            description: "A sequence of actions for the assistant to perform.",
            items: {
                type: Type.OBJECT,
                properties: {
                    thought: { type: Type.STRING, description: "The AI's reasoning or thought process before performing the action. This explains *why* this action is being taken. This is a mandatory part of the ReAct pattern." },
                    responseType: { type: Type.STRING, enum: ['text_response', 'plan_creation', 'dom_action', 'execute_js_code', 'proceed_to_analysis', 'filter_spreadsheet', 'clarification_request'] },
                    text: { type: Type.STRING, description: "A conversational text response to the user. Required for 'text_response'." },
                    cardId: { type: Type.STRING, description: "Optional. The ID of the card this text response refers to. Used to link text to a specific chart." },
                    plan: {
                        ...singlePlanSchema,
                        description: "Analysis plan object. Required for 'plan_creation'."
                    },
                    domAction: {
                        type: Type.OBJECT,
                        description: "A DOM manipulation action for the frontend to execute. Required for 'dom_action'.",
                        properties: {
                            toolName: { type: Type.STRING, enum: ['highlightCard', 'changeCardChartType', 'showCardData', 'filterCard', 'setTopN', 'toggleHideOthers', 'toggleLegendLabel', 'exportCard'] },
                            args: {
                                type: Type.OBJECT,
                                description: 'Arguments for the tool. Provide values for all properties; set unused ones to null.',
                                properties: {
                                    cardId: { type: Type.STRING, description: 'The ID of the target analysis card.' },
                                    newType: { type: Type.STRING, enum: ['bar', 'line', 'pie', 'doughnut', 'scatter', 'combo'], description: "For 'changeCardChartType'." },
                                    visible: { type: Type.BOOLEAN, description: "For 'showCardData'." },
                                    column: { type: Type.STRING, description: "For 'filterCard', the column to filter on." },
                                    values: { type: Type.ARRAY, items: { type: Type.STRING }, description: "For 'filterCard', the values to include." },
                                    topN: { type: Type.INTEGER, description: "For 'setTopN'. Provide a positive integer. Omit this field to revert to showing all categories." },
                                    hide: { type: Type.BOOLEAN, description: "For 'toggleHideOthers'. True hides the 'Others' bucket, false shows it." },
                                    label: { type: Type.STRING, description: "For 'toggleLegendLabel'. The exact legend label to toggle visibility for." },
                                    format: { type: Type.STRING, enum: ['png', 'csv', 'html'], description: "For 'exportCard'. Choose the export format." },
                                },
                                required: ['cardId', 'newType', 'visible', 'column', 'values', 'topN', 'hide', 'label', 'format'],
                                additionalProperties: false,
                            },
                        },
                        required: ['toolName', 'args'],
                    },
                    code: {
                        type: Type.OBJECT,
                        description: "For 'execute_js_code', the code to run.",
                        properties: {
                            explanation: { type: Type.STRING, description: "A brief, user-facing explanation of what the code will do." },
                            jsFunctionBody: {
                                type: Type.STRING,
                                description: "The non-empty body of a JavaScript function that takes 'data' and returns the transformed 'data'. Blank strings or placeholders are invalid.",
                                minLength: 10,
                            },
                        },
                        required: ['explanation', 'jsFunctionBody']
                    },
                    args: {
                        type: Type.OBJECT,
                        description: "Arguments for other tools, like 'filter_spreadsheet'.",
                        properties: {
                            query: { type: Type.STRING, description: "The natural language query to filter the spreadsheet by." },
                        },
                    },
                    clarification: {
                        ...clarificationRequestSchema,
                        description: "The clarification request object. Required for 'clarification_request'."
                    },
                },
                required: ['responseType', 'thought']
            }
        }
    },
    required: ['actions']
};

const typeMap = new Map<any, string>([
    [Type.STRING, 'string'],
    [Type.INTEGER, 'integer'],
    [Type.BOOLEAN, 'boolean'],
    [Type.ARRAY, 'array'],
    [Type.OBJECT, 'object'],
]);

const strictAdditionalPropsPaths = new Set([
    '',
    'properties.actions.items',
    'properties.actions.items.properties.plan',
    'properties.actions.items.properties.domAction',
    'properties.actions.items.properties.domAction.properties.args',
    'properties.actions.items.properties.code',
    'properties.actions.items.properties.args',
    'properties.actions.items.properties.clarification',
    'properties.actions.items.properties.clarification.properties.options.items',
    'properties.actions.items.properties.clarification.properties.pendingPlan',
]);

const strictAllPropsRequiredPaths = new Set([
    'properties.actions.items.properties.plan',
    'properties.actions.items.properties.domAction.properties.args',
    'properties.actions.items.properties.args',
    'properties.actions.items.properties.clarification.properties.pendingPlan',
    'properties.actions.items',
]);

const nullablePropertyPaths = new Set([
    'properties.actions.items.properties.text',
    'properties.actions.items.properties.cardId',
    'properties.actions.items.properties.plan',
    'properties.actions.items.properties.plan.properties.aggregation',
    'properties.actions.items.properties.plan.properties.groupByColumn',
    'properties.actions.items.properties.plan.properties.valueColumn',
    'properties.actions.items.properties.plan.properties.xValueColumn',
    'properties.actions.items.properties.plan.properties.yValueColumn',
    'properties.actions.items.properties.plan.properties.secondaryValueColumn',
    'properties.actions.items.properties.plan.properties.secondaryAggregation',
    'properties.actions.items.properties.plan.properties.defaultTopN',
    'properties.actions.items.properties.plan.properties.defaultHideOthers',
    'properties.actions.items.properties.domAction',
    'properties.actions.items.properties.domAction.properties.args',
    'properties.actions.items.properties.domAction.properties.args.properties.newType',
    'properties.actions.items.properties.domAction.properties.args.properties.visible',
    'properties.actions.items.properties.domAction.properties.args.properties.column',
    'properties.actions.items.properties.domAction.properties.args.properties.values',
    'properties.actions.items.properties.domAction.properties.args.properties.topN',
    'properties.actions.items.properties.domAction.properties.args.properties.hide',
    'properties.actions.items.properties.domAction.properties.args.properties.label',
    'properties.actions.items.properties.domAction.properties.args.properties.format',
    'properties.actions.items.properties.code',
    'properties.actions.items.properties.args',
    'properties.actions.items.properties.clarification',
    'properties.actions.items.properties.clarification.properties.pendingPlan',
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
]);

const applyNullability = (schema: any) => {
    if (!schema) return schema;
    if (schema.enum) {
        if (!schema.enum.includes(null)) {
            schema.enum = [...schema.enum, null];
        }
        if (!schema.type) {
            schema.type = ['null'];
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
    } else if (!schema.anyOf) {
        schema.anyOf = [{ type: 'null' }];
    }
    return schema;
};

const convertGeminiSchemaToJsonSchema = (node: any, path = ''): any => {
    if (Array.isArray(node)) {
        return node.map(item => convertGeminiSchemaToJsonSchema(item, `${path}[]`));
    }
    if (node && typeof node === 'object') {
        const converted: Record<string, any> = {};
        for (const [key, value] of Object.entries(node)) {
            if (key === 'type') {
                converted.type = typeMap.get(value as number) ?? value;
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
            converted[key] = convertGeminiSchemaToJsonSchema(value, path ? `${path}.${key}` : key);
        }
        if (converted.type === 'object' && typeof converted.additionalProperties === 'undefined' && strictAdditionalPropsPaths.has(path)) {
            converted.additionalProperties = false;
        }
        if (converted.type === 'object' && strictAllPropsRequiredPaths.has(path)) {
            const propertyKeys = converted.properties ? Object.keys(converted.properties) : [];
            converted.required = propertyKeys;
        }
        if (nullablePropertyPaths.has(path)) {
            return applyNullability(converted);
        }
        return converted;
    }
    if (nullablePropertyPaths.has(path)) {
        return applyNullability(node);
    }
    return node;
};

export const planJsonSchema = convertGeminiSchemaToJsonSchema(planSchema);
export const dataPreparationJsonSchema = convertGeminiSchemaToJsonSchema(dataPreparationSchema);
export const filterFunctionJsonSchema = convertGeminiSchemaToJsonSchema(filterFunctionSchema);
export const proactiveInsightJsonSchema = convertGeminiSchemaToJsonSchema(proactiveInsightSchema);
export const multiActionChatResponseJsonSchema = convertGeminiSchemaToJsonSchema(multiActionChatResponseSchema);
