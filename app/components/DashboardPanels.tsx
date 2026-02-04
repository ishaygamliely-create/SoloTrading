'use client';

import React from 'react';

// Type definitions for props
export interface PanelProps {
    data: any;
    loading: boolean;
    timeframe?: string;
}

export function BiasPanel({ data, loading }: PanelProps) {
    if (loading || !data?.analysis?.bias) return <div className="animate-pulse bg-zinc-900 h-64 rounded-xl border border-zinc-800"></div>;

    const { score, label, factors } = data.analysis.bias;
    const isBull = score >= 0;

    // Use placeholder images that "exist" or fallback to gradients
    // If files are real, they will load. If not, we can use a creative fallback.
    const visualSrc = isBull ? '/bull_market.png' : '/bear_market.png';

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden relative min-h-[250px] group">
            {/* Background Image with Fallback Gradient */}
            <div className={`absolute inset-0 z-0 opacity-40 transition-opacity duration-1000 ${isBull ? 'bg-gradient-to-br from-green-900 to-black' : 'bg-gradient-to-br from-red-900 to-black'}`}>
                {/* Try to show image, if it fails, the gradient behind works */}
                <img
                    src={visualSrc}
                    alt="Market Regime"
                    className={`w-full h-full object-cover opacity-80 transition-transform duration-1000 ${isBull ? 'group-hover:scale-105' : 'animate-ken-burns'}`}
                />
            </div>

            <div className="relative z-10 p-6 flex flex-col h-full bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent">
                <div className="flex-1"></div>
                <div>
                    <h2 className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
                        Market Bias {isBull ? <TrendingUp size={14} className="text-green-500" /> : <TrendingUp size={14} className="text-red-500 rotate-180" />}
                    </h2>
                    <div className={`text-4xl font-black tracking-tighter mb-4 ${isBull ? 'text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.3)]' : 'text-red-500 drop-shadow-[0_0_15px_rgba(248,113,113,0.3)]'}`}>
                        {label}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {factors.slice(0, 6).map((f: string, i: number) => (
                            <span key={i} className={`px-2 py-1 border rounded text-[10px] uppercase font-bold backdrop-blur-md ${f.includes('Bull') || f.includes('Above') || f.includes('Support')
                                ? 'bg-green-950/30 border-green-800/50 text-green-200'
                                : 'bg-red-950/30 border-red-800/50 text-red-200'
                                }`}>
                                {f}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function LevelsPanel({ data, loading }: PanelProps) {
    if (loading || !data?.levels) return <div className="animate-pulse bg-zinc-900 h-full rounded-xl border border-zinc-800"></div>;

    const { trueDayOpen, trueWeekOpen, pdh, pdl, vwap, sdValues } = data.levels;
    const price = data.price;

    const LevelRow = ({ label, value, color = 'text-zinc-300' }: any) => (
        <div className="flex justify-between items-center py-2.5 border-b border-zinc-800/50 last:border-0 hover:bg-white/5 transition-colors px-2 rounded">
            <span className="text-xs text-zinc-500 font-medium uppercase tracking-wide">{label}</span>
            <div className="text-right">
                <div className={`text-sm font-mono font-bold ${color}`}>{value && value > 0 ? value.toFixed(2) : 'N/A'}</div>
                {value && value > 0 && <div className={`text-[9px] font-bold uppercase ${price > value ? 'text-green-500/70' : 'text-red-500/70'}`}>
                    {price > value ? 'Testing Support' : 'Testing Resistance'}
                </div>}
            </div>
        </div>
    );

    return (
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl h-full">
            <h3 className="text-xs font-bold text-zinc-400 uppercase mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" /> Key Levels
            </h3>
            <div className="flex flex-col gap-0.5">
                <LevelRow label="True Day Open" value={trueDayOpen} color="text-blue-400" />
                <LevelRow label="True Week Open" value={trueWeekOpen} color="text-purple-400" />
                <LevelRow label="Prev Day High" value={pdh} color="text-red-400" />
                <LevelRow label="Prev Day Low" value={pdl} color="text-green-400" />
                <LevelRow label="Session VWAP" value={vwap} color="text-orange-400" />
                {sdValues && (
                    <>
                        <LevelRow label="SD +1" value={sdValues.sd1_upper} color="text-orange-300/70" />
                        <LevelRow label="SD +2" value={sdValues.sd2_upper} color="text-orange-300/50" />
                        <LevelRow label="SD -1" value={sdValues.sd1_lower} color="text-orange-300/70" />
                        <LevelRow label="SD -2" value={sdValues.sd2_lower} color="text-orange-300/50" />
                    </>
                )}
            </div>
        </div>
    );
}

export function TrendPanel({ data, loading, timeframe }: PanelProps) {
    if (loading || !data?.analysis?.emas) return <div className="animate-pulse bg-zinc-900 h-full rounded-xl border border-zinc-800"></div>;

    const { ema20, ema50, ema200, slope20, slope50, slope200 } = data.analysis.emas;
    const price = data.price || (data.quotes ? data.quotes[data.quotes.length - 1].close : 0);

    // Determine Regime
    let status = 'NEUTRAL';
    let statusColor = 'text-zinc-400';

    if (price > ema200) {
        if (ema20 > ema50 && ema50 > ema200 && slope20 > 0 && slope50 > 0) {
            status = 'STRONG BULLISH'; statusColor = 'text-green-500';
        } else {
            status = 'BULLISH (WEAK)'; statusColor = 'text-green-400';
        }
    } else if (price < ema200) {
        if (ema20 < ema50 && ema50 < ema200 && slope20 < 0 && slope50 < 0) {
            status = 'STRONG BEARISH'; statusColor = 'text-red-500';
        } else {
            status = 'BEARISH (WEAK)'; statusColor = 'text-red-400';
        }
    }

    const SlopeIndicator = ({ val }: { val?: number }) => {
        if (!val) return <span className="text-zinc-600">-</span>;
        const isUp = val > 0.05;
        const isDown = val < -0.05;
        if (isUp) return <span className="text-green-500">↗</span>;
        if (isDown) return <span className="text-red-500">↘</span>;
        return <span className="text-zinc-500">→</span>;
    };

    return (
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold text-zinc-400 uppercase flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Trend Engine
                </h3>
                <span className="px-2 py-0.5 bg-zinc-800 rounded text-[10px] text-zinc-400 font-mono border border-zinc-700">{timeframe}</span>
            </div>

            <div className="mb-4 text-center p-3 bg-zinc-950/50 rounded-lg border border-zinc-800/50">
                <div className={`text-sm font-black ${statusColor} tracking-wider uppercase`}>{status}</div>
                <div className="text-[10px] text-zinc-600 mt-1">Multi-factor Slope Confirmation</div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 bg-zinc-950/30 rounded border border-zinc-800/50 flex flex-col gap-1">
                    <div className="text-zinc-500 text-[10px] uppercase">EMA 20</div>
                    <div className="font-mono text-cyan-400">{ema20?.toFixed(2)}</div>
                    <div className="bg-zinc-900 rounded py-0.5"><SlopeIndicator val={slope20} /></div>
                </div>
                <div className="p-2 bg-zinc-950/30 rounded border border-zinc-800/50 flex flex-col gap-1">
                    <div className="text-zinc-500 text-[10px] uppercase">EMA 50</div>
                    <div className="font-mono text-yellow-400">{ema50?.toFixed(2)}</div>
                    <div className="bg-zinc-900 rounded py-0.5"><SlopeIndicator val={slope50} /></div>
                </div>
                <div className="p-2 bg-zinc-950/30 rounded border border-zinc-800/50 flex flex-col gap-1">
                    <div className="text-zinc-500 text-[10px] uppercase">EMA 200</div>
                    <div className="font-mono text-white">{ema200?.toFixed(2)}</div>
                    <div className="bg-zinc-900 rounded py-0.5"><SlopeIndicator val={slope200} /></div>
                </div>
            </div>
        </div>
    );
}

export function SMCPanel({ data, loading, timeframe }: PanelProps) {
    if (loading || !data?.analysis) return <div className="animate-pulse bg-zinc-900 h-full rounded-xl border border-zinc-800"></div>;

    const { structure, fvgs, liquidity, smt } = data.analysis;

    return (
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold text-zinc-400 uppercase flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> SMC Scanner
                </h3>
                <span className="px-2 py-0.5 bg-zinc-800 rounded text-[10px] text-zinc-400 font-mono border border-zinc-700">{timeframe}</span>
            </div>

            <div className="space-y-4">
                {/* SMT Section */}
                <div className="bg-purple-900/10 border border-purple-500/20 p-2 rounded-lg">
                    <span className="text-[10px] font-bold text-purple-300 uppercase block mb-1">SMT Divergences</span>
                    <div className="space-y-1">
                        {(!smt || smt.length === 0) ? (
                            <div className="text-[10px] text-zinc-500 italic flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-zinc-600"></span>
                                No SMT detected
                            </div>
                        ) : (
                            smt.map((s: any, i: number) => (
                                <div key={i} className={`flex items-start gap-2 text-[10px] ${s.type === 'BULLISH' ? 'text-green-400' : 'text-red-400'}`}>
                                    <span className="font-bold">{s.type === 'BULLISH' ? '▲' : '▼'}</span>
                                    <span>{s.description} vs {s.referenceSymbol.replace('=F', '')}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Market Structure */}
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">Structure</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${structure.type === 'UP_TREND' ? 'border-green-900 bg-green-900/10 text-green-400' : structure.type === 'DOWN_TREND' ? 'border-red-900 bg-red-900/10 text-red-400' : 'border-zinc-700 bg-zinc-800 text-zinc-400'}`}>
                        {structure.type.replace('_', ' ')}
                    </span>
                </div>

                {/* FVG */}
                <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-2">Imbalances (FVG)</span>
                    <div className="space-y-1">
                        {fvgs.length === 0 && <span className="text-xs text-zinc-600 italic">No recent FVG</span>}
                        {fvgs.slice(0, 3).map((f: any, i: number) => (
                            <div key={i} className="flex justify-between text-[10px] items-center p-1 hover:bg-zinc-800/50 rounded transition-colors">
                                <span className={f.type === 'BULLISH' ? 'text-green-500 font-medium' : 'text-red-500 font-medium'}>{f.type} FVG</span>
                                <span className="font-mono text-zinc-400">{f.bottom.toFixed(2)} - {f.top.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Liquidity */}
                <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-2">Liquidity Pools</span>
                    <div className="flex flex-wrap gap-1">
                        {liquidity.length === 0 && <span className="text-xs text-zinc-600 italic">No clear pools</span>}
                        {liquidity.map((l: any, i: number) => (
                            <span key={i} className={`px-1.5 py-0.5 border rounded text-[10px] font-mono ${l.type === 'EQH' ? 'border-red-900/50 text-red-400 bg-red-950/10' : 'border-green-900/50 text-green-400 bg-green-950/10'}`}>
                                {l.type} <span className="opacity-50">{l.price.toFixed(2)}</span>
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function RiskPanel({ data, loading }: PanelProps) {
    if (loading || !data?.analysis?.risk) return <div className="animate-pulse bg-zinc-900 h-full rounded-xl border border-zinc-800"></div>;

    const { targets, invalidation, direction, rrRatio } = data.analysis.risk;
    if (direction === 'NEUTRAL') return <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-center text-zinc-500 text-sm flex items-center justify-center h-full">No Clear RR Setup</div>;

    return (
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
            <h3 className="text-xs font-bold text-zinc-400 uppercase mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500" /> Risk Logic ({direction})
            </h3>

            <div className="space-y-3">
                {/* Invalidation */}
                {invalidation && (
                    <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-lg group hover:border-red-500/50 transition-colors">
                        <div className="text-[10px] text-red-400 uppercase tracking-wider font-bold mb-1 flex justify-between">
                            <span>Stop Loss</span>
                            <span className="opacity-50 group-hover:opacity-100 transition-opacity">Invalidation</span>
                        </div>
                        <div className="flex justify-between items-end">
                            <div className="text-red-300 font-mono font-bold">{invalidation.price.toFixed(2)}</div>
                            <div className="text-right">
                                <div className="text-[10px] text-zinc-500">{invalidation.distance.toFixed(2)} pts ({invalidation.distancePct.toFixed(2)}%)</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Ratio */}
                {rrRatio && (
                    <div className="flex justify-center items-center gap-2 my-2 opacity-70">
                        <div className="h-px bg-zinc-700 flex-1"></div>
                        <span className="text-[10px] font-mono font-bold text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-700">R:R 1 : {rrRatio.toFixed(2)}</span>
                        <div className="h-px bg-zinc-700 flex-1"></div>
                    </div>
                )}

                {/* Targets */}
                {targets.length > 0 && (
                    <div className="space-y-2">
                        <div className="text-[10px] text-green-400 uppercase tracking-wider font-bold">Targets</div>
                        {targets.map((t: any, i: number) => (
                            <div key={i} className="p-2 bg-green-950/20 border border-green-900/30 rounded flex justify-between items-center hover:bg-green-950/30 transition-colors cursor-default">
                                <div>
                                    <div className="text-green-300 font-mono font-bold text-sm">{t.price.toFixed(2)}</div>
                                    <div className="text-[10px] text-zinc-500">{t.description}</div>
                                </div>
                                <div className="text-[10px] text-zinc-500 text-right">
                                    +{t.distance.toFixed(2)} <br />
                                    <span className="opacity-50">{t.distancePct.toFixed(2)}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// Added missing imports for icons
import { TrendingUp, TrendingDown, Anchor, Target } from 'lucide-react';
