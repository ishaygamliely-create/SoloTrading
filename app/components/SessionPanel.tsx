'use client';
import React from 'react';
import type { IndicatorSignal } from '@/app/lib/types';
import IndicatorHeader from './IndicatorHeader';
import { getConfidenceBorderClass } from '@/app/lib/uiSignalStyles';
import { PanelHelp } from './PanelHelp';

export function SessionPanel({ session }: { session: IndicatorSignal | undefined }) {
    if (!session) {
        return (
            <div className="rounded-xl bg-white/5 p-3 h-full flex flex-col justify-center border border-white/5">
                <div className="text-zinc-500 text-xs text-center">Session Info Unavailable</div>
            </div>
        );
    }

    const borderClass = getConfidenceBorderClass(session.score);
    const flags = (session.debug as any)?.flags || {};

    return (
        <div className={`rounded-xl bg-white/5 p-3 hover:bg-white/[0.06] transition h-full flex flex-col justify-between ${borderClass}`}>
            <IndicatorHeader title="SESSION" signal={session} />

            <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center bg-white/5 p-2 rounded">
                    <span className="text-zinc-400 text-[10px] uppercase font-bold">Current Time</span>
                    <span className="text-white font-mono text-xs font-bold">{flags.nyTime || '--:--'}</span>
                </div>

                <div className="text-[10px] text-zinc-500 leading-tight italic pt-1 text-center">
                    {session.hint}
                </div>
            </div>

            <PanelHelp title="SESSION">
                <ul className="list-disc pl-5 space-y-1">
                    <li><b>State</b>: Current market session (Asia/London/NY).</li>
                    <li><b>Focus</b>: Volatility expectations.</li>
                    <li><b>London KZ</b>: 02:00-05:00 NY.</li>
                    <li><b>NY KZ</b>: 07:00-10:00 NY.</li>
                </ul>
            </PanelHelp>
        </div>
    );
}
