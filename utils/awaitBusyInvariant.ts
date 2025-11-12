export type AwaitBusySnapshot = {
    isBusy: boolean;
    busyRunId: string | null;
    agentAwaitingUserInput: boolean;
    graphActiveRunId: string | null;
};

export type AwaitBusyInvariantViolationCode =
    | 'awaiting_still_busy'
    | 'awaiting_has_active_run'
    | 'active_run_without_busy'
    | 'stale_busy_run';

export type AwaitBusyInvariantViolation = {
    code: AwaitBusyInvariantViolationCode;
    message: string;
};

export type AwaitBusyInvariantResult = {
    ok: boolean;
    violations: AwaitBusyInvariantViolation[];
};

const describeValue = (value: string | null): string => (value ?? 'none');

const describeSnapshot = (snapshot: AwaitBusySnapshot): string =>
    `busy=${snapshot.isBusy ? '1' : '0'} ` +
    `busyRunId=${describeValue(snapshot.busyRunId)} ` +
    `awaiting=${snapshot.agentAwaitingUserInput ? '1' : '0'} ` +
    `graphRun=${describeValue(snapshot.graphActiveRunId)}`;

export const evaluateAwaitBusyInvariant = (snapshot: AwaitBusySnapshot): AwaitBusyInvariantResult => {
    const violations: AwaitBusyInvariantViolation[] = [];

    if (snapshot.agentAwaitingUserInput && snapshot.isBusy) {
        violations.push({
            code: 'awaiting_still_busy',
            message: `Await prompt entered but busy flag still active (${describeSnapshot(snapshot)}).`,
        });
    }
    if (snapshot.agentAwaitingUserInput && snapshot.graphActiveRunId) {
        violations.push({
            code: 'awaiting_has_active_run',
            message: `Await prompt entered but graphActiveRunId is still set (${describeSnapshot(snapshot)}).`,
        });
    }
    if (snapshot.graphActiveRunId && !snapshot.isBusy) {
        violations.push({
            code: 'active_run_without_busy',
            message: `graphActiveRunId is set but busy flag is false (${describeSnapshot(snapshot)}).`,
        });
    }
    if (!snapshot.isBusy && snapshot.busyRunId) {
        violations.push({
            code: 'stale_busy_run',
            message: `busyRunId remains populated after busy finished (${describeSnapshot(snapshot)}).`,
        });
    }

    return {
        ok: violations.length === 0,
        violations,
    };
};

export const reportAwaitBusyInvariant = (
    snapshot: AwaitBusySnapshot,
    options?: { context?: string; reporter?: (violation: AwaitBusyInvariantViolation) => void },
): AwaitBusyInvariantResult => {
    const result = evaluateAwaitBusyInvariant(snapshot);
    if (!result.ok) {
        const reporter = options?.reporter ?? ((violation: AwaitBusyInvariantViolation) => console.warn(violation.message));
        result.violations.forEach(violation => {
            reporter({
                ...violation,
                message: options?.context ? `[${options.context}] ${violation.message}` : violation.message,
            });
        });
    }
    return result;
};
