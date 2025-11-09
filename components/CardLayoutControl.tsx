import React from 'react';

export const COLUMN_OPTIONS = [1, 2, 3] as const;

type CardLayoutControlProps = {
    isManual: boolean;
    statusLabel: string;
    selectedCount: number;
    onToggleMode: () => void;
    onSelectManualCount: (value: (typeof COLUMN_OPTIONS)[number]) => void;
};

export const CardLayoutControl: React.FC<CardLayoutControlProps> = ({
    isManual,
    statusLabel,
    selectedCount,
    onToggleMode,
    onSelectManualCount,
}) => {
    return (
        <div className="flex justify-end">
            <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
                <div className="text-right">
                    <p className="text-sm font-semibold text-slate-600">Cards per row</p>
                    <p className="text-xs text-slate-400">{statusLabel}</p>
                </div>
                <button
                    type="button"
                    onClick={onToggleMode}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        isManual
                            ? 'border-amber-300 bg-amber-50 text-amber-700'
                            : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                    }`}
                >
                    {isManual ? 'Switch to Auto' : 'Manual override'}
                </button>
                <div className="inline-flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-inner">
                    {COLUMN_OPTIONS.map(option => {
                        const isActive = selectedCount === option;
                        return (
                            <button
                                key={option}
                                type="button"
                                onClick={() => isManual && onSelectManualCount(option)}
                                disabled={!isManual}
                                className={`px-4 py-1.5 text-sm font-semibold transition-colors ${
                                    isActive
                                        ? 'bg-slate-100 text-slate-900'
                                        : 'text-slate-500 hover:bg-slate-50'
                                } ${!isManual ? 'cursor-not-allowed opacity-60' : ''}`}
                                aria-pressed={isActive}
                                title={
                                    isManual
                                        ? undefined
                                        : 'Auto layout is active. Enable manual override to pick.'
                                }
                            >
                                {option}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
