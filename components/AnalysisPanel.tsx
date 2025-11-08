import React from 'react';
import { AnalysisCard } from './AnalysisCard';
import { FinalSummary } from './FinalSummary';
import { useAppStore } from '../store/useAppStore';

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
            <div
                className="mt-6 columns-1 md:columns-2 2xl:columns-3 [column-fill:_balance]"
                style={{ columnGap: '1.5rem' }}
            >
                {cards.map((card) => (
                    <AnalysisCard 
                        key={card.id} 
                        cardId={card.id}
                    />
                ))}
            </div>
        </div>
    );
};
