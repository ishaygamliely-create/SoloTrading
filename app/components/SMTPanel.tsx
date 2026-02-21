import React from 'react';
import { IndicatorSignal } from '../lib/types';
import { getConfidenceColorClass, getStatusFromScore, getStatusBadgeClass, type IndicatorStatus } from '@/app/lib/uiSignalStyles';
import { PanelHelp } from './PanelHelp';

type Props = {
    data: any;
    loading: boolean;
};

export function SMTPanel({ data, loading }: Props) {
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
        <div className={`rounded-xl border border-white/10 bg-white/5 p-4 space-y-3 ${scoreStyle.border}`}>
            {/* 1. Header: TITLE | Direction | Status | Score */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-fuchsia-400 tracking-wide">מתאמים (SMT)</span>
                    <div className="h-4 w-px bg-white/10" />
                    <span className={`text-xs font-bold uppercase ${directionClass}`}>
                        {smt.direction === 'LONG' ? 'קנייה' : smt.direction === 'SHORT' ? 'מכירה' : 'נייטרלי'}
                    </span>
                    <div className="h-4 w-px bg-white/10" />
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${statusBadgeClass}`}>
                        {computedStatus === 'STRONG' ? 'חזק' : computedStatus === 'OK' ? 'תקין' : computedStatus === 'WARN' ? 'אזהרה' : computedStatus}
                    </span>
                </div>
                <div className={`text-xl font-bold ${scoreStyle.text}`}>
                    {Math.round(smt.score)}%
                </div>
            </div>

            {/* 2. Hint / Factor */}
            <div className="text-xs text-white/70 italic">
                {factors && factors.length > 0 ? factors[0] : smt.hint}
            </div>

            {/* 3. Strong / Gate UI */}
            {isStrong && (
                <div className="flex flex-col gap-2 p-2 rounded bg-white/5 border border-white/5">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-white bg-blue-600 px-1.5 py-0.5 rounded-sm">אירוע חזק (STRONG)</span>
                        {gate?.isActive && (
                            <span className="text-[10px] text-amber-500 font-mono">
                                TTL: {gate.remainingMin}m
                            </span>
                        )}
                    </div>
                    {gate?.isActive && (
                        <div className="text-[10px] text-red-300 font-bold">
                            ⛔ חוסם עסקאות {gate.blocksDirection === 'LONG' ? 'קנייה' : 'מכירה'}
                        </div>
                    )}
                </div>
            )}

            {/* 4. Reliability & Meta */}
            <div className="text-[9px] text-zinc-600 font-mono border-t border-white/5 pt-1 mt-1 flex justify-between">
                <span>
                    {smt.meta?.sourceUsed}
                    {smt.meta?.capApplied ? ` · Raw ${smt.meta.rawScore}%` : ` · Age ${Math.round((smt.meta?.dataAgeMs || 0) / 60000)}m`}
                </span>
                {(smt.debug as any)?.refsSourceNote && (
                    <span className="opacity-50" title={(smt.debug as any).refsSourceNote}>
                        Refs: Correlations
                    </span>
                )}
            </div>

            {/* 5. Help Toggle */}
            <div className="pt-2 border-t border-white/5">
                <PanelHelp title="מתאמים (SMT)" bullets={[
                    "משווה את נאסד\"ק (NQ) מול מדדים אחרים (ES/YM/RTY).",
                    "סטיות (Divergence): מעידות על היפוך מחיר או חולשה של אחת המגמות.",
                    "אירוע חזק: סטייה רב-שוקית משמעותית.",
                    "שער (Gate): חוסם ביצוע עסקאות נגד הכיוון של הסקטור כדי למנוע מלכודות.",
                ]} />
            </div>
        </div>
    );
}
