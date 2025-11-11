import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

export const DataProfilePanel: React.FC = () => {
    const profile = useAppStore(state => state.datasetProfile);
    const [isOpen, setIsOpen] = useState(false);

    if (!profile) return null;

    const sampleRatio =
        profile.rowCount > 0 ? Math.min(1, profile.sampledRows / profile.rowCount) : 1;
    const hasFullScan = sampleRatio === 1;

    return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
            <button
                type="button"
                onClick={() => setIsOpen(open => !open)}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
                <div>
                    <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                        <span className="text-base">📊</span>
                        <span>Data Profile</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                        {hasFullScan
                            ? 'Full dataset profiled.'
                            : `Sampled ${profile.sampledRows.toLocaleString()} of ${profile.rowCount.toLocaleString()} rows (${formatPercent(sampleRatio)}).`}
                    </p>
                </div>
                <span className="text-sm text-slate-500">{isOpen ? 'Hide' : 'Show'}</span>
            </button>
            {isOpen && (
                <div className="px-4 pb-4 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div className="bg-slate-50 rounded-md p-3 border border-slate-100">
                            <p className="text-slate-500">Total rows</p>
                            <p className="text-lg font-semibold text-slate-900">
                                {profile.rowCount.toLocaleString()}
                            </p>
                        </div>
                        <div className="bg-slate-50 rounded-md p-3 border border-slate-100">
                            <p className="text-slate-500">Sampled rows</p>
                            <p className="text-lg font-semibold text-slate-900">
                                {profile.sampledRows.toLocaleString()}
                            </p>
                        </div>
                        <div className="bg-slate-50 rounded-md p-3 border border-slate-100">
                            <p className="text-slate-500">Columns</p>
                            <p className="text-lg font-semibold text-slate-900">
                                {profile.columns.length}
                            </p>
                        </div>
                        <div className="bg-slate-50 rounded-md p-3 border border-slate-100">
                            <p className="text-slate-500">Profile Scope</p>
                            <p className="text-lg font-semibold text-slate-900">
                                {hasFullScan ? 'Full' : 'Sample'}
                            </p>
                        </div>
                    </div>
                    <div className="overflow-x-auto border border-slate-100 rounded-md">
                        <table className="min-w-full text-xs">
                            <thead className="bg-slate-100 text-slate-600">
                                <tr>
                                    <th className="p-2 text-left font-semibold">Column</th>
                                    <th className="p-2 text-left font-semibold">Type</th>
                                    <th className="p-2 text-left font-semibold">Distinct</th>
                                    <th className="p-2 text-left font-semibold">Missing</th>
                                    <th className="p-2 text-left font-semibold">Examples</th>
                                </tr>
                            </thead>
                            <tbody>
                                {profile.columns.map(col => (
                                    <tr key={col.name} className="border-t border-slate-100">
                                        <td className="p-2 font-medium text-slate-800">{col.name}</td>
                                        <td className="p-2 text-slate-600 capitalize">{col.type}</td>
                                        <td className="p-2 text-slate-600">
                                            {col.distinct?.toLocaleString() ?? '—'}
                                        </td>
                                        <td className="p-2 text-slate-600">
                                            {typeof col.emptyPercentage === 'number'
                                                ? formatPercent(col.emptyPercentage / 100)
                                                : '—'}
                                        </td>
                                        <td className="p-2 text-slate-600">
                                            {col.examples && col.examples.length > 0
                                                ? col.examples.slice(0, 3).join(', ')
                                                : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {profile.warnings.length > 0 && (
                        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
                            <p className="font-semibold mb-1">Warnings</p>
                            <ul className="list-disc list-inside space-y-1">
                                {profile.warnings.map((warning, index) => (
                                    <li key={`warning-${index}`}>{warning}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
