'use client';

import { CheckCircle2, AlertTriangle, XCircle, PlayCircle, Loader2 } from 'lucide-react';

interface TradeOptionPanelProps {
    data: any;
    loading: boolean;
}

export function TradeOptionPanel({ data, loading }: TradeOptionPanelProps) {
    if (loading) {
        return (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-center h-24">
                <Loader2 className="animate-spin text-zinc-500" />
            </div>
        );
    }

    if (!data || !data.analysis) {
        return null;
    }

    const { confluence, psp, liquidityRange } = data.analysis;

    // --- DETERMINISTIC TRADE LOGIC ---
    // 1. CONFIRMED: Confluence > 60 AND PSP Confirmed
    // 2. POTENTIAL: Confluence > 50 OR PSP Forming
    // 3. WAIT: Default

    const confluenceScore = confluence?.score || 0;
    const pspState = psp?.state || 'NONE';
    const liquidityStatus = liquidityRange?.status || 'UNKNOWN';

    let status: 'TRADE' | 'POTENTIAL' | 'WAIT' = 'WAIT';
    let color = 'bg-zinc-800 text-zinc-400';
    let icon = <XCircle size={24} />;
    let reasons: string[] = [];

    if (confluenceScore >= 60 && pspState === 'CONFIRMED') {
        status = 'TRADE';
        color = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
        icon = <CheckCircle2 size={24} className="text-emerald-500" />;
        reasons.push('High Confluence');
        reasons.push('PSP Confirmed');
    } else if (confluenceScore >= 50 || pspState === 'FORMING' || (liquidityStatus === 'EXPANDING' && confluenceScore > 40)) {
        status = 'POTENTIAL';
        color = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
        icon = <AlertTriangle size={24} className="text-yellow-500" />;
        if (confluenceScore >= 50) reasons.push('Moderate Confluence');
        if (pspState === 'FORMING') reasons.push('PSP Forming');
        if (liquidityStatus === 'EXPANDING') reasons.push('Liquidity Expansion');
    } else {
        // WAIT Logic reasons
        color = 'bg-zinc-800/50 text-zinc-400 border-zinc-700';
        icon = <PlayCircle size={24} className="text-zinc-500" />;
        if (confluenceScore < 50) reasons.push('Low Confluence');
        if (pspState === 'NONE') reasons.push('No PSP Structure');
    }

    return (
        <div className={`border rounded-xl p-4 ${color} transition-all`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    {icon}
                    <div>
                        <div className="text-xs font-bold uppercase tracking-wider opacity-70">Decision</div>
                        <div className="text-xl font-bold">{status === 'TRADE' ? 'EXECUTE' : status}</div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-black opacity-30">{confluenceScore}%</div>
                </div>
            </div>

            <div className="space-y-1">
                {reasons.length > 0 ? (
                    reasons.map((r, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs font-medium opacity-80">
                            <div className="w-1 h-1 rounded-full bg-current" />
                            {r}
                        </div>
                    ))
                ) : (
                    <div className="text-xs opacity-50 italic">Market is quiet...</div>
                )}
            </div>
        </div>
    );
}
