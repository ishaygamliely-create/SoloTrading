import React, { useMemo } from 'react';
import { PanelHelp } from './PanelHelp';
import { Zap, Activity, Target, Layers } from 'lucide-react';

interface VxrPanelProps {
    data: any;
    loading: boolean;
}

export function VxrPanel({ data, loading }: VxrPanelProps) {
    if (loading) return <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-xl h-[300px]"></div>;

    const vxr = data?.analysis?.vxr;
    if (!vxr || !vxr.lastProfile) return null;

    const { profiles, lastProfile } = vxr;
    const { hvn, vah, val, buckets } = lastProfile;

    // --- 1. Current Profile Prep ---
    const sortedBuckets = useMemo(() => [...buckets].sort((a, b) => b.price - a.price), [buckets]);
    const hvnIdx = sortedBuckets.findIndex((b: any) => b.price === hvn);
    // Limit display to 12 buckets to prevent vertical overflow/overlap
    const displayBuckets = sortedBuckets.slice(Math.max(0, hvnIdx - 5), Math.min(sortedBuckets.length, hvnIdx + 6));
    const maxBarVol = Math.max(...displayBuckets.map((b: any) => b.volume), 1);

    // --- 2. Heatmap Grid Prep (Last 40 bars) ---
    const allPrices = profiles.flatMap((p: any) => p.buckets.map((b: any) => b.price));
    const minP = Math.min(...allPrices);
    const maxP = Math.max(...allPrices);
    const range = Math.max(0.1, maxP - minP);

    const gridLevels = 15;
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
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col h-full relative overflow-hidden group min-h-[340px]">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        <Activity size={14} className="text-blue-400" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none">VOLUME X-RAY (VXR)</span>
                        <span className="text-[9px] text-zinc-500 font-bold uppercase mt-0.5">Institutional Activity & Structure</span>
                    </div>
                </div>
                <div className="flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                    <Zap size={10} className="text-blue-400 animate-pulse" />
                    <span className="text-[9px] font-black text-blue-300 uppercase">LIVE SCAN</span>
                </div>
            </div>

            <div className="flex gap-4 mb-4 relative z-10 h-32">
                {/* A. Heatmap History (Left 60%) */}
                <div className="flex-[1.5] flex flex-col min-w-0 h-full">
                    <div className="text-[8px] font-bold text-zinc-600 uppercase mb-2 flex items-center gap-1">
                        <Layers size={8} /> HISTORICAL CONTEXT (40 BARS)
                    </div>
                    <div className="flex-1 flex gap-px bg-black/20 p-1 rounded border border-white/5 overflow-hidden h-full">
                        {profiles.map((p: any, profileIdx: number) => {
                            const pMaxVol = Math.max(...p.buckets.map((b: any) => b.volume), 1);
                            return (
                                <div key={profileIdx} className="flex-1 flex flex-col gap-px h-full">
                                    {priceLevels.map((lvl, lvlIdx) => {
                                        const bucket = p.buckets.find((b: any) => Math.abs(b.price - lvl) < step / 2);
                                        const vol = bucket ? bucket.volume : 0;
                                        return (
                                            <div
                                                key={lvlIdx}
                                                className={`flex-1 w-full rounded-[0.5px] transition-colors duration-500 ${getHeatColor(vol, pMaxVol)}`}
                                            />
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* B. Current Profile (Right 40%) */}
                <div className="flex-1 flex flex-col h-full min-w-0">
                    <div className="text-[8px] font-bold text-zinc-600 uppercase mb-2 flex items-center gap-1">
                        <Target size={8} /> INTERNAL FLOW
                    </div>
                    <div className="flex-1 bg-black/40 rounded p-1.5 border border-white/5 flex flex-col gap-0.5 overflow-hidden h-full">
                        {displayBuckets.map((b: any, i: number) => {
                            const isHvn = Math.abs(b.price - hvn) < 0.01;
                            const isVa = b.price <= vah && b.price >= val;
                            const widthPct = (b.volume / maxBarVol) * 100;

                            return (
                                <div key={i} className="flex items-center gap-1 group/line">
                                    <span className={`text-[7px] font-mono w-7 tabular-nums ${isHvn ? 'text-yellow-400 font-bold' : isVa ? 'text-white/60' : 'text-white/20'}`}>
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
            <div className="grid grid-cols-2 gap-2 relative z-10">
                <div className="bg-white/5 rounded p-2 border border-white/5 flex flex-col justify-center">
                    <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">MAGNET (HVN)</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-yellow-400 tracking-tighter leading-none">{hvn.toFixed(2)}</span>
                        <span className="text-[8px] text-zinc-600 font-mono">pts</span>
                    </div>
                    <div className="mt-1 h-0.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-400/50 w-full animate-pulse" />
                    </div>
                </div>
                <div className="bg-white/5 rounded p-2 border border-white/5 flex flex-col justify-center">
                    <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">VALUE AREA</span>
                    <div className="flex flex-col gap-0.5">
                        <div className="flex justify-between items-center text-[10px] font-mono font-bold text-zinc-300">
                            <span className="text-zinc-500 text-[8px] leading-none">VAH</span>
                            <span className="leading-none">{vah.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-mono font-bold text-zinc-300">
                            <span className="text-zinc-500 text-[8px] leading-none">VAL</span>
                            <span className="leading-none">{val.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-auto pt-4 border-t border-white/5 flex flex-col items-center gap-3 relative z-10">
                <PanelHelp
                    title="Volume X-Ray (VXR)"
                    bullets={[
                        "הקווים הצהובים (HVN): אלו 'מגנטים' של כסף גדול. המחיר נוטה להימשך אליהם או להיבלם בהם.",
                        "צבעים בוהקים: המקומות שבהם נעשה הכי הרבה ווליום. אלו אזורי שיווי משקל מוסדי.",
                        "חורים שחורים (Voids): אזורים עם מעט פעילות. אם המחיר נכנס לשם, הוא 'ייטוס' מהר לקצה השני.",
                        "אזור הערך (VA): האזור המרכזי שבו קרה 70% מהמסחר. כל עוד אנחנו שם, השוק מאוזן.",
                        "האסטרטגיה: חפש פריצה מתוך האזור המרכזי לעבר 'מגנט' צהוב רחוק - זו העסקה עם הסבירות הכי גבוהה.",
                    ]}
                />
                <div className="flex items-center gap-1.5 opacity-30">
                    <div className="w-1 h-1 rounded-full bg-blue-500" />
                    <span className="text-[7px] text-zinc-500 font-mono uppercase tracking-tighter">1:15 Precision Structural Mapping</span>
                </div>
            </div>
        </div>
    );
}
