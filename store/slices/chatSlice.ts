import type { GetState, SetState } from 'zustand';
import { executeJavaScriptDataTransform, profileData } from '../../utils/dataProcessor';
import { generateChatResponse } from '../../services/aiService';
import { vectorStore } from '../../services/vectorStore';
import { COLUMN_TARGET_PROPERTIES, columnHasUsableData, filterClarificationOptions, resolveColumnChoice } from '../../utils/clarification';
import { applyFriendlyPlanCopy } from '../../utils/planCopy';
import { runWithBusyState } from '../../utils/runWithBusy';
import type {
    AnalysisCardData,
    AnalysisPlan,
    CardContext,
    ChatMessage,
    ClarificationOption,
    ClarificationRequest,
    ClarificationRequestPayload,
    ClarificationStatus,
    CsvData,
    MemoryReference,
} from '../../types';
import type { AppStore, ChatSlice } from '../appStoreTypes';

interface ChatSliceDependencies {
    registerClarification: (clarification: ClarificationRequestPayload) => ClarificationRequest;
    updateClarificationStatus: (id: string, status: ClarificationStatus) => void;
    getRunSignal: (runId?: string) => AbortSignal | undefined;
    runPlanWithChatLifecycle: (plan: AnalysisPlan, data: CsvData, runId?: string) => Promise<AnalysisCardData[]>;
}

export const createChatSlice = (
    set: SetState<AppStore>,
    get: GetState<AppStore>,
    deps: ChatSliceDependencies,
): ChatSlice => ({
    chatMemoryPreview: [],
    chatMemoryExclusions: [],
    chatMemoryPreviewQuery: '',
    isMemoryPreviewLoading: false,

    handleChatMessage: async (message: string) => {
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
                id: c.id,
                title: c.plan.title,
                aggregatedDataSample: c.aggregatedData.slice(0, 100),
            }));
            const getSelectedMemories = (): MemoryReference[] => {
                const { chatMemoryPreview, chatMemoryExclusions } = get();
                return chatMemoryPreview.filter(mem => !chatMemoryExclusions.includes(mem.id));
            };
            let selectedMemories = getSelectedMemories();
            if (selectedMemories.length === 0 && vectorStore.getDocumentCount() > 0) {
                try {
                    selectedMemories = await vectorStore.search(message, 3, { signal: deps.getRunSignal(runId) });
                } catch (error) {
                    if (!(error instanceof DOMException && error.name === 'AbortError')) {
                        console.error('Fallback memory search failed:', error);
                    }
                }
            }
            const memorySnapshot = selectedMemories;
            const memoryPayload = selectedMemories.map(mem => mem.text);
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
                memoryPayload,
                get().dataPreparationPlan,
                { signal: deps.getRunSignal(runId) }
            );

            if (get().isRunCancellationRequested(runId)) {
                get().addProgress('Stopped processing request.');
                return;
            }

            let memoryTagAttached = false;
            for (const action of response.actions) {
                if (get().isRunCancellationRequested(runId)) {
                    get().addProgress('Cancelled remaining actions.');
                    return;
                }

                if (action.thought) get().addProgress(`AI Thought: ${action.thought}`);
                switch (action.responseType) {
                    case 'text_response':
                        if (action.text) {
                            const shouldAttachMemory = !memoryTagAttached && memorySnapshot.length > 0;
                            const aiMessage: ChatMessage = {
                                sender: 'ai',
                                text: action.text,
                                timestamp: new Date(),
                                type: 'ai_message',
                                cardId: action.cardId,
                                usedMemories: shouldAttachMemory ? memorySnapshot : undefined,
                            };
                            if (shouldAttachMemory) {
                                memoryTagAttached = true;
                            }
                            set(prev => ({ chatHistory: [...prev.chatHistory, aiMessage] }));
                        }
                        break;
                    case 'plan_creation':
                        if (action.plan && get().csvData) {
                            await deps.runPlanWithChatLifecycle(action.plan, get().csvData!, runId);
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
                            get().addProgress('AI is filtering the data explorer based on your request.');
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
                                const warning =
                                    'I could not find any usable columns for that question. Try inspecting the data preview to pick a different column.';
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

                            const enrichedClarification = deps.registerClarification(filteredClarification);

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
                                chatHistory: [...prev.chatHistory, clarificationMessage],
                            }));
                            set({ activeClarificationId: enrichedClarification.id });
                            get().endBusy(runId);
                            return;
                        }
                        break;
                }
            }
        } catch (error) {
            if (!get().isRunCancellationRequested(runId)) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                get().addProgress(`Error: ${errorMessage}`, 'error');
                const aiMessage: ChatMessage = {
                    sender: 'ai',
                    text: `Sorry, an error occurred: ${errorMessage}`,
                    timestamp: new Date(),
                    type: 'ai_message',
                    isError: true,
                };
                set(prev => ({ chatHistory: [...prev.chatHistory, aiMessage] }));
            }
        } finally {
            if (!get().pendingClarifications.some(req => req.status === 'pending' || req.status === 'resolving')) {
                get().endBusy(runId);
            }
            get().clearChatMemoryPreview();
        }
    },

    previewChatMemories: async (query: string) => {
        const trimmed = query.trim();
        if (!trimmed) {
            set({
                chatMemoryPreview: [],
                chatMemoryExclusions: [],
                chatMemoryPreviewQuery: '',
                isMemoryPreviewLoading: false,
            });
            return;
        }
        if (!vectorStore.getIsInitialized() || vectorStore.getDocumentCount() === 0) {
            set({
                chatMemoryPreview: [],
                chatMemoryExclusions: [],
                chatMemoryPreviewQuery: trimmed,
                isMemoryPreviewLoading: false,
            });
            return;
        }
        set({
            chatMemoryPreviewQuery: trimmed,
            isMemoryPreviewLoading: true,
        });
        try {
            const results = await vectorStore.search(trimmed, 3);
            if (get().chatMemoryPreviewQuery === trimmed) {
                set({
                    chatMemoryPreview: results,
                    chatMemoryExclusions: [],
                    isMemoryPreviewLoading: false,
                });
            }
        } catch (error) {
            console.error('Preview memory search failed:', error);
            if (get().chatMemoryPreviewQuery === trimmed) {
                set({ isMemoryPreviewLoading: false });
            }
        }
    },

    toggleMemoryPreviewSelection: (id: string) => {
        set(state => {
            const exists = state.chatMemoryExclusions.includes(id);
            return {
                chatMemoryExclusions: exists
                    ? state.chatMemoryExclusions.filter(memId => memId !== id)
                    : [...state.chatMemoryExclusions, id],
            };
        });
    },

    clearChatMemoryPreview: () => {
        set({
            chatMemoryPreview: [],
            chatMemoryExclusions: [],
            chatMemoryPreviewQuery: '',
            isMemoryPreviewLoading: false,
        });
    },

    handleClarificationResponse: async (clarificationId: string, userChoice: ClarificationOption) => {
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

        await runWithBusyState(
            {
                beginBusy: get().beginBusy,
                endBusy: get().endBusy,
            },
            'Applying clarification...',
            async (runId) => {
                try {
                    deps.updateClarificationStatus(clarificationId, 'resolving');
                    const { pendingPlan, targetProperty } = targetClarification;

                    const availableColumns = columnProfiles.map(p => p.name);
                    const resolvedValue = resolveColumnChoice(userChoice, targetProperty, availableColumns);

                    if (COLUMN_TARGET_PROPERTIES.includes(targetProperty) && (!resolvedValue || !availableColumns.includes(resolvedValue))) {
                        const friendlyError = `I couldn't find a column matching "${userChoice.label}". Please pick another option so I know which column to use.`;
                        get().addProgress(friendlyError, 'error');
                        const aiErrorMessage: ChatMessage = {
                            sender: 'ai',
                            text: friendlyError,
                            timestamp: new Date(),
                            type: 'ai_message',
                            isError: true,
                        };
                        set(prev => ({
                            chatHistory: [...prev.chatHistory, aiErrorMessage],
                        }));
                        deps.updateClarificationStatus(clarificationId, 'pending');
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
                        const aiErrorMessage: ChatMessage = {
                            sender: 'ai',
                            text: friendlyError,
                            timestamp: new Date(),
                            type: 'ai_message',
                            isError: true,
                        };
                        set(prev => ({
                            chatHistory: [...prev.chatHistory, aiErrorMessage],
                        }));
                        deps.updateClarificationStatus(clarificationId, 'pending');
                        return;
                    }

                    const basePlan = {
                        ...pendingPlan,
                        [targetProperty]: resolvedValue ?? userChoice.value,
                    } as AnalysisPlan;
                    const completedPlan = applyFriendlyPlanCopy(basePlan, columnProfiles);

                    if (!completedPlan.aggregation) {
                        completedPlan.aggregation = completedPlan.valueColumn ? 'sum' : 'count';
                    }
                    if (!completedPlan.chartType) {
                        completedPlan.chartType = 'bar';
                    }

                    if (completedPlan.chartType !== 'scatter') {
                        delete (completedPlan as any).xValueColumn;
                        delete (completedPlan as any).yValueColumn;
                    }
                    if (completedPlan.chartType !== 'combo') {
                        delete (completedPlan as any).secondaryValueColumn;
                        delete (completedPlan as any).secondaryAggregation;
                    }

                    if (!completedPlan.groupByColumn && completedPlan.chartType !== 'scatter') {
                        const allColumnNames = columnProfiles.map(p => p.name);
                        let inferredGroupBy: string | null = null;

                        const sortedColumnNames = [...allColumnNames].sort((a, b) => b.length - a.length);

                        for (const colName of sortedColumnNames) {
                            const formattedColName = colName.toLowerCase().replace(/_/g, ' ');
                            if (userChoice.label.toLowerCase().includes(formattedColName)) {
                                inferredGroupBy = colName;
                                break;
                            }
                        }

                        if (inferredGroupBy) {
                            completedPlan.groupByColumn = inferredGroupBy;
                            get().addProgress(`AI inferred grouping by "${inferredGroupBy}" based on your selection.`);
                        } else {
                            const suitableColumns = columnProfiles.filter(
                                p => p.type === 'categorical' && (p.uniqueValues || 0) < csvData.data.length && (p.uniqueValues || 0) > 1
                            );

                            if (suitableColumns.length > 0) {
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

                    await deps.runPlanWithChatLifecycle(completedPlan, csvData, runId);
                    deps.updateClarificationStatus(clarificationId, 'resolved');
                } catch (error) {
                    if (!get().isRunCancellationRequested(runId)) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        get().addProgress(`Error processing clarification: ${errorMessage}`, 'error');
                        const aiMessage: ChatMessage = {
                            sender: 'ai',
                            text: `Sorry, an error occurred while creating the chart: ${errorMessage}`,
                            timestamp: new Date(),
                            type: 'ai_message',
                            isError: true,
                        };
                        set(prev => ({ chatHistory: [...prev.chatHistory, aiMessage] }));
                        deps.updateClarificationStatus(clarificationId, 'pending');
                    }
                }
            },
            { cancellable: true },
        );
    },

    skipClarification: (clarificationId: string) => {
        const targetClarification = get().pendingClarifications.find(req => req.id === clarificationId && req.status === 'pending');
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
        deps.updateClarificationStatus(clarificationId, 'skipped');
        set(prev => ({
            chatHistory: [...prev.chatHistory, userResponseMessage, aiMessage],
        }));
        get().endBusy();
    },
});
