import React from 'react';
import { IndicatorSignal } from '../lib/types';
import { getConfidenceColorClass, getStatusFromScore, getStatusBadgeClass, type IndicatorStatus } from '@/app/lib/uiSignalStyles';
import { PanelHelp } from './PanelHelp';

interface ValueZonePanelProps {
    data: any;
    loading: boolean;
}

export function ValueZonePanel({ data, loading }: ValueZonePanelProps) {
    if (loading) return <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-xl h-24"></div>;

    const valueZone = data?.analysis?.valueZone as IndicatorSignal;

    // ✅ CORE PANEL: Only hide if no data or hard ERROR
    if (!valueZone) return null;
    if (valueZone.status === 'ERROR') return null;

    // --- Standard Colors ---
    const scoreStyle = getConfidenceColorClass(valueZone.score);

    // Direction Color
    const directionClass = valueZone.direction === 'LONG'
        ? "text-emerald-400"
        : valueZone.direction === 'SHORT'
            ? "text-red-400"
            : "text-zinc-500";

    // Global Status Law: derive from score
    const computedStatus: IndicatorStatus = getStatusFromScore(valueZone.score);

    const statusBadgeClass = getStatusBadgeClass(computedStatus);

    // Debug Data
    const { label, percentInRange, pdh, pdl, eq } = (valueZone.debug || {}) as any;

    return (
        <div className={`rounded-xl border border-white/10 bg-white/5 p-4 space-y-3 ${scoreStyle.border}`}>
            {/* 1. Header: TITLE | Direction | Status | Score */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-indigo-400 tracking-wide">VALUE</span>
                    <div className="h-4 w-px bg-white/10" />
                    <span className={`text-xs font-bold uppercase ${directionClass}`}>
                        {valueZone.direction}
                    </span>
                    <div className="h-4 w-px bg-white/10" />
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${statusBadgeClass}`}>
                        {computedStatus}
                    </span>
                </div>
                <div className={`text-xl font-bold ${scoreStyle.text}`}>
                    {Math.round(valueZone.score)}%
                </div>
            </div>

            {/* Reliability row — show if cap applied or data is delayed */}
            {valueZone.meta && (valueZone.meta.capApplied || valueZone.meta.dataAgeMs > 15 * 60_000) && (
                <div className="text-[9px] text-white/40 text-right font-mono">
                    {valueZone.meta.sourceUsed}{valueZone.meta.capApplied ? ` · Raw ${valueZone.meta.rawScore}% → ${valueZone.meta.finalScore}%` : ` · Age ${Math.round(valueZone.meta.dataAgeMs / 60000)}m`}
                </div>
            )}

            {/* 2. Hint */}
            <div className="text-xs text-white/70 italic">
                {valueZone.hint}
            </div>

            {/* 3. Data Visualization */}
            <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="bg-white/5 rounded p-2 border border-white/5 flex flex-col justify-between">
                    <div className="text-zinc-500 font-bold uppercase">ZONE</div>
                    <div className="text-white font-mono uppercase">
                        {label ?? 'UNKNOWN'}
                    </div>
                </div>
                <div className="bg-white/5 rounded p-2 border border-white/5 flex flex-col justify-between">
                    <div className="flex justify-between items-center">
                        <div className="text-zinc-500 font-bold uppercase">PRICE</div>
                        <div className="text-zinc-500 font-mono">{Number(percentInRange).toFixed(0)}%</div>
                    </div>
                    <div className="text-white font-mono text-lg font-bold tracking-tight">
                        {data.price?.toFixed(2)}
                    </div>
                </div>
            </div>

            {/* DXY Correlation Section (Value V2) */}
            {valueZone.debug && (valueZone.debug as any).dxyState !== "NEUTRAL" && (
                <div className="flex items-center justify-between text-xs border-t border-white/5 pt-2">
                    <span className="text-zinc-500 font-medium">DXY CORRELATION</span>
                    <div className="flex items-center gap-2">
                        <span className="text-white/60 font-mono text-[10px]">
                            {(valueZone.debug as any).dxyText}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold border ${(valueZone.debug as any).dxyState === "SUPPORT"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            }`}>
                            {(valueZone.debug as any).dxyState === "SUPPORT" ? "TAILWIND" : "HEADWIND"}
                        </span>
                    </div>
                </div>
            )}

            {/* Levels */}
            <div className="flex justify-between px-1 pt-1 text-[9px] text-zinc-600 font-mono">
                <span>PDL: {Number(pdl)?.toFixed(2)}</span>
                <span>EQ: {Number(eq)?.toFixed(2)}</span>
                <span>PDH: {Number(pdh)?.toFixed(2)}</span>
            </div>

            {/* 4. Help Toggle */}
            <div className="pt-2 border-t border-white/5">
                <PanelHelp title="אזור ערך (VALUE v2)" bullets={[
                    "משווה את המחיר הנוכחי לטווח של היום הקודם.",
                    "PDH = גבוה יום קודם | PDL = נמוך יום קודם.",
                    "EQ (Equilibrium) = נקודת האמצע (50%).",
                    "יקר - Premium (>EQ): מחיר גבוה, עדיפות למכירה (Short).",
                    "זול - Discount (<EQ): מחיר אטרקטיבי, עדיפות לקנייה (Long).",
                    "מתאם DXY: מדד הדולר משמש כמגנט או דוחף למחיר.",
                    "רוח פנים חזקה מצד ה-DXY מורידה את הביטחון בעסקה.",
                ]} />
            </div>
        </div>
    );
}
