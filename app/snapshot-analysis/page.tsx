'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Search, TrendingUp, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { ScenariosPanel } from '../components/ScenariosPanel';
import { PSPPanel } from '../components/PSPPanel';
import { TimeAlignmentPanel } from '../components/TimeAlignmentPanel';
import { MarketContextPanel } from '../components/MarketContextPanel';
import { StructurePanel } from '../components/StructurePanel';
import { LiquidityPanel } from '../components/LiquidityPanel';
import ConfluencePanel from '../components/ConfluencePanel';
import { BiasPanel, LevelsPanel } from '../components/DashboardPanels';
import { ChartUpload } from '../components/ChartUpload';
import { AnalysisResults } from '../components/AnalysisResults';
import { ChartOverlay } from '../components/ChartOverlay';
import { ChartAnalysisResult } from '@/app/types/chart-analysis';
import { ChartAnalysisSchema } from '@/app/lib/chart-schema';

const Chart = dynamic(() => import('../components/Chart').then(mod => mod.Chart), {
    ssr: false,
    loading: () => <div className="h-[500px] w-full flex items-center justify-center bg-zinc-900/50 rounded-xl text-zinc-500">Loading Chart...</div>
});

export default function SnapshotAnalysisPage() {
    // --- DASHBOARD STATE ---
    const [symbol, setSymbol] = useState('');
    const [dashboardLoading, setDashboardLoading] = useState(false);
    const [dashboardError, setDashboardError] = useState<string | null>(null);
    const [dashboardData, setDashboardData] = useState<any>(null);

    // --- SNAPSHOT STATE ---
    const [image, setImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [rawResult, setRawResult] = useState<ChartAnalysisResult | null>(null);
    const [displayResult, setDisplayResult] = useState<ChartAnalysisResult | null>(null);
    const [snapshotLoading, setSnapshotLoading] = useState(false);
    const [isMockMode, setIsMockMode] = useState(false);
    const [snapshotError, setSnapshotError] = useState<string | null>(null);
    const [confThreshold, setConfThreshold] = useState(30);
    const [showDebug, setShowDebug] = useState(false);
    const [timeframe, setTimeframe] = useState(''); // Additional context for snapshot

    // --- DASHBOARD LOGIC ---
    const fetchDashboardData = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!symbol) return;

        setDashboardLoading(true);
        setDashboardError(null);
        setDashboardData(null);

        try {
            const res = await fetch(`/api/stock?symbol=${symbol}`);
            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.error || 'Failed to fetch data');
            }

            setDashboardData(json);
        } catch (err: any) {
            setDashboardError(err.message);
        } finally {
            setDashboardLoading(false);
        }
    };

    // --- SNAPSHOT LOGIC ---
    React.useEffect(() => {
        if (!rawResult) {
            setDisplayResult(null);
            return;
        }
        const processed = JSON.parse(JSON.stringify(rawResult));
        if (processed.confidence_score < confThreshold) {
            processed.bias = 'NEUTRAL';
            processed.reasons.unshift(`⚠️ LOW CONFIDENCE: Score ${processed.confidence_score}% is below threshold (${confThreshold}%).`);
            processed.limitations.push(`Confidence score below threshold (<${confThreshold}%). Output forced to NEUTRAL.`);
        }
        setDisplayResult(processed);
    }, [rawResult, confThreshold]);

    const handleImageSelect = (file: File) => {
        setImage(file);
        const reader = new FileReader();
        reader.onload = (e) => setImagePreview(e.target?.result as string);
        reader.readAsDataURL(file);
        setRawResult(null);
        setSnapshotError(null);
    };

    const handleAnalyzeSnapshot = async () => {
        if (!image || !imagePreview) return;

        setSnapshotLoading(true);
        setSnapshotError(null);

        try {
            let data: ChartAnalysisResult;

            if (isMockMode) {
                // Mock Mode not fully migrated yet, skipping logic or providing simple stub
                // For now, if mock mode is on we might need a mock file.
                // Assuming we use API for now or fail. 
                // Let's implement real API call primarily.
                const res = await fetch('/api/analyze-chart', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        image: imagePreview,
                        additionalContext: { symbol, timeframe }
                    })
                });
                data = await res.json(); // Fallback for now
            } else {
                const res = await fetch('/api/analyze-chart', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        image: imagePreview,
                        additionalContext: { symbol, timeframe }
                    })
                });

                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.details || 'Analysis failed');
                }
                data = await res.json();
            }

            // Schema Enforcement
            const validation = ChartAnalysisSchema.safeParse(data);
            if (!validation.success) {
                console.error('Validation Error:', validation.error);
                throw new Error(`Invalid Response Schema`);
            }

            setRawResult(data);

        } catch (err: any) {
            console.error(err);
            setSnapshotError(err.message || 'An unknown error occurred');
        } finally {
            setSnapshotLoading(false);
        }
    };

    const handleResetSnapshot = () => {
        setImage(null);
        setImagePreview(null);
        setRawResult(null);
        setSnapshotError(null);
    };

    return (
        <div className="flex min-h-screen flex-col bg-black text-white font-sans selection:bg-blue-500/30">
            <main className="flex-1 p-6 relative z-10 overflow-y-auto">
                <div className="max-w-7xl mx-auto space-y-12">

                    {/* SECTION 1: LIVE DASHBOARD */}
                    <section className="space-y-6">
                        {/* Header & Search */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 backdrop-blur-sm">
                            <div>
                                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                                    Advanced Market Engine
                                </h1>
                                <p className="text-zinc-400 text-sm">Real-time Institutional Analytics</p>
                            </div>

                            <div className="flex gap-2 w-full md:w-auto">
                                <input
                                    type="text"
                                    value={symbol}
                                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                                    placeholder="Symbol (e.g. MNQ)"
                                    className="bg-zinc-950 border border-zinc-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64 transition-all"
                                    onKeyDown={(e) => e.key === 'Enter' && fetchDashboardData()}
                                />
                                <button
                                    onClick={() => fetchDashboardData()}
                                    disabled={dashboardLoading}
                                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {dashboardLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Loading
                                        </>
                                    ) : 'Analyze'}
                                </button>
                            </div>
                        </div>

                        {/* Live Dashboard Data Grid */}
                        {dashboardError && (
                            <div className="bg-red-900/20 border border-red-900/50 text-red-200 p-4 rounded-xl flex items-center gap-3">
                                <span className="text-xl">⚠️</span> {dashboardError}
                            </div>
                        )}

                        {dashboardData && (
                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in duration-500">
                                {/* ... (Reusing Dashboard Grid Layout) ... */}
                                {/* Keeping it concise by just rendering the imported panels for now, 
                                    actually I need to copy the FULL JSX grid from page.tsx to replicate exact look. 
                                    I will simplify slightly but keep structure. */}

                                {/* GLOBAL SENTIMENT (Full Width) */}
                                <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                                    {/* Price Card */}
                                    <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                                        <span className="text-zinc-500 text-xs uppercase tracking-wider">Current Price</span>
                                        <div className="flex items-baseline gap-2 mt-1">
                                            <span className="text-3xl font-bold text-white">{dashboardData.regularMarketPrice?.toFixed(2)}</span>
                                            <span className="text-sm text-zinc-400">{dashboardData.currency}</span>
                                        </div>
                                        <div className="mt-2 flex gap-4 text-xs text-zinc-500">
                                            <span>Prev: {dashboardData.previousClose?.toFixed(2)}</span>
                                            <span>Daily Open: {dashboardData.trueDayOpen?.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    {/* Composite Bias Card */}
                                    <div className="bg-zinc-900 border border-zinc-800 p-0 rounded-xl col-span-1 md:col-span-3 overflow-hidden relative group min-h-[160px]">
                                        {/* Background Image */}
                                        <div className="absolute inset-0 z-0">
                                            <img
                                                src={(dashboardData.analysis?.bias?.score || 0) >= 0 ? '/bull_market.png' : '/bear_market.png'}
                                                alt="Market Bias"
                                                className="w-full h-full object-cover opacity-80"
                                            />
                                            <div className="absolute inset-0 bg-zinc-950/80" />
                                        </div>

                                        <div className="relative z-10 p-4 h-full flex flex-col justify-between">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="text-zinc-500 text-xs uppercase tracking-wider font-bold">Composite Bias Model</span>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className={`text-2xl font-black ${(dashboardData.analysis?.bias?.score || 0) >= 20 ? 'text-green-400' :
                                                            (dashboardData.analysis?.bias?.score || 0) <= -20 ? 'text-red-400' : 'text-zinc-400'
                                                            }`}>
                                                            {dashboardData.analysis?.bias?.label || 'NEUTRAL'}
                                                        </span>
                                                        <span className="px-2 py-0.5 bg-zinc-800/80 backdrop-blur rounded text-xs font-mono text-zinc-300 border border-zinc-700">
                                                            Score: {dashboardData.analysis?.bias?.score || 0}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap justify-end gap-1.5 max-w-md">
                                                    {dashboardData.analysis?.bias?.factors.map((f: string, i: number) => (
                                                        <span key={i} className="px-2 py-0.5 bg-zinc-950/60 border border-zinc-700/50 rounded text-[10px] uppercase text-zinc-300 backdrop-blur-sm">
                                                            {f}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="lg:col-span-3 bg-zinc-900 border border-zinc-800 rounded-xl p-1 shadow-2xl relative overflow-hidden h-[500px]">
                                    <Chart data={dashboardData.quotes} colors={{ backgroundColor: '#18181b', textColor: '#52525b' }} />
                                </div>

                                <div className="col-span-12 lg:col-span-3 xl:col-span-2 flex flex-col gap-4">
                                    <TimeAlignmentPanel data={dashboardData} loading={dashboardLoading} />
                                    <MarketContextPanel data={dashboardData} loading={dashboardLoading} />
                                    <BiasPanel data={dashboardData} loading={dashboardLoading} />
                                </div>

                                <div className="space-y-4">
                                    <div className="h-64"><PSPPanel data={dashboardData} loading={dashboardLoading} /></div>
                                    <div className="h-64"><LiquidityPanel data={dashboardData} loading={dashboardLoading} /></div>
                                    <div className="h-80"><StructurePanel data={dashboardData} loading={dashboardLoading} /></div>

                                    {/* 1. Trend Engine */}
                                    <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                                        <h3 className="text-xs font-bold text-zinc-400 uppercase mb-3 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-blue-500" /> Trend Engine
                                        </h3>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-zinc-500">EMA 20</span>
                                                <span className="font-mono text-cyan-400">{dashboardData.analysis?.emas?.ema20?.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-zinc-500">EMA 50</span>
                                                <span className="font-mono text-yellow-400">{dashboardData.analysis?.emas?.ema50?.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-zinc-500">EMA 200</span>
                                                <span className="font-mono text-white">{dashboardData.analysis?.emas?.ema200?.toFixed(2)}</span>
                                            </div>
                                            <div className="h-px bg-zinc-800 my-2" />
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-zinc-500">Regime</span>
                                                <span className={`text-xs font-bold ${(dashboardData.regularMarketPrice || 0) > (dashboardData.analysis?.emas?.ema200 || 0) ? 'text-green-500' : 'text-red-500'
                                                    }`}>
                                                    {(dashboardData.regularMarketPrice || 0) > (dashboardData.analysis?.emas?.ema200 || 0) ? 'MACRO BULLISH' : 'MACRO BEARISH'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2. VWAP Monitor */}
                                    <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                                        <h3 className="text-xs font-bold text-zinc-400 uppercase mb-3 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-orange-500" /> VWAP Monitor
                                        </h3>
                                        <div className="flex justify-between items-end mb-2">
                                            <span className="text-2xl font-bold text-orange-400">{dashboardData.quotes[dashboardData.quotes.length - 1].vwap?.toFixed(2)}</span>
                                            <span className="text-xs text-zinc-500 mb-1">Session VWAP</span>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="text-[10px] text-zinc-500 flex justify-between">
                                                <span>SD+2</span>
                                                <span className="font-mono">{dashboardData.quotes[dashboardData.quotes.length - 1].upper2?.toFixed(2)}</span>
                                            </div>
                                            <div className="text-[10px] text-zinc-500 flex justify-between">
                                                <span>SD+1</span>
                                                <span className="font-mono">{dashboardData.quotes[dashboardData.quotes.length - 1].upper1?.toFixed(2)}</span>
                                            </div>
                                            <div className="text-[10px] text-zinc-500 flex justify-between">
                                                <span>SD-1</span>
                                                <span className="font-mono">{dashboardData.quotes[dashboardData.quotes.length - 1].lower1?.toFixed(2)}</span>
                                            </div>
                                            <div className="text-[10px] text-zinc-500 flex justify-between">
                                                <span>SD-2</span>
                                                <span className="font-mono">{dashboardData.quotes[dashboardData.quotes.length - 1].lower2?.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 3. SMC Scanner */}
                                    <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                                        <h3 className="text-xs font-bold text-zinc-400 uppercase mb-3 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-purple-500" /> SMC Scanner
                                        </h3>

                                        {/* Liquidity */}
                                        <div className="mb-3">
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase">Active Liquidity</span>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {dashboardData.analysis?.liquidity && dashboardData.analysis.liquidity.length > 0 ? (
                                                    dashboardData.analysis.liquidity.map((l: any, i: number) => (
                                                        <span key={i} className={`px-1.5 py-0.5 rounded text-[10px] border ${l.type === 'EQH' ? 'border-red-900/50 text-red-400 bg-red-900/10' : 'border-green-900/50 text-green-400 bg-green-900/10'
                                                            }`}>
                                                            {l.type} @ {l.price.toFixed(2)}
                                                        </span>
                                                    ))
                                                ) : <span className="text-zinc-600 text-xs italic">No clear pools</span>}
                                            </div>
                                        </div>

                                        {/* FVG */}
                                        <div>
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase">Recent Imbalances</span>
                                            <div className="space-y-1 mt-1 max-h-24 overflow-y-auto">
                                                {dashboardData.analysis?.fvgs && dashboardData.analysis.fvgs.slice(-3).reverse().map((f: any, i: number) => (
                                                    <div key={i} className="flex justify-between text-[10px] text-zinc-400">
                                                        <span className={f.type === 'BULLISH' ? 'text-green-500' : 'text-red-500'}>{f.type} FVG</span>
                                                        <span className="font-mono">{f.bottom.toFixed(2)} - {f.top.toFixed(2)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 4. SMT Matrix */}
                                    <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                                        <h3 className="text-xs font-bold text-zinc-400 uppercase mb-3 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-pink-500" /> SMT Matrix
                                        </h3>
                                        <div className="space-y-2">
                                            {dashboardData.analysis?.smt && dashboardData.analysis.smt.length > 0 ? (
                                                dashboardData.analysis.smt.map((s: any, i: number) => (
                                                    <div key={i} className={`p-2 rounded text-xs border ${s.type === 'BEARISH' ? 'bg-red-950/30 border-red-900/50 text-red-300' : 'bg-green-950/30 border-green-900/50 text-green-300'
                                                        }`}>
                                                        <div className="font-bold mb-0.5">{s.type} DIVERGENCE</div>
                                                        <div className="text-[10px] opacity-70">vs {s.referenceSymbol.replace('=F', '')}</div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-zinc-600 text-xs text-center py-2">No Active Divergences</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 5. Risk Analysis (NEW) */}
                                    {dashboardData.analysis?.risk && dashboardData.analysis.risk.direction !== 'NEUTRAL' && (
                                        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                                            <h3 className="text-xs font-bold text-zinc-400 uppercase mb-3 flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-teal-500" /> Risk Analysis
                                            </h3>

                                            <div className="space-y-3">
                                                {/* Invalidation Level */}
                                                {dashboardData.analysis.risk.invalidation && (
                                                    <div>
                                                        <span className="text-[10px] uppercase text-zinc-500 font-bold">Invalidation Zone</span>
                                                        <div className="flex justify-between items-center mt-1 p-2 bg-red-950/20 border border-red-900/30 rounded">
                                                            <div>
                                                                <div className="text-red-400 font-mono font-bold text-sm">{dashboardData.analysis.risk.invalidation.price.toFixed(2)}</div>
                                                                <div className="text-[10px] text-zinc-500">{dashboardData.analysis.risk.invalidation.description}</div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-red-400/70 text-xs">-{dashboardData.analysis.risk.invalidation.distance.toFixed(2)} pts</div>
                                                                <div className="text-[10px] text-zinc-600">{dashboardData.analysis.risk.invalidation.distancePct.toFixed(2)}%</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* R:R Display */}
                                                {dashboardData.analysis.risk.rrRatio && (
                                                    <div className="flex justify-between items-center px-1">
                                                        <span className="text-[10px] text-zinc-500">Theoretical R:R</span>
                                                        <span className="text-xs font-mono font-bold text-zinc-300">1 : {dashboardData.analysis.risk.rrRatio.toFixed(2)}</span>
                                                    </div>
                                                )}

                                                {/* Targets */}
                                                <div>
                                                    <span className="text-[10px] uppercase text-zinc-500 font-bold">Potential Targets</span>
                                                    <div className="space-y-1.5 mt-1">
                                                        {dashboardData.analysis.risk.targets.map((t: any, i: number) => (
                                                            <div key={i} className="flex justify-between items-center p-2 bg-green-950/20 border border-green-900/30 rounded">
                                                                <div>
                                                                    <div className="text-green-400 font-mono font-bold text-sm">{t.price.toFixed(2)}</div>
                                                                    <div className="text-[10px] text-zinc-500">{t.description}</div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="text-green-400/70 text-xs">+{t.distance.toFixed(2)} pts</div>
                                                                    <div className="text-[10px] text-zinc-600">{t.distancePct.toFixed(2)}%</div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="lg:col-span-4">
                                    <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                                        <ScenariosPanel data={dashboardData} loading={dashboardLoading} timeframe={dashboardData.analysis?.interval || '1m'} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    <hr className="border-zinc-800" />

                    {/* SECTION 2: SNAPSHOT ANALYSIS */}
                    <section id="snapshot-analysis" className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black tracking-tight text-white mb-1">Snapshot Intelligence</h2>
                                <p className="text-zinc-500 text-sm">Vision-Only Market Structure & Liquidity Detection</p>
                            </div>

                            {/* Snapshot Settings (Threshold + Timeframe) */}
                            <div className="flex items-center gap-4 bg-zinc-900 p-2 rounded-xl border border-zinc-800">
                                <div className="flex flex-col px-2 border-r border-zinc-800 mr-2 pr-4">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Context Timeframe</label>
                                    <select
                                        value={timeframe}
                                        onChange={(e) => setTimeframe(e.target.value)}
                                        className="bg-transparent text-sm font-bold text-blue-500 w-24 outline-none cursor-pointer"
                                    >
                                        <option value="">Auto</option>
                                        <option value="M1">M1</option>
                                        <option value="M5">M5</option>
                                        <option value="M15">M15</option>
                                        <option value="H1">H1</option>
                                        <option value="H4">H4</option>
                                        <option value="D1">D1</option>
                                    </select>
                                </div>
                                <div className="flex flex-col px-2">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Confidence Threshold</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="range"
                                            min="0" max="100"
                                            value={confThreshold}
                                            onChange={(e) => setConfThreshold(Number(e.target.value))}
                                            className="w-24 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                        />
                                        <span className="text-xs font-mono font-bold text-blue-500">{confThreshold}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {!displayResult ? (
                            // Upload State
                            <div className="flex flex-col items-center justify-center min-h-[400px] border border-zinc-800/50 rounded-2xl bg-zinc-900/20">
                                <ChartUpload
                                    onImageSelected={handleImageSelect}
                                    onMockToggle={setIsMockMode}
                                    isMockMode={isMockMode}
                                />

                                {image && (
                                    <button
                                        onClick={handleAnalyzeSnapshot}
                                        disabled={snapshotLoading}
                                        className={`mt-8 px-8 py-3 rounded-xl font-bold text-lg flex items-center gap-2 transition-all
                                            ${snapshotLoading
                                                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'}`}
                                    >
                                        {snapshotLoading && <Loader2 size={20} className="animate-spin" />}
                                        {snapshotLoading ? 'Analyzing Snapshot...' : 'Run Vision Analysis'}
                                    </button>
                                )}

                                {snapshotError && (
                                    <div className="mt-4 p-4 bg-red-950/30 border border-red-500/20 text-red-400 rounded-xl max-w-md text-center">
                                        <p className="font-bold mb-1">Analysis Failed</p>
                                        <p className="text-xs opacity-80">{snapshotError}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Result State
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[800px]">
                                {/* Left: Chart + Overlay */}
                                <div className="lg:col-span-2 bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden relative flex flex-col">
                                    <div className="absolute top-4 right-4 z-20 flex gap-2">
                                        <button
                                            onClick={handleResetSnapshot}
                                            className="bg-black/50 backdrop-blur text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-black/70 flex items-center gap-2"
                                        >
                                            <RefreshCw size={14} /> New Scan
                                        </button>
                                    </div>

                                    <div className="flex-1 relative bg-black/50 flex items-center justify-center p-4">
                                        {imagePreview && (
                                            <ChartOverlay
                                                imageSrc={imagePreview}
                                                overlayData={displayResult.overlay}
                                            />
                                        )}
                                    </div>
                                </div>

                                {/* Right: Analysis Panel */}
                                <div className="lg:col-span-1 h-full overflow-hidden flex flex-col gap-4">
                                    <AnalysisResults data={displayResult} />

                                    {/* Debug Section */}
                                    <div className="mt-auto border-t border-zinc-800 pt-4">
                                        <button
                                            onClick={() => setShowDebug(!showDebug)}
                                            className="text-xs font-bold text-zinc-500 hover:text-zinc-300 w-full text-left flex justify-between uppercase"
                                        >
                                            <span>Raw Model Output</span>
                                            <span>{showDebug ? 'Hide' : 'Show'}</span>
                                        </button>
                                        {showDebug && rawResult && (
                                            <div className="mt-2 bg-black/50 rounded p-2 text-[10px] font-mono text-zinc-400 h-32 overflow-y-auto border border-zinc-800">
                                                <pre>{JSON.stringify(rawResult, null, 2)}</pre>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
}
