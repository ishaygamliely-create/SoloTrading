import React from 'react';
import { IndicatorSignal } from '../lib/types';
import { getStatusFromScore, getStatusBadgeClass, type IndicatorStatus } from '@/app/lib/uiSignalStyles';
import { PanelHelp } from './PanelHelp';

interface BiasPanelProps {
    data: any;
    loading: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────

function directionColor(dir: string | undefined): string {
    if (dir === "LONG") return "text-emerald-400";
    if (dir === "SHORT") return "text-red-400";
    return "text-zinc-400";
}

function directionBadge(dir: string | undefined): string {
    const base = "text-[10px] font-bold px-1.5 py-0.5 rounded border";
    if (dir === "LONG") return `${base} text-emerald-400 bg-emerald-500/10 border-emerald-500/20`;
    if (dir === "SHORT") return `${base} text-red-400 bg-red-500/10 border-red-500/20`;
    return `${base} text-zinc-400 bg-zinc-500/10 border-zinc-500/20`;
}

function scoreColors(score: number): { text: string; border: string } {
    if (score >= 75) return { text: "text-emerald-300", border: "border-emerald-500/30" };
    if (score >= 60) return { text: "text-yellow-300", border: "border-yellow-500/30" };
    return { text: "text-red-400", border: "border-red-500/30" };
}

// Visual level bar: shows price position between lowerBuffer and upperBuffer
function LevelBar({ price, mid, upper, lower }: { price: number; mid: number; upper: number; lower: number }) {
    const range = upper - lower;
    if (range <= 0) return null;

    // Clamp price position 0–100%
    const rawPct = ((price - lower) / range) * 100;
    const pct = Math.max(2, Math.min(98, rawPct));

    const isAbove = price > upper;
    const isBelow = price < lower;
    const dotColor = isAbove ? "bg-emerald-400" : isBelow ? "bg-red-400" : "bg-amber-400";
    const dotBorder = isAbove ? "border-emerald-400" : isBelow ? "border-red-400" : "border-amber-500";

    return (
        <div className="space-y-1.5 py-1">
            {/* Bar */}
            <div className="relative h-1.5 rounded-full bg-gradient-to-r from-red-700/40 via-zinc-700/40 to-emerald-700/40">
                {/* Buffer zone highlight (neutral zone = mid ± buffer) */}
                <div
                    className="absolute inset-y-0 bg-zinc-600/30 rounded-full"
                    style={{
                        left: `${((mid - lower - (upper - mid)) / range) * 100}%`,
                        width: `${(((upper - lower) * 1) / range) * 100}%`,
                    }}
                />
                {/* Price dot */}
                <div
                    className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 ${dotColor} ${dotBorder} shadow-sm -translate-x-1/2`}
                    style={{ left: `${pct}%` }}
                />
            </div>
            {/* Labels */}
            <div className="flex justify-between text-[9px] font-mono text-white/25">
                <span>{lower.toFixed(0)}</span>
                <span className="text-white/35">{mid.toFixed(0)} mid</span>
                <span>{upper.toFixed(0)}</span>
            </div>
        </div>
    );
}

// Cross-indicator pill
function ConfluencePill({ icon, label, aligned, conflict }: { icon: string; label: string; aligned: boolean; conflict: boolean }) {
    if (!aligned && !conflict) return null;
    const cls = aligned
        ? "text-emerald-400/80 border-emerald-500/20 bg-emerald-500/5"
        : "text-amber-400/80 border-amber-500/20 bg-amber-500/5";
    return (
        <div className={`flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded border ${cls}`}>
            <span>{icon}</span>
            <span>{label}</span>
            <span>{aligned ? "✓" : "✗"}</span>
        </div>
    );
}

// ── Panel ──────────────────────────────────────────────────────────

export function BiasPanel({ data, loading }: BiasPanelProps) {
    if (loading) return <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-xl h-24" />;

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

    const { midnightOpen, buffer, upperBuffer, lowerBuffer, biasZone, flipConfirmed, distancePts, atrVal, confluenceAdj } = dbg;

    // Cross-indicator state
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
    const isNearBuffer = biasZone === "NEAR_UP" || biasZone === "NEAR_DOWN";

    return (
        <div className={`rounded-xl border bg-white/5 p-3 space-y-2.5 ${colors.border}`}>

            {/* ── HEADER ─────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-500 tracking-wide text-sm">מגמת שוק (BIAS)</span>
                    <div className="h-3 w-px bg-white/10" />
                    <span className={directionBadge(direction)}>{direction === 'LONG' ? 'קנייה (LONG)' : direction === 'SHORT' ? 'מכירה (SHORT)' : 'נייטרלי'}</span>
                    <div className="h-3 w-px bg-white/10" />
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${statusBadge}`}>
                        {computedStatus === 'STRONG' ? 'חזקה' :
                            computedStatus === 'OK' ? 'תקינה' :
                                computedStatus === 'WARN' ? 'חלשה' : computedStatus}
                    </span>
                </div>
                <div className={`text-lg font-bold tabular-nums ${colors.text}`}>
                    {score}%
                </div>
            </div>

            {/* ── RELIABILITY ─────────────────────────────────────── */}
            {(meta.capApplied || meta.dataAgeMs > 15 * 60_000) && (
                <div className="text-[9px] text-white/35 text-right font-mono">
                    {meta.sourceUsed}{meta.capApplied ? ` · Raw ${meta.rawScore}% → ${meta.finalScore}%` : ` · Age ${Math.round(meta.dataAgeMs / 60000)}m`}
                </div>
            )}

            {/* ── DYNAMIC HINT ────────────────────────────────────── */}
            {bias.hint && (
                <div className="text-xs text-white/85 bg-white/5 border border-white/8 rounded-lg px-3 py-2 leading-snug">
                    {bias.hint}
                </div>
            )}

            {/* ── NEAR-BUFFER ALERT ───────────────────────────────── */}
            {isNearBuffer && (
                <div className="flex items-center gap-1.5 text-[10px] text-amber-400/80 border border-amber-500/20 bg-amber-500/5 rounded px-2 py-1">
                    <span>⚠</span>
                    <span>{biasZone === "NEAR_UP" ? "מתקרב לגבול העליון - להמתין לפריצה שורית" : "מתקרב לגבול התחתון - להמתין לפריצה דובית"}</span>
                </div>
            )}

            {/* ── LEVEL BAR ───────────────────────────────────────── */}
            {typeof midnightOpen === 'number' && typeof upperBuffer === 'number' && typeof lowerBuffer === 'number' && (
                <LevelBar price={price} mid={midnightOpen} upper={upperBuffer} lower={lowerBuffer} />
            )}

            {/* ── DISTANCE + FLIP ─────────────────────────────────── */}
            {direction !== "NEUTRAL" && typeof distancePts === 'number' && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] font-mono text-white/45">
                    <span>
                        {distancePts > 0 ? "+" : ""}{distancePts.toFixed(1)} נק' מהפתיחה
                    </span>
                    {atrVal > 0 && (
                        <span className="text-white/30">
                            {(Math.abs(distancePts) / atrVal).toFixed(2)}× ATR
                        </span>
                    )}
                    {flipConfirmed && (
                        <span className="text-emerald-400/60">✓ שינוי כיוון אושר</span>
                    )}
                </div>
            )}

            {/* ── CROSS-INDICATOR CONFLUENCE ──────────────────────── */}
            {hasCrossContext && (
                <div className="space-y-1">
                    <div className="text-[9px] text-white/25 uppercase tracking-widest">Confluence</div>
                    <div className="flex flex-wrap gap-1">
                        <ConfluencePill icon="◈" label="TrueOpen" aligned={toAligned} conflict={toConflict} />
                        <ConfluencePill icon="▣" label={vzLabel ?? "Zone"} aligned={vzAligned} conflict={vzConflict} />
                        <ConfluencePill icon="▷" label="Structure" aligned={stAligned} conflict={stConflict} />
                        {typeof confluenceAdj === 'number' && confluenceAdj !== 0 && (
                            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${confluenceAdj > 0 ? "text-emerald-400/70 border-emerald-500/20" : "text-red-400/70 border-red-500/20"}`}>
                                {confluenceAdj > 0 ? "+" : ""}{confluenceAdj} pts
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* ── HELP ────────────────────────────────────────────── */}
            <div className="pt-0.5 border-t border-white/5">
                <PanelHelp title="דיוק מגמה (Bias Precision)" bullets={[
                    "המגמה (Bias) היא מסנן כיווני בלבד, לא טריגר לכניסה.",
                    "ציון (Score) = מרחק מהפתיחה (יחס ATR) + התכנסות אינדיקטורים נוספים.",
                    "התכנסות: TrueOpen מתואם = +5, אזור ערך תומך = +3, מבנה שוק = +4.",
                    "קונפליקטים מורידים את הציון: חוסר הסכמה בין המבנה ל-TO = -5 עד -8.",
                    "התראת גבול: מופיעה כשהשוק נייטרלי אך מתקרב לקצה אזור הדשדוש.",
                    "אישור שינוי כיוון: נדרשות 2 סגירות של נרות 15 דק' מעבר לגבול (+10).",
                ]} />
            </div>
        </div>
    );
}
