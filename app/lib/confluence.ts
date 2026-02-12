import { IndicatorSignal } from "./types";

export type ConfluenceLevel = "NO_TRADE" | "WEAK" | "GOOD" | "STRONG";
export type ConfluenceSuggestion = "LONG" | "SHORT" | "NO_TRADE";
export type ConfluenceStatus = "OK" | "WARN" | "BLOCKED" | "OFF";

export interface ConfluenceResult {
    scorePct: number;
    level: ConfluenceLevel;
    suggestion: ConfluenceSuggestion;
    status: ConfluenceStatus;
    factors: string[];
}

type Inputs = {
    session: IndicatorSignal;
    bias: IndicatorSignal;
    valueZone: IndicatorSignal;
    structure: IndicatorSignal;
    smt: IndicatorSignal;
    psp: IndicatorSignal;
    liquidity: IndicatorSignal;
    feedIsDelayed?: boolean; // from API
};

function contributes(sig: IndicatorSignal) {
    return sig && sig.status !== "OFF" && sig.score > 0 && sig.direction !== "NEUTRAL";
}

export function getConfluenceV1(i: Inputs): ConfluenceResult {
    const weights = { psp: 3, bias: 2, structure: 2, valueZone: 2, liquidity: 1, smt: 1, session: 1 };
    const maxScore = Object.values(weights).reduce((a, b) => a + b, 0); // 12
    let raw = 0;
    const factors: string[] = [];
    let warn = false;

    const add = (ok: boolean, w: number, text: string) => {
        if (!ok) return;
        raw += w;
        factors.push(`+${w} ${text}`);
    };

    add(contributes(i.psp), weights.psp, `PSP ${i.psp.direction}`);
    add(contributes(i.bias), weights.bias, `Bias ${i.bias.direction}`);
    add(contributes(i.structure), weights.structure, `Structure ${i.structure.direction}`);
    add(contributes(i.valueZone), weights.valueZone, `Value ${i.valueZone.direction}`);
    add(contributes(i.liquidity), weights.liquidity, `Liquidity ${i.liquidity.direction}`);
    add(contributes(i.smt), weights.smt, `SMT ${i.smt.direction}`);
    add(contributes(i.session), weights.session, `Session ${i.session.direction}`);

    // soft warns
    if (i.session?.status === "WARN") { warn = true; factors.push("~ WARN Off-hours"); }
    if (i.feedIsDelayed) { warn = true; factors.push("~ WARN Delayed feed"); }

    // normalize
    const scorePct = Math.max(0, Math.min(100, Math.round((raw / maxScore) * 100)));

    let level: ConfluenceLevel = "NO_TRADE";
    if (scorePct >= 75) level = "STRONG";
    else if (scorePct >= 55) level = "GOOD";
    else if (scorePct >= 35) level = "WEAK";

    // suggestion (no contradictions)
    let suggestion: ConfluenceSuggestion = "NO_TRADE";
    if (level !== "NO_TRADE") {
        if (i.psp?.direction && i.psp.direction !== "NEUTRAL") suggestion = i.psp.direction as any;
        else if (i.bias?.direction && i.bias.direction !== "NEUTRAL") suggestion = i.bias.direction as any;
        else suggestion = "NO_TRADE";
    }

    // If NO_TRADE => force WARN
    let status: ConfluenceStatus = "OK";
    if (level === "NO_TRADE") status = "WARN";
    else if (warn) status = "WARN";

    return { scorePct, level, suggestion, status, factors };
}
