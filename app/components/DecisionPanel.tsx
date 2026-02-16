"use client";

import React from "react";
import { isActionableDirection } from "@/app/lib/uiPanelRules";

type Props = {
    confluence?: {
        score?: number; // Normalized to use 'score' as per existing app, allowing 'scorePct' as backup
        scorePct?: number;
        level?: string;
        suggestion?: string; // "LONG" | "SHORT" | "NO_TRADE"
        status?: string; // "OK" | "WARN" | "OFF" | "ERROR"
        factors?: string[];
    };
};

export default function DecisionPanel({ confluence }: Props) {
    if (!confluence) return null;

    const dir = confluence.suggestion ?? "NO_TRADE";
    const actionable = isActionableDirection(dir);
    const displayScore = confluence.scorePct ?? confluence.score ?? 0;

    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-white/80">TRADE DECISION</div>
                <div className="flex items-center gap-2">
                    {confluence.level && (
                        <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/70">
                            {confluence.level}
                        </span>
                    )}
                    {actionable ? (
                        <span
                            className={`text-xs px-2 py-1 rounded-full ${dir === "LONG"
                                    ? "bg-emerald-600/80 text-white"
                                    : "bg-red-600/80 text-white"
                                }`}
                        >
                            {dir}
                        </span>
                    ) : (
                        <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/60">
                            NO TRADE
                        </span>
                    )}

                    <span className="text-sm font-bold text-white/80">
                        {Math.round(displayScore)}%
                    </span>
                </div>
            </div>

            <div className="mt-2 text-xs text-white/60">
                {actionable
                    ? "Reason: based on Confluence + supporting signals below."
                    : "Reason: signals are mixed / low confidence."}
            </div>

            {/* Keep it short - only top 4 reasons */}
            {(confluence.factors ?? []).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/50">
                    {(confluence.factors ?? []).slice(0, 4).map((f, i) => (
                        <span key={i}>{f}</span>
                    ))}
                </div>
            )}
        </div>
    );
}
