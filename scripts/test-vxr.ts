import { calculateVxr } from '../app/lib/indicators/vxr';
import { Quote } from '../app/lib/analysis';

function generateMockM1(startTime: number, count: number, startPrice: number): Quote[] {
    const quotes: Quote[] = [];
    for (let i = 0; i < count; i++) {
        quotes.push({
            time: startTime + (i * 60),
            open: startPrice,
            high: startPrice + 1,
            low: startPrice - 1,
            close: startPrice,
            volume: 100
        });
    }
    return quotes;
}

function testTimeIntegration() {
    console.log('Testing Time Integration...');
    // M15 bar at 10:00 (36000s from midnight)
    const m15Time = 36000;
    const m15Quotes: Quote[] = [{ time: m15Time, open: 100, high: 105, low: 95, close: 100, volume: 1500 }];

    // Generate M1 from 09:59 to 10:16
    const m1Quotes = generateMockM1(m15Time - 60, 18, 100);

    const profiles = calculateVxr(m15Quotes, m1Quotes, 0.5);
    const profile = profiles[0];

    console.log(`- M15 Start: ${m15Time}, M15 End (Expected): ${m15Time + 900}`);
    console.log(`- Profile Total Volume: ${profile.totalVolume}`);

    // Should have 15 M1 bars (10:00 to 10:14)
    const expectedVolume = 15 * 100;
    if (profile.totalVolume === expectedVolume) {
        console.log('✅ Volume Sum matches (15 M1 bars)');
    } else {
        console.log(`❌ Volume Sum mismatch: Expected ${expectedVolume}, got ${profile.totalVolume}`);
    }

    // Check for "leakage"
    // The loop should stop at m1Idx for the next bar correctly.
}

function testRangeHandling() {
    console.log('\nTesting Range Handling...');

    const m15Time = 36000;
    const m15Quotes: Quote[] = [{ time: m15Time, open: 100, high: 100.5, low: 99.5, close: 100, volume: 100 }];

    // 1. Compressed Candle (Single M1 with zero range)
    const compressedM1: Quote[] = [{ time: m15Time, open: 100, high: 100, low: 100, close: 100, volume: 100 }];
    const profileComp = calculateVxr(m15Quotes, compressedM1, 0.5)[0];
    console.log(`- Compressed (Low=High=100): Buckets Count = ${profileComp.buckets.length}`);
    if (profileComp.buckets.length === 1 && profileComp.buckets[0].price === 100) {
        console.log('✅ Compressed candle correctly assigned to single bucket');
    } else {
        console.log('❌ Compressed candle failed');
    }

    // 2. Wide Candle
    const wideM1: Quote[] = [{ time: m15Time, open: 100, high: 110, low: 90, close: 100, volume: 1000 }];
    const profileWide = calculateVxr(m15Quotes, wideM1, 1.0)[0];
    console.log(`- Wide (90-110): Buckets Count = ${profileWide.buckets.length}`);
    const sumVol = profileWide.buckets.reduce((a, b) => a + b.volume, 0);
    if (Math.abs(sumVol - 1000) < 0.01) {
        console.log('✅ Wide candle correctly distributed total volume');
    } else {
        console.log(`❌ Wide candle sum mismatch: ${sumVol}`);
    }
}

testTimeIntegration();
testRangeHandling();
