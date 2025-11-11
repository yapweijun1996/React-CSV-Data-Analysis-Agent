import type { AiAction, GraphToolMeta } from '@/types';
import type { GraphPhase, GraphState, LoopBudget } from './schema';

export type GraphClientEvent =
    | {
          type: 'graph/init';
          origin?: 'ui' | 'test' | 'devtool';
          timestamp?: number;
      }
    | {
          type: 'graph/ping';
          nonce: string;
          timestamp?: number;
      }
    | {
          type: 'graph/shutdown';
          reason?: string;
      }
    | {
          type: 'graph/applyActions';
          sessionId?: string;
          actions: AiAction[];
          timestamp?: number;
      }
    | {
          type: 'graph/runPipeline';
          sessionId?: string;
          payload?: Record<string, unknown>;
          timestamp?: number;
      }
    | {
          type: 'graph/userReply';
          sessionId?: string;
          optionId?: string;
          freeText?: string;
          timestamp?: number;
      }
    | {
          type: 'graph/tool_result';
          sessionId?: string;
          verification: {
              description: string;
              summary?: string;
              meta: GraphToolMeta;
              payload?: Record<string, unknown>;
          };
          timestamp?: number;
      };

export type GraphWorkerEvent =
    | {
          type: 'graph/ready';
          version: string;
          timestamp: number;
      }
    | {
          type: 'graph/log';
          level: 'info' | 'warn' | 'error';
          message: string;
          timestamp: number;
          details?: Record<string, unknown>;
      }
    | {
          type: 'graph/pong';
          nonce: string;
          timestamp: number;
      }
    | {
          type: 'graph/error';
          message: string;
          timestamp: number;
      }
    | {
          type: 'graph/validation';
          ok: boolean;
          timestamp: number;
          code?: string;
          reason?: string;
          state?: GraphState;
      }
    | {
          type: 'graph/pipeline';
          node: string;
          actions: AiAction[];
          state: GraphState;
          phase: GraphPhase;
          loopBudget: LoopBudget;
          telemetry?: Record<string, unknown> | null;
          timestamp: number;
      };

export type GraphEvent = GraphClientEvent | GraphWorkerEvent;

export const GRAPH_RUNTIME_VERSION = '0.1.0';

export const isGraphWorkerEvent = (payload: unknown): payload is GraphWorkerEvent => {
    if (!payload || typeof payload !== 'object') return false;
    const possible = payload as Partial<GraphWorkerEvent>;
    return typeof possible.type === 'string' && possible.type.startsWith('graph/');
};
