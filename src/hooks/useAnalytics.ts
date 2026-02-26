import { useMemo } from 'react';
import type { Ballot, Participant, AnalyticsResult } from '../types';
import {
    buildPairwiseMatrix,
    computeBordaScores,
    computeReceivedRanks,
    detectCondorcetWinner,
    findCondorcetCycles,
    computeKendallW,
    buildWeightMatrix,
    computeInDegreeCentrality,
    computeReciprocityIndex,
    computeCycleDensity,
    computeKCoreDecomposition,
    computeBetweennessCentrality,
    detectCommunities,
    computeGini,
    computeLorenzPoints,
    determineStratificationLabel,
    detectMarginalized,
    computeAsymmetryMatrix,
    computePolarizationScores,
    computeSpearmanConformity,
    computeEigenvectorCentrality,
    detectCoalitions,
    computeEntropy,
    computeIndividualEntropy,
    computeMutualInformationMatrix,
    computeReciprocityImbalance,
    computeLossAversionProxy,
    simulateTopNodeRemoval,
    computeLeadershipScore,
    computeSubgroupCohesion,
    computeStructuralFragility,
} from '../lib/computations';

export function useAnalytics(
    participants: Participant[],
    ballots: Ballot[]
): AnalyticsResult | null {
    return useMemo(() => {
        if (participants.length < 2 || ballots.length === 0) return null;

        const n = participants.length;
        const m = ballots.length;

        // ── A: Social Choice ──────────────────────────────────────
        const pairwiseMatrix = buildPairwiseMatrix(ballots, participants);
        const bordaScores = computeBordaScores(ballots, participants);
        const bordaRanking = Object.entries(bordaScores)
            .sort((a, b) => b[1] - a[1])
            .map(([id]) => id);
        const receivedRanks = computeReceivedRanks(ballots, participants);
        const condorcetWinner = detectCondorcetWinner(pairwiseMatrix, participants, m);
        const condorcetCycles = findCondorcetCycles(pairwiseMatrix, participants, m);
        const kendallW = computeKendallW(ballots, participants);
        const lorenzPoints = computeLorenzPoints(Object.values(bordaScores));
        const giniCoefficient = computeGini(Object.values(bordaScores));

        // ── B: Graph Theory ───────────────────────────────────────
        const weightMatrix = buildWeightMatrix(ballots, participants);
        const inDegreeCentrality = computeInDegreeCentrality(weightMatrix, participants);
        const { index: reciprocityIndex, pairs: reciprocalPairs } = computeReciprocityIndex(ballots, participants);
        const cycleDensity = computeCycleDensity(pairwiseMatrix, m, n);

        // ── C: Network Science ────────────────────────────────────
        const kCoreDecomposition = computeKCoreDecomposition(ballots, participants);
        const betweennessCentrality = computeBetweennessCentrality(pairwiseMatrix, participants, m);
        const communities = detectCommunities(pairwiseMatrix, participants, m);

        // ── D: Sociology ──────────────────────────────────────────
        const stratificationLabel = determineStratificationLabel(cycleDensity, giniCoefficient, communities);
        const marginalizedParticipants = detectMarginalized(bordaScores, receivedRanks);
        const popularityGini = giniCoefficient;

        // ── E: Psychology ─────────────────────────────────────────
        const asymmetryMatrix = computeAsymmetryMatrix(ballots, participants);
        const polarizationScores = computePolarizationScores(receivedRanks);
        const spearmanConformity = computeSpearmanConformity(ballots, participants, bordaScores);

        // ── F: Game Theory ────────────────────────────────────────
        const isTournamentAcyclic = condorcetCycles.length === 0;
        const coalitions = detectCoalitions(ballots, participants);
        const eigenvectorCentrality = computeEigenvectorCentrality(pairwiseMatrix, participants);

        // ── G: Information Theory ─────────────────────────────────
        const globalEntropy = computeEntropy(Object.values(bordaScores));
        const individualEntropy = computeIndividualEntropy(receivedRanks, n);
        const mutualInformation = computeMutualInformationMatrix(ballots, participants);

        // ── H: Behavioral Economics ───────────────────────────────
        const reciprocityImbalance = computeReciprocityImbalance(ballots, participants);
        const lossAversionCount = computeLossAversionProxy(asymmetryMatrix, participants);
        const topNodeRemovalBordaShift = simulateTopNodeRemoval(ballots, participants, bordaScores);

        // ── I: Small Group Dynamics ───────────────────────────────
        const leadershipScore = computeLeadershipScore(
            bordaScores, betweennessCentrality, inDegreeCentrality, participants
        );
        const subgroupCohesion = computeSubgroupCohesion(communities, ballots, participants);
        const structuralFragility = computeStructuralFragility(pairwiseMatrix, participants, m);

        return {
            bordaScores,
            bordaRanking,
            giniCoefficient,
            lorenzPoints,
            condorcetWinner,
            condorcetCycles,
            kendallW,
            pairwiseMatrix,
            inDegreeCentrality,
            reciprocityIndex,
            cycleDensity,
            reciprocalPairs,
            kCoreDecomposition,
            betweennessCentrality,
            communities,
            stratificationLabel,
            marginalizedParticipants,
            popularityGini,
            asymmetryMatrix,
            polarizationScores,
            spearmanConformity,
            isTournamentAcyclic,
            coalitions,
            eigenvectorCentrality,
            globalEntropy,
            individualEntropy,
            mutualInformation,
            reciprocityImbalance,
            lossAversionCount,
            topNodeRemovalBordaShift,
            leadershipScore,
            subgroupCohesion,
            structuralFragility,
        };
    }, [participants, ballots]);
}
