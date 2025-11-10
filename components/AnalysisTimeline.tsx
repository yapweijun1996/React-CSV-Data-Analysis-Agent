import React from 'react';
import { useAppStore } from '../store/useAppStore';
import type { AnalysisTimelineStage } from '../types';

const STAGES: AnalysisTimelineStage[] = ['persisting', 'profiling', 'insight'];

const stageLabel = (stage: AnalysisTimelineStage, totalCards: number, completedCards: number) => {
    if (stage === 'insight') {
        const safeTotal = Math.max(totalCards || 1, 1);
        const safeCompleted = Math.min(Math.max(completedCards || 1, 1), safeTotal);
        return `First insight (${safeCompleted} of ${safeTotal})`;
    }
    if (stage === 'profiling') return 'Profiling sample';
    return 'Persisting data';
};

export const AnalysisTimeline: React.FC = () => {
    const timeline = useAppStore(state => state.analysisTimeline);
    if (timeline.stage === 'idle') {
        return null;
    }
    const activeIndex = Math.max(STAGES.indexOf(timeline.stage), 0);

    return (
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 mb-4 shadow-sm">
            <ol className="flex items-center justify-between">
                {STAGES.map((stage, index) => {
                    const isActive = index <= activeIndex;
                    const label = stageLabel(stage, timeline.totalCards, timeline.completedCards);
                    return (
                        <li key={stage} className="flex-1 flex items-center">
                            <div className="flex items-center gap-2">
                                <div
                                    className={`w-6 h-6 rounded-full border text-xs flex items-center justify-center ${
                                        isActive
                                            ? 'bg-blue-600 text-white border-blue-600'
                                            : 'bg-white text-slate-400 border-slate-300'
                                    }`}
                                >
                                    {index + 1}
                                </div>
                                <span
                                    className={`text-sm font-medium ${
                                        isActive ? 'text-slate-900' : 'text-slate-400'
                                    }`}
                                >
                                    {label}
                                </span>
                            </div>
                            {index < STAGES.length - 1 && (
                                <div
                                    className={`flex-1 h-px mx-3 ${
                                        index < activeIndex ? 'bg-blue-300' : 'bg-slate-200'
                                    }`}
                                />
                            )}
                        </li>
                    );
                })}
            </ol>
        </div>
    );
};
