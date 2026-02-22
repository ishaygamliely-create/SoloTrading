import React, { useState } from 'react';
import { IndicatorSignal } from '../lib/types';
import { getConfidenceColorClass, getStatusFromScore, getStatusBadgeClass, type IndicatorStatus } from '@/app/lib/uiSignalStyles';
import { Activity, Zap, TrendingUp, X, Info, Gauge, Layers } from 'lucide-react';

type Props = {
    data: any;
    loading: boolean;
};

export function SMTPanel({ data, loading }: Props) {
    const [showHelp, setShowHelp] = useState(false);

    if (loading) return <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-xl h-24"></div>;

    const smt = data?.analysis?.smt as IndicatorSignal;
    if (!smt || smt.status === 'OFF') return null;

    // --- Standard Colors ---
    const scoreStyle = getConfidenceColorClass(smt.score);
    const directionClass = smt.direction === 'LONG'
        ? "text-emerald-400"
        : smt.direction === 'SHORT'
            ? "text-red-400"
            : "text-zinc-500";

    // Global Status Law: derive from score
    const computedStatus: IndicatorStatus = smt.status === "ERROR"
        ? "ERROR"
        : getStatusFromScore(smt.score);

    const statusBadgeClass = getStatusBadgeClass(computedStatus);

    // Debug Data
    const { isStrong, gate, factors } = (smt.debug || {}) as any;

    return (
        <div className={`rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col relative overflow-hidden transition-all duration-500 min-h-[160px] group`}>
            {/* Background Glow - Matches VXR Style with enhanced volume */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity duration-1000" />

            {/* Header - VXR HUD Style */}
            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-400 flex items-center justify-center transition-colors group-hover:bg-fuchsia-500/20">
                        <Layers size={18} strokeWidth={2.5} />
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black text-fuchsia-400 uppercase tracking-[0.2em] leading-none">SMT DIVERGENCE</span>
                            <button
                                onClick={() => setShowHelp(true)}
                                className="text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                                <Info size={10} />
                            </button>
                        </div>
                        <span className="text-[9px] text-zinc-500 font-bold uppercase mt-1">Intermarket Correlation</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                        <Activity size={10} className="text-fuchsia-500 animate-pulse" />
                        <span className="text-[9px] font-black text-fuchsia-200 uppercase">MATRIX</span>
                    </div>
                    <div className={`text-xl font-black tabular-nums tracking-tighter ${scoreStyle.text}`}>
                        {Math.round(smt.score)}%
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="space-y-3 relative z-10 flex-1">
                {/* Status Row */}
                <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-widest ${directionClass} border-current/10 bg-current/5`}>
                        {smt.direction}
                    </span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border tracking-widest uppercase ${statusBadgeClass}`}>
                        {computedStatus}
                    </span>
                </div>

                {/* Hint / Factor */}
                <div className="bg-white/[0.03] border border-white/5 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                        <Gauge size={10} className="text-zinc-500" />
                        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Signal Context</span>
                    </div>
                    <p className="text-[11px] font-bold text-zinc-300 italic leading-snug">
                        {factors && factors.length > 0 ? factors[0] : smt.hint}
                    </p>
                </div>

                {/* Strong / Gate UI */}
                {isStrong && (
                    <div className="bg-fuchsia-500/5 border border-fuchsia-500/20 rounded-lg p-2.5 space-y-2 animate-in slide-in-from-right-2 duration-500">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Zap size={10} className="text-fuchsia-400" />
                                <span className="text-[9px] font-black text-fuchsia-400 uppercase tracking-wider">STRONG EVENT DETECTED</span>
                            </div>
                            {gate?.isActive && (
                                <span className="text-xs font-mono font-black text-fuchsia-200">
                                    TTL: {gate.remainingMin}m
                                </span>
                            )}
                        </div>
                        {gate?.isActive && (
                            <div className="bg-red-500/10 border border-red-500/20 px-2 py-1 rounded text-[9px] text-red-400 font-black uppercase tracking-widest flex items-center gap-2">
                                <div className="w-1 h-1 bg-red-400 rounded-full animate-ping" />
                                BIAS LOCK: BLOCKED {gate.blocksDirection}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Reliability & Meta */}
            <div className="mt-4 pt-2 border-t border-white/5 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2 text-[8px] font-mono font-bold text-zinc-600 uppercase tracking-widest">
                    <span>{smt.meta?.sourceUsed}</span>
                    <span className="opacity-30">|</span>
                    <span>{smt.meta?.capApplied ? `Raw ${smt.meta.rawScore}%` : `Age ${Math.round((smt.meta?.dataAgeMs || 0) / 60000)}m`}</span>
                </div>
            </div>

            {/* Hebrew Help Overlay - VXR Style */}
            {showHelp && (
                <div className="absolute inset-0 z-50 bg-zinc-950/95 backdrop-blur-md p-6 flex flex-col animate-in fade-in duration-200">
                    <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                        <div className="flex items-center gap-2">
                            <Layers size={16} className="text-fuchsia-400" />
                            <span className="font-black text-white text-xs uppercase tracking-widest">SMT GUIDE (מתאמים בין-שוקיים)</span>
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
                            <h4 className="text-white font-black text-[11px] mb-1">מהו מדד ה-SMT?</h4>
                            <p className="text-[10px] text-zinc-400 leading-relaxed">
                                מדד ה-SMT (Smart Money Tool) משווה את נאסד"ק (NQ) למדדים מקבילים כמו ה-S&P 500. חוסר תיאום (סטייה) מעיד על כניסת כסף מוסדי "חכם".
                            </p>
                        </section>

                        <div className="space-y-2">
                            <div className="bg-fuchsia-500/10 border border-fuchsia-500/20 p-2 rounded">
                                <span className="text-[10px] font-black text-fuchsia-400 block mb-0.5">Divergence (סטייה)</span>
                                <span className="text-[9px] text-zinc-300">כשמדד אחד מייצר שיא חדש והשני לא - זוהי סטייה. היא מרמזת על חולשה או חוזק נסתר.</span>
                            </div>
                            <div className="bg-red-500/10 border border-red-500/20 p-2 rounded">
                                <span className="text-[10px] font-black text-red-400 block mb-0.5">Bias Lock (נעילת כיוון)</span>
                                <span className="text-[9px] text-zinc-300">במקרים של סטייה חריפה, המערכת תחסום עסקאות נגד המגמה המוסדית החדשה כדי להגן עליך.</span>
                            </div>
                        </div>

                        <section className="pt-2">
                            <h4 className="text-white font-black text-[11px] mb-1">כיצד לסחור?</h4>
                            <p className="text-[10px] text-zinc-400 leading-relaxed">
                                סטיית SMT היא אחד האישורים החזקים ביותר בשיטת ה-SMC. חפש אותה בנקודות היפוך קריטיות (PDH/PDL).
                            </p>
                        </section>

                        <button
                            onClick={() => setShowHelp(false)}
                            className="w-full py-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded font-black text-[10px] tracking-widest uppercase transition-colors mt-2"
                        >
                            הבנתי, חזרה לנתונים
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
