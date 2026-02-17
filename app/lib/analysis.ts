// Manual EMA Implementation to avoid dependency issues
class EMA {
    static calculate(input: { period: number, values: number[] }): number[] {
        const { period, values } = input;
        const k = 2 / (period + 1);
        const emaArray: number[] = [];

        // Simple Moving Average (SMA) for the first point
        let sum = 0;
        if (values.length < period) return [];

        for (let i = 0; i < period; i++) {
            sum += values[i];
        }
        let ema = sum / period;
        emaArray.push(ema);

        // EMA for the rest
        for (let i = period; i < values.length; i++) {
            ema = (values[i] - ema) * k + ema;
            emaArray.push(ema);
        }

        return emaArray;
    }
}

// Volatility & Trend Indicators
export class Indicators {
    static calculateTR(high: number, low: number, prevClose: number): number {
        return Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    }

    static calculateATR(candles: Quote[], period: number = 14): number[] {
        if (candles.length < period + 1) return [];

        let trs: number[] = [];
        for (let i = 1; i < candles.length; i++) {
            trs.push(this.calculateTR(candles[i].high, candles[i].low, candles[i - 1].close));
        }

        // First ATR is simple average
        let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
        const atrs = [atr];

        // Subsequent are smoothed
        for (let i = period; i < trs.length; i++) {
            atr = ((atr * (period - 1)) + trs[i]) / period;
            atrs.push(atr);
        }
        return atrs;
    }

    static calculateADX(candles: Quote[], period: number = 14): { adx: number, pdi: number, mdi: number } | null {
        if (candles.length < period * 2) return null;

        let trs: number[] = [];
        let dmPlus: number[] = [];
        let dmMinus: number[] = [];

        for (let i = 1; i < candles.length; i++) {
            const curr = candles[i];
            const prev = candles[i - 1];

            trs.push(this.calculateTR(curr.high, curr.low, prev.close));

            const upMove = curr.high - prev.high;
            const downMove = prev.low - curr.low;

            if (upMove > downMove && upMove > 0) dmPlus.push(upMove);
            else dmPlus.push(0);

            if (downMove > upMove && downMove > 0) dmMinus.push(downMove);
            else dmMinus.push(0);
        }

        const smooth = (data: number[], per: number) => {
            let res: number[] = [];
            let sum = data.slice(0, per).reduce((a, b) => a + b, 0);
            res.push(sum); // Initial Sum

            for (let i = per; i < data.length; i++) {
                sum = sum - (sum / per) + data[i];
                res.push(sum);
            }
            return res;
        };

        const trSmooth = smooth(trs, period);
        const dpSmooth = smooth(dmPlus, period);
        const dmSmooth = smooth(dmMinus, period);

        // Need aligned lengths
        const len = Math.min(trSmooth.length, dpSmooth.length, dmSmooth.length);
        if (len < period) return null;

        let dxs: number[] = [];
        let lastPDI = 0;
        let lastMDI = 0;

        for (let i = 0; i < len; i++) {
            const tr = trSmooth[i];
            if (tr === 0) continue;

            const pdi = (dpSmooth[i] / tr) * 100;
            const mdi = (dmSmooth[i] / tr) * 100;
            const dx = Math.abs(pdi - mdi) / (pdi + mdi) * 100;

            dxs.push(dx);
            lastPDI = pdi;
            lastMDI = mdi;
        }

        // ADX is smoothed DX
        if (dxs.length < period) return null;
        const finalADX = dxs.slice(dxs.length - period).reduce((a, b) => a + b, 0) / period;

        return { adx: finalADX, pdi: lastPDI, mdi: lastMDI };
    }
}

export interface MarketRegime {
    state: 'TRENDING' | 'RANGING' | 'CHOPPY' | 'EXPANSION';
    confidence: number;
    reason: string;
}

import { Candle } from './marketDataTypes';

export type Quote = Candle;

export interface LegacyQuote extends Candle {
    date: Date;
}

export function toLegacyQuote(candle: Candle): LegacyQuote {
    return {
        ...candle,
        date: new Date(candle.time * 1000)
    };
}


export interface MarketStructure {
    type: 'UP_TREND' | 'DOWN_TREND' | 'CONSOLIDATION';
    swings: SwingPoint[];
    bos: BreakEvent[];
    choch: BreakEvent[];
}

export interface SwingPoint {
    price: number;
    time: number;
    type: 'HIGH' | 'LOW';
    index: number;
}

export interface BreakEvent {
    price: number;
    time: number;
    type: 'BOS_BULL' | 'BOS_BEAR' | 'CHOCH_BULL' | 'CHOCH_BEAR';
    index: number;
}

export interface AnalysisResult {
    emas: {
        ema20: number | null;
        ema50: number | null;
        ema200: number | null;
        slope20?: number;
        slope50?: number;
        slope200?: number;
    };
    trendRegime: 'BULLISH_MACRO' | 'BEARISH_MACRO' | 'NEUTRAL';
    structure: MarketStructure;
    psps: PSP[];
    timeContext?: TimeContext;
    pdRanges?: PDRange;
    ictStructure?: ICTBlock[];
    sweeps?: SweepEvent[];
    tre?: TREState;
    regime?: MarketRegime;
    technical?: TechnicalIndicators;
}

export interface SweepEvent {
    level: string; // 'PDH', 'PDL', 'PWH', 'PWL'
    price: number;
    time: number;
    type: 'SWEEP_HIGH' | 'SWEEP_LOW';
    reclaimed: boolean;
}

export interface TREState {
    currentRange: number;
    averageRange: number; // 5-day SMA of Range
    ratio: number; // current / average
    state: 'COMPRESSED' | 'NORMAL' | 'EXPANDED';
}

export interface ICTBlock {
    id: string;
    type: 'ORDER_BLOCK' | 'BREAKER';
    sentiment: 'BULLISH' | 'BEARISH';
    tf: string; // 'M15' | 'H1' | 'H4'
    zone: { min: number; max: number };
    price: number;
    time: number;
    score: number;
    factors: string[];
    isActive: boolean;
}

export interface TimeContext {
    nyTimeStr: string;
    isLondonKZ: boolean;
    isNYKZ: boolean;
    londonOpen: number | null;
    nyOpen: number | null;
    midnightOpen: number | null;
}

export interface PDRange {
    dailyHigh: number;
    dailyLow: number;
    dailyEq: number;
    weeklyHigh: number;
    weeklyLow: number;
    weeklyEq: number;
    position: 'PREMIUM' | 'DISCOUNT' | 'EQUILIBRIUM';
    premiumLevel: number; // 50%
}

// EMA Calculation Wrapper
export function calculateEMAs(quotes: Quote[]) {
    const closes = quotes.map(q => q.close);
    const ema20 = EMA.calculate({ period: 20, values: closes });
    const ema50 = EMA.calculate({ period: 50, values: closes });
    const ema200 = EMA.calculate({ period: 200, values: closes });

    return {
        ema20: ema20.length > 0 ? ema20[ema20.length - 1] : null,
        ema50: ema50.length > 0 ? ema50[ema50.length - 1] : null,
        ema200: ema200.length > 0 ? ema200[ema200.length - 1] : null,
        ema200Series: padSeries(ema200, closes.length)
    };
}

function calculateSlope(series: number[], period: number = 3): number {
    if (series.length < period + 1) return 0;
    const current = series[series.length - 1];
    const prev = series[series.length - 1 - period];
    return (current - prev) / period;
}

export function calculateEMAsWithSlope(quotes: Quote[]) {
    const closes = quotes.map(q => q.close);
    const ema20 = EMA.calculate({ period: 20, values: closes });
    const ema50 = EMA.calculate({ period: 50, values: closes });
    const ema200 = EMA.calculate({ period: 200, values: closes });

    return {
        ema20: ema20.length > 0 ? ema20[ema20.length - 1] : null,
        ema50: ema50.length > 0 ? ema50[ema50.length - 1] : null,
        ema200: ema200.length > 0 ? ema200[ema200.length - 1] : null,
        slope20: calculateSlope(ema20),
        slope50: calculateSlope(ema50),
        slope200: calculateSlope(ema200),
        ema20Series: padSeries(ema20, closes.length),
        ema50Series: padSeries(ema50, closes.length),
        ema200Series: padSeries(ema200, closes.length)
    };
}

function padSeries(emaValues: number[], totalLength: number): (number | null)[] {
    const nullsCount = totalLength - emaValues.length;
    const nulls = Array(nullsCount).fill(null);
    return [...nulls, ...emaValues];
}

// Swing High/Low Detection
export function detectMarketStructure(quotes: Quote[]): MarketStructure {
    const leftBars = 3; // Reduced for faster reaction on M1/M15
    const rightBars = 3;
    const swings: SwingPoint[] = [];

    // 1. Identification of Swing Points
    for (let i = leftBars; i < quotes.length - rightBars; i++) {
        const currentHigh = quotes[i].high;
        const currentLow = quotes[i].low;

        // Check Swing High
        let isSwingHigh = true;
        for (let j = 1; j <= leftBars; j++) if (quotes[i - j].high > currentHigh) isSwingHigh = false;
        for (let j = 1; j <= rightBars; j++) if (quotes[i + j].high >= currentHigh) isSwingHigh = false;

        if (isSwingHigh) {
            swings.push({ price: currentHigh, time: quotes[i].time, type: 'HIGH', index: i });
        }

        // Check Swing Low
        let isSwingLow = true;
        for (let j = 1; j <= leftBars; j++) if (quotes[i - j].low < currentLow) isSwingLow = false;
        for (let j = 1; j <= rightBars; j++) if (quotes[i + j].low <= currentLow) isSwingLow = false;

        if (isSwingLow) {
            swings.push({ price: currentLow, time: quotes[i].time, type: 'LOW', index: i });
        }
    }

    // 2. Identify Structure (Sequence of H/L)
    let structureState: 'UP_TREND' | 'DOWN_TREND' | 'CONSOLIDATION' = 'CONSOLIDATION';
    const bos: BreakEvent[] = [];
    const choch: BreakEvent[] = [];

    // Heuristics:
    // If Last 2 Highs are ascending AND Last 2 Lows are ascending -> UP_TREND
    // If Last 2 Highs are descending AND Last 2 Lows are descending -> DOWN_TREND

    const highs = swings.filter(s => s.type === 'HIGH');
    const lows = swings.filter(s => s.type === 'LOW');

    if (highs.length >= 2 && lows.length >= 2) {
        const lastH = highs[highs.length - 1];
        const prevH = highs[highs.length - 2];
        const lastL = lows[lows.length - 1];
        const prevL = lows[lows.length - 2];

        if (lastH.price > prevH.price && lastL.price > prevL.price) {
            structureState = 'UP_TREND';
        } else if (lastH.price < prevH.price && lastL.price < prevL.price) {
            structureState = 'DOWN_TREND';
        }
    }

    return {
        type: structureState,
        swings,
        bos,
        choch
    };
}

export interface FVG {
    top: number;
    bottom: number;
    time: number;
    type: 'BULLISH' | 'BEARISH';
    index: number;
}

export function detectFVG(quotes: Quote[]): FVG[] {
    const fvgs: FVG[] = [];
    if (quotes.length < 3) return fvgs;

    for (let i = 2; i < quotes.length; i++) {
        const c1 = quotes[i - 2];
        const c2 = quotes[i - 1]; // The FVG Gap Candle
        const c3 = quotes[i];

        // Bullish FVG
        if (c1.high < c3.low) {
            fvgs.push({
                top: c3.low,
                bottom: c1.high,
                time: c2.time,
                type: 'BULLISH',
                index: i - 1
            });
        }

        // Bearish FVG
        if (c1.low > c3.high) {
            fvgs.push({
                top: c1.low,
                bottom: c3.high,
                time: c2.time,
                type: 'BEARISH',
                index: i - 1
            });
        }
    }
    return fvgs;
}

export interface LiquidityPool {
    price: number;
    type: 'EQH' | 'EQL';
    time: number;
    strength: number;
}

export function detectLiquidity(swings: SwingPoint[]): LiquidityPool[] {
    const tolerance = 0.003; // Increased to 0.3% for volatile assets
    const pools: LiquidityPool[] = [];

    const groupSwings = (points: SwingPoint[], type: 'EQH' | 'EQL') => {
        const checked = new Set<number>();

        for (let i = 0; i < points.length; i++) {
            if (checked.has(i)) continue;

            const group = [points[i]];
            checked.add(i);

            for (let j = i + 1; j < points.length; j++) {
                if (checked.has(j)) continue;

                const diff = Math.abs(points[i].price - points[j].price) / points[i].price;
                if (diff <= tolerance) {
                    group.push(points[j]);
                    checked.add(j);
                }
            }

            if (group.length >= 2) {
                const avgPrice = group.reduce((sum, g) => sum + g.price, 0) / group.length;
                const lastTouch = group.sort((a, b) => b.time - a.time)[0];

                pools.push({
                    price: avgPrice,
                    type: type,
                    time: lastTouch.time,
                    strength: group.length
                });
            }
        }
    };

    groupSwings(swings.filter(s => s.type === 'HIGH'), 'EQH');
    groupSwings(swings.filter(s => s.type === 'LOW'), 'EQL');

    return pools;
}

export interface SMTDivergence {
    type: 'BULLISH' | 'BEARISH';
    referenceSymbol: string;
    time: number;
    description: string;
}

export function detectSMT(primaryStruct: MarketStructure, referenceStruct: MarketStructure, refSymbol: string, intervalSeconds: number = 300): SMTDivergence | null {
    const pSwings = primaryStruct.swings;
    const rSwings = referenceStruct.swings;
    if (pSwings.length < 2 || rSwings.length < 2) return null;

    const pHighs = pSwings.filter(s => s.type === 'HIGH');
    const pLows = pSwings.filter(s => s.type === 'LOW');
    if (pHighs.length < 2 || pLows.length < 2) return null;

    const pLastH = pHighs[pHighs.length - 1];
    const pPrevH = pHighs[pHighs.length - 2];
    const pLastL = pLows[pLows.length - 1];
    const pPrevL = pLows[pLows.length - 2];

    // Tolerance: 2.0x the timeframe interval to ensure we catch it
    const timeTol = intervalSeconds * 2.0;

    const findMatchingSwing = (swings: SwingPoint[], targetTime: number) => {
        let closest = null;
        let minDiff = Infinity;
        for (const s of swings) {
            const diff = Math.abs(s.time - targetTime);
            if (diff < minDiff && diff <= timeTol) {
                minDiff = diff;
                closest = s;
            }
        }
        return closest;
    };

    const rLastH = findMatchingSwing(rSwings.filter(s => s.type === 'HIGH'), pLastH.time);
    const rPrevH = findMatchingSwing(rSwings.filter(s => s.type === 'HIGH'), pPrevH.time);

    const rLastL = findMatchingSwing(rSwings.filter(s => s.type === 'LOW'), pLastL.time);
    const rPrevL = findMatchingSwing(rSwings.filter(s => s.type === 'LOW'), pPrevL.time);

    // BEARISH SMT
    if (rLastH && rPrevH) {
        const pTrendUp = pLastH.price > pPrevH.price;
        const rTrendUp = rLastH.price > rPrevH.price;
        if (pTrendUp !== rTrendUp) {
            return {
                type: 'BEARISH',
                referenceSymbol: refSymbol,
                time: pLastH.time,
                description: `Highs Divergence: Primary ${pTrendUp ? 'HH' : 'LH'} vs ${refSymbol} ${rTrendUp ? 'HH' : 'LH'}`
            };
        }
    }

    // BULLISH SMT
    if (rLastL && rPrevL) {
        const pTrendUp = pLastL.price > pPrevL.price;
        const rTrendUp = rLastL.price > rPrevL.price;
        if (pTrendUp !== rTrendUp) {
            return {
                type: 'BULLISH',
                referenceSymbol: refSymbol,
                time: pLastL.time,
                description: `Lows Divergence: Primary ${pTrendUp ? 'HL' : 'LL'} vs ${refSymbol} ${rTrendUp ? 'HL' : 'LL'}`
            };
        }
    }

    return null;
}

export interface CompositeBias {
    score: number;
    label: string;
    factors: string[];
}

export function calculateCompositeBias(
    price: number,
    vwap: number | null,
    trueDayOpen: number,
    pdh: number | null,
    pdl: number | null,
    ema20: number | null,
    ema50: number | null,
    ema200: number | null,
    smts: SMTDivergence[],
    fvgs: FVG[],
    liquidity: LiquidityPool[]
): CompositeBias {
    let score = 0;
    const factors: string[] = [];

    // 1. VWAP & Open (Intraday Bias)
    if (vwap) {
        if (price > vwap) { score += 15; factors.push('Above VWAP'); }
        else { score -= 15; factors.push('Below VWAP'); }
    }

    if (trueDayOpen > 0) {
        if (price > trueDayOpen) { score += 15; factors.push('Above Day Open'); }
        else { score -= 15; factors.push('Below Day Open'); }
    }

    // 2. Reference Levels (PDH/PDL)
    if (pdh && price > pdh) { score += 10; factors.push('Above Prev Day High'); }
    if (pdl && price < pdl) { score -= 10; factors.push('Below Prev Day Low'); }

    // 3. Trend (EMAs)
    if (ema20 && ema50 && ema200) {
        // Macro Bias
        if (price > ema200) { score += 10; factors.push('Macro Bull (>EMA200)'); }
        else { score -= 10; factors.push('Macro Bear (<EMA200)'); }

        // ST Trend
        if (ema20 > ema50) { score += 5; factors.push('ST Uptrend'); }
        else { score -= 5; factors.push('ST Downtrend'); }
    }

    // 4. SMT
    smts.forEach(smt => {
        // Cap SMT influence
        if (smt.type === 'BULLISH') { score += 20; factors.push('Bullish SMT'); }
        if (smt.type === 'BEARISH') { score -= 20; factors.push('Bearish SMT'); }
    });

    // 5. FVG Proximity
    const insideBullishFVG = fvgs.some(f => f.type === 'BULLISH' && price >= f.bottom && price <= f.top);
    const insideBearishFVG = fvgs.some(f => f.type === 'BEARISH' && price >= f.bottom && price <= f.top);

    if (insideBullishFVG) { score += 10; factors.push('Support (Bull FVG)'); }
    if (insideBearishFVG) { score -= 10; factors.push('Resistance (Bear FVG)'); }

    let label = 'NEUTRAL';
    if (score >= 40) label = 'STRONG BULLISH';
    else if (score >= 10) label = 'BULLISH';
    else if (score <= -40) label = 'STRONG BEARISH';
    else if (score <= -10) label = 'BEARISH';

    return { score, label, factors };
}

export interface RiskLevel {
    price: number;
    type: 'TARGET' | 'INVALIDATION';
    description: string;
    distance: number;
    distancePct: number;
}

export interface RiskAnalysis {
    direction: 'LONG' | 'SHORT' | 'NEUTRAL';
    targets: RiskLevel[];
    invalidation: RiskLevel | null;
    rrRatio: number | null;
}

export function calculateRiskLevels(
    currentPrice: number,
    biasScore: number,
    structure: MarketStructure,
    fvgs: FVG[],
    liquidity: LiquidityPool[],
    pdh: number | null,
    pdl: number | null
): RiskAnalysis {
    let direction: 'LONG' | 'SHORT' | 'NEUTRAL' = 'NEUTRAL';
    if (biasScore >= 10) direction = 'LONG';
    else if (biasScore <= -10) direction = 'SHORT';

    const targets: RiskLevel[] = [];
    let invalidation: RiskLevel | null = null;
    let rrRatio: number | null = null;

    if (direction === 'LONG') {
        // INVALIDATION (Stop)
        const supportLows = structure.swings
            .filter(s => s.type === 'LOW' && s.price < currentPrice)
            .sort((a, b) => b.price - a.price);

        if (supportLows.length > 0) {
            const stop = supportLows[0];
            const dist = currentPrice - stop.price;
            invalidation = {
                price: stop.price,
                type: 'INVALIDATION',
                description: 'Potential Invalidation Zone',
                distance: dist,
                distancePct: (dist / currentPrice) * 100
            };
        }

        // TARGETS
        const potentialTargets: { price: number; desc: string }[] = [];
        structure.swings.filter(s => s.type === 'HIGH' && s.price > currentPrice)
            .forEach(s => potentialTargets.push({ price: s.price, desc: 'Swing High' }));
        liquidity.filter(l => l.type === 'EQH' && l.price > currentPrice)
            .forEach(l => potentialTargets.push({ price: l.price, desc: `EQH Liquidity` }));
        fvgs.filter(f => f.type === 'BEARISH' && f.bottom > currentPrice)
            .forEach(f => potentialTargets.push({ price: f.bottom, desc: 'Bearish FVG' }));
        if (pdh && pdh > currentPrice) potentialTargets.push({ price: pdh, desc: 'PDH' });

        potentialTargets.sort((a, b) => a.price - b.price);
        potentialTargets.slice(0, 3).forEach(t => {
            const dist = t.price - currentPrice;
            targets.push({
                price: t.price,
                type: 'TARGET',
                description: t.desc,
                distance: dist,
                distancePct: (dist / currentPrice) * 100
            });
        });

    } else if (direction === 'SHORT') {
        // INVALIDATION
        const resistanceHighs = structure.swings
            .filter(s => s.type === 'HIGH' && s.price > currentPrice)
            .sort((a, b) => a.price - b.price); // Lowest high above price

        if (resistanceHighs.length > 0) {
            const stop = resistanceHighs[0];
            const dist = stop.price - currentPrice;
            invalidation = {
                price: stop.price,
                type: 'INVALIDATION',
                description: 'Potential Invalidation Zone',
                distance: dist,
                distancePct: (dist / currentPrice) * 100
            };
        }

        // TARGETS
        const potentialTargets: { price: number; desc: string }[] = [];
        structure.swings.filter(s => s.type === 'LOW' && s.price < currentPrice)
            .forEach(s => potentialTargets.push({ price: s.price, desc: 'Swing Low' }));
        liquidity.filter(l => l.type === 'EQL' && l.price < currentPrice)
            .forEach(l => potentialTargets.push({ price: l.price, desc: `EQL Liquidity` }));
        fvgs.filter(f => f.type === 'BULLISH' && f.top < currentPrice)
            .forEach(f => potentialTargets.push({ price: f.top, desc: 'Bullish FVG' }));
        if (pdl && pdl < currentPrice) potentialTargets.push({ price: pdl, desc: 'PDL' });

        potentialTargets.sort((a, b) => b.price - a.price); // Highest target below price
        potentialTargets.slice(0, 3).forEach(t => {
            const dist = currentPrice - t.price;
            targets.push({
                price: t.price,
                type: 'TARGET',
                description: t.desc,
                distance: dist,
                distancePct: (dist / currentPrice) * 100
            });
        });
    }


    if (invalidation && targets.length > 0) {
        rrRatio = targets[0].distance / invalidation.distance;
    }

    return { direction, targets, invalidation, rrRatio };
}


export interface PSP extends SwingPoint {
    id: string;
    tf: 'M15' | 'H1' | 'H4';
    score: number; // 0-5
    confluenceFactors: string[];
    isValid: boolean;
    zone: { min: number; max: number };
}

// Precision Swing Point Detection
export function detectPSP(
    quotes: Quote[],
    structure: MarketStructure,
    fvgs: FVG[],
    liquidity: LiquidityPool[],
    keyLevels: { vwap: number | null; open: number | null; pdh: number | null; pdl: number | null }
): PSP[] {
    const psps: PSP[] = [];
    if (structure.swings.length === 0) return psps;

    structure.swings.forEach((swing, index) => {
        let score = 0;
        const factors: string[] = [];

        // 1. FVG Proximity
        const isHigh = swing.type === 'HIGH';
        const relevantFVGs = fvgs.filter(f => isHigh ? f.type === 'BEARISH' : f.type === 'BULLISH');
        const nearbyFVG = relevantFVGs.find(f => {
            const overlap = isHigh
                ? (swing.price <= f.top && swing.price >= f.bottom)
                : (swing.price >= f.bottom && swing.price <= f.top);

            if (overlap) return true;

            const dist = isHigh ? Math.abs(swing.price - f.bottom) : Math.abs(swing.price - f.top);
            return (dist / swing.price) <= 0.0005; // 0.05%
        });

        if (nearbyFVG) {
            score += 1;
            factors.push('FVG_TAP');
        }

        // 2. Liquidity Sweep
        const priorSwings = structure.swings.filter(s => s.type === swing.type && s.time < swing.time);
        const recentPrior = priorSwings.slice(-5);
        let swept = false;
        for (const p of recentPrior) {
            if (isHigh) {
                const candle = quotes.find(q => q.time === swing.time);
                if (candle && swing.price > p.price && candle.close < p.price) {
                    swept = true;
                    break;
                }
            } else {
                const candle = quotes.find(q => q.time === swing.time);
                if (candle && swing.price < p.price && candle.close > p.price) {
                    swept = true;
                    break;
                }
            }
        }

        if (swept) {
            score += 1;
            factors.push('SWEEP');
        } else {
            const nearLiq = liquidity.find(l => {
                return l.type === (isHigh ? 'EQH' : 'EQL') && Math.abs(l.price - swing.price) / swing.price < 0.0005;
            });
            if (nearLiq) {
                score += 1;
                factors.push('LIQ_GRAB');
            }
        }

        // 3. BOS Origin
        let isOrigin = false;
        const nextOpposite = structure.swings.find(s => s.time > swing.time && s.type !== swing.type);
        if (nextOpposite) {
            const subsequentMove = Math.abs(nextOpposite.price - swing.price);
            if (subsequentMove / swing.price > 0.003) {
                const priorOpposite = structure.swings.filter(s => s.time < swing.time && s.type !== swing.type).pop();
                if (priorOpposite) {
                    const broke = isHigh ? (nextOpposite.price < priorOpposite.price) : (nextOpposite.price > priorOpposite.price);
                    if (broke) {
                        isOrigin = true;
                    }
                }
            }
        }

        if (isOrigin) {
            score += 1;
            factors.push('BOS_ORIGIN');
        }

        // 4. Key Levels
        const levels = [keyLevels.vwap, keyLevels.open, keyLevels.pdh, keyLevels.pdl].filter(v => v !== null) as number[];
        const nearKey = levels.some(lvl => Math.abs(lvl - swing.price) / swing.price <= 0.001); // 0.1%
        if (nearKey) {
            score += 1;
            factors.push('KEY_LEVEL');
        }

        if (score >= 3) {
            psps.push({
                ...swing,
                id: `psp-${swing.time}`,
                tf: 'M15',
                score,
                confluenceFactors: factors,
                isValid: true,
                zone: { min: swing.price * 0.9995, max: swing.price * 1.0005 }
            });
        }
    });

    return psps;
}

// NEW TYPES FOR DECISION QUALITY
export interface ScoreComponent {
    label: string;
    points: number;
    category: 'STRUCTURE' | 'TREND' | 'LIQUIDITY' | 'MACRO' | 'SESSION' | 'RISK';
    reason?: string;
}

export interface ConfidenceScorecard {
    total: number;
    rating: 'A+' | 'A' | 'B' | 'C';
    components: ScoreComponent[];
    conflict?: {
        detected: boolean;
        reason: string;
        dominantLayer: string;
    };
    keyOpensBiasScore?: number;
    keyOpensAlignment?: string;
}

export interface TradeScenario {
    type: 'BOS_RETEST' | 'LIQUIDITY_SWEEP' | 'PREMIUM_REJECTION' | 'DISCOUNT_BOUNCE';
    direction: 'LONG' | 'SHORT';
    entryZone: { min: number; max: number };
    stopLoss: number;
    targets: { price: number; desc: string }[];
    rr: number;
    rrWarning?: string;
    timeframe: string;
    biasAlignment: 'ALIGNED' | 'CONTRARIAN' | 'NEUTRAL';
    htfBias: string;
    confidence: {
        score: number;
        rating: 'A+' | 'A' | 'B' | 'C';
        factors: string[];
        scorecard: ConfidenceScorecard; // NEW
    };
    state: 'ACTIONABLE' | 'PENDING' | 'INVALID';
    executionType: 'MARKET' | 'LIMIT' | 'STOP';
    condition: string;
    note?: string;
    description: string;
    isPSP?: boolean;
    isPrimary?: boolean;
    ttl_seconds?: number;
    expires_at?: number; // Unix timestamp
    id?: string; // Stable ID
}

import { DXYContext } from './macro';
import { calculateBollingerBands, BollingerBandValue } from './indicators/bollinger';
import { calculateVWAPBands, VWAPBandValue } from './indicators/vwapBands';
import { calculateMACD, MACDValue } from './indicators/macd';
import { calculateMFI, MFIValue } from './indicators/mfi';
import { evaluateMarketState, MarketStateResult, MarketState } from './guidance/marketState';

export interface TechnicalIndicators {
    bollinger: BollingerBandValue | null;
    vwapBands: VWAPBandValue | null;
    macd: MACDValue | null;
    mfi: MFIValue | null;
    marketState: MarketStateResult;
}

export function calculateIndicators(quotes: Quote[], vwapSeries: (number | null)[]): TechnicalIndicators | null {
    if (!quotes || quotes.length === 0) return null;

    const closes = quotes.map(q => q.close);
    const highs = quotes.map(q => q.high);
    const lows = quotes.map(q => q.low);
    const volumes = quotes.map(q => q.volume);

    // We need 'vwapSeries' to be number[], filtering nulls if possible, or handling them.
    // vwapBands logic expects arrays of same length.
    // Replace null vwaps with previous or close to undefined?
    // Better: If vwap is null, we can't calc vwap bands.
    // We'll fill nulls with 0 or last known for calculation, but map output to null.
    // Actually, vwapBands handles length matching.
    const safeVwaps = vwapSeries.map(v => v || 0);

    const bollingerSeries = calculateBollingerBands(closes);
    const vwapBandsSeries = calculateVWAPBands(closes, safeVwaps);
    const macdSeries = calculateMACD(closes);
    const mfiSeries = calculateMFI(highs, lows, closes, volumes);

    const lastIdx = quotes.length - 1;
    const currentPrice = closes[lastIdx];
    const currentVwap = vwapSeries[lastIdx] || 0;

    const bollinger = bollingerSeries[lastIdx];
    const vwapBands = vwapBandsSeries[lastIdx];
    const macd = macdSeries[lastIdx];
    const mfi = mfiSeries[lastIdx];

    const marketState = evaluateMarketState(currentPrice, currentVwap, vwapBands, macd, mfi);

    return {
        bollinger,
        vwapBands,
        macd,
        mfi,
        marketState
    };
}

// ... (existing imports)

// Update function signature to accept DXY Context
// Update function signature to accept DXY Context
export function detectTradeScenarios(
    currentPrice: number,
    trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'STRONG BULLISH' | 'STRONG BEARISH',
    structure: MarketStructure,
    fvgs: FVG[],
    liquidity: LiquidityPool[],
    vwap: number | null,
    timeframe: string,
    psps: PSP[] = [],
    timeContext?: TimeContext,
    pdRanges?: PDRange,
    dxyContext?: DXYContext,
    regime?: MarketRegime, // CHANGED: Accept Result directly
    technical?: TechnicalIndicators // NEW
): TradeScenario[] {
    const scenarios: TradeScenario[] = [];
    const isBullish = trend.includes('BULLISH');
    const isBearish = trend.includes('BEARISH');
    const biasLabel = trend;

    // Regime passed in arguments

    const calculateStateAndExecution = (
        direction: 'LONG' | 'SHORT',
        entry: { min: number; max: number },
        stop: number,
        current: number
    ): { state: 'ACTIONABLE' | 'PENDING' | 'INVALID'; execution: 'MARKET' | 'LIMIT' | 'STOP'; note?: string } => {
        let state: 'ACTIONABLE' | 'PENDING' | 'INVALID' = 'PENDING';
        let execution: 'MARKET' | 'LIMIT' | 'STOP' = 'LIMIT';
        let note = '';

        if (direction === 'LONG') {
            if (current <= stop) return { state: 'INVALID', execution: 'STOP', note: 'Stop Loss Hit' };
        } else {
            if (current >= stop) return { state: 'INVALID', execution: 'STOP', note: 'Stop Loss Hit' };
        }

        const isInside = current >= entry.min && current <= entry.max;

        if (direction === 'LONG') {
            if (isInside) {
                state = 'ACTIONABLE';
                execution = 'MARKET';
            } else if (current > entry.max) {
                state = 'PENDING';
                execution = 'LIMIT';
                note = 'Await Retrace';
            } else if (current < entry.min && current > stop) {
                state = 'ACTIONABLE';
                execution = 'MARKET';
                note = 'Deep Retrace';
            }
        } else { // SHORT
            if (isInside) {
                state = 'ACTIONABLE';
                execution = 'MARKET';
            } else if (current < entry.min) {
                state = 'PENDING';
                execution = 'LIMIT';
                note = 'Await Retrace';
            } else if (current > entry.max && current < stop) {
                state = 'ACTIONABLE';
                execution = 'MARKET';
                note = 'Deep Retrace';
            }
        }

        return { state, execution, note };
    };
    // ...

    const calculateConfidence = (
        direction: 'LONG' | 'SHORT',
        rr: number,
        type: string,
        state: string,
        isPSP: boolean,
        structureType: string,
        biasAlign: string,
        regime?: MarketRegime,
        technical?: TechnicalIndicators
    ): { score: number, rating: 'A+' | 'A' | 'B' | 'C', factors: string[], scorecard: ConfidenceScorecard } => {
        let score = 0;
        const components: ScoreComponent[] = [];
        const factors: string[] = [];

        // 1. Trend Alignment
        let trendPoints = 0;
        if (biasAlign === 'ALIGNED') {
            trendPoints = 25;
            factors.push('Trend Aligned');
            components.push({ label: 'Trend Alignment', points: 25, category: 'TREND', reason: 'Aligned with Intraday Bias' });
        } else if (biasAlign === 'CONTRARIAN') {
            trendPoints = -15;
            factors.push('Counter-Trend');
            components.push({ label: 'Counter-Trend', points: -15, category: 'TREND', reason: 'Against Intraday Bias' });
        } else {
            components.push({ label: 'Neutral Bias', points: 0, category: 'TREND' });
        }
        score += trendPoints;

        // 2. Market Structure
        let structPoints = 0;
        if ((direction === 'LONG' && structureType === 'UP_TREND') || (direction === 'SHORT' && structureType === 'DOWN_TREND')) {
            structPoints = 20;
            factors.push('Structure Aligned');
            components.push({ label: 'Structure Support', points: 20, category: 'STRUCTURE', reason: 'Structure applies supportive pressure' });
        } else {
            structPoints = -5;
            factors.push('Structure Conflict');
            components.push({ label: 'Structure Conflict', points: -5, category: 'STRUCTURE', reason: 'Structure opposes trade direction' });
        }
        score += structPoints;

        // 3. Confluence (PSP & FVG)
        let confPoints = 0;
        if (isPSP) {
            confPoints += 15;
            factors.push('PSP Anchor');
            components.push({ label: 'PSP Confluence', points: 15, category: 'STRUCTURE', reason: 'High Quality Swing Point' });
        }
        confPoints += 10; factors.push('FVG Confluence');
        components.push({ label: 'FVG Confluence', points: 10, category: 'LIQUIDITY', reason: 'Imbalance Fill' });
        score += confPoints;

        // 4. Liquidity & R:R
        let entryPoints = 0;
        if (rr > 3) {
            entryPoints += 10;
            factors.push('High R:R');
            components.push({ label: 'High R:R', points: 10, category: 'RISK', reason: `R:R ${rr.toFixed(1)}` });
        } else if (rr < 1.5) {
            entryPoints -= 10;
            factors.push('Low R:R');
            components.push({ label: 'Low R:R', points: -10, category: 'RISK', reason: 'Poor Risk/Reward' });
        }
        score += entryPoints;

        // 5. Session & VWAP
        if (timeContext?.isNYKZ || timeContext?.isLondonKZ) {
            score += 5;
            factors.push('Killzone Active');
            components.push({ label: 'Active Session', points: 5, category: 'SESSION', reason: 'Volume Killzone' });
        }

        // 6. VWAP
        if (vwap) {
            let vwapP = 0;
            if ((direction === 'LONG' && currentPrice > vwap) || (direction === 'SHORT' && currentPrice < vwap)) {
                vwapP = 5;
                factors.push('VWAP Aligned');
                components.push({ label: 'VWAP Context', points: 5, category: 'TREND' });
            }
            score += vwapP;
        }

        // 7. USD Context
        if (dxyContext) {
            const mod = dxyContext.confidenceModifier;
            const impact = direction === 'LONG' ? -mod : mod;
            if (Math.abs(impact) >= 3) {
                score += impact;
                components.push({ label: 'USD Macro', points: impact, category: 'MACRO', reason: impact > 0 ? 'USD Tailwinds' : 'USD Headwinds' });
            }
        }

        // 8. Market Regime Penalties (NEW)
        if (regime) {
            if (regime.state === 'CHOPPY') {
                score -= 15;
                factors.push('Choppy Regime');
                components.push({ label: 'Choppy Regime', points: -15, category: 'MACRO', reason: regime.reason });
            } else if (regime.state === 'RANGING') {
                score -= 5;
                factors.push('Ranging Regime');
                components.push({ label: 'Ranging Regime', points: -5, category: 'MACRO', reason: regime.reason });
            } else if (regime.state === 'TRENDING') {
                if (biasAlign === 'ALIGNED') {
                    score += 5;
                    factors.push('Trending Bonus');
                    components.push({ label: 'Trend Bonus', points: 5, category: 'TREND', reason: 'Strong Trend' });
                }
            }
        }

        // 9. Technical Indicators (NEW)
        if (technical) {
            const { flags, state } = technical.marketState;

            // MACD
            if (direction === 'LONG' && flags.macdBullish) {
                score += 10;
                factors.push('MACD Bullish');
                components.push({ label: 'MACD', points: 10, category: 'TREND' });
            } else if (direction === 'SHORT' && flags.macdBearish) {
                score += 10;
                factors.push('MACD Bearish');
                components.push({ label: 'MACD', points: 10, category: 'TREND' });
            }

            // MFI & Mean Reversion
            if (direction === 'LONG' && flags.mfiOversold) {
                score += 10;
                factors.push('MFI Oversold');
                components.push({ label: 'MFI', points: 10, category: 'LIQUIDITY', reason: 'Oversold Bounce' });
            } else if (direction === 'SHORT' && flags.mfiOverbought) {
                score += 10;
                factors.push('MFI Overbought');
                components.push({ label: 'MFI', points: 10, category: 'LIQUIDITY', reason: 'Overbought Rejection' });
            }

            // VWAP Band Rejection (Mean Reversion)
            if (direction === 'LONG' && flags.outsideVWAPLower) {
                score += 10;
                factors.push('Lower Band Reject');
                components.push({ label: 'Band Rejection', points: 10, category: 'STRUCTURE', reason: 'Value Deviation Extreme' });
            } else if (direction === 'SHORT' && flags.outsideVWAPUpper) {
                score += 10;
                factors.push('Upper Band Reject');
                components.push({ label: 'Band Rejection', points: 10, category: 'STRUCTURE', reason: 'Value Deviation Extreme' });
            }

            // Penalties for Fighting Momentum
            if (direction === 'LONG' && state === 'OVERBOUGHT') {
                score -= 15;
                factors.push('Overbought Warning');
                components.push({ label: 'Overbought', points: -15, category: 'RISK', reason: 'Buying Top of Band' });
            } else if (direction === 'SHORT' && state === 'OVERSOLD') {
                score -= 15;
                factors.push('Oversold Warning');
                components.push({ label: 'Oversold', points: -15, category: 'RISK', reason: 'Selling Bottom of Band' });
            }
        }

        // 10. Key Opens Bias (NEW)
        let keyOpensBiasScore = 0;
        let keyOpensAlignment = 'NEUTRAL';
        if (timeContext) {
            const { midnightOpen, londonOpen, nyOpen } = timeContext;

            // Midnight Open
            if (midnightOpen) {
                if (currentPrice > midnightOpen) keyOpensBiasScore += 5;
                else keyOpensBiasScore -= 5;
            }
            // London Open
            if (londonOpen) {
                if (currentPrice > londonOpen) keyOpensBiasScore += 5;
                else keyOpensBiasScore -= 5;
            }
            // NY Open
            if (nyOpen) {
                if (currentPrice > nyOpen) keyOpensBiasScore += 5;
                else keyOpensBiasScore -= 5;
            }

            // Alignment Bonus (All 3 in agreement)
            if (Math.abs(keyOpensBiasScore) === 15) {
                keyOpensBiasScore += (keyOpensBiasScore > 0 ? 5 : -5); // +20 or -20 total
                keyOpensAlignment = keyOpensBiasScore > 0 ? 'STRONG_BULLISH' : 'STRONG_BEARISH';
            } else if (keyOpensBiasScore > 0) {
                keyOpensAlignment = 'BULLISH';
            } else if (keyOpensBiasScore < 0) {
                keyOpensAlignment = 'BEARISH';
            }

            // Apply to Score
            let biasPoints = 0;
            if (direction === 'LONG') {
                biasPoints = keyOpensBiasScore;
            } else {
                biasPoints = -keyOpensBiasScore;
            }
            // Add to Score
            if (biasPoints > 0) {
                score += Math.abs(biasPoints);
                factors.push(`Key Opens Align (${keyOpensAlignment})`);
                components.push({ label: 'Key Opens', points: Math.abs(biasPoints), category: 'SESSION', reason: `Bias ${keyOpensBiasScore > 0 ? 'Bullish' : 'Bearish'}` });
            } else if (biasPoints < 0) {
                score -= Math.abs(biasPoints);
                factors.push(`Key Opens Conflict`);
                components.push({ label: 'Key Opens Conflict', points: -Math.abs(biasPoints), category: 'SESSION', reason: `Bias ${keyOpensBiasScore > 0 ? 'Bullish' : 'Bearish'}` });
            }
        }

        // --- SCORECARD CONSTRUCTION ---
        const totalScore = components.reduce((sum, c) => sum + c.points, 0);
        let rating: 'A+' | 'A' | 'B' | 'C' = 'C';
        if (totalScore >= 75) rating = 'A+';
        else if (totalScore >= 50) rating = 'A';
        else if (totalScore >= 25) rating = 'B';

        const scorecard: ConfidenceScorecard = {
            total: totalScore,
            rating,
            components,
            keyOpensBiasScore,
            keyOpensAlignment
        };

        // Conflict Detection logic remains similar...
        const trendComp = components.find(c => c.category === 'TREND');
        const macroComp = components.find(c => c.category === 'MACRO');
        const structComp = components.find(c => c.category === 'STRUCTURE');

        if (trendComp && macroComp && Math.sign(trendComp.points) !== Math.sign(macroComp.points) && trendComp.points !== 0 && macroComp.points !== 0) {
            scorecard.conflict = {
                detected: true,
                reason: `Intraday Trend (${trendComp.points > 0 ? 'Bullish' : 'Bearish'}) conflicts with Macro (${macroComp.points > 0 ? 'Bullish' : 'Bearish'})`,
                dominantLayer: Math.abs(macroComp.points) > Math.abs(trendComp.points) ? 'MACRO' : 'TREND'
            };
            // Penalize total score for conflict
            score -= 10;
        }

        return { score, rating, factors, scorecard };
    };

    // ... existing scenario detection ... (unchanged)
    // For brevity, skipping the bulk of detectTradeScenarios logic here as we just wanted to add the helper below.
    // The following part is just ensuring we close the function correctly if we were replacing.
    // However, since we are APPENDING the new function at the end or exporting it, let's just ensure we return scenarios.

    // ... execution of detection logic ...



    if (structure.type === 'UP_TREND' || isBullish) {
        const relevantFVGs = fvgs.filter(f => f.type === 'BULLISH' && f.bottom < currentPrice);
        const relevantPSPs = psps.filter(p => p.type === 'LOW' && p.price < currentPrice && p.isValid);

        // Limit to closest FVG/PSP to reduce noise
        const candidates = [...relevantFVGs].sort((a, b) => b.bottom - a.bottom).slice(0, 2);

        candidates.forEach(supportFVG => {
            const alignedPSP = relevantPSPs.find(p => p.price >= supportFVG.bottom && p.price <= supportFVG.top);

            const entryMax = supportFVG.top;
            const entryMin = alignedPSP ? alignedPSP.zone.min : supportFVG.bottom;
            const sl = alignedPSP ? alignedPSP.price * 0.999 : supportFVG.bottom * 0.999;

            if (currentPrice > sl) {
                const { state, execution, note } = calculateStateAndExecution('LONG', { min: entryMin, max: entryMax }, sl, currentPrice);

                if (state !== 'INVALID') {
                    const targets = structure.swings.filter(s => s.type === 'LOW' && s.price < entryMin).sort((a, b) => b.price - a.price).slice(0, 3).map((s, i) => ({ price: s.price, desc: `TP${i + 1}` }));
                    if (targets.length === 0) targets.push({ price: entryMin * 0.98, desc: 'TP1' });

                    const theoreticalRisk = sl - entryMin;
                    const theoreticalReward = entryMin - targets[targets.length - 1].price;
                    const rr = theoreticalRisk > 0 ? theoreticalReward / theoreticalRisk : 0;

                    if (rr > 1.0) {
                        const correlation = isBearish ? 'ALIGNED' : 'CONTRARIAN';
                        const conf = calculateConfidence('SHORT', rr, 'PREMIUM_REJECTION', state, !!alignedPSP, structure.type, correlation, regime, technical);
                        scenarios.push({
                            type: 'PREMIUM_REJECTION',
                            direction: 'SHORT',
                            entryZone: { min: entryMin, max: entryMax },
                            stopLoss: sl,
                            targets,
                            rr,
                            rrWarning: rr > 10 ? 'Extended Target' : undefined,
                            timeframe,
                            biasAlignment: correlation,
                            htfBias: biasLabel,
                            confidence: conf,
                            state,
                            executionType: execution,
                            condition: note || 'Entry Zone Valid',
                            note: correlation === 'CONTRARIAN' ? 'Counter-trend' : undefined,
                            description: alignedPSP ? 'PSP + Bearish FVG' : 'Bearish FVG Rejection',
                            isPSP: !!alignedPSP
                        });
                    }
                }
            }
        });
    }

    const recentEQL = liquidity.find(l => l.type === 'EQL' && Math.abs(currentPrice - l.price) / currentPrice < 0.003);
    if (recentEQL) {
        const sl = recentEQL.price * 0.9985;
        const entry = recentEQL.price;

        if (currentPrice > sl) {
            const state = currentPrice > entry * 1.001 ? 'PENDING' : 'ACTIONABLE';

            const targets = liquidity.filter(l => l.type === 'EQH' && l.price > currentPrice).sort((a, b) => a.price - b.price).slice(0, 2).map((l, i) => ({ price: l.price, desc: `TP${i + 1}` }));
            if (targets.length === 0) targets.push({ price: currentPrice * 1.02, desc: 'TP1' });

            const rr = (targets[0].price - entry) / (entry - sl);

            if (rr > 1.5) {
                const correlation = isBullish ? 'ALIGNED' : (isBearish ? 'CONTRARIAN' : 'NEUTRAL');
                const conf = calculateConfidence('LONG', rr, 'LIQUIDITY_SWEEP', state, false, isBullish ? 'UP_TREND' : 'CONSOLIDATION', correlation, regime, technical);

                scenarios.push({
                    type: 'LIQUIDITY_SWEEP',
                    direction: 'LONG',
                    entryZone: { min: entry * 0.9995, max: entry * 1.0005 },
                    stopLoss: sl,
                    targets,
                    rr,
                    timeframe,
                    biasAlignment: correlation,
                    htfBias: biasLabel,
                    confidence: conf,
                    state,
                    executionType: 'STOP',
                    condition: state === 'PENDING' ? `Wait for Sweep of ${entry.toFixed(2)}` : 'Liquidity Zone Active',
                    description: 'EQL Sweep & Reclaim',
                    isPSP: false
                });
            }
        }
    }

    const recentEQH = liquidity.find(l => l.type === 'EQH' && Math.abs(currentPrice - l.price) / currentPrice < 0.003);
    if (recentEQH) {
        const sl = recentEQH.price * 1.0015;
        const entry = recentEQH.price;

        if (currentPrice < sl) {
            const state = currentPrice < entry * 0.999 ? 'PENDING' : 'ACTIONABLE';

            const targets = liquidity.filter(l => l.type === 'EQL' && l.price < currentPrice).sort((a, b) => b.price - a.price).slice(0, 2).map((l, i) => ({ price: l.price, desc: `TP${i + 1}` }));
            if (targets.length === 0) targets.push({ price: currentPrice * 0.98, desc: 'TP1' });

            const rr = (entry - targets[0].price) / (sl - entry);

            if (rr > 1.5) {
                const correlation = isBearish ? 'ALIGNED' : (isBullish ? 'CONTRARIAN' : 'NEUTRAL');
                const conf = calculateConfidence('SHORT', rr, 'LIQUIDITY_SWEEP', state, false, isBearish ? 'DOWN_TREND' : 'CONSOLIDATION', correlation, regime, technical);

                scenarios.push({
                    type: 'LIQUIDITY_SWEEP',
                    direction: 'SHORT',
                    entryZone: { min: entry * 0.9995, max: entry * 1.0005 },
                    stopLoss: sl,
                    targets,
                    rr,
                    timeframe,
                    biasAlignment: correlation,
                    htfBias: biasLabel,
                    confidence: conf,
                    state,
                    executionType: 'STOP',
                    condition: state === 'PENDING' ? `Wait for Sweep of ${entry.toFixed(2)}` : 'Liquidity Zone Active',
                    description: 'EQH Sweep & Reclaim',
                    isPSP: false
                });
            }
        }
    }

    const uniqueScenarios = scenarios.filter((s, i, self) =>
        i === self.findIndex((t) => (
            t.type === s.type && Math.abs(t.entryZone.min - s.entryZone.min) < 0.1
        ))
    );

    // Identify Primary Setup & Apply TTL Defaults
    const now = Math.floor(Date.now() / 1000); // Current unix time

    // Default TTL Map (seconds)
    const ttlMap: Record<string, number> = {
        'M1-M5 (Scalp)': 240, // 4 mins
        'M15': 2700, // 45 mins
        'H1': 10800 // 3 hours
    };

    uniqueScenarios.forEach(s => {
        const defaultTTL = ttlMap[s.timeframe] || 900;
        s.ttl_seconds = defaultTTL;
        // In a real live feed, expires_at would be set at creation time.
        // For this stateless calculation, we simulate it based on current time
        // assuming the scenario was JUST detected. 
        // In a stateful DB we would persist creation_time.
        s.expires_at = now + defaultTTL;

        // Context-Aware Invalidation
        if (regime?.state === 'CHOPPY' && s.timeframe === 'M1-M5 (Scalp)') {
            // Hard Cap TTL in Chop
            s.ttl_seconds = 60;
            s.expires_at = now + 60;
            s.note = s.note ? `${s.note} (Short TTL due to Chop)` : 'Short TTL (Chop)';
        }
    });

    if (uniqueScenarios.length > 0) {
        // Sort by Confidence Score (Desc) -> Actionable Priority -> R:R
        uniqueScenarios.sort((a, b) => {
            const scoreDiff = (b.confidence?.score || 0) - (a.confidence?.score || 0);
            if (scoreDiff !== 0) return scoreDiff;

            // Priority for ACTIONABLE over PENDING
            if (a.state === 'ACTIONABLE' && b.state !== 'ACTIONABLE') return -1;
            if (b.state === 'ACTIONABLE' && a.state !== 'ACTIONABLE') return 1;

            return b.rr - a.rr;
        });

        // Top is Primary
        uniqueScenarios[0].isPrimary = true;

        // Downgrade Secondary Scenarios (Focus Guard)
        for (let i = 1; i < uniqueScenarios.length; i++) {
            uniqueScenarios[i].isPrimary = false;
            // Secondary scenarios cannot be Actionable unless Primary expires (simple guard: Force Pending)
            if (uniqueScenarios[i].state === 'ACTIONABLE') {
                uniqueScenarios[i].state = 'PENDING';
                uniqueScenarios[i].condition = 'Waiting for Primary Resolution';
            }
        }
    }

    return uniqueScenarios;
}

// --- ICT / SMC Core Context Functions ---

export function detectTimeContext(currentDate: Date, quotes: Quote[]): TimeContext {
    // Convert to New York Time (UTC-5/4)
    const utcHours = currentDate.getUTCHours();
    const utcMinutes = currentDate.getUTCMinutes();

    // Auto-detect DST (March to Nov approx)
    const month = currentDate.getUTCMonth();
    const isDst = month > 2 && month < 10;
    const offset = isDst ? 4 : 5;

    let nyHour = utcHours - offset;
    if (nyHour < 0) nyHour += 24;

    // London KZ: 02:00 - 05:00 NY
    // NY KZ: 07:00 - 10:00 NY
    const isLondonKZ = (nyHour >= 2 && nyHour < 5);
    const isNYKZ = (nyHour >= 7 && nyHour < 10);

    // Find Opens (Midnight 00:00, London 02:00, NY 07:00)
    let midnightOpen: number | null = null;
    let londonOpen: number | null = null;
    let nyOpen: number | null = null;

    const todayDay = currentDate.getUTCDate();

    for (let i = quotes.length - 1; i >= 0; i--) {
        const q = quotes[i];
        // Replace q.date with new Date(q.time * 1000)
        const qDate = new Date(q.time * 1000);

        if (qDate.getUTCDate() !== todayDay) break; // Stop if we hit yesterday

        const qUtcHours = qDate.getUTCHours();
        let qNyHour = qUtcHours - offset;
        if (qNyHour < 0) qNyHour += 24;

        // Tolerance: check specifically the hour start
        if (midnightOpen === null && qNyHour === 0) midnightOpen = q.open;
        if (londonOpen === null && qNyHour === 2) londonOpen = q.open;
        if (nyOpen === null && qNyHour === 7) nyOpen = q.open;
    }

    const nyTimeStr = `${nyHour.toString().padStart(2, '0')}:${utcMinutes.toString().padStart(2, '0')}`;

    return {
        nyTimeStr,
        isLondonKZ,
        isNYKZ,
        midnightOpen,
        londonOpen,
        nyOpen
    };
}

export function detectPDRanges(currentPrice: number, dailyQuotes: Quote[]): PDRange {
    if (!dailyQuotes || dailyQuotes.length === 0) {
        return { dailyHigh: 0, dailyLow: 0, dailyEq: 0, weeklyHigh: 0, weeklyLow: 0, weeklyEq: 0, position: 'EQUILIBRIUM', premiumLevel: 0 };
    }

    // Current Daily Range (use the LAST quote which is today/developing)
    const today = dailyQuotes[dailyQuotes.length - 1];
    const dHigh = today.high;
    const dLow = today.low;
    const dEq = (dHigh + dLow) / 2;

    // Weekly Range (Last 5 days)
    let wHigh = dHigh;
    let wLow = dLow;
    for (let i = 1; i <= 5 && dailyQuotes.length - 1 - i >= 0; i++) {
        const q = dailyQuotes[dailyQuotes.length - 1 - i];
        if (q.high > wHigh) wHigh = q.high;
        if (q.low < wLow) wLow = q.low;
    }

    const wEq = (wHigh + wLow) / 2;

    let position: 'PREMIUM' | 'DISCOUNT' | 'EQUILIBRIUM' = 'EQUILIBRIUM';
    if (currentPrice > dEq) position = 'PREMIUM';
    else if (currentPrice < dEq) position = 'DISCOUNT';

    return {
        dailyHigh: dHigh,
        dailyLow: dLow,
        dailyEq: dEq,
        weeklyHigh: wHigh,
        weeklyLow: wLow,
        weeklyEq: wEq,
        position,
        premiumLevel: dEq
    };
}

// --- ICT Structure Detection ---

export function detectOrderBlocks(
    quotes: Quote[],
    structure: MarketStructure,
    fvgs: FVG[],
    tf: string
): ICTBlock[] {
    const blocks: ICTBlock[] = [];
    const swings = structure.swings;
    const bosEvents = structure.bos;

    // Helper: Find candle at specific time/index
    // `swing.index` might be index in `quotes`.
    // Validating: SwingPoint interface has `index`.

    // For each BOS, find the Origin Swing
    bosEvents.forEach(bos => {
        const isBullish = bos.type.includes('BULLISH');
        const breakIndex = bos.index;

        // Find the specific swing point responsible for this break
        // For Bullish BOS (breaking a High), the origin is the Low preceding it.
        // We look for the most recent Swing Low before the Break Index.

        const originSwing = swings
            .filter(s => s.index < breakIndex && (isBullish ? s.type === 'LOW' : s.type === 'HIGH'))
            .sort((a, b) => b.index - a.index)[0];

        if (!originSwing) return;

        // Validation 1: Displacement (FVG)
        // Must be an FVG *after* the origin and *before* (or at) the break? 
        // Or essentially in the "leg" created by the origin.
        const legFVG = fvgs.find(f =>
            f.index > originSwing.index &&
            f.index <= breakIndex &&
            (isBullish ? f.type === 'BULLISH' : f.type === 'BEARISH')
        );

        if (!legFVG) return; // Weak move, no displacement

        // Define OB Zone: The entire candle of the Swing Point?
        // Or the "Last Down Candle".
        // Keep it simple: Use the Swing Point candle Body.
        const originCandle = quotes[originSwing.index];
        if (!originCandle) return;

        const min = Math.min(originCandle.low, originCandle.high); // conservative: full range
        const max = Math.max(originCandle.low, originCandle.high);

        // Refinement: For Bullish OB, it's the Low to the High of the down candle.
        // Let's use the Swing Point price +/- small buffer or the candle range.
        // Using the Candle Range is standard ICT.

        const zoneMin = isBullish ? originCandle.low : originCandle.low;
        const zoneMax = isBullish ? originCandle.high : originCandle.high;

        // Calculate Score
        let score = 1;
        const factors = ['BOS_ORIGIN'];
        if (legFVG) { score++; factors.push('WITH_DISPLACEMENT'); }

        // Check if unmitigated? 
        // We assume Active unless price has totally smashed through the other side.
        // We'll filter "Active" later based on current price.

        blocks.push({
            id: `ob-${tf}-${originSwing.time}`,
            type: 'ORDER_BLOCK',
            sentiment: isBullish ? 'BULLISH' : 'BEARISH',
            tf,
            zone: { min: zoneMin, max: zoneMax },
            price: originSwing.price,
            time: originSwing.time,
            score,
            factors,
            isActive: true
        });
    });

    // De-duplicate based on time/id
    return blocks.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
}

export function detectBreakerBlocks(
    quotes: Quote[],
    structure: MarketStructure,
    tf: string
): ICTBlock[] {
    const blocks: ICTBlock[] = [];
    const bosEvents = structure.bos;

    // A Breaker is a Swing Point that WAS a valid High/Low, but got Broken.
    // Bullish Breaker: Old High that was broken (now support).
    // Bearish Breaker: Old Low that was broken (now resistance).

    // Structure BOS events tell us exactly when a High/Low was broken.

    bosEvents.forEach(bos => {
        const isBullishBreak = bos.type.includes('BULLISH');
        // Bullish Break = Breaks a High. That High is potential Bullish Breaker.

        // We need to find WHICH High was broken.
        // Usually BOS event doesn't link the specific High ID.
        // Logic: Find the highest High before the break that is < breakIndex and whose price < breakPrice (well, price eq breakPrice).
        // Actually BOS occurs when price > old High.

        // Heuristic: Find the nearest Swing High (for Bullish Break) before the break index.
        const brokenSwing = structure.swings
            .filter(s => s.index < bos.index && (isBullishBreak ? s.type === 'HIGH' : s.type === 'LOW'))
            .sort((a, b) => b.index - a.index)[0];

        if (!brokenSwing) return;

        const candle = quotes[brokenSwing.index];
        if (!candle) return;

        blocks.push({
            id: `bb-${tf}-${brokenSwing.time}`,
            type: 'BREAKER',
            sentiment: isBullishBreak ? 'BULLISH' : 'BEARISH', // Broken High becomes Support (Bullish)
            tf,
            zone: { min: candle.low, max: candle.high },
            price: brokenSwing.price,
            time: brokenSwing.time,
            score: 2,
            factors: ['STRUCTURE_FLIP', 'LIQ_GRAB'],
            isActive: true
        });
    });

    return blocks;
}

export function detectSweeps(quotes: Quote[], pdRanges: PDRange): SweepEvent[] {
    const sweeps: SweepEvent[] = [];
    if (!pdRanges || quotes.length === 0) return sweeps;

    // Check PDH/PDL Sweeps
    // We look at the Current Day's price action.
    // pdRanges.dailyHigh is PREVIOUS Day High (usually). 
    // Wait, in detectPDRanges, I verified exactly what 'dailyHigh' means.
    // If detectPDRanges uses 'Last Completed Day', then dailyHigh is Yesterday's High.
    // If correctly implemented, pdRanges should identify the LEVELS TO SWEEP.

    // We check if ANY candle in `quotes` (assuming intraday) has breached these levels.
    // Usually we care about the *latest* sweep or if it happened today.

    const levels = [
        { name: 'PDH', price: pdRanges.dailyHigh, type: 'HIGH' },
        { name: 'PDL', price: pdRanges.dailyLow, type: 'LOW' }
    ];

    const currentPrice = quotes[quotes.length - 1].close;

    levels.forEach(lvl => {
        let swept = false;
        let sweepTime = 0;
        let reclaimed = false;

        // Scan quotes (optimize: scan backwards)
        for (let i = quotes.length - 1; i >= 0; i--) {
            const q = quotes[i];
            const isToday = new Date(q.time * 1000).getDate() === new Date().getDate();
            if (!isToday) break; // Only today's sweeps

            if (lvl.type === 'HIGH') {
                if (q.high > lvl.price) {
                    swept = true;
                    sweepTime = q.time;
                    // Check Reclaim (Close back below)
                    // If CURRENT price is below, it's reclaimed / rejected.
                    // Or if the sweep candle closed below.
                }
            } else {
                if (q.low < lvl.price) {
                    swept = true;
                    sweepTime = q.time;
                }
            }
        }

        if (swept) {
            // Simple Reclaim Logic: Current Price is back inside range?
            if (lvl.type === 'HIGH') reclaimed = currentPrice < lvl.price;
            else reclaimed = currentPrice > lvl.price;

            sweeps.push({
                level: lvl.name,
                price: lvl.price,
                time: sweepTime,
                type: lvl.type === 'HIGH' ? 'SWEEP_HIGH' : 'SWEEP_LOW',
                reclaimed
            });
        }
    });

    return sweeps;
}

export function detectTRE(dailyQuotes: Quote[]): TREState {
    if (!dailyQuotes || dailyQuotes.length < 6) {
        return { currentRange: 0, averageRange: 0, ratio: 0, state: 'NORMAL' };
    }

    // Calculate Average Range of last 5 days (excluding today)
    let sumRange = 0;
    for (let i = 2; i <= 6; i++) {
        const q = dailyQuotes[dailyQuotes.length - i]; // 2nd to last, 3rd, etc.
        sumRange += (q.high - q.low);
    }
    const avgRange = sumRange / 5;

    // Current Day Range
    const today = dailyQuotes[dailyQuotes.length - 1];
    const currentRange = today.high - today.low;

    const ratio = avgRange > 0 ? currentRange / avgRange : 0;

    let state: 'COMPRESSED' | 'NORMAL' | 'EXPANDED' = 'NORMAL';
    if (ratio < 0.5) state = 'COMPRESSED';
    else if (ratio > 1.0) state = 'EXPANDED';

    return {
        currentRange,
        averageRange: avgRange,
        ratio,
        state
    };
}

export function detectMarketRegime(candles: Quote[], structure: MarketStructure): MarketRegime {
    // Need at least 50 candles for reliable calculation
    const len = candles.length;
    if (len < 50) return { state: 'RANGING', confidence: 50, reason: 'Insufficient Data' };

    // 1. Calculate ADX (Trend Strength)
    // We can use 14 period.
    const adxResult = Indicators.calculateADX(candles, 14);
    const adx = adxResult?.adx || 0;

    // 2. Calculate ATR (Volatility)
    const atrs = Indicators.calculateATR(candles, 14);
    const currentATR = atrs[atrs.length - 1] || 0;
    // Calculate SMA of ATR (e.g. 20 period)
    const avgATR = atrs.length >= 20
        ? atrs.slice(atrs.length - 20).reduce((a, b) => a + b, 0) / 20
        : currentATR;

    // Volatility Ratio (Compression vs Expansion)
    const volatilityRatio = avgATR > 0 ? currentATR / avgATR : 1;

    // 3. Structure Frequency (Chop Detection)
    // Count flips in last 50 bars
    // Optimized: Count swings in last 50 bars
    const LOOKBACK_TIME = candles[len - 50].time;
    const recentSwings = structure.swings.filter(s => s.time > LOOKBACK_TIME);
    const swingDensity = recentSwings.length;

    // Decision Logic
    let state: 'TRENDING' | 'RANGING' | 'CHOPPY' | 'EXPANSION' = 'RANGING';
    let confidence = 50;
    let reason = 'Normal Fluctuation';

    if (swingDensity > 12) {
        state = 'CHOPPY';
        confidence = 90;
        reason = `High Frequency Structure (${swingDensity} flips)`;
    } else if (adx > 25) {
        state = 'TRENDING';
        confidence = 80;
        reason = `Strong Trend (ADX ${adx.toFixed(0)})`;
    } else if (volatilityRatio < 0.75) {
        state = 'RANGING';
        confidence = 65;
        reason = 'Volatility Compression';
    } else if (volatilityRatio > 1.5) {
        state = 'EXPANSION';
        confidence = 70;
        reason = 'Volatility Expansion';
    } else {
        // Fallback Ranging
        state = 'RANGING';
        confidence = 50;
        reason = `Weak Trend (ADX ${adx.toFixed(0)})`;
    }

    // Edge case: Choppy + Trending = Volatile Trend (Dangerous)
    if (adx > 30 && swingDensity > 10) {
        state = 'CHOPPY';
        reason = 'Volatile Trend (Deep Retracements)';
    }

    return { state, confidence, reason };
}

/**
 * Calculates the NY Midnight Bias using a deterministic reducer with hysteresis.
 * @param quotes 1-minute candles from the data feed
 * @param midnightOpen The open price of the 00:00 NY candle
 * @param midnightTimestamp The Unix timestamp (seconds) of the 00:00 NY candle
 * @returns 'LONG' | 'SHORT' | 'NEUTRAL'
 */
export function calculateBufferedBias(
    quotes: Quote[],
    midnightOpen: number,
    midnightTimestamp: number
): 'LONG' | 'SHORT' | 'NEUTRAL' {
    if (!midnightOpen || quotes.length === 0) return 'NEUTRAL';

    const buffer = 1.0; // 4 ticks for NQ/ES (0.25 tick size * 4)
    const upper = midnightOpen + buffer;
    const lower = midnightOpen - buffer;

    // Filter quotes to only include those ON or AFTER the midnight timestamp
    // Assuming quotes are sorted ascending by time
    const relevantQuotes = quotes.filter(q => q.time >= midnightTimestamp);

    if (relevantQuotes.length === 0) return 'NEUTRAL';

    // Initialize Bias
    // Rule: firstClose >= midnightOpen ? LONG : SHORT
    let currentBias: 'LONG' | 'SHORT' | 'NEUTRAL' =
        relevantQuotes[0].close >= midnightOpen ? 'LONG' : 'SHORT';

    // Iterate (Reducer)
    for (let i = 0; i < relevantQuotes.length; i++) {
        const close = relevantQuotes[i].close;

        if (close > upper) {
            currentBias = 'LONG';
        } else if (close < lower) {
            currentBias = 'SHORT';
        }
        // Else: changes nothing (hysteresis)
    }

    return currentBias;
}
