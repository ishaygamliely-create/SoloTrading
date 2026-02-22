import React, { useState } from 'react';
import { PanelProps } from './DashboardPanels';
import { getLiquiditySignal } from '@/app/lib/liquidityRange';
import { getConfidenceColorClass, getStatusFromScore, getStatusBadgeClass, type IndicatorStatus } from '@/app/lib/uiSignalStyles';
import { Droplets, ArrowUp, ArrowDown, Target, Waves, Gauge, Info, X, Zap, Activity } from 'lucide-react';

export function LiquidityPanel({ data, loading }: PanelProps) {
    const [showHelp, setShowHelp] = useState(false);

    if (loading) {
        return <div className="animate-pulse bg-zinc-900/50 border border-white/5 rounded-xl h-[220px]"></div>;
    }

    const liquidity = getLiquiditySignal(data);
    if (!liquidity || !data) return null;

    // --- Standard Colors ---
    const scoreStyle = getConfidenceColorClass(liquidity.score);
    const computedStatus: IndicatorStatus = liquidity.status === "ERROR"
        ? "ERROR"
        : getStatusFromScore(liquidity.score);
    const statusBadgeClass = getStatusBadgeClass(computedStatus);

    // Debug Data extraction
    const { adrPercent } = (liquidity.debug || {}) as any;
    const adrVal = adrPercent ? parseFloat(adrPercent) : 100;
    const fuelLevel = Math.max(0, Math.min(100, 100 - adrVal));
    const fuelColor = fuelLevel > 70 ? 'bg-cyan-400' : fuelLevel > 40 ? 'bg-amber-400' : 'bg-red-400';

    // Targets Data
    const currentPrice = data.price || 0;
    const fvgs = data.analysis?.fvgs || [];
    const pools = data.analysis?.liquidity || [];

    const fvgsAbove = fvgs.filter((f: any) => f.bottom > currentPrice).sort((a: any, b: any) => a.bottom - b.bottom).slice(0, 1);
    const fvgsBelow = fvgs.filter((f: any) => f.top < currentPrice).sort((a: any, b: any) => b.top - a.top).slice(0, 1);
    const poolsAbove = pools.filter((p: any) => p.price > currentPrice).sort((a: any, b: any) => a.price - b.price).slice(0, 1);
    const poolsBelow = pools.filter((p: any) => p.price < currentPrice).sort((a: any, b: any) => b.price - a.price).slice(0, 1);

    const vxrHvn = data.analysis?.vxr?.lastProfile?.hvn;

    return (
        <div className={`rounded-xl border border-white/10 bg-white/5 p-4 pb-8 relative overflow-hidden flex flex-col transition-all duration-500 min-h-[220px]`}>
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none opacity-20" />

            {/* Header - VXR HUD Style */}
            <div className="flex items-center justify-between mb-5 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 flex items-center justify-center transition-colors">
                        <Droplets size={18} strokeWidth={2.5} />
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.2em] leading-none">LIQUIDITY</span>
                            <button
                                onClick={() => setShowHelp(true)}
                                className="text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                                <Info size={10} />
                            </button>
                        </div>
                        <span className="text-[9px] text-zinc-500 font-bold uppercase mt-1">Energy & Targets</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                        <Activity size={10} className="text-cyan-500 animate-pulse" />
                        <span className="text-[9px] font-black text-cyan-200 uppercase">VOL SCAN</span>
                    </div>
                    <div className={`text-xl font-black tabular-nums tracking-tighter ${scoreStyle.text}`}>
                        {Math.round(liquidity.score)}%
                    </div>
                </div>
            </div>

            <div className="space-y-5 relative z-10 flex-1">
                {/* Fuel Gauge Section */}
                <div>
                    <div className="flex justify-between items-end mb-1.5">
                        <div className="flex items-center gap-2">
                            <Gauge size={10} className="text-zinc-500" />
                            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Expansion Fuel</span>
                        </div>
                        <span className="text-[9px] font-mono font-bold text-zinc-400">{adrVal.toFixed(0)}% ADR</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <div className={`h-full transition-all duration-1000 ${fuelColor}`} style={{ width: `${fuelLevel}%` }} />
                    </div>
                </div>

                {/* Targets Grid */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Resistance / Above */}
                    <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-2.5">
                            <ArrowUp size={10} className="text-red-400" />
                            <span className="text-[8px] font-black text-red-400/80 uppercase tracking-widest">RESISTANCE</span>
                        </div>
                        <div className="space-y-2">
                            {poolsAbove.length > 0 ? (
                                <div className="flex justify-between items-center">
                                    <span className="text-[9px] font-bold text-zinc-600 uppercase">Pool</span>
                                    <span className="text-[10px] font-mono font-black text-zinc-200">{poolsAbove[0].price.toFixed(1)}</span>
                                </div>
                            ) : null}
                            {fvgsAbove.length > 0 ? (
                                <div className="flex justify-between items-center">
                                    <span className="text-[9px] font-bold text-zinc-600 uppercase">FVG</span>
                                    <span className="text-[10px] font-mono font-black text-red-400/60">{fvgsAbove[0].bottom.toFixed(1)}</span>
                                </div>
                            ) : null}
                            {vxrHvn && vxrHvn > currentPrice ? (
                                <div className="flex justify-between items-center pt-1 border-t border-white/5">
                                    <span className="text-[9px] font-bold text-zinc-600 uppercase">HVN</span>
                                    <span className="text-[10px] font-mono font-black text-amber-400/70">{vxrHvn.toFixed(1)}</span>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {/* Support / Below */}
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-2.5">
                            <ArrowDown size={10} className="text-emerald-400" />
                            <span className="text-[8px] font-black text-emerald-400/80 uppercase tracking-widest">SUPPORT</span>
                        </div>
                        <div className="space-y-2">
                            {poolsBelow.length > 0 ? (
                                <div className="flex justify-between items-center">
                                    <span className="text-[9px] font-bold text-zinc-600 uppercase">Pool</span>
                                    <span className="text-[10px] font-mono font-black text-zinc-200">{poolsBelow[0].price.toFixed(1)}</span>
                                </div>
                            ) : null}
                            {fvgsBelow.length > 0 ? (
                                <div className="flex justify-between items-center">
                                    <span className="text-[9px] font-bold text-zinc-600 uppercase">FVG</span>
                                    <span className="text-[10px] font-mono font-black text-emerald-400/60">{fvgsBelow[0].top.toFixed(1)}</span>
                                </div>
                            ) : null}
                            {vxrHvn && vxrHvn < currentPrice ? (
                                <div className="flex justify-between items-center pt-1 border-t border-white/5">
                                    <span className="text-[9px] font-bold text-zinc-600 uppercase">HVN</span>
                                    <span className="text-[10px] font-mono font-black text-amber-500/70">{vxrHvn.toFixed(1)}</span>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>

            {/* Hebrew Help Overlay */}
            {showHelp && (
                <div className="absolute inset-0 z-50 bg-zinc-950/95 backdrop-blur-md p-6 flex flex-col animate-in fade-in duration-200">
                    <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                        <div className="flex items-center gap-2">
                            <Droplets size={16} className="text-cyan-400" />
                            <span className="font-black text-white text-xs uppercase tracking-widest">LIQUIDITY GUIDE (מדריך נזילות)</span>
                        </div>
                        <button
                            onClick={() => setShowHelp(false)}
                            className="p-1 hover:bg-white/10 rounded-full text-zinc-400 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-4 text-right" dir="rtl">
                        <section>
                            <h4 className="text-white font-bold text-[11px] mb-1">מהי נזילות?</h4>
                            <p className="text-[10px] text-zinc-400 leading-relaxed">
                                נזילות היא הדלק שמניע את השוק. הפאנל מנתח היכן הצטברו "פקודות ממתינות" (Pools) והאם השוק נמצא במצב של צבירת אנרגיה (Compression).
                            </p>
                        </section>

                        <div className="space-y-2">
                            <div className="bg-cyan-500/10 border border-cyan-500/20 p-2 rounded">
                                <span className="text-[10px] font-bold text-cyan-400 block mb-0.5">מד הדלק (Expansion Fuel)</span>
                                <span className="text-[9px] text-zinc-300">מחושב לפי ה-ADR. ציון גבוה (ירוק) מעיד על דחיסה - השוק מוכן לפריצה עוצמתית.</span>
                            </div>
                            <div className="bg-red-500/10 border border-red-500/20 p-2 rounded">
                                <span className="text-[10px] font-bold text-red-400 block mb-0.5">יעדי נזילות (Targets)</span>
                                <span className="text-[9px] text-zinc-300">אלו אזורים של חוסר איזון (FVG) או בריכות נזילות (Pools) שהמחיר שואף אליהם.</span>
                            </div>
                        </div>

                        <section className="pt-2">
                            <h4 className="text-white font-bold text-[11px] mb-1">ניתוח HVN</h4>
                            <p className="text-[10px] text-zinc-400 leading-relaxed">
                                צמתים של נפח גבוה (High Volume Nodes) משמשים כמגנטים למחיר או כרמות תמיכה/התנגדות משמעותיות.
                            </p>
                        </section>

                        <button
                            onClick={() => setShowHelp(false)}
                            className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-black text-[10px] tracking-widest uppercase transition-colors mt-2"
                        >
                            הבנתי, חזרה לנתונים
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
