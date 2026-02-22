'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Search, TrendingUp, AlertCircle, Loader2, Menu, X, Activity, Zap, BookOpen, Rocket } from 'lucide-react';
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
import { AdvancedIndicatorsPanel } from './components/AdvancedIndicatorsPanel';
import CollapsibleSection from './components/CollapsibleSection';
import DecisionPanel from './components/DecisionPanel';
import { LandingPage } from './components/LandingPage';
import { PersonaLauncher } from './components/PersonaLauncher';
import { PersonaPanel } from './components/PersonaPanel';
import { shouldShowSmt, shouldShowRisk } from './lib/uiPanelRules';
import { PersonaProfile } from './types/persona';

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
  const [personaOpen, setPersonaOpen] = useState(false);
  const [activePersona, setActivePersona] = useState<PersonaProfile | null>(null);

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

      <main className="flex-1 p-4 md:p-6 pb-64 relative z-10 overflow-y-auto w-full">
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

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                  <Zap size={20} className="text-white fill-white" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-black tracking-tighter text-white">
                    SOLO<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">TRADING</span>
                  </h1>
                </div>
              </div>
            </div>

            <div className="flex gap-2 w-full md:w-auto">
            </div>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-900/50 text-red-200 p-4 rounded-xl flex items-center gap-3">
              <span className="text-xl">⚠️</span> {error}
            </div>
          )}

          {!data && !loading && (
            <LandingPage onSearch={(s) => { setSymbol(s); setTimeout(() => fetchData(), 50); }} loading={loading} />
          )}

          {loading && !data && (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-zinc-500 font-medium animate-pulse">Initializing Institutional Data Feed...</p>
            </div>
          )}

          {data && analysis && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 w-full">

              {/* 1. LEFT COLUMN: INSTITUTIONAL CONTEXT (xl:col-span-3) */}
              <div className="xl:col-span-3 flex flex-col gap-4">
                <BiasPanel data={data} loading={loading} />
                <StructurePanel data={data} loading={loading} />
                <ValueZonePanel data={data} loading={loading} />
                <TrueOpenPanel data={data} loading={loading} />
                <LiquidityPanel data={data} loading={loading} />
              </div>

              {/* 2. CENTER COLUMN: CHART & EXECUTION (xl:col-span-6) */}
              <div className="xl:col-span-6 lg:col-span-3 space-y-4">
                <div className="relative bg-zinc-900/80 border border-zinc-800 p-4 rounded-xl flex justify-between items-center overflow-hidden backdrop-blur-md">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                        {data.symbol || symbol}
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

                {hasScenarios && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <ScenariosPanel
                      data={data}
                      loading={loading}
                      timeframe={analysis.interval || '1m'}
                      personaFilter={activePersona}
                    />
                  </div>
                )}
              </div>

              {/* 3. RIGHT COLUMN: EXECUTION & SIGNALS (xl:col-span-3) */}
              <div id="analytics-section" className="xl:col-span-3 lg:col-span-1 flex flex-col gap-4">

                {/* Advanced Indicators Trigger Box */}
                <AdvancedIndicatorsPanel
                  isOpen={advancedOpen}
                  onClick={() => setAdvancedOpen(!advancedOpen)}
                />

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

                <div className="hidden md:block">
                  <SidebarActiveTrade data={data} />
                </div>

                <PersonaLauncher
                  isOpen={personaOpen}
                  onClick={() => setPersonaOpen(!personaOpen)}
                  hasActivePersona={!!activePersona}
                />
                <ActiveTradePanel data={data} loading={loading} />

                <ConfluencePanel data={confluence} />
                <PSPPanel data={data} loading={loading} />
                <VxrPanel data={data} loading={loading} />

                {showSmt && <SMTPanel data={data} loading={loading} />}

                <PersonaPanel
                  isOpen={personaOpen}
                  onClose={() => setPersonaOpen(false)}
                  onApply={setActivePersona}
                  activeProfile={activePersona}
                  scenarios={analysis.scenarios || []}
                />

                {/* Advanced Suite Overlay */}
                {advancedOpen && (
                  <div className="fixed inset-0 z-[100] bg-zinc-950/98 backdrop-blur-xl animate-in fade-in duration-300 p-6 md:p-12 overflow-y-auto">
                    <div className="max-w-4xl mx-auto flex flex-col h-full">
                      <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-blue-600 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                            <Rocket size={24} className="text-white" />
                          </div>
                          <div>
                            <h2 className="text-2xl font-black text-white tracking-tight uppercase">Advanced Execution Suite</h2>
                            <p className="text-zinc-500 text-sm font-bold uppercase tracking-wider">Institutional Analysis & Risk Protocol</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setAdvancedOpen(false)}
                          className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-zinc-400 transition-all hover:scale-110 active:scale-90"
                        >
                          <X size={24} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
                        <div className="h-full">
                          <SessionPanel session={analysis.session} />
                        </div>
                        <div className="h-full">
                          <LevelsPanel data={data} loading={loading} />
                        </div>
                        <div className="md:col-span-2 h-full">
                          {showRisk ? (
                            <RiskPanel data={data} loading={loading} />
                          ) : (
                            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
                              <AlertCircle size={48} className="text-zinc-700 mb-4" />
                              <h3 className="text-zinc-500 font-bold uppercase">Risk Engine Standby</h3>
                              <p className="text-zinc-600 text-xs uppercase mt-1">Pending actionable trade setup</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-auto">
                        <button
                          onClick={() => setAdvancedOpen(false)}
                          className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] mb-8"
                        >
                          CLOSE ADVANCED SUITE
                        </button>
                      </div>
                    </div>
                  </div>
                )}

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
