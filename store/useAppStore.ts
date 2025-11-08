import { create } from 'zustand';
// Fix: Import MouseEvent from React and alias it to resolve the type error.
import type { MouseEvent as ReactMouseEvent } from 'react';
import { AnalysisCardData, ChatMessage, ProgressMessage, CsvData, AnalysisPlan, AppState, ColumnProfile, AiAction, CardContext, ChartType, DomAction, Settings, Report, ReportListItem, AppView, CsvRow, DataPreparationPlan, AiFilterResponse, ClarificationRequest, ClarificationOption, ClarificationRequestPayload, ClarificationStatus } from '../types';
import { processCsv, profileData, executePlan, executeJavaScriptDataTransform } from '../utils/dataProcessor';
import { generateAnalysisPlans, generateSummary, generateFinalSummary, generateChatResponse, generateDataPreparationPlan, generateCoreAnalysisSummary, generateProactiveInsights, generateFilterFunction } from '../services/aiService';
import { getReportsList, saveReport, getReport, deleteReport, getSettings, saveSettings, CURRENT_SESSION_KEY } from '../storageService';
import { vectorStore } from '../services/vectorStore';

const COLUMN_TARGET_PROPERTIES: Array<keyof AnalysisPlan> = ['groupByColumn', 'valueColumn', 'xValueColumn', 'yValueColumn', 'secondaryValueColumn'];

const normalizeText = (value: string) => value
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const columnHasUsableData = (columnName: string, data: CsvRow[], minDistinct = 1, maxDistinct = Infinity): boolean => {
    if (!data || data.length === 0) return false;
    const values = data
        .map(row => row[columnName])
        .filter(value => value !== null && value !== undefined && String(value).trim() !== '');
    if (values.length === 0) return false;
    const distinctCount = new Set(values.map(value => String(value))).size;
    return distinctCount >= minDistinct && distinctCount <= maxDistinct;
};

const createClarificationId = () =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `clar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createRunId = () => `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const createToastId = () => `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const getNextAwaitingClarificationId = (clarifications: ClarificationRequest[]): string | null =>
    clarifications.find(c => c.status === 'pending')?.id ?? null;

const resolveColumnChoice = (
    option: ClarificationOption,
    targetProperty: keyof AnalysisPlan,
    availableColumns: string[],
): string | undefined => {
    if (!COLUMN_TARGET_PROPERTIES.includes(targetProperty)) {
        return option.value;
    }

    const directMatch = availableColumns.find(col => col === option.value);
    if (directMatch) return directMatch;

    const caseInsensitiveMatch = availableColumns.find(col => col.toLowerCase() === option.value.toLowerCase());
    if (caseInsensitiveMatch) return caseInsensitiveMatch;

    const normalizedLabel = normalizeText(option.label);
    return availableColumns.find(col => normalizedLabel.includes(normalizeText(col)));
};

const filterClarificationOptions = (
    clarification: ClarificationRequestPayload,
    data: CsvRow[] | undefined,
    availableColumns: string[]
): ClarificationRequestPayload | null => {
    if (!COLUMN_TARGET_PROPERTIES.includes(clarification.targetProperty) || !data || data.length === 0) {
        return clarification;
    }

    const filteredOptions = clarification.options
        .map(option => {
            const resolvedColumn = resolveColumnChoice(option, clarification.targetProperty, availableColumns);
            if (!resolvedColumn) return null;
            if (clarification.targetProperty === 'groupByColumn') {
                if (!columnHasUsableData(resolvedColumn, data, 2, 50)) return null;
            } else if (!columnHasUsableData(resolvedColumn, data)) {
                return null;
            }
            return { ...option, value: resolvedColumn };
        })
        .filter((option): option is ClarificationOption => option !== null);

    if (filteredOptions.length === 0) {
        return null;
    }

    return {
        ...clarification,
        options: filteredOptions,
    };
};

const getColumnFriendlyName = (columnName: string | undefined, columns: ColumnProfile[]): string | null => {
    if (!columnName) return null;
    const profile = columns.find(c => c.name === columnName);
    return profile ? profile.name : columnName;
};

const applyFriendlyPlanCopy = (plan: AnalysisPlan, columns: ColumnProfile[]): AnalysisPlan => {
    const metricLabel = getColumnFriendlyName(plan.valueColumn, columns)
        || (plan.aggregation === 'count' ? 'Records' : 'Value');
    const dimensionLabel = getColumnFriendlyName(plan.groupByColumn, columns)
        || (plan.chartType === 'scatter' ? 'X Axis' : 'Category');

    const replacements: Record<string, string> = {
        '[metric]': metricLabel,
        '[value]': metricLabel,
        '[dimension]': dimensionLabel,
        '[group]': dimensionLabel,
    };

    const hasRunawayRepetition = (text: string): boolean => {
        if (!text) return false;
        const compact = text.replace(/\s+/g, '');
        return /(.{3,20})\1{3,}/i.test(compact);
    };

    const rewrite = (text: string | undefined, fallback: string): string => {
        if (!text || text.trim() === '') return fallback;
        let rewritten = text;
        for (const key of Object.keys(replacements)) {
            const regex = new RegExp(key, 'gi');
            rewritten = rewritten.replace(regex, replacements[key]);
        }
        if (/\[.*\]/.test(rewritten)) {
            return fallback;
        }
        if (rewritten.length > 150 || hasRunawayRepetition(rewritten)) {
            return fallback;
        }
        return rewritten.trim();
    };

    const defaultTitle = `${metricLabel} by ${dimensionLabel}`;
    const defaultDescription = `A chart showing ${metricLabel} grouped by ${dimensionLabel}.`;

    return {
        ...plan,
        title: rewrite(plan.title, defaultTitle),
        description: rewrite(plan.description, defaultDescription),
    };
};

const MIN_ASIDE_WIDTH = 320;
const MAX_ASIDE_WIDTH = 800;
const MIN_MAIN_WIDTH = 600;

const initialAppState: AppState = {
    currentView: 'file_upload',
    isBusy: false,
    busyMessage: null,
    canCancelBusy: false,
    progressMessages: [],
    csvData: null,
    columnProfiles: [],
    analysisCards: [],
    chatHistory: [],
    finalSummary: null,
    aiCoreAnalysisSummary: null,
    dataPreparationPlan: null,
    initialDataSample: null,
    vectorStoreDocuments: [],
    spreadsheetFilterFunction: null,
    aiFilterExplanation: null,
    pendingClarifications: [],
    activeClarificationId: null,
    toasts: [],
};

interface StoreState extends AppState {
    busyRunId: string | null;
    isCancellationRequested: boolean;
    aiFilterRunId: string | null;
    abortControllers: Record<string, AbortController[]>;
    isAsideVisible: boolean;
    asideWidth: number;
    isSpreadsheetVisible: boolean;
    isDataPrepDebugVisible: boolean;
    isSettingsModalOpen: boolean;
    isHistoryPanelOpen: boolean;
    isMemoryPanelOpen: boolean;
    isAiFiltering: boolean; // For spreadsheet AI filter loading state
    settings: Settings;
    reportsList: ReportListItem[];
    isResizing: boolean;
    isApiKeySet: boolean;
}

interface StoreActions {
    beginBusy: (message: string, options?: { cancellable?: boolean }) => string;
    updateBusyStatus: (message: string) => void;
    endBusy: (runId?: string) => void;
    requestBusyCancel: () => void;
    isBusyRunActive: (runId: string) => boolean;
    isRunCancellationRequested: (runId: string) => boolean;
    createAbortController: (runId?: string) => AbortController | null;
    abortRunControllers: (runId: string) => void;
    clearRunControllers: (runId: string) => void;
    init: () => void;
    addProgress: (message: string, type?: 'system' | 'error') => void;
    loadReportsList: () => Promise<void>;
    handleSaveSettings: (newSettings: Settings) => void;
    handleAsideMouseDown: (e: ReactMouseEvent) => void;
    runAnalysisPipeline: (plans: AnalysisPlan[], data: CsvData, options?: { isChatRequest?: boolean; runId?: string }) => Promise<AnalysisCardData[]>;
    handleInitialAnalysis: (dataForAnalysis: CsvData, options?: { runId?: string }) => Promise<void>;
    handleFileUpload: (file: File) => Promise<void>;
    regenerateAnalyses: (newData: CsvData) => Promise<void>;
    executeDomAction: (action: DomAction) => void;
    handleChatMessage: (message: string) => Promise<void>;
    handleClarificationResponse: (clarificationId: string, userChoice: ClarificationOption) => Promise<void>;
    skipClarification: (clarificationId: string) => void;
    handleNaturalLanguageQuery: (query: string) => Promise<void>;
    clearAiFilter: () => void;
    cancelAiFilterRequest: () => void;
    addToast: (message: string, type?: 'info' | 'success' | 'error', duration?: number) => string;
    dismissToast: (toastId: string) => void;
    handleChartTypeChange: (cardId: string, newType: ChartType) => void;
    handleToggleDataVisibility: (cardId: string) => void;
    handleTopNChange: (cardId: string, topN: number | null) => void;
    handleHideOthersChange: (cardId: string, hide: boolean) => void;
    handleToggleLegendLabel: (cardId: string, label: string) => void;
    handleLoadReport: (id: string) => Promise<void>;
    handleDeleteReport: (id: string) => Promise<void>;
    handleShowCardFromChat: (cardId: string) => void;
    handleNewSession: () => Promise<void>;
    focusDataPreview: () => void;
    // Simple setters
    setIsAsideVisible: (isVisible: boolean) => void;
    setAsideWidth: (width: number) => void;
    setIsSpreadsheetVisible: (isVisible: boolean) => void;
    setIsDataPrepDebugVisible: (isVisible: boolean) => void;
    setIsSettingsModalOpen: (isOpen: boolean) => void;
    setIsHistoryPanelOpen: (isOpen: boolean) => void;
    setIsMemoryPanelOpen: (isOpen: boolean) => void;
    setIsResizing: (isResizing: boolean) => void;
}

export const useAppStore = create<StoreState & StoreActions>((set, get) => {
    const registerClarification = (clarificationPayload: ClarificationRequestPayload): ClarificationRequest => {
        const newClarification: ClarificationRequest = {
            ...clarificationPayload,
            id: createClarificationId(),
            status: 'pending',
        };
        set(state => ({
            pendingClarifications: [...state.pendingClarifications, newClarification],
            activeClarificationId: newClarification.id,
        }));
        return newClarification;
    };

    const updateClarificationStatus = (clarificationId: string, status: ClarificationStatus) => {
        const existingClarifications = get().pendingClarifications;
        if (!existingClarifications.some(req => req.id === clarificationId)) return;
        set(state => {
            const updatedClarifications = state.pendingClarifications.map(req =>
                req.id === clarificationId ? { ...req, status } : req
            );
            const nextActive =
                status === 'pending' || status === 'resolving'
                    ? clarificationId
                    : getNextAwaitingClarificationId(updatedClarifications);
            return {
                pendingClarifications: updatedClarifications,
                activeClarificationId: nextActive,
            };
        });
    };

    const getRunSignal = (runId?: string) => (runId ? get().createAbortController(runId)?.signal : undefined);

    const runPlanWithChatLifecycle = async (plan: AnalysisPlan, data: CsvData, runId?: string): Promise<AnalysisCardData[]> => {
        if (runId && get().isRunCancellationRequested(runId)) return [];
        const planTitle = plan.title ?? 'your requested chart';
        const planStartMessage: ChatMessage = {
            sender: 'ai',
            text: `Okay, creating a chart for "${planTitle}".`,
            timestamp: new Date(),
            type: 'ai_plan_start',
        };
        set(prev => ({ chatHistory: [...prev.chatHistory, planStartMessage] }));

        const createdCards = await get().runAnalysisPipeline([plan], data, { isChatRequest: true, runId });

        if (createdCards.length > 0) {
            const cardSummary = createdCards[0].summary.split('---')[0].trim();
            const completionMessage: ChatMessage = {
                sender: 'ai',
                text: `Created the chart for "${planTitle}". Here's what I observed:\n${cardSummary}`,
                timestamp: new Date(),
                type: 'ai_message',
                cardId: createdCards[0].id,
            };
            set(prev => ({ chatHistory: [...prev.chatHistory, completionMessage] }));
        }

        return createdCards;
    };

    return {
        ...initialAppState,
        busyRunId: null,
        isCancellationRequested: false,
        aiFilterRunId: null,
        abortControllers: {},
        isAsideVisible: true,
        asideWidth: window.innerWidth / 4 > MIN_ASIDE_WIDTH ? window.innerWidth / 4 : MIN_ASIDE_WIDTH,
        isSpreadsheetVisible: true,
        isDataPrepDebugVisible: false,
        isSettingsModalOpen: false,
        isHistoryPanelOpen: false,
        isMemoryPanelOpen: false,
        isAiFiltering: false,
        settings: getSettings(),
        reportsList: [],
        isResizing: false,
        isApiKeySet: (() => {
            const settings = getSettings();
            if (settings.provider === 'google') {
                return !!settings.geminiApiKey;
            }
            return !!settings.openAIApiKey;
        })(),
        beginBusy: (message, options) => {
            const runId = createRunId();
            set({
                isBusy: true,
                busyMessage: message,
                canCancelBusy: !!options?.cancellable,
                busyRunId: runId,
                isCancellationRequested: false,
            });
            return runId;
        },
        updateBusyStatus: (message) => {
            if (!get().isBusy) return;
            set({ busyMessage: message });
        },
        endBusy: (runId) => {
            const activeRunId = get().busyRunId;
            if (runId && activeRunId && activeRunId !== runId) return;
            set({
                isBusy: false,
                busyMessage: null,
                canCancelBusy: false,
                busyRunId: null,
                isCancellationRequested: false,
            });
            const targetRunId = runId ?? activeRunId;
            if (targetRunId) {
                get().clearRunControllers(targetRunId);
            }
        },
        requestBusyCancel: () => {
            if (!get().busyRunId || get().isCancellationRequested) return;
            set({ isCancellationRequested: true, canCancelBusy: false });
            get().addProgress('Cancelling current request...');
            const activeRunId = get().busyRunId;
            if (activeRunId) {
                get().abortRunControllers(activeRunId);
            }
        },
        isBusyRunActive: (runId) => get().busyRunId === runId,
        isRunCancellationRequested: (runId) =>
            get().isCancellationRequested && get().busyRunId === runId,
        createAbortController: (runId) => {
            if (!runId) return null;
            const controller = new AbortController();
            set(state => ({
                abortControllers: {
                    ...state.abortControllers,
                    [runId]: [...(state.abortControllers[runId] ?? []), controller],
                },
            }));
            return controller;
        },
        abortRunControllers: (runId) => {
            set(state => {
                const controllers = state.abortControllers[runId];
                controllers?.forEach(controller => {
                    if (!controller.signal.aborted) {
                        controller.abort();
                    }
                });
                if (!controllers) return {};
                const next = { ...state.abortControllers };
                delete next[runId];
                return { abortControllers: next };
            });
        },
        clearRunControllers: (runId) => {
            set(state => {
                if (!state.abortControllers[runId]) return {};
                const next = { ...state.abortControllers };
                delete next[runId];
                return { abortControllers: next };
            });
        },
        addToast: (message, type = 'info', duration = 4000) => {
            const id = createToastId();
            set(state => ({
                toasts: [...state.toasts, { id, message, type }],
            }));
            if (duration > 0) {
                setTimeout(() => {
                    get().dismissToast(id);
                }, duration);
            }
            return id;
        },
        dismissToast: (toastId) => {
            set(state => ({
                toasts: state.toasts.filter(t => t.id !== toastId),
            }));
        },

    init: async () => {
        const currentSession = await getReport(CURRENT_SESSION_KEY);
        if (currentSession) {
            set({
                ...initialAppState,
                ...currentSession.appState,
                isBusy: false,
                busyMessage: null,
                canCancelBusy: false,
                busyRunId: null,
                isCancellationRequested: false,
                aiFilterRunId: null,
                abortControllers: {},
                toasts: [],
                currentView: currentSession.appState.csvData ? 'analysis_dashboard' : 'file_upload',
                pendingClarifications: currentSession.appState.pendingClarifications ?? [],
                activeClarificationId: currentSession.appState.activeClarificationId ?? null,
            });
            if (currentSession.appState.vectorStoreDocuments && vectorStore.getIsInitialized()) {
                vectorStore.rehydrate(currentSession.appState.vectorStoreDocuments);
                get().addProgress('Restored AI long-term memory from last session.');
            }
        }
        await get().loadReportsList();
    },

    // FIX: Explicitly type the 'type' parameter to match the ProgressMessage interface.
    addProgress: (message: string, type: 'system' | 'error' = 'system') => {
        const newMessage: ProgressMessage = { text: message, type, timestamp: new Date() };
        set(state => ({ progressMessages: [...state.progressMessages, newMessage] }));
    },
    
    loadReportsList: async () => {
        const list = await getReportsList();
        set({ reportsList: list });
    },

    handleSaveSettings: (newSettings) => {
        saveSettings(newSettings);
        const isSet = newSettings.provider === 'google'
            ? !!newSettings.geminiApiKey
            : !!newSettings.openAIApiKey;
        set({ 
            settings: newSettings,
            isApiKeySet: isSet,
        });
    },

    handleAsideMouseDown: (e) => {
        e.preventDefault();
        get().setIsResizing(true);
        const handleMouseMove = (moveEvent: MouseEvent) => {
            const maxAllowedAsideWidth = window.innerWidth - MIN_MAIN_WIDTH;
            let newWidth = window.innerWidth - moveEvent.clientX;
            newWidth = Math.max(MIN_ASIDE_WIDTH, newWidth);
            newWidth = Math.min(MAX_ASIDE_WIDTH, newWidth, maxAllowedAsideWidth);
            get().setAsideWidth(newWidth);
        };
        const handleMouseUp = () => {
            get().setIsResizing(false);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    },
    
    runAnalysisPipeline: async (plans, data, options = {}) => {
        const { isChatRequest = false, runId } = options;
        const addProgress = get().addProgress;
        const settings = get().settings;
        const shouldAbort = () => (runId ? get().isRunCancellationRequested(runId) : false);
        const requestSignal = () => getRunSignal(runId);
        let isFirstCardInPipeline = true;

        const processPlan = async (plan: AnalysisPlan) => {
            if (shouldAbort()) return null;
            try {
                addProgress(`Executing plan: ${plan.title}...`);
                if (runId) get().updateBusyStatus(`Executing "${plan.title}"...`);

                const aggregatedData = executePlan(data, plan);
                if (aggregatedData.length === 0) {
                    addProgress(`Skipping "${plan.title}" due to empty result.`, 'error');
                    return null;
                }

                if (shouldAbort()) return null;

                addProgress(`AI is summarizing: ${plan.title}...`);
                if (runId) get().updateBusyStatus(`Summarizing "${plan.title}"...`);
                const summary = await generateSummary(plan.title, aggregatedData, settings, { signal: requestSignal() });

                if (shouldAbort()) return null;

                const categoryCount = aggregatedData.length;
                const shouldApplyDefaultTop8 = plan.chartType !== 'scatter' && categoryCount > 15;

                const newCard: AnalysisCardData = {
                    id: `card-${Date.now()}-${Math.random()}`,
                    plan,
                    aggregatedData,
                    summary,
                    displayChartType: plan.chartType,
                    isDataVisible: false,
                    topN: shouldApplyDefaultTop8 ? 8 : (plan.defaultTopN || null),
                    hideOthers: shouldApplyDefaultTop8 ? true : (plan.defaultHideOthers || false),
                    disableAnimation: isChatRequest || !isFirstCardInPipeline || get().analysisCards.length > 0,
                    hiddenLabels: [],
                };

                set(prev => ({ analysisCards: [...prev.analysisCards, newCard] }));

                const cardMemoryText = `[Chart: ${plan.title}] Description: ${plan.description}. AI Summary: ${summary.split('---')[0]}`;
                await vectorStore.addDocument({ id: newCard.id, text: cardMemoryText });
                addProgress(`View #${newCard.id.slice(-6)} indexed for long-term memory.`);

                isFirstCardInPipeline = false;
                addProgress(`Saved as View #${newCard.id.slice(-6)}`);
                return newCard;
            } catch (error) {
                if (shouldAbort()) {
                    addProgress(`Cancelled "${plan.title}" before completion.`);
                    return null;
                }
                console.error('Error executing plan:', plan.title, error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                addProgress(`Error executing plan "${plan.title}": ${errorMessage}`, 'error');
                return null;
            }
        };

        const createdCards = (await Promise.all(plans.map(processPlan))).filter((c): c is AnalysisCardData => c !== null);

        if (!isChatRequest && createdCards.length > 0 && !shouldAbort()) {
            addProgress('AI is forming its core understanding of the data...');
            if (runId) get().updateBusyStatus('Forming core understanding...');

            const cardContext: CardContext[] = createdCards.map(c => ({
                id: c.id,
                title: c.plan.title,
                aggregatedDataSample: c.aggregatedData.slice(0, 10),
            }));

            const coreSummary = await generateCoreAnalysisSummary(cardContext, get().columnProfiles, settings, { signal: requestSignal() });
            if (shouldAbort()) return createdCards;

            const thinkingMessage: ChatMessage = { sender: 'ai', text: coreSummary, timestamp: new Date(), type: 'ai_thinking' };
            set(prev => ({
                aiCoreAnalysisSummary: coreSummary,
                chatHistory: [...prev.chatHistory, thinkingMessage],
            }));

            addProgress("Indexing core analysis for long-term memory...");
            await vectorStore.addDocument({ id: 'core-summary', text: `Core Analysis Summary: ${coreSummary}` });
            addProgress("Core analysis indexed.");

            if (shouldAbort()) return createdCards;

            addProgress('AI is looking for key insights...');
            if (runId) get().updateBusyStatus('Looking for key insights...');
            const proactiveInsight = await generateProactiveInsights(cardContext, settings, { signal: requestSignal() });

            if (shouldAbort()) return createdCards;

            if (proactiveInsight) {
                const insightMessage: ChatMessage = {
                    sender: 'ai',
                    text: proactiveInsight.insight,
                    timestamp: new Date(),
                    type: 'ai_proactive_insight',
                    cardId: proactiveInsight.cardId,
                };
                set(prev => ({ chatHistory: [...prev.chatHistory, insightMessage] }));
                addProgress(`AI proactively identified an insight in View #${proactiveInsight.cardId.slice(-6)}.`);
            }

            if (shouldAbort()) return createdCards;

            const finalSummaryText = await generateFinalSummary(createdCards, settings, { signal: requestSignal() });
            if (shouldAbort()) return createdCards;

            set({ finalSummary: finalSummaryText });
            addProgress('Overall summary generated.');
        }
        return createdCards;
    },
    
    handleInitialAnalysis: async (dataForAnalysis, options = {}) => {
        if (!dataForAnalysis) return;
        const { runId: providedRunId } = options;
        const runId = providedRunId ?? get().beginBusy('Running analysis...', { cancellable: true });
        get().addProgress('Starting main analysis...');

        try {
            get().addProgress('AI is generating analysis plans...');
            get().updateBusyStatus('Drafting analysis plans...');
            const plans = await generateAnalysisPlans(
                get().columnProfiles,
                dataForAnalysis.data.slice(0, 5),
                get().settings,
                { signal: getRunSignal(runId) }
            );

            if (runId && get().isRunCancellationRequested(runId)) {
                get().addProgress('Analysis cancelled before execution.');
                return;
            }

            get().addProgress(`AI proposed ${plans.length} plans.`);
            
            if (plans.length > 0) {
                await get().runAnalysisPipeline(plans, dataForAnalysis, { runId });
            } else {
                get().addProgress('AI did not propose any analysis plans.', 'error');
            }
        } catch (error) {
            if (!(runId && get().isRunCancellationRequested(runId))) {
                console.error('Analysis pipeline error:', error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                get().addProgress(`Error during analysis: ${errorMessage}`, 'error');
            }
        } finally {
            if (!providedRunId) {
                get().endBusy(runId);
            }
            if (runId && get().isRunCancellationRequested(runId)) {
                get().addProgress('Stopped current analysis.');
            } else {
                get().addProgress('Analysis complete. Ready for chat.');
            }
        }
    },

    handleFileUpload: async (file) => {
        // Implementation moved from useApp hook
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
            ...initialAppState,
            csvData: { fileName: file.name, data: [] },
            busyRunId: null,
            isCancellationRequested: false,
            aiFilterRunId: null,
            abortControllers: {},
            toasts: [],
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
                    { signal: getRunSignal(runId) }
                );
                
                if (get().isRunCancellationRequested(runId)) {
                    get().addProgress('Upload cancelled during preparation.');
                    return;
                }
                
                if (prepPlan && prepPlan.jsFunctionBody) {
                    get().addProgress(`AI Plan: ${prepPlan.explanation}`);
                    get().addProgress('Executing AI data transformation...');
                    dataForAnalysis.data = executeJavaScriptDataTransform(dataForAnalysis.data, prepPlan.jsFunctionBody);
                    get().addProgress(`Transformation complete.`);
                } else {
                     get().addProgress('AI found no necessary data transformations.');
                }
                profiles = prepPlan.outputColumns;
                
                if (dataForAnalysis.data.length === 0) throw new Error('Dataset empty after transformation.');
                
                 set({ 
                    csvData: dataForAnalysis, 
                    columnProfiles: profiles,
                    dataPreparationPlan: prepPlan,
                    currentView: 'analysis_dashboard'
                });
                await get().handleInitialAnalysis(dataForAnalysis, { runId });
            } else {
                 get().addProgress(`API Key not set. Please add it in the settings.`, 'error');
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

    regenerateAnalyses: async (newData) => {
        get().addProgress('Data has changed. Regenerating all analysis cards...');
        set({ analysisCards: [], finalSummary: null });
        const runId = get().beginBusy('Regenerating insight cards...', { cancellable: true });
        
        try {
            const existingPlans = get().analysisCards.map(card => card.plan);
            if (existingPlans.length > 0) {
                const newCards = await get().runAnalysisPipeline(existingPlans, newData, { isChatRequest: true, runId });
                if (newCards.length > 0 && !(runId && get().isRunCancellationRequested(runId))) {
                    const newFinalSummary = await generateFinalSummary(newCards, get().settings, { signal: getRunSignal(runId) });
                    if (!(runId && get().isRunCancellationRequested(runId))) {
                        set({ finalSummary: newFinalSummary });
                        get().addProgress('All analysis cards have been updated.');
                    }
                }
            } else {
                get().addProgress('No existing plans found to regenerate.', 'error');
            }
        } catch (error) {
             if (!(runId && get().isRunCancellationRequested(runId))) {
                 console.error("Error regenerating analyses:", error);
                 const errorMessage = error instanceof Error ? error.message : String(error);
                 get().addProgress(`Error updating analyses: ${errorMessage}`, 'error');
             }
        } finally {
             get().endBusy(runId);
        }
    },
    
    executeDomAction: (action) => {
        // Implementation moved from useApp hook
        get().addProgress(`AI is performing action: ${action.toolName}...`);
        
        set(prev => {
            const newCards = [...prev.analysisCards];
            let cardUpdated = false;

            switch(action.toolName) {
                case 'highlightCard': {
                    const cardId = action.args.cardId;
                    const element = document.getElementById(cardId);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        element.classList.add('ring-4', 'ring-blue-500', 'transition-all', 'duration-500');
                        setTimeout(() => element.classList.remove('ring-4', 'ring-blue-500'), 2500);
                    }
                    break;
                }
                case 'changeCardChartType': {
                    const { cardId, newType } = action.args;
                    const cardIndex = newCards.findIndex(c => c.id === cardId);
                    if (cardIndex > -1) {
                        newCards[cardIndex].displayChartType = newType as ChartType;
                        cardUpdated = true;
                    }
                    break;
                }
                case 'showCardData': {
                     const { cardId, visible } = action.args;
                     const cardIndex = newCards.findIndex(c => c.id === cardId);
                     if (cardIndex > -1) {
                         newCards[cardIndex].isDataVisible = visible;
                         cardUpdated = true;
                     }
                     break;
                }
                 case 'filterCard': {
                    const { cardId, column, values } = action.args;
                    const cardIndex = newCards.findIndex(c => c.id === cardId);
                    if (cardIndex > -1) {
                        newCards[cardIndex].filter = values.length > 0 ? { column, values } : undefined;
                        cardUpdated = true;
                    }
                    break;
                }
            }
            if (cardUpdated) return { analysisCards: newCards };
            return {};
        });
    },

    handleChatMessage: async (message) => {
        if (!get().isApiKeySet) {
            get().addProgress('API Key not set.', 'error');
            get().setIsSettingsModalOpen(true);
            return;
        }

        const runId = get().beginBusy('Working on your request...', { cancellable: true });
        const newChatMessage: ChatMessage = { sender: 'user', text: message, timestamp: new Date(), type: 'user_message' };
        set(prev => ({ chatHistory: [...prev.chatHistory, newChatMessage] }));

        try {
            const cardContext: CardContext[] = get().analysisCards.map(c => ({
                id: c.id, title: c.plan.title, aggregatedDataSample: c.aggregatedData.slice(0, 100),
            }));
            get().updateBusyStatus('Thinking through your question...');
            const response = await generateChatResponse(
                get().columnProfiles, 
                get().chatHistory, 
                message, 
                cardContext, 
                get().settings,
                get().aiCoreAnalysisSummary, 
                get().currentView,
                (get().csvData?.data || []).slice(0, 20), 
                [], 
                get().dataPreparationPlan,
                { signal: getRunSignal(runId) }
            );

            if (get().isRunCancellationRequested(runId)) {
                get().addProgress('Stopped processing request.');
                return;
            }
            
            for (const action of response.actions) {
                if (get().isRunCancellationRequested(runId)) {
                    get().addProgress('Cancelled remaining actions.');
                    return;
                }

                if (action.thought) get().addProgress(`AI Thought: ${action.thought}`);
                switch (action.responseType) {
                    case 'text_response':
                        if (action.text) {
                            const aiMessage: ChatMessage = { sender: 'ai', text: action.text, timestamp: new Date(), type: 'ai_message', cardId: action.cardId };
                            set(prev => ({ chatHistory: [...prev.chatHistory, aiMessage] }));
                        }
                        break;
                    case 'plan_creation':
                        if (action.plan && get().csvData) {
                            await runPlanWithChatLifecycle(action.plan, get().csvData!, runId);
                        }
                        break;
                    case 'dom_action':
                        if (action.domAction) get().executeDomAction(action.domAction);
                        break;
                    case 'execute_js_code':
                        if (action.code?.jsFunctionBody && get().csvData) {
                            const newDataArray = executeJavaScriptDataTransform(get().csvData!.data, action.code!.jsFunctionBody);
                            const newData: CsvData = { ...get().csvData!, data: newDataArray };
                            set({ csvData: newData, columnProfiles: profileData(newData.data) });
                            await get().regenerateAnalyses(newData);
                        }
                        break;
                    case 'filter_spreadsheet':
                        if (action.args?.query) {
                            get().addProgress(`AI is filtering the data explorer based on your request.`);
                            await get().handleNaturalLanguageQuery(action.args.query);
                            set({ isSpreadsheetVisible: true });
                            setTimeout(() => {
                                document.getElementById('raw-data-explorer')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }, 100);
                        }
                        break;
                    case 'clarification_request':
                        if (action.clarification) {
                            const filteredClarification = filterClarificationOptions(
                                action.clarification,
                                get().csvData?.data,
                                get().columnProfiles.map(p => p.name)
                            );

                            if (!filteredClarification) {
                                const warning = 'I could not find any usable columns for that question. Try inspecting the data preview to pick a different column.';
                                get().addProgress(warning, 'error');
                                const aiMessage: ChatMessage = { 
                                    sender: 'ai', 
                                    text: `${warning}\nYou can also open the Data Preview to double-check column names.`,
                                    timestamp: new Date(), 
                                    type: 'ai_message', 
                                    isError: true,
                                    cta: {
                                        type: 'open_data_preview',
                                        label: 'Open Data Preview',
                                        helperText: 'Review the raw columns before asking again.',
                                    },
                                };
                                set(prev => ({ chatHistory: [...prev.chatHistory, aiMessage] }));
                                break;
                            }

                            const enrichedClarification = registerClarification(filteredClarification);

                            if (enrichedClarification.options.length === 1) {
                                const autoOption = enrichedClarification.options[0];
                                get().addProgress(`AI inferred you meant "${autoOption.label}" (${autoOption.value}).`);
                                await get().handleClarificationResponse(enrichedClarification.id, autoOption);
                                break;
                            }

                            const clarificationMessage: ChatMessage = {
                                sender: 'ai',
                                text: enrichedClarification.question,
                                timestamp: new Date(),
                                type: 'ai_clarification',
                                clarificationRequest: enrichedClarification,
                            };
                            set(prev => ({
                                chatHistory: [...prev.chatHistory, clarificationMessage]
                            }));
                            set({ activeClarificationId: enrichedClarification.id });
                            get().endBusy(runId);
                            return; 
                        }
                        break;
                }
            }
        } catch(error) {
            if (!get().isRunCancellationRequested(runId)) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                get().addProgress(`Error: ${errorMessage}`, 'error');
                const aiMessage: ChatMessage = { sender: 'ai', text: `Sorry, an error occurred: ${errorMessage}`, timestamp: new Date(), type: 'ai_message', isError: true };
                set(prev => ({ chatHistory: [...prev.chatHistory, aiMessage] }));
            }
        } finally {
            if (!get().pendingClarifications.some(req => req.status === 'pending' || req.status === 'resolving')) {
                get().endBusy(runId);
            }
        }
    },

    handleClarificationResponse: async (clarificationId, userChoice) => {
        const { csvData, columnProfiles } = get();
        const targetClarification = get().pendingClarifications.find(req => req.id === clarificationId && req.status === 'pending');
        if (!targetClarification || !csvData) return;
    
        const userResponseMessage: ChatMessage = {
            sender: 'user',
            text: `Selected: ${userChoice.label}`,
            timestamp: new Date(),
            type: 'user_message',
        };
        set(prev => ({
            chatHistory: [...prev.chatHistory, userResponseMessage],
        }));
        const runId = get().beginBusy('Applying clarification...', { cancellable: true });
        updateClarificationStatus(clarificationId, 'resolving');
    
        try {
            const { pendingPlan, targetProperty } = targetClarification;

            const availableColumns = columnProfiles.map(p => p.name);
            const resolvedValue = resolveColumnChoice(userChoice, targetProperty, availableColumns);

            if (COLUMN_TARGET_PROPERTIES.includes(targetProperty) && (!resolvedValue || !availableColumns.includes(resolvedValue))) {
                const friendlyError = `I couldn't find a column matching "${userChoice.label}". Please pick another option so I know which column to use.`;
                get().addProgress(friendlyError, 'error');
                const aiErrorMessage: ChatMessage = { sender: 'ai', text: friendlyError, timestamp: new Date(), type: 'ai_message', isError: true };
                set(prev => ({
                    chatHistory: [...prev.chatHistory, aiErrorMessage],
                }));
                updateClarificationStatus(clarificationId, 'pending');
                get().endBusy(runId);
                return;
            }
            
            const requiresCategorical = targetProperty === 'groupByColumn';
            const hasUsableData = requiresCategorical
                ? columnHasUsableData(resolvedValue!, csvData.data, 2, 50)
                : columnHasUsableData(resolvedValue!, csvData.data);

            if (COLUMN_TARGET_PROPERTIES.includes(targetProperty) && resolvedValue && !hasUsableData) {
                const friendlyError = requiresCategorical
                    ? `The column "${resolvedValue}" doesn't look like a good grouping (not enough distinct categories). Please pick another option.`
                    : `Looks like "${resolvedValue}" does not contain data right now. Please pick another option or ask about a different metric.`;
                get().addProgress(friendlyError, 'error');
                const aiErrorMessage: ChatMessage = { sender: 'ai', text: friendlyError, timestamp: new Date(), type: 'ai_message', isError: true };
                set(prev => ({
                    chatHistory: [...prev.chatHistory, aiErrorMessage],
                }));
                updateClarificationStatus(clarificationId, 'pending');
                get().endBusy(runId);
                return;
            }
            
            const basePlan = {
                ...pendingPlan,
                [targetProperty]: resolvedValue ?? userChoice.value,
            } as AnalysisPlan;
            const completedPlan = applyFriendlyPlanCopy(basePlan, columnProfiles);
            
            // Make the plan more robust by adding defaults if the AI omits them.
            if (!completedPlan.aggregation) {
                completedPlan.aggregation = completedPlan.valueColumn ? 'sum' : 'count';
            }
            if (!completedPlan.chartType) {
                completedPlan.chartType = 'bar';
            }

            // Clean up extraneous properties based on chart type to prevent conflicts.
            if (completedPlan.chartType !== 'scatter') {
                delete (completedPlan as any).xValueColumn;
                delete (completedPlan as any).yValueColumn;
            }
            if (completedPlan.chartType !== 'combo') {
                delete (completedPlan as any).secondaryValueColumn;
                delete (completedPlan as any).secondaryAggregation;
            }

            // If groupByColumn is still missing for a non-scatter chart, try to infer it.
           if (!completedPlan.groupByColumn && completedPlan.chartType !== 'scatter') {
               const { columnProfiles } = get();
               const allColumnNames = columnProfiles.map(p => p.name);
               let inferredGroupBy: string | null = null;
    
                // New, smarter inference: Try to find a column name mentioned in the user's selected label.
                // e.g., label "Best Product Category by Revenue" contains column "Product Category"
                // We sort column names by length descending to match longer names first (e.g., "Product Category" before "Product").
                const sortedColumnNames = [...allColumnNames].sort((a, b) => b.length - a.length);
    
                for (const colName of sortedColumnNames) {
                    // Prepare for case-insensitive comparison, also handle underscores vs spaces.
                    const formattedColName = colName.toLowerCase().replace(/_/g, ' ');
                    if (userChoice.label.toLowerCase().includes(formattedColName)) {
                        inferredGroupBy = colName;
                        break; // Found the best match, use it.
                    }
                }
    
                if (inferredGroupBy) {
                    completedPlan.groupByColumn = inferredGroupBy;
                    get().addProgress(`AI inferred grouping by "${inferredGroupBy}" based on your selection.`);
                } else {
                    // Original fallback logic if the new inference fails.
                    const suitableColumns = columnProfiles.filter(p => 
                        p.type === 'categorical' && 
                        (p.uniqueValues || 0) < csvData.data.length && 
                        (p.uniqueValues || 0) > 1
                    );
    
                    if (suitableColumns.length > 0) {
                        // Heuristic: pick the one with the fewest unique values (but more than 1).
                        suitableColumns.sort((a, b) => (a.uniqueValues || Infinity) - (b.uniqueValues || Infinity));
                        completedPlan.groupByColumn = suitableColumns[0].name;
                        get().addProgress(`AI inferred grouping by "${suitableColumns[0].name}" as a fallback.`);
                    }
                }
            }


            if (!completedPlan.title) completedPlan.title = `Analysis of ${userChoice.label}`;
            if (!completedPlan.description) completedPlan.description = `A chart showing an analysis of ${userChoice.label}.`;
    
            if (completedPlan.chartType !== 'scatter' && (!completedPlan.chartType || !completedPlan.groupByColumn || !completedPlan.aggregation)) {
                 const missingFields = ['chartType', 'groupByColumn', 'aggregation'].filter(f => !(completedPlan as any)[f]);
                 throw new Error(`The clarified plan is still missing required fields like ${missingFields.join(', ')}.`);
            }
    
            await runPlanWithChatLifecycle(completedPlan, csvData, runId);
            updateClarificationStatus(clarificationId, 'resolved');
    
        } catch (error) {
            if (!get().isRunCancellationRequested(runId)) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                get().addProgress(`Error processing clarification: ${errorMessage}`, 'error');
                const aiMessage: ChatMessage = { sender: 'ai', text: `Sorry, an error occurred while creating the chart: ${errorMessage}`, timestamp: new Date(), type: 'ai_message', isError: true };
                set(prev => ({ chatHistory: [...prev.chatHistory, aiMessage] }));
                updateClarificationStatus(clarificationId, 'pending');
            }
        } finally {
            get().endBusy(runId);
        }
    },

    skipClarification: (clarificationId) => {
        const targetClarification = get().pendingClarifications.find(
            req => req.id === clarificationId && req.status === 'pending'
        );
        if (!targetClarification) return;
        const userResponseMessage: ChatMessage = {
            sender: 'user',
            text: `Skipped: ${targetClarification.question}`,
            timestamp: new Date(),
            type: 'user_message',
        };
        const aiMessage: ChatMessage = {
            sender: 'ai',
            text: 'No problem—I cancelled that request. Ask me something else whenever you are ready.',
            timestamp: new Date(),
            type: 'ai_message',
        };
        updateClarificationStatus(clarificationId, 'skipped');
        set(prev => ({
            chatHistory: [...prev.chatHistory, userResponseMessage, aiMessage],
        }));
        get().endBusy();
    },

    handleNaturalLanguageQuery: async (query) => {
        if (!get().isApiKeySet || !get().csvData) {
            get().addProgress('Cannot perform AI query: API Key is not set or no data is loaded.', 'error');
            return;
        }

        const existingRunId = get().aiFilterRunId;
        if (existingRunId) {
            get().abortRunControllers(existingRunId);
        }

        const runId = createRunId();
        set({
            isAiFiltering: true,
            aiFilterRunId: runId,
            spreadsheetFilterFunction: null,
            aiFilterExplanation: null
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
            set(state => state.aiFilterRunId === runId
                ? { isAiFiltering: false, aiFilterRunId: null }
                : {});
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
    
    handleChartTypeChange: (cardId, newType) => {
        set(state => ({
            analysisCards: state.analysisCards.map(c => c.id === cardId ? {...c, displayChartType: newType} : c)
        }));
    },
    
    handleToggleDataVisibility: (cardId) => {
        set(state => ({
            analysisCards: state.analysisCards.map(c => c.id === cardId ? {...c, isDataVisible: !c.isDataVisible} : c)
        }));
    },
    
    handleTopNChange: (cardId, topN) => {
        set(state => ({
            analysisCards: state.analysisCards.map(c => c.id === cardId ? {...c, topN: topN} : c)
        }));
    },
    
    handleHideOthersChange: (cardId, hide) => {
        set(state => ({
            analysisCards: state.analysisCards.map(c => c.id === cardId ? {...c, hideOthers: hide} : c)
        }));
    },
    
    handleToggleLegendLabel: (cardId, label) => {
        set(state => ({
            analysisCards: state.analysisCards.map(c => {
                if (c.id === cardId) {
                    const currentHidden = c.hiddenLabels || [];
                    const newHidden = currentHidden.includes(label) ? currentHidden.filter(l => l !== label) : [...currentHidden, label];
                    return { ...c, hiddenLabels: newHidden };
                }
                return c;
            })
        }));
    },

    handleLoadReport: async (id) => {
        get().addProgress(`Loading report ${id}...`);
        const report = await getReport(id);
        if (report) {
            vectorStore.clear();
            set({ ...report.appState, currentView: 'analysis_dashboard', isHistoryPanelOpen: false });
            if (report.appState.vectorStoreDocuments) {
                vectorStore.rehydrate(report.appState.vectorStoreDocuments);
            }
            get().addProgress(`Report "${report.filename}" loaded.`);
        } else {
            get().addProgress(`Failed to load report ${id}.`, 'error');
        }
    },

    handleDeleteReport: async (id) => {
        await deleteReport(id);
        await get().loadReportsList();
    },
    
    handleShowCardFromChat: (cardId) => {
        const element = document.getElementById(cardId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('ring-4', 'ring-blue-500', 'transition-all', 'duration-500');
            setTimeout(() => element.classList.remove('ring-4', 'ring-blue-500'), 2500);
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
        set({ ...initialAppState, busyRunId: null, isCancellationRequested: false, aiFilterRunId: null, abortControllers: {}, toasts: [] });
        await get().loadReportsList();
    },

    // Simple setters
    setIsAsideVisible: (isVisible) => set({ isAsideVisible: isVisible }),
    setAsideWidth: (width) => set({ asideWidth: width }),
    setIsSpreadsheetVisible: (isVisible) => set({ isSpreadsheetVisible: isVisible }),
    setIsDataPrepDebugVisible: (isVisible) => set({ isDataPrepDebugVisible: isVisible }),
    setIsSettingsModalOpen: (isOpen) => set({ isSettingsModalOpen: isOpen }),
    setIsHistoryPanelOpen: (isOpen) => set({ isHistoryPanelOpen: isOpen }),
    setIsMemoryPanelOpen: (isOpen) => set({ isMemoryPanelOpen: isOpen }),
    setIsResizing: (isResizing) => set({ isResizing: isResizing }),
    focusDataPreview: () => {
        set({ isSpreadsheetVisible: true });
        setTimeout(() => {
            document.getElementById('raw-data-explorer')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    },
};
});

// Auto-save current session to IndexedDB periodically
setInterval(async () => {
    const state = useAppStore.getState();
    if (state.csvData && state.csvData.data.length > 0) {
        // Fix: Only include serializable state properties in the report.
        // This prevents a "DataCloneError" by excluding functions (actions) from the saved object.
        const stateToSave: AppState = {
            currentView: state.currentView,
            isBusy: state.isBusy,
            busyMessage: state.busyMessage,
            canCancelBusy: state.canCancelBusy,
            progressMessages: state.progressMessages,
            csvData: state.csvData,
            columnProfiles: state.columnProfiles,
            analysisCards: state.analysisCards,
            chatHistory: state.chatHistory,
            finalSummary: state.finalSummary,
            aiCoreAnalysisSummary: state.aiCoreAnalysisSummary,
            dataPreparationPlan: state.dataPreparationPlan,
            initialDataSample: state.initialDataSample,
            vectorStoreDocuments: vectorStore.getDocuments(),
            spreadsheetFilterFunction: state.spreadsheetFilterFunction,
            aiFilterExplanation: state.aiFilterExplanation,
            pendingClarifications: state.pendingClarifications,
            activeClarificationId: state.activeClarificationId,
            toasts: [],
        };

        const currentReport: Report = {
            id: CURRENT_SESSION_KEY,
            filename: state.csvData.fileName || 'Current Session',
            createdAt: (await getReport(CURRENT_SESSION_KEY))?.createdAt || new Date(),
            updatedAt: new Date(),
            appState: stateToSave,
        };
        await saveReport(currentReport);
    }
}, 2000);
