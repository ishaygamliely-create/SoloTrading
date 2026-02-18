/**
 * Market Data Provider Priority Chain
 *
 * Priority: BROKER > TRADINGVIEW > YAHOO
 *
 * BROKER and TRADINGVIEW are activated via env vars:
 *   BROKER_DATA_URL      — REST endpoint returning Candle[] JSON
 *   TRADINGVIEW_DATA_URL — REST endpoint returning Candle[] JSON
 *
 * If an env var is not set, that provider is skipped and the next is tried.
 * Yahoo is always the final fallback.
 */

import YahooFinance from 'yahoo-finance2';
import { normalizeYahooToCandles } from './providers/yahooAdapter';
import type { Candle, Interval } from './marketDataTypes';
import type { DataSource } from './reliability';

export interface FeedResult {
    candles: Candle[];
    sourceUsed: DataSource;
    lastBarTimeMs: number | null;
    fallbackFrom?: DataSource;
}

// ─── Broker Provider ────────────────────────────────────────────────────────

async function brokerProvider(
    symbol: string,
    interval: string,
    period1: Date
): Promise<Candle[] | null> {
    const url = process.env.BROKER_DATA_URL;
    if (!url) return null;

    try {
        const params = new URLSearchParams({
            symbol,
            interval,
            from: period1.toISOString(),
        });
        const res = await fetch(`${url}?${params}`, {
            headers: { Authorization: `Bearer ${process.env.BROKER_API_KEY ?? ''}` },
            signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) return null;
        const data: Candle[] = await res.json();
        return Array.isArray(data) && data.length > 0 ? data : null;
    } catch {
        return null;
    }
}

// ─── TradingView Provider ────────────────────────────────────────────────────

async function tradingViewProvider(
    symbol: string,
    interval: string,
    period1: Date
): Promise<Candle[] | null> {
    const url = process.env.TRADINGVIEW_DATA_URL;
    if (!url) return null;

    try {
        const params = new URLSearchParams({
            symbol,
            interval,
            from: period1.toISOString(),
        });
        const res = await fetch(`${url}?${params}`, {
            headers: { Authorization: `Bearer ${process.env.TRADINGVIEW_API_KEY ?? ''}` },
            signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) return null;
        const data: Candle[] = await res.json();
        return Array.isArray(data) && data.length > 0 ? data : null;
    } catch {
        return null;
    }
}

// ─── Yahoo Provider ──────────────────────────────────────────────────────────

const yahooFinanceInstance = new YahooFinance();

async function yahooProvider(
    symbol: string,
    interval: string,
    period1: Date
): Promise<Candle[] | null> {
    try {
        const res = await yahooFinanceInstance.chart(symbol, {
            period1,
            interval: interval as any,
        });
        const candles = normalizeYahooToCandles(res);
        return candles.length > 0 ? candles : null;
    } catch {
        return null;
    }
}

// ─── Priority Chain ──────────────────────────────────────────────────────────

/**
 * Returns the best available candles for a symbol/interval.
 * Tries BROKER → TRADINGVIEW → YAHOO in order.
 * Always returns a FeedResult (candles may be empty if all fail).
 */
export async function getBestCandles(
    symbol: string,
    interval: string,
    period1: Date
): Promise<FeedResult> {
    const toResult = (
        candles: Candle[],
        sourceUsed: DataSource,
        fallbackFrom?: DataSource
    ): FeedResult => {
        const lastBar = candles.length > 0 ? candles[candles.length - 1] : null;
        return {
            candles,
            sourceUsed,
            lastBarTimeMs: lastBar ? lastBar.time * 1000 : null,
            fallbackFrom,
        };
    };

    // 1. Try BROKER
    if (process.env.BROKER_DATA_URL) {
        const candles = await brokerProvider(symbol, interval, period1);
        if (candles && candles.length > 0) {
            return toResult(candles, 'BROKER');
        }
        // BROKER configured but failed → try TV with fallbackFrom
        if (process.env.TRADINGVIEW_DATA_URL) {
            const tvCandles = await tradingViewProvider(symbol, interval, period1);
            if (tvCandles && tvCandles.length > 0) {
                return toResult(tvCandles, 'TRADINGVIEW', 'BROKER');
            }
        }
        // Both failed → Yahoo with fallbackFrom BROKER
        const yahooCandles = await yahooProvider(symbol, interval, period1);
        return toResult(yahooCandles ?? [], 'YAHOO', 'BROKER');
    }

    // 2. Try TRADINGVIEW (no BROKER configured)
    if (process.env.TRADINGVIEW_DATA_URL) {
        const candles = await tradingViewProvider(symbol, interval, period1);
        if (candles && candles.length > 0) {
            return toResult(candles, 'TRADINGVIEW');
        }
        // TV configured but failed → Yahoo with fallbackFrom TV
        const yahooCandles = await yahooProvider(symbol, interval, period1);
        return toResult(yahooCandles ?? [], 'YAHOO', 'TRADINGVIEW');
    }

    // 3. Yahoo only
    const yahooCandles = await yahooProvider(symbol, interval, period1);
    return toResult(yahooCandles ?? [], 'YAHOO');
}
