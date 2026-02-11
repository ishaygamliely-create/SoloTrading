'use client';
import React from 'react';
import { Target, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { PanelProps } from './DashboardPanels';
import { ConfluenceSignal } from '../lib/confluence';

export function ConfluencePanel({ data, loading }: PanelProps) {
    if (loading || !data?.analysis?.confluence) {
        return <div className="animate-pulse bg-zinc-900 h-48 rounded-xl border border-zinc-800"></div>;
    }

    const confluence = data.analysis.confluence as ConfluenceSignal;
    const { level, suggestion, score, hint, debug } = confluence;
    const factors = debug?.factors || [];

    // Level Colors
    let levelColor = 'text-zinc-500';
    let borderColor = 'border-zinc-700';
    let bgColor = 'bg-zinc-800';

    if (level === 'STRONG') {
        levelColor = 'text-green-400';
        borderColor = 'border-green-900/50';
        bgColor = 'bg-green-900/20';
    } else if (level === 'GOOD') {
        levelColor = 'text-emerald-400'; // Slightly different green
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
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden h-full flex flex-col min-h-[180px]">
            {/* Header */}
            <div className="bg-gradient-to-r from-zinc-900 to-zinc-950 border-b border-zinc-800 p-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Target size={14} className="text-pink-400" />
                    <h3 className="text-zinc-200 font-bold text-sm">CONFIDENCE</h3>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-sm font-black ${levelColor}`}>{confluence.debug?.rawScore}/12</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${bgColor} ${borderColor} ${levelColor}`}>
                        {level}
                    </span>
                </div>
            </div>

            {/* Main Content */}
            <div className="p-3 flex-1 flex flex-col gap-2">

                {/* Suggestion Row */}
                <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-zinc-400 uppercase font-semibold">Suggested Action</span>
                    <div className={`text-sm font-black px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 ${suggestionColor}`}>
                        {suggestion}
                    </div>
                </div>

                {/* Hint */}
                <p className="text-[10px] text-zinc-500 italic mb-2 border-b border-zinc-800/50 pb-2">
                    {hint}
                </p>

                {/* Factors List (Scrollable if needed, but compact preferred) */}
                <div className="flex-1 overflow-y-auto hide-scrollbar space-y-1">
                    {factors.slice(0, 5).map((f, i) => { // Show top 5 factors
                        const isPos = f.startsWith('+');
                        const isNeg = f.startsWith('-');
                        return (
                            <div key={i} className="flex items-center gap-2 text-[10px]">
                                {isPos ? <CheckCircle2 size={10} className="text-green-500/80" /> :
                                    isNeg ? <XCircle size={10} className="text-red-500/80" /> :
                                        <AlertTriangle size={10} className="text-zinc-600" />}
                                <span className={isPos ? 'text-zinc-300' : 'text-zinc-500'}>
                                    {f}
                                </span>
                            </div>
                        );
                    })}
                    {factors.length > 5 && (
                        <span className="text-[9px] text-zinc-600 block pl-4">...and {factors.length - 5} more</span>
                    )}
                </div>
            </div>
        </div>
    );
}
