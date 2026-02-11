'use client';
import React from 'react';
import type { IndicatorSignal } from '../lib/types';

interface ValueZonePanelProps {
    data: any;
    loading: boolean;
}

export function ValueZonePanel({ data, loading }: ValueZonePanelProps) {
    if (loading || !data?.analysis?.valueZone) {
        return <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-xl h-24"></div>;
    }

    const valueZone = data.analysis.valueZone as IndicatorSignal;
    const debug = valueZone.debug || {};
    const { pdh, pdl, eq, percentInRange, label } = debug as any;

    const isActive = valueZone.score >= 50;

    // Line 1: VALUE: {label} {direction} ({score}) {status}
    // Line 2: PDH | EQ | PDL + percentInRange + hint

    const statusColor =
        valueZone.status === 'OK' ? 'text-zinc-400' :
            valueZone.status === 'WARN' ? 'text-yellow-500' :
                valueZone.status === 'OFF' ? 'text-zinc-600' : 'text-red-500';

    const dirColor =
        valueZone.direction === 'LONG' ? 'text-green-400' :
            valueZone.direction === 'SHORT' ? 'text-red-400' : 'text-zinc-500';

    return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 h-full flex flex-col justify-center">
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-400 uppercase">VALUE</span>
                    <span className={`text-[10px] font-bold ${dirColor} border border-white/5 px-1.5 py-px rounded`}>
                        {label || valueZone.direction}
                    </span>
                    {valueZone.status !== 'OK' && (
                        <span className={`text-[10px] ${statusColor} ml-1`}>{valueZone.status}</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-xs font-mono font-bold ${isActive ? 'text-white' : 'text-zinc-600'}`}>
                        {valueZone.score}
                    </span>
                </div>
            </div>

            <div className="text-[10px] text-zinc-500 leading-tight truncate">
                <span className="text-zinc-400">{percentInRange}% in Range</span>
                <span className="mx-2 text-zinc-700">|</span>
                <span className="text-zinc-500">{valueZone.hint}</span>
            </div>
            {/* Optional detailed debug line if space permits */}
            <div className="text-[9px] text-zinc-600 mt-1 hidden md:block">
                PDH {pdh?.toFixed(2)} | EQ {eq?.toFixed(2)} | PDL {pdl?.toFixed(2)}
            </div>
        </div>
    );
}
