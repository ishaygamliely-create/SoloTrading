import React, { useState, useEffect } from 'react';
import { Target, Shield, AlertTriangle, CheckCircle2, Clock, Timer, TrendingUp, TrendingDown, ChevronUp, ChevronDown, AlertOctagon, Play, ArrowRight, Layers } from 'lucide-react';
import { useActiveTrade } from '../context/ActiveTradeContext';
import { PanelProps } from './DashboardPanels';

export function ScenariosPanel({ data, loading, timeframe }: PanelProps) {
    const { saveTrade, isSaved } = useActiveTrade();

    // Auto-update timer
    const [now, setNow] = useState(Math.floor(Date.now() / 1000));
    useEffect(() => {
        const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
        return () => clearInterval(interval);
    }, []);

    if (loading || !data?.analysis?.scenarios) return <div className="animate-pulse bg-zinc-900/50 h-48 rounded-xl border border-white/5"></div>;

    const [expandedId, setExpandedId] = useState<number | null>(null);
    const scenarios = data.analysis.scenarios || [];
    const activeScenarios = scenarios.filter((s: any) => !s.expires_at || s.expires_at > now);

    if (activeScenarios.length === 0) {
        return (
            <div className="bg-zinc-900/30 border border-white/5 p-6 rounded-xl text-center flex flex-col items-center justify-center min-h-[160px]">
                <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center mb-3">
                    <Shield className="text-zinc-600" size={20} />
                </div>
                <h3 className="text-zinc-500 font-bold text-sm mb-1">לא זוהו מודלים</h3>
                <p className="text-zinc-700 text-xs">סורק מבנה שוק...</p>
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

                // Styles
                const borderColor = isPrimary
                    ? 'border-yellow-500/40 ring-1 ring-yellow-500/10'
                    : scenario.state === 'ACTIONABLE' ? 'border-emerald-500/30' : 'border-white/10';

                const bgGradient = isPrimary
                    ? 'bg-gradient-to-b from-yellow-950/10 to-transparent'
                    : 'bg-zinc-900/40';

                // Confidence Color
                const scorecard = scenario.confidence?.scorecard;
                const score = scenario.confidence?.score || 0;
                const scoreColor = score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-zinc-500';

                // VXR Proximity Check
                const hasVxrMagnet = scorecard?.components?.some((c: any) => c.label === 'VXR Magnet');

                return (
                    <div
                        key={i}
                        className={`relative rounded-xl border ${borderColor} ${bgGradient} p-4 backdrop-blur-sm transition-all duration-300 group`}
                    >
                        {/* Badges - Adjusted position to avoid score overlap */}
                        <div className="absolute top-0 right-0 p-1 flex items-center gap-1 z-20">
                            {isPrimary && (
                                <div className="bg-yellow-500/20 border-b border-l border-yellow-500/30 px-2 py-0.5 rounded-bl-lg">
                                    <span className="text-[9px] font-black text-yellow-400 uppercase tracking-widest flex items-center gap-1">
                                        <Target size={10} /> ראשי
                                    </span>
                                </div>
                            )}
                            {hasVxrMagnet && (
                                <div className="bg-cyan-500/20 border-b border-l border-cyan-500/30 px-2 py-0.5 rounded-bl-lg">
                                    <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1">
                                        <Layers size={10} /> מגנט
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Header */}
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${isLong ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {isLong ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                        {isLong ? 'קנייה' : 'מכירה'}
                                    </span>
                                    <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-zinc-400 font-mono border border-white/5">
                                        {scenario.timeframe || timeframe}
                                    </span>
                                </div>
                                <div className="text-white font-bold text-sm tracking-tight">
                                    {scenario.type.replace(/_/g, ' ')}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-sm font-black uppercase tracking-tighter ${scenario.state === 'ACTIONABLE'
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                                        : 'bg-zinc-800 text-zinc-500 border border-white/5'
                                        }`}>
                                        {scenario.state === 'ACTIONABLE' ? 'אקטיבי' : 'ממתין'}
                                    </span>
                                    <span className="text-zinc-700 text-[8px]">•</span>
                                    <span className="text-[10px] text-zinc-500 truncate max-w-[180px]">
                                        {scenario.condition}
                                    </span>
                                </div>
                            </div>

                            {/* Score Circle */}
                            <div className="flex flex-col items-end cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : i)}>
                                <div className={`text-2xl font-black ${scoreColor} tracking-tighter leading-none`}>
                                    {score}
                                </div>
                                <div className={`text-[9px] font-bold uppercase tracking-widest opacity-70 ${scoreColor}`}>
                                    דירוג {scenario.confidence?.rating || 'C'}
                                </div>
                            </div>
                        </div>

                        {/* Structure Link (User Request: "Check that it is linked") */}
                        <div className="mb-3 px-2 py-1.5 bg-white/5 rounded border border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <Layers size={10} className="text-zinc-500" />
                                <span className="text-[10px] text-zinc-400 font-medium">נטיית מגמה (HTF)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold ${scenario.htfBias?.includes('BULL') ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {scenario.htfBias || 'NEUTRAL'}
                                </span>
                                {scenario.biasAlignment === 'CONTRARIAN' && (
                                    <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1 rounded border border-purple-500/20">
                                        נגד המגמה
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Data Grid */}
                        <div className="grid grid-cols-2 gap-2 text-[10px] mb-3">
                            <div className="bg-black/20 p-2 rounded border border-white/5">
                                <div className="text-zinc-500 font-bold uppercase mb-0.5">כניסה (Entry)</div>
                                <div className="font-mono text-zinc-300">
                                    {scenario.entryZone.min.toFixed(2)}
                                </div>
                            </div>
                            <div className="bg-black/20 p-2 rounded border border-white/5">
                                <div className="text-zinc-500 font-bold uppercase mb-0.5">סטופ (Stop)</div>
                                <div className="font-mono text-red-400/80">
                                    {scenario.stopLoss.toFixed(2)}
                                </div>
                            </div>
                        </div>

                        {/* Expandable Details */}
                        {isExpanded && (
                            <div className="mb-3 pt-3 border-t border-white/5 animate-in fade-in slide-in-from-top-1">
                                {/* Scorecard */}
                                <div className="space-y-1 mb-3">
                                    {scenario.confidence?.scorecard?.components?.map((c: any, idx: number) => (
                                        <div key={idx} className="flex justify-between items-center text-[10px]">
                                            <span className="text-zinc-400">{c.label}</span>
                                            <span className={`font-mono font-bold ${c.points > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                {c.points > 0 ? '+' : ''}{c.points}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* Targets */}
                                <div className="space-y-1">
                                    {scenario.targets.map((t: any, idx: number) => (
                                        <div key={idx} className="flex justify-between items-center text-[10px] bg-emerald-500/5 px-2 py-1 rounded">
                                            <span className="text-emerald-500/70 font-bold">TP{idx + 1}</span>
                                            <span className="font-mono text-emerald-400">{t.price.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Footer: Timer & Action */}
                        <div className="mt-auto pt-3 border-t border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-zinc-600 font-mono text-[10px]">
                                <Clock size={10} />
                                <span>{mins}m {secs.toString().padStart(2, '0')}s</span>
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (!saved) saveTrade(scenario);
                                }}
                                disabled={saved}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${saved ? 'bg-zinc-800 text-zinc-500' : 'bg-blue-600 hover:bg-blue-500 text-white'
                                    }`}
                            >
                                {saved ? <CheckCircle2 size={10} /> : <Play size={10} fill="currentColor" />}
                                {saved ? 'פעיל' : 'ביצוע'}
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
