
import { Quote } from './analysis';

export type PSPState = 'NONE' | 'FORMING' | 'CONFIRMED';
export type PSPDirection = 'LONG' | 'SHORT' | 'NEUTRAL';

export interface PSPResult {
    direction: PSPDirection;
    state: PSPState;
    score: number;
    reasons: string[];
    missing: string[];
    levels?: {
        sweepLevel?: number;
        displacementHigh?: number;
        displacementLow?: number;
        entryZoneLow?: number;
        entryZoneHigh?: number;
        invalidate?: number;
    };
    checkmarks: {
        sweep: boolean;
        displacement: boolean;
        pullback: boolean;
        continuation: boolean;
    };
}

interface SwingPoint {
    index: number;
    price: number;
    type: 'HIGH' | 'LOW';
}

// Helper to find swing points (fractals)
function findSwings(quotes: Quote[], left: number = 2, right: number = 2): SwingPoint[] {
    const swings: SwingPoint[] = [];
    for (let i = left; i < quotes.length - right; i++) {
        const current = quotes[i];

        // Swing High
        let isHigh = true;
        for (let j = 1; j <= left; j++) if (quotes[i - j].high >= current.high) isHigh = false;
        for (let j = 1; j <= right; j++) if (quotes[i + j].high > current.high) isHigh = false;

        // Swing Low
        let isLow = true;
        for (let j = 1; j <= left; j++) if (quotes[i - j].low <= current.low) isLow = false;
        for (let j = 1; j <= right; j++) if (quotes[i + j].low < current.low) isLow = false;

        if (isHigh) swings.push({ index: i, price: current.high, type: 'HIGH' });
        if (isLow) swings.push({ index: i, price: current.low, type: 'LOW' });
    }
    return swings;
}

// Calculate ATR for displacement check
function calculateATR(quotes: Quote[], period: number = 14): number[] {
    const atr: number[] = new Array(quotes.length).fill(0);
    // Simple TR calculation for estimation
    for (let i = 1; i < quotes.length; i++) {
        const tr = Math.max(quotes[i].high - quotes[i].low, Math.abs(quotes[i].high - quotes[i - 1].close), Math.abs(quotes[i].low - quotes[i - 1].close));
        atr[i] = tr; // Need proper smoothing for real usage, but simple TR avg works for displacement check relative to recent volatility.
    }
    // Simple SMA of TR for last 14
    const smoothedATR = new Array(quotes.length).fill(0);
    for (let i = period; i < quotes.length; i++) {
        let sum = 0;
        for (let j = 0; j < period; j++) sum += atr[i - j];
        smoothedATR[i] = sum / period;
    }
    return smoothedATR;
}

export function detectPSP(quotes: Quote[]): PSPResult {
    // Default Result
    let result: PSPResult = {
        direction: 'NEUTRAL',
        state: 'NONE',
        score: 0,
        reasons: [],
        missing: ['Liquidity Sweep', 'Displacement'],
        checkmarks: { sweep: false, displacement: false, pullback: false, continuation: false }
    };

    if (quotes.length < 50) return result;

    const swings = findSwings(quotes);
    const atrs = calculateATR(quotes);
    const lastSwingHigh = swings.filter(s => s.type === 'HIGH').pop();
    const lastSwingLow = swings.filter(s => s.type === 'LOW').pop();

    if (!lastSwingHigh || !lastSwingLow) return result;

    let possibleLong = false;
    let possibleShort = false;
    let sweepPrice = 0;
    let sweepIndex = 0;

    // 1. Detect Sweep (Look at last 20 bars)
    // SHORT Setup: Price took out a Swing High then closed below it?
    // LONG Setup: Price took out a Swing Low then closed above it?

    // Recent price action analysis
    const lookback = 20;
    const recentQuotes = quotes.slice(-lookback);
    const recentHigh = Math.max(...recentQuotes.map(q => q.high));
    const recentLow = Math.min(...recentQuotes.map(q => q.low));

    // CHECK SHORT SETUP (Sweep High)
    // Find a previous swing high that was breached recently but price is now below it?
    // Simplified Logic: Just check the *latest* completed swing logic from our swings array isn't enough as that's lagging.
    // Let's look for: Did we break a swing high recently?

    // Let's focus on the MOST RECENT potential setup.
    // We iterate backwards to find the "Sweep Event".

    // --- SIMPLIFIED DETERMINISTIC LOGIC FOR ROBUSTNESS ---
    // We will evaluate both Long and Short conditions and pick the one with higher progress.

    const evaluateSetup = (direction: 'LONG' | 'SHORT'): PSPResult => {
        let score = 0;
        let reasons: string[] = [];
        let missing: string[] = [];
        let checks = { sweep: false, displacement: false, pullback: false, continuation: false };
        let levels: any = {};

        // 1. SWEEP
        // For LONG: Look for a Swing Low that was breached.
        // Index of recent lowest low.
        let sweepFound = false;
        let displacementFound = false;
        let pullbackFound = false;
        let continuationFound = false;

        // Validating SWEEP
        if (direction === 'LONG') {
            // Find a swing low within last 50 bars (excluding very recent 5)
            // Then check if price went below it recently.
            const recentSwings = swings.filter(s => s.type === 'LOW' && s.index > quotes.length - 60 && s.index < quotes.length - 5);
            if (recentSwings.length > 0) {
                const refSwing = recentSwings[recentSwings.length - 1]; // Last formed swing low
                // Did we dip below it?
                const dipIndex = quotes.findIndex((q, i) => i > refSwing.index && q.low < refSwing.price);
                if (dipIndex !== -1) {
                    sweepFound = true;
                    checks.sweep = true;
                    score += 30;
                    reasons.push(`Swept Liquidity at ${refSwing.price.toFixed(2)}`);
                    levels.sweepLevel = refSwing.price;
                    levels.invalidate = Math.min(...quotes.slice(dipIndex).map(q => q.low)); // Lowest point of sweep
                } else {
                    missing.push('Liquidity Sweep of Swing Low');
                }
            } else {
                missing.push('Valid Swing Low Structure');
            }
        } else { // SHORT
            const recentSwings = swings.filter(s => s.type === 'HIGH' && s.index > quotes.length - 60 && s.index < quotes.length - 5);
            if (recentSwings.length > 0) {
                const refSwing = recentSwings[recentSwings.length - 1];
                const popIndex = quotes.findIndex((q, i) => i > refSwing.index && q.high > refSwing.price);
                if (popIndex !== -1) {
                    sweepFound = true;
                    checks.sweep = true;
                    score += 30;
                    reasons.push(`Swept Liquidity at ${refSwing.price.toFixed(2)}`);
                    levels.sweepLevel = refSwing.price;
                    levels.invalidate = Math.max(...quotes.slice(popIndex).map(q => q.high)); // Highest point of sweep
                } else {
                    missing.push('Liquidity Sweep of Swing High');
                }
            } else {
                missing.push('Valid Swing High Structure');
            }
        }

        // 2. DISPLACEMENT
        // Require strong move opposite to sweep.
        if (sweepFound) {
            // Check recent candles for large bodies/range > 1.5x ATR
            const recentATR = atrs[quotes.length - 1] || 10; // fallback
            const recentCandles = quotes.slice(-15);

            // For LONG: Big Green Candles?
            if (direction === 'LONG') {
                const impulsive = recentCandles.some(q => (q.close - q.open) > recentATR * 1.5 && q.close > q.open);
                if (impulsive) {
                    displacementFound = true;
                    checks.displacement = true;
                    score += 30;
                    reasons.push('Displacement Detected (Impulsive Move)');
                    // Define Displacement Range (simplified)
                    const impIdx = recentCandles.findIndex(q => (q.close - q.open) > recentATR * 1.5);
                    const impCandle = recentCandles[impIdx];
                    levels.displacementLow = impCandle.low;
                    levels.displacementHigh = Math.max(...recentCandles.slice(impIdx).map(q => q.high));

                    // Entry zone: 50% of impulse to bottom
                    levels.entryZoneHigh = (levels.displacementHigh + levels.displacementLow) / 2;
                    levels.entryZoneLow = levels.displacementLow;
                } else {
                    missing.push('Displacement (Strong Impulsive Move)');
                }
            } else { // SHORT
                const impulsive = recentCandles.some(q => (q.open - q.close) > recentATR * 1.5 && q.close < q.open);
                if (impulsive) {
                    displacementFound = true;
                    checks.displacement = true;
                    score += 30;
                    reasons.push('Displacement Detected (Impulsive Move)');
                    // Define Displacement Range
                    const impIdx = recentCandles.findIndex(q => (q.open - q.close) > recentATR * 1.5);
                    const impCandle = recentCandles[impIdx];
                    levels.displacementHigh = impCandle.high;
                    levels.displacementLow = Math.min(...recentCandles.slice(impIdx).map(q => q.low));

                    // Entry zone: 50% of impulse to top
                    levels.entryZoneLow = (levels.displacementHigh + levels.displacementLow) / 2;
                    levels.entryZoneHigh = levels.displacementHigh;
                } else {
                    missing.push('Displacement (Strong Impulsive Move)');
                }
            }
        } else {
            // If no sweep, we can't have displacement in this context
            missing.push('Displacement');
        }

        // 3. PULLBACK
        if (displacementFound) {
            const currentPrice = quotes[quotes.length - 1].close;
            if (direction === 'LONG') {
                // Price retraced into Entry Zone?
                // Or is currently in it?
                // Simply check if any recent low touched the zone.
                if (currentPrice <= levels.entryZoneHigh && currentPrice >= levels.entryZoneLow) {
                    pullbackFound = true;
                    checks.pullback = true;
                    score += 20;
                    reasons.push('Price in Pullback/Entry Zone');
                } else if (currentPrice < levels.entryZoneLow) {
                    // Failed/Too deep? Maybe invalid? Keep it simple for now.
                    missing.push('Deep Pullback / Invalidated');
                } else {
                    missing.push('Pullback to Discount');
                }
            } else {
                if (currentPrice >= levels.entryZoneLow && currentPrice <= levels.entryZoneHigh) {
                    pullbackFound = true;
                    checks.pullback = true;
                    score += 20;
                    reasons.push('Price in Pullback/Entry Zone');
                } else {
                    missing.push('Pullback to Premium');
                }
            }
        } else {
            missing.push('Pullback');
        }

        // 4. CONTINUATION
        if (displacementFound) { // Can verify continuation potentially even if pullback barely touched
            // LONG: Break above displacement high?
            const currentPrice = quotes[quotes.length - 1].close;
            if (direction === 'LONG') {
                if (currentPrice > levels.displacementHigh) {
                    continuationFound = true;
                    checks.continuation = true;
                    score += 20;
                    reasons.push('Structure Break / Continuation Confirmed');
                } else {
                    missing.push('Break of Displacement High');
                }
            } else {
                if (currentPrice < levels.displacementLow) {
                    continuationFound = true;
                    checks.continuation = true;
                    score += 20;
                    reasons.push('Structure Break / Continuation Confirmed');
                } else {
                    missing.push('Break of Displacement Low');
                }
            }
        } else {
            missing.push('Continuation');
        }

        // Determine State
        let state: PSPState = 'NONE';
        if (score >= 80) state = 'CONFIRMED';
        else if (score >= 50) state = 'FORMING';

        return {
            direction,
            state,
            score,
            reasons,
            missing: missing.slice(0, 2), // Top 2 missing
            levels: Object.keys(levels).length > 0 ? levels : undefined,
            checkmarks: checks
        };
    };

    const longRes = evaluateSetup('LONG');
    const shortRes = evaluateSetup('SHORT');

    // Return the better looking setup
    if (longRes.score > shortRes.score) return longRes;
    if (shortRes.score > longRes.score) return shortRes;

    // Tie-breaker or default to NONE but strictly valid result
    return longRes.score > 0 ? longRes : {
        direction: 'NEUTRAL',
        state: 'NONE',
        score: 0,
        reasons: [],
        missing: ['Waiting for new Swing Structure'],
        checkmarks: { sweep: false, displacement: false, pullback: false, continuation: false }
    };
}
