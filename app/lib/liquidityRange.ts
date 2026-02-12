
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
