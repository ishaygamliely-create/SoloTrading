import { NextRequest, NextResponse } from "next/server";
import {
    TOKEN_ENDPOINT,
    TASTY_HEADERS,
    setTokenCookies,
} from "@/app/lib/tastytrade/tokenHelpers";

async function handleRefresh(req: NextRequest): Promise<NextResponse> {
    const refreshToken = req.cookies.get("tasty_refresh_token")?.value;

    if (!refreshToken) {
        return NextResponse.json(
            { ok: false, error: "Missing refresh token" },
            { status: 401 }
        );
    }

    const clientId = process.env.TASTY_CLIENT_ID;
    const clientSecret = process.env.TASTY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return NextResponse.json(
            { ok: false, error: "Missing client credentials" },
            { status: 500 }
        );
    }

    const body = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
    });

    let tokenResponse: Response;
    try {
        tokenResponse = await fetch(TOKEN_ENDPOINT, {
            method: "POST",
            headers: TASTY_HEADERS,
            body: body.toString(),
        });
    } catch (err) {
        return NextResponse.json(
            { ok: false, error: "Failed to reach token endpoint", detail: String(err) },
            { status: 502 }
        );
    }

    if (!tokenResponse.ok) {
        const detail = await tokenResponse.text();
        return NextResponse.json(
            { ok: false, error: "Token refresh failed", status: tokenResponse.status, detail },
            { status: tokenResponse.status }
        );
    }

    const tokens = await tokenResponse.json();
    const isProduction = process.env.NODE_ENV === "production";

    const response = NextResponse.json({ ok: true, refreshed: true });
    setTokenCookies(response, tokens, isProduction);
    return response;
}

export async function POST(req: NextRequest) {
    return handleRefresh(req);
}

