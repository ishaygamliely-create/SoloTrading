'use client';

import React, { useEffect, useState } from 'react';
import { PanelProps } from './DashboardPanels';
import { useActiveTrade } from '../context/ActiveTradeContext';
import { Target, Shield, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, Edit2, Play, Lock, Activity, ChevronRight, Fingerprint, RefreshCcw, Loader2, XCircle } from 'lucide-react';
import { evaluateGuidance } from '../lib/guidance';

const MNQ_POINT_VALUE = 2; // $2 per point
const NQ_POINT_VALUE = 20; // $20 per point

function ProtocolBriefing({ activeTrade, data }: { activeTrade: any, data: any }) {
    const guidance = evaluateGuidance(activeTrade, data);

    return (
        <div className="space-y-3 relative z-10 mb-6">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                    <Activity size={12} className="text-blue-400 opacity-50" />
                    <span className="text-[9px] font-black text-blue-400/60 uppercase tracking-[0.2em]">Institutional briefing</span>
                </div>
                <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest" dir="rtl">תדריך מבצעי</span>
            </div>

            <div className={`p-4 rounded-2xl border transition-all duration-500 ${guidance.status === 'EXIT' ? 'bg-red-500/5 border-red-500/10' : guidance.status === 'CAUTION' ? 'bg-amber-500/5 border-amber-500/10' : 'bg-white/5 border-white/5'}`}>
                <div className="flex items-center gap-2 mb-3">
                    <div className={`w-1.5 h-1.5 rounded-full ${guidance.status === 'EXIT' ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : guidance.status === 'CAUTION' ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b]' : 'bg-emerald-500 shadow-[0_0_10px_#10b981]'}`} />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${guidance.status === 'EXIT' ? 'text-red-400' : guidance.status === 'CAUTION' ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {guidance.status} PROTOCOL
                    </span>
                </div>

                <div className="space-y-2">
                    {guidance.evidence.map((e, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                            <span className="mt-1.5 w-1 h-1 rounded-full bg-zinc-800 shrink-0" />
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight leading-tight">{e}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export function ActiveTradePanel({ data, loading }: PanelProps) {
    const { activeTrade, updateTradeParams, markAsEntered, closeTrade, addGuidance } = useActiveTrade();
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (!activeTrade || !data || (activeTrade.state !== 'OPEN' && activeTrade.state !== 'MANAGING' && activeTrade.state !== 'CONFIRMING')) return;

        const result = evaluateGuidance(activeTrade, data);
        const lastMsg = activeTrade.guidance[0];

        if (!lastMsg || lastMsg.status !== result.status) {
            const action = result.status === 'EXIT' ? 'CLOSE TRADE' : result.status === 'CAUTION' ? 'TIGHTEN STOPS' : 'HOLD';
            if (activeTrade.guidance.length === 0 && result.status === 'HOLD') return;

            addGuidance({
                timestamp: Date.now(),
                status: result.status as any,
                action,
                evidence: result.evidence
            });
        }
    }, [data, activeTrade?.state, activeTrade?.guidance, activeTrade?.id, addGuidance]);

    if (!activeTrade) return null;

    const currentPrice = data.price;
    const isLong = activeTrade.direction === 'LONG';
    const entry = activeTrade.entryPrice || 0;
    const sl = activeTrade.stopLossPrice || 0;
    const pointMultiplier = activeTrade.contractType === 'NQ' ? NQ_POINT_VALUE : MNQ_POINT_VALUE;

    const getPnl = () => {
        if (!currentPrice || !activeTrade.enteredAt) return 0;
        const diff = isLong ? currentPrice - entry : entry - currentPrice;
        return diff * pointMultiplier * (activeTrade.positionSize || 0);
    };

    const currentPnL = getPnl();
    const isProfitable = currentPnL > 0;

    return (
        <div className={`bg-black border-x border-t rounded-t-[3rem] p-6 md:p-8 relative transition-all duration-700 shadow-2xl overflow-y-auto max-h-[700px] flex flex-col custom-scrollbar
            ${isLong ? 'border-emerald-500/10' : 'border-red-500/10'}`}>

            {/* Background Flair */}
            <div className={`absolute top-0 right-0 w-64 h-64 blur-[100px] pointer-events-none opacity-5 -translate-y-1/2 translate-x-1/2 
                ${isLong ? 'bg-emerald-500' : 'bg-red-500'}`} />

            {/* --- TOP SECTION --- */}
            <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between mb-8 gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full animate-pulse shrink-0 ${isLong ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-500 shadow-[0_0_10px_#ef4444]'}`} />
                        <h2 className={`text-2xl md:text-3xl font-black uppercase tracking-tighter leading-none break-words ${isLong ? 'text-emerald-400' : 'text-red-400'}`}>
                            {activeTrade.direction} {activeTrade.contractType || 'MNQ'}
                        </h2>
                    </div>
                    <p className="text-[9px] font-black text-zinc-700 uppercase tracking-[0.3em] pl-5">Active Engagement Protocol</p>
                </div>

                <div className="flex flex-row md:flex-col items-center md:items-end gap-3 md:gap-2 pt-1">
                    <div className={`px-2.5 py-1 rounded-full border text-[8px] font-black tracking-[0.2em] bg-white/5 shrink-0 ${activeTrade.state === 'SELECTED' ? 'border-blue-500/20 text-blue-400' : 'border-emerald-500/20 text-emerald-400'}`}>
                        {activeTrade.state}
                    </div>
                    <button onClick={() => setIsEditing(!isEditing)} className="text-zinc-700 hover:text-white transition-colors">
                        <Edit2 size={12} />
                    </button>
                </div>
            </div>

            {/* --- ACTION AREA --- */}
            <div className="relative z-10 mb-8">
                {activeTrade.state === 'SELECTED' ? (
                    <button
                        onClick={markAsEntered}
                        className="w-full h-20 bg-white hover:bg-zinc-100 text-black rounded-3xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-2xl border-b-[6px] border-zinc-200"
                    >
                        <Play size={16} fill="currentColor" />
                        Deploy Protocol
                    </button>
                ) : (
                    <div className={`p-6 rounded-3xl border backdrop-blur-md relative overflow-hidden flex flex-col items-center justify-center gap-1 ${isProfitable ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-red-500/5 border-red-500/10'}`}>
                        <span className="text-[8px] font-black uppercase tracking-[0.4em] opacity-30">P&L Tracking</span>
                        <div className={`text-4xl font-mono font-black tabular-nums tracking-tighter ${isProfitable ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isProfitable ? '+' : ''}{currentPnL.toFixed(1)}
                        </div>
                    </div>
                )}
            </div>

            {/* --- PRICE MATRIX --- */}
            <div className="relative z-10 space-y-4 mb-8">
                {/* Entry Price */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between px-1">
                        <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Target Entry</label>
                        <Lock size={10} className="text-zinc-800" />
                    </div>
                    <div className={`p-5 rounded-2xl border transition-all ${isEditing ? 'bg-blue-500/5 border-blue-500/20' : 'bg-white/[0.02] border-white/5'}`}>
                        {isEditing ? (
                            <input
                                type="number"
                                step="0.25"
                                className="w-full bg-transparent text-2xl font-mono font-black text-white focus:outline-none tabular-nums"
                                value={activeTrade.entryPrice || ''}
                                onChange={(e) => updateTradeParams({ entryPrice: parseFloat(e.target.value) || 0 })}
                            />
                        ) : (
                            <span className="text-2xl font-mono font-black text-white tabular-nums tracking-tighter leading-none">{activeTrade.entryPrice?.toFixed(1) || '---'}</span>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {/* Stop Loss */}
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest px-1">Stop Loss</label>
                        <div className={`p-4 rounded-2xl border flex items-center justify-between h-[60px] ${isEditing ? 'bg-red-500/5 border-red-500/20' : 'bg-red-500/[0.02] border-red-500/10'}`}>
                            {isEditing ? (
                                <input
                                    type="number"
                                    step="0.25"
                                    className="w-full bg-transparent text-base font-mono font-black text-red-500 focus:outline-none tabular-nums"
                                    value={activeTrade.stopLossPrice || ''}
                                    onChange={(e) => updateTradeParams({ stopLossPrice: parseFloat(e.target.value) || 0 })}
                                />
                            ) : (
                                <span className="text-base md:text-lg font-mono font-black text-red-500 tabular-nums leading-none">{activeTrade.stopLossPrice?.toFixed(1) || '---'}</span>
                            )}
                            <Shield size={12} className="text-red-900/40 shrink-0 ml-1" />
                        </div>
                    </div>

                    {/* Exit Target */}
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest px-1 text-right block">Exit Target</label>
                        <div className={`p-4 rounded-2xl border flex items-center justify-between h-[60px] ${isEditing ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-500/[0.02] border-emerald-500/10'}`}>
                            {isEditing ? (
                                <input
                                    type="number"
                                    step="0.25"
                                    className="w-full bg-transparent text-base font-mono font-black text-emerald-500 focus:outline-none tabular-nums"
                                    value={activeTrade.targets?.[0] || ''}
                                    onChange={(e) => {
                                        const newTargets = [...(activeTrade.targets || [0, 0])];
                                        newTargets[0] = parseFloat(e.target.value) || 0;
                                        updateTradeParams({ targets: newTargets });
                                    }}
                                />
                            ) : (
                                <span className="text-base md:text-lg font-mono font-black text-emerald-400 tabular-nums leading-none">{activeTrade.targets?.[0]?.toFixed(1) || '---'}</span>
                            )}
                            <Target size={12} className="text-emerald-900/40 shrink-0 ml-1" />
                        </div>
                    </div>
                </div>
            </div>

            {/* --- BRIEFING AREA --- */}
            <ProtocolBriefing activeTrade={activeTrade} data={data} />

            {/* --- ACTION FOOTER --- */}
            <div className="relative z-10 pt-6 border-t border-white/5 space-y-4 mt-auto">
                <button
                    onClick={closeTrade}
                    className="w-full h-14 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 border-b-4 border-red-800 active:scale-95 shadow-xl shadow-red-900/10"
                >
                    <XCircle size={16} />
                    {activeTrade.state === 'SELECTED' ? 'Discard Protocol' : 'Terminate engagement'}
                </button>
            </div>
        </div>
    );
}
