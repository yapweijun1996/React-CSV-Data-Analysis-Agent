import React, { useState, useEffect, useRef } from 'react';
import { ProgressMessage, ChatMessage, AppView, AgentActionTrace, AgentObservation, AgentObservationStatus } from '../types';
import { useAppStore } from '../store/useAppStore';

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


export const ChatPanel: React.FC = () => {
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
        focusDataPreview,
        isCancellationRequested,
        chatMemoryPreview,
        chatMemoryExclusions,
        previewChatMemories,
        toggleMemoryPreviewSelection,
        isMemoryPreviewLoading,
        agentTraces,
        plannerObservations,
    } = useAppStore(state => ({
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
        focusDataPreview: state.focusDataPreview,
        isCancellationRequested: state.isCancellationRequested,
        chatMemoryPreview: state.chatMemoryPreview,
        chatMemoryExclusions: state.chatMemoryExclusions,
        previewChatMemories: state.previewChatMemories,
        toggleMemoryPreviewSelection: state.toggleMemoryPreviewSelection,
        isMemoryPreviewLoading: state.isMemoryPreviewLoading,
        agentTraces: state.agentActionTraces,
        plannerObservations: state.plannerSession.observations,
    }));

    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const hasAwaitingClarification = pendingClarifications.some(req => req.status === 'pending');
    const recentAgentTraces = agentTraces.slice(-12).reverse();
    const observationLog = plannerObservations.slice(-8).reverse();

    const timeline = [...progressMessages, ...chatHistory]
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    const selectedMemoryCount = chatMemoryPreview.filter(mem => !chatMemoryExclusions.includes(mem.id)).length;
    const showMemoryPreview = chatMemoryPreview.length > 0;

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [timeline]);

    // Auto-resize textarea based on content
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto'; // Reset height
            const scrollHeight = textarea.scrollHeight;
            textarea.style.height = `${scrollHeight}px`;
        }
    }, [input]);

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
        switch (currentView) {
            case 'analysis_dashboard':
                return "Ask for a new analysis or data transformation...";
            case 'file_upload':
            default:
                return "Upload a file to begin chatting";
        }
    };

    const renderActionLog = () => {
        if (recentAgentTraces.length === 0) return null;
        const statusColor: Record<AgentActionTrace['status'], string> = {
            observing: 'bg-slate-400',
            executing: 'bg-blue-500',
            succeeded: 'bg-emerald-500',
            failed: 'bg-red-500',
        };
        const sourceLabels: Record<AgentActionTrace['source'], string> = {
            chat: 'Chat',
            pipeline: 'Analysis Pipeline',
            system: 'System',
        };
        const formatTimestamp = (timestamp: AgentActionTrace['timestamp']) => {
            const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        };
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
                                    <span className={`w-2 h-2 rounded-full ${statusColor[status]}`}></span>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center text-xs text-slate-500 gap-2">
                                        <span className="font-medium">{formatTimestamp(trace.timestamp)}</span>
                                        <span>·</span>
                                        <span>{sourceLabels[source] ?? 'AI'}</span>
                                        <span>·</span>
                                        <span className="capitalize">{status}</span>
                                    </div>
                                    <p className="text-slate-800 mt-0.5 leading-snug whitespace-pre-line">{trace.summary}</p>
                                    {trace.details && (
                                        <p className="text-xs text-slate-500 mt-1 leading-snug whitespace-pre-line">{trace.details}</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
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

    const renderObservationLog = () => {
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
                    {isBusy && (
                        <span className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Running…</span>
                    )}
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {observationLog.map(observation => {
                        const detail = formatObservationDetail(observation);
                        const status = observation.status ?? 'pending';
                        const statusChip = observationStatusChip[status] ?? 'bg-slate-100 text-slate-600 border-slate-200';
                        const label = observationStatusLabel[status] ?? status;
                        return (
                            <div key={observation.id} className="relative border-l-2 border-slate-100 pl-3">
                                <span className={`absolute -left-[5px] top-2 w-2 h-2 rounded-full ${
                                    status === 'success'
                                        ? 'bg-emerald-500'
                                        : status === 'error'
                                            ? 'bg-red-500'
                                            : 'bg-amber-400'
                                }`}></span>
                                <div className="flex items-center justify-between text-[11px] text-slate-500">
                                    <span className="font-medium">{formatObservationTimestamp(observation.timestamp)}</span>
                                    <span className={`px-2 py-0.5 rounded-full border ${statusChip}`}>{label}</span>
                                </div>
                                <p className="text-sm font-semibold text-slate-800 mt-1">
                                    {actionLabelMap[observation.responseType] ?? 'Agent action'}
                                </p>
                                {detail && (
                                    <p className="text-xs text-slate-600 mt-1 whitespace-pre-line">{detail}</p>
                                )}
                                {observation.errorCode && (
                                    <p className="text-xs text-red-600 mt-1">Error code: {observation.errorCode}</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
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
                const statusClassMap: Record<string, string> = {
                    pending: isActive ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200',
                    resolving: 'bg-amber-100 text-amber-800 border-amber-200',
                    resolved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                    skipped: 'bg-slate-200 text-slate-500 border-slate-300',
                };
                const statusLabel = (() => {
                    if (status === 'pending') return isActive ? 'Active' : 'Queued';
                    if (status === 'resolving') return 'Working';
                    if (status === 'skipped') return 'Skipped';
                    return 'Answered';
                })();

                return (
                    <div
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
                        <p className="text-sm text-slate-700 mb-3">{msg.clarificationRequest.question}</p>
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
            return (
                <div key={`chat-${index}`} className="flex">
                    <div className={`rounded-lg px-3 py-2 max-w-xs lg:max-w-md ${msg.isError ? 'bg-red-100' : 'bg-slate-200'}`}>
                         <p
                            className={`text-sm ${msg.isError ? 'text-red-800' : 'text-slate-800'}`}
                            style={{ whiteSpace: 'break-spaces' }}
                         >
                            {msg.text}
                         </p>
                         {msg.cardId && !msg.isError && (
                            <button 
                                onClick={() => handleShowCardFromChat(msg.cardId!)}
                                className="mt-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-md hover:bg-blue-200 transition-colors w-full text-left font-medium"
                            >
                                → Show Related Card
                            </button>
                         )}
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
                    </div>
                </div>
            );
        } else { // It's a ProgressMessage
            const msg = item as ProgressMessage;
             return (
                 <div key={`prog-${index}`} className={`flex text-xs ${msg.type === 'error' ? 'text-red-600' : 'text-slate-500'}`}>
                    <span className="mr-2 text-slate-400">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span>{msg.text}</span>
                </div>
            )
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
                    <button
                        onClick={() => setIsSettingsModalOpen(true)}
                        className="p-1 text-slate-500 rounded-full hover:bg-slate-200 hover:text-slate-800 transition-colors"
                        title="Settings"
                        aria-label="Open Settings"
                    >
                        <SettingsIcon />
                    </button>
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
                {renderActionLog()}
                {renderObservationLog()}
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
                    <textarea
                        ref={textareaRef}
                        rows={1}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={getPlaceholder()}
                        disabled={isBusy || !isApiKeySet || currentView === 'file_upload' || hasAwaitingClarification}
                        className="flex-grow bg-white border border-slate-300 rounded-md py-2 px-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 resize-none max-h-32"
                        style={{ overflowY: 'auto' }}
                    />
                     <button
                        type="submit"
                        disabled={isBusy || !input.trim() || !isApiKeySet || currentView === 'file_upload' || hasAwaitingClarification}
                        className="flex-shrink-0 px-4 h-10 flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
                        aria-label={isBusy ? (isCancellationRequested ? "Cancelling request" : "Sending message") : "Send message"}
                    >
                        {isBusy ? <LoadingIcon /> : <SendIcon />}
                        <span className="text-sm">
                            {isBusy ? (isCancellationRequested ? 'Cancelling…' : 'Sending…') : 'Send'}
                        </span>
                    </button>
                </form>
                 <div className="text-xs text-slate-400 mt-2">
                    {currentView === 'analysis_dashboard' 
                        ? 'e.g., "Sum of sales by region", or "Remove rows for USA"'
                        : ''
                    }
                </div>
            </div>
        </div>
    );
};
