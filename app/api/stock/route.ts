import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { formatAgeMs } from '../../lib/marketContext';
import { normalizeYahooToCandles } from '../../lib/providers/yahooAdapter';
import { getBestCandles } from '../../lib/marketDataProviders';

import { getSmtSignal } from '../../lib/smt';
import { getSessionSignal } from '../../lib/session';
import { applySessionSoftImpact } from '../../lib/sessionImpact';
import { getBiasSignal } from '../../lib/bias';
import { getValueZoneSignal } from '../../lib/valueZone';
import { getStructureSignal } from '../../lib/structure';
import { getConfluenceV1 } from '../../lib/confluence';
import { detectPSP as detectPSPNew } from '../../lib/psp';
import { calcExpansionLikelihood, getRangeStatus, getRangeHint } from '../../lib/liquidityRange';
import { getTrueOpenSignal } from '../../lib/trueOpen';
import { calculateEMAs, detectMarketStructure, detectFVG, detectLiquidity, calculateCompositeBias, calculateRiskLevels, detectTradeScenarios, detectTimeContext, detectPDRanges, detectOrderBlocks, detectBreakerBlocks, detectSweeps, detectTRE, Quote, ICTBlock, SweepEvent, TREState, TechnicalIndicators } from '../../lib/analysis';
import { calculateVxr } from '../../lib/indicators/vxr';

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
        const startDaily = new Date();
        startDaily.setDate(startDaily.getDate() - 20);

        // --- PRIORITY FETCH: BROKER > TRADINGVIEW > YAHOO ---
        // Each timeframe gets its own FeedResult with sourceUsed + lastBarTimeMs
        const [feed1m, feed5m, feed15m, feed60m, feedDaily] = await Promise.all([
            getBestCandles(symbol, '1m', startDate),
            getBestCandles(symbol, '5m', startDateHTF),
            getBestCandles(symbol, '15m', startDateHTF),
            getBestCandles(symbol, '60m', startDateHTF),
            getBestCandles(symbol, '1d', startDaily),
        ]);

        // SMT ref symbols and DXY stay on Yahoo (correlation data, no priority needed)
        const pRefs_resolved = await pRefs;
        const pDXY_Index = yahooFinance.chart('DX-Y.NYB', { period1: startDate, interval: '1m' }).catch(() => null);
        const pDXY_Fut = yahooFinance.chart('DX=F', { period1: startDate, interval: '1m' }).catch(() => null);
        const [dxyResIndex, dxyResFut] = await Promise.all([pDXY_Index, pDXY_Fut]);
        const resRefs = pRefs_resolved;

        const quotes1m = feed1m.candles;
        const quotes5m = feed5m.candles;
        const quotes15m = feed15m.candles;
        const quotes60m = feed60m.candles;
        const quotesDaily = feedDaily.candles;

        // Per-feed meta helpers — passed to indicators for correct reliability
        const meta1m = { sourceUsed: feed1m.sourceUsed, lastBarTimeMs: feed1m.lastBarTimeMs, fallbackFrom: feed1m.fallbackFrom };
        const meta5m = { sourceUsed: feed5m.sourceUsed, lastBarTimeMs: feed5m.lastBarTimeMs, fallbackFrom: feed5m.fallbackFrom };
        const meta15m = { sourceUsed: feed15m.sourceUsed, lastBarTimeMs: feed15m.lastBarTimeMs, fallbackFrom: feed15m.fallbackFrom };
        const meta1d = { sourceUsed: feedDaily.sourceUsed, lastBarTimeMs: feedDaily.lastBarTimeMs, fallbackFrom: feedDaily.fallbackFrom };

        let dxyQuotes = normalizeYahooToCandles(dxyResIndex);
        if (dxyQuotes.length === 0) dxyQuotes = normalizeYahooToCandles(dxyResFut);

        // Validate main data
        const mainQuotesRaw = interval === '15m' ? quotes15m : interval === '60m' || interval === '1h' ? quotes60m : quotes1m;
        if (!mainQuotesRaw || mainQuotesRaw.length === 0) {
            console.error('[API] No data found for main interval');
            return NextResponse.json({ error: 'No data found' }, { status: 404 });
        }

        // --- LEVEL CALCULATION (Daily) ---
        let pdh = null;
        let pdl = null;
        let trueDayOpen = 0;
        let trueWeekOpen: number | null = null;

        // NY timezone helper: get weekday/hour/minute for a unix-seconds timestamp
        const nyTzId = 'America/New_York';
        const getNyParts = (timeSec: number) => {
            const d = new Date(timeSec * 1000);
            const parts = new Intl.DateTimeFormat('en-US', {
                timeZone: nyTzId,
                hour: 'numeric', minute: 'numeric', weekday: 'short',
                hour12: false,
            }).formatToParts(d);
            const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
            return {
                weekday: get('weekday'),   // 'Mon', 'Tue', ...
                hour: parseInt(get('hour'), 10),
                minute: parseInt(get('minute'), 10),
            };
        };

        // PDH/PDL from daily candles
        if (quotesDaily.length >= 2) {
            const todayDay = new Date().getDate();
            let lastCompleted = quotesDaily[quotesDaily.length - 1];
            if (new Date(lastCompleted.time * 1000).getDate() === todayDay) {
                lastCompleted = quotesDaily[quotesDaily.length - 2];
            }
            if (lastCompleted) {
                pdh = lastCompleted.high;
                pdl = lastCompleted.low;
            }
        }

        // --- TRUE DAY OPEN: 09:30 NY bar from 1m (fallback 5m) ---
        // Track which feed produced the anchor for per-feed reliability meta
        let dayOpenFoundFrom: "1m" | "5m" | "1d" | "none" = "none";
        const intraday = quotes1m.length > 0 ? quotes1m : quotes5m;
        const intradaySource: "1m" | "5m" = quotes1m.length > 0 ? "1m" : "5m";
        for (let i = intraday.length - 1; i >= 0; i--) {
            const p = getNyParts(intraday[i].time);
            if (p.hour === 9 && p.minute === 30) {
                trueDayOpen = intraday[i].open;
                dayOpenFoundFrom = intradaySource;
                break;
            }
            // Stop scanning if we go past today (more than 24h back)
            if (Date.now() / 1000 - intraday[i].time > 24 * 3600) break;
        }
        // Fallback: daily candle open
        if (!trueDayOpen && quotesDaily.length > 0) {
            const today = quotesDaily[quotesDaily.length - 1];
            if (today) { trueDayOpen = today.open; dayOpenFoundFrom = "1d"; }
        }

        // --- TRUE WEEK OPEN: first trading bar of the current week ---
        // Handles holiday Mondays (e.g. Presidents' Day): finds earliest bar Mon–Fri of THIS week.
        // Strategy: estimate "this Monday 00:00 NY" using current weekday, then find the
        // first bar on or after that time (skipping Sat/Sun).
        const intradayForWeek = quotes1m.length > 0 ? quotes1m : quotes5m;
        const weekdayToIdx: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
        const tradingDays = new Set(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
        const nowSec = Math.floor(Date.now() / 1000);
        const nowWeekday = getNyParts(nowSec).weekday;
        // Days elapsed since Monday (Mon=0, Tue=1, ..., Fri=4; Sat/Sun fall to next)
        const daysFromMon = Math.max(0, (weekdayToIdx[nowWeekday] ?? 1) - 1);
        // Approximate start of week (Monday) — 1 day extra buffer for timezone drift
        const weekStartApproxSec = nowSec - (daysFromMon + 1) * 86400;

        // Scan forward: first bar on or after weekStartApproxSec that is Mon–Fri
        for (let i = 0; i < intradayForWeek.length; i++) {
            const bar = intradayForWeek[i];
            if (bar.time < weekStartApproxSec) continue;
            const p = getNyParts(bar.time);
            if (tradingDays.has(p.weekday)) {
                trueWeekOpen = bar.open;
                break;
            }
        }
        // Fallback: daily candles (same approach — first trading day of current week)
        if (trueWeekOpen === null && quotesDaily.length > 0) {
            for (let i = 0; i < quotesDaily.length; i++) {
                const bar = quotesDaily[i];
                if (bar.time < weekStartApproxSec) continue;
                const p = getNyParts(bar.time);
                if (tradingDays.has(p.weekday)) {
                    trueWeekOpen = bar.open;
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
        const smtSignalRaw = getSmtSignal(
            quotes15m,
            smtReferenceData['ES'] || [],
            smtReferenceData['YM'] || [],
            {                                       // MNQ 15m feed meta for reliability
                sourceUsed: meta15m.sourceUsed,
                lastBarTimeMs: meta15m.lastBarTimeMs ?? undefined,
                fallbackFrom: meta15m.fallbackFrom,
            }
        );
        const smtSignal = applySessionSoftImpact(smtSignalRaw, session);
        // Transparency: SMT refs (MES/MYM) always fetched from Yahoo for correlation
        if (smtSignal.debug) {
            (smtSignal.debug as any).refsSourceNote = `Refs: YAHOO (correlation)`;
        }

        // Legacy adapter for composite bias
        const smtLegacy: any[] = [];
        if (smtSignal.score > 0) {
            smtLegacy.push({ type: smtSignal.direction === 'LONG' ? 'BULLISH' : 'BEARISH', symbol: 'SMT_AGG' });
        }
        const bias = calculateCompositeBias(lastPrice, vwap, trueDayOpen, pdh, pdl, emas.ema20, emas.ema50, emas.ema200, smtLegacy, fvgs, liquidity);
        const risk = calculateRiskLevels(lastPrice, bias.score, structure, fvgs, liquidity, pdh, pdl);



        const safeMeta: Record<string, any> = {};

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
        const lastBar15mMs = meta15m.lastBarTimeMs ?? (quotes15m.length > 0 ? quotes15m[quotes15m.length - 1].time * 1000 : lastBarMs);
        const lastBar1mMs = meta1m.lastBarTimeMs ?? (quotes1m.length > 0 ? quotes1m[quotes1m.length - 1].time * 1000 : lastBarMs);

        // Preliminary bias — direction only, used for structure ordering
        // (Full enriched bias is recomputed below with cross-indicator context)
        const prelimBias = getBiasSignal({
            price: lastPrice,
            midnightOpen,
            dataStatus: lagStatus.status as any,
            session,
            quotes: quotes15m,
            lastBarTimeMs: lastBar1mMs,
            source: meta1m.sourceUsed,
            marketStatus: mktStatus,
        });

        const valueZoneSignal = getValueZoneSignal({
            price: lastPrice,
            pdh: pdh || 0,
            pdl: pdl || 0,
            session,
            dataStatus: lagStatus.status as any,
            lastBarTimeMs: lastBar15mMs,          // valueZone uses 15m
            source: meta15m.sourceUsed,
            marketStatus: mktStatus,
            dxy: dxyContext, // Value V2: Pass DXY Context
        });
        // Transparency: note if PDH/PDL (daily) came from a different source than current price (15m)
        if (meta1d.sourceUsed !== meta15m.sourceUsed) {
            if (valueZoneSignal.debug) {
                (valueZoneSignal.debug as any).levelsMixedSource =
                    `~ Levels source differs: daily=${meta1d.sourceUsed}, price=${meta15m.sourceUsed}`;
            }
        }

        const structureSignal = getStructureSignal({
            quotes: quotes15m,
            dataStatus: lagStatus.status as any,
            biasDirection: prelimBias.direction,
            lastBarTimeMs: lastBar15mMs,
            source: meta15m.sourceUsed,
            marketStatus: mktStatus,
        });

        // Initialize PSP early for liquidity and confluence
        let pspResult: any = { state: 'NONE', direction: 'NEUTRAL', score: 0, checklist: {}, debug: { factors: [] } };
        if (quotes15m.length > 50) {
            pspResult = detectPSPNew(quotes15m);
        }

        // True Open Engine V3 — clarity scoring, day-only mode when week missing
        // Compute ATR14 from 15m candles for the trueOpen engine
        const atr14ForTrueOpen = (() => {
            const slice = quotes15m.slice(-15);
            if (slice.length < 2) return 10;
            let sum = 0;
            for (let i = 1; i < slice.length; i++) {
                sum += Math.max(
                    slice[i].high - slice[i].low,
                    Math.abs(slice[i].high - slice[i - 1].close),
                    Math.abs(slice[i].low - slice[i - 1].close)
                );
            }
            return sum / (slice.length - 1);
        })();
        // Select feed meta that produced the Day Open anchor
        const trueOpenFeedMeta = {
            sourceUsed: (
                dayOpenFoundFrom === "1m" ? meta1m.sourceUsed :
                    dayOpenFoundFrom === "5m" ? meta5m.sourceUsed :
                        dayOpenFoundFrom === "1d" ? meta1d.sourceUsed :
                            meta15m.sourceUsed
            ),
            lastBarTimeMs: (
                dayOpenFoundFrom === "1m" ? meta1m.lastBarTimeMs :
                    dayOpenFoundFrom === "5m" ? meta5m.lastBarTimeMs :
                        dayOpenFoundFrom === "1d" ? meta1d.lastBarTimeMs :
                            meta15m.lastBarTimeMs
            ),
            fallbackFrom: (
                dayOpenFoundFrom === "1m" ? meta1m.fallbackFrom :
                    dayOpenFoundFrom === "5m" ? meta5m.fallbackFrom :
                        dayOpenFoundFrom === "1d" ? meta1d.fallbackFrom :
                            meta15m.fallbackFrom
            ),
            marketStatus: mktStatus,
        };
        const trueOpenSignal = getTrueOpenSignal({
            currentPrice: lastPrice,
            atr14: atr14ForTrueOpen,
            dayOpenPrice: trueDayOpen || null,
            weekOpenPrice: trueWeekOpen ?? null,
            feedMeta: trueOpenFeedMeta,
            valueZone: ((valueZoneSignal?.debug as any)?.label as "PREMIUM" | "DISCOUNT" | "EQUILIBRIUM" | null) ?? null,
        });

        // Enriched Bias V4 — recomputed with full cross-indicator context
        const biasSignal = getBiasSignal({
            price: lastPrice,
            midnightOpen,
            dataStatus: lagStatus.status as any,
            session,
            quotes: quotes15m,
            lastBarTimeMs: lastBar1mMs,
            source: meta1m.sourceUsed,
            marketStatus: mktStatus,
            // Cross-indicator confluence
            trueOpenAlignment: ((trueOpenSignal?.debug as any)?.alignment as string | null) ?? null,
            valueZone: ((valueZoneSignal?.debug as any)?.label as string | null) ?? null,
            structureDirection: (structureSignal?.direction as string | null) ?? null,
        });

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

        // --- MULTI-TIMEFRAME TRADE SCENARIOS ---
        // Trend Bias now derived from Structure Signal V2 (Regime + Direction)
        const trendBias = (() => {
            const dir = structureSignal?.direction;
            const regime = (structureSignal?.debug as any)?.regime;

            if (regime === 'TRENDING') {
                if (dir === 'LONG') return 'STRONG BULLISH';
                if (dir === 'SHORT') return 'STRONG BEARISH';
            }
            if (dir === 'LONG') return 'BULLISH';
            if (dir === 'SHORT') return 'BEARISH';
            return 'NEUTRAL';
        })();

        let scenarios: any[] = [];
        let mainRegime = undefined;

        // --- VOLUME X-RAY (VXR) ---
        const vxrProfiles = calculateVxr(quotes15m, quotes1m, symbol.includes('NQ') || symbol.includes('ES') ? 0.5 : 0.25);
        const lastVxr = vxrProfiles.length > 0 ? vxrProfiles[vxrProfiles.length - 1] : null;

        if (quotes1m.length > 0) {
            const s1m = detectMarketStructure(quotes1m);
            const f1m = detectFVG(quotes1m);
            const l1m = detectLiquidity(s1m.swings);
            const keyLevels = { vwap, open: trueDayOpen, pdh, pdl };

            const psps1m = detectPSP(quotes1m, s1m, f1m, l1m, keyLevels).map(p => ({ ...p, tf: 'M1-M5' as any }));
            const regime1m = detectMarketRegime(quotes1m, s1m);
            if (interval === '1m') mainRegime = regime1m;
            if (!mainRegime) mainRegime = regime1m;
            const scenarios1m = detectTradeScenarios(lastPrice, trendBias as any, s1m, f1m, l1m, vwap, 'M1-M5 (Scalp)', psps1m, timeContext, undefined, dxyContext, regime1m, technicals || undefined, lastVxr || undefined);
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
            const scen = detectTradeScenarios(lastPrice, trendBias as any, s, f, l, vwap, 'M15', pspsM15, timeContext, undefined, dxyContext, regime15m, undefined, lastVxr || undefined);
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
            const scen = detectTradeScenarios(lastPrice, trendBias as any, s, f, l, null, 'H1', pspsH1, timeContext, undefined, dxyContext, regime60m, undefined, lastVxr || undefined);
            scenarios = [...scenarios, ...scen];
        }

        scenarios.sort((a, b) => b.score - a.score);

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
            feedIsDelayed: lagStatus.isWarning || lagStatus.isBlocked,
            trueOpen: trueOpenSignal,
            vxr: lastVxr ? {
                status: 'OK',
                direction: 'NEUTRAL',
                score: 0,
                debug: { hvn: lastVxr.hvn, vah: lastVxr.vah, val: lastVxr.val, factors: [] }
            } : { status: 'OFF', direction: 'NEUTRAL', score: 0, debug: { factors: [] } }
        });

        return NextResponse.json({
            ...safeMeta,
            symbol: safeMeta.symbol || symbol,
            price: lastPrice,
            regularMarketPrice: lastPrice, // Fallback for UI display when quote is missing
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
                trueOpen: trueOpenSignal,
                psps: [],
                timeContext,
                pdRanges,
                liquidityRange: liquidityRangeForConfluence,
                ictStructure,
                sweeps,
                tre,
                dxyContext,
                regime: mainRegime,
                technical: technicals,
                vxr: {
                    profiles: vxrProfiles.slice(-40), // Send last 40 M15 bars for the heatmap
                    lastProfile: lastVxr
                }
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
