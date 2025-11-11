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
        aggregationMode,
        setAggregationMode,
    } = useAppStore(state => ({
        onNewSession: state.handleNewSession,
        onOpenHistory: () => {
            state.loadReportsList();
            state.setIsHistoryPanelOpen(true);
        },
        isAsideVisible: state.isAsideVisible,
        onShowAssistant: () => state.setIsAsideVisible(true),
        aggregationMode: state.aggregationModePreference,
        setAggregationMode: state.setAggregationModePreference,
    }));

    const modeButtonClass = (mode: 'sample' | 'full') =>
        `px-3 py-1 text-xs font-semibold rounded-md transition ${
            aggregationMode === mode
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
        }`;

    return (
        <header className="mb-6 flex justify-between items-start flex-shrink-0">
            <div className="max-w-xs">
                <h1 className="text-xl font-extrabold text-slate-900 leading-tight">CSV Data Analysis Agent</h1>
            </div>
            <div className="flex flex-col items-end gap-4 sm:flex-row sm:items-center sm:gap-6">
                <div className="text-right sm:text-left">
                    <div className="text-[11px] uppercase tracking-wide text-slate-400">Aggregation Mode</div>
                    <div className="mt-1 inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                        <button
                            type="button"
                            className={modeButtonClass('sample')}
                            onClick={() => setAggregationMode('sample')}
                        >
                            快速
                        </button>
                        <button
                            type="button"
                            className={modeButtonClass('full')}
                            onClick={() => setAggregationMode('full')}
                        >
                            全量（需确认）
                        </button>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400 max-w-xs">
                        快速 = 采样（默认 5k 行以内）；全量 = 全表扫描，切换为数据集独立配置。
                    </div>
                </div>
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
