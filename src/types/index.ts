// Core data types for the Ordinal Social Topology Analyzer

export interface Participant {
    id: string;
    name: string;
}

export interface Ballot {
    voterId: string;
    /** Ordered array of participant IDs, index 0 = rank 1 (most preferred) */
    ranking: string[];
}

export interface AppState {
    participants: Participant[];
    ballots: Ballot[];
}

/** Pairwise majority matrix: matrix[i][j] = number of voters who prefer i over j */
export type PairwiseMatrix = number[][];

/** Borda scores: participantId -> score */
export type BordaScores = Record<string, number>;

/** Rank received distribution: participantId -> array of ranks received (1-indexed) */
export type ReceivedRanks = Record<string, number[]>;

export interface AnalyticsResult {
    // A: Social Choice
    bordaScores: BordaScores;
    bordaRanking: string[]; // sorted by score desc
    giniCoefficient: number;
    lorenzPoints: [number, number][];
    condorcetWinner: string | null;
    condorcetCycles: string[][];
    kendallW: number;
    pairwiseMatrix: PairwiseMatrix;

    // B: Graph Theory
    inDegreeCentrality: Record<string, number>;
    reciprocityIndex: number;
    cycleDensity: number;
    reciprocalPairs: [string, string][]; // mutual top-third

    // C: Network Science
    kCoreDecomposition: Record<string, number>;
    betweennessCentrality: Record<string, number>;
    communities: Record<string, number>; // participantId -> communityId

    // D: Sociology
    stratificationLabel: string;
    marginalizedParticipants: string[];
    popularityGini: number;

    // E: Psychology
    asymmetryMatrix: number[][];
    polarizationScores: Record<string, number>;
    spearmanConformity: Record<string, number>;

    // F: Game Theory
    isTournamentAcyclic: boolean;
    coalitions: string[][];
    eigenvectorCentrality: Record<string, number>;

    // G: Information Theory
    globalEntropy: number;
    individualEntropy: Record<string, number>;
    mutualInformation: number[][];

    // H: Behavioral Economics
    reciprocityImbalance: Record<string, number>;
    lossAversionCount: Record<string, number>;
    topNodeRemovalBordaShift: Record<string, number>;

    // I: Small Group Dynamics
    leadershipScore: Record<string, number>;
    subgroupCohesion: Record<number, number>;
    structuralFragility: number;
}
