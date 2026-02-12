import type { IndicatorSignal } from "@/app/lib/types";
import type { PSPResult } from "@/app/lib/psp";

interface ConfluenceParams {
    session: IndicatorSignal;
    bias: IndicatorSignal;
    valueZone: IndicatorSignal;
    structure: IndicatorSignal;
    smt: IndicatorSignal;
    psp: PSPResult;
    liquidityRange: {
        status: "COMPRESSED" | "EXPANDING" | "EXHAUSTED";
        expansionLikelihood: number;
    };
    dataStatus: "OK" | "DELAYED" | "BLOCKED" | "CLOSED";
}

type ConfluenceLevel = "NO_TRADE" | "WEAK" | "GOOD" | "STRONG";

export interface ConfluenceSignal extends IndicatorSignal {
    level: ConfluenceLevel;
    suggestion: "LONG" | "SHORT" | "NO_TRADE";
}

export function calculateConfluence(params: ConfluenceParams): ConfluenceSignal {
    const { session, bias, valueZone, structure, smt, psp, liquidityRange, dataStatus } = params;

    // 1. Data Gating
    if (dataStatus === "BLOCKED" || dataStatus === "CLOSED") {
        return {
            status: "OFF",
            direction: "NEUTRAL",
            score: 0,
            level: "NO_TRADE",
            suggestion: "NO_TRADE",
            hint: "Market data blocked or closed.",
            debug: { factors: [`DataStatus: ${dataStatus}`] }
        };
    }

    let rawScore = 0;
    const factors: string[] = [];

    // 2. Scoring Logic

    // A. PSP (Market Structure & Momentum)
    if (psp.state === "CONFIRMED") {
        rawScore += 4;
        factors.push(`+4 PSP CONFIRMED ${psp.direction}`);
    } else if (psp.state === "FORMING") {
        rawScore += 2;
        factors.push(`+2 PSP FORMING ${psp.direction}`);
    } else {
        factors.push("+0 PSP NONE");
    }

    // Determine Evaluation Direction
    // If PSP is active, we check alignment with PSP.
    // Else we check alignment with Bias.
    const refDirection = (psp.state !== "NONE" && psp.direction !== "NEUTRAL")
        ? psp.direction
        : bias.direction;

    // B. Bias Alignment
    if (refDirection !== "NEUTRAL") {
        if (bias.direction === refDirection) {
            rawScore += 2;
            factors.push(`+2 Bias aligned (${bias.direction})`);
        } else if (bias.direction !== "NEUTRAL") {
            rawScore -= 1;
            factors.push(`-1 Bias opposite (${bias.direction})`);
        }
    }

    // C. Value Zone Alignment
    if (refDirection === "LONG") {
        if (valueZone.direction === "LONG") { // Discount
            rawScore += 2;
            factors.push("+2 ValueZone DISCOUNT supports LONG");
        } else if (valueZone.direction === "SHORT") { // Premium
            rawScore -= 1;
            factors.push("-1 ValueZone PREMIUM opposes LONG");
        }
    } else if (refDirection === "SHORT") {
        if (valueZone.direction === "SHORT") { // Premium
            rawScore += 2;
            factors.push("+2 ValueZone PREMIUM supports SHORT");
        } else if (valueZone.direction === "LONG") { // Discount
            rawScore -= 1;
            factors.push("-1 ValueZone DISCOUNT opposes SHORT");
        }
    }

    // D. Structure Alignment
    if (structure.direction === refDirection && structure.debug?.label === "TRENDING") {
        rawScore += 2;
        factors.push(`+2 Structure TRENDING ${structure.direction}`);
    } else {
        factors.push("+0 Structure Neutral/Ranging");
    }

    // E. SMT Alignment
    if (smt.direction === refDirection && smt.status !== "OFF") {
        rawScore += 1;
        factors.push(`+1 SMT aligned (${smt.direction})`);
    } else if (smt.direction !== "NEUTRAL" && smt.direction !== refDirection && smt.status !== "OFF") {
        rawScore -= 1;
        factors.push(`-1 SMT opposite (${smt.direction})`);
    }

    // F. Liquidity Range (Context)
    if (liquidityRange.status === "COMPRESSED" && liquidityRange.expansionLikelihood >= 60) {
        rawScore += 1;
        factors.push(`+1 Compressed (${liquidityRange.expansionLikelihood}% exp)`);
    } else if (liquidityRange.status === "EXHAUSTED") {
        rawScore -= 1;
        factors.push("-1 Range Exhausted");
    }

    // 3. Session Soft Impact
    const isOffHours = session.score <= 20;
    let status: "OK" | "WARN" | "OFF" | "ERROR" = "OK";

    if (isOffHours) {
        // Apply soft reduction
        rawScore = rawScore * 0.85;
        status = "WARN";
        factors.push("Session Off-Hours (Score x0.85)");
    }

    // 4. Normalization & Levels
    const finalScore = Math.max(0, Math.min(12, rawScore)); // Clamp 0-12
    const percentageScore = Math.round((finalScore / 12) * 100);

    let level: ConfluenceLevel = "NO_TRADE";
    let hint = "";

    if (finalScore >= 10) {
        level = "STRONG";
        hint = "Strong confluence: high-probability setup in direction of suggestion.";
    } else if (finalScore >= 7) {
        level = "GOOD";
        hint = "Good confluence: look for entries in direction of suggestion.";
    } else if (finalScore >= 4) {
        level = "WEAK";
        hint = "Weak confluence: reduce size and wait for confirmation.";
    } else {
        level = "NO_TRADE";
        hint = "Low confluence: wait for better alignment.";
    }

    // 5. Suggestion
    let suggestion: "LONG" | "SHORT" | "NO_TRADE" = "NO_TRADE";

    if (level !== "NO_TRADE") {
        if (refDirection !== "NEUTRAL") {
            suggestion = refDirection;
        } else {
            // Fallback if no ref direction but score happened to be high (unlikely given weighting)
            suggestion = "NO_TRADE";
            level = "NO_TRADE"; // Force downgrade if no direction
            hint = "No clear direction identified.";
        }
    }

    // 6. SMT Gate Logic (DISABLED due to delayed feed)
    /*
    if (smt.gate?.isActive && suggestion !== "NO_TRADE") {
        const isBlocked = smt.gate.blocksDirection === suggestion;
        
        if (isBlocked) {
            // Check for Override
            // Rules: Score >= 11/12, PSP CONFIRMED in trade direction (opposite to block), Liquidity EXPANDING
            const canOverride = 
                finalScore >= 11 &&
                psp.state === "CONFIRMED" && 
                psp.direction === suggestion &&
                liquidityRange.status === "EXPANDING";

            if (canOverride) {
                factors.push("⚡ OVERRIDE: Extreme confluence vs SMT Gate");
            } else {
                // Apply Block
                suggestion = "NO_TRADE";
                
                // Downgrade Level
                if (level === "STRONG") level = "GOOD";
                else if (level === "GOOD") level = "WEAK";
                else if (level === "WEAK") level = "NO_TRADE";
                
                factors.push(`⛔ SMT GATE ACTIVE: blocks ${smt.gate.blocksDirection}`);
                factors.push(`TTL: ${smt.gate.remainingMin}m`);
                hint = "Trade blocked by Strong SMT Gate (wait for expiration or better setup)";
            }
        }
    }
    */

    return {
        status,
        direction: refDirection, // Overall direction context
        score: percentageScore, // 0-100 for consistent UI
        level,
        suggestion,
        hint,
        debug: {
            factors,
            rawScore: finalScore.toFixed(1)
        }
    };
}
