import React, { useState } from 'react';
import { PanelProps } from './DashboardPanels';
import { Check, AlertTriangle, Clock, Activity, Target, Info, X, Zap } from 'lucide-react';
import { PSPResult } from '@/app/lib/psp';
import { getConfidenceColorClass, getStatusFromScore, getStatusBadgeClass, type IndicatorStatus } from '@/app/lib/uiSignalStyles';

export function PSPPanel({ data, loading }: PanelProps) {
    const [showHelp, setShowHelp] = useState(false);
    if (loading) return <div className="animate-pulse bg-zinc-900/50 border border-white/5 rounded-xl h-[160px]"></div>;

    const psp = data?.analysis?.psp as PSPResult;
    if (!psp) return null;

    // --- Standard Colors ---
    const scoreStyle = getConfidenceColorClass(psp.score);

    // Direction Color
    const directionClass = psp.direction === 'LONG'
        ? "text-emerald-400"
        : psp.direction === 'SHORT'
            ? "text-red-400"
            : "text-zinc-500";

    // Global Status Law
    const computedStatus: IndicatorStatus = psp.status === "OFF"
        ? "OFF"
        : getStatusFromScore(psp.score);

    const statusBadgeClass = getStatusBadgeClass(computedStatus);

    // --- Steps for Pipeline ---
    const steps = [
        { key: 'sweep', label: 'SWEEP', done: psp.checklist.sweep },
        { key: 'displacement', label: 'DISPLACE', done: psp.checklist.displacement },
        { key: 'pullback', label: 'RETEST', done: psp.checklist.pullback },
        { key: 'continuation', label: 'RUN', done: psp.checklist.continuation },
    ];

    // Calculate progress for gradient bar
    const completedSteps = steps.filter(s => s.done).length;

    // HVN from VXR for confluence check
    const vxrHvn = data.analysis?.vxr?.lastProfile?.hvn;
    const isHvnInEntryZone = vxrHvn && psp.levels && vxrHvn >= psp.levels.entryLow && vxrHvn <= psp.levels.entryHigh;

    return (
        <div className={`rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col relative overflow-hidden transition-all duration-500 min-h-[360px] group`}>
            {/* Background Glow - Matches VXR Style with enhanced volume */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-500/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity duration-1000" />

            {/* Header - VXR HUD Style */}
            <div className="flex items-center justify-between mb-5 relative z-10">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl border flex items-center justify-center transition-colors duration-500 group-hover:bg-yellow-500/20 ${psp.direction === 'LONG' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : psp.direction === 'SHORT' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'}`}>
                        <Target size={18} strokeWidth={2.5} />
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.2em] leading-none">PSP SETUP</span>
                            <button
                                onClick={() => setShowHelp(true)}
                                className="text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                                <Info size={10} />
                            </button>
                        </div>
                        <span className="text-[9px] text-zinc-500 font-bold uppercase mt-1">Institutional Setup Pipeline</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                        <Activity size={10} className="text-yellow-500 animate-pulse" />
                        <span className="text-[9px] font-black text-yellow-200 uppercase">{psp.state}</span>
                    </div>
                    <div className={`text-xl font-black tabular-nums tracking-tighter ${scoreStyle.text}`}>
                        {Math.round(psp.score)}%
                    </div>
                </div>
            </div>

            {/* Pipeline Visualization (Steps) */}
            <div className="mb-6 relative z-10 px-1">
                <div className="flex justify-between items-center relative z-10">
                    {steps.map((step, idx) => (
                        <div key={step.key} className="flex flex-col items-center gap-1.5 relative z-10">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center border shadow-xl transition-all duration-500 ${step.done
                                ? 'bg-emerald-500 border-emerald-400 text-black scale-110'
                                : 'bg-zinc-900 border-white/10 text-zinc-600'
                                }`}>
                                {step.done ? <Check size={10} strokeWidth={4} /> : <span className="text-[9px] font-black">{idx + 1}</span>}
                            </div>
                            <span className={`text-[8px] font-black uppercase tracking-widest ${step.done ? 'text-emerald-400' : 'text-zinc-600'}`}>
                                {step.label}
                            </span>
                        </div>
                    ))}
                    {/* Connecting Line */}
                    <div className="absolute top-2.5 left-0 w-full h-[1px] bg-white/5 -z-0"></div>
                    <div className="absolute top-2.5 left-0 h-[1px] bg-emerald-500/30 transition-all duration-1000 -z-0" style={{ width: `${Math.max(0, completedSteps > 0 ? (completedSteps - 1) * 33.33 : 0)}%` }}></div>
                </div>
            </div>

            {/* Confirmed Levels / Status Box */}
            <div className="relative z-10 flex-1 flex flex-col justify-center">
                {psp.state === 'CONFIRMED' && psp.levels ? (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 group/entry hover:bg-emerald-500/10 transition-colors">
                                <div className="text-[8px] font-black text-emerald-500/70 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                    <Target size={10} /> ENTRY ZONE
                                </div>
                                <div className="text-xs font-mono font-black text-emerald-300 tracking-tighter">
                                    {psp.levels.entryLow.toFixed(1)} <span className="text-white/20 px-1">/</span> {psp.levels.entryHigh.toFixed(1)}
                                </div>
                            </div>
                            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 group/stop hover:bg-red-500/10 transition-colors">
                                <div className="text-[8px] font-black text-red-500/70 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                    <AlertTriangle size={10} /> STOP LOSS
                                </div>
                                <div className="text-xs font-mono font-black text-red-400 tracking-tighter text-right">
                                    {psp.levels.invalidation.toFixed(1)}
                                </div>
                            </div>
                        </div>

                        {isHvnInEntryZone && (
                            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-2.5 flex items-center justify-between animate-in zoom-in-95 duration-500">
                                <div className="flex items-center gap-2">
                                    <Zap size={10} className="text-yellow-500 animate-pulse" />
                                    <span className="text-[9px] font-black text-yellow-500 uppercase tracking-wider">HVN CONFLUENCE</span>
                                </div>
                                <span className="text-[10px] font-mono font-black text-yellow-200">{vxrHvn.toFixed(1)}</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-white/[0.03] rounded-2xl border border-dashed border-white/10 p-6 flex flex-col items-center justify-center text-center">
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center mb-3">
                            <Clock size={14} className="text-zinc-600 animate-spin-slow" />
                        </div>
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-relaxed max-w-[140px]">
                            {psp.hint === "Waiting for setup confirmation..." ? "Awaiting institutional displacement..." : psp.hint || "Dechiphering macro orderflow..."}
                        </span>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2">
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border tracking-[0.1em] uppercase ${directionClass} border-current/10 bg-current/5`}>
                        {psp.direction} SENTIMENT
                    </span>
                </div>
                {psp.meta?.ageMinutes !== undefined && (
                    <span className="flex items-center gap-1 text-[8px] font-mono font-bold text-zinc-600 uppercase tracking-widest">
                        <Activity size={8} /> {psp.meta.ageMinutes} MIN AGO
                    </span>
                )}
            </div>

            {/* Hebrew Help Overlay - VXR Style */}
            {showHelp && (
                <div className="absolute inset-0 z-50 bg-zinc-950/95 backdrop-blur-md p-6 flex flex-col animate-in fade-in duration-200">
                    <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                        <div className="flex items-center gap-2">
                            <Info size={16} className="text-yellow-400" />
                            <span className="font-black text-white text-xs uppercase tracking-widest">PSP SETUP GUIDE (מדריך כניסה)</span>
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
                            <h4 className="text-white font-black text-[11px] mb-1">מהו מודל ה-PSP?</h4>
                            <p className="text-[10px] text-zinc-400 leading-relaxed">
                                מודל ה-PSP (Price Setup Pipeline) עוקב אחרי 4 השלבים שכל סוחר מוסדי מחפש לפני כניסה לעסקה. זהו המודל המדויק ביותר במערכת.
                            </p>
                        </section>

                        <div className="space-y-2">
                            <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded">
                                <span className="text-[10px] font-black text-emerald-400 block mb-0.5">Confirmed Setup</span>
                                <span className="text-[9px] text-zinc-300">מופיע רק כשכל התנאים הבשילו. במצב זה המערכת תספק מחיר כניסה וסטופ מדויקים.</span>
                            </div>
                            <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded">
                                <span className="text-[10px] font-black text-amber-400 block mb-0.5">4 השלבים (Pipeline)</span>
                                <span className="text-[9px] text-zinc-300">Sweep (ניקוי נזילות), Displace (תזוזה חזקה), Retest (בדיקה מחדש), Run (יציאה לדרך).</span>
                            </div>
                        </div>

                        <section className="pt-2">
                            <h4 className="text-white font-black text-[11px] mb-1">ניהול טרייד</h4>
                            <p className="text-[10px] text-zinc-400 leading-relaxed">
                                המתן תמיד ל-Confirmation. אם ה-PSP וה-Decision Engine מסכימים, זהו סימן להתכנסות מוסדית רחבה.
                            </p>
                        </section>

                        <button
                            onClick={() => setShowHelp(false)}
                            className="w-full py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded font-black text-[10px] tracking-widest uppercase transition-colors mt-2"
                        >
                            הבנתי, חזרה לנתונים
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
