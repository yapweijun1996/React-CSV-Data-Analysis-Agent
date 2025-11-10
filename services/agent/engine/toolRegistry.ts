import type { AiAction } from '../../../types';
import type { ToolRegistryEntry } from './contracts';

export const TOOL_REGISTRY: ToolRegistryEntry[] = [
    {
        name: 'plan_state_update',
        description: 'Update the shared plan tracker before any other action.',
        tags: ['plan', 'safe', 'low_latency'],
        costEstimate: 1,
        latencyClass: 'short',
        risk: 'low',
    },
    {
        name: 'text_response',
        description: 'Send a conversational reply to the user and suggest next actions.',
        tags: ['conversation', 'starter', 'safe', 'low_latency'],
        costEstimate: 1,
        latencyClass: 'short',
        risk: 'low',
    },
    {
        name: 'dom_action',
        description: 'Modify an existing insight card (highlight, toggle legend, etc.).',
        tags: ['dom', 'ui'],
        costEstimate: 3,
        latencyClass: 'medium',
        risk: 'medium',
    },
    {
        name: 'dom_action.removeCard',
        description: 'Remove an existing chart card by id or title.',
        tags: ['dom', 'destructive'],
        costEstimate: 4,
        latencyClass: 'medium',
        risk: 'medium',
        applicableIf: { intentsAny: ['remove_card'] },
    },
    {
        name: 'filter_spreadsheet',
        description: 'Apply a natural-language filter to the raw data explorer.',
        tags: ['data', 'tool'],
        costEstimate: 2,
        latencyClass: 'short',
        risk: 'low',
        applicableIf: { intentsAny: ['data_filter'] },
    },
    {
        name: 'execute_js_code',
        description: 'Run a JavaScript transform to reshape the dataset.',
        tags: ['data', 'transform'],
        costEstimate: 5,
        latencyClass: 'long',
        risk: 'high',
        applicableIf: { intentsAny: ['data_transform'] },
    },
    {
        name: 'clarification_request',
        description: 'Ask the user to choose between concrete options.',
        tags: ['conversation', 'safe'],
        costEstimate: 2,
        latencyClass: 'short',
        risk: 'low',
    },
    {
        name: 'plan_creation',
        description: 'Create a batch of chart plans for later execution.',
        tags: ['plan', 'analysis'],
        costEstimate: 4,
        latencyClass: 'medium',
        risk: 'medium',
    },
    {
        name: 'proceed_to_analysis',
        description: 'Signal that the AI is ready to summarize results.',
        tags: ['conversation'],
        costEstimate: 1,
        latencyClass: 'short',
        risk: 'low',
    },
];

const TOOL_INDEX = new Map(TOOL_REGISTRY.map(entry => [entry.name, entry]));

export const resolveToolKey = (action: AiAction): string => {
    const type = (action.type ?? action.responseType ?? '').trim();
    if (!type) return 'unknown';
    if (type === 'dom_action') {
        const toolName = action.domAction?.toolName;
        return toolName ? `${type}.${toolName}` : type;
    }
    return type;
};

export const lookupToolProfile = (action: AiAction): ToolRegistryEntry | undefined => {
    const key = resolveToolKey(action);
    return TOOL_INDEX.get(key) ?? TOOL_INDEX.get(key.split('.')[0]);
};
