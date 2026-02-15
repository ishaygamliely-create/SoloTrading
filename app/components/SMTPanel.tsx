import React from 'react';
import { IndicatorSignal } from '../lib/types';
import IndicatorHeader from './IndicatorHeader';
import { getConfidenceBorderClass } from '@/app/lib/uiSignalStyles';
import { PanelHelp } from './PanelHelp';

type Props = {
    data: any;
    loading: boolean;
};

export function SMTPanel({ data, loading }: Props) {
    if (loading || !data?.analysis?.smt) {
        return <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-xl h-24"></div>;
    }

    const smt = data.analysis.smt as IndicatorSignal;
    const isActive = smt.score >= 50;
    const borderClass = getConfidenceBorderClass(smt.score);

    return (
        <div className={`rounded-xl bg-white/5 p-3 hover:bg-white/[0.06] transition h-full flex flex-col justify-center ${borderClass}`}>
            <IndicatorHeader title="SMT" signal={smt} />

            <div className="text-[10px] text-zinc-500 leading-tight flex flex-col gap-1">
                {smt.isStrong && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white bg-blue-600 px-1.5 rounded-sm">STRONG EVENT</span>
                        {smt.gate?.isActive && (
                            <span className="text-amber-500 font-mono">
                                TTL: {smt.gate.remainingMin}m
                            </span>
                        )}
                    </div>
                )}

                {smt.gate?.isActive ? (
                    <span className="text-red-400 font-medium">
                        ⛔ Gate: Blocks {smt.gate.blocksDirection}S
                    </span>
                ) : (
                    smt.debug?.factors && smt.debug.factors.length > 0 ? (
                        <span className={isActive ? 'text-zinc-300' : 'text-zinc-500'}>
                            {smt.debug.factors[0]}
                        </span>
                    ) : (
                        <span>{smt.hint}</span>
                    )
                )}

                <div className="mt-1 pt-1 border-t border-white/5 text-[9px] text-zinc-600 italic">
                    Feed is delayed (Yahoo). SMT may appear late.
                </div>
            </div>
            <PanelHelp title="SMT">
                <ul className="list-disc pl-5 space-y-1">
                    <li><b>SMT</b>: Smart Money Tool (Divergence).</li>
                    <li><b>Strong Event</b>: High confidence signal.</li>
                    <li><b>Gate</b>: Blocks trades against SMT direction.</li>
                </ul>
            </PanelHelp>
        </div>
    );
}
