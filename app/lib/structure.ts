import type { IndicatorSignal } from "@/app/lib/types";
import { Quote } from "@/app/lib/analysis";
import { applyReliability, type DataSource } from "@/app/lib/reliability";

export type StructureStrength = "WEAK" | "MODERATE" | "STRONG";

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

// OBV Calculation & Slope
function calculateOBV(quotes: Quote[]): number[] {
    if (quotes.length < 2) return [];
    let obv = 0;
    const result: number[] = [0];

    for (let i = 1; i < quotes.length; i++) {
        const curr = quotes[i];
        const prev = quotes[i - 1];
        if (curr.close > prev.close) {
            obv += curr.volume;
        } else if (curr.close < prev.close) {
            obv -= curr.volume;
        }
        result.push(obv);
    }
    return result;
}

// Linear Regression Slope (for last N periods)
function calculateSlope(values: number[], period: number): number {
    if (values.length < period) return 0;
    const slice = values.slice(-period);
    const n = slice.length;

    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += slice[i];
        sumXY += i * slice[i];
        sumXX += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
}

// EMA spread-based alignment score (replaces flat +25)
function emaAlignmentScore(spreadPct: number): number {
    if (spreadPct < 0.02) return 10;  // barely misaligned
    if (spreadPct < 0.05) return 20;
    if (spreadPct < 0.10) return 28;
    return 35;                          // strongly aligned
}

interface StructureParams {
    quotes: Quote[];
    dataStatus: "OK" | "DELAYED" | "BLOCKED" | "CLOSED";
    biasDirection?: "LONG" | "SHORT" | "NEUTRAL";
    lastBarTimeMs?: number;
    source?: DataSource;
    marketStatus?: "OPEN" | "CLOSED";
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
    const lastClose = closes[closes.length - 1];

    // Direction tolerance (avoid noise when EMAs are basically equal)
    const emaDiff = lastEMA20 - lastEMA50;
    const tol = Math.max(0.5, Math.abs(lastClose) * 0.00002);
    const emaSpreadPct = (Math.abs(emaDiff) / lastClose) * 100;

    const structureDirection: "LONG" | "SHORT" | "NEUTRAL" =
        Math.abs(emaDiff) <= tol ? "NEUTRAL" : emaDiff > 0 ? "LONG" : "SHORT";

    // ── OBV (VOLUME) LOGIC ────────────────────────────────────────
    const obvArr = calculateOBV(quotes);
    // Calculate normalized slope (relative to range) to make it scale-independent
    const obvSlopeRaw = calculateSlope(obvArr, 20);
    // Simple heuristic: Is OBV trending up or down over last 20 bars?
    const obvDirection = Math.abs(obvSlopeRaw) < 100 ? "NEUTRAL" : obvSlopeRaw > 0 ? "LONG" : "SHORT";

    // Check for Divergence
    let volumeState: "CONFIRMATION" | "DIVERGENCE" | "NEUTRAL" = "NEUTRAL";
    if (structureDirection !== "NEUTRAL" && obvDirection !== "NEUTRAL") {
        if (structureDirection === obvDirection) volumeState = "CONFIRMATION";
        else volumeState = "DIVERGENCE";
    }

    // ── REGIME ────────────────────────────────────────────────────
    let regime: "TRENDING" | "TRANSITION" | "RANGING";
    if (adx !== null && adx >= 25) regime = "TRENDING";
    else if (adx !== null && adx >= 20) regime = "TRANSITION";
    else regime = "RANGING";

    // ── SCORING ──────────────────────────────────────────────────
    let score = 0;
    const breakdown = { trend: 0, ema: 0, bias: 0, volume: 0 };

    // 1) Trend strength (ADX) — tiered
    if (adx !== null) {
        if (adx >= 35) breakdown.trend = 40; // Adjusted down to make room for volume
        else if (adx >= 30) breakdown.trend = 35;
        else if (adx >= 25) breakdown.trend = 28;
        else if (adx >= 20) breakdown.trend = 15;
        else breakdown.trend = 8;
        score += breakdown.trend;
    } else {
        breakdown.trend = 8;
        score += breakdown.trend;
    }

    // 2) EMA alignment quality — spread magnitude matters
    if (structureDirection !== "NEUTRAL") {
        breakdown.ema = emaAlignmentScore(emaSpreadPct);
        score += breakdown.ema;
    } else {
        score += 5;
    }

    // 3) Bias alignment bonus
    const biasDir = params.biasDirection || "NEUTRAL";
    if (biasDir === structureDirection && structureDirection !== "NEUTRAL") {
        breakdown.bias = 10;
        score += breakdown.bias;
    }

    // 4) Volume Confirmation (New in V3)
    if (volumeState === "CONFIRMATION") {
        breakdown.volume = 15;
        score += 15;
    } else if (volumeState === "DIVERGENCE") {
        breakdown.volume = -15; // Penalty for divergence (fake move)
        score -= 15;
    }

    // ── STRUCTURE STRENGTH ────────────────────────────────────────
    let structureStrength: StructureStrength;
    if (
        (score >= 75) ||
        (adx !== null && adx >= 30 && emaSpreadPct >= 0.05 && volumeState === "CONFIRMATION")
    ) {
        structureStrength = "STRONG";
    } else if (
        (score >= 45) ||
        (regime === "TRENDING" && volumeState !== "DIVERGENCE")
    ) {
        structureStrength = "MODERATE";
    } else {
        structureStrength = "WEAK";
    }

    // ── RELIABILITY ───────────────────────────────────────────────
    const rawScore = Math.max(0, Math.min(score, 100)); // Clamp 0-100
    const lastBarMs = params.lastBarTimeMs ?? (Date.now() - 20 * 60_000);
    const src = params.source ?? "YAHOO";
    const mktStatus = params.marketStatus ?? "OPEN";

    const reliability = applyReliability({
        rawScore,
        lastBarTimeMs: lastBarMs,
        sourceUsed: src,
        marketStatus: mktStatus,
    });

    const finalScore = reliability.finalScore;

    // ── STATUS ────────────────────────────────────────────────────
    let status: "WARN" | "OK" | "STRONG" | "OFF" | "ERROR" = "WARN";
    if (finalScore >= 75) status = "STRONG";
    else if (finalScore >= 60) status = "OK";
    else status = "WARN";

    // Dynamic Playbook Logic
    let playbook = "";
    if (regime === "TRENDING") {
        if (volumeState === "CONFIRMATION") playbook = "Strong Trend + Vol → Aggressive Pullbacks OK.";
        else if (volumeState === "DIVERGENCE") playbook = "Trend w/ Vol Div → Be cautious, likely fake.";
        else playbook = "Trend mode → trade pullbacks with structure.";
    } else if (regime === "RANGING") {
        playbook = "Range mode → fade extremes / mean reversion.";
    } else {
        playbook = "Transition → wait for breakout confirmation.";
    }

    const hint = `${regime} | ${structureDirection} | ADX ${adx?.toFixed(1) ?? "—"}`;

    return {
        status,
        direction: structureDirection,
        score: Math.round(finalScore),
        hint,
        debug: {
            factors: [
                `EMA20: ${lastEMA20.toFixed(2)}`,
                `EMA50: ${lastEMA50.toFixed(2)}`,
                `EMA spread: ${emaDiff.toFixed(2)} pts (${emaSpreadPct.toFixed(3)}%)`,
                `ADX: ${adx?.toFixed(1) ?? "N/A"}`,
                `Regime: ${regime}`,
                `OBV Slope: ${obvSlopeRaw.toFixed(1)} (${volumeState})`,
                `StructureStrength: ${structureStrength}`,
            ],
            regime,
            adx: adx !== null ? Math.round(adx * 10) / 10 : null,
            ema20: Math.round(lastEMA20 * 10) / 10,
            ema50: Math.round(lastEMA50 * 10) / 10,
            emaSpreadPts: +emaDiff.toFixed(2),
            emaSpreadPct: +emaSpreadPct.toFixed(3),
            structureStrength,
            bias: biasDir,
            playbook,
            obvSlope: +obvSlopeRaw.toFixed(1),
            volumeState,
            breakdown,
        } as any,
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
