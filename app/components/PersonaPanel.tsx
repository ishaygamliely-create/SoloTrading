'use client';

import React, { useState } from 'react';
import { Target, Zap, Brain, ChevronRight, Check, X, Loader2, MessageSquare, Shield, Activity, ListChecks } from 'lucide-react';
import { PersonaProfile, PersonaExtractionResult } from '../types/persona';
import { extractProfile, rankScenarios, getStoredWeights } from '../lib/personaEngine';
import { TradeScenario } from '../lib/analysis';

interface PersonaPanelProps {
    onApply: (profile: PersonaProfile | null) => void;
    activeProfile: PersonaProfile | null;
    scenarios: TradeScenario[];
}

export function PersonaPanel({ onApply, activeProfile, scenarios }: PersonaPanelProps) {
    const [inputValue, setInputValue] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [extraction, setExtraction] = useState<PersonaExtractionResult | null>(null);

    const handleAnalyze = async () => {
        if (!inputValue.trim()) return;

        setIsAnalyzing(true);
        // Artificial delay for HUD "processing" feel
        setTimeout(() => {
            const result = extractProfile(inputValue);
            setExtraction(result);
            setIsAnalyzing(false);
        }, 600);
    };

    const handleReset = () => {
        setExtraction(null);
        setInputValue('');
        onApply(null);
    };

    const recommendations = (extraction && scenarios)
        ? rankScenarios(scenarios, extraction.profile, getStoredWeights()).slice(0, 3)
        : [];

    return (
        <div className="relative group overflow-hidden bg-zinc-900/40 border border-white/5 rounded-2xl backdrop-blur-md transition-all duration-500 hover:border-blue-500/20">
            {/* Header VXR HUD Style */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-blue-500/5 to-transparent">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                        <Brain size={18} className="text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-xs font-black text-white uppercase tracking-widest leading-none">Trading Persona</h3>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter mt-1">Adaptive Style Engine</p>
                    </div>
                </div>
                {activeProfile && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-bold text-emerald-400 uppercase">Profile Active</span>
                    </div>
                )}
            </div>

            <div className="p-4 space-y-4">
                {/* Input Section */}
                {!extraction && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="relative">
                            <textarea
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Describe your style (e.g. 'MNQ scalper, M1-M3, avoid news')"
                                className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl p-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors min-h-[80px] font-medium leading-relaxed"
                            />
                            <div className="absolute top-3 right-3 opacity-20 pointer-events-none">
                                <MessageSquare size={16} className="text-zinc-400" />
                            </div>
                        </div>

                        <button
                            onClick={handleAnalyze}
                            disabled={isAnalyzing || !inputValue.trim()}
                            className="w-full h-11 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-blue-500/10"
                        >
                            {isAnalyzing ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Analyzing Persona...
                                </>
                            ) : (
                                <>
                                    <Activity size={16} />
                                    Analyze Trading Style
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* Results Section */}
                {extraction && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="p-3 bg-zinc-950/50 border border-white/5 rounded-xl space-y-3">
                            <div className="flex justify-between items-center pb-2 border-b border-white/5">
                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Extracted Profile</span>
                                <div className="text-[10px] font-mono text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded border border-blue-400/20 font-bold">
                                    {(extraction.confidence * 100).toFixed(0)}% Confidence
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="flex flex-col gap-1 p-2 rounded-lg bg-white/5 border border-white/5">
                                    <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-tighter">Style</span>
                                    <span className="text-xs font-black text-white uppercase">{extraction.profile.style}</span>
                                </div>
                                <div className="flex flex-col gap-1 p-2 rounded-lg bg-white/5 border border-white/5">
                                    <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-tighter">Risk</span>
                                    <span className="text-xs font-black text-emerald-400 uppercase">{extraction.profile.riskTolerance}</span>
                                </div>
                                <div className="flex flex-col gap-1 p-2 rounded-lg bg-white/5 border border-white/5 col-span-2">
                                    <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-tighter">Timeframes</span>
                                    <div className="flex gap-1.5">
                                        {extraction.profile.timeframes.map(tf => (
                                            <span key={tf} className="text-[10px] h-4 flex items-center px-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-300 font-bold rounded uppercase">{tf}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Recommendations List (Step 2 Read-Only Output) */}
                            {recommendations.length > 0 && (
                                <div className="space-y-2 pt-2 border-t border-white/5">
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <ListChecks size={12} className="text-blue-400" />
                                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Recommended Setups</span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {recommendations.map(({ scenario, score, why }, idx) => (
                                            <div key={idx} className="p-2 rounded-lg bg-blue-500/5 border border-blue-500/10 hover:border-blue-500/30 transition-colors">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-[10px] font-black text-white uppercase">{scenario.type.replace('_', ' ')}</span>
                                                    <span className="text-[9px] font-mono font-bold text-blue-400">SCORE {score.toFixed(0)}</span>
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {why.slice(1, 4).map((r, i) => (
                                                        <div key={i} className="text-[8px] px-1.5 py-0.5 bg-zinc-900 border border-white/5 text-zinc-500 font-bold uppercase tracking-tighter rounded">
                                                            {r.split(':')[0]}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-2 pt-1">
                                {extraction.profile.newsAvoidance && (
                                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20">
                                        <Shield size={12} className="text-red-400" />
                                        <span className="text-[9px] font-bold text-red-200 uppercase tracking-tighter">News Avoidance Active</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={handleReset}
                                className="h-10 border border-white/10 hover:bg-white/5 text-zinc-400 hover:text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <X size={14} />
                                Reset
                            </button>
                            <button
                                onClick={() => onApply(extraction.profile)}
                                className="h-10 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2"
                            >
                                <Check size={14} />
                                Apply Filter
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* VXR Footer Detail */}
            <div className="px-4 py-2 border-t border-white/5 bg-black/40">
                <div className="flex items-center justify-between">
                    <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">Institutional AI Subsystem</span>
                    <div className="flex items-center gap-1">
                        <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-[8px] font-mono text-blue-500/60 uppercase">Ready</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
