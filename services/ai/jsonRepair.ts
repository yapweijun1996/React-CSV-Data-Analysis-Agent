export class JsonCoercionError extends Error {
    readonly rawContent: string;

    constructor(message: string, rawContent: string) {
        super(message);
        this.name = 'JsonCoercionError';
        this.rawContent = rawContent;
    }
}

const CODE_FENCE_PATTERN = /```(?:json)?\s*([\s\S]*?)```/i;

const tryParseObject = (candidate: string): Record<string, unknown> | null => {
    try {
        const parsed = JSON.parse(candidate);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed as Record<string, unknown>;
        }
    } catch {
        return null;
    }
    return null;
};

const extractBraceWrappedCandidate = (content: string): string | null => {
    let depth = 0;
    let startIndex = -1;
    let inString = false;
    let isEscaped = false;

    for (let i = 0; i < content.length; i++) {
        const char = content[i];

        if (inString) {
            if (isEscaped) {
                isEscaped = false;
                continue;
            }
            if (char === '\\') {
                isEscaped = true;
                continue;
            }
            if (char === '"') {
                inString = false;
            }
            continue;
        }

        if (char === '"') {
            inString = true;
            continue;
        }

        if (char === '{') {
            if (depth === 0) {
                startIndex = i;
            }
            depth += 1;
        } else if (char === '}' && depth > 0) {
            depth -= 1;
            if (depth === 0 && startIndex !== -1) {
                return content.slice(startIndex, i + 1).trim();
            }
        }
    }

    return null;
};

export const coerceJsonObject = <T>(rawContent: unknown): T => {
    if (rawContent && typeof rawContent === 'object' && !Array.isArray(rawContent)) {
        return rawContent as T;
    }

    const stringified =
        typeof rawContent === 'string'
            ? rawContent
            : rawContent != null
              ? String(rawContent)
              : '';
    const trimmed = stringified.trim();
    const candidates: string[] = [];

    if (trimmed) {
        candidates.push(trimmed);
    }

    const codeFence = trimmed.match(CODE_FENCE_PATTERN);
    if (codeFence?.[1]) {
        candidates.push(codeFence[1].trim());
    }

    const braceCandidate = extractBraceWrappedCandidate(trimmed);
    if (braceCandidate) {
        candidates.push(braceCandidate);
    }

    for (const candidate of candidates) {
        const parsed = tryParseObject(candidate);
        if (parsed) {
            return parsed as T;
        }
    }

    throw new JsonCoercionError('Failed to parse JSON object.', trimmed);
};
