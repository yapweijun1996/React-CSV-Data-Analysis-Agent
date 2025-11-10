export const FULL_WIDTH_DOT = '\uFF0E';
export const FULL_WIDTH_LEFT_PAREN = '\uFF08';
export const FULL_WIDTH_RIGHT_PAREN = '\uFF09';
export const FULL_WIDTH_COMMA = '\uFF0C';

const sanitizeChoiceLabel = (value: string): string => {
    let label = value.trim();
    label = label.replace(/^\*\*(.+)\*\*$/, '$1').trim();
    label = label.replace(/^\*+/, '').replace(/\*+$/, '').trim();
    label = label.replace(/^["'“”]+/, '').replace(/["'“”]+$/, '').trim();
    label = label.replace(/\s*\(\s*(?:optional|default)\s*\)\s*$/i, '').trim();
    label = label.replace(/[:;，。]+$/, '').trim();
    return label;
};

const OPTION_PATTERNS: RegExp[] = [
    /^([0-9]+|[A-Za-z])[\.\)\]]\s+(.+)$/,
    /^([0-9]+|[A-Za-z])[．、]\s+(.+)$/,
    /^[(（\[]?(?:option|choice)?\s*([0-9]+|[A-Za-z])[\)\]）\.．、:-]\s+(.+)$/i,
    /^([0-9]+|[A-Za-z])\s*[-–—]\s+(.+)$/,
    /^[-•●]\s*(?:option|choice)?\s*([0-9]+|[A-Za-z])?[:\.\-\)]?\s+(.+)$/i,
];

const INLINE_OPTION_REGEX = new RegExp(
    String.raw`(?:^|\n)\s*(?:[\(\（\[]?\s*(?:option|choice)?\s*)?([0-9]+|[A-Za-z])[\)\]）\.．、:-]\s+([^\n]+?)(?=\n|$)`,
    'gi',
);

export const extractQuickChoices = (message: string): string[] => {
    const normalized = message
        .replace(/\r/g, '')
        .replace(new RegExp(FULL_WIDTH_DOT, 'g'), '.')
        .replace(new RegExp(FULL_WIDTH_LEFT_PAREN, 'g'), '(')
        .replace(new RegExp(FULL_WIDTH_RIGHT_PAREN, 'g'), ')')
        .replace(new RegExp(FULL_WIDTH_COMMA, 'g'), '、');
    const lines = normalized.split(/\n+/).map(line => line.trim());
    const choices = new Set<string>();

    const pushChoice = (value: string | undefined) => {
        if (!value) return;
        const cleaned = sanitizeChoiceLabel(value);
        if (!cleaned || cleaned.length < 2 || cleaned.length > 140) return;
        choices.add(cleaned);
    };

    for (const rawLine of lines) {
        if (!rawLine) continue;
        for (const pattern of OPTION_PATTERNS) {
            const match = rawLine.match(pattern);
            if (match && match[2]) {
                pushChoice(match[2]);
                break;
            }
        }
    }

    if (choices.size === 0) {
        let match: RegExpExecArray | null;
        while ((match = INLINE_OPTION_REGEX.exec(normalized)) !== null) {
            pushChoice(match[2]);
            if (choices.size >= 5) break;
        }
    }

    return Array.from(choices).slice(0, 5);
};
