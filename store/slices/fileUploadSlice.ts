import type { GetState, SetState } from 'zustand';
import type { AppState, ColumnProfile, DataPreparationPlan, Report } from '../../types';
import type { AppStore } from '../appStoreTypes';
import { processCsv, profileData, executeJavaScriptDataTransform } from '../../utils/dataProcessor';
import { generateDataPreparationPlan } from '../../services/aiService';
import { vectorStore } from '../../services/vectorStore';
import { getReport, saveReport, deleteReport, CURRENT_SESSION_KEY } from '../../storageService';

interface FileUploadSliceDependencies {
    initialAppState: AppState;
}

export const createFileUploadSlice = (
    set: SetState<AppStore>,
    get: GetState<AppStore>,
    deps: FileUploadSliceDependencies,
) => ({
    handleFileUpload: async (file: File) => {
        const currentState = get();
        if (currentState.csvData && currentState.csvData.data.length > 0) {
            const existingSession = await getReport(CURRENT_SESSION_KEY);
            if (existingSession) {
                const archiveId = `report-${existingSession.createdAt.getTime()}`;
                const sessionToArchive: Report = { ...existingSession, id: archiveId, updatedAt: new Date() };
                await saveReport(sessionToArchive);
            }
        }

        vectorStore.clear();
        await deleteReport(CURRENT_SESSION_KEY);
        await get().loadReportsList();

        set({
            ...deps.initialAppState,
            csvData: { fileName: file.name, data: [] },
            busyRunId: null,
            isCancellationRequested: false,
            aiFilterRunId: null,
            abortControllers: {},
            toasts: [],
            chatMemoryPreview: [],
            chatMemoryExclusions: [],
            chatMemoryPreviewQuery: '',
            isMemoryPreviewLoading: false,
        });
        const runId = get().beginBusy(`Processing ${file.name}...`, { cancellable: true });

        try {
            get().updateBusyStatus('Parsing CSV file...');
            const parsedData = await processCsv(file);
            get().addProgress(`Parsed ${parsedData.data.length} rows.`);

            if (get().isRunCancellationRequested(runId)) {
                get().addProgress('Upload cancelled before analysis.');
                return;
            }

            set({ initialDataSample: parsedData.data.slice(0, 20) });

            let dataForAnalysis = parsedData;
            let profiles: ColumnProfile[];
            let prepPlan: DataPreparationPlan | null = null;

            if (get().isApiKeySet) {
                get().updateBusyStatus('Initializing AI memory...');
                await vectorStore.init(get().addProgress);
                get().addProgress('AI is analyzing data for cleaning and reshaping...');
                const initialProfiles = profileData(dataForAnalysis.data);
                get().updateBusyStatus('Drafting data preparation plan...');
                prepPlan = await generateDataPreparationPlan(
                    initialProfiles,
                    dataForAnalysis.data.slice(0, 20),
                    get().settings,
                    { signal: get().createAbortController(runId)?.signal }
                );

                if (get().isRunCancellationRequested(runId)) {
                    get().addProgress('Upload cancelled during preparation.');
                    return;
                }

                if (prepPlan && prepPlan.jsFunctionBody) {
                    get().addProgress(`AI Plan: ${prepPlan.explanation}`);
                    get().addProgress('Executing AI data transformation...');
                    try {
                        const transformResult = executeJavaScriptDataTransform(dataForAnalysis.data, prepPlan.jsFunctionBody);
                        dataForAnalysis.data = transformResult.data;
                        const { rowsBefore, rowsAfter, removedRows, addedRows, modifiedRows } = transformResult.meta;
                        const summary = [`${rowsBefore} → ${rowsAfter} rows`];
                        if (removedRows) summary.push(`${removedRows} removed`);
                        if (addedRows) summary.push(`${addedRows} added`);
                        if (modifiedRows) summary.push(`${modifiedRows} modified`);
                        get().addProgress(`Transformation complete (${summary.join(', ')}).`);
                    } catch (transformError) {
                        const errorMessage = transformError instanceof Error ? transformError.message : String(transformError);
                        get().addProgress(`Data transformation failed: ${errorMessage}`, 'error');
                        throw transformError;
                    }
                } else {
                    get().addProgress('AI found no necessary data transformations.');
                }
                profiles = prepPlan.outputColumns;

                if (dataForAnalysis.data.length === 0) throw new Error('Dataset empty after transformation.');

                set({
                    csvData: dataForAnalysis,
                    columnProfiles: profiles,
                    dataPreparationPlan: prepPlan,
                    currentView: 'analysis_dashboard',
                });
                await get().handleInitialAnalysis(dataForAnalysis, { runId });
            } else {
                get().addProgress('API Key not set. Please add it in the settings.', 'error');
                get().setIsSettingsModalOpen(true);
                profiles = profileData(dataForAnalysis.data);
                set({ csvData: dataForAnalysis, columnProfiles: profiles, currentView: 'analysis_dashboard' });
            }
        } catch (error) {
            if (!get().isRunCancellationRequested(runId)) {
                console.error('File processing error:', error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                get().addProgress(`File Processing Error: ${errorMessage}`, 'error');
                set({ currentView: 'file_upload' });
            }
        } finally {
            get().endBusy(runId);
        }
    },

    handleNewSession: async () => {
        if (get().csvData) {
            const existingSession = await getReport(CURRENT_SESSION_KEY);
            if (existingSession) {
                const archiveId = `report-${existingSession.createdAt.getTime()}`;
                await saveReport({ ...existingSession, id: archiveId, updatedAt: new Date() });
            }
        }
        vectorStore.clear();
        await deleteReport(CURRENT_SESSION_KEY);
        set({
            ...deps.initialAppState,
            busyRunId: null,
            isCancellationRequested: false,
            aiFilterRunId: null,
            abortControllers: {},
            toasts: [],
            chatMemoryPreview: [],
            chatMemoryExclusions: [],
            chatMemoryPreviewQuery: '',
            isMemoryPreviewLoading: false,
        });
        await get().loadReportsList();
    },
});
