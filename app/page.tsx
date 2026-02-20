'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Search, TrendingUp, AlertCircle, Loader2, Menu, X, Activity, Zap, BookOpen } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ScenariosPanel } from './components/ScenariosPanel';
import { PSPPanel } from './components/PSPPanel';
import MarketContextCompact from './components/MarketContextCompact';
import { SMTPanel } from './components/SMTPanel';
import { SessionPanel } from './components/SessionPanel';
import { LiquidityPanel } from './components/LiquidityPanel';
import ConfluencePanel from './components/ConfluencePanel';
import { LevelsPanel } from './components/LevelsPanel';
import { BiasPanel } from './components/BiasPanel';
import { TrueOpenPanel } from './components/TrueOpenPanel';
import { ValueZonePanel } from './components/ValueZonePanel';
import { StructurePanel } from './components/StructurePanel';
import { RiskPanel } from './components/RiskPanel';
import { ActiveTradePanel } from './components/ActiveTradePanel';
import { SidebarActiveTrade } from './components/SidebarActiveTrade';
import { ConfidenceLegend } from './components/ConfidenceLegend';
import { VxrPanel } from './components/VxrPanel';
import CollapsibleSection from './components/CollapsibleSection';
import DecisionPanel from './components/DecisionPanel';
import { shouldShowSmt, shouldShowRisk } from './lib/uiPanelRules';

const Chart = dynamic(() => import('./components/Chart').then(mod => mod.Chart), {
  ssr: false,
  loading: () => <div className="h-[500px] w-full flex items-center justify-center bg-zinc-900/50 rounded-xl text-zinc-500">Loading Chart...</div>
});

export default function Home() {
  const [symbol, setSymbol] = useState('MNQ');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  // UI Toggles
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);

  const fetchData = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!symbol) return;

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch(`/api/stock?symbol=MNQ`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch data');
      }

      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Logic for Visibility ---
  let analysis = null;
  let confluence = null;
  let showSmt = false;
  let showRisk = false;

  if (data && data.analysis) {
    analysis = data.analysis;
    confluence = analysis.confluence;

    const smt = analysis.smt;
    const smtScore = smt?.score ?? 0;

    const smtStatus = smt?.status || (smt ? 'OK' : 'OFF');

    showSmt = shouldShowSmt({
      smtScore,
      smtStatus: smtStatus as any,
      debugOpen,
      advancedOpen,
    });

    showRisk = shouldShowRisk({
      confluenceSuggestion: confluence?.suggestion,
      confluenceLevel: confluence?.level,
    });
  }

  const hasScenarios = !!analysis?.scenarios;

  return (
    <div className="flex min-h-screen flex-col bg-black text-white selection:bg-blue-500/30 font-sans w-full max-w-full overflow-x-hidden">

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-4/5 max-w-xs bg-zinc-900 border-r border-zinc-800 h-full p-4 overflow-y-auto shadow-2xl animate-in slide-in-from-left duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-white">Menu</h2>
              <button onClick={() => setMobileMenuOpen(false)} className="text-zinc-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold text-zinc-500 uppercase mb-2">Active Trades</h3>
                <SidebarActiveTrade data={data} />
              </div>
              <div className="pt-4 border-t border-zinc-800">
                <button
                  onClick={() => { setMobileMenuOpen(false); document.getElementById('analytics-section')?.scrollIntoView({ behavior: 'smooth' }); }}
                  className="w-full text-left py-2 text-zinc-400 hover:text-white text-sm"
                >
                  Scroll to Analytics
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 p-4 md:p-6 relative z-10 overflow-y-auto w-full">
        <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">

          {/* Header & Search */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 backdrop-blur-sm sticky top-0 z-40 md:relative">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-2 -ml-2 text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-lg"
              >
                <Menu size={24} />
              </button>

              <div>
                <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                  Advanced Market Engine
                </h1>
                <p className="text-zinc-400 text-xs md:text-sm">Real-time Institutional Analytics</p>
              </div>
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              {/* Optional: Debug Toggle for testing */}
              <button
                onClick={() => setDebugOpen(!debugOpen)}
                className={`px-3 py-2 text-xs rounded border ${debugOpen ? 'bg-zinc-800 border-zinc-500 text-white' : 'bg-transparent border-transparent text-zinc-600'}`}
              >
                Debug
              </button>

              <input
                type="text"
                value="MNQ (locked)"
                disabled
                className="bg-zinc-950/50 border border-zinc-800 text-zinc-500 px-4 py-2 rounded-lg cursor-not-allowed w-full md:w-64 text-sm md:text-base"
              />
              <button
                onClick={() => fetchData()}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 md:px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap text-sm md:text-base"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="hidden md:inline">Loading</span>
                  </>
                ) : 'Analyze'}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-900/50 text-red-200 p-4 rounded-xl flex items-center gap-3">
              <span className="text-xl">⚠️</span> {error}
            </div>
          )}

          {data && analysis && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 w-full">

              {/* 1. CHART AREA (Col-span-3) */}
              <div className="lg:col-span-3 space-y-4">
                {/* Price Header inside Chart Area for visibility */}
                <div className="relative bg-zinc-900/80 border border-zinc-800 p-4 rounded-xl flex justify-between items-center overflow-hidden backdrop-blur-md">
                  {/* Background Gradient Effect */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                        {data.symbol || symbol}  {/* Fallback to state symbol if data empty */}
                      </span>
                      <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wide">Live</span>
                      </div>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl md:text-5xl font-black text-white tracking-tight tabular-nums">
                        {data.regularMarketPrice?.toFixed(2) ?? '---'}
                      </span>
                      <span className="text-sm font-medium text-zinc-500">{data.currency || 'USD'}</span>
                    </div>
                  </div>

                  <div className="relative z-10 flex flex-col gap-1 text-right">
                    <div className="flex md:flex-row flex-col gap-2">
                      <div className="flex flex-col items-end px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold">Open</span>
                        <span className="text-sm font-mono font-medium text-blue-200">{data.trueDayOpen?.toFixed(2) ?? '-'}</span>
                      </div>
                      <div className="flex flex-col items-end px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold">Prev Close</span>
                        <span className="text-sm font-mono font-medium text-zinc-400">{data.previousClose?.toFixed(2) ?? '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-1 shadow-2xl relative overflow-hidden h-[500px]">
                  <div className="absolute top-4 left-4 z-10 pointer-events-none">
                    <span className="px-2 py-1 bg-black/50 backdrop-blur text-xs text-zinc-300 rounded">
                      1M Interval • Live
                    </span>
                  </div>
                  <Chart
                    data={data.quotes}
                    colors={{ backgroundColor: '#18181b', textColor: '#52525b' }}
                  />
                </div>

                {/* Market Context Compact inside Chart Column (Bottom) */}
                <ErrorBoundary name="MarketContext">
                  {analysis.marketContext && (
                    <MarketContextCompact
                      price={analysis.marketContext.price}
                      pdh={analysis.marketContext.pdh}
                      pdl={analysis.marketContext.pdl}
                      eq={analysis.marketContext.eq}
                      dailyRangePercent={analysis.marketContext.dailyRangePercent}
                      regime={analysis.marketContext.regime}
                      biasMode={analysis.marketContext.biasMode}
                      dataStatus={analysis.marketContext.dataStatus}
                      dataAgeLabel={analysis.marketContext.dataAgeLabel}
                      lastBarNyTime={analysis.marketContext.lastBarNyTime}
                    />
                  )}
                </ErrorBoundary>

                {/* Scenarios - Collapsible default Closed */}
                {hasScenarios && (
                  <CollapsibleSection title="Trade Execution Scenarios" defaultOpen={false}>
                    <ScenariosPanel
                      data={data}
                      loading={loading}
                      timeframe={analysis.interval || '1m'}
                    />
                  </CollapsibleSection>
                )}
              </div>

              {/* 2. ANALYTICS SIDEBAR (Col-span-1) - The STACK */}
              <div id="analytics-section" className="col-span-1 lg:col-span-1 flex flex-col gap-4">

                {/* 0) Decision strip always on top */}
                {confluence && (
                  <DecisionPanel
                    data={{
                      direction: confluence.suggestion || 'NO_TRADE',
                      confidencePct: confluence.scorePct || 0,
                      status: (confluence.status === 'BLOCKED' || confluence.status === 'OFF') ? 'WARN' : (confluence.status as any) || 'OK',
                      reason: confluence.level !== 'NO_TRADE'
                        ? `Strong alignment detected (${confluence.level})`
                        : 'Market condition is neutral or conflicting.',
                      topDrivers: confluence.factors
                    }}
                  />
                )}

                {/* Active Trade Management (Desktop) */}
                <div className="hidden md:block">
                  <SidebarActiveTrade data={data} />
                </div>
                <ActiveTradePanel data={data} loading={loading} />

                {/* 1) CORE & PRIMARY ANALYTICS: always visible */}
                <ConfluencePanel data={confluence} />
                <PSPPanel data={data} loading={loading} />
                <LiquidityPanel data={data} loading={loading} />
                <VxrPanel data={data} loading={loading} />

                {/* SMT moved out of collapsible for visibility */}
                {showSmt && <SMTPanel data={data} loading={loading} />}

                <TrueOpenPanel data={data} loading={loading} />
                <BiasPanel data={data} loading={loading} />
                <StructurePanel data={data} loading={loading} />
                <ValueZonePanel data={data} loading={loading} />

                {/* 2) ADVANCED: collapsible */}
                <CollapsibleSection
                  title="Advanced Indicators"
                  defaultOpen={false}
                  right={
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAdvancedOpen((v) => !v);
                        }}
                        className={`text-xs px-2 py-1 rounded-full ${advancedOpen ? 'bg-blue-600 text-white' : 'bg-white/10 text-white/70'}`}
                      >
                        {advancedOpen ? "ON" : "OFF"}
                      </button>
                    </div>
                  }
                >
                  <div className="space-y-3">
                    <SessionPanel session={data.session} />

                    <LevelsPanel data={data} loading={loading} />

                    {/* Risk only when trade is actionable */}
                    {showRisk && <RiskPanel data={data} loading={loading} />}
                  </div>
                </CollapsibleSection>

                <div className="mt-4">
                  <ConfidenceLegend />
                </div>

                <div className="mt-auto pt-4 text-xs text-zinc-600 text-center">
                  Conf: {confluence?.scorePct || 0}% | SMT: {analysis.smt?.score || 0} | Risk: {showRisk ? 'ON' : 'OFF'}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
