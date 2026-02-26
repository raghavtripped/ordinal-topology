# Ordinal Social Topology Analyzer

A sophisticated React application built with TypeScript and Vite that analyzes interpersonal rankings to uncover the "social topology" of a group. By having participants rank one another, this tool employs social choice theory, graph theory, and network science to reveal underlying hierarchies, factions, and the socio-geometric structure of the group.

## Overview

The Ordinal Social Topology Analyzer goes beyond simple voting systems by mapping out complex group dynamics. It calculates:

- **Social Choice Metrics**: Borda counts, Condorcet winners, and Kendall's W (coefficient of concordance).
- **Network Analysis**: Betweenness centrality, In-degree centrality, and K-core decomposition.
- **Group Cohesion & Stability**: Reciprocity indices, Condorcet cycles (3-cycles), and Louvain community detection.
- **Inequality Metrics**: Gini coefficients for rank distribution.

## Features

- **Participant Setup**: Easily define the group of individuals participating in the analysis.
- **Drag-and-Drop Ranking**: An intuitive interface (powered by `@dnd-kit`) allowing each participant to rank their peers sequentially.
- **Comprehensive Results Dashboard**: A multi-tab dashboard displaying deep insights:
  - **Overview**: High-level summary of the group's hierarchy and alignment.
  - **Hierarchy**: Detailed Borda scores and Condorcet winners.
  - **Network**: Interactive force-directed graphs visualizing preference networks.
  - **Inequality & Stability**: Analysis of rank distribution equity and the presence of cyclical (rock-paper-scissors) preferences.
  - **Psychology**: Reciprocity tracking to see who reciprocates high rankings.
  - **Simulation**: Community detection algorithms dividing the group into algorithmic factions.
- **Export Capabilities**: Export results to JSON, or generate PDF/PNG reports of the insights.

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v4, Framer Motion for animations, Lucide React for icons
- **Data Visualization**: Recharts, D3.js
- **Network Analysis**: Graphology (including Louvain communities, metrics, and shortest path)
- **Interactions**: dnd-kit for drag-and-drop
- **Exporting**: html2canvas, jsPDF

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   cd ordinal-topology
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173/` (or the port specified by Vite).

## Usage Flow

1. **Setup Phase**: Enter the names or IDs of all participants in the group.
2. **Ranking Phase**: Each participant takes a turn submitting their ordinal ranking of all other participants.
3. **Analysis Phase**: Once all submissions are collected (which can be imported via a JSON file like `ordinal_topology_submissions.json`), the application routes to the Results Dashboard, rendering the topological evaluation.

## Project Structure

```
src/
├── components/      # Reusable UI components (charts, metric cards, force-directed graphs)
├── context/         # React Context for global state (AppContext for routing & data holding)
├── hooks/           # Custom React hooks (e.g., useAnalytics for tying into computation engine)
├── lib/             # Core computation algorithms and utilities
│   ├── computations.ts  # Heavy lifting: Borda, Condorcet, Graph metrics, Louvain etc.
│   ├── explanations.ts  # Narrative and tooltip generation for complex metrics
│   ├── parser.ts        # Data import parsing and validation
│   └── storage.ts       # Local storage utils
├── pages/           # High-level route components
│   ├── SetupPage.tsx
│   ├── RankingPage.tsx
│   └── ResultsDashboard.tsx
├── types/           # TypeScript definitions
├── App.tsx          # Root Component & internal routing
└── main.tsx         # Entry point
```

## Computation Engine

The core logic resides in `src/lib/computations.ts`. Designed to be computationally pure, it builds pairwise majority matrices and weighted adjacency lists from the ordinal ballots. These structures are then processed to extract multi-dimensional insights about social power, prestige, and alignment.

## License

This project is proprietary. All rights reserved.
