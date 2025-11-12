import type { GetState, SetState } from 'zustand';
import type { AppState, ColumnProfile, DataPreparationPlan, DataTransformMeta, Report } from '../../types';
import type { AppStore } from '../appStoreTypes';
import { processCsv, profileData, executeJavaScriptDataTransform } from '../../utils/dataProcessor';
import { buildColumnAliasMap } from '../../utils/columnAliases';
import { generateDataPreparationPlan } from '../../services/aiService';
import { vectorStore } from '../../services/vectorStore';
import { getReport, saveReport, deleteReport, CURRENT_SESSION_KEY } from '../../storageService';
import { computeDatasetHash } from '../../utils/datasetHash';
import {
    persistCleanDataset,
    readProvenance,
    replacePreparationLog,
    type PreparationLogEntryInput,
} from '../../services/csvAgentDb';
import { dataTools } from '../../services/dataTools';
import { rememberDatasetId, forgetDatasetId } from '../../utils/datasetCache';

interface FileUploadSliceDependencies {
    initialAppState: AppState;
    resetAutoSaveSession: () => void;
}

const describeRowImpact = (meta: DataTransformMeta | null): string => {
    if (!meta) return 'AI transformation applied (row delta unknown).';
    const parts = [`Rows ${meta.rowsBefore.toLocaleString()} → ${meta.rowsAfter.toLocaleString()}`];
    if (meta.removedRows > 0) parts.push(`${meta.removedRows.toLocaleString()} removed`);
    if (meta.addedRows > 0) parts.push(`${meta.addedRows.toLocaleString()} added`);
    if (meta.modifiedRows > 0) parts.push(`${meta.modifiedRows.toLocaleString()} modified`);
    if (meta.noOp) parts.push('no row changes detected');
    return parts.join(', ');
};

const buildPreparationLogEntries = (
    plan: DataPreparationPlan | null,
    meta: DataTransformMeta | null,
    beforeColumns: ColumnProfile[],
    afterColumns: ColumnProfile[],
): PreparationLogEntryInput[] => {
    if (!plan) return [];
    const entries: PreparationLogEntryInput[] = [];
    const beforeMap = new Map(beforeColumns.map(col => [col.name, col]));
    const afterMap = new Map(afterColumns.map(col => [col.name, col]));
    entries.push({
        stepOrder: 0,
        scope: 'rows',
        columnName: null,
        rule: 'ai_transformation',
        impactSummary: describeRowImpact(meta),
        impactMetrics: meta
            ? { ...meta, totalColumnsBefore: beforeColumns.length, totalColumnsAfter: afterColumns.length }
            : { totalColumnsBefore: beforeColumns.length, totalColumnsAfter: afterColumns.length },
        details: {
            explanation: plan.explanation,
            beforeColumns: beforeColumns.map(col => ({ name: col.name, type: col.type })),
            afterColumns: afterColumns.map(col => ({ name: col.name, type: col.type })),
        },
        source: 'ai_plan',
        tags: ['transformation'],
    });
    let stepOrder = 1;
    beforeColumns
        .filter(col => !afterMap.has(col.name))
        .forEach(col => {
            entries.push({
                stepOrder: stepOrder++,
                scope: 'column',
                columnName: col.name,
                rule: 'column_removed',
                impactSummary: `Column "${col.name}" removed during AI cleanup.`,
                details: { previousType: col.type },
                source: 'ai_plan',
                tags: ['schema', 'removed'],
            });
        });
    afterColumns
        .filter(col => !beforeMap.has(col.name))
        .forEach(col => {
            entries.push({
                stepOrder: stepOrder++,
                scope: 'column',
                columnName: col.name,
                rule: 'column_added',
                impactSummary: `Column "${col.name}" added by AI transformation.`,
                details: { newType: col.type },
                source: 'ai_plan',
                tags: ['schema', 'added'],
            });
        });
    afterColumns
        .filter(col => {
            const before = beforeMap.get(col.name);
            return before && before.type !== col.type;
        })
        .forEach(col => {
            const previous = beforeMap.get(col.name);
            entries.push({
                stepOrder: stepOrder++,
                scope: 'column',
                columnName: col.name,
                rule: 'column_type_change',
                impactSummary: `Column "${col.name}" type normalized from ${
                    previous?.type ?? 'unknown'
                } to ${col.type}.`,
                details: { previousType: previous?.type, newType: col.type },
                source: 'ai_plan',
                tags: ['schema', 'type_change'],
            });
        });
    return entries;
};

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
                try {
                    await saveReport(sessionToArchive);
                } catch (error) {
                    console.error('Failed to archive current session before upload:', error);
                }
            }
        }

        vectorStore.clear();
        await deleteReport(CURRENT_SESSION_KEY);
        deps.resetAutoSaveSession();
        await get().loadReportsList();

        set({
            ...deps.initialAppState,
            csvData: { fileName: file.name, data: [] },
            datasetHash: null,
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
            const hydrateDatasetProfile = async (datasetId: string) => {
                try {
                    const profileResult = await dataTools.profile(datasetId);
                    if (profileResult.ok) {
                        get().applyDatasetProfileSnapshot(profileResult.data);
                    } else {
                        get().addProgress(`Profiling failed: ${profileResult.reason}`, 'error');
                    }
                } catch (error) {
                    console.error('Failed to profile dataset via worker:', error);
                    get().addProgress('Profiling worker failed—retry later from chat.', 'error');
                }
            };

            const hydrateDatasetSample = async (datasetId: string) => {
                try {
                    const sampleResult = await dataTools.sample(datasetId, { n: 200 });
                    if (sampleResult.ok) {
                        set({ initialDataSample: sampleResult.data.rows });
                    }
                } catch (error) {
                    console.error('Failed to sample dataset via worker:', error);
                }
            };

            const persistCleanSnapshot = async (datasetId: string, columns: ColumnProfile[]) => {
                try {
                    const existingProvenance = await readProvenance(datasetId);
                    if (existingProvenance?.checksum && existingProvenance.checksum === datasetId) {
                        const shouldContinue =
                            typeof window === 'undefined'
                                ? true
                                : window.confirm('检测到相同数据，是否仍要覆盖本地缓存？选择取消将跳过导入。');
                        if (!shouldContinue) {
                            get().addProgress('跳过缓存：检测到与现有数据相同的 CSV 指纹。', 'system');
                            return;
                        }
                        get().addProgress('数据未变化，但按照指示重新写入缓存…');
                    }
                    set(state => ({
                        analysisTimeline: { ...state.analysisTimeline, stage: 'persisting', totalCards: 0, completedCards: 0 },
                    }));
                    get().addProgress('Persisting cleaned dataset for offline reuse…');
                    const result = await persistCleanDataset({
                        datasetId,
                        rows: dataForAnalysis.data,
                        columns,
                        provenance: {
                            fileName: file.name,
                            bytes: file.size,
                            checksum: datasetId,
                            cleanedAt: new Date().toISOString(),
                        },
                    });
                    rememberDatasetId(datasetId);
                    get().addProgress(`Cached ${result.rowCount} rows in ${result.chunkCount} chunks.`);
                    set(state => ({
                        analysisTimeline: { ...state.analysisTimeline, stage: 'profiling' },
                    }));
                    await Promise.all([hydrateDatasetProfile(datasetId), hydrateDatasetSample(datasetId)]);
                } catch (persistError) {
                    console.error('Failed to persist cleaned dataset:', persistError);
                    get().addProgress('IndexedDB cache failed—refreshing may lose progress.', 'error');
                    set(state => ({
                        analysisTimeline: { ...state.analysisTimeline, stage: 'idle' },
                    }));
                }
            };
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
            let preparationLogEntries: PreparationLogEntryInput[] = [];

            if (get().isApiKeySet) {
                get().updateBusyStatus('Initializing AI memory...');
                await vectorStore.init(get().addProgress);
                get().addProgress('AI is analyzing data for cleaning and reshaping...');
                const initialProfiles = profileData(dataForAnalysis.data);
                get().updateBusyStatus('Drafting data preparation plan...');
                const prepSignal = get().createAbortController(runId)?.signal;
                prepPlan = await generateDataPreparationPlan(
                    initialProfiles,
                    dataForAnalysis.data.slice(0, 20),
                    get().settings,
                    {
                        signal: prepSignal,
                        onUsage: usage => {
                            get().recordLlmUsage({
                                provider: usage.provider,
                                model: usage.model,
                                promptTokens: usage.promptTokens,
                                completionTokens: usage.completionTokens,
                                totalTokens: usage.totalTokens,
                                context: usage.operation ?? 'data_prep.plan',
                            });
                        },
                    }
                );

                if (get().isRunCancellationRequested(runId)) {
                    get().addProgress('Upload cancelled during preparation.');
                    return;
                }

                const jsTransformBody =
                    typeof prepPlan?.jsFunctionBody === 'string' ? prepPlan.jsFunctionBody.trim() : null;
                if (prepPlan && jsTransformBody) {
                    get().addProgress(`AI Plan: ${prepPlan.explanation}`);
                    get().addProgress('Executing AI data transformation...');
                    try {
                        const transformResult = executeJavaScriptDataTransform(
                            dataForAnalysis.data,
                            prepPlan.jsFunctionBody,
                        );
                        dataForAnalysis.data = transformResult.data;
                        const { rowsBefore, rowsAfter, removedRows, addedRows, modifiedRows } = transformResult.meta;
                        const summary = [`${rowsBefore} → ${rowsAfter} rows`];
                        if (removedRows) summary.push(`${removedRows} removed`);
                        if (addedRows) summary.push(`${addedRows} added`);
                        if (modifiedRows) summary.push(`${modifiedRows} modified`);
                        get().addProgress(`Transformation complete (${summary.join(', ')}).`);
                        preparationLogEntries = buildPreparationLogEntries(
                            prepPlan,
                            transformResult.meta,
                            initialProfiles,
                            prepPlan.outputColumns,
                        );
                    } catch (transformError) {
                        const errorMessage = transformError instanceof Error ? transformError.message : String(transformError);
                        get().addProgress(`Data transformation failed: ${errorMessage}`, 'error');
                        throw transformError;
                    }
                } else {
                    if (prepPlan) {
                        get().addProgress(`AI Plan: ${prepPlan.explanation}`);
                    }
                    get().addProgress('AI found no necessary data transformations.');
                }
                profiles = prepPlan.outputColumns;

                if (dataForAnalysis.data.length === 0) throw new Error('Dataset empty after transformation.');

                const aliasMap = buildColumnAliasMap(profiles.map(p => p.name));
                const datasetHash = computeDatasetHash(dataForAnalysis);
                if (!datasetHash) {
                    throw new Error('无法为当前数据集生成唯一 fingerprint。');
                }
                await persistCleanSnapshot(datasetHash, profiles);
                try {
                    await replacePreparationLog(datasetHash, preparationLogEntries);
                } catch (logError) {
                    console.warn('Failed to persist preparation log entries:', logError);
                }
                set({
                    csvData: dataForAnalysis,
                    columnProfiles: profiles,
                    columnAliasMap: aliasMap,
                    datasetHash,
                    datasetRuntimeConfig: null,
                    dataPreparationPlan: prepPlan,
                    currentView: 'analysis_dashboard',
                });
                await get().handleInitialAnalysis(dataForAnalysis, { runId });
            } else {
                get().addProgress('API Key not set. Please add it in the settings.', 'error');
                get().setIsSettingsModalOpen(true);
                profiles = profileData(dataForAnalysis.data);
                const aliasMap = buildColumnAliasMap(profiles.map(p => p.name));
                const datasetHash = computeDatasetHash(dataForAnalysis);
                if (!datasetHash) {
                    throw new Error('无法识别数据集指纹，无法缓存。');
                }
                await persistCleanSnapshot(datasetHash, profiles);
                try {
                    await replacePreparationLog(datasetHash, []);
                } catch (logError) {
                    console.warn('Failed to clear preparation log for dataset:', logError);
                }
                set({
                    csvData: dataForAnalysis,
                    columnProfiles: profiles,
                    columnAliasMap: aliasMap,
                    datasetHash,
                    datasetRuntimeConfig: null,
                    currentView: 'analysis_dashboard',
                });
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
                try {
                    await saveReport({ ...existingSession, id: archiveId, updatedAt: new Date() });
                } catch (error) {
                    console.error('Failed to archive session before starting new one:', error);
                }
            }
        }
        vectorStore.clear();
        await deleteReport(CURRENT_SESSION_KEY);
        deps.resetAutoSaveSession();
        forgetDatasetId();
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
