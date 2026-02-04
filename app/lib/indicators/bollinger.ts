export interface BollingerBandValue {
    middle: number;
    upper: number;
    lower: number;
    bandwidth: number;
    percentB: number;
}

/**
 * Calculates Classic Bollinger Bands
 * Formula:
 * Middle = SMA(20)
 * Upper = Middle + 2 * StdDev(20)
 * Lower = Middle - 2 * StdDev(20)
 */
export function calculateBollingerBands(
    closes: number[],
    period: number = 20,
    stdDevMultiplier: number = 2
): (BollingerBandValue | null)[] {
    if (closes.length < period) return new Array(closes.length).fill(null);

    const results: (BollingerBandValue | null)[] = [];

    // Simple SMA helper
    const getSMA = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

    // Standard Deviation helper
    const getStdDev = (arr: number[], mean: number) => {
        const variance = arr.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / arr.length;
        return Math.sqrt(variance);
    };

    for (let i = 0; i < closes.length; i++) {
        if (i < period - 1) {
            results.push(null);
            continue;
        }

        const slice = closes.slice(i - period + 1, i + 1);
        const middle = getSMA(slice);
        const stdDev = getStdDev(slice, middle);

        const upper = middle + (stdDev * stdDevMultiplier);
        const lower = middle - (stdDev * stdDevMultiplier);

        const bandwidth = (upper - lower) / middle;
        const percentB = (upper - lower) === 0 ? 0 : (closes[i] - lower) / (upper - lower);

        results.push({
            middle,
            upper,
            lower,
            bandwidth,
            percentB
        });
    }

    return results;
}
