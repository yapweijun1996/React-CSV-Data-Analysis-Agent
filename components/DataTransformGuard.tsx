import React from 'react';
import { useAppStore } from '../store/useAppStore';

const formatMeta = (rowsBefore: number, rowsAfter: number, removedRows?: number, addedRows?: number, modifiedRows?: number) => {
    const pieces = [`${rowsBefore} → ${rowsAfter} rows`];
    if (removedRows) pieces.push(`${removedRows} removed`);
    if (addedRows) pieces.push(`${addedRows} added`);
    if (modifiedRows) pieces.push(`${modifiedRows} modified`);
    return pieces.join(' · ');
};

export const DataTransformGuard: React.FC = () => {
    const {
        pendingDataTransform,
        lastAppliedDataTransform,
        isLastAppliedDataTransformBannerDismissed,
        confirmPendingDataTransform,
        discardPendingDataTransform,
        undoLastDataTransform,
        dismissLastAppliedDataTransformBanner,
    } = useAppStore(state => ({
        pendingDataTransform: state.pendingDataTransform,
        lastAppliedDataTransform: state.lastAppliedDataTransform,
        isLastAppliedDataTransformBannerDismissed: state.isLastAppliedDataTransformBannerDismissed,
        confirmPendingDataTransform: state.confirmPendingDataTransform,
        discardPendingDataTransform: state.discardPendingDataTransform,
        undoLastDataTransform: state.undoLastDataTransform,
        dismissLastAppliedDataTransformBanner: state.dismissLastAppliedDataTransformBanner,
    }));

    const lastAppliedBannerData = !isLastAppliedDataTransformBannerDismissed ? lastAppliedDataTransform : null;
    const shouldShowLastAppliedBanner = !!lastAppliedBannerData;

    if (!pendingDataTransform && !shouldShowLastAppliedBanner) {
        return null;
    }

    return (
        <div className="space-y-3 mt-4">
            {pendingDataTransform && (
                <div className="border border-amber-200 bg-amber-50 rounded-md p-4 shadow-sm">
                    <p className="text-sm font-semibold text-amber-900">AI Data Change Pending Confirmation</p>
                    <p className="text-xs text-amber-900 mt-1">
                        {pendingDataTransform.explanation || 'The AI prepared a dataset update.'}
                    </p>
                    <p className="text-xs text-amber-800 mt-1">
                        {formatMeta(
                            pendingDataTransform.meta.rowsBefore,
                            pendingDataTransform.meta.rowsAfter,
                            pendingDataTransform.meta.removedRows,
                            pendingDataTransform.meta.addedRows,
                            pendingDataTransform.meta.modifiedRows,
                        )}
                    </p>
                    {pendingDataTransform.previewRows.length > 0 && (
                        <pre className="bg-white text-amber-900 text-xs rounded-md mt-2 p-2 overflow-auto max-h-40 border border-amber-200">
                            {JSON.stringify(pendingDataTransform.previewRows.slice(0, 2), null, 2)}
                        </pre>
                    )}
                    <div className="flex flex-wrap gap-2 mt-3">
                        <button
                            onClick={confirmPendingDataTransform}
                            className="px-3 py-1.5 bg-amber-600 text-white rounded-md text-sm hover:bg-amber-700 transition-colors"
                        >
                            Apply Change
                        </button>
                        <button
                            onClick={discardPendingDataTransform}
                            className="px-3 py-1.5 border border-amber-400 text-amber-900 rounded-md text-sm hover:bg-amber-100 transition-colors"
                        >
                            Discard
                        </button>
                    </div>
                </div>
            )}

            {shouldShowLastAppliedBanner && (
                <div className="border border-emerald-200 bg-emerald-50 rounded-md p-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                            <p className="text-sm font-semibold text-emerald-900">Last Applied AI Change</p>
                            <p className="text-xs text-emerald-800 mt-1">{lastAppliedBannerData.summary}</p>
                        </div>
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                            <button
                                onClick={undoLastDataTransform}
                                className="px-3 py-1.5 border border-emerald-400 text-emerald-900 rounded-md text-sm hover:bg-emerald-100 transition-colors"
                            >
                                Undo Change
                            </button>
                            <button
                                type="button"
                                onClick={dismissLastAppliedDataTransformBanner}
                                aria-label="Dismiss last applied AI change"
                                className="p-1.5 rounded-full text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 transition-colors"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                    className="w-4 h-4"
                                    aria-hidden="true"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M5.22 5.22a.75.75 0 0 1 1.06 0L10 8.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L11.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06L10 11.06l-3.72 3.72a.75.75 0 1 1-1.06-1.06L8.94 10 5.22 6.28a.75.75 0 0 1 0-1.06Z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
