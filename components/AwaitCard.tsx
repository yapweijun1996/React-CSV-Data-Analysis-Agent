import React, { useState } from 'react';
import type { AwaitUserPayload } from '@/types';

interface AwaitCardProps {
    prompt: AwaitUserPayload;
    onSelect: (optionId: string) => void;
    onSubmitFreeText: (text: string) => void;
    disabled?: boolean;
    waitingHint?: string | null;
    reasonText?: string | null;
    latestObservation?: {
        title: string;
        detail?: string | null;
        meta?: string | null;
    };
}

export const AwaitCard: React.FC<AwaitCardProps> = ({
    prompt,
    onSelect,
    onSubmitFreeText,
    disabled,
    waitingHint,
    reasonText,
    latestObservation,
}) => {
    const [customInput, setCustomInput] = useState('');

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!customInput.trim() || disabled) return;
        onSubmitFreeText(customInput.trim());
        setCustomInput('');
    };

    return (
        <div className="bg-white border border-amber-200 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-amber-800">
                <span className="text-xl">🛑</span>
                <div>
                    <p className="text-sm font-semibold">需要你的选择才能继续</p>
                    <p className="text-base font-bold">{prompt.question}</p>
                    {reasonText && <p className="text-xs text-amber-600 mt-1">{reasonText}</p>}
                </div>
            </div>
            {latestObservation && (
                <div className="border border-amber-100 bg-amber-50 rounded-lg p-3 text-xs text-amber-800 space-y-1">
                    <p className="font-semibold flex items-center gap-1">
                        <span>📋</span>
                        <span>最近进度：{latestObservation.title}</span>
                    </p>
                    {latestObservation.detail && <p className="text-amber-700">{latestObservation.detail}</p>}
                    {latestObservation.meta && <p className="text-[11px] text-amber-600">{latestObservation.meta}</p>}
                </div>
            )}
            <div className="flex flex-wrap gap-2">
                {prompt.options.map(option => (
                    <button
                        key={option.id}
                        type="button"
                        onClick={() => onSelect(option.id)}
                        disabled={disabled}
                        className="px-3 py-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-sm font-semibold hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {option.label}
                    </button>
                ))}
            </div>
            {prompt.allowFreeText && (
                <form onSubmit={handleSubmit} className="flex gap-2 items-center">
                    <input
                        value={customInput}
                        onChange={event => setCustomInput(event.target.value)}
                        placeholder={prompt.placeholder ?? '请输入自定义指令'}
                        disabled={disabled}
                        className="flex-1 border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:opacity-50"
                    />
                    <button
                        type="submit"
                        disabled={!customInput.trim() || disabled}
                        className="px-3 py-2 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        提交
                    </button>
                </form>
            )}
            {waitingHint && <p className="text-xs text-amber-600">{waitingHint}</p>}
        </div>
    );
};

export default AwaitCard;
