export type SignalStatus = 'OK' | 'WARN' | 'OFF' | 'ERROR';
export type SignalDirection = 'LONG' | 'SHORT' | 'NEUTRAL';

export interface IndicatorSignal {
    status: SignalStatus;
    direction: SignalDirection;
    score: number; // 0-100
    hint: string;
    debug?: {
        factors: string[];
        [key: string]: any;
    };
}
