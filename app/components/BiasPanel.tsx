'use client';
import React from 'react';
import type { IndicatorSignal } from '../lib/types';

interface BiasPanelProps {
    data: any;
    loading: boolean;
}

export function BiasPanel({ data, loading }: BiasPanelProps) {
    if (loading || !data?.analysis?.bias) {
        return <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-xl h-24"></div>;
    }

    const bias = data.analysis.bias as IndicatorSignal;
    const midnightOpen = data.analysis.midnightOpen;
    // Buffer is hardcoded in logic as 1.0, we can display it if we had it in debug, 
    // or just say "Buffer" or "±1.0"
    const buffer = 1.0;

    const isActive = bias.score >= 50;

    // Line 1: BIAS: {direction} ({score}) {status}
    // Line 2: Midnight {midnightOpen} ± {buffer} | hint

    const statusColor =
        bias.status === 'OK' ? 'text-zinc-400' :
            bias.status === 'WARN' ? 'text-yellow-500' :
                bias.status === 'OFF' ? 'text-zinc-600' : 'text-red-500';

    const dirColor =
        bias.direction === 'LONG' ? 'text-green-400' :
            bias.direction === 'SHORT' ? 'text-red-400' : 'text-zinc-500';

    return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 h-full flex flex-col justify-center">
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-400 uppercase">BIAS</span>
                    <span className={`text-[10px] font-bold ${dirColor} border border-white/5 px-1.5 py-px rounded`}>
                        {bias.direction}
                    </span>
                    <span className={`text-[10px] ${statusColor} ml-1`}>{bias.status}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-xs font-mono font-bold ${isActive ? 'text-white' : 'text-zinc-600'}`}>
                        {bias.score}
                    </span>
                </div>
            </div>

            <div className="text-[10px] text-zinc-500 leading-tight">
                <span className="text-zinc-400 mr-2">Midnight {midnightOpen?.toFixed(2) ?? '---'} ± {buffer}</span>
                <span className="text-zinc-600">|</span>
                <span className="ml-2 text-zinc-500">{bias.hint}</span>
            </div>
        </div>
    );
}
