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
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 h-full flex flex-col justify-between">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Key Levels</span>
                <span className="text-[9px] text-zinc-600 bg-zinc-950 px-1.5 rounded border border-zinc-800">
                    VWAP Monitor
                </span>
            </div>

            {/* 2x2 Grid for Main Levels */}
            <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="bg-white/5 rounded p-1.5 flex flex-col">
                    <span className="text-[9px] text-zinc-500 uppercase font-bold">True Open</span>
                    <span className="text-sm font-mono font-bold text-blue-400">{trueDayOpen ? trueDayOpen.toFixed(2) : '-'}</span>
                </div>
                <div className="bg-white/5 rounded p-1.5 flex flex-col">
                    <span className="text-[9px] text-zinc-500 uppercase font-bold">VWAP</span>
                    <span className="text-sm font-mono font-bold text-orange-400">{vwap ? vwap.toFixed(2) : '-'}</span>
                </div>
                <div className="bg-white/5 rounded p-1.5 flex flex-col">
                    <span className="text-[9px] text-zinc-500 uppercase font-bold">Prev High</span>
                    <span className="text-sm font-mono font-bold text-red-400/80">{pdh ? pdh.toFixed(2) : '-'}</span>
                </div>
                <div className="bg-white/5 rounded p-1.5 flex flex-col">
                    <span className="text-[9px] text-zinc-500 uppercase font-bold">Prev Low</span>
                    <span className="text-sm font-mono font-bold text-green-400/80">{pdl ? pdl.toFixed(2) : '-'}</span>
                </div>
            </div>

            {/* SD Ranges */}
            {sdValues && (
                <div className="grid grid-cols-2 gap-2 border-t border-white/5 pt-2">
                    <div className="text-center">
                        <div className="text-[9px] text-zinc-500 uppercase">SD1 Range</div>
                        <div className="text-[10px] text-orange-300/60 font-mono mt-0.5">
                            {sdValues.sd1_lower?.toFixed(0)} - {sdValues.sd1_upper?.toFixed(0)}
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="text-[9px] text-zinc-500 uppercase">SD2 Range</div>
                        <div className="text-[10px] text-orange-300/40 font-mono mt-0.5">
                            {sdValues.sd2_lower?.toFixed(0)} - {sdValues.sd2_upper?.toFixed(0)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
