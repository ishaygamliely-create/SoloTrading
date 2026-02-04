export interface VWAPBandValue {
    basis: number; // The VWAP line itself
    upper: number;
    lower: number;
    width: number;
}

/**
 * Calculates VWAP Bands (Bollinger Logic around VWAP)
 * 
 * Logic:
 * d[i] = close[i] - vwap[i]
 * sigma = rolling_stdev(d, period)
 * Upper = vwap + k * sigma
 * Lower = vwap - k * sigma
 * 
 * Requires existing VWAP values.
 */
export function calculateVWAPBands(
    closes: number[],
    vwaps: number[],
    period: number = 20,
    stdDevMultiplier: number = 2
): (VWAPBandValue | null)[] {
    const len = Math.min(closes.length, vwaps.length);
    if (len < period) return new Array(len).fill(null);

    const results: (VWAPBandValue | null)[] = [];

    for (let i = 0; i < len; i++) {
        if (i < period - 1) {
            results.push(null);
            continue;
        }

        // 1. Calculate deviations (d) for the rolling window
        const deviations: number[] = [];
        for (let j = 0; j < period; j++) {
            const idx = i - j;
            deviations.push(closes[idx] - vwaps[idx]);
        }

        // 2. Calculate Standard Deviation of these deviations
        // Mean of deviations? Usually we assume mean is 0 if we consider regression to mean, 
        // but for pure "std dev of the diff", we need the mean of the diffs.
        const meanDiff = deviations.reduce((a, b) => a + b, 0) / period;

        const variance = deviations.reduce((acc, val) => acc + Math.pow(val - meanDiff, 2), 0) / period;
        const sigma = Math.sqrt(variance);

        const currentVWAP = vwaps[i];
        const upper = currentVWAP + (sigma * stdDevMultiplier);
        const lower = currentVWAP - (sigma * stdDevMultiplier);
        const width = upper - lower;

        results.push({
            basis: currentVWAP,
            upper,
            lower,
            width
        });
    }

    return results;
}
