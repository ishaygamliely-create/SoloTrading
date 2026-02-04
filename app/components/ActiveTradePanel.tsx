'use client';

import React, { useEffect, useState } from 'react';
import { PanelProps } from './DashboardPanels';
import { useActiveTrade, TradeState } from '../context/ActiveTradeContext';
import { Target, Shield, AlertTriangle, CheckCircle2, RotateCcw, XCircle, TrendingUp, TrendingDown, Edit2, Play, Lock } from 'lucide-react';

import { evaluateGuidance } from '../lib/guidance';

const MNQ_POINT_VALUE = 2; // $2 per point
const NQ_POINT_VALUE = 20; // $20 per point

function GuidanceDisplay({ activeTrade, data }: { activeTrade: any, data: any }) {
    const guidance = evaluateGuidance(activeTrade, data);

    let bgClass = 'bg-blue-950/20 border-blue-900/30 text-blue-200';
    if (guidance.status === 'CAUTION') bgClass = 'bg-amber-950/20 border-amber-900/30 text-amber-200';
    if (guidance.status === 'EXIT') bgClass = 'bg-red-950/20 border-red-900/30 text-red-200 animate-pulse';

    return (
        <div className={`p-3 rounded border text-xs ${bgClass}`}>
            <div className="flex items-center gap-2 mb-1.5">
                <strong className="text-sm font-black uppercase tracking-wider">{guidance.status}</strong>
            </div>
            <ul className="list-disc list-inside space-y-0.5 opacity-80">
                {guidance.evidence.map((e, i) => (
                    <li key={i} className="text-[10px] leading-tight">{e}</li>
                ))}
            </ul>
        </div>
    );
}

export function ActiveTradePanel({ data, loading }: PanelProps) {
    const { activeTrade, updateTradeParams, markAsEntered, closeTrade, invalidateTrade, addGuidance } = useActiveTrade();
    const [isEditing, setIsEditing] = useState(false);

    // Guidance Logging Effect
    useEffect(() => {
        if (!activeTrade || !data || (activeTrade.state !== 'OPEN' && activeTrade.state !== 'MANAGING')) return;

        const result = evaluateGuidance(activeTrade, data);
        const lastMsg = activeTrade.guidance[0];

        // Only log if status changes to avoid spam
        if (!lastMsg || lastMsg.status !== result.status) {
            const action = result.status === 'EXIT' ? 'CLOSE TRADE' : result.status === 'CAUTION' ? 'TIGHTEN STOPS' : 'HOLD';

            // Avoid logging HOLD if it's the very first message and it's just normal
            if (activeTrade.guidance.length === 0 && result.status === 'HOLD') return;

            addGuidance({
                timestamp: Date.now(),
                status: result.status as any, // Cast to GuidanceStatus if types strictly match
                action,
                evidence: result.evidence
            });
        }
    }, [data, activeTrade?.state, activeTrade?.guidance, activeTrade?.id]); // Dependencies

    // If no trade, this panel shouldn't really be rendered, but safe-guard.
    if (!activeTrade) return null;

    const currentPrice = data.price;
    const isLong = activeTrade.direction === 'LONG';
    // Safe guard: Ensure prices exist before math
    const entry = activeTrade.entryPrice || 0;
    const sl = activeTrade.stopLossPrice || 0;
    const hasValidRisk = entry > 0 && sl > 0 && entry !== sl;

    const distToSL = hasValidRisk ? Math.abs(entry - sl) : 0;
    const pointMultiplier = activeTrade.contractType === 'NQ' ? NQ_POINT_VALUE : MNQ_POINT_VALUE;
    const riskPerContract = distToSL * pointMultiplier;
    const totalRisk = riskPerContract * (activeTrade.positionSize || 0);
    const riskExceeded = totalRisk > (activeTrade.maxRiskAmount || 0);

    // Derived Guidance (Basic Implementation for Phase 1)
    // Full logic will be in analysis.ts, but basic alerts here.
    const getPnl = () => {
        if (!currentPrice || !activeTrade.enteredAt) return 0;
        const diff = isLong ? currentPrice - entry : entry - currentPrice;
        return diff * pointMultiplier * (activeTrade.positionSize || 0);
    };

    const currentPnL = getPnl();
    const isProfitable = currentPnL > 0;

    // --- HANDLERS ---
    const handleRecalculateContracts = () => {
        // Auto-size based on risk
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

    // --- RENDER HELPERS ---
    return (
        <div className={`bg-zinc-900 border rounded-xl p-5 relative overflow-hidden transition-all duration-300 ${isLong ? 'border-green-900/50 shadow-green-900/10' : 'border-red-900/50 shadow-red-900/10'} shadow-xl`}>

            {/* --- HEADER --- */}
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full animate-pulse ${isLong ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div>
                        <h2 className={`text-lg font-black uppercase tracking-tight ${isLong ? 'text-green-400' : 'text-red-400'}`}>
                            {activeTrade.direction} MNQ
                        </h2>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono uppercase">
                            <span>{activeTrade.contractType || 'MNQ'}</span>
                            <span className="text-zinc-700">|</span>
                            <span>{activeTrade.state}</span>
                            {activeTrade.state === 'MANAGING' && (
                                <span className={isProfitable ? 'text-green-500' : 'text-red-500'}>
                                    {' '}{isProfitable ? '+' : ''}{currentPnL.toFixed(0)} USD
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    {activeTrade.state === 'SELECTED' && (
                        <button
                            onClick={handleMarkEntered}
                            className="bg-zinc-100 hover:bg-white text-zinc-950 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                        >
                            <Play size={12} fill="currentColor" /> Enter Trade
                        </button>
                    )}
                    {activeTrade.state !== 'SELECTED' && (
                        <button
                            onClick={closeTrade}
                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                        >
                            Close
                        </button>
                    )}
                </div>
            </div>

            {/* --- RISK DASHBOARD (Editable) --- */}
            <div className="bg-zinc-950/50 rounded-lg p-3 border border-zinc-900 mb-4">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1">
                        <Shield size={10} /> Risk Configuration
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={toggleContractType}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${activeTrade.contractType === 'NQ' ? 'bg-amber-900/40 border-amber-600/50 text-amber-500' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}
                        >
                            {activeTrade.contractType === 'NQ' ? 'NQ (Mini)' : 'MNQ (Micro)'}
                        </button>
                    </div>
                    {(activeTrade.state === 'SELECTED' || isEditing) ? (
                        <span className="text-[9px] text-blue-400 cursor-pointer hover:underline" onClick={handleRecalculateContracts}>
                            Auto-Size
                        </span>
                    ) : (
                        <span className="text-[10px] text-zinc-600 hover:text-zinc-400 cursor-pointer" onClick={() => setIsEditing(true)}>
                            <Edit2 size={10} /> Edit
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                    {/* Actual Entry */}
                    <div>
                        <label className="text-[9px] text-zinc-600 block mb-1">Entry Price</label>
                        {activeTrade.state === 'SELECTED' || isEditing ? (
                            <input
                                type="number"
                                className="w-full bg-zinc-900 border border-zinc-700 rounded text-xs px-2 py-1 font-mono text-zinc-300 focus:outline-none focus:border-blue-500"
                                value={activeTrade.entryPrice || ''}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    updateTradeParams({ entryPrice: isNaN(val) ? 0 : val });
                                }}
                            />
                        ) : (
                            <div className="text-sm font-mono font-bold text-zinc-200">{activeTrade.entryPrice?.toFixed(2) || '0.00'}</div>
                        )}
                    </div>

                    {/* Contracts */}
                    <div>
                        <label className="text-[9px] text-zinc-600 block mb-1">Contracts</label>
                        {activeTrade.state === 'SELECTED' || isEditing ? (
                            <input
                                type="number"
                                className="w-full bg-zinc-900 border border-zinc-700 rounded text-xs px-2 py-1 font-mono text-zinc-300 focus:outline-none focus:border-blue-500"
                                value={activeTrade.positionSize || ''}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    updateTradeParams({ positionSize: isNaN(val) ? 0 : val });
                                }}
                            />
                        ) : (
                            <div className="text-sm font-mono font-bold text-zinc-200">{activeTrade.positionSize || 0}</div>
                        )}
                    </div>

                    {/* Max Risk */}
                    <div>
                        <label className="text-[9px] text-zinc-600 block mb-1">Max Risk ($)</label>
                        {activeTrade.state === 'SELECTED' || isEditing ? (
                            <input
                                type="number"
                                className="w-full bg-zinc-900 border border-zinc-700 rounded text-xs px-2 py-1 font-mono text-zinc-300 focus:outline-none focus:border-blue-500"
                                value={activeTrade.maxRiskAmount || ''}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    updateTradeParams({ maxRiskAmount: isNaN(val) ? 0 : val });
                                }}
                            />
                        ) : (
                            <div className="text-sm font-mono font-bold text-zinc-200">${activeTrade.maxRiskAmount}</div>
                        )}
                    </div>
                </div>

                {/* Risk Warning / Summary */}
                <div className={`mt-3 pt-2 border-t border-zinc-900 grid grid-cols-2 gap-2 text-xs`}>
                    <div className={`${riskExceeded ? 'text-red-400' : 'text-zinc-500'}`}>
                        <div className="flex justify-between">
                            <span>Total Risk:</span>
                            <span className="font-bold">{hasValidRisk ? `$${totalRisk.toFixed(0)}` : '---'}</span>
                        </div>
                        <div className="flex justify-between text-[10px] opacity-70">
                            <span>Per Contract:</span>
                            <span>{hasValidRisk ? `$${riskPerContract.toFixed(0)}` : '---'}</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="flex justify-between justify-end gap-2 text-zinc-500">
                            <span>Risk Used:</span>
                            <span className={`${riskExceeded ? 'text-red-500 font-bold' : 'text-zinc-300'}`}>
                                {activeTrade.maxRiskAmount > 0 && hasValidRisk
                                    ? ((totalRisk / activeTrade.maxRiskAmount) * 100).toFixed(0) + '%'
                                    : '---'}
                            </span>
                        </div>
                        {riskExceeded && (
                            <span className="text-[9px] font-bold text-red-500 uppercase flex items-center justify-end gap-1 animate-pulse">
                                <AlertTriangle size={8} /> Exceeds Max
                            </span>
                        )}
                    </div>
                </div>

                {/* Targets R:R */}
                <div className="mt-2 pt-2 border-t border-zinc-900/50">
                    <span className="text-[9px] font-bold text-zinc-600 uppercase">True R:R Targets</span>
                    <div className="flex gap-2 mt-1 overflow-x-auto">
                        {activeTrade.targets.map((t, i) => {
                            const reward = Math.abs(t - (activeTrade.entryPrice || 0));
                            const rr = distToSL > 0 ? reward / distToSL : 0;
                            return (
                                <div key={i} className="px-1.5 py-0.5 bg-zinc-900 rounded border border-zinc-800 text-[10px] whitespace-nowrap">
                                    <span className="text-zinc-500 mr-1">T{i + 1}:</span>
                                    <span className="font-mono text-zinc-300 font-bold">{rr.toFixed(1)}R</span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* --- ACTIONABLE GUIDANCE --- */}
            <div className="space-y-2">
                <div className="text-[10px] font-bold text-zinc-500 uppercase">Guidance Stream</div>
                {activeTrade.state === 'SELECTED' ? (
                    <div className="text-xs text-zinc-400 bg-zinc-900/50 p-2 rounded border border-zinc-800 border-dashed">
                        Waiting for entry confirmation...
                    </div>
                ) : (
                    <GuidanceDisplay activeTrade={activeTrade} data={data} />
                )}
            </div>


            {/* Close Button if selected (Reset) */}
            {activeTrade.state === 'SELECTED' && (
                <div className="mt-4 text-center">
                    <button onClick={closeTrade} className="text-[10px] text-zinc-600 hover:text-zinc-400 underline">
                        Cancel Setup
                    </button>
                </div>
            )}
        </div>
    );
}
