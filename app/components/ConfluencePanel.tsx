'use client';

import React from 'react';
import { Target, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { PanelProps } from './DashboardPanels';

export function ConfluencePanel({ data, loading }: PanelProps) {
    if (loading || !data?.analysis) return <div className="animate-pulse bg-zinc-900 h-48 rounded-xl border border-zinc-800"></div>;

    const { timeContext, pdRanges, ictStructure, sweeps, tre, psps, smt } = data.analysis;
    const currentPrice = data.quotes[data.quotes.length - 1].close;

    // Calculate Score
    let score = 0;
    const factors: { label: string, type: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' }[] = [];

    // 1. Time
    if (timeContext?.isLondonKZ || timeContext?.isNYKZ) {
        score += 2;
        factors.push({ label: 'Kill Zone Active', type: 'POSITIVE' });
    } else {
        factors.push({ label: 'Off-Hours', type: 'NEUTRAL' });
    }

    // 2. PD Range
    if (pdRanges?.position === 'DISCOUNT') {
        const bias = 'LONG'; // Assume discount favors long?
        score += 1;
        factors.push({ label: 'In Discount', type: 'NEUTRAL' });
    } else if (pdRanges?.position === 'PREMIUM') {
        score += 1;
        factors.push({ label: 'In Premium', type: 'NEUTRAL' });
    } else {
        factors.push({ label: 'Equilibrium', type: 'NEUTRAL' });
    }

    // 3. Sweeps
    if (sweeps && sweeps.length > 0) {
        const lastSweep = sweeps[sweeps.length - 1];
        if (lastSweep.reclaimed) {
            score += 2.5;
            factors.push({ label: `Reclaimed ${lastSweep.level}`, type: 'POSITIVE' });
        } else {
            factors.push({ label: `${lastSweep.level} Swept (Pending)`, type: 'NEUTRAL' });
        }
    }

    // 4. Structure & PSP
    if (psps && psps.length > 0) {
        score += 1.5;
        factors.push({ label: `${psps.length} Active PSPs`, type: 'POSITIVE' });
    }

    // 5. Structure
    const nearbyOB = ictStructure?.find((b: any) => Math.abs(currentPrice - b.price) / currentPrice < 0.002);
    if (nearbyOB) {
        score += 2;
        factors.push({ label: `At ${nearbyOB.tf} ${nearbyOB.type === 'ORDER_BLOCK' ? 'OB' : 'Breaker'}`, type: 'POSITIVE' });
    }

    // 6. SMT
    const hasSMT = smt && smt.some((s: any) => s.type !== 'NONE');
    if (hasSMT) {
        score += 2;
        factors.push({ label: 'SMT Divergence', type: 'POSITIVE' });
    }

    // Cap Score
    score = Math.min(10, score);

    let tier = 'LOW';
    let color = 'text-zinc-500';
    if (score >= 7) { tier = 'HIGH'; color = 'text-green-400'; }
    else if (score >= 4) { tier = 'MEDIUM'; color = 'text-yellow-400'; }

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden h-full flex flex-col min-h-[200px]">
            {/* Header */}
            <div className="bg-gradient-to-r from-zinc-900 to-zinc-950 border-b border-zinc-800 p-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Target size={14} className="text-pink-400" />
                    <h3 className="text-zinc-200 font-bold text-sm">Confluence Engine</h3>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-sm font-black ${color}`}>{score.toFixed(1)}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${tier === 'HIGH' ? 'bg-green-900/20 border-green-900/50 text-green-400' :
                            tier === 'MEDIUM' ? 'bg-yellow-900/20 border-yellow-900/50 text-yellow-400' :
                                'bg-zinc-800 border-zinc-700 text-zinc-500'
                        }`}>{tier}</span>
                </div>
            </div>

            <div className="p-3 flex-1 overflow-y-auto hide-scrollbar space-y-2">
                {factors.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                        {f.type === 'POSITIVE' ? <CheckCircle2 size={12} className="text-green-500" /> :
                            f.type === 'NEGATIVE' ? <XCircle size={12} className="text-red-500" /> :
                                <AlertTriangle size={12} className="text-zinc-600" />}
                        <span className={f.type === 'POSITIVE' ? 'text-zinc-200 font-medium' : 'text-zinc-500'}>
                            {f.label}
                        </span>
                    </div>
                ))}

                {factors.length === 0 && (
                    <span className="text-[10px] text-zinc-600 block text-center mt-4">No active signals</span>
                )}
            </div>
        </div>
    );
}
