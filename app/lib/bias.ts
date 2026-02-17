import type { IndicatorSignal } from "@/app/lib/types";

interface BiasParams {
    biasMode: "LONG" | "SHORT" | "NEUTRAL";
    price: number;
    midnightOpen: number;
    buffer: number;
    dataStatus: "OK" | "DELAYED" | "BLOCKED" | "CLOSED";
    session: IndicatorSignal;
}

export function getBiasSignal(params: BiasParams): IndicatorSignal {
    const { biasMode, price, midnightOpen, buffer, dataStatus, session } = params;

    // 1. Check Data Status
    if (dataStatus === "BLOCKED" || dataStatus === "CLOSED") {
        return {
            status: "OFF",
            direction: "NEUTRAL",
            score: 0,
            hint: "Data stale or market closed: do not trust bias.",
            debug: { factors: [`DataStatus: ${dataStatus}`] }
        };
    }

    const factors: string[] = [];
    factors.push(`midnightOpen=${midnightOpen.toFixed(2)}`);
    factors.push(`buffer=${buffer.toFixed(2)}`);
    factors.push(`price=${price.toFixed(2)}`);
    factors.push(`dataStatus=${dataStatus}`);

    let score = 0;
    let direction: "LONG" | "SHORT" | "NEUTRAL" = "NEUTRAL";
    let status: "OK" | "WARN" | "BLOCKED" | "OFF" = "OK";
    let hint = "";

    // 2. Base Scoring
    if (biasMode === "NEUTRAL") {
        direction = "NEUTRAL";
        score = 0;
        hint = "Bias neutral: wait for a decisive break beyond buffer.";
        factors.push("Mode: NEUTRAL");
    } else {
        direction = biasMode;
        score = 70; // Base score for established bias
        factors.push(`Mode: ${biasMode} (Base 70)`);

        // 3. Price Validation
        if (direction === "LONG") {
            if (price > midnightOpen + buffer) {
                score += 15;
                factors.push("Price > Buffer (+15)");
            } else {
                factors.push("Price inside/below buffer (no boost)");
            }
            hint = "Bias LONG: prefer long setups above midnight zone.";
        } else { // SHORT
            if (price < midnightOpen - buffer) {
                score += 15;
                factors.push("Price < Buffer (+15)");
            } else {
                factors.push("Price inside/above buffer (no boost)");
            }
            hint = "Bias SHORT: prefer short setups below midnight zone.";
        }
    }

    // 4. Session Soft Impact
    const isOffHours = session.score <= 20; // Check session score for off-hours
    if (isOffHours && score > 0) {
        score -= 15;
        status = "WARN";
        factors.push("Off-hours: score reduced (-15)");
    }

    // 5. Clamp Score
    score = Math.max(0, Math.min(100, score));

    return {
        status,
        direction,
        score,
        hint,
        debug: {
            factors,
            midnightOpen,
            buffer,
            biasMode
        }
    };
}
