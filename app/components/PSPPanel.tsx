import React from 'react';
import { PanelProps } from './DashboardPanels';
import { Check, AlertTriangle, Clock, Activity, Target } from 'lucide-react';
import { PSPResult } from '@/app/lib/psp';
import { getConfidenceColorClass, getStatusFromScore, getStatusBadgeClass, type IndicatorStatus } from '@/app/lib/uiSignalStyles';
import { PanelHelp } from './PanelHelp';

export function PSPPanel({ data, loading }: PanelProps) {
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
        <div className={`rounded-xl border border-white/10 bg-white/5 p-4 relative overflow-hidden flex flex-col h-full ${scoreStyle.border}`}>
            {/* Background Gradient */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            {/* 1. Header */}
            <div className="flex items-center justify-between mb-3 relative z-10">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                        <Activity size={14} className="text-yellow-500" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest leading-none">PSP 15m</span>
                        <div className="flex items-center gap-1">
                            <span className={`text-[9px] font-bold uppercase ${directionClass}`}>
                                {psp.direction}
                            </span>
                            {psp.state !== 'NONE' && (
                                <span className={`text-[8px] px-1 rounded uppercase ${psp.state === 'CONFIRMED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                    {psp.state}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end">
                    <span className={`text-xl font-black ${scoreStyle.text} leading-none`}>
                        {Math.round(psp.score)}%
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase mt-0.5 ${statusBadgeClass}`}>
                        {computedStatus}
                    </span>
                </div>
            </div>

            {/* 2. Pipeline Visualization (Steps) */}
            <div className="mb-4 relative z-10">
                <div className="flex justify-between items-center mb-1.5">
                    {steps.map((step, idx) => (
                        <div key={step.key} className="flex flex-col items-center gap-1 relative z-10">
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center border ${step.done
                                ? 'bg-emerald-500 border-emerald-400 text-black'
                                : 'bg-zinc-900 border-white/10 text-zinc-600'
                                } shadow-lg transition-all duration-300`}>
                                {step.done ? <Check size={8} strokeWidth={4} /> : <span className="text-[8px] font-mono">{idx + 1}</span>}
                            </div>
                            <span className={`text-[8px] font-bold uppercase tracking-wider ${step.done ? 'text-emerald-400' : 'text-zinc-600'}`}>
                                {step.label}
                            </span>
                        </div>
                    ))}
                    {/* Connecting Line */}
                    <div className="absolute top-2 left-0 w-full h-px bg-white/10 -z-0"></div>
                    <div className="absolute top-2 left-0 h-px bg-emerald-500/50 transition-all duration-500 -z-0" style={{ width: `${Math.max(0, completedSteps > 0 ? (completedSteps - 1) * 33.33 : 0)}%` }}></div>
                </div>
            </div>

            {/* 3. Confirmed Levels / Status Box */}
            <div className="relative z-10 flex-1">
                {psp.state === 'CONFIRMED' && psp.levels ? (
                    <div className="grid grid-cols-2 gap-2 mb-2">
                        <div className="bg-emerald-950/20 border border-emerald-500/20 rounded p-2">
                            <div className="text-[9px] text-emerald-500/70 font-bold uppercase mb-0.5 flex items-center gap-1">
                                <Target size={10} /> ENTRY ZONE
                            </div>
                            <div className="text-xs font-mono font-bold text-emerald-300">
                                {psp.levels.entryLow.toFixed(2)} - {psp.levels.entryHigh.toFixed(2)}
                            </div>
                        </div>
                        <div className="bg-red-950/20 border border-red-500/20 rounded p-2">
                            <div className="text-[9px] text-red-500/70 font-bold uppercase mb-0.5 flex items-center gap-1">
                                <AlertTriangle size={10} /> INVALIDATION
                            </div>
                            <div className="text-xs font-mono font-bold text-red-400">
                                {psp.levels.invalidation.toFixed(2)}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white/5 rounded border border-white/5 p-3 flex items-center justify-center text-center h-[54px] mb-2">
                        <span className="text-[10px] text-zinc-500 italic uppercase">
                            {psp.hint === "Waiting for setup confirmation..." ? "Waiting for confirmation..." : psp.hint || "Forming setup..."}
                        </span>
                    </div>
                )}

                {isHvnInEntryZone && (
                    <div className="mt-2 bg-yellow-500/10 border border-yellow-500/20 rounded p-2 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <Target size={10} className="text-yellow-500" />
                            <span className="text-[9px] font-black text-yellow-500 uppercase">HVN Confluence</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-yellow-200">{vxrHvn.toFixed(2)}</span>
                    </div>
                )}
            </div>

            {/* 4. Footer */}
            <div className="mt-auto pt-2 border-t border-white/5 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2 text-[9px] text-zinc-500 font-mono">
                    {psp.meta?.ageMinutes !== undefined && (
                        <span className="flex items-center gap-1 uppercase">
                            <Clock size={8} /> {psp.meta.ageMinutes}m ago
                        </span>
                    )}
                </div>
                <PanelHelp title="מודל PSP" bullets={[
                    "שלבים: ניקוי נזילות -> תזוזה אגרסיבית -> תיקון לאזור הערך -> המשכיות.",
                    "מאושר (Confirmed): כל 4 השלבים הושלמו. הסתברות גבוהה לכניסה.",
                    "מתגבש (Forming): המודל בתהליך עבודה. יש להמתין לשלב הבא.",
                    "התכנסות HVN: הצטלבות של אזור הכניסה עם אזור ווליום גבוה מחזקת את העסקה.",
                ]} />
            </div>
        </div>
    );
}
