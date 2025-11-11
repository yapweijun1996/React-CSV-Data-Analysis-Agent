import React, { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';

export const LangChainDebugPanel: React.FC = () => {
    const {
        datasetHash,
        langChainLastPlan,
        isBusy,
        addProgress,
        isApiKeySet,
    } = useAppStore(state => ({
        datasetHash: state.datasetHash,
        langChainLastPlan: state.langChainLastPlan,
        isBusy: state.isBusy,
        addProgress: state.addProgress,
        isApiKeySet: state.isApiKeySet,
    }));
    const [isRunning, setIsRunning] = useState(false);

    const canRun = Boolean(datasetHash && isApiKeySet && !isBusy && !isRunning);

    const handleRunDemo = async () => {
        if (!datasetHash) {
            addProgress('LangChain PoC requires an uploaded dataset.', 'error');
            return;
        }
        setIsRunning(true);
        try {
            const { runLangChainPrompt } = await import('@/poc/langchain/promptRunner');
            await runLangChainPrompt({ datasetId: datasetHash, debug: true });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error ?? 'Unknown error');
            addProgress(`LangChain PoC failed: ${message}`, 'error');
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-semibold text-slate-900">LangChain PoC</p>
                    <p className="text-xs text-slate-500">Run prompt→plan pipeline via LangChain.</p>
                </div>
                <button
                    type="button"
                    onClick={handleRunDemo}
                    disabled={!canRun}
                    className="px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isRunning ? 'Running…' : 'Run LangChain Plan'}
                </button>
            </div>
            {langChainLastPlan ? (
                <div className="text-sm text-slate-700 space-y-1">
                    <p className="font-semibold">{langChainLastPlan.title}</p>
                    <p className="text-xs text-slate-500">{langChainLastPlan.description}</p>
                    <div className="text-xs text-slate-600 mt-2">
                        <span className="inline-flex items-center gap-1">
                            <span className="font-semibold">Chart:</span>
                            {langChainLastPlan.chartType}
                        </span>
                        {langChainLastPlan.groupByColumn && (
                            <span className="inline-flex items-center gap-1 ml-4">
                                <span className="font-semibold">Group by:</span>
                                {langChainLastPlan.groupByColumn}
                            </span>
                        )}
                        {langChainLastPlan.valueColumn && (
                            <span className="inline-flex items-center gap-1 ml-4">
                                <span className="font-semibold">Metric:</span>
                                {langChainLastPlan.valueColumn}
                            </span>
                        )}
                    </div>
                </div>
            ) : (
                <p className="text-xs text-slate-500">尚未產生 LangChain 計畫，按下按鈕以建立第一個方案。</p>
            )}
        </div>
    );
};
