import type { ColumnProfile, CsvRow } from '../types';

const PREFERRED_GROUP_TYPES: ColumnProfile['type'][] = ['categorical', 'date', 'time'];

const countUniqueValues = (rows: CsvRow[], column: string, maxSample = 500): number => {
    if (!rows.length) return 0;
    const seen = new Set<string>();
    const limit = Math.min(rows.length, maxSample);
    for (let i = 0; i < limit; i++) {
        const value = rows[i][column];
        if (value === undefined || value === null) continue;
        const normalized = String(value).trim();
        if (!normalized) continue;
        seen.add(normalized);
        if (seen.size > 200) break;
    }
    return seen.size;
};

export interface GroupByCandidate {
    profile: ColumnProfile;
    uniqueValues: number;
}

export const getGroupableColumnCandidates = (
    columnProfiles: ColumnProfile[],
    rows: CsvRow[],
): GroupByCandidate[] => {
    if (!columnProfiles.length) return [];

    const profiledCandidates = columnProfiles.map(profile => ({
        profile,
        uniqueValues:
            typeof profile.uniqueValues === 'number' ? profile.uniqueValues : countUniqueValues(rows, profile.name),
    }));

    const preferred = profiledCandidates
        .filter(
            ({ profile, uniqueValues }) =>
                uniqueValues > 1 && (PREFERRED_GROUP_TYPES.includes(profile.type) || uniqueValues <= 50),
        )
        .sort((a, b) => {
            const typeScore = (type: ColumnProfile['type']) => (PREFERRED_GROUP_TYPES.includes(type) ? 0 : 1);
            const aScore = typeScore(a.profile.type);
            const bScore = typeScore(b.profile.type);
            if (aScore !== bScore) return aScore - bScore;
            const ideal = 12;
            const aDistance = Math.abs((a.uniqueValues || 100) - ideal);
            const bDistance = Math.abs((b.uniqueValues || 100) - ideal);
            return aDistance - bDistance;
        });

    if (preferred.length > 0) return preferred;

    return profiledCandidates.filter(candidate => (candidate.uniqueValues || 0) > 1);
};

export const inferGroupByColumn = (
    columnProfiles: ColumnProfile[],
    rows: CsvRow[],
): { column: string | null; inferred: boolean } => {
    const candidates = getGroupableColumnCandidates(columnProfiles, rows);
    if (!candidates.length) {
        return { column: null, inferred: false };
    }
    return { column: candidates[0].profile.name, inferred: true };
};
