'use client';
import React from 'react';
import type { IndicatorSignal } from '../lib/types';

interface StructurePanelProps {
    data: any;
    loading: boolean;
}

export function StructurePanel({ data, loading }: StructurePanelProps) {
    if (loading || !data?.analysis?.structure) {
        return <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-xl h-24"></div>;
    }

    const structure = data.analysis.structure as IndicatorSignal;
    const debug = structure.debug || {};
    const { label, adx, ema20, ema50 } = debug as any;

    const isActive = structure.score >= 50;

    // Line 1: STRUCTURE: {label} {direction} ({score}) {status}
    // Line 2: ADX {adx} | EMA20 {ema20} / EMA50 {ema50} | {hint}

    const statusColor =
        structure.status === 'OK' ? 'text-zinc-400' :
            structure.status === 'WARN' ? 'text-yellow-500' :
                structure.status === 'OFF' ? 'text-zinc-600' : 'text-red-500';

    const dirColor =
        structure.direction === 'LONG' ? 'text-green-400' :
            structure.direction === 'SHORT' ? 'text-red-400' : 'text-zinc-500';

    return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 h-full flex flex-col justify-center">
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-400 uppercase">STRUCTURE</span>
                    <div className="flex items-center gap-1 border border-white/5 px-1.5 py-px rounded">
                        <span className="text-[10px] font-bold text-zinc-300">{label}</span>
                        <span className={`text-[10px] font-bold ${dirColor}`}>
                            {structure.direction}
                        </span>
                    </div>

                    {structure.status !== 'OK' && (
                        <span className={`text-[10px] ${statusColor} ml-1`}>{structure.status}</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-xs font-mono font-bold ${isActive ? 'text-white' : 'text-zinc-600'}`}>
                        {structure.score}
                    </span>
                </div>
            </div>

            <div className="text-[10px] text-zinc-500 leading-tight truncate">
                <span className="text-zinc-400">ADX {adx}</span>
                <span className="mx-2 text-zinc-700">|</span>
                <span className="text-zinc-500">{structure.hint}</span>
            </div>
            {/* Optional debug for EMA relation if useful, or keep concise */}
            <div className="text-[9px] text-zinc-600 mt-1 hidden md:block">
                EMA20 {Number(ema20)?.toFixed(1)} / EMA50 {Number(ema50)?.toFixed(1)}
            </div>
        </div>
    );
}
