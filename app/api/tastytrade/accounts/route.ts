import { NextRequest, NextResponse } from "next/server";
import {
    TASTY_BASE_URL,
    TASTY_HEADERS,
    callTastyRefresh,
    setTokenCookies,
} from "@/app/lib/tastytrade/tokenHelpers";

const ACCOUNTS_PATH = "/customers/me/accounts";

/**
 * Attempt to refresh the access token using the refresh cookie.
 * Writes new cookies onto `response` and returns the new access token,
 * or null if refresh is not possible.
 */
async function tryRefresh(
    req: NextRequest,
    response: NextResponse
): Promise<string | null> {
    const refreshToken = req.cookies.get("tasty_refresh_token")?.value;
    const clientId = process.env.TASTY_CLIENT_ID;
    const clientSecret = process.env.TASTY_CLIENT_SECRET;

    if (!refreshToken || !clientId || !clientSecret) return null;

    try {
        const tokens = await callTastyRefresh(refreshToken, clientId, clientSecret);
        const isProduction = process.env.NODE_ENV === "production";
        setTokenCookies(response, tokens, isProduction);
        return (tokens.access_token as string) ?? null;
    } catch {
        return null;
    }
}

async function fetchAccounts(accessToken: string) {
    return fetch(`${TASTY_BASE_URL}${ACCOUNTS_PATH}`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
            "User-Agent": TASTY_HEADERS["User-Agent"],
        },
    });
}

export async function GET(req: NextRequest) {
    const isProduction = process.env.NODE_ENV === "production";
    // We need a mutable response so cookie writes from tryRefresh propagate
    const response = NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    // 1. Read access token from cookie
    let accessToken = req.cookies.get("tasty_access_token")?.value ?? null;

    // 2. If missing, try refresh once before failing
    if (!accessToken) {
        accessToken = await tryRefresh(req, response);
        if (!accessToken) {
            return NextResponse.json(
                { ok: false, error: "Not authenticated" },
                { status: 401 }
            );
        }
    }

    // 3. Fetch accounts
    let upstream = await fetchAccounts(accessToken);

    // 4. If 401, retry once with a fresh token
    if (upstream.status === 401) {
        const newToken = await tryRefresh(req, response);
        if (!newToken) {
            return NextResponse.json(
                { ok: false, error: "Session expired. Please re-authenticate." },
                { status: 401 }
            );
        }
        upstream = await fetchAccounts(newToken);
    }

    if (!upstream.ok) {
        const detail = await upstream.text();
        return NextResponse.json(
            { ok: false, error: "Failed to fetch accounts", status: upstream.status, detail },
            { status: upstream.status }
        );
    }

    const data = await upstream.json();

    // Re-use `response` so any cookies written by tryRefresh are included
    return NextResponse.json(
        { ok: true, accounts: data },
        {
            status: 200,
            headers: Object.fromEntries(response.headers.entries()),
        }
    );

    void isProduction; // used inside tryRefresh via closure
}
