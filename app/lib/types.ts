export type SignalStatus = 'OK' | 'WARN' | 'STRONG' | 'OFF' | 'ERROR';
export type SignalDirection = 'LONG' | 'SHORT' | 'NEUTRAL';

export interface IndicatorMeta {
    rawScore: number;          // Score before reliability cap
    finalScore: number;        // Score after reliability cap (= signal.score)
    /** Primary: which provider actually served the data */
    sourceUsed: "BROKER" | "TRADINGVIEW" | "YAHOO";
    /** Which provider was tried first but failed (if any) */
    fallbackFrom?: "BROKER" | "TRADINGVIEW";
    /** Human-readable cap reason, e.g. "YAHOO delayed >15m" */
    capReason?: string;
    dataAgeMs: number;         // Date.now() - lastBarTimeMs
    lastBarTimeMs: number;     // Unix ms of the last bar
    capApplied: boolean;       // true if finalScore < rawScore
    /** @deprecated use sourceUsed */
    source?: "BROKER" | "TRADINGVIEW" | "YAHOO";
}

export interface IndicatorSignal {
    status: SignalStatus;
    direction: SignalDirection;
    score: number;             // ALWAYS finalScore (after cap)
    hint?: string;
    // Extended SMT fields
    isStrong?: boolean;
    lastSwingTimeSec?: number;
    gate?: {
        isActive: boolean;
        blocksDirection: SignalDirection | null;
        expiresAtMs: number;
        remainingMin: number;
        reason: string;
    };
    debug?: {
        factors: string[];
        [key: string]: any;
    };
    meta?: IndicatorMeta;
}
