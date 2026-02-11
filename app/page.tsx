'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Search, TrendingUp, AlertCircle, Loader2, Menu, X } from 'lucide-react';
import { ScenariosPanel } from './components/ScenariosPanel';
import { PSPPanel } from './components/PSPPanel';
import { TimeAlignmentPanel } from './components/TimeAlignmentPanel';
import MarketContextCompact from './components/MarketContextCompact';
import { StructurePanel } from './components/StructurePanel';
import { LiquidityPanel } from './components/LiquidityPanel';
import { ConfluencePanel } from './components/ConfluencePanel';
import { BiasPanel, LevelsPanel } from './components/DashboardPanels';
import { ActiveTradePanel } from './components/ActiveTradePanel';
import { SidebarActiveTrade } from './components/SidebarActiveTrade';
import { useActiveTrade } from './context/ActiveTradeContext';

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
                        {data.analysis?.bias?.factors.map((f: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 bg-zinc-950/60 border border-zinc-700/50 rounded text-[10px] uppercase text-zinc-300 backdrop-blur-sm">
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* MAIN CHART AREA (Left - 3 Cols logic, visually prominent) */}
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
                {/* Removed duplicate SidebarActiveTrade here, it is now in the sidebar/drawer */}
                <TimeAlignmentPanel data={data} loading={loading} />

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
                <ConfluencePanel data={data} loading={loading} />
                <BiasPanel data={data} loading={loading} />
                <LevelsPanel data={data} loading={loading} />
              </div>

              {/* ANALYTICS SIDEBAR (Right - 1 Col) */}
              <div id="analytics-section" className="col-span-1 lg:col-span-1 space-y-4 w-full">

                {/* Active Trades Watchlist (Desktop Only - Mobile uses Drawer) */}
                <div className="hidden md:block">
                  <SidebarActiveTrade data={data} />
                </div>
                <ActiveTradePanel data={data} loading={loading} />

                {/* 0. PSP Scanner */}
                <div className="h-64">
                  <PSPPanel data={data} loading={loading} />
                </div>

                {/* 0.2 Liquidity & Range */}
                <div className="h-64">
                  <LiquidityPanel data={data} loading={loading} />
                </div>

                {/* 0.5 Structure Map */}
                <div className="h-80">
                  <StructurePanel data={data} loading={loading} />
                </div>

                {/* 1. Trend Engine */}
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" /> Trend Engine
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">EMA 20</span>
                      <span className="font-mono text-cyan-400">{data.analysis?.emas?.ema20?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">EMA 50</span>
                      <span className="font-mono text-yellow-400">{data.analysis?.emas?.ema50?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">EMA 200</span>
                      <span className="font-mono text-white">{data.analysis?.emas?.ema200?.toFixed(2)}</span>
                    </div>
                    <div className="h-px bg-zinc-800 my-2" />
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-500">Regime</span>
                      <span className={`text-xs font-bold ${(data.regularMarketPrice || 0) > (data.analysis?.emas?.ema200 || 0) ? 'text-green-500' : 'text-red-500'
                        }`}>
                        {(data.regularMarketPrice || 0) > (data.analysis?.emas?.ema200 || 0) ? 'MACRO BULLISH' : 'MACRO BEARISH'}
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
                    <span className="text-2xl font-bold text-orange-400">{data.quotes[data.quotes.length - 1].vwap?.toFixed(2)}</span>
                    <span className="text-xs text-zinc-500 mb-1">Session VWAP</span>
                  </div>
                  <div className="space-y-1">
                    {/* Mock visualization of bands */}
                    <div className="text-[10px] text-zinc-500 flex justify-between">
                      <span>SD+2</span>
                      <span className="font-mono">{data.quotes[data.quotes.length - 1].upper2?.toFixed(2)}</span>
                    </div>
                    <div className="text-[10px] text-zinc-500 flex justify-between">
                      <span>SD+1</span>
                      <span className="font-mono">{data.quotes[data.quotes.length - 1].upper1?.toFixed(2)}</span>
                    </div>
                    <div className="text-[10px] text-zinc-500 flex justify-between">
                      <span>SD-1</span>
                      <span className="font-mono">{data.quotes[data.quotes.length - 1].lower1?.toFixed(2)}</span>
                    </div>
                    <div className="text-[10px] text-zinc-500 flex justify-between">
                      <span>SD-2</span>
                      <span className="font-mono">{data.quotes[data.quotes.length - 1].lower2?.toFixed(2)}</span>
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
                      {data.analysis?.liquidity && data.analysis.liquidity.length > 0 ? (
                        data.analysis.liquidity.map((l: any, i: number) => (
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
                      {data.analysis?.fvgs && data.analysis.fvgs.slice(-3).reverse().map((f: any, i: number) => (
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
                    {data.analysis?.smt && data.analysis.smt.length > 0 ? (
                      data.analysis.smt.map((s: any, i: number) => (
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
                {data.analysis?.risk && data.analysis.risk.direction !== 'NEUTRAL' && (
                  <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-teal-500" /> Risk Analysis
                    </h3>

                    <div className="space-y-3">
                      {/* Invalidation Level */}
                      {data.analysis.risk.invalidation && (
                        <div>
                          <span className="text-[10px] uppercase text-zinc-500 font-bold">Invalidation Zone</span>
                          <div className="flex justify-between items-center mt-1 p-2 bg-red-950/20 border border-red-900/30 rounded">
                            <div>
                              <div className="text-red-400 font-mono font-bold text-sm">{data.analysis.risk.invalidation.price.toFixed(2)}</div>
                              <div className="text-[10px] text-zinc-500">{data.analysis.risk.invalidation.description}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-red-400/70 text-xs">-{data.analysis.risk.invalidation.distance.toFixed(2)} pts</div>
                              <div className="text-[10px] text-zinc-600">{data.analysis.risk.invalidation.distancePct.toFixed(2)}%</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* R:R Display */}
                      {data.analysis.risk.rrRatio && (
                        <div className="flex justify-between items-center px-1">
                          <span className="text-[10px] text-zinc-500">Theoretical R:R</span>
                          <span className="text-xs font-mono font-bold text-zinc-300">1 : {data.analysis.risk.rrRatio.toFixed(2)}</span>
                        </div>
                      )}

                      {/* Targets */}
                      <div>
                        <span className="text-[10px] uppercase text-zinc-500 font-bold">Potential Targets</span>
                        <div className="space-y-1.5 mt-1">
                          {data.analysis.risk.targets.map((t: any, i: number) => (
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
