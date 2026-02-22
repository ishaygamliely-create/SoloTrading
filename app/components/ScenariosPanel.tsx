'use client';

import React, { useState, useEffect } from 'react';
import { Target, Shield, Info, X, CheckCircle2, Clock, TrendingUp, TrendingDown, Play, Layers, Zap, AlertCircle, Activity, ChevronRight, BarChart3, Fingerprint } from 'lucide-react';
import { useActiveTrade } from '../context/ActiveTradeContext';
import { PanelProps } from './DashboardPanels';

export function ScenariosPanel({ data, loading, timeframe }: PanelProps) {
    const { saveTrade, isSaved } = useActiveTrade();
    const [showGuide, setShowGuide] = useState(false);
    const [detailScenario, setDetailScenario] = useState<any>(null);

    // Auto-update timer for TTL
    const [now, setNow] = useState(Math.floor(Date.now() / 1000));
    useEffect(() => {
        const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
        return () => clearInterval(interval);
    }, []);

    if (loading || !data?.analysis?.scenarios) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse bg-zinc-900/50 h-56 rounded-2xl border border-white/5 shadow-xl"></div>
                ))}
            </div>
        );
    }

    const scenarios = data.analysis.scenarios || [];
    const activeScenarios = scenarios.filter((s: any) => !s.expires_at || s.expires_at > now);

    if (activeScenarios.length === 0) {
        return (
            <div className="bg-zinc-900/30 border border-white/5 p-8 rounded-2xl text-center flex flex-col items-center justify-center min-h-[220px] shadow-inner">
                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/5">
                    <Shield className="text-zinc-700" size={24} />
                </div>
                <h3 className="text-zinc-500 font-bold text-sm mb-1 uppercase tracking-widest">Scanning Market Structure</h3>
                <p className="text-zinc-700 text-[10px] uppercase font-bold tracking-wider">No active institutional models detected yet</p>
            </div>
        );
    }

    return (
        <div className="relative group/panel">
            {/* Background Glow - Unified VXR Style */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none opacity-40 group-hover/panel:opacity-60 transition-opacity duration-1000" />

            {/* Panel Header - VXR HUD Style */}
            <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-500 flex items-center justify-center transition-all duration-500 group-hover/panel:bg-amber-500/20">
                        <Zap size={20} strokeWidth={2.5} />
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black text-amber-500 uppercase tracking-[0.3em] leading-none">INSTITUTIONAL MODELS</span>
                            <button
                                onClick={() => setShowGuide(true)}
                                className="text-zinc-500 hover:text-white transition-colors"
                            >
                                <Info size={12} />
                            </button>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-bold uppercase mt-1.5 tracking-wider">Scenarios & Actionable Triggers</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-xl border border-white/10 shadow-inner">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">REAL-TIME SCANNER</span>
                    </div>
                    <div className="hidden md:flex items-center gap-2 bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/20 text-amber-400">
                        <Activity size={12} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{activeScenarios.length} DETECTED</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 w-full relative z-10 p-1">
                {activeScenarios.map((scenario: any, i: number) => {
                    const isLong = scenario.direction === 'LONG';
                    const isPrimary = scenario.isPrimary;
                    const saved = isSaved(scenario.id);
                    const scorecard = scenario.confidence?.scorecard;
                    const score = scenario.confidence?.score || 0;
                    const scoreColor = score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-zinc-500';
                    const hasVxrMagnet = scorecard?.components?.some((c: any) => c.label === 'VXR Magnet');

                    // TTL
                    const timeLeft = scenario.expires_at ? Math.max(0, scenario.expires_at - now) : 0;
                    const mins = Math.floor(timeLeft / 60);
                    const secs = timeLeft % 60;

                    const stateLabel = scenario.state === 'ACTIONABLE' ? 'ACTIVE' :
                        scenario.state === 'PENDING' ? 'WAITING' :
                            scenario.state === 'INVALID' ? 'STOPPED' : 'WAITING';

                    return (
                        <div
                            key={i}
                            onClick={() => setDetailScenario(scenario)}
                            className={`group relative flex flex-col rounded-3xl border transition-all duration-500 overflow-hidden cursor-pointer
                                ${isPrimary
                                    ? 'bg-zinc-950/60 border-amber-500/40 shadow-[0_20px_40px_rgba(0,0,0,0.3),0_0_20px_rgba(245,158,11,0.05)]'
                                    : 'bg-zinc-900/60 border-white/5 hover:border-white/20 shadow-xl'}`}
                        >
                            {/* Accent Glow Line */}
                            <div className={`absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent ${isPrimary ? 'via-amber-500/50' : 'via-blue-500/20'} to-transparent opacity-50`} />

                            {/* Background Radial Shade */}
                            <div className={`absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-[60px] opacity-10 transition-opacity duration-500 group-hover:opacity-20 pointer-events-none ${isLong ? 'bg-emerald-500' : 'bg-red-500'}`} />

                            {/* Header Section: Badges & Rating */}
                            <div className="p-5 pb-0 flex-1 relative z-10">
                                <div className="flex justify-between items-start gap-3 mb-5">
                                    <div className="flex flex-col gap-2.5 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            {isPrimary && (
                                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-[9px] font-black text-amber-400 uppercase tracking-widest shadow-sm">
                                                    <Target size={10} strokeWidth={3} /> PRIMARY
                                                </div>
                                            )}
                                            {hasVxrMagnet && (
                                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-[9px] font-black text-cyan-400 uppercase tracking-widest shadow-sm">
                                                    <Layers size={10} strokeWidth={3} /> MAGNET
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 transition-transform duration-500 group-hover:translate-x-1">
                                            <span className={`text-base font-black uppercase tracking-tight flex items-center gap-2 shrink-0 ${isLong ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {isLong ? <TrendingUp size={18} strokeWidth={3} /> : <TrendingDown size={18} strokeWidth={3} />}
                                                {scenario.direction}
                                            </span>
                                            <span className="text-[10px] bg-white/5 px-2.5 py-0.5 rounded-lg text-zinc-500 font-black border border-white/10 shrink-0 tracking-widest uppercase">
                                                {scenario.timeframe || timeframe}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Rating Display */}
                                    <div className="flex flex-col items-end shrink-0">
                                        <div className={`text-2xl font-black ${scoreColor} tracking-tighter leading-none mb-1`}>
                                            {score}
                                        </div>
                                        <div className={`text-[9px] font-black uppercase tracking-widest ${scoreColor}`}>
                                            RATING {scenario.confidence?.rating || 'C'}
                                        </div>
                                    </div>
                                </div>

                                {/* Model Name & Status */}
                                <div className="mb-5">
                                    <h4 className="text-white font-black text-base uppercase tracking-tight leading-none mb-2">
                                        {(scenario.type || 'Institutional Model').replace(/_/g, ' ')}
                                    </h4>
                                    <div className="flex items-center gap-2.5">
                                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-colors duration-500
                                            ${scenario.state === 'ACTIONABLE'
                                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                                : scenario.state === 'INVALID'
                                                    ? 'bg-red-500/20 text-red-300 border-red-500/30'
                                                    : 'bg-zinc-800/50 text-zinc-500 border-zinc-700/50'}`}>
                                            {stateLabel}
                                        </span>
                                        <span className="text-zinc-400 text-[10px] font-bold truncate max-w-[180px] tracking-wide">
                                            {scenario.condition}
                                        </span>
                                    </div>
                                </div>

                                {/* HTF Correlation */}
                                <div className="mb-5 flex items-center justify-between p-2.5 rounded-2xl bg-black/40 border border-white/5 gap-2 group-hover:border-white/10 transition-colors">
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Activity size={12} className="text-zinc-600" />
                                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">HTF BIAS</span>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-end gap-2 text-right">
                                        <span className={`text-[10px] font-black uppercase whitespace-nowrap ${scenario.htfBias?.includes('BULL') ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {scenario.htfBias || 'NEUTRAL'}
                                        </span>
                                        {scenario.biasAlignment === 'CONTRARIAN' && (
                                            <span className="text-[8px] px-2 py-0.5 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30 font-black uppercase whitespace-nowrap tracking-widest shadow-sm">
                                                CONTRARIAN
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Entry/Stop Grid */}
                                <div className="grid grid-cols-2 gap-3 mb-5">
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-2xl group/sub hover:bg-emerald-500/15 transition-colors overflow-hidden">
                                        <span className="text-[7px] font-black text-emerald-500/80 uppercase tracking-widest block mb-1 flex items-center gap-1">
                                            <Fingerprint size={8} /> ENTRY
                                        </span>
                                        <span className="text-xs font-mono font-black text-emerald-100 tabular-nums truncate">{(scenario.entryZone?.min || 0).toFixed(1)}</span>
                                    </div>
                                    <div className="bg-red-500/10 border border-red-500/20 p-2.5 rounded-2xl group/sub hover:bg-red-500/15 transition-colors text-right overflow-hidden">
                                        <span className="text-[7px] font-black text-red-500/80 uppercase tracking-widest block mb-1 flex items-center gap-1 justify-end">
                                            STOP LOSS <Shield size={8} />
                                        </span>
                                        <span className="text-xs font-mono font-black text-red-100 tabular-nums truncate">{(scenario.stopLoss || 0).toFixed(1)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Footer: Timer & Action */}
                            <div className="p-5 pt-4 border-t border-white/10 flex items-center justify-between bg-black/30 relative z-10">
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-zinc-400 font-mono text-[10px] font-black tracking-wider shadow-inner">
                                    <Clock size={12} className="text-zinc-600" />
                                    <span>{mins}m {secs.toString().padStart(2, '0')}s</span>
                                </div>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!saved) saveTrade(scenario);
                                    }}
                                    disabled={saved}
                                    className={`relative flex items-center gap-2 px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg
                                        ${saved
                                            ? 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                                            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20 border border-blue-400/30'}`}
                                >
                                    {saved ? <CheckCircle2 size={14} /> : <Play size={12} fill="currentColor" />}
                                    {saved ? 'ACTIVE' : 'EXECUTE'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Scenario Detail Overlay */}
            {detailScenario && (
                <div className="fixed inset-0 z-[120] bg-zinc-950/98 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-500 p-6 md:p-12 flex items-center justify-center">
                    <div className="max-w-3xl w-full bg-zinc-900 border border-white/10 rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh] relative">
                        {/* Background Decorative Glow */}
                        <div className={`absolute top-0 right-0 w-96 h-96 blur-[150px] opacity-10 pointer-events-none ${detailScenario.direction === 'LONG' ? 'bg-emerald-500' : 'bg-red-500'}`} />

                        {/* Detail Header */}
                        <div className="p-10 pb-8 border-b border-white/10 flex justify-between items-start relative z-10">
                            <div className="flex items-center gap-6">
                                <div className={`p-5 rounded-[2rem] border shadow-2xl transition-all duration-700 ${detailScenario.direction === 'LONG' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                    {detailScenario.direction === 'LONG' ? <TrendingUp size={36} strokeWidth={3} /> : <TrendingDown size={36} strokeWidth={3} />}
                                </div>
                                <div className="text-left">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">
                                            {(detailScenario.type || 'Institutional Model').replace(/_/g, ' ')}
                                        </h3>
                                        <span className="text-[10px] bg-white/5 px-3 py-1 rounded-lg text-zinc-400 font-black border border-white/10 uppercase tracking-widest">
                                            {detailScenario.timeframe || timeframe}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${detailScenario.direction === 'LONG' ? 'text-emerald-400' : 'text-red-400'}`}>
                                            Institutional {detailScenario.direction} Alignment
                                        </span>
                                        <div className="w-1 h-1 bg-zinc-700 rounded-full" />
                                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${detailScenario.state === 'ACTIONABLE' ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                            State: {detailScenario.state || 'PENDING'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setDetailScenario(null)}
                                className="p-4 bg-white/5 hover:bg-white/10 rounded-full text-zinc-400 transition-all hover:scale-110 active:scale-90 border border-white/10"
                            >
                                <X size={28} />
                            </button>
                        </div>

                        {/* Detail Body */}
                        <div className="flex-1 overflow-y-auto p-10 pt-8 space-y-10 scrollbar-hide relative z-10">
                            {/* Execution Condition */}
                            <div className="bg-zinc-950/70 rounded-[2rem] p-8 border border-white/5 shadow-inner">
                                <div className="flex items-center gap-3 mb-5">
                                    <Fingerprint size={18} className="text-blue-500" />
                                    <span className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.3em]">Institutional Execution Protocol</span>
                                </div>
                                <p className="text-2xl md:text-3xl font-black text-white leading-[1.15] tracking-tight text-left">
                                    {detailScenario.condition || 'No specific trigger condition identified.'}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Levels Drilldown */}
                                <div className="space-y-5">
                                    <div className="flex items-center gap-3 px-2">
                                        <Target size={18} className="text-amber-400" />
                                        <span className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em]">Deployment zones</span>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="bg-emerald-500/5 border border-emerald-500/20 p-5 rounded-3xl flex justify-between items-center group transition-all hover:bg-emerald-500/10">
                                            <span className="text-[11px] font-black text-emerald-500/70 uppercase tracking-widest">Initial Entry</span>
                                            <span className="text-xl font-mono font-black text-emerald-400 group-hover:scale-105 transition-transform">{(detailScenario.entryZone?.min || 0).toFixed(1)}</span>
                                        </div>
                                        <div className="bg-red-500/5 border border-red-500/20 p-5 rounded-3xl flex justify-between items-center group transition-all hover:bg-red-500/10">
                                            <span className="text-[11px] font-black text-red-500/70 uppercase tracking-widest">Hard Invalidation</span>
                                            <span className="text-xl font-mono font-black text-red-400 group-hover:scale-105 transition-transform">{(detailScenario.stopLoss || 0).toFixed(1)}</span>
                                        </div>
                                    </div>

                                    <div className="pt-4 space-y-3">
                                        {(detailScenario.targets || []).map((t: any, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center px-6 py-4 rounded-3xl bg-white/5 border border-white/5 hover:border-emerald-500/20 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-8 h-8 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xs font-black text-emerald-400 shadow-sm">
                                                        {idx + 1}
                                                    </div>
                                                    <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Objective T{idx + 1}</span>
                                                </div>
                                                <span className="text-xl font-mono font-black text-emerald-400">{(t.price || 0).toFixed(1)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Scorecard & Analysis */}
                                <div className="space-y-5">
                                    <div className="flex items-center gap-3 px-2">
                                        <BarChart3 size={18} className="text-cyan-400" />
                                        <span className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em]">Confluence Matrix</span>
                                    </div>
                                    <div className="bg-zinc-950/40 border border-white/10 rounded-3xl p-8 h-full shadow-inner flex flex-col">
                                        <div className="mb-10 flex justify-between items-end">
                                            <div>
                                                <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Institutional Rating</div>
                                                <div className={`text-6xl font-black tracking-tighter ${detailScenario.confidence?.score >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                    {detailScenario.confidence?.rating || 'C'}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Integrity Score</div>
                                                <div className="text-3xl font-mono font-black text-white">{detailScenario.confidence?.score || 0}%</div>
                                            </div>
                                        </div>
                                        <div className="space-y-5 flex-1">
                                            {detailScenario.confidence?.scorecard?.components?.map((c: any, idx: number) => (
                                                <div key={idx} className="flex flex-col gap-2">
                                                    <div className="flex justify-between items-center text-[12px]">
                                                        <span className="text-zinc-400 font-black uppercase tracking-tight">{c.label}</span>
                                                        <span className={`font-mono font-black ${c.points > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                            {c.points > 0 ? '+' : ''}{c.points}
                                                        </span>
                                                    </div>
                                                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden shadow-inner">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-1000 ${c.points > 0 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-red-500 opacity-50'}`}
                                                            style={{ width: `${Math.abs(c.points) * 10}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Detail Footer */}
                        <div className="p-10 bg-zinc-950/80 border-t border-white/10 flex gap-6 relative z-10">
                            <button
                                onClick={() => setDetailScenario(null)}
                                className="flex-1 py-5 bg-white/5 hover:bg-white/10 text-zinc-400 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all border border-white/10"
                            >
                                Reject Analysis
                            </button>
                            <button
                                onClick={() => {
                                    if (!isSaved(detailScenario.id)) saveTrade(detailScenario);
                                    setDetailScenario(null);
                                }}
                                disabled={isSaved(detailScenario.id)}
                                className={`flex-[2] py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all shadow-2xl flex items-center justify-center gap-4
                                    ${isSaved(detailScenario.id)
                                        ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30 border border-blue-400/30 active:scale-[0.98]'}`}
                            >
                                {isSaved(detailScenario.id) ? (
                                    <>
                                        <CheckCircle2 size={20} />
                                        Protocol Initialized
                                    </>
                                ) : (
                                    <>
                                        <Play size={18} fill="currentColor" />
                                        Execute Action Protocol
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hebrew Trade Guide Overlay - VXR Fullscreen Style */}
            {showGuide && (
                <div className="fixed inset-0 z-[130] bg-zinc-950/98 backdrop-blur-3xl animate-in fade-in duration-500 p-6 flex flex-col items-center justify-center">
                    <div className="max-w-2xl w-full bg-zinc-900 border border-white/10 rounded-[2.5rem] p-10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-y-auto max-h-[90vh] text-right relative overflow-hidden" dir="rtl">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                        <div className="flex justify-between items-center mb-10 border-b border-white/10 pb-6 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20">
                                    <Info size={24} className="text-white" />
                                </div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tight">מדריך ביצוע (Scenarios)</h3>
                            </div>
                            <button
                                onClick={() => setShowGuide(false)}
                                className="p-3 hover:bg-white/10 rounded-full text-zinc-500 transition-all hover:scale-110 border border-white/10"
                            >
                                <X size={28} />
                            </button>
                        </div>

                        <div className="space-y-8 relative z-10">
                            <section>
                                <h4 className="text-amber-400 font-black text-[11px] mb-3 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Target size={14} /> 1. דירוג התרחיש (Scoring)
                                </h4>
                                <p className="text-zinc-400 text-[13px] leading-relaxed font-bold">
                                    הציון (Integrity Score) מודד את איכות המודל המוסדי.
                                    <br /><br />
                                    <span className="text-emerald-400 font-black">A / 80+</span>: וודאות גבוהה. כל חלקי הפאזל המוסדי (נזילות, SMT, VXR) מתואמים.
                                    <br />
                                    <span className="text-amber-400 font-black">B / 50-70</span>: תרחיש סביר. דורש המתנה אקטיבית לטריגר בגרף לפני ביצוע.
                                </p>
                            </section>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 p-5 rounded-3xl border border-white/10 shadow-inner">
                                    <span className="text-amber-400 font-black text-[10px] block mb-2 tracking-widest">PRIMARY</span>
                                    <p className="text-[12px] text-zinc-400 font-bold leading-snug">המודל בעל רמת הדיוק הגבוהה ביותר בסשן הנוכחי.</p>
                                </div>
                                <div className="bg-white/5 p-5 rounded-3xl border border-white/10 shadow-inner text-right">
                                    <span className="text-cyan-400 font-black text-[10px] block mb-2 tracking-widest text-left">MAGNET</span>
                                    <p className="text-[12px] text-zinc-400 font-bold leading-snug">קיימת צפיפות נזילות גבוהה ביעדים, שמושכת את המחיר "כמו מגנט".</p>
                                </div>
                            </div>

                            <section>
                                <h4 className="text-purple-400 font-black text-[11px] mb-3 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Activity size={14} /> 2. עסקאות נגד המגמה (Contrarian)
                                </h4>
                                <div className="bg-purple-600/5 border border-purple-500/20 p-5 rounded-3xl">
                                    <p className="text-zinc-300 text-[13px] leading-relaxed font-medium">
                                        כשתיוג <span className="text-purple-400 font-black">CONTRARIAN</span> מופיע, המודל מזהה הזדמנות להיפוך (Counter-trend).
                                        אלו עסקאות שדורשות ניהול סיכונים הדוק יותר ואישור כפול במדד ה-SMT.
                                    </p>
                                </div>
                            </section>

                            <section className="bg-blue-600/10 border border-blue-500/20 p-6 rounded-[2rem]">
                                <div className="flex items-center gap-3 mb-3">
                                    <Zap size={18} className="text-blue-400 animate-pulse" />
                                    <span className="font-black text-blue-400 text-[11px] uppercase tracking-widest">פרוטוקול ביצוע (Execute)</span>
                                </div>
                                <p className="text-zinc-200 text-[13px] leading-relaxed font-bold italic">
                                    כפתור ה-EXECUTE נועל את התרחיש המוסדי להמשך מעקב וניהול בלוח הבחירה. ברגע ההפעלה, המערכת תסנכרן את כל המדדים לטרייד הנבחר ותספק התראות ניהול סיכון בזמן אמת.
                                </p>
                            </section>
                        </div>

                        <button
                            onClick={() => setShowGuide(false)}
                            className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-sm uppercase tracking-[0.3em] transition-all mt-10 shadow-2xl shadow-blue-600/20 active:scale-[0.98] border border-blue-400/30"
                        >
                            הבנתי, חזרה למערכת
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// Activity component remains imported from lucide-react in ScenariosPanel.tsx
