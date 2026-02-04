'use client';

import React from 'react';
import { Droplets, Waves, TrendingUp, Minimize2, Maximize2 } from 'lucide-react';
import { PanelProps } from './DashboardPanels';

export function LiquidityPanel({ data, loading }: PanelProps) {
    if (loading || !data?.analysis?.sweeps) return <div className="animate-pulse bg-zinc-900 h-64 rounded-xl border border-zinc-800"></div>;

    const sweeps = data.analysis.sweeps;
    const tre = data.analysis.tre || { state: 'NORMAL', ratio: 1, currentRange: 0 };

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden h-full flex flex-col min-h-[250px]">
            {/* Header */}
            <div className="bg-zinc-900/50 border-b border-zinc-800 p-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Droplets size={14} className="text-cyan-400" />
                    <h3 className="text-zinc-200 font-bold text-sm">Liquidity & Range</h3>
                </div>
            </div>

            <div className="p-3 space-y-4 flex-1 overflow-y-auto hide-scrollbar">

                {/* 1. Sweeps Section */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-400 uppercase flex items-center gap-1">
                            <Waves size={10} /> Active Sweeps
                        </span>
                        <span className="text-[10px] text-zinc-600 font-mono">PDH/PDL</span>
                    </div>

                    {sweeps.length === 0 ? (
                        <div className="p-3 rounded border border-zinc-800/50 bg-zinc-950/30 text-center">
                            <span className="text-[10px] text-zinc-600">No Major Sweeps Detected</span>
                        </div>
                    ) : (
                        sweeps.map((s: any, i: number) => (
                            <div key={i} className="p-2 rounded border border-cyan-900/30 bg-cyan-950/10 flex justify-between items-center">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-cyan-300">{s.level} SWEEP</span>
                                    <span className="text-[9px] text-zinc-500 font-mono">{new Date(s.time * 1000).toLocaleTimeString()}</span>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    <span className="font-mono text-xs text-zinc-200">{s.price.toFixed(2)}</span>
                                    {s.reclaimed ? (
                                        <span className="text-[9px] bg-green-900/30 text-green-400 px-1 rounded">RECLAIMED</span>
                                    ) : (
                                        <span className="text-[9px] bg-yellow-900/30 text-yellow-400 px-1 rounded">PENDING</span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* 2. TRE Section */}
                <div className="pt-2 border-t border-zinc-800/50 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-400 uppercase flex items-center gap-1">
                            <TrendingUp size={10} /> True Range Exp
                        </span>
                    </div>

                    <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-950/50 flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] text-zinc-500">Status</span>
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${tre.state === 'EXPANDED' ? 'bg-orange-900/20 text-orange-400 border-orange-900/50' :
                                    tre.state === 'COMPRESSED' ? 'bg-blue-900/20 text-blue-400 border-blue-900/50' :
                                        'bg-zinc-800 text-zinc-300 border-zinc-700'
                                }`}>
                                {tre.state}
                            </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-[9px] text-zinc-500">
                                <span>Range: {tre.currentRange.toFixed(2)}</span>
                                <span>Avg: {tre.averageRange.toFixed(2)}</span>
                            </div>
                            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${tre.state === 'EXPANDED' ? 'bg-orange-500' :
                                            tre.state === 'COMPRESSED' ? 'bg-blue-500' : 'bg-zinc-500'
                                        }`}
                                    style={{ width: `${Math.min(100, (tre.ratio * 50))}%` }}
                                ></div>
                            </div>
                            <div className="text-right text-[9px] text-zinc-600">
                                {(tre.ratio * 100).toFixed(0)}% of ADR
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
