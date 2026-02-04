import { VWAPBandValue } from '../indicators/vwapBands';
import { MACDValue } from '../indicators/macd';
import { MFIValue } from '../indicators/mfi';

export type MarketState =
    | "OVERBOUGHT"
    | "OVERSOLD"
    | "TREND_UP"
    | "TREND_DOWN"
    | "RANGE"
    | "UNKNOWN";

export interface MarketStateResult {
    state: MarketState;
    flags: {
        priceAboveVWAP: boolean;
        priceBelowVWAP: boolean;
        outsideVWAPUpper: boolean;
        outsideVWAPLower: boolean;
        macdBullish: boolean;
        macdBearish: boolean;
        mfiOverbought: boolean;
        mfiOversold: boolean;
    };
}

/**
 * Classifies the current market state based on technical indicators.
 * 
 * Logic Priorities:
 * 1. OVERBOUGHT: Price > Upper VWAP Band && MFI > 80
 * 2. OVERSOLD: Price < Lower VWAP Band && MFI < 20
 * 3. TREND_UP: Price > VWAP && Price >= Basis + (Width * 0.4)? (Riding Band) && MACD Bullish
 *    User Spec: "price above VWAP, riding upper band, MACD bullish"
 * 4. TREND_DOWN: Price < VWAP, riding lower band, MACD bearish
 * 5. RANGE: Else (Inside bands, low momentum)
 */
export function evaluateMarketState(
    currentPrice: number,
    vwap: number,
    vwapBands: VWAPBandValue | null,
    macd: MACDValue | null,
    mfi: MFIValue | null
): MarketStateResult {
    // 1. Data Prep & Flags
    const flags = {
        priceAboveVWAP: currentPrice > vwap,
        priceBelowVWAP: currentPrice < vwap,
        outsideVWAPUpper: vwapBands ? currentPrice > vwapBands.upper : false,
        outsideVWAPLower: vwapBands ? currentPrice < vwapBands.lower : false,
        macdBullish: macd ? (macd.macd > macd.signal) : false,
        macdBearish: macd ? (macd.macd < macd.signal) : false,
        mfiOverbought: mfi ? mfi.overbought : false,
        mfiOversold: mfi ? mfi.oversold : false
    };

    let state: MarketState = "RANGE"; // Default

    if (!vwapBands || !macd || !mfi) {
        return { state: "UNKNOWN", flags };
    }

    // 2. Logic Evaluation

    // Extreme States (Mean Reversion Signals)
    if (flags.outsideVWAPUpper && flags.mfiOverbought) {
        state = "OVERBOUGHT";
    }
    else if (flags.outsideVWAPLower && flags.mfiOversold) {
        state = "OVERSOLD";
    }
    // Trend States
    else if (flags.priceAboveVWAP && flags.macdBullish) {
        // "Riding upper band" - check if price is in the upper quartile of the upper band
        // or effectively challenging the upper band.
        // Let's define "riding" as being closer to Upper Band than VWAP (Basis)
        // i.e. Price > (VWAP + Upper)/2, or simply price is in the upper deviation zone.
        // Assuming "Upper Band" is +2SD. "Riding" might mean > +1SD.
        // Since we don't have +1SD calculated explicitly here (only passed 2SD), 
        // we can approximate or require it to be > VWAP + (Bandwidth/4) or similar?
        // User spec is "riding upper band".
        // Let's stick to Price > Upper or close to it?
        // Actually, user TREND_UP def: "price above VWAP, riding upper band, MACD bullish".
        // If "riding upper band" implies Price is near the upper band.
        // Let's relax it slightly: Price > VWAP is already checked.
        // Check momentum strength.
        // Let's simple check: Price > (VWAP + (Upper - VWAP) * 0.5) aka > +1SD approx.
        const oneSDUppper = vwapBands.basis + (vwapBands.width / 4); // Width is Upper - Lower = 4SD. So /4 = 1SD.

        if (currentPrice > oneSDUppper) {
            state = "TREND_UP";
        }
    }
    else if (flags.priceBelowVWAP && flags.macdBearish) {
        const oneSDLower = vwapBands.basis - (vwapBands.width / 4);
        if (currentPrice < oneSDLower) {
            state = "TREND_DOWN";
        }
    }

    // Else RANGE (Default)

    return { state, flags };
}
