import type { IndicatorSignal } from "@/app/lib/types";

interface ValueZoneParams {
    price: number;
    pdh: number; // Previous Day High
    pdl: number; // Previous Day Low
    session: IndicatorSignal;
    dataStatus: "OK" | "DELAYED" | "BLOCKED" | "CLOSED";
}

export function getValueZoneSignal(params: ValueZoneParams): IndicatorSignal {
    const { price, pdh, pdl, session, dataStatus } = params;

    // 1. Check Data Status & Range Validity
    if (dataStatus === "BLOCKED" || dataStatus === "CLOSED") {
        return {
            status: "OFF",
            direction: "NEUTRAL",
            score: 0,
            hint: "Data stale or market closed: value zone unreliable.",
            debug: { factors: [`DataStatus: ${dataStatus}`] }
        };
    }

    if (!pdh || !pdl || pdh <= pdl) {
        return {
            status: "OFF",
            direction: "NEUTRAL",
            score: 0,
            hint: "Value range unavailable (missing PDH/PDL).",
            debug: { factors: ["Invalid Range"] }
        };
    }

    // 2. Calculate Range & Zones
    const range = pdh - pdl;
    const eq = (pdh + pdl) / 2;
    const q1 = pdl + (range * 0.25); // Lower Quartile (Deep Discount)
    const q3 = pdh - (range * 0.25); // Upper Quartile (Deep Premium)

    const factors: string[] = [];
    factors.push(`Range: ${pdl.toFixed(2)} - ${pdh.toFixed(2)} (${range.toFixed(2)})`);
    factors.push(`EQ: ${eq.toFixed(2)}`);
    factors.push(`Price: ${price.toFixed(2)}`);

    let direction: "LONG" | "SHORT" | "NEUTRAL" = "NEUTRAL";
    let score = 0;
    let status: "OK" | "WARN" | "OFF" | "ERROR" = "OK";
    let hint = "";
    let zoneLabel = "";

    // 3. Determine Direction & Base Score
    const epsilon = range * 0.01; // Small buffer around EQ (1% of range)

    if (Math.abs(price - eq) < epsilon) {
        direction = "NEUTRAL";
        score = 0;
        zoneLabel = "EQUILIBRIUM";
        factors.push("Price at Equilibrium");
        hint = "At EQ: expect chop / wait for displacement.";
    } else if (price < eq) {
        direction = "LONG";
        zoneLabel = "DISCOUNT";
        score = 60; // Base score for Discount
        factors.push("Price < EQ (Discount)");

        // Optimal Zone Boost
        if (price <= q1) {
            score += 20;
            factors.push("Deep Discount (<= 25%) (+20)");
        }
        hint = "Discount: prefer longs / look for long confirmations.";
    } else { // price > eq
        direction = "SHORT";
        zoneLabel = "PREMIUM";
        score = 60; // Base score for Premium
        factors.push("Price > EQ (Premium)");

        // Optimal Zone Boost
        if (price >= q3) {
            score += 20;
            factors.push("Deep Premium (>= 75%) (+20)");
        }
        hint = "Premium: prefer shorts / look for short confirmations.";
    }

    // 4. Session Soft Impact
    const isOffHours = session.score <= 20;
    if (isOffHours && score > 0) { // Only reduce if active
        score -= 15;
        status = "WARN";
        factors.push("Off-hours: score reduced (-15)");
    }

    // 5. Clamp Score
    score = Math.max(0, Math.min(100, score));

    // Percent In Range (0 = Low, 100 = High)
    const percentInRange = Math.max(0, Math.min(100, ((price - pdl) / range) * 100));

    return {
        status,
        direction,
        score,
        hint,
        debug: {
            factors,
            label: zoneLabel,
            percentInRange: percentInRange.toFixed(1),
            pdh, pdl, eq
        }
    };
}
