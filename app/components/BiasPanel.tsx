import React from 'react';
import { IndicatorSignal } from '../lib/types';
import { getConfidenceColorClass } from '@/app/lib/uiSignalStyles';
import { PanelHelp } from './PanelHelp';

interface BiasPanelProps {
    data: any;
    loading: boolean;
}

export function BiasPanel({ data, loading }: BiasPanelProps) {
    if (loading) return <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-xl h-24"></div>;

    const bias = data?.analysis?.bias as IndicatorSignal;
    if (!bias || bias.status === 'OFF') return null;

    // --- Standard Colors ---
    const scoreStyle = getConfidenceColorClass(bias.score);
    const directionClass = bias.direction === 'LONG'
        ? "text-emerald-400"
        : bias.direction === 'SHORT'
            ? "text-red-400"
            : "text-zinc-500";
    const statusColor = bias.status === 'OK' ? 'text-emerald-400' : bias.status === 'WARN' ? 'text-yellow-400' : 'text-zinc-500';

    // Debug Data
    const { midnightOpen, buffer, biasMode } = (bias.debug || {}) as any;

    return (
        <div className={`rounded-xl border border-white/10 bg-white/5 p-4 space-y-3 ${scoreStyle.border}`}>
            {/* 1. Header: TITLE | Direction | Status | Score */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-500 tracking-wide">BIAS</span>
                    <div className="h-4 w-px bg-white/10" />
                    <span className={`text-xs font-bold uppercase ${directionClass}`}>
                        {bias.direction}
                    </span>
                    <div className="h-4 w-px bg-white/10" />
                    <span className={`text-xs font-bold uppercase ${statusColor}`}>
                        {bias.status}
                    </span>
                </div>
                <div className={`text-xl font-bold ${scoreStyle.text}`}>
                    {Math.round(bias.score)}%
                </div>
            </div>

            {/* 2. Hint */}
            <div className="text-xs text-white/70 italic">
                {bias.hint}
            </div>

            {/* 3. Data Visualization */}
            <div className="flex items-center gap-4 text-[10px] text-zinc-400 bg-white/5 p-2 rounded border border-white/5">
                <div className="flex flex-col">
                    <span className="uppercase text-zinc-600 font-bold">Midnight Open</span>
                    <span className="font-mono text-white">{midnightOpen?.toFixed(2) ?? '---'}</span>
                </div>
                <div className="flex flex-col">
                    <span className="uppercase text-zinc-600 font-bold">Buffer</span>
                    <span className="font-mono text-white">± {buffer}</span>
                </div>
                <div className="flex flex-col">
                    <span className="uppercase text-zinc-600 font-bold">NY Mode</span>
                    <span className="font-mono text-white">{biasMode}</span>
                </div>
            </div>

            {/* 4. Help Toggle */}
            <div className="pt-2 border-t border-white/5">
                <PanelHelp title="BIAS" bullets={[
                    "Compares current price to NY Midnight Open.",
                    "Above Midnight = Bullish Bias.",
                    "Below Midnight = Bearish Bias.",
                    "Score reflects conviction and buffer clearance."
                ]} />
            </div>
        </div>
    );
}
