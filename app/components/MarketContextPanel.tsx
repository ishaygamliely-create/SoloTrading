'use client';

import React from 'react';
import { Box, BarChart2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { PanelProps } from './DashboardPanels';

export function MarketContextPanel({ data, loading }: PanelProps) {
    if (loading || !data?.analysis?.pdRanges) return <div className="animate-pulse bg-zinc-900 h-48 rounded-xl border border-zinc-800"></div>;

    const { dailyHigh, dailyLow, dailyEq, position, premiumLevel } = data.analysis.pdRanges;
    const currentPrice = data.quotes[data.quotes.length - 1].close;

    // Calculate percent in range
    const range = dailyHigh - dailyLow;
    const pct = range > 0 ? ((currentPrice - dailyLow) / range) * 100 : 50;
    const clampedPct = Math.min(100, Math.max(0, pct));

    const isPremium = position === 'PREMIUM';

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden h-full flex flex-col min-h-[150px]">
            {/* Header */}
            <div className="bg-zinc-900/50 border-b border-zinc-800 p-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Box size={14} className={isPremium ? "text-red-400" : "text-green-400"} />
                    <h3 className="text-zinc-200 font-bold text-sm">Market Context</h3>
                </div>
                <div className={`px-2 py-0.5 rounded text-[10px] font-bold border ${isPremium
                    ? 'bg-red-900/20 text-red-300 border-red-900/50'
                    : 'bg-green-900/20 text-green-300 border-green-900/50'}`}>
                    {position}
                </div>
            </div>

            <div className="p-4 flex-1 flex flex-col gap-4">

                {/* Range Bar Visual */}
                <div className="relative h-24 border border-zinc-800 rounded bg-zinc-950/50 flex flex-col justify-between p-1">
                    {/* Zones BG */}
                    <div className="absolute inset-0 flex flex-col opacity-10 pointer-events-none">
                        <div className="flex-1 bg-red-500"></div>
                        <div className="h-[1px] bg-zinc-500 w-full dotted"></div>
                        <div className="flex-1 bg-green-500"></div>
                    </div>

                    {/* Price Marker */}
                    <div className="absolute w-full border-t border-zinc-400 border-dashed transition-all duration-500 z-10" style={{ bottom: `${clampedPct}%` }}>
                        <span className="absolute right-0 -top-2.5 text-[9px] bg-zinc-800 px-1 text-white rounded font-mono">
                            {currentPrice.toFixed(2)}
                        </span>
                    </div>

                    <div className="flex justify-between items-start z-0 relative">
                        <span className="text-[9px] text-red-500 font-mono">PDH {dailyHigh.toFixed(2)}</span>
                    </div>

                    <div className="w-full flex justify-center z-0 relative">
                        <span className="text-[9px] text-zinc-500 bg-zinc-900/80 px-1 rounded font-mono">EQ {dailyEq.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between items-end z-0 relative">
                        <span className="text-[9px] text-green-500 font-mono">PDL {dailyLow.toFixed(2)}</span>
                    </div>
                </div>

                {/* Stat Grid */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-zinc-950/50 rounded border border-zinc-800/50 text-center">
                        <div className="text-[9px] text-zinc-500 uppercase">Current</div>
                        <div className="text-sm font-bold text-zinc-300">{clampedPct.toFixed(1)}%</div>
                        <div className="text-[9px] text-zinc-600">of Daily Range</div>
                    </div>

                    {/* Market Regime Badge */}
                    <div className="p-2 bg-zinc-950/50 rounded border border-zinc-800/50 text-center flex flex-col justify-center">
                        <div className="text-[9px] text-zinc-500 uppercase">Est. Regime</div>
                        {data.analysis?.regime ? (
                            <>
                                <div className={`text-sm font-bold ${data.analysis.regime.state === 'CHOPPY' ? 'text-red-400' :
                                        data.analysis.regime.state === 'TRENDING' ? 'text-emerald-400' :
                                            data.analysis.regime.state === 'EXPANSION' ? 'text-blue-400' :
                                                'text-amber-400'
                                    }`}>
                                    {data.analysis.regime.state}
                                </div>
                                <div className="text-[9px] text-zinc-600 truncate max-w-full px-1" title={data.analysis.regime.reason}>
                                    {data.analysis.regime.reason}
                                </div>
                            </>
                        ) : (
                            <div className="text-xs text-zinc-600">Calculating...</div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
