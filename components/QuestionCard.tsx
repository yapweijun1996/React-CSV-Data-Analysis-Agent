import React, { useMemo, useState } from 'react';

interface QuestionCardProps {
    promptId: string;
    message: string;
    onSubmit: (value: string) => void;
    disabled?: boolean;
    isActive: boolean;
}

const extractQuickChoices = (message: string): string[] => {
    const lines = message.split(/\n+/).map(line => line.trim());
    const optionRegex = /^([0-9]+|[A-Za-z])[\.\)\]]\s+(.+)$/;
    const bulletRegex = /^[-•]\s*(?:option|choice)?\s*([0-9]+|[A-Za-z])[:\.\-\)]?\s+(.+)$/i;
    const choices: string[] = [];
    lines.forEach(line => {
        if (!line) return;
        const match = line.match(optionRegex) ?? line.match(bulletRegex);
        if (match && match[2]) {
            choices.push(match[2].trim());
        }
    });
    return choices.slice(0, 5);
};

const QuestionCard: React.FC<QuestionCardProps> = ({ promptId, message, onSubmit, disabled = false, isActive }) => {
    const quickChoices = useMemo(() => extractQuickChoices(message), [message]);
    const [inputValue, setInputValue] = useState('');
    const [hasSubmitted, setHasSubmitted] = useState(false);
    const isDisabled = disabled || hasSubmitted;

    const submitValue = (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) return;
        setHasSubmitted(true);
        onSubmit(trimmed);
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!inputValue.trim() || isDisabled) return;
        submitValue(inputValue);
        setInputValue('');
    };

    return (
        <div
            className={`rounded-md border px-3 py-2 ${isActive ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-slate-50'} transition-colors`}
        >
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-500 mb-2">
                <span>Prompt {promptId}</span>
                {hasSubmitted && <span className="text-emerald-600 font-semibold">Sent</span>}
            </div>
            {quickChoices.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                    {quickChoices.map(choice => (
                        <button
                            type="button"
                            key={`${promptId}-${choice}`}
                            onClick={() => submitValue(choice)}
                            disabled={isDisabled}
                            className={`text-xs px-3 py-1 rounded-full border ${
                                isDisabled
                                    ? 'text-slate-400 border-slate-200 bg-white cursor-not-allowed'
                                    : 'text-blue-700 border-blue-200 bg-white hover:bg-blue-100'
                            } transition-colors`}
                        >
                            {choice}
                        </button>
                    ))}
                </div>
            )}
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                    type="text"
                    value={inputValue}
                    onChange={event => setInputValue(event.target.value)}
                    placeholder="Type a custom answer…"
                    disabled={isDisabled}
                    className="flex-grow rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
                />
                <button
                    type="submit"
                    disabled={isDisabled || !inputValue.trim()}
                    className="text-xs font-semibold px-3 py-1 rounded-md bg-blue-600 text-white disabled:bg-slate-300 disabled:text-slate-500 transition-colors"
                >
                    Send
                </button>
            </form>
        </div>
    );
};

export default QuestionCard;
