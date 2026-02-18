import type { IndicatorSignal } from "@/app/lib/types";
import { applyReliability, type DataSource } from "@/app/lib/reliability";

// ============================================================
// Types
// ============================================================

export type OpenSide = "ABOVE" | "BELOW" | "NEAR";
export type Displacement = "WEAK" | "MED" | "STRONG";

export interface OpenAnchor {
    label: "DAY" | "WEEK";
    openPrice: number;
    lastPrice: number;
    distancePts: number;
    side: OpenSide;
    displacement: Displacement;
    reclaim: boolean; // crossed and held 2 consecutive closes on the other side
}

export interface TrueOpenResult extends IndicatorSignal {
    dayAnchor: OpenAnchor;
    weekAnchor: OpenAnchor | null; // null if week open unavailable
}

// ============================================================
// Params
// ============================================================

export interface TrueOpenParams {
    /** Last traded price */
    lastPrice: number;
    /** RTH Day Open (09:30 NY) — from daily candle open */
    trueDayOpen: number;
    /** Monday 00:00 NY open — from first daily candle of the week */
    trueWeekOpen: number | null;
    /** 15m candles for ATR14 + reclaim detection */
    quotes15m: Array<{ time: number; open: number; high: number; low: number; close: number }>;
    /** Reliability params */
    lastBarTimeMs?: number;
    source?: DataSource;
    marketStatus?: "OPEN" | "CLOSED";
}

// ============================================================
// Helpers
// ============================================================

function calcATR14(quotes: TrueOpenParams["quotes15m"]): number {
    if (quotes.length < 2) return 10; // fallback for MNQ
    const slice = quotes.slice(-15);
    let sum = 0;
    for (let i = 1; i < slice.length; i++) {
        const tr = Math.max(
            slice[i].high - slice[i].low,
            Math.abs(slice[i].high - slice[i - 1].close),
            Math.abs(slice[i].low - slice[i - 1].close)
        );
        sum += tr;
    }
    return sum / (slice.length - 1);
}

function classifyDisplacement(distancePts: number, atr: number): Displacement {
    const ratio = distancePts / Math.max(atr, 1);
    if (ratio >= 1.5) return "STRONG";
    if (ratio >= 0.5) return "MED";
    return "WEAK";
}

function classifySide(distancePts: number, bufferPts: number): OpenSide {
    if (Math.abs(distancePts) <= bufferPts) return "NEAR";
    return distancePts > 0 ? "ABOVE" : "BELOW";
}

/**
 * Reclaim: price crossed the open and held 2 consecutive closes on the other side.
 * We look at the last 6 closes of 15m candles.
 */
function detectReclaim(
    quotes: TrueOpenParams["quotes15m"],
    openPrice: number,
    currentSide: OpenSide
): boolean {
    if (currentSide === "NEAR" || quotes.length < 6) return false;
    const recent = quotes.slice(-6);
    // Count consecutive closes on the OPPOSITE side of current side
    const oppositeSide = currentSide === "ABOVE" ? "below" : "above";
    let consecutive = 0;
    for (let i = recent.length - 1; i >= 0; i--) {
        const c = recent[i].close;
        const isOpposite = oppositeSide === "below" ? c < openPrice : c > openPrice;
        if (isOpposite) {
            consecutive++;
            if (consecutive >= 2) return true;
        } else {
            break;
        }
    }
    return false;
}

function buildAnchor(
    label: "DAY" | "WEEK",
    openPrice: number,
    lastPrice: number,
    atr: number,
    bufferPts: number,
    quotes: TrueOpenParams["quotes15m"]
): OpenAnchor {
    const distancePts = lastPrice - openPrice;
    const side = classifySide(distancePts, bufferPts);
    const displacement = classifyDisplacement(Math.abs(distancePts), atr);
    const reclaim = detectReclaim(quotes, openPrice, side);
    return { label, openPrice, lastPrice, distancePts, side, displacement, reclaim };
}

// ============================================================
// Score rules
// ============================================================

function calcRawScore(day: OpenAnchor, week: OpenAnchor | null): number {
    // Both aligned ABOVE
    if (
        day.side === "ABOVE" &&
        (week === null || week.side === "ABOVE")
    ) {
        if (day.displacement === "STRONG") return week?.displacement === "STRONG" ? 95 : 85;
        if (day.displacement === "MED") return 70;
        return 50;
    }
    // Both aligned BELOW
    if (
        day.side === "BELOW" &&
        (week === null || week.side === "BELOW")
    ) {
        if (day.displacement === "STRONG") return week?.displacement === "STRONG" ? 95 : 85;
        if (day.displacement === "MED") return 70;
        return 50;
    }
    // Mixed
    if (day.side !== "NEAR" && week && week.side !== "NEAR" && day.side !== week.side) {
        return 45; // conflicting
    }
    // Near / unclear
    return 25;
}

function calcDirection(day: OpenAnchor, week: OpenAnchor | null): "LONG" | "SHORT" | "NEUTRAL" {
    if (day.side === "ABOVE" && (week === null || week.side === "ABOVE")) return "LONG";
    if (day.side === "BELOW" && (week === null || week.side === "BELOW")) return "SHORT";
    return "NEUTRAL";
}

// ============================================================
// Main export
// ============================================================

export function getTrueOpenSignal(params: TrueOpenParams): TrueOpenResult {
    const { lastPrice, trueDayOpen, trueWeekOpen, quotes15m } = params;

    // Fallback: if no day open, return OFF
    if (!trueDayOpen || trueDayOpen === 0) {
        return {
            status: "OFF",
            direction: "NEUTRAL",
            score: 0,
            hint: "Day open unavailable",
            debug: { factors: ["No trueDayOpen data"] },
            dayAnchor: {
                label: "DAY",
                openPrice: 0,
                lastPrice,
                distancePts: 0,
                side: "NEAR",
                displacement: "WEAK",
                reclaim: false,
            },
            weekAnchor: null,
        };
    }

    const atr = calcATR14(quotes15m);
    // Adaptive buffer: ATR14 * 0.15, min 3pts for MNQ
    const bufferPts = Math.max(atr * 0.15, 3);

    const dayAnchor = buildAnchor("DAY", trueDayOpen, lastPrice, atr, bufferPts, quotes15m);
    const weekAnchor = trueWeekOpen
        ? buildAnchor("WEEK", trueWeekOpen, lastPrice, atr, bufferPts, quotes15m)
        : null;

    const rawScore = calcRawScore(dayAnchor, weekAnchor);
    const direction = calcDirection(dayAnchor, weekAnchor);

    // Reliability
    const lastBarMs = params.lastBarTimeMs
        ?? (quotes15m.length > 0 ? quotes15m[quotes15m.length - 1].time * 1000 : Date.now() - 20 * 60_000);
    const src = params.source ?? "YAHOO";
    const mktStatus = params.marketStatus ?? "OPEN";

    const reliability = applyReliability({
        rawScore,
        lastBarTimeMs: lastBarMs,
        source: src,
        marketStatus: mktStatus,
    });

    const finalScore = reliability.finalScore;

    // Hint
    const dayLabel = `Day: ${dayAnchor.side} (${dayAnchor.distancePts > 0 ? "+" : ""}${dayAnchor.distancePts.toFixed(1)}pts, ${dayAnchor.displacement})`;
    const weekLabel = weekAnchor
        ? ` | Week: ${weekAnchor.side} (${weekAnchor.distancePts > 0 ? "+" : ""}${weekAnchor.distancePts.toFixed(1)}pts)`
        : "";
    const hint = dayLabel + weekLabel;

    const factors: string[] = [
        `Day Open: ${dayAnchor.side} | ${dayAnchor.displacement} displacement`,
    ];
    if (weekAnchor) factors.push(`Week Open: ${weekAnchor.side} | ${weekAnchor.displacement} displacement`);
    if (dayAnchor.reclaim) factors.push("Day Open reclaim detected");
    if (weekAnchor?.reclaim) factors.push("Week Open reclaim detected");
    if (reliability.capApplied) factors.push(`${src} cap: ${rawScore} → ${Math.round(finalScore)}`);

    return {
        status: "OK",
        direction,
        score: Math.round(finalScore),
        hint,
        debug: { factors, atr: atr.toFixed(2), bufferPts: bufferPts.toFixed(2) },
        meta: {
            rawScore: Math.round(rawScore),
            finalScore: Math.round(finalScore),
            sourceUsed: src,
            dataAgeMs: reliability.dataAgeMs,
            lastBarTimeMs: lastBarMs,
            capApplied: reliability.capApplied,
        },
        dayAnchor,
        weekAnchor,
    };
}
