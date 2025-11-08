import type { GetState, SetState } from 'zustand';
import type { AppStore } from '../appStoreTypes';
import type { AiFilterResponse } from '../../types';
import { generateFilterFunction } from '../../services/aiService';

interface AiFilterSliceDependencies {
    createRunId: () => string;
}

export const createAiFilterSlice = (
    set: SetState<AppStore>,
    get: GetState<AppStore>,
    deps: AiFilterSliceDependencies,
) => ({
    handleNaturalLanguageQuery: async (query: string) => {
        if (!get().isApiKeySet || !get().csvData) {
            get().addProgress('Cannot perform AI query: API Key is not set or no data is loaded.', 'error');
            return;
        }

        const existingRunId = get().aiFilterRunId;
        if (existingRunId) {
            get().abortRunControllers(existingRunId);
        }

        const runId = deps.createRunId();
        set({
            isAiFiltering: true,
            aiFilterRunId: runId,
            spreadsheetFilterFunction: null,
            aiFilterExplanation: null,
        });
        get().addProgress(`AI is processing your data query: "${query}"...`);
        const signal = get().createAbortController(runId)?.signal;

        try {
            const response: AiFilterResponse = await generateFilterFunction(
                query,
                get().columnProfiles,
                get().csvData!.data.slice(0, 5),
                get().settings,
                { signal }
            );

            set({
                spreadsheetFilterFunction: response.jsFunctionBody,
                aiFilterExplanation: response.explanation,
            });
            get().addProgress(`AI filter applied: ${response.explanation}`);
            get().addToast('AI filter applied successfully.', 'success');
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
                get().addProgress('AI filter request cancelled.');
                get().addToast('AI filter cancelled.', 'info');
            } else {
                const errorMessage = error instanceof Error ? error.message : String(error);
                get().addProgress(`AI query failed: ${errorMessage}`, 'error');
                get().addToast(`AI filter failed: ${errorMessage}`, 'error');
            }
        } finally {
            get().clearRunControllers(runId);
            set(state =>
                state.aiFilterRunId === runId
                    ? { isAiFiltering: false, aiFilterRunId: null }
                    : {}
            );
        }
    },

    clearAiFilter: () => {
        const activeRunId = get().aiFilterRunId;
        if (activeRunId) {
            get().abortRunControllers(activeRunId);
        }
        set({ spreadsheetFilterFunction: null, aiFilterExplanation: null, aiFilterRunId: null, isAiFiltering: false });
        get().addProgress('AI data filter cleared.');
        get().addToast('AI filter cleared.', 'info');
    },

    cancelAiFilterRequest: () => {
        const { aiFilterRunId, isAiFiltering } = get();
        if (!aiFilterRunId || !isAiFiltering) return;
        get().abortRunControllers(aiFilterRunId);
        set({ isAiFiltering: false, aiFilterRunId: null });
        get().addProgress('AI data filter cancelled.');
        get().addToast('AI filter cancelled.', 'info');
    },
});
