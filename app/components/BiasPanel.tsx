import React, { useState } from 'react';
import { IndicatorSignal } from '../lib/types';
import { getStatusFromScore, getStatusBadgeClass, type IndicatorStatus } from '@/app/lib/uiSignalStyles';
import { Info, X, ChevronDown, ChevronUp, Zap, Activity } from 'lucide-react';

interface BiasPanelProps {
    data: any;
    loading: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────

function directionBadge(dir: string | undefined): string {
    const base = "text-[10px] font-black px-2 py-0.5 rounded-full border tracking-widest uppercase";
    if (dir === "LONG") return `${base} text-emerald-400 bg-emerald-500/10 border-emerald-500/20`;
    if (dir === "SHORT") return `${base} text-red-400 bg-red-500/10 border-red-500/20`;
    return `${base} text-zinc-400 bg-zinc-500/10 border-zinc-500/20`;
}

function scoreColors(score: number): { text: string; border: string; glow: string } {
    if (score >= 75) return { text: "text-emerald-400", border: "border-emerald-500/30", glow: "bg-emerald-500/5" };
    if (score >= 60) return { text: "text-yellow-400", border: "border-yellow-500/30", glow: "bg-yellow-500/5" };
    return { text: "text-red-400", border: "border-red-500/30", glow: "bg-red-500/5" };
}

function LevelBar({ price, mid, upper, lower }: { price: number; mid: number; upper: number; lower: number }) {
    const range = upper - lower;
    if (range <= 0) return null;

    const rawPct = ((price - lower) / range) * 100;
    const pct = Math.max(2, Math.min(98, rawPct));

    const isAbove = price > upper;
    const isBelow = price < lower;
    const dotColor = isAbove ? "bg-emerald-400" : isBelow ? "bg-red-400" : "bg-amber-400";
    const dotBorder = isAbove ? "border-emerald-400 text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" : isBelow ? "border-red-400 text-red-400 shadow-[0_0_10px_rgba(248,113,113,0.5)]" : "border-amber-500 text-amber-500";

    return (
        <div className="space-y-1.5 py-2">
            <div className="relative h-1 w-full rounded-full bg-white/5 border border-white/5 overflow-hidden">
                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1/3 bg-white/5" />
                <div className={`absolute top-0 h-full transition-all duration-1000 ${dotColor} opacity-20`} style={{ left: '0', width: `${pct}%` }} />
            </div>
            <div className="relative h-1">
                <div
                    className={`absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border-2 ${dotColor} ${dotBorder} -translate-x-1/2 transition-all duration-1000`}
                    style={{ left: `${pct}%` }}
                />
            </div>
            <div className="flex justify-between text-[7px] font-mono font-bold text-zinc-600 uppercase tracking-[0.2em] pt-1">
                <div className="flex flex-col">
                    <span className="text-zinc-500">{lower.toFixed(0)}</span>
                    <span>SUP</span>
                </div>
                <div className="flex flex-col items-center">
                    <span className="text-zinc-400">{mid.toFixed(0)}</span>
                    <span className="text-zinc-600">OPEN</span>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-zinc-500">{upper.toFixed(0)}</span>
                    <span>RES</span>
                </div>
            </div>
        </div>
    );
}

function ConfluencePill({ icon, label, aligned, conflict }: { icon: string; label: string; aligned: boolean; conflict: boolean }) {
    if (!aligned && !conflict) return null;
    const cls = aligned
        ? "text-emerald-400/80 border-emerald-500/20 bg-emerald-500/5"
        : "text-amber-400/80 border-amber-500/20 bg-amber-500/5 text-amber-500";
    return (
        <div className={`flex items-center gap-1 text-[8px] font-black px-2 py-1 rounded border tracking-widest uppercase ${cls}`}>
            <span className="opacity-60">{icon}</span>
            <span>{label}</span>
            <span className="ml-1">{aligned ? "✓" : "✗"}</span>
        </div>
    );
}

// ── Panel ──────────────────────────────────────────────────────────

export function BiasPanel({ data, loading }: BiasPanelProps) {
    const [showHelp, setShowHelp] = useState(false);
    const [expandedHint, setExpandedHint] = useState(false);

    if (loading) return <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-xl h-[260px]" />;

    const bias = data?.analysis?.bias as IndicatorSignal;
    if (!bias || bias.status === 'ERROR') return null;

    const dbg: any = bias.debug ?? {};
    const meta: any = bias.meta ?? {};
    const price = data.price || 0;

    const direction = bias.direction;
    const score = bias.score ?? 0;
    const colors = scoreColors(score);
    const computedStatus: IndicatorStatus = getStatusFromScore(score);
    const statusBadge = getStatusBadgeClass(computedStatus);

    const { midnightOpen, upperBuffer, lowerBuffer, biasZone, flipConfirmed, distancePts, atrVal, confluenceAdj } = dbg;

    const toAlignment: string | null = dbg.trueOpenAlignment ?? null;
    const vzLabel: string | null = dbg.valueZone ?? null;
    const structDir: string | null = dbg.structureDirection ?? null;

    const toAligned = (direction === "LONG" && toAlignment === "ALIGNED_BULL") || (direction === "SHORT" && toAlignment === "ALIGNED_BEAR");
    const toConflict = (direction === "LONG" && toAlignment === "ALIGNED_BEAR") || (direction === "SHORT" && toAlignment === "ALIGNED_BULL");
    const vzAligned = (direction === "LONG" && vzLabel === "DISCOUNT") || (direction === "SHORT" && vzLabel === "PREMIUM");
    const vzConflict = (direction === "LONG" && vzLabel === "PREMIUM") || (direction === "SHORT" && vzLabel === "DISCOUNT");
    const stAligned = (direction === "LONG" && structDir === "BULLISH") || (direction === "SHORT" && structDir === "BEARISH");
    const stConflict = (direction === "LONG" && structDir === "BEARISH") || (direction === "SHORT" && structDir === "BULLISH");

    const hasCrossContext = toAlignment || vzLabel || structDir;

    return (
        <div className={`rounded-xl border border-white/10 bg-white/5 p-3 flex flex-col relative overflow-hidden transition-all duration-500`}>
            {/* Background Glow - Matches VXR Style */}
            <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none opacity-20 ${direction === 'LONG' ? 'bg-emerald-500' : direction === 'SHORT' ? 'bg-red-500' : 'bg-blue-500'}`} />

            {/* Header - VXR HUD Style */}
            <div className="flex items-center justify-between mb-3 relative z-10">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowHelp(true)}
                        className="p-1.5 bg-white/5 hover:bg-white/10 rounded border border-white/10 text-zinc-400 transition-colors"
                    >
                        <Info size={11} />
                    </button>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-amber-500 uppercase tracking-[0.2em] leading-none">BIAS PRECISION</span>
                        <span className="text-[8px] text-zinc-500 font-bold uppercase mt-1">Sentiment & Range Context</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                        <Zap size={10} className="text-amber-500 animate-pulse" />
                        <span className="text-[9px] font-black text-amber-200 uppercase">LIVE SCAN</span>
                    </div>
                    <div className={`text-xl font-black tabular-nums tracking-tighter ${colors.text}`}>
                        {score}%
                    </div>
                </div>
            </div>

            <div className="space-y-2.5 relative z-10 flex-1">
                {/* Direction Row */}
                <div className="flex items-center gap-2">
                    <span className={directionBadge(direction)}>{direction ?? "NEUTRAL"}</span>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border tracking-widest uppercase ${statusBadge}`}>
                        {computedStatus}
                    </span>
                    {(meta.capApplied || meta.dataAgeMs > 15 * 60_000) && (
                        <div className="flex-1 text-right text-[7px] text-zinc-600 font-mono font-bold uppercase tracking-widest">
                            {meta.sourceUsed} • {Math.round(meta.dataAgeMs / 60000)}m
                        </div>
                    )}
                </div>

                {/* Expandable Explanation Row */}
                {bias.hint && (
                    <div className="bg-black/40 rounded-xl border border-white/5 overflow-hidden transition-all duration-300">
                        <button
                            onClick={() => setExpandedHint(!expandedHint)}
                            className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-white/5 transition-colors group"
                        >
                            <div className="flex items-center gap-2">
                                <Activity size={10} className="text-zinc-600 group-hover:text-amber-500 transition-colors" />
                                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Logic Analysis</span>
                            </div>
                            {expandedHint ? <ChevronUp size={12} className="text-zinc-600" /> : <ChevronDown size={12} className="text-zinc-600" />}
                        </button>
                        {expandedHint && (
                            <div className="px-3 py-2 text-[10px] text-zinc-300 leading-relaxed border-t border-white/5 animate-in slide-in-from-top-1 duration-200">
                                {bias.hint}
                            </div>
                        )}
                    </div>
                )}

                {/* Level Bar - Condensed padding */}
                {typeof midnightOpen === 'number' && typeof upperBuffer === 'number' && typeof lowerBuffer === 'number' && (
                    <div className="bg-white/[0.02] rounded-2xl p-2.5 border border-white/5">
                        <LevelBar price={price} mid={midnightOpen} upper={upperBuffer} lower={lowerBuffer} />

                        <div className="grid grid-cols-2 gap-y-2 pt-2 border-t border-white/5">
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-0.5">Distance</span>
                                <span className="text-[10px] font-mono font-black text-zinc-300">
                                    {distancePts > 0 ? "+" : ""}{distancePts.toFixed(1)} <span className="text-[7px] opacity-40">PTS</span>
                                </span>
                            </div>
                            <div className="flex flex-col items-end text-right">
                                <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-0.5">ATR Rel</span>
                                <span className="text-[10px] font-mono font-black text-zinc-400">
                                    {atrVal > 0 ? (Math.abs(distancePts) / atrVal).toFixed(2) : '0.00'}× <span className="text-[7px] opacity-40">ATR</span>
                                </span>
                            </div>
                            {flipConfirmed && (
                                <div className="col-span-2 flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg py-1.5 mt-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Flip Confirmed</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Confluence Grid */}
                {hasCrossContext && (
                    <div className="space-y-1.5">
                        <div className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.2em] pl-1">Confluence Matrix</div>
                        <div className="flex flex-wrap gap-1.5">
                            <ConfluencePill icon="◈" label="TrueOpen" aligned={toAligned} conflict={toConflict} />
                            <ConfluencePill icon="▣" label={vzLabel ?? "ValueZone"} aligned={vzAligned} conflict={vzConflict} />
                            <ConfluencePill icon="▷" label="Structure" aligned={stAligned} conflict={stConflict} />
                            {typeof confluenceAdj === 'number' && confluenceAdj !== 0 && (
                                <div className={`text-[8px] font-black px-2 py-1 rounded border tracking-widest uppercase ${confluenceAdj > 0 ? "text-emerald-400/70 border-emerald-500/20 bg-emerald-500/5" : "text-red-400/70 border-red-500/20 bg-red-500/5"}`}>
                                    {confluenceAdj > 0 ? "+" : ""}{confluenceAdj} SCORE ADJ
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Hebrew Help Overlay - VXR Style */}
            {showHelp && (
                <div className="absolute inset-0 z-50 bg-zinc-950/95 backdrop-blur-md p-6 flex flex-col animate-in fade-in duration-200">
                    <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                        <div className="flex items-center gap-2">
                            <Info size={16} className="text-amber-500" />
                            <span className="font-black text-white text-xs uppercase tracking-widest">BIAS GUIDE (מדריך מגמה)</span>
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
                            <h4 className="text-white font-bold text-[11px] mb-1">מהו ה-Bias?</h4>
                            <p className="text-[10px] text-zinc-400 leading-relaxed">
                                המגמה (Bias) היא מסנן כיווני בלבד. היא קובעת אם השוק נמצא בתנופה שורית או דבית, אך היא אינה מהווה טריגר לכניסה לטרייד.
                            </p>
                        </section>

                        <div className="space-y-2">
                            <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded">
                                <span className="text-[10px] font-bold text-emerald-400 block mb-0.5">ציון (Score)</span>
                                <span className="text-[9px] text-zinc-300">מחושב לפי מרחק ממחיר הפתיחה (יחס ATR) + התכנסות אינדיקטורים: TrueOpen (+5), אזור ערך (+3), מבנה שוק (+4).</span>
                            </div>
                            <div className="bg-red-500/10 border border-red-500/20 p-2 rounded">
                                <span className="text-[10px] font-bold text-red-400 block mb-0.5">קונפליקטים</span>
                                <span className="text-[9px] text-zinc-300">חוסר הסכמה בין המבנה ל-TrueOpen מוריד את הציון ב-5 עד 8 נקודות באופן אוטומטי.</span>
                            </div>
                        </div>

                        <section className="pt-2">
                            <h4 className="text-white font-bold text-[11px] mb-1">ניהול סיכונים</h4>
                            <ul className="text-[10px] text-zinc-400 space-y-1 list-disc list-inside">
                                <li>התראת גבול: המתן לפריצה/שבירה של אזור הדשדוש.</li>
                                <li>אישור שינוי (Flip): נדרשות 2 סגירות של נרות 15 דק' מעבר לגבול.</li>
                            </ul>
                        </section>

                        <button
                            onClick={() => setShowHelp(false)}
                            className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded font-black text-[10px] tracking-widest uppercase transition-colors mt-2"
                        >
                            הבנתי, חזרה לנתונים
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
