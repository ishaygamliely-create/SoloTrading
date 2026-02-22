import { ScenarioMeta } from './persona';

export type GuidanceStatus = 'HOLD' | 'CAUTION' | 'EXIT' | 'ENTRY_ZONE';

export interface GuidanceMessage {
    timestamp: number;
    status: GuidanceStatus;
    action: string;
    evidence: string[];
}

export interface ScoreComponent {
    label: string;
    points: number;
    category: 'STRUCTURE' | 'TREND' | 'LIQUIDITY' | 'MACRO' | 'SESSION' | 'RISK';
    reason?: string;
}

export interface ConfidenceScorecard {
    total: number;
    rating: 'A+' | 'A' | 'B' | 'C';
    components: ScoreComponent[];
    conflict?: {
        detected: boolean;
        reason: string;
        dominantLayer: string;
    };
    keyOpensBiasScore?: number;
    keyOpensAlignment?: string;
}

export interface TradeScenario {
    id?: string; // Optional for initial generation
    symbol?: string; // Optional for initial generation
    tf?: 'M15' | 'H1' | 'H4' | string;
    timeframe: string; // Display timeframe like 'M15', 'M1-M5 (Scalp)'
    type: string;      // e.g. 'LIQUIDITY SWEEP', 'LOW', 'HIGH', 'BOS'
    direction: 'LONG' | 'SHORT' | 'NEUTRAL';
    score?: number;

    // Confidence and scoring breakdown
    confidence?: {
        score: number;
        rating?: 'A+' | 'A' | 'B' | 'C';
        factors?: string[];
        scorecard?: ConfidenceScorecard;
    };

    // Metadata for Persona Engine
    meta?: ScenarioMeta;

    // Execution Details
    price?: number;
    time?: number;
    zone?: { min: number; max: number };
    entryZone: { min: number; max: number };
    stopLoss?: number;
    invalidation?: number;
    targets: Array<{ price: number; label?: string; desc?: string }>;

    // Analytics
    confluenceFactors?: string[];
    logic?: string[];
    riskReward?: number;
    rr?: number;
    rrWarning?: string;

    // Bias & State
    biasAlignment?: 'ALIGNED' | 'CONTRARIAN' | 'NEUTRAL';
    htfBias?: string;
    state?: 'ACTIONABLE' | 'PENDING' | 'INVALID' | 'EQUILIBRIUM';
    executionType?: 'MARKET' | 'LIMIT' | 'STOP';
    condition?: string;
    note?: string;
    description?: string;

    // Flags
    isPSP?: boolean;
    isPrimary?: boolean;
    isValid?: boolean;

    // Evolution
    ttl_seconds?: number;
    expires_at?: number; // Unix timestamp
    expiresAtMs?: number;
    index?: number;
}
