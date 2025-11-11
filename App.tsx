import React, { useEffect } from 'react';
import { AnalysisPanel } from './components/AnalysisPanel';
import { ChatPanel } from './components/ChatPanel';
import { FileUpload } from './components/FileUpload';
import { SettingsModal } from './components/SettingsModal';
import { HistoryPanel } from './components/HistoryPanel';
import { MemoryPanel } from './components/MemoryPanel';
import { SpreadsheetPanel } from './components/SpreadsheetPanel';
import { DataPrepDebugPanel } from './components/DataPrepDebugPanel';
import { AppHeader } from './components/AppHeader';
import { BusyStatusBar } from './components/BusyStatusBar';
import { ToastStack } from './components/ToastStack';
import { DataTransformGuard } from './components/DataTransformGuard';
import { useAppStore } from './store/useAppStore';
import { LangChainDebugPanel } from './components/LangChainDebugPanel';
import { LlmUsagePanel } from './components/LlmUsagePanel';
import { ExternalCsvPayload } from './types';

declare global {
    interface Window {
        __getNextCsvPayload?: () => ExternalCsvPayload | null;
        __CSV_AGENT_PENDING_NOTICES__?: string[];
    }
}


const App: React.FC = () => {
    const {
        init,
        currentView,
        csvData,
        isAsideVisible,
        asideWidth,
        isResizing,
        handleAsideMouseDown,
        isDataPrepDebugVisible,
        isSpreadsheetVisible,
        dataPreparationPlan,
        initialDataSample,
    } = useAppStore(state => ({
        init: state.init,
        currentView: state.currentView,
        csvData: state.csvData,
        isAsideVisible: state.isAsideVisible,
        asideWidth: state.asideWidth,
        isResizing: state.isResizing,
        handleAsideMouseDown: state.handleAsideMouseDown,
        isDataPrepDebugVisible: state.isDataPrepDebugVisible,
        isSpreadsheetVisible: state.isSpreadsheetVisible,
        dataPreparationPlan: state.dataPreparationPlan,
        initialDataSample: state.initialDataSample,
    }));
    
    const setIsAsideVisible = useAppStore(state => state.setIsAsideVisible);
    const addToast = useAppStore(state => state.addToast);
    const handleExternalCsvPayload = useAppStore(state => state.handleExternalCsvPayload);
    const connectGraphRuntime = useAppStore(state => state.connectGraphRuntime);

    useEffect(() => {
        init();
    }, [init]);

    useEffect(() => {
        connectGraphRuntime();
    }, [connectGraphRuntime]);

    useEffect(() => {
        const consumePayload = (payload?: ExternalCsvPayload | null) => {
            if (!payload || typeof payload.csv !== 'string') return;
            handleExternalCsvPayload(payload).catch(error => {
                console.error('Failed to process external CSV payload.', error);
            });
        };

        const flushQueue = () => {
            if (typeof window === 'undefined' || typeof window.__getNextCsvPayload !== 'function') return;
            let next: ExternalCsvPayload | null;
            do {
                next = window.__getNextCsvPayload();
                if (next) consumePayload(next);
            } while (next);
        };

        const handleEvent = (event: Event) => {
            const customEvent = event as CustomEvent<ExternalCsvPayload>;
            consumePayload(customEvent.detail || null);
        };

        flushQueue();
        window.addEventListener('ai-table-csv', handleEvent as EventListener);
        return () => {
            window.removeEventListener('ai-table-csv', handleEvent as EventListener);
        };
    }, [handleExternalCsvPayload]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const flushQueuedNotices = () => {
            if (!Array.isArray(window.__CSV_AGENT_PENDING_NOTICES__)) return;
            const pending = window.__CSV_AGENT_PENDING_NOTICES__.splice(0);
            pending.forEach(message => {
                addToast(message, 'warning', 6000);
            });
        };

        const handleNotice = (event: Event) => {
            const customEvent = event as CustomEvent<{ message?: string }>;
            if (customEvent.detail?.message) {
                addToast(customEvent.detail.message, 'warning', 6000);
            }
        };

        flushQueuedNotices();
        window.addEventListener('ai-table-csv-notice', handleNotice as EventListener);
        return () => {
            window.removeEventListener('ai-table-csv-notice', handleNotice as EventListener);
        };
    }, [addToast]);

    const renderMainContent = () => {
        if (currentView === 'file_upload' || !csvData) {
            return (
                <div className="flex-grow min-h-0">
                    <FileUpload />
                </div>
            );
        }
        return (
            <div className="flex-grow min-h-0 overflow-y-auto">
                <AnalysisPanel />
                {dataPreparationPlan && dataPreparationPlan.jsFunctionBody && initialDataSample && (
                    <div className="mt-8">
                        <DataPrepDebugPanel isVisible={isDataPrepDebugVisible} />
                    </div>
                )}
                <div className="mt-8 space-y-8">
                    <LangChainDebugPanel />
                    <LlmUsagePanel />
                </div>
                <div className="mt-8">
                    <SpreadsheetPanel isVisible={isSpreadsheetVisible} />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col md:flex-row h-screen bg-slate-50 text-slate-800 font-sans">
            <SettingsModal />
            <HistoryPanel />
            <MemoryPanel />
            <ToastStack />
            <main className="flex-1 overflow-hidden p-4 flex flex-col">
                <AppHeader />
                <BusyStatusBar />
                <DataTransformGuard />
                {renderMainContent()}
            </main>
            
            {isAsideVisible && (
                <>
                    <div 
                        onMouseDown={handleAsideMouseDown}
                        onDoubleClick={() => setIsAsideVisible(false)}
                        className="hidden md:flex group items-center justify-center w-2.5 cursor-col-resize"
                        title="Drag to resize, double-click to hide"
                    >
                        <div 
                            className={`w-0.5 h-8 bg-slate-300 rounded-full transition-colors duration-200 group-hover:bg-brand-secondary ${isResizing ? '!bg-blue-600' : ''}`} 
                        />
                    </div>
                    <aside className="w-full md:w-auto bg-white flex flex-col h-full border-l border-slate-200" style={{ width: asideWidth }}>
                        <div className="flex-1 overflow-hidden flex flex-col">
                            <ChatPanel />
                        </div>
                    </aside>
                </>
            )}
        </div>
    );
};

export default App;
