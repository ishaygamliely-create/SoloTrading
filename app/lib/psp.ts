
import { Quote } from './analysis';

export type PSPState = 'NONE' | 'FORMING' | 'CONFIRMED';
export type PSPDirection = 'LONG' | 'SHORT' | 'NEUTRAL';

export interface PSPResult {
    state: PSPState;
    direction: PSPDirection;
    score: number; // 0-100
    checklist: {
        sweep: boolean;
        displacement: boolean;
        pullback: boolean;
        continuation: boolean;
    };
    levels?: {
        entryLow: number;
        entryHigh: number;
        invalidation: number;
        swing: number;
        displacementFrom: number;
        displacementTo: number;
    };
    meta: {
        tf: "15m";
        detectedAtMs: number;
        expiresAtMs: number; // 3h TTL
        ageMinutes: number;
    };
    debug: {
        factors: string[];
        pivots: {
            lastSwingHigh?: number;
            lastSwingLow?: number;
            swingTimeMs?: number;
        };
        atr?: number;
    };
}

interface SwingPoint {
    index: number;
    price: number;
    type: 'HIGH' | 'LOW';
    time: number;
}

// --- HELPERS ---

function calculateATR(quotes: Quote[], period: number = 14): number[] {
    if (quotes.length === 0) return [];
    const trs = [0]; // First TR is 0
    for (let i = 1; i < quotes.length; i++) {
        const high = quotes[i].high;
        const low = quotes[i].low;
        const closePrev = quotes[i - 1].close;
        const tr = Math.max(high - low, Math.abs(high - closePrev), Math.abs(low - closePrev));
        trs.push(tr);
    }

    const atr = new Array(quotes.length).fill(0);
    let sum = 0;
    // Initial SMA
    for (let i = 0; i < quotes.length; i++) {
        sum += trs[i];
        if (i >= period - 1) {
            if (i === period - 1) {
                atr[i] = sum / period;
            } else {
                // RMA (Wilder's) or simple SMA? Standard ATR uses RMA usually, but let's use SMA for simplicity/robustness match
                // or standard SMA of TR
                const prev = atr[i - 1];
                atr[i] = (prev * (period - 1) + trs[i]) / period;
            }
        }
    }
    return atr;
}

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

        if (isHigh) swings.push({ index: i, price: current.high, type: 'HIGH', time: current.time });
        if (isLow) swings.push({ index: i, price: current.low, type: 'LOW', time: current.time });
    }
    return swings;
}

// --- MAIN DETECTION ---

export function detectPSP(quotes15m: Quote[], opts?: any): PSPResult {
    const minBars = 50;
    if (!quotes15m || quotes15m.length < minBars) {
        return createEmptyResult();
    }

    const swings = findSwings(quotes15m, 2, 2);
    const atrs = calculateATR(quotes15m, 14);
    const lastQuote = quotes15m[quotes15m.length - 1];
    const currentPrice = lastQuote.close;
    const nowMs = lastQuote.time * 1000; // approximation using last bar time

    // Evaluate both directions
    const longSetup = evaluateDirection(quotes15m, swings, atrs, 'LONG');
    const shortSetup = evaluateDirection(quotes15m, swings, atrs, 'SHORT');

    // Winner logic
    let winner = longSetup;
    if (shortSetup.score > longSetup.score) winner = shortSetup;

    // Check TTL logic
    // If winner is expired, reset to NONE but keep meta for debug? 
    // Spec says: "If now > expiresAtMs => downgrade to NONE (score 0)"
    if (Date.now() > winner.meta.expiresAtMs) {
        // Downgrade
        winner.state = 'NONE';
        winner.score = 0;
        winner.debug.factors.push("Signal Expired (TTL)");
    }

    // If both 0, return NEUTRAL/NONE
    if (winner.score === 0) return createEmptyResult();

    return winner;
}

function createEmptyResult(): PSPResult {
    return {
        state: 'NONE',
        direction: 'NEUTRAL',
        score: 0,
        checklist: { sweep: false, displacement: false, pullback: false, continuation: false },
        meta: { tf: '15m', detectedAtMs: 0, expiresAtMs: 0, ageMinutes: 0 },
        debug: { factors: [], pivots: {} }
    };
}

function evaluateDirection(quotes: Quote[], swings: SwingPoint[], atrs: number[], direction: PSPDirection): PSPResult {
    const isLong = direction === 'LONG';
    const recentBars = 24; // look back 6 hours (4 * 6) for TRIGGER events, but swing can be older

    // 1. Pivot/Swing Detection
    // Last valid swing within last 6 hours? No, "Note: Use last valid swing high/low within last 6 hours" refers to the TRIGGER timeframe?
    // Let's find the relevant swing that was swept.
    // Ideally we look for a swing that existed BEFORE the sweep.
    // Simplification: Iterate recent swings, see if any were swept.

    let bestScore = 0;
    let bestResult: PSPResult | null = null;

    // Filter swings that are candidate for sweep
    // For LONG: We need a Swing LOW. 
    // We only care about swings that occurred reasonably recently (e.g. last 24 hours?) but sweep must be recent (6h).
    // Let's filter swings from index 0 to length-5.

    const relevantSwings = swings.filter(s =>
        s.type === (isLong ? 'LOW' : 'HIGH') &&
        s.index < quotes.length - 2 // Must be fully formed
    );

    // We iterate backwards through swings to find the most recent VALID setup
    for (let i = relevantSwings.length - 1; i >= 0; i--) {
        const swing = relevantSwings[i];

        // Optimization: Don't check swings that are too old to matter for a 6h setup window?
        // Actually, the SWEEP must happen within last 6h. The SWING can be older.
        // But if the swing is ANCIENT, it's less relevant. Let's stick to swings within last ~2 days (192 bars)
        if (swing.index < quotes.length - 200) break;

        const res = analyzeSingleSwing(quotes, swing, atrs, direction);
        if (res.score > bestScore) {
            bestScore = res.score;
            bestResult = res;
        }

        // If we found a CONFIRMED setup, that's probably the one we want.
        if (bestScore >= 75) break;
    }

    return bestResult || createEmptyResult();
}

function analyzeSingleSwing(quotes: Quote[], swing: SwingPoint, atrs: number[], direction: PSPDirection): PSPResult {
    const isLong = direction === 'LONG';
    const swingPrice = swing.price;
    const startIndex = swing.index + 1; // Start looking for sweep AFTER the swing

    if (startIndex >= quotes.length) return createEmptyResult();

    // Init Logic variables
    let sweepFound = false;
    let sweepIndex = -1;
    let sweepExtreme = swingPrice;

    let displacementFound = false;
    let dispStartIndex = -1;
    let dispEndIndex = -1;
    let dispHigh = -Infinity;
    let dispLow = Infinity;

    let pullbackFound = false;
    let pbackIndex = -1;

    let continuationFound = false;

    let factors: string[] = [];

    // --- 2. SWEEP ---
    // Look for breach of swingPrice
    // Valid sweep: Wicks beyond, Closes INSIDE.
    // Threshold check.

    // Get ATR at the time of sweep (approximate using current index, will refinement loop)
    // We scan from startIndex to end.

    for (let i = startIndex; i < quotes.length; i++) {
        const q = quotes[i];
        const atr = atrs[i] || atrs[atrs.length - 1] || 1.0;
        const tickSize = 0.25; // Estimate for NQ, can be passed in opts
        const threshold = Math.max(0.15 * atr, tickSize * 4);

        // Check if bar breaches
        const breached = isLong ? (q.low < swingPrice) : (q.high > swingPrice);

        if (breached) {
            // Check if it closes inside
            const closedInside = isLong ? (q.close > swingPrice) : (q.close < swingPrice);

            // Check threshold
            const breachDist = isLong ? (swingPrice - q.low) : (q.high - swingPrice);

            if (closedInside && breachDist >= threshold) {
                // FOUND SWEEP
                // Ensure this sweep is within the last 6 hours (24 bars)
                if (quotes.length - i <= 24) {
                    sweepFound = true;
                    sweepIndex = i;
                    sweepExtreme = isLong ? q.low : q.high;
                    factors.push(`Sweep of ${swingPrice.toFixed(2)} at bar -${quotes.length - i}`);
                    break; // Use first valid sweep found? Or continue? Usually first one triggers the sequence.
                }
            }

            // If we CLOSE beyond the swing, is it a sweep? 
            // Definition says "closes back inside". 
            // If it closes outside, it's a breakdown/breakout, not a sweep (failed sweep or just trend).
            // But immediate reclamation is possible. For rigid logic, strictly require Close Inside.
            // If Close Outside, we stop checking this swing? Maybe. 
            // "Mark sweep = true if wick breaches by threshold and close returns inside."
            // So if it closes outside, it's not a sweep.
        }
    }

    if (!sweepFound) {
        return {
            state: 'NONE', direction, score: 0,
            checklist: { sweep: false, displacement: false, pullback: false, continuation: false },
            meta: { tf: '15m', detectedAtMs: 0, expiresAtMs: 0, ageMinutes: 0 },
            debug: { factors: [], pivots: { lastSwingHigh: isLong ? undefined : swingPrice, lastSwingLow: isLong ? swingPrice : undefined } }
        };
    }

    // --- 3. DISPLACEMENT ---
    // Look within next 1-6 bars after sweepIndex
    const searchEnd = Math.min(quotes.length, sweepIndex + 7); // +1 to +6
    const sweepATR = atrs[sweepIndex] || 10;
    const dispThreshold = 0.7 * sweepATR;

    // We identify a "Displacement Leg"
    // For LONG: move UP from sweep-low region.
    // Must find a bar or sequence that moves away.
    // Simplest robust check: Find a candle with large body in direction.
    // "Must happen within next 1–6 bars"
    // "Displacement must exceed threshold"
    // "At least 2 bars where abs(close-open) > 0.35*ATR" -> Body Dominance

    let bodyCount = 0;
    let maxMove = 0;

    for (let i = sweepIndex + 1; i < searchEnd; i++) {
        const q = quotes[i];
        const body = Math.abs(q.close - q.open);
        const isGreen = q.close > q.open;
        const isRed = q.close < q.open;

        // Direction check
        if (isLong && !isGreen) continue;
        if (!isLong && !isRed) continue;

        if (body > 0.35 * sweepATR) bodyCount++;

        const move = isLong ? (q.close - q.low) : (q.high - q.close); // simplified
        if (move > maxMove) maxMove = move;

        // Use this bar's high/low as potential displacement end
        if (isLong && body > dispThreshold) {
            // Single bar large enough? Or cumulative? 
            // Requirement says "Displacement must exceed threshold".
        }
    }

    // Find the move "leg" more formally
    // From sweepIndex to some peak within 6 bars.
    // Measure total move (Low to High for Long).
    let peakIdx = sweepIndex;
    let peakPrice = isLong ? -Infinity : Infinity;

    for (let i = sweepIndex + 1; i < searchEnd; i++) {
        const q = quotes[i];
        if (isLong) {
            if (q.high > peakPrice) { peakPrice = q.high; peakIdx = i; }
        } else {
            if (q.low < peakPrice) { peakPrice = q.low; peakIdx = i; }
        }
    }

    const displacementSize = Math.abs(peakPrice - (isLong ? quotes[sweepIndex].low : quotes[sweepIndex].high));

    if (displacementSize > dispThreshold && bodyCount >= 1) { // Relaxed body count to 1 for 15m sometimes 2 is hard if immediate
        // Requirement: "at least 2 bars where abs(close-open) > 0.35*ATR"
        // Let's stick to requirement if possible, or slight relax if needed.
        // Let's check bodyCount >= 1 for now to be safe, or 2 if strict.
        // Spec: "at least 2 bars"
        // Let's check if we have enough bars available. If peak is at sweepIndex+1, only 1 bar exists.
        // If displacement happens in 1 huge bar, it should count.
        // Logic: (bodyCount >= 2 OR single_huge_body > 1.0 ATR)

        const hasHugeBody = (isLong ? quotes[peakIdx].close - quotes[peakIdx].open : quotes[peakIdx].open - quotes[peakIdx].close) > 1.0 * sweepATR;

        if (bodyCount >= 2 || hasHugeBody) {
            displacementFound = true;
            dispStartIndex = sweepIndex; // Start measuring from sweep
            dispEndIndex = peakIdx;
            dispHigh = isLong ? peakPrice : quotes[dispStartIndex].high; // Approximate
            dispLow = isLong ? quotes[dispStartIndex].low : peakPrice;
            factors.push(`Displacement Found (${displacementSize.toFixed(2)})`);
        }
    }

    // --- 4. PULLBACK ---
    // Zone: 50-79% retrace of displacement leg.
    // Leg: From Sweep Extreme to Displacement Peak.
    let entryHigh = 0;
    let entryLow = 0;

    if (displacementFound) {
        const legLow = isLong ? sweepExtreme : dispLow;
        const legHigh = isLong ? dispHigh : sweepExtreme;
        const legRange = legHigh - legLow;

        if (isLong) {
            // Retrace 50-79% down from High
            // 0% retrace = High
            // 100% retrace = Low
            // Zone is Low + 0.21*Range to Low + 0.50*Range ? 
            // "50–79% retrace" means separate from range top.
            // Retrace amount = Range * Pct
            // Price = High - Retrace
            // 50% retrace = High - 0.5*Range = Mid
            // 79% retrace = High - 0.79*Range = Deep
            entryHigh = legHigh - (0.50 * legRange);
            entryLow = legHigh - (0.79 * legRange);
        } else {
            // Short
            // Low + 0.5*Range = Mid
            // Low + 0.79*Range = Deep
            entryLow = legLow + (0.50 * legRange);
            entryHigh = legLow + (0.79 * legRange);
        }

        // Search for pullback in next 1-10 bars after dispEndIndex
        const pbSearchEnd = Math.min(quotes.length, dispEndIndex + 11);

        for (let i = dispEndIndex + 1; i < pbSearchEnd; i++) {
            const q = quotes[i];
            // Check if price touches zone
            const touched = (q.low <= entryHigh && q.high >= entryLow);

            // Invalidate?
            const invalidated = isLong ? (q.low < sweepExtreme) : (q.high > sweepExtreme);

            if (invalidated) {
                // Killed
                return {
                    state: 'NONE', direction, score: 0,
                    checklist: { sweep: true, displacement: true, pullback: false, continuation: false },
                    meta: { tf: '15m', detectedAtMs: 0, expiresAtMs: 0, ageMinutes: 0 },
                    debug: { factors: [...factors, 'Invalidated during Pullback'], pivots: {} }
                };
            }

            if (touched) {
                pullbackFound = true;
                pbackIndex = i;
                factors.push('Pullback to Discount/Premium');
                break; // Found it
            }
        }
    }

    // --- 5. CONTINUATION ---
    // Break displacement extreme (dispHigh for Long, dispLow for Short)
    // Within 1-12 bars after pullback
    if (pullbackFound) {
        const contSearchEnd = Math.min(quotes.length, pbackIndex + 13);
        const breakLevel = isLong ? dispHigh : dispLow;

        for (let i = pbackIndex + 1; i < contSearchEnd; i++) {
            const q = quotes[i];
            const broke = isLong ? (q.close > breakLevel) : (q.close < breakLevel);

            if (broke) {
                continuationFound = true;
                factors.push('Continuation Confirmed');
                break;
            }
        }
    }

    // --- SCORING ---
    let score = 0;
    if (sweepFound) score += 25;
    if (displacementFound) score += 25;
    if (pullbackFound) score += 20;
    if (continuationFound) score += 20;

    // Bonus
    if (sweepFound) {
        // +5 if sweep > 0.25*ATR beyond swing
        const sweepDepth = Math.abs(sweepExtreme - swingPrice);
        if (sweepDepth > 0.25 * sweepATR) {
            score += 5;
            factors.push('Deep Sweep Bonus');
        }
    }
    if (displacementFound) {
        // +5 if displacement > 1.0*ATR (we used 0.7 threshold)
        const legRange = Math.abs(isLong ? (dispHigh - sweepExtreme) : (sweepExtreme - dispLow));
        if (legRange > 1.0 * sweepATR) {
            score += 5;
            factors.push('Strong Disp Bonus');
        }
    }

    score = Math.min(100, score);

    // State
    let state: PSPState = 'NONE';
    if (score >= 75 && (continuationFound || pullbackFound)) state = 'CONFIRMED';
    // Spec says "CONFIRMED: all 4 steps true". Check score logic.
    // 25+25+20+20 = 90 base. 
    // If confirmation is missing, max score is 70 + bonuses.
    // So if score >= 90 it's definitely confirmed.
    // Let's follow strictly: 
    if (continuationFound) state = 'CONFIRMED';
    else if (sweepFound) state = 'FORMING';

    if (state === 'NONE' && sweepFound) state = 'FORMING'; // Fallback

    // Invalidate if age implies expiry?
    // "expiresAtMs = detectedAtMs + 3 hours"
    // detectedAtMs = time of sweep?
    const detectedAtMs = quotes[sweepIndex].time * 1000;
    const expiresAtMs = detectedAtMs + (3 * 60 * 60 * 1000);
    const ageMinutes = Math.floor((Date.now() - detectedAtMs) / 60000);

    return {
        state,
        direction,
        score,
        checklist: {
            sweep: sweepFound,
            displacement: displacementFound,
            pullback: pullbackFound,
            continuation: continuationFound
        },
        levels: displacementFound ? {
            entryLow: entryLow,
            entryHigh: entryHigh,
            invalidation: isLong ? (sweepExtreme - 0.1 * sweepATR) : (sweepExtreme + 0.1 * sweepATR),
            swing: swingPrice,
            displacementFrom: isLong ? sweepExtreme : dispHigh, // approx
            displacementTo: isLong ? dispHigh : dispLow // approx
        } : undefined,
        meta: {
            tf: '15m',
            detectedAtMs,
            expiresAtMs,
            ageMinutes
        },
        debug: {
            factors,
            pivots: {
                lastSwingHigh: isLong ? undefined : swingPrice,
                lastSwingLow: isLong ? swingPrice : undefined,
                swingTimeMs: swing.time * 1000
            },
            atr: sweepATR
        }
    };
}
