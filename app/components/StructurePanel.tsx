'use client';

import React, { useState } from 'react';
import { Layers, ArrowUp, ArrowDown, Filter, ShieldCheck, ShieldAlert } from 'lucide-react';
import { PanelProps } from './DashboardPanels';

export function StructurePanel({ data, loading }: PanelProps) {
    const [tfFilter, setTfFilter] = useState<string>('ALL'); // ALL, M15, H1, H4
    const [typeFilter, setTypeFilter] = useState<string>('ALL'); // ALL, OB, BREAKER

    if (loading || !data?.analysis?.ictStructure) return <div className="animate-pulse bg-zinc-900 h-64 rounded-xl border border-zinc-800"></div>;

    const blocks = data.analysis.ictStructure;
    const currentPrice = data.quotes[data.quotes.length - 1].close;

    // Filtering
    const filteredBlocks = blocks.filter((b: any) => {
        if (tfFilter !== 'ALL' && b.tf !== tfFilter) return false;
        if (typeFilter !== 'ALL' && (typeFilter === 'OB' ? b.type !== 'ORDER_BLOCK' : b.type !== 'BREAKER')) return false;
        return true;
    }).sort((a: any, b: any) => {
        // Sort by proximity to current price
        return Math.abs(currentPrice - a.price) - Math.abs(currentPrice - b.price);
    });

    const BlockItem = ({ block }: { block: any }) => {
        const isBullish = block.sentiment === 'BULLISH';
        const isOB = block.type === 'ORDER_BLOCK';
        const dist = Math.abs(currentPrice - block.price);
        const distPct = (dist / currentPrice) * 100;

        return (
            <div className={`p-3 rounded-lg border flex flex-col gap-2 ${isBullish ? 'bg-green-950/10 border-green-900/30' : 'bg-red-950/10 border-red-900/30'
                }`}>
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                        <span className={`p-1 rounded text-[10px] font-bold ${isBullish ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                            {block.tf}
                        </span>
                        <span className="text-xs font-bold text-zinc-300">
                            {isOB ? 'Order Block' : 'Breaker'}
                        </span>
                        <span className="text-[10px] text-zinc-500 uppercase flex items-center gap-1">
                            {isBullish ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                            {block.sentiment}
                        </span>
                    </div>
                    {/* Status Badge */}
                    <div className="flex items-center gap-1">
                        {distPct < 0.2 && <span className="text-[9px] bg-yellow-500/20 text-yellow-300 px-1 rounded animate-pulse">TESTING</span>}
                    </div>
                </div>

                <div className="flex justify-between items-end">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-zinc-500">Zone</span>
                        <span className="font-mono text-sm text-zinc-200">
                            {block.zone.min.toFixed(2)} - {block.zone.max.toFixed(2)}
                        </span>
                    </div>
                    <div className="text-[10px] text-zinc-600 font-mono">
                        d: {dist.toFixed(2)}
                    </div>
                </div>

                {/* Factors */}
                <div className="flex flex-wrap gap-1 mt-1">
                    {block.factors.map((f: string, i: number) => (
                        <span key={i} className="text-[9px] text-zinc-500 bg-zinc-900 px-1 rounded border border-zinc-800">
                            {f.replace('_', ' ')}
                        </span>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden h-full flex flex-col min-h-[300px]">
            {/* Header */}
            <div className="bg-zinc-900/50 border-b border-zinc-800 p-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Layers size={14} className="text-blue-400" />
                    <h3 className="text-zinc-200 font-bold text-sm">Structure Map</h3>
                </div>
                <div className="flex gap-1">
                    {['M15', 'H1', 'H4'].map(tf => (
                        <button
                            key={tf}
                            onClick={() => setTfFilter(tfFilter === tf ? 'ALL' : tf)}
                            className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${tfFilter === tf || tfFilter === 'ALL'
                                    ? 'bg-zinc-800 border-zinc-600 text-zinc-200'
                                    : 'bg-zinc-950 border-zinc-800 text-zinc-600'
                                }`}
                        >
                            {tf}
                        </button>
                    ))}
                </div>
            </div>

            {/* Sub-Header Filters */}
            <div className="px-3 py-2 border-b border-zinc-800/50 flex gap-2">
                <button
                    onClick={() => setTypeFilter('ALL')}
                    className={`text-[10px] px-2 py-0.5 rounded ${typeFilter === 'ALL' ? 'bg-blue-900/20 text-blue-300' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    All
                </button>
                <button
                    onClick={() => setTypeFilter('OB')}
                    className={`text-[10px] px-2 py-0.5 rounded ${typeFilter === 'OB' ? 'bg-blue-900/20 text-blue-300' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    Order Blocks
                </button>
                <button
                    onClick={() => setTypeFilter('BREAKER')}
                    className={`text-[10px] px-2 py-0.5 rounded ${typeFilter === 'BREAKER' ? 'bg-blue-900/20 text-blue-300' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    Breakers
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 hide-scrollbar">
                {filteredBlocks.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-600 opacity-50">
                        <ShieldAlert size={24} className="mb-2" />
                        <span className="text-xs">No Active Structure Found</span>
                    </div>
                ) : (
                    filteredBlocks.map((b: any, i: number) => <BlockItem key={i} block={b} />)
                )}
            </div>

            {/* Footer Confluence Check */}
            <div className="p-2 border-t border-zinc-800 bg-zinc-950/30 text-[10px] text-zinc-500 text-center">
                {blocks.length} Total Active Zones
            </div>
        </div>
    );
}
