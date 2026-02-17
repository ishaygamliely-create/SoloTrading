import React from 'react';
import { IndicatorSignal } from '../lib/types';
import { getConfidenceColorClass } from '@/app/lib/uiSignalStyles';
import { PanelHelp } from './PanelHelp';

type Props = {
    data: any;
    loading: boolean;
};

export function SMTPanel({ data, loading }: Props) {
    if (loading) return <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-xl h-24"></div>;

    const smt = data?.analysis?.smt as IndicatorSignal;
    if (!smt || smt.status === 'OFF') return null;

    // --- Standard Colors ---
    const scoreStyle = getConfidenceColorClass(smt.score);
    const directionClass = smt.direction === 'LONG'
        ? "text-emerald-400"
        : smt.direction === 'SHORT'
            ? "text-red-400"
            : "text-zinc-500";
    const statusColor = smt.status === 'OK' ? 'text-emerald-400' : smt.status === 'WARN' ? 'text-yellow-400' : 'text-zinc-500';

    // Debug Data
    const { isStrong, gate, factors } = (smt.debug || {}) as any;

    return (
        <div className={`rounded-xl border border-white/10 bg-white/5 p-4 space-y-3 ${scoreStyle.border}`}>
            {/* 1. Header: TITLE | Direction | Status | Score */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-fuchsia-400 tracking-wide">SMT</span>
                    <div className="h-4 w-px bg-white/10" />
                    <span className={`text-xs font-bold uppercase ${directionClass}`}>
                        {smt.direction}
                    </span>
                    <div className="h-4 w-px bg-white/10" />
                    <span className={`text-xs font-bold uppercase ${statusColor}`}>
                        {smt.status}
                    </span>
                </div>
                <div className={`text-xl font-bold ${scoreStyle.text}`}>
                    {Math.round(smt.score)}%
                </div>
            </div>

            {/* 2. Hint / Factor */}
            <div className="text-xs text-white/70 italic">
                {factors && factors.length > 0 ? factors[0] : smt.hint}
            </div>

            {/* 3. Strong / Gate UI */}
            {isStrong && (
                <div className="flex flex-col gap-2 p-2 rounded bg-white/5 border border-white/5">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-white bg-blue-600 px-1.5 py-0.5 rounded-sm">STRONG EVENT</span>
                        {gate?.isActive && (
                            <span className="text-[10px] text-amber-500 font-mono">
                                TTL: {gate.remainingMin}m
                            </span>
                        )}
                    </div>
                    {gate?.isActive && (
                        <div className="text-[10px] text-red-300 font-bold">
                            ⛔ Blocks {gate.blocksDirection}S
                        </div>
                    )}
                </div>
            )}

            {/* 4. Delayed Feed Warning */}
            <div className="text-[9px] text-zinc-600 italic border-t border-white/5 pt-1 mt-1">
                Feed is delayed. Signals may be late.
            </div>

            {/* 5. Help Toggle */}
            <div className="pt-2 border-t border-white/5">
                <PanelHelp title="SMT" bullets={[
                    "Compares NQ with ES/YM/RTY.",
                    "Divergence = Possible Reversal.",
                    "Strong Event: Multi-market divergence.",
                    "Gate: Blocks trades against trend."
                ]} />
            </div>
        </div>
    );
}
