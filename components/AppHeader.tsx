import React from 'react';
import { NewIcon, HistoryIcon, ShowAssistantIcon } from './Icons';
import { useAppStore } from '../store/useAppStore';
import { getUiVisibilityConfig } from '../services/bootstrapConfig';

const uiFlags = getUiVisibilityConfig();

export const AppHeader: React.FC = () => {
    const {
        onNewSession,
        onOpenHistory,
        isAsideVisible,
        onShowAssistant,
        graphStatus,
        graphStatusMessage,
        graphVersion,
        graphLastReadyAt,
    } = useAppStore(state => ({
        onNewSession: state.handleNewSession,
        onOpenHistory: () => {
            state.loadReportsList();
            state.setIsHistoryPanelOpen(true);
        },
        isAsideVisible: state.isAsideVisible,
        onShowAssistant: () => state.setIsAsideVisible(true),
        graphStatus: state.graphStatus,
        graphStatusMessage: state.graphStatusMessage,
        graphVersion: state.graphVersion,
        graphLastReadyAt: state.graphLastReadyAt,
    }));

    const graphStatusLabel = (() => {
        switch (graphStatus) {
            case 'ready':
                return `Graph Ready (v${graphVersion ?? '—'})`;
            case 'connecting':
                return 'Graph Initializing…';
            case 'error':
                return graphStatusMessage ?? 'Graph Offline';
            default:
                return 'Graph Idle';
        }
    })();

    const statusClassMap: Record<typeof graphStatus, string> = {
        ready: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        connecting: 'bg-amber-100 text-amber-700 border-amber-200',
        error: 'bg-rose-100 text-rose-700 border-rose-200',
        idle: 'bg-slate-100 text-slate-600 border-slate-200',
    };

    const statusClass = statusClassMap[graphStatus] ?? statusClassMap.idle;

    return (
        <header className="mb-6 flex justify-between items-start flex-shrink-0">
            <div className="max-w-xs">
                <h1 className="text-xl font-extrabold text-slate-900 leading-tight">CSV Data Analysis Agent</h1>
                <div className="mt-2 flex flex-col gap-1">
                    <span
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold ${statusClass}`}
                    >
                        系统状态 · {graphStatusLabel}
                    </span>
                    {graphLastReadyAt && (
                        <span className="text-[11px] text-slate-400">
                            Last heartbeat: {new Date(graphLastReadyAt).toLocaleTimeString()}
                        </span>
                    )}
                </div>
            </div>
            <div className="flex flex-col items-end gap-4 sm:flex-row sm:items-center sm:gap-6">
                <div className="flex items-center space-x-2">
                    {uiFlags.showNewButton && (
                        <button
                            onClick={onNewSession}
                            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                            title="Start a new analysis session"
                        >
                            <NewIcon />
                            <span className="hidden sm:inline">New</span>
                        </button>
                    )}
                    <button
                        onClick={onOpenHistory}
                        className="flex items-center space-x-2 px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
                        title="View analysis history"
                    >
                        <HistoryIcon />
                        <span className="hidden sm:inline">History</span>
                    </button>
                    {!isAsideVisible && (
                        <button
                            onClick={onShowAssistant}
                            className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                            aria-label="Show Assistant Panel"
                            title="Show Assistant Panel"
                        >
                            <ShowAssistantIcon />
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
};
