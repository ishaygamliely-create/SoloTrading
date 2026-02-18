export type SignalStatus = "OK" | "WARN" | "STRONG" | "OFF" | "ERROR";
export type SignalDir = "LONG" | "SHORT" | "NEUTRAL" | "NO_TRADE";

export type PanelKey =
    | "decision"
    | "confluence"
    | "psp"
    | "liquidity"
    | "bias"
    | "structure"
    | "value"
    | "smt"
    | "levels"
    | "risk"
    | "session";

type SignalLike = {
    status?: SignalStatus;
    score?: number;
};

/**
 * Determines if a panel should render.
 * CORE panels (structure, bias, value, liquidity, psp) always render unless ERROR.
 * This prevents panels from disappearing due to WARN status or low scores.
 */
export function shouldRenderPanel(key: PanelKey, signal: SignalLike | null | undefined): boolean {
    if (!signal) return false;

    // Only hide on hard failures
    const status = signal.status;
    if (status === "ERROR") return false;

    // ✅ CORE panels always render (even WARN / low score / "range")
    // These provide essential market context regardless of strength
    if (key === "structure") return true;
    if (key === "bias") return true;
    if (key === "value") return true;
    if (key === "liquidity") return true;
    if (key === "psp") return true;
    if (key === "confluence") return true;
    if (key === "decision") return true;

    // Others can be conditional
    if (status === "OFF") return false;

    return true;
}

export function isActionableDirection(dir?: string) {
    return dir === "LONG" || dir === "SHORT";
}

export function shouldShowSmt(params: {
    smtScore?: number;
    smtStatus?: SignalStatus;
    debugOpen?: boolean;
    advancedOpen?: boolean;
}) {
    const { smtScore = 0, smtStatus, debugOpen, advancedOpen } = params;

    // If user explicitly opens Advanced or Debug -> show SMT even if weak
    if (debugOpen || advancedOpen) return true;

    // Otherwise, show only if meaningful
    if (smtStatus === "OFF" || smtStatus === "ERROR") return false;

    // "Strong SMT only" on delayed Yahoo feed
    // Using 70 as threshold per user request
    return smtScore >= 70;
}

export function shouldShowRisk(params: {
    confluenceSuggestion?: string;
    confluenceLevel?: string; // NO_TRADE/WEAK/GOOD/STRONG
}) {
    const { confluenceSuggestion } = params;
    return isActionableDirection(confluenceSuggestion);
}
