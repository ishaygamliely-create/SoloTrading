import type { IndicatorSignal } from "@/app/lib/types";

export type SessionFlags = {
    nyTime: string;         // "HH:MM:SS"
    isLondonKZ: boolean;    // 02:00–05:00 NY
    isNewYorkKZ: boolean;   // 07:00–10:00 NY
    isOffHours: boolean;
};

function nyTimeParts(nowMs: number): { h: number; m: number; s: number; text: string } {
    const fmt = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });
    const parts = fmt.formatToParts(new Date(nowMs));
    const hh = Number(parts.find(p => p.type === "hour")?.value ?? "0");
    const mm = Number(parts.find(p => p.type === "minute")?.value ?? "0");
    const ss = Number(parts.find(p => p.type === "second")?.value ?? "0");
    const text = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
    return { h: hh, m: mm, s: ss, text };
}

function isBetween(h: number, start: number, end: number): boolean {
    // start inclusive, end exclusive
    return h >= start && h < end;
}

export function getSessionSignal(nowMs: number): IndicatorSignal & { debug: { factors: string[]; flags: SessionFlags } } {
    const t = nyTimeParts(nowMs);

    // NY time windows (hours)
    const isLondonKZ = isBetween(t.h, 2, 5);     // 02:00–04:59
    const isNewYorkKZ = isBetween(t.h, 7, 10);   // 07:00–09:59
    const isOffHours = !(isLondonKZ || isNewYorkKZ);

    const factors: string[] = [];
    if (isLondonKZ) factors.push("LondonKZ active (02:00–05:00 NY)");
    if (isNewYorkKZ) factors.push("NewYorkKZ active (07:00–10:00 NY)");
    if (isOffHours) factors.push("Off-hours");

    factors.push(`NY time ${t.text}`);

    const score = isOffHours ? 20 : 80;
    const hint = isOffHours
        ? "Off-hours: lower reliability—avoid marginal setups or reduce size."
        : "Active session: setups tend to be more reliable.";

    return {
        status: "OK",
        direction: "NEUTRAL",
        score,
        hint,
        debug: {
            factors,
            flags: {
                nyTime: t.text,
                isLondonKZ,
                isNewYorkKZ,
                isOffHours,
            },
        },
    };
}
