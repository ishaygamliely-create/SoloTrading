import { NextResponse } from "next/server";

/**
 * OAuth authorize URL mapping:
 *   prod → https://my.tastytrade.com/auth.html   (real Tastytrade OAuth UI)
 *   cert → no public authorize UI is available; cert is only usable for
 *           direct API calls with a session token, not the OAuth code flow.
 *
 * If TASTY_ENV=cert is set, this route will return an error to prevent
 * generating prod codes that will be rejected by the cert token endpoint.
 */
const AUTHORIZE_URLS: Record<string, string> = {
    prod: "https://my.tastytrade.com/auth.html",
};

export async function GET() {
    const clientId = process.env.TASTY_CLIENT_ID;
    const redirectUri = process.env.TASTY_REDIRECT_URI;
    const scope = process.env.TASTY_SCOPE ?? "read openid";
    const env = process.env.TASTY_ENV ?? "prod";

    if (!clientId || !redirectUri) {
        return NextResponse.json(
            { ok: false, error: "Missing TASTY_CLIENT_ID or TASTY_REDIRECT_URI" },
            { status: 500 }
        );
    }

    // Safety check: cert has no OAuth authorize UI — fail fast to avoid
    // generating codes against the wrong environment.
    const authorizeBase = AUTHORIZE_URLS[env];
    if (!authorizeBase) {
        return NextResponse.json(
            {
                ok: false,
                error: `OAuth code flow is not supported for TASTY_ENV="${env}". Set TASTY_ENV=prod in .env.local.`,
            },
            { status: 500 }
        );
    }

    const authorizeUrl = new URL(authorizeBase);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("client_id", clientId);
    authorizeUrl.searchParams.set("redirect_uri", redirectUri);
    authorizeUrl.searchParams.set("scope", scope);
    authorizeUrl.searchParams.set("state", crypto.randomUUID());

    return NextResponse.redirect(authorizeUrl);
}
