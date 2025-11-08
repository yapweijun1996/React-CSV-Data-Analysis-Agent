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
        confirmPendingDataTransform,
        discardPendingDataTransform,
        undoLastDataTransform,
    } = useAppStore(state => ({
        pendingDataTransform: state.pendingDataTransform,
        lastAppliedDataTransform: state.lastAppliedDataTransform,
        confirmPendingDataTransform: state.confirmPendingDataTransform,
        discardPendingDataTransform: state.discardPendingDataTransform,
        undoLastDataTransform: state.undoLastDataTransform,
    }));

    if (!pendingDataTransform && !lastAppliedDataTransform) {
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

            {lastAppliedDataTransform && (
                <div className="border border-emerald-200 bg-emerald-50 rounded-md p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                        <p className="text-sm font-semibold text-emerald-900">Last Applied AI Change</p>
                        <p className="text-xs text-emerald-800 mt-1">
                            {lastAppliedDataTransform.summary}
                        </p>
                    </div>
                    <button
                        onClick={undoLastDataTransform}
                        className="px-3 py-1.5 border border-emerald-400 text-emerald-900 rounded-md text-sm hover:bg-emerald-100 transition-colors self-start sm:self-auto"
                    >
                        Undo Change
                    </button>
                </div>
            )}
        </div>
    );
};
