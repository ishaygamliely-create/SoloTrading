'use client';

import React, { useEffect, useState } from 'react';
import type { LiveMode, LiveSource } from '../hooks/useLivePrice';

// ─── Props ────────────────────────────────────────────────────────────────────

interface DataSourceBadgeProps {
    /** Mode from useLivePrice hook — required for SSE-driven badge */
    mode?: LiveMode;
    /** Source identifier from the SSE stream */
    source?: LiveSource;
    /** Last tick HH:MM:SS from the SSE stream */
    lastTickTimeNy?: string | null;

    // ── Candle badge (chart overlay) — separate from the live price badge ──
    feedSource?: string;       // 'TASTYTRADE' | 'YAHOO' | etc.
    stalenessMs?: number;
    lastBarTimeNy?: string;

    className?: string;
}

// ─── Display Configs ──────────────────────────────────────────────────────────

interface ModeConfig {
    label: string;
    color: string;   // Tailwind classes for border + text + bg
    dot: string;     // Tailwind classes for the dot
    animate: boolean;
}

const MODE_CONFIGS: Record<string, ModeConfig> = {
    CONNECTING: {
        label: 'Connecting…',
        color: 'text-zinc-400 border-zinc-700 bg-zinc-800',
        dot: 'bg-zinc-500',
        animate: true,
    },
    LIVE: {
        label: 'LIVE STREAM · Tastytrade',
        color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
        dot: 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]',
        animate: true,
    },
    RECONNECTING: {
        label: 'RECONNECTING…',
        color: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
        dot: 'bg-amber-400',
        animate: true,
    },
    FALLBACK_TT_CANDLE: {
        label: 'Tastytrade 1m (candle)',
        color: 'text-amber-300 border-amber-500/20 bg-amber-500/10',
        dot: 'bg-amber-300',
        animate: false,
    },
    FALLBACK_YAHOO: {
        label: 'Yahoo Finance (delayed)',
        color: 'text-red-400 border-red-500/30 bg-red-500/10',
        dot: 'bg-red-400',
        animate: false,
    },
};

function resolveModeConfig(mode?: LiveMode, source?: LiveSource): ModeConfig {
    if (!mode || mode === 'CONNECTING') return MODE_CONFIGS.CONNECTING;
    if (mode === 'LIVE') return MODE_CONFIGS.LIVE;
    if (mode === 'RECONNECTING') return MODE_CONFIGS.RECONNECTING;
    if (mode === 'FALLBACK') {
        if (source === 'YAHOO') return MODE_CONFIGS.FALLBACK_YAHOO;
        return MODE_CONFIGS.FALLBACK_TT_CANDLE;
    }
    return MODE_CONFIGS.CONNECTING;
}

// ─── Candle badge configs (chart overlay, independent of live price) ──────────
const CANDLE_SOURCE_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
    TASTYTRADE: { label: 'Tastytrade', color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10', dot: 'bg-emerald-400' },
    BROKER: { label: 'Broker', color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10', dot: 'bg-emerald-400' },
    TRADINGVIEW: { label: 'TradingView', color: 'text-sky-400     border-sky-500/20     bg-sky-500/10', dot: 'bg-sky-400' },
    YAHOO: { label: 'Yahoo (delayed ~15m)', color: 'text-amber-400  border-amber-500/20   bg-amber-500/10', dot: 'bg-amber-400' },
};

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * DataSourceBadge
 *
 * Two usage modes:
 *  1. SSE live-price badge (mode + source + lastTickTimeNy)
 *     → Shows LIVE STREAM / RECONNECTING / FALLBACK with live timestamp
 *  2. Chart candle source badge (feedSource + stalenessMs + lastBarTimeNy)
 *     → Shows source name + bar timestamp + STALE if >15s old
 */
export function DataSourceBadge({
    mode, source, lastTickTimeNy,
    feedSource, stalenessMs = 0, lastBarTimeNy,
    className = '',
}: DataSourceBadgeProps) {

    // ── SSE Live Price Badge ──────────────────────────────────────────────────
    if (mode !== undefined) {
        const cfg = resolveModeConfig(mode, source);
        return (
            <div className={`flex items-center gap-1.5 flex-wrap ${className}`}>
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider ${cfg.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot} ${cfg.animate ? 'animate-pulse' : ''}`} />
                    {cfg.label}
                </div>
                {/* Show last tick time — persist during RECONNECTING */}
                {lastTickTimeNy && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg border border-white/5 bg-white/5 text-[10px] font-mono text-zinc-400">
                        <span className="text-zinc-500">
                            {mode === 'RECONNECTING' ? 'Last:' : 'Updated:'}
                        </span>
                        <span>{lastTickTimeNy} NY</span>
                    </div>
                )}
            </div>
        );
    }

    // ── Candle/Chart Source Badge (fallback, used in chart overlay) ─────────
    const STALE_MS = 15_000;
    const [ageMs, setAgeMs] = useState(stalenessMs);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
        setAgeMs(stalenessMs);
        const id = setInterval(() => setAgeMs(prev => prev + 1000), 1000);
        return () => clearInterval(id);
    }, [stalenessMs]);

    const cCfg = CANDLE_SOURCE_CONFIG[feedSource ?? 'YAHOO'] ?? CANDLE_SOURCE_CONFIG.YAHOO;
    const isStale = ageMs > STALE_MS;

    return (
        <div className={`flex items-center gap-1.5 flex-wrap ${className}`}>
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider ${isStale ? 'text-red-400 border-red-500/30 bg-red-500/10' : cCfg.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isStale ? 'bg-red-400' : cCfg.dot}`} />
                {isStale ? `${cCfg.label} · STALE` : `Source: ${cCfg.label}`}
            </div>
            {lastBarTimeNy && lastBarTimeNy !== 'N/A' && (
                <div className="px-2 py-0.5 rounded-lg border border-white/5 bg-white/5 text-[10px] font-mono text-zinc-400">
                    {lastBarTimeNy} NY
                </div>
            )}
            {isStale && (
                <div className="px-2 py-0.5 rounded-lg border border-red-500/30 bg-red-500/10 text-[10px] font-bold text-red-400">
                    ⚠ STALE {Math.floor(ageMs / 1000)}s
                </div>
            )}
        </div>
    );
}
