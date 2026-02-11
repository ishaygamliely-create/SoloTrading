'use client';
import React from 'react';
import type { IndicatorSignal } from '../lib/types';
import IndicatorHeader from './IndicatorHeader';

interface ValueZonePanelProps {
    data: any;
    loading: boolean;
}

export function ValueZonePanel({ data, loading }: ValueZonePanelProps) {
    if (loading || !data?.analysis?.valueZone) {
        return <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-xl h-24"></div>;
    }

    const valueZone = data.analysis.valueZone as IndicatorSignal;
    const debug = valueZone.debug || {};
    const { pdh, pdl, eq, percentInRange, label, zone } = debug as any;

    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 hover:bg-white/[0.06] transition h-full flex flex-col justify-center">
            <IndicatorHeader
                title="VALUE"
                signal={valueZone}
                rightBadgeText={zone || label}
            />

            <div className="text-[10px] text-zinc-500 leading-tight truncate">
                <span className="text-zinc-400">{percentInRange}% in Range</span>
                <span className="mx-2 text-zinc-700">|</span>
                <span className="text-zinc-500">{valueZone.hint}</span>
            </div>
            {/* Optional detailed debug line if space permits */}
            <div className="text-[9px] text-zinc-600 mt-1 hidden md:block">
                PDH {pdh?.toFixed(2)} | EQ {eq?.toFixed(2)} | PDL {pdl?.toFixed(2)}
            </div>
        </div>
    );
}
