'use client';
import React from 'react';
import { PanelProps } from './DashboardPanels';
import { ConfluenceSignal } from '../lib/confluence';
import IndicatorHeader from './IndicatorHeader';

export function ConfluencePanel({ data, loading }: PanelProps) {
    if (loading || !data?.analysis?.confluence) {
        return <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-xl h-24"></div>;
    }

    const confluence = data.analysis.confluence as ConfluenceSignal;
    const { level, debug } = confluence;
    const factors = Array.isArray(debug?.factors) ? debug.factors : [];

    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 hover:bg-white/[0.06] transition w-full flex flex-col justify-center gap-1">
            <IndicatorHeader
                title="CONFLUENCE"
                signal={confluence}
                rightBadgeText={level}
            />

            {/* Row 2: Inline Factors */}
            <div className="flex flex-wrap gap-x-3 text-[10px] leading-tight items-center">
                {factors.filter(f => typeof f === 'string').slice(0, 5).map((f, i) => {
                    const isPos = f.startsWith('+');
                    const isNeg = f.startsWith('-');
                    const color = isPos ? 'text-zinc-400' : isNeg ? 'text-zinc-500' : 'text-zinc-600';

                    return (
                        <span key={i} className={`${color} whitespace-nowrap`}>
                            {f.split(' ').slice(0, 3).join(' ')}
                        </span>
                    );
                })}
                {factors.length === 0 && <span className="text-zinc-600">No active signals</span>}
            </div>
        </div>
    );
}
