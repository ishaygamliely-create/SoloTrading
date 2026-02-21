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
        <div className={`bg-[#0c0c0e] border rounded-[2rem] p-8 relative overflow-hidden transition-all duration-500 shadow-[0_0_40px_rgba(0,0,0,0.4)]
            ${isLong ? 'border-emerald-500/20' : 'border-red-500/20'}`}>

            {/* Accent Glow */}
            <div className={`absolute top-0 right-0 w-64 h-64 blur-[100px] pointer-events-none opacity-20 -translate-y-1/2 translate-x-1/2 
                ${isLong ? 'bg-emerald-500' : 'bg-red-500'}`} />

            {/* --- HEADER --- */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 relative z-10">
                <div className="flex items-start gap-4">
                    <div className={`mt-2 w-2.5 h-2.5 rounded-full shadow-[0_0_10px_currentColor] animate-pulse shrink-0 ${isLong ? 'text-emerald-500 bg-emerald-500' : 'text-red-500 bg-red-500'}`} />
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                            <h2 className={`text-2xl md:text-3xl font-black uppercase tracking-tighter leading-none truncate ${isLong ? 'text-emerald-400' : 'text-red-400'}`}>
                                {activeTrade.direction} {activeTrade.contractType || 'MNQ'}
                            </h2>
                            <div className="bg-white/5 border border-white/10 px-2 py-0.5 rounded-full shrink-0">
                                <span className="text-[9px] font-black text-white tracking-widest uppercase">{activeTrade.state}</span>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
                            {activeTrade.state === 'MANAGING' && (
                                <div className={`flex items-center gap-2 px-2 py-1 bg-white/5 rounded-lg border border-white/5 ${isProfitable ? 'text-emerald-400' : 'text-red-400'}`}>
                                    <Activity size={12} />
                                    <span className="font-mono text-sm tracking-tight whitespace-nowrap">
                                        {isProfitable ? '+' : ''}{currentPnL.toFixed(2)} USD
                                    </span>
                                </div>
                            )}
                            <span className="text-zinc-600 uppercase tracking-widest text-[9px] font-black opacity-80">Operational Engagement</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 w-full md:w-auto">
                    {activeTrade.state === 'SELECTED' && (
                        <button
                            onClick={handleMarkEntered}
                            className="bg-white hover:bg-zinc-200 text-black px-8 py-4 rounded-2xl text-sm font-black flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-white/5 w-full md:w-auto"
                        >
                            <Play size={18} fill="currentColor" /> ENTER TRADE
                        </button>
                    )}
                    {activeTrade.state === 'CONFIRMING' && (
                        <button
                            disabled
                            className="bg-blue-600/50 text-white px-8 py-4 rounded-2xl text-sm font-black flex items-center justify-center gap-3 w-full md:w-auto cursor-wait border border-blue-500/30"
                        >
                            <Loader2 size={18} className="animate-spin" /> CONFIRMING...
                        </button>
                    )}
                    {(activeTrade.state === 'OPEN' || activeTrade.state === 'MANAGING' || activeTrade.state === 'CONFIRMING') && (
                        <button
                            onClick={closeTrade}
                            className="bg-red-500 hover:bg-red-400 text-white px-8 py-4 rounded-2xl text-sm font-black transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-red-500/20 w-full md:w-auto"
                        >
                            CLOSE POSITION
                        </button>
                    )}
                </div>
            </div>

            {/* --- RISK DASHBOARD --- */}
            <div className="bg-zinc-950/40 rounded-3xl p-6 border border-white/5 mb-8 relative z-10">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Shield size={16} className="text-blue-400" />
                        </div>
                        <span className="text-xs font-black text-white uppercase tracking-[0.2em]">Risk Configuration</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleContractType}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black border transition-all
                                ${activeTrade.contractType === 'NQ'
                                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 shadow-lg shadow-amber-500/5'
                                    : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'}`}
                        >
                            {activeTrade.contractType === 'NQ' ? 'NQ (Mini)' : 'MNQ (Micro)'}
                        </button>
                        <button
                            onClick={handleRecalculateContracts}
                            className="flex items-center gap-1.5 text-[10px] font-black text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-widest"
                        >
                            <RefreshCcw size={12} /> Auto-Size
                        </button>
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className="flex items-center gap-1.5 text-[10px] font-black text-zinc-500 hover:text-white transition-colors uppercase tracking-widest border border-white/5 px-3 py-1.5 rounded-xl hover:bg-white/5"
                        >
                            <Edit2 size={12} /> {isEditing ? 'Save' : 'Edit'}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {/* Entry Price */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest pl-1">Target Entry</label>
                        {isEditing ? (
                            <input
                                type="number"
                                step="0.25"
                                className="w-full bg-black border border-white/10 rounded-2xl text-base px-4 py-3 font-mono text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                                value={activeTrade.entryPrice || ''}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    updateTradeParams({ entryPrice: isNaN(val) ? 0 : val });
                                }}
                            />
                        ) : (
                            <div className="bg-black/40 border border-white/5 rounded-xl p-3 flex items-center justify-between">
                                <span className="text-xl font-mono font-black text-white tabular-nums">{activeTrade.entryPrice?.toFixed(2) || '---'}</span>
                                <Lock size={12} className="text-zinc-800" />
                            </div>
                        )}
                    </div>

                    {/* First Target */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest pl-1">Primary Exit (T1)</label>
                        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 flex items-center justify-between">
                            <span className="text-xl font-mono font-black text-emerald-400 tabular-nums">
                                {activeTrade.targets && activeTrade.targets[0] ? activeTrade.targets[0].toFixed(2) : '---'}
                            </span>
                            <Target size={12} className="text-emerald-900/40" />
                        </div>
                    </div>

                    {/* Stop Loss */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest pl-1">Invalidation (SL)</label>
                        {isEditing ? (
                            <input
                                type="number"
                                step="0.25"
                                className="w-full bg-black border border-white/10 rounded-2xl text-base px-4 py-3 font-mono text-white focus:outline-none focus:border-red-500/50 transition-colors"
                                value={activeTrade.stopLossPrice || ''}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    updateTradeParams({ stopLossPrice: isNaN(val) ? 0 : val });
                                }}
                            />
                        ) : (
                            <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3 flex items-center justify-between">
                                <span className="text-xl font-mono font-black text-red-400 tabular-nums">{activeTrade.stopLossPrice?.toFixed(2) || '---'}</span>
                                <Shield size={12} className="text-red-900/40" />
                            </div>
                        )}
                    </div>

                    {/* Contracts */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest pl-1">Exposure (Cnt)</label>
                        {isEditing ? (
                            <input
                                type="number"
                                className="w-full bg-black border border-white/10 rounded-2xl text-base px-4 py-3 font-mono text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                                value={activeTrade.positionSize || ''}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    updateTradeParams({ positionSize: isNaN(val) ? 0 : val });
                                }}
                            />
                        ) : (
                            <div className="bg-black/40 border border-white/5 rounded-xl p-3 flex items-center justify-between">
                                <span className="text-xl font-mono font-black text-white tracking-widest">{activeTrade.positionSize || 0}</span>
                                <Activity size={12} className="text-zinc-800" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Risk Summary Footnote */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-black/40 p-5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Total Drawdown Risk</span>
                            <span className={`text-xl font-mono font-black ${riskExceeded ? 'text-red-500' : 'text-zinc-200'}`}>
                                ${hasValidRisk ? totalRisk.toFixed(0) : '0.00'}
                            </span>
                        </div>
                        <div className="w-px h-8 bg-white/5" />
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Per Contract</span>
                            <span className="text-xl font-mono font-black text-zinc-400">
                                ${hasValidRisk ? riskPerContract.toFixed(0) : '0.00'}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Portfolio Impact</span>
                            <div className="flex items-center gap-2">
                                <span className={`text-xl font-mono font-black ${riskExceeded ? 'text-red-500' : 'text-blue-400'}`}>
                                    {activeTrade.maxRiskAmount > 0 && hasValidRisk
                                        ? ((totalRisk / activeTrade.maxRiskAmount) * 100).toFixed(1) + '%'
                                        : '0.0%'}
                                </span>
                                {riskExceeded && <AlertTriangle size={16} className="text-red-500 animate-pulse" />}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- GUIDANCE STREAM --- */}
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <Fingerprint size={16} className="text-zinc-700" />
                        <span className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Operational Guidance Stream</span>
                    </div>
                </div>
                {activeTrade.state === 'SELECTED' ? (
                    <div className="bg-white/[0.02] border border-dashed border-white/5 p-6 rounded-3xl text-center">
                        <span className="text-[11px] font-black text-zinc-600 uppercase tracking-[0.2em] animate-pulse">
                            Awaiting Technical Confirmation for Deployment
                        </span>
                    </div>
                ) : activeTrade.state === 'CONFIRMING' ? (
                    <div className="bg-blue-500/5 border border-dashed border-blue-500/20 p-6 rounded-3xl text-center">
                        <span className="text-[11px] font-black text-blue-400 uppercase tracking-[0.2em] animate-pulse flex items-center justify-center gap-2">
                            <Loader2 size={12} className="animate-spin" />
                            Transmitting Order to CME... CONFIRMING EXECUTION
                        </span>
                    </div>
                ) : (
                    <GuidanceDisplay activeTrade={activeTrade} data={data} />
                )}
            </div>

            {/* Cancel Button */}
            <div className="mt-8 pt-6 border-t border-white/5 flex justify-center relative z-10">
                <button
                    onClick={closeTrade}
                    className="flex items-center gap-2 text-[10px] font-black text-zinc-600 hover:text-red-400 transition-colors uppercase tracking-[0.3em]"
                >
                    <XCircle size={12} /> Terminate Engagement Protocol
                </button>
            </div>
        </div>
    );
}
