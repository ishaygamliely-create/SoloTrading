/**
 * Reliability Engine
 *
 * Separates raw signal strength from feed reliability.
 * - dataAgeMs = Date.now() - lastBarTimeMs (bar-time, NOT request time)
 * - Cap is source-specific (YAHOO=74, TRADINGVIEW=85, BROKER=100)
 * - STATUS is always derived from finalScore only (never from dataStatus)
 * - CLOSED market = neutral, never red
 */

export type DataSource = "BROKER" | "TRADINGVIEW" | "YAHOO";
export type DataStatus = "OK" | "DELAYED" | "CLOSED";

export interface ReliabilityInput {
    rawScore: number;
    lastBarTimeMs: number;       // Unix ms of the last bar close
    source: DataSource;
    marketStatus: "OPEN" | "CLOSED";
}

export interface ReliabilityResult {
    finalScore: number;
    dataStatus: DataStatus;
    capApplied: boolean;
    dataAgeMs: number;
}

/** Source caps: max score allowed per data source */
const SOURCE_CAPS: Record<DataSource, number> = {
    BROKER: 100,
    TRADINGVIEW: 85,
    YAHOO: 74,
};

/** Delay thresholds: age (ms) beyond which data is considered DELAYED */
const DELAY_THRESHOLDS_MS: Record<DataSource, number> = {
    BROKER: 60_000,          // 1 min
    TRADINGVIEW: 10 * 60_000, // 10 min
    YAHOO: 15 * 60_000,       // 15 min
};

export function applyReliability(input: ReliabilityInput): ReliabilityResult {
    const now = Date.now();
    const dataAgeMs = now - input.lastBarTimeMs;

    // CLOSED market: no cap, no warning
    if (input.marketStatus === "CLOSED") {
        return {
            finalScore: input.rawScore,
            dataStatus: "CLOSED",
            capApplied: false,
            dataAgeMs,
        };
    }

    // Determine delay status
    const delayThreshold = DELAY_THRESHOLDS_MS[input.source];
    const dataStatus: DataStatus = dataAgeMs > delayThreshold ? "DELAYED" : "OK";

    // Apply source cap
    const cap = SOURCE_CAPS[input.source];
    const finalScore = Math.min(input.rawScore, cap);
    const capApplied = finalScore !== input.rawScore;

    return {
        finalScore,
        dataStatus,
        capApplied,
        dataAgeMs,
    };
}
