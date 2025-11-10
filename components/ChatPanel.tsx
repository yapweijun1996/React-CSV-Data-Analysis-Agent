import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { shallow } from 'zustand/shallow';
import { ProgressMessage, ChatMessage, AgentActionTrace, AgentObservation, AgentObservationStatus, AgentPhaseState } from '../types';
import { useAppStore } from '../store/useAppStore';
import { useAutosizeTextArea } from '../hooks/useAutosizeTextArea';
import { getUiVisibilityConfig } from '../services/bootstrapConfig';
import { getGroupableColumnCandidates } from '../utils/groupByInference';
import type { GroupByCandidate } from '../utils/groupByInference';
import QuestionCard from './QuestionCard';

const HideIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
);

const SettingsIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const MemoryIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
    </svg>
);


const SendIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
    </svg>
);

const LoadingIcon: React.FC = () => (
     <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const formatMemorySnippet = (text: string, maxLength = 60) =>
    text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;

type HelperTone = 'info' | 'warning' | 'muted' | 'progress' | 'neutral';

type HelperDescriptor = {
    tone: HelperTone;
    message: string;
    helperText?: string;
    icon?: string;
    actions?: Array<{
        label: string;
        onClick: () => void;
    }>;
};

const CARD_ID_REGEX = /card-\d+-[0-9.]+/g;
const extractCardIdsFromText = (text?: string | null): string[] => {
    if (!text) return [];
    const matches = text.match(CARD_ID_REGEX);
    if (!matches) return [];
    return Array.from(new Set(matches));
};

const helperToneClasses: Record<HelperTone, string> = {
    info: 'bg-blue-50 text-blue-800 border-blue-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    muted: 'bg-slate-100 text-slate-600 border-slate-200',
    progress: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    neutral: 'bg-white text-slate-600 border-slate-200',
};

const helperToneIcon: Record<HelperTone, string> = {
    info: '🧩',
    warning: '🔑',
    muted: '📁',
    progress: '⏱️',
    neutral: '💬',
};

const MAX_CHAT_INPUT_HEIGHT = 240;
const uiFlags = getUiVisibilityConfig();

const phaseDescriptors: Record<
    AgentPhaseState['phase'],
    { label: string; helper: string; icon: string; badge: string }
> = {
    idle: {
        label: 'Idle / Ready',
        helper: 'Waiting for your next instruction.',
        icon: '💤',
        badge: 'border-slate-200 bg-white text-slate-600',
    },
    observing: {
        label: 'Observing data',
        helper: 'Reviewing dataset context before acting.',
        icon: '🧐',
        badge: 'border-sky-200 bg-sky-50 text-sky-700',
    },
    planning: {
        label: 'Planning',
        helper: 'Breaking the task into actionable steps.',
        icon: '🧠',
        badge: 'border-purple-200 bg-purple-50 text-purple-700',
    },
    acting: {
        label: 'Executing',
        helper: 'Running the next tool or UI action.',
        icon: '⚙️',
        badge: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    },
    verifying: {
        label: 'Verifying',
        helper: 'Checking outputs before sharing updates.',
        icon: '🔍',
        badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    },
    reporting: {
        label: 'Reporting',
        helper: 'Summarizing findings back to you.',
        icon: '📝',
        badge: 'border-slate-200 bg-slate-50 text-slate-700',
    },
    clarifying: {
        label: 'Needs clarification',
        helper: 'Waiting on your answer to keep going.',
        icon: '❓',
        badge: 'border-amber-200 bg-amber-50 text-amber-800',
    },
    retrying: {
        label: 'Retrying',
        helper: 'Adjusting after a failed attempt.',
        icon: '🔁',
        badge: 'border-rose-200 bg-rose-50 text-rose-700',
    },
};

const phaseHelperOverrides: Partial<Record<
    AgentPhaseState['phase'],
    Omit<HelperDescriptor, 'helperText'> & { defaultHelperText: string }
>> = {
    observing: {
        tone: 'info',
        icon: '🧐',
        message: 'Reviewing your dataset…',
        defaultHelperText: 'Scanning columns, totals, and data freshness before planning.',
    },
    planning: {
        tone: 'info',
        icon: '🧠',
        message: 'Planning the next steps…',
        defaultHelperText: 'Sequencing the right tools to answer your question.',
    },
    acting: {
        tone: 'progress',
        icon: '⚙️',
        message: 'Executing the plan…',
        defaultHelperText: 'Running transformations or updating charts for you.',
    },
    verifying: {
        tone: 'progress',
        icon: '🔍',
        message: 'Double-checking results…',
        defaultHelperText: 'Validating outputs before sharing them.',
    },
    reporting: {
        tone: 'neutral',
        icon: '📝',
        message: 'Summarizing findings…',
        defaultHelperText: 'Preparing the explanation you will see in chat.',
    },
    retrying: {
        tone: 'warning',
        icon: '🔁',
        message: 'Retrying after an error…',
        defaultHelperText: 'Adjusting the last step to recover automatically.',
    },
    clarifying: {
        tone: 'info',
        icon: '❓',
        message: 'Waiting for your clarification…',
        defaultHelperText: 'Answer the question above so I can continue.',
    },
};


const useChatCore = () =>
    useAppStore(
        state => ({
            progressMessages: state.progressMessages,
            chatHistory: state.chatHistory,
            isBusy: state.isBusy,
            handleChatMessage: state.handleChatMessage,
            isApiKeySet: state.isApiKeySet,
            setIsAsideVisible: state.setIsAsideVisible,
            setIsSettingsModalOpen: state.setIsSettingsModalOpen,
            setIsMemoryPanelOpen: state.setIsMemoryPanelOpen,
            handleShowCardFromChat: state.handleShowCardFromChat,
            currentView: state.currentView,
            pendingClarifications: state.pendingClarifications,
            activeClarificationId: state.activeClarificationId,
            handleClarificationResponse: state.handleClarificationResponse,
            skipClarification: state.skipClarification,
            columnProfiles: state.columnProfiles,
            csvData: state.csvData,
            focusDataPreview: state.focusDataPreview,
            isCancellationRequested: state.isCancellationRequested,
            chatMemoryPreview: state.chatMemoryPreview,
            chatMemoryExclusions: state.chatMemoryExclusions,
            previewChatMemories: state.previewChatMemories,
            toggleMemoryPreviewSelection: state.toggleMemoryPreviewSelection,
            isMemoryPreviewLoading: state.isMemoryPreviewLoading,
            agentPhase: state.agentPhase,
            agentAwaitingUserInput: state.agentAwaitingUserInput,
            agentAwaitingPromptId: state.agentAwaitingPromptId,
        }),
        shallow,
    );

export const ChatPanel: React.FC = () => {
    const core = useChatCore();

    const {
        progressMessages,
        chatHistory,
        isBusy,
        handleChatMessage,
        isApiKeySet,
        setIsAsideVisible,
        setIsSettingsModalOpen,
        setIsMemoryPanelOpen,
        handleShowCardFromChat,
        currentView,
        pendingClarifications,
        activeClarificationId,
        handleClarificationResponse,
        skipClarification,
        columnProfiles,
        csvData,
        focusDataPreview,
        isCancellationRequested,
        chatMemoryPreview,
        chatMemoryExclusions,
        previewChatMemories,
        toggleMemoryPreviewSelection,
        isMemoryPreviewLoading,
        agentPhase,
        agentAwaitingUserInput,
        agentAwaitingPromptId,
    } = core;

    const [input, setInput] = useState('');
    const [manualGroupSelections, setManualGroupSelections] = useState<Record<string, string>>({});
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    useAutosizeTextArea(textareaRef, input, { maxHeight: MAX_CHAT_INPUT_HEIGHT });

    const hasAwaitingClarification = pendingClarifications.some(req => req.status === 'pending');
    const timeline = useMemo(
        () => [...chatHistory].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
        [chatHistory],
    );
    const datasetRows = csvData?.data ?? [];
    const manualGroupCandidates: GroupByCandidate[] = useMemo(
        () => {
            if (!columnProfiles || columnProfiles.length === 0) return [];
            const ranked = getGroupableColumnCandidates(columnProfiles, datasetRows);
            if (ranked.length > 0) return ranked;
            return columnProfiles
                .filter(profile => ['categorical', 'date', 'time'].includes(profile.type))
                .map(profile => ({
                    profile,
                    uniqueValues: typeof profile.uniqueValues === 'number' ? profile.uniqueValues : 0,
                }));
        },
        [columnProfiles, datasetRows],
    );
    const handlePromptResponse = useCallback(
        (promptId: string, value: string) => {
            const trimmed = value.trim();
            if (!trimmed || isBusy || !isApiKeySet) return;
            const payload = promptId ? `[prompt:${promptId}] ${trimmed}` : trimmed;
            handleChatMessage(payload);
        },
        [handleChatMessage, isBusy, isApiKeySet],
    );
    
    const selectedMemoryCount = chatMemoryPreview.filter(mem => !chatMemoryExclusions.includes(mem.id)).length;
    const showMemoryPreview = chatMemoryPreview.length > 0;
    const primaryClarificationId =
        activeClarificationId ?? pendingClarifications.find(req => req.status === 'pending')?.id ?? null;

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const highlightElement = (element: HTMLElement, colorClass = 'ring-blue-400') => {
        element.classList.add('ring-2', colorClass);
        setTimeout(() => element.classList.remove('ring-2', colorClass), 1800);
    };

    const scrollToPendingClarification = () => {
        if (!primaryClarificationId || typeof document === 'undefined') return;
        const element = document.getElementById(`clarification-${primaryClarificationId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            highlightElement(element, 'ring-blue-400');
        }
    };

    const scrollToFileUploadPanel = () => {
        if (typeof document === 'undefined') return;
        const element = document.getElementById('file-upload-panel');
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            highlightElement(element, 'ring-blue-300');
        }
    };

    const openFilePicker = () => {
        if (typeof document === 'undefined') return;
        const picker = document.getElementById('file-upload') as HTMLInputElement | null;
        if (picker) {
            picker.click();
            return;
        }
        scrollToFileUploadPanel();
    };

    const updateManualGroupingChoice = (clarificationId: string, columnName: string) => {
        setManualGroupSelections(prev => ({ ...prev, [clarificationId]: columnName }));
    };

    const submitManualGroupingChoice = (clarificationId: string) => {
        const columnName = manualGroupSelections[clarificationId];
        if (!columnName) return;
        handleClarificationResponse(clarificationId, {
            label: `Manual grouping: ${columnName}`,
            value: columnName,
        });
    };

    const helperDescriptor: HelperDescriptor = (() => {
        const lastProgress = progressMessages[progressMessages.length - 1]?.text ?? '';
        const continuationMatch = lastProgress.startsWith('Continuing plan');
        const activePhase = agentPhase?.phase ?? 'idle';
        const phaseOverride = activePhase !== 'idle' ? phaseHelperOverrides[activePhase] : undefined;
        const overrideHelperText = agentPhase?.message?.trim() || phaseOverride?.defaultHelperText;
        if (!isApiKeySet) {
            return {
                tone: 'warning',
                icon: '🔐',
                message: 'API key missing — add one so Gemini can help.',
                helperText: 'Open Settings and paste your Google Gemini API key to enable chat + analysis.',
                actions: [
                    {
                        label: 'Open Settings',
                        onClick: () => setIsSettingsModalOpen(true),
                    },
                ],
            };
        }
        if (hasAwaitingClarification) {
            return {
                tone: 'info',
                icon: '🧩',
                message: 'Clarification pending — answer the follow-up to continue.',
                helperText: 'Jump to the question, choose the right column, or skip it if it no longer applies.',
                actions: primaryClarificationId
                    ? [
                          {
                              label: 'Jump to question',
                              onClick: scrollToPendingClarification,
                          },
                      ]
                    : undefined,
            };
        }
        if (agentAwaitingUserInput) {
            return {
                tone: 'info',
                icon: '✋',
                message: 'Waiting on your response to continue.',
                helperText: 'Use the question card above to answer so the agent can resume.',
            };
        }
        if (continuationMatch) {
            return {
                tone: 'muted',
                icon: '🔁',
                message: lastProgress,
                helperText: 'The agent is automatically continuing the plan. You can relax or cancel if needed.',
            };
        }
        if (currentView === 'file_upload') {
            return {
                tone: 'muted',
                icon: '📂',
                message: 'No dataset yet — upload a CSV to unlock the workspace.',
                helperText: 'Drag & drop directly into the uploader or use Select a file.',
                actions: [
                    {
                        label: 'Scroll to uploader',
                        onClick: scrollToFileUploadPanel,
                    },
                    {
                        label: 'Select a file',
                        onClick: openFilePicker,
                    },
                ],
            };
        }
        if (isBusy) {
            if (isCancellationRequested) {
                return {
                    tone: 'progress',
                    icon: '🛑',
                    message: 'Stopping the last run…',
                    helperText: 'Once cancelled you can submit a new instruction right away.',
                };
            }
            if (phaseOverride) {
                return {
                    tone: phaseOverride.tone,
                    icon: phaseOverride.icon,
                    message: phaseOverride.message,
                    helperText: overrideHelperText,
                };
            }
            return {
                tone: 'progress',
                icon: '⚙️',
                message: 'AI is crunching your request.',
                helperText: 'Feel free to review earlier messages while the agent works.',
            };
        }
        if (phaseOverride) {
            return {
                tone: phaseOverride.tone,
                icon: phaseOverride.icon,
                message: phaseOverride.message,
                helperText: overrideHelperText,
            };
        }
        return {
            tone: 'neutral',
            icon: '💬',
            message: 'Ready for your next instruction.',
            helperText: 'Try “Sum of sales by region” or “Remove rows for USA”.',
        };
    })();

    useEffect(scrollToBottom, [timeline]);

    useEffect(() => {
        const trimmed = input.trim();
        if (!trimmed) {
            previewChatMemories('');
            return;
        }
        const timeoutId = window.setTimeout(() => {
            previewChatMemories(trimmed);
        }, 400);
        return () => window.clearTimeout(timeoutId);
    }, [input, previewChatMemories]);

    const handleSend = (e: React.FormEvent | React.KeyboardEvent) => {
        e.preventDefault();
        if (input.trim() && !isBusy) {
            handleChatMessage(input.trim());
            setInput('');
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            handleSend(e);
        }
    };

    const getPlaceholder = () => {
        if (!isApiKeySet) return "Set API Key in settings to chat";
        if (hasAwaitingClarification) return "Please resolve or skip the clarification above";
        if (agentAwaitingUserInput) return "Answer the AI question above to resume";
        switch (currentView) {
            case 'analysis_dashboard':
                return "New analysis or transformation?";
            case 'file_upload':
            default:
                return "Upload a file to begin chatting";
        }
    };

    const renderMessage = (item: ProgressMessage | ChatMessage, index: number) => {
        if ('sender' in item) { // It's a ChatMessage
            const msg = item as ChatMessage;

            if (msg.type === 'ai_clarification' && msg.clarificationRequest) {
                const linkedClarification = pendingClarifications.find(req => req.id === msg.clarificationRequest.id);
                const status = linkedClarification?.status ?? 'resolved';
                const isAwaiting = status === 'pending';
                const isProcessing = status === 'resolving';
                const isActive = (isAwaiting || isProcessing) && linkedClarification?.id === activeClarificationId;
                const canSkip = linkedClarification ? status === 'pending' : false;
                const isGroupByClarification = msg.clarificationRequest.targetProperty === 'groupByColumn';
                const manualGroupSelection = manualGroupSelections[msg.clarificationRequest.id] ?? '';
                const canUseManualGroupFallback = isGroupByClarification && manualGroupCandidates.length > 0;
                const statusClassMap: Record<string, string> = {
                    pending: isActive ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200',
                    resolving: 'bg-amber-100 text-amber-800 border-amber-200',
                    resolved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                    skipped: 'bg-slate-200 text-slate-500 border-slate-300',
                };
                const clarificationDomId = `clarification-${linkedClarification?.id ?? msg.clarificationRequest.id}`;
                const statusLabel = (() => {
                    if (status === 'pending') return isActive ? 'Active' : 'Queued';
                    if (status === 'resolving') return 'Working';
                    if (status === 'skipped') return 'Skipped';
                    return 'Answered';
                })();

                return (
                    <div
                        id={clarificationDomId}
                        key={`chat-${index}`}
                        className={`my-2 p-3 bg-white border rounded-lg transition-colors ${
                            isActive ? 'border-blue-400 shadow shadow-blue-100' : 'border-blue-200'
                        } ${status === 'resolved' ? 'opacity-90' : ''} ${status === 'skipped' ? 'opacity-60' : ''}`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center text-blue-700">
                                <span className="text-lg mr-2">🤔</span>
                                <h4 className="font-semibold">Clarification Needed</h4>
                            </div>
                            <span className={`text-xs px-2 py-1 border rounded-full ${statusClassMap[status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                {statusLabel}
                            </span>
                        </div>
                        <p className="text-sm text-slate-700 mb-1">{msg.clarificationRequest.question}</p>
                        {msg.clarificationRequest.columnHints && msg.clarificationRequest.columnHints.length > 0 && (
                            <p className="text-xs text-slate-500 mb-2">
                                Column context: {msg.clarificationRequest.columnHints.join(', ')}
                            </p>
                        )}
                        <div className="flex flex-col space-y-2">
                            {msg.clarificationRequest.options.map(option => (
                                <button
                                    key={`${msg.clarificationRequest.id}-${option.value}`}
                                    onClick={() => handleClarificationResponse(msg.clarificationRequest.id, option)}
                                    disabled={!isAwaiting || isBusy}
                                    className="w-full text-left text-sm px-3 py-2 bg-slate-100 rounded-md hover:bg-blue-100 hover:border-blue-500 border border-slate-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-slate-100"
                                >
                                    <span className="font-medium text-slate-800">{option.label}</span>
                                    <span className="block text-xs text-slate-500">Column: {option.value}</span>
                                </button>
                            ))}
                        </div>
                        {canUseManualGroupFallback && (
                            <div className="mt-3 border-t border-slate-200 pt-3">
                                <p className="text-xs text-slate-500 mb-2">
                                    🔁 找不到合適欄位？請手動選擇分組欄位 / Pick a grouping column manually
                                </p>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <select
                                        className="flex-1 border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 bg-white"
                                        value={manualGroupSelection}
                                        onChange={event =>
                                            updateManualGroupingChoice(msg.clarificationRequest.id, event.target.value)
                                        }
                                        disabled={!isAwaiting || isProcessing}
                                    >
                                        <option value="">請選擇分組欄位 / Choose a grouping column…</option>
                                        {manualGroupCandidates.map(candidate => (
                                            <option key={`${msg.clarificationRequest.id}-${candidate.profile.name}`} value={candidate.profile.name}>
                                                {candidate.profile.name}
                                                {candidate.uniqueValues
                                                    ? ` (${candidate.uniqueValues} distinct)`
                                                    : ' (distinct unknown)'}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => submitManualGroupingChoice(msg.clarificationRequest.id)}
                                        disabled={!isAwaiting || isBusy || !manualGroupSelection}
                                        className="text-sm px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        使用此欄位 / Use column
                                    </button>
                                </div>
                            </div>
                        )}
                        <div className="flex justify-end mt-3">
                            <button
                                onClick={() => skipClarification(msg.clarificationRequest.id)}
                                disabled={!canSkip}
                                className="text-xs text-slate-500 hover:text-red-600 border border-slate-200 px-3 py-1 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Skip / Cancel
                            </button>
                        </div>
                    </div>
                );
            }

            if (msg.type === 'ai_plan_start') {
                return (
                    <div key={`chat-${index}`} className="my-2 p-3 bg-slate-100 border border-slate-200 rounded-lg">
                        <div className="flex items-center text-slate-700 mb-2">
                             <span className="text-lg mr-2">⚙️</span>
                             <h4 className="font-semibold">Plan Execution</h4>
                        </div>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{msg.text}</p>
                    </div>
                );
            }

            if (msg.type === 'ai_thinking') {
                return (
                    <div key={`chat-${index}`} className="my-2 p-3 bg-white border border-blue-200 rounded-lg">
                        <div className="flex items-center text-blue-700 mb-2">
                             <span className="text-lg mr-2">🧠</span>
                             <h4 className="font-semibold">AI's Initial Analysis</h4>
                        </div>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{msg.text}</p>
                    </div>
                )
            }
            
            if (msg.type === 'ai_proactive_insight') {
                return (
                    <div key={`chat-${index}`} className="my-2 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                        <div className="flex items-center text-yellow-800 mb-2">
                             <span className="text-lg mr-2">💡</span>
                             <h4 className="font-semibold">Proactive Insight</h4>
                        </div>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{msg.text}</p>
                         {msg.cardId && (
                            <button 
                                onClick={() => handleShowCardFromChat(msg.cardId!)}
                                className="mt-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-md hover:bg-yellow-200 transition-colors w-full text-left font-medium"
                            >
                                → Show Related Card
                            </button>
                         )}
                    </div>
                )
            }


            if (msg.sender === 'user') {
                return (
                    <div key={`chat-${index}`} className="flex justify-end">
                        <div className="bg-blue-600 rounded-lg px-3 py-2 max-w-xs lg:max-w-md">
                            <p className="text-sm text-white" style={{ whiteSpace: 'break-spaces' }}>{msg.text}</p>
                        </div>
                    </div>
                );
            }
            // AI message
            const referencedCardIds: string[] = [];
            if (!msg.isError) {
                if (msg.cardId) referencedCardIds.push(msg.cardId);
                extractCardIdsFromText(msg.text).forEach(id => {
                    if (!referencedCardIds.includes(id)) {
                        referencedCardIds.push(id);
                    }
                });
            }

            return (
                <div key={`chat-${index}`} className="flex">
                    <div className={`rounded-lg px-3 py-2 max-w-xs lg:max-w-md ${msg.isError ? 'bg-red-100' : 'bg-slate-200'}`}>
                         <p
                            className={`text-sm ${msg.isError ? 'text-red-800' : 'text-slate-800'}`}
                            style={{ whiteSpace: 'break-spaces' }}
                         >
                            {msg.text}
                         </p>
                         {!msg.isError &&
                            referencedCardIds.map(cardId => (
                                <button
                                    key={`${cardId}-${index}`}
                                    onClick={() => handleShowCardFromChat(cardId)}
                                    className="mt-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-md hover:bg-blue-200 transition-colors w-full text-left font-medium"
                                >
                                    → Show Related Card
                                </button>
                            ))}
                         {msg.cta?.type === 'open_data_preview' && (
                            <button
                                onClick={focusDataPreview}
                                className="mt-2 text-xs bg-white text-blue-700 border border-blue-200 px-2 py-1 rounded-md hover:bg-blue-50 transition-colors w-full text-left font-medium"
                            >
                                → {msg.cta.label}
                                {msg.cta.helperText && <span className="block text-[11px] text-slate-500 mt-0.5">{msg.cta.helperText}</span>}
                            </button>
                         )}
                         {msg.usedMemories && msg.usedMemories.length > 0 && (
                            <div className="mt-2 border border-blue-100 bg-white rounded-md p-2">
                                <p className="text-[11px] font-semibold text-blue-700 mb-1">
                                    Used memory ({msg.usedMemories.length})
                                </p>
                                <div className="flex flex-wrap gap-1">
                                    {msg.usedMemories.map(memory => (
                                        <span
                                            key={memory.id}
                                            className="text-[11px] text-slate-600 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5"
                                        >
                                            {formatMemorySnippet(memory.text, 48)}
                                        </span>
                                    ))}
                                </div>
                            </div>
                         )}
                         {msg.meta?.awaitUser && msg.meta?.promptId && (
                            <div className="mt-3">
                                <QuestionCard
                                    promptId={msg.meta.promptId}
                                    message={msg.text}
                                    onSubmit={value => handlePromptResponse(msg.meta!.promptId!, value)}
                                    disabled={!isApiKeySet || (isBusy && !agentAwaitingUserInput)}
                                    isActive={!agentAwaitingPromptId || agentAwaitingPromptId === msg.meta.promptId}
                                />
                            </div>
                         )}
                    </div>
                </div>
            );
        }
    }

    return (
        <div className="flex flex-col h-full bg-slate-100 rounded-lg md:rounded-none">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center relative">
                <h2 className="text-xl font-semibold text-slate-900">Assistant</h2>
                <div className="flex items-center space-x-3">
                   <button
                       onClick={() => setIsMemoryPanelOpen(true)}
                       className="p-1 text-slate-500 rounded-full hover:bg-slate-200 hover:text-slate-800 transition-colors"
                       title="View AI Memory"
                       aria-label="View AI Memory"
                   >
                       <MemoryIcon />
                   </button>
                    {uiFlags.showSettingsButton && (
                        <button
                            onClick={() => setIsSettingsModalOpen(true)}
                            className="p-1 text-slate-500 rounded-full hover:bg-slate-200 hover:text-slate-800 transition-colors"
                            title="Settings"
                            aria-label="Open Settings"
                        >
                            <SettingsIcon />
                        </button>
                    )}
                    <button 
                        onClick={() => setIsAsideVisible(false)} 
                        className="p-1 text-slate-500 rounded-full hover:bg-slate-200 hover:text-slate-800 transition-colors"
                        title="Hide Panel"
                        aria-label="Hide Assistant Panel"
                    >
                        <HideIcon />
                    </button>
                </div>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
                <AgentPhaseIndicator />
                <PlannerGoalTracker />
                <AgentActionLogPanel />
                <SystemLogPanel />
                <AgentObservationTimeline />
                {timeline.map(renderMessage)}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-slate-200 bg-white">
                {showMemoryPreview && (
                    <div className="mb-3">
                        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                            Used memory ({selectedMemoryCount}/{chatMemoryPreview.length})
                            {isMemoryPreviewLoading && <span className="text-slate-400 font-normal normal-case">Updating…</span>}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {chatMemoryPreview.map(memory => {
                                const isExcluded = chatMemoryExclusions.includes(memory.id);
                                return (
                                    <button
                                        type="button"
                                        key={memory.id}
                                        onClick={() => toggleMemoryPreviewSelection(memory.id)}
                                        className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
                                            isExcluded
                                                ? 'bg-white border-slate-300 text-slate-400 line-through'
                                                : 'bg-blue-50 border-blue-200 text-blue-700'
                                        }`}
                                        title={isExcluded ? 'Click to include this memory' : 'Click to exclude this memory'}
                                    >
                                        {formatMemorySnippet(memory.text, 42)}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
                <form onSubmit={handleSend} className="flex items-start space-x-2">
                    <div className="relative flex-grow">
                        <textarea
                            ref={textareaRef}
                            rows={1}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={getPlaceholder()}
                            disabled={!isApiKeySet || currentView === 'file_upload' || hasAwaitingClarification || agentAwaitingUserInput}
                            aria-describedby="chat-input-char-count"
                            className="w-full bg-white border border-slate-300 rounded-md py-2 pl-3 pr-14 text-sm leading-5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 resize-none"
                            style={{ minHeight: '40px', maxHeight: `${MAX_CHAT_INPUT_HEIGHT}px`, overflowY: 'hidden' }}
                        />
                        <span
                            id="chat-input-char-count"
                            className="pointer-events-none absolute bottom-2 right-3 text-[11px] text-slate-400"
                        >
                            {input.length} chars
                        </span>
                    </div>
                     <button
                        type="submit"
                        disabled={isBusy || !input.trim() || !isApiKeySet || currentView === 'file_upload' || hasAwaitingClarification || agentAwaitingUserInput}
                        className="flex-shrink-0 px-4 h-10 flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
                        aria-label={isBusy ? (isCancellationRequested ? "Cancelling request" : "Sending message") : "Send message"}
                    >
                        {isBusy ? <LoadingIcon /> : <SendIcon />}
                        <span className="text-sm">
                            {isBusy ? (isCancellationRequested ? 'Cancelling…' : 'Sending…') : 'Send'}
                        </span>
                    </button>
                </form>
                <div
                    className={`mt-3 flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-xs ${helperToneClasses[helperDescriptor.tone]}`}
                    role="status"
                    aria-live="polite"
                >
                    <div className="flex items-start gap-2 flex-1 min-w-[200px]">
                        <span className="text-base leading-5">
                            {helperDescriptor.icon ?? helperToneIcon[helperDescriptor.tone]}
                        </span>
                        <div>
                            <p className="font-medium">{helperDescriptor.message}</p>
                            {helperDescriptor.helperText && (
                                <p className="text-[11px] opacity-90 mt-0.5">{helperDescriptor.helperText}</p>
                            )}
                        </div>
                    </div>
                    {helperDescriptor.actions?.map(action => (
                        <button
                            key={action.label}
                            type="button"
                            onClick={action.onClick}
                            className="text-xs font-semibold text-blue-700 hover:text-blue-800 underline-offset-2 hover:underline"
                        >
                            {action.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const condenseSystemLogs = (logs: ProgressMessage[]): ProgressMessage[] => {
    const condensed: ProgressMessage[] = [];
    let continuationCount = 0;
    let lastContinuationTimestamp: Date | null = null;
    logs.forEach(log => {
        if (log.text.startsWith('Continuing plan')) {
            continuationCount += 1;
            lastContinuationTimestamp = log.timestamp;
            return;
        }
        if (continuationCount > 0) {
            condensed.push({
                text: continuationCount === 1 ? 'Continuing plan' : `Continuing plan retried ×${continuationCount}`,
                type: 'system',
                timestamp: lastContinuationTimestamp ?? log.timestamp,
            });
            continuationCount = 0;
            lastContinuationTimestamp = null;
        }
        condensed.push(log);
    });
    if (continuationCount > 0) {
        condensed.push({
            text: continuationCount === 1 ? 'Continuing plan' : `Continuing plan retried ×${continuationCount}`,
            type: 'system',
            timestamp: lastContinuationTimestamp ?? new Date(),
        });
    }
    return condensed.slice(-30);
};

const SystemLogPanel = React.memo(() => {
    const progressMessages = useAppStore(state => state.progressMessages);
    const [isCollapsed, setIsCollapsed] = useState(true);
    const condensedLogs = useMemo(() => condenseSystemLogs(progressMessages), [progressMessages]);
    if (condensedLogs.length === 0) return null;
    return (
        <div className="mb-4 rounded-lg border border-slate-200 bg-white shadow-sm">
            <button
                type="button"
                onClick={() => setIsCollapsed(prev => !prev)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-600"
            >
                <span className="uppercase tracking-wide">System log</span>
                <span className="text-[11px] text-slate-400">
                    {condensedLogs.length} events · {isCollapsed ? 'Show' : 'Hide'}
                </span>
            </button>
            {!isCollapsed && (
                <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                    {condensedLogs.map((entry, index) => (
                        <div
                            key={`${entry.timestamp.getTime()}-${index}`}
                            className={`px-3 py-2 text-xs flex gap-2 ${entry.type === 'error' ? 'text-red-600' : 'text-slate-600'}`}
                        >
                            <span className="text-slate-400">
                                {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="leading-snug">{entry.text}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});
SystemLogPanel.displayName = 'SystemLogPanel';

const PlannerGoalTracker = React.memo(() => {
    const planState = useAppStore(state => state.plannerSession?.planState ?? null);
    if (!planState) return null;
    const nextSteps = planState.nextSteps ?? [];
    const updatedAt = planState.updatedAt ? new Date(planState.updatedAt) : new Date();

    return (
        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-900">Agent Goal Tracker</h3>
                <span className="text-xs text-slate-500">
                    Updated {updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
            <p className="text-sm text-slate-800 mb-2">
                <span className="font-medium">Goal:</span> {planState.goal}
            </p>
            {planState.progress && (
                <p className="text-sm text-slate-700 mb-2">
                    <span className="font-medium">Progress:</span> {planState.progress}
                </p>
            )}
            {nextSteps.length > 0 && (
                <div className="mb-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Next steps</p>
                    <ol className="list-decimal list-inside text-sm text-slate-700 space-y-0.5">
                        {nextSteps.map(step => (
                            <li key={step.id}>
                                <span className="font-mono text-[11px] text-slate-500 mr-1">[{step.id}]</span>
                                {step.label}
                            </li>
                        ))}
                    </ol>
                </div>
            )}
            {planState.blockedBy && (
                <p className="text-sm text-amber-600">
                    <span className="font-medium">Blocked by:</span> {planState.blockedBy}
                </p>
            )}
        </div>
    );
});
PlannerGoalTracker.displayName = 'PlannerGoalTracker';

const AgentPhaseIndicator = React.memo(() => {
    const phaseState = useAppStore(state => state.agentPhase);
    const { phase, message, enteredAt } = phaseState ?? { phase: 'idle', message: null, enteredAt: null };
    const descriptor = phaseDescriptors[phase] ?? phaseDescriptors.idle;
    const detail = message?.trim() || descriptor.helper;
    const enteredDate = enteredAt ? new Date(enteredAt) : null;
    const sinceLabel =
        enteredDate && !Number.isNaN(enteredDate.getTime())
            ? enteredDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            : null;

    return (
        <div
            className={`mb-4 flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${descriptor.badge}`}
            role="status"
            aria-live="polite"
        >
            <div className="flex items-center gap-2">
                <span className="text-base">{descriptor.icon}</span>
                <div>
                    <p className="font-semibold">{descriptor.label}</p>
                    <p className="text-xs opacity-90">{detail}</p>
                </div>
            </div>
            {sinceLabel && (
                <span className="text-xs text-slate-500 whitespace-nowrap">Since {sinceLabel}</span>
            )}
        </div>
    );
});
AgentPhaseIndicator.displayName = 'AgentPhaseIndicator';

const actionStatusColor: Record<AgentActionTrace['status'], string> = {
    observing: 'bg-slate-400',
    executing: 'bg-blue-500',
    succeeded: 'bg-emerald-500',
    failed: 'bg-red-500',
};

const actionSourceLabels: Record<AgentActionTrace['source'], string> = {
    chat: 'Chat',
    pipeline: 'Analysis Pipeline',
    system: 'System',
};

const formatActionTimestamp = (timestamp: AgentActionTrace['timestamp']) => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const AgentActionLogPanel = React.memo(() => {
    const agentTraces = useAppStore(state => state.agentActionTraces);
    const recentAgentTraces = useMemo(() => agentTraces.slice(-12).reverse(), [agentTraces]);

    if (recentAgentTraces.length === 0) return null;

    return (
        <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-900">AI Action Log</h3>
                <span className="text-xs text-slate-500">Last {recentAgentTraces.length} events</span>
            </div>
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                {recentAgentTraces.map(trace => {
                    const source = trace.source ?? 'chat';
                    const status = trace.status ?? 'observing';
                    return (
                        <div key={trace.id} className="flex items-start space-x-3 text-sm">
                            <div className="flex flex-col items-center mt-1">
                                <span className={`w-2 h-2 rounded-full ${actionStatusColor[status]}`}></span>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center text-xs text-slate-500 gap-2">
                                    <span className="font-medium">{formatActionTimestamp(trace.timestamp)}</span>
                                    <span>·</span>
                                    <span>{actionSourceLabels[source] ?? 'AI'}</span>
                                    <span>·</span>
                                    <span className="capitalize">{status}</span>
                                </div>
                                <p className="text-slate-800 mt-0.5 leading-snug whitespace-pre-line">{trace.summary}</p>
                                {trace.details && (
                                    <p className="text-xs text-slate-500 mt-1 leading-snug whitespace-pre-line">
                                        {trace.details}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});
AgentActionLogPanel.displayName = 'AgentActionLogPanel';

const observationStatusChip: Record<AgentObservationStatus, string> = {
    success: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    error: 'bg-red-100 text-red-700 border-red-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
};

const observationStatusLabel: Record<AgentObservationStatus, string> = {
    success: 'Completed',
    error: 'Failed',
    pending: 'Pending',
};

const actionLabelMap: Record<string, string> = {
    text_response: 'Shared response',
    plan_creation: 'Created analysis plan',
    dom_action: 'UI interaction',
    execute_js_code: 'Data transform',
    filter_spreadsheet: 'Spreadsheet filter',
    clarification_request: 'Clarification request',
    proceed_to_analysis: 'Pipeline continuation',
};

const formatObservationTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatObservationDetail = (observation: AgentObservation) => {
    const { outputs, uiDelta } = observation;
    if (outputs) {
        if (typeof outputs.summary === 'string') return outputs.summary;
        if (typeof outputs.textPreview === 'string') return outputs.textPreview;
        if (typeof outputs.reason === 'string') return outputs.reason;
        const firstKey = Object.keys(outputs)[0];
        if (firstKey) {
            const value = outputs[firstKey];
            const raw = typeof value === 'string' ? value : JSON.stringify(value);
            return raw.length > 140 ? `${raw.slice(0, 140)}…` : raw;
        }
    }
    if (uiDelta) {
        return uiDelta;
    }
    return null;
};

const AgentObservationTimeline = React.memo(() => {
    const { observations, isBusy } = useAppStore(
        state => ({
            observations: state.plannerSession?.observations ?? [],
            isBusy: state.isBusy,
        }),
        shallow,
    );
    const observationLog = useMemo(() => observations.slice(-8).reverse(), [observations]);

    if (observationLog.length === 0) return null;

    return (
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-lg">📋</span>
                    <div>
                        <h3 className="text-sm font-semibold text-slate-900">Live Agent Timeline</h3>
                        <p className="text-xs text-slate-500">Newest events shown first</p>
                    </div>
                </div>
                {isBusy && <span className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Running…</span>}
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {observationLog.map(observation => {
                    const detail = formatObservationDetail(observation);
                    const status = observation.status ?? 'pending';
                    const statusChip = observationStatusChip[status] ?? 'bg-slate-100 text-slate-600 border-slate-200';
                    const label = observationStatusLabel[status] ?? status;
                    return (
                        <div key={observation.id} className="relative border-l-2 border-slate-100 pl-3">
                            <span
                                className={`absolute -left-[5px] top-2 w-2 h-2 rounded-full ${
                                    status === 'success' ? 'bg-emerald-500' : status === 'error' ? 'bg-red-500' : 'bg-amber-400'
                                }`}
                            ></span>
                            <div className="flex items-center justify-between text-[11px] text-slate-500">
                                <span className="font-medium">{formatObservationTimestamp(observation.timestamp)}</span>
                                <span className={`px-2 py-0.5 rounded-full border ${statusChip}`}>{label}</span>
                            </div>
                            <p className="text-sm font-semibold text-slate-800 mt-1">
                                {actionLabelMap[observation.responseType] ?? 'Agent action'}
                            </p>
                            {detail && <p className="text-xs text-slate-600 mt-1 whitespace-pre-line">{detail}</p>}
                            {observation.errorCode && (
                                <p className="text-xs text-red-600 mt-1">Error code: {observation.errorCode}</p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
});
AgentObservationTimeline.displayName = 'AgentObservationTimeline';
