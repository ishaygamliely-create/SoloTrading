import { getConfidenceColorClass } from "@/app/lib/uiSignalStyles";
import IndicatorHeader, { IndicatorSignal } from "./IndicatorHeader";
import { Hexagon, Zap, ShieldAlert, Cpu, Info, X } from "lucide-react";
import { PanelHelp } from "./PanelHelp";
import { useState } from "react";

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
    const [showHelp, setShowHelp] = useState(false);
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
    const radius = 48; // Enlarged from 36
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    return (
        <div className={`rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col h-full relative overflow-hidden group min-h-[360px] ${conf.border}`}>
            {/* Background Glow - Enhanced for premium HUD look */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-pink-500/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity duration-1000" />

            {/* Header */}
            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-pink-500/10 rounded-lg border border-pink-500/20 group-hover:bg-pink-500/20 transition-colors">
                        <Cpu size={14} className="text-pink-400" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-pink-400 uppercase tracking-widest leading-none">Decision Engine</span>
                        <span className="text-[9px] text-zinc-500 font-bold uppercase mt-0.5">Confluence Matrix</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowHelp(true)}
                        className="p-1 bg-white/5 hover:bg-white/10 rounded border border-white/10 text-zinc-400 transition-colors"
                    >
                        <Info size={12} />
                    </button>
                    <div className="flex items-center gap-1 bg-pink-500/10 px-2 py-0.5 rounded border border-pink-500/20">
                        <Hexagon size={10} className="text-pink-400" />
                        <span className="text-[9px] font-black text-pink-300 uppercase tracking-tighter">
                            {score > 70 ? "CONVERGENT" : score > 40 ? "STABLE" : "DIVERGENT"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Core Visualization: Radial Score */}
            <div className="flex items-center justify-center py-6 relative z-10">
                <div className="relative w-40 h-40 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
                        <circle
                            cx="64"
                            cy="64"
                            r={radius}
                            fill="transparent"
                            stroke="currentColor"
                            strokeWidth="10"
                            className="text-white/5"
                        />
                        <circle
                            cx="64"
                            cy="64"
                            r={radius}
                            fill="transparent"
                            stroke="currentColor"
                            strokeWidth="10"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            strokeLinecap="round"
                            className={`${conf.text} transition-all duration-[1500ms] ease-out drop-shadow-[0_0_8px_rgba(244,114,182,0.3)]`}
                        />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                        <span className={`text-4xl font-black tabular-nums transition-colors duration-500 ${conf.text}`}>
                            {score}%
                        </span>
                        <span className="text-[9px] font-black text-white/30 uppercase tracking-widest mt-[-2px]">Confidence</span>
                    </div>
                </div>
            </div>

            {/* Verdict HUD */}
            <div className="bg-black/40 rounded-xl p-3 border border-white/5 mb-4 relative z-10">
                <div className="flex justify-between items-center mb-2.5">
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Global Verdict</span>
                    <span className={`text-[10px] font-black uppercase tracking-wider ${score < 40 ? 'text-zinc-500' : signal.direction === 'LONG' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {score < 40 ? 'STAND ASIDE' : score < 70 ? `${signal.direction} CONFIRMING` : `HIGH PROB ${signal.direction}`}
                    </span>
                </div>

                <div className="space-y-2">
                    {drivers.map((d, i) => {
                        const isPositive = d.includes('+') || (signal.direction === 'LONG' && (d.includes('LONG') || d.includes('BULL'))) || (signal.direction === 'SHORT' && (d.includes('SHORT') || d.includes('BEAR')));
                        const isNegative = d.includes('-') || (signal.direction === 'LONG' && (d.includes('SHORT') || d.includes('BEAR'))) || (signal.direction === 'SHORT' && (d.includes('LONG') || d.includes('BULL')));

                        return (
                            <div key={i} className="flex items-center justify-between text-[10px]">
                                <div className="flex items-center gap-2">
                                    <div className={`w-1 h-1 rounded-full ${isPositive ? 'bg-emerald-500' : isNegative ? 'bg-red-500' : 'bg-zinc-500'}`} />
                                    <span className="text-zinc-400 font-bold uppercase text-[9px] tracking-tight">{d.replace(/^[+-]\d+\s*/, '')}</span>
                                </div>
                                <span className={`font-mono font-black ${isPositive ? 'text-emerald-400' : isNegative ? 'text-red-400' : 'text-zinc-500'}`}>
                                    {d.match(/^[+-]\d+/) ? d.match(/^[+-]\d+/)?.[0] : (isPositive ? '+1' : isNegative ? '-1' : '')}
                                </span>
                            </div>
                        );
                    })}
                    {drivers.length === 0 && (
                        <div className="text-[10px] text-zinc-600 italic text-center py-1 font-bold">Scanning Institutional Data...</div>
                    )}
                </div>
            </div>

            {/* Safety Lock */}
            {data.status === "BLOCKED" && (
                <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl p-2.5 flex items-center gap-2.5 animate-pulse">
                    <ShieldAlert size={14} className="text-red-400" />
                    <span className="text-[9px] font-black text-red-200 uppercase tracking-widest">Signal Blocked: Contrarian Risk</span>
                </div>
            )}

            {/* Overlay Hebrew Help Section */}
            {showHelp && (
                <div className="absolute inset-0 z-50 bg-zinc-950/95 backdrop-blur-md p-6 flex flex-col animate-in fade-in duration-200">
                    <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                        <div className="flex items-center gap-2">
                            <Info size={16} className="text-pink-400" />
                            <span className="font-bold text-white text-sm">מדריך החלטה (Confluence)</span>
                        </div>
                        <button
                            onClick={() => setShowHelp(false)}
                            className="p-1 hover:bg-white/10 rounded-full text-zinc-400 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-4 text-right" dir="rtl">
                        <section>
                            <h4 className="text-white font-bold text-xs mb-1">איך לקבל החלטה?</h4>
                            <p className="text-[11px] text-zinc-400 leading-relaxed">
                                לוח ה-Confluence משקלל את כל האינדיקטורים לכדי מסקנה אחת. הסתכל על הציון המרכזי (Confidence):
                            </p>
                        </section>

                        <div className="grid grid-cols-1 gap-2">
                            <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded">
                                <span className="text-[10px] font-bold text-emerald-400 block mb-0.5">מעל 70% (Strong)</span>
                                <span className="text-[9px] text-zinc-300">התכנסות חזקה. רוב האינדיקטורים מסכימים על כיוון אחד. זמן אידיאלי לחיפוש כניסה.</span>
                            </div>
                            <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded">
                                <span className="text-[10px] font-bold text-amber-400 block mb-0.5">50% - 70% (Stable)</span>
                                <span className="text-[9px] text-zinc-300">קיימת נטייה מסוימת אך ישנם כוחות מנוגדים. יש להמתין לאישור נוסף במבנה השוק.</span>
                            </div>
                            <div className="bg-red-500/10 border border-red-500/20 p-2 rounded">
                                <span className="text-[10px] font-bold text-red-400 block mb-0.5">מתחת ל-50% (Divergent)</span>
                                <span className="text-[9px] text-zinc-300">ניגודיות גבוהה. מומלץ להישאר בחוץ (Stand Aside) עד להתבהרות התמונה.</span>
                            </div>
                        </div>

                        <section className="pt-2">
                            <h4 className="text-white font-bold text-xs mb-1">המושג Global Verdict</h4>
                            <p className="text-[11px] text-zinc-400 leading-relaxed">
                                זוהי השורה התחתונה של המנוע. אם מופיע <span className="text-red-400">Blocked</span>, המנוע מזהה סיכון ניגודי גבוה (Contrarian) וחוסם את האפשרות לעסקה גם אם הציון גבוה.
                            </p>
                        </section>

                        <button
                            onClick={() => setShowHelp(false)}
                            className="w-full py-2 bg-pink-600 hover:bg-pink-500 text-white rounded font-bold text-[11px] transition-colors mt-2"
                        >
                            הבנתי, סגור מדריך
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
