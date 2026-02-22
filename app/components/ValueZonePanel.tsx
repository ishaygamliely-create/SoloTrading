import React, { useState } from 'react';
import { IndicatorSignal } from '../lib/types';
import { getConfidenceColorClass, getStatusFromScore, getStatusBadgeClass, type IndicatorStatus } from '@/app/lib/uiSignalStyles';
import { Target, Info, X, Zap, Activity, TrendingUp, TrendingDown, Layers, Box } from 'lucide-react';

interface ValueZonePanelProps {
    data: any;
    loading: boolean;
}

export function ValueZonePanel({ data, loading }: ValueZonePanelProps) {
    const [showHelp, setShowHelp] = useState(false);

    if (loading) {
        return <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-xl h-[220px]"></div>;
    }

    const valueZone = data?.analysis?.valueZone as IndicatorSignal;
    if (!valueZone || valueZone.status === 'ERROR') return null;

    const scoreStyle = getConfidenceColorClass(valueZone.score);
    const computedStatus: IndicatorStatus = getStatusFromScore(valueZone.score);
    const statusBadgeClass = getStatusBadgeClass(computedStatus);

    // Debug Data
    const { label, percentInRange, pdh, pdl, eq, dxyState, dxyText } = (valueZone.debug || {}) as any;

    return (
        <div className={`rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col relative overflow-hidden transition-all duration-500 min-h-[220px] group`}>
            {/* Background Glow - Matches VXR Style with enhanced volume */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity duration-1000" />

            {/* Header - VXR HUD Style */}
            <div className="flex items-center justify-between mb-5 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 flex items-center justify-center transition-colors group-hover:bg-indigo-500/20">
                        <Target size={18} strokeWidth={2.5} />
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] leading-none">VALUE ZONE</span>
                            <button
                                onClick={() => setShowHelp(true)}
                                className="text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                                <Info size={10} />
                            </button>
                        </div>
                        <span className="text-[9px] text-zinc-500 font-bold uppercase mt-1">Institutional Pricing</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                        <Activity size={10} className="text-indigo-500 animate-pulse" />
                        <span className="text-[9px] font-black text-indigo-200 uppercase">ZONE SCAN</span>
                    </div>
                    <div className={`text-xl font-black tabular-nums tracking-tighter ${scoreStyle.text}`}>
                        {Math.round(valueZone.score)}%
                    </div>
                </div>
            </div>

            <div className="space-y-4 relative z-10 flex-1">
                {/* Status Row */}
                <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded border uppercase tracking-widest ${valueZone.direction === 'LONG' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' : valueZone.direction === 'SHORT' ? 'text-red-400 border-red-500/20 bg-red-500/5' : 'text-zinc-500 border-white/10'}`}>
                        {valueZone.direction}
                    </span>
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border tracking-widest uppercase ${statusBadgeClass}`}>
                        {computedStatus}
                    </span>
                    <span className="text-[9px] font-black px-2 py-0.5 rounded border border-white/10 text-zinc-400 tracking-widest uppercase bg-white/5">
                        {label || 'UNKNOWN'}
                    </span>
                </div>

                {/* Price Position Visualization */}
                <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
                    <div className="flex justify-between items-end mb-2">
                        <div className="flex items-center gap-2">
                            <Box size={10} className="text-zinc-500" />
                            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Pricing Matrix</span>
                        </div>
                        <span className="text-[10px] font-mono font-black text-zinc-200">{Number(percentInRange).toFixed(0)}% Range</span>
                    </div>
                    <div className="relative h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                        {/* EQ Marker */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20 z-10" />
                        <div
                            className={`h-full transition-all duration-1000 ${Number(percentInRange) > 50 ? 'bg-indigo-500/50' : 'bg-indigo-400/50'}`}
                            style={{ width: `${percentInRange}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-1.5 text-[8px] font-black text-zinc-600 uppercase tracking-widest">
                        <span>Discount</span>
                        <span>Premium</span>
                    </div>
                </div>

                {/* DXY Correlation */}
                {dxyState && dxyState !== "NEUTRAL" && (
                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <div className="flex items-center gap-1.5">
                            <Zap size={10} className="text-amber-500" />
                            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">DXY MATRIX</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold text-zinc-400">{dxyText}</span>
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${dxyState === "SUPPORT" ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5" : "text-red-400 border-red-500/20 bg-red-500/5"}`}>
                                {dxyState === "SUPPORT" ? "TAILWIND" : "HEADWIND"}
                            </span>
                        </div>
                    </div>
                )}

                {/* Levels Grid */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-center">
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-0.5">PDL</span>
                        <span className="text-[10px] font-mono font-bold text-zinc-500 italic">{Number(pdl)?.toFixed(1)}</span>
                    </div>
                    <div className="flex flex-col border-x border-white/5">
                        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-0.5">EQ (50%)</span>
                        <span className="text-[10px] font-mono font-bold text-zinc-400">{Number(eq)?.toFixed(1)}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-0.5">PDH</span>
                        <span className="text-[10px] font-mono font-bold text-zinc-500 italic">{Number(pdh)?.toFixed(1)}</span>
                    </div>
                </div>
            </div>

            {/* Hebrew Help Overlay */}
            {showHelp && (
                <div className="absolute inset-0 z-50 bg-zinc-950/95 backdrop-blur-md p-6 flex flex-col animate-in fade-in duration-200">
                    <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                        <div className="flex items-center gap-2">
                            <Target size={16} className="text-indigo-400" />
                            <span className="font-black text-white text-xs uppercase tracking-widest">VALUE GUIDE (אזור ערך)</span>
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
                            <h4 className="text-white font-bold text-[11px] mb-1">מהו אזור ערך?</h4>
                            <p className="text-[10px] text-zinc-400 leading-relaxed">
                                מודל זה משווה את המחיר הנוכחי לטווח המסחר של היום הקודם. המטרה היא להבין האם המחיר נסחר ב-"יוקר" (Premium) או ב-"זול" (Discount).
                            </p>
                        </section>

                        <div className="space-y-2">
                            <div className="bg-indigo-500/10 border border-indigo-500/20 p-2 rounded">
                                <span className="text-[10px] font-bold text-indigo-400 block mb-0.5">Premium (מעל 50%)</span>
                                <span className="text-[9px] text-zinc-300">אזור יקר יחסית. המוסדיים יחפשו לעיתים מכירה חזרה לעבר נקודת האיזון (EQ).</span>
                            </div>
                            <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded">
                                <span className="text-[10px] font-bold text-emerald-400 block mb-0.5">Discount (מתחת ל-50%)</span>
                                <span className="text-[9px] text-zinc-300">אזור זול יחסית. מחירי קנייה אטרקטיביים יותר עבור הסוחר המוסדי.</span>
                            </div>
                        </div>

                        <section className="pt-2">
                            <h4 className="text-white font-bold text-[11px] mb-1">מתאם DXY</h4>
                            <p className="text-[10px] text-zinc-400 leading-relaxed">
                                מדד הדולר (DXY) פועל ככוח נגדי. אם ה-DXY בפריצה, זה יוצר "רוח פנים" (Headwind) שמקשה על עליות מחירים בנכסים אחרים.
                            </p>
                        </section>

                        <button
                            onClick={() => setShowHelp(false)}
                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-black text-[10px] tracking-widest uppercase transition-colors mt-2"
                        >
                            הבנתי, חזרה לנתונים
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
