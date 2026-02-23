
import { detectMarketStructure, detectFVG, detectLiquidity, detectPSP, Quote, PSP, calculateEMAsWithSlope, detectSMT } from '../app/lib/analysis';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

async function run() {
    console.log("Starting Debug...");
    const symbol = 'MNQ=F';

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const startDateHTF = new Date();
    startDateHTF.setDate(startDateHTF.getDate() - 60);
    const startDaily = new Date();
    startDaily.setDate(startDaily.getDate() - 20);

    console.log("Fetching Data...");
    try {
        const p1m = yahooFinance.chart(symbol, { period1: startDate, interval: '1m' }).catch(() => null);
        const p5m = yahooFinance.chart(symbol, { period1: startDateHTF, interval: '5m' }).catch(() => null);
        const p15m = yahooFinance.chart(symbol, { period1: startDateHTF, interval: '15m' }).catch(() => null);
        const p60m = yahooFinance.chart(symbol, { period1: startDateHTF, interval: '60m' }).catch(() => null);
        const pDaily = yahooFinance.chart(symbol, { period1: startDaily, interval: '1d' }).catch(() => null);

        const refSymbols = ['ES=F', 'YM=F', 'RTY=F'];
        const pRefs = Promise.all(refSymbols.map(s => yahooFinance.chart(s, { period1: startDate, interval: '1m' }).catch(() => null)));

        const [res1m, res5m, res15m, res60m, resDaily, resRefs] = await Promise.all([p1m, p5m, p15m, p60m, pDaily, pRefs]);
        console.log("Data Fetched.");

        const processQuotes = (res: { quotes?: any[] } | null): Quote[] => {
            if (!res || !res.quotes) return [];
            return res.quotes.filter((q) => q.open !== null).map((q) => ({
                time: Math.floor(new Date(q.date).getTime() / 1000),
                open: q.open, high: q.high, low: q.low, close: q.close, volume: q.volume || 0, date: q.date
            }));
        };

        const quotes1m = processQuotes(res1m);
        processQuotes(res5m);
        processQuotes(res15m);
        processQuotes(res60m);
        const quotesDaily = processQuotes(resDaily);

        console.log(`Q1m: ${quotes1m.length}, QDaily: ${quotesDaily.length}`);

        const mainQuotesForChart = quotes1m;

        if (mainQuotesForChart.length === 0) {
            console.log("No 1m data found.");
            return;
        }

        // ANALYSIS checks
        console.log("Running Analysis...");
        calculateEMAsWithSlope(mainQuotesForChart);
        const structure = detectMarketStructure(mainQuotesForChart);
        detectFVG(mainQuotesForChart);
        detectLiquidity(structure.swings);

        // SMT
        const smt: any[] = []; // Explicitly typed as any[] as it collects mixed results
        if (resRefs) {
            resRefs.forEach((refRes: { quotes?: any[] } | null, index: number) => {
                if (refRes && refRes.quotes) {
                    const refQuotes = processQuotes(refRes);
                    const refStructure = detectMarketStructure(refQuotes);
                    const divergence = detectSMT(structure, refStructure, refSymbols[index], 60);
                    if (divergence) smt.push(divergence);
                }
            });
        }
        console.log(`SMT count: ${smt.length}`);

        // PSP H4
        console.log("Running H4 PSP...");
        let pspsH4: PSP[] = [];
        if (quotesDaily.length > 0) {
            const s = detectMarketStructure(quotesDaily);
            const f = detectFVG(quotesDaily);
            const l = detectLiquidity(s.swings);
            const keyLevels = { vwap: null, open: null, pdh: null, pdl: null };
            pspsH4 = detectPSP(quotesDaily, s, f, l, keyLevels).map(p => ({ ...p, tf: 'H4' as 'M15' | 'H1' | 'H4' }));
        }
        console.log(`H4 PSPs: ${pspsH4.length}`);

        console.log("DONE successfully.");

    } catch (e) {
        console.error("CRASHED:", e);
    }
}

run();
