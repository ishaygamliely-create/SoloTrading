'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Target, Zap, Brain, ChevronRight, Check, X, Loader2, MessageSquare, Shield, Activity, ListChecks, Rocket, AlertCircle } from 'lucide-react';
import { PersonaProfile, PersonaExtractionResult } from '../types/persona';
import { extractProfile, rankScenarios, getStoredWeights } from '../lib/personaEngine';
import { TradeScenario } from '../lib/analysis';
import { useActiveTrade } from '../context/ActiveTradeContext';
import { PanelHelp } from './PanelHelp';

interface PersonaPanelProps {
    onApply: (profile: PersonaProfile | null) => void;
    activeProfile: PersonaProfile | null;
    scenarios: TradeScenario[];
    isOpen: boolean;
    onClose: () => void;
}

export function PersonaPanel({ onApply, activeProfile, scenarios, isOpen, onClose }: PersonaPanelProps) {
    const [inputValue, setInputValue] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [extraction, setExtraction] = useState<PersonaExtractionResult | null>(null);
    const [lastAnalyzedValue, setLastAnalyzedValue] = useState('');
    const overlayRef = useRef<HTMLDivElement>(null);
    const { saveTrade, isSaved } = useActiveTrade();

    const PRESET_STYLES = [
        { label: 'M1 SCALP', value: 'I am an MNQ scalper focusing on M1-M5 structure. I look for liquidity sweeps and avoid news. Risk is tight.' },
        { label: 'M15 INTRA', value: 'Day trader specializing in M15 structure breaks and trend alignment. Balanced risk.' },
        { label: 'H1 SWING', value: 'Swing trader looking for high-value reversal zones on hourly timeframes. Wide risk tolerance.' },
        { label: 'LIQ SEEKER', value: 'Technical trader focusing exclusively on liquidity pools, sweeps, and institutional mitigation. Conservative risk.' },
        { label: 'TREND RIDER', value: 'Momentum trader following strong EMA slopes and trend-aligned structure. Aggressive targets.' },
        { label: 'SMT MASTER', value: 'Focus on institutional divergence (SMT) between symbols like NQ and ES. Smart money alignment.' },
        { label: 'MACRO SNIPER', value: 'Algorithm execution during time-based NY Macro windows. High-volatility liquidity injections.' },
        { label: 'REVERSION', value: 'Mean reversion setups targeting VWAP and standard deviation bands. Value-based return to mean.' },
        { label: 'GAP SEEKER', value: 'Opening gap protocols and True Day Open (SOD) alignment. Focus on morning market imbalance.' }
    ];

    // ESC + Scroll Lock QA (Step 2 & 3)
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            const handleEsc = (e: KeyboardEvent) => {
                if (e.key === 'Escape') onClose();
            };
            window.addEventListener('keydown', handleEsc);
            return () => {
                document.body.style.overflow = 'unset';
                window.removeEventListener('keydown', handleEsc);
            };
        }
    }, [isOpen, onClose]);

    // State Isolation / Reset on Close (Step 5)
    useEffect(() => {
        if (!isOpen) {
            setExtraction(null);
            setInputValue('');
        }
    }, [isOpen]);

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleAnalyze = async () => {
        if (!inputValue.trim()) return;

        setIsAnalyzing(true);
        // Simulate "Processing" for HUD feel
        await new Promise(r => setTimeout(r, 800));
        const result = extractProfile(inputValue);
        setExtraction(result);
        setLastAnalyzedValue(inputValue);
        setIsAnalyzing(false);
    };

    const handleQuickSelect = (val: string) => {
        setInputValue(val);
        setIsAnalyzing(true);
        // Instant HUD feedback
        setTimeout(() => {
            const result = extractProfile(val);
            setExtraction(result);
            setLastAnalyzedValue(val);
            setIsAnalyzing(false);
        }, 600);
    };

    const handleReset = () => {
        setExtraction(null);
        setInputValue('');
        setLastAnalyzedValue('');
        onApply(null);
    };

    const recommendations = (extraction && scenarios && extraction.confidence >= 0.25)
        ? rankScenarios(scenarios, extraction.profile, getStoredWeights()).slice(0, 3)
        : [];

    const isInvalid = !!(extraction && extraction.confidence < 0.25);

    if (!isOpen) return null;

    return (
        <div
            onMouseDown={handleBackdropClick}
            className="fixed inset-0 z-[110] bg-zinc-950/98 backdrop-blur-2xl animate-in fade-in duration-300 p-6 md:p-12 overflow-y-auto"
        >
            <div className="max-w-4xl mx-auto flex flex-col h-full">
                {/* Header Suite Style */}
                <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-6 relative">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                            <Brain size={24} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight uppercase">Trading Persona Suite</h2>
                            <p className="text-zinc-500 text-sm font-bold uppercase tracking-wider">Institutional Adaptive Style Engine</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-zinc-400 transition-all hover:scale-110 active:scale-90 border border-white/10"
                    >
                        <X size={24} />
                    </button>

                    {/* Background Decorative Glow (Localized) */}
                    <div className="absolute top-0 right-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 flex-1">
                    {/* Left side: Context & Input */}
                    <div className="lg:col-span-2 space-y-6">
                        <section className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6 relative overflow-hidden h-full">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xs font-black text-blue-400 uppercase tracking-[0.2em]">Quick Protocols</h3>
                                <div className="scale-90 origin-right">
                                    <PanelHelp
                                        title="Trading Persona Protocols"
                                        label="System Protocol Help (?)"
                                        bullets={[
                                            "Quick Protocols: 9 one-click institutional setups.",
                                            "Deep Learning: Describe your unique methodology.",
                                            "Adaptive Ranking: System learns from your feedback.",
                                            "Direct Activation: Sync setups to Active Trade sidebar."
                                        ]}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-10">
                                {PRESET_STYLES.map(s => (
                                    <button
                                        key={s.label}
                                        onClick={() => handleQuickSelect(s.value)}
                                        className="h-12 bg-zinc-950/40 border border-white/5 hover:border-blue-500/50 hover:bg-blue-500/5 rounded-2xl text-[10px] font-black text-zinc-500 hover:text-white uppercase tracking-widest transition-all active:scale-95 shadow-lg group-hover:shadow-blue-500/10 flex items-center justify-center text-center px-4"
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </div>

                            <div className="pt-6 border-t border-white/5">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Deep Learning</h3>
                                    <span className="text-[9px] text-zinc-600 font-bold uppercase italic tracking-widest">Manual Override</span>
                                </div>
                                <p className="text-zinc-500 text-[10px] font-medium mb-4 leading-relaxed uppercase tracking-tight">
                                    Describe your unique methodology for deep alignment.
                                </p>
                            </div>

                            <textarea
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Describe custom methodology..."
                                className="w-full h-32 bg-black/40 border border-white/10 rounded-2xl p-4 text-xs text-white placeholder:text-zinc-800 focus:outline-none focus:border-blue-500/50 transition-all font-medium leading-relaxed resize-none shadow-inner"
                            />

                            {/* Manual Action - Hidden when analyzing or extraction exists unless typing */}
                            {(!extraction || inputValue !== lastAnalyzedValue) && (
                                <button
                                    onClick={handleAnalyze}
                                    disabled={isAnalyzing || !inputValue.trim()}
                                    className={`w-full h-14 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-[0.15em] transition-all active:scale-95 shadow-2xl ${isAnalyzing || !inputValue.trim()
                                        ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed opacity-50'
                                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
                                        }`}
                                >
                                    {isAnalyzing ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Processing Protocol...
                                        </>
                                    ) : (
                                        <>
                                            Initialize Extraction
                                        </>
                                    )}
                                </button>
                            )}
                        </section>

                        {activeProfile && (
                            <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 shadow-inner">
                                <div className="p-2 bg-emerald-500/20 rounded-lg">
                                    <Check size={16} className="text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none">Global Filter Active</p>
                                    <p className="text-[9px] font-bold text-zinc-500 uppercase mt-1">Dashboard synchronized to persona</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right side: Analysis & Recommendations */}
                    <div className="lg:col-span-3 space-y-6">
                        {extraction ? (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                {/* Profile Stats */}
                                <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
                                    <div className="flex justify-between items-center mb-8">
                                        <div className="flex items-center gap-3">
                                            <Shield size={20} className="text-blue-400" />
                                            <h3 className="text-sm font-black text-white uppercase tracking-widest">Extracted Profile</h3>
                                        </div>
                                        <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] font-mono font-black text-blue-400 tracking-tighter shadow-lg">
                                            {(extraction.confidence * 100).toFixed(0)}% INTEGRITY
                                        </div>
                                    </div>

                                    {isInvalid ? (
                                        <div className="p-12 bg-red-500/5 border border-red-500/10 rounded-[2rem] text-center space-y-4 my-8">
                                            <AlertCircle size={48} className="text-red-500 mx-auto opacity-30" />
                                            <div className="max-w-xs mx-auto">
                                                <h4 className="text-xs font-black text-red-500 uppercase tracking-[0.2em] mb-2">Context Protocol Denied</h4>
                                                <p className="text-[10px] font-bold text-zinc-500 uppercase leading-relaxed tracking-wider">
                                                    Extraction integrity below minimum threshold. Please include institutional terminology (e.g. Scalp, MNQ, M5, Liquidity).
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 group hover:border-blue-500/30 transition-colors">
                                                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-2">Primary Style</span>
                                                    <span className="text-base font-black text-white uppercase tracking-tight">{extraction.profile.style.replace('_', ' ')}</span>
                                                </div>
                                                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 group hover:border-emerald-500/30 transition-colors">
                                                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-2">Risk Tolerance</span>
                                                    <span className="text-base font-black text-emerald-400 uppercase tracking-tight">{extraction.profile.riskTolerance}</span>
                                                </div>
                                                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 group hover:border-blue-500/30 transition-colors col-span-2 md:col-span-1">
                                                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-2">Timeframes</span>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {extraction.profile.timeframes.map(tf => (
                                                            <span key={tf} className="text-[10px] px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-300 font-black rounded uppercase shadow-sm">{tf}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Recommendations */}
                                            {recommendations.length > 0 && (
                                                <div className="mt-10 space-y-4">
                                                    <div className="flex items-center gap-3 px-1">
                                                        <ListChecks size={18} className="text-blue-400" />
                                                        <span className="text-[11px] font-black text-blue-400/60 uppercase tracking-[0.25em]">Protocol Alignment Recommendations</span>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        {recommendations.map(({ scenario, score, why }, idx) => (
                                                            <div key={idx} className="p-4 rounded-2xl bg-zinc-950/40 border border-white/5 hover:border-blue-500/30 transition-all group hover:-translate-y-1">
                                                                <div className="flex justify-between items-start mb-4 gap-2">
                                                                    <div className="flex flex-col gap-1 min-w-0">
                                                                        <span className="text-[10px] font-black text-white uppercase tracking-tight leading-none truncate block">
                                                                            {(scenario.type || '').replace(/_/g, ' ')}
                                                                        </span>
                                                                        <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-tighter">
                                                                            {scenario.timeframe}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                                                        <button
                                                                            onClick={() => {
                                                                                // Map to context scenario type
                                                                                const contextScenario: any = {
                                                                                    ...scenario,
                                                                                    symbol: 'MNQ', // Default or from data
                                                                                    direction: scenario.direction || (scenario.type?.includes('BULL') || scenario.type?.includes('LONG') ? 'LONG' : 'SHORT'),
                                                                                    timeframe: extraction.profile.timeframes[0] || 'M15'
                                                                                };
                                                                                saveTrade(contextScenario);
                                                                            }}
                                                                            className={`px-2 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-tighter transition-all ${isSaved(scenario.id || '')
                                                                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                                                                                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
                                                                                }`}
                                                                        >
                                                                            {isSaved(scenario.id || '') ? 'ACTIVE' : 'ACTIVATE'}
                                                                        </button>
                                                                        <div className="w-7 h-7 rounded-xl border border-blue-500/20 flex items-center justify-center bg-blue-500/10 group-hover:bg-blue-500/30 transition-colors flex-shrink-0">
                                                                            <span className="text-[9px] font-mono font-black text-blue-400">{score.toFixed(0)}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    {why.slice(0, 3).map((w, i) => (
                                                                        <div key={i} className="flex items-center gap-2 px-2 py-1 bg-white/5 rounded-lg border border-white/5">
                                                                            <Check size={8} className="text-emerald-400" />
                                                                            <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-tighter truncate">{w}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    <div className="flex gap-4 mt-10">
                                        <button
                                            onClick={handleReset}
                                            className="flex-1 h-14 border border-white/10 hover:bg-white/5 text-zinc-500 hover:text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3"
                                        >
                                            <X size={18} />
                                            Discard Session
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (!isInvalid) {
                                                    onApply(extraction.profile);
                                                    onClose();
                                                }
                                            }}
                                            disabled={isInvalid}
                                            className={`flex-[2] h-14 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 shadow-2xl ${isInvalid
                                                ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed border border-white/5'
                                                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
                                                }`}
                                        >
                                            <Rocket size={18} fill="currentColor" />
                                            {isInvalid ? 'Context Denied' : 'Synchronize Dashboard'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center bg-zinc-900/20 border border-white/5 border-dashed rounded-[3rem] p-12 text-center text-zinc-700">
                                <Activity size={48} strokeWidth={1} className="mb-4 opacity-20" />
                                <h3 className="font-black uppercase tracking-widest text-zinc-500 mb-2">Protocol Standby</h3>
                                <p className="text-[10px] font-bold uppercase tracking-tighter">Enter style description to initialize institutional alignment</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Neural Link: ACTIVE</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
                            <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Ruleset: DETERMINISTIC v4.2</span>
                        </div>
                    </div>
                    <span className="text-[9px] font-mono text-zinc-700 uppercase tracking-widest">SOLOTRADING // INSTITUTIONAL HUD // PERSONA_ENGINE_SUITE</span>
                </div>
            </div>
        </div>
    );
}
