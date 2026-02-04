export interface MACDValue {
    macd: number;
    signal: number;
    histogram: number;
    cross: 'BULLISH' | 'BEARISH' | null;
}

/**
 * Calculates MACD (12, 26, 9)
 */
export function calculateMACD(
    closes: number[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
): (MACDValue | null)[] {
    if (closes.length < slowPeriod) return new Array(closes.length).fill(null);

    // Helpers
    const calculateEMA = (values: number[], period: number): number[] => {
        const k = 2 / (period + 1);
        const emas: number[] = [];
        let ema = values[0]; // Start with first value (simple approach) or SMA of first N

        // Better Initializer: SMA of first N
        // But for consistency with typical streaming updates, we often just iterate.
        // Let's use SMA for the first 'period' elements to seed.
        if (values.length < period) return values; // fallback

        const seedSum = values.slice(0, period).reduce((a, b) => a + b, 0);
        ema = seedSum / period;

        // Fill pre-period with null or partials? Standard is to start output at period-1
        // To simplify, we'll map 1:1 but valid only after period.
        for (let i = 0; i < period - 1; i++) emas.push(NaN);
        emas.push(ema); // The first valid EMA point

        for (let i = period; i < values.length; i++) {
            ema = (values[i] - ema) * k + ema;
            emas.push(ema);
        }
        return emas;
    };

    const fastEMA = calculateEMA(closes, fastPeriod);
    const slowEMA = calculateEMA(closes, slowPeriod);

    const macdLine: number[] = [];
    const validStartIndex = slowPeriod - 1;

    // Determine MACD Line
    for (let i = 0; i < closes.length; i++) {
        if (i < validStartIndex || isNaN(fastEMA[i]) || isNaN(slowEMA[i])) {
            macdLine.push(NaN);
        } else {
            macdLine.push(fastEMA[i] - slowEMA[i]);
        }
    }

    // Determine Signal Line (EMA of MACD)
    // We need to extract the valid part of MACD line to run EMA on it, then pad back
    const validMACDValues = macdLine.filter(v => !isNaN(v));
    const signalLineRaw = calculateEMA(validMACDValues, signalPeriod);

    // pad signal line with NaNs to align with original array
    const signalLine: number[] = new Array(closes.length).fill(NaN);
    const signalOffset = validStartIndex + signalPeriod - 1;

    // Re-align
    for (let i = 0; i < signalLineRaw.length; i++) {
        if (!isNaN(signalLineRaw[i])) {
            signalLine[signalOffset + (i - (signalPeriod - 1))] = signalLineRaw[i];
        }
    }

    const results: (MACDValue | null)[] = [];

    for (let i = 0; i < closes.length; i++) {
        const m = macdLine[i];
        const s = signalLine[i];

        if (isNaN(m) || isNaN(s)) {
            results.push(null);
            continue;
        }

        const h = m - s;

        // Crossover check
        let cross: 'BULLISH' | 'BEARISH' | null = null;
        if (i > 0) {
            const prevM = macdLine[i - 1];
            const prevS = signalLine[i - 1];
            if (!isNaN(prevM) && !isNaN(prevS)) {
                if (prevM <= prevS && m > s) cross = 'BULLISH';
                else if (prevM >= prevS && m < s) cross = 'BEARISH';
            }
        }

        results.push({
            macd: m,
            signal: s,
            histogram: h,
            cross
        });
    }

    return results;
}
