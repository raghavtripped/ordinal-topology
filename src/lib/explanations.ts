/**
 * Explanation Engine — generates neutral academic explanations for every metric.
 */

export interface MetricExplanation {
    definition: string;
    whyMatters: string;
    highMeaning: string;
    lowMeaning: string;
}

export const explanations: Record<string, MetricExplanation> = {
    borda: {
        definition: 'Borda count assigns n−k points to a candidate ranked k-th by each voter. Total Borda score aggregates preferences across all ballots.',
        whyMatters: 'Provides a cardinal summary of collective preference strength, revealing distributed support beyond binary win/loss.',
        highMeaning: 'Consistently preferred by most group members across all ballots. Indicates broad social consensus around this individual.',
        lowMeaning: 'Systematically placed in low positions across most ballots. May signal social distance or low perceived status.',
    },
    gini: {
        definition: 'Gini coefficient measures inequality in a distribution. Ranges from 0 (complete equality) to 1 (maximum concentration).',
        whyMatters: 'Reveals whether social capital is concentrated among few or distributed broadly across the group.',
        highMeaning: 'High inequality — social capital is disproportionately concentrated in a small subset of individuals.',
        lowMeaning: 'Low inequality — social capital is relatively evenly distributed across group members.',
    },
    condorcet: {
        definition: 'A Condorcet winner beats every other candidate in pairwise majority comparisons. Absence indicates a preference cycle (Condorcet paradox).',
        whyMatters: 'Condorcet stability implies the group has a coherent preferred leader. Cycles indicate instability in collective preference.',
        highMeaning: 'A stable dominant individual exists who is majority-preferred over all others.',
        lowMeaning: 'No stable dominant individual — the group exhibits collective preference cycles.',
    },
    kendallW: {
        definition: "Kendall's W is a coefficient of concordance (0–1) measuring agreement among multiple rankers.",
        whyMatters: 'Indicates whether group members share a common perception of social ordering.',
        highMeaning: 'Strong consensus — group members largely agree on the relative standing of individuals.',
        lowMeaning: 'Low consensus — rankings are heterogeneous, reflecting divergent individual assessments.',
    },
    betweenness: {
        definition: 'Betweenness centrality measures how often a node lies on shortest paths between other nodes in the majority preference graph.',
        whyMatters: 'High betweenness nodes act as social brokers or bridges across subgroups, wielding informational influence.',
        highMeaning: 'Acts as a connector or gatekeeper between otherwise disconnected subgroups.',
        lowMeaning: 'Peripheral within the network with limited intermediary influence.',
    },
    reciprocity: {
        definition: 'Reciprocity index measures the fraction of dyads where both parties place each other in their top-third rankings.',
        whyMatters: 'Mutual high rankings signal bidirectional positive regard, foundational for stable alliances.',
        highMeaning: 'Many symmetric, mutually high-valuing relationships — a cohesive and stable group.',
        lowMeaning: 'Predominantly asymmetric rankings — few truly reciprocal relationships exist.',
    },
    cycleDensity: {
        definition: 'Cycle density is the proportion of triads that form a 3-node preference cycle in the majority graph.',
        whyMatters: 'High cycle density indicates collective irrationality in preferences, making stable hierarchy difficult.',
        highMeaning: 'Highly cyclic — no clear hierarchy; group is susceptible to status instability and coalition wars.',
        lowMeaning: 'Near-acyclic — the group has a relatively stable, well-defined hierarchy.',
    },
    kCore: {
        definition: 'K-core decomposition identifies the maximal subgraph where every node has at least k connections to others in the subgraph.',
        whyMatters: 'Reveals the cohesive inner core versus the peripheral fringe of the social network.',
        highMeaning: 'Member belongs to the densely connected core of the group.',
        lowMeaning: 'Member is on the periphery with few strong preference links.',
    },
    modularity: {
        definition: 'Modularity clustering (Louvain method) partitions the network into communities that maximize internal edge density.',
        whyMatters: 'Identifies factions or cliques that may operate as sub-units with distinct internal preferences.',
        highMeaning: 'Strong community structure — the group is organized into distinct, internally cohesive factions.',
        lowMeaning: 'Weak community structure — the group lacks clear internal factions.',
    },
    asymmetry: {
        definition: 'Dyadic asymmetry magnitude: |rank(i→j) − rank(j→i)|. Measures how differently two individuals perceive their relationship.',
        whyMatters: 'High asymmetry in a dyad signals a perceived status gap or unrequited regard.',
        highMeaning: 'One party ranks the other very high while receiving a much lower rank — potential power imbalance.',
        lowMeaning: 'Symmetric mutual evaluation — both parties have similar perceptions of each other.',
    },
    polarization: {
        definition: 'Polarization score is the variance of ranks received by a participant across all ballots.',
        whyMatters: 'High variance indicates divisive individuals who are ranked very differently by different group members.',
        highMeaning: 'Divisive figure — some members rank this person very highly, others very poorly.',
        lowMeaning: 'Consistent evaluation — the group broadly agrees on this person\'s standing.',
    },
    conformity: {
        definition: "Perceptual conformity is Spearman's rank correlation between a voter's ballot and the consensus Borda ordering.",
        whyMatters: 'Measures how much individual perception aligns with collective judgment.',
        highMeaning: 'Highly conformist rater — their ranking mirrors the group consensus closely.',
        lowMeaning: 'Heterodox rater — their ranking diverges significantly from collective consensus.',
    },
    tournament: {
        definition: 'A tournament is acyclic if the majority preference graph contains no directed cycles (a strict total order exists).',
        whyMatters: 'An acyclic tournament implies a stable hierarchy with a clear Condorcet winner.',
        highMeaning: 'Stable: the majority preference graph is acyclic, defining a clear dominance hierarchy.',
        lowMeaning: 'Unstable: cycles exist in majority preferences, making unambiguous ranking impossible.',
    },
    eigenvector: {
        definition: 'Eigenvector centrality weights a node\'s importance by the importance of its neighbors in the preference graph.',
        whyMatters: 'Captures second-order influence — being preferred by high-status individuals amplifies status.',
        highMeaning: 'High second-order influence — preferred by individuals who are themselves highly preferred.',
        lowMeaning: 'Low second-order influence — preferred mainly by low-status individuals or few people.',
    },
    entropy: {
        definition: 'Shannon entropy of the Borda score distribution. Higher entropy = more uniform spread of scores.',
        whyMatters: 'Low entropy indicates a concentrated hierarchy; high entropy indicates diffuse, undifferentiated status.',
        highMeaning: 'Scores are spread out — the group lacks a clear stratification structure.',
        lowMeaning: 'Scores are concentrated — a small group holds most social capital.',
    },
    mutualInfo: {
        definition: 'Mutual information between two raters measures how much knowing one ballot reduces uncertainty about the other.',
        whyMatters: 'High MI between raters suggests they share similar social perspectives or may be coordinating.',
        highMeaning: 'Raters share highly similar views — may belong to the same subgroup or coalition.',
        lowMeaning: 'Raters have independent perspectives — diverse viewpoints within the group.',
    },
    reciprocityImbalance: {
        definition: 'Reciprocity imbalance: average(rank_given − rank_received). Positive = more generous giver. Negative = net receiver of high ranks.',
        whyMatters: 'Persistent imbalance may indicate exploitative dynamics or status maintenance strategies.',
        highMeaning: 'Systematic over-giver — ranks others much higher than receiving in return.',
        lowMeaning: 'Net high-rank receiver — consistently rated higher by others than they rate others.',
    },
    leadership: {
        definition: 'Leadership emergence score: composite z-score of Borda rank + betweenness centrality + in-degree centrality.',
        whyMatters: 'Identifies individuals most likely to emerge as informal leaders based on social position.',
        highMeaning: 'Strong leadership candidate — high in all three dimensions of social influence.',
        lowMeaning: 'Low leadership emergence — lacking in status, connectivity, and received preferences.',
    },
    fragility: {
        definition: 'Structural fragility measures the average decrease in network connectivity upon removing each node.',
        whyMatters: 'High fragility indicates the group\'s cohesion depends on a few key individuals.',
        highMeaning: 'Fragile — removal of key individuals significantly disrupts group connectivity.',
        lowMeaning: 'Robust — the group maintains connectivity even when individuals are removed.',
    },
    majorityNetwork: {
        definition: 'Visualizes the hierarchy of majority preferences. Edges point from the loser to the majority-preferred individual. Node size indicates brokerage power (Betweenness).',
        whyMatters: 'Shows the overall organic power structure, cliques, and whether preferences form strict hierarchies or unstable cycles.',
        highMeaning: '',
        lowMeaning: '',
    },
    nashRisk: {
        definition: 'Measures the proportion of triads that form Condorcet cycles (rock-paper-scissors loops).',
        whyMatters: 'Identifies the risk of instability. High cycle density means no outcome is safe from being defeated by another coalition (lack of Nash Equilibrium).',
        highMeaning: 'High risk of constant regime change or shifting alliances.',
        lowMeaning: 'Stable equilibrium — clear hierarchical order resistant to coalition disruptions.',
    },
    networkFragility: {
        definition: 'The average loss in network reachability when a single individual is removed from the preference graph.',
        whyMatters: 'Highlights structural vulnerability. If the network shatters upon removing one person, that person holds outsized structural power.',
        highMeaning: 'Highly vulnerable structure dependent on key load-bearing individuals.',
        lowMeaning: 'Resilient and flat structure; power and connections are decentralized.',
    },
    coalitions: {
        definition: 'Factions composed of 3+ individuals who all rank each other in their top-third of preferences.',
        whyMatters: 'Maps the actual battle lines of group politics. These are the tightly knit alliances that can act as a voting bloc.',
        highMeaning: '',
        lowMeaning: '',
    },
    clusterCohesion: {
        definition: 'The average relative preference ranking members of a detected cluster have for one another.',
        whyMatters: 'Distinguishes between clusters of convenience versus highly bonded ideologically pure factions.',
        highMeaning: 'Cluster members deeply prefer each other over outsiders (strong ingroup bias).',
        lowMeaning: 'Cluster members merely tolerate each other (weak alliance of convenience).',
    },
    lossAversion: {
        definition: 'Counts extreme downward asymmetries where an individual ranks someone highly, but is ranked terribly in return (rank difference > N/3).',
        whyMatters: 'Serves as a proxy for unrequited social capital investment, typically triggering loss aversion and resentment.',
        highMeaning: 'Individual experiences many unreciprocated high evaluations; high risk of social withdrawal or realignment.',
        lowMeaning: 'Individual\'s evaluations are mostly reciprocated; low social tension.',
    },
    powerVacuum: {
        definition: 'Simulates the change in Borda scores for all remaining participants if the most preferred individual is removed from the system.',
        whyMatters: 'Reveals who relies on the leader (they lose score) and who is suppressed by the leader (they gain score when the leader is removed).',
        highMeaning: 'Positive shift (+): Opportunist who stands to gain power in a vacuum.',
        lowMeaning: 'Negative shift (-): Dependent who relies on the leader\'s presence for their own status.',
    },
    individualEntropy: {
        definition: 'Shannon entropy of the ranks RECEIVED by a single participant from all others. High entropy means they received a wide, even spread of ranks.',
        whyMatters: 'Measures status uncertainty. Do people agree on this person\'s standing, or are they a wildcard?',
        highMeaning: 'High uncertainty — group is completely divided on their status (e.g. loved by some, hated by others, ignored by rest).',
        lowMeaning: 'High certainty — group universally agrees on their exact rank position.',
    },
};

export function explainMetric(key: string): MetricExplanation {
    return explanations[key] || {
        definition: 'No definition available.',
        whyMatters: 'Contextual metric.',
        highMeaning: 'High value.',
        lowMeaning: 'Low value.',
    };
}

export function generateNarrativeSummary(params: {
    stratificationLabel: string;
    kendallW: number;
    condorcetWinner: string | null;
    condorcetCycles: string[][];
    gini: number;
    isTournamentAcyclic: boolean;
    cycleDensity: number;
    communities: Record<string, number>;
    marginalizedParticipants: string[];
    participantNames: Record<string, string>;
}): string {
    const {
        stratificationLabel, kendallW, condorcetWinner, condorcetCycles,
        gini, isTournamentAcyclic, cycleDensity, communities,
        marginalizedParticipants, participantNames,
    } = params;

    const numCommunities = new Set(Object.values(communities)).size;
    const consensusLevel = kendallW < 0.3 ? 'low' : kendallW < 0.7 ? 'moderate' : 'high';
    const inequalityLevel = gini < 0.2 ? 'low' : gini < 0.45 ? 'moderate' : 'high';

    let narrative = `**Hierarchy Type**: The group exhibits a ${stratificationLabel} structure. `;

    if (condorcetWinner) {
        narrative += `A Condorcet winner exists (${participantNames[condorcetWinner] || condorcetWinner}), indicating a stable majority-preferred individual. `;
    } else if (condorcetCycles.length > 0) {
        narrative += `No Condorcet winner was identified; ${condorcetCycles.length} majority preference cycle(s) were detected, indicating collective irrationality at the group level. `;
    }

    narrative += `\n\n**Consensus**: The group demonstrates ${consensusLevel} consensus (Kendall's W = ${kendallW.toFixed(3)}). `;
    if (kendallW < 0.3) {
        narrative += 'Individual rankings diverge substantially, suggesting heterogeneous social perceptions. ';
    } else if (kendallW < 0.7) {
        narrative += 'There is partial agreement on relative standing, with notable individual deviations. ';
    } else {
        narrative += 'Group members largely agree on the social ordering of individuals. ';
    }

    narrative += `\n\n**Factions**: ${numCommunities} community/communities detected via modularity analysis. `;
    if (numCommunities > 1) {
        narrative += 'The group is internally segmented into distinct preference clusters. ';
    } else {
        narrative += 'No strong factional segmentation detected. ';
    }

    narrative += `\n\n**Inequality**: Borda score Gini coefficient = ${gini.toFixed(3)}, indicating ${inequalityLevel} social capital inequality. `;

    narrative += `\n\n**Stability**: The majority tournament is ${isTournamentAcyclic ? 'acyclic (stable hierarchy)' : `cyclic — cycle density = ${cycleDensity.toFixed(3)}`}. `;

    if (marginalizedParticipants.length > 0) {
        const names = marginalizedParticipants.map(id => participantNames[id] || id).join(', ');
        narrative += `\n\n**Marginalization Signal**: ${names} score in the lowest Borda decile with low rank variance, consistent with systematic social marginalization. `;
    }

    return narrative;
}
