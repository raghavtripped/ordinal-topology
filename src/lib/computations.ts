/**
 * Core computation engine for Ordinal Social Topology Analyzer.
 * All functions are pure and suitable for memoization.
 * Complexity: O(n²) to O(n³) — acceptable for n ≤ 50.
 */

import type { Ballot, Participant, PairwiseMatrix, BordaScores, ReceivedRanks } from '../types';

// ─────────────────────────────────────────────────────────────
// HELPER UTILITIES
// ─────────────────────────────────────────────────────────────

/** Get rank (1-based) that voter gave to target. Returns -1 if not found. */
export function getRank(ballot: Ballot, targetId: string): number {
    const idx = ballot.ranking.indexOf(targetId);
    return idx === -1 ? -1 : idx + 1;
}

/** Get how many points (n-1 - rank + 1 = n - rank) a participant gets in a ballot */
function bordaPoints(rank: number, n: number): number {
    // rank is 1-based; n participants total, so n-1 others
    // Points = (n-1) - (rank-1) = n - rank
    return n - rank;
}

/** Generate all IDs from participants */
export function getIds(participants: Participant[]): string[] {
    return participants.map(p => p.id);
}

// ─────────────────────────────────────────────────────────────
// A. SOCIAL CHOICE THEORY
// ─────────────────────────────────────────────────────────────

/**
 * Build pairwise majority matrix.
 * matrix[i][j] = number of ballots preferring participant[i] over participant[j]
 */
export function buildPairwiseMatrix(
    ballots: Ballot[],
    participants: Participant[]
): PairwiseMatrix {
    const n = participants.length;
    const ids = getIds(participants);
    const matrix: PairwiseMatrix = Array.from({ length: n }, () => Array(n).fill(0));

    for (const ballot of ballots) {
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (i === j) continue;
                const rankI = getRank(ballot, ids[i]);
                const rankJ = getRank(ballot, ids[j]);
                if (rankI > 0 && rankJ > 0 && rankI < rankJ) {
                    // voter prefers i over j
                    matrix[i][j]++;
                }
            }
        }
    }
    return matrix;
}

/**
 * Compute Borda scores.
 * Score for participant = sum of (n - rank_given_by_each_voter)
 */
export function computeBordaScores(
    ballots: Ballot[],
    participants: Participant[]
): BordaScores {
    const n = participants.length;
    const scores: BordaScores = {};
    for (const p of participants) scores[p.id] = 0;

    for (const ballot of ballots) {
        for (const p of participants) {
            if (p.id === ballot.voterId) continue;
            const rank = getRank(ballot, p.id);
            if (rank > 0) {
                scores[p.id] += bordaPoints(rank, n);
            }
        }
    }
    return scores;
}

/**
 * Compute received ranks per participant (across all ballots that ranked them).
 */
export function computeReceivedRanks(
    ballots: Ballot[],
    participants: Participant[]
): ReceivedRanks {
    const received: ReceivedRanks = {};
    for (const p of participants) received[p.id] = [];

    for (const ballot of ballots) {
        for (const p of participants) {
            if (p.id === ballot.voterId) continue;
            const rank = getRank(ballot, p.id);
            if (rank > 0) received[p.id].push(rank);
        }
    }
    return received;
}

/**
 * Detect Condorcet winner: beats every other candidate in pairwise majority.
 * Returns null if no Condorcet winner exists (cycle present).
 */
export function detectCondorcetWinner(
    matrix: PairwiseMatrix,
    participants: Participant[],
    numBallots: number
): string | null {
    const n = participants.length;
    const majority = numBallots / 2;

    for (let i = 0; i < n; i++) {
        let beatsAll = true;
        for (let j = 0; j < n; j++) {
            if (i === j) continue;
            if (matrix[i][j] <= majority) {
                beatsAll = false;
                break;
            }
        }
        if (beatsAll) return participants[i].id;
    }
    return null;
}

/**
 * Detect majority graph cycles (3-cycles / Condorcet cycles).
 * Returns array of [a, b, c] triples where a→b→c→a in majority preference.
 */
export function findCondorcetCycles(
    matrix: PairwiseMatrix,
    participants: Participant[],
    numBallots: number
): string[][] {
    const n = participants.length;
    const ids = getIds(participants);
    const majority = numBallots / 2;
    const cycles: string[][] = [];

    // Check for 3-cycles: a→b, b→c, c→a
    for (let a = 0; a < n; a++) {
        for (let b = 0; b < n; b++) {
            if (b === a) continue;
            if (matrix[a][b] <= majority) continue;
            for (let c = 0; c < n; c++) {
                if (c === a || c === b) continue;
                if (matrix[b][c] > majority && matrix[c][a] > majority) {
                    cycles.push([ids[a], ids[b], ids[c]]);
                }
            }
        }
    }
    return cycles;
}

/**
 * Compute Kendall's W (coefficient of concordance).
 * W = 1 → complete agreement; W = 0 → maximum disagreement
 */
export function computeKendallW(
    ballots: Ballot[],
    participants: Participant[]
): number {
    const n = participants.length; // number of items being ranked
    const m = ballots.length; // number of raters

    if (m < 2 || n < 2) return 0;

    const ids = getIds(participants);

    // Compute sum of ranks for each participant across all ballots
    const rankSums: number[] = Array(n).fill(0);
    for (let j = 0; j < n; j++) {
        for (const ballot of ballots) {
            const rank = getRank(ballot, ids[j]);
            if (rank > 0) rankSums[j] += rank;
        }
    }

    const meanRankSum = (m * (n + 1)) / 2;
    // S = sum of squared deviations from the mean rank sum
    const S = rankSums.reduce((acc, r) => acc + Math.pow(r - meanRankSum, 2), 0);

    // W = 12S / (m² * (n³ - n))
    const W = (12 * S) / (m * m * (Math.pow(n, 3) - n));
    return Math.max(0, Math.min(1, W));
}

// ─────────────────────────────────────────────────────────────
// B. GRAPH THEORY
// ─────────────────────────────────────────────────────────────

/**
 * Build adjacency-weighted directed graph as a weight matrix.
 * weight[i][j] = sum of ranks given by i to j (lower = stronger link)
 * We invert: weight = (n - rank) so higher = stronger preference
 */
export function buildWeightMatrix(
    ballots: Ballot[],
    participants: Participant[]
): number[][] {
    const n = participants.length;
    const ids = getIds(participants);
    const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

    for (const ballot of ballots) {
        const voterIdx = ids.indexOf(ballot.voterId);
        if (voterIdx === -1) continue;
        for (let j = 0; j < n; j++) {
            if (ids[j] === ballot.voterId) continue;
            const rank = getRank(ballot, ids[j]);
            if (rank > 0) {
                matrix[voterIdx][j] += n - rank; // higher preference = higher weight
            }
        }
    }
    return matrix;
}

/**
 * In-degree centrality: normalized sum of weights pointing to each node.
 */
export function computeInDegreeCentrality(
    weightMatrix: number[][],
    participants: Participant[]
): Record<string, number> {
    const n = participants.length;
    const result: Record<string, number> = {};
    const ids = getIds(participants);

    for (let j = 0; j < n; j++) {
        let inDeg = 0;
        for (let i = 0; i < n; i++) inDeg += weightMatrix[i][j];
        result[ids[j]] = inDeg;
    }

    // Normalize by max
    const max = Math.max(...Object.values(result), 1);
    for (const id in result) result[id] = result[id] / max;
    return result;
}

/**
 * Reciprocity index: fraction of dyads where both participants place each other in top-third.
 */
export function computeReciprocityIndex(
    ballots: Ballot[],
    participants: Participant[]
): { index: number; pairs: [string, string][] } {
    const n = participants.length;
    const ids = getIds(participants);
    const topThird = Math.ceil((n - 1) / 3);
    const mutualPairs: [string, string][] = [];

    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const ballotI = ballots.find(b => b.voterId === ids[i]);
            const ballotJ = ballots.find(b => b.voterId === ids[j]);
            if (!ballotI || !ballotJ) continue;
            const rankIofJ = getRank(ballotI, ids[j]);
            const rankJofI = getRank(ballotJ, ids[i]);
            if (rankIofJ > 0 && rankIofJ <= topThird && rankJofI > 0 && rankJofI <= topThird) {
                mutualPairs.push([ids[i], ids[j]]);
            }
        }
    }

    const totalDyads = (n * (n - 1)) / 2;
    return {
        index: totalDyads > 0 ? mutualPairs.length / totalDyads : 0,
        pairs: mutualPairs,
    };
}

/**
 * Cycle density: count 3-node cycles in preference graph / total triads.
 */
export function computeCycleDensity(
    pairwiseMatrix: PairwiseMatrix,
    numBallots: number,
    n: number
): number {
    const majority = numBallots / 2;
    let cycleCount = 0;
    const totalTriads = (n * (n - 1) * (n - 2)) / 6;
    if (totalTriads === 0) return 0;

    for (let a = 0; a < n; a++) {
        for (let b = a + 1; b < n; b++) {
            for (let c = b + 1; c < n; c++) {
                // Check all 2 cyclic directions among a,b,c
                const aWinsB = pairwiseMatrix[a][b] > majority;
                const bWinsC = pairwiseMatrix[b][c] > majority;
                const cWinsA = pairwiseMatrix[c][a] > majority;
                const bWinsA = pairwiseMatrix[b][a] > majority;
                const cWinsB = pairwiseMatrix[c][b] > majority;
                const aWinsC = pairwiseMatrix[a][c] > majority;

                if ((aWinsB && bWinsC && cWinsA) || (bWinsA && aWinsC && cWinsB)) {
                    cycleCount++;
                }
            }
        }
    }

    return totalTriads > 0 ? cycleCount / totalTriads : 0;
}

// ─────────────────────────────────────────────────────────────
// C. NETWORK SCIENCE
// ─────────────────────────────────────────────────────────────

/**
 * K-core decomposition on preference graph.
 * A node has degree k if it has strong preference links (top-third) to/from ≥ k others.
 */
export function computeKCoreDecomposition(
    ballots: Ballot[],
    participants: Participant[]
): Record<string, number> {
    const n = participants.length;
    const ids = getIds(participants);
    const topThird = Math.ceil((n - 1) / 3);

    // Build undirected adjacency based on mutual or one-sided top-third preferences
    const adj: Set<number>[] = Array.from({ length: n }, () => new Set());

    for (let i = 0; i < n; i++) {
        const ballotI = ballots.find(b => b.voterId === ids[i]);
        if (!ballotI) continue;
        for (let j = 0; j < n; j++) {
            if (i === j) continue;
            const rank = getRank(ballotI, ids[j]);
            if (rank > 0 && rank <= topThird) {
                adj[i].add(j);
                adj[j].add(i);
            }
        }
    }

    // Iterative k-core: repeatedly remove nodes with degree < k
    const degree = adj.map(s => s.size);
    const core: number[] = Array(n).fill(0);
    const removed = Array(n).fill(false);

    for (let k = 1; k < n; k++) {
        let changed = true;
        while (changed) {
            changed = false;
            for (let i = 0; i < n; i++) {
                if (!removed[i] && degree[i] < k) {
                    removed[i] = true;
                    core[i] = k - 1;
                    for (const j of adj[i]) {
                        if (!removed[j]) degree[j]--;
                    }
                    changed = true;
                }
            }
        }
        // If all removed, stop
        if (removed.every(Boolean)) break;
    }

    // Assign max k to remaining nodes
    for (let i = 0; i < n; i++) {
        if (!removed[i]) core[i] = n - 1;
    }

    const result: Record<string, number> = {};
    for (let i = 0; i < n; i++) result[ids[i]] = core[i];
    return result;
}

/**
 * Betweenness centrality via Brandes algorithm on weighted directed graph.
 * Uses pairwise matrix as adjacency.
 */
export function computeBetweennessCentrality(
    pairwiseMatrix: PairwiseMatrix,
    participants: Participant[],
    numBallots: number
): Record<string, number> {
    const n = participants.length;
    const ids = getIds(participants);
    const majority = numBallots / 2;
    const betweenness: number[] = Array(n).fill(0);

    // Build adjacency list from majority graph
    const adj: number[][] = Array.from({ length: n }, () => []);
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (i !== j && pairwiseMatrix[i][j] > majority) {
                adj[i].push(j);
            }
        }
    }

    // Brandes algorithm (unweighted BFS)
    for (let s = 0; s < n; s++) {
        const stack: number[] = [];
        const pred: number[][] = Array.from({ length: n }, () => []);
        const sigma: number[] = Array(n).fill(0);
        sigma[s] = 1;
        const dist: number[] = Array(n).fill(-1);
        dist[s] = 0;
        const queue: number[] = [s];

        while (queue.length > 0) {
            const v = queue.shift()!;
            stack.push(v);
            for (const w of adj[v]) {
                if (dist[w] < 0) {
                    queue.push(w);
                    dist[w] = dist[v] + 1;
                }
                if (dist[w] === dist[v] + 1) {
                    sigma[w] += sigma[v];
                    pred[w].push(v);
                }
            }
        }

        const delta: number[] = Array(n).fill(0);
        while (stack.length > 0) {
            const w = stack.pop()!;
            for (const v of pred[w]) {
                delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]);
            }
            if (w !== s) betweenness[w] += delta[w];
        }
    }

    // Normalize
    const norm = (n - 1) * (n - 2);
    const result: Record<string, number> = {};
    for (let i = 0; i < n; i++) {
        result[ids[i]] = norm > 0 ? betweenness[i] / norm : 0;
    }
    return result;
}

/**
 * Louvain-style community detection (simplified greedy modularity).
 * Returns community assignment for each participant.
 */
export function detectCommunities(
    pairwiseMatrix: PairwiseMatrix,
    participants: Participant[],
    numBallots: number
): Record<string, number> {
    const n = participants.length;
    const ids = getIds(participants);
    const majority = numBallots / 2;

    // Community assignment: start each node in its own community
    const community: number[] = Array.from({ length: n }, (_, i) => i);

    // Build symmetric weight matrix from pairwise matrix
    const W: number[][] = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => {
            if (i === j) return 0;
            return (pairwiseMatrix[i][j] + pairwiseMatrix[j][i]) / (2 * numBallots || 1);
        })
    );

    // Greedy optimization: try moving each node to neighbor's community
    let improved = true;
    let iterations = 0;
    while (improved && iterations < 20) {
        improved = false;
        iterations++;
        for (let i = 0; i < n; i++) {
            const currentComm = community[i];
            let bestGain = 0;
            let bestComm = currentComm;

            // Get unique neighboring communities (those with edge weight > majority)
            const neighborComms = new Set<number>();
            for (let j = 0; j < n; j++) {
                if (i !== j && pairwiseMatrix[i][j] > majority) {
                    neighborComms.add(community[j]);
                }
            }

            for (const targetComm of neighborComms) {
                if (targetComm === currentComm) continue;
                // Simplified gain = sum of weights to target community - sum to current
                let gainToTarget = 0;
                let gainFromCurrent = 0;
                for (let j = 0; j < n; j++) {
                    if (j === i) continue;
                    if (community[j] === targetComm) gainToTarget += W[i][j];
                    if (community[j] === currentComm) gainFromCurrent += W[i][j];
                }
                const gain = gainToTarget - gainFromCurrent;
                if (gain > bestGain) {
                    bestGain = gain;
                    bestComm = targetComm;
                }
            }

            if (bestComm !== currentComm) {
                community[i] = bestComm;
                improved = true;
            }
        }
    }

    // Re-label communities 0..k
    const commMap = new Map<number, number>();
    let nextId = 0;
    const result: Record<string, number> = {};
    for (let i = 0; i < n; i++) {
        if (!commMap.has(community[i])) commMap.set(community[i], nextId++);
        result[ids[i]] = commMap.get(community[i])!;
    }
    return result;
}

// ─────────────────────────────────────────────────────────────
// D. SOCIOLOGY
// ─────────────────────────────────────────────────────────────

/**
 * Compute Gini coefficient from an array of non-negative values.
 * Gini = 0 → perfect equality; Gini = 1 → maximal inequality
 */
export function computeGini(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    let sum = 0;
    let totalSum = 0;
    for (let i = 0; i < n; i++) {
        sum += (2 * (i + 1) - n - 1) * sorted[i];
        totalSum += sorted[i];
    }
    return totalSum === 0 ? 0 : sum / (n * totalSum);
}

/**
 * Compute Lorenz curve points: [(cumulative population %, cumulative wealth %)]
 */
export function computeLorenzPoints(values: number[]): [number, number][] {
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    const total = sorted.reduce((a, b) => a + b, 0);
    if (total === 0) return sorted.map((_, i) => [i / n, i / n] as [number, number]);

    const points: [number, number][] = [[0, 0]];
    let cumulative = 0;
    for (let i = 0; i < n; i++) {
        cumulative += sorted[i];
        points.push([(i + 1) / n, cumulative / total]);
    }
    return points;
}

/**
 * Determine stratification label from cycle density and Borda distribution.
 */
export function determineStratificationLabel(
    cycleDensity: number,
    gini: number,
    communities: Record<string, number>
): string {
    const numCommunities = new Set(Object.values(communities)).size;
    const participantCount = Object.keys(communities).length;

    if (cycleDensity < 0.1 && gini > 0.3) return 'Linear Hierarchy';
    if (numCommunities > 1 && numCommunities <= participantCount / 2) return 'Tiered Clusters';
    if (cycleDensity > 0.3 || numCommunities > participantCount / 2) return 'Fragmented';
    return 'Mixed Structure';
}

/**
 * Detect marginalized participants: lowest 10% Borda AND low variance in received ranks.
 */
export function detectMarginalized(
    bordaScores: Record<string, number>,
    receivedRanks: Record<string, number[]>
): string[] {
    const scores = Object.entries(bordaScores);
    scores.sort((a, b) => a[1] - b[1]);
    const cutoff = Math.max(1, Math.ceil(scores.length * 0.1));
    const lowBorda = scores.slice(0, cutoff).map(([id]) => id);

    return lowBorda.filter(id => {
        const ranks = receivedRanks[id];
        if (!ranks || ranks.length < 2) return true;
        const mean = ranks.reduce((a, b) => a + b, 0) / ranks.length;
        const variance = ranks.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0) / ranks.length;
        return variance < 1.5; // low variance = consistently ignored
    });
}

// ─────────────────────────────────────────────────────────────
// E. PSYCHOLOGY
// ─────────────────────────────────────────────────────────────

/**
 * Asymmetry matrix: |rank(i→j) - rank(j→i)| for each dyad.
 */
export function computeAsymmetryMatrix(
    ballots: Ballot[],
    participants: Participant[]
): number[][] {
    const n = participants.length;
    const ids = getIds(participants);
    const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (i === j) continue;
            const ballotI = ballots.find(b => b.voterId === ids[i]);
            const ballotJ = ballots.find(b => b.voterId === ids[j]);
            const rankIofJ = ballotI ? getRank(ballotI, ids[j]) : 0;
            const rankJofI = ballotJ ? getRank(ballotJ, ids[i]) : 0;
            if (rankIofJ > 0 && rankJofI > 0) {
                matrix[i][j] = Math.abs(rankIofJ - rankJofI);
            }
        }
    }
    return matrix;
}

/**
 * Polarization score per participant: variance of received ranks.
 */
export function computePolarizationScores(
    receivedRanks: Record<string, number[]>
): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [id, ranks] of Object.entries(receivedRanks)) {
        if (ranks.length < 2) { result[id] = 0; continue; }
        const mean = ranks.reduce((a, b) => a + b, 0) / ranks.length;
        result[id] = ranks.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0) / ranks.length;
    }
    return result;
}

/**
 * Spearman rank correlation between each ballot and the group mean ranking.
 * Returns correlation per voter (higher = more conformist).
 */
export function computeSpearmanConformity(
    ballots: Ballot[],
    participants: Participant[],
    bordaScores: Record<string, number>
): Record<string, number> {
    const ids = getIds(participants);
    // Derive group mean ranking from Borda positions
    const groupOrder = [...ids].sort((a, b) => (bordaScores[b] || 0) - (bordaScores[a] || 0));
    const groupRank: Record<string, number> = {};
    groupOrder.forEach((id, i) => { groupRank[id] = i + 1; });

    const result: Record<string, number> = {};
    for (const ballot of ballots) {
        const m = ballot.ranking.length;
        if (m < 2) { result[ballot.voterId] = 0; continue; }

        // Voter's ranking of others (1-based)
        const voterRank: Record<string, number> = {};
        ballot.ranking.forEach((id, i) => { voterRank[id] = i + 1; });

        // Spearman's rho = 1 - (6 * sum(d²)) / (m * (m² - 1))
        let sumDsq = 0;
        let count = 0;
        for (const id of ballot.ranking) {
            if (!groupRank[id]) continue;
            const d = voterRank[id] - groupRank[id];
            sumDsq += d * d;
            count++;
        }
        const rho = count > 1 ? 1 - (6 * sumDsq) / (count * (count * count - 1)) : 0;
        result[ballot.voterId] = Math.max(-1, Math.min(1, rho));
    }
    return result;
}

// ─────────────────────────────────────────────────────────────
// F. GAME THEORY
// ─────────────────────────────────────────────────────────────

/**
 * Eigenvector centrality via power iteration on pairwise matrix.
 */
export function computeEigenvectorCentrality(
    pairwiseMatrix: PairwiseMatrix,
    participants: Participant[]
): Record<string, number> {
    const n = participants.length;
    const ids = getIds(participants);
    let ev = Array(n).fill(1 / n);

    // Normalize pairwise matrix rows
    const maxVal = Math.max(...pairwiseMatrix.flat(), 1);
    const W = pairwiseMatrix.map(row => row.map(v => v / maxVal));

    for (let iter = 0; iter < 100; iter++) {
        const next = Array(n).fill(0);
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                next[i] += W[j][i] * ev[j]; // in-eigenvector
            }
        }
        const norm = Math.sqrt(next.reduce((a, b) => a + b * b, 0)) || 1;
        for (let i = 0; i < n; i++) next[i] /= norm;
        ev = next;
    }

    const result: Record<string, number> = {};
    for (let i = 0; i < n; i++) result[ids[i]] = Math.abs(ev[i]);
    return result;
}

/**
 * Detect coalitions: groups of 3+ with mutual top-third preferences.
 */
export function detectCoalitions(
    ballots: Ballot[],
    participants: Participant[]
): string[][] {
    const n = participants.length;
    const ids = getIds(participants);
    const topThird = Math.ceil((n - 1) / 3);
    const reciprocalPairs: Map<string, Set<string>> = new Map();

    for (const p of participants) reciprocalPairs.set(p.id, new Set());

    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const bi = ballots.find(b => b.voterId === ids[i]);
            const bj = ballots.find(b => b.voterId === ids[j]);
            if (!bi || !bj) continue;
            if (getRank(bi, ids[j]) <= topThird && getRank(bj, ids[i]) <= topThird) {
                reciprocalPairs.get(ids[i])!.add(ids[j]);
                reciprocalPairs.get(ids[j])!.add(ids[i]);
            }
        }
    }

    // Find cliques of size ≥ 2
    const coalitions: string[][] = [];
    const visited = new Set<string>();

    for (const [start, neighbors] of reciprocalPairs) {
        if (visited.has(start) || neighbors.size === 0) continue;
        const coalition = [start];
        visited.add(start);
        for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
                // Check if neighbor is connected to all coalition members
                const neighborSet = reciprocalPairs.get(neighbor)!;
                if (coalition.every(m => neighborSet.has(m))) {
                    coalition.push(neighbor);
                    visited.add(neighbor);
                }
            }
        }
        if (coalition.length >= 2) coalitions.push(coalition);
    }
    return coalitions;
}

// ─────────────────────────────────────────────────────────────
// G. INFORMATION THEORY
// ─────────────────────────────────────────────────────────────

/**
 * Shannon entropy from a distribution of values (normalized internally).
 * H = -sum(p * log2(p))
 */
export function computeEntropy(values: number[]): number {
    const total = values.reduce((a, b) => a + b, 0);
    if (total === 0) return 0;
    const normalized = values.map(v => v / total);
    return -normalized.reduce((acc, p) => {
        if (p <= 0) return acc;
        return acc + p * Math.log2(p);
    }, 0);
}

/**
 * Entropy of the rank distribution received by each participant.
 */
export function computeIndividualEntropy(
    receivedRanks: Record<string, number[]>,
    n: number
): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [id, ranks] of Object.entries(receivedRanks)) {
        // Build histogram of ranks 1..n-1
        const hist = Array(n).fill(0);
        for (const r of ranks) { if (r >= 1 && r < n) hist[r - 1]++; }
        result[id] = computeEntropy(hist);
    }
    return result;
}

/**
 * Mutual information between pairs of raters based on their ranking similarity.
 * MI(X,Y) ≈ H(X) + H(Y) - H(X,Y) using permutation agreement bins.
 */
export function computeMutualInformationMatrix(
    ballots: Ballot[],
    participants: Participant[]
): number[][] {
    const m = ballots.length;
    const n = participants.length;
    // Create rank matrix: [voter][participant] = rank
    const rankMat: number[][] = Array.from({ length: m }, (_, vi) => {
        const ballot = ballots[vi];
        return participants.map(p => p.id).map(id => {
            if (id === ballot.voterId) return 0;
            return getRank(ballot, id);
        });
    });

    const MI: number[][] = Array.from({ length: m }, () => Array(m).fill(0));
    const bins = Math.max(2, Math.min(n - 1, 5)); // discretize into bins

    for (let a = 0; a < m; a++) {
        for (let b = a; b < m; b++) {
            if (a === b) { MI[a][b] = Math.log2(bins); continue; }

            // Bin ranks
            const binA = rankMat[a].map(r => (r === 0 ? 0 : Math.min(bins - 1, Math.floor((r - 1) * bins / (n - 1)))));
            const binB = rankMat[b].map(r => (r === 0 ? 0 : Math.min(bins - 1, Math.floor((r - 1) * bins / (n - 1)))));

            // Joint and marginal distributions
            const jointCount: Record<string, number> = {};
            const countA: number[] = Array(bins).fill(0);
            const countB: number[] = Array(bins).fill(0);
            let valid = 0;

            for (let j = 0; j < n; j++) {
                if (rankMat[a][j] === 0 || rankMat[b][j] === 0) continue;
                const key = `${binA[j]}_${binB[j]}`;
                jointCount[key] = (jointCount[key] || 0) + 1;
                countA[binA[j]]++;
                countB[binB[j]]++;
                valid++;
            }

            if (valid === 0) { MI[a][b] = MI[b][a] = 0; continue; }

            let mi = 0;
            for (const [key, count] of Object.entries(jointCount)) {
                const [ai, bi] = key.split('_').map(Number);
                const pXY = count / valid;
                const pX = countA[ai] / valid;
                const pY = countB[bi] / valid;
                if (pX > 0 && pY > 0) mi += pXY * Math.log2(pXY / (pX * pY));
            }

            MI[a][b] = MI[b][a] = Math.max(0, mi);
        }
    }
    return MI;
}

// ─────────────────────────────────────────────────────────────
// H. BEHAVIORAL ECONOMICS
// ─────────────────────────────────────────────────────────────

/**
 * Reciprocity imbalance: avg(rank_given - rank_received) per participant.
 * Positive = gives higher rank than receives (generous).
 * Negative = receives higher rank than gives (exploits).
 */
export function computeReciprocityImbalance(
    ballots: Ballot[],
    participants: Participant[]
): Record<string, number> {
    const result: Record<string, number> = {};

    for (const voter of participants) {
        const voterBallot = ballots.find(b => b.voterId === voter.id);
        let totalImbalance = 0;
        let count = 0;

        for (const other of participants) {
            if (other.id === voter.id) continue;
            const otherBallot = ballots.find(b => b.voterId === other.id);
            if (!voterBallot || !otherBallot) continue;

            const rankGiven = getRank(voterBallot, other.id); // how voter ranks other
            const rankReceived = getRank(otherBallot, voter.id); // how other ranks voter

            if (rankGiven > 0 && rankReceived > 0) {
                totalImbalance += rankGiven - rankReceived;
                count++;
            }
        }
        result[voter.id] = count > 0 ? totalImbalance / count : 0;
    }
    return result;
}

/**
 * Loss aversion proxy: count of extreme downward asymmetries (|rank diff| > n/3) per participant.
 */
export function computeLossAversionProxy(
    asymmetryMatrix: number[][],
    participants: Participant[]
): Record<string, number> {
    const n = participants.length;
    const ids = getIds(participants);
    const threshold = Math.ceil(n / 3);
    const result: Record<string, number> = {};

    for (let i = 0; i < n; i++) {
        let count = 0;
        for (let j = 0; j < n; j++) {
            if (i !== j && asymmetryMatrix[i][j] > threshold) count++;
        }
        result[ids[i]] = count;
    }
    return result;
}

/**
 * Simulate removal of the top Borda-ranked node and recompute Borda scores.
 * Returns magnitude of shift for remaining participants.
 */
export function simulateTopNodeRemoval(
    ballots: Ballot[],
    participants: Participant[],
    bordaScores: Record<string, number>
): Record<string, number> {
    if (participants.length <= 2) return {};

    // Find top-ranked participant
    const topId = Object.entries(bordaScores).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!topId) return {};

    const reducedParticipants = participants.filter(p => p.id !== topId);
    const reducedBallots = ballots
        .filter(b => b.voterId !== topId)
        .map(b => ({
            voterId: b.voterId,
            ranking: b.ranking.filter(id => id !== topId),
        }));

    const newScores = computeBordaScores(reducedBallots, reducedParticipants);
    const result: Record<string, number> = {};

    for (const p of reducedParticipants) {
        result[p.id] = (newScores[p.id] || 0) - (bordaScores[p.id] || 0);
    }
    return result;
}

// ─────────────────────────────────────────────────────────────
// I. SMALL GROUP DYNAMICS
// ─────────────────────────────────────────────────────────────

/**
 * Leadership emergence: composite z-score of Borda + betweenness + reciprocity.
 */
export function computeLeadershipScore(
    bordaScores: Record<string, number>,
    betweenness: Record<string, number>,
    inDegree: Record<string, number>,
    participants: Participant[]
): Record<string, number> {
    const ids = getIds(participants);

    function zScore(values: Record<string, number>): Record<string, number> {
        const vals = Object.values(values);
        const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
        const std = Math.sqrt(vals.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / vals.length) || 1;
        return Object.fromEntries(Object.entries(values).map(([k, v]) => [k, (v - mean) / std]));
    }

    const zBorda = zScore(bordaScores);
    const zBetween = zScore(betweenness);
    const zDegree = zScore(inDegree);

    const result: Record<string, number> = {};
    for (const id of ids) {
        result[id] = ((zBorda[id] || 0) + (zBetween[id] || 0) + (zDegree[id] || 0)) / 3;
    }
    return result;
}

/**
 * Subgroup cohesion: average mutual rank within each detected community.
 */
export function computeSubgroupCohesion(
    communities: Record<string, number>,
    ballots: Ballot[],
    participants: Participant[]
): Record<number, number> {
    const n = participants.length;
    const communityGroups: Record<number, string[]> = {};

    for (const [id, comm] of Object.entries(communities)) {
        if (!communityGroups[comm]) communityGroups[comm] = [];
        communityGroups[comm].push(id);
    }

    const result: Record<number, number> = {};

    for (const [commStr, members] of Object.entries(communityGroups)) {
        const comm = parseInt(commStr);
        if (members.length < 2) { result[comm] = 1; continue; }

        let totalRank = 0;
        let count = 0;

        for (const memberId of members) {
            const ballot = ballots.find(b => b.voterId === memberId);
            if (!ballot) continue;
            for (const otherId of members) {
                if (otherId === memberId) continue;
                const rank = getRank(ballot, otherId);
                if (rank > 0) {
                    totalRank += 1 - (rank - 1) / (n - 1); // normalize: 1 = highest, 0 = lowest
                    count++;
                }
            }
        }

        result[comm] = count > 0 ? totalRank / count : 0;
    }
    return result;
}

/**
 * Structural fragility: simulate each node removal and measure avg betweenness increase.
 * Simplified: count strongly connected components after removal as proxy.
 */
export function computeStructuralFragility(
    pairwiseMatrix: PairwiseMatrix,
    participants: Participant[],
    numBallots: number
): number {
    if (participants.length < 3) return 0;
    const n = participants.length;
    const majority = numBallots / 2;

    let totalFragility = 0;

    for (let skip = 0; skip < n; skip++) {
        // Build adjacency without node `skip`
        const adj: number[][] = Array.from({ length: n }, () => []);
        for (let i = 0; i < n; i++) {
            if (i === skip) continue;
            for (let j = 0; j < n; j++) {
                if (j === skip || j === i) continue;
                if (pairwiseMatrix[i][j] > majority) adj[i].push(j);
            }
        }

        // BFS from non-skip nodes to count reachable nodes (proxy for connectivity)
        const firstNonSkip = Array.from({ length: n }, (_, i) => i).find(i => i !== skip)!;
        const visited = new Set<number>([firstNonSkip]);
        const queue = [firstNonSkip];
        while (queue.length > 0) {
            const curr = queue.shift()!;
            for (const next of adj[curr]) {
                if (!visited.has(next)) {
                    visited.add(next);
                    queue.push(next);
                }
            }
        }
        const reachable = visited.size - (visited.has(skip) ? 1 : 0);
        const maxReachable = n - 1;
        totalFragility += maxReachable > 0 ? 1 - reachable / maxReachable : 0;
    }

    return n > 0 ? totalFragility / n : 0;
}
