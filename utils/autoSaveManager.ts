import type { AppState, Report, Settings } from '../types';
import type { AppStore } from '../store/appStoreTypes';
import { CURRENT_SESSION_KEY, getReport, saveReport } from '../storageService';

export interface AutoSaveConfig {
    enabled: boolean;
    intervalMs: number;
}

interface AutoSaveManagerDeps {
    getStore: () => AppStore;
    buildSnapshot: (state: AppStore) => AppState;
    addToast: AppStore['addToast'];
    dismissToast: AppStore['dismissToast'];
}

const MIN_INTERVAL_MS = 5000;
const MAX_BACKOFF_MS = 60000;

export class AutoSaveManager {
    private timer: ReturnType<typeof setTimeout> | null = null;
    private inFlight = false;
    private failureToastId: string | null = null;
    private config: AutoSaveConfig = { enabled: true, intervalMs: 15000 };
    private backoffMs = 0;
    private lastCreatedAt: Date | null = null;

    constructor(private deps: AutoSaveManagerDeps) {}

    configure(config: AutoSaveConfig) {
        const nextConfig = {
            enabled: config.enabled,
            intervalMs: Math.max(MIN_INTERVAL_MS, config.intervalMs),
        };
        this.config = nextConfig;
        if (!config.enabled) {
            this.stop();
            this.clearFailureToast();
            return;
        }
        this.restart();
    }

    triggerImmediateSave(force = false) {
        if (!this.config.enabled && !force) return;
        this.schedule(0, force);
    }

    resetSessionMetadata() {
        this.lastCreatedAt = null;
    }

    seedCreatedAt(createdAt: Date | null) {
        this.lastCreatedAt = createdAt;
    }

    private stop() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }

    private restart() {
        this.stop();
        this.schedule(this.config.intervalMs);
    }

    private schedule(delayMs: number, force = false) {
        this.stop();
        this.timer = setTimeout(() => {
            this.performSave(force).finally(() => {
                if (this.config.enabled) {
                    const nextDelay = this.config.intervalMs + this.backoffMs;
                    this.schedule(nextDelay);
                }
            });
        }, Math.max(0, delayMs));
    }

    private async performSave(force = false) {
        if (this.inFlight) return;
        if (!this.config.enabled && !force) return;

        const storeState = this.deps.getStore();
        if (!this.shouldSave(storeState)) return;

        this.inFlight = true;
        try {
            const snapshot = this.deps.buildSnapshot(storeState);
            const createdAt = await this.ensureCreatedAt();
            const report: Report = {
                id: CURRENT_SESSION_KEY,
                filename: storeState.csvData?.fileName || 'Current Session',
                createdAt,
                updatedAt: new Date(),
                appState: snapshot,
            };
            await saveReport(report);
            this.backoffMs = 0;
            this.clearFailureToast();
        } catch (error) {
            console.error('Auto-save failed:', error);
            this.backoffMs = this.backoffMs === 0
                ? Math.min(this.config.intervalMs, MAX_BACKOFF_MS)
                : Math.min(this.backoffMs * 2, MAX_BACKOFF_MS);
            this.showFailureToast();
        } finally {
            this.inFlight = false;
        }
    }

    private async ensureCreatedAt(): Promise<Date> {
        if (this.lastCreatedAt) return this.lastCreatedAt;
        const existing = await getReport(CURRENT_SESSION_KEY);
        this.lastCreatedAt = existing?.createdAt ?? new Date();
        return this.lastCreatedAt;
    }

    private shouldSave(state: AppStore) {
        const hasData = !!(state.csvData && state.csvData.data.length > 0);
        return hasData;
    }

    private showFailureToast() {
        if (this.failureToastId) return;
        this.failureToastId = this.deps.addToast(
            'Auto-save failed. Click to retry now.',
            'error',
            0,
            {
                label: 'Retry now',
                onClick: () => this.triggerImmediateSave(true),
            }
        );
    }

    private clearFailureToast() {
        if (this.failureToastId) {
            this.deps.dismissToast(this.failureToastId);
            this.failureToastId = null;
        }
    }
}

export const deriveAutoSaveConfig = (settings: Settings): AutoSaveConfig => ({
    enabled: settings.autoSaveEnabled,
    intervalMs: Math.max(MIN_INTERVAL_MS, settings.autoSaveIntervalSeconds * 1000),
});
