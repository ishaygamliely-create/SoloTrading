'use client';

import React from 'react';
import { useActiveTrade } from '../context/ActiveTradeContext';
import { TrendingUp, TrendingDown, XCircle, Bookmark } from 'lucide-react';

const MNQ_POINT_VALUE = 2;
const NQ_POINT_VALUE = 20;

export function SidebarActiveTrade({ data }: { data?: any }) {
    const { savedTrades, removeTrade, activeTrade, selectTrade } = useActiveTrade();

    // Always render to maintain layout stability and "Button" availability
    // if (savedTrades.length === 0) return null; 

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden mb-4 shadow-lg ring-1 ring-inset ring-zinc-800">
            {/* Header */}
            <div className="px-4 py-3 bg-zinc-950/50 border-b border-zinc-800/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Bookmark size={14} className="text-blue-400" />
                    <span className="text-xs font-bold text-zinc-300 uppercase tracking-wide">
                        Active Trades ({savedTrades.length})
                    </span>
                </div>
            </div>

            {/* List or Empty State */}
            <div className="divide-y divide-zinc-800/50">
                {savedTrades.length === 0 ? (
                    <div className="p-4 text-center text-zinc-500 text-[10px] italic">
                        No saved setups.<br />Select "Save Setup" from scenarios.
                    </div>
                ) : (
                    savedTrades.map((trade) => {
                        const isLong = trade.direction === 'LONG';
                        const isActive = activeTrade?.id === trade.id;
                        const pointValue = trade.contractType === 'NQ' ? 20 : 2;

                        // Simple Risk Check
                        const distToSL = Math.abs(trade.entryPrice - trade.stopLossPrice);
                        const riskPerContract = distToSL * pointValue;

                        return (
                            <div
                                key={trade.id}
                                className={`p-3 transition-colors group relative border-l-2 ${isActive ? 'bg-zinc-800/40 border-blue-500' : 'hover:bg-zinc-800/20 border-transparent'}`}
                            >
                                {/* Top Row: Symbol & Remove */}
                                <div className="flex justify-between items-start mb-2">
                                    <div className={`text-sm font-black uppercase flex items-center gap-1.5 ${isLong ? 'text-green-400' : 'text-red-400'}`}>
                                        {isLong ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                        {trade.direction} {trade.symbol}
                                    </div>
                                    <div className="flex gap-1">
                                        {!isActive && (
                                            <button
                                                onClick={() => selectTrade(trade.id)}
                                                className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-all font-bold"
                                            >
                                                SELECT
                                            </button>
                                        )}
                                        <button
                                            onClick={() => removeTrade(trade.id)}
                                            className="text-zinc-600 hover:text-red-400 transition-colors p-0.5 opacity-0 group-hover:opacity-100"
                                            title="Remove from list"
                                        >
                                            <XCircle size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Setup Info */}
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="font-mono text-[10px] bg-zinc-800 text-zinc-400 px-1 rounded">{trade.timeframe}</span>
                                    <span className="text-[10px] text-zinc-500 truncate">{trade.setupName}</span>
                                </div>

                                {/* Metrics Grid */}
                                <div className="grid grid-cols-2 gap-2 text-[10px]">
                                    <div className="bg-zinc-950/40 p-1.5 rounded border border-zinc-800/30">
                                        <span className="text-zinc-500 block">ENTRY</span>
                                        <span className="font-mono text-zinc-300 font-bold">{(trade.entryPrice || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="bg-zinc-950/40 p-1.5 rounded border border-zinc-800/30">
                                        <span className="text-zinc-500 block">STOP</span>
                                        <span className="font-mono text-red-300 font-bold">{(trade.stopLossPrice || 0).toFixed(2)}</span>
                                    </div>
                                </div>

                                {/* Footer: Risk Snapshot */}
                                <div className="mt-2 flex justify-between items-center text-[9px] text-zinc-500">
                                    <span>Risk (1ct): <span className="text-zinc-400 font-mono">${riskPerContract.toFixed(0)}</span></span>
                                    <span className="opacity-50 text-[8px]">{new Date(trade.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>
                        );
                    }))}
            </div>
        </div>
    );
}
