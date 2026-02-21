import { getConfidenceColorClass } from "@/app/lib/uiSignalStyles";
import IndicatorHeader, { IndicatorSignal } from "./IndicatorHeader";
import { Hexagon, Zap, ShieldAlert, Cpu } from "lucide-react";
import { PanelHelp } from "./PanelHelp";

type ConfluenceLevel = "NO_TRADE" | "WEAK" | "GOOD" | "STRONG";
type ConfluenceSuggestion = "LONG" | "SHORT" | "NO_TRADE";
type ConfluenceStatus = "OK" | "WARN" | "BLOCKED" | "OFF" | "ERROR";

export type ConfluenceResult = {
    scorePct: number;          // 0–100
    level: ConfluenceLevel;
    suggestion: ConfluenceSuggestion;
    status: ConfluenceStatus;
    factors?: string[];
};

export default function ConfluencePanel({ data }: { data?: ConfluenceResult | null }) {
    if (!data) return null;

    const score = Math.max(0, Math.min(100, Math.round(data.scorePct ?? 0)));
    const conf = getConfidenceColorClass(score);

    // Map to Standard Signal
    const signal: IndicatorSignal = {
        status: data.status === "BLOCKED" ? "WARN" : (data.status as any),
        direction: data.suggestion === "NO_TRADE" ? "NEUTRAL" : data.suggestion,
        score: score,
        hint: "",
        debug: {}
    };

    const drivers = (data.factors ?? []).slice(0, 4);
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    return (
        <div className={`rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col h-full relative overflow-hidden group min-h-[300px] ${conf.border}`}>
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-pink-500/10 rounded-lg border border-pink-500/20">
                        <Cpu size={14} className="text-pink-400" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-pink-400 uppercase tracking-widest leading-none">Decision Engine</span>
                        <span className="text-[9px] text-zinc-500 font-bold uppercase mt-0.5">Confluence Matrix</span>
                    </div>
                </div>
                <div className="flex items-center gap-1 bg-pink-500/10 px-2 py-0.5 rounded border border-pink-500/20">
                    <Hexagon size={10} className="text-pink-400" />
                    <span className="text-[9px] font-black text-pink-300 uppercase tracking-tighter">
                        {data.level === "STRONG" ? "CONVERGENT" : data.level === "GOOD" ? "STABLE" : "DIVERGENT"}
                    </span>
                </div>
            </div>

            {/* Core Visualization: Radial Score */}
            <div className="flex items-center justify-center py-6 relative z-10">
                <div className="relative w-32 h-32 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90">
                        <circle
                            cx="64"
                            cy="64"
                            r={radius}
                            fill="transparent"
                            stroke="currentColor"
                            strokeWidth="8"
                            className="text-white/5"
                        />
                        <circle
                            cx="64"
                            cy="64"
                            r={radius}
                            fill="transparent"
                            stroke="currentColor"
                            strokeWidth="8"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            strokeLinecap="round"
                            className={`${conf.text} transition-all duration-[1500ms] ease-out`}
                        />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                        <span className={`text-3xl font-black tabular-nums transition-colors duration-500 ${conf.text}`}>
                            {score}%
                        </span>
                        <span className="text-[8px] font-black text-white/30 uppercase tracking-widest mt-[-2px]">Confidence</span>
                    </div>
                </div>
            </div>

            {/* Verdict HUD */}
            <div className="bg-black/40 rounded-lg p-3 border border-white/5 mb-4 relative z-10">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Global Verdict</span>
                    <span className={`text-[10px] font-black uppercase ${signal.direction === 'LONG' ? 'text-emerald-400' : signal.direction === 'SHORT' ? 'text-red-400' : 'text-zinc-500'}`}>
                        {signal.direction === 'NEUTRAL' ? 'STAND ASIDE' : signal.direction === 'LONG' ? 'HIGH PROB BUY' : 'HIGH PROB SELL'}
                    </span>
                </div>

                <div className="space-y-1.5">
                    {drivers.map((d, i) => (
                        <div key={i} className="flex items-center justify-between text-[10px]">
                            <div className="flex items-center gap-2">
                                <div className={`w-1 h-1 rounded-full ${d.includes('+') ? 'bg-emerald-500' : d.includes('-') ? 'bg-red-500' : 'bg-zinc-500'}`} />
                                <span className="text-zinc-400 font-medium">{d.replace(/^[+-]\d+\s*/, '')}</span>
                            </div>
                            <span className={`font-mono font-bold ${d.includes('+') ? 'text-emerald-400' : 'text-red-400'}`}>
                                {d.match(/^[+-]\d+/) ? d.match(/^[+-]\d+/)?.[0] : ''}
                            </span>
                        </div>
                    ))}
                    {drivers.length === 0 && (
                        <div className="text-[10px] text-zinc-600 italic text-center py-1">Analyzing confluence factors...</div>
                    )}
                </div>
            </div>

            {/* Safety Lock */}
            {data.status === "BLOCKED" && (
                <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded p-2 flex items-center gap-2 animate-pulse">
                    <ShieldAlert size={14} className="text-red-400" />
                    <span className="text-[9px] font-black text-red-200 uppercase tracking-wide">Signal Blocked: Contrarian Risk</span>
                </div>
            )}

            {/* Help / Meta */}
            <div className="mt-auto pt-3 border-t border-white/5 relative z-10">
                <PanelHelp title="התכנסות (Confluence)" bullets={[
                    "השקלול הסופי: מאחד את כל מערכות הניתוח לכדי המלצה אחת.",
                    "ציון (Score): רמת הביטחון הכללית בעסקה (0-100%).",
                    "דירוג: Strong (התכנסות מלאה), Stable (סביר), Divergent (ניגודיות).",
                    "גורמים: השפעה יחסית של Bias, מבנה, ואזורי ערך על ההחלטה.",
                    "חסימה (Blocked): מונע עסקאות נגד נטיות HTF אגרסיביות.",
                ]} />
            </div>
        </div>
    );
}
