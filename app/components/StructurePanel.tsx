import React from 'react';
import { IndicatorSignal } from '../lib/types';
import { getConfidenceColorClass, getStatusFromScore, getStatusBadgeClass, type IndicatorStatus } from '@/app/lib/uiSignalStyles';
import { PanelHelp } from './PanelHelp';

interface StructurePanelProps {
    data: any;
    loading: boolean;
}

export function StructurePanel({ data, loading }: StructurePanelProps) {
    if (loading) return <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-xl h-24"></div>;

    const structure = data?.analysis?.structure as IndicatorSignal;
    if (!structure || structure.status === 'OFF') return null;

    // --- Standard Colors ---
    // Global Confidence Law: 0-59 Red, 60-74 Yellow, 75-100 Green
    const score = structure.score;
    let scoreColor = "text-red-400";
    let borderColor = "ring-1 ring-red-500/30";
    if (score >= 75) {
        scoreColor = "text-emerald-300";
        borderColor = "ring-1 ring-emerald-500/30";
    } else if (score >= 60) {
        scoreColor = "text-yellow-300";
        borderColor = "ring-1 ring-yellow-500/30";
    }

    // Global Status Law: derive from score (OFF already filtered above)
    const rawStatus = structure.status;
    const computedStatus: IndicatorStatus = rawStatus === "ERROR"
        ? "ERROR"
        : getStatusFromScore(score);

    const directionClass = structure.direction === 'LONG'
        ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
        : structure.direction === 'SHORT'
            ? "text-red-400 bg-red-500/10 border-red-500/20"
            : "text-zinc-500 bg-zinc-500/10";

    const statusBadgeClass = getStatusBadgeClass(computedStatus);

    // Debug Data
    const { playbook, bias, ema20, ema50, scoreBreakdown } = (structure.debug || {}) as any;

    return (
        <div className={`rounded-xl border bg-white/5 p-4 space-y-2 ${borderColor}`}>
            {/* 1. Header: TITLE | Direction | Status | Score */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-blue-400 tracking-wide text-sm">STRUCTURE</span>
                    <div className="h-3 w-px bg-white/10" />
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${directionClass}`}>
                        {structure.direction}
                    </span>
                    <div className="h-3 w-px bg-white/10" />
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${statusBadgeClass}`}>
                        {computedStatus}
                    </span>
                </div>
                <div className={`text-lg font-bold ${scoreColor}`}>
                    {Math.round(structure.score)}%
                </div>
            </div>

            {/* 2. Playbook (V3) */}
            <div className="text-sm text-white/90 font-medium leading-tight">
                <span className="text-white/40 text-[10px] uppercase mr-1">Playbook:</span>
                {playbook ?? "Analyzing structure..."}
            </div>

            {/* 3. Context Lines (V3) */}
            <div className="mt-1 text-[10px] text-zinc-500 font-mono space-y-0.5 border-t border-white/5 pt-2">
                <div>
                    Bias: <span className={bias === 'LONG' ? 'text-emerald-500' : bias === 'SHORT' ? 'text-red-500' : 'text-zinc-400'}>{bias ?? "NEUTRAL"}</span>
                    <span className="opacity-50 mx-1">|</span>
                    EMA20 <span className="text-zinc-300">{Number(ema20)?.toFixed(1) ?? "—"}</span>
                    <span className="opacity-50 mx-1">|</span>
                    EMA50 <span className="text-zinc-300">{Number(ema50)?.toFixed(1) ?? "—"}</span>
                </div>
                <div className="text-zinc-600">
                    {scoreBreakdown ?? ""}
                </div>
            </div>

            {/* 4. Help Toggle (V3 Polish) */}
            <div className="pt-1 border-t border-white/5 mt-1">
                <PanelHelp title="STRUCTURE V3" bullets={[
                    "High Score = Strong Trend (Pullbacks).",
                    "Low Score = Range/Chop (Mean Reversion).",
                    "Signaling: EMA20 > EMA50 = Bullish Bias.",
                    "ADX Strength: <20 Choppy, >25 Trending.",
                    "Playbook: Follow trend or fade extremes."
                ]} />
            </div>
        </div>
    );
}
