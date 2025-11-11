import React, { useLayoutEffect, useRef, useState } from 'react';
import Masonry from 'react-masonry-css';
import { AnalysisCard } from './AnalysisCard';
import { FinalSummary } from './FinalSummary';
import { useAppStore } from '../store/useAppStore';
import { CardLayoutControl, COLUMN_OPTIONS } from './CardLayoutControl';
import { DataProfilePanel } from './DataProfilePanel';

const MAX_COLUMNS = COLUMN_OPTIONS[COLUMN_OPTIONS.length - 1];

const CARD_LAYOUT_BREAKPOINTS: Array<{ minWidth: number; columns: (typeof COLUMN_OPTIONS)[number] }> = [
    { minWidth: 1280, columns: 3 },
    { minWidth: 720, columns: 2 },
    { minWidth: 0, columns: 1 },
];

const getAutoColumnCount = (width: number) => {
    if (!width) {
        return 1;
    }

    for (const breakpoint of CARD_LAYOUT_BREAKPOINTS) {
        if (width >= breakpoint.minWidth) {
            return Math.min(MAX_COLUMNS, breakpoint.columns);
        }
    }

    return 1;
};

export const AnalysisPanel: React.FC = () => {
    const cards = useAppStore(state => state.analysisCards);
    const finalSummary = useAppStore(state => state.finalSummary);
    const panelRef = useRef<HTMLDivElement | null>(null);
    const resizeFrame = useRef<number | null>(null);
    const [autoColumnCount, setAutoColumnCount] = useState<number>(1);
    const [manualColumnCount, setManualColumnCount] = useState<number>(2);
    const [isManualLayout, setIsManualLayout] = useState(false);
    const effectiveColumnCount = isManualLayout ? manualColumnCount : autoColumnCount;

    useLayoutEffect(() => {
        if (isManualLayout) {
            return;
        }

        const node = panelRef.current;
        if (!node) {
            return;
        }

        const scheduleUpdate = (width: number) => {
            if (resizeFrame.current !== null) {
                cancelAnimationFrame(resizeFrame.current);
            }

            resizeFrame.current = requestAnimationFrame(() => {
                resizeFrame.current = null;
                setAutoColumnCount(prev => {
                    const next = getAutoColumnCount(width);
                    return prev === next ? prev : next;
                });
            });
        };

        scheduleUpdate(node.getBoundingClientRect().width);

        if (typeof ResizeObserver !== 'undefined') {
            const observer = new ResizeObserver(entries => {
                for (const entry of entries) {
                    if (entry.target === node) {
                        const width = entry.contentRect?.width ?? node.getBoundingClientRect().width;
                        scheduleUpdate(width);
                    }
                }
            });

            observer.observe(node);
            return () => {
                observer.disconnect();
                if (resizeFrame.current !== null) {
                    cancelAnimationFrame(resizeFrame.current);
                }
            };
        }

        const handleResize = () => {
            scheduleUpdate(node.getBoundingClientRect().width);
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            if (resizeFrame.current !== null) {
                cancelAnimationFrame(resizeFrame.current);
            }
        };
    }, [isManualLayout, cards.length]);

    const handleManualToggle = () => {
        setIsManualLayout(prev => {
            if (!prev) {
                setManualColumnCount(effectiveColumnCount);
            }
            return !prev;
        });
    };

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
                <DataProfilePanel />
                {finalSummary && (
                    <div>
                        <FinalSummary summary={finalSummary} />
                    </div>
                )}
                <CardLayoutControl
                    isManual={isManualLayout}
                    statusLabel={isManualLayout ? 'Manual control enabled' : 'Auto based on panel width'}
                    selectedCount={effectiveColumnCount}
                    onToggleMode={handleManualToggle}
                    onSelectManualCount={(value) => setManualColumnCount(value)}
                />
            </div>
            <div className="mt-6">
                <Masonry
                    breakpointCols={effectiveColumnCount}
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
