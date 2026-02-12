import React from 'react';
import { getConfidenceBorderClass } from '@/app/lib/uiSignalStyles';
import { getLiquidityConfidenceScore } from '@/app/lib/liquidityRange';

type Props = {
    data: any;
    loading: boolean;
};

export function LiquidityPanel({ data, loading }: Props) {
    if (loading) {
        return <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-xl h-full min-h-[160px]"></div>;
    }

    if (!data?.analysis) return null;

    const lr = data.analysis.liquidityRange || {};
    const fvgs = data.analysis.fvgs || [];
    const pools = data.analysis.liquidity || []; // "Active Liquidity"
    const psp = data.analysis.psp || {};

    // Calculate ADR %
    const range = lr.currentRange || 0;
    const avg = lr.avgRange || 1;
    const adrPercent = (range / avg) * 100;

    // Get Confidence Score
    const { confidenceScore, factors, mappingText } = getLiquidityConfidenceScore({
        adrPercent,
        hasMajorSweep: lr.hasMajorSweep,
        pspState: psp.state
    });

    const borderClass = getConfidenceBorderClass(confidenceScore);

    // Force consistency: Derive status logic on client to match the data displayed
    let displayStatus = lr.status;
    if (adrPercent <= 70) displayStatus = "COMPRESSED";
    else if (adrPercent >= 100) displayStatus = "EXPANDING";
    else displayStatus = "NORMAL";

    const scoreStatusColor =
        displayStatus === "COMPRESSED"
            ? "text-yellow-400 border-yellow-500/30 bg-yellow-500/10"
            : displayStatus === "EXPANDING"
                ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                : "text-zinc-400 border-zinc-500/30 bg-zinc-500/10";

    return (
        <div className={`rounded-xl bg-zinc-900/60 p-3 h-full flex flex-col gap-2 min-h-[160px] ${borderClass}`}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-zinc-400 uppercase">
                    Liquidity & Range
                </div>
                {displayStatus && (
                    <div className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold ${scoreStatusColor}`}>
                        {displayStatus}
                    </div>
                )}
            </div>

            {/* Range Info */}
            <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="bg-zinc-950/40 p-1.5 rounded border border-zinc-800/50">
                    <span className="text-zinc-500 block mb-0.5">Range / ADR</span>
                    <span className="text-zinc-300 font-mono">
                        {lr.currentRange ? Number(lr.currentRange).toFixed(2) : '-'} / {lr.avgRange ? Number(lr.avgRange).toFixed(2) : '-'}
                    </span>
                </div>
                <div className="bg-zinc-950/40 p-1.5 rounded border border-zinc-800/50">
                    <span className="text-zinc-500 block mb-0.5">Sweep Status</span>
                    <span className={lr.hasMajorSweep ? 'text-green-400 font-bold' : 'text-zinc-500'}>
                        {lr.hasMajorSweep ? "YES" : "NO"}
                    </span>
                </div>
            </div>

            {/* FVG & Pools Section */}
            <div className="flex-1 overflow-hidden flex flex-col gap-1">
                {/* FVGs */}
                <div className="min-h-[1.2rem]">
                    <span className="text-[9px] text-zinc-600 uppercase font-bold mr-2">FVGs:</span>
                    {fvgs.length > 0 ? (
                        <div className="inline-flex gap-1 flex-wrap">
                            {fvgs.slice(0, 2).map((f: any, i: number) => (
                                <span key={i} className={`text-[9px] px-1 rounded border ${f.type === 'BULLISH' ? 'border-green-900 text-green-500' : 'border-red-900 text-red-500'}`}>
                                    {f.bottom?.toFixed(0)}-{f.top?.toFixed(0)}
                                </span>
                            ))}
                        </div>
                    ) : <span className="text-[9px] text-zinc-700 italic">None</span>}
                </div>

                {/* Pools */}
                <div className="min-h-[1.2rem]">
                    <span className="text-[9px] text-zinc-600 uppercase font-bold mr-2">Pools:</span>
                    {pools.length > 0 ? (
                        <div className="inline-flex gap-1 flex-wrap">
                            {pools.slice(0, 3).map((p: any, i: number) => (
                                <span key={i} className={`text-[9px] px-1 rounded border ${p.type === 'EQH' ? 'border-red-900 text-red-400' : 'border-green-900 text-green-400'}`}>
                                    {p.price?.toFixed(0)}
                                </span>
                            ))}
                        </div>
                    ) : <span className="text-[9px] text-zinc-700 italic">Clean</span>}
                </div>
            </div>

            {lr.hint && (
                <div className="text-[9px] text-zinc-500 leading-tight border-t border-zinc-800/50 pt-1 mt-auto">
                    {lr.hint}
                    <div className="text-[8px] text-zinc-600 mt-0.5 font-mono">
                        {mappingText} &rarr; {confidenceScore}%
                    </div>
                </div>
            )}
        </div>
    );
}
