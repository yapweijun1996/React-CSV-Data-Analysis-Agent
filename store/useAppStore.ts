import { create } from 'zustand';
// Fix: Import MouseEvent from React and alias it to resolve the type error.
import type { MouseEvent as ReactMouseEvent } from 'react';
import { AnalysisCardData, ChatMessage, ProgressMessage, CsvData, AnalysisPlan, AppState, CardContext, ChartType, DomAction, Settings, Report, ReportListItem, ClarificationRequest, ClarificationRequestPayload, ClarificationStatus, ColumnProfile, AgentActionStatus } from '../types';
import { executePlan } from '../utils/dataProcessor';
import { generateAnalysisPlans, generateSummary, generateFinalSummary, generateCoreAnalysisSummary, generateProactiveInsights } from '../services/aiService';
import { getReportsList, saveReport, getReport, deleteReport, getSettings, saveSettings, CURRENT_SESSION_KEY } from '../storageService';
import { vectorStore } from '../services/vectorStore';
import { runWithBusyState } from '../utils/runWithBusy';
import { preparePlanForExecution } from '../utils/planValidation';
import { buildColumnAliasMap } from '../utils/columnAliases';
import type { StoreActions, StoreState } from './appStoreTypes';
import { createChatSlice } from './slices/chatSlice';
import { createFileUploadSlice } from './slices/fileUploadSlice';
import { createAiFilterSlice } from './slices/aiFilterSlice';

const createClarificationId = () =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `clar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createRunId = () => `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const createToastId = () => `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const getNextAwaitingClarificationId = (clarifications: ClarificationRequest[]): string | null =>
    clarifications.find(c => c.status === 'pending')?.id ?? null;

const MIN_ASIDE_WIDTH = 320;
const MAX_ASIDE_WIDTH = 800;
const MIN_MAIN_WIDTH = 600;

const MAX_AGENT_TRACE_HISTORY = 40;

const deriveAliasMap = (profiles: ColumnProfile[] = []) => buildColumnAliasMap(profiles.map(p => p.name));

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
    agentActionTraces: [],
    columnAliasMap: {},
};

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

    const chatSlice = createChatSlice(set, get, {
        registerClarification,
        updateClarificationStatus,
        getRunSignal,
        runPlanWithChatLifecycle,
    });
    const fileUploadSlice = createFileUploadSlice(set, get, { initialAppState });
    const aiFilterSlice = createAiFilterSlice(set, get, { createRunId });

    return {
        ...initialAppState,
        ...chatSlice,
        ...fileUploadSlice,
        ...aiFilterSlice,
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
                agentActionTraces: currentSession.appState.agentActionTraces ?? [],
                chatMemoryPreview: [],
                chatMemoryExclusions: [],
                chatMemoryPreviewQuery: '',
                isMemoryPreviewLoading: false,
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
                const preparation = preparePlanForExecution(plan, get().columnProfiles, data.data);
                if (!preparation.isValid) {
                    addProgress(`Skipping "${plan.title}" because ${preparation.errorMessage ?? 'the plan is invalid.'}`, 'error');
                    return null;
                }
                preparation.warnings.forEach(warning => addProgress(`${plan.title}: ${warning}`));

                const preparedPlan = preparation.plan;
                const aggregatedData = executePlan(data, preparedPlan);
                if (aggregatedData.length === 0) {
                    addProgress(`Skipping "${plan.title}" due to empty result.`, 'error');
                    return null;
                }

                if (shouldAbort()) return null;

                addProgress(`AI is summarizing: ${plan.title}...`);
                if (runId) get().updateBusyStatus(`Summarizing "${plan.title}"...`);
                const summary = await generateSummary(preparedPlan.title, aggregatedData, settings, { signal: requestSignal() });

                if (shouldAbort()) return null;

                const categoryCount = aggregatedData.length;
                const shouldApplyDefaultTop8 = preparedPlan.chartType !== 'scatter' && categoryCount > 15;

                const newCard: AnalysisCardData = {
                    id: `card-${Date.now()}-${Math.random()}`,
                    plan: preparedPlan,
                    aggregatedData,
                    summary,
                    displayChartType: preparedPlan.chartType,
                    isDataVisible: false,
                    topN: shouldApplyDefaultTop8 ? 8 : (preparedPlan.defaultTopN || null),
                    hideOthers: shouldApplyDefaultTop8 ? true : (preparedPlan.defaultHideOthers || false),
                    disableAnimation: isChatRequest || !isFirstCardInPipeline || get().analysisCards.length > 0,
                    hiddenLabels: [],
                };

                set(prev => ({ analysisCards: [...prev.analysisCards, newCard] }));

                const cardMemoryText = `[Chart: ${preparedPlan.title}] Description: ${preparedPlan.description}. AI Summary: ${summary.split('---')[0]}`;
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
        await runWithBusyState(
            {
                beginBusy: get().beginBusy,
                endBusy: get().endBusy,
            },
            'Running analysis...',
            async (runId) => {
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
                    if (runId && get().isRunCancellationRequested(runId)) {
                        get().addProgress('Stopped current analysis.');
                    } else {
                        get().addProgress('Analysis complete. Ready for chat.');
                    }
                }
            },
            { runId: providedRunId, cancellable: true },
        );
    },

    regenerateAnalyses: async (newData) => {
        get().addProgress('Data has changed. Regenerating all analysis cards...');
        const existingPlans = get().analysisCards.map(card => card.plan);
        set({ analysisCards: [], finalSummary: null });

        await runWithBusyState(
            {
                beginBusy: get().beginBusy,
                endBusy: get().endBusy,
            },
            'Regenerating insight cards...',
            async (runId) => {
                try {
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
                        console.error('Error regenerating analyses:', error);
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        get().addProgress(`Error updating analyses: ${errorMessage}`, 'error');
                    }
                }
            },
            { cancellable: true },
        );
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
            set({ 
                ...report.appState, 
                currentView: 'analysis_dashboard', 
                isHistoryPanelOpen: false,
                chatMemoryPreview: [],
                chatMemoryExclusions: [],
                chatMemoryPreviewQuery: '',
                isMemoryPreviewLoading: false,
                agentActionTraces: report.appState.agentActionTraces ?? [],
            });
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

    // Simple setters
    setIsAsideVisible: (isVisible) => set({ isAsideVisible: isVisible }),
    setAsideWidth: (width) => set({ asideWidth: width }),
    setIsSpreadsheetVisible: (isVisible) => set({ isSpreadsheetVisible: isVisible }),
    setIsDataPrepDebugVisible: (isVisible) => set({ isDataPrepDebugVisible: isVisible }),
    setIsSettingsModalOpen: (isOpen) => set({ isSettingsModalOpen: isOpen }),
    setIsHistoryPanelOpen: (isOpen) => set({ isHistoryPanelOpen: isOpen }),
    setIsMemoryPanelOpen: (isOpen) => set({ isMemoryPanelOpen: isOpen }),
    setIsResizing: (isResizing) => set({ isResizing: isResizing }),
    beginAgentActionTrace: (actionType, summary) => {
        const traceId = `trace-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const newTrace = {
            id: traceId,
            actionType,
            status: 'observing' as AgentActionStatus,
            summary,
            timestamp: new Date(),
        };
        set(state => {
            const updated = [...state.agentActionTraces, newTrace];
            return { agentActionTraces: updated.slice(-MAX_AGENT_TRACE_HISTORY) };
        });
        return traceId;
    },
    updateAgentActionTrace: (traceId, status, details) => {
        set(state => ({
            agentActionTraces: state.agentActionTraces.map(trace =>
                trace.id === traceId ? { ...trace, status, details, timestamp: new Date() } : trace
            ),
        }));
    },
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
            agentActionTraces: state.agentActionTraces,
            columnAliasMap: state.columnAliasMap,
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
