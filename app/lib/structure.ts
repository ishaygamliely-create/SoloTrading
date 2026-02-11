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

    const factors: string[] = [];
    factors.push(`EMA20: ${lastEMA20?.toFixed(2)}`);
    factors.push(`EMA50: ${lastEMA50?.toFixed(2)}`);
    factors.push(`ADX: ${adx?.toFixed(1) ?? 'N/A'}`);

    let direction: "LONG" | "SHORT" | "NEUTRAL" = "NEUTRAL";
    let score = 0;
    let label = "RANGING";
    let status: "OK" | "WARN" | "OFF" | "ERROR" = "OK";
    let hint = "";

    const isTrending = (adx !== null && adx >= 25);

    if (isTrending) {
        label = "TRENDING";
        score = 70; // Base Trending Score

        if (lastEMA20 > lastEMA50) {
            direction = "LONG";
            hint = "Trend UP: prefer pullback longs.";
        } else {
            direction = "SHORT";
            hint = "Trend DOWN: prefer pullback shorts.";
        }

        if (adx >= 30) {
            score += 20;
            factors.push("Strong Trend (ADX >= 30) (+20)");
        }
    } else {
        label = "RANGING";
        score = 40; // Base Ranging Score
        direction = "NEUTRAL";
        hint = "Range conditions: favor mean reversion.";

        // Minor directional bias based on EMA stack even if ranging
        if (lastEMA20 > lastEMA50) factors.push("Bias: Weak Bullish (EMA20 > EMA50)");
        else factors.push("Bias: Weak Bearish (EMA20 < EMA50)");
    }

    // Session Soft Impact
    const isOffHours = session.score <= 20;
    if (isOffHours && score > 0) {
        score -= 15;
        status = "WARN";
        factors.push("Off-hours: score reduced (-15)");
    }

    score = Math.max(0, Math.min(100, score));

    return {
        status,
        direction,
        score,
        hint,
        debug: {
            factors,
            label,
            adx: adx?.toFixed(1),
            ema20: lastEMA20,
            ema50: lastEMA50
        }
    };
}
