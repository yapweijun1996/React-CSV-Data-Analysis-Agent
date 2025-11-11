import React, { useState, useEffect } from 'react';
import { Settings } from '../types';
import { useAppStore } from '../store/useAppStore';

const languages: Settings['language'][] = ['English', 'Mandarin', 'Spanish', 'Japanese', 'French'];
const googleModels: Settings['model'][] = ['gemini-2.5-flash', 'gemini-2.5-pro'];
const openAIModels: Settings['model'][] = ['gpt-5', 'gpt-5-mini'];
const autoSaveIntervals = [
    { label: 'Every 15 seconds', value: 15 },
    { label: 'Every 30 seconds', value: 30 },
    { label: 'Every minute', value: 60 },
    { label: 'Every 2 minutes', value: 120 },
];

export const SettingsModal: React.FC = () => {
    const { isOpen, onClose, onSave, currentSettings, aggregationMode, setAggregationMode } = useAppStore(state => ({
        isOpen: state.isSettingsModalOpen,
        onClose: () => state.setIsSettingsModalOpen(false),
        onSave: state.handleSaveSettings,
        currentSettings: state.settings,
        aggregationMode: state.aggregationModePreference,
        setAggregationMode: state.setAggregationModePreference,
    }));

    const [settings, setSettings] = useState<Settings>(currentSettings);

    useEffect(() => {
        setSettings(currentSettings);
    }, [currentSettings, isOpen]);

    if (!isOpen) {
        return null;
    }

    const handleSave = () => {
        onSave(settings);
        onClose();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'autoSaveIntervalSeconds') {
            setSettings(prev => ({ ...prev, [name]: Number(value) }));
        } else {
            setSettings(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleProviderChange = (provider: 'google' | 'openai') => {
        setSettings(prev => {
            const currentModelIsGoogle = googleModels.includes(prev.model as any);
            const currentModelIsOpenAI = openAIModels.includes(prev.model as any);
            
            let newModel = prev.model;
            if (provider === 'google' && !currentModelIsGoogle) {
                newModel = 'gemini-2.5-pro';
            } else if (provider === 'openai' && !currentModelIsOpenAI) {
                newModel = 'gpt-5';
            }

            return { ...prev, provider, model: newModel as any };
        });
    };

    const aggregationModeButtonClass = (mode: 'sample' | 'full') =>
        `px-3 py-1 text-xs font-semibold rounded-md transition ${
            aggregationMode === mode
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
        }`;


    return (
        <div 
            className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center z-50"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md border border-slate-200 max-h-[80vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Settings</h2>
                
                <div className="space-y-6">
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            AI Provider
                        </label>
                        <div className="flex space-x-2 rounded-lg bg-slate-200 p-1">
                            <button onClick={() => handleProviderChange('google')} className={`w-full rounded-md py-1.5 text-sm font-medium transition-colors ${settings.provider === 'google' ? 'bg-blue-600 text-white shadow' : 'text-slate-700 hover:bg-slate-300'}`}>
                                Google Gemini
                            </button>
                            <button onClick={() => handleProviderChange('openai')} className={`w-full rounded-md py-1.5 text-sm font-medium transition-colors ${settings.provider === 'openai' ? 'bg-blue-600 text-white shadow' : 'text-slate-700 hover:bg-slate-300'}`}>
                                OpenAI
                            </button>
                        </div>
                    </div>
                    
                    {settings.provider === 'google' && (
                        <div>
                            <label htmlFor="geminiApiKey" className="block text-sm font-medium text-slate-700">
                                Gemini API Key
                            </label>
                            <input
                                type="password"
                                id="geminiApiKey"
                                name="geminiApiKey"
                                value={settings.geminiApiKey}
                                onChange={handleInputChange}
                                className="mt-1 block w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter your API key"
                            />
                             <p className="text-xs text-slate-500 mt-1">
                                Get your key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google AI Studio</a>.
                            </p>
                        </div>
                    )}
                    
                    {settings.provider === 'openai' && (
                         <div>
                            <label htmlFor="openAIApiKey" className="block text-sm font-medium text-slate-700">
                                OpenAI API Key
                            </label>
                            <input
                                type="password"
                                id="openAIApiKey"
                                name="openAIApiKey"
                                value={settings.openAIApiKey}
                                onChange={handleInputChange}
                                className="mt-1 block w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter your API key (sk-...)"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                Get your key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">OpenAI Platform</a>.
                            </p>
                        </div>
                    )}


                    <div>
                        <label htmlFor="model" className="block text-sm font-medium text-slate-700">
                            AI Model
                        </label>
                         <input
                            type="text"
                            id="model"
                            name="model"
                            value={settings.model}
                            onChange={handleInputChange}
                            list="model-list"
                            className="mt-1 block w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., gpt-5"
                        />
                        <datalist id="model-list">
                             {(settings.provider === 'google' ? googleModels : openAIModels).map(model => (
                                <option key={model} value={model} />
                            ))}
                        </datalist>
                         <p className="text-xs text-slate-500 mt-1">
                            Select a suggested model or type a custom one.
                        </p>
                    </div>

                    <div>
                        <label htmlFor="language" className="block text-sm font-medium text-slate-700">
                            Agent Language
                        </label>
                        <select
                            id="language"
                            name="language"
                            value={settings.language}
                            onChange={handleInputChange}
                            className="mt-1 block w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {languages.map(lang => (
                                <option key={lang} value={lang}>{lang}</option>
                            ))}
                        </select>
                         <p className="text-xs text-slate-500 mt-1">
                            Primary language for AI summaries and chat responses.
                        </p>
                    </div>

                    <div className="border-t border-slate-200 pt-4">
                        <label className="block text-sm font-medium text-slate-700">
                            Aggregation Mode · 汇总模式
                        </label>
                        <p className="text-xs text-slate-500 mb-3 max-w-sm">
                            全量 = DuckDB 全表扫描（默认，精准）；快速 = 采样 5k 行内以提速。每个数据集将记住你的选择。
                        </p>
                        <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                            <button
                                type="button"
                                className={aggregationModeButtonClass('full')}
                                onClick={() => setAggregationMode('full')}
                            >
                                全量（默认）
                            </button>
                            <button
                                type="button"
                                className={aggregationModeButtonClass('sample')}
                                onClick={() => setAggregationMode('sample')}
                            >
                                快速（采样）
                            </button>
                        </div>
                    </div>

                    <div className="border-t border-slate-200 pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">
                                    Auto-Save
                                </label>
                                <p className="text-xs text-slate-500">
                                    Periodically store the current analysis so you can recover it later.
                                </p>
                            </div>
                            <button
                                onClick={() => setSettings(prev => ({ ...prev, autoSaveEnabled: !prev.autoSaveEnabled }))}
                                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                                    settings.autoSaveEnabled ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                                }`}
                            >
                                {settings.autoSaveEnabled ? 'Enabled' : 'Paused'}
                            </button>
                        </div>
                        {settings.autoSaveEnabled && (
                            <div className="mt-4">
                                <label htmlFor="autoSaveIntervalSeconds" className="block text-sm font-medium text-slate-700">
                                    Auto-Save Frequency
                                </label>
                                <select
                                    id="autoSaveIntervalSeconds"
                                    name="autoSaveIntervalSeconds"
                                    value={settings.autoSaveIntervalSeconds}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {autoSaveIntervals.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-8 flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors"
                    >
                        Save Settings
                    </button>
                </div>
            </div>
        </div>
    );
};
