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

    // Force consistency: Derive status logic on client
    let displayStatus = lr.status;
    if (adrPercent <= 70) displayStatus = "COMPRESSED";
    else if (adrPercent >= 100) displayStatus = "EXPANDING";
    else displayStatus = "NORMAL";

    const getStatusBadge = () => {
        switch (displayStatus) {
            case "COMPRESSED": return "bg-yellow-500/20 text-yellow-300";
            case "EXPANDING": return "bg-emerald-500/20 text-emerald-300";
            case "EXHAUSTED": return "bg-red-500/20 text-red-300";
            default: return "bg-white/10 text-white";
        }
    };

    return (
        <div className={`rounded-xl border border-white/10 bg-white/5 p-5 space-y-4 ${borderClass}`}>
            {/* HEADER */}
            <div className="flex items-center justify-between">
                <div className="font-bold tracking-widest text-lg bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                    LIQUIDITY & RANGE
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge()}`}>
                    {displayStatus}
                </span>
            </div>

            {/* RANGE INFO */}
            <div className="text-sm text-white/70 space-y-1">
                <div className="flex justify-between">
                    <span>Range:</span>
                    <span>
                        <span className="text-white font-medium">{lr.currentRange ? Number(lr.currentRange).toFixed(2) : '0.00'}</span>
                        <span className="text-white/50 mx-1">/</span>
                        <span className="text-white/70">{lr.avgRange ? Number(lr.avgRange).toFixed(2) : '0.00'} ADR</span>
                    </span>
                </div>
                <div className="flex justify-between">
                    <span>ADR Usage:</span>
                    <span className="text-white font-medium">{adrPercent.toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                    <span>Sweep Detected:</span>
                    <span className={lr.hasMajorSweep ? "text-emerald-400 font-bold" : "text-white/50"}>
                        {lr.hasMajorSweep ? "YES" : "NO"}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span>PSP State:</span>
                    <span className={psp.state === "CONFIRMED" ? "text-emerald-400 font-bold" : "text-white/50"}>
                        {psp.state || "NONE"}
                    </span>
                </div>
            </div>

            {/* MARKET CONDITION */}
            {lr.hint && (
                <div className="bg-black/30 rounded-lg p-3 text-sm">
                    <div className="text-white/60 mb-1 text-xs uppercase tracking-wider font-bold">Market Condition</div>
                    <div className="text-white leading-tight">{lr.hint}</div>
                    <div className="mt-2 pt-2 border-t border-white/10 text-[10px] text-zinc-500 font-mono">
                        {mappingText} &rarr; {confidenceScore}%
                    </div>
                </div>
            )}

            {/* LIQUIDITY ZONES */}
            <div className="space-y-3 pt-2">
                {fvgs.length > 0 && (
                    <div>
                        <div className="text-[10px] text-white/50 mb-1 uppercase tracking-wide">Recent FVGs</div>
                        <div className="flex flex-wrap gap-2">
                            {fvgs.slice(0, 3).map((f: any, i: number) => (
                                <span key={i} className={`px-2 py-1 rounded text-[10px] border ${f.type === 'BULLISH' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-red-500/10 text-red-300 border-red-500/20'}`}>
                                    {f.bottom?.toFixed(0)}-{f.top?.toFixed(0)}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {pools.length > 0 && (
                    <div>
                        <div className="text-[10px] text-white/50 mb-1 uppercase tracking-wide">Liquidity Pools</div>
                        <div className="flex flex-wrap gap-2">
                            {pools.slice(0, 4).map((p: any, i: number) => (
                                <span key={i} className={`px-2 py-1 rounded text-[10px] border ${p.type === 'EQH' ? 'bg-red-500/10 text-red-300 border-red-500/20' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'}`}>
                                    {p.price?.toFixed(0)}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
