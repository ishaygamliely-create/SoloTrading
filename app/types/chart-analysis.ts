
export interface ChartAnalysisResult {
    meta: {
        version: "v1";
        timestamp: string;
    };
    bias: "LONG_LEANING" | "SHORT_LEANING" | "NEUTRAL";
    confidence_score: number; // 0-100
    reasons: string[]; // Top 3-7 reasons

    indicators: {
        category: "MARKET_STRUCTURE" | "LIQUIDITY" | "IMBALANCE" | "ORDER_BLOCKS" | "MOMENTUM" | "VOLUME" | "TIME_CONTEXT" | "SMT" | "VWAP";
        status: "DETECTED" | "NOT_DETECTED" | "NOT_AVAILABLE"; // evidence vs inferred vs missing
        confidence: "HIGH" | "MEDIUM" | "LOW";
        evidence_note: string; // One-line explanation
    }[];

    limitations: string[]; // Explicit list of missing info (e.g. "No time axis")

    overlay: {
        type: "BOX" | "LINE" | "LABEL" | "ARROW";
        label?: string; // e.g. "BOS", "EQH"
        color?: "GREEN" | "RED" | "BLUE" | "YELLOW"; // Semantic
        coordinates: {
            x1: number; // 0-1 normalized
            y1: number; // 0-1 normalized
            x2?: number; // Optional endpoint
            y2?: number; // Optional endpoint
        };
    }[];
}
