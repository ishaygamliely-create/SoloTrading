'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Search, TrendingUp, AlertCircle, Loader2, Menu, X } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ScenariosPanel } from './components/ScenariosPanel';
import { PSPPanel } from './components/PSPPanel';
import { TimeAlignmentPanel } from './components/TimeAlignmentPanel';
import MarketContextCompact from './components/MarketContextCompact';
import { SMTPanel } from './components/SMTPanel';
import { SessionPanel } from './components/SessionPanel';
import { LiquidityPanel } from './components/LiquidityPanel';
import { ConfluencePanel } from './components/ConfluencePanel';
import { LevelsPanel } from './components/LevelsPanel';
import { BiasPanel } from './components/BiasPanel';
import { ValueZonePanel } from './components/ValueZonePanel';
import { StructurePanel } from './components/StructurePanel';
import { RiskPanel } from './components/RiskPanel';
import { ActiveTradePanel } from './components/ActiveTradePanel';
import { SidebarActiveTrade } from './components/SidebarActiveTrade';

function TradePanelSection({ data, loading }: { data: any, loading: boolean }) {
  // Active Trade is now handled in the SidebarActiveTrade component
  // to avoid blocking the scenarios grid.

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl w-full">
      <h3 className="text-sm font-bold text-zinc-400 uppercase mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-indigo-500" /> Trade Execution Scenarios
      </h3>
      <ScenariosPanel
        data={data}
        loading={loading}
        timeframe={data.analysis?.interval || '1m'}
      />
    </div>
  );
}

const Chart = dynamic(() => import('./components/Chart').then(mod => mod.Chart), {
  ssr: false,
  loading: () => <div className="h-[500px] w-full flex items-center justify-center bg-zinc-900/50 rounded-xl text-zinc-500">Loading Chart...</div>
});

export default function Home() {
  const [symbol, setSymbol] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  const fetchData = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!symbol) return;

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch(`/api/stock?symbol=${symbol}`);
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

              {/* Mobile Navigation Links or other sidebar items could go here */}
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
              {/* Mobile Hamburger */}
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
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="Symbol (e.g. MNQ)"
                className="bg-zinc-950 border border-zinc-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64 transition-all text-sm md:text-base"
                onKeyDown={(e) => e.key === 'Enter' && fetchData()}
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

          {data && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 w-full">

              {/* GLOBAL SENTIMENT (Full Width) */}
              <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Price Card */}
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                  <span className="text-zinc-500 text-xs uppercase tracking-wider">Current Price</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-bold text-white">{data.regularMarketPrice?.toFixed(2)}</span>
                    <span className="text-sm text-zinc-400">{data.currency}</span>
                  </div>
                  <div className="mt-2 flex gap-4 text-xs text-zinc-500">
                    <span>Prev: {data.previousClose?.toFixed(2)}</span>
                    <span>Daily Open: {data.trueDayOpen?.toFixed(2)}</span>
                  </div>
                </div>

                {/* Composite Bias Card */}
                <div className="bg-zinc-900 border border-zinc-800 p-0 rounded-xl col-span-1 md:col-span-3 overflow-hidden relative group min-h-[160px]">
                  {/* Background Image */}
                  <div className="absolute inset-0 z-0">
                    <img
                      src={(data.analysis?.bias?.score || 0) >= 0 ? '/bull_market.png' : '/bear_market.png'}
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
                          <span className={`text-2xl font-black ${(data.analysis?.bias?.score || 0) >= 20 ? 'text-green-400' :
                            (data.analysis?.bias?.score || 0) <= -20 ? 'text-red-400' : 'text-zinc-400'
                            }`}>
                            {data.analysis?.bias?.label || 'NEUTRAL'}
                          </span>
                          <span className="px-2 py-0.5 bg-zinc-800/80 backdrop-blur rounded text-xs font-mono text-zinc-300 border border-zinc-700">
                            Score: {data.analysis?.bias?.score || 0}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap justify-end gap-1.5 max-w-md">
                        {(data.analysis?.bias?.factors || []).map((f: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 bg-zinc-950/60 border border-zinc-700/50 rounded text-[10px] uppercase text-zinc-300 backdrop-blur-sm">
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* MAIN CHART AREA (Left - 3 Cols logic) */}
              <div className="lg:col-span-3 bg-zinc-900 border border-zinc-800 rounded-xl p-1 shadow-2xl relative overflow-hidden h-[350px] md:h-[500px]">
                {/* Header overlay for chart */}
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

              {/* LEFT COLUMN: VISUALS & BIAS (2 Cols) */}
              <div className="col-span-1 lg:col-span-3 xl:col-span-2 flex flex-col gap-4 w-full">

                <TimeAlignmentPanel data={data} loading={loading} />

                <ErrorBoundary name="MarketContext">
                  {data.analysis?.marketContext && (
                    <MarketContextCompact
                      price={data.analysis.marketContext.price}
                      pdh={data.analysis.marketContext.pdh}
                      pdl={data.analysis.marketContext.pdl}
                      eq={data.analysis.marketContext.eq}
                      dailyRangePercent={data.analysis.marketContext.dailyRangePercent}
                      regime={data.analysis.marketContext.regime}
                      biasMode={data.analysis.marketContext.biasMode}
                      dataStatus={data.analysis.marketContext.dataStatus}
                      dataAgeLabel={data.analysis.marketContext.dataAgeLabel}
                      lastBarNyTime={data.analysis.marketContext.lastBarNyTime}
                    />
                  )}
                </ErrorBoundary>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ErrorBoundary name="ConfluencePanel">
                    <ConfluencePanel data={data} loading={loading} />
                  </ErrorBoundary>

                  <ErrorBoundary name="BiasPanel">
                    <BiasPanel data={data} loading={loading} />
                  </ErrorBoundary>

                  <ErrorBoundary name="ValueZonePanel">
                    <ValueZonePanel data={data} loading={loading} />
                  </ErrorBoundary>

                  <ErrorBoundary name="StructurePanel">
                    <StructurePanel data={data} loading={loading} />
                  </ErrorBoundary>

                  <ErrorBoundary name="LevelsPanel">
                    <LevelsPanel data={data} loading={loading} />
                  </ErrorBoundary>
                </div>
              </div>

              {/* ANALYTICS SIDEBAR (Right - 1 Col) */}
              <div id="analytics-section" className="col-span-1 lg:col-span-1 space-y-4 w-full">

                {/* Active Trades Watchlist (Desktop Only - Mobile uses Drawer) */}
                <div className="hidden md:block">
                  <SidebarActiveTrade data={data} />
                </div>

                <ActiveTradePanel data={data} loading={loading} />

                <div className="h-64">
                  <PSPPanel data={data} loading={loading} />
                </div>

                <div className="h-64">
                  <LiquidityPanel data={data} loading={loading} />
                </div>

                <div className="h-32">
                  <SMTPanel data={data} loading={loading} />
                </div>

                <div className="h-24">
                  <SessionPanel session={data.session} />
                </div>

                <div className="h-48">
                  <RiskPanel data={data} loading={loading} />
                </div>
              </div>

              {/* TRADE SCENARIOS PANEL (Full Width) */}
              <div className="lg:col-span-4">
                <TradePanelSection data={data} loading={loading} />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
