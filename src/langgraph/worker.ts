/// <reference lib="webworker" />
import { LangGraphBuilder } from './builder';
import { GRAPH_RUNTIME_VERSION, type GraphClientEvent, type GraphWorkerEvent } from '../graph/contracts';
import { createGuardState, enforceTurnGuards } from '../graph/guards';
import { diagnoseNode } from '../graph/nodes/diagnose';
import { askUserNode } from '../graph/nodes/askUser';
import { planNode } from '../graph/nodes/plan';
import { actNode } from '../graph/nodes/act';
import { verifyNode } from '../graph/nodes/verify';
import { adjustNode } from '../graph/nodes/adjust';
import type { AiAction } from '@/types';
import type { GraphObservation } from '../graph/schema';

declare const self: DedicatedWorkerGlobalScope;
const ctx: DedicatedWorkerGlobalScope = self;

const langGraphMachine = new LangGraphBuilder()
    .addNode('diagnose', diagnoseNode)
    .addNode('ask_user', askUserNode)
    .addNode('plan', planNode)
    .addNode('act', actNode)
    .addNode('verify', verifyNode)
    .addNode('adjust', adjustNode)
    .addEdge('diagnose', 'ask_user')
    .addEdge('ask_user', 'plan')
    .addEdge('plan', 'act')
    .addEdge('act', 'verify')
    .addEdge('verify', 'adjust')
    .setEntryPoint('diagnose')
    .build();

let graphState = createGuardState();
const MAX_OBSERVATIONS = 20;

const now = () => Date.now();

const send = (message: GraphWorkerEvent) => {
    ctx.postMessage(message);
};

const emitReady = () => {
    send({
        type: 'graph/ready',
        version: GRAPH_RUNTIME_VERSION,
        timestamp: now(),
    });
};

const handleApplyActions = (actions: AiAction[]) => {
    const timestamp = now();
    const guardResult = enforceTurnGuards(graphState, actions);
    if (guardResult.ok && guardResult.nextState) {
        graphState = guardResult.nextState;
    }
    send({
        type: 'graph/validation',
        ok: guardResult.ok,
        timestamp,
        code: guardResult.violations?.[0]?.code,
        reason: guardResult.violations?.[0]?.message,
        state: guardResult.nextState,
    });
};

const handleRunPipeline = async (payload: Record<string, unknown>) => {
    const result = await langGraphMachine.invoke({ state: graphState, payload });
    graphState = result.state;
    send({
        type: 'graph/pipeline',
        node: result.label,
        actions: result.actions,
        state: graphState,
        timestamp: now(),
    });
};

const handleUserReply = (optionId: string | null, freeText: string | null) => {
    const promptSnapshot = graphState.awaitPrompt;
    graphState = {
        ...graphState,
        awaitingUser: false,
        blockedBy: null,
        awaitPrompt: null,
        awaitPromptId: null,
        pendingUserReply: {
            optionId: optionId ?? null,
            freeText: freeText ?? null,
            promptId: promptSnapshot?.promptId ?? null,
            question: promptSnapshot?.question ?? 'User follow-up',
            options: promptSnapshot?.options ?? [],
            at: new Date().toISOString(),
        },
        stateTag: 'context_ready',
        updatedAt: new Date().toISOString(),
    };
    const message =
        optionId || freeText
            ? `User replied with ${optionId ?? ''} ${freeText ?? ''}`.trim()
            : 'User reply received.';
    send({
        type: 'graph/log',
        level: 'info',
        message,
        timestamp: now(),
    });
};

const handleToolResult = (verification: GraphClientEvent & { verification: any }['verification']) => {
    const metaId = `verify-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const recordedAt = new Date().toISOString();
    const observation: GraphObservation = {
        id: metaId,
        kind:
            typeof verification.payload?.kind === 'string'
                ? (verification.payload.kind as string)
                : 'tool_result',
        payload: {
            description: verification.description,
            summary: verification.summary ?? null,
            meta: verification.meta ?? null,
            ...(verification.payload ?? {}),
        },
        at: recordedAt,
    };
    const nextObservations = [...graphState.observations, observation];
    const trimmedObservations =
        nextObservations.length > MAX_OBSERVATIONS
            ? nextObservations.slice(nextObservations.length - MAX_OBSERVATIONS)
            : nextObservations;
    graphState = {
        ...graphState,
        pendingVerification: {
            id: metaId,
            description: verification.description,
            meta: verification.meta
                ? {
                      ...verification.meta,
                      summary: verification.summary ?? undefined,
                  }
                : null,
            summary: verification.summary ?? null,
            payload: verification.payload ?? null,
            createdAt: recordedAt,
        },
        observations: trimmedObservations,
    };
};

const handleClientEvent = (event: GraphClientEvent) => {
    switch (event.type) {
        case 'graph/init':
            emitReady();
            return;
        case 'graph/ping':
            send({
                type: 'graph/pong',
                nonce: event.nonce,
                timestamp: now(),
            });
            return;
        case 'graph/shutdown':
            send({
                type: 'graph/log',
                level: 'info',
                message: event.reason
                    ? `LangGraph runtime shutting down: ${event.reason}`
                    : 'LangGraph runtime shutting down by request.',
                timestamp: now(),
            });
            ctx.close();
            return;
        case 'graph/applyActions':
            handleApplyActions(event.actions ?? []);
            return;
        case 'graph/runPipeline':
            handleRunPipeline(event.payload ?? {});
            return;
        case 'graph/userReply':
            handleUserReply(event.optionId ?? null, event.freeText ?? null);
            return;
        case 'graph/tool_result':
            handleToolResult(event.verification);
            return;
        default: {
            const neverType: never = event;
            send({
                type: 'graph/log',
                level: 'warn',
                message: `Unhandled client event ${(neverType as GraphClientEvent).type}`,
                timestamp: now(),
            });
        }
    }
};

ctx.addEventListener('message', messageEvent => {
    const data = messageEvent.data as GraphClientEvent | undefined;
    if (!data || typeof data !== 'object' || typeof (data as GraphClientEvent).type !== 'string') {
        send({
            type: 'graph/log',
            level: 'warn',
            message: 'Ignored message without graph type.',
            timestamp: now(),
        });
        return;
    }
    handleClientEvent(data as GraphClientEvent);
});

emitReady();

export {};
