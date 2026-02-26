import { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';

interface HeatmapProps {
    matrix: number[][];
    labels: string[];
    colorScale?: 'blue' | 'red' | 'diverging';
    title?: string;
    width?: number;
    cellSize?: number;
}

export function HeatmapMatrix({
    matrix,
    labels,
    colorScale = 'blue',
    title,
    cellSize = 32,
}: HeatmapProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    const draw = useCallback(() => {
        if (!svgRef.current || !matrix.length) return;
        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const n = labels.length;
        const margin = { top: 30, right: 10, bottom: 10, left: 80 };
        const innerW = n * cellSize;
        const innerH = n * cellSize;
        const totalW = innerW + margin.left + margin.right;
        const totalH = innerH + margin.top + margin.bottom;

        svg.attr('width', totalW).attr('height', totalH);

        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const allVals = matrix.flat().filter(v => v !== undefined);
        const maxVal = d3.max(allVals) || 1;
        const minVal = d3.min(allVals) || 0;

        let color: (v: number) => string;
        // Adapted color scales for dark mode
        if (colorScale === 'diverging') {
            const scale = d3.scaleDiverging([minVal, 0, maxVal], d3.interpolateRdBu);
            color = v => scale(v);
        } else if (colorScale === 'red') {
            // Darker background, brighter reds
            const scale = d3.scaleSequential([0, maxVal], d3.interpolateReds);
            color = v => scale(v);
        } else {
            // Darker background, brighter blues/cyans
            const scale = d3.scaleSequential([0, maxVal], d3.interpolateBlues);
            color = v => scale(v);
        }

        const tooltip = d3.select(tooltipRef.current);

        // Cells
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                const val = matrix[i]?.[j] ?? 0;

                // Base cell
                g.append('rect')
                    .attr('x', j * cellSize)
                    .attr('y', i * cellSize)
                    .attr('width', cellSize - 2)
                    .attr('height', cellSize - 2)
                    .attr('rx', 4) // More rounded for premium feel
                    .attr('fill', i === j ? '#1e293b' : color(val)) // Dark grey for diagonal
                    .attr('stroke', i === j ? '#334155' : 'none')
                    .attr('stroke-width', 1)
                    .attr('opacity', i === j ? 1 : 0.8)
                    .attr('class', 'transition-all duration-200 cursor-pointer')
                    .on('mouseover', function (event) {
                        d3.select(this)
                            .attr('opacity', 1)
                            .attr('stroke', '#38bdf8')
                            .attr('stroke-width', 2);

                        if (i === j) return;
                        tooltip.style('display', 'block')
                            .style('left', (event.offsetX + 16) + 'px')
                            .style('top', (event.offsetY - 16) + 'px')
                            .html(`
                                <div class="bg-slate-900/95 border border-brand-500/30 p-2.5 rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.5)] backdrop-blur-md text-xs">
                                    <div class="text-slate-400 mb-1 leading-tight"><span class="text-brand-300 font-bold">${labels[i]}</span> → <span class="text-brand-300 font-bold">${labels[j]}</span></div>
                                    <div class="text-white font-bold text-sm tracking-wide">Value: <span class="${colorScale === 'red' ? 'text-red-400' : 'text-brand-400'}">${val.toFixed(3)}</span></div>
                                </div>
                            `);
                    })
                    .on('mouseout', function () {
                        d3.select(this)
                            .attr('opacity', i === j ? 1 : 0.8)
                            .attr('stroke', i === j ? '#334155' : 'none')
                            .attr('stroke-width', 1);
                        tooltip.style('display', 'none');
                    });

                // Value text for larger cells - adjusted for dark mode
                if (cellSize >= 28 && i !== j) {
                    const threshold = colorScale === 'diverging' ? 0 : maxVal * 0.5;
                    const isDarkCell = colorScale === 'diverging' ? Math.abs(val) > d3.max([Math.abs(minVal), Math.abs(maxVal)])! * 0.5 : val > threshold;

                    g.append('text')
                        .attr('x', j * cellSize + (cellSize - 2) / 2)
                        .attr('y', i * cellSize + (cellSize - 2) / 2 + 3)
                        .attr('text-anchor', 'middle')
                        .attr('font-size', '10px')
                        .attr('font-weight', '600')
                        // Intelligent text color based on cell background intensity
                        .attr('fill', isDarkCell ? '#ffffff' : colorScale === 'red' ? '#7f1d1d' : '#1e3a8a')
                        .attr('font-family', 'Outfit, sans-serif')
                        .style('pointer-events', 'none')
                        .text(val.toFixed(1));
                }
            }
        }

        // Row labels
        g.append('g').selectAll('text')
            .data(labels)
            .enter().append('text')
            .attr('x', -8)
            .attr('y', (_, i) => i * cellSize + (cellSize - 2) / 2 + 4)
            .attr('text-anchor', 'end')
            .attr('font-size', '11px')
            .attr('font-weight', '600')
            .attr('fill', '#94a3b8') // Lighter slate for dark mode
            .attr('font-family', 'Inter, sans-serif')
            .text(d => d.length > 10 ? d.slice(0, 9) + '…' : d);

        // Column labels (rotated for better fit)
        g.append('g').selectAll('text')
            .data(labels)
            .enter().append('text')
            .attr('x', (_, i) => i * cellSize + (cellSize - 2) / 2)
            .attr('y', -8)
            .attr('text-anchor', 'start')
            .attr('transform', (_, i) => `rotate(-45, ${i * cellSize + (cellSize - 2) / 2}, -8)`)
            .attr('font-size', '11px')
            .attr('font-weight', '600')
            .attr('fill', '#94a3b8')
            .attr('font-family', 'Inter, sans-serif')
            .text(d => d.length > 10 ? d.slice(0, 9) + '…' : d);

    }, [matrix, labels, colorScale, cellSize]);

    useEffect(() => { draw(); }, [draw]);

    return (
        <div className="relative inline-block mt-4 ml-4">
            {title && <div className="text-sm font-bold text-white mb-4 tracking-wide">{title}</div>}
            <svg ref={svgRef} className="overflow-visible" />
            <div
                ref={tooltipRef}
                className="absolute"
                style={{ display: 'none', pointerEvents: 'none', zIndex: 100 }}
            />
        </div>
    );
}
