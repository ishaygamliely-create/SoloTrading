/**
 * Futures Symbol Map — Single source of truth for symbol normalization
 *
 * Internal symbols (used throughout the system):
 *   MNQ | MES | MYM | NQ | ES
 *
 * dxFeed continuous front-month notation is used for ALL DXLink subscriptions.
 * These roll automatically — no manual expiry tracking needed.
 *
 *   /MNQ{=1m}   →  Micro Nasdaq, 1-minute candles
 *   /MNQ        →  Micro Nasdaq, Trade ticks (no aggregation period)
 *
 * Yahoo Finance symbols are used ONLY for SMT reference fetches and fallback.
 */

// ─── Symbol Definitions ───────────────────────────────────────────────────────

/** All futures symbols the system recognises (internal format, uppercase). */
export type FuturesSymbol = 'MNQ' | 'MES' | 'MYM' | 'NQ' | 'ES';

/** Whether a given string is a known futures symbol. */
export function isFuturesSymbol(symbol: string): symbol is FuturesSymbol {
    return ['MNQ', 'MES', 'MYM', 'NQ', 'ES'].includes(symbol.toUpperCase());
}

// Yahoo Finance ticker for each futures symbol (continuous contract notation)
const YAHOO_MAP: Record<FuturesSymbol, string> = {
    MNQ: 'MNQ=F',
    MES: 'MES=F',
    MYM: 'MYM=F',
    NQ: 'NQ=F',
    ES: 'ES=F',
};

// DXLink continuous root (prefix before aggregation period / trade subscription)
const DXLINK_ROOT: Record<FuturesSymbol, string> = {
    MNQ: '/MNQ',
    MES: '/MES',
    MYM: '/MYM',
    NQ: '/NQ',
    ES: '/ES',
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Normalise any incoming symbol string to the internal uppercase short form.
 * Strips Yahoo suffixes (=F), dxFeed slashes, and aggregation braces.
 *
 * Examples:
 *   "mnq"        → "MNQ"
 *   "MNQ=F"      → "MNQ"
 *   "/MES"       → "MES"
 *   "/MES{=1m}"  → "MES"
 */
export function normaliseSymbol(raw: string): FuturesSymbol | null {
    const clean = raw
        .toUpperCase()
        .replace(/^\//, '')        // strip leading slash
        .replace(/=F$/, '')        // strip Yahoo suffix
        .replace(/\{.*\}$/, '');   // strip DXLink aggregation period

    return isFuturesSymbol(clean) ? (clean as FuturesSymbol) : null;
}

/**
 * Returns the Yahoo Finance ticker for a given internal symbol.
 * Fallback: appends "=F" if the symbol isn't in the known map.
 *
 * Used for: SMT reference fetches, Yahoo candle fallback.
 */
export function toYahooSymbol(symbol: string): string {
    const norm = normaliseSymbol(symbol);
    if (norm) return YAHOO_MAP[norm];
    // Best-effort for unknown symbols
    const up = symbol.toUpperCase();
    return up.endsWith('=F') ? up : `${up}=F`;
}

/**
 * Returns the DXLink continuous front-month Candle symbol for a given
 * internal symbol and interval period (e.g. '1m', '5m', '15m', '1h', '1d').
 *
 * /MNQ{=1m}  — dxFeed auto-rolls to the current front-month contract.
 *
 * Used for: `tastytradeProvider()` candle fetches.
 */
export function toDxLinkCandleSymbol(symbol: string, period: string): string {
    const norm = normaliseSymbol(symbol);
    const root = norm ? DXLINK_ROOT[norm] : `/${symbol.toUpperCase()}`;
    return `${root}{=${period}}`;
}

/**
 * Returns the DXLink Trade subscription symbol (no aggregation period).
 *
 * /MNQ — subscribes to all Trade ticks for the front-month MNQ contract.
 *
 * Used for: `quote-stream/route.ts` live tick subscription.
 */
export function toDxLinkTradeSymbol(symbol: string): string {
    const norm = normaliseSymbol(symbol);
    return norm ? DXLINK_ROOT[norm] : `/${symbol.toUpperCase()}`;
}
