import { NextResponse, type NextRequest } from "next/server";
import { canReadDemoCodes } from "@/lib/demo-code-access";

export function proxy(request: NextRequest) {
  if (!canReadDemoCodes(request.headers.get("authorization"))) {
    return new NextResponse("Demo credentials required.", {
      status: 401,
      headers: {
        "Cache-Control": "private, no-store",
        "WWW-Authenticate": 'Basic realm="Stolos demo codes"',
      },
    });
  }

  const response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = { matcher: "/code/:path*" };
