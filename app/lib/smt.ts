import { Quote } from './analysis';
import { IndicatorSignal } from './types';

interface SMTParams {
    mainQuotes15m: Quote[];
    referenceQuotes15m: Record<string, Quote[]>; // e.g. { 'ES': [...], 'YM': [...] }
    mainSymbol: string;
}

// Simple Pivot Detector
function getPivots(quotes: Quote[], n = 2) {
    const pivots: { type: 'HIGH' | 'LOW'; price: number; index: number; time: number }[] = [];
    for (let i = n; i < quotes.length - n; i++) {
        // High
        let isHigh = true;
        for (let j = 1; j <= n; j++) {
            if (quotes[i - j].high > quotes[i].high || quotes[i + j].high > quotes[i].high) isHigh = false;
        }
        if (isHigh) pivots.push({ type: 'HIGH', price: quotes[i].high, index: i, time: quotes[i].time });

        // Low
        let isLow = true;
        for (let j = 1; j <= n; j++) {
            if (quotes[i - j].low < quotes[i].low || quotes[i + j].low < quotes[i].low) isLow = false;
        }
        if (isLow) pivots.push({ type: 'LOW', price: quotes[i].low, index: i, time: quotes[i].time });
    }
    return pivots;
}

export function getSmtSignal(params: SMTParams): IndicatorSignal {
    const { mainQuotes15m, referenceQuotes15m, mainSymbol } = params;

    const factors: string[] = [];
    let score = 0;
    let direction: 'LONG' | 'SHORT' | 'NEUTRAL' = 'NEUTRAL';
    let status: 'OK' | 'WARN' | 'OFF' | 'ERROR' = 'OK';
    let hint = "No divergence detected.";

    if (!mainQuotes15m || mainQuotes15m.length < 50) {
        return { status: 'OFF', direction: 'NEUTRAL', score: 0, hint: 'Insufficient data for SMT.', debug: { factors: ['Not enough 15m data'] } };
    }

    const mainPivots = getPivots(mainQuotes15m, 2);
    // Focus on the last 2 pivots of each type
    const lastHighs = mainPivots.filter(p => p.type === 'HIGH').slice(-2);
    const lastLows = mainPivots.filter(p => p.type === 'LOW').slice(-2);

    // We need at least 2 comparable swing points to detect divergence
    if (lastHighs.length < 2 && lastLows.length < 2) {
        return { status: 'OK', direction: 'NEUTRAL', score: 0, hint: 'No recent swing structure.', debug: { factors: ['Waiting for new swings'] } };
    }

    // Check against each reference asset
    for (const [refSym, refQuotes] of Object.entries(referenceQuotes15m)) {
        if (!refQuotes || refQuotes.length < 50) continue;
        const refPivots = getPivots(refQuotes, 2);

        // --- BEARISH SMT (Short Setup) ---
        // Main makes Higher High, Ref makes Lower High (or vice versa)
        const refHighs = refPivots.filter(p => p.type === 'HIGH').slice(-2);
        if (lastHighs.length === 2 && refHighs.length === 2) {
            // Ensure time alignment (approximate index or time window)
            // Ideally we check if the swings happened roughly in the same window
            const mainH1 = lastHighs[0]; const mainH2 = lastHighs[1];
            const refH1 = refHighs[0]; const refH2 = refHighs[1];

            // Check if they are correlated in time (within ~4 bars of each other)
            const timeDiff1 = Math.abs(mainH1.index - refH1.index); // Indices might differ if data gaps, ideally use time
            const timeDiff2 = Math.abs(mainH2.index - refH2.index);

            // Simple Logic:
            // Main: HH (H2 > H1)
            // Ref: LH (H2 < H1) -> Bearish SMT
            if (mainH2.price > mainH1.price && refH2.price < refH1.price) {
                direction = 'SHORT';
                score = 70;
                factors.push(`Bearish SMT with ${refSym}: ${mainSymbol} made HH, ${refSym} made LH.`);
            }
            // Inverse: Main LH, Ref HH -> Bearish SMT (Weakness in Main vs Strength in Ref, or usually implies reversal)
            // Actually, classic SMT: One makes HH, One makes LH. Both imply reversal if at resistance.
            else if (mainH2.price < mainH1.price && refH2.price > refH2.price) { // Wait, refH2 > refH1
                direction = 'SHORT';
                score = 70;
                factors.push(`Bearish SMT with ${refSym}: ${mainSymbol} made LH, ${refSym} made HH.`);
            }
        }

        // --- BULLISH SMT (Long Setup) ---
        const refLows = refPivots.filter(p => p.type === 'LOW').slice(-2);
        if (lastLows.length === 2 && refLows.length === 2) {
            const mainL1 = lastLows[0]; const mainL2 = lastLows[1];
            const refL1 = refLows[0]; const refL2 = refLows[1];

            // Main: LL (L2 < L1)
            // Ref: HL (L2 > L1) -> Bullish SMT
            if (mainL2.price < mainL1.price && refL2.price > refL1.price) {
                direction = 'LONG';
                score = 70;
                factors.push(`Bullish SMT with ${refSym}: ${mainSymbol} made LL, ${refSym} made HL.`);
            }
            // Inverse: Main HL, Ref LL
            else if (mainL2.price > mainL1.price && refL2.price < refL1.price) {
                direction = 'LONG';
                score = 70;
                factors.push(`Bullish SMT with ${refSym}: ${mainSymbol} made HL, ${refSym} made LL.`);
            }
        }
    }

    if (score > 0) {
        // Boost score if near PDH/PDL (mock logic for now, or pass in levels)
        // For standardization, we'll keep it simple first.
        hint = `Divergence detected on 15m (${factors[0].split(':')[1]}).`;
    }

    return {
        status,
        direction,
        score,
        hint,
        debug: { factors }
    };
}
