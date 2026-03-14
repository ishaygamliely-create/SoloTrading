/**
 * Tastytrade Real-Time Market Data Provider
 *
 * ─── SECURITY ───────────────────────────────────────────────────────────────
 * This module runs EXCLUSIVELY on the server (Next.js API route context).
 * Credentials are read only from process.env — they never touch the client.
 * The session token cache lives in server memory only.
 * Callers receive only a sanitized Candle[] payload — no auth data exposed.
 *
 * ─── FLOW ────────────────────────────────────────────────────────────────────
 *  1. POST /sessions          → session token  (cached server-side for 23.5h)
 *  2. GET  /api-quote-tokens  → DXLink WS token + wss:// URL
 *  3. DXLink WebSocket        → Candle subscription with fromTime
 *  4. Collect candle events   → sanitized Candle[]
 *  5. On ANY error            → return null  (triggers Yahoo fallback)
 *
 * ─── PUBLIC API ──────────────────────────────────────────────────────────────
 *  getAuthForStream() — for SSE tick stream endpoint
 *  tastytradeProvider() — for batch candle fetch (used by marketDataProviders)
 */

import WebSocket from 'ws';
import type { Candle } from '../marketDataTypes';
import { toDxLinkCandleSymbol } from '../futures/symbolMap';

const TT_BASE = 'https://api.tastytrade.com';

// ─── Server-Side Session Cache ────────────────────────────────────────────────
// Kept in module memory. Never serialized. Never sent to clients.

interface SessionCache {
    token: string;
    expiresAt: number; // epoch ms
}

let _sessionCache: SessionCache | null = null;

// ── Failure Backoff ───────────────────────────────────────────────────────────
// After a failed auth, block ALL retries for AUTH_BACKOFF_MS.
// Prevents the 3-second watchdog loop from hammering POST /sessions.
const AUTH_BACKOFF_MS = 5 * 60_000; // 5 minutes
let _lastAuthFailureAt = 0;

async function getSessionToken(): Promise<string | null> {
    const username = process.env.TASTYTRADE_USERNAME;
    const password = process.env.TASTYTRADE_PASSWORD;
    if (!username || !password) return null;

    // ── Return cached token if still valid (5-min safety buffer) ────────────
    if (_sessionCache && _sessionCache.expiresAt - 5 * 60_000 > Date.now()) {
        console.log('[Tastytrade] getSessionToken: using cached token (valid)');
        return _sessionCache.token;
    }

    // ── Backoff: if a recent failure exists, don't retry yet ────────────────
    const timeSinceFailure = Date.now() - _lastAuthFailureAt;
    if (_lastAuthFailureAt > 0 && timeSinceFailure < AUTH_BACKOFF_MS) {
        const waitSec = Math.ceil((AUTH_BACKOFF_MS - timeSinceFailure) / 1000);
        console.warn(`[Tastytrade] getSessionToken: SKIPPING — auth failed recently, backoff ${waitSec}s remaining`);
        return null;
    }

    // ── Single attempt — no retry loop ──────────────────────────────────────
    console.log(`[Tastytrade] getSessionToken: attempting POST /sessions (username=${username})`);
    try {
        const res = await fetch(`${TT_BASE}/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login: username, password }),
            signal: AbortSignal.timeout(8000),
        });

        if (!res.ok) {
            const detail = await res.text().catch(() => '');
            console.error(`[Tastytrade] POST /sessions FAILED: HTTP ${res.status} — ${detail}`);
            _lastAuthFailureAt = Date.now(); // arm backoff — no retry for 5 min
            return null;
        }

        const json = await res.json();
        const token: string | undefined = json?.data?.['session-token'];
        if (!token) {
            console.error('[Tastytrade] POST /sessions: response OK but no session-token in payload');
            _lastAuthFailureAt = Date.now();
            return null;
        }

        // Success — cache for 23.5h, clear failure state
        _sessionCache = { token, expiresAt: Date.now() + 23.5 * 3_600_000 };
        _lastAuthFailureAt = 0;
        console.log('[Tastytrade] POST /sessions: success — token cached for 23.5h');
        return token;
    } catch (err) {
        console.error('[Tastytrade] getSessionToken error (network/timeout):', err);
        _lastAuthFailureAt = Date.now();
        return null;
    }
}


// ─── Quote Token (DXLink auth ticket) ────────────────────────────────────────
// Cached separately from the session token — quote tokens also last ~24h.
// Caching prevents a GET /api-quote-tokens call on every WS reconnect.

interface QuoteTokenResult {
    token: string;
    dxlinkUrl: string;
}

interface QuoteTokenCache {
    token: string;
    dxlinkUrl: string;
    expiresAt: number;
}

let _quoteTokenCache: QuoteTokenCache | null = null;

async function getQuoteToken(sessionToken: string): Promise<QuoteTokenResult | null> {
    // Return cached quote token if still valid (5-min safety buffer)
    if (_quoteTokenCache && _quoteTokenCache.expiresAt - 5 * 60_000 > Date.now()) {
        console.log('[Tastytrade] getQuoteToken: using cached quote token');
        return { token: _quoteTokenCache.token, dxlinkUrl: _quoteTokenCache.dxlinkUrl };
    }

    console.log('[Tastytrade] getQuoteToken: GET /api-quote-tokens');
    try {
        const res = await fetch(`${TT_BASE}/api-quote-tokens`, {
            headers: { Authorization: `Session ${sessionToken}` },
            signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) {
            const detail = await res.text().catch(() => '');
            console.error(`[Tastytrade] GET /api-quote-tokens FAILED: HTTP ${res.status} — ${detail}`);
            return null;
        }

        const json = await res.json();
        const token: string | undefined = json?.data?.token;
        const dxlinkUrl: string | undefined = json?.data?.['dxlink-url'];
        if (!token || !dxlinkUrl) {
            console.error('[Tastytrade] GET /api-quote-tokens: missing token or dxlink-url in response');
            return null;
        }

        // Cache for 23h — same lifetime as session token
        _quoteTokenCache = { token, dxlinkUrl, expiresAt: Date.now() + 23 * 3_600_000 };
        console.log(`[Tastytrade] GET /api-quote-tokens: success — ws endpoint: ${dxlinkUrl}`);
        return { token, dxlinkUrl };
    } catch (err) {
        console.error('[Tastytrade] GET /api-quote-tokens error:', err);
        return null;
    }
}


// ─── Interval Mapping ─────────────────────────────────────────────────────────

function toDxFeedPeriod(interval: string): string {
    switch (interval) {
        case '1m': return '1m';
        case '5m': return '5m';
        case '15m': return '15m';
        case '60m':
        case '1h': return '1h';
        case '4h': return '4h';
        case '1d': return '1d';
        default: return '1m';
    }
}

// ─── DXLink Protocol Messages ────────────────────────────────────────────────

const DXLINK_SETUP = {
    type: 'SETUP', channel: 0,
    version: '0.1', minVersion: '0.1',
    keepaliveTimeout: 60, acceptKeepaliveTimeout: 60,
};

const FEED_SETUP = {
    type: 'FEED_SETUP', channel: 1,
    acceptAggregationPeriod: 10,
    acceptDataFormat: 'COMPACT',
    acceptEventFields: {
        Candle: ['eventSymbol', 'time', 'sequence', 'count',
            'open', 'high', 'low', 'close', 'volume'],
    },
};

// COMPACT field index constants (matches acceptEventFields order above)
const F_TIME = 1, F_OPEN = 4, F_HIGH = 5, F_LOW = 6, F_CLOSE = 7, F_VOL = 8;

// ─── COMPACT Row → Candle ─────────────────────────────────────────────────────

function rowToCandle(row: unknown[]): Candle | null {
    const timeMs = Number(row[F_TIME]);
    const open = Number(row[F_OPEN]);
    const high = Number(row[F_HIGH]);
    const low = Number(row[F_LOW]);
    const close = Number(row[F_CLOSE]);
    const volume = Number(row[F_VOL]) || 0;

    if (!timeMs || isNaN(open) || isNaN(close)) return null;
    if (open === 0 && high === 0 && low === 0 && close === 0) return null;

    return {
        time: Math.floor(timeMs / 1000), // ms → Unix seconds
        open, high, low, close, volume,
    };
}

// ─── WebSocket Candle Fetch (Promise-wrapped) ─────────────────────────────────

export async function fetchCandlesViaDXLink(
    dxSymbol: string,
    fromTimeMs: number,
    quoteToken: string,
    wsUrl: string,
    timeoutMs = 9000,
): Promise<Candle[] | null> {
    return new Promise((resolve) => {
        const collected: Candle[] = [];
        let resolved = false;
        let channelReady = false;

        function finish(result: Candle[] | null) {
            if (resolved) return;
            resolved = true;
            clearTimeout(timer);
            try { ws.terminate(); } catch { /* ignore */ }
            resolve(result);
        }

        // Safety timeout — never block the API route indefinitely
        const timer = setTimeout(() => {
            console.warn(`[Tastytrade] DXLink timeout after ${timeoutMs}ms — returning ${collected.length} candles`);
            finish(collected.length > 10 ? collected : null);
        }, timeoutMs);

        const ws = new WebSocket(wsUrl);

        ws.on('error', (err) => {
            console.error('[Tastytrade] WS error:', err.message);
            finish(null);
        });

        ws.on('open', () => ws.send(JSON.stringify(DXLINK_SETUP)));

        ws.on('message', (raw: Buffer) => {
            let msg: Record<string, unknown>;
            try { msg = JSON.parse(raw.toString()); } catch { return; }

            const type = msg.type as string;

            if (type === 'SETUP') {
                ws.send(JSON.stringify({ type: 'AUTH', channel: 0, token: quoteToken }));

            } else if (type === 'AUTH_STATE') {
                if (msg.state === 'AUTHORIZED') {
                    ws.send(JSON.stringify({
                        type: 'CHANNEL_REQUEST', channel: 1,
                        service: 'FEED', parameters: { contract: 'AUTO' },
                    }));
                } else {
                    console.error('[Tastytrade] DXLink auth rejected:', msg.state);
                    finish(null);
                }

            } else if (type === 'CHANNEL_OPENED' && msg.channel === 1) {
                channelReady = true;
                ws.send(JSON.stringify(FEED_SETUP));
                ws.send(JSON.stringify({
                    type: 'FEED_SUBSCRIPTION', channel: 1,
                    add: [{ type: 'Candle', symbol: dxSymbol, fromTime: fromTimeMs }],
                }));

            } else if (type === 'FEED_DATA' && msg.channel === 1 && channelReady) {
                const dataBlock = msg.data as unknown[][];
                if (!Array.isArray(dataBlock)) return;

                for (const row of dataBlock) {
                    if (!Array.isArray(row)) continue;
                    const candle = rowToCandle(row);
                    if (candle) collected.push(candle);
                }

                // Resolve early once we have enough bars for analysis
                if (collected.length >= 820) {
                    finish(collected);
                }

            } else if (type === 'KEEPALIVE') {
                ws.send(JSON.stringify({ type: 'KEEPALIVE', channel: 0 }));

            } else if (type === 'ERROR') {
                console.error('[Tastytrade] DXLink ERROR:', msg.message);
                finish(null);
            }
        });

        ws.on('close', () => {
            if (!resolved) finish(collected.length > 10 ? collected : null);
        });
    });
}

// ─── Public Provider ──────────────────────────────────────────────────────────

/**
 * Server-side only entry point for the Tastytrade candle provider.
 * Returns sanitized Candle[] or null on failure (triggers Yahoo fallback).
 * No auth data — no credentials — no session tokens are returned to callers.
 */
export async function tastytradeProvider(
    symbol: string,   // Internal futures symbol: MNQ, MES, MYM, NQ, ES
    interval: string,
    period1: Date,
): Promise<Candle[] | null> {
    if (!process.env.TASTYTRADE_USERNAME || !process.env.TASTYTRADE_PASSWORD) {
        return null; // Not configured — skip silently
    }

    try {
        const sessionToken = await getSessionToken();
        if (!sessionToken) return null;

        const quoteInfo = await getQuoteToken(sessionToken);
        if (!quoteInfo) return null;

        const period = toDxFeedPeriod(interval);
        // dxFeed continuous front-month notation: /MNQ{=1m}, /MES{=5m}, etc.
        // Rolls automatically — no manual expiry tracking required.
        const dxSymbol = toDxLinkCandleSymbol(symbol, period);
        const fromMs = period1.getTime();

        const candles = await fetchCandlesViaDXLink(
            dxSymbol, fromMs, quoteInfo.token, quoteInfo.dxlinkUrl,
        );

        if (!candles || candles.length === 0) return null;

        // Sort ascending — dxFeed may deliver out-of-order
        candles.sort((a, b) => a.time - b.time);

        // ─ SANITIZE OUTPUT ──────────────────────────────────────────────────
        // Explicitly reconstruct each Candle — no extra fields from dxFeed
        // can leak through to the API response.
        return candles.map((c) => ({
            time: Math.floor(c.time),
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume,
        }));
    } catch (err) {
        console.error('[Tastytrade] tastytradeProvider fatal error:', err);
        return null;
    }
}

// ─── Shared Auth Export (for SSE quote-stream endpoint) ──────────────────────

/**
 * Returns the DXLink token + wss:// URL for opening a Trade stream.
 * Reuses the shared session cache — zero extra latency when already warm.
 * Server-side only — never import this from a client module.
 */
export async function getAuthForStream(): Promise<{ token: string; dxlinkUrl: string } | null> {
    const sessionToken = await getSessionToken();
    if (!sessionToken) return null;
    return getQuoteToken(sessionToken);
}
