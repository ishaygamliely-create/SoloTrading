'use client';

import React from 'react';
import { Clock, Moon, Sun, Sunrise } from 'lucide-react';
import { PanelProps } from './DashboardPanels';

export function TimeAlignmentPanel({ data, loading }: PanelProps) {
    if (loading || !data?.analysis?.timeContext) return <div className="animate-pulse bg-zinc-900 h-48 rounded-xl border border-zinc-800"></div>;

    const { nyTimeStr, isLondonKZ, isNYKZ, midnightOpen, londonOpen, nyOpen } = data.analysis.timeContext;
    const currentPrice = data.quotes[data.quotes.length - 1].close;

    const OpenLevel = ({ label, price, icon: Icon }: { label: string, price: number | null, icon: any }) => (
        <div className="flex justify-between items-center p-2 bg-zinc-950/30 rounded border border-zinc-800/50">
            <div className="flex items-center gap-2">
                <Icon size={12} className="text-zinc-500" />
                <span className="text-[10px] text-zinc-400 font-bold uppercase">{label}</span>
            </div>
            {price ? (
                <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono ${currentPrice > price ? 'text-green-400' : 'text-red-400'}`}>
                        {currentPrice > price ? 'ABOVE' : 'BELOW'}
                    </span>
                    <span className="text-xs font-mono text-zinc-300">{price.toFixed(2)}</span>
                </div>
            ) : (
                <span className="text-[10px] text-zinc-600">WAITING</span>
            )}
        </div>
    );

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden h-full flex flex-col min-h-[150px]">
            {/* Header */}
            <div className="bg-zinc-900/50 border-b border-zinc-800 p-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Clock size={14} className="text-purple-400" />
                    <h3 className="text-zinc-200 font-bold text-sm">Time & Alignment</h3>
                </div>
                <span className="text-xs font-mono text-zinc-400 bg-zinc-800 px-1.5 rounded">{nyTimeStr} NY</span>
            </div>

            {/* Kill Zones */}
            <div className="p-3 space-y-2 border-b border-zinc-800/50">
                <div className={`p-2 rounded border flex justify-between items-center transition-colors ${isLondonKZ ? 'bg-purple-900/20 border-purple-500/50' : 'bg-zinc-950/30 border-zinc-800/50'}`}>
                    <div className="flex items-center gap-2">
                        <Moon size={12} className={isLondonKZ ? 'text-purple-300' : 'text-zinc-600'} />
                        <span className={`text-xs font-bold ${isLondonKZ ? 'text-purple-200' : 'text-zinc-500'}`}>London KZ</span>
                    </div>
                    {isLondonKZ && <span className="text-[9px] bg-purple-500 text-white px-1 rounded animate-pulse">ACTIVE</span>}
                    <span className="text-[9px] text-zinc-600 font-mono">02:00-05:00</span>
                </div>

                <div className={`p-2 rounded border flex justify-between items-center transition-colors ${isNYKZ ? 'bg-blue-900/20 border-blue-500/50' : 'bg-zinc-950/30 border-zinc-800/50'}`}>
                    <div className="flex items-center gap-2">
                        <Sun size={12} className={isNYKZ ? 'text-blue-300' : 'text-zinc-600'} />
                        <span className={`text-xs font-bold ${isNYKZ ? 'text-blue-200' : 'text-zinc-500'}`}>New York KZ</span>
                    </div>
                    {isNYKZ && <span className="text-[9px] bg-blue-500 text-white px-1 rounded animate-pulse">ACTIVE</span>}
                    <span className="text-[9px] text-zinc-600 font-mono">07:00-10:00</span>
                </div>
            </div>

            {/* Key Opens */}
            <div className="p-3 space-y-1.5 flex-1 bg-zinc-900/30">
                <span className="text-[10px] font-bold text-zinc-500 uppercase px-1">Key Opens</span>
                <OpenLevel label="Midnight" price={midnightOpen} icon={Moon} />
                <OpenLevel label="London Open" price={londonOpen} icon={Sunrise} />
                <OpenLevel label="NY Open" price={nyOpen} icon={Sun} />
            </div>
        </div>
    );
}
