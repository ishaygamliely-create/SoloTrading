export type RangeStatus = "COMPRESSED" | "EXPANDING" | "EXHAUSTED";

export function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

export function calcExpansionLikelihood(currentRange: number, avgRange: number): number {
    if (!Number.isFinite(currentRange) || !Number.isFinite(avgRange) || avgRange <= 0) return 0;
    // More compressed => higher likelihood. 0..100
    const ratio = currentRange / avgRange;     // e.g. 0.31
    const score01 = 1 - clamp(ratio, 0, 1);    // 0.69
    return Math.round(score01 * 100);
}

export function getRangeStatus(currentRange: number, avgRange: number): RangeStatus {
    if (!Number.isFinite(currentRange) || !Number.isFinite(avgRange) || avgRange <= 0) return "COMPRESSED";
    const ratio = currentRange / avgRange;

    // Thresholds (tunable):
    // < 0.45 => compressed
    // 0.45..0.90 => expanding (normal)
    // >= 0.90 => exhausted
    if (ratio < 0.45) return "COMPRESSED";
    if (ratio >= 0.90) return "EXHAUSTED";
    return "EXPANDING";
}

export function getRangeHint(args: {
    status: RangeStatus;
    adrPercent: number;                 // 0..100
    expansionLikelihood: number;        // 0..100
    hasMajorSweep: boolean;
    pspState?: "NONE" | "FORMING" | "CONFIRMED";
    pspDirection?: "LONG" | "SHORT" | "NEUTRAL";
}): string {
    const { status, hasMajorSweep, pspState, pspDirection, expansionLikelihood } = args;

    if (status === "COMPRESSED") {
        if (hasMajorSweep) return "Compressed + sweep detected: breakout risk is high.";
        if (pspState === "FORMING" || pspState === "CONFIRMED") {
            const dir = pspDirection && pspDirection !== "NEUTRAL" ? ` (${pspDirection})` : "";
            return `Compressed + PSP ${pspState}${dir}: expansion likely soon (${expansionLikelihood}%).`;
        }
        return `Market compressed: wait for sweep/displacement. Expansion likelihood ${expansionLikelihood}%.`;
    }

    if (status === "EXPANDING") {
        if (pspState === "CONFIRMED") {
            const dir = pspDirection && pspDirection !== "NEUTRAL" ? ` (${pspDirection})` : "";
            return `Expansion active + PSP CONFIRMED${dir}: follow-through favored.`;
        }
        return "Volatility expansion active: prefer momentum setups over mean reversion.";
    }

    // EXHAUSTED
    return "Range near ADR: move may be tiring—manage risk and avoid chasing.";
}
