import type { IndicatorSignal } from "@/app/lib/types";
import { Quote } from "@/app/lib/analysis"; // Utilizing existing Quote interface

// Minimal ADX Calculation (Local to avoid complex imports if not exported)
// Re-implements standard ADX(14) logic.
function calculateADX(quotes: Quote[], period = 14): number | null {
    if (quotes.length < period * 2) return null;

    let trs: number[] = [];
    let dmPlus: number[] = [];
    let dmMinus: number[] = [];

    for (let i = 1; i < quotes.length; i++) {
        const curr = quotes[i];
        const prev = quotes[i - 1];

        const tr = Math.max(curr.high - curr.low, Math.abs(curr.high - prev.close), Math.abs(curr.low - prev.close));
        trs.push(tr);

        const up = curr.high - prev.high;
        const down = prev.low - curr.low;

        dmPlus.push((up > down && up > 0) ? up : 0);
        dmMinus.push((down > up && down > 0) ? down : 0);
    }

    // Smoothed averages (Wilder's Smoothing)
    const smooth = (data: number[]) => {
        let res: number[] = [];
        let sum = data.slice(0, period).reduce((a, b) => a + b, 0);
        res.push(sum);
        for (let i = period; i < data.length; i++) {
            sum = sum - (sum / period) + data[i];
            res.push(sum);
        }
        return res;
    };

    const trSmooth = smooth(trs);
    const dpSmooth = smooth(dmPlus);
    const dmSmooth = smooth(dmMinus);

    const len = Math.min(trSmooth.length, dpSmooth.length, dmSmooth.length);
    if (len < period) return null;

    let dxs: number[] = [];
    for (let i = 0; i < len; i++) {
        const tr = trSmooth[i];
        if (tr === 0) continue;
        const pdi = (dpSmooth[i] / tr) * 100;
        const mdi = (dmSmooth[i] / tr) * 100;
        const dx = Math.abs(pdi - mdi) / (pdi + mdi) * 100;
        dxs.push(dx);
    }

    if (dxs.length < period) return null;
    // ADX is simple average of DX
    const adx = dxs.slice(dxs.length - period).reduce((a, b) => a + b, 0) / period;
    return adx;
}

// Simple EMA Calculation
function calculateEMA(values: number[], period: number): number[] {
    const k = 2 / (period + 1);
    const result: number[] = [];
    if (values.length < period) return [];

    let sum = 0;
    for (let i = 0; i < period; i++) sum += values[i];
    let ema = sum / period;
    result.push(ema);

    for (let i = period; i < values.length; i++) {
        ema = (values[i] - ema) * k + ema;
        result.push(ema);
    }
    return result;
}

interface StructureParams {
    quotes: Quote[]; // Should be 15m quotes
    session: IndicatorSignal;
    dataStatus: "OK" | "DELAYED" | "BLOCKED" | "CLOSED";
    biasDirection?: "LONG" | "SHORT" | "NEUTRAL";
}

export function getStructureSignal(params: StructureParams): IndicatorSignal {
    const { quotes, session, dataStatus } = params;

    if (dataStatus === "BLOCKED" || dataStatus === "CLOSED") {
        return {
            status: "OFF",
            direction: "NEUTRAL",
            score: 0,
            hint: "Data unavailable for structure analysis.",
            debug: { factors: [`DataStatus: ${dataStatus}`] }
        };
    }

    if (!quotes || quotes.length < 50) {
        return {
            status: "OFF",
            direction: "NEUTRAL",
            score: 0,
            hint: "Insufficient data for structure analysis.",
            debug: { factors: ["Not enough quotes"] }
        };
    }

    const closes = quotes.map(q => q.close);
    const ema20 = calculateEMA(closes, 20);
    const ema50 = calculateEMA(closes, 50);
    const adx = calculateADX(quotes, 14);

    const lastEMA20 = ema20[ema20.length - 1];
    const lastEMA50 = ema50[ema50.length - 1];

    // --- V4 REGIME LOGIC ---
    let regime: "TRENDING" | "TRANSITION" | "RANGING";
    if (adx !== null && adx >= 25) {
        regime = "TRENDING";
    } else if (adx !== null && adx >= 20) {
        regime = "TRANSITION";
    } else {
        regime = "RANGING";
    }

    // --- V4 SCORING LOGIC (0-100) ---
    let score = 0;
    const breakdown = {
        trend: 0,
        ema: 0,
        bias: 0
    };

    // 1. Trend Strength (ADX-based)
    if (adx !== null) {
        if (adx >= 30) {
            breakdown.trend = 45;
        } else if (adx >= 25) {
            breakdown.trend = 40;
        } else if (adx >= 20) {
            breakdown.trend = 25;
        } else {
            breakdown.trend = 15;
        }
        score += breakdown.trend;
    }

    // 2. EMA Alignment (directional structure)
    if (lastEMA20 > lastEMA50) {
        breakdown.ema = 25;
    } else if (lastEMA20 < lastEMA50) {
        breakdown.ema = 25;
    }
    score += breakdown.ema;

    // 3. Bias Alignment Bonus (compare with Bias indicator direction)
    const structureDirection: "LONG" | "SHORT" | "NEUTRAL" =
        lastEMA20 > lastEMA50 ? "LONG" : lastEMA20 < lastEMA50 ? "SHORT" : "NEUTRAL";

    const biasDir = params.biasDirection || "NEUTRAL";
    if (biasDir === structureDirection && structureDirection !== "NEUTRAL") {
        breakdown.bias = 10;
        score += breakdown.bias;
    }

    // Cap score
    score = Math.min(score, 100);

    // --- STATUS (Global Law) ---
    let status: "OK" | "WARN" | "STRONG" | "OFF" | "ERROR" = "OK";
    if (score >= 75) status = "STRONG";
    else if (score >= 60) status = "OK";
    else status = "WARN";

    // --- PLAYBOOK ---
    let playbook = "";
    if (regime === "TRENDING") {
        playbook = "Trend mode → trade pullbacks with structure.";
    } else if (regime === "RANGING") {
        playbook = "Range mode → fade extremes / mean reversion.";
    } else {
        playbook = "Transition → wait for breakout confirmation.";
    }

    // --- HINT ---
    const hint = `${regime} market (ADX ${adx?.toFixed(1) || "—"}). ${structureDirection} structure.`;

    const factors: string[] = [];
    factors.push(`EMA20: ${lastEMA20?.toFixed(2)}`);
    factors.push(`EMA50: ${lastEMA50?.toFixed(2)}`);
    factors.push(`ADX: ${adx?.toFixed(1) ?? 'N/A'}`);
    factors.push(`Regime: ${regime}`);

    return {
        status,
        direction: structureDirection,
        score: Math.round(score),
        hint,
        debug: {
            factors,
            regime,
            adx: adx !== null ? Math.round(adx * 10) / 10 : null,
            ema20: Math.round(lastEMA20 * 10) / 10,
            ema50: Math.round(lastEMA50 * 10) / 10,
            bias: biasDir,
            playbook,
            breakdown
        }
    };
}
