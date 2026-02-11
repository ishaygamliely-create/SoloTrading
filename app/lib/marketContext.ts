export type BiasMode = "LONG" | "SHORT" | "NEUTRAL";
export type DataStatus = "OK" | "DELAYED" | "BLOCKED" | "CLOSED";
export type SuggestedDirection = "LONG" | "SHORT" | "NEUTRAL" | "NO TRADE";

export function getSuggestedDirection(args: {
    price: number;
    eq: number;
    biasMode: BiasMode;
    dataStatus: DataStatus;
}): SuggestedDirection {
    const { price, eq, biasMode, dataStatus } = args;

    if (dataStatus === "BLOCKED" || dataStatus === "CLOSED") return "NO TRADE";

    let longScore = 0;
    let shortScore = 0;

    if (price > eq) longScore += 1;
    else if (price < eq) shortScore += 1;

    if (biasMode === "LONG") longScore += 1;
    else if (biasMode === "SHORT") shortScore += 1;

    if (longScore === shortScore) return "NEUTRAL";
    return longScore > shortScore ? "LONG" : "SHORT";
}

export function formatAgeMs(ms: number): string {
    if (!Number.isFinite(ms) || ms < 0) return "";
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    if (m <= 0) return `${s}s`;
    return `${m}m ${s}s`;
}
