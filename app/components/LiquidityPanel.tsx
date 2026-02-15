import React from 'react';
import { getConfidenceColorClass, getConfidenceTone } from '@/app/lib/uiSignalStyles';
import { PanelHelp } from '@/app/components/PanelHelp';
import { getLiquidityConfidenceScore } from '@/app/lib/liquidityRange';

type LRStatus = "COMPRESSED" | "EXPANDING" | "EXHAUSTED" | "UNKNOWN";

type LiquidityRange = {
    status: LRStatus;
    currentRange: number;
    avgRange: number;       // ADR
    adrPercent: number;     // 0-100 (range/adr*100)
    expansionLikelihood: number; // 0-100
    hasMajorSweep?: boolean;
    pspState?: "NONE" | "FORMING" | "CONFIRMED";
    hint?: string;

    nearestAbove?: { fvg?: string | null; pool?: string | null };
    nearestBelow?: { fvg?: string | null; pool?: string | null };
};

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
    const adrPercent = adr > 0 ? Math.round((currentRange / adr) * 100) : 0;
    const sweepDetected = lrRaw.hasMajorSweep;
    const pspState = (psp.state || 'NONE') as "NONE" | "FORMING" | "CONFIRMED";

    const { confidenceScore } = getLiquidityConfidenceScore({
        adrPercent,
        hasMajorSweep: sweepDetected,
        pspState
    });

    // Derive Status
    let status: LRStatus = "UNKNOWN";
    if (adrPercent < 60) status = "COMPRESSED";
    else if (adrPercent < 85) status = "EXPANDING";
    else status = "EXHAUSTED";

    // Nearest Zones logic
    const currentPrice = data.price || 0;
    const fvgsAbove = fvgs.filter((f: any) => f.bottom > currentPrice).sort((a: any, b: any) => a.bottom - b.bottom);
    const fvgsBelow = fvgs.filter((f: any) => f.top < currentPrice).sort((a: any, b: any) => b.top - a.top);
    const poolsAbove = pools.filter((p: any) => p.price > currentPrice).sort((a: any, b: any) => a.price - b.price);
    const poolsBelow = pools.filter((p: any) => p.price < currentPrice).sort((a: any, b: any) => b.price - a.price);

    const liquidityData: LiquidityRange = {
        status,
        currentRange,
        avgRange: adr,
        adrPercent,
        expansionLikelihood: confidenceScore,
        hasMajorSweep: sweepDetected,
        pspState,
        nearestAbove: {
            fvg: fvgsAbove.length > 0 ? `${(fvgsAbove[0].bottom as number).toFixed(0)}-${(fvgsAbove[0].top as number).toFixed(0)}` : null,
            pool: poolsAbove.length > 0 ? (poolsAbove[0].price as number).toFixed(0) : null
        },
        nearestBelow: {
            fvg: fvgsBelow.length > 0 ? `${(fvgsBelow[0].bottom as number).toFixed(0)}-${(fvgsBelow[0].top as number).toFixed(0)}` : null,
            pool: poolsBelow.length > 0 ? (poolsBelow[0].price as number).toFixed(0) : null
        }
    };

    return <LiquidityPanelInternal data={liquidityData} />;
}

function LiquidityPanelInternal({ data }: { data?: LiquidityRange | null }) {
    if (!data) return null;

    // Confidence scores (0–100)
    const adrScore = Math.max(0, Math.min(100, Math.round(100 - data.adrPercent)));
    // NOTE: adrPercent low => compressed => higher "setup potential".
    // Using simple mapping: < 60% compressed (Score > 40), > 85% exhausted (Score < 15)
    // Actually, let's strictly follow the user's logic or a reasonable interpretation.
    // User code: const adrScore = Math.max(0, Math.min(100, Math.round(100 - data.adrPercent))); 

    const expScore = Math.max(0, Math.min(100, Math.round(data.expansionLikelihood)));

    const adrStyle = getConfidenceColorClass(adrScore);
    const expStyle = getConfidenceColorClass(expScore);

    const adrTone = getConfidenceTone(adrScore); // LOW/MID/HIGH

    // Override status badge colors if needed, or rely on hardcoded ones from user example
    const statusBadge =
        data.status === "COMPRESSED"
            ? "bg-yellow-500/15 text-yellow-300 border border-yellow-500/30"
            : data.status === "EXPANDING"
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                : data.status === "EXHAUSTED"
                    ? "bg-red-500/15 text-red-300 border border-red-500/30"
                    : "bg-white/10 text-white/60 border border-white/10";

    const aboveFvg = data.nearestAbove?.fvg ?? null;
    const abovePool = data.nearestAbove?.pool ?? null;
    const belowFvg = data.nearestBelow?.fvg ?? null;
    const belowPool = data.nearestBelow?.pool ?? null;

    const Card = ({ label, value, tone }: { label: string; value: string; tone: "ABOVE" | "BELOW" }) => {
        const base = "rounded-lg border p-3 text-xs";
        const cls =
            tone === "ABOVE"
                ? "border-red-500/25 bg-red-500/5 text-red-100" // Added text color for readability
                : "border-emerald-500/25 bg-emerald-500/5 text-emerald-100";
        return (
            <div className={`${base} ${cls}`}>
                <div className="text-white/50 mb-1 font-semibold">{label}</div>
                <div className="space-y-1">
                    <div className="text-white/90 font-mono tracking-tight">{value}</div>
                </div>
            </div>
        );
    };

    // Playbook text
    const playbook =
        data.status === "COMPRESSED"
            ? "Wait for Sweep → Displacement"
            : data.status === "EXPANDING"
                ? "Momentum Phase — Trade with Structure"
                : data.status === "EXHAUSTED"
                    ? "Exhaustion — Prefer Mean Reversion"
                    : "Observe";

    const checks = [
        `ADR ${data.adrPercent}%`,
        `Sweep ${data.hasMajorSweep ? "YES" : "NO"}`,
        `PSP ${data.pspState ?? "NONE"}`,
        `FVG Proximity`,
        `Pools`,
    ].join("  •  ");

    return (
        <div className={`rounded-2xl border border-white/10 bg-white/5 p-5 ${expStyle.ring}`}>
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-cyan-300 font-semibold tracking-[0.2em] text-sm">
                        LIQUIDITY & RANGE
                    </div>
                    <div className="mt-1 text-sm text-white/80">
                        <span className="text-white/60 font-semibold">PLAYBOOK:</span>{" "}
                        <span className="text-sky-300 font-semibold">{playbook}</span>{" "}
                        {data.status ? <span className="text-white/50">({data.status})</span> : null}
                    </div>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBadge}`}>
                    {data.status}
                </span>
            </div>

            {/* Expansion Probability */}
            <div className="mt-4">
                <div className="flex items-center justify-between text-sm text-white/80">
                    <span>Expansion Probability</span>
                    <span className={`${expStyle.text} font-bold`}>{expScore}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className={`h-full ${expStyle.bar}`} style={{ width: `${expScore}%` }} />
                </div>
            </div>

            {/* ADR Usage (score-colored) */}
            <div className="mt-5 flex items-center justify-between">
                <div className="text-white/60">ADR Usage</div>
                <div className="flex items-baseline gap-3">
                    {/* show adrPercent but color by adrScore tone */}
                    <div className="text-3xl font-extrabold text-white">{data.adrPercent}%</div>
                    <div className={`text-sm font-bold ${adrStyle.text}`}>{adrTone}</div>
                </div>
            </div>

            {/* Nearest zones */}
            <div className="mt-5 grid grid-cols-2 gap-3">
                <div>
                    <div className="text-xs text-white/50 mb-2 uppercase tracking-wide font-bold">Nearest Above</div>
                    <Card
                        label="FVG"
                        value={aboveFvg ? `${aboveFvg}` : "No FVG"}
                        tone="ABOVE"
                    />
                    <div className="mt-2">
                        <Card
                            label="Pool"
                            value={abovePool ? `${abovePool}` : "No Pool"}
                            tone="ABOVE"
                        />
                    </div>
                </div>

                <div>
                    <div className="text-xs text-white/50 mb-2 uppercase tracking-wide font-bold">Nearest Below</div>
                    <Card
                        label="FVG"
                        value={belowFvg ? `${belowFvg}` : "No FVG"}
                        tone="BELOW"
                    />
                    <div className="mt-2">
                        <Card
                            label="Pool"
                            value={belowPool ? `${belowPool}` : "No Pool"}
                            tone="BELOW"
                        />
                    </div>
                </div>
            </div>

            {/* Hint */}
            {data.hint ? (
                <div className="mt-4 text-sm text-white/70">
                    {data.hint}
                </div>
            ) : null}

            {/* Checks line */}
            <div className="mt-3 text-[11px] text-white/40 font-mono text-center">
                Checks: {checks}
            </div>

            {/* (6) Explanation toggle */}
            <PanelHelp title="Liquidity & Range">
                <div className="space-y-2">
                    <div>
                        <span className="font-semibold text-white/85">What it checks:</span>{" "}
                        Measures how much today’s range is using the Average Daily Range (ADR), and whether conditions suggest an
                        upcoming expansion move.
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                        <li><b>ADR Usage</b> = current range / ADR (low usage = “compressed”).</li>
                        <li><b>Sweep</b> = signs of liquidity grab near prior highs/lows.</li>
                        <li><b>PSP</b> = Precision Swing Point setup state (NONE/FORMING/CONFIRMED).</li>
                        <li><b>Nearest Above/Below</b> = closest FVG/Pool zones around price.</li>
                    </ul>
                    <div>
                        <span className="font-semibold text-white/85">How to read:</span>{" "}
                        COMPRESSED + Sweep/PSP strength → expansion odds increase. EXPANDING → trade with structure/momentum.
                        EXHAUSTED → be cautious, mean reversion more likely.
                    </div>
                    <div className="text-white/55">
                        Note: Colors on score show strength (not direction). LONG/SHORT elsewhere shows direction.
                    </div>
                </div>
            </PanelHelp>
        </div>
    );
}
