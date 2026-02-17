export type SignalStatus = 'OK' | 'WARN' | 'STRONG' | 'OFF' | 'ERROR';
export type SignalDirection = 'LONG' | 'SHORT' | 'NEUTRAL';

export interface IndicatorSignal {
    status: SignalStatus;
    direction: SignalDirection;
    score: number; // 0-100
    hint: string;
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
}
