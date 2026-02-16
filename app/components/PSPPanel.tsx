import React from 'react';
import { PanelProps } from './DashboardPanels';
import { Check, X, AlertTriangle, Clock } from 'lucide-react';
import { PSPResult } from '@/app/lib/psp';
import { getConfidenceColorClass, getDirectionBadgeClass } from '@/app/lib/uiSignalStyles';
import { PanelHelp } from './PanelHelp';

export function PSPPanel({ data, loading }: PanelProps) {
    if (loading) return <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-xl h-[120px]"></div>;

    const psp = data?.analysis?.psp as PSPResult;
    if (!psp) return null;

    const bias = data?.analysis?.bias;

    // --- State & Colors ---
    const isConfirmed = psp.state === 'CONFIRMED';
    const isForming = psp.state === 'FORMING';
    const isNone = psp.state === 'NONE';

    // Confidence Styling
    const scoreStyle = getConfidenceColorClass(psp.score);
    const directionBadge = getDirectionBadgeClass({
        direction: psp.direction,
        score: psp.score,
        status: isConfirmed ? 'OK' : 'WARN'
    });

    // Border Glow for Confirmed
    const containerClass = isConfirmed
        ? `rounded-2xl bg-white/5 p-3 flex flex-col gap-2 min-h-[100px] justify-center transition-all duration-300 border ${scoreStyle.border} shadow-[0_0_15px_rgba(16,185,129,0.05)]`
        : "rounded-2xl bg-white/5 p-3 flex flex-col gap-2 min-h-[100px] justify-center transition-all border border-white/5";

    // --- Progress Bar Logic ---
    const steps = [
        { key: 'sweep', label: 'Sweep', done: psp.checklist.sweep },
        { key: 'displacement', label: 'Disp', done: psp.checklist.displacement },
        { key: 'pullback', label: 'Pull', done: psp.checklist.pullback },
        { key: 'continuation', label: 'Cont', done: psp.checklist.continuation },
    ];

    // Determine "Current" step for yellow highlighting
    // The first UNDONE step is current IF the previous one is DONE.
    // If all done, none is "current" (all green).
    let currentStepIndex = -1;
    if (!psp.checklist.sweep) currentStepIndex = 0;
    else if (!psp.checklist.displacement) currentStepIndex = 1;
    else if (!psp.checklist.pullback) currentStepIndex = 2;
    else if (!psp.checklist.continuation) currentStepIndex = 3;

    // --- TTL Logic ---
    const now = Date.now();
    const expiresAt = psp.meta?.expiresAtMs || 0;
    const remainingMs = expiresAt - now;
    const remainingMin = Math.max(0, Math.floor(remainingMs / 60000));
    const isFresh = remainingMin > 30;

    // --- Conflict Logic ---
    const isConflict = bias && bias.direction !== 'NEUTRAL' && psp.direction !== 'NEUTRAL' && bias.direction !== psp.direction;

    return (
        <div className={containerClass}>
            {/* 1. Header: PSP | STATE | DIRECTION | SCORE */}
            <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-1">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-yellow-500 tracking-wider">PSP</span>
                    <div className="h-3 w-px bg-white/10"></div>
                    <span className={`text-xs font-bold tracking-wide ${isConfirmed ? 'text-emerald-400' : isForming ? 'text-yellow-400' : 'text-zinc-500'}`}>
                        {psp.state}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {/* Direction Badge */}
                    {psp.direction !== 'NEUTRAL' && (
                        <span className={directionBadge}>
                            {psp.direction}
                        </span>
                    )}

                    {/* Score */}
                    <span className={`text-xs font-bold font-mono ${scoreStyle.text}`}>
                        {Math.round(psp.score)}%
                    </span>
                </div>
            </div>

            {/* 2. Progress Bar */}
            <div className="flex gap-1 h-1.5 w-full mt-1">
                {steps.map((step, idx) => {
                    let color = 'bg-white/10'; // Default pending
                    if (step.done) color = 'bg-emerald-500';
                    else if (idx === currentStepIndex && !isNone) color = 'bg-yellow-500 animate-pulse';

                    return (
                        <div key={step.key} className={`flex-1 rounded-full ${color}`}></div>
                    );
                })}
            </div>

            {/* 3. Compact Checklist */}
            <div className="flex justify-between px-1">
                {steps.map((step) => (
                    <div key={step.key} className={`flex items-center gap-1 text-[9px] uppercase font-bold ${step.done ? 'text-emerald-400' : 'text-zinc-600'}`}>
                        {step.done ? <Check size={8} strokeWidth={3} /> : <div className="w-2 h-2 rounded-full border border-zinc-700"></div>}
                        {step.label}
                    </div>
                ))}
            </div>

            {/* 4. Playbook Sentence */}
            <div className="text-[10px] text-zinc-400 italic px-1 mt-1 leading-tight">
                {isNone && "Waiting for liquidity sweep at key swing."}
                {isForming && "Sweep detected. Watching for displacement & pullback."}
                {isConfirmed && <span className="text-emerald-300">Confirmed PSP. Prefer entries in zone; invalidate beyond sweep.</span>}
            </div>

            {/* 5. Boxed Levels (Confirmed Only) */}
            {isConfirmed && psp.levels && (
                <div className="mt-2 bg-white/5 border border-white/10 rounded overflow-hidden">
                    <div className="flex items-stretch text-[10px]">
                        <div className="flex-1 p-1.5 border-r border-white/5">
                            <div className="text-zinc-500 uppercase text-[9px] font-bold">Entry Zone</div>
                            <div className="font-mono text-emerald-300 font-bold">
                                {Math.round(psp.levels.entryLow)} - {Math.round(psp.levels.entryHigh)}
                            </div>
                        </div>
                        <div className="flex-1 p-1.5">
                            <div className="text-zinc-500 uppercase text-[9px] font-bold hover:text-red-400 transition-colors cursor-help" title="Stop Loss">Invalidation</div>
                            <div className="font-mono text-red-400 font-bold">
                                {Math.round(psp.levels.invalidation)}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 6. Meta: TTL & Conflict */}
            {(remainingMin > 0 || isConflict) && (
                <div className="flex items-center justify-between mt-1 px-1">
                    {/* TTL */}
                    {remainingMin > 0 && (
                        <div className={`flex items-center gap-1 text-[9px] ${isFresh ? 'text-zinc-400' : 'text-zinc-600'}`}>
                            <Clock size={9} />
                            <span>Fresh: {remainingMin}m</span>
                        </div>
                    )}

                    {/* Conflict */}
                    {isConflict && (
                        <div className="flex items-center gap-1 text-[9px] text-yellow-500/80">
                            <AlertTriangle size={9} />
                            <span>Against HTF Bias</span>
                        </div>
                    )}
                </div>
            )}

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
