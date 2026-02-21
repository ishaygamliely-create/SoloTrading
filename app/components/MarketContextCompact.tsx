"use client";

import React, { useState } from "react";
import type { BiasMode, DataStatus } from "@/app/lib/marketContext";
import { getSuggestedDirection } from "@/app/lib/marketContext";
import { Info, X, Activity } from "lucide-react";

type Props = {
    price: number;
    pdh: number;
    pdl: number;
    eq: number;
    dailyRangePercent: number;
    regime: "TRENDING" | "RANGING" | "COMPRESSED" | "UNKNOWN" | string;
    biasMode: BiasMode;
    dataStatus: DataStatus;
    dataAgeLabel?: string;    // e.g. "4m 12s"
    lastBarNyTime?: string;   // e.g. "04:23:37"
};

export default function MarketContextCompact(props: Props) {
    const [showInfo, setShowInfo] = useState(false);

    const direction = getSuggestedDirection({
        price: props.price,
        eq: props.eq,
        biasMode: props.biasMode,
        dataStatus: props.dataStatus,
    });

    const dirStyles =
        direction === "LONG"
            ? { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" }
            : direction === "SHORT"
                ? { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" }
                : { text: "text-zinc-500", bg: "bg-zinc-500/10", border: "border-zinc-500/10" };

    const statusStyles =
        props.dataStatus === "OK"
            ? "text-emerald-400"
            : props.dataStatus === "DELAYED"
                ? "text-amber-400"
                : "text-red-400";

    return (
        <div className="relative group overflow-hidden rounded-xl border border-white/5 bg-zinc-900/40 backdrop-blur-md p-4 transition-all duration-300 hover:border-white/10 shadow-2xl">
            {/* Background HUD decorative lines */}
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/10 to-transparent" />

            {/* Main Header Row */}
            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-3">
                    <div className={`px-2.5 py-1 rounded-md border font-black text-xs tracking-wider transition-all shadow-sm ${dirStyles.bg} ${dirStyles.border} ${dirStyles.text}`}>
                        SUGGESTED: {direction}
                    </div>

                    <div className="flex items-center gap-2 px-2 py-0.5 rounded bg-cyan-500/5 border border-cyan-500/10">
                        <Activity size={10} className="text-cyan-400" />
                        <span className="text-[10px] font-black text-cyan-400/90 uppercase tracking-widest leading-none">
                            {props.regime}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right flex flex-col items-end">
                        <div className={`text-[10px] font-black tracking-tighter flex items-center gap-1.5 ${statusStyles}`}>
                            <div className={`w-1 h-1 rounded-full animate-pulse ${statusStyles.replace('text', 'bg')}`} />
                            {props.dataStatus} {props.dataAgeLabel ? `(${props.dataAgeLabel})` : ""}
                        </div>
                        {props.lastBarNyTime && (
                            <div className="text-[8px] font-mono text-zinc-600 font-bold tracking-tight">
                                LAST: {props.lastBarNyTime} NY
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => setShowInfo(!showInfo)}
                        className="p-1 hover:bg-white/5 rounded text-zinc-600 hover:text-white transition-colors"
                    >
                        <Info size={14} />
                    </button>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="relative z-10 grid grid-cols-4 gap-2 pt-3 border-t border-white/5">
                {[
                    { label: "PDH", val: props.pdh, color: "bg-red-500/40" },
                    { label: "EQ", val: props.eq, color: "bg-blue-500/40" },
                    { label: "PDL", val: props.pdl, color: "bg-emerald-500/40" },
                    { label: "RNG", val: `${Number(props.dailyRangePercent).toFixed(1)}%`, color: "bg-zinc-500/40" }
                ].map((m, i) => (
                    <div key={i} className="flex flex-col">
                        <div className="flex items-center gap-1 mb-0.5">
                            <span className={`w-1 h-1 rounded-full ${m.color}`} />
                            <span className="text-[9px] font-black text-zinc-600 uppercase tracking-tighter">{m.label}</span>
                        </div>
                        <div className="text-[11px] font-mono font-bold text-zinc-300 tracking-tighter leading-none">
                            {typeof m.val === 'number' ? m.val.toFixed(2) : m.val}
                        </div>
                    </div>
                ))}
            </div>

            {/* Hebrew Info Overlay */}
            {showInfo && (
                <div className="absolute inset-0 z-20 bg-zinc-950/95 backdrop-blur-md p-4 flex flex-col animate-in fade-in zoom-in-95 duration-200 text-right" dir="rtl">
                    <div className="flex justify-between items-center mb-3 border-b border-white/10 pb-1">
                        <div className="flex items-center gap-2">
                            <Info size={14} className="text-blue-400" />
                            <span className="font-bold text-white text-[10px] uppercase">הקשר שוק (Market Context)</span>
                        </div>
                        <button
                            onClick={() => setShowInfo(false)}
                            className="p-1 hover:bg-white/10 rounded-full text-zinc-500"
                        >
                            <X size={14} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2">
                        <p className="text-[10px] text-zinc-300 leading-tight">
                            רכיב זה מציג את "התמונה הגדולה". הוא משלב את כיוון המגמה בטווח הקצר עם מבנה השוק היומי.
                        </p>
                        <ul className="space-y-1">
                            <li className="flex items-start gap-1 text-[9px] text-zinc-400">
                                <span className="text-blue-400">•</span>
                                <span><b>EQ</b>: נקודת האיזון - מחיר מעליו נחשב יקר, מתחתיו זול.</span>
                            </li>
                            <li className="flex items-start gap-1 text-[9px] text-zinc-400">
                                <span className="text-emerald-400">•</span>
                                <span><b>SUGGESTED</b>: המלצת כיוון בסיסית לפי מיקום המחיר ביחס ל-EQ.</span>
                            </li>
                        </ul>
                    </div>

                    <button
                        onClick={() => setShowInfo(false)}
                        className="mt-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-[9px] font-bold transition-colors"
                    >
                        הבנתי
                    </button>
                </div>
            )}
        </div>
    );
}
