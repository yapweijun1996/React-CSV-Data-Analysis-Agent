import type { AiAction } from '@/types';
import type { GraphState } from '../schema';

export interface NodeResult {
    state: GraphState;
    actions: AiAction[];
    halted?: boolean;
    label: string;
    telemetry?: Record<string, unknown> | null;
}

export interface PipelineContext {
    state: GraphState;
    payload?: Record<string, unknown>;
}

export type GraphNode = (context: PipelineContext) => NodeResult | Promise<NodeResult>;
