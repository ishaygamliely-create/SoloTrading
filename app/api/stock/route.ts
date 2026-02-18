import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { formatAgeMs } from '../../lib/marketContext';
import { normalizeYahooToCandles } from '../../lib/providers/yahooAdapter'; // Adapter Import

import { getSmtSignal } from '../../lib/smt';
import { getSessionSignal } from '../../lib/session';
import { applySessionSoftImpact } from '../../lib/sessionImpact';
import { getBiasSignal } from '../../lib/bias';
import { getValueZoneSignal } from '../../lib/valueZone';
import { getStructureSignal } from '../../lib/structure';
import { getConfluenceV1 } from '../../lib/confluence';
import { detectPSP as detectPSPNew } from '../../lib/psp';
import { calcExpansionLikelihood, getRangeStatus, getRangeHint } from '../../lib/liquidityRange';
import { calculateEMAs, detectMarketStructure, detectFVG, detectLiquidity, calculateCompositeBias, calculateRiskLevels, detectTradeScenarios, detectTimeContext, detectPDRanges, detectOrderBlocks, detectBreakerBlocks, detectSweeps, detectTRE, Quote, ICTBlock, SweepEvent, TREState, TechnicalIndicators } from '../../lib/analysis';

const yahooFinance = new YahooFinance();

export async function GET(request: Request) {
    // Reference Symbols for SMT
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

    if (!symbol) symbol = "MNQ";

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

        // DXY Fetch (M1)
        const pDXY_Index = yahooFinance.chart('DX-Y.NYB', { period1: startDate, interval: '1m' }).catch(() => null);
        const pDXY_Fut = yahooFinance.chart('DX=F', { period1: startDate, interval: '1m' }).catch(() => null);

        const [res1m, res5m, res15m, res60m, resDaily, resRefs, dxyResIndex, dxyResFut] = await Promise.all([p1m, p5m, p15m, p60m, pDaily, pRefs, pDXY_Index, pDXY_Fut]);

        let resMain = res1m;
        if (interval === '15m') resMain = res15m;
        if (interval === '60m' || interval === '1h') resMain = res60m;

        if (!resMain || !resMain.quotes || resMain.quotes.length === 0) {
            console.error('[API] No data found for main interval');
            return NextResponse.json({ error: 'No data found' }, { status: 404 });
        }

        // --- ADAPTER NORMALIZATION ---
        const quotes1m = normalizeYahooToCandles(res1m);
        const quotes5m = normalizeYahooToCandles(res5m);
        const quotes15m = normalizeYahooToCandles(res15m);
        const quotes60m = normalizeYahooToCandles(res60m);
        const quotesDaily = normalizeYahooToCandles(resDaily);

        let dxyQuotes = normalizeYahooToCandles(dxyResIndex);
        if (dxyQuotes.length === 0) dxyQuotes = normalizeYahooToCandles(dxyResFut);

        // --- LEVEL CALCULATION (Daily) ---
        let pdh = null;
        let pdl = null;
        let trueDayOpen = 0;
        let trueWeekOpen: number | null = null;

        // Use normalized Daily quotes
        if (quotesDaily.length >= 2) {
            const todayDay = new Date().getDate();
            // Check last candle
            let lastCompleted = quotesDaily[quotesDaily.length - 1];
            if (new Date(lastCompleted.time * 1000).getDate() === todayDay) {
                lastCompleted = quotesDaily[quotesDaily.length - 2];
            }
            if (lastCompleted) {
                pdh = lastCompleted.high;
                pdl = lastCompleted.low;
            }
            // Today Open
            const today = quotesDaily[quotesDaily.length - 1];
            if (today) trueDayOpen = today.open;

            // True Week Open (Backwards scan)
            const currentWeekStart = new Date();
            const dayOfWeek = currentWeekStart.getDay();
            currentWeekStart.setDate(currentWeekStart.getDate() - dayOfWeek);
            currentWeekStart.setHours(0, 0, 0, 0);

            for (let i = quotesDaily.length - 1; i >= 0; i--) {
                const qTime = new Date(quotesDaily[i].time * 1000);
                if (qTime >= currentWeekStart) {
                    trueWeekOpen = quotesDaily[i].open;
                } else {
                    break;
                }
            }
        }

        // We choose 'resMain' based on requested interval for the CHART display
        // Just use normalized quotes mapping
        const mainQuotesForChart = interval === '1m' ? quotes1m : (interval === '5m' ? quotes5m : (interval === '15m' ? quotes15m : quotes60m));

        // Fallback PDH/PDL
        if ((!pdh || !pdl) && quotes1m.length > 0) {
            const lastQuote = quotes1m[quotes1m.length - 1];
            const currentDay = new Date(lastQuote.time * 1000).getDate();
            let i = quotes1m.length - 1;
            while (i >= 0 && new Date(quotes1m[i].time * 1000).getDate() === currentDay) i--;

            const prevDayQuotes: any[] = [];
            if (i >= 0) {
                const prevDay = new Date(quotes1m[i].time * 1000).getDate();
                while (i >= 0 && new Date(quotes1m[i].time * 1000).getDate() === prevDay) {
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
                    const prevD = new Date(quotes1m[i - 1].time * 1000).getDate();
                    const currD = new Date(quotes1m[i].time * 1000).getDate();
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
        const { analyzeDXY } = await import('../../lib/macro');

        // --- ICT CONTEXT ---
        const timeContext = detectTimeContext(new Date(), quotes1m);
        const pdRanges = detectPDRanges(lastPrice, quotesDaily);
        const emas = calculateEMAsWithSlope(mainQuotesForChart);
        const structure = detectMarketStructure(mainQuotesForChart);
        const fvgs = detectFVG(mainQuotesForChart);
        const liquidity = detectLiquidity(structure.swings);

        // Calculate DXY Context
        let dxyVWAP = null;
        let dxyOpen = null;
        if (dxyQuotes.length > 0) {
            const todayDay = new Date().getDate();
            const dxyToday = dxyQuotes.filter(q => new Date(q.time * 1000).getDate() === todayDay);
            if (dxyToday.length > 0) {
                dxyOpen = dxyToday[0].open;
                let cumPV = 0; let cumVol = 0;
                dxyToday.forEach(q => { cumPV += ((q.high + q.low + q.close) / 3) * q.volume; cumVol += q.volume; });
                if (cumVol > 0) dxyVWAP = cumPV / cumVol;
            }
        }
        const dxyContext = analyzeDXY(dxyQuotes, dxyVWAP, dxyOpen);

        // --- TECHNICAL INDICATORS (M1) ---
        const technicals = calculateIndicators(quotes1m, vwapSeries);

        // --- ICT STRUCTURE (Multi-Timeframe) ---
        const structure15m = detectMarketStructure(quotes15m);
        const fvgs15m = detectFVG(quotes15m);
        const obs15m = detectOrderBlocks(quotes15m, structure15m, fvgs15m, 'M15');
        const bbs15m = detectBreakerBlocks(quotes15m, structure15m, 'M15');

        const structure60m = detectMarketStructure(quotes60m);
        const fvgs60m = detectFVG(quotes60m);
        const obs60m = detectOrderBlocks(quotes60m, structure60m, fvgs60m, 'H1');
        const bbs60m = detectBreakerBlocks(quotes60m, structure60m, 'H1');

        const structureDaily = detectMarketStructure(quotesDaily);
        const fvgsDaily = detectFVG(quotesDaily);
        const obsDaily = detectOrderBlocks(quotesDaily, structureDaily, fvgsDaily, 'H4');
        const bbsDaily = detectBreakerBlocks(quotesDaily, structureDaily, 'H4');

        const sweeps = detectSweeps(mainQuotesForChart, pdRanges);
        const tre = detectTRE(quotesDaily);
        const ictStructure = [...obs15m, ...bbs15m, ...obs60m, ...bbs60m, ...obsDaily, ...bbsDaily];

        const nowMs = Date.now();

        // --- SMT CALCULATION ---
        const smtReferenceData: Record<string, Quote[]> = {};
        if (resRefs && resRefs.length > 0) {
            resRefs.forEach((res: any, i: number) => {
                const refSymbol = refSymbols[i].replace('=F', '');
                const refQuotes = normalizeYahooToCandles(res);
                if (refQuotes.length > 0) smtReferenceData[refSymbol] = refQuotes;
            });
        }

        const session = getSessionSignal(nowMs);
        const smtSignalRaw = getSmtSignal(quotes15m, smtReferenceData['ES'] || [], smtReferenceData['YM'] || []);
        const smtSignal = applySessionSoftImpact(smtSignalRaw, session);

        // Legacy adapter for composite bias
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

        if (quotes1m.length > 0) {
            const s1m = detectMarketStructure(quotes1m);
            const f1m = detectFVG(quotes1m);
            const l1m = detectLiquidity(s1m.swings);
            const keyLevels = { vwap, open: trueDayOpen, pdh, pdl };
            const psps1m = detectPSP(quotes1m, s1m, f1m, l1m, keyLevels).map(p => ({ ...p, tf: 'M1-M5' as any }));
            const regime1m = detectMarketRegime(quotes1m, s1m);
            if (interval === '1m') mainRegime = regime1m;
            if (!mainRegime) mainRegime = regime1m;
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
            const scen = detectTradeScenarios(lastPrice, trendBias as any, s, f, l, null, 'H1', pspsH1, timeContext, undefined, dxyContext, regime60m);
            scenarios = [...scenarios, ...scen];
        }

        scenarios.sort((a, b) => b.score - a.score);

        const safeMeta = resMain.meta || {};

        // NY Midnight & Lag Detection
        const nyDateFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/New_York',
            year: 'numeric', month: 'numeric', day: 'numeric',
            hour: 'numeric', minute: 'numeric', second: 'numeric',
            hour12: false
        });

        const parts = nyDateFormatter.formatToParts(new Date(nowMs));
        const nowDay = parseInt(parts.find(p => p.type === 'day')?.value || '0');
        const nowMonth = parseInt(parts.find(p => p.type === 'month')?.value || '0');
        const nowYear = parseInt(parts.find(p => p.type === 'year')?.value || '0');

        let nyMidnightUtcMs = 0;
        let midnightOpen = 0;

        for (let i = quotes1m.length - 1; i >= 0; i--) {
            const qTimeMs = quotes1m[i].time * 1000;
            const qParts = nyDateFormatter.formatToParts(new Date(qTimeMs));
            const qDay = parseInt(qParts.find(p => p.type === 'day')?.value || '0');
            const qMonth = parseInt(qParts.find(p => p.type === 'month')?.value || '0');
            const qYear = parseInt(qParts.find(p => p.type === 'year')?.value || '0');
            const qHour = parseInt(qParts.find(p => p.type === 'hour')?.value || '0');
            const qMinute = parseInt(qParts.find(p => p.type === 'minute')?.value || '0');

            if (qDay === nowDay && qMonth === nowMonth && qYear === nowYear && qHour === 0 && qMinute === 0) {
                nyMidnightUtcMs = qTimeMs;
                midnightOpen = quotes1m[i].open;
                break;
            }
        }

        if (midnightOpen === 0 && quotes1m.length > 0) {
            for (let i = 0; i < quotes1m.length; i++) {
                const qTimeMs = quotes1m[i].time * 1000;
                const qParts = nyDateFormatter.formatToParts(new Date(qTimeMs));
                const qDay = parseInt(qParts.find(p => p.type === 'day')?.value || '0');
                if (qDay === nowDay) {
                    nyMidnightUtcMs = qTimeMs;
                    midnightOpen = quotes1m[i].open;
                    break;
                }
            }
        }

        const { calculateBufferedBias } = await import('../../lib/analysis');
        const nyBiasMode = calculateBufferedBias(quotes1m, midnightOpen, nyMidnightUtcMs / 1000);

        const lastQuote = quotes1m.length > 0 ? quotes1m[quotes1m.length - 1] : null;
        const lastBarMs = lastQuote ? lastQuote.time * 1000 : 0;
        const dataAgeMs = lastBarMs > 0 ? (nowMs - lastBarMs) : 0;

        let lastBarTimeNy = 'N/A';
        if (lastBarMs > 0) {
            const lbParts = nyDateFormatter.formatToParts(new Date(lastBarMs));
            const lbH = lbParts.find(p => p.type === 'hour')?.value || '00';
            const lbM = lbParts.find(p => p.type === 'minute')?.value || '00';
            const lbS = lbParts.find(p => p.type === 'second')?.value || '00';
            lastBarTimeNy = `${lbH}:${lbM}:${lbS}`;
        }

        let status = 'OK';
        if (dataAgeMs >= 60 * 60000) status = 'MARKET_CLOSED';
        else if (dataAgeMs >= 15 * 60000) status = 'BLOCKED';
        else if (dataAgeMs >= 5 * 60000) status = 'DELAYED';

        const lagStatus = {
            stalenessMs: dataAgeMs,
            status,
            isBlocked: status === 'BLOCKED',
            isWarning: status === 'DELAYED',
            lastBarTimeNy
        };

        // Derive market status for reliability engine
        const mktStatus: "OPEN" | "CLOSED" = (lagStatus.status === 'MARKET_CLOSED') ? "CLOSED" : "OPEN";
        // lastBarMs for 15m quotes (used by structure/bias)
        const lastBar15mMs = quotes15m.length > 0 ? quotes15m[quotes15m.length - 1].time * 1000 : lastBarMs;

        const biasSignal = getBiasSignal({
            price: lastPrice,
            midnightOpen,
            dataStatus: lagStatus.status as any,
            session,
            quotes: quotes15m,
            lastBarTimeMs: lastBar15mMs,
            source: "YAHOO",
            marketStatus: mktStatus,
        });

        const valueZoneSignal = getValueZoneSignal({
            price: lastPrice,
            pdh: pdh || 0,
            pdl: pdl || 0,
            session,
            dataStatus: lagStatus.status as any,
            lastBarTimeMs: lastBar15mMs,
            source: "YAHOO",
            marketStatus: mktStatus,
        });

        const structureSignal = getStructureSignal({
            quotes: quotes15m,
            dataStatus: lagStatus.status as any,
            biasDirection: biasSignal.direction,
            lastBarTimeMs: lastBar15mMs,
            source: "YAHOO",
            marketStatus: mktStatus,
        });

        const pspResult = detectPSPNew(quotes15m);

        // Calculate Liquidity Range using normalized data
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
                structure: structureSignal,
                fvgs: fvgs ? fvgs.slice(-5).reverse() : [],
                liquidity: liquidity ? liquidity.filter(l => Math.abs(l.price - lastPrice) / lastPrice < 0.05) : [],
                bias: biasSignal,
                valueZone: valueZoneSignal,
                nyBiasMode,
                lagStatus,
                nyMidnightUtcMs,
                midnightOpen,
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
                confluence: confluenceSignal,
                risk,
                scenarios,
                session,
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
            quotes: interval === '1m' ? mainQuotesForChart.map((q, i) => ({
                ...q,
                date: new Date(q.time * 1000), // Compatibility
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
