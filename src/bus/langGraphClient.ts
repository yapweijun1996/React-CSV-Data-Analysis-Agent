import type { GraphClientEvent, GraphWorkerEvent } from '../graph/contracts';
import { isGraphWorkerEvent } from '../graph/contracts';

type Listener = (event: GraphWorkerEvent) => void;
type WorkerUrlModule = { default: string };

let workerUrlPromise: Promise<string> | null = null;

const loadWorkerUrl = async (): Promise<string | null> => {
    if (typeof window === 'undefined') {
        return null;
    }
    if (!workerUrlPromise) {
        workerUrlPromise = import('../langgraph/worker?worker&url').then((mod: WorkerUrlModule) => mod.default);
    }
    return workerUrlPromise;
};

export class LangGraphBus {
    private worker: Worker | null = null;
    private readonly listeners = new Set<Listener>();
    private readonly pendingMessages: GraphClientEvent[] = [];
    private isReady = false;
    private isBooting = false;
    readonly isSupported: boolean;

    constructor() {
        this.isSupported = typeof window !== 'undefined' && typeof Worker !== 'undefined';
    }

    subscribe(listener: Listener): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    private async ensureWorker(): Promise<void> {
        if (!this.isSupported || this.worker || this.isBooting) return;
        this.isBooting = true;
        try {
            const url = await loadWorkerUrl();
            if (!url || this.worker) return;
            this.worker = new Worker(url, {
                name: 'csv-agent-langgraph-worker',
                type: 'module',
            });
            this.worker.addEventListener('message', this.handleWorkerMessage);
            this.worker.addEventListener('error', this.handleWorkerError);
        } catch (error) {
            console.error('Failed to initialize LangGraph worker:', error);
            this.handleWorkerError(
                new ErrorEvent('error', { message: (error as Error)?.message ?? String(error) }),
            );
        } finally {
            this.isBooting = false;
        }
    }

    post(event: GraphClientEvent): void {
        if (!this.isSupported) return;
        this.ensureWorker();
        if (!this.worker) {
            this.pendingMessages.push(event);
            return;
        }
        if (event.type === 'graph/init' || this.isReady) {
            this.worker.postMessage(event);
            return;
        }
        this.pendingMessages.push(event);
    }

    private flushQueue(): void {
        if (!this.worker || !this.isReady || this.pendingMessages.length === 0) {
            return;
        }
        while (this.pendingMessages.length > 0) {
            const next = this.pendingMessages.shift();
            if (next) {
                this.worker.postMessage(next);
            }
        }
    }

    private handleWorkerMessage = (event: MessageEvent<unknown>) => {
        if (!isGraphWorkerEvent(event.data)) {
            return;
        }
        if (event.data.type === 'graph/ready' && !this.isReady) {
            this.isReady = true;
            this.flushQueue();
        }
        this.listeners.forEach(listener => listener(event.data));
    };

    private handleWorkerError = (errorEvent: ErrorEvent) => {
        const payload: GraphWorkerEvent = {
            type: 'graph/error',
            message: errorEvent.message || 'LangGraph worker error',
            timestamp: Date.now(),
        };
        this.listeners.forEach(listener => listener(payload));
        this.isReady = false;
    };
}

export const langGraphBus = new LangGraphBus();
