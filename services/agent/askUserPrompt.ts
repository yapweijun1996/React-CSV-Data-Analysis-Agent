import type { AppStore } from '@/store/appStoreTypes';
import type { AwaitUserPayload, AwaitUserOption, ColumnProfile, Settings } from '@/types';

const NUMERIC_TYPES = new Set<ColumnProfile['type']>(['numerical', 'currency', 'percentage']);
const DATE_LIKE_TYPES = new Set<ColumnProfile['type']>(['date', 'time']);
const MONTH_KEYWORDS = ['month', 'date', 'period'];
const NUMERIC_KEYWORDS = ['amount', 'value', 'total', 'cost', 'price', 'sales', 'revenue', 'qty', 'quantity'];

type LocaleId = Settings['language'] | 'Mandarin';

interface AskLocaleCopy {
    question: (datasetName: string, rowCount?: number | null) => string;
    placeholder: (exampleMetric?: string | null) => string;
    cleanMonthLabel: (column: string) => string;
    outlierLabel: (column: string) => string;
}

const ASK_LOCALE_COPY: Record<LocaleId, AskLocaleCopy> = {
    Mandarin: {
        question: (datasetName, rowCount) => {
            const suffix = typeof rowCount === 'number' ? `（約 ${rowCount.toLocaleString()} 行）` : '';
            return `「${datasetName}」${suffix}想先看哪個角度？`;
        },
        placeholder: metric => (metric ? `例如：Top10 by ${metric} desc` : '輸入分析請求，例如「Top10 by amount desc」'),
        cleanMonthLabel: column => `清洗/標準化 ${column}`,
        outlierLabel: column => `侦测 ${column} 異常值`,
    },
    English: {
        question: (datasetName, rowCount) => {
            const suffix = typeof rowCount === 'number' ? ` (~${rowCount.toLocaleString()} rows)` : '';
            return `What should we explore first in “${datasetName}”${suffix}?`;
        },
        placeholder: metric => (metric ? `Ex: Top 10 by ${metric} desc` : 'Type a request, e.g. "Top 10 by amount desc"'),
        cleanMonthLabel: column => `Clean/standardize ${column}`,
        outlierLabel: column => `Detect ${column} anomalies`,
    },
    Spanish: {
        question: (datasetName, rowCount) => {
            const suffix = typeof rowCount === 'number' ? ` (~${rowCount.toLocaleString()} filas)` : '';
            return `¿Qué quieres ver primero en “${datasetName}”${suffix}?`;
        },
        placeholder: metric => (metric ? `Ej: Top 10 por ${metric}` : 'Escribe tu solicitud, ej. "Top 10 por amount desc"'),
        cleanMonthLabel: column => `Normalizar ${column}`,
        outlierLabel: column => `Detectar anomalías en ${column}`,
    },
    Japanese: {
        question: (datasetName, rowCount) => {
            const suffix = typeof rowCount === 'number' ? `（約 ${rowCount.toLocaleString()} 行）` : '';
            return `「${datasetName}」${suffix}で最初に見たい分析は？`;
        },
        placeholder: metric => (metric ? `例：Top10 by ${metric}` : '例：「Top10 by amount desc」'),
        cleanMonthLabel: column => `${column} をクリーニング`,
        outlierLabel: column => `${column} の異常を検出`,
    },
    French: {
        question: (datasetName, rowCount) => {
            const suffix = typeof rowCount === 'number' ? ` (~${rowCount.toLocaleString()} lignes)` : '';
            return `Par quoi veut-on commencer sur « ${datasetName} »${suffix} ?`;
        },
        placeholder: metric => (metric ? `Ex : Top 10 par ${metric}` : 'Saisissez une requête, ex. « Top 10 by amount desc »'),
        cleanMonthLabel: column => `Nettoyer standardiser ${column}`,
        outlierLabel: column => `Détecter les anomalies ${column}`,
    },
};

const toLocaleCopy = (language: Settings['language']): AskLocaleCopy =>
    ASK_LOCALE_COPY[language] ?? ASK_LOCALE_COPY.Mandarin;

const normalizeName = (name?: string | null): string => (name ?? '').trim();

const findMonthColumn = (profiles: ColumnProfile[]): ColumnProfile | null => {
    for (const profile of profiles) {
        const name = normalizeName(profile.name);
        if (!name) continue;
        const lower = name.toLowerCase();
        if (DATE_LIKE_TYPES.has(profile.type) || MONTH_KEYWORDS.some(keyword => lower.includes(keyword))) {
            return profile;
        }
    }
    return null;
};

const findNumericColumn = (profiles: ColumnProfile[]): ColumnProfile | null => {
    const keywordMatch = profiles.find(
        profile =>
            NUMERIC_TYPES.has(profile.type) &&
            NUMERIC_KEYWORDS.some(keyword => normalizeName(profile.name).toLowerCase().includes(keyword)),
    );
    if (keywordMatch) return keywordMatch;
    return profiles.find(profile => NUMERIC_TYPES.has(profile.type)) ?? null;
};

const buildOption = (id: string, label: string, metadata?: Record<string, unknown>): AwaitUserOption => ({
    id,
    label,
    metadata: metadata ?? null,
});

export const buildAskUserPrompt = (store: AppStore): AwaitUserPayload => {
    const profiles = store.columnProfiles ?? [];
    const datasetName = store.csvData?.fileName ?? (store.settings.language === 'English' ? 'this dataset' : '這份數據');
    const rowCount = store.datasetProfile?.rowCount ?? store.csvData?.data.length ?? null;
    const locale = toLocaleCopy(store.settings.language);

    const monthColumn = findMonthColumn(profiles);
    const numericColumn = findNumericColumn(profiles);

    const options: AwaitUserOption[] = [];
    if (monthColumn) {
        options.push(buildOption('clean_month', locale.cleanMonthLabel(monthColumn.name), { column: monthColumn.name }));
    }
    if (numericColumn) {
        options.push(
            buildOption('outlier', locale.outlierLabel(numericColumn.name), { valueColumn: numericColumn.name }),
        );
    }

    if (!options.length) {
        options.push(buildOption('clean_month', locale.cleanMonthLabel('InvoiceMonth'), { column: 'InvoiceMonth' }));
        options.push(buildOption('outlier', locale.outlierLabel('Amount'), { valueColumn: 'Amount' }));
    }

    return {
        question: locale.question(datasetName, rowCount),
        options,
        allowFreeText: true,
        placeholder: locale.placeholder(numericColumn?.name ?? monthColumn?.name ?? null),
    };
};
