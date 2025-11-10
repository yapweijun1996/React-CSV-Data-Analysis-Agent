import type { GetState, SetState } from 'zustand';
import { vectorStore } from '../../services/vectorStore';
import { COLUMN_TARGET_PROPERTIES, columnHasUsableData, resolveColumnChoice } from '../../utils/clarification';
import { applyFriendlyPlanCopy } from '../../utils/planCopy';
import { runWithBusyState } from '../../utils/runWithBusy';
import { inferGroupByColumn } from '../../utils/planValidation';
import type { AnalysisPlan, ChatMessage, ClarificationOption } from '../../types';
import type { AppStore, ChatSlice } from '../appStoreTypes';
import { AgentWorker, ChatSliceDependencies } from '../../services/agent/AgentWorker';

export { agentSdk, runPlannerWorkflow, registerActionMiddleware } from '../../services/agent/AgentWorker';

export const createChatSlice = (
    set: SetState<AppStore>,
    get: GetState<AppStore>,
    deps: ChatSliceDependencies,
): ChatSlice => {
    // Single AgentWorker instance keeps planner logic out of the slice so we only dispatch intents.
    const agentWorker = new AgentWorker({ set, get, deps });

    return {
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

            await agentWorker.handleMessage(message);
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
            const targetClarification = get().pendingClarifications.find(
                req => req.id === clarificationId && req.status === 'pending',
            );
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
                async runId => {
                    try {
                        deps.updateClarificationStatus(clarificationId, 'resolving');
                        const { pendingPlan, targetProperty } = targetClarification;

                        const availableColumns = columnProfiles.map(p => p.name);
                        const resolvedValue = resolveColumnChoice(userChoice, targetProperty, availableColumns);

                        if (
                            COLUMN_TARGET_PROPERTIES.includes(targetProperty) &&
                            (!resolvedValue || !availableColumns.includes(resolvedValue))
                        ) {
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
                                const { column } = inferGroupByColumn(columnProfiles, csvData.data);
                                if (column) {
                                    completedPlan.groupByColumn = column;
                                    get().addProgress(`AI inferred grouping by "${column}" based on your dataset.`);
                                }
                            }
                        }

                        if (!completedPlan.title) completedPlan.title = `Analysis of ${userChoice.label}`;
                        if (!completedPlan.description) {
                            completedPlan.description = `A chart showing an analysis of ${userChoice.label}.`;
                        }

                        if (
                            completedPlan.chartType !== 'scatter' &&
                            (!completedPlan.chartType || !completedPlan.groupByColumn || !completedPlan.aggregation)
                        ) {
                            const missingFields = ['chartType', 'groupByColumn', 'aggregation'].filter(
                                field => !(completedPlan as any)[field],
                            );
                            if (missingFields.includes('groupByColumn')) {
                                throw new Error(
                                    '系統無法推斷要用哪個欄位做分組，請手動選擇一個分類/日期欄位作為 grouping column (system could not infer the grouping column).',
                                );
                            }
                            throw new Error(
                                `The clarified plan is still missing required fields like ${missingFields.join(', ')}.`,
                            );
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
            const targetClarification = get().pendingClarifications.find(
                req => req.id === clarificationId && req.status === 'pending',
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

            deps.updateClarificationStatus(clarificationId, 'skipped');
            set(prev => ({
                chatHistory: [...prev.chatHistory, userResponseMessage, aiMessage],
            }));
            get().endBusy();
        },
    };
};
