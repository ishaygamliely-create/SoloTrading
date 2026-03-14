/**
 * SSE Live Price Stream — /api/quote-stream
 *
 * ─── SECURITY ──────────────────────────────────────────
 * All DXLink auth tokens are server-side only.
 * Clients receive only: { price, timeNy, mode, source }
 * No credentials, no session tokens, no DXLink URLs.
 *
 * ─── STREAM EVENTS (sent to browser) ──────────────────
 *   mode: 'LIVE'        — DXLink Trade tick (multiple/min)
 *   mode: 'RECONNECTING'— stream stalled >5s (last price held)
 *   mode: 'FALLBACK'    — source: 'TASTYTRADE_CANDLE' | 'YAHOO'
 *
 * ─── FALLBACK CHAIN ───────────────────────────────────
 *   DXLink Trade → Tastytrade 1m candle close → Yahoo
 */

import WebSocket from 'ws';
import { getAuthForStream, tastytradeProvider } from '../../lib/providers/tastytradeAdapter';
import { toDxLinkTradeSymbol, toYahooSymbol, normaliseSymbol } from '../../lib/futures/symbolMap';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Vercel Pro: 5 min; Hobby: effectively 10s (auto-reconnect handles it)

// ─── NY Time Formatter ────────────────────────────────────────────────────────
const NY_FMT = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
});
const nowNy = () => NY_FMT.format(new Date());

// ─── DXLink Protocol ──────────────────────────────────────────────────────────
const DXLINK_SETUP = {
    type: 'SETUP', channel: 0,
    version: '0.1', minVersion: '0.1',
    keepaliveTimeout: 60, acceptKeepaliveTimeout: 60,
};

// Trade COMPACT fields: [eventSymbol, time, price, dayVolume, size]
const TRADE_PRICE_IDX = 2;

// ─── Yahoo Price Fallback ─────────────────────────────────────────────────────
async function yahooFallbackPrice(yahooSymbol: string): Promise<number | null> {
    try {
        const YahooFinance = (await import('yahoo-finance2')).default;
        const yf = new YahooFinance();
        const q = await yf.quote(yahooSymbol);
        return (q as any)?.regularMarketPrice ?? null;
    } catch {
        return null;
    }
}

// ─── Tastytrade Candle Fallback ────────────────────────────────────────────────
async function candleFallbackPrice(internalSymbol: string): Promise<number | null> {
    try {
        const period1 = new Date(Date.now() - 10 * 60_000); // last 10m
        const candles = await tastytradeProvider(internalSymbol, '1m', period1);
        if (candles && candles.length > 0) {
            return candles[candles.length - 1].close;
        }
    } catch { /* fall through */ }
    return null;
}

// ─── SSE GET Handler ─────────────────────────────────────────────────────────
export async function GET(request: Request): Promise<Response> {
    const encoder = new TextEncoder();

    // Resolve symbol from query param — default MNQ, normalise to internal form
    const { searchParams } = new URL(request.url);
    const rawSymbol = searchParams.get('symbol') ?? 'MNQ';
    const internalSymbol = normaliseSymbol(rawSymbol) ?? 'MNQ';
    const dxTradeSymbol = toDxLinkTradeSymbol(internalSymbol);   // e.g. /MNQ
    const yahooSymbol = toYahooSymbol(internalSymbol);         // e.g. MNQ=F

    const stream = new ReadableStream({
        start(controller) {
            let ws: WebSocket | null = null;
            let closed = false;
            let lastTradeMs = 0;
            let lastGoodPrice: number | null = null;
            let fallbackMode = false;
            let watchdogRunning = false;

            // ── Per-connection bar aggregation state ───────────────────────────
            // Uses DXLink Trade.time (ms) — NOT wall clock — for accurate boundaries.
            // barMinuteSec = 0 is a sentinel (no real minute is Unix second 0).
            let barMinuteSec = 0;   // UTC seconds of the current minute floor
            let barOpen = 0;
            let barHigh = 0;
            let barLow = 0;

            // ── Declare intervals BEFORE cleanup() to avoid TDZ ReferenceError ─
            let heartbeat: ReturnType<typeof setInterval> | null = null;
            let watchdog: ReturnType<typeof setInterval> | null = null;

            // ── Helpers ────────────────────────────────────────────────────────
            function enqueue(text: string) {
                if (closed) return;
                try { controller.enqueue(encoder.encode(text)); } catch { /* stream closed */ }
            }

            function sendEvent(payload: {
                price: number | null;
                timeNy: string;
                mode: 'LIVE' | 'RECONNECTING' | 'FALLBACK';
                source: 'TASTYTRADE' | 'TASTYTRADE_CANDLE' | 'YAHOO' | null;
                tradeTimeMs?: number;
                bar?: { time: number; open: number; high: number; low: number; close: number } | null;
            }) {
                enqueue(`data: ${JSON.stringify(payload)}\n\n`);
            }

            function cleanup() {
                if (closed) return;
                closed = true;
                if (watchdog !== null) clearInterval(watchdog);
                if (heartbeat !== null) clearInterval(heartbeat);
                try { ws?.terminate(); } catch { /* ignore */ }
                try { controller.close(); } catch { /* ignore */ }
                console.log('[QuoteStream] Stream closed');
            }

            // ── Heartbeat (keeps SSE alive through proxies / Vercel edge) ─────
            heartbeat = setInterval(() => enqueue(': ♥\n\n'), 20_000);

            // ── Watchdog: checks trade freshness every 3s ──────────────────────
            watchdog = setInterval(async () => {
                if (closed || watchdogRunning) return;
                watchdogRunning = true;
                try {
                    const age = lastTradeMs > 0 ? Date.now() - lastTradeMs : Infinity;
                    const wsLive = ws !== null && ws.readyState === WebSocket.OPEN;

                    if (age < 5000 && wsLive) {
                        // Good — trade stream is fresh; reset fallback flag
                        fallbackMode = false;
                        return;
                    }

                    // Trade stream stalled — try fallback chain
                    if (!fallbackMode) {
                        fallbackMode = true;
                        // Immediately show RECONNECTING with last known price
                        sendEvent({
                            price: lastGoodPrice,
                            timeNy: nowNy(),
                            mode: 'RECONNECTING',
                            source: null,
                        });
                    }

                    // 1. Tastytrade candle fallback
                    const candlePrice = await candleFallbackPrice(internalSymbol);
                    if (candlePrice !== null) {
                        lastGoodPrice = candlePrice;
                        sendEvent({ price: candlePrice, timeNy: nowNy(), mode: 'FALLBACK', source: 'TASTYTRADE_CANDLE' });
                        console.log(`[QuoteStream] Candle fallback: ${candlePrice}`);
                        return;
                    }

                    // 2. Yahoo fallback
                    const yahooPrice = await yahooFallbackPrice(yahooSymbol);
                    if (yahooPrice !== null) {
                        lastGoodPrice = yahooPrice;
                        sendEvent({ price: yahooPrice, timeNy: nowNy(), mode: 'FALLBACK', source: 'YAHOO' });
                        console.log(`[QuoteStream] Yahoo fallback: ${yahooPrice}`);
                    }
                } finally {
                    watchdogRunning = false;
                }
            }, 3000);

            // ── Main DXLink connection (IIFE so we can use async/await) ────────
            (async () => {
                try {
                    // Step 1: Auth
                    const auth = await getAuthForStream();
                    if (!auth) {
                        console.error('[QuoteStream] Auth failed — going to Yahoo fallback');
                        const p = await yahooFallbackPrice(yahooSymbol);
                        if (p !== null) sendEvent({ price: p, timeNy: nowNy(), mode: 'FALLBACK', source: 'YAHOO' });
                        return; // watchdog will keep refreshing
                    }

                    // Step 2: Open DXLink WebSocket
                    ws = new WebSocket(auth.dxlinkUrl);

                    ws.on('error', (err) => {
                        console.error('[QuoteStream] WS error:', err.message);
                        ws = null; // watchdog will detect this and fall back
                    });

                    ws.on('close', () => {
                        console.warn('[QuoteStream] DXLink WS closed');
                        ws = null;
                    });

                    ws.on('open', () => {
                        ws?.send(JSON.stringify(DXLINK_SETUP));
                        console.log('[QuoteStream] DXLink connected');
                    });

                    // Step 3: DXLink protocol state machine
                    ws.on('message', (raw: Buffer) => {
                        if (closed) return;
                        let msg: Record<string, unknown>;
                        try { msg = JSON.parse(raw.toString()); } catch { return; }

                        const type = msg.type as string;

                        if (type === 'SETUP') {
                            ws?.send(JSON.stringify({ type: 'AUTH', channel: 0, token: auth.token }));

                        } else if (type === 'AUTH_STATE') {
                            if (msg.state === 'AUTHORIZED') {
                                ws?.send(JSON.stringify({
                                    type: 'CHANNEL_REQUEST', channel: 1,
                                    service: 'FEED', parameters: { contract: 'AUTO' },
                                }));
                            } else {
                                console.error('[QuoteStream] Auth rejected:', msg.state);
                                ws?.terminate(); ws = null;
                            }

                        } else if (type === 'CHANNEL_OPENED' && msg.channel === 1) {
                            // Set up Trade subscription — acceptAggregationPeriod:0 = every tick
                            ws?.send(JSON.stringify({
                                type: 'FEED_SETUP', channel: 1,
                                acceptAggregationPeriod: 0,
                                acceptDataFormat: 'COMPACT',
                                acceptEventFields: {
                                    Trade: ['eventSymbol', 'time', 'price', 'dayVolume', 'size'],
                                },
                            }));
                            ws?.send(JSON.stringify({
                                type: 'FEED_SUBSCRIPTION', channel: 1,
                                add: [{ type: 'Trade', symbol: dxTradeSymbol }],
                            }));
                            console.log(`[QuoteStream] Subscribed to Trade ${dxTradeSymbol}`);

                        } else if (type === 'FEED_DATA' && msg.channel === 1) {
                            // Parse COMPACT rows: [symbol, tradeTimeMs, price, dayVol, size]
                            const dataBlock = msg.data as unknown[][];
                            if (!Array.isArray(dataBlock)) return;

                            for (const row of dataBlock) {
                                if (!Array.isArray(row)) continue;
                                const price = Number(row[TRADE_PRICE_IDX]);
                                if (!price || isNaN(price) || price <= 0) continue;

                                // ── Bar aggregation (server-side, Option B) ──────────
                                // row[1] = DXLink Trade.time in ms (CME authoritative).
                                // Skip rows with invalid/missing timestamps — never fall
                                // back to Date.now() (would corrupt candle boundaries).
                                const tradeMs = Number(row[1]);
                                if (!Number.isFinite(tradeMs) || tradeMs <= 0) continue;
                                const minuteSec = Math.floor(tradeMs / 60_000) * 60;

                                if (minuteSec !== barMinuteSec) {
                                    // New minute — initialize fresh bar.
                                    // barMinuteSec=0 sentinel means first tick ever
                                    // OR after reconnect: always safe to reset from first tick.
                                    barMinuteSec = minuteSec;
                                    barOpen = price;
                                    barHigh = price;
                                    barLow = price;
                                } else {
                                    // Same minute — extend running bar
                                    if (price > barHigh) barHigh = price;
                                    if (price < barLow) barLow = price;
                                }

                                lastTradeMs = Date.now();
                                lastGoodPrice = price;
                                fallbackMode = false;

                                sendEvent({
                                    price,
                                    timeNy: nowNy(),
                                    tradeTimeMs: tradeMs,
                                    mode: 'LIVE',
                                    source: 'TASTYTRADE',
                                    bar: {
                                        time: minuteSec,   // UTC seconds — consistent with historical candles
                                        open: barOpen,
                                        high: barHigh,
                                        low: barLow,
                                        close: price,
                                    },
                                });
                                console.log(
                                    `[QuoteStream] ♙ ${price} | bar O:${barOpen} H:${barHigh} L:${barLow} C:${price} t:${minuteSec}`
                                );
                            }

                        } else if (type === 'KEEPALIVE') {
                            ws?.send(JSON.stringify({ type: 'KEEPALIVE', channel: 0 }));

                        } else if (type === 'ERROR') {
                            console.error('[QuoteStream] DXLink error:', msg.message);
                        }
                    });

                } catch (err) {
                    console.error('[QuoteStream] Fatal error in IIFE:', err);
                    // Watchdog will handle fallback
                }
            })();

            // ── Client disconnect handler ──────────────────────────────────────
            request.signal.addEventListener('abort', cleanup);
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',   // Prevent nginx/Vercel buffering SSE
        },
    });
}
