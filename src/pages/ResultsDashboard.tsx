import { useState, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useAnalytics } from '../hooks/useAnalytics';
import { NetworkGraph } from '../components/charts/NetworkGraph';
import { HeatmapMatrix } from '../components/charts/HeatmapMatrix';
import {
    BordaBarChart,
    LorenzCurveChart,
    GaugeChart,
    MetricBarChart,
    PolarizationChart,
} from '../components/charts/RechartsCharts';
import { explainMetric, generateNarrativeSummary, explanations } from '../lib/explanations';
import {
    ChevronLeft, Download, FileText, Image,
    Network, Scale, Zap, Brain, Shield, Info, AlertCircle,
    CheckCircle, XCircle, TrendingUp, TrendingDown, LayoutDashboard
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { motion, AnimatePresence } from 'framer-motion';

// ── Explanation Panel (Tooltip) ────────────────────────────────
function ExplainPanel({ metricKey }: { metricKey: string }) {
    const ex = explainMetric(metricKey);
    if (!ex) return null;
    return (
        <div className="mt-2 text-right">
            <div className="relative group inline-block z-[100]">
                <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-brand-400 transition-colors cursor-help">
                    <Info size={14} /> What does this mean?
                </span>
                <div className="absolute right-0 top-full mt-2 w-64 sm:w-80 p-4 bg-slate-900/95 border border-brand-500/40 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all text-xs backdrop-blur-md font-sans text-left pointer-events-none z-[100]">
                    <p className="mb-2 text-sm leading-relaxed"><strong className="text-white block mb-0.5">Definition</strong> <span className="text-slate-300">{ex.definition}</span></p>
                    <p className="mb-2 text-sm leading-relaxed"><strong className="text-white block mb-0.5">Why it matters</strong> <span className="text-slate-300">{ex.whyMatters}</span></p>
                    {ex.highMeaning && <p className="mb-1.5 text-sm"><strong className="text-emerald-400">High:</strong> <span className="text-slate-300">{ex.highMeaning}</span></p>}
                    {ex.lowMeaning && <p className="mb-1 text-sm"><strong className="text-amber-400">Low:</strong> <span className="text-slate-300">{ex.lowMeaning}</span></p>}
                    <div className="absolute -top-4 right-4 border-8 border-transparent border-b-brand-500/40"></div>
                </div>
            </div>
        </div>
    );
}

// ── Tab config ─────────────────────────────────────────────────
const TABS = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'hierarchy', label: 'Hierarchy', icon: TrendingUp },
    { id: 'network', label: 'Network', icon: Network },
    { id: 'inequality', label: 'Inequality', icon: Scale },
    { id: 'stability', label: 'Stability', icon: Shield },
    { id: 'psychology', label: 'Psychology', icon: Brain },
    { id: 'simulation', label: 'Simulation', icon: Zap },
];

// ── Metric card ────────────────────────────────────────────────
function MetricCard({ label, value, sub, highlight, metricKey }: {
    label: string; value: string | React.ReactNode; sub?: string; highlight?: 'good' | 'warn' | 'bad'; metricKey?: string;
}) {
    const border = highlight === 'good' ? 'border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]' :
        highlight === 'bad' ? 'border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.15)]' :
            highlight === 'warn' ? 'border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : 'border-slate-800';

    const valueColor = highlight === 'good' ? 'text-emerald-400' :
        highlight === 'bad' ? 'text-red-400' :
            highlight === 'warn' ? 'text-amber-400' : 'text-white';

    const ex = metricKey ? explainMetric(metricKey) : null;

    return (
        <div className={`glass-card p-5 ${border} hover:-translate-y-1 transition-transform relative group/card hover:z-50`}>
            <div className="flex justify-between items-start mb-2">
                <div className="text-xs font-bold tracking-wider text-slate-500 uppercase">{label}</div>
                {ex && (
                    <div className="text-slate-500 hover:text-brand-400 cursor-help transition-colors">
                        <Info size={14} />
                    </div>
                )}
            </div>
            <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
            {sub && <div className="text-xs text-slate-400 mt-2 font-medium">{sub}</div>}

            {ex && (
                <div className="absolute left-0 top-full mt-3 w-64 p-4 bg-slate-900/95 border border-brand-500/40 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] opacity-0 invisible group-hover/card:opacity-100 group-hover/card:visible transition-all text-xs backdrop-blur-md font-sans text-left pointer-events-none z-[100]">
                    <p className="mb-2 text-sm leading-relaxed"><strong className="text-white block mb-0.5">Definition</strong> <span className="text-slate-300">{ex.definition}</span></p>
                    <p className="mb-2 text-sm leading-relaxed"><strong className="text-white block mb-0.5">Why it matters</strong> <span className="text-slate-300">{ex.whyMatters}</span></p>
                    {ex.highMeaning && <p className="mb-1.5 text-sm"><strong className="text-emerald-400">High:</strong> <span className="text-slate-300">{ex.highMeaning}</span></p>}
                    {ex.lowMeaning && <p className="mb-1 text-sm"><strong className="text-amber-400">Low:</strong> <span className="text-slate-300">{ex.lowMeaning}</span></p>}
                    <div className="absolute -top-4 left-4 border-8 border-transparent border-b-brand-500/40"></div>
                </div>
            )}
        </div>
    );
}

// ── Main Results Dashboard ─────────────────────────────────────
export function ResultsDashboard() {
    const { state, setPage, reset } = useApp();
    const { participants, ballots } = state;
    const analytics = useAnalytics(participants, ballots);
    const [activeTab, setActiveTab] = useState('overview');
    const [isExporting, setIsExporting] = useState(false);
    const dashboardRef = useRef<HTMLDivElement>(null);
    const networkRef = useRef<HTMLDivElement>(null);
    const exportContainerRef = useRef<HTMLDivElement>(null);

    const nameMap = Object.fromEntries(participants.map(p => [p.id, p.name]));

    // ── Export functions ─────────────────────────────────────────
    const exportJSON = useCallback(() => {
        const data = { participants, ballots, analytics };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = 'ordinal_topology_analysis.json'; a.click();
        URL.revokeObjectURL(url);
    }, [participants, ballots, analytics]);

    const exportPDF = useCallback(async () => {
        setIsExporting(true);
        // Wait for React to render the hidden export container
        await new Promise(r => setTimeout(r, 100));

        if (!exportContainerRef.current) {
            setIsExporting(false);
            return;
        }

        const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1200, 800] });
        const tabs = Array.from(exportContainerRef.current.children) as HTMLElement[];

        for (let i = 0; i < tabs.length; i++) {
            const tabElement = tabs[i];
            const canvas = await html2canvas(tabElement, { scale: 1.5, useCORS: true, backgroundColor: '#020617' });
            const imgData = canvas.toDataURL('image/png');

            const orientation = canvas.width > canvas.height ? 'landscape' : 'portrait';

            if (i > 0) pdf.addPage([canvas.width, canvas.height], orientation);
            // If it's the first page we explicitly set the size so it doesn't default to a4 wrongly if dimensions differ
            else if (i === 0) {
                pdf.deletePage(1);
                pdf.addPage([canvas.width, canvas.height], orientation);
                pdf.setPage(1);
            }
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        }

        pdf.save('ordinal_topology_report.pdf');
        setIsExporting(false);
    }, []);

    const exportNetworkPNG = useCallback(async () => {
        if (!networkRef.current) return;
        const canvas = await html2canvas(networkRef.current, { scale: 2, useCORS: true, backgroundColor: '#0f172a' });
        const url = canvas.toDataURL('image/png');
        const a = document.createElement('a'); a.href = url;
        a.download = 'network_graph.png'; a.click();
    }, []);

    if (!analytics) {
        return (
            <div className="min-h-screen bg-transparent flex items-center justify-center">
                <div className="glass-card text-center p-8 max-w-sm">
                    <p className="text-slate-400 mb-6 font-medium">No topology data available.<br />Please execute the ranking protocol.</p>
                    <button onClick={() => setPage('setup')} className="bg-gradient-primary w-full text-white font-bold py-3 rounded-xl shadow-[0_0_20px_rgba(2,132,199,0.3)] hover:shadow-[0_0_30px_rgba(2,132,199,0.5)] transition-all">
                        Initialize Session
                    </button>
                </div>
            </div>
        );
    }

    const pNames = Object.fromEntries(participants.map(p => [p.id, p.name]));
    const narrative = generateNarrativeSummary({
        stratificationLabel: analytics.stratificationLabel,
        kendallW: analytics.kendallW,
        condorcetWinner: analytics.condorcetWinner,
        condorcetCycles: analytics.condorcetCycles,
        gini: analytics.giniCoefficient,
        isTournamentAcyclic: analytics.isTournamentAcyclic,
        cycleDensity: analytics.cycleDensity,
        communities: analytics.communities,
        marginalizedParticipants: analytics.marginalizedParticipants,
        participantNames: pNames,
    });

    // ── Tabs ──────────────────────────────────────────────────────
    const renderTab = () => {
        switch (activeTab) {
            case 'overview': return <OverviewTab analytics={analytics} nameMap={nameMap} narrative={narrative} />;
            case 'hierarchy': return <HierarchyTab analytics={analytics} nameMap={nameMap} participants={participants} />;
            case 'network': return (
                <NetworkTab analytics={analytics} participants={participants} ballots={ballots}
                    nameMap={nameMap} networkRef={networkRef} />
            );
            case 'inequality': return <InequalityTab analytics={analytics} nameMap={nameMap} participants={participants} />;
            case 'stability': return <StabilityTab analytics={analytics} nameMap={nameMap} participants={participants} />;
            case 'psychology': return <PsychologyTab analytics={analytics} nameMap={nameMap} participants={participants} />;
            case 'simulation': return <SimulationTab analytics={analytics} nameMap={nameMap} participants={participants} />;
            default: return null;
        }
    };

    return (
        <div className="min-h-screen bg-transparent pb-24">
            {/* Minimal Dashboard Header */}
            <header className="sticky top-0 z-40 glass-panel border-x-0 border-t-0 border-b border-slate-800/50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setPage('ranking')} className="text-slate-400 hover:text-white flex items-center gap-1.5 text-sm font-medium transition-colors bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-800/50 hover:border-slate-700">
                            <ChevronLeft size={16} /> Ballots
                        </button>
                        <div className="h-4 w-px bg-slate-800"></div>
                        <div>
                            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                                Topology <span className="text-brand-400">Dashboard</span>
                            </h1>
                            <p className="text-xs font-mono text-slate-500 mt-0.5 tracking-wider">
                                SYS.ANALYSIS // N={participants.length}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                        <button onClick={exportJSON} className="flex items-center gap-1.5 text-xs font-semibold bg-slate-900/80 hover:bg-slate-800 text-brand-400 px-3 py-2 rounded-lg border border-slate-800 hover:border-brand-500/50 hover:shadow-[0_0_10px_rgba(56,189,248,0.2)] transition-all">
                            <Download size={14} /> JSON
                        </button>
                        <button onClick={exportPDF} disabled={isExporting} className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition-all ${isExporting ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed' : 'bg-slate-900/80 hover:bg-slate-800 text-brand-400 border-slate-800 hover:border-brand-500/50 hover:shadow-[0_0_10px_rgba(56,189,248,0.2)]'}`}>
                            <FileText size={14} /> {isExporting ? 'Exporting...' : 'PDF'}
                        </button>
                        <button onClick={exportNetworkPNG} className="flex items-center gap-1.5 text-xs font-semibold bg-slate-900/80 hover:bg-slate-800 text-brand-400 px-3 py-2 rounded-lg border border-slate-800 hover:border-brand-500/50 hover:shadow-[0_0_10px_rgba(56,189,248,0.2)] transition-all">
                            <Image size={14} /> PNG
                        </button>
                        <button onClick={reset} className="ml-2 flex items-center gap-1.5 text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-2 rounded-lg border border-red-500/20 transition-all">
                            Restart
                        </button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex gap-2 overflow-x-auto py-3 no-scrollbar border-t border-slate-800/30">
                        {TABS.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`relative flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg whitespace-nowrap transition-all duration-200 z-10 
                                        ${isActive ? 'text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="active-tab"
                                            className="absolute inset-0 bg-slate-800/80 border border-brand-500/50 shadow-[0_0_15px_rgba(56,189,248,0.15)] rounded-lg -z-10"
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        />
                                    )}
                                    <Icon size={16} className={isActive ? 'text-brand-400' : ''} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </header>

            {/* Content Portal */}
            <main ref={dashboardRef} className="max-w-7xl mx-auto px-6 py-8">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                        transition={{ duration: 0.2 }}
                    >
                        {renderTab()}
                    </motion.div>
                </AnimatePresence>
            </main>
            {/* Hidden Export Container */}
            {isExporting && (
                <div ref={exportContainerRef} className="absolute left-[-9999px] top-[-9999px] flex flex-col gap-10">
                    <div className="p-8 bg-[#020617] w-[1200px]">
                        <h2 className="text-2xl font-bold text-white mb-6">Overview</h2>
                        <OverviewTab analytics={analytics} nameMap={nameMap} narrative={narrative} />
                    </div>
                    <div className="p-8 bg-[#020617] w-[1200px]">
                        <h2 className="text-2xl font-bold text-white mb-6">Hierarchy</h2>
                        <HierarchyTab analytics={analytics} nameMap={nameMap} participants={participants} />
                    </div>
                    <div className="p-8 bg-[#020617] w-[1200px]">
                        <h2 className="text-2xl font-bold text-white mb-6">Network</h2>
                        <NetworkTab analytics={analytics} participants={participants} ballots={ballots} nameMap={nameMap} networkRef={networkRef} staticMode={true} />
                    </div>
                    <div className="p-8 bg-[#020617] w-[1200px]">
                        <h2 className="text-2xl font-bold text-white mb-6">Inequality</h2>
                        <InequalityTab analytics={analytics} nameMap={nameMap} participants={participants} />
                    </div>
                    <div className="p-8 bg-[#020617] w-[1200px]">
                        <h2 className="text-2xl font-bold text-white mb-6">Stability</h2>
                        <StabilityTab analytics={analytics} nameMap={nameMap} participants={participants} />
                    </div>
                    <div className="p-8 bg-[#020617] w-[1200px]">
                        <h2 className="text-2xl font-bold text-white mb-6">Psychology</h2>
                        <PsychologyTab analytics={analytics} nameMap={nameMap} participants={participants} />
                    </div>
                    <div className="p-8 bg-[#020617] w-[1200px]">
                        <h2 className="text-2xl font-bold text-white mb-6">Simulation</h2>
                        <SimulationTab analytics={analytics} nameMap={nameMap} participants={participants} />
                    </div>
                    {/* Glossary */}
                    {Object.entries(explanations).reduce((acc: [string, any][][], curr, i) => {
                        const chunkIndex = Math.floor(i / 8);
                        if (!acc[chunkIndex]) acc[chunkIndex] = [];
                        acc[chunkIndex].push(curr);
                        return acc;
                    }, []).map((chunk, i) => (
                        <div key={`glossary-${i}`} className="p-8 bg-[#020617] text-white w-[1200px]">
                            <h2 className="text-2xl font-bold text-white mb-8 border-b border-brand-500/30 pb-4">Glossary of Metrics {i > 0 ? '(Cont.)' : ''}</h2>
                            <div className="grid grid-cols-2 gap-8 text-sm">
                                {chunk.map(([key, ex]) => (
                                    <div key={key} className="glass-card bg-slate-900/40 p-5 rounded-xl border border-slate-800 break-inside-avoid">
                                        <div className="font-bold text-brand-400 uppercase tracking-wider mb-2">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                                        <div className="mb-3"><span className="font-bold text-slate-300">Definition:</span> <span className="text-slate-400">{ex.definition}</span></div>
                                        <div className="mb-3"><span className="font-bold text-slate-300">Why it matters:</span> <span className="text-slate-400">{ex.whyMatters}</span></div>
                                        {ex.highMeaning && <div className="mb-1.5"><span className="text-emerald-400 font-bold">High:</span> <span className="text-slate-400">{ex.highMeaning}</span></div>}
                                        {ex.lowMeaning && <div><span className="text-amber-400 font-bold">Low:</span> <span className="text-slate-400">{ex.lowMeaning}</span></div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════
// TAB COMPONENTS
// ═══════════════════════════════════════════════════════

function OverviewTab({ analytics, nameMap, narrative }: any) {
    const topId = analytics.bordaRanking[0];
    const numComm = new Set(Object.values(analytics.communities)).size;

    return (
        <div className="space-y-6">
            {/* KPI grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    label="Top Borda Rank"
                    value={nameMap[topId] || '—'}
                    sub={`Score: ${analytics.bordaScores[topId]?.toFixed(1)}`}
                    highlight="good"
                    metricKey="borda"
                />
                <MetricCard
                    label="Tournament Win"
                    value={analytics.condorcetWinner ? nameMap[analytics.condorcetWinner] : 'Cyclic'}
                    sub={analytics.condorcetWinner ? 'Stable dominant node' : `${analytics.condorcetCycles.length} cycle(s) detected`}
                    highlight={analytics.condorcetWinner ? 'good' : 'warn'}
                    metricKey="tournament"
                />
                <MetricCard
                    label="Consensus (W)"
                    value={analytics.kendallW.toFixed(3)}
                    sub={analytics.kendallW < 0.3 ? 'Divided' : analytics.kendallW < 0.7 ? 'Moderate' : 'Unified'}
                    highlight={analytics.kendallW > 0.7 ? 'good' : analytics.kendallW > 0.3 ? 'warn' : 'bad'}
                    metricKey="kendallW"
                />
                <MetricCard
                    label="Inequality (Gini)"
                    value={analytics.giniCoefficient.toFixed(3)}
                    sub={`${numComm} communit${numComm === 1 ? 'y' : 'ies'} detected`}
                    highlight={analytics.giniCoefficient < 0.3 ? 'good' : analytics.giniCoefficient < 0.5 ? 'warn' : 'bad'}
                    metricKey="gini"
                />
            </div>

            {/* Narrative Intelligence */}
            <div className="glass-card border-brand-500/30 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
                <div className="section-header">
                    <Brain size={16} className="text-brand-400" />
                    Automated Topology Intelligence
                </div>
                <div className="text-slate-300 leading-relaxed text-sm font-medium space-y-4 max-w-none">
                    {narrative.split('\n\n').map((paragraph: string, i: number) => {
                        const match = paragraph.match(/\*\*(.*?)\*\*:\s*(.*)/s);
                        if (match) {
                            return (
                                <p key={i} className="m-0">
                                    <strong className="text-white">{match[1]}:</strong> {match[2]}
                                </p>
                            );
                        }
                        return <p key={i} className="m-0">{paragraph.replace(/\*\*/g, '')}</p>;
                    })}
                </div>
            </div>

            {/* Deep Dive Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass-card">
                    <div className="section-header">Structure Classification</div>
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                        <span className="metric-pill bg-brand-500/20 text-brand-300 border-brand-500/30 px-4 py-1.5 text-sm">{analytics.stratificationLabel}</span>
                        <span className="metric-pill bg-slate-800 text-slate-300 border-slate-700">
                            Cycle density: {analytics.cycleDensity.toFixed(3)}
                        </span>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
                        {analytics.isTournamentAcyclic
                            ? <><div className="bg-emerald-500/20 p-2 rounded-lg"><CheckCircle size={20} className="text-emerald-400" /></div>
                                <span className="font-semibold text-emerald-100">Tournament is acyclic (stable hierarchy)</span></>
                            : <><div className="bg-red-500/20 p-2 rounded-lg"><XCircle size={20} className="text-red-400" /></div>
                                <span className="font-semibold text-red-100">Tournament has cycles (unstable)</span></>
                        }
                    </div>
                    <ExplainPanel metricKey="tournament" />
                </div>

                <div className="glass-card">
                    <div className="section-header text-amber-500">
                        <AlertCircle size={14} className="mr-1 inline -mt-0.5" />
                        Marginalization Signals
                    </div>
                    {analytics.marginalizedParticipants.length > 0 ? (
                        <div className="space-y-3">
                            {analytics.marginalizedParticipants.map((id: string) => (
                                <div key={id} className="flex items-center justify-between bg-red-950/30 border border-red-900/50 rounded-lg p-3">
                                    <div className="flex items-center gap-3">
                                        <AlertCircle size={16} className="text-red-400" />
                                        <span className="font-bold text-red-200">{nameMap[id]}</span>
                                    </div>
                                    <span className="flag-badge">Highest Isolation Risk</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-6 border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
                            <Shield size={24} className="text-emerald-500/50 mb-2" />
                            <p className="text-sm font-medium text-slate-500">No severe marginalization detected.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function HierarchyTab({ analytics, nameMap, participants }: any) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Borda chart */}
                <div className="glass-card">
                    <div className="section-header">Global Borda Hierarchy</div>
                    <BordaBarChart
                        scores={analytics.bordaScores}
                        names={nameMap}
                        marginalizedIds={new Set(analytics.marginalizedParticipants)}
                    />
                    <ExplainPanel metricKey="borda" />
                </div>

                {/* Kendall's W gauge */}
                <div className="glass-card flex flex-col justify-between">
                    <div className="section-header w-full">System Concordance (Kendall's W)</div>
                    <div className="flex-1 flex flex-col items-center justify-center py-4">
                        <GaugeChart value={analytics.kendallW} />
                    </div>
                    <ExplainPanel metricKey="kendallW" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Condorcet */}
                <div className="glass-card">
                    <div className="section-header">Condorcet Analysis</div>
                    <div className="space-y-6">
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Condorcet Winner</div>
                            {analytics.condorcetWinner ? (
                                <div className="flex items-center gap-3">
                                    <div className="bg-emerald-500/20 p-1.5 rounded-md"><CheckCircle size={18} className="text-emerald-400" /></div>
                                    <span className="text-lg font-bold text-emerald-100">{nameMap[analytics.condorcetWinner]}</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <div className="bg-red-500/20 p-1.5 rounded-md"><XCircle size={18} className="text-red-400" /></div>
                                    <span className="text-lg font-bold text-red-200">No strict winner</span>
                                </div>
                            )}
                        </div>

                        <div>
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Detected Cycles</div>
                            {analytics.condorcetCycles.length === 0 ? (
                                <div className="text-sm font-medium text-emerald-500/70 border border-emerald-500/20 bg-emerald-500/5 py-2 px-3 rounded-lg inline-block">Perfect Hierarchical Stability (0 cycles)</div>
                            ) : (
                                <div className="space-y-2">
                                    {analytics.condorcetCycles.slice(0, 5).map((cycle: string[], i: number) => (
                                        <div key={i} className="text-xs font-mono font-medium text-amber-200 bg-amber-950/30 border border-amber-900/50 px-3 py-2 rounded-lg flex items-center gap-2">
                                            <Zap size={12} className="text-amber-500" />
                                            {cycle.map(id => nameMap[id]).join(' → ')} → {nameMap[cycle[0]]}
                                        </div>
                                    ))}
                                    {analytics.condorcetCycles.length > 5 && (
                                        <div className="text-xs font-bold text-slate-500 pt-1">+{analytics.condorcetCycles.length - 5} additional permutation cycles hidden</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    <ExplainPanel metricKey="condorcet" />
                </div>

                {/* Leaderboard */}
                <div className="glass-card">
                    <div className="section-header">Leadership Emergence Velocity</div>
                    <div className="space-y-3">
                        {participants
                            .slice()
                            .sort((a: any, b: any) => (analytics.leadershipScore[b.id] || 0) - (analytics.leadershipScore[a.id] || 0))
                            .map((p: any, i: number) => {
                                const lScore = analytics.leadershipScore[p.id] || 0;
                                const isTop = i === 0;
                                return (
                                    <div key={p.id} className={`flex items-center gap-3 p-2 rounded-lg ${isTop ? 'bg-brand-500/10 border border-brand-500/20' : ''}`}>
                                        <span className={`text-xs font-mono font-bold w-5 text-center ${isTop ? 'text-brand-400' : 'text-slate-600'}`}>0{i + 1}</span>
                                        <span className={`text-sm font-bold flex-1 ${isTop ? 'text-white' : 'text-slate-300'}`}>{p.name}</span>
                                        <div className="flex items-center gap-3">
                                            <div className="w-24 sm:w-32 bg-slate-900/80 rounded-full h-2 overflow-hidden border border-slate-800">
                                                <div
                                                    className={`h-full rounded-full ${isTop ? 'bg-brand-500 shadow-[0_0_10px_rgba(14,165,233,0.8)]' : 'bg-slate-600'}`}
                                                    style={{ width: `${Math.max(0, Math.min(100, (lScore + 3) / 6 * 100))}%` }}
                                                />
                                            </div>
                                            <span className={`font-mono text-xs font-bold w-12 text-right ${isTop ? 'text-brand-300' : 'text-slate-500'}`}>{lScore.toFixed(2)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                    <ExplainPanel metricKey="leadership" />
                </div>
            </div>
        </div>
    );
}

function NetworkTab({ analytics, participants, ballots, nameMap, networkRef, staticMode }: any) {
    const [showCycles, setShowCycles] = useState(true);

    return (
        <div className="space-y-6">
            {/* Main network */}
            <div className="glass-card p-0 overflow-hidden" ref={networkRef}>
                <div className="p-5 border-b border-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/50">
                    <div className="section-header mb-0 text-white">Majority Preference Directed Graph</div>
                    <div className="flex items-center gap-3 bg-slate-900 py-1.5 px-3 rounded-lg border border-slate-800">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-400 cursor-pointer">
                            <input type="checkbox" checked={showCycles} onChange={e => setShowCycles(e.target.checked)}
                                className="rounded bg-slate-800 border-slate-700 text-brand-500 focus:ring-brand-500" />
                            Render Cycles Overlay
                        </label>
                    </div>
                </div>

                <div className="bg-[#0f172a] relative"> {/* Force dark bg for network */}
                    {/* Inner glow */}
                    <div className="absolute inset-0 shadow-[inset_0_0_50px_rgba(2,6,23,1)] pointer-events-none z-10" />
                    <NetworkGraph
                        participants={participants}
                        communities={analytics.communities}
                        betweenness={analytics.betweennessCentrality}
                        pairwiseMatrix={analytics.pairwiseMatrix}
                        condorcetCycles={analytics.condorcetCycles}
                        numBallots={ballots.length}
                        width={800}
                        height={500}
                        showCycles={showCycles}
                        sizeBy="betweenness"
                        staticMode={staticMode}
                    />
                </div>

                <div className="p-4 bg-slate-900/80 border-t border-slate-800/50">
                    <div className="flex flex-wrap gap-3">
                        {Array.from(new Set(Object.values(analytics.communities) as number[])).sort().map((comm: number) => {
                            const colors = ['#38bdf8', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#2dd4bf', '#fb923c', '#f472b6'];
                            const members = participants.filter((p: any) => analytics.communities[p.id] === comm);
                            return (
                                <div key={comm} className="flex items-center gap-2 text-xs font-medium text-slate-300 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                                    <span className="h-2.5 w-2.5 rounded-full inline-block shadow-[0_0_8px_currentColor]" style={{ background: colors[comm % colors.length], color: colors[comm % colors.length] }} />
                                    Cluster {comm}: <span className="text-slate-400">{members.map((p: any) => p.name).join(', ')}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Centrality Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-card">
                    <div className="section-header">Betweenness Centrality (Brokerage Power)</div>
                    <MetricBarChart
                        data={participants.map((p: any) => ({ id: p.id, name: p.name, value: analytics.betweennessCentrality[p.id] || 0 }))}
                        valueLabel="Betweenness"
                        color="#38bdf8"
                    />
                    <ExplainPanel metricKey="betweenness" />
                </div>
                <div className="glass-card">
                    <div className="section-header">In-Degree Centrality (Prestige)</div>
                    <MetricBarChart
                        data={participants.map((p: any) => ({ id: p.id, name: p.name, value: analytics.inDegreeCentrality[p.id] || 0 }))}
                        valueLabel="In-Degree"
                        color="#34d399"
                    />
                </div>
            </div>

            {/* K-core & Reciprocity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-card">
                    <div className="section-header">K-Core Decomposition Layers</div>
                    <div className="space-y-2">
                        {participants
                            .slice()
                            .sort((a: any, b: any) => (analytics.kCoreDecomposition[b.id] || 0) - (analytics.kCoreDecomposition[a.id] || 0))
                            .map((p: any) => {
                                const k = analytics.kCoreDecomposition[p.id] || 0;
                                const isCore = k > 2;
                                return (
                                    <div key={p.id} className={`flex items-center justify-between p-2 rounded-lg border ${isCore ? 'bg-brand-500/10 border-brand-500/20' : 'bg-slate-900/50 border-slate-800'}`}>
                                        <span className={`text-sm font-bold ${isCore ? 'text-brand-100' : 'text-slate-400'}`}>{p.name}</span>
                                        <span className={`font-mono text-xs font-bold px-2 py-1 rounded bg-slate-950 ${isCore ? 'text-brand-400 border border-brand-500/30' : 'text-slate-500'}`}>
                                            k-shell = {k}
                                        </span>
                                    </div>
                                );
                            })}
                    </div>
                    <ExplainPanel metricKey="kCore" />
                </div>

                <div className="glass-card flex flex-col">
                    <div className="section-header">Reciprocal Dyads (Top-Tier)</div>

                    <div className="mb-6 bg-slate-900/50 rounded-xl p-6 border border-slate-800 text-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent pointer-events-none" />
                        <span className="text-4xl font-bold text-white text-shadow-glow">{(analytics.reciprocityIndex * 100).toFixed(1)}%</span>
                        <div className="text-xs font-bold tracking-widest text-emerald-500 uppercase mt-2">Group Reciprocity Density</div>
                    </div>

                    <div className="flex-1">
                        <div className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-widest">Strongest Mutual Links</div>
                        <div className="flex flex-wrap gap-2">
                            {analytics.reciprocalPairs.slice(0, 10).map(([a, b]: [string, string], i: number) => (
                                <div key={i} className="text-sm font-semibold text-emerald-300 bg-emerald-950/40 border border-emerald-900/60 rounded-lg px-3 py-1.5 flex items-center gap-2">
                                    {nameMap[a]} <Network size={12} className="text-emerald-500 opacity-50" /> {nameMap[b]}
                                </div>
                            ))}
                            {analytics.reciprocalPairs.length > 10 && (
                                <div className="text-xs font-bold text-slate-500 py-2 px-3">+{analytics.reciprocalPairs.length - 10} more dyads</div>
                            )}
                        </div>
                    </div>
                    <ExplainPanel metricKey="reciprocity" />
                </div>
            </div>
        </div>
    );
}

function InequalityTab({ analytics, participants }: any) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard label="Gini Coefficient" value={analytics.giniCoefficient.toFixed(3)}
                    sub="0 = Equality · 1 = Oligarchy"
                    highlight={analytics.giniCoefficient < 0.3 ? 'good' : analytics.giniCoefficient < 0.5 ? 'warn' : 'bad'}
                    metricKey="gini" />
                <MetricCard label="System Entropy" value={analytics.globalEntropy.toFixed(3)}
                    sub="Higher bits = higher uncertainty/flatness"
                    metricKey="entropy" />
                <MetricCard label="Reciprocal Density" value={`${(analytics.reciprocityIndex * 100).toFixed(1)}%`}
                    sub="Fraction of strong mutual bonds"
                    metricKey="reciprocity" />
            </div>

            <div className="glass-card">
                <div className="section-header">Lorenz Curve of Social Capital</div>
                <div className="bg-slate-900/30 rounded-xl p-4 border border-slate-800/50">
                    <LorenzCurveChart points={analytics.lorenzPoints} gini={analytics.giniCoefficient} />
                </div>
                <ExplainPanel metricKey="gini" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-card">
                    <div className="section-header">Reciprocity Imbalance</div>
                    <MetricBarChart
                        data={participants.map((p: any) => ({
                            id: p.id, name: p.name,
                            value: analytics.reciprocityImbalance[p.id] || 0,
                        }))}
                        valueLabel="Deficit"
                        color="#f59e0b"
                    />
                    <ExplainPanel metricKey="reciprocityImbalance" />
                </div>

                <div className="glass-card">
                    <div className="section-header">Eigenvector Centrality (Influence)</div>
                    <MetricBarChart
                        data={participants.map((p: any) => ({
                            id: p.id, name: p.name,
                            value: analytics.eigenvectorCentrality[p.id] || 0,
                        }))}
                        valueLabel="Vector"
                        color="#a78bfa"
                    />
                    <ExplainPanel metricKey="eigenvector" />
                </div>
            </div>
        </div>
    );
}

function StabilityTab({ analytics, nameMap }: any) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard
                    label="Tournament State"
                    value={analytics.isTournamentAcyclic ? 'Acyclic' : 'Cyclic'}
                    sub={analytics.isTournamentAcyclic ? 'Highly stable power structure' : 'Unstable circular triad(s) exist'}
                    highlight={analytics.isTournamentAcyclic ? 'good' : 'bad'}
                />
                <MetricCard
                    label="Nash Equilibrium Risk (TCE)"
                    value={analytics.cycleDensity.toFixed(3)}
                    sub="Triadic cycle density ratio"
                    highlight={analytics.cycleDensity < 0.1 ? 'good' : analytics.cycleDensity < 0.3 ? 'warn' : 'bad'}
                />
                <MetricCard
                    label="Network Fragility"
                    value={analytics.structuralFragility.toFixed(3)}
                    sub="Avg edge destruction per node loss"
                    highlight={analytics.structuralFragility < 0.2 ? 'good' : analytics.structuralFragility < 0.5 ? 'warn' : 'bad'}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Coalitions */}
                <div className="glass-card">
                    <div className="section-header text-brand-400">
                        <Shield size={14} className="mr-1 inline -mt-0.5" />
                        Identified Power Coalitions
                    </div>
                    {analytics.coalitions.length === 0 ? (
                        <div className="text-center py-6 border border-slate-800 border-dashed rounded-xl bg-slate-900/30">
                            <p className="text-sm text-slate-500 font-medium">No strict mutually-preferred coalitions discovered.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {analytics.coalitions.map((coalition: string[], i: number) => (
                                <div key={i} className="flex flex-col gap-2 p-3 rounded-lg bg-slate-900/50 border border-slate-800">
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Faction 0{i + 1}</div>
                                    <div className="flex flex-wrap gap-2">
                                        {coalition.map(id => (
                                            <span key={id} className="text-sm font-bold text-brand-100 bg-brand-500/20 border border-brand-500/40 shadow-[0_0_10px_rgba(56,189,248,0.1)] rounded px-2.5 py-1">
                                                {nameMap[id]}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Subgroup cohesion */}
                <div className="glass-card">
                    <div className="section-header text-teal-400">
                        <Network size={14} className="mr-1 inline -mt-0.5" />
                        Cluster Cohesion Gravity
                    </div>
                    <div className="space-y-4">
                        {Object.entries(analytics.subgroupCohesion).map(([comm, cohesion]) => (
                            <div key={comm} className="bg-slate-900/40 p-3 rounded-lg border border-slate-800">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold tracking-widest uppercase text-slate-400">Cluster {comm}</span>
                                    <span className="text-sm font-mono font-bold text-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.2)] bg-teal-950/50 px-2 py-0.5 rounded border border-teal-500/30">
                                        {(cohesion as number).toFixed(3)}
                                    </span>
                                </div>
                                <div className="bg-slate-950 rounded-full h-1.5 border border-slate-800 overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.8)]"
                                        style={{ width: `${Math.min(100, (cohesion as number) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Condorcet cycles display */}
            <AnimatePresence>
                {analytics.condorcetCycles.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card border-red-500/30 bg-red-950/10"
                    >
                        <div className="section-header text-red-500">
                            <Zap size={14} className="mr-1 inline -mt-0.5" />
                            Instability Vectors (Preference Cycles)
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {analytics.condorcetCycles.slice(0, 12).map((cycle: string[], i: number) => (
                                <div key={i} className="text-sm font-medium text-red-300 bg-red-950/60 border border-red-900 rounded-lg px-3 py-2 flex items-center justify-center gap-1.5 shadow-[inset_0_0_10px_rgba(220,38,38,0.1)]">
                                    <span className="truncate">{cycle.map(id => nameMap[id]).join(' → ')}</span>
                                    <span className="text-red-500 font-bold">→</span>
                                    <span className="text-red-400 font-bold truncate">{nameMap[cycle[0]]}</span>
                                </div>
                            ))}
                        </div>
                        {analytics.condorcetCycles.length > 12 && (
                            <p className="text-xs font-bold text-slate-500 mt-3 text-center uppercase tracking-widest">
                                Processing Limits Reached : {analytics.condorcetCycles.length - 12} vectors hidden
                            </p>
                        )}
                        <ExplainPanel metricKey="cycleDensity" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function PsychologyTab({ analytics, participants }: any) {
    const names = participants.map((p: any) => p.name);
    const conformityData = participants.map((p: any) => ({
        id: p.id, name: p.name, value: analytics.spearmanConformity[p.id] || 0
    }));

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Asymmetry heatmap */}
                <div className="glass-card">
                    <div className="section-header">Dyadic Tension (Asymmetry)</div>
                    <p className="text-xs font-medium text-slate-500 mb-4 bg-slate-900/50 p-2 rounded-lg border border-slate-800">
                        Δrank=|row→col − col→row| <br /> Deep Red = Unrequited Preference / High Tension
                    </p>
                    <div className="overflow-x-auto p-4 bg-slate-950 rounded-xl border border-slate-800">
                        <HeatmapMatrix
                            matrix={analytics.asymmetryMatrix}
                            labels={names}
                            colorScale="red"
                            cellSize={Math.max(24, Math.min(42, Math.floor(400 / participants.length)))}
                        />
                    </div>
                    <ExplainPanel metricKey="asymmetry" />
                </div>

                {/* Mutual information heatmap */}
                <div className="glass-card">
                    <div className="section-header text-brand-400">Cognitive Overlap (Mutual Info)</div>
                    <p className="text-xs font-medium text-slate-500 mb-4 bg-slate-900/50 p-2 rounded-lg border border-slate-800">
                        Higher correlation between two raters' full ballots <br /> Deep Blue = Highly synchronized worldviews
                    </p>
                    <div className="overflow-x-auto p-4 bg-slate-950 rounded-xl border border-slate-800">
                        <HeatmapMatrix
                            matrix={analytics.mutualInformation}
                            labels={names}
                            colorScale="blue"
                            cellSize={Math.max(24, Math.min(42, Math.floor(400 / participants.length)))}
                        />
                    </div>
                    <ExplainPanel metricKey="mutualInfo" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-card">
                    <div className="section-header text-purple-400">Polarity Index (Rank Variance)</div>
                    <PolarizationChart
                        data={participants.map((p: any) => ({
                            name: p.name,
                            value: analytics.polarizationScores[p.id] || 0,
                        }))}
                    />
                    <ExplainPanel metricKey="polarization" />
                </div>

                <div className="glass-card">
                    <div className="section-header text-teal-400">Perceptual Normativity (Spearman ρ)</div>
                    <MetricBarChart
                        data={conformityData}
                        valueLabel="Conformity ρ"
                        color="#2dd4bf"
                    />
                    <ExplainPanel metricKey="conformity" />
                </div>
            </div>
        </div>
    );
}

function SimulationTab({ analytics, nameMap, participants }: any) {
    const topId = analytics.bordaRanking[0];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-card">
                    <div className="section-header text-orange-500">
                        <Zap size={14} className="mr-1 inline -mt-0.5" />
                        Status Uncertainty (Individual Entropy)
                    </div>
                    <MetricBarChart
                        data={participants.map((p: any) => ({
                            id: p.id, name: p.name,
                            value: analytics.individualEntropy[p.id] || 0,
                        }))}
                        valueLabel="Entropy Bits"
                        color="#f97316"
                    />
                    <ExplainPanel metricKey="entropy" />
                </div>

                <div className="glass-card">
                    <div className="section-header text-rose-500">
                        <Shield size={14} className="mr-1 inline -mt-0.5" />
                        Loss Aversion Proxy (Extreme Deltas)
                    </div>
                    <MetricBarChart
                        data={participants.map((p: any) => ({
                            id: p.id, name: p.name,
                            value: analytics.lossAversionCount[p.id] || 0,
                        }))}
                        valueLabel="Spikes"
                        color="#f43f5e"
                    />
                </div>
            </div>

            <div className="glass-card border-brand-500/20 bg-brand-950/5">
                <div className="section-header text-brand-400">
                    <Network size={14} className="mr-1 inline -mt-0.5" />
                    Power Vacuum Simulation : Decapitation Event (Removing [{nameMap[topId]}])
                </div>
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="md:w-1/3 bg-slate-950/80 rounded-xl p-5 border border-slate-800/80 flex flex-col justify-center">
                        <div className="text-xl font-bold text-white mb-2 text-center md:text-left">System Response</div>
                        <p className="text-sm font-medium text-slate-400 leading-relaxed text-center md:text-left">
                            Borda score redistribution sequence calculating the net power vacuum created by deleting the system's apex node.
                            <br /><br />
                            <span className="text-emerald-400 font-bold">+</span> indicates opportunists claiming power.
                            <br />
                            <span className="text-red-400 font-bold">-</span> indicates dependencies losing capital.
                        </p>
                    </div>

                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {Object.keys(analytics.topNodeRemovalBordaShift).length === 0 ? (
                            <div className="col-span-2 flex items-center justify-center p-6 border border-dashed border-slate-800 rounded-xl">
                                <span className="text-slate-500 font-medium">Insufficient nodes for N-1 perturbation.</span>
                            </div>
                        ) : (
                            participants
                                .filter((p: any) => p.id !== topId)
                                .sort((a: any, b: any) => (analytics.topNodeRemovalBordaShift[b.id] || 0) - (analytics.topNodeRemovalBordaShift[a.id] || 0))
                                .map((p: any) => {
                                    const shift = analytics.topNodeRemovalBordaShift[p.id] || 0;
                                    const isPositive = shift > 0;
                                    const isNegative = shift < 0;

                                    return (
                                        <div key={p.id} className={`flex items-center justify-between p-3 rounded-lg border ${isPositive ? 'bg-emerald-950/20 border-emerald-900/50' :
                                            isNegative ? 'bg-red-950/20 border-red-900/50' :
                                                'bg-slate-900/50 border-slate-800'
                                            }`}>
                                            <span className={`text-sm font-bold ${isPositive ? 'text-emerald-100' : isNegative ? 'text-red-100' : 'text-slate-300'}`}>{p.name}</span>
                                            <div className="flex items-center gap-1.5">
                                                {isPositive ? <TrendingUp size={14} className="text-emerald-500" /> :
                                                    isNegative ? <TrendingDown size={14} className="text-red-500" /> : null}
                                                <span className={`font-mono font-bold text-sm ${isPositive ? 'text-emerald-400' : isNegative ? 'text-red-400' : 'text-slate-500'}`}>
                                                    {isPositive ? '+' : ''}{shift.toFixed(1)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

