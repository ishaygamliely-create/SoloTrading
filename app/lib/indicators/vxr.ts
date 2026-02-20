import { Quote } from "../analysis";

export interface VxrBucket {
    price: number;
    volume: number;
}

export interface VxrProfile {
    time: number;       // M15 bar time (Unix seconds)
    buckets: VxrBucket[];
    hvn: number;        // High Volume Node (price)
    totalVolume: number;
    vah: number;        // Value Area High (70%)
    val: number;        // Value Area Low (70%)
}

/**
 * Calculates Volume X-Ray profiles for M15 candles using M1 data.
 * @param quotes15m - The M15 bars
 * @param quotes1m - The M1 bars
 * @param binSize - Price bucket size (default 0.5 for NQ/MNQ)
 */
export function calculateVxr(
    quotes15m: Quote[],
    quotes1m: Quote[],
    binSize: number = 0.5
): VxrProfile[] {
    const profiles: VxrProfile[] = [];

    // Map M1 quotes by time for easier lookup
    // Assuming quotes are sorted by time
    let m1Idx = 0;

    for (const m15 of quotes15m) {
        const startTime = m15.time;
        const endTime = startTime + 15 * 60; // 15 minutes later

        const bucketMap = new Map<number, number>();
        let totalVolume = 0;

        // Find M1 quotes inside this M15 window
        while (m1Idx < quotes1m.length && quotes1m[m1Idx].time < startTime) {
            m1Idx++;
        }

        let tempIdx = m1Idx;
        while (tempIdx < quotes1m.length && quotes1m[tempIdx].time < endTime) {
            const m1 = quotes1m[tempIdx];

            // Only fill buckets that the M1 bar actually touches
            const startBin = Math.floor(m1.low / binSize) * binSize;
            const endBin = Math.floor(m1.high / binSize) * binSize;

            const bins: number[] = [];
            for (let p = startBin; p <= endBin; p = Number((p + binSize).toFixed(4))) {
                bins.push(p);
            }

            const volPerBin = m1.volume / Math.max(1, bins.length);

            for (const p of bins) {
                const currentVol = bucketMap.get(p) || 0;
                bucketMap.set(p, currentVol + volPerBin);
            }

            totalVolume += m1.volume;
            tempIdx++;
        }

        if (totalVolume === 0) continue;

        // Convert map to sorted buckets
        const buckets: VxrBucket[] = Array.from(bucketMap.entries())
            .map(([price, volume]) => ({ price, volume }))
            .sort((a, b) => a.price - b.price);

        // Find HVN
        let maxVol = 0;
        let hvn = 0;
        for (const bucket of buckets) {
            if (bucket.volume > maxVol) {
                maxVol = bucket.volume;
                hvn = bucket.price;
            }
        }

        // Calculate Value Area (70% of total volume around HVN)
        const { vah, val } = calculateValueArea(buckets, totalVolume, hvn);

        profiles.push({
            time: startTime,
            buckets,
            hvn,
            totalVolume,
            vah,
            val
        });
    }

    return profiles;
}

function calculateValueArea(buckets: VxrBucket[], totalVolume: number, hvn: number) {
    const targetVol = totalVolume * 0.7;
    let currentVol = 0;

    // Find HVN index
    const hvnIdx = buckets.findIndex(b => b.price === hvn);
    if (hvnIdx === -1) return { vah: hvn, val: hvn };

    currentVol = buckets[hvnIdx].volume;
    let lowIdx = hvnIdx;
    let highIdx = hvnIdx;

    while (currentVol < targetVol) {
        const canGoLower = lowIdx > 0;
        const canGoHigher = highIdx < buckets.length - 1;

        if (!canGoLower && !canGoHigher) break;

        const lowVol = canGoLower ? (buckets[lowIdx - 1].volume + (buckets[lowIdx - 2]?.volume || 0)) : -1;
        const highVol = canGoHigher ? (buckets[highIdx + 1].volume + (buckets[highIdx + 2]?.volume || 0)) : -1;

        if (lowVol > highVol && canGoLower) {
            currentVol += buckets[lowIdx - 1].volume;
            lowIdx--;
        } else if (canGoHigher) {
            currentVol += buckets[highIdx + 1].volume;
            highIdx++;
        } else if (canGoLower) {
            currentVol += buckets[lowIdx - 1].volume;
            lowIdx--;
        }
    }

    return {
        vah: buckets[highIdx].price,
        val: buckets[lowIdx].price
    };
}
