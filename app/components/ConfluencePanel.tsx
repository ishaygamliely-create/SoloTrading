import React from "react";
import { PanelHelp } from "@/app/components/PanelHelp";
import { getConfidenceColorClass } from "@/app/lib/uiSignalStyles";
import IndicatorHeader, { IndicatorSignal } from "./IndicatorHeader";

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

    // Map to Standard Signal
    const signal: IndicatorSignal = {
        status: data.status === "BLOCKED" ? "WARN" : (data.status as any),
        direction: data.suggestion === "NO_TRADE" ? "NEUTRAL" : data.suggestion,
        score: score,
        hint: "",
        debug: {}
    };

    const drivers = (data.factors ?? []).slice(0, 3);

    return (
        <div className={`rounded-xl border border-white/10 bg-white/5 p-4 space-y-2 ${conf.border}`}>
            <IndicatorHeader
                title="CONFLUENCE"
                signal={signal}
                rightBadgeText={data.level !== "NO_TRADE" ? data.level : undefined}
            />

            <div className="flex flex-col gap-1">
                <div className="text-[10px] uppercase tracking-wider text-white/40 font-bold">
                    Drivers
                </div>
                <div className="text-xs text-white/80 leading-snug">
                    {drivers.length > 0 ? (
                        <ul className="list-disc pl-3 space-y-0.5">
                            {drivers.map((d, i) => <li key={i}>{d}</li>)}
                        </ul>
                    ) : (
                        <span className="italic text-white/40">No major drivers detected.</span>
                    )}
                </div>
            </div>

            <div className="mt-1 pt-2 border-t border-white/5">
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
