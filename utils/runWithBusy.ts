export interface BusyHandles {
    beginBusy: (message: string, options?: { cancellable?: boolean }) => string;
    endBusy: (runId?: string) => void;
}

interface BusyOptions {
    runId?: string;
    cancellable?: boolean;
}

export const runWithBusyState = async <T>(
    handles: BusyHandles,
    message: string,
    task: (runId: string) => Promise<T>,
    options: BusyOptions = {},
): Promise<T> => {
    const reuseExistingRun = !!options.runId;
    const runId = options.runId ?? handles.beginBusy(message, { cancellable: options.cancellable });
    try {
        return await task(runId);
    } finally {
        if (!reuseExistingRun) {
            handles.endBusy(runId);
        }
    }
};
