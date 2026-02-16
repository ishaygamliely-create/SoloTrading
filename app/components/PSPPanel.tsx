import React, { useState } from 'react';
import { PanelProps } from './DashboardPanels';
import { Check, X, AlertCircle } from 'lucide-react';
import { PSPResult } from '@/app/lib/psp';
import IndicatorHeader from './IndicatorHeader';
import { getConfidenceBorderClass, getConfidenceColorClass, getConfidenceLabel, clampPct } from '@/app/lib/uiSignalStyles';
import { PanelHelp } from './PanelHelp';

export function PSPPanel({ data, loading }: PanelProps) {
    if (loading) return <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-xl h-[120px]"></div>;

    const psp = data?.analysis?.psp as PSPResult;
    if (!psp) return null;

    const isConfirmed = psp.state === 'CONFIRMED';
    const isForming = psp.state === 'FORMING';
    const scorePct = clampPct(psp.score);
    const scoreStyle = getConfidenceColorClass(scorePct);

    // Adapt PSP result to IndicatorSignal for header (minimal adapter)
    const pspSignal = {
        direction: psp.direction,
        score: psp.score,
        status: isConfirmed ? 'OK' : isForming ? 'WARN' : 'OFF',
        hint: psp.debug?.factors?.[0] || "Scanning structure..."
    } as any;

    const borderClass = getConfidenceBorderClass(psp.score);

    return (
        <div className={`rounded-2xl bg-white/5 p-3 hover:bg-white/[0.06] transition flex flex-col gap-2 min-h-[100px] justify-center ${borderClass}`}>
            <IndicatorHeader
                title="PSP"
                signal={pspSignal}
                rightBadgeText={psp.state !== 'NONE' ? psp.state : undefined}
            />

            {/* Checklist */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-zinc-500 bg-black/20 p-1.5 rounded-lg justify-between">
                    <CheckItem label="Sweep" done={psp.checklist?.sweep} />
                    <CheckItem label="Disp" done={psp.checklist?.displacement} />
                    <CheckItem label="Pull" done={psp.checklist?.pullback} />
                    <CheckItem label="Cont" done={psp.checklist?.continuation} />
                </div>

                {/* Confirmations / Levels */}
                <div className="min-h-[1.5em]">
                    {isConfirmed && psp.levels ? (
                        <div className="flex justify-between items-center text-[10px] font-mono bg-emerald-900/10 border border-emerald-500/20 p-1.5 rounded">
                            <span className="text-zinc-400">Entry: <span className="text-emerald-300 font-bold">{Math.round(psp.levels.entryLow)} - {Math.round(psp.levels.entryHigh)}</span></span>
                            <span className="text-zinc-400 pl-2 border-l border-zinc-700">Inv: <span className="text-red-400 font-bold">{Math.round(psp.levels.invalidation)}</span></span>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1">
                            {psp.state === 'NONE' ? (
                                <span className="text-[10px] text-zinc-600 px-1 italic">Waiting for sweep at key swing.</span>
                            ) : (
                                <span className="text-[10px] text-zinc-400 px-1 italic">
                                    {psp.debug?.factors?.[psp.debug.factors.length - 1] ?? "Forming..."}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <PanelHelp title="PSP">
                <ul className="list-disc pl-5 space-y-1">
                    <li><b>Sweep</b>: Liquidity grab of Fractal Swing (15m).</li>
                    <li><b>Displacement</b>: Strong impulsive move after sweep.</li>
                    <li><b>Pullback</b>: Return to 50-79% zone relative to impulse.</li>
                    <li><b>Continuation</b>: Break of displacement structure.</li>
                    <li><b>Note</b>: Score Color = Strength. Badge = Direction.</li>
                </ul>
            </PanelHelp>
        </div>
    );
}

function CheckItem({ label, done }: { label: string, done: boolean }) {
    return (
        <span className={`flex items-center gap-0.5 ${done ? 'text-green-400' : 'text-zinc-600'}`}>
            {done ? <Check size={10} strokeWidth={3} /> : <X size={10} />} {label}
        </span>
    );
}
