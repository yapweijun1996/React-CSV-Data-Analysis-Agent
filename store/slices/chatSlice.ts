import type { GetState, SetState } from 'zustand';
import { vectorStore } from '../../services/vectorStore';
import type { ChatMessage, ClarificationOption } from '../../types';
import type { AppStore, ChatSlice } from '../appStoreTypes';
import type { ChatSliceDependencies } from './chatSliceTypes';
import { buildGraphLlmTurnPayload } from '../../services/agent/graphPayload';

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
        const trimmed = message.trim();
        if (!trimmed) return;

        if (!get().isApiKeySet) {
            get().addProgress('API Key not set.', 'error');
            get().setIsSettingsModalOpen(true);
            return;
        }

        const userMessage: ChatMessage = {
            sender: 'user',
            text: message,
            timestamp: new Date(),
            type: 'user_message',
        };

        const runId = get().beginBusy('Thinking through your request...', { cancellable: true });
        set(prev => ({
            chatHistory: [...prev.chatHistory, userMessage],
            graphActiveRunId: runId,
        }));

        try {
            const payload = buildGraphLlmTurnPayload(trimmed, get(), runId);
            get().runGraphPipeline(payload);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            get().addProgress(`LLM dispatch failed: ${errorMessage}`, 'error');
            get().endBusy(runId);
            set(state => ({
                graphActiveRunId: state.graphActiveRunId === runId ? null : state.graphActiveRunId,
            }));
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
        const targetClarification = get().pendingClarifications.find(
            req => req.id === clarificationId && req.status === 'pending',
        );
        if (!targetClarification) return;

        deps.updateClarificationStatus(clarificationId, 'resolved');
        set(state => ({
            pendingClarifications: state.pendingClarifications.map(clar =>
                clar.id === clarificationId ? { ...clar, status: 'resolved' } : clar,
            ),
            agentAwaitingUserInput: false,
            agentAwaitingPromptId: state.agentAwaitingPromptId === clarificationId ? null : state.agentAwaitingPromptId,
            activeClarificationId: state.activeClarificationId === clarificationId ? null : state.activeClarificationId,
        }));

        const responseLine = `【${targetClarification.question}】\n我选择了「${userChoice.label}」`;
        await get().handleChatMessage(responseLine);
    },

    skipClarification: (clarificationId: string) => {
        const targetClarification = get().pendingClarifications.find(
            req => req.id === clarificationId && req.status === 'pending',
        );
        if (!targetClarification) return;

        deps.updateClarificationStatus(clarificationId, 'skipped');
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

        set(prev => ({
            chatHistory: [...prev.chatHistory, userResponseMessage, aiMessage],
            pendingClarifications: prev.pendingClarifications.map(clar =>
                clar.id === clarificationId ? { ...clar, status: 'skipped' } : clar,
            ),
            agentAwaitingUserInput: false,
            agentAwaitingPromptId:
                prev.agentAwaitingPromptId === clarificationId ? null : prev.agentAwaitingPromptId,
            activeClarificationId:
                prev.activeClarificationId === clarificationId ? null : prev.activeClarificationId,
        }));
        get().endBusy();
    },
});
