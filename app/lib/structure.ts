import type { IndicatorSignal } from "@/app/lib/types";
import { Quote } from "@/app/lib/analysis";

// ADX Calculation (Wilder's Smoothing)
function calculateADX(quotes: Quote[], period = 14): number | null {
    if (quotes.length < period * 2) return null;

    let trs: number[] = [];
    let dmPlus: number[] = [];
    let dmMinus: number[] = [];

    for (let i = 1; i < quotes.length; i++) {
        const curr = quotes[i];
        const prev = quotes[i - 1];

        const tr = Math.max(
            curr.high - curr.low,
            Math.abs(curr.high - prev.close),
            Math.abs(curr.low - prev.close)
        );
        trs.push(tr);

        const up = curr.high - prev.high;
        const down = prev.low - curr.low;

        dmPlus.push(up > down && up > 0 ? up : 0);
        dmMinus.push(down > up && down > 0 ? down : 0);
    }

    const smooth = (data: number[]) => {
        let res: number[] = [];
        let sum = data.slice(0, period).reduce((a, b) => a + b, 0);
        res.push(sum);
        for (let i = period; i < data.length; i++) {
            sum = sum - sum / period + data[i];
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
        const denom = pdi + mdi;
        if (denom === 0) continue;
        const dx = (Math.abs(pdi - mdi) / denom) * 100;
        dxs.push(dx);
    }

    if (dxs.length < period) return null;
    return dxs.slice(dxs.length - period).reduce((a, b) => a + b, 0) / period;
}

// EMA Calculation
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
    quotes: Quote[];
    dataStatus: "OK" | "DELAYED" | "BLOCKED" | "CLOSED";
    biasDirection?: "LONG" | "SHORT" | "NEUTRAL";
}

export function getStructureSignal(params: StructureParams): IndicatorSignal {
    const { quotes, dataStatus } = params;

    if (dataStatus === "BLOCKED" || dataStatus === "CLOSED") {
        return {
            status: "OFF",
            direction: "NEUTRAL",
            score: 0,
            hint: "Data unavailable.",
            debug: { factors: [`DataStatus: ${dataStatus}`] },
        };
    }

    if (!quotes || quotes.length < 80) {
        return {
            status: "OFF",
            direction: "NEUTRAL",
            score: 0,
            hint: "Insufficient data.",
            debug: { factors: ["Not enough quotes"] },
        };
    }

    const closes = quotes.map((q) => q.close);
    const ema20Arr = calculateEMA(closes, 20);
    const ema50Arr = calculateEMA(closes, 50);
    const adx = calculateADX(quotes, 14);

    const lastEMA20 = ema20Arr[ema20Arr.length - 1];
    const lastEMA50 = ema50Arr[ema50Arr.length - 1];

    // Direction tolerance (avoid noise when EMAs are basically equal)
    const emaDiff = lastEMA20 - lastEMA50;
    const tol = Math.max(0.5, Math.abs(closes[closes.length - 1]) * 0.00002); // ~0.002% or 0.5 pts fallback

    const structureDirection: "LONG" | "SHORT" | "NEUTRAL" =
        Math.abs(emaDiff) <= tol ? "NEUTRAL" : emaDiff > 0 ? "LONG" : "SHORT";

    // --- REGIME ---
    let regime: "TRENDING" | "TRANSITION" | "RANGING";
    if (adx !== null && adx >= 25) regime = "TRENDING";
    else if (adx !== null && adx >= 20) regime = "TRANSITION";
    else regime = "RANGING";

    // --- SCORING (0-100) ---
    let score = 0;
    const breakdown = { trend: 0, ema: 0, bias: 0 };

    // 1) Trend strength (ADX)
    if (adx !== null) {
        if (adx >= 30) breakdown.trend = 45;
        else if (adx >= 25) breakdown.trend = 40;
        else if (adx >= 20) breakdown.trend = 25;
        else breakdown.trend = 15;
        score += breakdown.trend;
    } else {
        // If ADX is missing, be conservative
        breakdown.trend = 10;
        score += breakdown.trend;
    }

    // 2) EMA alignment quality (only if not NEUTRAL)
    if (structureDirection !== "NEUTRAL") {
        breakdown.ema = 25;
        score += breakdown.ema;
    }

    // 3) Bias alignment bonus
    const biasDir = params.biasDirection || "NEUTRAL";
    if (biasDir === structureDirection && structureDirection !== "NEUTRAL") {
        breakdown.bias = 10;
        score += breakdown.bias;
    }

    score = Math.min(score, 100);

    // --- STATUS (GLOBAL LAW) ---
    // 0–59 WARN | 60–74 OK | 75+ STRONG
    let status: "WARN" | "OK" | "STRONG" | "OFF" | "ERROR" = "WARN";
    if (score >= 75) status = "STRONG";
    else if (score >= 60) status = "OK";
    else status = "WARN";

    // If delayed feed, cap at 74 (never STRONG)
    if (dataStatus === "DELAYED" && score >= 75) {
        score = 74;
        status = "OK";
    }

    const playbook =
        regime === "TRENDING"
            ? "Trend mode → trade pullbacks with structure."
            : regime === "RANGING"
                ? "Range mode → fade extremes / mean reversion."
                : "Transition → wait for breakout confirmation.";

    const hint = `${regime} | ${structureDirection} | ADX ${adx?.toFixed(1) ?? "—"}`;

    return {
        status,
        direction: structureDirection,
        score: Math.round(score),
        hint,
        debug: {
            factors: [
                `EMA20: ${lastEMA20.toFixed(2)}`,
                `EMA50: ${lastEMA50.toFixed(2)}`,
                `EMA diff: ${emaDiff.toFixed(2)} (tol ${tol.toFixed(2)})`,
                `ADX: ${adx?.toFixed(1) ?? "N/A"}`,
                `Regime: ${regime}`,
            ],
            regime,
            adx: adx !== null ? Math.round(adx * 10) / 10 : null,
            ema20: Math.round(lastEMA20 * 10) / 10,
            ema50: Math.round(lastEMA50 * 10) / 10,
            bias: biasDir,
            playbook,
            breakdown,
        } as any,
    };
}
