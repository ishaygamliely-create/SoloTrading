
import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { formatAgeMs } from '../../lib/marketContext';
import { getSmtSignal } from '../../lib/smt'; // NEW
import { getSessionSignal } from '../../lib/session'; // NEW
import { applySessionSoftImpact } from '../../lib/sessionImpact'; // NEW
import { getBiasSignal } from '../../lib/bias'; // NEW
import { getValueZoneSignal } from '../../lib/valueZone'; // NEW
import { getStructureSignal } from '../../lib/structure'; // NEW
import { getConfluenceV1 } from '../../lib/confluence'; // NEW
import { detectPSP as detectPSPNew } from '../../lib/psp'; // RESTORED
import { calcExpansionLikelihood, getRangeStatus, getRangeHint } from '../../lib/liquidityRange'; // NEW
import { calculateEMAs, detectMarketStructure, detectFVG, detectLiquidity, calculateCompositeBias, calculateRiskLevels, detectTradeScenarios, detectTimeContext, detectPDRanges, detectOrderBlocks, detectBreakerBlocks, detectSweeps, detectTRE, Quote, ICTBlock, SweepEvent, TREState, TechnicalIndicators } from '../../lib/analysis';

const yahooFinance = new YahooFinance();

export async function GET(request: Request) {
    // Reference Symbols for SMT (Optimized: 5 Days for 15m swings)
    const startDateSMT = new Date();
    startDateSMT.setDate(startDateSMT.getDate() - 5);

    const refSymbols = ['ES=F', 'YM=F', 'RTY=F'];
    const pRefs = Promise.all(refSymbols.map(s =>
        yahooFinance.chart(s, { period1: startDateSMT, interval: '15m' })
            .catch(e => { console.warn(`SMT Fetch Failed for ${s}`, e); return null; })
    ));
    const { searchParams } = new URL(request.url);
    let symbol = searchParams.get('symbol');
    const intervalArg = searchParams.get('interval') || '1m';
    const interval = intervalArg as '1m' | '5m' | '15m' | '60m' | '1h' | '4h';

    let yahooInterval: any = interval;
    if (interval === '4h') yahooInterval = '60m';
    if (interval === '1h') yahooInterval = '60m';

    if (!symbol) {
        return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    if (symbol.toUpperCase() === 'MNQ') symbol = 'MNQ=F';
    else if (symbol.toUpperCase() === 'NQ') symbol = 'NQ=F';
    else if (symbol.toUpperCase() === 'ES') symbol = 'ES=F';
    else if (symbol.toUpperCase() === 'RTY') symbol = 'RTY=F';
    else if (symbol.toUpperCase() === 'YM') symbol = 'YM=F';

    try {

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        const startDateHTF = new Date();
        startDateHTF.setDate(startDateHTF.getDate() - 60);

        // Fetch Data for Multiple Tiers in Parallel

        const p1m = yahooFinance.chart(symbol, { period1: startDate, interval: '1m' }).catch(e => { console.error('p1m error', e); return null; });
        const p5m = yahooFinance.chart(symbol, { period1: startDateHTF, interval: '5m' }).catch(e => { console.error('p5m error', e); return null; });
        const p15m = yahooFinance.chart(symbol, { period1: startDateHTF, interval: '15m' }).catch(e => { console.error('p15m error', e); return null; });
        const p60m = yahooFinance.chart(symbol, { period1: startDateHTF, interval: '60m' }).catch(e => { console.error('p60m error', e); return null; });

        // Daily for Levels
        const startDaily = new Date();
        startDaily.setDate(startDaily.getDate() - 20);
        const pDaily = yahooFinance.chart(symbol, { period1: startDaily, interval: '1d' }).catch(e => { console.error('pDaily error', e); return null; });



        const [res1m, res5m, res15m, res60m, resDaily, resRefs] = await Promise.all([p1m, p5m, p15m, p60m, pDaily, pRefs]);



        // We choose 'resMain' based on requested interval for the CHART display
        let resMain = res1m;
        if (interval === '15m') resMain = res15m;
        if (interval === '60m' || interval === '1h') resMain = res60m;

        if (!resMain || !resMain.quotes || resMain.quotes.length === 0) {
            console.error('[API] No data found for main interval');
            return NextResponse.json({ error: 'No data found' }, { status: 404 });
        }

        // --- LEVEL CALCULATION (Daily) ---
        let pdh = null;
        let pdl = null;
        let trueDayOpen = 0;
        let trueWeekOpen: number | null = null; // Initialize to null for better UI handling

        if (resDaily && resDaily.quotes) {
            const quotesD = resDaily.quotes;
            const todayDay = new Date().getDate();
            let lastCompletedDay = quotesD[quotesD.length - 1];
            if (new Date(lastCompletedDay.date).getDate() === todayDay) {
                lastCompletedDay = quotesD[quotesD.length - 2];
            }
            if (lastCompletedDay) {
                pdh = lastCompletedDay.high;
                pdl = lastCompletedDay.low;
            }
            const today = quotesD[quotesD.length - 1];
            if (today && today.open !== null) trueDayOpen = today.open;

            // True Week Open Logic: Find the earliest day of the current week (Sun/Mon)
            const currentWeekStart = new Date();
            // Adjust to Sunday (0)
            const dayOfWeek = currentWeekStart.getDay();
            const diffToSun = dayOfWeek;
            currentWeekStart.setDate(currentWeekStart.getDate() - diffToSun);
            currentWeekStart.setHours(0, 0, 0, 0);

            // Loop backwards to find the first candle on or after Sunday
            // Since quotesD is daily, we look for Sunday or Monday candle of this week.
            for (let i = quotesD.length - 1; i >= 0; i--) {
                const qDate = new Date(quotesD[i].date);
                if (qDate >= currentWeekStart) {
                    // This candle is in the current week. 
                    // We want the earliest one we can find in this set.
                    if (quotesD[i].open !== null) {
                        trueWeekOpen = quotesD[i].open!;
                        // Keep searching backwards to see if there is an EARLIER one in this week (e.g. Sunday vs Monday)
                    }
                } else {
                    // We passed the start of the week. The LAST one we assigned is the Week Open.
                    break;
                }
            }
        }

        // Helper to process quotes
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

        let processedQuotes = quotes1m; // Default for 1m analysis
        if (interval === '5m') processedQuotes = quotes5m; // If chart asks for 5m
        // ... (We largely use 1m for main "Intraday" chart logic usually)

        // Use the requested interval for the main "quotes" response
        const mainQuotesForChart = interval === '1m' ? quotes1m : (interval === '5m' ? quotes5m : (interval === '15m' ? quotes15m : quotes60m));

        // Fallback PDH/PDL
        if ((!pdh || !pdl) && quotes1m.length > 0) {
            const lastQuote = quotes1m[quotes1m.length - 1];
            const currentDay = lastQuote.date.getDate();
            let i = quotes1m.length - 1;
            while (i >= 0 && quotes1m[i].date.getDate() === currentDay) i--;
            const prevDayQuotes: Quote[] = [];
            if (i >= 0) {
                const prevDay = quotes1m[i].date.getDate();
                while (i >= 0 && quotes1m[i].date.getDate() === prevDay) {
                    prevDayQuotes.push(quotes1m[i]);
                    i--;
                }
            }
            if (prevDayQuotes.length > 0) {
                pdh = Math.max(...prevDayQuotes.map(q => q.high));
                pdl = Math.min(...prevDayQuotes.map(q => q.low));
            }
        }

        const lastPrice = mainQuotesForChart[mainQuotesForChart.length - 1].close;

        // --- VWAP (M1) ---
        let vwap = null;
        let vwapSeries: (number | null)[] = [];
        let upper1Series: (number | null)[] = [];
        let lower1Series: (number | null)[] = [];
        let upper2Series: (number | null)[] = [];
        let lower2Series: (number | null)[] = [];
        let currentSD = 0;

        if (quotes1m.length > 0) {
            let cumPV = 0; let cumVol = 0; let cumP2V = 0;
            for (let i = 0; i < quotes1m.length; i++) {
                if (i > 0) {
                    const prevD = quotes1m[i - 1].date.getDate();
                    const currD = quotes1m[i].date.getDate();
                    if (prevD !== currD) { cumPV = 0; cumVol = 0; cumP2V = 0; }
                }
                const q = quotes1m[i];
                const typical = (q.high + q.low + q.close) / 3;
                cumPV += typical * q.volume;
                cumVol += q.volume;
                cumP2V += (typical * typical) * q.volume;

                if (cumVol > 0) {
                    const vwapVal = cumPV / cumVol;
                    vwap = vwapVal;
                    const variance = (cumP2V / cumVol) - (vwapVal * vwapVal);
                    const sd = Math.sqrt(Math.max(0, variance));
                    vwapSeries.push(vwapVal);
                    upper1Series.push(vwapVal + sd);
                    lower1Series.push(vwapVal - sd);
                    upper2Series.push(vwapVal + (sd * 2));
                    lower2Series.push(vwapVal - (sd * 2));
                } else {
                    vwapSeries.push(null); upper1Series.push(null); lower1Series.push(null); upper2Series.push(null); lower2Series.push(null);
                }
            }
            const lastIndex = vwapSeries.length - 1;
            currentSD = (lastIndex >= 0 && upper1Series[lastIndex] !== null) ? (upper1Series[lastIndex]! - vwapSeries[lastIndex]!) : 0;
        }

        // --- PRE-FETCH IMPORTS ---
        const { calculateEMAsWithSlope, detectTradeScenarios, detectSMT, detectMarketStructure, detectFVG, detectLiquidity, calculateCompositeBias, calculateRiskLevels, detectPSP, detectTimeContext, detectPDRanges, detectOrderBlocks, detectBreakerBlocks, detectSweeps, detectTRE, detectMarketRegime, calculateIndicators } = await import('../../lib/analysis');
        const { analyzeDXY } = await import('../../lib/macro'); // NEW IMPORT

        // --- ICT CONTEXT ---
        const timeContext = detectTimeContext(new Date(), quotes1m);
        const pdRanges = detectPDRanges(lastPrice, quotesDaily);
        const emas = calculateEMAsWithSlope(mainQuotesForChart);
        const structure = detectMarketStructure(mainQuotesForChart);
        const fvgs = detectFVG(mainQuotesForChart);
        const liquidity = detectLiquidity(structure.swings);

        // --- DXY CONTEXT (Fetch & Analyze) ---
        // Fetch DXY Intraday (1m for sync)
        let dxyQuotes: Quote[] = [];
        try {
            // Try DX-Y.NYB (Index) first
            let dxyRes = await yahooFinance.chart('DX-Y.NYB', { period1: startDate, interval: '1m' }).catch(() => null);

            // Fallback to DX=F (Futures) which is often more reliable on API
            if (!dxyRes || !dxyRes.quotes || dxyRes.quotes.length === 0) {
                dxyRes = await yahooFinance.chart('DX=F', { period1: startDate, interval: '1m' }).catch(() => null);
            }

            if (dxyRes && dxyRes.quotes) {
                dxyQuotes = processQuotes(dxyRes);
            }
        } catch (e) {
            console.warn('DXY Fetch Failed', e);
        }

        // Calculate DXY Context
        // We need DXY VWAP and Open. 
        // Quick Calc for DXY (Reuse logic or simplify)
        let dxyVWAP = null;
        let dxyOpen = null;
        if (dxyQuotes.length > 0) {
            const d0 = dxyQuotes[0]; // Start of fetch window (7 days ago) - inaccurate open? 
            // Ideally we find Today's open
            const todayDay = new Date().getDate();
            const dxyToday = dxyQuotes.filter(q => new Date(q.date).getDate() === todayDay);
            if (dxyToday.length > 0) {
                dxyOpen = dxyToday[0].open;
                // VWAP for DXY today
                let cumPV = 0; let cumVol = 0;
                dxyToday.forEach(q => { cumPV += ((q.high + q.low + q.close) / 3) * q.volume; cumVol += q.volume; });
                if (cumVol > 0) dxyVWAP = cumPV / cumVol;
            }
        }

        const dxyContext = analyzeDXY(dxyQuotes, dxyVWAP, dxyOpen);

        // --- TECHNICAL INDICATORS (M1) ---
        const technicals = calculateIndicators(quotes1m, vwapSeries);

        // --- ICT STRUCTURE (Multi-Timeframe) ---
        // M15
        const structure15m = detectMarketStructure(quotes15m);
        const fvgs15m = detectFVG(quotes15m);
        const obs15m = detectOrderBlocks(quotes15m, structure15m, fvgs15m, 'M15');
        const bbs15m = detectBreakerBlocks(quotes15m, structure15m, 'M15');

        // H1
        const structure60m = detectMarketStructure(quotes60m);
        const fvgs60m = detectFVG(quotes60m);
        const obs60m = detectOrderBlocks(quotes60m, structure60m, fvgs60m, 'H1');
        const bbs60m = detectBreakerBlocks(quotes60m, structure60m, 'H1');

        // H4
        const structureDaily = detectMarketStructure(quotesDaily);
        const fvgsDaily = detectFVG(quotesDaily);
        const obsDaily = detectOrderBlocks(quotesDaily, structureDaily, fvgsDaily, 'H4');
        const bbsDaily = detectBreakerBlocks(quotesDaily, structureDaily, 'H4');

        // --- LIQUIDITY & RANGE ---
        const sweeps = detectSweeps(mainQuotesForChart, pdRanges);
        const tre = detectTRE(quotesDaily);

        const ictStructure = [...obs15m, ...bbs15m, ...obs60m, ...bbs60m, ...obsDaily, ...bbsDaily];

        // Reference Symbols for SMT (Optimized: 2 Days only to prevent hangs)
        // ... (data fetching completed)

        const nowMs = Date.now(); // Moved up for Session Logic

        // --- SMT CALCULATION ---
        const smtReferenceData: Record<string, Quote[]> = {};
        if (resRefs && resRefs.length > 0) {
            resRefs.forEach((res: any, i: number) => {
                const refSymbol = refSymbols[i].replace('=F', ''); // Clean symbol name
                const refQuotes = processQuotes(res);
                if (refQuotes.length > 0) {
                    smtReferenceData[refSymbol] = refQuotes;
                }
            });
        }

        // --- SESSION & SOFT IMPACT ---
        const session = getSessionSignal(nowMs);

        /**
         * SMT Call with New Signature (Positional)
         */
        const smtSignalRaw = getSmtSignal(
            quotes15m,                 // MNQ
            smtReferenceData['ES'] || [], // MES
            smtReferenceData['YM'] || []  // MYM
        );

        const smtSignal = applySessionSoftImpact(smtSignalRaw, session);

        // Adapters for legacy functions that might still expect 'smt' array (e.g. calculateCompositeBias)
        // We will pass an empty array or a mock array if needed, OR update calculateCompositeBias next.
        // For now, let's create a mock legacy array to prevent breaking bias calculation immediately
        const smtLegacy: any[] = [];
        if (smtSignal.score > 0) {
            smtLegacy.push({ type: smtSignal.direction === 'LONG' ? 'BULLISH' : 'BEARISH', symbol: 'SMT_AGG' });
        }
        const bias = calculateCompositeBias(lastPrice, vwap, trueDayOpen, pdh, pdl, emas.ema20, emas.ema50, emas.ema200, smtLegacy, fvgs, liquidity);
        const risk = calculateRiskLevels(lastPrice, bias.score, structure, fvgs, liquidity, pdh, pdl);

        // --- MULTI-TIMEFRAME TRADE SCENARIOS ---
        const trendBias = (() => {
            if (quotes60m.length > 50) {
                const emas60 = calculateEMAsWithSlope(quotes60m);
                if (emas60.ema200 && lastPrice > emas60.ema200) return 'BULLISH';
                if (emas60.ema200 && lastPrice < emas60.ema200) return 'BEARISH';
            }
            return 'NEUTRAL';
        })();

        let scenarios: any[] = [];
        let mainRegime = undefined;

        // Pass dxyContext to Scenarios
        if (quotes1m.length > 0) {
            const s1m = detectMarketStructure(quotes1m);
            const f1m = detectFVG(quotes1m);
            const l1m = detectLiquidity(s1m.swings);
            const keyLevels = { vwap, open: trueDayOpen, pdh, pdl };
            const psps1m = detectPSP(quotes1m, s1m, f1m, l1m, keyLevels).map(p => ({ ...p, tf: 'M1-M5' as any }));

            // Calculate Regime (M1 Context)
            const regime1m = detectMarketRegime(quotes1m, s1m);
            if (interval === '1m') mainRegime = regime1m; // Use M1 regime if that's the view
            if (!mainRegime) mainRegime = regime1m; // Default fallback

            const scenarios1m = detectTradeScenarios(lastPrice, trendBias as any, s1m, f1m, l1m, vwap, 'M1-M5 (Scalp)', psps1m, timeContext, undefined, dxyContext, regime1m, technicals || undefined);
            scenarios = [...scenarios, ...scenarios1m];
        }

        if (quotes15m.length > 0) {
            const s = detectMarketStructure(quotes15m);
            const f = detectFVG(quotes15m);
            const l = detectLiquidity(s.swings);
            const keyLevels = { vwap, open: trueDayOpen, pdh, pdl };
            const pspsM15 = detectPSP(quotes15m, s, f, l, keyLevels).map(p => ({ ...p, tf: 'M15' as any }));

            const regime15m = detectMarketRegime(quotes15m, s);
            if (interval === '15m') mainRegime = regime15m;

            const scen = detectTradeScenarios(lastPrice, trendBias as any, s, f, l, vwap, 'M15', pspsM15, timeContext, undefined, dxyContext, regime15m);
            scenarios = [...scenarios, ...scen];
        }

        if (quotes60m.length > 0) {
            const s = detectMarketStructure(quotes60m);
            const f = detectFVG(quotes60m);
            const l = detectLiquidity(s.swings);
            const keyLevels = { vwap, open: trueDayOpen, pdh, pdl };
            const pspsH1 = detectPSP(quotes60m, s, f, l, keyLevels).map(p => ({ ...p, tf: 'H1' as any }));

            const regime60m = detectMarketRegime(quotes60m, s);
            if (interval === '60m' || interval === '1h') mainRegime = regime60m;

            // H1 usually doesn't need aggressive regime filtering effectively, but consistent
            const scen = detectTradeScenarios(lastPrice, trendBias as any, s, f, l, null, 'H1', pspsH1, timeContext, undefined, dxyContext, regime60m);
            scenarios = [...scenarios, ...scen];
        }

        // ... (H4 not using dxyContext currently to keep it simple, or add if needed)

        scenarios.sort((a, b) => b.score - a.score);
        const allPSPs = [...scenarios.filter(s => s.isPSP).map(s => ({ ...s }))]; // Simplification for PSP array, actually we computed PSPs above

        const safeMeta = resMain.meta || {};

        // --- NY MIDNIGHT & LAG DETECTION (Server-Side) ---
        // 1. Detect NY Midnight Timestamp (Strict)
        const nyDateFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/New_York',
            year: 'numeric', month: 'numeric', day: 'numeric',
            hour: 'numeric', minute: 'numeric', second: 'numeric',
            hour12: false
        });

        // Current Server Time
        // const nowMs = Date.now(); // Already declared above

        // Compute "Midnight in New York" relative to now
        // Simple approach: Get NY date parts for 'now', then construct date string for 00:00:00 NY
        const parts = nyDateFormatter.formatToParts(new Date(nowMs));
        const p = (type: string) => parts.find(p => p.type === type)?.value;
        const nyDateStr = `${p('month')}/${p('day')}/${p('year')} 00:00:00`;

        // 1. Detect NY Midnight Timestamp (Strict)
        // Corrected strict check: Year, Month, Day + 00:00
        const nowParts = nyDateFormatter.formatToParts(new Date(nowMs));
        const nowDay = parseInt(nowParts.find(p => p.type === 'day')?.value || '0');
        const nowMonth = parseInt(nowParts.find(p => p.type === 'month')?.value || '0');
        const nowYear = parseInt(nowParts.find(p => p.type === 'year')?.value || '0');

        let nyMidnightUtcMs = 0;
        let midnightOpen = 0;

        for (let i = quotes1m.length - 1; i >= 0; i--) {
            const qTimeMs = quotes1m[i].time * 1000;
            const qParts = nyDateFormatter.formatToParts(new Date(qTimeMs));

            const qHour = parseInt(qParts.find(p => p.type === 'hour')?.value || '0');
            const qMinute = parseInt(qParts.find(p => p.type === 'minute')?.value || '0');
            const qDay = parseInt(qParts.find(p => p.type === 'day')?.value || '0');
            const qMonth = parseInt(qParts.find(p => p.type === 'month')?.value || '0');
            const qYear = parseInt(qParts.find(p => p.type === 'year')?.value || '0');

            // Strict Match: Same Year, Month, Day AND 00:00
            if (qDay === nowDay && qMonth === nowMonth && qYear === nowYear
                && qHour === 0 && qMinute === 0) {
                nyMidnightUtcMs = qTimeMs;
                midnightOpen = quotes1m[i].open;
                break;
            }
        }

        // Fallback: If 00:00 candle missing, try to find the very first candle of the NY Day
        if (midnightOpen === 0 && quotes1m.length > 0) {
            for (let i = 0; i < quotes1m.length; i++) {
                const qTimeMs = quotes1m[i].time * 1000;
                const qParts = nyDateFormatter.formatToParts(new Date(qTimeMs));
                const qDay = parseInt(qParts.find(p => p.type === 'day')?.value || '0');
                const qMonth = parseInt(qParts.find(p => p.type === 'month')?.value || '0');
                const qYear = parseInt(qParts.find(p => p.type === 'year')?.value || '0');

                if (qDay === nowDay && qMonth === nowMonth && qYear === nowYear) {
                    nyMidnightUtcMs = qTimeMs;
                    midnightOpen = quotes1m[i].open;
                    break;
                }
            }
        }

        // 2. Buffered Bias (Deterministic Reducer)
        const { calculateBufferedBias } = await import('../../lib/analysis');
        const nyBiasMode = calculateBufferedBias(quotes1m, midnightOpen, nyMidnightUtcMs / 1000);

        // 3. Lag Detection (Refined)
        const lastQuote = quotes1m.length > 0 ? quotes1m[quotes1m.length - 1] : null;
        const lastBarMs = lastQuote ? lastQuote.date.getTime() : 0;
        const dataAgeMs = lastBarMs > 0 ? (nowMs - lastBarMs) : 0;

        // Format Last Bar Time in NY
        let lastBarTimeNy = 'N/A';
        if (lastBarMs > 0) {
            const lbParts = nyDateFormatter.formatToParts(new Date(lastBarMs));
            const lbH = lbParts.find(p => p.type === 'hour')?.value || '00';
            const lbM = lbParts.find(p => p.type === 'minute')?.value || '00';
            const lbS = lbParts.find(p => p.type === 'second')?.value || '00';
            lastBarTimeNy = `${lbH}:${lbM}:${lbS}`;
        }

        // Thresholds:
        // OK: < 2 mins (soft warning at 2?)
        // DELAYED: > 5 mins (Standard Yahoo Delay)
        // BLOCKED: > 15 mins (Safety Block)
        // MARKET_CLOSED: > 60 mins (Weekend/Post-Market)

        let status = 'OK';
        if (dataAgeMs >= 60 * 60000) status = 'MARKET_CLOSED';
        else if (dataAgeMs >= 15 * 60000) status = 'BLOCKED';
        else if (dataAgeMs >= 5 * 60000) status = 'DELAYED';

        const lagStatus = {
            stalenessMs: dataAgeMs, // Pure Data Age
            status,
            isBlocked: status === 'BLOCKED', // Closed doesn't necessarily "block" viewing, but signals stop
            isWarning: status === 'DELAYED',
            lastBarTimeNy // For UI Transparency
        };


        // --- END NY LOGIC ---

        const biasSignal = getBiasSignal({
            biasMode: nyBiasMode,
            price: lastPrice,
            midnightOpen,
            buffer: 1.0,
            dataStatus: lagStatus.status as any,
            session
        });

        const valueZoneSignal = getValueZoneSignal({
            price: lastPrice,
            pdh: pdh || 0,
            pdl: pdl || 0,
            session,
            dataStatus: lagStatus.status as any
        });

        const structureSignal = getStructureSignal({
            quotes: quotes15m,
            session,
            dataStatus: lagStatus.status as any
        });

        const pspResult = detectPSPNew(quotes15m);

        // Calculate Liquidity Range (extracted for Confluence usage)
        const liquidityRangeForConfluence = (() => {
            const currentRange = pdRanges ? (pdRanges.dailyHigh - pdRanges.dailyLow) : 0;
            const avgRange = (tre && tre.ratio > 0) ? (currentRange / tre.ratio) : 200;
            const adrPercent = avgRange > 0 ? (currentRange / avgRange) * 100 : 0;
            const status = getRangeStatus(currentRange, avgRange);
            const expansionLikelihood = calcExpansionLikelihood(currentRange, avgRange);

            return {
                status,
                currentRange,
                avgRange,
                adrPercent: Math.round(adrPercent),
                expansionLikelihood,
                hint: getRangeHint({
                    status,
                    adrPercent,
                    expansionLikelihood,
                    hasMajorSweep: sweeps ? sweeps.length > 0 : false,
                    pspState: pspResult.state,
                    pspDirection: pspResult.direction
                })
            };
        })();

        const confluenceSignal = getConfluenceV1({
            session,
            bias: biasSignal,
            valueZone: valueZoneSignal,
            structure: structureSignal,
            smt: smtSignal,
            psp: {
                status: pspResult.state === "NONE" ? "OFF" : "OK",
                direction: pspResult.direction,
                score: pspResult.score,
                hint: pspResult.debug.factors[0] || "No PSP setup",
                debug: { factors: pspResult.debug.factors }
            },
            liquidity: {
                status: "OK",
                direction: "NEUTRAL",
                score: (liquidityRangeForConfluence.status === "COMPRESSED" && liquidityRangeForConfluence.expansionLikelihood >= 60) ? 100 : 0,
                hint: liquidityRangeForConfluence.hint,
                debug: { factors: [`Range: ${liquidityRangeForConfluence.status}`] }
            },
            feedIsDelayed: lagStatus.isWarning || lagStatus.isBlocked
        });

        return NextResponse.json({
            ...safeMeta,
            symbol: safeMeta.symbol || symbol,
            price: lastPrice,
            trueDayOpen: trueDayOpen || (quotes1m.length > 0 ? quotes1m[0].open : 0),
            levels: {
                // ... levels
                trueDayOpen: trueDayOpen || (quotes1m.length > 0 ? quotes1m[0].open : 0),
                trueWeekOpen, pdh, pdl,
                vwap,
                sdValues: {
                    sd1_upper: vwap ? vwap + currentSD : null,
                    sd1_lower: vwap ? vwap - currentSD : null,
                    sd2_upper: vwap ? vwap + (currentSD * 2) : null,
                    sd2_lower: vwap ? vwap - (currentSD * 2) : null,
                    currentSD
                }
            },
            analysis: {
                interval: interval,
                emas: {
                    ema20: emas.ema20, ema50: emas.ema50, ema200: emas.ema200,
                    slope20: emas.slope20, slope50: emas.slope50, slope200: emas.slope200
                },
                structure: structureSignal, // Standardized v1
                fvgs: fvgs ? fvgs.slice(-5).reverse() : [],
                liquidity: liquidity ? liquidity.filter(l => Math.abs(l.price - lastPrice) / lastPrice < 0.05) : [],
                bias: biasSignal, // Standardized
                valueZone: valueZoneSignal, // NEW Standardized
                nyBiasMode, // NEW
                lagStatus,  // NEW
                nyMidnightUtcMs, // NEW
                midnightOpen,    // NEW
                marketContext: {
                    price: lastPrice,
                    pdh: pdRanges ? pdRanges.dailyHigh : 0,
                    pdl: pdRanges ? pdRanges.dailyLow : 0,
                    eq: pdRanges ? pdRanges.dailyEq : 0,
                    dailyRangePercent: tre ? tre.ratio * 100 : 0,
                    regime: mainRegime ? mainRegime.state : 'UNKNOWN',
                    biasMode: nyBiasMode,
                    dataStatus: lagStatus.status,
                    dataAgeMs: lagStatus.stalenessMs,
                    dataAgeLabel: formatAgeMs(lagStatus.stalenessMs),
                    lastBarNyTime: lagStatus.lastBarTimeNy,
                    nyMidnightUtcMs,
                    midnightOpen
                },
                confluence: confluenceSignal, // Standardized v1
                risk,
                scenarios,
                session, // NEW
                smt: smtSignal,
                psp: pspResult,
                psps: [],
                timeContext,
                pdRanges,
                liquidityRange: liquidityRangeForConfluence,
                ictStructure,
                sweeps,
                tre,
                dxyContext,
                regime: mainRegime,
                technical: technicals
            },
            // ... quotes
            quotes: interval === '1m' ? mainQuotesForChart.map((q, i) => ({
                ...q,
                vwap: vwapSeries[i] || null,
                upper1: upper1Series[i] || null,
                lower1: lower1Series[i] || null,
                upper2: upper2Series[i] || null,
                lower2: lower2Series[i] || null
            })) : []
        });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}
