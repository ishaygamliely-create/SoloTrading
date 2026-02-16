// app/components/DecisionPanel.tsx
import React from "react";
import { PanelHelp } from "@/app/components/PanelHelp";
import { getConfidenceColorClass } from "@/app/lib/uiSignalStyles";

type Status = "OK" | "WARN" | "OFF" | "ERROR" | "BLOCKED";
type Direction = "LONG" | "SHORT" | "NO_TRADE";

export type DecisionData = {
    direction: Direction;
    status: Status;
    confidencePct: number; // 0-100
    reason?: string;
    topDrivers?: string[]; // e.g. ["+2 Value SHORT", "-1 Bias conflict"]
    nextAction?: string;   // e.g. "Wait for alignment (PSP + Liquidity + Bias)."
};

function directionBadgeClass(dir: Direction) {
    const base = "px-3 py-1 rounded-full text-xs font-semibold";
    if (dir === "LONG") return `${base} bg-emerald-600/90 text-white`;
    if (dir === "SHORT") return `${base} bg-red-600/90 text-white`;
    return `${base} bg-white/10 text-white/70`;
}

function statusChipClass(status: Status) {
    const base = "px-2 py-0.5 rounded-full text-xs font-semibold";
    if (status === "OK") return `${base} bg-emerald-500/15 text-emerald-300`;
    if (status === "WARN") return `${base} bg-yellow-500/15 text-yellow-300`;
    if (status === "BLOCKED") return `${base} bg-red-500/15 text-red-300`;
    if (status === "OFF") return `${base} bg-white/10 text-white/50`;
    return `${base} bg-white/10 text-white/50`;
}

export default function DecisionPanel({ data }: { data: DecisionData | null }) {
    if (!data) return null;

    const pct = Number.isFinite(data.confidencePct) ? Math.max(0, Math.min(100, data.confidencePct)) : 0;
    const conf = getConfidenceColorClass(pct); // {text,border,bg,bar} per your uiSignalStyles.ts

    const summaryTitle =
        data.direction === "NO_TRADE" ? "Neutral / Conflicting Signals" :
            data.direction === "LONG" ? "Long Bias (Aligned)" :
                "Short Bias (Aligned)";

    const summaryBody =
        data.reason?.trim() ||
        (data.direction === "NO_TRADE"
            ? "Market condition is neutral or conflicting."
            : "Core indicators are aligned.");

    const drivers = (data.topDrivers ?? []).filter(Boolean).slice(0, 4);
    const nextAction =
        data.nextAction?.trim() ||
        (data.direction === "NO_TRADE"
            ? "Wait for alignment (PSP + Liquidity + Bias/Value)."
            : "Follow playbook: wait for entry trigger near key level.");

    return (
        <div className={`rounded-xl border border-white/10 bg-white/5 p-4 ${conf.border}`}>
            {/* HEADER */}
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-pink-400 font-bold tracking-wide text-lg">
                        TRADE DECISION
                    </div>
                    <div className="text-xs text-white/50">
                        Final aggregated signal (core indicators)
                    </div>
                </div>

                {/* Right stack: chips + big % */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-2">
                        <span className={directionBadgeClass(data.direction)}>{data.direction}</span>
                        <span className={statusChipClass(data.status)}>{data.status}</span>
                    </div>

                    <div className={`text-2xl font-extrabold leading-none ${conf.text}`}>
                        {pct}%
                    </div>
                </div>
            </div>

            {/* SUMMARY */}
            <div className={`mt-3 rounded-lg border border-white/10 ${conf.bg} p-3`}>
                <div className="text-[11px] uppercase tracking-wider text-white/50">
                    Summary
                </div>
                <div className="mt-1 font-semibold text-white/90">{summaryTitle}</div>
                <div className="mt-1 text-sm text-white/70">{summaryBody}</div>
            </div>

            {/* TOP DRIVERS */}
            {drivers.length > 0 && (
                <div className="mt-3">
                    <div className="text-[11px] uppercase tracking-wider text-white/50">
                        Top drivers
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {drivers.map((d, i) => (
                            <span
                                key={i}
                                className="px-2 py-1 rounded-md text-xs bg-white/5 border border-white/10 text-white/70"
                            >
                                {d}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* NEXT ACTION */}
            <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-white/50" />
                    <div className="text-[11px] uppercase tracking-wider text-white/50">
                        Next action
                    </div>
                </div>
                <div className="mt-1 text-sm text-white/80 font-medium">
                    {nextAction}
                </div>
            </div>

            {/* HELP (minimal) */}
            <div className="mt-3">
                <PanelHelp
                    title="Trade Decision"
                    bullets={[
                        "Aggregates core indicators (Confluence, PSP, Liquidity, Bias, Structure, Value).",
                        "Confidence color = strength (not direction).",
                        "Direction shows LONG/SHORT only when alignment is strong; otherwise NO_TRADE.",
                        "WARN usually means conflicting inputs or delayed feed.",
                    ]}
                />
            </div>
        </div>
    );
} 
