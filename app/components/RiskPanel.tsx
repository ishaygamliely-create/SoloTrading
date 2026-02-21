'use client';

import React, { useState } from 'react';
import { Shield, Info, X, TrendingUp, AlertTriangle, Target, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { getConfidenceColorClass } from '@/app/lib/uiSignalStyles';

type Props = {
    data: any;
    loading: boolean;
};

export function RiskPanel({ data, loading }: Props) {
    const [showHelp, setShowHelp] = useState(false);

    if (loading) {
        return (
            <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-2xl h-full flex flex-col items-center justify-center p-6">
                <Shield className="text-zinc-800 mb-2" size={32} />
                <div className="w-24 h-2 bg-white/10 rounded" />
            </div>
        );
    }

    if (!data?.analysis?.risk || data.analysis.risk.direction === 'NEUTRAL') {
        return (
            <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-8 text-center flex flex-col items-center justify-center h-full">
                <Shield size={32} className="text-zinc-800 mb-3" />
                <span className="text-zinc-600 text-xs font-bold uppercase tracking-widest">Risk Analysis Off</span>
                <p className="text-zinc-700 text-[10px] uppercase mt-1">Waiting for actionable setup</p>
            </div>
        );
    }

    const { direction, rrRatio, invalidation, targets } = data.analysis.risk;
    const isLong = direction === 'LONG';
    const conf = getConfidenceColorClass(Math.min((rrRatio || 0) * 10, 100));

    return (
        <div className={`relative rounded-2xl border bg-zinc-900/40 p-5 h-full flex flex-col overflow-hidden transition-all duration-300 ${isLong ? 'border-emerald-500/20' : 'border-red-500/20'}`}>
            {/* Background Glow */}
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none ${isLong ? 'bg-emerald-500/5' : 'bg-red-500/5'}`} />

            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg border ${isLong ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                        <Shield size={18} className={isLong ? 'text-emerald-400' : 'text-red-400'} />
                    </div>
                    <div>
                        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Risk Management</h3>
                        <div className="flex items-center gap-2">
                            <span className="text-lg font-black text-white uppercase tracking-tight">R:R Protocol</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-black border bg-white/5 ${isLong ? 'text-emerald-400 border-emerald-500/30' : 'text-red-400 border-red-500/30'}`}>
                                1:{rrRatio?.toFixed(1)}
                            </span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => setShowHelp(true)}
                    className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 text-zinc-400 transition-colors"
                >
                    <Info size={14} />
                </button>
            </div>

            {/* Progress/Ratio Bar */}
            <div className="mb-6">
                <div className="flex justify-between text-[10px] font-black uppercase mb-2">
                    <span className="text-red-500/70">Stop Loss</span>
                    <span className="text-emerald-500/70">Targets (RR)</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden flex gap-0.5 p-0.5">
                    <div className="h-full bg-red-500/50 rounded-l-full" style={{ width: '25%' }} />
                    <div className="h-full bg-emerald-500/50 rounded-r-full" style={{ width: `${Math.min(75, (rrRatio || 1) * 20)}%` }} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                {/* Invalidation Zone */}
                {invalidation && (
                    <div className="bg-red-950/20 border border-red-500/20 rounded-xl p-4 flex flex-col justify-between">
                        <div className="flex items-center gap-2 mb-2 text-red-500/70">
                            <AlertTriangle size={12} />
                            <span className="text-[10px] font-black uppercase tracking-widest leading-none">Stop / Exit</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl font-black text-red-400 tracking-tighter leading-none">
                                {invalidation.price.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-zinc-600 font-bold uppercase mt-1">
                                {invalidation.distance?.toFixed(1)} pts Risk
                            </span>
                        </div>
                    </div>
                )}

                {/* Targets Zone */}
                <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-4 flex flex-col justify-between">
                    <div className="flex items-center gap-2 mb-2 text-emerald-500/70">
                        <Target size={12} />
                        <span className="text-[10px] font-black uppercase tracking-widest leading-none">Targets / TP</span>
                    </div>
                    <div className="space-y-2">
                        {targets?.slice(0, 2).map((t: any, i: number) => (
                            <div key={i} className="flex justify-between items-end border-b border-white/5 pb-1 last:border-0 last:pb-0">
                                <span className="text-[8px] text-zinc-500 font-bold uppercase truncate max-w-[60px]">{t.description}</span>
                                <div className="text-right leading-none">
                                    <span className="text-sm font-black text-emerald-300 font-mono tracking-tighter">{t.price.toFixed(2)}</span>
                                    <span className="text-[8px] text-zinc-600 block">+{t.distance?.toFixed(0)} pts</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Overlay Hebrew Help Section */}
            {showHelp && (
                <div className="absolute inset-0 z-50 bg-zinc-950/95 backdrop-blur-md p-6 flex flex-col animate-in fade-in duration-200 text-right" dir="rtl">
                    <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-2">
                        <div className="flex items-center gap-2">
                            <Info size={16} className={`text-pink-400`} />
                            <span className="font-bold text-white text-sm">ניהול סיכונים (Risk Management)</span>
                        </div>
                        <button
                            onClick={() => setShowHelp(false)}
                            className="p-1 hover:bg-white/10 rounded-full text-zinc-400 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-4">
                        <section>
                            <h4 className="text-white font-bold text-xs mb-1">חוקי הברזל של הסיכון</h4>
                            <p className="text-[11px] text-zinc-400 leading-relaxed">
                                ללא ניהול סיכונים, גם האסטרטגיה הטובה בעולם תיכשל. המנוע מחשב עבורך את יחס הסיכון-סיכוי (R:R).
                            </p>
                        </section>

                        <div className="space-y-2">
                            <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                                <span className="text-[10px] font-bold text-red-400 block mb-1">Invalidation (מחיר ביטול)</span>
                                <span className="text-[9px] text-zinc-300">זהו הקו האדום. אם המחיר חוצה אותו, התיזה של המודל כבר לא תקפה. חובה לצאת מהעסקה כאן.</span>
                            </div>
                            <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg">
                                <span className="text-[10px] font-bold text-emerald-400 block mb-1">Risk to Reward (R:R)</span>
                                <span className="text-[9px] text-zinc-300">אנו מחפשים יחס של לפחות 1:2. זה אומר שעל כל דולר שאתה מסכן, אתה פוטנציאלית מרוויח שניים.</span>
                            </div>
                            <div className="bg-zinc-800 border border-white/5 p-3 rounded-lg">
                                <span className="text-[10px] font-bold text-zinc-400 block mb-1">Targets (יעדים)</span>
                                <span className="text-[9px] text-zinc-300">אלו נקודות מימוש הרווח. מומלץ לממש חצי ב-TP1 ולהזיז את הסטופ לנקודת הכניסה.</span>
                            </div>
                        </div>

                        <section className="pt-2 border-t border-white/5">
                            <h4 className="text-white font-bold text-xs mb-1">המלצה אלגוריתמית</h4>
                            <p className="text-[11px] text-zinc-400 leading-relaxed italic">
                                "Don't let a green trade turn red."
                                (לעולם אל תתן לעסקה שכבר הייתה ברווח להסתיים בהפסד - נעל רווחים בדרך).
                            </p>
                        </section>
                    </div>

                    <button
                        onClick={() => setShowHelp(false)}
                        className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-[11px] transition-colors mt-4"
                    >
                        סגור מדריך
                    </button>
                </div>
            )}
        </div>
    );
}
