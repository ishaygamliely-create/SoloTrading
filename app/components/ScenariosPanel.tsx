import React, { useState, useEffect } from 'react';
import { Target, Shield, Info, X, CheckCircle2, Clock, TrendingUp, TrendingDown, Play, Layers, Zap, AlertCircle, Activity } from 'lucide-react';
import { useActiveTrade } from '../context/ActiveTradeContext';
import { PanelProps } from './DashboardPanels';

export function ScenariosPanel({ data, loading, timeframe }: PanelProps) {
    const { saveTrade, isSaved } = useActiveTrade();
    const [showGuide, setShowGuide] = useState(false);

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

    const [expandedId, setExpandedId] = useState<number | null>(null);
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
                    const isExpanded = expandedId === i;
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
                            className={`group relative flex flex-col rounded-2xl border transition-all duration-300 overflow-hidden
                                ${isPrimary
                                    ? 'bg-zinc-950/40 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.05)]'
                                    : 'bg-zinc-900/40 border-white/5 hover:border-white/10'}`}
                        >
                            {/* Accent Glow Line */}
                            <div className={`absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent ${isPrimary ? 'via-amber-500/30' : 'via-blue-500/10'} to-transparent`} />

                            {/* Header Section: Badges & Rating */}
                            <div className="p-4 pb-0">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center gap-1.5">
                                            {isPrimary && (
                                                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[8px] font-black text-amber-400 uppercase tracking-widest">
                                                    <Target size={8} /> PRIMARY
                                                </div>
                                            )}
                                            {hasVxrMagnet && (
                                                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-[8px] font-black text-cyan-400 uppercase tracking-widest">
                                                    <Layers size={8} /> MAGNET
                                                </div>
                                            )}
                                        </div>
                                        <div className={`flex items-center gap-1.5 transition-transform group-hover:translate-x-0.5`}>
                                            <span className={`text-sm font-black uppercase tracking-tight flex items-center gap-1.5 ${isLong ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {isLong ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                                {scenario.direction}
                                            </span>
                                            <span className="text-[9px] bg-white/5 px-1.5 py-0.5 rounded text-zinc-500 font-bold border border-white/5">
                                                {scenario.timeframe || timeframe}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Rating Display */}
                                    <div className="flex flex-col items-end cursor-pointer group/rating" onClick={() => setExpandedId(isExpanded ? null : i)}>
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
                                <div className="mb-4 flex items-center justify-between p-2 rounded-xl bg-black/20 border border-white/5">
                                    <div className="flex items-center gap-2">
                                        <Activity size={10} className="text-zinc-600" />
                                        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">HTF Bias</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[9px] font-black uppercase ${scenario.htfBias?.includes('BULL') ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {scenario.htfBias || 'NEUTRAL'}
                                        </span>
                                        {scenario.biasAlignment === 'CONTRARIAN' && (
                                            <span className="text-[8px] px-1 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-black uppercase">
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

                            {/* Expandable Drilldown */}
                            {isExpanded && (
                                <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="pt-3 border-t border-white/10 space-y-3">
                                        <div className="space-y-1">
                                            {scenario.confidence?.scorecard?.components?.map((c: any, idx: number) => (
                                                <div key={idx} className="flex justify-between items-center text-[9px] font-bold">
                                                    <span className="text-zinc-500 uppercase tracking-tighter">{c.label}</span>
                                                    <span className={`${c.points > 0 ? 'text-emerald-500' : 'text-red-500/70'}`}>
                                                        {c.points > 0 ? '+' : ''}{c.points}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-1 gap-1">
                                            {scenario.targets.map((t: any, idx: number) => (
                                                <div key={idx} className="flex justify-between items-center px-2 py-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                                                    <span className="text-[8px] font-black text-emerald-500/60 uppercase">Target {idx + 1}</span>
                                                    <span className="text-xs font-mono font-bold text-emerald-400">{t.price.toFixed(2)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Footer: Timer & Action */}
                            <div className="mt-auto p-4 pt-3 border-t border-white/5 flex items-center justify-between bg-black/10">
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

            {/* Hebrew Trade Guide Overlay */}
            {showGuide && (
                <div className="fixed inset-0 z-[110] bg-zinc-950/98 backdrop-blur-xl animate-in fade-in duration-300 p-6 flex flex-col items-center justify-center">
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
                                <h4 className="text-emerald-400 font-bold text-sm mb-2 uppercase tracking-wide">3. ניהול העסקה (Execution)</h4>
                                <p className="text-zinc-400 text-xs leading-relaxed">
                                    כפתור ה-<b>EXECUTE</b> לא מבצע פעולה בבורסה, אלא נועל את העסקה למעקב בצד המסך (Side Panel).
                                    הוא מאפשר למערכת לתת לך התראות ספציפיות על ניהול הרווחים והסיכונים בטרייד הזה.
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
