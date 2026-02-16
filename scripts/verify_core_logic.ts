
// Verification Script for Nexus Analytics Core Logic
import {
    calculateEMAsWithSlope,
    detectMarketStructure,
    detectSMT,
    calculateRiskLevels,
    detectFVG,
    detectLiquidity,
    Quote
} from '../app/lib/analysis';

// Mock helpers
// Mock helpers
const createCandle = (time: number, open: number, high: number, low: number, close: number): Quote => ({
    time, open, high, low, close, volume: 1000
});

// TEST 1: EMA Slope Calculation
console.log("--- TEST 1: EMA Slopes ---");
const risingTrend: Quote[] = [];
for (let i = 0; i < 300; i++) {
    // Steady rise
    risingTrend.push(createCandle(i, 100 + i, 101 + i, 99 + i, 100.5 + i));
}
const emas = calculateEMAsWithSlope(risingTrend);
console.log(`EMA200 Slope (Expected > 0): ${emas.slope200?.toFixed(4)}`);
if (emas.slope200 && emas.slope200 > 0) console.log("✅ EMA Slope Logic: PASS");
else console.error("❌ EMA Slope Logic: FAIL");


// TEST 2: SMT Divergence
console.log("\n--- TEST 2: SMT Divergence ---");
// Scenario: NQ (Main) makes Higher High, ES (Ref) makes Lower High
const timeBase = 10000;
const nqQuotes = [
    createCandle(timeBase, 100, 110, 90, 105), // Previous High
    createCandle(timeBase + 300, 102, 108, 95, 100), // Pullback
    createCandle(timeBase + 600, 105, 115, 98, 110), // New High (115 > 110)
    createCandle(timeBase + 900, 108, 112, 100, 105) // Current
];
const esQuotes = [
    createCandle(timeBase, 2000, 2020, 1980, 2000), // Previous High
    createCandle(timeBase + 300, 1990, 2005, 1985, 1995), // Pullback
    createCandle(timeBase + 600, 1995, 2010, 1990, 2000), // New High (2010 < 2020) -> LOWER HIGH
    createCandle(timeBase + 900, 2000, 2005, 1995, 2000) // Current
];

const nqStruct = detectMarketStructure(nqQuotes);
const esStruct = detectMarketStructure(esQuotes);

// Note: detectSMT requires identifying swings. Our mock might be too short for the full swing detection loop (requires left/right bars).
// Let's create a synthetic structure manually to test the comparison logic specifically, 
// as detectMarketStructure needs more data points (leftBars/rightBars check).
const syntheticNQStruct = {
    ...nqStruct,
    swings: [
        { price: 88, time: timeBase - 100, type: 'LOW' as const, index: -1 },
        { price: 110, time: timeBase, type: 'HIGH' as const, index: 0 },
        { price: 90, time: timeBase + 100, type: 'LOW' as const, index: 1 },
        { price: 115, time: timeBase + 600, type: 'HIGH' as const, index: 2 } // HH
    ]
};
const syntheticESStruct = {
    ...esStruct,
    swings: [
        { price: 1970, time: timeBase - 100, type: 'LOW' as const, index: -1 },
        { price: 2020, time: timeBase, type: 'HIGH' as const, index: 0 },
        { price: 1980, time: timeBase + 100, type: 'LOW' as const, index: 1 },
        { price: 2010, time: timeBase + 600, type: 'HIGH' as const, index: 2 } // LH
    ]
};

const smt = detectSMT(syntheticNQStruct, syntheticESStruct, 'ES');
console.log(`SMT Detected: ${smt?.type}`);
if (smt?.type === 'BEARISH') console.log("✅ SMT Bearish Logic: PASS");
else console.error("❌ SMT Bearish Logic: FAIL", smt);


// TEST 3: Risk Invalidation Zones
console.log("\n--- TEST 3: Risk Zones ---");
// Scenario: Bullish Bias, Price 108. Support Low at 90.
// Structure from NQ above: Last low was 90.
const fakeBiasScore = 20; // Bullish
const risk = calculateRiskLevels(108, fakeBiasScore, syntheticNQStruct, [], [], null, null);

console.log(`Direction: ${risk.direction}`);
console.log(`Invalidation Price: ${risk.invalidation?.price}`);
if (risk.direction === 'LONG' && risk.invalidation?.price === 90) console.log("✅ Risk Invalidation Logic: PASS");
else console.error("❌ Risk Invalidation Logic: FAIL", risk);

