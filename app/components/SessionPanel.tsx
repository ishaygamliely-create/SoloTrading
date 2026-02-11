'use client';
import React from 'react';
import type { IndicatorSignal } from '@/app/lib/types';

export function SessionPanel({ session }: { session: IndicatorSignal | undefined }) {
    if (!session) return <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-xl h-24"></div>;

    const flags = session.debug?.flags;
    const active = session.score >= 80;

    return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 h-full flex flex-col justify-center">
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-400 uppercase">SESSION</span>
                    <span className={`text-[10px] font-bold ${active ? "text-green-400" : "text-yellow-500"} border border-white/5 px-1.5 py-px rounded`}>
                        {active ? "ACTIVE" : "OFF-HOURS"}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-zinc-300">
                        {flags?.nyTime ?? "??:??:??"}
                    </span>
                </div>
            </div>

            <div className="text-[10px] text-zinc-500 leading-tight">
                {session.hint}
            </div>
        </div>
    );
}
