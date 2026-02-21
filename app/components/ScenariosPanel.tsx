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
        <div className="relative">
            {/* Panel Header with Info Trigger */}
            <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">
                    <Zap size={16} className="text-amber-400" />
                    <h2 className="text-xs font-black text-white uppercase tracking-[0.2em]">Actionable Scenarios</h2>
                </div>
                <button
                    onClick={() => setShowGuide(true)}
                    className="p-1.5 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-white transition-colors"
                >
                    <Info size={16} />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 w-full">
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

                    return (
                        <div
                            key={i}
                            onClick={() => setDetailScenario(scenario)}
                            className={`group relative flex flex-col rounded-2xl border transition-all duration-300 overflow-hidden cursor-pointer
                                ${isPrimary
                                    ? 'bg-zinc-950/40 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.05)]'
                                    : 'bg-zinc-900/40 border-white/5 hover:border-white/10'}`}
                        >
                            {/* Accent Glow Line */}
                            <div className={`absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent ${isPrimary ? 'via-amber-500/30' : 'via-blue-500/10'} to-transparent`} />

                            {/* Header Section: Badges & Rating */}
                            <div className="p-4 pb-0 flex-1">
                                <div className="flex justify-between items-start gap-3 mb-4">
                                    <div className="flex flex-col gap-2 min-w-0">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {isPrimary && (
                                                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[8px] font-black text-amber-400 uppercase tracking-widest shrink-0">
                                                    <Target size={8} /> PRIMARY
                                                </div>
                                            )}
                                            {hasVxrMagnet && (
                                                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-[8px] font-black text-cyan-400 uppercase tracking-widest shrink-0">
                                                    <Layers size={8} /> MAGNET
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 transition-transform group-hover:translate-x-0.5">
                                            <span className={`text-sm font-black uppercase tracking-tight flex items-center gap-1.5 shrink-0 ${isLong ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {isLong ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                                {scenario.direction}
                                            </span>
                                            <span className="text-[9px] bg-white/5 px-2 py-0.5 rounded text-zinc-500 font-bold border border-white/5 shrink-0">
                                                {scenario.timeframe || timeframe}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Rating Display */}
                                    <div className="flex flex-col items-end shrink-0">
                                        <div className={`text-2xl font-black ${scoreColor} tracking-tighter leading-none`}>
                                            {score}
                                        </div>
                                        <div className={`text-[8px] font-black uppercase tracking-widest opacity-60 ${scoreColor}`}>
                                            RATING {scenario.confidence?.rating || 'C'}
                                        </div>
                                    </div>
                                </div>

                                {/* Model Name & Status */}
                                <div className="mb-4">
                                    <h4 className="text-white font-black text-sm uppercase tracking-tight leading-none mb-1.5">
                                        {scenario.type.replace(/_/g, ' ')}
                                    </h4>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-1.5 py-0.5 rounded-[4px] text-[8px] font-black uppercase tracking-widest border
                                            ${scenario.state === 'ACTIONABLE'
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                : 'bg-zinc-800 text-zinc-500 border-zinc-700/50'}`}>
                                            {scenario.state === 'ACTIONABLE' ? 'ACTIVE' : 'WAITING'}
                                        </span>
                                        <span className="text-zinc-600 text-[9px] font-medium truncate max-w-[140px]">
                                            {scenario.condition}
                                        </span>
                                    </div>
                                </div>

                                {/* HTF Correlation */}
                                <div className="mb-4 flex items-center justify-between p-2 rounded-xl bg-black/20 border border-white/5 gap-2">
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <Activity size={10} className="text-zinc-600" />
                                        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">HTF Bias</span>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-end gap-1.5 text-right overflow-hidden">
                                        <span className={`text-[9px] font-black uppercase whitespace-nowrap ${scenario.htfBias?.includes('BULL') ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {scenario.htfBias || 'NEUTRAL'}
                                        </span>
                                        {scenario.biasAlignment === 'CONTRARIAN' && (
                                            <span className="text-[8px] px-1 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-black uppercase whitespace-nowrap">
                                                CONTRARIAN
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Entry/Stop Grid */}
                                <div className="grid grid-cols-2 gap-2.5 mb-4">
                                    <div className="bg-emerald-500/5 border border-emerald-500/10 p-2.5 rounded-xl">
                                        <span className="text-[8px] font-black text-emerald-500/60 uppercase tracking-widest block mb-1">Entry Zone</span>
                                        <span className="text-xs font-mono font-bold text-emerald-100">{scenario.entryZone.min.toFixed(2)}</span>
                                    </div>
                                    <div className="bg-red-500/5 border border-red-500/10 p-2.5 rounded-xl">
                                        <span className="text-[8px] font-black text-red-500/60 uppercase tracking-widest block mb-1">Stop (SL)</span>
                                        <span className="text-xs font-mono font-bold text-red-100">{scenario.stopLoss.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Footer: Timer & Action */}
                            <div className="p-4 pt-3 border-t border-white/5 flex items-center justify-between bg-black/10">
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/5 text-zinc-500 font-mono text-[9px] font-bold">
                                    <Clock size={10} />
                                    <span>{mins}m {secs.toString().padStart(2, '0')}s</span>
                                </div>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!saved) saveTrade(scenario);
                                    }}
                                    disabled={saved}
                                    className={`relative flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all active:scale-95
                                        ${saved
                                            ? 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                                            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_4px_12px_rgba(37,99,235,0.2)]'}`}
                                >
                                    {saved ? <CheckCircle2 size={12} /> : <Play size={10} fill="currentColor" />}
                                    {saved ? 'ACTIVE' : 'EXECUTE'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Scenario Detail Overlay [NEW] */}
            {detailScenario && (
                <div className="fixed inset-0 z-[120] bg-zinc-950/98 backdrop-blur-2xl animate-in fade-in zoom-in duration-300 p-6 md:p-12 flex items-center justify-center">
                    <div className="max-w-3xl w-full bg-zinc-900 border border-white/10 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Detail Header */}
                        <div className="p-8 pb-6 border-b border-white/5 flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                <div className={`p-4 rounded-2xl border ${detailScenario.direction === 'LONG' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                    {detailScenario.direction === 'LONG' ? <TrendingUp size={28} /> : <TrendingDown size={28} />}
                                </div>
                                <div className="text-left">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-2xl font-black text-white uppercase tracking-tight leading-none">
                                            {detailScenario.type.replace(/_/g, ' ')}
                                        </h3>
                                        <span className="text-xs bg-white/5 px-2 py-1 rounded text-zinc-400 font-mono border border-white/5 uppercase">
                                            {detailScenario.timeframe || timeframe}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs font-black uppercase tracking-widest ${detailScenario.direction === 'LONG' ? 'text-emerald-400' : 'text-red-400'}`}>
                                            Institutional {detailScenario.direction} Exposure
                                        </span>
                                        <span className="text-zinc-700 text-xs">•</span>
                                        <span className={`text-xs font-black uppercase tracking-widest ${detailScenario.state === 'ACTIONABLE' ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                            Status: {detailScenario.state}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setDetailScenario(null)}
                                className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-zinc-400 transition-all hover:scale-110 active:scale-90"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Detail Body */}
                        <div className="flex-1 overflow-y-auto p-8 pt-6 space-y-8 scrollbar-hide">
                            {/* Execution Condition - LARGE & FULL */}
                            <div className="bg-zinc-950/50 rounded-3xl p-6 border border-white/5">
                                <div className="flex items-center gap-2 mb-4">
                                    <Fingerprint size={16} className="text-blue-400" />
                                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Wait-for Confirmation (Full Condition)</span>
                                </div>
                                <p className="text-xl md:text-2xl font-bold text-white leading-tight tracking-tight text-left">
                                    {detailScenario.condition}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Levels Drilldown */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 px-1">
                                        <Target size={16} className="text-amber-400" />
                                        <span className="text-xs font-bold text-white uppercase tracking-wider">Trading Protocols</span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3">
                                        <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl flex justify-between items-center group transition-colors hover:bg-emerald-500/10">
                                            <span className="text-xs font-bold text-emerald-500/80 uppercase">Entry Threshold</span>
                                            <span className="text-lg font-mono font-black text-emerald-400 group-hover:scale-105 transition-transform">{detailScenario.entryZone.min.toFixed(2)}</span>
                                        </div>
                                        <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-2xl flex justify-between items-center group transition-colors hover:bg-red-500/10">
                                            <span className="text-xs font-bold text-red-500/80 uppercase">Invalidation (SL)</span>
                                            <span className="text-lg font-mono font-black text-red-400 group-hover:scale-105 transition-transform">{detailScenario.stopLoss.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <div className="flex flex-col gap-2">
                                            {detailScenario.targets.map((t: any, idx: number) => (
                                                <div key={idx} className="flex justify-between items-center px-4 py-3 rounded-2xl bg-white/5 border border-white/5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[10px] font-black text-emerald-400">
                                                            {idx + 1}
                                                        </div>
                                                        <span className="text-[11px] font-black text-zinc-400 uppercase">Target Objective</span>
                                                    </div>
                                                    <span className="text-base font-mono font-bold text-emerald-400">{t.price.toFixed(2)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Scorecard & Analysis */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 px-1">
                                        <BarChart3 size={16} className="text-cyan-400" />
                                        <span className="text-xs font-bold text-white uppercase tracking-wider">Scoring Matrix</span>
                                    </div>
                                    <div className="bg-zinc-950/30 border border-white/5 rounded-2xl p-6 h-full">
                                        <div className="mb-6 flex justify-between items-end">
                                            <div>
                                                <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Model Rating</div>
                                                <div className={`text-4xl font-black ${detailScenario.confidence?.score >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                    {detailScenario.confidence?.rating || 'C'}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Confidence</div>
                                                <div className="text-2xl font-mono font-black text-white">{detailScenario.confidence?.score}%</div>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            {detailScenario.confidence?.scorecard?.components?.map((c: any, idx: number) => (
                                                <div key={idx} className="flex flex-col gap-1">
                                                    <div className="flex justify-between items-center text-[11px]">
                                                        <span className="text-zinc-400 font-bold uppercase tracking-tight">{c.label}</span>
                                                        <span className={`font-mono font-black ${c.points > 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                                                            {c.points > 0 ? '+' : ''}{c.points}
                                                        </span>
                                                    </div>
                                                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${c.points > 0 ? 'bg-emerald-500' : 'bg-red-500 opacity-50'}`}
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
                        <div className="p-8 bg-zinc-950/50 border-t border-white/5 flex gap-4">
                            <button
                                onClick={() => setDetailScenario(null)}
                                className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-zinc-400 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all border border-white/5"
                            >
                                Dismiss
                            </button>
                            <button
                                onClick={() => {
                                    if (!isSaved(detailScenario.id)) saveTrade(detailScenario);
                                    setDetailScenario(null);
                                }}
                                disabled={isSaved(detailScenario.id)}
                                className={`flex-[2] py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all shadow-xl flex items-center justify-center gap-3
                                    ${isSaved(detailScenario.id)
                                        ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20 active:scale-[0.98]'}`}
                            >
                                {isSaved(detailScenario.id) ? (
                                    <>
                                        <CheckCircle2 size={18} />
                                        Protocol Active
                                    </>
                                ) : (
                                    <>
                                        <Play size={16} fill="currentColor" />
                                        Initialize Protocol
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hebrew Trade Guide Overlay */}
            {showGuide && (
                <div className="fixed inset-0 z-[130] bg-zinc-950/98 backdrop-blur-xl animate-in fade-in duration-300 p-6 flex flex-col items-center justify-center">
                    <div className="max-w-xl w-full bg-zinc-900 border border-white/10 rounded-3xl p-8 shadow-2xl overflow-y-auto max-h-[90vh] text-right" dir="rtl">
                        <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-600 rounded-lg">
                                    <Info size={20} className="text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-white">איך קוראים את הצעות הטריידים?</h3>
                            </div>
                            <button
                                onClick={() => setShowGuide(false)}
                                className="p-2 hover:bg-white/5 rounded-full text-zinc-500 transition-all hover:scale-110"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <section>
                                <h4 className="text-amber-400 font-bold text-sm mb-2 uppercase tracking-wide">1. דירוג התרחיש (Rating)</h4>
                                <p className="text-zinc-400 text-xs leading-relaxed">
                                    הציון (0-100) מייצג את רמת הוודאות של המודל.
                                    <br />
                                    <span className="text-emerald-400 font-bold">80+ (A/A+)</span>: הסתברות גבוהה, כל התנאים המוסדיים מתקיימים.
                                    <br />
                                    <span className="text-amber-400 font-bold">50-70 (B)</span>: תרחיש סביר, אך דורש אישור נוסף בגרף.
                                </p>
                            </section>

                            <section>
                                <h4 className="text-blue-400 font-bold text-sm mb-2 uppercase tracking-wide">2. סוגי תגים</h4>
                                <div className="space-y-3">
                                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                        <span className="text-amber-400 font-black text-[10px] block mb-1">PRIMARY</span>
                                        <p className="text-[11px] text-zinc-400">המודל הראשי שהמערכת מזהה כרלוונטי ביותר כרגע.</p>
                                    </div>
                                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                        <span className="text-cyan-400 font-black text-[10px] block mb-1">MAGNET</span>
                                        <p className="text-[11px] text-zinc-400">מעיד על נזילות גבוהה ביעד, שמושכת את המחיר "כמו מגנט".</p>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h4 className="text-purple-400 font-bold text-sm mb-2 uppercase tracking-wide">3. עסקאות נגד המגמה (Contrarian)</h4>
                                <p className="text-zinc-400 text-xs leading-relaxed">
                                    כשהתג <span className="text-purple-400 font-bold">CONTRARIAN</span> מופיע, זה אומר שהטרייד הוא נגד המגמה הגדולה (HTF).
                                    אלו עסקאות ברמת סיכון גבוהה יותר שדורשות אישור אגרסיבי במיוחד בגרף לפני כניסה.
                                </p>
                            </section>

                            <section>
                                <h4 className="text-emerald-400 font-bold text-sm mb-2 uppercase tracking-wide">4. ניהול העסקה (Execution)</h4>
                                <p className="text-zinc-400 text-xs leading-relaxed">
                                    כפתור ה-<b>EXECUTE</b> נועל את העסקה למעקב בלוח הבקרה. הוא מאפשר למערכת לתת לך התראות ניהול סיכונים ספציפיות לטרייד הנבחר.
                                </p>
                            </section>

                            <div className="bg-blue-600/10 border border-blue-500/20 p-4 rounded-2xl mt-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <AlertCircle size={14} className="text-blue-400" />
                                    <span className="font-bold text-blue-400 text-xs">טיפ מקצועי:</span>
                                </div>
                                <p className="text-zinc-300 text-[11px] leading-relaxed italic">
                                    "לעולם אל תיכנס לטרייד רק כי יש הצעה. וודא שהמודל מתכתב עם ה-HTF Bias (המגמה הגדולה) ושהתזמון מתאים לסשן (Killzone)."
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowGuide(false)}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all mt-8 shadow-lg shadow-blue-500/20 active:scale-[0.98]"
                        >
                            הבנתי, בוא נסחור
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// Activity component remains imported from lucide-react in ScenariosPanel.tsx
