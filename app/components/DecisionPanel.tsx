import React from "react";
import { getConfidenceColorClass } from "@/app/lib/uiSignalStyles";

type Status = "OK" | "WARN" | "OFF" | "ERROR" | "BLOCKED";
type Direction = "LONG" | "SHORT" | "NO_TRADE";

export type DecisionData = {
    direction: Direction;
    status: Status;
    confidencePct: number; // 0-100
    reason?: string;
    topDrivers?: string[];
    nextAction?: string;
};

export default function DecisionPanel({ data }: { data: DecisionData | null }) {
    if (!data) return null;

    const pct = Number.isFinite(data.confidencePct) ? Math.max(0, Math.min(100, data.confidencePct)) : 0;
    const conf = getConfidenceColorClass(pct);

    // HUD Colors
    const getHudStyles = () => {
        if (data.direction === "LONG") return "bg-emerald-900/40 border-emerald-500/30";
        if (data.direction === "SHORT") return "bg-red-900/40 border-red-500/30";
        return "bg-zinc-900/60 border-zinc-800";
    };

    const actionText =
        data.direction === "LONG" ? "LOOK FOR LONGS" :
            data.direction === "SHORT" ? "LOOK FOR SHORTS" :
                "WAIT / NEUTRAL";

    const hudClass = getHudStyles();

    return (
        <div className={`rounded-xl border p-3 flex items-center justify-between shadow-lg backdrop-blur-md ${hudClass}`}>

            {/* LEFT: Action */}
            <div className="flex flex-col">
                <div className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-0.5">
                    Decision Engine
                </div>
                <div className={`text-lg font-black tracking-tight ${conf.text}`}>
                    {actionText}
                </div>
                {/* Minimal Reason Line */}
                <div className="text-[11px] text-white/60 truncate max-w-[200px] md:max-w-xs">
                    {data.reason}
                </div>
            </div>

            {/* RIGHT: Score */}
            <div className="flex flex-col items-end pl-4 border-l border-white/10">
                <div className="text-[10px] uppercase text-white/50 font-bold">
                    Confidence
                </div>
                <div className={`text-2xl font-black ${conf.text}`}>
                    {pct}%
                </div>
                <div className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${data.status === "OK" ? "bg-emerald-500/20 text-emerald-400" :
                        data.status === "WARN" ? "bg-amber-500/20 text-amber-400" :
                            "bg-white/10 text-white/50"
                    }`}>
                    {data.status}
                </div>
            </div>
        </div>
    );
} 
