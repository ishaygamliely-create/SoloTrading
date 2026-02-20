import type { IndicatorSignal } from "@/app/lib/types";
import { Indicators, Quote } from "@/app/lib/analysis";
import { applyReliability, type DataSource } from "@/app/lib/reliability";

// ── Types ──────────────────────────────────────────────────────────

export type BiasZone = "STRONG_BULL" | "WEAK_BULL" | "NEUTRAL" | "NEAR_UP" | "NEAR_DOWN" | "WEAK_BEAR" | "STRONG_BEAR";

interface BiasParams {
    price: number;
    midnightOpen: number;
    dataStatus: "OK" | "DELAYED" | "BLOCKED" | "CLOSED";
    session: IndicatorSignal;
    quotes: Quote[];
    lastBarTimeMs?: number;
    source?: DataSource;
    marketStatus?: "OPEN" | "CLOSED";
    // Cross-indicator context (optional — enriches guidance and scoring)
    trueOpenAlignment?: string | null;   // "ALIGNED_BULL" | "ALIGNED_BEAR" | "MIXED" | "NEAR"
    valueZone?: string | null;           // "PREMIUM" | "DISCOUNT" | "EQUILIBRIUM"
    structureDirection?: string | null;  // "BULLISH" | "BEARISH" | "RANGING"
}

// ── Helpers ────────────────────────────────────────────────────────

function atrRatioScore(distanceFromMid: number, buffer: number, atrVal: number): number {
    // Distance beyond buffer, expressed as ratio to ATR
    const beyondBuffer = Math.max(0, distanceFromMid - buffer);
    if (atrVal <= 0) {
        // ATR not available — fall back to buffer multiples
        if (distanceFromMid <= buffer * 1.5) return 45;
        if (distanceFromMid <= buffer * 3) return 65;
        return 80;
    }
    const ratio = beyondBuffer / atrVal;
    if (ratio === 0) return 45;   // just broke the buffer
    if (ratio < 0.3) return 55;
    if (ratio < 0.7) return 65;
    if (ratio < 1.2) return 78;
    return 88;
}

function buildHint(
    direction: string,
    biasZone: BiasZone,
    trueOpenAlignment: string | null | undefined,
    valueZone: string | null | undefined,
    structureDirection: string | null | undefined,
    flipConfirmed: boolean,
): string {
    if (direction === "NEUTRAL") {
        if (biasZone === "NEAR_UP") return "Price near upper buffer — watch for bullish break confirmation.";
        if (biasZone === "NEAR_DOWN") return "Price near lower buffer — watch for bearish break confirmation.";
        return "Price inside buffer — no directional bias. Wait for buffer break.";
    }

    const dir = direction === "LONG" ? "bullish" : "bearish";
    const side = direction === "LONG" ? "LONG" : "SHORT";

    // Cross-indicator alignment
    const toAligned =
        (direction === "LONG" && trueOpenAlignment === "ALIGNED_BULL") ||
        (direction === "SHORT" && trueOpenAlignment === "ALIGNED_BEAR");
    const toConflict =
        (direction === "LONG" && trueOpenAlignment === "ALIGNED_BEAR") ||
        (direction === "SHORT" && trueOpenAlignment === "ALIGNED_BULL");

    const valueAligned =
        (direction === "LONG" && valueZone === "DISCOUNT") ||
        (direction === "SHORT" && valueZone === "PREMIUM");
    const valuePoor =
        (direction === "LONG" && valueZone === "PREMIUM") ||
        (direction === "SHORT" && valueZone === "DISCOUNT");

    const structureAligned =
        (direction === "LONG" && structureDirection === "BULLISH") ||
        (direction === "SHORT" && structureDirection === "BEARISH");

    const structureConflict =
        (direction === "LONG" && structureDirection === "BEARISH") ||
        (direction === "SHORT" && structureDirection === "BULLISH");

    // Build confluence sentence
    const supports: string[] = [];
    const conflicts: string[] = [];

    if (toAligned) supports.push("True Open aligned");
    if (toConflict) conflicts.push("True Open disagrees");
    if (valueAligned) supports.push(`good value (${valueZone})`);
    if (valuePoor) conflicts.push(`poor value (${valueZone})`);
    if (structureAligned) supports.push("structure supports");
    if (structureConflict) conflicts.push("structure opposes");
    if (flipConfirmed) supports.push("flip confirmed");

    let core = `${side} bias active — ${dir} filter.`;
    if (supports.length > 0 && conflicts.length === 0) {
        core = `${side} bias + ${supports.join(" + ")} → stronger ${dir} context.`;
    } else if (conflicts.length > 0 && supports.length === 0) {
        core = `${side} bias but ${conflicts.join(", ")} → reduced conviction. Caution.`;
    } else if (supports.length > 0 && conflicts.length > 0) {
        core = `${side} bias: ${supports.join(" + ")} support, but ${conflicts.join(", ")} — mixed context.`;
    } else if (flipConfirmed) {
        core = `${side} bias confirmed by 2 closed candles.`;
    }
    return core;
}

// ── Main ───────────────────────────────────────────────────────────

export function getBiasSignal(params: BiasParams): IndicatorSignal {
    const {
        price,
        midnightOpen,
        dataStatus,
        session,
        quotes,
        trueOpenAlignment,
        valueZone,
        structureDirection,
    } = params;

    if (dataStatus === "BLOCKED" || dataStatus === "CLOSED") {
        return {
            status: "OFF",
            direction: "NEUTRAL",
            score: 0,
            hint: "Data unavailable or market closed.",
            debug: { factors: [`DataStatus: ${dataStatus}`] }
        };
    }

    const factors: string[] = [];

    // ── 1. Adaptive buffer ─────────────────────────────────────────
    let buffer = 6.0;
    let atrVal = 0;

    if (quotes.length > 20) {
        const atrs = Indicators.calculateATR(quotes, 14);
        if (atrs.length > 0) {
            atrVal = atrs[atrs.length - 1];
            buffer = Math.max(6, Math.round(atrVal * 0.15));
            factors.push(`Buffer: dynamic ATR=${atrVal.toFixed(2)} → ${buffer}`);
        } else {
            buffer = Math.max(6, Math.round(price * 0.0005));
            factors.push(`Buffer: fallback price%=${buffer}`);
        }
    } else {
        buffer = 6.0;
        factors.push("Buffer: fixed default");
    }

    const upperBuffer = midnightOpen + buffer;
    const lowerBuffer = midnightOpen - buffer;
    const distanceFromMid = Math.abs(price - midnightOpen);
    const distancePts = price - midnightOpen; // signed

    // ── 2. Direction & Zone ────────────────────────────────────────
    let direction: "LONG" | "SHORT" | "NEUTRAL" = "NEUTRAL";
    let biasZone: BiasZone = "NEUTRAL";
    let score = 25;

    if (price > upperBuffer) {
        direction = "LONG";
        score = atrRatioScore(distanceFromMid, buffer, atrVal);
        biasZone = score >= 78 ? "STRONG_BULL" : "WEAK_BULL";
        factors.push(`LONG: +${distancePts.toFixed(1)}pts above mid (score raw=${score})`);
    } else if (price < lowerBuffer) {
        direction = "SHORT";
        score = atrRatioScore(distanceFromMid, buffer, atrVal);
        biasZone = score >= 78 ? "STRONG_BEAR" : "WEAK_BEAR";
        factors.push(`SHORT: ${distancePts.toFixed(1)}pts below mid (score raw=${score})`);
    } else {
        // Inside buffer — check if near edge
        const nearThreshold = buffer * 0.4; // within 40% of buffer edge
        if (price > midnightOpen && (upperBuffer - price) < nearThreshold) {
            biasZone = "NEAR_UP";
            factors.push("NEUTRAL/NEAR_UP: approaching upper buffer");
        } else if (price < midnightOpen && (price - lowerBuffer) < nearThreshold) {
            biasZone = "NEAR_DOWN";
            factors.push("NEUTRAL/NEAR_DOWN: approaching lower buffer");
        } else {
            biasZone = "NEUTRAL";
            factors.push("NEUTRAL: inside buffer");
        }
    }

    // ── 3. Flip detector ──────────────────────────────────────────
    let flipConfirmed = false;
    if (quotes.length >= 3) {
        const c1 = quotes[quotes.length - 2];
        const c2 = quotes[quotes.length - 3];
        if (direction === "LONG" && c1.close > upperBuffer && c2.close > upperBuffer) {
            flipConfirmed = true;
            score = Math.min(score + 10, 95);
            factors.push("Flip confirmed: 2 closes above upper buffer");
        } else if (direction === "SHORT" && c1.close < lowerBuffer && c2.close < lowerBuffer) {
            flipConfirmed = true;
            score = Math.min(score + 10, 95);
            factors.push("Flip confirmed: 2 closes below lower buffer");
        }
    }

    // ── 4. Cross-indicator confluence bonus/penalty ────────────────
    let confluenceAdj = 0;

    const toAligned =
        (direction === "LONG" && trueOpenAlignment === "ALIGNED_BULL") ||
        (direction === "SHORT" && trueOpenAlignment === "ALIGNED_BEAR");
    const toConflict =
        (direction === "LONG" && trueOpenAlignment === "ALIGNED_BEAR") ||
        (direction === "SHORT" && trueOpenAlignment === "ALIGNED_BULL");

    const valueAligned =
        (direction === "LONG" && valueZone === "DISCOUNT") ||
        (direction === "SHORT" && valueZone === "PREMIUM");
    const valuePoor =
        (direction === "LONG" && valueZone === "PREMIUM") ||
        (direction === "SHORT" && valueZone === "DISCOUNT");

    const structureAligned =
        (direction === "LONG" && structureDirection === "BULLISH") ||
        (direction === "SHORT" && structureDirection === "BEARISH");
    const structureConflict =
        (direction === "LONG" && structureDirection === "BEARISH") ||
        (direction === "SHORT" && structureDirection === "BULLISH");

    if (toAligned) { confluenceAdj += 5; factors.push("+5: TrueOpen aligned"); }
    if (toConflict) { confluenceAdj -= 8; factors.push("-8: TrueOpen disagrees"); }
    if (valueAligned) { confluenceAdj += 3; factors.push("+3: ValueZone supports"); }
    if (valuePoor) { confluenceAdj -= 5; factors.push("-5: ValueZone opposes"); }
    if (structureAligned) { confluenceAdj += 4; factors.push("+4: Structure aligned"); }
    if (structureConflict) { confluenceAdj -= 5; factors.push("-5: Structure opposes"); }

    score = Math.max(0, Math.min(95, score + confluenceAdj));

    // ── 5. Reliability ─────────────────────────────────────────────
    const rawScore = score;
    const lastBarMs = params.lastBarTimeMs ?? (Date.now() - 20 * 60_000);
    const src = params.source ?? "YAHOO";
    const mktStatus = params.marketStatus ?? "OPEN";

    const reliability = applyReliability({ rawScore, lastBarTimeMs: lastBarMs, source: src, marketStatus: mktStatus });
    const finalScore = reliability.finalScore;

    let status: "OK" | "WARN" | "BLOCKED" | "OFF" = "OK";
    if (reliability.capApplied) {
        status = "WARN";
        factors.push(`Cap: ${src} ${rawScore}% → ${finalScore}%`);
    }
    if (session.score <= 20) factors.push("Off-hours session");

    // ── 6. Dynamic hint ───────────────────────────────────────────
    const hint = buildHint(direction, biasZone, trueOpenAlignment, valueZone, structureDirection, flipConfirmed);

    return {
        status,
        direction,
        score: Math.round(finalScore),
        hint,
        debug: {
            price,
            factors,
            midnightOpen,
            buffer,
            upperBuffer,
            lowerBuffer,
            biasZone,
            flipConfirmed,
            distancePts: +distancePts.toFixed(2),
            distanceFromMid: +distanceFromMid.toFixed(2),
            atrVal: +atrVal.toFixed(2),
            // Cross-indicator snapshot
            trueOpenAlignment: trueOpenAlignment ?? null,
            valueZone: valueZone ?? null,
            structureDirection: structureDirection ?? null,
            confluenceAdj,
        },
        meta: {
            rawScore: Math.round(rawScore),
            finalScore: Math.round(finalScore),
            sourceUsed: src,
            dataAgeMs: reliability.dataAgeMs,
            lastBarTimeMs: lastBarMs,
            capApplied: reliability.capApplied,
        },
    };
}
