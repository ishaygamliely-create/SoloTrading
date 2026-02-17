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
    // 1. Score Text + Ring -> Global Confidence Law
    const scoreStyle = getConfidenceColorClass(score);

    // 2. Direction Badge -> Directional Colors (Green/Red/Gray)
    let dirBadgeClass = "text-zinc-500 bg-zinc-500/10";
    if (direction === "LONG") dirBadgeClass = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (direction === "SHORT") dirBadgeClass = "text-red-400 bg-red-500/10 border-red-500/20";

    // 3. Status Color
    const statusColor = status === 'OK' ? 'text-emerald-400' : status === 'WARN' ? 'text-yellow-400' : 'text-zinc-500';

    // --- Rule Line ---
    let ruleText = "Wait for break beyond buffer";
    if (direction === "LONG") ruleText = `Prefer LONGs above ${(midnightOpen + buffer).toFixed(2)}`;
    if (direction === "SHORT") ruleText = `Prefer SHORTs below ${(midnightOpen - buffer).toFixed(2)}`;

    // --- Price Position Label ---
    let priceLabel = "Inside";
    let priceLabelColor = "text-zinc-400";
    if (price > midnightOpen + buffer) { priceLabel = "Above"; priceLabelColor = "text-emerald-400"; }
    if (price < midnightOpen - buffer) { priceLabel = "Below"; priceLabelColor = "text-red-400"; }

    return (
        <div className={`rounded-xl border bg-white/5 p-3 space-y-2 h-full flex flex-col justify-center ${scoreStyle.border}`}>

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

            {/* 2. Rule Line */}
            <div className="text-xs font-medium text-white/90 text-center bg-white/5 py-1 rounded border border-white/5">
                {ruleText}
            </div>

            {/* 3. Status Warning (if WARN) */}
            {status === 'WARN' && (
                <div className="text-[9px] text-yellow-500/80 text-center italic">
                    WARN: Off-hours / Low Reliability
                </div>
            )}

            {/* 4. Mini Table (Compact) */}
            <div className="grid grid-cols-3 gap-1 text-[10px] border-t border-white/10 pt-2 mt-1">
                {/* Upper Buffer */}
                <div className="flex flex-col items-center">
                    <span className="text-zinc-500 uppercase text-[9px]">Upper</span>
                    <span className="font-mono text-zinc-300">{(midnightOpen + buffer).toFixed(2)}</span>
                </div>
                {/* Midnight */}
                <div className="flex flex-col items-center border-l border-r border-white/5">
                    <span className="text-zinc-500 uppercase text-[9px]">Midnight</span>
                    <span className="font-mono text-blue-300">{midnightOpen?.toFixed(2)}</span>
                </div>
                {/* Lower Buffer */}
                <div className="flex flex-col items-center">
                    <span className="text-zinc-500 uppercase text-[9px]">Lower</span>
                    <span className="font-mono text-zinc-300">{(midnightOpen - buffer).toFixed(2)}</span>
                </div>
            </div>

            {/* 5. Current Price Status */}
            <div className="flex justify-between items-center text-[10px] bg-black/20 p-1 rounded px-2">
                <span className="text-zinc-500">Current Price</span>
                <div className="flex items-center gap-2">
                    <span className="font-mono text-white">{price.toFixed(2)}</span>
                    <span className={`font-bold ${priceLabelColor}`}>({priceLabel})</span>
                </div>
            </div>

            {/* 6. Help Toggle */}
            <div className="pt-1">
                <PanelHelp title="What BIAS checks" bullets={[
                    "Anchor: Uses NY Midnight Open as the daily reference price.",
                    "Zones (using Buffer):",
                    "• Above (Midnight + Buffer) = LONG bias (prefer long setups).",
                    "• Below (Midnight − Buffer) = SHORT bias (prefer short setups).",
                    "• Inside the Buffer = NEUTRAL zone (avoid forcing trades).",
                    "How to use:",
                    "• If Bias = LONG, filter out most SHORT ideas unless you have very strong confluence.",
                    "• If Bias = SHORT, filter out most LONG ideas unless you have very strong confluence.",
                    "Score color = strength (0–59 red, 60–74 yellow, 75–100 green). NOT direction.",
                    "Direction badge (LONG/SHORT) = preferred direction."
                ]}>
                    <div className="text-[10px] text-zinc-500 mt-1 pt-1 border-t border-zinc-800">
                        Midnight: {midnightOpen?.toFixed(2)} | Upper: {(midnightOpen + buffer).toFixed(2)} | Lower: {(midnightOpen - buffer).toFixed(2)}
                    </div>
                </PanelHelp>
            </div>
        </div>
    );
}
