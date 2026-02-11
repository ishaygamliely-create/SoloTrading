import React, { useState, useEffect } from 'react';
import { Target, Shield, AlertTriangle, CheckCircle2, Clock, Timer, TrendingUp, TrendingDown, ChevronUp, ChevronDown, AlertOctagon, Play } from 'lucide-react';
import { useActiveTrade } from '../context/ActiveTradeContext';
import { PanelProps } from './DashboardPanels';
export function ScenariosPanel({ data, loading, timeframe }: PanelProps) {
    const { saveTrade, isSaved } = useActiveTrade();
    if (loading || !data?.analysis?.scenarios) return <div className="animate-pulse bg-zinc-900 h-48 rounded-xl border border-zinc-800"></div>;

    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [now, setNow] = useState(Math.floor(Date.now() / 1000));

    // Update current time every second for countdown
    useEffect(() => {
        const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
        return () => clearInterval(interval);
    }, []);

    const scenarios = data.analysis.scenarios;
    // Filter expired scenarios
    const activeScenarios = scenarios.filter((s: any) => !s.expires_at || s.expires_at > now);

    // Initial Filter Check
    if (activeScenarios.length === 0) {
        return (
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl text-center flex flex-col items-center justify-center h-full min-h-[200px]">
                <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle className="text-zinc-500" size={24} />
                </div>
                <h3 className="text-zinc-400 font-bold mb-2">No Active Setups</h3>
                <p className="text-zinc-600 text-sm max-w-xs">
                    Waiting for high probability scenarios...
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
            {activeScenarios.map((scenario: any, i: number) => {
                const isLong = scenario.direction === 'LONG';
                const isPrimary = scenario.isPrimary;
                const isExpanded = expandedId === i;
                const saved = isSaved(scenario.id);

                // TTL Calculation
                const timeLeft = scenario.expires_at ? Math.max(0, scenario.expires_at - now) : 0;
                const mins = Math.floor(timeLeft / 60);
                const secs = timeLeft % 60;
                const isExpiringSoon = timeLeft < 60;

                // Focus Guard: Opacity for Secondary
                // If there is ANY primary scenario, dim the others more aggressively
                const hasPrimary = activeScenarios.some((s: any) => s.isPrimary);
                const isDimmed = (hasPrimary && !isPrimary);

                // Dynamic Styles
                let borderColorState = 'border-zinc-800';
                let shadowClass = '';
                let opacityClass = isDimmed ? 'opacity-50 hover:opacity-100 transition-opacity' : 'opacity-100';

                if (isPrimary) {
                    borderColorState = 'border-yellow-500/60 ring-1 ring-yellow-500/20';
                    shadowClass = 'shadow-[0_0_20px_-5px_rgba(234,179,8,0.15)]';
                } else if (scenario.state === 'ACTIONABLE' && !isDimmed) {
                    borderColorState = 'border-emerald-500/40';
                    shadowClass = 'shadow-[0_0_15px_-5px_rgba(16,185,129,0.1)]';
                } else if (scenario.state === 'PENDING') {
                    borderColorState = 'border-amber-500/30 border-dashed';
                }

                // Confidence Color Logic
                const score = scenario.confidence?.score || 0;
                let scoreColor = 'text-zinc-400';
                if (score >= 90) scoreColor = 'text-emerald-400';
                else if (score >= 75) scoreColor = 'text-green-400';
                else if (score >= 50) scoreColor = 'text-amber-400';
                else scoreColor = 'text-red-400';

                const bgGradient = isLong
                    ? `bg-gradient-to-br from-zinc-900 ${isPrimary ? 'to-yellow-950/10' : 'to-green-950/5'}`
                    : `bg-gradient-to-br from-zinc-900 ${isPrimary ? 'to-yellow-950/10' : 'to-red-950/5'}`;

                const textColor = isLong ? 'text-green-400' : 'text-red-400';

                return (
                    <div key={i} className={`bg-zinc-900 border ${borderColorState} ${shadowClass} ${opacityClass} rounded-xl p-5 relative overflow-hidden group transition-all duration-300 ${bgGradient} flex flex-col`}>

                        {/* Primary Badge */}
                        {isPrimary && (
                            <div className="absolute top-0 right-0 bg-yellow-500/20 border-b border-l border-yellow-500/30 px-2 py-0.5 rounded-bl-lg backdrop-blur-sm z-20">
                                <span className="text-[10px] font-black text-yellow-400 flex items-center gap-1">
                                    <Target size={10} /> PRIMARY
                                </span>
                            </div>
                        )}

                        {/* Top Row: Direction & Timeframe */}
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-xs font-black uppercase tracking-wider ${textColor} flex items-center gap-1.5`}>
                                        {isLong ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                        {scenario.direction}
                                    </span>
                                    <span className="px-1.5 py-0.5 bg-zinc-800/80 rounded text-[10px] text-zinc-400 font-mono border border-zinc-700 flex items-center gap-1">
                                        <Clock size={10} /> {scenario.timeframe || timeframe}
                                    </span>
                                </div>
                                <h3 className="text-zinc-200 font-bold text-sm">{scenario.type.replace('_', ' ')}</h3>

                                {/* Status & Condition */}
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className={`text-[10px] font-black uppercase ${scenario.state === 'ACTIONABLE' ? 'text-emerald-400' : scenario.state === 'PENDING' ? 'text-amber-400' : 'text-zinc-500'}`}>
                                        {scenario.executionType}
                                    </span>
                                    <span className="text-zinc-600 text-[10px]">•</span>
                                    <p className={`${scenario.state === 'PENDING' ? 'text-amber-500/80' : 'text-zinc-500'} text-[10px] font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]`}>
                                        {scenario.condition}
                                    </p>
                                </div>
                            </div>

                            {/* Confidence Score Display */}
                            <div className="flex flex-col items-end gap-1 mt-6">
                                <div className="flex flex-col items-end cursor-pointer group/score" onClick={() => setExpandedId(isExpanded ? null : i)}>
                                    <span className={`text-lg font-black leading-none ${scoreColor} group-hover/score:opacity-80 transition-opacity`}>
                                        {score}<span className="text-[10px] opacity-60">/100</span>
                                    </span>
                                    <span className={`text-[9px] font-bold uppercase tracking-wider opacity-80 ${scoreColor} flex items-center gap-1`}>
                                        Grade {scenario.confidence?.rating || 'C'}
                                        {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* R:R Watermark */}
                        {!isExpanded && (
                            <div className="absolute top-12 right-2 opacity-[0.03] font-black text-6xl pointer-events-none transition-opacity duration-300">
                                {scenario.rr.toFixed(1)}R
                            </div>
                        )}

                        {/* State Banner */}
                        <div className="flex justify-between items-center mb-3">
                            {scenario.state === 'ACTIONABLE' ? (
                                <div className="px-2 py-1 bg-emerald-950/30 border border-emerald-500/20 rounded flex items-center gap-2">
                                    <CheckCircle2 size={12} className="text-emerald-400" />
                                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">Actionable</span>
                                </div>
                            ) : (
                                <div className="px-2 py-1 bg-amber-950/20 border border-amber-500/20 rounded flex items-center gap-2">
                                    <Clock size={12} className="text-amber-400" />
                                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">Pending</span>
                                </div>
                            )}

                            {/* TTL Timer */}
                            {scenario.expires_at && (
                                <div className={`px-2 py-1 rounded border flex items-center gap-1.5 text-[10px] font-mono ${isExpiringSoon ? 'bg-red-950/30 border-red-500/30 text-red-400' : 'bg-zinc-950/30 border-zinc-800 text-zinc-500'}`}>
                                    <Timer size={10} />
                                    <span>{mins}m {secs.toString().padStart(2, '0')}s</span>
                                </div>
                            )}
                        </div>

                        {/* Scorecard Expansion */}
                        {isExpanded ? (
                            <div className="mb-4 bg-zinc-950/80 rounded-lg p-3 border border-zinc-800 animate-in fade-in slide-in-from-top-2 duration-200">
                                {/* Conflict Header if exists */}
                                {scenario.confidence?.scorecard?.conflict?.detected && (
                                    <div className="mb-3 pb-2 border-b border-red-500/20">
                                        <div className="flex items-center gap-1.5 text-red-400 mb-1">
                                            <AlertOctagon size={12} />
                                            <span className="text-[10px] font-black uppercase">Conflict Detected</span>
                                        </div>
                                        <p className="text-[10px] text-zinc-400 leading-snug">
                                            {scenario.confidence.scorecard.conflict.reason}
                                        </p>
                                        <div className="mt-1 flex items-center gap-1">
                                            <span className="text-[9px] text-zinc-500">Resolution:</span>
                                            <span className="text-[9px] font-bold text-zinc-300 bg-zinc-800/50 px-1 rounded">
                                                {scenario.confidence.scorecard.conflict.dominantLayer} Wins
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Components List */}
                                <div className="space-y-1.5">
                                    {scenario.confidence?.scorecard?.components ? (
                                        [...scenario.confidence.scorecard.components]
                                            .sort((a: any, b: any) => Math.abs(b.points) - Math.abs(a.points))
                                            .map((comp: any, idx: number) => (
                                                <div key={idx} className="flex justify-between items-start group/comp">
                                                    <div>
                                                        <div className="text-[10px] font-semibold text-zinc-300">{comp.label}</div>
                                                        {comp.reason && (
                                                            <div className="text-[9px] text-zinc-600 hidden group-hover/comp:block transition-all">{comp.reason}</div>
                                                        )}
                                                    </div>
                                                    <span className={`text-[10px] font-mono font-bold ${comp.points > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                        {comp.points > 0 ? '+' : ''}{comp.points}
                                                    </span>
                                                </div>
                                            ))
                                    ) : (
                                        <div className="text-[10px] text-zinc-500 italic text-center py-2">Scorecard Unavailable</div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* Collapsed Context View */
                            <div className="mb-3 px-2 py-1 bg-zinc-950/50 border border-zinc-800 rounded flex justify-between items-center hover:bg-zinc-900/80 transition-colors cursor-pointer" onClick={() => setExpandedId(i)}>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-zinc-500 font-mono">HTF Bias:</span>
                                    <span className={`text-[10px] font-bold ${scenario.htfBias?.includes('BULL') ? 'text-green-500' : 'text-red-500'}`}>
                                        {scenario.htfBias || 'N/A'}
                                    </span>
                                </div>

                                {scenario.biasAlignment === 'CONTRARIAN' && (
                                    <div className="bg-purple-900/30 text-purple-400 border border-purple-500/20 text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider flex items-center gap-1">
                                        <AlertTriangle size={8} /> Counter-Trend
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ACTIVATE BUTTON (Visible on Expand or Hover) */}
                        <div className={`mt-3 pt-3 border-t border-zinc-800/50 flex justify-end ${isExpanded ? 'block' : 'hidden group-hover:flex'}`}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (!saved) saveTrade(scenario);
                                }}
                                disabled={saved}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all transform flex items-center gap-2 ${saved
                                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                    : isLong
                                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 hover:scale-105 active:scale-95'
                                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 hover:scale-105 active:scale-95'
                                    }`}
                            >
                                <Play size={10} fill="currentColor" className={saved ? 'hidden' : ''} />
                                {saved ? 'Saved' : 'Save Setup'}
                            </button>
                        </div>


                        {/* Trade Parameters */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3 relative z-10 flex-1 content-start">
                            {/* Entry */}
                            <div className={`bg-zinc-950/50 rounded p-2 border ${scenario.state === 'ACTIONABLE' ? 'border-emerald-500/30 ring-1 ring-emerald-500/10' : 'border-zinc-800/50'}`}>
                                <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1 flex items-center gap-1">
                                    <Target size={10} /> Entry Zone
                                </div>
                                <div className={`font-mono text-sm font-bold ${scenario.state === 'ACTIONABLE' ? 'text-emerald-300' : 'text-zinc-300'}`}>
                                    {scenario.entryZone.min.toFixed(2)} - {scenario.entryZone.max.toFixed(2)}
                                </div>
                            </div>

                            {/* Stop Loss */}
                            <div className="bg-red-950/10 rounded p-2 border border-red-900/20">
                                <div className="text-[10px] text-red-500/70 uppercase font-bold mb-1 flex items-center gap-1">
                                    <Shield size={10} /> Stop Loss
                                </div>
                                <div className="font-mono text-red-400 text-sm font-bold">
                                    {scenario.stopLoss.toFixed(2)}
                                </div>
                            </div>
                        </div>

                        {/* Targets list */}
                        <div className="mt-3 pt-3 border-t border-zinc-800/50 relative z-10">
                            <div className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Targets</div>
                            <div className="space-y-1.5">
                                {scenario.targets.map((t: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${isLong ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                                                {idx + 1}
                                            </span>
                                            <span className="text-zinc-400 text-[10px]">{t.desc}</span>
                                        </div>
                                        <span className={`font-mono font-bold ${isLong ? 'text-green-500' : 'text-red-500'}`}>
                                            {t.price.toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer: R:R & Warnings */}
                        <div className="mt-3 pt-2 border-t border-zinc-800/30 flex justify-between items-center">
                            <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                                <span>R:R</span>
                                <span className={`font-bold px-1.5 py-0.5 rounded ${scenario.rr > 8 ? 'bg-yellow-900/20 text-yellow-500' : 'bg-zinc-800 text-zinc-300'}`}>
                                    1:{scenario.rr.toFixed(2)}
                                </span>
                            </div>

                            {/* Warnings / Notes */}
                            {(scenario.note || scenario.rrWarning) && (
                                <div className="flex items-center gap-1 text-[9px] text-orange-400 font-bold bg-orange-950/30 px-1.5 py-0.5 rounded border border-orange-500/20">
                                    <AlertTriangle size={8} />
                                    {scenario.rrWarning || 'Confirm'}
                                </div>
                            )}
                        </div>
                        {/* Contrarian Note specifically if needed */}
                        {scenario.note && !isExpanded && (
                            <div className="mt-2 text-[9px] text-zinc-500 italic text-center">
                                {scenario.note}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
