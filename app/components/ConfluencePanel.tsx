'use client';
import React from 'react';
import { PanelProps } from './DashboardPanels';
import { ConfluenceResult } from '../lib/confluence';

export function ConfluencePanel({ data, loading }: PanelProps) {
    if (loading || !data?.analysis?.confluence) {
        return <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-xl h-24"></div>;
    }

    const confluence = data.analysis.confluence as ConfluenceResult;
    const { level, suggestion, status, scorePct, factors } = confluence;

    const showDirection = level !== "NO_TRADE" && suggestion !== "NO_TRADE";

    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 hover:bg-white/[0.06] transition w-full flex flex-col justify-center gap-2">

            {/* Row 1: Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="font-semibold tracking-wide text-pink-400 text-sm">CONFLUENCE</div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${level === 'STRONG' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                            level === 'GOOD' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                                level === 'WEAK' ? 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30' :
                                    'bg-zinc-800/50 text-zinc-500 border-transparent'
                        }`}>
                        {level}
                    </span>

                    {showDirection && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${suggestion === 'LONG' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                                'bg-red-500/20 text-red-300 border border-red-500/30'
                            }`}>
                            {suggestion}
                        </span>
                    )}

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${status === "OK" ? "bg-emerald-500/10 text-emerald-400" :
                            status === "WARN" ? "bg-amber-500/10 text-amber-400" :
                                "bg-red-500/10 text-red-400"
                        }`}>
                        {status}
                    </span>
                </div>

                <div className="text-white font-bold text-lg">{scorePct}%</div>
            </div>

            {/* Row 2: Factors */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] items-center">
                {(factors ?? []).slice(0, 8).map((f, i) => {
                    const isPos = f.startsWith('+');
                    const isNeg = f.startsWith('-');
                    const isWarn = f.includes('WARN');

                    let color = 'text-zinc-600';
                    if (isWarn) color = 'text-amber-400';
                    else if (isPos) color = 'text-zinc-400';
                    else if (isNeg) color = 'text-zinc-500';

                    return (
                        <span key={i} className={`${color} whitespace-nowrap`}>
                            {f.replace(/^\+[0-9]+ /, '').replace(/^- [0-9]+ /, '')}
                        </span>
                    );
                })}
                {(!factors || factors.length === 0) && <span className="text-zinc-600">No active signals</span>}
            </div>
        </div>
    );
}
