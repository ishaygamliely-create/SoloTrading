
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
        atr[i] = tr;
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

    // We will evaluate both Long and Short conditions and pick the one with higher progress.
    const evaluateSetup = (direction: 'LONG' | 'SHORT'): PSPResult => {
        let score = 0;
        let reasons: string[] = [];
        let missing: string[] = [];
        let checks = { sweep: false, displacement: false, pullback: false, continuation: false };
        let levels: any = {};

        // 1. SWEEP (25 pts)
        let sweepFound = false;
        let displacementFound = false;

        let refSwingIdx = -1;
        let refSwingPrice = 0;

        if (direction === 'LONG') {
            // Find a swing low within last 60 bars (excluding very recent 5)
            // Then check if price went below it recently.
            const recentSwings = swings.filter(s => s.type === 'LOW' && s.index > quotes.length - 60 && s.index < quotes.length - 5);
            if (recentSwings.length > 0) {
                const refSwing = recentSwings[recentSwings.length - 1];
                const dipIndex = quotes.findIndex((q, i) => i > refSwing.index && q.low < refSwing.price);

                if (dipIndex !== -1) {
                    sweepFound = true;
                    checks.sweep = true;
                    score += 25;
                    reasons.push(`Swept Liquidity at ${refSwing.price.toFixed(2)}`);
                    levels.sweepLevel = refSwing.price;
                    levels.invalidate = Math.min(...quotes.slice(dipIndex).map(q => q.low)); // Lowest point of sweep
                    refSwingIdx = dipIndex; // Approximate time of sweep start
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
                    score += 25;
                    reasons.push(`Swept Liquidity at ${refSwing.price.toFixed(2)}`);
                    levels.sweepLevel = refSwing.price;
                    levels.invalidate = Math.max(...quotes.slice(popIndex).map(q => q.high)); // Highest point of sweep
                    refSwingIdx = popIndex;
                } else {
                    missing.push('Liquidity Sweep of Swing High');
                }
            } else {
                missing.push('Valid Swing High Structure');
            }
        }

        // 2. DISPLACEMENT (25 pts + 10 Bonus)
        // Require strong move opposite to sweep, AFTER the sweep.
        if (sweepFound) {
            const recentATR = atrs[quotes.length - 1] || 10;
            // Look for displacement *after* the sweep
            const postSweepQuotes = quotes.slice(refSwingIdx);
            // Cap search to reasonable recent history (e.g. last 15-20 bars max) to ensure relevance
            const searchQuotes = postSweepQuotes.length > 20 ? postSweepQuotes.slice(-20) : postSweepQuotes;

            if (direction === 'LONG') {
                const impIdx = searchQuotes.findIndex(q => (q.close - q.open) > 0 && (q.close - q.open) > recentATR * 1.0); // Basic displacement

                if (impIdx !== -1) {
                    displacementFound = true;
                    checks.displacement = true;
                    score += 25;
                    reasons.push('Displacement Detected');

                    const impCandle = searchQuotes[impIdx];
                    levels.displacementLow = impCandle.low;
                    levels.displacementHigh = searchQuotes[searchQuotes.length - 1].high; // Approximate high of move

                    // Bonus Check: > 1.5x ATR
                    if ((impCandle.close - impCandle.open) > recentATR * 1.5) {
                        score += 10;
                        reasons.push('Strong Bonus (+10)');
                    }

                    // Entry Zone (FVG area / 50% of impulse)
                    levels.entryZoneHigh = (levels.displacementHigh + levels.displacementLow) / 2; // Midpoint
                    levels.entryZoneLow = levels.displacementLow;

                    // More precise Displacement High finding (highest point after impulse start)
                    levels.displacementHigh = Math.max(...searchQuotes.slice(impIdx).map(q => q.high));

                } else {
                    missing.push('Displacement (Impulsive Move)');
                }
            } else { // SHORT
                const impIdx = searchQuotes.findIndex(q => (q.open - q.close) > 0 && (q.open - q.close) > recentATR * 1.0);

                if (impIdx !== -1) {
                    displacementFound = true;
                    checks.displacement = true;
                    score += 25;
                    reasons.push('Displacement Detected');

                    const impCandle = searchQuotes[impIdx];
                    // Bonus Check
                    if ((impCandle.open - impCandle.close) > recentATR * 1.5) {
                        score += 10;
                        reasons.push('Strong Bonus (+10)');
                    }

                    levels.displacementHigh = impCandle.high;
                    levels.displacementLow = Math.min(...searchQuotes.slice(impIdx).map(q => q.low));

                    levels.entryZoneLow = (levels.displacementHigh + levels.displacementLow) / 2;
                    levels.entryZoneHigh = levels.displacementHigh;

                } else {
                    missing.push('Displacement (Impulsive Move)');
                }
            }
        } else {
            missing.push('Displacement');
        }

        // 3. PULLBACK (25 pts)
        if (displacementFound) {
            const currentPrice = quotes[quotes.length - 1].close;
            // Check if *any* price after displacement high/low touched the entry zone
            // Simplified: Just checked against current or recent low?

            if (direction === 'LONG') {
                // Ideally we check if price dipped into entryZoneLow/High
                if (currentPrice <= levels.entryZoneHigh && currentPrice >= levels.invalidate) {
                    checks.pullback = true;
                    score += 25;
                    reasons.push('Pullback to Discount');
                } else if (currentPrice < levels.invalidate) {
                    missing.push('Invalidated (Below Sweep)');
                    score = 0; // Invalidation kills setup? Or just degrades?
                    // Let's degrade severely
                    return { direction, state: 'NONE', score: 0, reasons: ['Invalidated'], missing: ['Setup Invalidated'], checkmarks: checks };
                } else {
                    missing.push('Pullback to Discount');
                }
            } else {
                if (currentPrice >= levels.entryZoneLow && currentPrice <= levels.invalidate) {
                    checks.pullback = true;
                    score += 25;
                    reasons.push('Pullback to Premium');
                } else if (currentPrice > levels.invalidate) {
                    return { direction, state: 'NONE', score: 0, reasons: ['Invalidated'], missing: ['Setup Invalidated'], checkmarks: checks };
                } else {
                    missing.push('Pullback to Premium');
                }
            }
        } else {
            missing.push('Pullback');
        }

        // 4. CONTINUATION (25 pts)
        if (displacementFound) {
            const currentPrice = quotes[quotes.length - 1].close;
            const isBreak = direction === 'LONG' ? (currentPrice > levels.displacementHigh) : (currentPrice < levels.displacementLow);

            if (isBreak) {
                checks.continuation = true;
                score += 25;
                reasons.push('Continuation Confirmed');
            } else {
                missing.push('Continuation (Break Structure)');
            }
        } else {
            missing.push('Continuation');
        }

        // Determine State
        let state: PSPState = 'NONE';
        if (score >= 75) state = 'CONFIRMED';
        else if (score >= 50) state = 'FORMING';

        // Cap score
        score = Math.min(100, score);

        return {
            direction,
            state,
            score,
            reasons,
            missing: missing.slice(0, 2),
            levels: Object.keys(levels).length > 0 ? levels : undefined,
            checkmarks: checks
        };
    };

    const longRes = evaluateSetup('LONG');
    const shortRes = evaluateSetup('SHORT');

    if (longRes.score > shortRes.score) return longRes;
    if (shortRes.score > longRes.score) return shortRes;

    return longRes.score > 0 ? longRes : {
        direction: 'NEUTRAL',
        state: 'NONE',
        score: 0,
        reasons: [],
        missing: ['Waiting for new Swing Structure'],
        checkmarks: { sweep: false, displacement: false, pullback: false, continuation: false }
    };
}
