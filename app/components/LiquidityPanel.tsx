import React from 'react';
import { getLiquiditySignal } from '@/app/lib/liquidityRange';
import { getConfidenceColorClass, getConfidenceLabel, clampPct, getStatusFromScore, getStatusBadgeClass, type IndicatorStatus } from '@/app/lib/uiSignalStyles';
import { PanelHelp } from './PanelHelp';
import { IndicatorSignal } from '../lib/types';

export function LiquidityPanel({ data, loading }: { data: any, loading: boolean }) {
    if (loading) return <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-xl h-24"></div>;

    const liquidity = getLiquiditySignal(data);

    // ✅ CORE PANEL: Only hide if no data
    if (!liquidity || !data) return null;

    // --- Standard Colors ---
    const scoreStyle = getConfidenceColorClass(liquidity.score);

    // Global Status Law: derive from score
    const computedStatus: IndicatorStatus = liquidity.status === "ERROR"
        ? "ERROR"
        : getStatusFromScore(liquidity.score);

    const statusBadgeClass = getStatusBadgeClass(computedStatus);

    // Debug Data
    const { state, adrPercent } = (liquidity.debug || {}) as any;

    // Nearest Zones (re-calculate or pass via debug if simple enough, but panel has richer display)
    // We can fetch raw data for the richer display parts
    const currentPrice = data.price || 0;
    const fvgs = data.analysis?.fvgs || [];
    const pools = data.analysis?.liquidity || [];

    // Sort logic for display
    const fvgsAbove = fvgs.filter((f: any) => f.bottom > currentPrice).sort((a: any, b: any) => a.bottom - b.bottom);
    const fvgsBelow = fvgs.filter((f: any) => f.top < currentPrice).sort((a: any, b: any) => b.top - a.top);
    const poolsAbove = pools.filter((p: any) => p.price > currentPrice).sort((a: any, b: any) => a.price - b.price);
    const poolsBelow = pools.filter((p: any) => p.price < currentPrice).sort((a: any, b: any) => b.price - a.price);

    // Expansion Bar using Score
    const expPct = clampPct(liquidity.score);
    const expLabel = getConfidenceLabel(expPct);

    return (
        <div className={`rounded-xl border border-white/10 bg-white/5 p-4 space-y-3 ${scoreStyle.border}`}>
            {/* 1. Header: TITLE | Direction | Status | Score */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-cyan-400 tracking-wide">LIQUIDITY</span>
                    <div className="h-4 w-px bg-white/10" />
                    <span className="text-xs font-bold uppercase text-zinc-500">
                        NEUTRAL
                    </span>
                    <div className="h-4 w-px bg-white/10" />
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${statusBadgeClass}`}>
                        {computedStatus}
                    </span>
                </div>
                <div className={`text-xl font-bold ${scoreStyle.text}`}>
                    {Math.round(liquidity.score)}%
                </div>
            </div>

            {/* Reliability row */}
            {liquidity.meta && (liquidity.meta.capApplied || liquidity.meta.dataAgeMs > 15 * 60_000) && (
                <div className="text-[9px] text-white/40 text-right font-mono">
                    {liquidity.meta.source}{liquidity.meta.capApplied ? ` · Raw ${liquidity.meta.rawScore}% → ${liquidity.meta.finalScore}%` : ` · Age ${Math.round(liquidity.meta.dataAgeMs / 60000)}m`}
                </div>
            )}

            {/* 2. Hint + State Label */}
            <div className="flex items-center justify-between">
                <div className="text-xs text-white/70 italic truncate pr-2">
                    {liquidity.hint}
                </div>
                <div className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white/10 text-white/80">
                    {state}
                </div>
            </div>

            {/* 3. Expansion Probability Bar */}
            <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-white/60">
                    <span>Expansion Probability</span>
                    <span>{expPct}% ({expLabel})</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                    <div className={`h-full ${scoreStyle.bar}`} style={{ width: `${expPct}%` }} />
                </div>
            </div>

            {/* 4. Nearest Zones (Compact Grid) */}
            <div className="grid grid-cols-2 gap-2 pt-1">
                {/* Above */}
                <div className="bg-white/5 rounded p-2 border border-white/5">
                    <div className="text-[9px] text-zinc-500 uppercase mb-1">Nearest Above</div>
                    <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-red-300">Pool: {poolsAbove[0]?.price?.toFixed(0) ?? '-'}</span>
                        <span className="text-white/60">FVG: {fvgsAbove[0]?.bottom ? fvgsAbove[0].bottom.toFixed(0) : '-'}</span>
                    </div>
                </div>
                {/* Below */}
                <div className="bg-white/5 rounded p-2 border border-white/5">
                    <div className="text-[9px] text-zinc-500 uppercase mb-1">Nearest Below</div>
                    <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-emerald-300">Pool: {poolsBelow[0]?.price?.toFixed(0) ?? '-'}</span>
                        <span className="text-white/60">FVG: {fvgsBelow[0]?.top ? fvgsBelow[0].top.toFixed(0) : '-'}</span>
                    </div>
                </div>
            </div>


            {/* 5. Help Toggle */}
            <div className="pt-2 border-t border-white/5">
                <PanelHelp title="LIQUIDITY" bullets={[
                    "ADR Compression: Low range = High expansion probability.",
                    "Nearest Zones: Targets for liquidity sweeps.",
                    "Score: Probability of imminent expansion.",
                    "Status: COMPRESSED (Setup) vs EXPANDING (Motion) vs EXHAUSTED."
                ]} />
            </div>
        </div>
    );
}
