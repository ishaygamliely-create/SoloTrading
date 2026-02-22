export type MarketRegime = 'TREND' | 'RANGE' | 'REVERSAL' | 'BREAKOUT' | 'CHOP';
export type SetupFamily = 'STRUCTURE' | 'LIQUIDITY' | 'VALUE' | 'MOMENTUM';
export type EntryHorizon = 'SCALP' | 'INTRADAY' | 'SWING';
export type RiskProfile = 'TIGHT' | 'MEDIUM' | 'WIDE';
export type ConfirmationLevel = 'AGGRESSIVE' | 'BALANCED' | 'CONSERVATIVE';

export interface ScenarioMeta {
    tags: string[];
    family: SetupFamily;
    regime: MarketRegime;
    horizon: EntryHorizon;
    risk: RiskProfile;
    confirmation: ConfirmationLevel;
    timeframes?: string[];
    sessions?: Array<'ASIA' | 'LONDON' | 'NY_AM' | 'NY_PM'>;
    instruments?: string[];
    newsSensitivity?: 'AVOID' | 'NEUTRAL' | 'OK';
    whyKey?: string;
    notes?: string;
}

export interface PersonaProfile {
    name?: string;
    style: 'SCALPER' | 'DAY_TRADER' | 'SWING_TRADER';
    preferredFamilies: SetupFamily[];
    preferredRegimes: MarketRegime[];
    riskTolerance: RiskProfile;
    timeframes: string[];
    newsAvoidance: boolean;
}

export interface PersonaExtractionResult {
    profile: PersonaProfile;
    confidence: number;
    rawSignals: string[];
}
