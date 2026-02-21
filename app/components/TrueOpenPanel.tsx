import React from "react";
import type { IndicatorSignal } from "@/app/lib/types";
import type { TrueOpenAlignment } from "@/app/lib/trueOpen";
import { getConfidenceColorClass, getStatusFromScore, getStatusBadgeClass } from "@/app/lib/uiSignalStyles";
import { PanelHelp } from "./PanelHelp";

// ── Helpers ──────────────────────────────────────────────────────

function fmt(n: unknown): string {
    return typeof n === "number" && Number.isFinite(n) ? n.toFixed(2) : "—";
}
function ptsFmt(n: unknown): string {
    if (typeof n !== "number" || !Number.isFinite(n)) return "—";
    return `${n >= 0 ? "+" : ""}${n.toFixed(1)}pts`;
}

function alignmentChip(alignment?: string): string {
    const base = "px-2 py-0.5 rounded-full text-[10px] font-bold";
    if (alignment === "ALIGNED_BULL") return `${base} bg-emerald-900/60 text-emerald-300 border border-emerald-700/40`;
    if (alignment === "ALIGNED_BEAR") return `${base} bg-red-900/60 text-red-300 border border-red-700/40`;
    if (alignment === "MIXED") return `${base} bg-amber-900/60 text-amber-300 border border-amber-700/40`;
    return `${base} bg-zinc-800 text-zinc-400 border border-zinc-700`;
}

function alignmentLabel(alignment?: string): string {
    if (alignment === "ALIGNED_BULL") return "מתואם ▲";
    if (alignment === "ALIGNED_BEAR") return "מתואם ▼";
    if (alignment === "MIXED") return "מעורב";
    return "קרוב";
}

function sideColor(side?: string): string {
    if (side === "ABOVE") return "text-emerald-400";
    if (side === "BELOW") return "text-red-400";
    return "text-zinc-400";
}

// ── AnchorCard ───────────────────────────────────────────────────

interface AnchorCardProps {
    label: string;
    openPrice: number | null | undefined;
    currentPrice: number | null | undefined;
    side?: string;
    pts?: number;
    strength?: string;
    unavailableReason?: string | null;
    note?: string | null;
}

function AnchorCard({ label, openPrice, currentPrice, side, pts, strength, unavailableReason, note }: AnchorCardProps) {
    const isUnavailable = openPrice == null;
    return (
        <div className="rounded-lg border border-white/8 bg-black/20 p-3 space-y-2">
            {/* Label */}
            <div className="text-[10px] text-white/40 uppercase tracking-widest font-medium">{label}</div>

            {isUnavailable ? (
                <div className="space-y-0.5">
                    <div className="text-xs text-white/40">N/A</div>
                    {unavailableReason && (
                        <div className="text-[10px] text-white/25 leading-tight">
                            {unavailableReason} · Day only
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    {/* Row 1: Side (big) */}
                    <div className={`text-base font-bold tracking-wide ${sideColor(side)}`}>
                        {side === "ABOVE" ? "מעל" : side === "BELOW" ? "מתחת" : side ?? "—"}
                    </div>

                    {/* Row 2: displacement pts + strength */}
                    <div className="flex items-center gap-1.5 text-[11px] font-mono">
                        <span className="text-white/65">{ptsFmt(pts)}</span>
                        {strength && (
                            <>
                                <span className="text-white/20">·</span>
                                <span className="text-white/40">
                                    {strength === "STRONG" ? "חזק" : strength === "MODERATE" ? "בינוני" : strength === "WEAK" ? "חלש" : strength}
                                </span>
                            </>
                        )}
                    </div>

                    {/* Row 3: Open / Now price labels */}
                    <div className="border-t border-white/8 pt-1.5">
                        <div className="grid grid-cols-2 gap-x-3 text-[10px] text-white/35 mb-0.5">
                            <span>פתיחה</span>
                            <span>עכשיו</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 text-[12px] font-mono font-semibold text-white/85">
                            <span>{fmt(openPrice)}</span>
                            <span>{fmt(currentPrice)}</span>
                        </div>
                    </div>

                    {note && <div className="text-[10px] text-amber-400/70 italic">{note}</div>}
                </div>
            )}
        </div>
    );
}

// ── Main Panel ───────────────────────────────────────────────────

export function TrueOpenPanel({ data, loading }: { data: any; loading: boolean }) {
    if (loading) return <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-xl h-24" />;

    const sig = data?.analysis?.trueOpen as IndicatorSignal | undefined;
    if (!sig || sig.status === "OFF") return null;

    const score = sig.score ?? 0;
    const scoreStyle = getConfidenceColorClass(score);
    const computedStatus = getStatusFromScore(score);
    const statusBadge = getStatusBadgeClass(computedStatus);

    const dbg: any = sig.debug ?? {};
    const meta: any = sig.meta ?? {};

    const alignment = dbg.alignment as TrueOpenAlignment | undefined;

    // Reliability text
    const reliabilityText = (() => {
        const src = meta.sourceUsed ?? "—";
        const ageMin = typeof meta.dataAgeMs === "number" ? Math.round(meta.dataAgeMs / 60000) : null;
        if (meta.capApplied) {
            return `${src} · Raw ${meta.rawScore}% → ${meta.finalScore}%${meta.capReason ? ` (${meta.capReason})` : ""}`;
        }
        if (ageMin !== null && ageMin > 15) {
            return `${src} · Age ${ageMin}m`;
        }
        return null;
    })();

    return (
        <div className={`rounded-xl border bg-white/5 p-4 space-y-3 ${scoreStyle.border}`}>

            {/* ── HEADER ─────────────────────────────────────────── */}
            <div className="flex items-start justify-between gap-2">
                <div>
                    <div className="text-orange-300 font-semibold tracking-wide text-sm">
                        הקשר פתיחת אמת (TRUE OPEN)
                    </div>
                    <div className="text-[10px] text-white/40 mt-0.5">
                        מנוע הקשר מאקרו · לא טריגר לכניסה
                    </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="flex gap-1.5 flex-wrap justify-end">
                        <span className={alignmentChip(alignment)}>
                            {alignmentLabel(alignment)}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadge}`}>
                            {computedStatus === 'STRONG' ? 'חזק' : computedStatus === 'OK' ? 'תקין' : computedStatus === 'WARN' ? 'אזהרה' : computedStatus}
                        </span>
                    </div>
                    <div className={`text-xl font-bold ${scoreStyle.text}`}>
                        {score}%{" "}
                        <span className="text-[10px] text-white/30 font-normal">בהירות</span>
                    </div>
                </div>
            </div>

            {/* ── RELIABILITY ────────────────────────────────────── */}
            {reliabilityText && (
                <div className="text-[10px] text-white/35 font-mono italic">
                    {reliabilityText}
                </div>
            )}

            {/* ── MACRO CONTEXT ──────────────────────────────────── */}
            {dbg.macroContext && (
                <div className="text-xs text-white/75 border-l-2 border-orange-400/40 pl-2.5 italic leading-snug">
                    {dbg.macroContext}
                </div>
            )}

            {/* ── GUIDANCE ───────────────────────────────────────── */}
            {dbg.guidance && (
                <div className="rounded-lg bg-white/5 border border-white/8 px-3 py-2.5">
                    <div className="text-[10px] text-white/40 uppercase tracking-wide mb-1">הנחיה (Guidance)</div>
                    <div className="text-xs text-white/85 leading-snug">{dbg.guidance}</div>
                </div>
            )}

            {/* ── ANCHOR GRID ────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-2">
                <AnchorCard
                    label="פתיחת יום"
                    openPrice={dbg.dayOpenPrice}
                    currentPrice={dbg.currentPrice}
                    side={dbg.day?.side}
                    pts={dbg.day?.pts}
                    strength={dbg.day?.strength}
                />
                <AnchorCard
                    label="פתיחת שבוע"
                    openPrice={dbg.weekOpenPrice}
                    currentPrice={dbg.currentPrice}
                    side={dbg.week?.side}
                    pts={dbg.week?.pts}
                    strength={dbg.week?.strength}
                    unavailableReason={dbg.weekOpenReason}
                    note={dbg.weekNote}
                />
            </div>

            {/* ── HELP ───────────────────────────────────────────── */}
            <div className="pt-0.5 border-t border-white/8">
                <PanelHelp
                    title="הקשר פתיחת אמת (True Open)"
                    bullets={[
                        "ציון (Score) = רמת הבהירות של הקשר המאקרו, לא עוצמת הכיוון.",
                        "בהירות גבוהה = מרחק משמעותי מהפתיחה (ביחס ל-ATR14).",
                        "מתואם (ALIGNED) = היום והשבוע באותו צד. מעורב (MIXED) = חוסר הסכמה.",
                        "אם פתיחת השבוע חסרה → מצב יום בלבד (לא נחשב כמעורב).",
                        "ההנחיה משלבת את תיאום המאקרו עם אזור הערך (Premium/Discount).",
                        "הקשר בלבד: השתמש ב-PSP/Liquidity לצורך תזמון כניסה.",
                    ]}
                />
            </div>
        </div>
    );
}
