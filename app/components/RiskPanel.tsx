'use client';
import React from 'react';
import IndicatorHeader, { IndicatorSignal } from './IndicatorHeader';

type Props = {
    data: any;
    loading: boolean;
};

export function RiskPanel({ data, loading }: Props) {
    if (loading) {
        return <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-xl h-full min-h-[160px]"></div>;
    }

    if (!data?.analysis?.risk || data.analysis.risk.direction === 'NEUTRAL') {
        return null;
    }

    const { direction, rrRatio, invalidation, targets } = data.analysis.risk;

    // Construct valid signal for Header
    const riskSignal: IndicatorSignal = {
        status: 'OK',
        direction: direction,
        score: Math.min((rrRatio || 0) * 10, 100), // Fake score based on R:R? Or just 0.
        hint: `R:R 1:${rrRatio?.toFixed(2)}`
    };

    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 hover:bg-white/[0.06] transition h-full flex flex-col">
            <IndicatorHeader title="RISK" signal={riskSignal} />

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
