
'use client';

import React from 'react';
import { PanelProps } from './DashboardPanels';
import { Crosshair, Star, Info, Layers } from 'lucide-react';

export function PSPPanel({ data, loading }: PanelProps) {
    if (loading || !data?.analysis?.psps) return <div className="animate-pulse bg-zinc-900 h-48 rounded-xl border border-zinc-800"></div>;

    const psps = data.analysis.psps;

    // Normal Render Logic
    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden h-full flex flex-col min-h-[150px]">

            <div className="bg-indigo-950/20 border-b border-indigo-500/20 p-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Crosshair size={14} className="text-indigo-400" />
                    <h3 className="text-indigo-100 font-bold text-sm">PSP Scanner</h3>
                </div>
                {psps.length > 0 && (
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">
                        {psps.length} Active
                    </span>
                )}
            </div>

            {psps.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center opacity-60">
                    <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center mb-2">
                        <Crosshair className="text-zinc-500" size={16} />
                    </div>
                    <span className="text-xs text-zinc-500 font-medium">No High-Confluence Points</span>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[300px] hide-scrollbar">
                    {psps.map((psp: any, i: number) => {
                        const isHigh = psp.type === 'HIGH';
                        const score = psp.score || 0;
                        const isMax = score >= 4;

                        return (
                            <div key={i} className={`p-3 rounded-lg border flex flex-col gap-2 ${isMax ? 'bg-indigo-950/20 border-indigo-500/30' : 'bg-zinc-950/30 border-zinc-800'
                                }`}>
                                {/* Header */}
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-black uppercase ${isHigh ? 'text-red-400' : 'text-green-400'}`}>
                                            {isHigh ? 'Swing High' : 'Swing Low'}
                                        </span>
                                        <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                                            <Layers size={10} /> {psp.tf}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {[...Array(score)].map((_, idx) => (
                                            <Star key={idx} size={8} className="fill-indigo-400 text-indigo-400" />
                                        ))}
                                    </div>
                                </div>

                                {/* Price */}
                                <div className="font-mono font-bold text-lg text-zinc-200 tracking-tight">
                                    {psp.price.toFixed(2)}
                                </div>

                                {/* Factors */}
                                <div className="flex flex-wrap gap-1">
                                    {psp.confluenceFactors.map((factor: string, idx: number) => (
                                        <span key={idx} className="text-[9px] font-bold text-zinc-400 bg-zinc-800/50 border border-zinc-700/50 px-1.5 py-0.5 rounded">
                                            {factor.replace('_', ' ')}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// Old return block removed to avoid duplication
/*
    if (psps.length === 0) { ... }
    return ( ... )
*/
