import type { IndicatorSignal } from "@/app/lib/types";

export function applySessionSoftImpact(
    signal: IndicatorSignal,
    session: IndicatorSignal
): IndicatorSignal {
    // Soft impact: Off-hours reduces score a bit + adds WARN wording via hint.
    // Do NOT flip direction or force NO TRADE here.
    if (session.status !== "OK") return signal;

    const isOffHours = session.score <= 20; // per our session scoring
    if (!isOffHours) return signal;

    const reduced = Math.max(0, Math.round(signal.score * 0.85)); // reduce ~15%
    const hintSuffix = " (Off-hours: reliability lower)";

    return {
        ...signal,
        score: reduced,
        status: signal.status === "OK" ? "WARN" : signal.status,
        hint: signal.hint.includes("Off-hours") ? signal.hint : `${signal.hint}${hintSuffix}`,
        debug: {
            factors: [
                ...(signal.debug?.factors ?? []),
                "Session soft filter: off-hours score reduction (-15%)",
            ],
        },
    };
}
