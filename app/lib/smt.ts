// ==========================================
// SMT Divergence v3
// MNQ vs MES/MYM with:
// ✓ Swing divergence
// ✓ Time alignment (±3 bars)
// ✓ Sweep quality scoring
// ✓ Recency filter (NEW)
// ==========================================

import { IndicatorSignal } from "./types"

export type Quote = {
    time: number
    high: number
    low: number
    close: number
}

// ===== CONFIG =====
const SWING_LOOKBACK = 2
const ALIGNMENT_BARS = 3
const RECENCY_HOURS = 6   // <<< NEW (easy to change)

// =========================
// Swing detection
// =========================
function findSwings(quotes: Quote[]) {
    const highs: number[] = []
    const lows: number[] = []

    for (let i = SWING_LOOKBACK; i < quotes.length - SWING_LOOKBACK; i++) {
        const h = quotes[i].high
        const l = quotes[i].low

        const left = quotes.slice(i - SWING_LOOKBACK, i)
        const right = quotes.slice(i + 1, i + 1 + SWING_LOOKBACK)

        if (left.every(q => h > q.high) && right.every(q => h > q.high)) highs.push(i)
        if (left.every(q => l < q.low) && right.every(q => l < q.low)) lows.push(i)
    }

    return { highs, lows }
}

// =========================
// helpers
// =========================
function withinAlignment(a: number, b: number) {
    return Math.abs(a - b) <= ALIGNMENT_BARS
}

function hoursAgo(tsSec: number) {
    return (Date.now() - tsSec * 1000) / (1000 * 60 * 60)
}

// =========================
// MAIN
// =========================
export function getSmtSignal(
    mnq: Quote[],
    mes: Quote[],
    mym: Quote[]
): IndicatorSignal {

    if (!mnq?.length || !mes?.length || !mym?.length) {
        return {
            status: "OFF",
            direction: "NEUTRAL",
            score: 0,
            hint: "Missing SMT data",
            debug: { factors: [] }
        }
    }

    const mSw = findSwings(mnq)
    const eSw = findSwings(mes)
    const ySw = findSwings(mym)

    const lastHigh = mSw.highs.at(-1)
    const prevHigh = mSw.highs.at(-2)
    const lastLow = mSw.lows.at(-1)
    const prevLow = mSw.lows.at(-2)

    let score = 0
    let direction: "LONG" | "SHORT" | "NEUTRAL" = "NEUTRAL"
    const factors: string[] = []

    // ===================================================
    // NEW: RECENCY FILTER
    // ===================================================
    const lastSwingIndex = Math.max(lastHigh ?? 0, lastLow ?? 0)
    const lastSwingTime = mnq[lastSwingIndex]?.time

    if (lastSwingTime && hoursAgo(lastSwingTime) > RECENCY_HOURS) {
        return {
            status: "OK",
            direction: "NEUTRAL",
            score: 0,
            hint: "SMT too old (stale divergence ignored)",
            debug: { factors: ["RECENCY FILTER"] }
        }
    }

    // ===================================================
    // BULLISH (HL vs LL)
    // ===================================================
    if (lastLow !== undefined && prevLow !== undefined) {
        const mnqHL = mnq[lastLow].low > mnq[prevLow].low

        const mesLow = eSw.lows.find(i => withinAlignment(i, lastLow))
        const mymLow = ySw.lows.find(i => withinAlignment(i, lastLow))

        let confirmations = 0

        if (mesLow !== undefined && mes[mesLow].low < mes[prevLow]?.low) {
            confirmations++
            factors.push("Bullish SMT vs MES (sweep)")
        }

        if (mymLow !== undefined && mym[mymLow].low < mym[prevLow]?.low) {
            confirmations++
            factors.push("Bullish SMT vs MYM (sweep)")
        }

        if (mnqHL && confirmations > 0) {
            direction = "LONG"
            score += confirmations === 2 ? 75 : 45
        }
    }

    // ===================================================
    // BEARISH (LH vs HH)
    // ===================================================
    if (lastHigh !== undefined && prevHigh !== undefined) {
        const mnqLH = mnq[lastHigh].high < mnq[prevHigh].high

        const mesHigh = eSw.highs.find(i => withinAlignment(i, lastHigh))
        const mymHigh = ySw.highs.find(i => withinAlignment(i, lastHigh))

        let confirmations = 0

        if (mesHigh !== undefined && mes[mesHigh].high > mes[prevHigh]?.high) {
            confirmations++
            factors.push("Bearish SMT vs MES (sweep)")
        }

        if (mymHigh !== undefined && mym[mymHigh].high > mym[prevHigh]?.high) {
            confirmations++
            factors.push("Bearish SMT vs MYM (sweep)")
        }

        if (mnqLH && confirmations > 0) {
            direction = "SHORT"
            score += confirmations === 2 ? 75 : 45
        }
    }

    // ===================================================
    // GATE LOGIC
    // ===================================================
    const GATE_TTL_HOURS = 3;
    const isStrong = direction !== "NEUTRAL" && score >= 70 && score > 0; // status is implied by score > 0 logic below, but kept explicit in isStrong definition
    const swingTimeSec = lastSwingTime ?? 0;

    let gate = {
        isActive: false,
        blocksDirection: null as "LONG" | "SHORT" | null,
        expiresAtMs: 0,
        remainingMin: 0,
        reason: ""
    };

    if (isStrong && swingTimeSec > 0) {
        const expiresAtMs = (swingTimeSec * 1000) + (GATE_TTL_HOURS * 60 * 60 * 1000);
        const now = Date.now();
        const remainingMin = Math.max(0, Math.floor((expiresAtMs - now) / 60000));

        if (now < expiresAtMs) {
            gate = {
                isActive: true,
                blocksDirection: direction === "LONG" ? "SHORT" : "LONG",
                expiresAtMs,
                remainingMin,
                reason: `Strong ${direction} SMT blocks ${direction === "LONG" ? "SHORTS" : "LONGS"} (${GATE_TTL_HOURS}h TTL)`
            };
        }
    }

    return {
        status: score > 0 ? "OK" : "OK",
        direction,
        score,
        hint:
            score > 0
                ? `SMT ${direction} divergence detected`
                : "No SMT divergence",
        isStrong,
        lastSwingTimeSec: swingTimeSec,
        gate,
        debug: { factors }
    }
}
