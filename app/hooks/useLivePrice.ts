'use client';

import { useState, useEffect, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type LiveMode = 'CONNECTING' | 'LIVE' | 'RECONNECTING' | 'FALLBACK';
export type LiveSource = 'TASTYTRADE' | 'TASTYTRADE_CANDLE' | 'YAHOO' | null;

/** Bar snapshot from server-side aggregation — use directly with series.update() */
export interface LiveBar {
    time: number;  // UTC seconds (minute floor from DXLink trade timestamp)
    open: number;
    high: number;
    low: number;
    close: number;
}

export interface LivePriceState {
    /** Latest price — held from last good value during RECONNECTING */
    price: number | null;
    /** NY time string of the LAST RECEIVED tick (HH:MM:SS) */
    lastTickTimeNy: string | null;
    /** Current stream mode */
    mode: LiveMode;
    /** Data source identifier — null during CONNECTING/RECONNECTING */
    source: LiveSource;
    /** Server-aggregated bar for the current minute — null when not LIVE */
    bar: LiveBar | null;
}

// ─── SSE Event payload shape (from /api/quote-stream) ────────────────────────
interface StreamEvent {
    price: number | null;
    timeNy: string;
    mode: 'LIVE' | 'RECONNECTING' | 'FALLBACK';
    source: LiveSource;
    tradeTimeMs?: number;
    bar?: LiveBar | null;
}

// ─── useLivePrice Hook ────────────────────────────────────────────────────────

const STALE_THRESHOLD_MS = 5000; // 5s without tick → show RECONNECTING

/**
 * Opens an SSE connection to /api/quote-stream and maintains live price state.
 * Implements client-side watchdog + auto-reconnect.
 * Auth tokens never reach this hook — only sanitized price/mode/source/time.
 */
export function useLivePrice(): LivePriceState {
    const [state, setState] = useState<LivePriceState>({
        price: null,
        lastTickTimeNy: null,
        mode: 'CONNECTING',
        source: null,
        bar: null,
    });

    // Refs hold mutable state that must survive re-renders without triggering them
    const lastPriceRef = useRef<number | null>(null);
    const lastTimeNyRef = useRef<string | null>(null);
    const lastEventMsRef = useRef<number>(0);
    const esRef = useRef<EventSource | null>(null);
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const watchdogRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const unmountedRef = useRef(false);

    useEffect(() => {
        unmountedRef.current = false;

        // ── connect / reconnect ────────────────────────────────────────────────
        const connect = () => {
            if (unmountedRef.current) return;

            // Close existing connection before reconnecting
            if (esRef.current) { esRef.current.close(); esRef.current = null; }

            setState(prev => ({ ...prev, mode: 'CONNECTING', source: null, bar: null }));
            const es = new EventSource('/api/quote-stream');
            esRef.current = es;

            es.onmessage = (event: MessageEvent<string>) => {
                if (unmountedRef.current) return;
                let data: StreamEvent;
                try { data = JSON.parse(event.data); } catch { return; }

                lastEventMsRef.current = Date.now();

                // Hold last good price/time across RECONNECTING events
                if (data.price !== null && data.price > 0) {
                    lastPriceRef.current = data.price;
                }
                if (data.timeNy) {
                    lastTimeNyRef.current = data.timeNy;
                }

                setState({
                    price: data.price ?? lastPriceRef.current,
                    lastTickTimeNy: data.timeNy ?? lastTimeNyRef.current,
                    mode: data.mode,
                    source: data.source,
                    bar: data.bar ?? null,
                });
            };

            // EventSource auto-reconnects by default; we add explicit state management
            es.onerror = () => {
                if (unmountedRef.current) return;
                // Show RECONNECTING immediately, keeping last good values visible
                setState({
                    price: lastPriceRef.current,
                    lastTickTimeNy: lastTimeNyRef.current,
                    mode: 'RECONNECTING',
                    source: null,
                    bar: null,   // pause chart updates during reconnect
                });
                es.close();
                esRef.current = null;
                // Reconnect after short delay — exponential backoff could be added here
                reconnectTimerRef.current = setTimeout(connect, 2500);
            };
        };

        // ── Client-side watchdog: catches silent stream stalls ─────────────────
        // (EventSource stays "connected" but no events arrive — e.g. market closed)
        watchdogRef.current = setInterval(() => {
            if (unmountedRef.current) return;
            const age = lastEventMsRef.current > 0
                ? Date.now() - lastEventMsRef.current
                : Infinity;

            if (age > STALE_THRESHOLD_MS) {
                setState(prev => {
                    if (prev.mode === 'LIVE') {
                        return { ...prev, mode: 'RECONNECTING', source: null, bar: null };
                    }
                    return prev;
                });
            }
        }, 1000);

        connect();

        return () => {
            unmountedRef.current = true;
            esRef.current?.close();
            esRef.current = null;
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            if (watchdogRef.current) clearInterval(watchdogRef.current);
        };
    }, []); // Run once on mount

    return state;
}
