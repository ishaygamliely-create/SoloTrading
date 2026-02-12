import React from 'react';
import { getConfidenceBorderClass } from '@/app/lib/uiSignalStyles';
import { getLiquidityConfidenceScore } from '@/app/lib/liquidityRange';

type Props = {
    data: any;
    loading: boolean;
};

export function LiquidityPanel({ data, loading }: Props) {
    if (loading) {
        return <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-xl h-full min-h-[160px]"></div>;
    }

    if (!data?.analysis) return null;

    const lr = data.analysis.liquidityRange || {};
    const fvgs = data.analysis.fvgs || [];
    const pools = data.analysis.liquidity || []; // "Active Liquidity"
    const psp = data.analysis.psp || {};

    // Calculate ADR %
    const range = lr.currentRange || 0;
    const avg = lr.avgRange || 1;
    const adrPercent = (range / avg) * 100;

    // Get Confidence Score (Expansion Probability)
    const { confidenceScore, mappingText } = getLiquidityConfidenceScore({
        adrPercent,
        hasMajorSweep: lr.hasMajorSweep,
        pspState: psp.state
    });

    const borderClass = getConfidenceBorderClass(confidenceScore);

    // Playbook Logic
    let playbookText = "Wait for Sweep → Displacement (Compression)";
    if (adrPercent >= 45 && adrPercent <= 80) playbookText = "Momentum Phase – Trade with Structure";
    else if (adrPercent > 90) playbookText = "Exhaustion Risk – Avoid Breakout Entries";

    // Expansion Probability Bar Color
    let expansionColor = "bg-red-500";
    if (confidenceScore >= 60) expansionColor = "bg-yellow-500";
    if (confidenceScore >= 75) expansionColor = "bg-emerald-500";

    // ADR Usage Highlight
    let adrLabel = "LOW";
    let adrColor = "text-emerald-400";
    if (adrPercent >= 40) { adrLabel = "MID"; adrColor = "text-yellow-400"; }
    if (adrPercent >= 75) { adrLabel = "HIGH"; adrColor = "text-red-400"; }

    // Nearest Zones Logic
    // Find nearest FVG above current price (lowest bottom > price)
    // Find nearest FVG below current price (highest top < price)
    const currentPrice = data.price || 0;

    // Sort FVGs by proximity
    const fvgsAbove = fvgs.filter((f: any) => f.bottom > currentPrice).sort((a: any, b: any) => a.bottom - b.bottom);
    const fvgsBelow = fvgs.filter((f: any) => f.top < currentPrice).sort((a: any, b: any) => b.top - a.top);
    const nearestFVGAbove = fvgsAbove.length > 0 ? fvgsAbove[0] : null;
    const nearestFVGBelow = fvgsBelow.length > 0 ? fvgsBelow[0] : null;

    // Sort Pools by proximity
    const poolsAbove = pools.filter((p: any) => p.price > currentPrice).sort((a: any, b: any) => a.price - b.price);
    const poolsBelow = pools.filter((p: any) => p.price < currentPrice).sort((a: any, b: any) => b.price - a.price);
    const nearestPoolAbove = poolsAbove.length > 0 ? poolsAbove[0] : null;
    const nearestPoolBelow = poolsBelow.length > 0 ? poolsBelow[0] : null;

    return (
        <div className={`rounded-xl border border-white/10 bg-white/5 p-4 space-y-4 ${borderClass}`}>

            {/* HEADER */}
            <div className="flex flex-col gap-1">
                <div className="font-bold tracking-widest text-lg bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent uppercase">
                    Liquidity & Range
                </div>
                <div className="text-xs font-bold text-white/90">
                    PLAYBOOK: <span className="text-blue-300">{playbookText}</span>
                </div>
            </div>

            {/* EXPANSION PROBABILITY */}
            <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-white/80">
                    <span>Expansion Probability</span>
                    <span className={confidenceScore >= 75 ? "text-emerald-400" : confidenceScore >= 60 ? "text-yellow-400" : "text-red-400"}>{confidenceScore}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div
                        className={`h-full ${expansionColor} transition-all duration-500`}
                        style={{ width: `${confidenceScore}%` }}
                    />
                </div>
            </div>

            {/* ADR USAGE */}
            <div className="bg-black/20 rounded-lg p-2 flex items-center justify-between">
                <span className="text-xs text-white/60 font-medium">ADR Usage</span>
                <div className="flex items-baseline gap-2">
                    {/* Neutral White for value, Muted color for label */}
                    <span className="text-lg font-bold text-white/90">{adrPercent.toFixed(0)}%</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wide ${adrPercent >= 75 ? "text-blue-300" : "text-white/50"}`}>{adrLabel}</span>
                </div>
            </div>

            {/* SMART ZONES (2x2 Grid) */}
            <div className="grid grid-cols-2 gap-2">
                {/* ABOVE */}
                <div className="space-y-1">
                    <div className="text-[10px] text-zinc-500 uppercase font-bold">Nearest Above</div>
                    {nearestFVGAbove ? (
                        <div className="text-[10px] text-red-300 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded">
                            FVG: {nearestFVGAbove.bottom?.toFixed(0)}-{nearestFVGAbove.top?.toFixed(0)}
                        </div>
                    ) : <div className="text-[10px] text-zinc-600 italic">No FVG</div>}
                    {nearestPoolAbove ? (
                        <div className="text-[10px] text-red-300 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded">
                            Pool: {nearestPoolAbove.price?.toFixed(0)}
                        </div>
                    ) : <div className="text-[10px] text-zinc-600 italic">No Pool</div>}
                </div>

                {/* BELOW */}
                <div className="space-y-1">
                    <div className="text-[10px] text-zinc-500 uppercase font-bold">Nearest Below</div>
                    {nearestFVGBelow ? (
                        <div className="text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded">
                            FVG: {nearestFVGBelow.bottom?.toFixed(0)}-{nearestFVGBelow.top?.toFixed(0)}
                        </div>
                    ) : <div className="text-[10px] text-zinc-600 italic">No FVG</div>}
                    {nearestPoolBelow ? (
                        <div className="text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded">
                            Pool: {nearestPoolBelow.price?.toFixed(0)}
                        </div>
                    ) : <div className="text-[10px] text-zinc-600 italic">No Pool</div>}
                </div>
            </div>

            {/* TRANSPARENCY LINE */}
            <div className="pt-2 border-t border-white/5 text-[9px] text-zinc-600 font-mono text-center">
                Checks: ADR • Sweep • PSP • FVG Proximity • Pools
            </div>

        </div>
    );
}
