import type { AiAction } from '@/types';
import type { PipelineContext, NodeResult } from '../graph/nodes/types';

type AsyncNodeHandler = (context: PipelineContext) => Promise<NodeResult> | NodeResult;

interface InvocationResult {
    state: NodeResult['state'];
    actions: AiAction[];
    halted: boolean;
    label: string;
}

export class LangGraphBuilder {
    private readonly nodes = new Map<string, AsyncNodeHandler>();
    private readonly edges = new Map<string, string>();
    private entryPoint: string | null = null;

    addNode(name: string, handler: AsyncNodeHandler): this {
        this.nodes.set(name, handler);
        return this;
    }

    addEdge(from: string, to: string): this {
        this.edges.set(from, to);
        return this;
    }

    setEntryPoint(name: string): this {
        this.entryPoint = name;
        return this;
    }

    build(): LangGraphMachine {
        if (!this.entryPoint) {
            throw new Error('LangGraphBuilder requires an entry point via setEntryPoint().');
        }
        return new LangGraphMachine(this.entryPoint, this.nodes, this.edges);
    }
}

export class LangGraphMachine {
    constructor(
        private readonly entryPoint: string,
        private readonly nodes: Map<string, AsyncNodeHandler>,
        private readonly edges: Map<string, string>,
    ) {}

    async invoke(context: PipelineContext): Promise<InvocationResult> {
        let currentNodeName: string | undefined = this.entryPoint;
        let currentState = context.state;
        const aggregatedActions: AiAction[] = [];
        let halted = false;
        let lastLabel = currentNodeName;

        while (currentNodeName) {
            const handler = this.nodes.get(currentNodeName);
            if (!handler) {
                throw new Error(`LangGraphMachine missing node handler for "${currentNodeName}".`);
            }
            const result = await handler({ state: currentState, payload: context.payload });
            currentState = result.state;
            if (result.actions?.length) {
                aggregatedActions.push(...result.actions);
            }
            lastLabel = result.label ?? currentNodeName;
            if (result.halted) {
                halted = true;
                break;
            }
            currentNodeName = this.edges.get(currentNodeName);
        }

        return {
            state: currentState,
            actions: aggregatedActions,
            halted,
            label: lastLabel ?? 'complete',
        };
    }
}
