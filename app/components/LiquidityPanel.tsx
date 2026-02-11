'use client';

import React from 'react';

type Props = {
    data: any;
    loading: boolean;
};

export function LiquidityPanel({ data, loading }: Props) {
    if (loading || !data?.analysis?.liquidityRange) {
        return <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-xl h-full min-h-[160px]"></div>;
    }

    const lr = data.analysis.liquidityRange;

    const statusColor =
        lr.status === "COMPRESSED"
            ? "text-yellow-400 border-yellow-500/30 bg-yellow-500/10"
            : lr.status === "EXPANDING"
                ? "text-green-400 border-green-500/30 bg-green-500/10"
                : "text-red-400 border-red-500/30 bg-red-500/10";

    return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 h-full flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-bold text-zinc-400 uppercase">
                    Liquidity & Range
                </div>

                <div className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold ${statusColor}`}>
                    {lr.status}
                </div>
            </div>

            <div className="space-y-1 flex-1 flex flex-col justify-center">
                <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-500">Current Range</span>
                    <span className="text-zinc-200 font-bold">{Number(lr.currentRange).toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-500">Avg Range (ADR)</span>
                    <span className="text-zinc-200">{Number(lr.avgRange).toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between text-xs font-mono mt-1">
                    <span className="text-zinc-500">{lr.adrPercent}% of ADR</span>
                    <span className="text-zinc-200">Exp. Likelihood <span className={lr.expansionLikelihood > 70 ? 'text-green-400' : 'text-zinc-400'}>{lr.expansionLikelihood}%</span></span>
                </div>
            </div>

            <div className="mt-3 rounded border border-zinc-800 bg-zinc-950/40 p-2 text-[10px] text-zinc-300 font-medium leading-relaxed">
                <span className={lr.hasMajorSweep ? 'text-green-400 font-bold' : 'text-zinc-500 font-bold'}>
                    {lr.hasMajorSweep ? "Sweep: YES. " : "Sweep: None. "}
                </span>
                {lr.hint}
            </div>
        </div>
    );
}
