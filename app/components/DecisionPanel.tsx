import React, { useState } from "react";
import { getConfidenceColorClass } from "@/app/lib/uiSignalStyles";

type DecisionDirection = "LONG" | "SHORT" | "NO_TRADE";
type DecisionStatus = "OK" | "WARN";

export interface DecisionResult {
    direction: DecisionDirection;
    confidence: number; // 0–100
    status: DecisionStatus;
    reason: string;
    factors?: string[];
}

export default function DecisionPanel({ data }: { data: DecisionResult | null }) {
    const [open, setOpen] = useState(false);

    if (!data) return null;

    const confidenceStyle = getConfidenceColorClass(data.confidence);

    const directionColor =
        data.direction === "LONG"
            ? "bg-emerald-600/90 text-white"
            : data.direction === "SHORT"
                ? "bg-red-600/90 text-white"
                : "bg-white/10 text-white/60";

    const titleColor =
        data.direction === "LONG"
            ? "text-emerald-400"
            : data.direction === "SHORT"
                ? "text-red-400"
                : "text-white/70";

    return (
        <div
            className={`rounded-xl border border-white/10 bg-white/5 p-4 space-y-3 ${confidenceStyle.border}`}
        >
            {/* HEADER */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`text-lg font-bold tracking-wide ${titleColor}`}>
                        TRADE DECISION
                    </div>

                    <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${directionColor}`}
                    >
                        {data.direction}
                    </span>

                    <span className="px-2 py-0.5 rounded-full text-xs bg-white/10 text-white/70">
                        {data.status}
                    </span>
                </div>

                <div
                    className={`text-xl font-bold ${confidenceStyle.text}`}
                >
                    {data.confidence}%
                </div>
            </div>

            {/* REASON */}
            <div className="text-sm text-white/70">
                {data.reason}
            </div>

            {/* FACTORS */}
            {data.factors && data.factors.length > 0 && (
                <div className="flex flex-wrap gap-2 text-xs text-white/60">
                    {data.factors.map((f, idx) => (
                        <span key={idx}>• {f}</span>
                    ))}
                </div>
            )}

            {/* HELP TOGGLE */}
            <div
                className="text-xs text-white/50 cursor-pointer hover:text-white/70 transition"
                onClick={() => setOpen(!open)}
            >
                ▶ What Trade Decision checks (click)
            </div>

            {open && (
                <div className="text-xs text-white/60 bg-white/5 p-3 rounded-lg border border-white/10 space-y-2">
                    <div>
                        <strong>Purpose:</strong> Aggregates all core indicators
                        (Confluence, PSP, Liquidity, Bias, Structure, Value)
                        into one final trading suggestion.
                    </div>

                    <div>
                        <strong>Confidence %:</strong> Overall signal strength.
                        Color reflects strength, not direction.
                    </div>

                    <div>
                        <strong>Direction:</strong> LONG / SHORT only when
                        conditions align. Otherwise NO_TRADE.
                    </div>

                    <div>
                        <strong>Status:</strong> WARN = conflicting inputs or delayed feed.
                    </div>
                </div>
            )}
        </div>
    );
}
