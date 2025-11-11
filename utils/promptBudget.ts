export type PromptStage = 'seed' | 'conversation' | 'context' | 'action';

export interface PromptSection {
    label: string;
    content: string;
    required?: boolean;
    priority?: number;
    stage?: PromptStage;
}

export interface PromptBudgetResult {
    prompt: string;
    trimmedSections: string[];
}

const DEFAULT_PROMPT_BUDGET = 7000; // characters
const TRIM_NOTE_PREFIX = '[Context trimmed due to budget: ';

export const composePromptWithBudget = (
    sections: PromptSection[],
    budget: number = DEFAULT_PROMPT_BUDGET,
    options?: { includeTrimNote?: boolean; stageFilter?: PromptStage | PromptStage[] },
): PromptBudgetResult => {
    const includeTrimNote = options?.includeTrimNote ?? true;
    const stageFilterSet = options?.stageFilter
        ? new Set(Array.isArray(options.stageFilter) ? options.stageFilter : [options.stageFilter])
        : null;

    const filteredSections = stageFilterSet
        ? sections.filter(section => {
              if (!section.stage) return false;
              return stageFilterSet.has(section.stage);
          })
        : sections;

    const sortedSections = [...filteredSections].sort((a, b) => {
        const ap = typeof a.priority === 'number' ? a.priority : 5;
        const bp = typeof b.priority === 'number' ? b.priority : 5;
        return ap - bp;
    });

    const included: string[] = [];
    const trimmed: string[] = [];
    let totalLength = 0;

    sortedSections.forEach((section, index) => {
        const text = section.content?.trim();
        if (!text) return;
        const normalized = text;
        const cost = normalized.length + (included.length > 0 ? 2 : 0); // account for spacing
        const mustInclude = section.required || included.length === 0;
        if (mustInclude || totalLength + cost <= budget) {
            included.push(normalized);
            totalLength += cost;
        } else {
            trimmed.push(section.label || `Section ${index + 1}`);
        }
    });

    let prompt = included.join('\n\n');
    if (includeTrimNote && trimmed.length > 0) {
        const note = `${TRIM_NOTE_PREFIX}${trimmed.join(', ')}]`;
        prompt = `${prompt}\n\n${note}`;
    }

    return { prompt, trimmedSections: trimmed };
};
