import React from 'react';
import { PanelProps } from './DashboardPanels';
import { Check, X, AlertTriangle, Clock } from 'lucide-react';
import { PSPResult } from '@/app/lib/psp';
import { getConfidenceColorClass, getDirectionBadgeClass, getStatusFromScore, getStatusBadgeClass, type IndicatorStatus } from '@/app/lib/uiSignalStyles';
import { PanelHelp } from './PanelHelp';

export function PSPPanel({ data, loading }: PanelProps) {
    if (loading) return <div className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-xl h-[120px]"></div>;

    const psp = data?.analysis?.psp as PSPResult;
    if (!psp) return null; // If no data, don't render (Rule 5)

    // --- Standard Colors ---
    // Score Color (Global Law: 0-59 Red, 60-74 Yellow, 75+ Green)
    const scoreStyle = getConfidenceColorClass(psp.score);

    // Direction Color (Green/Red/Gray)
    const directionClass = psp.direction === 'LONG'
        ? "text-emerald-400"
        : psp.direction === 'SHORT'
            ? "text-red-400"
            : "text-zinc-500";

    // Global Status Law: derive from score (PSP doesn't have ERROR status)
    const computedStatus: IndicatorStatus = psp.status === "OFF"
        ? "OFF"
        : getStatusFromScore(psp.score);

    const statusBadgeClass = getStatusBadgeClass(computedStatus);

    // --- Progress Bar ---
    const steps = [
        { key: 'sweep', label: 'Sweep', done: psp.checklist.sweep },
        { key: 'displacement', label: 'Disp', done: psp.checklist.displacement },
        { key: 'pullback', label: 'Pull', done: psp.checklist.pullback },
        { key: 'continuation', label: 'Cont', done: psp.checklist.continuation },
    ];

    // --- TTL Logic ---
    const now = Date.now();
    const expiresAt = psp.meta?.expiresAtMs || 0;
    const remainingMs = expiresAt - now;
    const remainingMin = Math.max(0, Math.floor(remainingMs / 60000));

    return (
        <div className={`rounded-xl border border-white/10 bg-white/5 p-4 space-y-3 ${scoreStyle.border}`}>
            {/* 1. Header: TITLE | Direction | Status | Score */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-yellow-500 tracking-wide">PSP</span>
                    <div className="h-4 w-px bg-white/10" />
                    <span className={`text-xs font-bold uppercase ${directionClass}`}>
                        {psp.direction}
                    </span>
                    <div className="h-4 w-px bg-white/10" />
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${statusBadgeClass}`}>
                        {computedStatus}
                    </span>
                </div>
                <div className={`text-xl font-bold ${scoreStyle.text}`}>
                    {Math.round(psp.score)}%
                </div>
            </div>

            {/* 2. Hint / Description */}
            <div className="text-xs text-white/70 italic">
                {psp.hint}
            </div>

            {/* 3. Progress Bar */}
            <div className="space-y-1">
                <div className="flex gap-1 h-1.5 w-full">
                    {steps.map((step) => (
                        <div key={step.key} className={`flex-1 rounded-full ${step.done ? 'bg-emerald-500' : 'bg-white/10'}`} />
                    ))}
                </div>
                <div className="flex justify-between px-1">
                    {steps.map((step) => (
                        <span key={step.key} className={`text-[9px] uppercase font-bold ${step.done ? 'text-emerald-400' : 'text-zinc-600'}`}>
                            {step.label}
                        </span>
                    ))}
                </div>
            </div>

            {/* 4. Confirmed Levels */}
            {psp.state === 'CONFIRMED' && psp.levels && (
                <div className="bg-black/20 rounded p-2 border border-white/5 flex justify-between items-center">
                    <div>
                        <div className="text-[9px] uppercase text-zinc-500 font-bold">Entry</div>
                        <div className="text-xs font-mono text-emerald-300">
                            {Math.round(psp.levels.entryLow)} - {Math.round(psp.levels.entryHigh)}
                        </div>
                    </div>
                    <div>
                        <div className="text-[9px] uppercase text-zinc-500 font-bold text-right">Invalidation</div>
                        <div className="text-xs font-mono text-red-400 text-right">
                            {Math.round(psp.levels.invalidation)}
                        </div>
                    </div>
                </div>
            )}

            {/* 5. Help Toggle */}
            <div className="pt-2 border-t border-white/5">
                <PanelHelp title="PSP" bullets={[
                    "What PSP checks: 15m Fractal Swings.",
                    "Steps: Sweep -> Displacement -> Pullback -> Continuation.",
                    "Score reflects setup completeness and quality.",
                    "Direction: LONG (Green) / SHORT (Red)."
                ]} />
            </div>
        </div>
    );
}
