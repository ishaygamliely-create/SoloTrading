import React, { useMemo } from 'react';
import { PanelHelp } from './PanelHelp';
import { Zap, Activity, Target, Layers } from 'lucide-react';

interface VxrPanelProps {
    data: any;
    loading: boolean;
}

export function VxrPanel({ data, loading }: VxrPanelProps) {
    if (loading) return <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-xl h-64"></div>;

    const vxr = data?.analysis?.vxr;
    if (!vxr || !vxr.lastProfile) return null;

    const { profiles, lastProfile } = vxr;
    const { hvn, vah, val, buckets } = lastProfile;

    // --- 1. Current Profile Prep ---
    const sortedBuckets = useMemo(() => [...buckets].sort((a, b) => b.price - a.price), [buckets]);
    const hvnIdx = sortedBuckets.findIndex((b: any) => b.price === hvn);
    const displayBuckets = sortedBuckets.slice(Math.max(0, hvnIdx - 8), Math.min(sortedBuckets.length, hvnIdx + 9));
    const maxBarVol = Math.max(...displayBuckets.map((b: any) => b.volume));

    // --- 2. Heatmap Grid Prep (Last 40 bars) ---
    // We need to define a price range that covers most of the recent profiles
    const allPrices = profiles.flatMap((p: any) => p.buckets.map((b: any) => b.price));
    const minP = Math.min(...allPrices);
    const maxP = Math.max(...allPrices);
    const range = maxP - minP;

    // Create logic for rendering a 40x20 grid roughly
    const gridLevels = 15; // Vertical resolution
    const step = range / gridLevels;
    const priceLevels = Array.from({ length: gridLevels }, (_, i) => maxP - (i * step));

    const getHeatColor = (vol: number, maxVol: number) => {
        const ratio = vol / maxVol;
        if (ratio > 0.8) return 'bg-yellow-400';
        if (ratio > 0.5) return 'bg-cyan-400';
        if (ratio > 0.2) return 'bg-blue-500/60';
        if (ratio > 0.05) return 'bg-blue-900/40';
        return 'bg-white/5';
    };

    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col h-full relative overflow-hidden group">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        <Activity size={14} className="text-blue-400" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none">VXR HEATMAP</span>
                        <span className="text-[9px] text-zinc-500 font-bold uppercase mt-0.5">Structural Participation</span>
                    </div>
                </div>
                <div className="flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                    <Zap size={10} className="text-blue-400 animate-pulse" />
                    <span className="text-[9px] font-black text-blue-300">LIVE SCAN</span>
                </div>
            </div>

            <div className="flex gap-4 flex-1 min-h-0 relative z-10">
                {/* A. Heatmap History (Left 2/3) */}
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="text-[8px] font-bold text-zinc-600 uppercase mb-2 flex items-center gap-1">
                        <Layers size={8} /> 40-Bar Time Context
                    </div>
                    <div className="flex-1 flex gap-px bg-white/5 p-1 rounded-lg border border-white/5 overflow-hidden">
                        {profiles.map((p: any, profileIdx: number) => {
                            const pMaxVol = Math.max(...p.buckets.map((b: any) => b.volume), 1);
                            return (
                                <div key={profileIdx} className="flex-1 flex flex-col gap-px h-full">
                                    {priceLevels.map((lvl, lvlIdx) => {
                                        // Find volume in this profile near this level
                                        const bucket = p.buckets.find((b: any) => Math.abs(b.price - lvl) < step / 2);
                                        const vol = bucket ? bucket.volume : 0;
                                        return (
                                            <div
                                                key={lvlIdx}
                                                className={`flex-1 w-full rounded-[1px] transition-colors duration-500 ${getHeatColor(vol, pMaxVol)}`}
                                            />
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* B. Current Profile (Right 1/3) */}
                <div className="w-[120px] flex flex-col">
                    <div className="text-[8px] font-bold text-zinc-600 uppercase mb-2 flex items-center gap-1">
                        <Target size={8} /> Internal Flow
                    </div>
                    <div className="flex-1 bg-black/40 rounded-lg p-2 border border-white/5 flex flex-col gap-0.5">
                        {displayBuckets.map((b: any, i: number) => {
                            const isHvn = Math.abs(b.price - hvn) < 0.01;
                            const isVa = b.price <= vah && b.price >= val;
                            const widthPct = (b.volume / maxBarVol) * 100;

                            return (
                                <div key={i} className="flex items-center gap-1.5 group/line">
                                    <span className={`text-[7px] font-mono w-8 tabular-nums ${isHvn ? 'text-yellow-400 font-bold' : isVa ? 'text-white/60' : 'text-white/20'}`}>
                                        {b.price.toFixed(1)}
                                    </span>
                                    <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden relative">
                                        <div
                                            className={`h-full transition-all duration-700 ease-out rounded-full ${isHvn ? 'bg-yellow-400' : isVa ? 'bg-blue-500/50' : 'bg-blue-900/10'}`}
                                            style={{ width: `${widthPct}%` }}
                                        />
                                        {isHvn && (
                                            <div className="absolute inset-0 bg-yellow-400/30 blur-[1px] animate-pulse" style={{ width: `${widthPct}%` }} />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Bottom Data HUD */}
            <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="bg-white/5 rounded-lg p-2 border border-white/5 flex flex-col">
                    <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">HVN Magnet</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-yellow-400 tracking-tighter">{hvn.toFixed(2)}</span>
                        <span className="text-[8px] text-zinc-600 font-mono">pts</span>
                    </div>
                    <div className="mt-1 h-0.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-400/50 w-full animate-pulse" />
                    </div>
                </div>
                <div className="bg-white/5 rounded-lg p-2 border border-white/5 flex flex-col">
                    <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Participation Zone</span>
                    <div className="flex flex-col">
                        <div className="flex justify-between items-center text-[10px] font-mono font-bold text-zinc-300">
                            <span className="text-zinc-500 text-[8px]">VAH</span>
                            <span>{vah.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-mono font-bold text-zinc-300">
                            <span className="text-zinc-500 text-[8px]">VAL</span>
                            <span>{val.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-1.5 opacity-40">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span className="text-[8px] text-zinc-500 font-mono">1:15 Precision Mapping</span>
                </div>
                <PanelHelp
                    title="Volume X-Ray (VXR)"
                    bullets={[
                        "Heatmap: Visual concentration of M1 volume within M15 bars.",
                        "HVN (Magnet): Institutional High Volume Node. Strong S/R.",
                        "VA: Value Area (70% of distribution). Efficient Zone.",
                        "Heatmap intensity (Yellow) marks where large orders were filled.",
                        "Low intensity (Dark Blue) marks volume voids to be filled fast."
                    ]}
                />
            </div>
        </div>
    );
}
