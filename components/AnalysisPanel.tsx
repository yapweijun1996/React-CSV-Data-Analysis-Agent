import React, { useLayoutEffect, useRef, useState } from 'react';
import Masonry from 'react-masonry-css';
import { AnalysisCard } from './AnalysisCard';
import { FinalSummary } from './FinalSummary';
import { useAppStore } from '../store/useAppStore';

const MAX_COLUMNS = 3;
const MIN_CARD_WIDTH = 420;

const getAutoColumnCount = (width: number) => {
    if (!width) {
        return 1;
    }
    const estimatedColumns = Math.floor(width / MIN_CARD_WIDTH);
    return Math.max(1, Math.min(MAX_COLUMNS, estimatedColumns || 1));
};

export const AnalysisPanel: React.FC = () => {
    const cards = useAppStore(state => state.analysisCards);
    const finalSummary = useAppStore(state => state.finalSummary);
    const panelRef = useRef<HTMLDivElement | null>(null);
    const [columnCount, setColumnCount] = useState<number>(1);

    useLayoutEffect(() => {
        const node = panelRef.current;
        if (!node) {
            return;
        }

        const updateColumns = () => {
            const width = node.getBoundingClientRect().width;
            setColumnCount(prev => {
                const next = getAutoColumnCount(width);
                return prev === next ? prev : next;
            });
        };

        updateColumns();

        if (typeof ResizeObserver !== 'undefined') {
            const observer = new ResizeObserver(entries => {
                for (const entry of entries) {
                    if (entry.target === node) {
                        const width = entry.contentRect?.width ?? node.getBoundingClientRect().width;
                        setColumnCount(prev => {
                            const next = getAutoColumnCount(width);
                            return prev === next ? prev : next;
                        });
                    }
                }
            });

            observer.observe(node);
            return () => observer.disconnect();
        }

        window.addEventListener('resize', updateColumns);
        return () => window.removeEventListener('resize', updateColumns);
    }, []);

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
        <div className="p-1" ref={panelRef}>
            <div className="mb-6 space-y-4">
                {finalSummary && (
                    <div>
                        <FinalSummary summary={finalSummary} />
                    </div>
                )}
                <div className="flex items-center justify-end">
                    <span className="text-xs text-slate-400 uppercase tracking-wide">Layout auto-adjusts</span>
                </div>
            </div>
            <div className="mt-6">
                <Masonry
                    breakpointCols={columnCount}
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
