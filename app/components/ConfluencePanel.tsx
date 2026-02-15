import React from "react";
import { getDirectionBadgeClass, getScoreTextClass, getConfidenceBorderClass } from "@/app/lib/uiSignalStyles";
import { PanelHelp } from "./PanelHelp";

type ConfluenceLevel = "NO_TRADE" | "WEAK" | "GOOD" | "STRONG";
type ConfluenceSuggestion = "LONG" | "SHORT" | "NO_TRADE";
type ConfluenceStatus = "OK" | "WARN" | "BLOCKED" | "OFF" | "ERROR";

export interface ConfluenceResult {
    scorePct: number; // 0–100
    level: ConfluenceLevel;
    suggestion: ConfluenceSuggestion;
    status: ConfluenceStatus;
    factors?: string[];
}

export function ConfluencePanel({ data, loading }: { data: { analysis: { confluence: ConfluenceResult } } | any; loading?: boolean }) {
    // Guard clause for missing data structure
    if (loading || !data?.analysis?.confluence) return <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-xl h-24"></div>;

    const confluence = data.analysis.confluence as ConfluenceResult;
    const showDirection = confluence.level !== "NO_TRADE" && confluence.suggestion !== "NO_TRADE";

    const scoreClass = getScoreTextClass(confluence.scorePct);
    const borderClass = getConfidenceBorderClass(confluence.scorePct);

    return (
        <div className={`rounded-xl bg-white/5 p-4 space-y-2 ${borderClass}`}>
            {/* Row 1 */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="font-semibold tracking-wide text-pink-400">
                        CONFLUENCE
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-xs bg-white/10 text-white">
                        {confluence.level}
                    </span>

                    {showDirection && (
                        <span
                            className={getDirectionBadgeClass({
                                direction: confluence.suggestion,
                                score: confluence.scorePct,
                                status: confluence.status,
                            })}
                        >
                            {confluence.suggestion}
                        </span>
                    )}

                    <span
                        className={`px-2 py-0.5 rounded-full text-xs ${confluence.status === "OK"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : confluence.status === "WARN"
                                ? "bg-yellow-500/20 text-yellow-300"
                                : confluence.status === "BLOCKED"
                                    ? "bg-red-500/20 text-red-300"
                                    : "bg-white/10 text-white/60"
                            }`}
                    >
                        {confluence.status}
                    </span>
                </div>

                <div className={`font-bold text-lg ${scoreClass}`}>{confluence.scorePct}%</div>
            </div>

            {/* Row 2 */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/60">
                {(confluence.factors ?? []).slice(0, 10).map((f, idx) => (
                    <span key={idx}>{f}</span>
                ))}
            </div>
            <PanelHelp title="CONFLUENCE">
                <ul className="list-disc pl-5 space-y-1">
                    <li><b>Score</b>: Aggregated system confidence.</li>
                    <li><b>Factors</b>: Key drivers of the score.</li>
                    <li><b>Suggestion</b>: Trade direction bias.</li>
                </ul>
            </PanelHelp>
        </div>
    );
}
