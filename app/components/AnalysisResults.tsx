'use client';

import React from 'react';
import { ChartAnalysisResult } from '@/app/types/chart-analysis';
import { CheckCircle2, AlertCircle, HelpCircle, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export function AnalysisResults({ data }: { data: ChartAnalysisResult }) {
    const isLong = data.bias === 'LONG_LEANING';
    const isShort = data.bias === 'SHORT_LEANING';

    return (
        <div className="space-y-6 h-full overflow-y-auto pr-2">

            {/* Indicators Table (Prioritized Top) */}
            <div>
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">Indicators Evidence</h3>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-zinc-950 text-zinc-500">
                            <tr>
                                <th className="p-3 font-medium">Indicator</th>
                                <th className="p-3 font-medium">Status</th>
                                <th className="p-3 font-medium">Evidence</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {(data.indicators || []).map((ind, i) => {
                                const isDetected = ind.status === 'DETECTED';
                                const isAvail = ind.status !== 'NOT_AVAILABLE';

                                return (
                                    <tr key={i} className="hover:bg-zinc-800/50 transition-colors">
                                        <td className="p-3 font-bold text-zinc-300">
                                            {ind.category.replace('_', ' ')}
                                        </td>
                                        <td className="p-3">
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide border
                                                ${ind.status === 'DETECTED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                    ind.status === 'NOT_DETECTED' ? 'bg-zinc-800 text-zinc-400 border-zinc-700' :
                                                        'bg-zinc-900 text-zinc-600 border-zinc-800 border-dashed'}`}>
                                                {ind.status === 'DETECTED' && <CheckCircle2 size={10} />}
                                                {ind.status === 'NOT_DETECTED' && <AlertCircle size={10} />}
                                                {ind.status === 'NOT_AVAILABLE' && <HelpCircle size={10} />}
                                                {ind.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="p-3 text-zinc-400 italic">
                                            {ind.evidence_note}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Bias Card */}
            <div className={`p-6 rounded-2xl border ${isLong ? 'bg-emerald-950/20 border-emerald-500/30' : isShort ? 'bg-red-950/20 border-red-500/30' : 'bg-zinc-900 border-zinc-700'}`}>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-sm text-zinc-400 font-bold uppercase tracking-wider">Directional Bias</h2>
                        <div className={`text-3xl font-black flex items-center gap-2 ${isLong ? 'text-emerald-400' : isShort ? 'text-red-400' : 'text-zinc-400'}`}>
                            {isLong && <TrendingUp size={32} />}
                            {isShort && <TrendingDown size={32} />}
                            {!isLong && !isShort && <Minus size={32} />}
                            {data.bias.replace('_', ' ')}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-4xl font-black text-white">{data.confidence_score}<span className="text-sm text-zinc-500">%</span></div>
                        <div className="text-xs text-zinc-500 font-bold uppercase">Confidence</div>
                    </div>
                </div>

                <div className="space-y-2">
                    {(data.reasons || []).map((reason, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm text-zinc-300">
                            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-zinc-500 flex-shrink-0" />
                            {reason}
                        </div>
                    ))}
                </div>
            </div>

            {/* Limitations */}
            {data.limitations.length > 0 && (
                <div className="bg-orange-950/10 border border-orange-500/20 p-4 rounded-xl">
                    <h3 className="flex items-center gap-2 text-xs font-black text-orange-400 uppercase tracking-wider mb-2">
                        <AlertTriangle size={12} /> Limitations
                    </h3>
                    <ul className="space-y-1">
                        {(data.limitations || []).map((lim, i) => (
                            <li key={i} className="text-xs text-orange-200/70 list-disc list-inside">
                                {lim}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
