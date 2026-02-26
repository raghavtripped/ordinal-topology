import { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import type { Participant } from '../../types';

const COMMUNITY_COLORS = [
    '#38bdf8', '#34d399', '#fbbf24', '#f87171',
    '#a78bfa', '#fb923c', '#4ade80', '#f472b6'
];

export interface NetworkGraphProps {
    participants: Participant[];
    communities: Record<string, number>;
    betweenness: Record<string, number>;
    pairwiseMatrix: number[][]; // Not directly used in plotting, but passed
    condorcetCycles: string[][];
    numBallots?: number;
    showCycles?: boolean;
    sizeBy?: string;
    width?: number;
    height?: number;
}

export function NetworkGraph({ participants, communities, betweenness, condorcetCycles }: NetworkGraphProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const width = 800;
    const height = 600;

    const draw = useCallback(() => {
        if (!svgRef.current) return;

        // Redefine width and height based on parent element for responsiveness
        const currentWidth = svgRef.current.parentElement ? parseInt(getComputedStyle(svgRef.current.parentElement).width) : width;
        const currentHeight = svgRef.current.parentElement ? parseInt(getComputedStyle(svgRef.current.parentElement).height) : height;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        // Build nodes array from participants
        const nodes = participants.map(p => {
            const comm = communities[p.id] !== undefined ? communities[p.id] : 0;
            return {
                id: p.id,
                name: p.name,
                community: comm
            };
        });

        // Reconstruct links from condorcetCycles or derive basic links from pairwise
        // For visual clarity, we'll build links strictly for edges in a cycle to demonstrate the cyclic graphs, 
        //, or optionally all non-zero pairwise edges if preferred.
        // As a fallback, we extract pairs from cycle.
        const links: { source: string; target: string; weight: number }[] = [];

        const maxWeight = 1;
        const maxBetweenness = Math.max(...Object.values(betweenness), 0.01);

        // Highlight cycles
        const cycleEdgeSet = new Set<string>();
        condorcetCycles.forEach(cycle => {
            for (let i = 0; i < cycle.length; i++) {
                const s = cycle[i];
                const t = cycle[(i + 1) % cycle.length];
                cycleEdgeSet.add(`${s}-${t}`);
                links.push({ source: s, target: t, weight: 1 });
            }
        });

        // Dedup links
        const linkMap = new Map<string, typeof links[0]>();
        links.forEach(l => {
            linkMap.set(`${l.source}-${l.target}`, l);
        });

        const dedupedLinks = Array.from(linkMap.values()).map(l => ({
            ...l,
            source: typeof l.source === 'string' ? l.source : (l.source as any).id,
            target: typeof l.target === 'string' ? l.target : (l.target as any).id
        }));

        const simulationNodes = nodes.map(n => ({ ...n }));

        // Zoom and Drag
        const g = svg.append('g');

        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.5, 4])
            .on('zoom', (e) => {
                g.attr('transform', e.transform);
            });

        svg.call(zoom);

        // Defs
        const defs = svg.append('defs');

        // Arrowheads
        ['normal', 'cycle'].forEach(type => {
            defs.append('marker')
                .attr('id', `arrow-${type}`)
                .attr('viewBox', '0 -5 10 10')
                .attr('refX', 25)
                .attr('refY', 0)
                .attr('markerWidth', 6)
                .attr('markerHeight', 6)
                .attr('orient', 'auto')
                .append('path')
                .attr('d', 'M0,-5L10,0L0,5')
                .attr('fill', type === 'cycle' ? '#ef4444' : '#64748b')
                .attr('opacity', type === 'cycle' ? 1 : 0.6);
        });

        // Glow filters
        COMMUNITY_COLORS.forEach((_, i) => {
            const filter = defs.append('filter')
                .attr('id', `glow-${i}`)
                .attr('x', '-50%').attr('y', '-50%')
                .attr('width', '200%').attr('height', '200%');
            filter.append('feGaussianBlur')
                .attr('stdDeviation', '4')
                .attr('result', 'coloredBlur');
            const feMerge = filter.append('feMerge');
            feMerge.append('feMergeNode').attr('in', 'coloredBlur');
            feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
        });

        // Initialize simulation
        const simulation = d3.forceSimulation(simulationNodes as any)
            .force('link', d3.forceLink(dedupedLinks).id((d: any) => d.id).distance(120).strength(0.5))
            .force('charge', d3.forceManyBody().strength(-800))
            .force('center', d3.forceCenter(currentWidth / 2, currentHeight / 2))
            .force('collide', d3.forceCollide().radius(40))
            .force('x', d3.forceX(currentWidth / 2).strength(0.05))
            .force('y', d3.forceY(currentHeight / 2).strength(0.05));

        // Draw edges
        const link = g.append('g')
            .selectAll('path')
            .data(dedupedLinks)
            .join('path')
            .attr('fill', 'none')
            .style('transition', 'stroke 0.3s ease, stroke-width 0.3s ease')
            .attr('stroke', d => cycleEdgeSet.has(`${(d.source as any).id}-${(d.target as any).id}`) ? '#ef4444' : '#334155')
            .attr('stroke-width', d => {
                const isCycle = cycleEdgeSet.has(`${(d.source as any).id}-${(d.target as any).id}`);
                const base = 1 + (d.weight / maxWeight) * 4;
                return isCycle ? base + 2 : base;
            })
            .attr('opacity', d => cycleEdgeSet.has(`${(d.source as any).id}-${(d.target as any).id}`) ? 0.9 : 0.4)
            .attr('marker-end', d => cycleEdgeSet.has(`${(d.source as any).id}-${(d.target as any).id}`) ? 'url(#arrow-cycle)' : 'url(#arrow-normal)');

        // Draw nodes
        const nodeGroup = g.append('g')
            .selectAll('g')
            .data(simulationNodes)
            .join('g')
            .attr('class', 'cursor-grab active:cursor-grabbing')
            .call(d3.drag<any, any>()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended)
            );

        // Tooltip setup
        const tooltip = d3.select(containerRef.current)
            .append('div')
            .attr('class', 'absolute pointer-events-none opacity-0 transition-opacity z-50')
            .style('visibility', 'hidden');

        // Node circles
        nodeGroup.append('circle')
            .attr('r', d => 15 + ((betweenness[d.id] || 0) / maxBetweenness) * 15)
            .attr('fill', d => COMMUNITY_COLORS[d.community % COMMUNITY_COLORS.length])
            .attr('stroke', '#0f172a')
            .attr('stroke-width', 3)
            .attr('filter', d => `url(#glow-${d.community % COMMUNITY_COLORS.length})`) // Apply glow
            .on('mouseover', function (event, d) {
                d3.select(this)
                    .transition().duration(200)
                    .attr('r', 15 + ((betweenness[d.id] || 0) / maxBetweenness) * 15 + 5)
                    .attr('stroke', '#ffffff');

                // Highlight connected edges
                link.attr('stroke-opacity', l => (l.source as any).id === d.id || (l.target as any).id === d.id ? 1 : 0.1);

                // Highlight connected nodes
                nodeGroup.selectAll('circle').attr('opacity', (n: any) => {
                    if (n.id === d.id) return 1;
                    const isConnected = dedupedLinks.some(l =>
                        ((l.source as any).id === d.id && (l.target as any).id === n.id) ||
                        ((l.target as any).id === d.id && (l.source as any).id === n.id)
                    );
                    return isConnected ? 1 : 0.2;
                });
                nodeGroup.selectAll('text').attr('opacity', (n: any) => {
                    // Same logic
                    if (n.id === d.id) return 1;
                    const isConnected = dedupedLinks.some(l =>
                        ((l.source as any).id === d.id && (l.target as any).id === n.id) ||
                        ((l.target as any).id === d.id && (l.source as any).id === n.id)
                    );
                    return isConnected ? 1 : 0.2;
                });

                tooltip.html(`
                    <div class="bg-slate-900/95 border border-brand-500/30 p-3 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.6)] backdrop-blur-md text-xs min-w-[140px]">
                        <div class="font-bold text-white text-sm mb-1 pb-1 border-b border-slate-800">${d.name}</div>
                        <div class="text-slate-400 mb-0.5"><span class="font-bold text-slate-300">Cluster:</span> ${d.community}</div>
                        <div class="text-slate-400"><span class="font-bold text-slate-300">Betweenness:</span> <span class="text-brand-400">${(betweenness[d.id] || 0).toFixed(3)}</span></div>
                    </div>
                `)
                    .style('visibility', 'visible')
                    .style('opacity', 1)
                    .style('left', (event.pageX + 15) + 'px')
                    .style('top', (event.pageY - 20) + 'px');
            })
            .on('mousemove', (event) => {
                tooltip
                    .style('left', (event.pageX + 15) + 'px')
                    .style('top', (event.pageY - 20) + 'px');
            })
            .on('mouseout', function () {
                d3.select(this)
                    .transition().duration(200)
                    .attr('r', d => 15 + ((betweenness[(d as any).id] || 0) / maxBetweenness) * 15)
                    .attr('stroke', '#0f172a');

                link.attr('stroke-opacity', d => cycleEdgeSet.has(`${(d.source as any).id}-${(d.target as any).id}`) ? 0.9 : 0.4);
                nodeGroup.selectAll('circle').attr('opacity', 1);
                nodeGroup.selectAll('text').attr('opacity', 1);

                tooltip.style('visibility', 'hidden').style('opacity', 0);
            });

        // Node labels
        nodeGroup.append('text')
            .text(d => d.name)
            .attr('x', 0)
            .attr('y', d => 28 + ((betweenness[d.id] || 0) / maxBetweenness) * 15)
            .attr('text-anchor', 'middle')
            .attr('fill', '#e2e8f0')
            .attr('font-size', '12px')
            .attr('font-weight', '600')
            .style('pointer-events', 'none')
            .style('text-shadow', '0 2px 4px rgba(0,0,0,0.8)');

        // Simulation ticks
        simulation.on('tick', () => {
            link.attr('d', (d: any) => {
                // Curvature for edges
                const dx = d.target.x - d.source.x;
                const dy = d.target.y - d.source.y;
                const dr = Math.sqrt(dx * dx + dy * dy) * 2; // Multiplier adjusts curve

                // Straight lines for cycles to make them obvious, curved for rest
                const isCycle = cycleEdgeSet.has(`${d.source.id}-${d.target.id}`);
                if (isCycle) return `M${d.source.x},${d.source.y}L${d.target.x},${d.target.y}`;

                return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
            });

            nodeGroup.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
        });

        function dragstarted(event: any) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }

        function dragged(event: any) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }

        function dragended(event: any) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }

        // Clean up tooltip on unmount
        return () => {
            tooltip.remove();
        };
    }, [participants, communities, condorcetCycles, betweenness]);

    useEffect(() => {
        const cleanup = draw();
        return cleanup;
    }, [draw]);

    // Handle Resize
    useEffect(() => {
        const handleResize = () => draw();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [draw]);

    return (
        <div ref={containerRef} className="relative w-full h-[600px] bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden cursor-crosshair">
            <svg ref={svgRef} className="w-full h-full" />

            {/* Legend */}
            <div className="absolute top-4 left-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800 backdrop-blur-md shadow-xl pointer-events-none">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Network Legend</h4>
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full border-2 border-slate-900 shadow-[0_0_8px_rgba(56,189,248,0.6)]" style={{ backgroundColor: COMMUNITY_COLORS[0] }}></div>
                        <span className="text-xs text-slate-300 font-medium">Actor (Size = Betweenness)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-0.5 bg-slate-500/50 rounded-full"></div>
                        <span className="text-xs text-slate-300 font-medium">Preference Flow</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-1 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                        <span className="text-xs text-slate-300 font-medium">Cyclic Dependency</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
