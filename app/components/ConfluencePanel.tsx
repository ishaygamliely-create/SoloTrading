'use client';
import React from 'react';
import { PanelProps } from './DashboardPanels';
import { ConfluenceSignal } from '../lib/confluence';

export function ConfluencePanel({ data, loading }: PanelProps) {
    if (loading || !data?.analysis?.confluence) {
        return <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-xl h-24"></div>;
    }

    const confluence = data.analysis.confluence as ConfluenceSignal;
    const { level, suggestion, debug } = confluence;
    const factors = debug?.factors || [];
    const rawScore = debug?.rawScore || '0';

    // Level Colors
    let levelColor = 'text-zinc-500';
    let borderColor = 'border-zinc-700';
    let bgColor = 'bg-zinc-800';

    if (level === 'STRONG') {
        levelColor = 'text-green-400';
        borderColor = 'border-green-900/50';
        bgColor = 'bg-green-900/20';
    } else if (level === 'GOOD') {
        levelColor = 'text-emerald-400';
        borderColor = 'border-emerald-900/50';
        bgColor = 'bg-emerald-900/20';
    } else if (level === 'WEAK') {
        levelColor = 'text-yellow-400';
        borderColor = 'border-yellow-900/50';
        bgColor = 'bg-yellow-900/20';
    }

    const suggestionColor =
        suggestion === 'LONG' ? 'text-green-400' :
            suggestion === 'SHORT' ? 'text-red-400' : 'text-zinc-500';

    return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 w-full flex flex-col justify-center gap-1">
            {/* Row 1: Confidence | Score | Suggestion */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-400 uppercase">CONFIDENCE</span>
                    <span className={`text-[10px] font-bold px-1.5 py-px rounded border ${bgColor} ${borderColor} ${levelColor}`}>
                        {level}
                    </span>
                    <span className={`text-xs font-mono font-bold ${levelColor}`}>
                        ({rawScore}/12)
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-[10px] text-zinc-500">Suggested:</span>
                    <span className={`text-[10px] font-bold ${suggestionColor}`}>
                        {suggestion}
                    </span>
                </div>
            </div>

            {/* Row 2: Inline Factors */}
            <div className="flex flex-wrap gap-x-3 text-[10px] leading-tight items-center">
                {factors.slice(0, 5).map((f, i) => {
                    // Extract simplified label if possible, or use full string
                    // e.g. "+4 PSP CONFIRMED LONG" -> "+ PSP"
                    // But user asked for "+ PSP", so let's try to be concise but informative
                    // Actually user said: "+ Kill Zone + PSP - Premium - SMT"
                    // Our factors string is like "+4 PSP CONFIRMED LONG".
                    // Let's simplified display:

                    const isPos = f.startsWith('+');
                    const isNeg = f.startsWith('-');
                    const color = isPos ? 'text-zinc-400' : isNeg ? 'text-zinc-500' : 'text-zinc-600';

                    // Simple cleaning to make it compact?
                    // Remove the number maybe? "+4 PSP..." -> "PSP..."
                    const cleanLabel = f.replace(/^[+-]\d+\s/, '').replace(/\(.*\)/, '').trim();
                    // e.g. "PSP CONFIRMED LONG"
                    // e.g. "ValueZone DISCOUNT supports LONG" -> "ValueZone DISCOUNT"

                    // Keep it somewhat raw but styled
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
