import type {
    AiAction,
    AgentPlanState,
    AgentPlanStep,
    AgentStateTag,
    DetectedIntent,
} from '../../../types';

export type EngineActionSource = 'model' | 'playbook' | 'middleware';
export type ToolLatencyClass = 'short' | 'medium' | 'long';
export type ToolRiskClass = 'low' | 'medium' | 'high';

export interface EngineContext {
    planState: AgentPlanState | null;
    pendingSteps: AgentPlanStep[];
    detectedIntent?: DetectedIntent | null;
    userMessage: string;
    runId: string;
    now: number;
    planBudgetExhausted?: boolean;
    lastStateTag?: AgentStateTag | null;
}

export interface EnginePlaybookQuickActionRule {
    source: 'tools';
    filter?: {
        tags_any?: string[];
        context?: string[];
    };
    top_k?: number;
}

export interface EngineGovernanceRules {
    max_tokens?: number;
    deny_tools_if?: {
        latency_class?: ToolLatencyClass[];
        risk?: ToolRiskClass[];
    };
}

export interface EnginePlaybook {
    id: string;
    intent: string;
    success_criteria: string[];
    ui: {
        message_template: string;
        quick_action_rules?: EnginePlaybookQuickActionRule[];
    };
    governance?: EngineGovernanceRules;
}

export interface ToolRegistryEntry {
    name: string;
    description: string;
    tags: string[];
    costEstimate: number;
    latencyClass: ToolLatencyClass;
    risk: ToolRiskClass;
    applicableIf?: {
        intentsAny?: string[];
        context?: string[];
    };
}

export interface EngineActionCandidate {
    action: AiAction;
    source: EngineActionSource;
    utility: number;
    confidence: number;
    cost: number;
    risk: number;
    latency: number;
    playbookId?: string;
    score?: number;
}

export interface AutoHealReport {
    mutated: boolean;
    notes: string[];
    warnings: string[];
}

export interface AutoHealOutcome {
    actions: AiAction[];
    report: AutoHealReport;
}
