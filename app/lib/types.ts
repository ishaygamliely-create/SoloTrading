export type SignalStatus = 'OK' | 'WARN' | 'STRONG' | 'OFF' | 'ERROR';
export type SignalDirection = 'LONG' | 'SHORT' | 'NEUTRAL';

export interface IndicatorMeta {
    rawScore: number;          // Score before reliability cap
    finalScore: number;        // Score after reliability cap (= signal.score)
    source: "BROKER" | "TRADINGVIEW" | "YAHOO";
    dataAgeMs: number;         // Date.now() - lastBarTimeMs
    lastBarTimeMs: number;     // Unix ms of the last bar
    capApplied: boolean;       // true if finalScore < rawScore
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
