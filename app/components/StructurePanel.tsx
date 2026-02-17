import React from 'react';
import { IndicatorSignal } from '../lib/types';
import { getConfidenceColorClass } from '@/app/lib/uiSignalStyles';
import { PanelHelp } from './PanelHelp';

interface StructurePanelProps {
    data: any;
    loading: boolean;
}

export function StructurePanel({ data, loading }: StructurePanelProps) {
    if (loading) return <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-xl h-24"></div>;

    const structure = data?.analysis?.structure as IndicatorSignal;
    if (!structure || structure.status === 'OFF') return null;

    // --- Standard Colors ---
    const scoreStyle = getConfidenceColorClass(structure.score);

    const directionClass = structure.direction === 'LONG'
        ? "text-emerald-400"
        : structure.direction === 'SHORT'
            ? "text-red-400"
            : "text-zinc-500";

    const statusColor = structure.status === 'OK' ? 'text-emerald-400' : structure.status === 'WARN' ? 'text-yellow-400' : 'text-zinc-500';

    // Debug Data
    const { adx, label, ema20, ema50 } = (structure.debug || {}) as any;

    return (
        <div className={`rounded-xl border border-white/10 bg-white/5 p-4 space-y-3 ${scoreStyle.border}`}>
            {/* 1. Header: TITLE | Direction | Status | Score */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-blue-400 tracking-wide">STRUCTURE</span>
                    <div className="h-4 w-px bg-white/10" />
                    <span className={`text-xs font-bold uppercase ${directionClass}`}>
                        {structure.direction}
                    </span>
                    <div className="h-4 w-px bg-white/10" />
                    <span className={`text-xs font-bold uppercase ${statusColor}`}>
                        {structure.status}
                    </span>
                </div>
                <div className={`text-xl font-bold ${scoreStyle.text}`}>
                    {Math.round(structure.score)}%
                </div>
            </div>

            {/* 2. Hint */}
            <div className="text-xs text-white/70 italic">
                {structure.hint}
            </div>

            {/* 3. Data Visualization (ADX + EMAs) */}
            <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="bg-white/5 rounded p-2 border border-white/5">
                    <div className="text-zinc-500 font-bold uppercase">Regime</div>
                    <div className="text-white font-mono">{label ?? 'UNKNOWN'}</div>
                </div>
                <div className="bg-white/5 rounded p-2 border border-white/5">
                    <div className="text-zinc-500 font-bold uppercase">ADX (Strength)</div>
                    <div className="text-white font-mono">{adx ?? 'N/A'}</div>
                </div>
            </div>
            {/* Sub-data: EMAs */}
            <div className="flex justify-between px-1 text-[9px] text-zinc-600 font-mono">
                <span>EMA20: {Number(ema20)?.toFixed(1)}</span>
                <span>EMA50: {Number(ema50)?.toFixed(1)}</span>
            </div>


            {/* 4. Help Toggle */}
            <div className="pt-2 border-t border-white/5">
                <PanelHelp title="STRUCTURE" bullets={[
                    "Analyzes Market Regime (Trending vs Ranging).",
                    "Inputs: EMA20, EMA50, ADX.",
                    "Score: Higher = Stronger Trend.",
                    "Hint: Suggests pullback or mean reversion strategies."
                ]} />
            </div>
        </div>
    );
}
