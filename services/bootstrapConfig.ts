import { Settings } from '../types';

type Provider = Settings['provider'];
type Language = Settings['language'];

export interface UiVisibilityFlags {
    showNewButton: boolean;
    showSettingsButton: boolean;
}

interface BootstrapConfig {
    defaultSettings?: Partial<Settings>;
    ui?: Partial<UiVisibilityFlags>;
}

declare global {
    interface Window {
        tempGeminiApiKey?: string;
        tempOpenAIApiKey?: string;
        tempProvider?: Provider;
        tempModel?: string;
        tempLanguage?: Language | string;
        tempShowNewButton?: string | boolean;
        tempShowSettingsButton?: string | boolean;
        tempgeminiapikey?: string;
        tempopenaiapikey?: string;
        tempprovider?: Provider | string;
        tempmodel?: string;
        templanguage?: Language | string;
        tempshownewbutton?: string | boolean;
        tempshowsettingsbutton?: string | boolean;
        __CSV_AGENT_DEFAULTS__?: BootstrapConfig;
    }
}

const baseUiFlags: UiVisibilityFlags = {
    showNewButton: true,
    showSettingsButton: true,
};

const normalizeString = (value: unknown): string | undefined => {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
};

const normalizeProvider = (value: unknown): Provider | undefined => {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim().toLowerCase();
    if (normalized === 'google') return 'google';
    if (normalized === 'openai') return 'openai';
    return undefined;
};

const normalizeLanguage = (value: unknown): Language | undefined => {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim().toLowerCase();
    switch (normalized) {
        case 'english':
            return 'English';
        case 'mandarin':
            return 'Mandarin';
        case 'spanish':
            return 'Spanish';
        case 'japanese':
            return 'Japanese';
        case 'french':
            return 'French';
        default:
            return undefined;
    }
};

const normalizeBoolean = (value: unknown): boolean | undefined => {
    if (typeof value === 'boolean') return value;
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim().toLowerCase();
    if (['y', 'yes', 'true', '1'].includes(normalized)) return true;
    if (['n', 'no', 'false', '0'].includes(normalized)) return false;
    return undefined;
};

const getGlobalBootstrapConfig = (): BootstrapConfig => {
    if (typeof window === 'undefined') {
        return {};
    }
    return window.__CSV_AGENT_DEFAULTS__ ?? {};
};

const getWindowSettingsOverrides = (): Partial<Settings> => {
    if (typeof window === 'undefined') {
        return {};
    }

    const overrides: Partial<Settings> = {};
    const geminiKey = normalizeString(window.tempGeminiApiKey ?? window.tempgeminiapikey);
    if (geminiKey) {
        overrides.geminiApiKey = geminiKey;
    }

    const openAiKey = normalizeString(window.tempOpenAIApiKey ?? window.tempopenaiapikey);
    if (openAiKey) {
        overrides.openAIApiKey = openAiKey;
    }

    const provider = normalizeProvider(window.tempProvider ?? window.tempprovider);
    if (provider) {
        overrides.provider = provider;
    }

    const model = normalizeString(window.tempModel ?? window.tempmodel);
    if (model) {
        overrides.model = model;
    }

    const language = normalizeLanguage(window.tempLanguage ?? window.templanguage);
    if (language) {
        overrides.language = language;
    }

    return overrides;
};

const getWindowUiOverrides = (): Partial<UiVisibilityFlags> => {
    if (typeof window === 'undefined') {
        return {};
    }

    const overrides: Partial<UiVisibilityFlags> = {};

    const showNew = normalizeBoolean(window.tempShowNewButton ?? window.tempshownewbutton);
    if (typeof showNew === 'boolean') {
        overrides.showNewButton = showNew;
    }

    const showSettings = normalizeBoolean(window.tempShowSettingsButton ?? window.tempshowsettingsbutton);
    if (typeof showSettings === 'boolean') {
        overrides.showSettingsButton = showSettings;
    }

    return overrides;
};

export const getBootstrapSettingsOverrides = (): Partial<Settings> => {
    const configOverrides = getGlobalBootstrapConfig().defaultSettings ?? {};
    return {
        ...configOverrides,
        ...getWindowSettingsOverrides(),
    };
};

export const getUiVisibilityConfig = (): UiVisibilityFlags => {
    const configOverrides = getGlobalBootstrapConfig().ui ?? {};
    return {
        ...baseUiFlags,
        ...configOverrides,
        ...getWindowUiOverrides(),
    };
};

export {};
