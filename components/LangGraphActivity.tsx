import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';

export interface LangGraphActivityInfo {
    shouldRender: boolean;
    headline: string;
    detail: string | null;
    runtimeLabel: string;
    agentAwaitingUserInput: boolean;
    activeToolLabel: string | null;
    graphStatus: string;
}

const buildActivityMessage = ({
    runtimeLabel,
    graphStatus,
    graphStatusMessage,
    graphToolInFlight,
    graphLastToolSummary,
    agentAwaitingUserInput,
    graphAwaitPrompt,
}: {
    runtimeLabel: string;
    graphStatus: string;
    graphStatusMessage: string | null;
    graphToolInFlight: { label: string } | null;
    graphLastToolSummary: string | null;
    agentAwaitingUserInput: boolean;
    graphAwaitPrompt: { question?: string | null } | null;
}): { headline: string; detail: string | null } => {
    if (graphToolInFlight) {
        return {
            headline: `${runtimeLabel} 正在执行 ${graphToolInFlight.label}`,
            detail: graphStatusMessage ?? '数据工具运行中…',
        };
    }

    if (agentAwaitingUserInput) {
        return {
            headline: `${runtimeLabel} 等待你的回应`,
            detail: graphAwaitPrompt?.question ?? graphStatusMessage ?? '请确认最新问题。',
        };
    }

    if (graphStatus === 'connecting') {
        return {
            headline: `${runtimeLabel} runtime 启动中…`,
            detail: graphStatusMessage ?? 'Spinning up worker…',
        };
    }

    if (graphStatus === 'error') {
        return {
            headline: `${runtimeLabel} runtime 遇到错误`,
            detail: graphStatusMessage ?? '请检查 System Log。' ,
        };
    }

    if (graphLastToolSummary) {
        return {
            headline: `${runtimeLabel} runtime 已完成最近一次动作`,
            detail: graphLastToolSummary,
        };
    }

    return {
        headline: `${runtimeLabel} runtime`,
        detail: graphStatusMessage,
    };
};

export const useLangGraphActivity = (): LangGraphActivityInfo => {
    const {
        runtimeLabel,
        graphStatus,
        graphStatusMessage,
        graphToolInFlight,
        graphLastToolSummary,
        agentAwaitingUserInput,
        graphAwaitPrompt,
    } = useAppStore(state => ({
        runtimeLabel: state.useLangGraphRuntime ? 'LangGraph' : 'Graph',
        graphStatus: state.graphStatus,
        graphStatusMessage: state.graphStatusMessage,
        graphToolInFlight: state.graphToolInFlight,
        graphLastToolSummary: state.graphLastToolSummary,
        agentAwaitingUserInput: state.agentAwaitingUserInput,
        graphAwaitPrompt: state.graphAwaitPrompt,
    }));

    return useMemo(() => {
        const hasActiveTool = Boolean(graphToolInFlight);
        const hasSummary = Boolean(graphLastToolSummary);
        const isConnecting = graphStatus === 'connecting';
        const hasError = graphStatus === 'error';

        const shouldRender =
            hasActiveTool ||
            agentAwaitingUserInput ||
            isConnecting ||
            hasError ||
            hasSummary;

        const { headline, detail } = buildActivityMessage({
            runtimeLabel,
            graphStatus,
            graphStatusMessage,
            graphToolInFlight,
            graphLastToolSummary,
            agentAwaitingUserInput,
            graphAwaitPrompt,
        });

        return {
            shouldRender,
            headline,
            detail,
            runtimeLabel,
            agentAwaitingUserInput,
            activeToolLabel: graphToolInFlight?.label ?? null,
            graphStatus,
        };
    }, [
        runtimeLabel,
        graphStatus,
        graphStatusMessage,
        graphToolInFlight,
        graphLastToolSummary,
        agentAwaitingUserInput,
        graphAwaitPrompt,
    ]);
};
