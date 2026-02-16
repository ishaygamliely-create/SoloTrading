import { Candle } from '../marketDataTypes';

export function normalizeYahooToCandles(res: any): Candle[] {
    if (!res || !res.quotes) return [];
    return res.quotes
        .filter((q: any) => q.open != null) // Filter out null/incomplete bars
        .map((q: any) => ({
            time: Math.floor(new Date(q.date).getTime() / 1000),
            open: q.open,
            high: q.high,
            low: q.low,
            close: q.close,
            volume: q.volume ?? 0,
        }));
}
