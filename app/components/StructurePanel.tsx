import React, { useState } from "react";
import { IndicatorSignal } from "../lib/types";
import {
    getConfidenceColorClass,
    getStatusFromScore,
    getStatusBadgeClass,
    type IndicatorStatus,
    getDirectionBadgeClass,
} from "@/app/lib/uiSignalStyles";
import { Network, Info, X, Zap, Activity, TrendingUp, TrendingDown, Layers } from 'lucide-react';

interface StructurePanelProps {
    data: any;
    loading: boolean;
}

export function StructurePanel({ data, loading }: StructurePanelProps) {
    const [showHelp, setShowHelp] = useState(false);

    if (loading) {
        return (
            <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-xl h-[220px]" />
        );
    }

    const structure = data?.analysis?.structure as IndicatorSignal;
    if (!structure || structure.status === "ERROR") return null;

    const score = structure.score ?? 0;
    const direction = (structure.direction ?? "NEUTRAL") as any;

    const debug = (structure.debug || {}) as any;
    const regime = (debug?.regime as string) || "RANGING";
    const strength = debug?.structureStrength as "WEAK" | "MODERATE" | "STRONG" | undefined;
    const adx = debug?.adx as number | undefined;
    const emaSpreadPct = debug?.emaSpreadPct as number | undefined;
    const bias = debug?.bias as "LONG" | "SHORT" | "NEUTRAL" | undefined;
    const playbook = debug?.playbook as string | undefined;
    const breakdown = debug?.breakdown as { trend?: number; ema?: number; bias?: number; volume?: number } | undefined;
    const volumeState = debug?.volumeState as "CONFIRMATION" | "DIVERGENCE" | "NEUTRAL" | undefined;
    const obvSlope = debug?.obvSlope as number | undefined;

    // ===== Global confidence colors + status from score =====
    const scoreStyle = getConfidenceColorClass(score);
    const computedStatus: IndicatorStatus = structure.status === "OFF" ? "OFF" : getStatusFromScore(score);
    const statusBadgeClass = getStatusBadgeClass(computedStatus);

    // Glow Logic
    const glowColor = direction === 'LONG' ? 'bg-emerald-500' : direction === 'SHORT' ? 'bg-red-500' : 'bg-blue-500';

    return (
        <div className={`rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col relative overflow-hidden transition-all duration-500 min-h-[220px]`}>
            {/* Background Glow */}
            <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none opacity-20 ${glowColor}`} />

            {/* Header - VXR HUD Style */}
            <div className="flex items-center justify-between mb-5 relative z-10">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl border flex items-center justify-center transition-colors duration-500 ${direction === 'LONG' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : direction === 'SHORT' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                        <Network size={18} strokeWidth={2.5} />
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] leading-none">STRUCTURE</span>
                            <button
                                onClick={() => setShowHelp(true)}
                                className="text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                                <Info size={10} />
                            </button>
                        </div>
                        <span className="text-[9px] text-zinc-500 font-bold uppercase mt-1">Trend & Momentum Context</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                        <Activity size={10} className="text-blue-500 animate-pulse" />
                        <span className="text-[9px] font-black text-blue-200 uppercase">{regime}</span>
                    </div>
                    <div className={`text-xl font-black tabular-nums tracking-tighter ${scoreStyle.text}`}>
                        {score}%
                    </div>
                </div>
            </div>

            <div className="space-y-4 relative z-10 flex-1">
                {/* Status Row */}
                <div className="flex items-center gap-2">
                    <span className={getDirectionBadgeClass({ direction, score, status: computedStatus }) + " text-[10px] px-2.5 py-0.5"}>
                        {direction}
                    </span>
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border tracking-widest uppercase ${statusBadgeClass}`}>
                        {computedStatus}
                    </span>
                    {strength && (
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded border tracking-widest uppercase ${strength === 'STRONG' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' : 'text-zinc-400 border-white/10'}`}>
                            {strength}
                        </span>
                    )}
                </div>

                {/* Playbook Row */}
                <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                        <Zap size={10} className="text-amber-500" />
                        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">ACTIVE PLAYBOOK</span>
                    </div>
                    <p className="text-[11px] font-bold text-zinc-300 leading-snug">
                        {playbook || "Awaiting structural confirmation..."}
                    </p>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-0.5">ADX Intensity</span>
                        <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-mono font-black ${typeof adx === 'number' && adx > 25 ? "text-amber-400" : "text-zinc-400"}`}>
                                {typeof adx === "number" ? adx.toFixed(1) : "—"}
                            </span>
                            <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-1000 ${typeof adx === 'number' && adx > 25 ? 'bg-amber-500' : 'bg-zinc-600'}`}
                                    style={{ width: `${Math.min(100, (adx || 0) * 2)}%` }}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col text-right items-end">
                        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-0.5">EMA Spread</span>
                        <span className={`text-[10px] font-mono font-black ${typeof emaSpreadPct === 'number' && emaSpreadPct > 0.05 ? "text-zinc-200" : "text-zinc-500"}`}>
                            {typeof emaSpreadPct === "number" ? `${emaSpreadPct.toFixed(3)}%` : "—"}
                        </span>
                    </div>
                </div>

                {/* Breakdown List */}
                {breakdown && (
                    <div className="space-y-1.5 pt-2 border-t border-white/5">
                        <div className="flex justify-between items-center text-[9px] font-bold">
                            <span className="text-zinc-600 uppercase tracking-wider">Trend Component</span>
                            <span className="text-zinc-400 font-mono">+{breakdown.trend || 0}</span>
                        </div>
                        <div className="flex justify-between items-center text-[9px] font-bold">
                            <span className="text-zinc-600 uppercase tracking-wider">EMA Alignment</span>
                            <span className="text-zinc-400 font-mono">+{breakdown.ema || 0}</span>
                        </div>
                        {breakdown.volume !== undefined && (
                            <div className="flex justify-between items-center text-[9px] font-bold">
                                <span className="text-zinc-600 uppercase tracking-wider">Volume Flow</span>
                                <span className={`${breakdown.volume > 0 ? 'text-emerald-400' : 'text-red-400'} font-mono`}>
                                    {breakdown.volume > 0 ? "+" : ""}{breakdown.volume}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Hebrew Help Overlay */}
            {showHelp && (
                <div className="absolute inset-0 z-50 bg-zinc-950/95 backdrop-blur-md p-6 flex flex-col animate-in fade-in duration-200">
                    <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                        <div className="flex items-center gap-2">
                            <Network size={16} className="text-blue-400" />
                            <span className="font-black text-white text-xs uppercase tracking-widest">STRUCTURE GUIDE (מבנה שוק)</span>
                        </div>
                        <button
                            onClick={() => setShowHelp(false)}
                            className="p-1 hover:bg-white/10 rounded-full text-zinc-400 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-4 text-right" dir="rtl">
                        <section>
                            <h4 className="text-white font-bold text-[11px] mb-1">מהו המבנה המוסדי?</h4>
                            <p className="text-[10px] text-zinc-400 leading-relaxed">
                                אינדיקטור המבנה מנתח את ה-"Health" של המגמה הנוכחית על ידי שילוב של עוצמת מחיר (ADX) ופריסת ממוצעים נעים.
                            </p>
                        </section>

                        <div className="space-y-2">
                            <div className="bg-blue-500/10 border border-blue-500/20 p-2 rounded">
                                <span className="text-[10px] font-bold text-blue-400 block mb-0.5">Regime (משטר שוק)</span>
                                <span className="text-[9px] text-zinc-300">TRENDING (מגמתי), TRANSITION (שלב מעבר) או RANGING (דישדוש).</span>
                            </div>
                            <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded">
                                <span className="text-[10px] font-bold text-amber-400 block mb-0.5">ADX Intensity</span>
                                <span className="text-[9px] text-zinc-300">מעל 25 מעיד על עוצמה חזקה. מתחת ל-20 מעיד על עייפות בשוק.</span>
                            </div>
                        </div>

                        <section className="pt-2">
                            <h4 className="text-white font-bold text-[11px] mb-1">Playbook (תסריט פעולה)</h4>
                            <p className="text-[10px] text-zinc-400 leading-relaxed">
                                זהו הניתוח המילולי שממליץ האם השוק בשל לעסקאות המשך, פריצה, או המתנה בסביבת צ'ופי (Choppy).
                            </p>
                        </section>

                        <button
                            onClick={() => setShowHelp(false)}
                            className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-black text-[10px] tracking-widest uppercase transition-colors mt-2"
                        >
                            הבנתי, חזרה לנתונים
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
