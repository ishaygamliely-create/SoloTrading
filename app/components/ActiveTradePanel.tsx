'use client';

import React, { useEffect, useState } from 'react';
import { PanelProps } from './DashboardPanels';
import { useActiveTrade } from '../context/ActiveTradeContext';
import { Target, Shield, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, Edit2, Play, Lock, Activity, ChevronRight, Fingerprint, RefreshCcw, Loader2, XCircle } from 'lucide-react';
import { evaluateGuidance } from '../lib/guidance';

const MNQ_POINT_VALUE = 2; // $2 per point
const NQ_POINT_VALUE = 20; // $20 per point

function GuidanceDisplay({ activeTrade, data }: { activeTrade: any, data: any }) {
    const guidance = evaluateGuidance(activeTrade, data);

    let bgClass = 'bg-blue-500/5 border-blue-500/10 text-blue-200';
    let iconColor = 'text-blue-400';
    if (guidance.status === 'CAUTION') {
        bgClass = 'bg-amber-500/5 border-amber-500/10 text-amber-200';
        iconColor = 'text-amber-400';
    }
    if (guidance.status === 'EXIT') {
        bgClass = 'bg-red-500/5 border-red-500/10 text-red-200 animate-pulse';
        iconColor = 'text-red-400';
    }

    return (
        <div className={`p-4 rounded-2xl border ${bgClass}`}>
            <div className="flex items-center gap-2 mb-2">
                <Activity size={12} className={iconColor} />
                <strong className="text-[10px] font-black uppercase tracking-[0.2em]">{guidance.status} PROTOCOL</strong>
            </div>
            <ul className="space-y-1.5">
                {(guidance.evidence || []).map((e, i) => (
                    <li key={i} className="text-[11px] leading-tight flex items-start gap-2 text-zinc-300">
                        <span className="mt-1 w-1 h-1 rounded-full bg-zinc-700 shrink-0" />
                        {e}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export function ActiveTradePanel({ data, loading }: PanelProps) {
    const { activeTrade, updateTradeParams, markAsEntered, closeTrade, addGuidance } = useActiveTrade();
    const [isEditing, setIsEditing] = useState(false);

    // Guidance Logging Effect
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
    const hasValidRisk = entry > 0 && sl > 0 && entry !== sl;

    const distToSL = hasValidRisk ? Math.abs(entry - sl) : 0;
    const pointMultiplier = activeTrade.contractType === 'NQ' ? NQ_POINT_VALUE : MNQ_POINT_VALUE;
    const riskPerContract = distToSL * pointMultiplier;
    const totalRisk = riskPerContract * (activeTrade.positionSize || 0);
    const riskExceeded = totalRisk > (activeTrade.maxRiskAmount || 0);

    const getPnl = () => {
        if (!currentPrice || !activeTrade.enteredAt) return 0;
        const diff = isLong ? currentPrice - entry : entry - currentPrice;
        return diff * pointMultiplier * (activeTrade.positionSize || 0);
    };

    const currentPnL = getPnl();
    const isProfitable = currentPnL > 0;

    // --- HANDLERS ---
    const handleRecalculateContracts = () => {
        if (riskPerContract <= 0) return;
        const safeContracts = Math.floor((activeTrade.maxRiskAmount || 0) / riskPerContract);
        updateTradeParams({ positionSize: Math.max(1, safeContracts) });
    };

    const toggleContractType = () => {
        const newType = activeTrade.contractType === 'NQ' ? 'MNQ' : 'NQ';
        updateTradeParams({ contractType: newType });
    };

    const handleMarkEntered = () => {
        markAsEntered();
        setIsEditing(false);
    };

    return (
        <div className={`bg-[#000000] border rounded-[2.5rem] p-6 md:p-8 relative transition-all duration-500 shadow-2xl
            ${isLong ? 'border-emerald-500/30' : 'border-red-500/30'}`}>

            {/* Accent Glow */}
            <div className={`absolute top-0 right-0 w-64 h-64 blur-[100px] pointer-events-none opacity-20 -translate-y-1/2 translate-x-1/2 
                ${isLong ? 'bg-emerald-500' : 'bg-red-500'}`} />

            {/* --- COMPACT STRIP-DOWN HEADER --- */}
            <div className="flex flex-col gap-6 mb-8 relative z-10">
                <div className="flex flex-col gap-5">
                    {/* Title & Direction Row */}
                    <div className="flex items-start gap-4">
                        <div className={`mt-2 w-2 h-2 rounded-full shadow-[0_0_10px_currentColor] animate-pulse shrink-0 ${isLong ? 'text-emerald-500 bg-emerald-500' : 'text-red-500 bg-red-500'}`} />
                        <div>
                            <h2 className={`text-3xl font-black uppercase tracking-tighter leading-none mb-3 ${isLong ? 'text-emerald-400' : 'text-red-400'}`}>
                                {activeTrade.direction} {activeTrade.contractType || 'MNQ'}
                            </h2>
                            <div className="flex items-center gap-3">
                                <span className="bg-white/10 border border-white/10 px-3 py-1.5 rounded-full text-[10px] font-black text-white tracking-widest uppercase">
                                    {activeTrade.state}
                                </span>
                                <button
                                    onClick={() => setIsEditing(!isEditing)}
                                    className="text-[9px] font-black text-zinc-500 uppercase tracking-widest hover:text-white transition-colors flex items-center gap-1.5"
                                >
                                    <Edit2 size={12} /> {isEditing ? 'SAVE PARAMETERS' : 'EDIT PARAMS'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Dedicated PnL Row - Vertical Stack for safety and clarity */}
                    {activeTrade.state === 'MANAGING' && (
                        <div className={`bg-white/5 border border-white/10 rounded-[2rem] p-6 flex flex-col gap-4 relative overflow-hidden ${isProfitable ? 'text-emerald-400' : 'text-red-400'}`}>
                            <div className="flex items-center justify-between relative z-10">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-1">Live Performance</span>
                                    <span className="text-[8px] font-black uppercase tracking-widest opacity-20">Real-time Protocol Feed</span>
                                </div>
                                <Activity size={16} className="opacity-30" />
                            </div>
                            <div className="font-mono text-4xl font-black tracking-tighter tabular-nums leading-none relative z-10 drop-shadow-[0_0_20px_rgba(0,0,0,0.3)]">
                                {isProfitable ? '+' : ''}{currentPnL.toFixed(2)}
                            </div>
                            {/* Subtle background flair */}
                            <div className={`absolute -right-4 -bottom-4 w-24 h-24 blur-3xl opacity-10 rounded-full ${isProfitable ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        </div>
                    )}
                </div>

                {/* Main Action Buttons */}
                <div className="w-full">
                    {activeTrade.state === 'SELECTED' && (
                        <button
                            onClick={handleMarkEntered}
                            className="bg-white hover:bg-zinc-200 text-black px-8 py-5 rounded-3xl text-sm font-black flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl shadow-white/5 w-full border-b-[6px] border-zinc-300"
                        >
                            <Play size={18} fill="currentColor" /> DEPLOY PROTOCOL
                        </button>
                    )}
                    {(activeTrade.state === 'OPEN' || activeTrade.state === 'MANAGING' || activeTrade.state === 'CONFIRMING') && (
                        <button
                            onClick={closeTrade}
                            className="bg-red-500 hover:bg-red-400 text-white px-8 py-5 rounded-3xl text-sm font-black transition-all active:scale-95 shadow-2xl shadow-red-500/10 w-full border-b-[6px] border-red-700"
                        >
                            <XCircle size={18} /> TERMINATE ENGAGEMENT
                        </button>
                    )}
                </div>
            </div>

            {/* --- ULTIMATE CLEAN PRICE LIST --- */}
            <div className="flex flex-col gap-5 relative z-10 mb-8">
                {/* Entry Price */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] pl-1">Target Entry</label>
                    {isEditing ? (
                        <input
                            type="number"
                            step="0.25"
                            className="w-full bg-zinc-900 border border-white/10 rounded-2xl text-xl px-5 py-4 font-mono text-white focus:outline-none focus:border-blue-500 transition-colors"
                            value={activeTrade.entryPrice || ''}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                updateTradeParams({ entryPrice: isNaN(val) ? 0 : val });
                            }}
                        />
                    ) : (
                        <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-5 flex items-center justify-between">
                            <span className="text-2xl md:text-3xl font-mono font-black text-white tabular-nums drop-shadow-sm">{activeTrade.entryPrice?.toFixed(2) || '---'}</span>
                            <Lock size={16} className="text-zinc-800" />
                        </div>
                    )}
                </div>

                {/* Stop Loss */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] pl-2">Stop Loss (SL)</label>
                    {isEditing ? (
                        <input
                            type="number"
                            step="0.25"
                            className="w-full bg-zinc-900 border border-red-500/20 rounded-2xl text-xl px-5 py-4 font-mono text-red-400 focus:outline-none focus:border-red-500 transition-colors"
                            value={activeTrade.stopLossPrice || ''}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                updateTradeParams({ stopLossPrice: isNaN(val) ? 0 : val });
                            }}
                        />
                    ) : (
                        <div className="bg-red-500/5 border border-red-500/10 rounded-3xl p-5 flex items-center justify-between">
                            <span className="text-2xl md:text-3xl font-mono font-black text-red-500 tabular-nums">{activeTrade.stopLossPrice?.toFixed(2) || '---'}</span>
                            <Shield size={16} className="text-red-900/40" />
                        </div>
                    )}
                </div>

                {/* First Target */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] pl-2">Exit Target (TP1)</label>
                    {isEditing ? (
                        <input
                            type="number"
                            step="0.25"
                            className="w-full bg-zinc-900 border border-emerald-500/20 rounded-2xl text-xl px-5 py-4 font-mono text-emerald-400 focus:outline-none focus:border-emerald-500 transition-colors"
                            value={activeTrade.targets && activeTrade.targets[0] ? activeTrade.targets[0] : ''}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                const newTargets = [...(activeTrade.targets || [0, 0])];
                                newTargets[0] = isNaN(val) ? 0 : val;
                                updateTradeParams({ targets: newTargets });
                            }}
                        />
                    ) : (
                        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-3xl p-5 flex items-center justify-between">
                            <span className="text-2xl md:text-3xl font-mono font-black text-emerald-400 tabular-nums">
                                {activeTrade.targets && activeTrade.targets[0] ? activeTrade.targets[0].toFixed(2) : '---'}
                            </span>
                            <Target size={16} className="text-emerald-900/40" />
                        </div>
                    )}
                </div>

                {/* Second Target */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] pl-2">Secondary Target (TP2)</label>
                    {isEditing ? (
                        <input
                            type="number"
                            step="0.25"
                            className="w-full bg-zinc-900 border border-emerald-500/20 rounded-2xl text-xl px-5 py-4 font-mono text-emerald-500/60 focus:outline-none focus:border-emerald-500 transition-colors"
                            value={activeTrade.targets && activeTrade.targets[1] ? activeTrade.targets[1] : ''}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                const newTargets = [...(activeTrade.targets || [0, 0])];
                                newTargets[1] = isNaN(val) ? 0 : val;
                                updateTradeParams({ targets: newTargets });
                            }}
                        />
                    ) : (
                        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-3xl p-5 flex items-center justify-between">
                            <span className="text-2xl md:text-3xl font-mono font-black text-emerald-500/60 tabular-nums">
                                {activeTrade.targets && activeTrade.targets[1] ? activeTrade.targets[1].toFixed(2) : '---'}
                            </span>
                            <Target size={16} className="text-emerald-900/20" />
                        </div>
                    )}
                </div>
            </div>

            {/* Contract/Size Badge - Simple Style */}
            <div className="flex items-center justify-between bg-white/5 rounded-2xl px-5 py-3 border border-white/5 mb-4">
                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Deployment Size</span>
                <span className="text-sm font-mono font-black text-zinc-300">{activeTrade.positionSize || 0} CONTRACTS</span>
            </div>

            {/* Cancel Bottom Link */}
            <div className="mt-8 pt-6 border-t border-white/5 flex justify-center">
                <button
                    onClick={closeTrade}
                    className="text-[9px] font-black text-zinc-700 hover:text-red-500 transition-colors uppercase tracking-[0.4em]"
                >
                    Discard Engagement
                </button>
            </div>
        </div>
    );
}
