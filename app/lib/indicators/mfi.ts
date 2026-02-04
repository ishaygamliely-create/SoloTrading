export interface MFIValue {
    mfi: number;
    overbought: boolean;
    oversold: boolean;
}

/**
 * Calculates Money Flow Index (MFI)
 * Length: 14 default
 * Logic:
 * Typical Price (TP) = (High + Low + Close) / 3
 * Raw Money Flow (RMF) = TP * Volume
 * Positive Flow = RMF where TP > Prev TP
 * Negative Flow = RMF where TP < Prev TP
 * MFR = (Sum Pos / Sum Neg) over N
 * MFI = 100 - (100 / (1 + MFR))
 */
export function calculateMFI(
    highs: number[],
    lows: number[],
    closes: number[],
    volumes: number[],
    period: number = 14
): (MFIValue | null)[] {
    if (closes.length < period + 1) return new Array(closes.length).fill(null);

    const typicalPrices: number[] = [];
    for (let i = 0; i < closes.length; i++) {
        typicalPrices.push((highs[i] + lows[i] + closes[i]) / 3);
    }

    const results: (MFIValue | null)[] = [];

    // Pre-calculate flows to efficient loop or just loop window
    // Window loop is fine for N=14

    // Need prev price, so meaningful data starts at index 1
    // MFI window starts at index 1 + period

    for (let i = 0; i < closes.length; i++) {
        if (i < period) {
            results.push(null);
            continue;
        }

        let positiveFlow = 0;
        let negativeFlow = 0;

        // Iterate backwards 'period' times
        for (let j = 0; j < period; j++) {
            const currIdx = i - j;
            const prevIdx = currIdx - 1;

            if (prevIdx < 0) break; // Should not happen with i >= period

            const tpCurr = typicalPrices[currIdx];
            const tpPrev = typicalPrices[prevIdx];
            const rmf = tpCurr * volumes[currIdx];

            if (tpCurr > tpPrev) {
                positiveFlow += rmf;
            } else if (tpCurr < tpPrev) {
                negativeFlow += rmf;
            }
            // If equal, discarded
        }

        let mfi = 50; // default neutral
        if (negativeFlow === 0) {
            mfi = 100;
        } else {
            const mfr = positiveFlow / negativeFlow;
            mfi = 100 - (100 / (1 + mfr));
        }

        results.push({
            mfi,
            overbought: mfi > 80,
            oversold: mfi < 20
        });
    }

    return results;
}
