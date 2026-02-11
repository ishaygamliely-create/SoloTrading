'use client';

import React from 'react';
import { IndicatorSignal } from '../lib/types';

type Props = {
    data: any;
    loading: boolean;
};

export function SMTPanel({ data, loading }: Props) {
    if (loading || !data?.analysis?.smt) {
        return <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-xl h-full min-h-[100px]"></div>;
    }

    const smt = data.analysis.smt as IndicatorSignal;

    // Line 1: SMT: {direction} ({score}) {status}
    // Line 2: {hint}

    const statusColor =
        smt.status === 'OK' ? 'text-zinc-400' :
            smt.status === 'WARN' ? 'text-yellow-500' :
                smt.status === 'OFF' ? 'text-zinc-600' : 'text-red-500';

    const dirColor =
        smt.direction === 'LONG' ? 'text-green-400' :
            smt.direction === 'SHORT' ? 'text-red-400' : 'text-zinc-500';

    const isActive = smt.score >= 50;

    return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 h-full flex flex-col justify-center">
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-400 uppercase">SMT</span>
                    <span className={`text-[10px] font-bold ${dirColor} border border-white/5 px-1.5 py-px rounded`}>
                        {smt.direction}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-[10px] ${statusColor}`}>{smt.status}</span>
                    <span className={`text-xs font-mono font-bold ${isActive ? 'text-white' : 'text-zinc-600'}`}>
                        {smt.score}
                    </span>
                </div>
            </div>

            <div className="text-[10px] text-zinc-500 leading-tight">
                {smt.debug?.factors && smt.debug.factors.length > 0 ? (
                    <span className={isActive ? 'text-zinc-300' : 'text-zinc-500'}>
                        {smt.debug.factors[0]}
                    </span>
                ) : (
                    <span>{smt.hint}</span>
                )}
            </div>
        </div>
    );
}
