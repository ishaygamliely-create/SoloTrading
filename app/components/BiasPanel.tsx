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

    // --- Styling Logic ---
    const scoreStyle = getConfidenceColorClass(score);

    // Direction Badge
    let dirBadgeClass = "text-zinc-500 bg-zinc-500/10";
    if (direction === "LONG") dirBadgeClass = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (direction === "SHORT") dirBadgeClass = "text-red-400 bg-red-500/10 border-red-500/20";

    // Status Color
    const statusColor = status === 'OK' ? 'text-emerald-400' : status === 'WARN' ? 'text-yellow-400' : 'text-zinc-500';

    // Rule Line
    let ruleText = "Neutral Zone - Wait for break";
    if (direction === "LONG") ruleText = `Prefer LONGs above ${(midnightOpen + buffer).toFixed(2)}`;
    if (direction === "SHORT") ruleText = `Prefer SHORTs below ${(midnightOpen - buffer).toFixed(2)}`;

    // Flip Detection Visual
    const isFlip = bias.debug?.factors?.includes("BIAS FLIP CONFIRMED");

    return (
        <div className={`rounded-xl border bg-white/5 p-3 space-y-2 h-full flex flex-col justify-center ${scoreStyle.border} relative overflow-hidden`}>

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
                <div className={`text-lg font-bold ${scoreStyle.text}`}>
                    {Math.round(score)}%
                </div>
            </div>

            {/* 2. Main Hint & Rule */}
            <div className="space-y-1">
                <div className="text-xs font-medium text-white/90 text-center bg-white/5 py-1 rounded border border-white/5">
                    {ruleText}
                </div>
                <div className="text-[10px] text-zinc-500 text-center italic">
                    "Bias is a directional FILTER, not an entry trigger."
                </div>
            </div>

            {/* 3. Inline Levels (New V2 Requirement) */}
            <div className="flex justify-center gap-3 text-[10px] font-mono text-zinc-400 border-t border-white/5 pt-2 mt-1">
                <span>Mid: {midnightOpen?.toFixed(2)}</span>
                <span className="text-emerald-500/70">Up: {(midnightOpen + buffer).toFixed(2)}</span>
                <span className="text-red-500/70">Low: {(midnightOpen - buffer).toFixed(2)}</span>
            </div>

            {/* 4. Help Toggle */}
            <div className="pt-1 border-t border-white/5 mt-1">
                <PanelHelp title="Bias Precision V2" bullets={[
                    "Bias is a directional FILTER, not an entry trigger.",
                    "Adaptive Buffer (ATR based) defines Long/Short zones.",
                    "Inside Buffer = NEUTRAL (No trend).",
                    "Score reflects distance from Midnight Open.",
                    "Flip Confirmed = 2+ candles closed beyond buffer."
                ]} />
            </div>
        </div>
    );
}
