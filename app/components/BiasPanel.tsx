import React from 'react';
import { IndicatorSignal } from '../lib/types';
import { getConfidenceColorClass } from '@/app/lib/uiSignalStyles';
import { PanelHelp } from './PanelHelp';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface BiasPanelProps {
    data: any;
    loading: boolean;
}

export function BiasPanel({ data, loading }: BiasPanelProps) {
    if (loading) return <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-xl h-24"></div>;

    const bias = data?.analysis?.bias as IndicatorSignal;
    if (!bias || bias.status === 'OFF') return null;

    // --- Data Extraction ---
    const { midnightOpen, buffer } = (bias.debug || {}) as any;
    const price = data.price || 0;
    const direction = bias.direction;
    const score = bias.score;
    const status = bias.status;
    const regime = data.analysis?.marketContext?.regime || "—";

    // --- Styling Logic ---
    // Strict Confidence Law: 0-59 Red, 60-74 Yellow, 75-100 Green
    let scoreColor = "text-red-400";
    let borderColor = "ring-1 ring-red-500/30";
    if (score >= 75) {
        scoreColor = "text-emerald-300";
        borderColor = "ring-1 ring-emerald-500/30";
    } else if (score >= 60) {
        scoreColor = "text-yellow-300";
        borderColor = "ring-1 ring-yellow-500/30";
    }

    // Direction Badge
    let dirBadgeClass = "text-zinc-500 bg-zinc-500/10";
    if (direction === "LONG") dirBadgeClass = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (direction === "SHORT") dirBadgeClass = "text-red-400 bg-red-500/10 border-red-500/20";

    // Status Color (WARN affects valid status badge only)
    const statusColor = status === 'OK' ? 'text-emerald-400' : status === 'WARN' ? 'text-yellow-400' : 'text-zinc-500';

    // Rule Line
    let ruleText = "Neutral Zone - Wait for break";
    if (direction === "LONG") ruleText = `Prefer LONGs above ${(midnightOpen + buffer).toFixed(2)}`;
    if (direction === "SHORT") ruleText = `Prefer SHORTs below ${(midnightOpen - buffer).toFixed(2)}`;

    // Distance Calculation (V3)
    let distText = "Inside buffer (neutral zone)";
    if (direction === "LONG") {
        const dist = Math.max(0, price - (midnightOpen + buffer));
        const mult = buffer > 0 ? (dist / buffer).toFixed(1) : "0.0";
        distText = `Distance from buffer: +${dist.toFixed(2)} pts (${mult}x buffer)`;
    } else if (direction === "SHORT") {
        const dist = Math.max(0, (midnightOpen - buffer) - price);
        const mult = buffer > 0 ? (dist / buffer).toFixed(1) : "0.0";
        distText = `Distance from buffer: +${dist.toFixed(2)} pts (${mult}x buffer)`;
    }

    // Flip Detection Visual
    const isFlip = bias.debug?.factors?.includes("BIAS FLIP CONFIRMED");

    return (
        <div className={`rounded-xl border bg-white/5 p-3 space-y-2 h-full flex flex-col justify-center ${borderColor} relative overflow-hidden`}>

            {/* Flip Effect (Subtle Glow) */}
            {isFlip && <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-white/10 to-transparent pointer-events-none" />}

            {/* 1. Header: BIAS | Direction | Status | Score */}
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-500 tracking-wide text-sm">BIAS</span>
                    <div className="h-3 w-px bg-white/10" />
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${dirBadgeClass}`}>
                        {direction}
                    </span>
                    <div className="h-3 w-px bg-white/10" />
                    <span className={`text-[10px] font-bold ${statusColor}`}>
                        {status}
                    </span>
                </div>
                <div className={`text-lg font-bold ${scoreColor}`}>
                    {Math.round(score)}%
                </div>
            </div>

            {/* 2. Main Hint & Rule & Context */}
            <div className="space-y-1">
                <div className="text-xs font-medium text-white/90 text-center bg-white/5 py-1 rounded border border-white/5">
                    {ruleText}
                </div>

                {/* V3: Distance / Explanation Line */}
                <div className="text-[10px] text-zinc-400 text-center font-mono">
                    {distText}
                </div>

                {/* V3: Low-key regime context */}
                <div className="text-[9px] text-zinc-600 text-center uppercase tracking-wider">
                    Regime: {regime}
                </div>
            </div>

            {/* 3. Inline Levels */}
            <div className="flex justify-center gap-3 text-[10px] font-mono text-zinc-400 border-t border-white/5 pt-2 mt-1">
                <span>Mid: {midnightOpen?.toFixed(2)}</span>
                <span className="text-emerald-500/70">Up: {(midnightOpen + buffer).toFixed(2)}</span>
                <span className="text-red-500/70">Low: ${(midnightOpen - buffer).toFixed(2)}</span>
            </div>

            {/* 4. Help Toggle (V3 Polish) */}
            <div className="pt-1 border-t border-white/5 mt-1">
                <PanelHelp title="Bias Precision V3" bullets={[
                    "Bias is a FILTER (direction), not an entry trigger.",
                    "Above UP = bullish filter, below LOW = bearish, inside = neutral.",
                    "Confidence % = strength (distance + reliability caps).",
                    "Flip confirmed = 2+ closes beyond opposite buffer."
                ]} />
            </div>
        </div>
    );
}
