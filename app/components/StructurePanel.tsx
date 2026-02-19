import React from "react";
import { IndicatorSignal } from "../lib/types";
import {
    getConfidenceColorClass,
    getStatusFromScore,
    getStatusBadgeClass,
    type IndicatorStatus,
    getDirectionBadgeClass,
} from "@/app/lib/uiSignalStyles";
import { PanelHelp } from "./PanelHelp";

interface StructurePanelProps {
    data: any;
    loading: boolean;
}

export function StructurePanel({ data, loading }: StructurePanelProps) {
    if (loading) {
        return (
            <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-xl h-24" />
        );
    }

    const structure = data?.analysis?.structure as IndicatorSignal;
    if (!structure) return null;

    const score = structure.score ?? 0;
    const direction = (structure.direction ?? "NEUTRAL") as any;

    const debug = (structure.debug || {}) as any;
    const regime = debug?.regime as "TRENDING" | "TRANSITION" | "RANGING" | undefined;
    const strength = debug?.structureStrength as "WEAK" | "MODERATE" | "STRONG" | undefined;
    const adx = debug?.adx as number | undefined;
    const ema20 = debug?.ema20 as number | undefined;
    const ema50 = debug?.ema50 as number | undefined;
    const emaSpreadPct = debug?.emaSpreadPct as number | undefined;
    const bias = debug?.bias as "LONG" | "SHORT" | "NEUTRAL" | undefined;
    const playbook = debug?.playbook as string | undefined;
    const breakdown = debug?.breakdown as { trend?: number; ema?: number; bias?: number; volume?: number } | undefined;
    const volumeState = debug?.volumeState as "CONFIRMATION" | "DIVERGENCE" | "NEUTRAL" | undefined;
    const obvSlope = debug?.obvSlope as number | undefined;

    // ===== OFF CARD (neutral, no confidence glow) =====
    if (structure.status === "OFF") {
        return (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
                <div className="flex items-center justify-between">
                    <div className="text-blue-400 font-semibold tracking-wide text-sm">
                        STRUCTURE
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs bg-white/10 text-white/60">
                        OFF
                    </span>
                </div>
                <div className="text-xs text-white/60">{structure.hint || "Not available."}</div>
            </div>
        );
    }

    // ===== Global confidence colors + status from score =====
    const scoreStyle = getConfidenceColorClass(score);
    const computedStatus: IndicatorStatus = getStatusFromScore(score);
    const statusBadgeClass = getStatusBadgeClass(computedStatus);

    // ===== Reliability meta =====
    const rawMeta = structure.meta;

    // ===== Direction label refinement in TRANSITION =====
    const directionLabel =
        regime === "TRANSITION" && (direction === "LONG" || direction === "SHORT")
            ? `${direction} (Dev)`
            : direction;

    return (
        <div className={`rounded-xl border bg-white/5 p-4 space-y-3 ${scoreStyle.border}`}>
            {/* HEADER GRID: 2 Rows */}
            <div className="space-y-2">
                {/* ROW 1: Title + Context + Score */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="text-blue-400 font-bold tracking-wide text-sm">
                            STRUCTURE
                        </div>
                        <div className="text-xs text-white/50 font-mono">
                            {regime || "—"}
                        </div>
                    </div>
                    <div className={`text-2xl font-bold ${scoreStyle.text}`}>{score}%</div>
                </div>

                {/* ROW 2: Badges (Strength / Volume / Direction / Status) */}
                <div className="flex flex-wrap gap-2 items-center">
                    {/* Strength Badge */}
                    {strength && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${strength === "STRONG" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" :
                                strength === "MODERATE" ? "text-amber-400 border-amber-500/30 bg-amber-500/10" :
                                    "text-zinc-400 border-zinc-700 bg-zinc-800"
                            }`}>
                            {strength}
                        </span>
                    )}
                    {/* Volume Badge */}
                    {volumeState && volumeState !== "NEUTRAL" && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${volumeState === "CONFIRMATION" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" :
                                "text-rose-400 border-rose-500/30 bg-rose-500/10"
                            }`}>
                            {volumeState === "CONFIRMATION" ? "VOL 20" : "DIV 20"}
                        </span>
                    )}

                    <div className="flex-1" />

                    {/* Direction & Status */}
                    <div className="flex gap-1.5 items-center">
                        <span
                            className={getDirectionBadgeClass({
                                direction,
                                score,
                                status: computedStatus,
                            }) + " text-[10px] px-2 py-0.5"}
                        >
                            {directionLabel}
                        </span>

                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadgeClass}`}>
                            {computedStatus}
                        </span>
                    </div>
                </div>
            </div>

            {/* PLAYBOOK */}
            <div className="text-sm text-white/80 leading-tight border-t border-white/5 pt-2">
                <div className="text-[10px] text-white/40 font-bold mb-0.5 uppercase tracking-wider">Playbook</div>
                <span className="text-white/90 font-medium">
                    {playbook || "—"}
                </span>
            </div>

            {/* CONTEXT GRID: 2 Columns */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-white/60 border-t border-white/10 pt-2 font-mono">
                <div className="flex justify-between">
                    <span>Bias</span>
                    <span className={bias === "LONG" ? "text-emerald-400" : bias === "SHORT" ? "text-red-400" : "text-zinc-400"}>
                        {bias || "—"}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span>Spread</span>
                    <span className={typeof emaSpreadPct === 'number' && emaSpreadPct > 0.05 ? "text-white/90" : "text-white/50"}>
                        {typeof emaSpreadPct === "number" ? `${emaSpreadPct.toFixed(3)}%` : "—"}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span>ADX</span>
                    <span className={typeof adx === 'number' && adx > 25 ? "text-amber-400" : "text-white/50"}>
                        {typeof adx === "number" ? adx.toFixed(1) : "—"}
                    </span>
                </div>
                {obvSlope !== undefined && Math.abs(obvSlope) > 0 && (
                    <div className="flex justify-between">
                        <span>OBV Slope</span>
                        <span className={volumeState === "CONFIRMATION" ? "text-emerald-400" : volumeState === "DIVERGENCE" ? "text-rose-400" : "text-white/50"}>
                            {obvSlope > 0 ? "+" : ""}{obvSlope.toFixed(0)}
                        </span>
                    </div>
                )}
            </div>

            {/* SCORE BREAKDOWN */}
            {breakdown && (
                <div className="text-[10px] text-white/40 border-t border-white/5 pt-1.5 space-y-0.5">
                    <div className="flex justify-between">
                        <span>Trend Strength (ADX)</span>
                        <span className="text-white/60">{breakdown.trend ? `+${breakdown.trend}` : "0"}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>EMA Alignment</span>
                        <span className="text-white/60">{breakdown.ema ? `+${breakdown.ema}` : "0"}</span>
                    </div>
                    {breakdown.volume !== undefined && breakdown.volume !== 0 && (
                        <div className="flex justify-between">
                            <span>Volume Confirmation</span>
                            <span className={breakdown.volume > 0 ? "text-emerald-400/80" : "text-rose-400/80"}>
                                {breakdown.volume > 0 ? "+" : ""}{breakdown.volume}
                            </span>
                        </div>
                    )}
                    {breakdown.bias ? (
                        <div className="flex justify-between">
                            <span>Bias Bonus</span>
                            <span className="text-emerald-400/80">+{breakdown.bias}</span>
                        </div>
                    ) : null}
                </div>
            )}

            {/* HELP */}
            <div className="border-t border-white/10 pt-1">
                <PanelHelp
                    title="STRUCTURE V3"
                    bullets={[
                        "Regime: TRENDING (ADX>25), TRANSITION (20-25), RANGING (<20).",
                        "Volume V3: OBV Slope confirms price. Divergence = Fake.",
                        "Strength: ADX + EMA Spread + Volume Confirmation.",
                        "Scenarios Usage: TRENDING structure enables aggressive Trend Following scenarios.",
                        "EMA Spread: >0.05% indicates strong separation."
                    ]}
                />
            </div>
        </div>
    );
}
