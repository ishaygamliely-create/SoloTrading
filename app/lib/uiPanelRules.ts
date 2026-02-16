export type SignalStatus = "OK" | "WARN" | "OFF" | "ERROR";
export type SignalDir = "LONG" | "SHORT" | "NEUTRAL" | "NO_TRADE";

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
