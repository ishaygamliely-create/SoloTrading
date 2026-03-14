import { NextRequest, NextResponse } from "next/server";
import {
    TOKEN_ENDPOINT,
    TASTY_HEADERS,
    parseExpiresIn,
    setTokenCookies,
} from "@/app/lib/tastytrade/tokenHelpers";

export async function GET(req: NextRequest) {
    // Extract code from the raw querystring to prevent + → space decode bug.
    // req.nextUrl.searchParams URL-decodes, which turns %2B and literal + into spaces.
    const rawQuery = req.url.split("?")[1] ?? "";
    const rawParams = new URLSearchParams(rawQuery);
    const rawCode = rawParams.get("code") ?? "";
    // Normalize any surviving spaces back to + (some proxies re-encode)
    const code = rawCode.replace(/ /g, "+");

    if (!code) {
        return NextResponse.json(
            { ok: false, error: "Missing code" },
            { status: 400 }
        );
    }

    const clientId = process.env.TASTY_CLIENT_ID;
    const clientSecret = process.env.TASTY_CLIENT_SECRET;
    const redirectUri = process.env.TASTY_REDIRECT_URI;

    if (!clientId || !clientSecret) {
        return NextResponse.json(
            { ok: false, error: "Missing client credentials" },
            { status: 500 }
        );
    }

    if (!redirectUri) {
        return NextResponse.json(
            { ok: false, error: "Missing TASTY_REDIRECT_URI" },
            { status: 500 }
        );
    }

    // Tastytrade uses client_secret_post — credentials go in the body, not Basic header
    const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
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

        // Temporary debug — safe metadata only, no secret values
        const sentHeaderNames = ["Content-Type", "Accept"]; // Authorization intentionally absent
        const debug = {
            tokenEndpoint: TOKEN_ENDPOINT,
            sentHeaders: {
                "Content-Type": true,
                Accept: true,
                "User-Agent": true,
                Authorization: false, // confirm: using client_secret_post, NOT Basic auth
            },
            bodyKeys: Array.from(body.keys()),           // keys only, no values
            hasClientId: !!clientId,
            hasClientSecret: !!clientSecret,
            hasRedirectUri: !!redirectUri,
            rawQueryLength: rawQuery.length,
            rawCodeLength: rawCode.length,
            normalizedCodeLength: code.length,
        };
        void sentHeaderNames; // suppress unused-var warning

        return NextResponse.json(
            {
                ok: false,
                error: "Token exchange failed",
                status: tokenResponse.status,
                detail,
                debug,
            },
            { status: tokenResponse.status }
        );
    }

    const tokens = await tokenResponse.json();

    const isProduction = process.env.NODE_ENV === "production";
    const expiresIn = parseExpiresIn(tokens.expires_in);

    const devDebug = !isProduction
        ? {
            setAccessMaxAge: expiresIn,
            tokenType: tokens.token_type ?? null,
            expiresIn: tokens.expires_in ?? null,
        }
        : undefined;

    const response = NextResponse.json({
        ok: true,
        message: "OAuth successful",
        ...(devDebug && { debug: devDebug }),
    });

    setTokenCookies(response, tokens, isProduction);

    return response;
}
