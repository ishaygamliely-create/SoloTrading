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
    feedIsDelayed?: boolean;
    trueOpen?: IndicatorSignal; // soft driver — optional
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

    // PSP V2 Confluence Logic
    if (i.psp && i.psp.score > 0 && i.psp.direction !== "NEUTRAL") {
        const score = i.psp.score;
        let w = 0;
        if (score >= 75) w = 3;
        else if (score >= 60) w = 2;
        else if (score >= 50) w = 1;

        if (w > 0) {
            add(true, w, `PSP V2 ${i.psp.direction} (${score})`);
        }

        // Conflict check
        if (i.bias?.direction && i.bias.direction !== "NEUTRAL" && i.psp.direction !== i.bias.direction) {
            raw -= 1;
            factors.push("-1 Conflict (Bias <> PSP)");
        }
    }

    add(contributes(i.bias), weights.bias, `Bias ${i.bias.direction}`);
    add(contributes(i.structure), weights.structure, `Structure ${i.structure.direction}`);
    add(contributes(i.valueZone), weights.valueZone, `Value ${i.valueZone.direction}`);
    add(contributes(i.liquidity), weights.liquidity, `Liquidity ${i.liquidity.direction}`);
    add(contributes(i.smt), weights.smt, `SMT ${i.smt.direction}`);
    add(contributes(i.session), weights.session, `Session ${i.session.direction}`);

    // soft warns
    if (i.session?.status === "WARN") { warn = true; factors.push("~ WARN Off-hours"); }
    if (i.feedIsDelayed) { warn = true; factors.push("~ WARN Delayed feed"); }

    // True Open soft influence (does not block, does not gate)
    if (i.trueOpen && i.trueOpen.direction !== "NEUTRAL" && i.trueOpen.status !== "OFF") {
        const toDir = i.trueOpen.direction;
        const biasDir = i.bias?.direction;
        const structDir = i.structure?.direction;
        const aligned = (biasDir === toDir || structDir === toDir);
        const conflicts = (biasDir && biasDir !== "NEUTRAL" && biasDir !== toDir)
            || (structDir && structDir !== "NEUTRAL" && structDir !== toDir);
        if (aligned) {
            raw += 1;
            factors.push(`+1 TrueOpen ${toDir} aligns`);
        } else if (conflicts) {
            // Context only — no score impact, no WARN flag
            factors.push(`~ Open context conflicts with Bias/Structure`);
        }
    }

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

    // --- SMT GATE LOGIC (PAUSED) ---
    /*
    if (i.smt?.gate?.isActive && i.smt.gate.blocksDirection) {
        if (i.smt.gate.blocksDirection === suggestion) {
            // Check for potential Override (High Conviction)
            const canOverride =
                scorePct > 85 &&
                i.psp?.status === "OK" &&
                i.liquidity?.score > 80;

            if (canOverride) {
                factors.push("⚠️ SMT Gate Override (High Conviction)");
                status = "WARN"; // Downgrade block to warn
            } else {
                status = "BLOCKED";
                level = "NO_TRADE";
                suggestion = "NO_TRADE";
                factors.push(`⛔ BLOCKED by SMT Gate (Blocks ${i.smt.gate.blocksDirection})`);
            }
        }
    }
    */

    return { scorePct, level, suggestion, status, factors };
}
