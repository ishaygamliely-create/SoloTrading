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

    // ✅ CORE PANEL: Only hide if no data
    if (!structure) return null;

    // --- Extract Data ---
    const score = structure.score;
    const direction = structure.direction;
    const { regime, adx, ema20, ema50, bias, playbook, breakdown } = (structure.debug || {}) as any;

    // --- Styling ---
    const scoreStyle = getConfidenceColorClass(score);
    const computedStatus: IndicatorStatus = getStatusFromScore(score);
    const statusBadgeClass = getStatusBadgeClass(computedStatus);

    return (
        <div className={`rounded-xl border bg-white/5 p-4 space-y-3 ${scoreStyle.border}`}>

            {/* HEADER */}
            <div className="flex items-start justify-between">
                <div className="min-w-0">
                    <div className="text-blue-400 font-semibold tracking-wide text-sm">
                        STRUCTURE
                    </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="flex gap-2">
                        <span className="px-2 py-0.5 rounded-full text-xs bg-white/10 text-white/80">
                            {direction}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusBadgeClass}`}>
                            {computedStatus}
                        </span>
                    </div>
                    <div className={`text-lg font-bold ${scoreStyle.text}`}>
                        {score}%
                    </div>
                </div>
            </div>

            {/* PLAYBOOK */}
            <div className="text-sm text-white/80 leading-tight">
                {playbook || (
                    regime === "TRENDING" ? "Trend mode → trade pullbacks with structure." :
                        regime === "RANGING" ? "Range mode → fade extremes / mean reversion." :
                            regime === "TRANSITION" ? "Transition → wait for breakout confirmation." :
                                "Analyzing market structure..."
                )}
            </div>

            {/* CONTEXT */}
            <div className="text-xs text-white/60 border-t border-white/10 pt-2 font-mono">
                Bias: <span className={bias === 'LONG' ? 'text-emerald-400' : bias === 'SHORT' ? 'text-red-400' : 'text-zinc-400'}>{bias || "—"}</span>
                <span className="mx-1">|</span>
                EMA20 <span className="text-white/80">{ema20?.toFixed(1) || "—"}</span>
                <span className="mx-1">|</span>
                EMA50 <span className="text-white/80">{ema50?.toFixed(1) || "—"}</span>
            </div>

            {/* SCORE BREAKDOWN */}
            {breakdown && (
                <div className="text-xs text-white/50 border-t border-white/10 pt-2 space-y-0.5">
                    <div className="font-semibold text-white/60">Score Breakdown:</div>
                    <div>+{breakdown.trend} Trend Strength (ADX {adx?.toFixed(1) || "—"})</div>
                    <div>+{breakdown.ema} EMA Alignment</div>
                    <div>+{breakdown.bias} Bias Alignment</div>
                </div>
            )}

            {/* HELP */}
            <div className="border-t border-white/10 pt-2">
                <PanelHelp title="Structure V4" bullets={[
                    "Measures market regime using ADX + EMA alignment.",
                    "ADX < 20 → Chop/Range.",
                    "ADX 20-25 → Transition.",
                    "ADX > 25 → Trending.",
                    "Score reflects structural strength, not direction."
                ]} />
            </div>

        </div>
    );
}

