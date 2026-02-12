/**
 * Shared UI styles for Confidence System
 * Logic:
 * 0-59% -> RED (Low/Weak)
 * 60-74% -> YELLOW (Medium/Caution)
 * 75-100% -> GREEN (High/Strong)
 */

// Normalized colors (Tailwind classes)
const COLORS = {
    RED: {
        text: "text-red-400",
        border: "border-red-500/20 shadow-none",
        badge: "bg-red-600/90 text-white"
    },
    YELLOW: {
        text: "text-yellow-400",
        border: "border-yellow-500/30 shadow-[0_0_10px_rgba(234,179,8,0.05)]",
        badge: "bg-yellow-600/90 text-white"
    },
    GREEN: {
        text: "text-emerald-400",
        border: "border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.05)]",
        badge: "bg-emerald-600/90 text-white"
    },
    NEUTRAL: {
        text: "text-zinc-400",
        border: "border-white/10",
        badge: "bg-white/10 text-white/70"
    }
};

/**
 * Get the confidence color definition based on score (0-100).
 */
function getConfidenceLevel(score: number) {
    if (score >= 75) return COLORS.GREEN;
    if (score >= 60) return COLORS.YELLOW;
    return COLORS.RED;
}

export function getConfidenceColorClass(score: number) {
    return getConfidenceLevel(score).text;
}

export function getConfidenceBorderClass(score: number) {
    const base = "border transition-colors duration-300 ring-1 ring-inset ring-white/5"; // Added subtle ring as requested
    // Overlay specific border color
    // Note: The user requested 'ring-1 opacity 30%'. 
    // We apply ring-white/5 as base, and the border color from level handles the main glow/color.
    // Actually, let's strictly follow "border glow is subtle (ring-1 opacity 30%) and consistent".
    // The 'border' class handles the physical border. The 'ring' handles the glow effect? 
    // Let's use the level border class.
    return `${base} ${getConfidenceLevel(score).border}`;
}

export function getDirectionBadgeClass(opts: {
    direction: "LONG" | "SHORT" | "NEUTRAL" | "NO_TRADE";
    score: number;
    status?: "OK" | "WARN" | "OFF" | "ERROR" | "BLOCKED";
}) {
    const { direction, status } = opts;

    const base = "px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200";

    // Direction determines background color provided it's a trade direction
    let colorClass = COLORS.NEUTRAL.badge;
    if (direction === "LONG") colorClass = "bg-emerald-600/90 text-white";
    else if (direction === "SHORT") colorClass = "bg-red-600/90 text-white";

    // Warn ring
    const ring = status === "WARN" ? " ring-2 ring-yellow-400/50 shadow-md" : "";

    return `${base} ${colorClass} ${ring}`.trim();
}

// Legacy alias if needed, mapping to new logic
export function getScoreTextClass(score: number) {
    return getConfidenceColorClass(score);
}

// Helper to normalize input to 0-100
export function normalizeScore(val: number, min: number = 0, max: number = 100): number {
    if (val < min) return 0;
    if (val > max) return 100;
    // Linear map to 0-100
    return ((val - min) * 100) / (max - min);
}
