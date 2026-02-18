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
    const adx = debug?.adx as number | undefined;
    const ema20 = debug?.ema20 as number | undefined;
    const ema50 = debug?.ema50 as number | undefined;
    const bias = debug?.bias as "LONG" | "SHORT" | "NEUTRAL" | undefined;
    const playbook = debug?.playbook as string | undefined;
    const breakdown = debug?.breakdown as { trend?: number; ema?: number; bias?: number } | undefined;

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

    // ===== Direction label refinement in TRANSITION =====
    const directionLabel =
        regime === "TRANSITION" && (direction === "LONG" || direction === "SHORT")
            ? `${direction} (Developing)`
            : direction;

    // ===== EMA spread =====
    const spread =
        typeof ema20 === "number" && typeof ema50 === "number"
            ? ema20 - ema50
            : null;

    const spreadText =
        spread === null
            ? "—"
            : `${spread >= 0 ? "+" : ""}${spread.toFixed(1)}`;

    return (
        <div className={`rounded-xl border bg-white/5 p-4 space-y-3 ${scoreStyle.border}`}>
            {/* HEADER */}
            <div className="flex items-start justify-between min-w-0">
                <div className="min-w-0">
                    <div className="text-blue-400 font-semibold tracking-wide text-sm">
                        STRUCTURE
                    </div>
                    <div className="text-xs text-white/50 mt-0.5">
                        Regime: {regime || "—"}
                    </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="flex gap-2">
                        <span
                            className={getDirectionBadgeClass({
                                direction,
                                score,
                                status: computedStatus,
                            })}
                            title="Direction is derived from EMA20 vs EMA50"
                        >
                            {directionLabel}
                        </span>

                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusBadgeClass}`}>
                            {computedStatus}
                        </span>
                    </div>

                    <div className={`text-lg font-bold ${scoreStyle.text}`}>{score}%</div>
                </div>
            </div>

            {/* PLAYBOOK */}
            <div className="text-sm text-white/80 leading-tight">
                PLAYBOOK:{" "}
                <span className="text-white/90 font-semibold">
                    {playbook ||
                        (regime === "TRENDING"
                            ? "Trend mode → trade pullbacks with structure."
                            : regime === "RANGING"
                                ? "Range mode → fade extremes / mean reversion."
                                : "Transition → wait for breakout confirmation.")}
                </span>
            </div>

            {/* CONTEXT */}
            <div className="text-xs text-white/60 border-t border-white/10 pt-2 font-mono">
                Bias:{" "}
                <span
                    className={
                        bias === "LONG"
                            ? "text-emerald-400"
                            : bias === "SHORT"
                                ? "text-red-400"
                                : "text-zinc-400"
                    }
                >
                    {bias || "—"}
                </span>
                <span className="mx-1">|</span>
                EMA20 <span className="text-white/80">{typeof ema20 === "number" ? ema20.toFixed(1) : "—"}</span>
                <span className="mx-1">|</span>
                EMA50 <span className="text-white/80">{typeof ema50 === "number" ? ema50.toFixed(1) : "—"}</span>
                <span className="mx-1">|</span>
                Spread <span className="text-white/80">{spreadText}</span>
                <span className="mx-1">|</span>
                ADX <span className="text-white/80">{typeof adx === "number" ? adx.toFixed(1) : "—"}</span>
            </div>

            {/* SCORE BREAKDOWN */}
            {breakdown && (
                <div className="text-xs text-white/50 border-t border-white/10 pt-2 space-y-0.5">
                    <div className="font-semibold text-white/60">Score Breakdown</div>
                    <div>+{breakdown.trend ?? 0} Trend Strength</div>
                    <div>+{breakdown.ema ?? 0} EMA Alignment</div>
                    <div>+{breakdown.bias ?? 0} Bias Alignment</div>
                </div>
            )}

            {/* HELP */}
            <div className="border-t border-white/10 pt-2">
                <PanelHelp
                    title="STRUCTURE"
                    bullets={[
                        "Checks: Market regime using ADX + EMA alignment.",
                        "Direction comes from EMA20 vs EMA50. Strength comes from ADX.",
                        "ADX < 20 = Chop/Range (mean reversion).",
                        "ADX 20–25 = Transition (wait for confirmation).",
                        "ADX > 25 = Trend (trade pullbacks).",
                        "Color/Status reflect confidence strength, not direction.",
                    ]}
                />
            </div>
        </div>
    );
}
