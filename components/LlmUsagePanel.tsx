import React from 'react';
import { useAppStore } from '@/store/useAppStore';

const numberFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
const currencyFormatter = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 4 });

export const LlmUsagePanel: React.FC = () => {
    const { usageLog, clearUsage } = useAppStore(state => ({
        usageLog: state.llmUsageLog,
        clearUsage: state.clearLlmUsage,
    }));

    const totalCost = usageLog.reduce((sum, entry) => sum + (entry.estimatedCostUsd ?? 0), 0);

    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-semibold text-slate-900">LLM Usage</p>
                    <p className="text-xs text-slate-500">
                        最近 40 次 LLM 呼叫的 tokens / cost 紀錄。
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">
                        累計 {currencyFormatter.format(totalCost)}
                    </span>
                    <button
                        type="button"
                        onClick={clearUsage}
                        disabled={usageLog.length === 0}
                        className="px-2 py-1 text-xs font-semibold rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        清除
                    </button>
                </div>
            </div>
            {usageLog.length === 0 ? (
                <p className="text-xs text-slate-500">尚無 LLM 呼叫紀錄。</p>
            ) : (
                <div className="max-h-64 overflow-y-auto">
                    <table className="min-w-full text-xs text-left">
                        <thead className="text-slate-500">
                            <tr>
                                <th className="pb-2 pr-4 font-medium">時間</th>
                                <th className="pb-2 pr-4 font-medium">Context</th>
                                <th className="pb-2 pr-4 font-medium">Provider · Model</th>
                                <th className="pb-2 pr-4 font-medium">Tokens (in/out/total)</th>
                                <th className="pb-2 font-medium">Cost</th>
                            </tr>
                        </thead>
                        <tbody className="text-slate-700">
                            {usageLog
                                .slice()
                                .reverse()
                                .map(entry => (
                                    <tr key={entry.id} className="border-t border-slate-100">
                                        <td className="py-2 pr-4 whitespace-nowrap">
                                            {new Date(entry.timestamp).toLocaleTimeString()}
                                        </td>
                                        <td className="py-2 pr-4">{entry.context}</td>
                                        <td className="py-2 pr-4 whitespace-nowrap">
                                            {entry.provider}/{entry.model}
                                        </td>
                                        <td className="py-2 pr-4 whitespace-nowrap">
                                            {numberFormatter.format(entry.promptTokens ?? 0)} /{' '}
                                            {numberFormatter.format(entry.completionTokens ?? 0)} /{' '}
                                            {numberFormatter.format(entry.totalTokens ?? (entry.promptTokens ?? 0) + (entry.completionTokens ?? 0))}
                                        </td>
                                        <td className="py-2 whitespace-nowrap">
                                            {entry.estimatedCostUsd != null ? currencyFormatter.format(entry.estimatedCostUsd) : '—'}
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
