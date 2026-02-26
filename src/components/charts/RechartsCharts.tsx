import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
    Area, AreaChart,
} from 'recharts';

interface BordaBarChartProps {
    scores: Record<string, number>;
    names: Record<string, string>;
    marginalizedIds: Set<string>;
}

export function BordaBarChart({ scores, names, marginalizedIds }: BordaBarChartProps) {
    const data = Object.entries(scores)
        .sort((a, b) => a[1] - b[1])
        .map(([id, score]) => ({
            id,
            name: names[id] || id,
            score,
            marginalized: marginalizedIds.has(id),
        }));

    return (
        <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} layout="vertical" margin={{ left: 20, right: 30, top: 10, bottom: 10 }}>
                {/* Remove intrusive cartesian grid for premium look */}
                <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#cbd5e1', fontWeight: 600 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '12px', fontSize: '13px', color: '#f8fafc', fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
                    itemStyle={{ color: '#38bdf8' }}
                    formatter={(v: number | undefined) => [v != null ? v.toFixed(1) : '—', 'Borda Score']}
                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                />
                <Bar dataKey="score" radius={[0, 6, 6, 0]}>
                    {data.map(d => (
                        <Cell key={d.id} fill={d.marginalized ? '#f87171' : '#0ea5e9'} fillOpacity={1} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}

// ── Lorenz Curve ─────────────────────────────────────────────
interface LorenzCurveProps {
    points: [number, number][];
    gini: number;
}

export function LorenzCurveChart({ points, gini }: LorenzCurveProps) {
    const data = points.map(([x, y]) => ({ x, y, equality: x }));

    return (
        <div>
            <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                    <XAxis
                        dataKey="x"
                        tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                        tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                        axisLine={{ stroke: '#334155' }}
                        tickLine={false}
                        label={{ value: 'Population %', position: 'insideBottom', offset: -15, fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}
                    />
                    <YAxis
                        tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                        tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                        axisLine={{ stroke: '#334155' }}
                        tickLine={false}
                        label={{ value: 'Wealth %', angle: -90, position: 'insideLeft', offset: 15, fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}
                    />
                    <Tooltip
                        formatter={(v: number | undefined, name: string | undefined) => [
                            v != null ? `${(v * 100).toFixed(1)}%` : '—',
                            name === 'y' ? 'Lorenz Area' : 'Equality Line',
                        ]}
                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '12px', fontSize: '13px', color: '#f8fafc', fontWeight: 600 }}
                        itemStyle={{ color: '#38bdf8' }}
                        cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                    />
                    <Area type="monotone" dataKey="equality" stroke="#64748b" strokeWidth={2} strokeDasharray="5 5" fill="none" dot={false} />
                    <Area type="monotone" dataKey="y" stroke="#38bdf8" strokeWidth={3} fill="url(#colorUv)" fillOpacity={1} dot={false} />
                    <defs>
                        <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.1} />
                        </linearGradient>
                    </defs>
                </AreaChart>
            </ResponsiveContainer>
            <p className="text-center text-sm text-slate-400 font-medium">Gini Integration Area = <span className="text-brand-400 font-bold">{gini.toFixed(3)}</span></p>
        </div>
    );
}

// ── Gauge Chart for Kendall's W ───────────────────────────────
interface GaugeProps {
    value: number;
    label?: string;
}

import { explainMetric } from '../../lib/explanations';

export function GaugeChart({ value, label = "Kendall's W" }: GaugeProps) {
    const angle = -135 + value * 270;
    const color = value < 0.3 ? '#f87171' : value < 0.7 ? '#fbbf24' : '#34d399';
    const level = value < 0.3 ? 'Low Consensus' : value < 0.7 ? 'Moderate Consensus' : 'High Consensus';
    const ex = explainMetric("kendallW");

    const needleX = 100 + 60 * Math.sin((angle * Math.PI) / 180);
    const needleY = 115 - 60 * Math.cos((angle * Math.PI) / 180);
    const fillX = 100 + 75 * Math.sin((angle * Math.PI) / 180);
    const fillY = 115 - 75 * Math.cos((angle * Math.PI) / 180);
    const largeArc = value > 0.5 ? 1 : 0;

    return (
        <div className="flex flex-col items-center">
            <svg width={200} height={130} viewBox="0 0 200 130">
                {/* Background Track */}
                <path d="M 25 115 A 75 75 0 0 1 175 115" fill="none" stroke="#1e293b" strokeWidth={16} strokeLinecap="round" />

                {/* Segmented Track background */}
                <path d="M 25 115 A 75 75 0 0 1 80 48" fill="none" stroke="#7f1d1d" strokeWidth={4} strokeLinecap="round" opacity={0.3} />
                <path d="M 80 48 A 75 75 0 0 1 145 48" fill="none" stroke="#78350f" strokeWidth={4} strokeLinecap="round" opacity={0.3} />
                <path d="M 145 48 A 75 75 0 0 1 175 115" fill="none" stroke="#064e3b" strokeWidth={4} strokeLinecap="round" opacity={0.3} />

                {/* Active Fill */}
                <path
                    d={`M 25 115 A 75 75 0 ${largeArc} 1 ${fillX} ${fillY}`}
                    fill="none"
                    stroke={color}
                    strokeWidth={16}
                    strokeLinecap="round"
                    style={{ filter: `drop-shadow(0 0 8px ${color})` }}
                />

                {/* Needle */}
                <line x1={100} y1={115} x2={needleX} y2={needleY} stroke="#cbd5e1" strokeWidth={3} strokeLinecap="round" />
                <circle cx={100} cy={115} r={8} fill="#0f172a" stroke="#cbd5e1" strokeWidth={2} />

                {/* Value Text */}
                <text x={100} y={98} textAnchor="middle" fontSize={24} fontWeight={800} fill={color} fontFamily="Outfit, sans-serif" style={{ filter: `drop-shadow(0px 0px 4px ${color})` }}>
                    {value.toFixed(3)}
                </text>
            </svg>
            <div className="text-sm font-bold mt-2 tracking-wide" style={{ color }}>{level}</div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{label}</div>
            <div className="flex gap-4 mt-4 text-xs font-semibold text-slate-400">
                <span className="flex items-center gap-1"><span style={{ color: '#f87171' }}>●</span> 0–0.3 Low</span>
                <span className="flex items-center gap-1"><span style={{ color: '#fbbf24' }}>●</span> 0.3–0.7 Mod</span>
                <span className="flex items-center gap-1"><span style={{ color: '#34d399' }}>●</span> 0.7–1 High</span>
            </div>
            {ex && (
                <div className="absolute left-0 top-full mt-2 w-64 p-4 bg-slate-900/95 border border-brand-500/40 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] opacity-0 invisible group-hover/card:opacity-100 group-hover/card:visible transition-all text-xs backdrop-blur-md font-sans text-left pointer-events-none z-[100]">
                    <div className="absolute -top-2 left-4 border-8 border-transparent border-b-brand-500/40"></div>
                    <p className="mb-2 text-sm leading-relaxed"><strong className="text-white block mb-0.5">Definition</strong> <span className="text-slate-300">{ex.definition}</span></p>
                    <p className="mb-2 text-sm leading-relaxed"><strong className="text-white block mb-0.5">Why it matters</strong> <span className="text-slate-300">{ex.whyMatters}</span></p>
                    {ex.highMeaning && <p className="mb-1.5 text-sm"><strong className="text-emerald-400">High:</strong> <span className="text-slate-300">{ex.highMeaning}</span></p>}
                    {ex.lowMeaning && <p className="mb-1 text-sm"><strong className="text-amber-400">Low:</strong> <span className="text-slate-300">{ex.lowMeaning}</span></p>}
                </div>
            )}
        </div>
    );
}

// ── Generic horizontal bar chart ──────────────────────────────
interface MetricBarChartProps {
    data: { id: string; name: string; value: number }[];
    valueLabel?: string;
    color?: string;
    height?: number;
}

export function MetricBarChart({
    data,
    valueLabel = 'Value',
    color = '#38bdf8',
    height = 250,
}: MetricBarChartProps) {
    const sorted = [...data].sort((a, b) => a.value - b.value);
    const maxV = Math.max(...sorted.map(d => d.value), 0.001);
    const chartData = sorted.map(d => ({ ...d, value: parseFloat(d.value.toFixed(3)) }));

    return (
        <ResponsiveContainer width="100%" height={height}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 30, top: 10, bottom: 10 }}>
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} domain={[0, maxV * 1.05]} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#cbd5e1', fontWeight: 600 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: `1px solid ${color}`, borderRadius: '12px', fontSize: '13px', color: '#f8fafc', fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
                    itemStyle={{ color: color }}
                    formatter={(v: number | undefined) => [v != null ? v.toFixed(4) : '—', valueLabel]}
                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                />
                <Bar dataKey="value" fill={color} radius={[0, 6, 6, 0]} fillOpacity={0.9} />
            </BarChart>
        </ResponsiveContainer>
    );
}

// ── Polarization bar chart ────────────────────────────────────
interface PolarizationChartProps {
    data: { name: string; value: number }[];
}

export function PolarizationChart({ data }: PolarizationChartProps) {
    const sorted = [...data].sort((a, b) => b.value - a.value);
    return (
        <ResponsiveContainer width="100%" height={240}>
            <BarChart data={sorted} margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#cbd5e1', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(167, 139, 250, 0.3)', borderRadius: '12px', fontSize: '13px', color: '#f8fafc', fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
                    itemStyle={{ color: '#a78bfa' }}
                    formatter={(v: number | undefined) => [v != null ? v.toFixed(3) : '—', 'Polarity Variance']}
                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {sorted.map((d, i) => (
                        <Cell key={i} fill={d.value > 2 ? '#a78bfa' : '#c4b5fd'} fillOpacity={0.9} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}
