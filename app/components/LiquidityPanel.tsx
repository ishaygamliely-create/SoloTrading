import React from 'react';
import { getConfidenceBorderClass, getConfidenceStyles } from '@/app/lib/uiSignalStyles';
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
    const pools = data.analysis.liquidity || [];
    const psp = data.analysis.psp || {};

    // 1. Calculate Core Metrics
    const currentRange = lr.currentRange || 0;
    const adr = lr.avgRange || 1;
    const adrPct = adr > 0 ? Math.round((currentRange / adr) * 100) : 0;
    const sweepDetected = lr.hasMajorSweep;
    const pspState = psp.state || 'NONE';

    // 2. Calculate Expansion Probability (Confidence Score)
    const { confidenceScore: expansionProbability } = getLiquidityConfidenceScore({
        adrPercent: adrPct,
        hasMajorSweep: sweepDetected,
        pspState: pspState
    });

    // 3. Nearest Zones Logic
    const currentPrice = data.price || 0;

    // Sort and find nearest
    const fvgsAbove = fvgs.filter((f: any) => f.bottom > currentPrice).sort((a: any, b: any) => a.bottom - b.bottom);
    const fvgsBelow = fvgs.filter((f: any) => f.top < currentPrice).sort((a: any, b: any) => b.top - a.top);

    const poolsAbove = pools.filter((p: any) => p.price > currentPrice).sort((a: any, b: any) => a.price - b.price);
    const poolsBelow = pools.filter((p: any) => p.price < currentPrice).sort((a: any, b: any) => b.price - a.price);

    const nearestAbove = {
        fvg: fvgsAbove.length > 0 ? `${fvgsAbove[0].bottom.toFixed(0)}-${fvgsAbove[0].top.toFixed(0)}` : undefined,
        pool: poolsAbove.length > 0 ? poolsAbove[0].price.toFixed(0) : undefined
    };

    const nearestBelow = {
        fvg: fvgsBelow.length > 0 ? `${fvgsBelow[0].bottom.toFixed(0)}-${fvgsBelow[0].top.toFixed(0)}` : undefined,
        pool: poolsBelow.length > 0 ? poolsBelow[0].price.toFixed(0) : undefined
    };

    // --- UI LOGIC (User's Code) ---

    // Use getConfidenceStyles to get the full object { text, border, bg }
    const adrConfidence = getConfidenceStyles(adrPct);
    const expansionConfidence = getConfidenceStyles(expansionProbability);

    const adrLabel =
        adrPct < 60 ? "LOW" : adrPct < 75 ? "MID" : "HIGH";

    const playbook =
        adrPct < 50
            ? "Wait for Sweep → Displacement (Compression)"
            : adrPct < 80
                ? "Momentum Building – Watch Structure"
                : "Expansion Active – Trade Continuation";

    return (
        <div
            className={`rounded-xl border border-white/10 bg-white/5 p-5 space-y-4 ${expansionConfidence.border}`}
        >
            {/* HEADER */}
            <div className="flex items-center justify-between">
                <div className="text-lg font-bold tracking-wide text-cyan-400">
                    LIQUIDITY & RANGE
                </div>

                <div className={`text-sm font-semibold ${adrConfidence.text}`}>
                    {adrPct < 60
                        ? "COMPRESSED"
                        : adrPct < 75
                            ? "BUILDING"
                            : "EXPANDING"}
                </div>
            </div>

            {/* PLAYBOOK */}
            <div className="text-sm text-white/80">
                <span className="font-semibold text-white">PLAYBOOK:</span>{" "}
                {playbook}
            </div>

            {/* EXPANSION PROBABILITY */}
            <div className="space-y-1">
                <div className="flex justify-between text-sm text-white/70">
                    <span>Expansion Probability</span>
                    <span className={`font-bold ${expansionConfidence.text}`}>
                        {expansionProbability}%
                    </span>
                </div>

                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-300 ${expansionProbability >= 75
                            ? "bg-emerald-500"
                            : expansionProbability >= 60
                                ? "bg-yellow-400"
                                : "bg-red-500"
                            }`}
                        style={{ width: `${expansionProbability}%` }}
                    />
                </div>
            </div>

            {/* ADR USAGE */}
            <div className="bg-black/40 rounded-lg p-4 flex items-center justify-between">
                <div className="text-sm text-white/60">ADR Usage</div>

                <div className="flex items-center gap-2">
                    <div className={`text-2xl font-extrabold ${adrConfidence.text}`}>
                        {adrPct}%
                    </div>

                    <div className={`text-xs font-semibold ${adrConfidence.text}`}>
                        {adrLabel}
                    </div>
                </div>
            </div>

            {/* ZONES */}
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <div className="text-white/50 text-xs mb-1">NEAREST ABOVE</div>

                    {nearestAbove?.fvg && (
                        <div className="bg-red-500/10 border border-red-500/40 text-red-300 rounded-md px-2 py-1 mb-1">
                            FVG: {nearestAbove.fvg}
                        </div>
                    )}

                    {nearestAbove?.pool && (
                        <div className="bg-red-500/10 border border-red-500/40 text-red-300 rounded-md px-2 py-1">
                            Pool: {nearestAbove.pool}
                        </div>
                    )}

                    {!nearestAbove?.fvg && !nearestAbove?.pool && <div className="text-zinc-600 italic text-xs">Clear</div>}
                </div>

                <div>
                    <div className="text-white/50 text-xs mb-1">NEAREST BELOW</div>

                    {nearestBelow?.fvg && (
                        <div className="bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 rounded-md px-2 py-1 mb-1">
                            FVG: {nearestBelow.fvg}
                        </div>
                    )}

                    {nearestBelow?.pool && (
                        <div className="bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 rounded-md px-2 py-1">
                            Pool: {nearestBelow.pool}
                        </div>
                    )}

                    {!nearestBelow?.fvg && !nearestBelow?.pool && <div className="text-zinc-600 italic text-xs">Clear</div>}
                </div>
            </div>

            {/* CHECKS */}
            <div className="text-xs text-white/40 pt-2 border-t border-white/10">
                Checks: ADR • Sweep ({sweepDetected ? "YES" : "NO"}) • PSP ({pspState})
            </div>
        </div>
    );
}
