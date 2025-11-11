import { runLangChainPrompt } from './promptRunner';
import { useAppStore } from '@/store/useAppStore';

declare global {
    interface Window {
        runLangChainPromptDemo?: (options?: { datasetId?: string | null }) => Promise<void>;
    }
}

const registerDemo = () => {
    if (typeof window === 'undefined') return;
    window.runLangChainPromptDemo = async options => {
        const datasetId = options?.datasetId ?? useAppStore.getState().datasetHash ?? null;
        const result = await runLangChainPrompt({ datasetId, debug: true });
        console.info('[LangChain PoC] plan', result.plan);
        console.info('[LangChain PoC] profile snapshot', result.profile);
        return result;
    };
    console.info('[LangChain PoC] window.runLangChainPromptDemo ready. Call it from DevTools to run the chain.');
};

registerDemo();
