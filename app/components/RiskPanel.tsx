'use client';
import React from 'react';

type Props = {
    data: any;
    loading: boolean;
};

export function RiskPanel({ data, loading }: Props) {
    if (loading) {
        return <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-xl h-full min-h-[160px]"></div>;
    }

    if (!data?.analysis?.risk || data.analysis.risk.direction === 'NEUTRAL') {
        // Return null or placeholder as per requirement "No empty cards"
        // If neutral and no data, we might not render it.
        // User said: "If no data -> show 'No data' OR do not render the card."
        // We'll return null to hide it if there's no active risk setup.
        return null;
    }

    const { direction, rrRatio, invalidation, targets } = data.analysis.risk;
    const isLong = direction === 'LONG';
    const dirColor = isLong ? 'text-green-400' : 'text-red-400';
    const borderColor = isLong ? 'border-green-900/50' : 'border-red-900/50';

    return (
        <div className={`rounded-xl border ${borderColor} bg-zinc-900/60 p-3 h-full flex flex-col`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-400 uppercase">Risk Analysis</span>
                    <span className={`text-[10px] font-bold ${dirColor} border border-white/5 px-1.5 py-px rounded`}>
                        {direction}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-zinc-950 px-2 py-0.5 rounded text-zinc-300 font-mono border border-zinc-800">
                        1:{rrRatio?.toFixed(2)}
                    </span>
                </div>
            </div>

            <div className="flex-1 space-y-2">
                {/* Invalid Level */}
                {invalidation && (
                    <div className="flex justify-between items-center p-1.5 rounded bg-red-950/20 border border-red-900/30">
                        <span className="text-[9px] text-red-400 uppercase font-bold">Invalidation</span>
                        <div className="text-right leading-none">
                            <span className="text-red-300 font-mono text-xs font-bold">{invalidation.price.toFixed(2)}</span>
                            <span className="text-[9px] text-zinc-500 block">-{invalidation.distance?.toFixed(2)} pts</span>
                        </div>
                    </div>
                )}

                {/* Targets */}
                {targets && targets.length > 0 && (
                    <div className="space-y-1">
                        <span className="text-[9px] text-zinc-500 uppercase font-bold pl-1">Targets</span>
                        {(targets || []).slice(0, 2).map((t: any, i: number) => (
                            <div key={i} className="flex justify-between items-center p-1.5 rounded bg-green-950/20 border border-green-900/30">
                                <span className="text-[9px] text-green-400/80 truncate max-w-[80px]">{t.description}</span>
                                <div className="text-right leading-none">
                                    <span className="text-green-300 font-mono text-xs font-bold">{t.price.toFixed(2)}</span>
                                    <span className="text-[9px] text-zinc-500 block">+{t.distance?.toFixed(2)} pts</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
