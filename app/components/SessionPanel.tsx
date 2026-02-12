'use client';
import React from 'react';
import type { IndicatorSignal } from '@/app/lib/types';
import IndicatorHeader from './IndicatorHeader';
import { getConfidenceBorderClass } from '@/app/lib/uiSignalStyles';

export function SessionPanel({ session }: { session: IndicatorSignal | undefined }) {
    if (!session) return <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-xl h-24"></div>;

    const borderClass = getConfidenceBorderClass(session.score);

    return (
        <div className={`rounded-xl bg-white/5 p-3 hover:bg-white/[0.06] transition h-full flex flex-col justify-center ${borderClass}`}>
            <IndicatorHeader title="SESSION" signal={session} />

            <div className="text-[10px] text-zinc-500 leading-tight">
                {session.hint}
            </div>
        </div>
    );
}
