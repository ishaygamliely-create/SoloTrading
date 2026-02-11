'use client';

import React from 'react';
import { IndicatorSignal } from '../lib/types';
import IndicatorHeader from './IndicatorHeader';

type Props = {
    data: any;
    loading: boolean;
};

export function SMTPanel({ data, loading }: Props) {
    if (loading || !data?.analysis?.smt) {
        return <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-xl h-full min-h-[100px]"></div>;
    }

    const smt = data.analysis.smt as IndicatorSignal;
    const isActive = smt.score >= 50;

    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 hover:bg-white/[0.06] transition h-full flex flex-col justify-center">
            <IndicatorHeader title="SMT" signal={smt} />

            <div className="text-[10px] text-zinc-500 leading-tight">
                {smt.debug?.factors && smt.debug.factors.length > 0 ? (
                    <span className={isActive ? 'text-zinc-300' : 'text-zinc-500'}>
                        {smt.debug.factors[0]}
                    </span>
                ) : (
                    <span>{smt.hint}</span>
                )}
            </div>
        </div>
    );
}
