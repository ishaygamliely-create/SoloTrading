"use client";

import React from "react";
import type { BiasMode, DataStatus } from "@/app/lib/marketContext";
import { getSuggestedDirection } from "@/app/lib/marketContext";

type Props = {
    price: number;
    pdh: number;
    pdl: number;
    eq: number;
    dailyRangePercent: number;
    regime: "TRENDING" | "RANGING" | "COMPRESSED" | "UNKNOWN" | string;
    biasMode: BiasMode;
    dataStatus: DataStatus;
    dataAgeLabel?: string;    // e.g. "4m 12s"
    lastBarNyTime?: string;   // e.g. "04:23:37"
};

export default function MarketContextCompact(props: Props) {
    const direction = getSuggestedDirection({
        price: props.price,
        eq: props.eq,
        biasMode: props.biasMode,
        dataStatus: props.dataStatus,
    });

    const dirClass =
        direction === "LONG"
            ? "text-green-400"
            : direction === "SHORT"
                ? "text-red-400"
                : direction === "NO TRADE"
                    ? "text-zinc-500"
                    : "text-yellow-400";

    const statusClass =
        props.dataStatus === "OK"
            ? "text-green-400"
            : props.dataStatus === "DELAYED"
                ? "text-yellow-400"
                : props.dataStatus === "BLOCKED"
                    ? "text-red-400"
                    : "text-zinc-500";

    return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 mb-4">
            {/* Row 1 */}
            <div className="flex items-center justify-between gap-3">
                <div className={`text-lg font-black tracking-tight ${dirClass}`}>
                    SUGGESTED: {direction}
                </div>

                <div className="text-sm font-bold text-cyan-400/90 uppercase tracking-wider">
                    {props.regime}
                </div>

                <div className={`text-xs font-bold ${statusClass} text-right leading-tight`}>
                    <div>{props.dataStatus} {props.dataAgeLabel ? `(${props.dataAgeLabel})` : ""}</div>
                    {props.lastBarNyTime && (
                        <div className="text-[10px] font-mono text-zinc-500 font-medium">
                            Last: {props.lastBarNyTime} NY
                        </div>
                    )}
                </div>
            </div>

            {/* Row 2 */}
            <div className="mt-2 flex items-center justify-between text-[11px] font-mono font-medium text-zinc-500 border-t border-zinc-800/50 pt-2">
                <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-red-500/50"></span>PDH <span className="text-zinc-300">{Number(props.pdh).toFixed(2)}</span></span>
                <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-blue-500/50"></span>EQ <span className="text-zinc-300">{Number(props.eq).toFixed(2)}</span></span>
                <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-green-500/50"></span>PDL <span className="text-zinc-300">{Number(props.pdl).toFixed(2)}</span></span>
                <span className="flex items-center gap-1">RNG <span className="text-zinc-300">{Number(props.dailyRangePercent).toFixed(1)}%</span></span>
            </div>
        </div>
    );
}
