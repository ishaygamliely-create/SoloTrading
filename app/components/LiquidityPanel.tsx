import React from 'react';
import { PanelProps } from './DashboardPanels';
import { getLiquiditySignal } from '@/app/lib/liquidityRange';
import { getConfidenceColorClass, getStatusFromScore, getStatusBadgeClass, type IndicatorStatus } from '@/app/lib/uiSignalStyles';
import { PanelHelp } from './PanelHelp';
import { Droplets, ArrowUp, ArrowDown, Target, Waves, Gauge } from 'lucide-react';

export function LiquidityPanel({ data, loading }: PanelProps) {
    if (loading) return <div className="animate-pulse bg-zinc-900/50 border border-white/5 rounded-xl h-[160px]"></div>;

    const liquidity = getLiquiditySignal(data);
    if (!liquidity || !data) return null;

    // --- Standard Colors ---
    const scoreStyle = getConfidenceColorClass(liquidity.score);

    // Status
    const computedStatus: IndicatorStatus = liquidity.status === "ERROR"
        ? "ERROR"
        : getStatusFromScore(liquidity.score);

    const statusBadgeClass = getStatusBadgeClass(computedStatus);

    // Debug Data extraction
    const { state, adrPercent, sweep, psp } = (liquidity.debug || {}) as any;
    // "Fuel" High if ADR is Low
    const adrVal = adrPercent ? parseFloat(adrPercent) : 100;
    const fuelLevel = Math.max(0, Math.min(100, 100 - adrVal));
    const fuelColor = fuelLevel > 70 ? 'bg-emerald-500' : fuelLevel > 40 ? 'bg-amber-500' : 'bg-red-500';

    // Targets Data
    const currentPrice = data.price || 0;
    const fvgs = data.analysis?.fvgs || [];
    const pools = data.analysis?.liquidity || [];

    // Filter & Sort
    const fvgsAbove = fvgs.filter((f: any) => f.bottom > currentPrice).sort((a: any, b: any) => a.bottom - b.bottom).slice(0, 1);
    const fvgsBelow = fvgs.filter((f: any) => f.top < currentPrice).sort((a: any, b: any) => b.top - a.top).slice(0, 1);
    const poolsAbove = pools.filter((p: any) => p.price > currentPrice).sort((a: any, b: any) => a.price - b.price).slice(0, 1);
    const poolsBelow = pools.filter((p: any) => p.price < currentPrice).sort((a: any, b: any) => b.price - a.price).slice(0, 1);

    // HVN from VXR
    const vxrHvn = data.analysis?.vxr?.lastProfile?.hvn;

    return (
        <div className={`rounded-xl border border-white/10 bg-white/5 p-4 relative overflow-hidden flex flex-col h-full ${scoreStyle.border}`}>
            {/* Background Gradient for "Liquid" feel */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            {/* 1. Header */}
            <div className="flex items-center justify-between mb-3 relative z-10">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                        <Droplets size={14} className="text-cyan-400" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest leading-none">Liquidity</span>
                        <span className="text-[9px] text-zinc-500 font-mono">Fuel & Targets</span>
                    </div>
                </div>

                <div className="flex flex-col items-end">
                    <span className={`text-xl font-black ${scoreStyle.text} leading-none`}>
                        {Math.round(liquidity.score)}%
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase mt-0.5 ${statusBadgeClass}`}>
                        {computedStatus}
                    </span>
                </div>
            </div>

            {/* 2. Fuel / Compression Gauge */}
            <div className="mb-4 relative z-10">
                <div className="flex justify-between items-end mb-1">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase flex items-center gap-1.5">
                        <Gauge size={10} /> Compression (Fuel)
                    </span>
                    <span className="text-[10px] font-mono text-zinc-300">
                        {adrVal.toFixed(0)}% ADR
                    </span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden flex">
                    {/* Inverted: Low ADR = High Fuel */}
                    <div className={`h-full transition-all duration-500 ${fuelColor}`} style={{ width: `${fuelLevel}%` }} />
                </div>
                <div className="flex justify-between mt-1">
                    <span className="text-[8px] text-zinc-600">Expanded</span>
                    <span className="text-[8px] text-zinc-600">Compressed</span>
                </div>
            </div>

            {/* 3. Targets Heatmap (Grid) */}
            <div className="grid grid-cols-2 gap-2 mb-2 relative z-10">
                {/* UP targets (Resistance/Liq) */}
                <div className="bg-red-950/10 border border-red-500/10 rounded-lg p-2">
                    <div className="flex items-center gap-1.5 mb-2 text-red-500/70">
                        <ArrowUp size={10} />
                        <span className="text-[9px] font-black uppercase">Upside Liska</span>
                    </div>

                    {poolsAbove.length > 0 ? (
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[9px] text-zinc-500">Pool</span>
                            <span className="text-[10px] font-mono font-bold text-red-300">{poolsAbove[0].price.toFixed(2)}</span>
                        </div>
                    ) : <div className="text-[9px] text-zinc-600 italic">No close pools</div>}

                    {fvgsAbove.length > 0 ? (
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[9px] text-zinc-500">FVG</span>
                            <span className="text-[10px] font-mono font-bold text-red-400/80">{fvgsAbove[0].bottom.toFixed(2)}</span>
                        </div>
                    ) : null}

                    {vxrHvn && vxrHvn > currentPrice ? (
                        <div className="flex justify-between items-center border-t border-white/5 pt-1 mt-1">
                            <span className="text-[9px] text-zinc-500">HVN</span>
                            <span className="text-[10px] font-mono font-bold text-yellow-400/80">{vxrHvn.toFixed(2)}</span>
                        </div>
                    ) : null}
                </div>

                {/* DOWN targets (Support/Liq) */}
                <div className="bg-emerald-950/10 border border-emerald-500/10 rounded-lg p-2">
                    <div className="flex items-center gap-1.5 mb-2 text-emerald-500/70">
                        <ArrowDown size={10} />
                        <span className="text-[9px] font-black uppercase">Downside Liska</span>
                    </div>

                    {poolsBelow.length > 0 ? (
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[9px] text-zinc-500">Pool</span>
                            <span className="text-[10px] font-mono font-bold text-emerald-300">{poolsBelow[0].price.toFixed(2)}</span>
                        </div>
                    ) : <div className="text-[9px] text-zinc-600 italic">No close pools</div>}

                    {fvgsBelow.length > 0 ? (
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[9px] text-zinc-500">FVG</span>
                            <span className="text-[10px] font-mono font-bold text-emerald-400/80">{fvgsBelow[0].top.toFixed(2)}</span>
                        </div>
                    ) : null}

                    {vxrHvn && vxrHvn < currentPrice ? (
                        <div className="flex justify-between items-center border-t border-white/5 pt-1 mt-1">
                            <span className="text-[9px] text-zinc-500">HVN</span>
                            <span className="text-[10px] font-mono font-bold text-yellow-500/80">{vxrHvn.toFixed(2)}</span>
                        </div>
                    ) : null}
                </div>
            </div>

            {/* 4. Actionable Status Line */}
            <div className="mt-auto pt-2 border-t border-white/5 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2">
                    {sweep && (
                        <span className="flex items-center gap-1 text-[9px] font-bold text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20">
                            <Waves size={8} /> SWEEP DETECTED
                        </span>
                    )}
                    {psp === 'CONFIRMED' && (
                        <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            <Target size={8} /> PSP ACTIVE
                        </span>
                    )}
                </div>
                <PanelHelp title="LIQUIDITY" bullets={[
                    "Fuel (ADR): Low ADR = High Potential Energy (Expansion likely).",
                    "Liska: Targets for liquidity sweeps or reversals.",
                    "Status: COMPRESSED -> EXPANDING -> EXHAUSTED sequence."
                ]} />
            </div>
        </div>
    );
}
