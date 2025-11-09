import { useLayoutEffect } from 'react';

type AutosizeOptions = {
    maxHeight?: number;
    minHeight?: number;
};

const DEFAULT_MAX_HEIGHT = 240;

export const useAutosizeTextArea = (
    textAreaRef: React.RefObject<HTMLTextAreaElement>,
    value: string,
    options?: AutosizeOptions
) => {
    const { maxHeight = DEFAULT_MAX_HEIGHT, minHeight = 0 } = options ?? {};

    useLayoutEffect(() => {
        const textarea = textAreaRef.current;
        if (!textarea) return;

        textarea.style.height = 'auto';

        const scrollHeight = textarea.scrollHeight;
        const constrainedHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
        textarea.style.height = `${constrainedHeight}px`;
        textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
    }, [textAreaRef, value, maxHeight, minHeight]);
};
