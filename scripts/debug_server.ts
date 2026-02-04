
import { calculateEMAs, detectMarketStructure, detectFVG, detectLiquidity, calculateCompositeBias, calculateRiskLevels, detectTradeScenarios, detectPSP, Quote, PSP, calculateEMAsWithSlope, detectSMT } from '../app/lib/analysis';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

async function run() {
    console.log("Starting Debug...");
    const symbol = 'MNQ=F';
    const interval = '1m';

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const startDateHTF = new Date();
    startDateHTF.setDate(startDateHTF.getDate() - 60);
    const startDaily = new Date();
    startDaily.setDate(startDaily.getDate() - 20);

    console.log("Fetching Data...");
    try {
        const p1m = yahooFinance.chart(symbol, { period1: startDate, interval: '1m' }).catch(e => { console.log('p1m err', e); return null; });
        const p5m = yahooFinance.chart(symbol, { period1: startDateHTF, interval: '5m' }).catch(e => { console.log('p5m err', e); return null; });
        const p15m = yahooFinance.chart(symbol, { period1: startDateHTF, interval: '15m' }).catch(e => { console.log('p15m err', e); return null; });
        const p60m = yahooFinance.chart(symbol, { period1: startDateHTF, interval: '60m' }).catch(e => { console.log('p60m err', e); return null; });
        const pDaily = yahooFinance.chart(symbol, { period1: startDaily, interval: '1d' }).catch(e => { console.log('pDaily err', e); return null; });

        const refSymbols = ['ES=F', 'YM=F', 'RTY=F'];
        const pRefs = Promise.all(refSymbols.map(s => yahooFinance.chart(s, { period1: startDate, interval: '1m' }).catch(e => null)));

        const [res1m, res5m, res15m, res60m, resDaily, resRefs] = await Promise.all([p1m, p5m, p15m, p60m, pDaily, pRefs]);
        console.log("Data Fetched.");

        const processQuotes = (res: any): Quote[] => {
            if (!res || !res.quotes) return [];
            return res.quotes.filter((q: any) => q.open !== null).map((q: any) => ({
                time: Math.floor(new Date(q.date).getTime() / 1000),
                open: q.open, high: q.high, low: q.low, close: q.close, volume: q.volume || 0, date: q.date
            }));
        };

        const quotes1m = processQuotes(res1m);
        const quotes5m = processQuotes(res5m);
        const quotes15m = processQuotes(res15m);
        const quotes60m = processQuotes(res60m);
        const quotesDaily = processQuotes(resDaily);

        console.log(`Q1m: ${quotes1m.length}, QDaily: ${quotesDaily.length}`);

        const mainQuotesForChart = quotes1m;
        const lastPrice = mainQuotesForChart[mainQuotesForChart.length - 1].close;

        // ANALYSIS checks
        console.log("Running Analysis...");
        const emas = calculateEMAsWithSlope(mainQuotesForChart);
        const structure = detectMarketStructure(mainQuotesForChart);
        const fvgs = detectFVG(mainQuotesForChart);
        const liquidity = detectLiquidity(structure.swings);

        // SMT
        const smt: any[] = [];
        if (resRefs) {
            resRefs.forEach((refRes: any, index: number) => {
                if (refRes && refRes.quotes) {
                    const refQuotes = processQuotes(refRes);
                    const refStructure = detectMarketStructure(refQuotes);
                    const divergence = detectSMT(structure, refStructure, refSymbols[index], 60);
                    if (divergence) smt.push(divergence);
                }
            });
        }

        // PSP H4
        console.log("Running H4 PSP...");
        let pspsH4: PSP[] = [];
        if (quotesDaily.length > 0) {
            const s = detectMarketStructure(quotesDaily);
            const f = detectFVG(quotesDaily);
            const l = detectLiquidity(s.swings);
            const keyLevels = { vwap: null, open: null, pdh: null, pdl: null };
            pspsH4 = detectPSP(quotesDaily, s, f, l, keyLevels).map(p => ({ ...p, tf: 'H4' as any }));
        }
        console.log(`H4 PSPs: ${pspsH4.length}`);

        console.log("DONE successfully.");

    } catch (e) {
        console.error("CRASHED:", e);
    }
}

run();
