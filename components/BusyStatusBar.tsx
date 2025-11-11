import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { StatusSpinner } from './StatusSpinner';
import { useLangGraphActivity } from './LangGraphActivity';

export const BusyStatusBar: React.FC = () => {
    const {
        isBusy,
        busyMessage,
        canCancelBusy,
        requestBusyCancel,
        isCancellationRequested,
    } = useAppStore(state => ({
        isBusy: state.isBusy,
        busyMessage: state.busyMessage,
        canCancelBusy: state.canCancelBusy,
        requestBusyCancel: state.requestBusyCancel,
        isCancellationRequested: state.isCancellationRequested,
    }));

    const activity = useLangGraphActivity();

    const showBusy = isBusy;
    const showActivity = !isBusy && activity.shouldRender;

    if (!showBusy && !showActivity) {
        return null;
    }

    const headline = showBusy
        ? busyMessage || 'Thinking through your question...'
        : activity.headline;

    const phaseSummary =
        activity.phaseLabel || activity.loopSummary
            ? `Phase: ${activity.phaseLabel ?? 'Idle'}${
                  activity.loopSummary ? ` · Loop ${activity.loopSummary}` : ''
              }`
            : null;
    const detail = showBusy ? activity.detail : activity.detail;

    return (
        <div
            className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 shadow-sm flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
            role="status"
            aria-live="polite"
        >
            <div className="flex items-center gap-3 text-blue-900">
                <StatusSpinner />
                <div>
                    <p className="text-sm font-semibold">{headline}</p>
                    {showBusy && isCancellationRequested && (
                        <p className="text-xs text-blue-700">Cancelling… wrapping up safely.</p>
                    )}
                    {detail && (
                        <p className="text-xs text-blue-700">{detail}</p>
                    )}
                    {phaseSummary && (
                        <p className="text-xs text-blue-700">{phaseSummary}</p>
                    )}
                </div>
            </div>
            {showBusy && canCancelBusy ? (
                <button
                    type="button"
                    onClick={requestBusyCancel}
                    disabled={isCancellationRequested}
                    className="text-sm font-semibold rounded-md border border-blue-300 px-3 py-1.5 text-blue-700 hover:bg-blue-100 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {isCancellationRequested ? 'Cancelling…' : 'Cancel'}
                </button>
            ) : (
                showActivity && (
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                            {activity.runtimeLabel} runtime
                        </span>
                        {activity.phaseLabel && (
                            <span className="inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
                                {activity.phaseLabel}
                            </span>
                        )}
                        {activity.loopSummary && (
                            <span className="text-xs text-slate-600">Loop {activity.loopSummary}</span>
                        )}
                        {activity.agentAwaitingUserInput && (
                            <span className="text-xs font-semibold text-orange-600">Waiting for your input</span>
                        )}
                        {activity.activeToolLabel && (
                            <span className="text-xs text-blue-700">执行中：{activity.activeToolLabel}</span>
                        )}
                    </div>
                )
            )}
        </div>
    );
};
