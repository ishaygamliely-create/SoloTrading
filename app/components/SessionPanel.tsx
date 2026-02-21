'use client';

import React, { useState } from 'react';
import type { IndicatorSignal } from '@/app/lib/types';
import { Clock, Info, X, MapPin, Globe } from 'lucide-react';
import { getConfidenceColorClass } from '@/app/lib/uiSignalStyles';

export function SessionPanel({ session }: { session: IndicatorSignal | undefined }) {
    const [showHelp, setShowHelp] = useState(false);

    if (!session) {
        return (
            <div className="rounded-2xl bg-zinc-900/50 border border-white/5 p-6 h-full flex flex-col items-center justify-center text-center">
                <Clock className="text-zinc-800 mb-2" size={32} />
                <div className="text-zinc-600 text-xs font-bold uppercase">Session Sleep Mode</div>
            </div>
        );
    }

    const conf = getConfidenceColorClass(session.score);
    const flags = (session.debug as any)?.flags || {};
    const nyTime = flags.nyTime || '--:--';

    return (
        <div className={`relative rounded-2xl border bg-zinc-900/40 p-5 h-full flex flex-col overflow-hidden transition-all duration-300 ${conf.border}`}>
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        <Globe size={18} className="text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Market Session</h3>
                        <div className="flex items-center gap-2">
                            <span className="text-lg font-black text-white uppercase tracking-tight">
                                {session.direction || 'ACTIVE'}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-black border ${conf.text} ${conf.border} bg-white/5`}>
                                {session.status}
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

            {/* Visual: Time Display */}
            <div className="flex-1 flex flex-col justify-center items-center py-4 bg-black/20 rounded-xl border border-white/5 mb-4 group">
                <div className="flex items-center gap-2 mb-2">
                    <MapPin size={10} className="text-blue-500" />
                    <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">New York Terminal</span>
                </div>
                <div className="text-5xl font-black text-white tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] group-hover:scale-105 transition-transform duration-500">
                    {nyTime}
                </div>
                <div className="mt-3 flex items-center gap-4">
                    <div className="flex flex-col items-center">
                        <span className="text-[8px] text-zinc-600 font-bold uppercase mb-0.5">KZ</span>
                        <div className={`w-1.5 h-1.5 rounded-full ${session.hint?.includes('KZ') ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-800'}`} />
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-[8px] text-zinc-600 font-bold uppercase mb-0.5">VOL</span>
                        <div className={`w-1.5 h-1.5 rounded-full ${session.score >= 70 ? 'bg-blue-500 animate-pulse' : 'bg-zinc-800'}`} />
                    </div>
                </div>
            </div>

            {/* Hint Box */}
            <div className="text-[10px] text-zinc-400 leading-relaxed font-bold uppercase tracking-wide bg-blue-500/5 p-2 rounded border border-blue-500/10 text-center italic">
                {session.hint}
            </div>

            {/* Overlay Hebrew Help Section */}
            {showHelp && (
                <div className="absolute inset-0 z-50 bg-zinc-950/95 backdrop-blur-md p-6 flex flex-col animate-in fade-in duration-200 text-right" dir="rtl">
                    <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-2">
                        <div className="flex items-center gap-2">
                            <Info size={16} className="text-blue-400" />
                            <span className="font-bold text-white text-sm">מדריך סשנים (Session Policy)</span>
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
                            <h4 className="text-white font-bold text-xs mb-1">מדוע הזמן חשוב?</h4>
                            <p className="text-[11px] text-zinc-400 leading-relaxed">
                                עסקאות בהסתברות גבוהה קורות בשעות ספציפיות שבהן יש נזילות מוסדית גבוהה (Killzones).
                            </p>
                        </section>

                        <div className="space-y-2">
                            <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg">
                                <span className="text-[10px] font-bold text-blue-400 block mb-1">London Killzone</span>
                                <span className="text-[9px] text-zinc-300">02:00-05:00 שעון ניו יורק. אופייני ליצירת הנמוך או הגבוה היומי.</span>
                            </div>
                            <div className="bg-pink-500/10 border border-pink-500/20 p-3 rounded-lg">
                                <span className="text-[10px] font-bold text-pink-400 block mb-1">New York Killzone</span>
                                <span className="text-[9px] text-zinc-300">07:00-10:00 שעון ניו יורק. הסשן העיקרי למסחר ב-Nasdaq. תנועות אגרסיביות.</span>
                            </div>
                            <div className="bg-zinc-800 border border-white/5 p-3 rounded-lg">
                                <span className="text-[10px] font-bold text-zinc-400 block mb-1">London Close</span>
                                <span className="text-[9px] text-zinc-300">10:00-12:00 שעון ניו יורק. היפוכי מגמה או מימושי רווח.</span>
                            </div>
                        </div>

                        <section className="pt-2 border-t border-white/5">
                            <h4 className="text-white font-bold text-xs mb-1">טיפ זהב</h4>
                            <p className="text-[11px] text-zinc-400 leading-relaxed italic">
                                "If you trade outside the killzones, you are the exit liquidity."
                                (אם אתה סוחר מחוץ לשעות אלו, אתה הנזילות של אחרים).
                            </p>
                        </section>
                    </div>

                    <button
                        onClick={() => setShowHelp(false)}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-[11px] transition-colors mt-4"
                    >
                        סגור מדריך
                    </button>
                </div>
            )}
        </div>
    );
}
