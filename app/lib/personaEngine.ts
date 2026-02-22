import { PersonaProfile, PersonaExtractionResult, ScenarioMeta, SetupFamily, MarketRegime, RiskProfile } from '../types/persona';
import { TradeScenario } from './analysis';

const WEIGHTS_KEY = 'vpx_persona_weights';
const WEIGHT_MIN = -2;
const WEIGHT_MAX = 2;

/**
 * Heuristic-based extraction for the Trading Persona Profile.
 * In a future version, this could call an LLM, but results are always normalized here.
 */
export function extractProfile(text: string): PersonaExtractionResult {
    const lower = text.toLowerCase();

    // Heuristic Matching
    const isScalper = lower.includes('scalp') || lower.includes('m1') || lower.includes('m3');
    const isSwing = lower.includes('swing') || lower.includes('h1') || lower.includes('daily');

    const style: PersonaProfile['style'] = isScalper ? 'SCALPER' : (isSwing ? 'SWING_TRADER' : 'DAY_TRADER');

    const preferredFamilies: SetupFamily[] = [];
    if (lower.includes('liquidity') || lower.includes('sweep')) preferredFamilies.push('LIQUIDITY');
    if (lower.includes('structure') || lower.includes('bos') || lower.includes('trend')) preferredFamilies.push('STRUCTURE');
    if (lower.includes('reversal') || lower.includes('fade')) preferredFamilies.push('VALUE');

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
        confidence: 0.8,
        rawSignals: ['Keyword matching']
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
