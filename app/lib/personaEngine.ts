import { PersonaProfile, PersonaExtractionResult, ScenarioMeta, SetupFamily, MarketRegime, RiskProfile } from '../types/persona';
import { TradeScenario } from './analysis';

const WEIGHTS_KEY = 'vpx_persona_weights';
const WEIGHT_MIN = -2;
const WEIGHT_MAX = 2;

/**
 * Heuristic-based extraction for the Trading Persona Profile.
 * In a future version, this could call an LLM, but results are always normalized here.
 */
/**
 * Heuristic-based extraction for the Trading Persona Profile.
 * Implements a strict lexicon check to ensure valid trading context.
 */
export function extractProfile(text: string): PersonaExtractionResult {
    const lower = text.toLowerCase();

    // 1. Trading Lexicon (Mandatory for confidence)
    const lexicon = {
        styles: ['scalp', 'swing', 'day', 'position', 'investor', 'intra', 'sod', 'eod'],
        timeframes: ['m1', 'm3', 'm5', 'm15', 'h1', 'h4', 'daily', 'minute', 'hour', ' tf'],
        concepts: ['liquidity', 'sweep', 'bos', 'fvg', 'gap', 'trend', 'reversal', 'value', 'structure', 'context', 'news', 'bias', 'smt', 'divergence', 'macro', 'reversion', 'vwap', 'bands', 'sod'],
        instruments: ['mnq', 'nq', 'es', 'mes', 'nasdaq', 'future', 'ticker', 'symbol']
    };

    const signals: string[] = [];
    let points = 0;

    // Detection & Scoring
    const hasStyle = lexicon.styles.filter(s => lower.includes(s));
    const hasTF = lexicon.timeframes.filter(tf => lower.includes(tf));
    const hasConcept = lexicon.concepts.filter(c => lower.includes(c));
    const hasInstrument = lexicon.instruments.filter(i => lower.includes(i));

    if (hasStyle.length > 0) { points += 2; signals.push(`Style: ${hasStyle.join(', ')}`); }
    if (hasTF.length > 0) { points += 2; signals.push(`Timeframe: ${hasTF.join(', ')}`); }
    if (hasConcept.length > 0) { points += 1.5 * hasConcept.length; signals.push(`Concepts: ${hasConcept.slice(0, 3).join(', ')}`); }
    if (hasInstrument.length > 0) { points += 1; signals.push(`Instrument: ${hasInstrument.join(', ')}`); }

    // Normalize confidence (Max points ~10)
    const confidence = Math.min(1, points / 8);

    // Heuristic Matching for Profile Data
    const isScalper = lower.includes('scalp') || lower.includes('m1') || lower.includes('m3');
    const isSwing = lower.includes('swing') || lower.includes('h1') || lower.includes('daily');

    const style: PersonaProfile['style'] = isScalper ? 'SCALPER' : (isSwing ? 'SWING_TRADER' : 'DAY_TRADER');

    const preferredFamilies: SetupFamily[] = [];
    if (lower.includes('liquidity') || lower.includes('sweep') || lower.includes('gap') || lower.includes('smt') || lower.includes('macro')) preferredFamilies.push('LIQUIDITY');
    if (lower.includes('structure') || lower.includes('bos') || lower.includes('trend')) preferredFamilies.push('STRUCTURE');
    if (lower.includes('reversal') || lower.includes('fade') || lower.includes('reversion') || lower.includes('vwap')) preferredFamilies.push('VALUE');

    const risk: RiskProfile = lower.includes('tight') ? 'TIGHT' : (lower.includes('wide') ? 'WIDE' : 'MEDIUM');

    const profile: PersonaProfile = {
        name: "Extracted Profile",
        style,
        preferredFamilies: preferredFamilies.length > 0 ? preferredFamilies : ['STRUCTURE', 'LIQUIDITY'],
        preferredRegimes: lower.includes('trend') ? ['TREND'] : (lower.includes('range') ? ['RANGE'] : ['TREND', 'REVERSAL']),
        riskTolerance: risk,
        timeframes: isScalper ? ['M1', 'M5'] : (isSwing ? ['H1', 'H4'] : ['M15', 'H1']),
        newsAvoidance: lower.includes('avoid news') || lower.includes('no news')
    };

    return {
        profile,
        confidence,
        rawSignals: signals.length > 0 ? signals : ['No trading keywords detected']
    };
}

/**
 * Deterministically ranks scenarios based on the user's profile and adaptive weights.
 */
export function rankScenarios(
    scenarios: TradeScenario[],
    profile: PersonaProfile,
    weights: Record<string, number>
): Array<{ scenario: TradeScenario; score: number; why: string[] }> {
    return scenarios.map(s => {
        let score = s.confidence?.score || 0;
        const reasons: string[] = [`Base institutional score: ${score}`];

        if (!s.meta) return { scenario: s, score, why: reasons };

        // 1. Family Match (+10)
        if (profile.preferredFamilies.includes(s.meta.family)) {
            score += 10;
            reasons.push(`Matches preferred setup family: ${s.meta.family} (+10)`);
        }

        // 2. Regime Match (+10)
        if (profile.preferredRegimes.includes(s.meta.regime)) {
            score += 10;
            reasons.push(`Matches preferred market regime: ${s.meta.regime} (+10)`);
        }

        // 3. Risk Profile Penalty (-10 if mismatch)
        if (profile.riskTolerance === 'TIGHT' && s.meta.risk === 'WIDE') {
            score -= 10;
            reasons.push(`Risk mismatch: Profile is TIGHT, Setup is WIDE (-10)`);
        }

        // 4. Adaptive Weights (Bounded)
        const LEARNABLE_PREFIXES = ['setup:', 'family:']; // keep MVP tight

        s.meta.tags.forEach(tag => {
            if (!LEARNABLE_PREFIXES.some(p => tag.startsWith(p))) return;

            const w = weights[tag] || 0;
            if (w !== 0) {
                const bonus = w * 5; // Scale weight to meaningful impact
                score += bonus;
                reasons.push(`Learning bonus [${tag}]: ${bonus > 0 ? '+' : ''}${bonus.toFixed(1)}`);
            }
        });

        return { scenario: s, score, why: reasons };
    }).sort((a, b) => b.score - a.score);
}

/**
 * Persists feedback for a specific tag to LocalStorage.
 */
export function updateWeight(tag: string, worked: boolean) {
    if (typeof window === 'undefined') return;

    const weights = getStoredWeights();
    const current = weights[tag] || 0;
    const change = worked ? 0.2 : -0.2;

    weights[tag] = Math.max(WEIGHT_MIN, Math.min(WEIGHT_MAX, current + change));

    localStorage.setItem(WEIGHTS_KEY, JSON.stringify(weights));
}

export function getStoredWeights(): Record<string, number> {
    if (typeof window === 'undefined') return {};
    try {
        const stored = localStorage.getItem(WEIGHTS_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
}
