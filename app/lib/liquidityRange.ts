
import type { IndicatorSignal } from "@/app/lib/types";
import { applyReliability } from "@/app/lib/reliability";

export type LiquidityConfidenceResult = {
    confidenceScore: number;
    factors: string[];
    mappingText: string;
};

export function getLiquidityConfidenceScore(opts: {
    adrPercent: number; // 0-100
    hasMajorSweep: boolean;
    pspState?: "NONE" | "FORMING" | "CONFIRMED";
}): LiquidityConfidenceResult {
    const factors: string[] = [];
    let score = 0;

    const adr = opts.adrPercent;

    // --- Compression contribution ---
    if (adr <= 35) {
        score += 40;
        factors.push("Compression <=35% (+40)");
    } else if (adr <= 50) {
        score += 25;
        factors.push("Compression <=50% (+25)");
    } else if (adr <= 70) {
        score += 10;
        factors.push("Compression <=70% (+10)");
    } else {
        factors.push("Low compression (+0)");
    }

    // --- Sweep contribution ---
    if (opts.hasMajorSweep) {
        score += 25;
        factors.push("Major sweep (+25)");
    }

    // --- PSP contribution ---
    if (opts.pspState === "CONFIRMED") {
        score += 25;
        factors.push("PSP confirmed (+25)");
    } else if (opts.pspState === "FORMING") {
        score += 15;
        factors.push("PSP forming (+15)");
    }

    score = Math.max(0, Math.min(100, score));

    return {
        confidenceScore: score,
        factors,
        mappingText: `ADR ${adr.toFixed(0)}% | Sweep ${opts.hasMajorSweep ? "Yes" : "No"} | PSP ${opts.pspState ?? "None"}`,
    };
}

export function getLiquiditySignal(data: any): IndicatorSignal {
    const lrRaw = data?.analysis?.liquidityRange;
    if (!lrRaw) {
        return {
            status: "OFF", direction: "NEUTRAL", score: 0, hint: "No liquidity data",
            debug: { factors: [] }
        };
    }

    const { currentRange = 0, avgRange = 1, hasMajorSweep } = lrRaw;
    const adrPercent = avgRange > 0 ? (currentRange / avgRange) * 100 : 0;
    const pspState = data.analysis?.psp?.state || 'NONE';

    // Calculation
    const { confidenceScore, factors } = getLiquidityConfidenceScore({
        adrPercent,
        hasMajorSweep,
        pspState
    });

    // Derive State
    let state = "COMPRESSED";
    if (adrPercent >= 60) state = "EXPANDING";
    if (adrPercent >= 85) state = "EXHAUSTED";

    // Playbook Hint
    let hint = "Wait for Sweep → Displacement.";
    if (state === "EXPANDING") hint = "Momentum Phase: Trade with structure.";
    if (state === "EXHAUSTED") hint = "Range Exhausted: Prefer mean reversion.";

    // Map to Standard Status
    let status: "OK" | "WARN" | "OFF" | "BLOCKED" = "OK";
    if (state === "EXHAUSTED") status = "WARN";

    // Nearest Zones (Calculated here for debug/display)
    const currentPrice = data.price || 0;
    const fvgs = data.analysis?.fvgs || [];
    const pools = data.analysis?.liquidity || [];

    // Simple filter
    const fvgsAbove = fvgs.filter((f: any) => f.bottom > currentPrice).length;
    const fvgsBelow = fvgs.filter((f: any) => f.top < currentPrice).length;

    // Reliability (Liquidity uses 15m data — same bar as structure)
    const lastBarMs = data?.analysis?.liquidityRange?.lastBarTimeMs
        ?? (Date.now() - 20 * 60_000);
    const reliability = applyReliability({
        rawScore: confidenceScore,
        lastBarTimeMs: lastBarMs,
        source: "YAHOO",
        marketStatus: "OPEN",
    });

    return {
        status,
        direction: "NEUTRAL",
        score: Math.round(reliability.finalScore),
        hint,
        debug: {
            factors,
            state,
            adrPercent: adrPercent.toFixed(1),
            fvgsAbove,
            fvgsBelow,
            sweep: hasMajorSweep,
            psp: pspState
        },
        meta: {
            rawScore: Math.round(confidenceScore),
            finalScore: Math.round(reliability.finalScore),
            source: "YAHOO" as const,
            dataAgeMs: reliability.dataAgeMs,
            lastBarTimeMs: lastBarMs,
            capApplied: reliability.capApplied,
        },
    };
}

// RESTORED FUNCTIONS FOR API COMPATIBILITY

export function getRangeStatus(current: number, avg: number): "COMPRESSED" | "EXPANDING" | "NORMAL" {
    if (!avg || avg === 0) return "NORMAL";
    const ratio = current / avg;
    if (ratio <= 0.70) return "COMPRESSED";
    if (ratio >= 1.0) return "EXPANDING";
    return "NORMAL";
}

export function calcExpansionLikelihood(current: number, avg: number): number {
    if (!avg || avg === 0) return 0;
    const ratio = current / avg;
    // Lower ratio = Higher likelihood of expansion
    // If ratio is 0.5 (50%), likelihood is high.
    // Logic: 100 - (ratio * 100) + twist
    let likelihood = (1 - ratio) * 100;
    // Boost likelihood for very compressed
    return Math.max(0, Math.min(100, likelihood + 10));
}

export function getRangeHint(opts: {
    status: string;
    adrPercent: number;
    expansionLikelihood: number;
    hasMajorSweep: boolean;
    pspState: string;
    pspDirection: string;
}): string {
    const { status, adrPercent } = opts;
    if (status === "COMPRESSED") return `Range Compressed (${adrPercent.toFixed(0)}% ADR). Expansion imminent.`;
    if (status === "EXPANDING") return `Range Expanded (${adrPercent.toFixed(0)}% ADR). Move likely exhausted.`;
    return `Range Normal (${adrPercent.toFixed(0)}% ADR).`;
}
