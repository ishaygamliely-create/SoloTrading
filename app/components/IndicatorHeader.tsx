import { getDirectionBadgeClass } from "@/app/lib/uiSignalStyles";

export type IndicatorStatus = "OK" | "WARN" | "OFF" | "ERROR";
export type IndicatorDirection = "LONG" | "SHORT" | "NEUTRAL";

export type IndicatorSignal = {
    status: IndicatorStatus;
    direction: IndicatorDirection;
    score: number;
    hint?: string;
    debug?: Record<string, any>;
};

const TITLE_COLOR: Record<string, string> = {
    BIAS: "text-red-400",
    STRUCTURE: "text-purple-400",
    VALUE: "text-emerald-400",
    "LIQUIDITY & RANGE": "text-cyan-400",
    PSP: "text-yellow-400",
    SMT: "text-orange-400",
    CONFLUENCE: "text-pink-400",
    SESSION: "text-blue-400",
    LEVELS: "text-sky-400",
    RISK: "text-rose-400",
};

function clsx(...a: Array<string | false | null | undefined>) {
    return a.filter(Boolean).join(" ");
}

function statusBadge(status: IndicatorStatus) {
    switch (status) {
        case "OK":
            return "bg-emerald-500/15 text-emerald-300 border-emerald-500/20";
        case "WARN":
            return "bg-yellow-500/15 text-yellow-300 border-yellow-500/20";
        case "ERROR":
            return "bg-red-500/15 text-red-300 border-red-500/20";
        case "OFF":
        default:
            return "bg-white/5 text-white/50 border-white/10";
    }
}

export function safeSignal(signal?: IndicatorSignal | null): IndicatorSignal {
    return signal ?? { status: "OFF", direction: "NEUTRAL", score: 0, hint: "No data", debug: {} };
}

export default function IndicatorHeader(props: {
    title: string;
    signal?: IndicatorSignal | null;
    rightBadgeText?: string; // optional: e.g. "RANGING", "EXPANDING"
}) {
    const { title, signal, rightBadgeText } = props;
    const s = safeSignal(signal);
    const t = title.toUpperCase();
    const titleColor = TITLE_COLOR[t] ?? "text-white/90";

    return (
        <div className="mb-2 border-b border-white/5 pb-2">
            <div className="flex items-center justify-between gap-2">
                <h3 className={clsx("text-sm font-bold uppercase tracking-wider", titleColor)}>
                    {title}
                </h3>

                <div className="flex items-center gap-2">
                    {rightBadgeText ? (
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-semibold text-white/80">
                            {rightBadgeText}
                        </span>
                    ) : null}

                    <span className={getDirectionBadgeClass({
                        direction: s.direction,
                        score: s.score,
                        status: s.status
                    })}>
                        {s.direction}
                    </span>

                    <span className={clsx("rounded-full border px-2 py-0.5 text-xs font-semibold", statusBadge(s.status))}>
                        {s.status}
                    </span>

                    <span className="min-w-[28px] text-right text-xs font-bold text-white/80">
                        {Math.round(s.score)}
                    </span>
                </div>
            </div>
        </div>
    );
}
