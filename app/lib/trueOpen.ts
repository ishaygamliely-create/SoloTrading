import type { IndicatorSignal } from "@/app/lib/types";
import { applyReliability, type DataSource } from "@/app/lib/reliability";

// ============================================================
// Types
// ============================================================

export type OpenSide = "ABOVE" | "BELOW" | "NEAR";
export type Displacement = "WEAK" | "MED" | "STRONG";
export type TrueOpenAlignment =
    | "ALIGNED_BULL"    // day ABOVE + week ABOVE
    | "ALIGNED_BEAR"    // day BELOW + week BELOW
    | "MIXED"           // day and week disagree, or week N/A with day present
    | "NEAR";           // day is NEAR buffer — no clear context

export interface OpenAnchor {
    label: "DAY" | "WEEK";
    openPrice: number;
    lastPrice: number;
    distancePts: number;
    side: OpenSide;
    displacement: Displacement;
    reclaim: boolean;
}

export interface TrueOpenResult extends IndicatorSignal {
    alignment: TrueOpenAlignment;
    guidance: string;           // value-aware playbook line
    macroContext: string;       // short one-liner, e.g. "Above Day + Week open → bullish context"
    dayAnchor: OpenAnchor;
    weekAnchor: OpenAnchor | null;
}

// ============================================================
// Feed Meta (per-timeframe source info)
// ============================================================

export interface FeedMeta {
    sourceUsed: DataSource;
    lastBarTimeMs: number | null;
    fallbackFrom?: DataSource;
}

// ============================================================
// Params
// ============================================================

export interface TrueOpenParams {
    lastPrice: number;
    trueDayOpen: number;
    trueWeekOpen: number | null;
    /** 15m candles for ATR14 + reclaim detection */
    quotes15m: Array<{ time: number; open: number; high: number; low: number; close: number }>;
    /** Which feed actually produced the Day Open anchor */
    dayOpenFoundFrom?: "1m" | "5m" | "1d" | "none";
    /** Per-feed metas — trueOpen picks the one matching dayOpenFoundFrom */
    meta1m?: FeedMeta;
    meta5m?: FeedMeta;
    meta1d?: FeedMeta;
    /** Fallback reliability params (if per-feed metas not provided) */
    lastBarTimeMs?: number;
    source?: DataSource;
    marketStatus?: "OPEN" | "CLOSED";
    /** ValueZone label from valueZone.ts debug.label ("PREMIUM" | "DISCOUNT" | "EQUILIBRIUM" | null) */
    valueZone?: "PREMIUM" | "DISCOUNT" | "EQUILIBRIUM" | null;
}

// ============================================================
// Helpers
// ============================================================

function calcATR14(quotes: TrueOpenParams["quotes15m"]): number {
    if (quotes.length < 2) return 10;
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

function detectReclaim(
    quotes: TrueOpenParams["quotes15m"],
    openPrice: number,
    currentSide: OpenSide
): boolean {
    if (currentSide === "NEAR" || quotes.length < 6) return false;
    const recent = quotes.slice(-6);
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
// Clarity Scoring
// Score represents HOW CLEAR the context is, not HOW BULLISH/BEARISH.
// High score = strong displacement from anchor → clear macro context.
// Low score = near anchor → ambiguous context.
// ============================================================

function calcClarityScore(
    day: OpenAnchor,
    week: OpenAnchor | null,
    atr: number
): number {
    // Base: distance ratio of day open
    const ratio = Math.abs(day.distancePts) / Math.max(atr, 1);

    let base: number;
    if (ratio < 0.5) base = 25;
    else if (ratio < 1.0) base = 45;
    else if (ratio < 2.0) base = 70;
    else base = 85;

    // Week bonus/penalty (only if week is present)
    let weekAdj = 0;
    if (week !== null && week.side !== "NEAR") {
        if (week.side === day.side) {
            weekAdj = +10;  // aligned → context is clearer
        } else {
            weekAdj = -10;  // conflicting → context is murkier
        }
    }
    // Week N/A: no penalty — unavailability is a data issue, not a clarity issue

    return Math.max(25, Math.min(95, base + weekAdj));
}

// ============================================================
// Alignment
// ============================================================

function calcAlignment(day: OpenAnchor, week: OpenAnchor | null): TrueOpenAlignment {
    if (day.side === "NEAR") return "NEAR";
    if (week === null || week.side === "NEAR") {
        // Week unavailable or near — report based on day only, but mark as MIXED
        // because we can't confirm multi-anchor alignment
        return "MIXED";
    }
    if (day.side === "ABOVE" && week.side === "ABOVE") return "ALIGNED_BULL";
    if (day.side === "BELOW" && week.side === "BELOW") return "ALIGNED_BEAR";
    return "MIXED";
}

// ============================================================
// Macro Context Sentence
// ============================================================

function buildMacroContext(day: OpenAnchor, week: OpenAnchor | null, alignment: TrueOpenAlignment): string {
    if (alignment === "NEAR") return "Price near open → no clear macro context.";
    if (alignment === "ALIGNED_BULL") return "Above Day + Week open → bullish macro context.";
    if (alignment === "ALIGNED_BEAR") return "Below Day + Week open → bearish macro context.";
    if (alignment === "MIXED") {
        if (week === null) return `Above Day open → bullish context (week data unavailable).`;
        return `Day ${day.side}, Week ${week.side} → mixed macro context.`;
    }
    return "Unclear macro context.";
}

// ============================================================
// Value-Aware Guidance
// Combines macro alignment with ValueZone location for actionable insight.
// ============================================================

function buildGuidance(
    alignment: TrueOpenAlignment,
    valueZone: "PREMIUM" | "DISCOUNT" | "EQUILIBRIUM" | null | undefined
): string {
    const macro: "BULL" | "BEAR" | "NEAR" | "MIXED" =
        alignment === "ALIGNED_BULL" ? "BULL" :
            alignment === "ALIGNED_BEAR" ? "BEAR" :
                alignment === "NEAR" ? "NEAR" : "MIXED";

    if (macro === "BULL" && valueZone === "PREMIUM")
        return "Bullish context, but price is PREMIUM → wait for pullback into DISCOUNT for longs.";
    if (macro === "BULL" && valueZone === "DISCOUNT")
        return "Bullish context + DISCOUNT → long setups have better location.";
    if (macro === "BULL" && valueZone === "EQUILIBRIUM")
        return "Bullish macro but mid-range: prefer pullback to DISCOUNT or wait for PSP trigger.";
    if (macro === "BULL")
        return "Bullish context → bias longs, confirm with PSP/Liquidity.";

    if (macro === "BEAR" && valueZone === "DISCOUNT")
        return "Bearish context, but price is DISCOUNT → wait for rally into PREMIUM for shorts.";
    if (macro === "BEAR" && valueZone === "PREMIUM")
        return "Bearish context + PREMIUM → short setups have better location.";
    if (macro === "BEAR" && valueZone === "EQUILIBRIUM")
        return "Bearish macro but mid-range: prefer rally to PREMIUM or wait for PSP trigger.";
    if (macro === "BEAR")
        return "Bearish context → bias shorts, confirm with PSP/Liquidity.";

    if (macro === "MIXED" && valueZone === "EQUILIBRIUM")
        return "Neutral mid-range: wait for alignment / PSP trigger.";
    if (macro === "MIXED")
        return "Mixed day/week context → reduce size, wait for alignment.";

    // NEAR
    if (valueZone === "EQUILIBRIUM")
        return "Neutral mid-range: wait for alignment / PSP trigger.";
    return "Near open / unclear → treat as neutral context. No directional bias.";
}

// ============================================================
// Direction (kept for backward compatibility with confluence engine)
// Derived from alignment, not from score.
// ============================================================

function calcDirection(alignment: TrueOpenAlignment): "LONG" | "SHORT" | "NEUTRAL" {
    if (alignment === "ALIGNED_BULL") return "LONG";
    if (alignment === "ALIGNED_BEAR") return "SHORT";
    return "NEUTRAL";
}

// ============================================================
// Main export
// ============================================================

export function getTrueOpenSignal(params: TrueOpenParams): TrueOpenResult {
    const { lastPrice, trueDayOpen, trueWeekOpen, quotes15m, valueZone } = params;

    const offResult = (hint: string): TrueOpenResult => ({
        status: "OFF",
        direction: "NEUTRAL",
        alignment: "NEAR",
        guidance: "No anchor data — context unavailable.",
        macroContext: hint,
        score: 0,
        hint,
        debug: { factors: [hint] },
        dayAnchor: {
            label: "DAY", openPrice: 0, lastPrice,
            distancePts: 0, side: "NEAR", displacement: "WEAK", reclaim: false,
        },
        weekAnchor: null,
    });

    if (!trueDayOpen || trueDayOpen === 0) return offResult("Day open unavailable");

    const atr = calcATR14(quotes15m);
    const bufferPts = Math.max(atr * 0.15, 3);

    const dayAnchor = buildAnchor("DAY", trueDayOpen, lastPrice, atr, bufferPts, quotes15m);
    const weekAnchor = trueWeekOpen
        ? buildAnchor("WEEK", trueWeekOpen, lastPrice, atr, bufferPts, quotes15m)
        : null;

    // Clarity score (not directional strength)
    const rawScore = calcClarityScore(dayAnchor, weekAnchor, atr);

    const alignment = calcAlignment(dayAnchor, weekAnchor);
    const direction = calcDirection(alignment);
    const macroContext = buildMacroContext(dayAnchor, weekAnchor, alignment);
    const guidance = buildGuidance(alignment, valueZone);

    // ── Feed meta: pick the feed that produced the Day Open anchor ──
    const dayOpenFoundFrom = params.dayOpenFoundFrom ?? "none";
    const anchorMeta: FeedMeta =
        dayOpenFoundFrom === "1m" && params.meta1m ? params.meta1m :
            dayOpenFoundFrom === "5m" && params.meta5m ? params.meta5m :
                dayOpenFoundFrom === "1d" && params.meta1d ? params.meta1d :
                    {
                        sourceUsed: params.source ?? "YAHOO",
                        lastBarTimeMs: params.lastBarTimeMs
                            ?? (quotes15m.length > 0 ? quotes15m[quotes15m.length - 1].time * 1000 : Date.now() - 20 * 60_000),
                    };

    const src = anchorMeta.sourceUsed;
    const lastBarMs = anchorMeta.lastBarTimeMs
        ?? (quotes15m.length > 0 ? quotes15m[quotes15m.length - 1].time * 1000 : Date.now() - 20 * 60_000);
    const mktStatus = params.marketStatus ?? "OPEN";

    const reliability = applyReliability({
        rawScore,
        lastBarTimeMs: lastBarMs,
        sourceUsed: src,
        marketStatus: mktStatus,
    });

    const finalScore = reliability.finalScore;

    // Build hint
    const dayLabel = `Day: ${dayAnchor.side} (${dayAnchor.distancePts > 0 ? "+" : ""}${dayAnchor.distancePts.toFixed(1)}pts, ${dayAnchor.displacement})`;
    const weekLabel = weekAnchor
        ? ` | Week: ${weekAnchor.side} (${weekAnchor.distancePts > 0 ? "+" : ""}${weekAnchor.distancePts.toFixed(1)}pts)`
        : " | Week: N/A";
    const hint = dayLabel + weekLabel;

    const factors: string[] = [
        `Alignment: ${alignment}`,
        `Day Open: ${dayAnchor.side} | ${dayAnchor.displacement} displacement`,
    ];
    if (weekAnchor) factors.push(`Week Open: ${weekAnchor.side} | ${weekAnchor.displacement} displacement`);
    else factors.push("Week Open: N/A (provider/week data missing)");
    if (dayAnchor.reclaim) factors.push("Day Open reclaim detected");
    if (weekAnchor?.reclaim) factors.push("Week Open reclaim detected");
    if (valueZone) factors.push(`ValueZone: ${valueZone}`);
    if (reliability.capApplied) factors.push(`${src} cap: ${rawScore} → ${Math.round(finalScore)}`);
    if (dayOpenFoundFrom !== "none") factors.push(`Anchor from: ${dayOpenFoundFrom}`);

    return {
        status: "OK",
        direction,
        alignment,
        guidance,
        macroContext,
        score: Math.round(finalScore),
        hint,
        debug: {
            factors,
            atr: atr.toFixed(2),
            bufferPts: bufferPts.toFixed(2),
            dayOpenFoundFrom,
            anchorSource: src,
        },
        meta: {
            rawScore: Math.round(rawScore),
            finalScore: Math.round(finalScore),
            sourceUsed: src,
            fallbackFrom: anchorMeta.fallbackFrom !== "YAHOO" ? anchorMeta.fallbackFrom : undefined,
            dataAgeMs: reliability.dataAgeMs,
            lastBarTimeMs: lastBarMs,
            capApplied: reliability.capApplied,
            capReason: reliability.capReason,
        },
        dayAnchor,
        weekAnchor,
    };
}
