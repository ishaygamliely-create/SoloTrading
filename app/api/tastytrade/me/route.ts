import { NextRequest, NextResponse } from "next/server";
import { TASTY_BASE_URL, TASTY_HEADERS } from "@/app/lib/tastytrade/tokenHelpers";

export async function GET(req: NextRequest) {
    const accessToken = req.cookies.get("tasty_access_token")?.value;

    if (!accessToken) {
        return NextResponse.json(
            { ok: false, error: "Missing access token — call /api/tastytrade/refresh first" },
            { status: 401 }
        );
    }

    const upstream = await fetch(`${TASTY_BASE_URL}/customers/me`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
            "User-Agent": TASTY_HEADERS["User-Agent"],
        },
    });

    if (!upstream.ok) {
        const detail = await upstream.text();
        return NextResponse.json(
            { ok: false, error: "Upstream error", status: upstream.status, detail },
            { status: upstream.status }
        );
    }

    const me = await upstream.json();
    return NextResponse.json({ ok: true, me });
}
