import React from "react";
import { clampPct, getConfidenceColorClass } from "@/app/lib/uiSignalStyles";
import { PanelHelp } from "@/app/components/PanelHelp";

type Status = "OK" | "WARN" | "OFF" | "ERROR";
type Direction = "LONG" | "SHORT" | "NO_TRADE";

export type DecisionData = {
    suggestion: Direction;     // LONG/SHORT/NO_TRADE
    confidencePct: number;     // 0–100
    status: Status;
    reason?: string;           // short reason sentence
    factors?: string[];        // list like "+2 Value SHORT", "+3 PSP CONFIRMED", "-1 Bias conflict"
    nextAction?: string;       // optional: what user should do now
};

function badgeClassForStatus(status: Status) {
    if (status === "OK") return "bg-emerald-500/15 text-emerald-300";
    if (status === "WARN") return "bg-yellow-500/15 text-yellow-300";
    if (status === "OFF") return "bg-white/10 text-white/60";
    return "bg-red-500/15 text-red-300";
}

function badgeClassForDirection(dir: Direction) {
    if (dir === "LONG") return "bg-emerald-600/90 text-white";
    if (dir === "SHORT") return "bg-red-600/90 text-white";
    return "bg-white/10 text-white/70";
}

export default function DecisionPanel({ data }: { data?: DecisionData | null }) {
    if (!data) return null;

    const confidence = clampPct(data.confidencePct);
    const conf = getConfidenceColorClass(confidence);
    const topFactors = (data.factors ?? []).slice(0, 3);

    // Optional: derive a better default “nextAction” if not provided
    const nextAction =
        data.nextAction ??
        (data.suggestion === "NO_TRADE"
            ? "Wait for alignment (PSP + Bias/Value + Liquidity)."
            : data.suggestion === "LONG"
                ? "Look for LONG execution: sweep → displacement → pullback entry."
                : "Look for SHORT execution: sweep → displacement → pullback entry.");

    return (
        <div className={`rounded-2xl border border-white/10 bg-white/5 p-4 ${conf.ring}`}>
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-lg font-extrabold tracking-wide text-fuchsia-400">
                        TRADE DECISION
                    </div>
                    <div className="text-xs text-white/50 -mt-0.5">
                        Final aggregated signal (core indicators)
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${badgeClassForDirection(data.suggestion)}`}>
                        {data.suggestion}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${badgeClassForStatus(data.status)}`}>
                        {data.status}
                    </span>
                    <span className={`text-lg font-extrabold ${conf.text}`}>
                        {confidence}%
                    </span>
                </div>
            </div>

            {/* Body */}
            <div className="mt-3 text-sm text-white/80">
                {data.reason ?? "Market condition is neutral or conflicting."}
            </div>

            {/* Top Factors chips */}
            {topFactors.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                    {topFactors.map((f, i) => (
                        <span key={i} className="px-2 py-1 rounded-lg bg-white/7 text-xs text-white/70">
                            {f}
                        </span>
                    ))}
                </div>
            )}

            {/* What to do now */}
            <div className="mt-3 text-xs text-white/60">
                <span className={`inline-block w-2 h-2 rounded-full mr-2 align-middle ${conf.dot}`} />
                <span className="align-middle">
                    <b className="text-white/75">Next:</b> {nextAction}
                </span>
            </div>

            {/* Help (short + clear) */}
            <div className="mt-3">
                <PanelHelp
                    title="Trade Decision"
                    bullets={[
                        "Aggregates: Confluence + PSP + Liquidity + Bias + Structure + Value.",
                        "Confidence color = strength only (not direction).",
                        "LONG/SHORT appears only when inputs align; otherwise NO_TRADE.",
                        "WARN = delayed feed or conflicting signals.",
                    ]}
                />
            </div>
        </div>
    );
}
