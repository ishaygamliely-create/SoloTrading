import React from 'react';
import { TrueOpenResult, TrueOpenAlignment, OpenAnchor } from '../lib/trueOpen';
import { getConfidenceColorClass, getStatusFromScore, getStatusBadgeClass, type IndicatorStatus } from '@/app/lib/uiSignalStyles';
import { PanelHelp } from './PanelHelp';

interface TrueOpenPanelProps {
    data: any;
    loading: boolean;
}

// ── Alignment badge style ──────────────────────────────────────────
function getAlignmentBadge(alignment: TrueOpenAlignment): { label: string; cls: string } {
    switch (alignment) {
        case "ALIGNED_BULL": return { label: "ALIGNED ▲", cls: "bg-emerald-900/60 text-emerald-300 border border-emerald-700/50" };
        case "ALIGNED_BEAR": return { label: "ALIGNED ▼", cls: "bg-red-900/60 text-red-300 border border-red-700/50" };
        case "MIXED": return { label: "MIXED", cls: "bg-amber-900/60 text-amber-300 border border-amber-700/50" };
        case "NEAR": return { label: "NEAR", cls: "bg-zinc-800 text-zinc-400 border border-zinc-700" };
    }
}

// ── Anchor row ─────────────────────────────────────────────────────
function AnchorRow({ anchor, label }: { anchor: OpenAnchor | null; label: string }) {
    if (!anchor) {
        return (
            <div>
                <div className="text-white/40 text-[10px] uppercase tracking-wide mb-0.5">{label}</div>
                <div className="text-white/30 text-xs font-mono">N/A (provider/week data missing)</div>
            </div>
        );
    }
    const sign = anchor.distancePts >= 0 ? "+" : "";
    const sideColor =
        anchor.side === "ABOVE" ? "text-emerald-400" :
            anchor.side === "BELOW" ? "text-red-400" :
                "text-zinc-400";
    return (
        <div>
            <div className="text-white/40 text-[10px] uppercase tracking-wide mb-0.5">{label}</div>
            <div className={`text-xs font-mono font-semibold ${sideColor}`}>{anchor.side}</div>
            <div className="text-[11px] text-white/60 font-mono">
                {sign}{anchor.distancePts.toFixed(1)}pts · {anchor.displacement}
                {anchor.reclaim && <span className="text-amber-400 ml-1">↩ RECLAIM</span>}
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────

export function TrueOpenPanel({ data, loading }: TrueOpenPanelProps) {
    if (loading) return <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-xl h-24" />;

    const trueOpen = data?.analysis?.trueOpen as TrueOpenResult | undefined;
    if (!trueOpen || trueOpen.status === 'OFF') return null;

    const score = trueOpen.score;
    const alignment: TrueOpenAlignment = trueOpen.alignment ?? "NEAR";
    const scoreStyle = getConfidenceColorClass(score);
    const computedStatus: IndicatorStatus = getStatusFromScore(score);
    const statusBadgeClass = getStatusBadgeClass(computedStatus);
    const alignBadge = getAlignmentBadge(alignment);

    const meta = trueOpen.meta;
    const showReliability = meta && (meta.capApplied || meta.dataAgeMs > 15 * 60_000);

    return (
        <div className={`rounded-xl border bg-white/5 p-4 space-y-3 ${scoreStyle.border}`}>

            {/* ── HEADER ──────────────────────────────────────────── */}
            <div className="flex items-start justify-between gap-2">
                <div>
                    <div className="text-orange-400 font-semibold text-sm tracking-wide">
                        TRUE OPEN CONTEXT
                    </div>
                    <div className="text-[10px] text-white/40 mt-0.5">
                        Macro context engine · not an entry trigger
                    </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="flex gap-1.5 flex-wrap justify-end">
                        {/* Alignment badge */}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${alignBadge.cls}`}>
                            {alignBadge.label}
                        </span>
                        {/* Status badge */}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadgeClass}`}>
                            {computedStatus}
                        </span>
                    </div>
                    {/* Score = clarity */}
                    <div className="flex items-baseline gap-1">
                        <span className={`text-xl font-bold ${scoreStyle.text}`}>{score}%</span>
                        <span className="text-[9px] text-white/30 font-mono">clarity</span>
                    </div>
                    {/* Reliability row */}
                    {showReliability && (
                        <div className="text-[9px] text-white/40 font-mono text-right">
                            {meta.sourceUsed}
                            {meta.capApplied
                                ? ` · Raw ${meta.rawScore}% → ${meta.finalScore}%`
                                : ` · Age ${Math.round(meta.dataAgeMs / 60000)}m`}
                            {meta.capReason && <span className="text-white/30"> ({meta.capReason})</span>}
                        </div>
                    )}
                </div>
            </div>

            {/* ── MACRO CONTEXT ────────────────────────────────────── */}
            <div className="text-xs text-white/70 italic border-l-2 border-orange-500/40 pl-2">
                {trueOpen.macroContext ?? trueOpen.hint}
            </div>

            {/* ── GUIDANCE (value-aware) ────────────────────────────── */}
            {trueOpen.guidance && (
                <div className="text-xs text-white/85 bg-white/5 rounded-lg px-3 py-2 border border-white/8 leading-snug">
                    <span className="text-white/40 text-[10px] uppercase tracking-wide mr-1">Guidance</span>
                    {trueOpen.guidance}
                </div>
            )}

            {/* ── ANCHOR GRID ──────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 border-t border-white/8 pt-3">
                <AnchorRow anchor={trueOpen.dayAnchor} label="Day Open" />
                <AnchorRow anchor={trueOpen.weekAnchor} label="Week Open" />
            </div>

            {/* ── HELP ─────────────────────────────────────────────── */}
            <div className="pt-1 border-t border-white/8">
                <PanelHelp title="True Open Context" bullets={[
                    "Score = clarity of macro context, NOT directional strength.",
                    "High score = strong displacement from open → clear context.",
                    "ALIGNED = day + week on same side. MIXED = they disagree.",
                    "Guidance combines macro context with current ValueZone.",
                    "Not an entry trigger. Use PSP/Liquidity for timing.",
                ]} />
            </div>
        </div>
    );
}
