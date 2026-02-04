
import { Quote, MarketStructure, detectMarketStructure } from './analysis';

export type MacroImpact = 'HARD_IGNORE' | 'SOFT_IGNORE' | 'NONE';

export interface MacroEvent {
    name: string;
    impact: MacroImpact;
    isActive: boolean;
    nextRelease?: string;
}

export interface DXYContext {
    price: number;
    change: number;
    changePercent: number;
    trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    structure: 'HH_HL' | 'LH_LL' | 'CONSOLIDATION';
    momentum: 'RISING' | 'FALLING' | 'FLAT';
    vwapState: 'ABOVE' | 'BELOW' | 'NEUTRAL';
    openState: 'ABOVE' | 'BELOW' | 'NEUTRAL';
    timestamp: number;
    eventStatus: MacroEvent;
    confidenceModifier: number; // +/- 10
}

// --- SIMULATED EVENT CALENDAR ---
// In a real app, this would fetch from an API.
// For now, we simulate events based on specific dates or just returning NONE by default
// with helper functions to easily "Mock" an event for testing.

const MOCK_EVENTS = [
    // Example: { date: '2023-10-25', name: 'FOMC Meeting', impact: 'HARD_IGNORE' }
];

export function detectMacroEvent(date: Date = new Date()): MacroEvent {
    // 1. Production Mode: Default to NONE (Normal Operation)
    let event: MacroEvent = {
        name: 'No Major Event',
        impact: 'NONE',
        isActive: false
    };

    // 2. Simulation Logic (Uncomment or use env var to test)
    // const day = date.getDay();
    // if (day === 5) event = { name: 'NFP (Simulated)', impact: 'HARD_IGNORE', isActive: true };

    return event;
}

export function analyzeDXY(
    quotes: Quote[],
    vwap: number | null,
    trueDayOpen: number | null
): DXYContext {
    // Fail-safe: Need at least a few candles
    if (!quotes || quotes.length < 10) {
        return {
            price: 0,
            change: 0,
            changePercent: 0,
            trend: 'NEUTRAL',
            structure: 'CONSOLIDATION',
            momentum: 'FLAT',
            vwapState: 'NEUTRAL',
            openState: 'NEUTRAL',
            timestamp: Date.now(),
            eventStatus: { name: 'Data Unavailable', impact: 'HARD_IGNORE', isActive: true },
            confidenceModifier: 0
        };
    }

    const lastQuote = quotes[quotes.length - 1];
    const price = lastQuote.close;

    // 1. Structure Detection
    const structureData = detectMarketStructure(quotes);
    const structureType = structureData.type === 'UP_TREND' ? 'HH_HL' :
        structureData.type === 'DOWN_TREND' ? 'LH_LL' : 'CONSOLIDATION';

    // 2. Momentum (Last 3 candles close comparison)
    const last3 = quotes.slice(-3);
    let momentum: 'RISING' | 'FALLING' | 'FLAT' = 'FLAT';
    if (last3[2].close > last3[0].close) momentum = 'RISING';
    else if (last3[2].close < last3[0].close) momentum = 'FALLING';

    // 3. VWAP/Open State
    const vwapState = vwap ? (price > vwap ? 'ABOVE' : 'BELOW') : 'NEUTRAL';
    const openState = trueDayOpen ? (price > trueDayOpen ? 'ABOVE' : 'BELOW') : 'NEUTRAL';

    // 4. Overall Trend/Bias
    // Simple heuristic: If Structure is UP or Above VWAP+Open -> BULLISH
    let trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';

    let bullScore = 0;
    if (structureType === 'HH_HL') bullScore++;
    if (vwapState === 'ABOVE') bullScore++;
    if (openState === 'ABOVE') bullScore++;

    let bearScore = 0;
    if (structureType === 'LH_LL') bearScore++;
    if (vwapState === 'BELOW') bearScore++;
    if (openState === 'BELOW') bearScore++;

    if (bullScore >= 2 && bullScore > bearScore) trend = 'BULLISH';
    else if (bearScore >= 2 && bearScore > bullScore) trend = 'BEARISH';

    // 5. Event Check
    const event = detectMacroEvent(new Date());

    // 6. Confidence Modifier Calculation (Inverse Correlation)
    // Strong DXY = Negative for NQ Longs, Positive for NQ Shorts? 
    // Wait, the Modifier is "Points added to the Setup Confidence".
    // Setup has a direction (LONG/SHORT).
    // so we just return the DXY state, and the `calculateConfidence` in analysis.ts 
    // will decide sign based on setup direction.
    // Actually, let's return a "Strength Score" for DXY (0-100) or just the Modifier magnitude?

    // Let's stick to the Spec: 
    // "Weak DXY -> supports Risk-On / Nasdaq longs"
    // "Strong DXY -> supports Risk-Off / Nasdaq shorts"

    // We will calculate a raw "DXY Vigor" here, and analysis.ts maps it.
    // Or we simplify:
    // This context object is passed to `calculateConfidence`. 
    // We don't pre-calculate "Modifier" for a specific NQ trade here because we don't know the NQ trade direction yet.
    // BUT the interface has `confidenceModifier`. The user spec says "Apply a small weight... e.g. ±5 to ±10".

    // Let's define `confidenceModifier` here as "DXY Strength Score" relative to neutral.
    // +10 = Super Strong DXY (Bearish NQ)
    // -10 = Super Weak DXY (Bullish NQ)
    // 0 = Neutral

    let baseMod = 0;
    if (trend === 'BULLISH') baseMod = 5;
    if (trend === 'BEARISH') baseMod = -5;

    // Bonus for confluence
    if (trend === 'BULLISH' && momentum === 'RISING') baseMod += 2;
    if (trend === 'BEARISH' && momentum === 'FALLING') baseMod -= 2;

    // Cap at +/- 10
    baseMod = Math.max(-10, Math.min(10, baseMod));

    // FAIL-SAFE / IGNORE LOGIC
    if (event.impact === 'HARD_IGNORE') baseMod = 0;
    if (event.impact === 'SOFT_IGNORE') baseMod = Math.round(baseMod * 0.5);

    // 6. Calculate Change (Absolute & Percent)
    let change = 0;
    let changePercent = 0;

    // We need open or prev close. If trueDayOpen is provided, use it.
    // Otherwise fallback to first candle in the series if it spans enough time?
    // Using trueDayOpen (if available) as the "Daily Open" to calc Day Change.
    if (trueDayOpen) {
        change = price - trueDayOpen;
        changePercent = (change / trueDayOpen) * 100;
    } else if (quotes.length > 0) {
        // Fallback to first candle in the loaded series (might be just an arbitrary start if 1m data is short term)
        // Ideally we want Prev Close. 
        // For now, if no trueDayOpen, we return 0 to avoid misleading data.
        change = 0;
        changePercent = 0;
    }

    return {
        price,
        change,
        changePercent,
        trend,
        structure: structureType,
        momentum,
        vwapState,
        openState,
        timestamp: lastQuote.time,
        eventStatus: event,
        confidenceModifier: baseMod
    };
}
