import type { IndicatorSignal } from "@/app/lib/types";
import { Indicators, Quote } from "@/app/lib/analysis";
import { applyReliability, type DataSource } from "@/app/lib/reliability";

interface BiasParams {
    price: number;
    midnightOpen: number;
    dataStatus: "OK" | "DELAYED" | "BLOCKED" | "CLOSED";
    session: IndicatorSignal;
    quotes: Quote[]; // 15m candles for ATR and Flip detection
    lastBarTimeMs?: number;
    source?: DataSource;
    marketStatus?: "OPEN" | "CLOSED";
}

export function getBiasSignal(params: BiasParams): IndicatorSignal {
    const { price, midnightOpen, dataStatus, session, quotes } = params;

    // 1. Check Data Status (Strict V2)
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

    // 2. Adaptive Buffer Calculation
    let buffer = 6.0; // Fail-safe default
    let atrVal = 0;

    if (quotes.length > 20) {
        const atrs = Indicators.calculateATR(quotes, 14);
        if (atrs.length > 0) {
            atrVal = atrs[atrs.length - 1];
            // Rule: max(6, round(ATR_15m * 0.15))
            buffer = Math.max(6, Math.round(atrVal * 0.15));
            factors.push(`Buffer: Dynamic (ATR=${atrVal.toFixed(2)})`);
        } else {
            // Fallback: max(6, round(price * 0.0005))
            buffer = Math.max(6, Math.round(price * 0.0005));
            factors.push(`Buffer: Fallback (Price% method)`);
        }
    } else {
        buffer = 6.0;
        factors.push(`Buffer: Fixed Default`);
    }

    // 3. Determine Direction & Distance
    const upperBuffer = midnightOpen + buffer;
    const lowerBuffer = midnightOpen - buffer;

    let direction: "LONG" | "SHORT" | "NEUTRAL" = "NEUTRAL";
    let score = 0;

    if (price > upperBuffer) {
        direction = "LONG";
    } else if (price < lowerBuffer) {
        direction = "SHORT";
    } else {
        direction = "NEUTRAL";
        score = 25; // Base neutral score
        factors.push("Price inside buffer (Neutral)");
    }

    // 4. Dynamic Scoring (Distance Based)
    if (direction !== "NEUTRAL") {
        const dist = Math.abs(price - midnightOpen);
        factors.push(`Distance: ${dist.toFixed(2)} pts`);

        if (dist <= buffer * 2) {
            // 1-2x Buffer -> Medium Conviction
            score = 65;
            factors.push("Zone: Medium (1-2x Buffer)");
        } else {
            // >2x Buffer -> Strong Conviction
            score = 85;
            factors.push("Zone: Strong (>2x Buffer)");
        }
    }

    // 5. Flip Detector
    // Check last 2 CLOSED candles (ignoring current forming candle)
    // We need at least 3 quotes (current + 2 closed)
    if (quotes.length >= 3) {
        const c1 = quotes[quotes.length - 2]; // Last closed
        const c2 = quotes[quotes.length - 3]; // Previous closed

        let flipConfirmed = false;
        if (direction === "LONG") {
            // Confirm SHORT to LONG flip: 2 candles closed > upperBuffer
            // Actually, simply checking if we hold above buffer is enough for "Flip Confirmed" context
            if (c1.close > upperBuffer && c2.close > upperBuffer) {
                flipConfirmed = true;
            }
        } else if (direction === "SHORT") {
            if (c1.close < lowerBuffer && c2.close < lowerBuffer) {
                flipConfirmed = true;
            }
        }

        if (flipConfirmed) {
            score += 10;
            factors.push("BIAS FLIP CONFIRMED");
        }
    }

    // 6. Reliability
    let status: "OK" | "WARN" | "BLOCKED" | "OFF" = "OK";
    const rawScore = Math.max(0, Math.min(100, score));
    const lastBarMs = params.lastBarTimeMs ?? (Date.now() - 20 * 60_000);
    const src = params.source ?? "YAHOO";
    const mktStatus = params.marketStatus ?? "OPEN";

    const reliability = applyReliability({
        rawScore,
        lastBarTimeMs: lastBarMs,
        source: src,
        marketStatus: mktStatus,
    });

    const finalScore = reliability.finalScore;
    if (reliability.capApplied) {
        status = "WARN";
        factors.push(`Data cap applied (${src}): ${rawScore} → ${finalScore}`);
    }

    // Session Soft Impact (if Off-hours)
    if (session.score <= 20) {
        factors.push("Off-hours session");
    }

    const hint = "Bias is a directional FILTER, not an entry trigger.";

    return {
        status,
        direction,
        score: Math.round(finalScore),
        hint,
        debug: {
            factors,
            midnightOpen,
            buffer,
            biasMode: direction
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
