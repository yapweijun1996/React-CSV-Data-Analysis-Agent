/// <reference lib="webworker" />
import { GRAPH_RUNTIME_VERSION, type GraphClientEvent, type GraphWorkerEvent } from './contracts';
import { createGuardState, enforceTurnGuards } from './guards';
import { runGraphPipeline } from './nodes';
import type { AiAction } from '@/types';

declare const self: DedicatedWorkerGlobalScope;

const ctx: DedicatedWorkerGlobalScope = self;

let graphState = createGuardState();

const send = (message: GraphWorkerEvent) => {
    ctx.postMessage(message);
};

const now = () => Date.now();

const emitReady = () => {
    send({
        type: 'graph/ready',
        version: GRAPH_RUNTIME_VERSION,
        timestamp: now(),
    });
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
                    ? `Graph runtime shutting down: ${event.reason}`
                    : 'Graph runtime shutting down by request.',
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

const handleRunPipeline = (payload: Record<string, unknown>) => {
    const result = runGraphPipeline({ state: graphState, payload });
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
