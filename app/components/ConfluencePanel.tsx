import React from "react";
import { PanelHelp } from "@/app/components/PanelHelp";
import { getConfidenceColorClass, getDirectionBadgeClass } from "@/app/lib/uiSignalStyles";

type ConfluenceLevel = "NO_TRADE" | "WEAK" | "GOOD" | "STRONG";
type ConfluenceSuggestion = "LONG" | "SHORT" | "NO_TRADE";
type ConfluenceStatus = "OK" | "WARN" | "BLOCKED" | "OFF" | "ERROR";

export type ConfluenceResult = {
    scorePct: number;          // 0–100
    level: ConfluenceLevel;
    suggestion: ConfluenceSuggestion;
    status: ConfluenceStatus;
    factors?: string[];        // strings like "+2 Value SHORT"
};

export default function ConfluencePanel({ data }: { data?: ConfluenceResult | null }) {
    if (!data) return null;

    const score = Math.max(0, Math.min(100, Math.round(data.scorePct ?? 0)));
    const conf = getConfidenceColorClass(score);
    const showDir = data.level !== "NO_TRADE" && data.suggestion !== "NO_TRADE";

    const topFactors = (data.factors ?? []).filter(Boolean).slice(0, 3);

    return (
        <div className={`rounded-xl border border-white/10 bg-white/5 p-3 ${conf.border}`}>
            {/* Row 1: Header */}
            <div className="flex items-start justify-between gap-3">
                {/* Left */}
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <div className="font-semibold tracking-wide text-pink-400">
                            CONFLUENCE
                        </div>

                        <span className="px-2 py-0.5 rounded-full text-[11px] bg-white/10 text-white/80">
                            {data.level}
                        </span>

                        {showDir && (
                            <span
                                className={getDirectionBadgeClass({
                                    direction: data.suggestion,
                                    score,
                                    status: data.status,
                                })}
                            >
                                {data.suggestion}
                            </span>
                        )}

                        <span
                            className={`px-2 py-0.5 rounded-full text-[11px] ${data.status === "OK"
                                    ? "bg-emerald-500/15 text-emerald-300"
                                    : data.status === "WARN"
                                        ? "bg-yellow-500/15 text-yellow-300"
                                        : data.status === "BLOCKED"
                                            ? "bg-red-500/15 text-red-300"
                                            : "bg-white/10 text-white/60"
                                }`}
                        >
                            {data.status}
                        </span>
                    </div>

                    {/* Row 2: Factors (compact) */}
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/60">
                        {topFactors.length > 0 ? (
                            topFactors.map((f, i) => <span key={i}>{f}</span>)
                        ) : (
                            <span>No strong confluence drivers.</span>
                        )}
                    </div>
                </div>

                {/* Right: Score */}
                <div className="shrink-0 flex flex-col items-end">
                    <div className={`font-bold text-base ${conf.text}`}>{score}%</div>
                </div>
            </div>

            {/* Help toggle */}
            <div className="mt-2">
                <PanelHelp
                    title="CONFLUENCE"
                    bullets={[
                        "Purpose: internal engine score showing how well core indicators align.",
                        "Score% = strength only (uses global color law). Not direction.",
                        "Suggestion LONG/SHORT appears only when alignment is clean; otherwise NO_TRADE.",
                        "Factors show top contributors (e.g., Value zone, PSP, Liquidity).",
                        "Use DecisionPanel as final output; Confluence is the supporting readout.",
                    ]}
                />
            </div>
        </div>
    );
}
