
import {
    detectPSP,
    detectMarketStructure,
    detectFVG,
    detectLiquidity,
    Quote
} from '../app/lib/analysis';

const createCandleMock = (time: number, open: number, high: number, low: number, close: number): Quote => ({
    time, open, high, low, close, volume: 1000, date: new Date(time * 1000)
});

console.log("--- Generating Synthetic Data for PSP ---");
const quotes: Quote[] = [];
let t = 10000;

// Setup Prior High for Sweep: 96.5
quotes.push(createCandleMock(t, 94, 96.5, 94, 95)); t += 60;

// 1. Rally to FVG Origin (High 100, Low 98)
quotes.push(createCandleMock(t, 95, 100, 98, 99)); t += 60;

// 2. Drop fast (Create Bearish FVG between 98 and 95)
quotes.push(createCandleMock(t, 99, 99, 90, 90)); t += 60; // Drop massive
quotes.push(createCandleMock(t, 90, 95, 90, 94)); t += 60; // Candle 3. High 95. GAP: 98-95.

// 3. Drop more to confirm Low (so we can break it later)
quotes.push(createCandleMock(t, 94, 94, 85, 85)); t += 60; // Swing Low @ 85
quotes.push(createCandleMock(t, 85, 90, 85, 88)); t += 60;

// 4. Rally to PSP Candidate (Target 96-97, inside 98-95 FVG)
// Must SWEEP 96.5. High 97. Close 96.
quotes.push(createCandleMock(t, 88, 92, 88, 92)); t += 60;
quotes.push(createCandleMock(t, 92, 97, 92, 96)); t += 60; // Swing High @ 97 (Tap FVG + Sweep 96.5)
quotes.push(createCandleMock(t, 96, 96, 90, 90)); t += 60;

// 5. Break Structure (BOS below 85)
quotes.push(createCandleMock(t, 90, 90, 80, 80)); t += 60; // BOS of 85 (Low at 80)
// Add more candles to CONFIRM the BOS Low
quotes.push(createCandleMock(t, 80, 85, 80, 82)); t += 60;
quotes.push(createCandleMock(t, 82, 86, 82, 84)); t += 60; // Pullback to 86
quotes.push(createCandleMock(t, 84, 84, 75, 75)); t += 60; // New Drop to 75 (Confirms Low at 80? No 75 < 80)

// Low at 75 needs confirmation (Rally after)
quotes.push(createCandleMock(t, 75, 78, 75, 77)); t += 60;
quotes.push(createCandleMock(t, 77, 80, 77, 79)); t += 60;
quotes.push(createCandleMock(t, 79, 82, 79, 81)); t += 60;
quotes.push(createCandleMock(t, 81, 85, 81, 84)); t += 60;
quotes.push(createCandleMock(t, 84, 88, 84, 87)); t += 60;


console.log(`Generated ${quotes.length} candles.`);

// Run Detection
const structure = detectMarketStructure(quotes);
const fvgs = detectFVG(quotes);
const liquidity = detectLiquidity(structure.swings);
const keyLevels = { vwap: 97, open: null, pdh: null, pdl: null }; // Mock VWAP at 97 to allow Key Level match

console.log("--- Running detectPSP ---");
console.log(`Swings detected: ${structure.swings.length}`);
structure.swings.forEach(s => console.log(`Swing ${s.type} @ ${s.price}`));

console.log(`FVGs detected: ${fvgs.length}`);
if (fvgs.length > 0) console.log(`FVG: ${fvgs[0].type} ${fvgs[0].bottom}-${fvgs[0].top}`);

const psps = detectPSP(quotes, structure, fvgs, liquidity, keyLevels);

console.log(`\nPSPs Detected: ${psps.length}`);
psps.forEach(p => {
    console.log(`[PSP] ${p.type} @ ${p.price}`);
    console.log(`   Score: ${p.score}`);
    console.log(`   Factors: ${p.confluenceFactors.join(', ')}`);
});

// Verification Logic
if (psps.length > 0) {
    const p = psps[0];
    if (p.score >= 3) {
        console.log("\n✅ PSP Verification PASSED: Detected High Quality pivot (Score >= 3).");
    } else {
        console.log(`\n⚠️ PSP Verification PARTIAL: Score ${p.score}. Expected >= 3.`);
    }
} else {
    // Debug: why not?
    const candidate = structure.swings.find(s => Math.abs(s.price - 97) < 1);
    if (candidate) {
        console.log("\nDebug Candidate Swing:");
        console.log(`Candidate Price: ${candidate.price}`);
        // Log BOS Check
        const nextOpposite = structure.swings.find(s => s.time > candidate.time && s.type !== candidate.type);
        if (nextOpposite) {
            console.log(`Next Opposite Swing: ${nextOpposite.type} @ ${nextOpposite.price}`);
            const priorOpposite = structure.swings.filter(s => s.time < candidate.time && s.type !== candidate.type).pop();
            if (priorOpposite) console.log(`Prior Opposite Swing: ${priorOpposite.type} @ ${priorOpposite.price}`);
        } else {
            console.log("No Next Opposite Swing found (for BOS check).");
        }
    }
    console.log("\n❌ PSP Verification FAILED: No PSP detected.");
}
