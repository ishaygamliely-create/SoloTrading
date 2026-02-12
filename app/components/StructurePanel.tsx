import React from 'react';
import type { IndicatorSignal } from '../lib/types';
import IndicatorHeader from './IndicatorHeader';
import { getConfidenceBorderClass } from '@/app/lib/uiSignalStyles';

interface StructurePanelProps {
    data: any;
    loading: boolean;
}

export function StructurePanel({ data, loading }: StructurePanelProps) {
    if (loading || !data?.analysis?.structure) {
        return <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-xl h-24"></div>;
    }

    const structure = data.analysis.structure as IndicatorSignal;
    const debug = structure.debug || {};
    const { label, adx, ema20, ema50 } = debug as any;

    const borderClass = getConfidenceBorderClass(structure.score);

    return (
        <div className={`rounded-xl bg-white/5 p-3 hover:bg-white/[0.06] transition h-full flex flex-col justify-center ${borderClass}`}>
            <IndicatorHeader
                title="STRUCTURE"
                signal={structure}
                rightBadgeText={label || (debug as any).regime}
            />

            <div className="text-[10px] text-zinc-500 leading-tight truncate">
                <span className="text-zinc-400">ADX {adx}</span>
                <span className="mx-2 text-zinc-700">|</span>
                <span className="text-zinc-500">{structure.hint}</span>
            </div>
            {/* Optional debug for EMA relation if useful, or keep concise */}
            <div className="text-[9px] text-zinc-600 mt-1 hidden md:block">
                EMA20 {Number(ema20)?.toFixed(1)} / EMA50 {Number(ema50)?.toFixed(1)}
            </div>
        </div>
    );
}
