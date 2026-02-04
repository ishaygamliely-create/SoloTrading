import { ActiveTrade, GuidanceMessage } from '../context/ActiveTradeContext';

// --- CONSTANTS ---
const THRESHOLDS = {
    RISK_CAUTION_PCT: 70, // % of max risk used implies caution
    SMT_REVERSAL_CONFIDENCE: 80, // SMT score confidence to trigger caution
};

// --- TYPES ---
export type GuidanceResult = {
    status: 'HOLD' | 'CAUTION' | 'EXIT';
    evidence: string[];
};

export function evaluateGuidance(trade: ActiveTrade, marketData: any): GuidanceResult {
    const evidence: string[] = [];
    const price = marketData.regularMarketPrice || marketData.price;

    if (!price) {
        return { status: 'HOLD', evidence: ['Waiting for price data...'] };
    }

    const isLong = trade.direction === 'LONG';
    const currentRisk = isLong ? trade.entryPrice - trade.stopLossPrice : trade.stopLossPrice - trade.entryPrice; // Points
    // dist in points from entry to current price (drawdown or profit)
    // Actually we care about SL distance

    // 1. EXIT CHECKS (Hard Rules)

    // Rule 1.1: SL Breached
    const slBreached = isLong ? price <= trade.stopLossPrice : price >= trade.stopLossPrice;
    if (slBreached) {
        return {
            status: 'EXIT',
            evidence: ['Stop Loss level breached', 'Hard invalidation of trade structure']
        };
    }

    // Rule 1.2: Structure Flip (Trend Engine)
    // Assuming marketData.analysis contains trend engine state.
    // If we are LONG, but Trend Regime becomes "BEARISH_TREND" or similar strong reversal.
    // Let's assume simplistic check for now based on what we see in `analysis.ts` or `DashboardPanels`.
    // We'll use a placeholder for "Bearish Structure Break" if the trend engine explicitly says so.
    const trendRegime = marketData.analysis?.trend?.regime || 'NEUTRAL';
    if (isLong && trendRegime.includes('BEARISH') && trendRegime.includes('STRONG')) {
        return {
            status: 'EXIT',
            evidence: ['Trend Engine confirmed STRONG BEARISH Flip', 'Momentum fully invalidated']
        };
    }
    if (!isLong && trendRegime.includes('BULLISH') && trendRegime.includes('STRONG')) {
        return {
            status: 'EXIT',
            evidence: ['Trend Engine confirmed STRONG BULLISH Flip', 'Momentum fully invalidated']
        };
    }

    // 2. CAUTION CHECKS

    // Rule 2.1: Drawdown > 70% of Risk
    const distToSL = Math.abs(trade.stopLossPrice - trade.entryPrice);
    const distPriceToSL = Math.abs(price - trade.stopLossPrice);
    // If we are close to SL.
    // Drawdown means price is moving towards SL.
    // if price is 10pts from SL, and full risk was 20pts. That is 50% drawdown.
    // if price is 2pts from SL, and full risk 20pts. That is 90% drawdown.
    const riskRemainingPct = (distPriceToSL / distToSL) * 100;
    // Wait, validity check: if isLong, Price > SL.
    // if Price < Entry, we are in drawdown.
    const isInDrawdown = isLong ? price < trade.entryPrice : price > trade.entryPrice;

    if (isInDrawdown) {
        // Calculate how much "Risk" we have consumed.
        // Consumed = Entry - Price (Long)
        // MaxRiskDist = Entry - SL
        const consumedDist = isLong ? trade.entryPrice - price : price - trade.entryPrice;
        const totalRiskDist = Math.abs(trade.entryPrice - trade.stopLossPrice);
        const consumedPct = (consumedDist / totalRiskDist) * 100;

        if (consumedPct >= THRESHOLDS.RISK_CAUTION_PCT) {
            evidence.push(`Drawdown critical: ${consumedPct.toFixed(0)}% of max risk consumed`);
        }
    }

    // Rule 2.2: Choppy Regime
    if (trendRegime === 'CHOPPY' || trendRegime === 'NEUTRAL') {
        evidence.push('Market Regime classified as CHOPPY/NEUTRAL');
    }

    // Rule 2.3: Opposing Liquidity/Bios
    const biasScore = marketData.analysis?.bias?.score || 0;
    if (isLong && biasScore < -10) evidence.push('Composite Bias Score turned NEGATIVE (-10+)');
    if (!isLong && biasScore > 10) evidence.push('Composite Bias Score turned POSITIVE (+10+)');

    // Rule 2.4: Technical Indicators (NEW)
    const technical = marketData.analysis?.technical;
    if (technical) {
        const { state, flags } = technical.marketState;

        // Contra-Trend Warnings
        if (isLong) {
            if (state === 'TREND_DOWN') evidence.push('Market State flipped to TREND_DOWN');
            if (state === 'OVERBOUGHT') evidence.push('Market State is OVERBOUGHT (Consider partials)');
            if (flags.macdBearish) evidence.push('MACD flipped Bearish');
            if (flags.outsideVWAPUpper && flags.mfiOverbought) evidence.push('Price Outside Upper VWAP + MFI Overbought');
        } else { // SHORT
            if (state === 'TREND_UP') evidence.push('Market State flipped to TREND_UP');
            if (state === 'OVERSOLD') evidence.push('Market State is OVERSOLD (Consider partials)');
            if (flags.macdBullish) evidence.push('MACD flipped Bullish');
            if (flags.outsideVWAPLower && flags.mfiOversold) evidence.push('Price Outside Lower VWAP + MFI Oversold');
        }
    }


    // 3. FINAL EVALUATION
    if (evidence.length > 0) {
        return {
            status: 'CAUTION',
            evidence
        };
    }

    // 4. HOLD
    return {
        status: 'HOLD',
        evidence: ['Structure intact', 'No invalidation triggers']
    };
}
