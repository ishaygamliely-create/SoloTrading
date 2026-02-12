import React from 'react';
import { PanelProps } from './DashboardPanels';
import { Crosshair, Check, X, AlertCircle } from 'lucide-react';
import { PSPResult } from '@/app/lib/psp';
import IndicatorHeader from './IndicatorHeader';
import { getConfidenceBorderClass } from '@/app/lib/uiSignalStyles';

export function PSPPanel({ data, loading }: PanelProps) {
    if (loading) return <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-xl h-[120px]"></div>;

    const psp = data?.analysis?.psp as PSPResult;
    if (!psp) return null;

    const isConfirmed = psp.state === 'CONFIRMED';
    const isForming = psp.state === 'FORMING';

    // Adapt PSP result to IndicatorSignal for header
    const pspSignal = {
        ...psp,
        status: isConfirmed ? 'OK' : isForming ? 'WARN' : 'OFF'
    } as any;

    const borderClass = getConfidenceBorderClass(pspSignal.score);

    return (
        <div className={`rounded-2xl bg-white/5 p-3 hover:bg-white/[0.06] transition flex flex-col gap-2 min-h-[100px] justify-center ${borderClass}`}>
            <IndicatorHeader
                title="PSP"
                signal={pspSignal}
                rightBadgeText={psp.state !== 'NONE' ? psp.state : undefined}
            />

            {/* Row 2: Checklist & Missing Info */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-zinc-500 bg-black/20 p-1.5 rounded-lg justify-between">
                    <span className={`flex items-center gap-0.5 ${psp.checkmarks?.sweep ? 'text-green-400' : 'text-zinc-600'}`}>
                        {psp.checkmarks?.sweep ? <Check size={10} strokeWidth={3} /> : <X size={10} />} Sweep
                    </span>
                    <span className={`flex items-center gap-0.5 ${psp.checkmarks?.displacement ? 'text-green-400' : 'text-zinc-600'}`}>
                        {psp.checkmarks?.displacement ? <Check size={10} strokeWidth={3} /> : <X size={10} />} Disp
                    </span>
                    <span className={`flex items-center gap-0.5 ${psp.checkmarks?.pullback ? 'text-green-400' : 'text-zinc-600'}`}>
                        {psp.checkmarks?.pullback ? <Check size={10} strokeWidth={3} /> : <X size={10} />} Pullback
                    </span>
                    <span className={`flex items-center gap-0.5 ${psp.checkmarks?.continuation ? 'text-green-400' : 'text-zinc-600'}`}>
                        {psp.checkmarks?.continuation ? <Check size={10} strokeWidth={3} /> : <X size={10} />} Cont
                    </span>
                </div>

                {/* Missing Items or Levels */}
                <div className="min-h-[1.5em]">
                    {isConfirmed && psp.levels ? (
                        <div className="flex justify-between items-center text-[10px] font-mono bg-emerald-900/10 border border-emerald-500/20 p-1.5 rounded">
                            <span className="text-zinc-400">Entry: <span className="text-emerald-300 font-bold">{psp.levels.entryZoneLow?.toFixed(2)} - {psp.levels.entryZoneHigh?.toFixed(2)}</span></span>
                            <span className="text-zinc-400 pl-2 border-l border-zinc-700">Inv: <span className="text-red-400 font-bold">{psp.levels.invalidate?.toFixed(2)}</span></span>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1">
                            {psp.missing && psp.missing.length > 0 ? (
                                <div className="flex items-start gap-1 text-[10px] text-zinc-500 italic px-1">
                                    <AlertCircle size={10} className="mt-0.5" />
                                    <span>Waiting for: {psp.missing[0]}</span>
                                </div>
                            ) : <span className="text-[10px] text-zinc-600 px-1">Structure scanning...</span>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
