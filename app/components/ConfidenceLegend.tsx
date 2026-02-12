import React from 'react';

export function ConfidenceLegend() {
    return (
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-3 text-[10px] text-zinc-500">
            <div className="font-bold text-zinc-400 uppercase tracking-wider mb-2">Confidence Colors</div>

            <div className="space-y-1.5 font-mono">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span>0–59% Low (weak)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                    <span>60–74% Medium (caution)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span>75–100% High (strong)</span>
                </div>
            </div>

            <div className="mt-3 pt-2 border-t border-zinc-800/50 opacity-70 leading-tight">
                Color = strength, not direction.<br />
                LONG/SHORT badges show direction.
            </div>
        </div>
    );
}
