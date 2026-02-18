import React from 'react';
import { IndicatorSignal } from '../lib/types';
import { TrueOpenResult, OpenAnchor } from '../lib/trueOpen';
import { getConfidenceColorClass, getStatusFromScore, getStatusBadgeClass, type IndicatorStatus } from '@/app/lib/uiSignalStyles';
import { PanelHelp } from './PanelHelp';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface TrueOpenPanelProps {
    data: any;
    loading: boolean;
}

function AnchorRow({ anchor }: { anchor: OpenAnchor }) {
    const sideColor =
        anchor.side === "ABOVE" ? "text-emerald-400" :
            anchor.side === "BELOW" ? "text-red-400" :
                "text-zinc-400";

    const dispColor =
        anchor.displacement === "STRONG" ? "text-white" :
            anchor.displacement === "MED" ? "text-white/70" :
                "text-zinc-500";

    const SideIcon =
        anchor.side === "ABOVE" ? ArrowUp :
            anchor.side === "BELOW" ? ArrowDown :
                Minus;

    const sign = anchor.distancePts >= 0 ? "+" : "";

    return (
        <div className="flex items-center justify-between text-[10px] font-mono bg-white/5 rounded px-2 py-1.5 border border-white/5">
            {/* Left: label + side */}
            <div className="flex items-center gap-1.5">
                <span className="text-zinc-500 uppercase font-bold w-10">{anchor.label}</span>
                <SideIcon size={10} className={sideColor} />
                <span className={`font-bold uppercase ${sideColor}`}>{anchor.side}</span>
                {anchor.reclaim && (
                    <span className="text-amber-400 text-[9px] font-bold ml-1">↩ RECLAIM</span>
                )}
            </div>

            {/* Right: distance + displacement */}
            <div className="flex items-center gap-2 text-right">
                <span className="text-zinc-400">{sign}{anchor.distancePts.toFixed(1)}pts</span>
                <span className={`uppercase font-bold ${dispColor}`}>{anchor.displacement}</span>
            </div>
        </div>
    );
}

export function TrueOpenPanel({ data, loading }: TrueOpenPanelProps) {
    if (loading) return <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-xl h-24" />;

    const trueOpen = data?.analysis?.trueOpen as TrueOpenResult | undefined;
    if (!trueOpen || trueOpen.status === 'OFF') return null;

    const score = trueOpen.score;
    const direction = trueOpen.direction;
    const scoreStyle = getConfidenceColorClass(score);
    const computedStatus: IndicatorStatus = getStatusFromScore(score);
    const statusBadgeClass = getStatusBadgeClass(computedStatus);

    const dirClass =
        direction === "LONG" ? "text-emerald-400" :
            direction === "SHORT" ? "text-red-400" :
                "text-zinc-500";

    const meta = trueOpen.meta;
    const showReliability = meta && (meta.capApplied || meta.dataAgeMs > 15 * 60_000);

    return (
        <div className={`rounded-xl border bg-white/5 p-4 space-y-3 ${scoreStyle.border}`}>
            {/* Header: TRUE OPEN | Direction | Status | Score */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-orange-400 tracking-wide text-sm">TRUE OPEN</span>
                    <div className="h-4 w-px bg-white/10" />
                    <span className={`text-xs font-bold uppercase ${dirClass}`}>
                        {direction}
                    </span>
                    <div className="h-4 w-px bg-white/10" />
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${statusBadgeClass}`}>
                        {computedStatus}
                    </span>
                </div>
                <div className={`text-xl font-bold ${scoreStyle.text}`}>
                    {score}%
                </div>
            </div>

            {/* Reliability row */}
            {showReliability && (
                <div className="text-[9px] text-white/40 text-right font-mono">
                    {meta.source}{meta.capApplied
                        ? ` · Raw ${meta.rawScore}% → ${meta.finalScore}%`
                        : ` · Age ${Math.round(meta.dataAgeMs / 60000)}m`}
                </div>
            )}

            {/* Row A: Day Open */}
            <AnchorRow anchor={trueOpen.dayAnchor} />

            {/* Row B: Week Open */}
            {trueOpen.weekAnchor && <AnchorRow anchor={trueOpen.weekAnchor} />}

            {/* Help */}
            <div className="pt-1 border-t border-white/5">
                <PanelHelp title="True Open Engine" bullets={[
                    "Day Open = RTH 09:30 NY open. Week Open = Monday 00:00 NY.",
                    "ABOVE/BELOW = directional context vs. the anchor level.",
                    "NEAR = within adaptive buffer (ATR×0.15). Treat as neutral.",
                    "RECLAIM = price crossed and held 2 closes on the other side.",
                    "Use PSP/Liquidity for entry timing — this is macro context only.",
                ]} />
            </div>
        </div>
    );
}
