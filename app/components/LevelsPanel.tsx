'use client';

import React, { useState } from 'react';
import { Target, Info, X, Zap, ChevronRight, Activity } from 'lucide-react';

type Props = {
    data: any;
    loading: boolean;
};

export function LevelsPanel({ data, loading }: Props) {
    const [showHelp, setShowHelp] = useState(false);

    if (loading || !data?.levels) {
        return (
            <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-2xl h-full flex flex-col items-center justify-center p-6">
                <div className="w-12 h-12 bg-white/5 rounded-full mb-3" />
                <div className="w-24 h-2 bg-white/10 rounded" />
            </div>
        );
    }

    const { trueDayOpen, pdh, pdl, vwap, sdValues } = data.levels;
    const price = data.price || 0;

    const LevelItem = ({ label, value, color, icon: Icon }: any) => {
        const isNear = value && Math.abs(price - value) < 5;
        return (
            <div className="relative bg-black/40 border border-white/5 rounded-xl p-3 flex flex-col justify-between overflow-hidden group transition-all hover:border-white/10">
                <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">{label}</span>
                    <Icon size={12} className={`opacity-40 ${color}`} />
                </div>
                <div className="flex items-baseline gap-1 relative z-10">
                    <span className={`text-lg font-black font-mono tracking-tighter ${color}`}>
                        {value ? value.toFixed(2) : '---'}
                    </span>
                    <span className="text-[8px] text-zinc-600 font-bold">pts</span>
                </div>
                {isNear && (
                    <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-pulse" />
                )}
            </div>
        );
    };

    return (
        <div className="relative rounded-2xl border border-white/10 bg-zinc-900/40 p-5 h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/10 rounded-lg border border-orange-500/20">
                        <Target size={18} className="text-orange-400" />
                    </div>
                    <div>
                        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Institutional Levels</h3>
                        <span className="text-lg font-black text-white uppercase tracking-tight">Key Ranges</span>
                    </div>
                </div>
                <button
                    onClick={() => setShowHelp(true)}
                    className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 text-zinc-400 transition-colors"
                >
                    <Info size={14} />
                </button>
            </div>

            {/* Main Levels Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <LevelItem label="True Open" value={trueDayOpen} color="text-blue-400" icon={Activity} />
                <LevelItem label="VWAP" value={vwap} color="text-orange-400" icon={Zap} />
                <LevelItem label="Prev High" value={pdh} color="text-red-400/80" icon={ChevronRight} />
                <LevelItem label="Prev Low" value={pdl} color="text-emerald-400/80" icon={ChevronRight} />
            </div>

            {/* SD Ranges Box */}
            {sdValues && (
                <div className="bg-black/30 border border-white/5 rounded-xl p-4 mt-auto">
                    <div className="flex items-center gap-2 mb-3">
                        <Activity size={10} className="text-zinc-600" />
                        <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest leading-none">Standard Deviation Bands</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col">
                            <span className="text-[8px] text-zinc-500 font-bold uppercase mb-1">Execution Zone (SD1)</span>
                            <div className="text-xs font-mono font-bold text-orange-200/60 transition-all group-hover:text-orange-200">
                                {sdValues.sd1_lower?.toFixed(0)} <span className="text-zinc-700 mx-0.5">-</span> {sdValues.sd1_upper?.toFixed(0)}
                            </div>
                        </div>
                        <div className="flex flex-col border-l border-white/5 pl-4">
                            <span className="text-[8px] text-zinc-500 font-bold uppercase mb-1">Extreme Zone (SD2)</span>
                            <div className="text-xs font-mono font-bold text-orange-400/40">
                                {sdValues.sd2_lower?.toFixed(0)} <span className="text-zinc-700 mx-0.5">-</span> {sdValues.sd2_upper?.toFixed(0)}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Overlay Hebrew Help Section */}
            {showHelp && (
                <div className="absolute inset-0 z-50 bg-zinc-950/95 backdrop-blur-md p-6 flex flex-col animate-in fade-in duration-200 text-right" dir="rtl">
                    <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-2">
                        <div className="flex items-center gap-2">
                            <Info size={16} className="text-orange-400" />
                            <span className="font-bold text-white text-sm">מדריך רמות מפתח (Key Levels)</span>
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
                            <h4 className="text-white font-bold text-xs mb-1">מהן רמות מוסדיות?</h4>
                            <p className="text-[11px] text-zinc-400 leading-relaxed">
                                אלגוריתמים עובדים לפי רמות מחיר ספציפיות. ידיעת הרמות האלו מאפשרת לך "לראות" איפה השוק יבלם או יתפרץ.
                            </p>
                        </section>

                        <div className="space-y-2">
                            <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg">
                                <span className="text-[10px] font-bold text-blue-400 block mb-1">True Day Open</span>
                                <span className="text-[9px] text-zinc-300">המחיר שבו נפתח יום המסחר ב-00:00 (ניו יורק). זהו "קו המשווה" של היום. מחיר מעליו נחשב שורי, מתחתיו דובי.</span>
                            </div>
                            <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-lg">
                                <span className="text-[10px] font-bold text-orange-400 block mb-1">VWAP Monitor</span>
                                <span className="text-[9px] text-zinc-300">מחיר ממוצע משוקלל נפח. הקו שהמוסדות משתמשים בו כדי למדוד אם הם קונים במחיר טוב.</span>
                            </div>
                            <div className="bg-zinc-800 border border-white/5 p-3 rounded-lg">
                                <span className="text-[10px] font-bold text-zinc-400 block mb-1">SD Bands (סטיות תקן)</span>
                                <span className="text-[9px] text-zinc-300">כאשר המחיר מגיע ל-SD2, הוא נחשב לחריג מאוד ("מתוח") ורוב הסיכויים שיחזור חזרה ל-VWAP.</span>
                            </div>
                        </div>

                        <section className="pt-2 border-t border-white/5">
                            <h4 className="text-white font-bold text-xs mb-1">איך להשתמש?</h4>
                            <p className="text-[11px] text-zinc-400 leading-relaxed">
                                חפש כניסות שקורות כשהמחיר נמצא מתחת ל-True Open (לקנייה) או מעליו (למכירה) - ה-Discount.
                            </p>
                        </section>
                    </div>

                    <button
                        onClick={() => setShowHelp(false)}
                        className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-[11px] transition-colors mt-4"
                    >
                        סגור מדריך
                    </button>
                </div>
            )}
        </div>
    );
}
