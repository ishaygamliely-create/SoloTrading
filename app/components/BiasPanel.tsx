'use client';
import React from 'react';
import type { IndicatorSignal } from '../lib/types';
import IndicatorHeader from './IndicatorHeader';

interface BiasPanelProps {
    data: any;
    loading: boolean;
}

export function BiasPanel({ data, loading }: BiasPanelProps) {
    if (loading || !data?.analysis?.bias) {
        return <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-xl h-24"></div>;
    }

    const bias = data.analysis.bias as IndicatorSignal;
    const midnightOpen = data.analysis.midnightOpen;
    const buffer = 1.0;

    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 hover:bg-white/[0.06] transition h-full flex flex-col justify-center">
            <IndicatorHeader title="BIAS" signal={bias} />

            <div className="text-[10px] text-zinc-500 leading-tight">
                <span className="text-zinc-400 mr-2">Midnight {midnightOpen?.toFixed(2) ?? '---'} ± {buffer}</span>
                <span className="text-zinc-600">|</span>
                <span className="ml-2 text-zinc-500">{bias.hint}</span>
            </div>
        </div>
    );
}
