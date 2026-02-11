'use client';

import React from 'react';
import { PanelProps } from './DashboardPanels';
import { Crosshair, Check, X, AlertCircle } from 'lucide-react';
import { PSPResult } from '@/app/lib/psp';
import IndicatorHeader from './IndicatorHeader';

export function PSPPanel({ data, loading }: PanelProps) {
    if (loading) return <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-xl h-[120px]"></div>;

    const psp: PSPResult = data?.analysis?.psp || {
        state: 'NONE',
        direction: 'NEUTRAL',
        score: 0,
        reasons: [],
        missing: ['Waiting for data'],
        checkmarks: { sweep: false, displacement: false, pullback: false, continuation: false }
    };

    const isConfirmed = psp.state === 'CONFIRMED';
    const isForming = psp.state === 'FORMING';

    // Adapt PSP result to IndicatorSignal for header
    const pspSignal = {
        ...psp,
        status: isConfirmed ? 'OK' : isForming ? 'WARN' : 'OFF'
    } as any;

    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 hover:bg-white/[0.06] transition flex flex-col gap-2 min-h-[100px] justify-center">
            <IndicatorHeader
                title="PSP"
                signal={pspSignal}
                rightBadgeText={psp.state !== 'NONE' ? psp.state : undefined}
            />

            {/* Row 2: Checklist & Missing Info */}
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3 text-[10px] uppercase font-bold text-zinc-500">
                    <span className={`flex items-center gap-0.5 ${psp.checkmarks?.sweep ? 'text-green-400' : ''}`}>
                        {psp.checkmarks?.sweep ? <Check size={10} /> : <X size={10} />} Sweep
                    </span>
                    <span className={`flex items-center gap-0.5 ${psp.checkmarks?.displacement ? 'text-green-400' : ''}`}>
                        {psp.checkmarks?.displacement ? <Check size={10} /> : <X size={10} />} Disp
                    </span>
                    <span className={`flex items-center gap-0.5 ${psp.checkmarks?.pullback ? 'text-green-400' : ''}`}>
                        {psp.checkmarks?.pullback ? <Check size={10} /> : <X size={10} />} Pullback
                    </span>
                    <span className={`flex items-center gap-0.5 ${psp.checkmarks?.continuation ? 'text-green-400' : ''}`}>
                        {psp.checkmarks?.continuation ? <Check size={10} /> : <X size={10} />} Cont
                    </span>
                </div>

                {/* Missing Items or Levels */}
                <div className="min-h-[1.5em]">
                    {isConfirmed && psp.levels ? (
                        <div className="flex gap-4 text-[10px] font-mono">
                            <span className="text-zinc-400">Entry: <span className="text-green-300">{psp.levels.entryZoneLow?.toFixed(2)} - {psp.levels.entryZoneHigh?.toFixed(2)}</span></span>
                            <span className="text-zinc-400">Inv: <span className="text-red-300">{psp.levels.invalidate?.toFixed(2)}</span></span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 text-[10px] text-zinc-500 italic">
                            {psp.missing && psp.missing.length > 0 ? (
                                <>
                                    <AlertCircle size={10} />
                                    <span>Waiting for: {psp.missing[0]}{psp.missing[1] ? `, ${psp.missing[1]}` : ''}</span>
                                </>
                            ) : <span>Scanning market structure...</span>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
