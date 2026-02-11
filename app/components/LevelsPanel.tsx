'use client';
import React from 'react';

type Props = {
    data: any;
    loading: boolean;
};

export function LevelsPanel({ data, loading }: Props) {
    if (loading || !data?.levels) {
        return <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-xl h-full min-h-[160px]"></div>;
    }

    const { trueDayOpen, pdh, pdl, vwap, sdValues } = data.levels;
    const price = data.price || 0;

    const LevelRow = ({ label, value, color, icon }: any) => (
        <div className="flex justify-between items-center py-1 border-b border-zinc-800/30 last:border-0 hover:bg-white/5 px-1.5 rounded transition-colors group">
            <span className="text-[10px] text-zinc-500 uppercase flex items-center gap-1">
                {icon && <span className="opacity-50">{icon}</span>}
                {label}
            </span>
            <div className="text-right">
                <span className={`text-xs font-mono font-bold ${color}`}>{value ? value.toFixed(2) : '-'}</span>
                {/* Testing Indicator */}
                {value && Math.abs(price - value) < 5 && (
                    <span className="ml-2 text-[8px] bg-white/10 px-1 rounded text-white animate-pulse">TEST</span>
                )}
            </div>
        </div>
    );

    return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-400 uppercase">Key Levels</span>
                    <span className="text-[10px] text-zinc-600 bg-zinc-950 px-1.5 rounded border border-zinc-800">
                        VWAP Monitor
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col gap-0.5">
                <LevelRow label="True Open" value={trueDayOpen} color="text-blue-400" />
                <LevelRow label="Session VWAP" value={vwap} color="text-orange-400" />

                <div className="my-1 h-px bg-zinc-800/50" />

                <LevelRow label="Prev High" value={pdh} color="text-red-400/80" />
                <LevelRow label="Prev Low" value={pdl} color="text-green-400/80" />

                {sdValues && (
                    <>
                        <div className="my-1 h-px bg-zinc-800/50" />
                        <div className="grid grid-cols-2 gap-2 mt-1">
                            <div className="bg-zinc-950/30 p-1 rounded text-center">
                                <div className="text-[9px] text-zinc-500 uppercase">Values</div>
                                <div className="text-[10px] text-orange-300/60 font-mono">SD1: {sdValues.sd1_upper?.toFixed(0)}</div>
                            </div>
                            <div className="bg-zinc-950/30 p-1 rounded text-center">
                                <div className="text-[9px] text-zinc-500 uppercase">Range</div>
                                <div className="text-[10px] text-orange-300/40 font-mono">SD2: {sdValues.sd2_upper?.toFixed(0)}</div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
