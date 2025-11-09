import React, { useMemo, useState } from 'react';
import Masonry from 'react-masonry-css';
import { AnalysisCard } from './AnalysisCard';
import { FinalSummary } from './FinalSummary';
import { useAppStore } from '../store/useAppStore';

const COLUMN_OPTIONS = [1, 2, 3] as const;

export const AnalysisPanel: React.FC = () => {
    const cards = useAppStore(state => state.analysisCards);
    const finalSummary = useAppStore(state => state.finalSummary);
    const [columnCount, setColumnCount] = useState<number>(2);

    const masonryBreakpoints = useMemo(() => ({
        default: columnCount,
        1024: Math.min(columnCount, 2),
        640: 1,
    }), [columnCount]);

    if (cards.length === 0) {
        return (
            <div className="flex items-center justify-center h-full">
                 <div className="text-center p-4">
                    <p className="text-slate-500">Your analysis results will appear here.</p>
                    <p className="text-slate-400 text-sm mt-2">The AI is generating the initial analysis...</p>
                 </div>
            </div>
        );
    }

    return (
        <div className="p-1">
            <div className="mb-6 space-y-4">
                {finalSummary && (
                    <div>
                        <FinalSummary summary={finalSummary} />
                    </div>
                )}
                <div className="flex items-center justify-end gap-3">
                    <span className="text-sm text-slate-500">Cards per row</span>
                    <div className="inline-flex overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
                        {COLUMN_OPTIONS.map(option => {
                            const isActive = columnCount === option;
                            return (
                                <button
                                    key={option}
                                    type="button"
                                    onClick={() => setColumnCount(option)}
                                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                                        isActive
                                            ? 'bg-slate-100 text-slate-900'
                                            : 'text-slate-500 hover:bg-slate-50'
                                    }`}
                                    aria-pressed={isActive}
                                >
                                    {option}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
            <div className="mt-6">
                <Masonry
                    breakpointCols={masonryBreakpoints}
                    className="flex w-auto -ml-6"
                    columnClassName="pl-6 space-y-6"
                >
                    {cards.map((card) => (
                        <div
                            key={card.id}
                            className="analysis-card"
                        >
                            <AnalysisCard 
                                cardId={card.id}
                            />
                        </div>
                    ))}
                </Masonry>
            </div>
        </div>
    );
};
