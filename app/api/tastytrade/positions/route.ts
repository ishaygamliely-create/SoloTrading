import { NextRequest, NextResponse } from "next/server";
import {
    TASTY_BASE_URL,
    TASTY_HEADERS,
    callTastyRefresh,
    setTokenCookies,
} from "@/app/lib/tastytrade/tokenHelpers";

/**
 * GET /api/tastytrade/positions
 *
 * Returns open positions for the authenticated user's account.
 * Requires tasty_access_token cookie (obtained via OAuth flow).
 *
 * Optional query param: ?account=ACCT-NUMBER
 * If omitted, uses the first account from /customers/me/accounts.
 *
 * Auth: same pattern as accounts/route.ts (access token + auto-refresh).
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
        setTokenCookies(response, tokens, process.env.NODE_ENV === "production");
        return (tokens.access_token as string) ?? null;
    } catch {
        return null;
    }
}

async function resolveAccountNumber(accessToken: string): Promise<string | null> {
    try {
        const res = await fetch(`${TASTY_BASE_URL}/customers/me/accounts`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/json",
                "User-Agent": TASTY_HEADERS["User-Agent"],
            },
        });
        if (!res.ok) return null;
        const data = await res.json();
        // Tastytrade returns { data: { items: [ { account: { "account-number": "..." } } ] } }
        const items: any[] = data?.data?.items ?? [];
        return items[0]?.account?.["account-number"] ?? null;
    } catch {
        return null;
    }
}

async function fetchPositions(accessToken: string, accountNumber: string) {
    return fetch(`${TASTY_BASE_URL}/accounts/${accountNumber}/positions`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
            "User-Agent": TASTY_HEADERS["User-Agent"],
        },
    });
}

export async function GET(req: NextRequest) {
    const refreshProxy = NextResponse.json({ ok: false }, { status: 401 });

    let accessToken = req.cookies.get("tasty_access_token")?.value ?? null;
    if (!accessToken) {
        accessToken = await tryRefresh(req, refreshProxy);
        if (!accessToken) {
            return NextResponse.json(
                { ok: false, error: "Not authenticated. Complete OAuth flow at /api/tastytrade/login" },
                { status: 401 }
            );
        }
    }

    // Resolve account number: query param takes precedence
    const { searchParams } = new URL(req.url);
    let accountNumber = searchParams.get("account");
    if (!accountNumber) {
        accountNumber = await resolveAccountNumber(accessToken);
        if (!accountNumber) {
            return NextResponse.json(
                { ok: false, error: "Could not resolve account number" },
                { status: 500 }
            );
        }
    }

    let upstream = await fetchPositions(accessToken, accountNumber);

    // Auto-refresh on 401 then retry once
    if (upstream.status === 401) {
        const newToken = await tryRefresh(req, refreshProxy);
        if (!newToken) {
            return NextResponse.json(
                { ok: false, error: "Session expired. Re-authenticate at /api/tastytrade/login" },
                { status: 401 }
            );
        }
        upstream = await fetchPositions(newToken, accountNumber);
    }

    if (!upstream.ok) {
        const detail = await upstream.text();
        return NextResponse.json(
            { ok: false, error: "Failed to fetch positions", status: upstream.status, detail },
            { status: upstream.status }
        );
    }

    const data = await upstream.json();
    // Tastytrade returns positions under data.items
    const items: any[] = data?.data?.items ?? [];
    return NextResponse.json(
        { ok: true, accountNumber, positions: items, count: items.length },
        { status: 200, headers: Object.fromEntries(refreshProxy.headers.entries()) }
    );
}
