import React from 'react';
import type { IndicatorSignal } from '../lib/types';
import IndicatorHeader from './IndicatorHeader';
import { getConfidenceBorderClass } from '@/app/lib/uiSignalStyles';
import { PanelHelp } from './PanelHelp';

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

    const borderClass = getConfidenceBorderClass(valueZone.score);

    return (
        <div className={`rounded-xl bg-white/5 p-3 hover:bg-white/[0.06] transition h-full flex flex-col justify-center ${borderClass}`}>
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
            <PanelHelp title="VALUE">
                <ul className="list-disc pl-5 space-y-1">
                    <li><b>Zone</b>: Premium (Expensive) or Discount (Cheap).</li>
                    <li><b>Range</b>: % of time spent inside value area.</li>
                    <li><b>EQ</b>: Equilibrium price level.</li>
                </ul>
            </PanelHelp>
        </div>
    );
}
