import React from 'react';
import Masonry from 'react-masonry-css';
import { AnalysisCard } from './AnalysisCard';
import { FinalSummary } from './FinalSummary';
import { useAppStore } from '../store/useAppStore';

const masonryBreakpoints = {
    default: 2,
    1024: 2,
    640: 1,
};

export const AnalysisPanel: React.FC = () => {
    const cards = useAppStore(state => state.analysisCards);
    const finalSummary = useAppStore(state => state.finalSummary);

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
            {finalSummary && (
                <div className="mb-6">
                    <FinalSummary summary={finalSummary} />
                </div>
            )}
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
