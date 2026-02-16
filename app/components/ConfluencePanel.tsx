import React from "react";
import { PanelHelp } from "@/app/components/PanelHelp";
import { getConfidenceColorClass } from "@/app/lib/uiSignalStyles";

type ConfluenceLevel = "NO_TRADE" | "WEAK" | "GOOD" | "STRONG";
type ConfluenceSuggestion = "LONG" | "SHORT" | "NO_TRADE";
type ConfluenceStatus = "OK" | "WARN" | "BLOCKED" | "OFF" | "ERROR";

export type ConfluenceResult = {
    scorePct: number;          // 0–100
    level: ConfluenceLevel;
    suggestion: ConfluenceSuggestion;
    status: ConfluenceStatus;
    factors?: string[];
};

export default function ConfluencePanel({ data }: { data?: ConfluenceResult | null }) {
    if (!data) return null;

    const score = Math.max(0, Math.min(100, Math.round(data.scorePct ?? 0)));
    const conf = getConfidenceColorClass(score);

    // Status Color Logic
    const getStatusColor = (s: ConfluenceStatus) => {
        switch (s) {
            case "OK": return "bg-emerald-500/15 text-emerald-300";
            case "WARN": return "bg-yellow-500/15 text-yellow-300";
            case "BLOCKED":
            case "ERROR": return "bg-red-500/15 text-red-300";
            case "OFF":
            default: return "bg-white/10 text-white/50";
        }
    };

    const drivers = (data.factors ?? []).slice(0, 3);

    return (
        <div className={`rounded-xl border border-white/10 bg-white/5 p-4 space-y-2 ${conf.border}`}>
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                    <div className="font-semibold text-pink-400 tracking-wide">
                        CONFLUENCE
                    </div>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-white/10 text-white">
                        {data.level}
                    </span>
                </div>

                <div className="flex flex-col items-end shrink-0 gap-1">
                    <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-full ${getStatusColor(data.status)}`}>
                        {data.status}
                    </span>
                    <span className={`text-xl font-bold ${conf.text}`}>
                        {score}%
                    </span>
                </div>
            </div>

            <div className="text-xs text-white/60">
                Drivers: {drivers.length > 0 ? drivers.join(", ") : "None"}
            </div>

            <div className="mt-1">
                <PanelHelp title="CONFLUENCE" bullets={[
                    "Engine Readout: Aggregates all subsystems.",
                    "Score = Global Confidence (0-100%).",
                    "Level = Strength Tier (WEAK/GOOD/STRONG).",
                    "Drivers = Top contributing factors."
                ]} />
            </div>
        </div>
    );
}
