import type { NextResponse } from "next/server";

const TOKEN_ENDPOINT = "https://api.tastytrade.com/oauth/token";
const TASTY_BASE_URL = "https://api.tastytrade.com";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

export { TOKEN_ENDPOINT, TASTY_BASE_URL, THIRTY_DAYS };

/** Standard headers required by Tastytrade API on every request. */
export const TASTY_HEADERS = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
    "User-Agent": "VWAP-Dashboard/1.0",
};

/**
 * Parse expires_in robustly — handles string, number, missing, or 0 values.
 * Falls back to 900 seconds (15 min) if invalid.
 */
export function parseExpiresIn(raw: unknown, fallback = 900): number {
    const n = Number(raw ?? fallback);
    return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Call the Tastytrade token endpoint with grant_type=refresh_token.
 * Returns the parsed token JSON on success, or throws on failure.
 */
export async function callTastyRefresh(
    refreshToken: string,
    clientId: string,
    clientSecret: string
): Promise<Record<string, unknown>> {
    const body = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
    });

    const res = await fetch(TOKEN_ENDPOINT, {
        method: "POST",
        headers: TASTY_HEADERS,
        body: body.toString(),
    });

    if (!res.ok) {
        const detail = await res.text();
        throw Object.assign(new Error("Token refresh failed"), {
            status: res.status,
            detail,
        });
    }

    return res.json() as Promise<Record<string, unknown>>;
}

/**
 * Write tasty_access_token (and optionally tasty_refresh_token) HttpOnly cookies
 * onto an existing NextResponse object.
 */
export function setTokenCookies(
    response: NextResponse,
    tokens: {
        access_token?: string;
        refresh_token?: string;
        expires_in?: unknown;
    },
    isProduction: boolean
): void {
    const cookieOpts = {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax" as const,
        path: "/",
    };

    if (tokens.access_token) {
        const expiresIn = parseExpiresIn(tokens.expires_in);
        response.cookies.set("tasty_access_token", tokens.access_token, {
            ...cookieOpts,
            maxAge: expiresIn,
        });
    }

    if (tokens.refresh_token) {
        response.cookies.set("tasty_refresh_token", tokens.refresh_token, {
            ...cookieOpts,
            maxAge: THIRTY_DAYS,
        });
    }
}
