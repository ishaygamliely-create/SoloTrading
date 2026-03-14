import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const hasAccessCookie = req.cookies.has("tasty_access_token");
    const hasRefreshCookie = req.cookies.has("tasty_refresh_token");

    return NextResponse.json({
        hasAccessCookie,
        hasRefreshCookie,
        ...(!hasAccessCookie && hasRefreshCookie && {
            hint: "Call POST /api/tastytrade/refresh to get a new access token",
        }),
    });
}
