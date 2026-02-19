/**
 * True Open Context V3
 *
 * Score = CLARITY of macro displacement, not directional strength.
 * - High score means price has moved clearly away from the open (relative to ATR).
 * - Direction (LONG/SHORT/NEUTRAL) comes from alignment only.
 *
 * Week-missing rule:
 * - weekOpenPrice null → Day-only mode. Alignment from day alone (NOT MIXED).
 *
 * Week-near rule:
 * - weekOpenPrice present but within ATR buffer → keep day alignment, add note.
 *   Do NOT force MIXED.
 */

import type { IndicatorSignal } from "@/app/lib/types";
import { applyReliability, type DataSource } from "@/app/lib/reliability";

// ── Types ────────────────────────────────────────────────────────

export type TrueOpenAlignment = "ALIGNED_BULL" | "ALIGNED_BEAR" | "MIXED" | "NEAR";
export type ValueZoneLabel = "PREMIUM" | "DISCOUNT" | "EQUILIBRIUM" | null;

/** Feed meta passed from route — selected by dayOpenFoundFrom */
export interface TrueOpenFeedMeta {
    sourceUsed: DataSource;
    lastBarTimeMs: number | null;
    fallbackFrom?: DataSource;
    marketStatus?: "OPEN" | "CLOSED";
}

export interface TrueOpenParams {
    currentPrice: number;
    /** ATR14 from 15m candles — caller computes this */
    atr14: number | null;
    dayOpenPrice: number | null;
    weekOpenPrice: number | null;
    /** Feed meta for reliability — should match the feed that found the anchor */
    feedMeta: TrueOpenFeedMeta;
    valueZone?: ValueZoneLabel;
    /** Optional provider note when week is unavailable */
    weekOpenReason?: string;
}

// ── Internals ────────────────────────────────────────────────────

type Side = "ABOVE" | "BELOW" | "NEAR";
type Strength = "WEAK" | "MED" | "STRONG";

interface AnchorInfo {
    side: Side;
    pts: number;     // signed: positive = above, negative = below
    ratio: number;   // abs(pts) / ATR
    strength: Strength;
}

function sideOf(price: number, anchor: number, buffer: number): AnchorInfo {
    const pts = price - anchor;
    const absPts = Math.abs(pts);
    const ratio = absPts;   // stored pre-division; we divide by atr later
    const side: Side = absPts <= buffer ? "NEAR" : pts > 0 ? "ABOVE" : "BELOW";
    return { side, pts, ratio, strength: "WEAK" }; // strength filled after ATR division
}

function computeStrength(ratio: number): Strength {
    if (ratio > 2) return "STRONG";
    if (ratio > 1) return "MED";
    return "WEAK";
}

function clarityFromRatio(r: number): number {
    if (r < 0.5) return 25;
    if (r < 1.0) return 45;
    if (r < 2.0) return 70;
    return 85;
}

// ── Guidance ─────────────────────────────────────────────────────

function buildGuidance(alignment: TrueOpenAlignment, valueZone: ValueZoneLabel): string {
    if (alignment === "ALIGNED_BULL") {
        if (valueZone === "PREMIUM") return "Bullish context, but PREMIUM → wait for pullback into DISCOUNT.";
        if (valueZone === "EQUILIBRIUM") return "Bullish macro but mid-range: prefer pullback to DISCOUNT or wait for PSP trigger.";
        if (valueZone === "DISCOUNT") return "Bullish context + DISCOUNT → long setups have better location.";
        return "Bullish macro context → prefer longs on pullbacks (use PSP/Liquidity for timing).";
    }
    if (alignment === "ALIGNED_BEAR") {
        if (valueZone === "DISCOUNT") return "Bearish context, but DISCOUNT → wait for rally into PREMIUM.";
        if (valueZone === "EQUILIBRIUM") return "Bearish macro but mid-range: prefer rally to PREMIUM or wait for PSP trigger.";
        if (valueZone === "PREMIUM") return "Bearish context + PREMIUM → short setups have better location.";
        return "Bearish macro context → prefer shorts on rallies (use PSP/Liquidity for timing).";
    }
    if (alignment === "MIXED") {
        if (valueZone === "EQUILIBRIUM") return "Neutral mid-range: wait for alignment / PSP trigger.";
        return "Mixed day/week context → reduce size, wait for alignment.";
    }
    // NEAR
    if (valueZone === "EQUILIBRIUM") return "Neutral mid-range: wait for alignment / PSP trigger.";
    return "Near open / unclear → treat as neutral context. No directional bias.";
}

// ── Main export ──────────────────────────────────────────────────

export function getTrueOpenSignal(params: TrueOpenParams): IndicatorSignal {
    const {
        currentPrice,
        atr14,
        dayOpenPrice,
        weekOpenPrice,
        feedMeta,
        valueZone = null,
        weekOpenReason,
    } = params;

    const src = feedMeta.sourceUsed;
    const lastBarMs = feedMeta.lastBarTimeMs ?? Date.now() - 20 * 60_000;
    const mktStatus = feedMeta.marketStatus ?? "OPEN";

    // ── OFF: missing day open or ATR ─────────────────────────────
    if (!dayOpenPrice || !atr14 || atr14 <= 0) {
        const reliability = applyReliability({ rawScore: 0, lastBarTimeMs: lastBarMs, sourceUsed: src, marketStatus: mktStatus });
        return {
            status: "OFF",
            direction: "NEUTRAL",
            score: 0,
            hint: "True Open unavailable (missing Day Open / ATR).",
            meta: {
                rawScore: 0, finalScore: 0,
                sourceUsed: src,
                fallbackFrom: feedMeta.fallbackFrom !== "YAHOO" ? feedMeta.fallbackFrom : undefined,
                dataAgeMs: reliability.dataAgeMs,
                lastBarTimeMs: lastBarMs,
                capApplied: false,
            },
            debug: { factors: [], currentPrice, dayOpenPrice, weekOpenPrice, reason: "Missing dayOpenPrice or atr14" },
        };
    }

    const buffer = Math.max(atr14 * 0.15, 3);

    // ── Day anchor ────────────────────────────────────────────────
    const dayRaw = sideOf(currentPrice, dayOpenPrice, buffer);
    const dayRatio = Math.abs(dayRaw.pts) / atr14;
    const day: AnchorInfo = { ...dayRaw, ratio: dayRatio, strength: computeStrength(dayRatio) };
    const dayDir = day.side === "ABOVE" ? "BULL" : day.side === "BELOW" ? "BEAR" : "NEAR";

    // ── Clarity base score ────────────────────────────────────────
    let rawScore = clarityFromRatio(dayRatio);

    // ── Alignment — V3 rules ──────────────────────────────────────
    let alignment: TrueOpenAlignment = "NEAR";
    let week: AnchorInfo | null = null;
    let weekNote: string | null = null;

    if (weekOpenPrice == null) {
        // ✅ Week missing → Day-only mode (NOT MIXED)
        alignment =
            dayDir === "BULL" ? "ALIGNED_BULL" :
                dayDir === "BEAR" ? "ALIGNED_BEAR" : "NEAR";
        weekNote = "Week unavailable → using Day only.";
    } else {
        const weekRaw = sideOf(currentPrice, weekOpenPrice, buffer);
        const weekRatio = Math.abs(weekRaw.pts) / atr14;
        week = { ...weekRaw, ratio: weekRatio, strength: computeStrength(weekRatio) };
        const weekDir = week.side === "ABOVE" ? "BULL" : week.side === "BELOW" ? "BEAR" : "NEAR";

        if (dayDir === "NEAR") {
            alignment = "NEAR";                         // day unclear → NEAR regardless
        } else if (weekDir === "NEAR") {
            // ✅ Week exists but near buffer — keep day alignment, don't force MIXED
            alignment = dayDir === "BULL" ? "ALIGNED_BULL" : "ALIGNED_BEAR";
            weekNote = "Week near buffer → low influence.";
        } else if (dayDir === weekDir) {
            // Both agree → clarity bonus
            alignment = dayDir === "BULL" ? "ALIGNED_BULL" : "ALIGNED_BEAR";
            rawScore = Math.min(95, rawScore + 10);
        } else {
            // Disagreement → MIXED, slight clarity reduction
            alignment = "MIXED";
            rawScore = Math.max(25, rawScore - 10);
        }
    }

    const direction: "LONG" | "SHORT" | "NEUTRAL" =
        alignment === "ALIGNED_BULL" ? "LONG" :
            alignment === "ALIGNED_BEAR" ? "SHORT" : "NEUTRAL";

    const macroBase =
        alignment === "ALIGNED_BULL" ? "Above Day/Week open → bullish macro context." :
            alignment === "ALIGNED_BEAR" ? "Below Day/Week open → bearish macro context." :
                alignment === "MIXED" ? "Day/Week open context is mixed." :
                    "Near open → unclear macro context.";
    const macroContext = weekNote ? `${macroBase} (${weekNote})` : macroBase;

    const guidance = buildGuidance(alignment, valueZone);

    // ── Reliability ───────────────────────────────────────────────
    const reliability = applyReliability({
        rawScore,
        lastBarTimeMs: lastBarMs,
        sourceUsed: src,
        marketStatus: mktStatus,
    });

    return {
        status: "OK",
        direction,
        score: Math.round(reliability.finalScore),
        hint: macroBase,
        meta: {
            rawScore: Math.round(rawScore),
            finalScore: Math.round(reliability.finalScore),
            sourceUsed: src,
            fallbackFrom: feedMeta.fallbackFrom !== "YAHOO" ? feedMeta.fallbackFrom : undefined,
            dataAgeMs: reliability.dataAgeMs,
            lastBarTimeMs: lastBarMs,
            capApplied: reliability.capApplied,
            capReason: reliability.capReason,
        },
        debug: {
            factors: [],   // required by IndicatorSignal.debug type
            // ✅ Audit fields — prices for user verification
            currentPrice,
            dayOpenPrice,
            weekOpenPrice,
            buffer: +buffer.toFixed(2),
            atr14: +atr14.toFixed(2),

            alignment,
            valueZone,

            macroContext,
            guidance,

            day,
            week,

            weekOpenReason: weekOpenPrice == null
                ? (weekOpenReason ?? "provider/week data missing")
                : null,
            weekNote,
        },
    };
}
