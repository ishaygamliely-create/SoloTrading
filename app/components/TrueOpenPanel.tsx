import React, { useState } from "react";
import type { IndicatorSignal } from "@/app/lib/types";
import type { TrueOpenAlignment } from "@/app/lib/trueOpen";
import { getConfidenceColorClass, getStatusFromScore, getStatusBadgeClass } from "@/app/lib/uiSignalStyles";
import { Sun, Info, X, Zap, Activity, TrendingUp, TrendingDown, Calendar, Clock, Layers } from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────

function fmt(n: unknown): string {
    return typeof n === "number" && Number.isFinite(n) ? n.toFixed(1) : "—";
}
function ptsFmt(n: unknown): string {
    if (typeof n !== "number" || !Number.isFinite(n)) return "—";
    return `${n >= 0 ? "+" : ""}${n.toFixed(1)}pts`;
}

function alignmentLabel(alignment?: string): string {
    if (alignment === "ALIGNED_BULL") return "ALIGNED ▲";
    if (alignment === "ALIGNED_BEAR") return "ALIGNED ▼";
    if (alignment === "MIXED") return "MIXED";
    return "NEAR";
}

// ── AnchorCard ───────────────────────────────────────────────────

interface AnchorCardProps {
    label: string;
    openPrice: number | null | undefined;
    currentPrice: number | null | undefined;
    side?: string;
    pts?: number;
    strength?: string;
    unavailableReason?: string | null;
}

function AnchorCard({ label, openPrice, currentPrice, side, pts, strength, unavailableReason }: AnchorCardProps) {
    const isUnavailable = openPrice == null;
    const isAbove = side === "ABOVE";
    const isBelow = side === "BELOW";

    return (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 space-y-3">
            <div className="flex justify-between items-center">
                <span className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.2em]">{label}</span>
                {!isUnavailable && (
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${isAbove ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' : isBelow ? 'text-red-400 border-red-500/20 bg-red-500/5' : 'text-zinc-500 border-white/5'}`}>
                        {side}
                    </span>
                )}
            </div>

            {isUnavailable ? (
                <div className="py-2 text-[10px] text-zinc-600 italic font-medium leading-tight">
                    {unavailableReason || "Market Closed"}
                </div>
            ) : (
                <div className="space-y-2.5">
                    <div className="flex items-end justify-between">
                        <span className="text-sm font-mono font-black text-zinc-100 tabular-nums leading-none">
                            {fmt(openPrice)}
                        </span>
                        <span className={`text-[10px] font-mono font-bold tabular-nums ${isAbove ? 'text-emerald-400' : 'text-red-400'}`}>
                            {ptsFmt(pts)}
                        </span>
                    </div>
                    {strength && (
                        <div className="flex items-center gap-1.5 pt-1.5 border-t border-white/5">
                            <Layers size={8} className="text-zinc-600" />
                            <span className="text-[9px] font-bold text-zinc-500 uppercase">{strength}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Main Panel ───────────────────────────────────────────────────

export function TrueOpenPanel({ data, loading }: { data: any; loading: boolean }) {
    const [showHelp, setShowHelp] = useState(false);

    if (loading) {
        return <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-xl h-[220px]" />;
    }

    const sig = data?.analysis?.trueOpen as IndicatorSignal | undefined;
    if (!sig || sig.status === "OFF") return null;

    const score = sig.score ?? 0;
    const scoreStyle = getConfidenceColorClass(score);
    const computedStatus = getStatusFromScore(score);
    const statusBadgeClass = getStatusBadgeClass(computedStatus);

    const dbg: any = sig.debug ?? {};
    const alignment = dbg.alignment as TrueOpenAlignment | undefined;

    return (
        <div className={`rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col relative overflow-hidden transition-all duration-500 min-h-[220px] group`}>
            {/* Background Glow - Matches VXR Style with enhanced volume */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity duration-1000" />

            {/* Header - VXR HUD Style */}
            <div className="flex items-center justify-between mb-5 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400 flex items-center justify-center transition-colors group-hover:bg-amber-500/20">
                        <Sun size={18} strokeWidth={2.5} />
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black text-amber-300 uppercase tracking-[0.2em] leading-none">TRUE OPEN</span>
                            <button
                                onClick={() => setShowHelp(true)}
                                className="text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                                <Info size={10} />
                            </button>
                        </div>
                        <span className="text-[9px] text-zinc-500 font-bold uppercase mt-1">Institutional Macro Scan</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                        <Activity size={10} className="text-amber-500 animate-pulse" />
                        <span className="text-[9px] font-black text-amber-200 uppercase">MACRO SCAN</span>
                    </div>
                    <div className={`text-sm font-black tabular-nums tracking-tighter ${scoreStyle.text}`}>
                        {score}% <span className="text-[8px] opacity-40 font-normal">CLARITY</span>
                    </div>
                </div>
            </div>

            <div className="space-y-4 relative z-10 flex-1">
                {/* Status Row */}
                <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded border text-[10px] font-black uppercase tracking-widest ${alignment === 'ALIGNED_BULL' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : alignment === 'ALIGNED_BEAR' ? 'bg-red-500/10 text-red-300 border-red-500/20' : 'bg-white/5 text-zinc-400 border-white/10'}`}>
                        {alignmentLabel(alignment)}
                    </span>
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border tracking-widest uppercase ${statusBadgeClass}`}>
                        {computedStatus}
                    </span>
                </div>

                {/* Macro Context Section */}
                {dbg.macroContext && (
                    <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3 border-l-2 border-l-amber-500/40">
                        <div className="flex items-center gap-2 mb-1.5">
                            <Zap size={10} className="text-amber-500" />
                            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">MACRO NARRATIVE</span>
                        </div>
                        <p className="text-[11px] font-bold text-zinc-300 leading-snug">
                            {dbg.macroContext}
                        </p>
                    </div>
                )}

                {/* Anchor Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <AnchorCard
                        label="Day Open"
                        openPrice={dbg.dayOpenPrice}
                        currentPrice={dbg.currentPrice}
                        side={dbg.day?.side}
                        pts={dbg.day?.pts}
                        strength={dbg.day?.strength}
                    />
                    <AnchorCard
                        label="Week Open"
                        openPrice={dbg.weekOpenPrice}
                        currentPrice={dbg.currentPrice}
                        side={dbg.week?.side}
                        pts={dbg.week?.pts}
                        strength={dbg.week?.strength}
                        unavailableReason={dbg.weekOpenReason}
                    />
                </div>
            </div>

            {/* Hebrew Help Overlay */}
            {showHelp && (
                <div className="absolute inset-0 z-50 bg-zinc-950/95 backdrop-blur-md p-6 flex flex-col animate-in fade-in duration-200">
                    <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                        <div className="flex items-center gap-2">
                            <Sun size={16} className="text-amber-400" />
                            <span className="font-black text-white text-xs uppercase tracking-widest">TRUE OPEN GUIDE (פתיחת אמת)</span>
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
                            <h4 className="text-white font-bold text-[11px] mb-1">מהו מדד ה-Clarity?</h4>
                            <p className="text-[10px] text-zinc-400 leading-relaxed">
                                ציון הבהירות מודד עד כמה המחיר "התרחק" מנקודת הפתיחה המוסדית. ככל שהמרחק גדול יותר, כך הבהירות של המגמה בטווח המאקרו גבוהה יותר.
                            </p>
                        </section>

                        <div className="space-y-2">
                            <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded">
                                <span className="text-[10px] font-bold text-amber-400 block mb-0.5">Aligned (תיאום מאקרו)</span>
                                <span className="text-[9px] text-zinc-300">הצטברות של "יום" ו-"שבוע" באותו צד של הפתיחה מעיד על כוח מוסדי מתואם.</span>
                            </div>
                            <div className="bg-white/5 border border-white/10 p-2 rounded">
                                <span className="text-[10px] font-bold text-zinc-400 block mb-0.5">Anchors (מחיר פתיחה)</span>
                                <span className="text-[9px] text-zinc-300">אלו הרמות שמהן "התחיל" הניתוח המוסדי. הן משמשות כרמות קריטיות להמשכיות או היפוך.</span>
                            </div>
                        </div>

                        <section className="pt-2">
                            <h4 className="text-white font-bold text-[11px] mb-1">טיפ למסחר</h4>
                            <p className="text-[10px] text-zinc-400 leading-relaxed">
                                אל תשתמש בפאנל זה כטריגר לכניסה. הוא נועד לספק את "הסיפור הגדול" (Market Narrative) שיעזור לך לסנן עסקאות נגד המגמה.
                            </p>
                        </section>

                        <button
                            onClick={() => setShowHelp(false)}
                            className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded font-black text-[10px] tracking-widest uppercase transition-colors mt-2"
                        >
                            הבנתי, חזרה לנתונים
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
