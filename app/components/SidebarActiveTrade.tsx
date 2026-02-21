'use client';

import React from 'react';
import { useActiveTrade } from '../context/ActiveTradeContext';
import { TrendingUp, TrendingDown, XCircle, Bookmark, Clock, ShieldAlert } from 'lucide-react';

const MNQ_POINT_VALUE = 2;
const NQ_POINT_VALUE = 20;

export function SidebarActiveTrade({ data }: { data?: any }) {
    const { savedTrades, removeTrade, activeTrade, selectTrade } = useActiveTrade();

    return (
        <div className="bg-[#09090b] border border-white/5 rounded-2xl overflow-hidden mb-4 shadow-2xl ring-1 ring-white/5 w-full">
            {/* Redesigned Header */}
            <div className="px-5 py-4 bg-zinc-950/40 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-blue-500/10 rounded-lg">
                        <Bookmark size={16} className="text-blue-500 fill-blue-500/20" />
                    </div>
                    <span className="text-[11px] font-black text-white uppercase tracking-[0.2em]">
                        Active Trades ({savedTrades.length})
                    </span>
                </div>
            </div>

            {/* List or Empty State */}
            <div className="divide-y divide-white/5">
                {savedTrades.length === 0 ? (
                    <div className="p-8 text-center flex flex-col items-center gap-3">
                        <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center border border-white/5 text-zinc-700">
                            <ShieldAlert size={20} />
                        </div>
                        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-relaxed">
                            No active protocols<br />
                            <span className="opacity-50 font-medium">Select from Scenarios</span>
                        </div>
                    </div>
                ) : (
                    (savedTrades || []).map((trade) => {
                        const isLong = trade.direction === 'LONG';
                        const isActive = activeTrade?.id === trade.id;
                        const pointValue = trade.contractType === 'NQ' ? 20 : 2;

                        // Risk Math
                        const distToSL = Math.abs(trade.entryPrice - trade.stopLossPrice);
                        const riskPerContract = distToSL * pointValue;

                        return (
                            <div
                                key={trade.id}
                                className={`p-5 transition-all group relative border-l-[3px] 
                                    ${isActive
                                        ? 'bg-blue-500/5 border-blue-500 shadow-[inset_10px_0_20px_rgba(59,130,246,0.03)]'
                                        : 'hover:bg-white/[0.02] border-transparent'}`}
                            >
                                {/* Direction Row & Select Trigger */}
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex flex-col gap-1">
                                        <div className={`text-base font-black uppercase flex items-center gap-2 tracking-tight ${isLong ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {isLong ? <TrendingUp size={18} className="stroke-[3]" /> : <TrendingDown size={18} className="stroke-[3]" />}
                                            {trade.direction}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {!isActive && (
                                            <button
                                                onClick={() => selectTrade(trade.id)}
                                                className="text-[9px] bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded-lg transition-all font-black uppercase tracking-widest border border-white/10"
                                            >
                                                SELECT
                                            </button>
                                        )}
                                        <button
                                            onClick={() => removeTrade(trade.id)}
                                            className="text-zinc-600 hover:text-red-400 transition-all p-1.5 hover:bg-red-500/10 rounded-lg"
                                            title="Remove Protocol"
                                        >
                                            <XCircle size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Context Labels */}
                                <div className="flex flex-wrap items-center gap-2 mb-4">
                                    <span className="font-mono text-[9px] bg-zinc-800/80 text-zinc-400 px-2 py-0.5 rounded border border-white/5 font-bold uppercase">
                                        {trade.timeframe} (Scalp)
                                    </span>
                                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest truncate max-w-[120px]">
                                        {trade.setupName?.replace(/_/g, ' ')}
                                    </span>
                                </div>

                                {/* Premium Metrics Grid */}
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div className="bg-zinc-950/60 p-3 rounded-xl border border-white/5">
                                        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.15em] block mb-1">ENTRY</span>
                                        <span className="font-mono text-sm text-white font-bold tracking-tight">
                                            {(trade.entryPrice || 0).toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="bg-zinc-950/60 p-3 rounded-xl border border-white/5">
                                        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.15em] block mb-1">STOP</span>
                                        <span className="font-mono text-sm text-red-400/90 font-bold tracking-tight">
                                            {(trade.stopLossPrice || 0).toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                {/* Footer: Risk & Time */}
                                <div className="flex justify-between items-center text-[10px] text-zinc-500 font-bold">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[9px] uppercase tracking-widest opacity-60">Risk (1ct):</span>
                                        <span className="text-zinc-400 font-mono tracking-tighter">${riskPerContract.toFixed(0)}</span>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-40">
                                        <Clock size={10} />
                                        <span className="text-[9px] font-mono">{new Date(trade.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    }))}
            </div>
        </div>
    );
}
