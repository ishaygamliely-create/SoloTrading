import React, { useState } from 'react';
import { getConfidenceColorClass, getConfidenceLabel, clampPct } from '@/app/lib/uiSignalStyles';
import { getLiquidityConfidenceScore } from '@/app/lib/liquidityRange';

type LiquidityRangeStatus = "COMPRESSED" | "EXPANDING" | "EXHAUSTED";
type PSPState = "NONE" | "FORMING" | "CONFIRMED";

export interface LiquidityRangeData {
    status: LiquidityRangeStatus;
    adrPercent: number;              // 0–100 (ADR usage)
    expansionLikelihood: number;     // 0–100 (probability)
    hasMajorSweep?: boolean;
    pspState?: PSPState;
    playbook?: string;

    // optional zones
    nearestAbove?: { fvg?: string; pool?: string };
    nearestBelow?: { fvg?: string; pool?: string };

    // optional debug
    checks?: string;
    explanation?: {
        title: string;
        bullets: string[];
    };
}

export function LiquidityPanel({ data, loading }: { data: any, loading: boolean }) {
    if (loading) {
        return <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-xl h-full min-h-[160px]"></div>;
    }

    if (!data?.analysis) return null;

    // --- DATA MAPPING ---
    const lrRaw = data.analysis.liquidityRange || {};
    const fvgs = data.analysis.fvgs || [];
    const pools = data.analysis.liquidity || [];
    const psp = data.analysis.psp || {};

    const currentRange = lrRaw.currentRange || 0;
    const adr = lrRaw.avgRange || 1;
    const adrPercent = adr > 0 ? (currentRange / adr) * 100 : 0;
    const sweepDetected = lrRaw.hasMajorSweep;
    const pspState = (psp.state || 'NONE') as PSPState;

    const { confidenceScore } = getLiquidityConfidenceScore({
        adrPercent: Math.round(adrPercent),
        hasMajorSweep: sweepDetected,
        pspState
    });

    // Derive Status
    let status: LiquidityRangeStatus = "COMPRESSED";
    if (adrPercent < 60) status = "COMPRESSED";
    else if (adrPercent < 85) status = "EXPANDING";
    else status = "EXHAUSTED";

    // Playbook Logic
    const playbook =
        status === "COMPRESSED"
            ? "Wait for Sweep → Displacement (Compression)"
            : status === "EXPANDING"
                ? "Momentum Phase — Trade with Structure"
                : "Exhausted — Prefer Mean Reversion / Take Profits";

    // Nearest Zones logic
    const currentPrice = data.price || 0;
    const fvgsAbove = fvgs.filter((f: any) => f.bottom > currentPrice).sort((a: any, b: any) => a.bottom - b.bottom);
    const fvgsBelow = fvgs.filter((f: any) => f.top < currentPrice).sort((a: any, b: any) => b.top - a.top);
    const poolsAbove = pools.filter((p: any) => p.price > currentPrice).sort((a: any, b: any) => a.price - b.price);
    const poolsBelow = pools.filter((p: any) => p.price < currentPrice).sort((a: any, b: any) => b.price - a.price);

    const checks = `Checks: ADR ${Math.round(adrPercent)}% • Sweep ${sweepDetected ? "YES" : "NO"} • PSP ${pspState} • FVG Proximity • Pools`;

    const liquidityData: LiquidityRangeData = {
        status,
        adrPercent,
        expansionLikelihood: confidenceScore,
        hasMajorSweep: sweepDetected,
        pspState,
        playbook,
        checks,
        nearestAbove: {
            fvg: fvgsAbove.length > 0 ? `${(fvgsAbove[0].bottom as number).toFixed(0)}-${(fvgsAbove[0].top as number).toFixed(0)}` : undefined,
            pool: poolsAbove.length > 0 ? (poolsAbove[0].price as number).toFixed(0) : undefined
        },
        nearestBelow: {
            fvg: fvgsBelow.length > 0 ? `${(fvgsBelow[0].bottom as number).toFixed(0)}-${(fvgsBelow[0].top as number).toFixed(0)}` : undefined,
            pool: poolsBelow.length > 0 ? (poolsBelow[0].price as number).toFixed(0) : undefined
        }
    };

    return <LiquidityPanelContent data={liquidityData} />;
}

function LiquidityPanelContent({ data }: { data: LiquidityRangeData }) {
    if (!data) return null;

    // ✅ ADR Usage must color by adrPercent directly (NOT inverted)
    const adrPct = clampPct(data.adrPercent);

    // ✅ Expansion Probability colors by expansionLikelihood
    const expPct = clampPct(data.expansionLikelihood);

    const adrStyle = getConfidenceColorClass(adrPct);
    const expStyle = getConfidenceColorClass(expPct);

    const adrLabel = getConfidenceLabel(adrPct); // LOW/MID/HIGH
    const expLabel = getConfidenceLabel(expPct);

    const [open, setOpen] = useState(false);

    const title = "LIQUIDITY & RANGE";
    const helpTitle = data.explanation?.title ?? "What Liquidity & Range checks";
    const helpBullets = data.explanation?.bullets ?? [
        "ADR Usage: how much of today's Average Daily Range is already used.",
        "Compression: low ADR usage → expansion risk increases.",
        "Sweep + Displacement: higher-quality breakout conditions.",
        "PSP: Precision Swing Point can improve expansion follow-through.",
        "Nearest zones: closest FVG / Liquidity Pool above & below price.",
    ];

    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <button
                    type="button"
                    onClick={() => setOpen(v => !v)}
                    className="text-left"
                    title="Click for explanation"
                >
                    <div className="text-cyan-300 font-extrabold tracking-widest text-lg">
                        {title}
                    </div>
                </button>

                <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${data.status === "COMPRESSED"
                        ? "bg-yellow-500/20 text-yellow-300"
                        : data.status === "EXPANDING"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-red-500/20 text-red-300"
                        }`}
                >
                    {data.status}
                </span>
            </div>

            {/* Playbook */}
            <div className="text-sm text-white/80">
                <span className="font-semibold text-white">PLAYBOOK:</span>{" "}
                <span className="text-sky-300 font-semibold">
                    {data.playbook ?? (data.status === "COMPRESSED"
                        ? "Wait for Sweep → Displacement (Compression)"
                        : data.status === "EXPANDING"
                            ? "Momentum Phase — Trade with Structure"
                            : "Exhausted — Prefer Mean Reversion / Take Profits")}
                </span>
            </div>

            {/* Expansion Probability */}
            <div className="space-y-1">
                <div className="flex items-center justify-between text-sm text-white/80">
                    <span>Expansion Probability</span>
                    <span className={`font-bold ${expStyle.text}`}>
                        {expPct}% <span className="text-xs opacity-70">{expLabel}</span>
                    </span>
                </div>
                <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                        className={`h-full ${expStyle.bar}`}
                        style={{ width: `${expPct}%` }}
                    />
                </div>
            </div>

            {/* ADR Usage (✅ follows law colors) */}
            <div className="flex items-baseline justify-between pt-2">
                <div className="text-white/60 text-sm">ADR Usage</div>
                <div className="flex items-baseline gap-2">
                    <div className={`text-3xl font-extrabold ${adrStyle.text}`}>
                        {adrPct}%
                    </div>
                    <div className={`text-xs font-bold ${adrStyle.text}`}>
                        {adrLabel}
                    </div>
                </div>
            </div>

            {/* Nearest zones */}
            <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                    <div className="text-xs text-white/50 mb-1">NEAREST ABOVE</div>
                    <div className="space-y-2">
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                            <div className="text-xs text-white/40 mb-1">FVG</div>
                            <div className="text-sm text-white/80">
                                {data.nearestAbove?.fvg ?? "No FVG"}
                            </div>
                        </div>
                        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                            <div className="text-xs text-white/40 mb-1">Pool</div>
                            <div className="text-sm text-white/80">
                                {data.nearestAbove?.pool ?? "—"}
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <div className="text-xs text-white/50 mb-1">NEAREST BELOW</div>
                    <div className="space-y-2">
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                            <div className="text-xs text-white/40 mb-1">FVG</div>
                            <div className="text-sm text-white/80">
                                {data.nearestBelow?.fvg ?? "No FVG"}
                            </div>
                        </div>
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                            <div className="text-xs text-white/40 mb-1">Pool</div>
                            <div className="text-sm text-white/80">
                                {data.nearestBelow?.pool ?? "—"}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Checks line */}
            <div className="pt-1 text-[11px] text-white/40 font-mono">
                {data.checks ?? `Checks: ADR ${adrPct}% • Sweep ${data.hasMajorSweep ? "YES" : "NO"} • PSP ${data.pspState ?? "NONE"} • FVG Proximity • Pools`}
            </div>

            {/* Click-to-explain */}
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="text-xs text-white/60 hover:text-white/80 flex items-center gap-2 pt-1"
            >
                <span className="opacity-70">▶</span>
                <span>{helpTitle} (click)</span>
            </button>

            {open && (
                <div className="mt-2 rounded-xl border border-white/10 bg-black/20 p-3 space-y-2">
                    <div className="text-sm font-semibold text-white/80">{helpTitle}</div>
                    <ul className="list-disc pl-5 space-y-1 text-xs text-white/60">
                        {helpBullets.map((b, i) => (
                            <li key={i}>{b}</li>
                        ))}
                    </ul>
                    <div className="text-[11px] text-white/40">
                        Color = strength (0–59 red, 60–74 yellow, 75–100 green). Direction colors are separate.
                    </div>
                </div>
            )}
        </div>
    );
}
