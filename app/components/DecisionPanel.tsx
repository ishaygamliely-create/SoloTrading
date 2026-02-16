import React from "react";
import { getConfidenceColorClass } from "@/app/lib/uiSignalStyles";

type DecisionStatus = "OK" | "WARN" | "BLOCKED";
type DecisionDirection = "LONG" | "SHORT" | "NO_TRADE";

interface DecisionData {
    direction: DecisionDirection;
    confidence: number; // 0-100
    status: DecisionStatus;
    reason: string;
    factors: string[];
}

export default function DecisionPanel({ data }: { data: DecisionData | null }) {
    if (!data) return null;

    const confidenceStyle = getConfidenceColorClass(data.confidence);

    const directionBadge =
        data.direction === "LONG"
            ? "bg-emerald-600/90 text-white"
            : data.direction === "SHORT"
                ? "bg-red-600/90 text-white"
                : "bg-white/10 text-white/60";

    return (
        <div className={`rounded-xl border border-white/10 bg-white/5 p-4 space-y-3 ${confidenceStyle.border}`}>

            {/* HEADER */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400 font-bold tracking-wide text-lg">
                        TRADE DECISION
                    </div>
                    <div className="text-xs text-white/50">
                        Final Aggregated Signal Engine
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${directionBadge}`}>
                        {data.direction === "NO_TRADE" ? "NO TRADE" : data.direction}
                    </span>

                    <span className={`text-xl font-bold ${confidenceStyle.text}`}>
                        {data.confidence}%
                    </span>
                </div>
            </div>

            {/* SHORT REASON */}
            <div className="text-sm text-white/70">
                {data.reason}
            </div>

            {/* FACTORS */}
            {data.factors?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {data.factors.slice(0, 4).map((f, i) => (
                        <span
                            key={i}
                            className="text-xs bg-white/10 px-2 py-1 rounded-md text-white/70"
                        >
                            {f}
                        </span>
                    ))}
                </div>
            )}

            {/* HELP */}
            <details className="text-xs text-white/60 mt-2">
                <summary className="cursor-pointer hover:text-white">
                    What Trade Decision checks
                </summary>
                <div className="mt-2 space-y-1">
                    <div>• Aggregates Confluence, PSP, Liquidity, Bias, Structure, Value.</div>
                    <div>• Confidence % = signal strength (not direction).</div>
                    <div>• LONG/SHORT shown only when indicators align.</div>
                </div>
            </details>
        </div>
    );
}
