
import {
    detectSMT,
    detectMarketStructure,
    Quote
} from '../app/lib/analysis';

const createCandleMock = (time: number, open: number, high: number, low: number, close: number): Quote => ({
    time, open, high, low, close, volume: 1000
});

// Helper to generate a swing structure
// 9 candles: 3 Up, Peak, 3 Down
const addSwingHigh = (quotes: Quote[], startTime: number, peakPrice: number, basePrice: number, interval: number) => {
    let t = startTime;
    // Walk up
    for (let i = 0; i < 5; i++) {
        quotes.push(createCandleMock(t, basePrice + i, basePrice + i + 1, basePrice + i, basePrice + i + 1));
        t += interval;
    }
    // Peak
    quotes.push(createCandleMock(t, peakPrice - 2, peakPrice, peakPrice - 3, peakPrice - 1));
    const peakTime = t;
    console.log(`Peak at T:${peakTime}`);
    t += interval;
    // Walk down
    for (let i = 0; i < 5; i++) {
        quotes.push(createCandleMock(t, peakPrice - i, peakPrice - i, peakPrice - i - 1, peakPrice - i - 1));
        t += interval;
    }
    return t; // End time
};

// Scenario: Bearish SMT
// Primary (NQ): Higher High
// Reference (ES): Lower High

const quotesNQ: Quote[] = [];
const quotesES: Quote[] = [];
let t = 10000;
const interval = 60 * 15; // M15 candles

// 0. Initial Low to satisfy guard clause (need 2 lows)
addSwingHigh(quotesNQ, t, 90, 80, interval); // This technically adds a high... wait, addSwingHigh adds a peak. I need a low.
// Let's just create a Low manually or use addSwingHigh (High) then Low.
// Actually, detectMarketStructure finds Highs and Lows.
// Current: Up(5), Peak, Down(5). This creates a High. The bottom of the Down might be a Low if it reverses.
// I'll just add a "Pre-High" low segment.
quotesNQ.push(createCandleMock(t, 90, 92, 90, 91)); t += interval;
quotesNQ.push(createCandleMock(t, 91, 91, 88, 88)); t += interval; // Low at 88
quotesNQ.push(createCandleMock(t, 88, 92, 88, 90)); t += interval;

quotesES.push(createCandleMock(t, 3990, 3992, 3990, 3991));
quotesES.push(createCandleMock(t, 3991, 3991, 3980, 3980));
quotesES.push(createCandleMock(t, 3980, 3992, 3980, 3990));

// 1. Initial High (Correlated)

// Both hit High at t=10000 + 2*interval
addSwingHigh(quotesNQ, t, 100, 90, interval); // Peak 100
addSwingHigh(quotesES, t, 4000, 3990, interval); // Peak 4000
t += 5 * interval + (60 * 15 * 5); // Fast forward

// 2. Second High (Divergent)
// NQ makes Higher High (105)
// ES makes Lower High (3995)
// ES Peak is delayed by 1 candle (15m offset) to test tolerance
addSwingHigh(quotesNQ, t, 105, 95, interval); // HH
addSwingHigh(quotesES, t + interval, 3995, 3985, interval); // LH, delayed

console.log("--- Generating Synthetic Data for SMT ---");
console.log(`NQ Quotes: ${quotesNQ.length}`);
console.log(`ES Quotes: ${quotesES.length}`);

// Detect Structure
const structNQ = detectMarketStructure(quotesNQ);
const structES = detectMarketStructure(quotesES);

console.log("NQ Swings:", structNQ.swings.map(s => `${s.type}@${s.price} T:${s.time}`));
console.log("ES Swings:", structES.swings.map(s => `${s.type}@${s.price} T:${s.time}`));

// Debugging manually logic here
const pHighs = structNQ.swings.filter(s => s.type === 'HIGH');
const rHighs = structES.swings.filter(s => s.type === 'HIGH');
console.log("NQ Highs:", pHighs.length);
console.log("ES Highs:", rHighs.length);
if (pHighs.length >= 2 && rHighs.length >= 2) {
    const pLast = pHighs[pHighs.length - 1];
    const rLastMatches = rHighs.map(r => ({ time: r.time, diff: Math.abs(r.time - pLast.time) }));
    console.log("pLast Time:", pLast.time);
    console.log("rHighs Diffs:", rLastMatches);
}

// Run SMT Detection (Simulate M15 logic)
// Primary: NQ, Reference: ES, Interval: 15m (900s)
const smt = detectSMT(structNQ, structES, 'ES', 900);

if (smt) {
    console.log("\n✅ SMT Detected:");
    console.log(`Type: ${smt.type}`);
    console.log(`Desc: ${smt.description}`);
    console.log(`Time: ${smt.time}`);
} else {
    console.log("\n❌ SMT NOT Detected");
}
