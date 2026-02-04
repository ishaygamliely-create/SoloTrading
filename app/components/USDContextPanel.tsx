'use client';

import React from 'react';
import { PanelProps } from './DashboardPanels';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, ShieldAlert, Activity, RefreshCw } from 'lucide-react';
import { DXYContext } from '../lib/macro';

export function USDContextPanel({ data, loading }: PanelProps) {
    if (loading) return <div className="animate-pulse bg-zinc-900 h-24 rounded-xl border border-zinc-800"></div>;

    const ctx = data?.analysis?.dxyContext as DXYContext | undefined;

    // --- FAIL-SAFE: NO DATA ---
    if (!ctx || ctx.eventStatus.name === 'Data Unavailable') {
        return (
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center justify-between opacity-80">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                        <Activity className="text-zinc-500" size={16} />
                    </div>
                    <div>
                        <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-wider">USD Context</h3>
                        <span className="text-zinc-500 text-[10px]">Data Unavailable</span>
                    </div>
                </div>
                {ctx?.timestamp && (
                    <span className="text-[9px] font-mono text-zinc-600">
                        {new Date(ctx.timestamp).toLocaleTimeString()}
                    </span>
                )}
            </div>
        );
    }

    // --- MACRO EVENT STATES ---
    const isHardIgnore = ctx.eventStatus.impact === 'HARD_IGNORE';
    const isSoftIgnore = ctx.eventStatus.impact === 'SOFT_IGNORE';

    let borderColor = 'border-zinc-800';
    let labelColor = 'text-zinc-400';
    let valueColor = 'text-zinc-200';
    let icon = <Minus size={16} />;

    // Determine Visual State
    if (ctx.trend === 'BULLISH') {
        borderColor = isHardIgnore ? 'border-zinc-800' : 'border-green-900/50';
        labelColor = 'text-green-500';
        valueColor = 'text-green-400';
        icon = <TrendingUp size={16} />;
    } else if (ctx.trend === 'BEARISH') {
        borderColor = isHardIgnore ? 'border-zinc-800' : 'border-red-900/50';
        labelColor = 'text-red-500';
        valueColor = 'text-red-400';
        icon = <TrendingDown size={16} />;
    }

    // Event Overlay Logic
    const showEventWarning = isHardIgnore || isSoftIgnore;

    return (
        <div className={`bg-zinc-900 border ${borderColor} p-4 rounded-xl relative overflow-hidden group transition-all duration-300`}>

            {/* Header */}
            <div className="flex justify-between items-start mb-2">
                <div className="flex flex-col">
                    <span className="text-zinc-500 text-xs uppercase tracking-wider font-bold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span> USD / DXY
                    </span>
                </div>

                {/* Event Status Badge */}
                {showEventWarning && (
                    <div className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase flex items-center gap-1 ${isHardIgnore ? 'bg-red-950/50 text-red-500 border border-red-900/30' : 'bg-orange-950/50 text-orange-500 border border-orange-900/30'
                        }`}>
                        <ShieldAlert size={10} />
                        {isHardIgnore ? 'DISABLED' : 'REDUCED'}
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="flex justify-between items-end min-h-[50px]">
                <div>
                    {/* Price & Change Row */}
                    <div className="flex items-baseline gap-3 mb-1">
                        <span className={`text-3xl font-black ${valueColor} tabular-nums tracking-tighter`}>
                            {ctx.price ? ctx.price.toFixed(3) : '---'}
                        </span>

                        {/* Change Metrics */}
                        {ctx.change !== 0 && (
                            <div className={`flex items-baseline gap-1 text-xs font-bold font-mono ${ctx.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                <span>{ctx.change >= 0 ? '+' : ''}{ctx.change.toFixed(3)}</span>
                                <span className="opacity-60">({ctx.changePercent.toFixed(2)}%)</span>
                            </div>
                        )}
                    </div>

                    {/* Metrics Row */}
                    <div className="flex items-center gap-4">
                        <div className={`flex items-center gap-1 ${labelColor} text-[10px] font-bold uppercase`}>
                            {icon} {ctx.trend}
                        </div>
                        <div className="w-px h-3 bg-zinc-800"></div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-zinc-500 uppercase font-bold">Mom.</span>
                            <span className={`text-[10px] bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800 ${ctx.momentum === 'RISING' ? 'text-green-400' : ctx.momentum === 'FALLING' ? 'text-red-400' : 'text-zinc-500'}`}>
                                {ctx.momentum}
                            </span>
                        </div>

                        {/* Time Restored */}
                        <div className="w-px h-3 bg-zinc-800"></div>
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                            <RefreshCw size={8} />
                            {new Date(ctx.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                    </div>
                </div>

                <div className="text-right">
                    <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Impact</div>
                    <div className={`text-sm font-bold font-mono ${ctx.confidenceModifier > 0 ? 'text-red-400' : ctx.confidenceModifier < 0 ? 'text-green-400' : 'text-zinc-500'
                        }`}>
                        {ctx.confidenceModifier > 0 ? 'BEARISH NQ' : ctx.confidenceModifier < 0 ? 'BULLISH NQ' : 'NEUTRAL'}
                    </div>
                </div>
            </div>

            {/* Event Name Footer */}
            {ctx.eventStatus.name !== 'No Major Event' && (
                <div className="mt-2 text-[10px] text-center w-full bg-zinc-950/50 py-1 rounded border border-zinc-800 text-zinc-400">
                    Filter: {ctx.eventStatus.name}
                </div>
            )}
        </div>
    );
}
