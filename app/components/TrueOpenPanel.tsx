import React from 'react';
import { TrueOpenResult, OpenAnchor } from '../lib/trueOpen';
import { getConfidenceColorClass, getStatusFromScore, getStatusBadgeClass, type IndicatorStatus } from '@/app/lib/uiSignalStyles';
import { PanelHelp } from './PanelHelp';

interface TrueOpenPanelProps {
    data: any;
    loading: boolean;
}

function formatAnchorStatus(anchor: OpenAnchor): string {
    const sign = anchor.distancePts >= 0 ? "+" : "";
    const reclaim = anchor.reclaim ? " ↩ RECLAIM" : "";
    return `${anchor.side} · ${sign}${anchor.distancePts.toFixed(1)}pts · ${anchor.displacement}${reclaim}`;
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

    const meta = trueOpen.meta;
    const showReliability = meta && (meta.capApplied || meta.dataAgeMs > 15 * 60_000);

    const dayStatus = formatAnchorStatus(trueOpen.dayAnchor);
    const weekStatus = trueOpen.weekAnchor ? formatAnchorStatus(trueOpen.weekAnchor) : null;

    return (
        <div className={`rounded-xl border bg-white/5 p-4 space-y-4 ${scoreStyle.border}`}>

            {/* HEADER */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="text-orange-400 font-semibold text-sm tracking-wide">
                        TRUE OPEN CONTEXT
                    </div>
                    <div className="text-xs text-white/50">
                        Macro Directional Engine
                    </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                    <div className="flex gap-2">
                        <span className="px-2 py-0.5 rounded-full text-xs bg-white/10 text-white/80">
                            {direction === "LONG" ? "MACRO LONG" :
                                direction === "SHORT" ? "MACRO SHORT" :
                                    "NEUTRAL"}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusBadgeClass}`}>
                            {computedStatus}
                        </span>
                    </div>
                    <div className={`text-lg font-bold ${scoreStyle.text}`}>
                        {score}%
                    </div>
                    {/* Reliability row */}
                    {showReliability && (
                        <div className="text-[9px] text-white/40 font-mono">
                            {meta.sourceUsed}{meta.capApplied
                                ? ` · Raw ${meta.rawScore}% → ${meta.finalScore}%`
                                : ` · Age ${Math.round(meta.dataAgeMs / 60000)}m`}
                        </div>
                    )}
                </div>
            </div>

            {/* PLAYBOOK */}
            <div className="text-sm text-white/80 leading-tight">
                {direction === "LONG" && "Macro bias bullish. Prefer longs on pullbacks into discount."}
                {direction === "SHORT" && "Macro bias bearish. Prefer shorts on rallies into premium."}
                {direction === "NEUTRAL" && "Mixed open context. Wait for alignment with structure."}
            </div>

            {/* ANCHORS */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono border-t border-white/10 pt-3">
                <div>
                    <div className="text-white/50 mb-0.5">DAY OPEN</div>
                    <div className="text-white/80">{dayStatus}</div>
                </div>
                <div>
                    <div className="text-white/50 mb-0.5">WEEK OPEN</div>
                    <div className="text-white/80">{weekStatus ?? "N/A (insufficient week data)"}</div>
                </div>
            </div>

            {/* NOTE */}
            <div className="text-[11px] text-white/40 border-t border-white/10 pt-2">
                Context only. Not an entry trigger. Combine with PSP / Liquidity / Value.
            </div>

            {/* Help */}
            <PanelHelp title="True Open Engine" bullets={[
                "Day Open = RTH 09:30 NY bar open. Week Open = Monday 00:00 NY.",
                "ABOVE/BELOW = directional context vs. the anchor level.",
                "NEAR = within adaptive buffer (ATR×0.15). Treat as neutral.",
                "RECLAIM = price crossed and held 2 closes on the other side.",
                "Use PSP/Liquidity for entry timing — this is macro context only.",
            ]} />
        </div>
    );
}
