export interface Candle {
    time: number;   // unix seconds
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export type Interval = "1m" | "5m" | "15m" | "60m" | "1d";

export interface MarketDataBundle {
    symbol: string;
    candles: Record<Interval, Candle[]>;
    meta: {
        provider: "yahoo" | "realtime" | "unknown";
        serverTimeMs: number;
        lastBarTimeMs?: number;
        dataAgeMs?: number; // freshness
    };
}
