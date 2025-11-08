import React from 'react';
import { useAppStore } from '../store/useAppStore';

const Spinner: React.FC = () => (
    <svg className="h-4 w-4 text-blue-600 animate-spin" viewBox="0 0 24 24" fill="none" role="status" aria-label="Loading">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
);

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

    if (!isBusy) return null;

    return (
        <div
            className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 shadow-sm flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
            role="status"
            aria-live="polite"
        >
            <div className="flex items-center gap-3 text-blue-900">
                <Spinner />
                <div>
                    <p className="text-sm font-semibold">{busyMessage || 'Running your request…'}</p>
                    {isCancellationRequested && (
                        <p className="text-xs text-blue-700">Cancelling… wrapping up safely.</p>
                    )}
                </div>
            </div>
            {canCancelBusy && (
                <button
                    type="button"
                    onClick={requestBusyCancel}
                    disabled={isCancellationRequested}
                    className="text-sm font-semibold rounded-md border border-blue-300 px-3 py-1.5 text-blue-700 hover:bg-blue-100 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {isCancellationRequested ? 'Cancelling…' : 'Cancel'}
                </button>
            )}
        </div>
    );
};
