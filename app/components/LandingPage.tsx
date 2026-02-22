'use client';

import React, { useState } from 'react';
import { Search, Zap, TrendingUp, Shield, BarChart3 } from 'lucide-react';

interface LandingPageProps {
    onSearch: (symbol: string) => void;
    loading: boolean;
}

export function LandingPage({ onSearch, loading }: LandingPageProps) {
    const [localSymbol, setLocalSymbol] = useState('MNQ');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSearch(localSymbol);
    };

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] animate-pulse delay-1000" />

            <div className="relative z-10 w-full max-w-4xl text-center space-y-12">
                {/* Branding Section */}
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-4 animate-fade-in">
                        <Zap size={12} />
                        Institutional Grade
                    </div>
                    <h1 className="text-7xl md:text-9xl font-black tracking-tighter text-white animate-title">
                        SOLO<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500">TRADING</span>
                    </h1>
                    <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto font-medium tracking-tight">
                        Experience the raw power of institutional order flow and algorithmic context in one unified terminal.
                    </p>
                </div>

                {/* Search Section */}
                <form onSubmit={handleSubmit} className="relative max-w-2xl mx-auto group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative flex items-center bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
                        <div className="pl-6 text-zinc-500">
                            <Search size={24} />
                        </div>
                        <input
                            type="text"
                            value={localSymbol}
                            onChange={(e) => setLocalSymbol(e.target.value.toUpperCase())}
                            placeholder="Enter Ticker (e.g. MNQ)"
                            className="bg-transparent border-none text-white px-6 py-8 w-full text-2xl font-bold focus:ring-0 placeholder:text-zinc-700 uppercase tracking-widest"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="mr-2 bg-blue-600 hover:bg-blue-500 text-white px-10 py-6 rounded-xl font-black text-lg transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3 shadow-lg shadow-blue-500/20"
                        >
                            {loading ? (
                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    ANALYZE
                                    <TrendingUp size={20} />
                                </>
                            )}
                        </button>
                    </div>

                </form>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
                    <FeatureCard
                        icon={<Shield className="text-blue-400" />}
                        title="Risk Guard"
                        desc="Dynamic invalidation levels based on institutional liquidity pools."
                    />
                    <FeatureCard
                        icon={<BarChart3 className="text-purple-400" />}
                        title="VXR Engine"
                        desc="Real-time volume X-ray identifying institutional magnets (HVN)."
                    />
                    <FeatureCard
                        icon={<Zap className="text-yellow-400" />}
                        title="SMT Sync"
                        desc="Advanced divergence tracking across correlated futures markets."
                    />
                </div>
            </div>

            <style jsx>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.8s ease-out forwards;
                }
                .animate-title {
                    animation: fade-in 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </div>
    );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
    return (
        <div className="p-6 rounded-2xl bg-zinc-900/30 border border-zinc-800/50 backdrop-blur-sm text-left hover:border-zinc-700 transition-colors group">
            <div className="w-10 h-10 rounded-lg bg-zinc-950 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <h3 className="text-white font-bold mb-2 uppercase tracking-tight text-sm">{title}</h3>
            <p className="text-zinc-500 text-xs leading-relaxed">{desc}</p>
        </div>
    );
}
